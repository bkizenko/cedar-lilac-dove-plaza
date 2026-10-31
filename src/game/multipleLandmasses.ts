import {fbm,mulberry32} from './rng';
import {composedGeography} from './composedGeography';
import {landforms} from './landforms';
import type {WorldRequest} from './worldOptions';
/** V13 only. Physical component gates use final sampled terrain, never lobe count. */
export const MULTILAND_RULES={minimumCount:2,maximumCount:5,minimumAreaSquareMeters:18000,maximumLargestShare:.62,minimumSecondShare:.13} as const;
export const MULTILAND_GEOMETRY_GATES={mountainProminenceMeters:30,summitCount:3,canyonMedianDepthMeters:18,cliffMaxRiseOver16Meters:12,terraceBenchCount:3,plateauHighAreaSquareMeters:1500,pillarCount:5,valleyFlankReliefMeters:8,waterfallBedDropMeters:6.5,hillsTransectReliefMeters:4,dunesTransectReliefMeters:2,lakeWetAreaSquareMeters:700} as const;
export function multipleLandmasses(seed:number,request:WorldRequest={}){
 const options=landforms(seed,request,true).options,size=options.size,rand=mulberry32(seed^0x713ac81^({pangaea:0,continents:0x139a,archipelago:0x421b}[options.layout]));
 const count=2+Math.floor(rand()*4),phase=rand()*Math.PI*2;
 // All regions retain room for a complete catchment. The ring spacing leaves a
 // real sea channel; independent coastline noise never supplies land bridges.
 const ring=size*(count===2?.235:count===3?.275:count===4?.295:.315);
 const nominal=size*(count===2?.205:count===3?.178:count===4?.166:.151);
 const islands=Array.from({length:count},(_,i)=>{
  const angle=phase+i*Math.PI*2/count,x=Math.cos(angle)*ring,z=Math.sin(angle)*ring;
  const radius=nominal*((count===2?.91:count===3?.87:count===4?.90:.96)+rand()*(count===2?.18:count===3?.23:count===4?.20:.13)),stretch=.94+rand()*.12,orientation=rand()*Math.PI;
  const distance=(px:number,pz:number)=>{
   const dx=px-x,dz=pz-z,c=Math.cos(orientation),s=Math.sin(orientation);
   const u=dx*c+dz*s,v=-dx*s+dz*c;
   const coast=(fbm(px*.013+seed%331+i*17,pz*.013-i*23,3)-.5)*radius*.11;
   return Math.min((1-Math.hypot(u/(radius*stretch),v/(radius/stretch)))*radius+coast,size*.485-Math.abs(px),size*.485-Math.abs(pz));
  };return{x,z,radius,distance};
 });
 return{options,islands,distance:(x:number,z:number)=>Math.max(...islands.map(i=>i.distance(x,z)))};
}
export function multipleGeography(seed:number,size:number,land:ReturnType<typeof multipleLandmasses>){
 const regions=land.islands.map((island,i)=>{
  const profile=i===0?{reliefScale:1,pillars:true,dunes:true,plateau:true}:i%3===1?{reliefScale:.65,pillars:false,dunes:true,plateau:false}:i%3===2?{reliefScale:1.25,pillars:true,dunes:false,plateau:true}:{reliefScale:.85,pillars:false,dunes:false,plateau:true};
  return composedGeography(seed+i*104729,size,island.distance,{...profile,canyonWidthScale:Math.min(.72,island.radius/240),valleyShoulderReliefMeters:30},120);
 });
 const owner=(x:number,z:number)=>{let best=0,d=-Infinity;for(let i=0;i<land.islands.length;i++){const n=land.islands[i].distance(x,z);if(n>d){d=n;best=i;}}return regions[best];};
 const first=regions[0],metrics={...first.metrics,version:3,landmassCount:regions.length,substantialLandmassCount:regions.length,regions:regions.flatMap(r=>r.metrics.regions),requiredFeatureFamilies:[...new Set(regions.flatMap(r=>r.metrics.requiredFeatureFamilies))],regionalGeometry:[] as {center:{x:number;z:number};families:string[];geometry:ReturnType<typeof first.measure>}[]};
 return{...first,metrics,features:regions.flatMap(r=>r.features),rivers:regions.flatMap(r=>r.rivers),waterBodies:regions.flatMap((r,i)=>r.waterBodies.map(b=>({...b,id:`land-${i}-${b.id}`}))),waterfalls:regions.flatMap(r=>r.waterfalls),
  coast(_x:number,_z:number,d:number){return d;},elevation(x:number,z:number,h:number,water:number){return owner(x,z).elevation(x,z,h,water);},
  measure(height:(x:number,z:number)=>number){metrics.regionalGeometry=regions.map(r=>({center:r.center,families:r.features.map(f=>f.kind),geometry:r.measure(height)}));
   for(const [key,minimum] of Object.entries(MULTILAND_GEOMETRY_GATES))if(!metrics.regionalGeometry.some(r=>r.geometry[key as keyof typeof MULTILAND_GEOMETRY_GATES]>=minimum))throw new Error(`V13 measured geography coverage failed: ${key} requires ${minimum}; measured ${metrics.regionalGeometry.map(r=>r.geometry[key as keyof typeof MULTILAND_GEOMETRY_GATES]).join(',')}`);
   return metrics.regionalGeometry[0].geometry;},
 };
}
export function measureLandmasses(heights:Float32Array,segs:number,size:number,waterAt:(x:number,z:number)=>number){
 const width=segs+1,step=size/segs,seen=new Uint8Array(heights.length),components:{areaSquareMeters:number;center:{x:number;z:number}}[]=[];
 for(let i=0;i<heights.length;i++){
  const x=i%width*step-size/2,z=Math.floor(i/width)*step-size/2;
  if(seen[i]||heights[i]<=waterAt(x,z)+.25)continue;
  const queue=[i];seen[i]=1;let sx=0,sz=0;
  for(let q=0;q<queue.length;q++){const at=queue[q];sx+=at%width*step-size/2;sz+=Math.floor(at/width)*step-size/2;
   for(const n of [at%width?at-1:-1,at%width<width-1?at+1:-1,at>=width?at-width:-1,at<width*(width-1)?at+width:-1])if(n>=0&&!seen[n]){
    const nx=n%width*step-size/2,nz=Math.floor(n/width)*step-size/2;
    if(heights[n]>waterAt(nx,nz)+.25){seen[n]=1;queue.push(n);}
   }
  }
  components.push({areaSquareMeters:queue.length*step*step,center:{x:sx/queue.length,z:sz/queue.length}});
 }
 components.sort((a,b)=>b.areaSquareMeters-a.areaSquareMeters);
 const total=components.reduce((n,c)=>n+c.areaSquareMeters,0),substantial=components.filter(c=>c.areaSquareMeters>=MULTILAND_RULES.minimumAreaSquareMeters);
 return{surveyCellMeters:step,totalDryAreaSquareMeters:total,components,substantialLandmassCount:substantial.length,largestLandmassShare:(components[0]?.areaSquareMeters??0)/total,secondLandmassShare:(components[1]?.areaSquareMeters??0)/total,secondLandmassAreaSquareMeters:components[1]?.areaSquareMeters??0};
}
