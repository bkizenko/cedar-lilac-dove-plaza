import {localWaterAt,type LocalWaterBody} from './localWater';
import {fbm} from './rng';
import type {EcologyWorld} from './ecologicalProvinces';
/** A bounded generation-time floodplain operation for v12. Never invoked for
 * older saved worlds; does not grant resources or alter required canyon walls. */
export const RIPARIAN_REPAIR_RULES={minimumGenerationVersion:12,innerBankMeters:6,bankWidthMeters:104,sideChannelWidthMeters:12,edgeBlendMeters:18,minimumClearanceMeters:1.4,maximumCutMeters:14,protectedCanyonMargin:1.08} as const;
export function repairRiparianTerrain(world:EcologyWorld,seed:number,generationVersion:number){
 if(generationVersion<RIPARIAN_REPAIR_RULES.minimumGenerationVersion)throw new Error('Riparian repair is only supported for new v12 generation');
 const original=world.heights.slice(),rules=RIPARIAN_REPAIR_RULES,n=Math.round(Math.sqrt(world.heights.length)),segs=n-1,cell=world.size/segs;
 const lower=world.waterBodies?.find(b=>b.kind==='river'&&b.id==='lower-river');
 if(!lower||lower.kind!=='river')throw new Error('Floodplain repair requires a real downstream river');
 const canyon=world.features?.find(f=>f.kind==='canyon'),fall=world.features?.find(f=>f.kind==='waterfall');
 // A real, connected floodplain side-channel extends groundwater access;
 // moving a biome label farther from water would not repair physical habitat.
 const existing=world.waterBodies?.find(b=>b.id==='floodplain-side-channel');
 let sideChannel=existing;
 if(!sideChannel){
  const j=Math.min(lower.pts.length-3,Math.max(1,Math.floor(lower.pts.length*.57))),a=lower.pts[j],b=lower.pts[j+1],length=Math.hypot(b.x-a.x,b.z-a.z)||1,tx=(b.x-a.x)/length,tz=(b.z-a.z)/length;
  const sampleHeight=(x:number,z:number)=>{const gx=Math.max(0,Math.min(segs,Math.round((x/world.size+.5)*segs))),gz=Math.max(0,Math.min(segs,Math.round((z/world.size+.5)*segs)));return world.heights[gz*n+gx];};
  const sign=sampleHeight(a.x-tz*90,a.z+tx*90)>sampleHeight(a.x+tz*90,a.z-tx*90)?1:-1,nx=-tz*sign,nz=tx*sign,join=lower.pts[Math.min(lower.pts.length-1,j+12)];
  const head={x:a.x+nx*110-tx*40,z:a.z+nz*110-tz*40},bend={x:a.x+nx*70+tx*25,z:a.z+nz*70+tz*25};
  sideChannel={kind:'river',id:'floodplain-side-channel',width:rules.sideChannelWidthMeters,pts:Array.from({length:17},(_,i)=>{const t=i/16,k=1-t;return{x:k*k*head.x+2*k*t*bend.x+t*t*join.x,z:k*k*head.z+2*k*t*bend.z+t*t*join.z,y:join.y+.16*(1-t)};})};
  world.waterBodies?.push(sideChannel);
 }
 const courses=[lower,...(sideChannel?.kind==='river'?[sideChannel]:[])];
 let changedCells=0,cutVolumeCubicMeters=0,maximumCutMeters=0;
 for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){
  const x=(ix/segs-.5)*world.size,z=(iz/segs-.5)*world.size,index=iz*n+ix,old=world.heights[index];
  if(canyon&&Math.hypot(x-canyon.x,z-canyon.z)<canyon.radius*rules.protectedCanyonMargin)continue;
  if(fall&&Math.hypot(x-fall.x,z-fall.z)<55)continue;
  let distance=Infinity,surface=world.baseWaterY;
  for(const course of courses)for(let i=1;i<course.pts.length;i++){
   const a=course.pts[i-1],b=course.pts[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1))),d=Math.hypot(x-a.x-t*dx,z-a.z-t*dz);
   if(d<distance){distance=d;surface=a.y+(b.y-a.y)*t;}
  }
  if(distance<rules.innerBankMeters||distance>rules.bankWidthMeters+rules.edgeBlendMeters||old<surface+.8||old>surface+rules.maximumCutMeters)continue;
  const fade=Math.max(0,Math.min(1,(rules.bankWidthMeters+rules.edgeBlendMeters-distance)/rules.edgeBlendMeters));
  const blend=fade*fade*(3-2*fade),target=surface+rules.minimumClearanceMeters+distance*.018+fbm(x*.025+seed%631,z*.025,3)*.35;
  if(target>=old)continue;const next=old+(target-old)*blend,cut=old-next;
  world.heights[index]=next;changedCells++;cutVolumeCubicMeters+=cut*cell*cell;maximumCutMeters=Math.max(maximumCutMeters,cut);
 }
 if(sideChannel?.kind==='river')for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){
  const x=(ix/segs-.5)*world.size,z=(iz/segs-.5)*world.size,index=iz*n+ix;
  const surface=localWaterAt([sideChannel],x,z);
  if(surface!==null){world.heights[index]=Math.min(world.heights[index],surface-.65);if(world.waterHeights)world.waterHeights[index]=Math.max(world.waterHeights[index],surface);}
 }
 changedCells=0;cutVolumeCubicMeters=0;maximumCutMeters=0;
 for(let i=0;i<original.length;i++){const cut=original[i]-world.heights[i];if(cut>1e-6){changedCells++;cutVolumeCubicMeters+=cut*cell*cell;maximumCutMeters=Math.max(maximumCutMeters,cut);}}
 return{sideChannelAdded:!existing,changedCells,affectedAreaSquareMeters:changedCells*cell*cell,cutVolumeCubicMeters,maximumCutMeters};
}
