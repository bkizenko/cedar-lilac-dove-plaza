import {SIM_CALENDAR_RULES} from './calendarPacing';
import {EDGE} from './fieldSnap';
/** Pure, deterministic look rules for cultivated fields (render-side data; no game state is written).
 * Everything is derived from the field record and the calendar, so saves need nothing new. */
export const FIELD_STAGES=['bare','sprouting','growing','ripe','stubble','fallow'] as const;
export type FieldStage=typeof FIELD_STAGES[number];
export const STAGE_INDEX:Record<FieldStage,number>={bare:0,sprouting:1,growing:2,ripe:3,stubble:4,fallow:5};
type CropLike={year?:number;planted:number;tended:number;ripened:boolean;remaining:number};
export function calendarPhase(time:number){const Y=SIM_CALENDAR_RULES.yearSeconds;return{year:Math.floor(time/Y),phase:Math.floor((time%Y)/(Y/4))};}
/** Visible stage of a field. Phase 0 spring sowing, 1 summer tending, 2 autumn harvest, 3 winter. */
export function fieldStage(field:{fallowYear?:number;crop?:CropLike},time:number):FieldStage{
 const {year,phase}=calendarPhase(time),c=field.crop;
 if(field.fallowYear===year)return'fallow';
 const mine=!!c&&(c.year===undefined||c.year===year);
 const planted=mine?c!.planted:0;
 if(phase===3)return c&&c.planted>0&&(c.year===undefined||c.year===year||c.year===year-1)?'stubble':'bare';
 if(!mine)return phase===0?'bare':phase===3?'stubble':'bare';
 if(phase===0)return planted<=.02?'bare':'sprouting';
 if(phase===1)return planted<=.02?'bare':c!.tended>.55||planted>.85?'growing':'sprouting';
 return c!.ripened&&c!.remaining>0?'ripe':planted>.02?'stubble':'bare';
}
export type BoundaryKind='bank'|'wattle'|'hedge'|'stone';
/** Boundary by age and local habit (variant 0-3 from the village style) and slope: banks first, then wattle, hedges, drystone. */
export function boundaryKind(era:number,variant:number,grade=0):BoundaryKind{
 const e=Math.max(0,Math.floor(era)),v=((Math.floor(variant)%4)+4)%4;
 if(e>=1&&grade>.35)return'stone';
 if(e<=0)return'bank';
 if(e===1)return v%2===0?'wattle':'bank';
 if(e===2)return v===2?'stone':v===1?'wattle':'hedge';
 return v%2===1?'stone':'hedge';
}
/** Small stable hash in [0,1). */
export function hash01(a:number,b=0,c=0){let h=Math.imul(Math.floor(a*1000)^0x9e3779b1,0x85ebca6b)^Math.imul(Math.floor(b*1000)+0x7f4a7c15,0xc2b2ae35)^Math.imul(c+0x165667b1,0x27d4eb2f);h^=h>>>15;h=Math.imul(h,0x2c1b3c6d);h^=h>>>12;return((h>>>0)%1000003)/1000003;}
/** Plot outline. The shader (src/scene/fieldSurface.ts) evaluates exactly these formulas, so hedges and walls can sit on the drawn edge.
 * Smooth sums of sines (not a hash) so float32 on the GPU and doubles here agree to well under a decimetre. */
export const FIELD_EDGE={baseInset:.6,maxHalf:14,ampBase:1,ampPerMetre:.22,cornerBase:1.8,cornerPerMetre:.16} as const;
export const fieldSeed=(id:number)=>(id*0.6180339887)%1;
export function fieldWave(x:number,z:number,seed:number){return .55*Math.sin(x*.2+z*.13+seed*6.28)+.3*Math.sin(-x*.31+z*.52+seed*17)+.15*Math.sin(x*.9-z*.7+seed*29);}
/** How far inside the nominal rectangle the soil begins, at world point (x,z): always inward, never past a neighbour. */
export function fieldInset(x:number,z:number,seed:number,halfMin:number){const h=Math.min(halfMin,FIELD_EDGE.maxHalf);return FIELD_EDGE.baseInset+(FIELD_EDGE.ampBase+FIELD_EDGE.ampPerMetre*h)*(.5+.5*fieldWave(x,z,seed));}
/** Distance inside the plot outline before the wobble: straight to the nearest unmerged edge, rounded at unmerged corners. */
export function fieldInsideDistance(f:{x:number;z:number;w:number;d:number},mask:number,x:number,z:number){
 const hw=f.w/2,hd=f.d/2,lx=x-f.x,lz=z-f.z;let dW=hw+lx,dE=hw-lx,dN=hd+lz,dS=hd-lz;
 if(mask&EDGE.W)dW=99;if(mask&EDGE.E)dE=99;if(mask&EDGE.N)dN=99;if(mask&EDGE.S)dS=99;
 const cx=Math.min(dW,dE),cz=Math.min(dN,dS),r=FIELD_EDGE.cornerBase+FIELD_EDGE.cornerPerMetre*Math.min(hw,hd,FIELD_EDGE.maxHalf);
 return cx<r&&cz<r?r-Math.hypot(r-cx,r-cz):Math.min(cx,cz);
}
/** Signed depth of (x,z) inside the drawn soil edge; negative = outside (discarded by the shader). */
export function fieldEdgeDepth(f:{id:number;x:number;z:number;w:number;d:number},mask:number,x:number,z:number){
 return fieldInsideDistance(f,mask,x,z)-fieldInset(x,z,fieldSeed(f.id),Math.min(f.w,f.d)/2);
}
export interface BoundarySite{x:number;z:number;yaw:number;scale:number;tint:number}
export const BOUNDARY_RULES=Object.freeze({step:{bank:1.8,wattle:.8,hedge:1.0,stone:1.1} as Record<BoundaryKind,number>,maximumPerField:180,inset:.6,gapMetres:2.4});
/** Sites along the edges that are not merged with a neighbour. One gate gap on the longest open edge. */
const i0=(s:number[],f:{x:number;z:number},bx:number,bz:number):[number,number]=>{const mx=(s[0]+s[2])/2,mz=(s[1]+s[3])/2;// inward normal of the side: toward the plot centre along the axis the side lies on
 return Math.abs(s[2]-s[0])>Math.abs(s[3]-s[1])?[0,mz>0?-1:1]:[mx>0?-1:1,0];};
export function boundarySites(f:{id:number;x:number;z:number;w:number;d:number},mask:number,kind:BoundaryKind):BoundarySite[]{
 const R=BOUNDARY_RULES,hw=f.w/2,hd=f.d/2,sides:[number,number,number,number,number,number][]=[]; // x0,z0,x1,z1,yaw,len
 if(!(mask&EDGE.N))sides.push([-hw,-hd,hw,-hd,0,2*hw]);
 if(!(mask&EDGE.S))sides.push([-hw,hd,hw,hd,0,2*hw]);
 if(!(mask&EDGE.W))sides.push([-hw,-hd,-hw,hd,Math.PI/2,2*hd]);
 if(!(mask&EDGE.E))sides.push([hw,-hd,hw,hd,Math.PI/2,2*hd]);
 if(!sides.length)return[];
 const total=sides.reduce((s,k)=>s+k[5],0),step=Math.max(R.step[kind],total/R.maximumPerField);
 let longest=0;for(let i=1;i<sides.length;i++)if(sides[i][5]>sides[longest][5])longest=i;
 const gateAt=.3+.4*hash01(f.id,7,1),out:BoundarySite[]=[];
 sides.forEach((s,i)=>{
  const n=Math.max(1,Math.round(s[5]/step));
  for(let k=0;k<n;k++){
   const t=(k+.5)/n+(hash01(f.id,k,i+11)-.5)*.5/n;
   if(i===longest&&Math.abs(t-gateAt)*s[5]<R.gapMetres/2)continue;
   const jx=(hash01(f.id,k,i+31)-.5)*.35,jz=(hash01(f.id,k,i+47)-.5)*.35;
   // Start on the rectangle edge, then walk inward to where the drawn soil edge actually is (bisection; the outline wobbles and rounds corners).
   const bx=f.x+s[0]+(s[2]-s[0])*t,bz=f.z+s[1]+(s[3]-s[1])*t;let inward=i0(s,f,bx,bz),hi=Math.min(f.w,f.d)/2;
   // Near a rounded corner the straight inward walk can stay outside the soil; walk towards the plot centre instead.
   if(fieldEdgeDepth(f,mask,bx+inward[0]*hi,bz+inward[1]*hi)<0){const cx=f.x-bx,cz=f.z-bz,len=Math.hypot(cx,cz)||1;inward=[cx/len,cz/len];hi=len;}
   let lo=0;for(let it=0;it<10;it++){const m=(lo+hi)/2;if(fieldEdgeDepth(f,mask,bx+inward[0]*m,bz+inward[1]*m)<0)lo=m;else hi=m;}
   const d=hi+.15;
   out.push({x:bx+inward[0]*d+jx*.3,z:bz+inward[1]*d+jz*.3,yaw:s[4]+(hash01(f.id,k,i+59)-.5)*.5,scale:.8+.45*hash01(f.id,k,i+71),tint:hash01(f.id,k,i+83)});
  }
 });
 return out;
}
/** Tilled-soil colour (sRGB 0-1) from fertility and moisture, muted. Dry and thin soil is paler and greyer; wet rich soil darker and browner. */
export function fieldSoilColour(fertility:number,moisture:number,seed:number):[number,number,number]{
 const f=Math.max(0,Math.min(1,fertility)),m=Math.max(0,Math.min(1,moisture)),v=(hash01(seed,3,5)-.5)*.06;
 const lum=.5+.10*(1-f)+.09*(1-m)+v;
 return[lum*1.0+.01*m,lum*.9-.02*m,lum*.75-.03*m];
}
/** 0 clean to 1 weedy: poorly tended or resting ground grows weeds. */
export function fieldWeeds(stage:FieldStage,tended:number){return stage==='fallow'?.85:stage==='bare'?.3:stage==='stubble'?.35:Math.max(.05,.5*(1-Math.max(0,Math.min(1,tended))));}
