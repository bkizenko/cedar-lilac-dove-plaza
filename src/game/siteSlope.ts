/** Sloping ground is allowed. A rigid building (hut, house, hall, workshop...) stands on a levelled plinth that fills the fall under its walls
 * (scene/buildingGrounding.ts), so the only honest refusals are a cliff-like drop or a site where the plinth would be absurdly tall.
 * Tolerance grows with the footprint: a bigger building is levelled by a bigger platform. Pure, shared by placementIssue and the ghost. */
import type {BldType} from './types';
export const SLOPE_RULES={baseReliefMetres:.9,reliefPerFootprintMetre:.2,maximumReliefMetres:3,maximumGrade:1.05,sampleStepMetres:1.5,maximumSamples:81} as const;
/** Rigid roofed buildings that get a levelled plinth. Fields, pens, walls, docks, water works, camps and ground-laid floors follow the earth instead. Independent of the renderer so headless sims agree with the preview. */
const RIGID=new Set<string>(['hut','house','townhall','barracks','grindingStone','workshop','forge','kiln','potter','fibreWorkshop','tailor','tanner','butcher','dryrack','smokehouse','oven','watchtower','temple','market','keep','stables','university']);
export const needsLevelledPlinth=(type:BldType)=>RIGID.has(type);
export const reliefAllowance=(w:number,d:number)=>Math.min(SLOPE_RULES.maximumReliefMetres,SLOPE_RULES.baseReliefMetres+SLOPE_RULES.reliefPerFootprintMetre*Math.max(w,d));
export type SiteRelief={range:number;maxGrade:number;min:number;max:number;allowance:number;ok:boolean;samples:number};
/** Survey the footprint on a bounded grid: height range, steepest step between neighbouring samples, and the verdict. */
export function siteRelief(height:(x:number,z:number)=>number,x:number,z:number,w:number,d:number):SiteRelief{
 const R=SLOPE_RULES,nx=Math.max(2,Math.min(8,Math.ceil(w/R.sampleStepMetres))),nz=Math.max(2,Math.min(8,Math.ceil(d/R.sampleStepMetres)));
 const h:number[][]=[];let lo=Infinity,hi=-Infinity;
 for(let iz=0;iz<=nz;iz++){const row:number[]=[];for(let ix=0;ix<=nx;ix++){const v=height(x-w/2+w*ix/nx,z-d/2+d*iz/nz);row.push(v);lo=Math.min(lo,v);hi=Math.max(hi,v);}h.push(row);}
 let grade=0;const sx=w/nx,sz=d/nz;
 for(let iz=0;iz<=nz;iz++)for(let ix=0;ix<=nx;ix++){if(ix<nx)grade=Math.max(grade,Math.abs(h[iz][ix+1]-h[iz][ix])/sx);if(iz<nz)grade=Math.max(grade,Math.abs(h[iz+1][ix]-h[iz][ix])/sz);}
 const allowance=reliefAllowance(w,d),range=hi-lo;
 return{range,maxGrade:grade,min:lo,max:hi,allowance,ok:range<=allowance&&grade<=R.maximumGrade,samples:(nx+1)*(nz+1)};
}
export function siteSlopeIssue(height:(x:number,z:number)=>number,type:BldType,x:number,z:number,w:number,d:number):string|null{
 if(!needsLevelledPlinth(type))return null;const r=siteRelief(height,x,z,w,d);
 return r.ok?null:`Too steep to level a foundation here (${r.range.toFixed(1)} m fall across the site, up to ${r.allowance.toFixed(1)} m is fine) — pick a gentler slope`;
}
/** Cut-and-fill platform under a sloping rigid building: world-space box from below the lowest wall contact up to just under the floor. Null on near-level ground. */
export function levellingPlinth(type:BldType,b:{x:number;z:number;w:number;d:number},level:number,bottom:number,burial:number){
 if(!needsLevelledPlinth(type)||level-bottom<=.3)return null;const lo=bottom-burial-.2,top=level-.02;
 return{x:b.x,z:b.z,y:(top+lo)/2,length:b.w+.5,width:b.d+.5,height:top-lo,yaw:0,kind:'plinth' as const};
}
