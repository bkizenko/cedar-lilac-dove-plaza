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
/** `noStone` (terrain model v3 hillside fields that are not stone-terraced): a steep field keeps an earth bank or a hedge, never a drystone wall. */
export function boundaryKind(era:number,variant:number,grade=0,noStone=false):BoundaryKind{
 const e=Math.max(0,Math.floor(era)),v=((Math.floor(variant)%4)+4)%4;
 if(!noStone&&e>=1&&grade>.35)return'stone';
 if(e<=0)return'bank';
 if(e===1)return v%2===0?'wattle':'bank';
 if(e===2)return v===2?(noStone?'bank':'stone'):v===1?'wattle':'hedge';
 return v%2===1?(noStone?'hedge':'stone'):'hedge';
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
export interface BoundarySite{x:number;z:number;yaw:number;scale:number;tint:number;/** metres along the line, from this site's start point to the next */len:number;/** width/thickness factor */thick:number;/** which geometry variant (0..variants-1) */variant:number;/** a gate leaf fills this stretch instead of the boundary kind */gate:boolean}
/** `step` is the mean piece length in metres; pieces vary +-35% and run corner to corner along the drawn soil edge, so there is no even beat. */
export const BOUNDARY_RULES=Object.freeze({step:{bank:2,wattle:1.4,hedge:1.2,stone:1.35} as Record<BoundaryKind,number>,variants:{bank:2,wattle:2,hedge:2,stone:2} as Record<BoundaryKind,number>,maximumPerField:180,inset:.6,gapMetres:2.4,gateMetres:1.6,crossingMetres:1.3,
 /** chance a piece is left out (hedge gaps), made low (tumbled wall) or broken (wattle) */gapChance:{bank:0,wattle:0,hedge:.06,stone:0} as Record<BoundaryKind,number>,lowChance:{bank:0,wattle:.06,hedge:0,stone:.07} as Record<BoundaryKind,number>});
/** Detail tiers by 3D camera distance to a field: full geometry, then low-poly boundary and thinned crops, then nothing (the soil shader already carries the stage tint). */
export const FIELD_DETAIL_TIERS={low:{full:60,max:130},med:{full:110,max:230},high:{full:150,max:300}} as const;
export function fieldDetailTier(quality:'low'|'med'|'high',distance:number):0|1|2{const t=FIELD_DETAIL_TIERS[quality]??FIELD_DETAIL_TIERS.med;return distance<t.full?0:distance<t.max?1:2;}
export interface BoundaryOptions{/** world points where a trail crosses near this field: the boundary opens there (gap or gate) */crossings?:readonly {x:number;z:number}[]}
/** Pieces along the edges that are not merged with a neighbour, corner to corner around the drawn (wobbling, rounded) soil edge.
 * One gate on the longest open side, a gap or gate wherever a trail crosses, and kind-specific gaps and low sections. */
export function boundarySites(f:{id:number;x:number;z:number;w:number;d:number},mask:number,kind:BoundaryKind,opts:BoundaryOptions={}):BoundarySite[]{
 const R=BOUNDARY_RULES,hw=f.w/2,hd=f.d/2;
 // North, east, south, west; each runs from its start corner to the next corner, so neighbouring sides meet exactly.
 const sides=[{bit:EDGE.N,x0:-hw,z0:-hd,x1:hw,z1:-hd,len:2*hw,nx:0,nz:1},{bit:EDGE.E,x0:hw,z0:-hd,x1:hw,z1:hd,len:2*hd,nx:-1,nz:0},{bit:EDGE.S,x0:hw,z0:hd,x1:-hw,z1:hd,len:2*hw,nx:0,nz:-1},{bit:EDGE.W,x0:-hw,z0:hd,x1:-hw,z1:-hd,len:2*hd,nx:1,nz:0}].map((s,i)=>({...s,i,open:!(mask&s.bit)}));
 const open=sides.filter(s=>s.open);if(!open.length)return[];
 const total=open.reduce((a,s)=>a+s.len,0),step=Math.max(R.step[kind],total/R.maximumPerField);
 let longest=open[0];for(const s of open)if(s.len>longest.len)longest=s;
 const gateAt=.3+.4*hash01(f.id,7,1),out:BoundarySite[]=[],cross=opts.crossings??[];
 // Walk inward from a point on the rectangle to where the drawn soil edge actually is (bisection; the outline wobbles and rounds corners).
 const snap=(bx:number,bz:number,nx:number,nz:number,toCentre:boolean)=>{
  let inx=nx,inz=nz,hi=Math.min(f.w,f.d)/2;
  if(toCentre||fieldEdgeDepth(f,mask,bx+inx*hi,bz+inz*hi)<0){const cx=f.x-bx,cz=f.z-bz,len=Math.hypot(cx,cz)||1;inx=cx/len;inz=cz/len;hi=len;}
  let lo=0;for(let it=0;it<10;it++){const m=(lo+hi)/2;if(fieldEdgeDepth(f,mask,bx+inx*m,bz+inz*m)<0)lo=m;else hi=m;}
  return{x:bx+inx*(hi+.15),z:bz+inz*(hi+.15)};
 };
 for(const s of open){
  const n=Math.max(1,Math.round(s.len/step)),w:number[]=[];let sum=0;for(let k=0;k<n;k++){const v=.65+.7*hash01(f.id,k,s.i+11);w.push(v);sum+=v;}
  const pts:{x:number;z:number}[]=[];let acc=0;
  for(let k=0;k<=n;k++){
   const t=k===n?1:acc/sum;if(k<n)acc+=w[k];
   const bx=f.x+s.x0+(s.x1-s.x0)*t,bz=f.z+s.z0+(s.z1-s.z0)*t,corner=k===0||k===n;
   pts.push(snap(bx,bz,s.nx,s.nz,corner));
  }
  // Which piece holds the gate on the longest side.
  let gateK=-1;if(s===longest){let best=1e9,acc2=0;for(let k=0;k<n;k++){const tm=(acc2+w[k]/2)/sum;acc2+=w[k];const dd=Math.abs(tm-gateAt);if(dd<best){best=dd;gateK=k;}}}
  let prevGap=true; // never open with a gap, never two gaps in a row
  for(let k=0;k<n;k++){
   const a=pts[k],b=pts[k+1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);if(len<.15)continue;
   const mx=(a.x+b.x)/2,mz=(a.z+b.z)/2,yaw=Math.atan2(-dz,dx),r=hash01(f.id,k,s.i+97);
   let crossed=false;for(const c of cross)if(Math.hypot(c.x-mx,c.z-mz)<len/2+R.crossingMetres){crossed=true;break;}
   const base={x:mx,z:mz,yaw,len,tint:hash01(f.id,k,s.i+83),variant:Math.floor(hash01(f.id,k,s.i+53)*R.variants[kind])%R.variants[kind]};
   if(k===gateK||(crossed&&r<.5)){out.push({...base,scale:1,thick:1,gate:true,len:Math.max(R.gateMetres,len),variant:0});prevGap=false;continue;}
   if(crossed){prevGap=true;continue;}
   if(!prevGap&&r<R.gapChance[kind]){prevGap=true;continue;}
   prevGap=false;
   const low=hash01(f.id,k,s.i+131)<R.lowChance[kind];
   out.push({...base,scale:(.82+.4*hash01(f.id,k,s.i+71))*(low?.5:1),thick:.85+.3*hash01(f.id,k,s.i+109),gate:false});
  }
 }
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
