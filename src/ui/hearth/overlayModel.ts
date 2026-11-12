import {gradientAt,type InfluenceGradientModel} from '@/game/terrainInfluenceView';
/**
 * Map overlays for the Hearth minimap (docs/UIUX_PROPOSAL.md change 9): territory, influence gradient, known resources, water.
 * Pure painter over plain sources, so it is testable without a Game. Everything is clipped to explored ground: an overlay never reveals
 * a border, a deposit or a lake the player has not seen. Reads of the live Game are in overlayReads.ts.
 */
export type OverlayKey='territory'|'influence'|'resources'|'water';
export const OVERLAY_KEYS:readonly OverlayKey[]=['territory','influence','resources','water'];
export type ResourceKind='tree'|'forage'|'stone'|'copper'|'iron'|'fish';
export type RGB=readonly [number,number,number];
export const TERRITORY_NONE=-1,TERRITORY_CONTESTED=-2;
export type OverlaySources={
 worldSize:number;pixels:number;
 explored:(x:number,z:number)=>boolean;
 /** Territory owner at a world point: a team id, TERRITORY_NONE, or TERRITORY_CONTESTED. */
 teamAt?:(x:number,z:number)=>number;
 gradient?:InfluenceGradientModel|null;
 color:(team:number)=>RGB;
 water?:(x:number,z:number)=>boolean;
 resources?:readonly {x:number;z:number;kind:ResourceKind}[];
};
export const RESOURCE_COLOR:Record<ResourceKind,RGB>={tree:[38,92,44],forage:[250,214,92],stone:[236,236,230],copper:[236,124,52],iron:[132,150,255],fish:[110,226,236]};
export const RESOURCE_ALPHA:Record<ResourceKind,number>={tree:120,forage:255,stone:255,copper:255,iron:255,fish:230};
/** Bigger deposits read as 2x2 so ore does not vanish at 160 px. */
const BIG:ReadonlySet<ResourceKind>=new Set(['stone','copper','iron']);
const WATER_RGBA=[112,214,240,120] as const;
const FILL_ALPHA=52,EDGE_ALPHA=235,INFLUENCE_MAX_ALPHA=190;
function blend(out:Uint8ClampedArray,i:number,r:number,g:number,b:number,a:number){
 if(a<=0)return;
 const sa=a/255,da=out[i+3]/255,oa=sa+da*(1-sa);
 out[i]=(r*sa+out[i]*da*(1-sa))/oa;out[i+1]=(g*sa+out[i+1]*da*(1-sa))/oa;out[i+2]=(b*sa+out[i+2]*da*(1-sa))/oa;out[i+3]=oa*255;
}
/** Writes an RGBA overlay of `pixels` x `pixels` into `out` (cleared first). Returns true if anything was drawn. */
export function paintOverlays(src:OverlaySources,active:ReadonlySet<OverlayKey>,out:Uint8ClampedArray):boolean{
 const N=src.pixels,S=src.worldSize;out.fill(0,0,N*N*4);
 if(!active.size)return false;
 const wx=(px:number)=>((px+.5)/N-.5)*S,wz=(py:number)=>((py+.5)/N-.5)*S;
 let drew=false;
 const seen=new Uint8Array(N*N);
 for(let y=0;y<N;y++)for(let x=0;x<N;x++)seen[y*N+x]=src.explored(wx(x),wz(y))?1:0;
 if(active.has('water')&&src.water){
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const n=y*N+x;if(seen[n]&&src.water(wx(x),wz(y))){blend(out,n*4,WATER_RGBA[0],WATER_RGBA[1],WATER_RGBA[2],WATER_RGBA[3]);drew=true;}}
 }
 if(active.has('influence')&&src.gradient?.bounds){
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
   const n=y*N+x;if(!seen[n])continue;
   const g=gradientAt(src.gradient,wx(x),wz(y));if(g.team<0||g.alpha<=0)continue;
   const c=src.color(g.team),feather=1-.65*(g.contest/255);
   // Squared-ish ramp keeps the rim soft and the heartland solid.
   const a=INFLUENCE_MAX_ALPHA*(g.alpha/255)**1.5*feather;
   blend(out,n*4,c[0],c[1],c[2],a);drew=true;
  }
 }
 if(active.has('territory')&&src.teamAt){
  const team=new Int16Array(N*N);
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){const n=y*N+x;team[n]=seen[n]?src.teamAt(wx(x),wz(y)):TERRITORY_NONE;}
  for(let y=0;y<N;y++)for(let x=0;x<N;x++){
   const n=y*N+x,t=team[n];if(t===TERRITORY_NONE)continue;
   if(t===TERRITORY_CONTESTED){if((x+y)%3===0)blend(out,n*4,255,226,140,170);drew=true;continue;}
   const c=src.color(t);
   const edge=(x>0&&team[n-1]!==t)||(x<N-1&&team[n+1]!==t)||(y>0&&team[n-N]!==t)||(y<N-1&&team[n+N]!==t);
   blend(out,n*4,c[0],c[1],c[2],edge?EDGE_ALPHA:FILL_ALPHA);drew=true;
  }
 }
 if(active.has('resources')&&src.resources){
  for(const r of src.resources){
   if(!src.explored(r.x,r.z))continue;
   const px=Math.floor((r.x/S+.5)*N),py=Math.floor((r.z/S+.5)*N);if(px<0||py<0||px>=N||py>=N)continue;
   const c=RESOURCE_COLOR[r.kind],a=RESOURCE_ALPHA[r.kind],w=BIG.has(r.kind)?2:1;
   for(let dy=0;dy<w;dy++)for(let dx=0;dx<w;dx++){const X=Math.min(N-1,px+dx),Y=Math.min(N-1,py+dy);blend(out,(Y*N+X)*4,c[0],c[1],c[2],a);}
   drew=true;
  }
 }
 return drew;
}
