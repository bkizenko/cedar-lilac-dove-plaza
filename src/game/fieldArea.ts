import type {Game} from './sim.ts';
import {BUILDINGS} from './constants.ts';
import {validPlot} from './plots.ts';
import {buildingCost} from './construction.ts';
import {soilQuality,habitatAt} from './ecology.ts';
import {fertilityGreenness} from './fertilityPreview.ts';

/** GW-02 whole-area fields. A dragged rectangle larger than one field (3× the
 * base plot per axis) becomes adjacent fields separated by a narrow headland,
 * instead of being clamped. Every tile is judged by Game.placementIssue — the
 * exact function preview and commit already share — and committed through
 * Game.placeBuilding, so there is no second validation path. Terrain is never
 * flattened; obstacles follow the existing site-preparation queue. */
export const FIELD_AREA_RULES={version:1,headlandMetres:.6,maximumTilesPerAxis:6} as const;

/** `fertility`: 0 poor .. 1 best (null on unexplored ground, which is never read). `trimmed`: this tile is a piece of a larger tile that was blocked as a whole. */
export interface FieldTile{x:number;z:number;w:number;d:number;issue:string|null;fertility:number|null;trimmed?:true}
export interface FieldAreaPlan{tiles:FieldTile[];columns:number;rows:number;valid:number;seeds:number;/** tiles that were blocked whole and split to keep their usable pieces */trimmed:number}

/** Mean fertility of a tile over a 3x3 grid of explored points (the same nine-sample idea as fieldTerrain). */
export function tileFertility(g:Game,t:{x:number;z:number;w:number;d:number}):number|null{
 let sum=0,n=0;
 for(let j=0;j<3;j++)for(let i=0;i<3;i++){const x=t.x+((i+.5)/3-.5)*t.w,z=t.z+((j+.5)/3-.5)*t.d;if(!g.exploredAt(x,z))continue;sum+=fertilityGreenness(soilQuality(g,x,z),habitatAt(g,x,z).crops);n++;}
 return n?sum/n:null;
}

function split(span:number,base:number,gap:number=FIELD_AREA_RULES.headlandMetres){
 const max=base*3;
 const n=Math.max(1,Math.min(FIELD_AREA_RULES.maximumTilesPerAxis,Math.ceil((span+gap)/(max+gap))));
 // Decimetre lengths fill the drawn span; clamp to the valid plot range.
 const size=Math.max(base,Math.min(max,Math.floor((span-(n-1)*gap)/n*10)/10));
 return{n,size};
}

/** Plan the fields covering the rectangle a→b. Pure read. */
/** `merge` lays the plots edge to edge (no headland) so boundaries merge and rows line up across the seam. */
export function planFieldArea(g:Game,a:{x:number;z:number},b:{x:number;z:number},team=0,opts:{merge?:boolean}={}):FieldAreaPlan{
 const base=BUILDINGS.farm,gap=opts.merge?0:FIELD_AREA_RULES.headlandMetres;
 const W=Math.max(base.w,Math.abs(b.x-a.x)),D=Math.max(base.d,Math.abs(b.z-a.z));
 const cx=split(W,base.w,gap),cz=split(D,base.d,gap),sx=Math.sign(b.x-a.x||1),sz=Math.sign(b.z-a.z||1);
 const tiles:FieldTile[]=[];let valid=0,seeds=0,trimmed=0;
 const add=(x:number,z:number,w:number,d:number,issue:string|null,piece:boolean)=>{
  tiles.push({x,z,w,d,issue,fertility:tileFertility(g,{x,z,w,d}),...(piece?{trimmed:true as const}:{})});
  if(!issue){valid++;seeds+=buildingCost('farm',g,team,{w,d}).seeds??0;}
 };
 for(let j=0;j<cz.n;j++)for(let i=0;i<cx.n;i++){
  const w=cx.size,d=cz.size,x=a.x+sx*(i*(w+gap)+w/2),z=a.z+sz*(j*(d+gap)+d/2),size={w,d};
  if(!validPlot('farm',size))continue;
  const issue=g.placementIssue('farm',x,z,team,size);
  // A blocked tile is trimmed, not refused: split it into base-size pieces and keep every piece that is fine (trees, stumps and bushes are cleared by the field's site
  // preparation, so what is left blocking is water, steep ground, rock or buildings). Pieces that stay blocked are drawn red with their own reason.
  const nx=Math.max(1,Math.floor(w/base.w+1e-9)),nz=Math.max(1,Math.floor(d/base.d+1e-9));
  if(issue&&nx*nz>1){
   const pw=w/nx,pd=d/nz;trimmed++;
   for(let pj=0;pj<nz;pj++)for(let pi=0;pi<nx;pi++){
    const px=x-w/2+pw*(pi+.5),pz=z-d/2+pd*(pj+.5),psize={w:pw,d:pd};
    if(!validPlot('farm',psize))continue;
    add(px,pz,pw,pd,g.placementIssue('farm',px,pz,team,psize),true);
   }
   continue;
  }
  add(x,z,w,d,issue,false);
 }
 return{tiles,columns:cx.n,rows:cz.n,valid,seeds,trimmed};
}

/** Why red plots are red: the most common refusal among blocked tiles, in the words placementIssue already uses. Pure read; '' when nothing is blocked. */
export function fieldRefusalSummary(plan:FieldAreaPlan):string{
 const counts=new Map<string,number>();
 for(const t of plan.tiles)if(t.issue)counts.set(t.issue,(counts.get(t.issue)||0)+1);
 if(!counts.size)return'';
 const [top,n]=[...counts.entries()].sort((a,b)=>b[1]-a[1]||(a[0]<b[0]?-1:1))[0];
 const short=top.length>48?top.slice(0,47)+'…':top;
 const more=counts.size>1?` +${counts.size-1} other reason${counts.size>2?'s':''}`:'';
 return`${n} blocked: ${short}${more}`;
}

/** Commit the plan's admissible tiles through the ordinary placement path.
 * Each is re-validated at commit; seed shortages stop like a single field. */
export function placeFieldArea(g:Game,plan:FieldAreaPlan,team=0){
 const placed:FieldTile[]=[];
 for(const t of plan.tiles){if(t.issue)continue;if(!g.placeBuilding('farm',t.x,t.z,team,{w:t.w,d:t.d}))break;placed.push(t);}
 return placed;
}
