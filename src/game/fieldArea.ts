import type {Game} from './sim.ts';
import {BUILDINGS} from './constants.ts';
import {validPlot} from './plots.ts';
import {buildingCost} from './construction.ts';

/** GW-02 whole-area fields. A dragged rectangle larger than one field (3× the
 * base plot per axis) becomes adjacent fields separated by a narrow headland,
 * instead of being clamped. Every tile is judged by Game.placementIssue — the
 * exact function preview and commit already share — and committed through
 * Game.placeBuilding, so there is no second validation path. Terrain is never
 * flattened; obstacles follow the existing site-preparation queue. */
export const FIELD_AREA_RULES={version:1,headlandMetres:.6,maximumTilesPerAxis:6} as const;

export interface FieldTile{x:number;z:number;w:number;d:number;issue:string|null}
export interface FieldAreaPlan{tiles:FieldTile[];columns:number;rows:number;valid:number;seeds:number}

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
 const tiles:FieldTile[]=[];let valid=0,seeds=0;
 for(let j=0;j<cz.n;j++)for(let i=0;i<cx.n;i++){
  const w=cx.size,d=cz.size,x=a.x+sx*(i*(w+gap)+w/2),z=a.z+sz*(j*(d+gap)+d/2),size={w,d};
  if(!validPlot('farm',size))continue;
  const issue=g.placementIssue('farm',x,z,team,size);
  tiles.push({x,z,w,d,issue});
  if(!issue){valid++;seeds+=buildingCost('farm',g,team,size).seeds??0;}
 }
 return{tiles,columns:cx.n,rows:cz.n,valid,seeds};
}

/** Commit the plan's admissible tiles through the ordinary placement path.
 * Each is re-validated at commit; seed shortages stop like a single field. */
export function placeFieldArea(g:Game,plan:FieldAreaPlan,team=0){
 const placed:FieldTile[]=[];
 for(const t of plan.tiles){if(t.issue)continue;if(!g.placeBuilding('farm',t.x,t.z,team,{w:t.w,d:t.d}))break;placed.push(t);}
 return placed;
}
