import {mulberry32,fbm} from './rng';
import {landforms} from './landforms';
import {composedGeography} from './composedGeography';
import {multipleLandmasses,multipleGeography,MULTILAND_GEOMETRY_GATES} from './multipleLandmasses';
import {sampleHeight} from './worldgen';
import type {WorldRequest,WorldOptions} from './worldOptions';
export type LandMode='major-islands'|'edge-continent'|'divided-continent'|'mainland-satellites';
export const VARIETY_RULES={version:14,randomWeights:{'major-islands':.55,'edge-continent':.20,'divided-continent':.18,'mainland-satellites':.07},archipelagoMainlandProbability:.08,minimumTownSpacingMeters:100,usableAreaPerTownSquareMeters:70000,maximumTownsPerLandmass:3,continuationWidthMeters:160,
 landFraction:{'major-islands':[.18,.50],'edge-continent':[.52,.88],'divided-continent':[.65,.94],'mainland-satellites':[.25,.56]}} as const;
const clamp=(v:number)=>Math.max(0,Math.min(1,v));const smooth=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};
type Island={x:number;z:number;radius:number;distance:(x:number,z:number)=>number;domain:(x:number,z:number)=>number;angle?:number;primary:boolean};
export function variedLandforms(seed:number,request:WorldRequest={}){
 const validated=landforms(seed,request,true).options,size=validated.size,rand=mulberry32(seed^0x14ca913);
 const randomLayout=request.randomLayout===true||request.layout===undefined||request.layout==='random',selection=randomLayout?'random':request.layout;
 let mode:LandMode;
 if(selection==='pangaea')mode='edge-continent';else if(selection==='continents')mode='divided-continent';else if(selection==='archipelago')mode=rand()<VARIETY_RULES.archipelagoMainlandProbability?'mainland-satellites':'major-islands';else{let roll=rand();mode='major-islands';for(const [key,weight] of Object.entries(VARIETY_RULES.randomWeights)){roll-=weight;if(roll<0){mode=key as LandMode;break;}}}
 // rulersVersion is a sim-lane flag (Game.reset → state.worldOptions), not a worldgen option; omit it so default hashes and save/load geography stay identical.
 const options:WorldOptions={...(request.flowFieldVersion===1?{flowFieldVersion:1 as const}:{}),size,layout:mode==='edge-continent'?'pangaea':mode==='divided-continent'?'continents':'archipelago',...(randomLayout?{randomLayout:true as const}:{}),...(request.openingSiteVersion===1?{}:{openingSiteVersion:2 as const}),...(request.riverProfileVersion===2?{riverProfileVersion:2 as const}:{}),...(request.tideVersion===1||request.tideVersion===2?{tideVersion:request.tideVersion}:{}),...(request.landformLabelVersion===2?{landformLabelVersion:2 as const}:{})};
 if(mode==='major-islands'){const old=multipleLandmasses(seed,options);return{...old,options,mode,islands:old.islands.map(i=>({...i,domain:i.distance,primary:true} as Island))};}
 const angle=rand()*Math.PI*2,nx=Math.cos(angle),nz=Math.sin(angle),tx=-nz,tz=nx,islands:Island[]=[];
 const island=(x:number,z:number,rx:number,rz:number,primary=true)=>{
  const distance=(px:number,pz:number)=>{const u=px-x,v=pz-z;return(1-Math.hypot(u/rx,v/rz))*Math.min(rx,rz)+(fbm(px/size*19+seed%331,pz/size*19,3)-.5)*size*.022;};
  islands.push({x,z,radius:Math.min(rx,rz),distance,domain:distance,primary});
 };
 if(mode==='mainland-satellites'){
  island(-size*.13,0,size*(.315+rand()*.025),size*(.305+rand()*.025));
  island(size*.35,size*.29,size*.10,size*.115,false);island(size*.35,-size*.29,size*.11,size*.095,false);
 }else if(mode==='edge-continent'){
  const coast=(x:number,z:number)=>size*(.205+(fbm(x/size*5+seed%353,z/size*5,3)-.5)*.13)-(x*nx+z*nz);
  const x=-nx*size*.10,z=-nz*size*.10,radius=size*.28,domain=(px:number,pz:number)=>Math.min(coast(px,pz),radius-Math.hypot(px-x,pz-z));
  islands.push({x,z,radius,distance:coast,domain,angle,primary:true});
 }else{
  const channel=(x:number,z:number)=>size*(.065+.012*Math.sin((x*nx+z*nz)/size*11+seed%23));
  const center=(x:number,z:number)=>size*.055*Math.sin((x*nx+z*nz)/size*8+seed%19);
  for(const side of [-1,1]){const x=tx*side*size*.29,z=tz*side*size*.29,radius=size*.25;
   const distance=(px:number,pz:number)=>side*(px*tx+pz*tz-center(px,pz))-channel(px,pz),domain=(px:number,pz:number)=>Math.min(distance(px,pz),radius-Math.hypot(px-x,pz-z));
   islands.push({x,z,radius,distance,domain,angle:Math.atan2(-tz*side,-tx*side),primary:true});
  }
 }
 const distance=(x:number,z:number)=>Math.max(...islands.map(i=>i.distance(x,z)));
 return{options,mode,islands,distance};
}
export function variedGeography(seed:number,size:number,land:ReturnType<typeof variedLandforms>){
 if(land.mode==='major-islands')return multipleGeography(seed,size,land);
 const sources=land.islands.filter(i=>i.primary),regions=sources.map((island,i)=>composedGeography(seed+i*104729,size,island.domain,{reliefScale:i?1.12:1,pillars:true,dunes:!i,plateau:true,canyonWidthScale:.72,valleyShoulderReliefMeters:30,shoreDistance:island.distance,angleRadians:island.angle,mouthStepMetres:40,broadValley:true},120));
 const first=regions[0],metrics={...first.metrics,version:4,regions:regions.flatMap(r=>r.metrics.regions),requiredFeatureFamilies:[...new Set(regions.flatMap(r=>r.metrics.requiredFeatureFamilies))],regionalGeometry:[] as {center:{x:number;z:number};families:string[];geometry:ReturnType<typeof first.measure>}[]};
 return{...first,metrics,features:regions.flatMap(r=>r.features),rivers:regions.flatMap(r=>r.rivers),waterBodies:regions.flatMap((r,i)=>r.waterBodies.map(b=>({...b,id:`land-${i}-${b.id}`}))),waterfalls:regions.flatMap(r=>r.waterfalls),coast(_x:number,_z:number,d:number){return d;},
  elevation(x:number,z:number,h:number,water:number){
   let owner=0,best=-Infinity;for(let i=0;i<land.islands.length;i++){const d=land.islands[i].distance(x,z);if(d>best){best=d;owner=i;}}
   const island=land.islands[owner],index=sources.indexOf(island),region=regions[index],shore=smooth(Math.max(0,best)/24);
   const base=region?region.elevation(x,z,h,water):water+shore*(3+fbm(x*.009+seed%97,z*.009,4)*8);
   const away=region?1-smooth((region.radius*1.65-Math.hypot(x-region.center.x,z-region.center.z))/(region.radius*.45)):1;
   const folds=1-Math.abs(fbm(x*.006-seed%131,z*.006+43,3)*2-1),broad=fbm(x*.003+seed%271,z*.003-17,4);
   return base+shore*away*(broad*14+folds**5*20);
  },
  measure(height:(x:number,z:number)=>number){metrics.regionalGeometry=regions.map(r=>({center:r.center,families:r.features.map(f=>f.kind),geometry:r.measure(height)}));for(const [key,min] of Object.entries(MULTILAND_GEOMETRY_GATES))if(!metrics.regionalGeometry.some(r=>r.geometry[key as keyof typeof MULTILAND_GEOMETRY_GATES]>=min))throw new Error(`V14 measured geography coverage failed: ${key} requires ${min}; measured ${metrics.regionalGeometry.map(r=>r.geometry[key as keyof typeof MULTILAND_GEOMETRY_GATES]).join(',')}`);return metrics.regionalGeometry[0].geometry;},
 };
}
export type TownCandidate={x:number;z:number};
/** Full authoritative-grid components and measurable edge contact, not mode labels. */
export function surveyVariety(heights:Float32Array,segs:number,size:number,water:(x:number,z:number)=>number,mode:LandMode,candidates:TownCandidate[]=[],candidateSamplingAreaSquareMeters=400){
 const width=segs+1,step=size/segs,labels=new Int32Array(heights.length).fill(-1),parts:{id:number;areaSquareMeters:number;edgeContactMeters:number;corners:number;usableAreaSquareMeters:number;townSites:TownCandidate[];startingTownCount:number}[]=[];
 const dry=(i:number)=>heights[i]>water(i%width*step-size/2,Math.floor(i/width)*step-size/2)+.25;
 for(let i=0;i<heights.length;i++)if(labels[i]<0&&dry(i)){const id=parts.length,q=[i];labels[i]=id;let edges=0,corners=0;
  for(let at=0;at<q.length;at++){const p=q[at],x=p%width,z=Math.floor(p/width);if(!x||!z||x===segs||z===segs)edges++;if((!x||x===segs)&&(!z||z===segs))corners++;
   for(const n of [x?p-1:-1,x<segs?p+1:-1,z?p-width:-1,z<segs?p+width:-1])if(n>=0&&labels[n]<0&&dry(n)){labels[n]=id;q.push(n);}
  }parts.push({id,areaSquareMeters:q.length*step*step,edgeContactMeters:edges*step,corners,usableAreaSquareMeters:0,townSites:[],startingTownCount:0});
 }
 const componentAt=(x:number,z:number)=>labels[Math.max(0,Math.min(segs,Math.round((z/size+.5)*segs)))*width+Math.max(0,Math.min(segs,Math.round((x/size+.5)*segs)))];
 const grouped=new Map<number,TownCandidate[]>();for(const p of candidates){const id=componentAt(p.x,p.z);if(id<0)continue;const list=grouped.get(id)||[];list.push(p);grouped.set(id,list);}
 for(const part of parts){const list=grouped.get(part.id)||[];part.usableAreaSquareMeters=list.length*candidateSamplingAreaSquareMeters;const capacity=Math.min(VARIETY_RULES.maximumTownsPerLandmass,Math.max(1,Math.ceil(part.usableAreaSquareMeters/VARIETY_RULES.usableAreaPerTownSquareMeters)));
  for(let i=0;i<capacity;i++){let chosen:TownCandidate|undefined,best=-Infinity;for(const p of list){const d=part.townSites.length?Math.min(...part.townSites.map(t=>Math.hypot(t.x-p.x,t.z-p.z))):Math.hypot(p.x,p.z);if(i&&d<VARIETY_RULES.minimumTownSpacingMeters)continue;if(d>best){chosen=p;best=d;}}if(chosen)part.townSites.push({x:chosen.x,z:chosen.z});}
 }
 // Tiny two-mainland maps still need player plus two real neighbors. Increase
 // capacity only where another physically spaced viable footprint exists.
 while(parts.reduce((n,p)=>n+p.townSites.length,0)<3){let added=false;for(const part of [...parts].sort((a,b)=>b.usableAreaSquareMeters-a.usableAreaSquareMeters)){if(part.townSites.length>=3)continue;const extra=(grouped.get(part.id)||[]).find(p=>part.townSites.every(t=>Math.hypot(t.x-p.x,t.z-p.z)>=VARIETY_RULES.minimumTownSpacingMeters));if(extra){part.townSites.push({x:extra.x,z:extra.z});added=true;break;}}if(!added)break;}
 const area=parts.reduce((n,p)=>n+p.areaSquareMeters,0),sorted=[...parts].sort((a,b)=>b.areaSquareMeters-a.areaSquareMeters),landFraction=area/(heights.length*step*step),edgeContactMeters=parts.reduce((n,p)=>n+p.edgeContactMeters,0),dryCornerCount=parts.reduce((n,p)=>n+p.corners,0);
 return{version:14 as const,mode,landFraction,edgeContactMeters,dryCornerCount,landmasses:sorted,largestLandmassShare:(sorted[0]?.areaSquareMeters||0)/area,continuationWidthMeters:mode==='edge-continent'||mode==='divided-continent'?VARIETY_RULES.continuationWidthMeters:0,componentAt};
}
export function validateVariety(s:ReturnType<typeof surveyVariety>){
 const [min,max]=VARIETY_RULES.landFraction[s.mode];if(s.landFraction<min||s.landFraction>max)throw new Error(`V14 ${s.mode} dry fraction ${s.landFraction.toFixed(3)} outside ${min}–${max}`);
 if(s.mode==='edge-continent'||s.mode==='divided-continent'){if(s.edgeContactMeters<200||s.dryCornerCount<2)throw new Error('V14 continental land must reach real map edges and corners');}
 else if(s.edgeContactMeters>0)throw new Error('V14 island mode unexpectedly crosses map edges');
 if(s.mode==='divided-continent'&&s.landmasses.filter(p=>p.areaSquareMeters>=18000).length<2)throw new Error('V14 divided continent needs two real major landmasses');
 if(s.mode==='mainland-satellites'&&(s.largestLandmassShare<.65||s.landmasses.length<2))throw new Error('V14 rare-mainland mode lacks a dominant mainland and smaller islands');
 if(s.mode==='major-islands'&&(s.largestLandmassShare>.62||s.landmasses.filter(p=>p.areaSquareMeters>=18000).length<2))throw new Error('V14 usual island mode lacks multiple substantial landmasses');
}
export type LandContinuation={width:number;positions:Float32Array;indices:Uint32Array};
/** Decorative terrain only: authoritative world/grid/nav bounds stay unchanged. */
export function makeLandContinuation(size:number,segs:number,heights:Float32Array,width:number,outsideHeight:(x:number,z:number)=>number):LandContinuation{
 const positions:number[]=[],indices:number[]=[],half=size/2,radial=8;
 const height=(x:number,z:number)=>Math.abs(x)<=half&&Math.abs(z)<=half?sampleHeight(heights,x,z,size):outsideHeight(x,z);
 const rectangle=(x0:number,z0:number,w:number,d:number,nx:number,nz:number)=>{const start=positions.length/3;for(let z=0;z<=nz;z++)for(let x=0;x<=nx;x++){const px=x0+x/nx*w,pz=z0+z/nz*d;positions.push(px,height(px,pz),pz);}for(let z=0;z<nz;z++)for(let x=0;x<nx;x++){const a=start+z*(nx+1)+x,b=a+1,c=a+nx+1,e=c+1;indices.push(a,c,b,b,c,e);}};
 rectangle(-half,-half-width,size,width,segs,radial);rectangle(-half,half,size,width,segs,radial);rectangle(-half-width,-half,width,size,radial,segs);rectangle(half,-half,width,size,radial,segs);
 for(const sx of [-1,1])for(const sz of [-1,1])rectangle(sx<0?-half-width:half,sz<0?-half-width:half,width,width,radial,radial);
 return{width,positions:new Float32Array(positions),indices:new Uint32Array(indices)};
}
