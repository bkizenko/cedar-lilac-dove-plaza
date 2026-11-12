import type {Game} from './sim.ts';
import type {ResourceNode} from './types.ts';
import {renewFish} from './fishing.ts';

/** GW-04 river sections. Each river is cut into deterministic sections along
 * its channel (about 48 m), each with an oriented rectangle for selection
 * display. Membership is exclusive (the nearest centreline section owns a
 * point), so a fish node or clay deposit is never counted in two sections.
 * Derived from the world on demand: no saved state. */
export const RIVER_SECTION_RULES={version:1,lengthMetres:48,bankMarginMetres:6,maximumMemberDistanceMetres:12} as const;

type P={x:number;z:number};
export interface RiverSection{id:string;river:number;index:number;centre:P;/** Corners, counter-clockwise. */corners:[P,P,P,P];lengthMetres:number;widthMetres:number;angleRadians:number;/** Centreline polyline of this section. */pts:P[];riverWidthMetres:number}

const cache=new WeakMap<object,RiverSection[]>();
export function riverSections(g:Pick<Game,'world'>):RiverSection[]{
 const rivers=g.world.rivers;const old=cache.get(rivers);if(old)return old;
 const out:RiverSection[]=[],R=RIVER_SECTION_RULES;
 rivers.forEach((river,ri)=>{
  const pts=river.pts;if(pts.length<2)return;
  const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i].x-pts[i-1].x,pts[i].z-pts[i-1].z));
  const total=cum[cum.length-1];if(total<=0)return;const n=Math.max(1,Math.round(total/R.lengthMetres));
  const at=(s:number):P=>{let i=1;while(i<cum.length-1&&cum[i]<s)i++;const t=(s-cum[i-1])/((cum[i]-cum[i-1])||1);return{x:pts[i-1].x+(pts[i].x-pts[i-1].x)*t,z:pts[i-1].z+(pts[i].z-pts[i-1].z)*t};};
  for(let k=0;k<n;k++){
   const s0=total*k/n,s1=total*(k+1)/n,line=[at(s0),...pts.filter((_,i)=>cum[i]>s0&&cum[i]<s1),at(s1)];
   const a=line[0],b=line[line.length-1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1,ux=dx/len,uz=dz/len;
   let lateral=0;for(const p of line)lateral=Math.max(lateral,Math.abs((p.x-a.x)*-uz+(p.z-a.z)*ux));
   const half=river.w/2+R.bankMarginMetres+lateral,cx=(a.x+b.x)/2,cz=(a.z+b.z)/2,hl=len/2;
   const corner=(l:number,w:number):P=>({x:cx+ux*l-uz*w,z:cz+uz*l+ux*w});
   out.push({id:`r${ri}:${k}`,river:ri,index:k,centre:{x:cx,z:cz},corners:[corner(-hl,-half),corner(hl,-half),corner(hl,half),corner(-hl,half)],lengthMetres:len,widthMetres:half*2,angleRadians:Math.atan2(ux,uz),pts:line,riverWidthMetres:river.w});
  }
 });
 cache.set(rivers,out);return out;
}

function segmentDistance(p:P,a:P,b:P){const dx=b.x-a.x,dz=b.z-a.z,t=Math.min(1,Math.max(0,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1)));return Math.hypot(p.x-(a.x+t*dx),p.z-(a.z+t*dz));}
/** The section owning a point: nearest centreline, within the river half-width
 * plus the member distance. Null away from every river. */
export function riverSectionAt(g:Pick<Game,'world'>,p:P):RiverSection|null{
 let best:RiverSection|null=null,bd=Infinity;
 for(const s of riverSections(g)){
  const c=s.centre;if(Math.abs(p.x-c.x)>s.lengthMetres/2+s.widthMetres||Math.abs(p.z-c.z)>s.lengthMetres/2+s.widthMetres)continue;
  for(let i=1;i<s.pts.length;i++){const d=segmentDistance(p,s.pts[i-1],s.pts[i]);if(d<bd){bd=d;best=s;}}
 }
 return best&&bd<=best.riverWidthMetres/2+RIVER_SECTION_RULES.maximumMemberDistanceMetres?best:null;
}
/** Nearest point on a section's centreline. */
export function sectionCentrelinePoint(s:RiverSection,p:P):P{let best=s.pts[0],bd=Infinity;for(let i=1;i<s.pts.length;i++){const a=s.pts[i-1],b=s.pts[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.min(1,Math.max(0,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz||1))),q={x:a.x+t*dx,z:a.z+t*dz},d=Math.hypot(p.x-q.x,p.z-q.z);if(d<bd){bd=d;best=q;}}return best;}
export const inRiverSection=(g:Pick<Game,'world'>,s:RiverSection,p:P)=>riverSectionAt(g,p)?.id===s.id;

/** Visible stock movement for a section's fish: the game's own renewFish run on
 * copies for one minute (season, weather and pressure included). */
export function fishRecoveryPerMinute(g:Game,nodes:ResourceNode[]){
 let gain=0;for(const n of nodes){const copy={...n};renewFish(g,copy,60);gain+=Math.max(0,copy.amount-n.amount);}return gain;
}
