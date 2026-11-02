import {fbm,mulberry32} from './rng';
import {variedLandforms} from './worldVariety';
import {composedGeography} from './composedGeography';
import {MULTILAND_GEOMETRY_GATES} from './multipleLandmasses';
import {WATER_Y} from './constants';
import type {WorldRequest} from './worldOptions';
import type {LandFeature} from './geography';
import type {LocalWaterBody} from './localWater';
export const COASTAL_VARIETY_RULES={version:15,channelMeters:24,ordinaryReliefMeters:16,outlineSampleCount:72,minimumSubstantialAreaSquareMeters:18000,minimumNormalizedOutlineDifference:.045,maximumOutlineAttempts:12} as const;
export const COASTAL_VARIETY_V16_RULES={...COASTAL_VARIETY_RULES,version:16,minimumNormalizedOutlineDifference:.09,maximumOutlineAttempts:32} as const;
type P={x:number;z:number};type Style='ordinary'|'elongated'|'headland-bay'|'lobed'|'rugged';
type Inlet={path:P[];width:number};
const clamp=(v:number)=>Math.max(0,Math.min(1,v)),smooth=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};
function nearest(x:number,z:number,path:P[]){let distance=Infinity,t=0,index=0;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z,k=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)),d=Math.hypot(x-a.x-k*dx,z-a.z-k*dz);if(d<distance){distance=d;t=k;index=i-1;}}return{distance,t,index};}
function radiusAlong(distance:(x:number,z:number)=>number,center:P,a:number,r:number){let lo=0,hi=r*2.5;for(let k=0;k<22;k++){const m=(lo+hi)/2;if(distance(center.x+Math.cos(a)*m,center.z+Math.sin(a)*m)>0)lo=m;else hi=m;}return lo;}

/** Scale/translation independent polar silhouette. Compare every rotation and
 * reflection, so a rotated or resized copy does not pass as a new island. */
export function coastOutline(island:{x:number;z:number;radius:number;distance:(x:number,z:number)=>number}){
 const radii=Array.from({length:COASTAL_VARIETY_RULES.outlineSampleCount},(_,i)=>radiusAlong(island.distance,island,i*Math.PI*2/COASTAL_VARIETY_RULES.outlineSampleCount,island.radius)),mean=radii.reduce((a,b)=>a+b,0)/radii.length;
 const points=radii.map((r,i)=>({x:Math.cos(i*Math.PI*2/COASTAL_VARIETY_RULES.outlineSampleCount)*r,z:Math.sin(i*Math.PI*2/COASTAL_VARIETY_RULES.outlineSampleCount)*r}));let area=0,perimeter=0;
 for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];area+=a.x*b.z-b.x*a.z;perimeter+=Math.hypot(a.x-b.x,a.z-b.z);}
 return{normalizedRadii:radii.map(r=>r/mean),circularity:4*Math.PI*Math.abs(area/2)/(perimeter*perimeter),radialVariation:Math.sqrt(radii.reduce((sum,r)=>sum+(r/mean-1)**2,0)/radii.length)};
}
export function outlineDifference(a:number[],b:number[]){
 let best=Infinity;for(const sign of[-1,1])for(let shift=0;shift<a.length;shift++){let error=0;for(let i=0;i<a.length;i++)error+=(a[i]-b[(shift+sign*i+a.length)%a.length])**2;best=Math.min(best,Math.sqrt(error/a.length));}return best;
}

/** V15 remains reproducible; V16 adds broader individual asymmetry and stricter checks.
 * Historical generation remains in worldVariety/multipleLandmasses.
 * A broad coastline skeleton and meaningful bay cuts precede terrain/water. */
export function diverseLandforms(seed:number,request:WorldRequest={},version:15|16=15){
 const old=variedLandforms(seed,request),size=old.options.size,rand=mulberry32(seed^0x151ca71),rules=version>=16?COASTAL_VARIETY_V16_RULES:COASTAL_VARIETY_RULES;
 const specs:{x:number;z:number;radius:number;angle:number;style:Style;primary:boolean}[]=[];
 if(old.mode==='major-islands'){
  const count=old.islands.length;
  for(let i=0;i<count;i++){
   const radius=size*(i===0?(count===2?.235:count===3?.225:.215):(count===2?.218:count===3?.18:count===4?.16:.145))*(.94+rand()*.12);
   let x=(rand()-.5)*size*.28,z=(rand()-.5)*size*.28;
   if(i){let best=-Infinity;for(let n=0;n<320;n++){const px=(rand()-.5)*size*.75,pz=(rand()-.5)*size*.75,edge=size*.485-Math.max(Math.abs(px),Math.abs(pz)),separation=Math.min(...specs.map(p=>Math.hypot(px-p.x,pz-p.z)-(radius+p.radius)*.65)),score=Math.min(edge-radius*.68,separation)+rand()*size*.018;if(score>best){best=score;x=px;z=pz;}}}
   const styles:Style[]=['ordinary','elongated','lobed','rugged'];specs.push({x,z,radius,angle:rand()*Math.PI*2,style:i===0?'headland-bay':styles[version>=16?((i-1+Math.floor(seed/7))%styles.length+styles.length)%styles.length:(i-1+Math.floor(seed/7))%styles.length],primary:i===0});
  }
 }else for(let i=0;i<old.islands.length;i++){const p=old.islands[i];specs.push({x:p.x,z:p.z,radius:p.radius,angle:p.angle??rand()*Math.PI*2,style:i===0?'headland-bay':i%2?'ordinary':'elongated',primary:i===0});}
 // Ensure ordinary usable terrain is present rather than making every island a spectacle.
 if(specs.length>1)specs[1].style='ordinary';
 const makeIsland=(spec:typeof specs[number],i:number,attempt:number)=>{
  const phase=rand()*Math.PI*2,aspect=(spec.primary?1.18:spec.style==='elongated'?1.65:spec.style==='ordinary'?1.25:1.12+rand()*.22)*(version>=16?(spec.primary?1: .80+rand()*.70)*(1+Math.min(attempt,10)*.04):(1+attempt*.055)),c=Math.cos(spec.angle),s=Math.sin(spec.angle),r=spec.radius;
  // Broad asymmetry changes the actual shoreline, independently of interior relief.
  const skew=version>=16?{phase:rand()*Math.PI*2,two:.035+rand()*.10,three:.025+rand()*.075,one:.03+rand()*.08}:null;
  const original=old.mode==='major-islands'||old.mode==='mainland-satellites'?null:old.islands[i];
  const base=(x:number,z:number)=>{
   if(original){const warp=fbm(x/size*7+seed%197,z/size*7+i*29,3)-.5,a=Math.atan2(z-spec.z,x-spec.x),bend=skew?r*(skew.two*Math.sin(a*3+skew.phase)+skew.one*Math.cos(a-phase)):0,d=original.distance(x,z)+warp*size*.055+bend;return skew?Math.min(d,size*.53-Math.abs(x),size*.53-Math.abs(z)):d;}
   const dx=x-spec.x,dz=z-spec.z,u=(dx*c+dz*s)/Math.sqrt(aspect),v=(-dx*s+dz*c)*Math.sqrt(aspect),a=Math.atan2(v,u),rough=spec.style==='ordinary'?.025:spec.style==='rugged'?.09:.05;
   const lobe=spec.style==='lobed'?.19*Math.sin(a*3+phase)+.065*Math.cos(a*5-phase):spec.style==='rugged'?.12*Math.sin(a*3+phase)+.07*Math.cos(a*7-phase):.055*Math.sin(a*2+phase);
   const warp=(fbm(x/r*2.4+seed%227,z/r*2.4-i*11,3)-.5)*r*rough;
   const asymmetry=skew?skew.two*Math.sin(a*2+skew.phase)+skew.three*Math.cos(a*3-phase)+skew.one*Math.cos(a-skew.phase):0;
   return r*(1+lobe+asymmetry)-Math.hypot(u,v)+warp;
  };
  const inlets:Inlet[]=[];
  if(original){const coast:P[]=[];for(let z=-size*.43;z<size*.43;z+=24)for(let x=-size*.43;x<size*.43;x+=24)if(Math.abs(base(x,z))<16&&original.domain(x,z)>-80)coast.push({x,z});
   for(let n=0;n<Math.min(2,coast.length);n++){const p=coast[Math.floor(rand()*coast.length)],gx=base(p.x+4,p.z)-base(p.x-4,p.z),gz=base(p.x,p.z+4)-base(p.x,p.z-4),len=Math.hypot(gx,gz)||1,nx=gx/len,nz=gz/len;inlets.push({width:r*.09,path:[{x:p.x-nx*r*.35,z:p.z-nz*r*.35},p,{x:p.x+nx*r*.24-nz*r*.06,z:p.z+nz*r*.24+nx*r*.06}]});}
  }else{
   const count=spec.style==='ordinary'?1:spec.style==='rugged'?3:2;
   for(let n=0;n<count;n++){const a=phase+n*Math.PI*2/count+rand()*.4,edge=radiusAlong(base,spec,a,r),depth=spec.primary?r*.16:spec.style==='ordinary'?r*.17:r*(.30+rand()*.12),width=r*(spec.primary?.045:spec.style==='ordinary'?.09:.065+rand()*.025),dx=Math.cos(a),dz=Math.sin(a);
    inlets.push({width,path:[{x:spec.x+dx*(edge+r*.24),z:spec.z+dz*(edge+r*.24)},{x:spec.x+dx*(edge-depth*.35)-dz*depth*.1,z:spec.z+dz*(edge-depth*.35)+dx*depth*.1},{x:spec.x+dx*(edge-depth),z:spec.z+dz*(edge-depth)}]});
   }
  }
  const distance=(x:number,z:number)=>{
   let d=base(x,z);for(const inlet of inlets){const hit=nearest(x,z,inlet.path),width=inlet.width*(1-.35*(hit.index+hit.t)/(inlet.path.length-1));d=Math.min(d,hit.distance-width);}
   if(!original){d=Math.min(d,size*.485-Math.abs(x),size*.485-Math.abs(z));if(old.mode==='major-islands')for(let j=0;j<specs.length;j++)if(j!==i){const other=specs[j],territory=(Math.hypot(x-other.x,z-other.z)-other.radius-Math.hypot(x-spec.x,z-spec.z)+r)/2-COASTAL_VARIETY_RULES.channelMeters/2;d=Math.min(d,territory);}}
   return d;
  };
  return{...spec,inlets,distance,domain:original?(x:number,z:number)=>Math.min(distance(x,z),original.domain(x,z)):distance};
 };
 const islands:ReturnType<typeof makeIsland>[]=[],outlines:ReturnType<typeof coastOutline>[]=[];
 for(let i=0;i<specs.length;i++){
  let accepted=false;
  for(let attempt=0;attempt<rules.maximumOutlineAttempts;attempt++){
   const island=makeIsland(specs[i],i,attempt),outline=coastOutline(island);
   if(outlines.some(other=>outlineDifference(outline.normalizedRadii,other.normalizedRadii)<rules.minimumNormalizedOutlineDifference))continue;
   islands.push(island);outlines.push(outline);accepted=true;break;
  }
  if(!accepted)throw new Error(`V${version} could not produce a distinct coastline for landmass ${i}`);
 }

 return{options:old.options,mode:old.mode,islands,outlines,version,distance:(x:number,z:number)=>Math.max(...islands.map(i=>i.distance(x,z)))};
}
/** Only one coherent dramatic catchment supplies the full map catalogue.
 * Other landmasses retain physically rolling everyday terrain and some brooks. */
export function diverseGeography(seed:number,size:number,land:ReturnType<typeof diverseLandforms>){
 const primary=land.islands[0],drama=composedGeography(seed,size,primary.domain,{reliefScale:1,pillars:true,dunes:true,plateau:true,canyonWidthScale:.72,valleyShoulderReliefMeters:30,shoreDistance:primary.distance,angleRadians:primary.angle,mouthStepMetres:20,broadValley:true},120);
 const ordinary=land.islands.slice(1).map((island,i)=>{
  const angle=island.angle+1.2,edge=radiusAlong(island.distance,island,angle,island.radius),stream=i%2===0;
  const pts=Array.from({length:10},(_,n)=>{const t=n/9,along=edge*t;return{x:island.x+Math.cos(angle)*along-Math.sin(angle)*Math.sin(t*Math.PI*2)*island.radius*.055*Math.sin(t*Math.PI),z:island.z+Math.sin(angle)*along+Math.cos(angle)*Math.sin(t*Math.PI*2)*island.radius*.055*Math.sin(t*Math.PI),y:WATER_Y+2.6*(1-t)+.12};});
  const bodies:LocalWaterBody[]=stream?[{kind:'river',id:`ordinary-${i}-brook`,width:4.5,pts}]:[];
  const features:LandFeature[]=[{kind:'hills',x:island.x,z:island.z,radius:island.radius*.7},...(stream?[{kind:'valley' as const,x:pts[4].x,z:pts[4].z,radius:28}]:[])];
  return{island,pts,stream,bodies,features};
 });
 const ordinaryHeight=(x:number,z:number,d:number)=>{const shore=smooth(d/24),broad=fbm(x*.006+seed%331,z*.006-17,4),folds=fbm(x*.018-seed%137,z*.018+43,3);return WATER_Y+shore*(3+broad*9+Math.max(0,folds-.45)*12);};
 const metrics={...drama.metrics,...(land.version>=16?{version:6,dramaticRegionCount:1,outlineMinimumDifference:COASTAL_VARIETY_V16_RULES.minimumNormalizedOutlineDifference}:{version:5}),regions:[...drama.metrics.regions,...ordinary.map(o=>({x:o.island.x,z:o.island.z,areaSquareMeters:0,designedReliefMeters:COASTAL_VARIETY_RULES.ordinaryReliefMeters,drainageLengthMeters:o.stream?o.island.radius:0,dramatic:false,lake:false}))],landmassProfiles:land.islands.map((p,i)=>({x:p.x,z:p.z,coastStyle:p.style,dramatic:i===0,inletCutCount:p.inlets.length,outline:land.outlines[i],minimumOutlineDifference:land.outlines.length>1?Math.min(...land.outlines.filter((_,j)=>j!==i).map(o=>outlineDifference(o.normalizedRadii,land.outlines[i].normalizedRadii))):null})),requiredFeatureFamilies:[...new Set(drama.features.map(f=>f.kind))]};
 return{...drama,metrics,features:[...drama.features,...ordinary.flatMap(o=>o.features),...land.islands.flatMap(i=>i.inlets.map((p,n)=>({kind:n?'cove' as const:'bay' as const,...p.path[1],radius:p.width*2})))],rivers:[...drama.rivers,...ordinary.filter(o=>o.stream).map(o=>({pts:o.pts,w:4.5}))],waterBodies:[...drama.waterBodies,...ordinary.flatMap(o=>o.bodies)],waterfalls:drama.waterfalls,
  elevation(x:number,z:number,h:number,water:number){let owner=0,best=-Infinity;for(let i=0;i<land.islands.length;i++){const d=land.islands[i].distance(x,z);if(d>best){best=d;owner=i;}}
   if(owner===0){let result=drama.elevation(x,z,h,water);for(const peak of drama.peakMarks){const d=Math.hypot(x-peak.x,z-peak.z),width=drama.radius*.16;if(d<width)result+=28*smooth(1-d/width);}return result;}
   const o=ordinary[owner-1];let result=ordinaryHeight(x,z,best);if(o.stream){const hit=nearest(x,z,o.pts);if(hit.distance<24){const a=o.pts[hit.index],b=o.pts[hit.index+1],level=a.y+(b.y-a.y)*hit.t,blend=1-smooth((hit.distance-2.25)/21.75);result=result*(1-blend)+(level-.7)*blend;}}
   return result;
  },
  measure(height:(x:number,z:number)=>number){const measured=drama.measure(height);for(const [key,min]of Object.entries(MULTILAND_GEOMETRY_GATES))if(measured[key as keyof typeof MULTILAND_GEOMETRY_GATES]<min)throw new Error(`V15 actual map geography failed ${key}: ${measured[key as keyof typeof MULTILAND_GEOMETRY_GATES]} < ${min}`);return measured;},
 };
}
