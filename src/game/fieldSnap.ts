import type {Game} from './sim';
import type {Building} from './types';
/** Edge-to-edge snapping of marked fields. Pure reads; placement validity still goes through Game.placementIssue.
 * Fields are axis-aligned rectangles. A snapped field shares an exact edge with its neighbour (no gap), so the boundary
 * is merged and rows can run on across both plots. */
export const FIELD_SNAP_RULES=Object.freeze({version:1,thresholdMetres:3.2,minimumOverlapMetres:1.2,mergeToleranceMetres:.35});
/** Edge bit flags, from the plot's own point of view. */
export const EDGE={W:1,E:2,N:4,S:8} as const;
export type Rect={x:number;z:number;w:number;d:number};
export interface SnapEdge{side:keyof typeof EDGE;neighbourId:number;x0:number;z0:number;x1:number;z1:number}
export interface SnapResult{rect:Rect;snapped:boolean;mask:number;edges:SnapEdge[]}
const lo=(r:Rect)=>({x:r.x-r.w/2,z:r.z-r.d/2}),hi=(r:Rect)=>({x:r.x+r.w/2,z:r.z+r.d/2});
const overlap=(a0:number,a1:number,b0:number,b1:number)=>Math.min(a1,b1)-Math.max(a0,b0);
export function neighbourFields(g:Game,team:number,ignoreId?:number){return g.state.buildings.filter(b=>b.type==='farm'&&b.team===team&&b.hp>0&&b.id!==ignoreId);}
/** Which sides of `a` touch `b` (within tolerance, with real overlap along the shared edge). */
export function touchingSides(a:Rect,b:Rect,tol=FIELD_SNAP_RULES.mergeToleranceMetres){
 const A0=lo(a),A1=hi(a),B0=lo(b),B1=hi(b);let mask=0;
 const zo=overlap(A0.z,A1.z,B0.z,B1.z)>=FIELD_SNAP_RULES.minimumOverlapMetres,xo=overlap(A0.x,A1.x,B0.x,B1.x)>=FIELD_SNAP_RULES.minimumOverlapMetres;
 if(zo&&Math.abs(A0.x-B1.x)<=tol)mask|=EDGE.W;
 if(zo&&Math.abs(A1.x-B0.x)<=tol)mask|=EDGE.E;
 if(xo&&Math.abs(A0.z-B1.z)<=tol)mask|=EDGE.N;
 if(xo&&Math.abs(A1.z-B0.z)<=tol)mask|=EDGE.S;
 return mask;
}
/** Snap a candidate plot to nearby fields: abut the nearest facing edge on each axis, then flush an aligned side edge. */
export function snapFieldRect(g:Game,rect:Rect,team=0,ignoreId?:number):SnapResult{
 const T=FIELD_SNAP_RULES.thresholdMetres,others=neighbourFields(g,team,ignoreId);
 let r={...rect},bestX:{dx:number;n:Building}|null=null,bestZ:{dz:number;n:Building}|null=null;
 const A0=lo(r),A1=hi(r);
 for(const n of others){
  const B0=lo(n),B1=hi(n),zo=overlap(A0.z-T,A1.z+T,B0.z,B1.z)>0,xo=overlap(A0.x-T,A1.x+T,B0.x,B1.x)>0;
  if(zo){for(const dx of [B1.x-A0.x,B0.x-A1.x])if(Math.abs(dx)<=T&&(!bestX||Math.abs(dx)<Math.abs(bestX.dx)))bestX={dx,n};}
  if(xo){for(const dz of [B1.z-A0.z,B0.z-A1.z])if(Math.abs(dz)<=T&&(!bestZ||Math.abs(dz)<Math.abs(bestZ.dz)))bestZ={dz,n};}
 }
 if(bestX)r.x+=bestX.dx;
 if(bestZ)r.z+=bestZ.dz;
 // Flush a side edge with the neighbour we abut, so a row of plots lines up (rows then continue across the seam).
 const flush=(axis:'x'|'z',n:Building)=>{
  const sz=axis==='x'?'d':'w',c0=r[axis]-r[sz]/2,n0=n[axis]-n[sz]/2,c1=r[axis]+r[sz]/2,n1=n[axis]+n[sz]/2;
  for(const d of [n0-c0,n1-c1])if(Math.abs(d)<=T&&Math.abs(d)>1e-6)return d;return 0;
 };
 if(bestX)r.z+=flush('z',bestX.n);
 if(bestZ)r.x+=flush('x',bestZ.n);
 r.x=Math.round(r.x*100)/100+0;r.z=Math.round(r.z*100)/100+0;
 let mask=0;const edges:SnapEdge[]=[];
 for(const n of others){
  const m=touchingSides(r,n);if(!m)continue;mask|=m;const R0=lo(r),R1=hi(r),N0=lo(n),N1=hi(n);
  if(m&EDGE.W)edges.push({side:'W',neighbourId:n.id,x0:R0.x,z0:Math.max(R0.z,N0.z),x1:R0.x,z1:Math.min(R1.z,N1.z)});
  if(m&EDGE.E)edges.push({side:'E',neighbourId:n.id,x0:R1.x,z0:Math.max(R0.z,N0.z),x1:R1.x,z1:Math.min(R1.z,N1.z)});
  if(m&EDGE.N)edges.push({side:'N',neighbourId:n.id,x0:Math.max(R0.x,N0.x),z0:R0.z,x1:Math.min(R1.x,N1.x),z1:R0.z});
  if(m&EDGE.S)edges.push({side:'S',neighbourId:n.id,x0:Math.max(R0.x,N0.x),z0:R1.z,x1:Math.min(R1.x,N1.x),z1:R1.z});
 }
 return{rect:r,snapped:!!(bestX||bestZ)&&mask!==0,mask,edges};
}
/** Snap the drag's anchor corner (a point) to the nearest edge/corner of a neighbouring field, so a dragged row grows out of it. */
export function snapFieldPoint(g:Game,p:{x:number;z:number},team=0):{x:number;z:number;snapped:boolean}{
 const T=FIELD_SNAP_RULES.thresholdMetres;let best:{x:number;z:number;d:number}|null=null;
 for(const n of neighbourFields(g,team)){
  const B0=lo(n),B1=hi(n);
  const sx=[B0.x,B1.x],sz=[B0.z,B1.z];
  // Corners first, then edges.
  for(const x of sx)for(const z of sz){const d=Math.hypot(p.x-x,p.z-z);if(d<=T&&(!best||d<best.d))best={x,z,d};}
  if(p.x>=B0.x-T&&p.x<=B1.x+T)for(const z of sz){const d=Math.abs(p.z-z);if(d<=T&&(!best||d+.01<best.d))best={x:Math.max(B0.x,Math.min(B1.x,p.x)),z,d};}
  if(p.z>=B0.z-T&&p.z<=B1.z+T)for(const x of sx){const d=Math.abs(p.x-x);if(d<=T&&(!best||d+.01<best.d))best={x,z:Math.max(B0.z,Math.min(B1.z,p.z)),d};}
 }
 return best?{x:best.x,z:best.z,snapped:true}:{x:p.x,z:p.z,snapped:false};
}
export interface FieldGroupInfo{mask:number;anchor:number}
/** Edge masks and a row-sharing group (anchor = lowest id in the connected set) for every field of every team.
 * Pure; the caller caches by building list identity. */
export function fieldNeighbourhood(buildings:readonly Pick<Building,'id'|'type'|'team'|'x'|'z'|'w'|'d'|'hp'>[]):Map<number,FieldGroupInfo>{
 const farms=buildings.filter(b=>b.type==='farm'&&b.hp>0),out=new Map<number,FieldGroupInfo>(),parent=new Map<number,number>();
 const find=(i:number):number=>{let r=i;while(parent.get(r)!==r)r=parent.get(r)!;let c=i;while(parent.get(c)!==r){const n=parent.get(c)!;parent.set(c,r);c=n;}return r;};
 for(const f of farms){parent.set(f.id,f.id);out.set(f.id,{mask:0,anchor:f.id});}
 // Cheap bounding-box reject; the caller caches the result per building list.
 for(let i=0;i<farms.length;i++)for(let j=i+1;j<farms.length;j++){
  const a=farms[i],b=farms[j];if(a.team!==b.team||Math.abs(a.x-b.x)>(a.w+b.w)/2+1||Math.abs(a.z-b.z)>(a.d+b.d)/2+1)continue;
  const m=touchingSides(a,b);if(!m)continue;
  out.get(a.id)!.mask|=m;
  const flip=(m&EDGE.W?EDGE.E:0)|(m&EDGE.E?EDGE.W:0)|(m&EDGE.N?EDGE.S:0)|(m&EDGE.S?EDGE.N:0);
  out.get(b.id)!.mask|=flip;
  const ra=find(a.id),rb=find(b.id);if(ra!==rb)parent.set(Math.max(ra,rb),Math.min(ra,rb));
 }
 for(const f of farms)out.get(f.id)!.anchor=find(f.id);
 return out;
}
