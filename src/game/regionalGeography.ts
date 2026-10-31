import {mulberry32,fbm} from './rng';
import type {LandFeature} from './geography';
export const LANDSCAPE_RULES={version:1,surveySpacingMeters:24,substantialAreaSquareMeters:18000,
 dramaticProbability:.22,ordinaryReliefMeters:24,dramaticReliefMeters:62,
 valleyHalfWidthMeters:38,ridgeHalfWidthMeters:54,shoreBlendMeters:45,lakeProbability:.55};
type Point={x:number;z:number};
const distance=(x:number,z:number,path:Point[])=>{let best=Infinity;for(let i=1;i<path.length;i++){
 const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1)));
 best=Math.min(best,Math.hypot(x-a.x-t*dx,z-a.z-t*dz));}return best;};
/** Connected-component survey gives every substantial island its own relief and
 * drainage. Work happens only at generation time, with a separate RNG stream. */
export function regionalGeography(seed:number,size:number,landDistance:(x:number,z:number)=>number){
 const rules=LANDSCAPE_RULES,step=rules.surveySpacingMeters,n=Math.ceil(size/step)+1,half=(n-1)*step/2;
 const cell=(i:number)=>({x:i%n*step-half,z:Math.floor(i/n)*step-half});
 const land=new Uint8Array(n*n),seen=new Uint8Array(n*n),owner=new Uint16Array(n*n);
 for(let i=0;i<land.length;i++){const p=cell(i);land[i]=Number(landDistance(p.x,p.z)>0);}
 const neighbors=(i:number)=>[i%n>0?i-1:-1,i%n<n-1?i+1:-1,i>=n?i-n:-1,i<n*(n-1)?i+n:-1].filter(j=>j>=0);
 const rand=mulberry32(seed^0x2b16a59),regions:{area:number;center:Point;radius:number;peak:Point;ridge:Point[];path:Point[];mouth:Point;lake:boolean;dramatic:boolean;relief:number;length:number}[]=[];
 let landmassCount=0;
 for(let start=0;start<land.length;start++){
  if(!land[start]||seen[start])continue;
  landmassCount++;const cells=[start];seen[start]=1;
  for(let q=0;q<cells.length;q++)for(const j of neighbors(cells[q]))if(land[j]&&!seen[j]){seen[j]=1;cells.push(j);}
  const area=cells.length*step*step;if(area<rules.substantialAreaSquareMeters)continue;
  const member=new Set(cells),depth=new Map<number,number>(),next=new Map<number,number>(),queue:number[]=[];
  for(const i of cells)if(neighbors(i).some(j=>!member.has(j))||neighbors(i).length<4){depth.set(i,0);queue.push(i);}
  for(let q=0;q<queue.length;q++){const i=queue[q];for(const j of neighbors(i))if(member.has(j)&&!depth.has(j)){depth.set(j,depth.get(i)!+1);next.set(j,i);queue.push(j);}}
  const inside=[...cells].sort((a,b)=>depth.get(b)!-depth.get(a)!);
  const source=inside[Math.floor(rand()*Math.max(1,inside.length*.08))],center=cell(source),path:Point[]=[center];
  let at=source;while(next.has(at)){at=next.get(at)!;path.push(cell(at));}
  const mouth=path[path.length-1];
  const sea=neighbors(at).filter(j=>!land[j]).map(cell).sort((a,b)=>landDistance(a.x,a.z)-landDistance(b.x,b.z))[0];
  if(sea)path.push(sea);
  // Smooth survey stair-steps; the path remains within the same catchment.
  for(let i=1;i<path.length-1;i++)path[i]={x:(path[i-1].x+path[i].x+path[i+1].x)/3,z:(path[i-1].z+path[i].z+path[i+1].z)/3};
  const dx=mouth.x-center.x,dz=mouth.z-center.z,len=Math.hypot(dx,dz)||step,nx=-dz/len,nz=dx/len;
  const radius=Math.sqrt(area/Math.PI),ridgeOffset=Math.min(80,radius*.35);
  const peak={x:center.x+nx*ridgeOffset,z:center.z+nz*ridgeOffset};
  const ridgeLength=Math.min(radius*.85,240),ridge=[{x:peak.x-dx/len*ridgeLength,z:peak.z-dz/len*ridgeLength},peak,{x:peak.x+dx/len*ridgeLength,z:peak.z+dz/len*ridgeLength}];
  const dramatic=rand()<rules.dramaticProbability,relief=(dramatic?rules.dramaticReliefMeters:rules.ordinaryReliefMeters)*(.85+rand()*.3);
  const lake=rand()<rules.lakeProbability&&landDistance(center.x,center.z)>50;
  let length=0;for(let i=1;i<path.length;i++)length+=Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z);
  for(const i of cells)owner[i]=regions.length+1;
  regions.push({area,center,radius,peak,ridge,path,mouth,lake,dramatic,relief,length});
 }
 const features:LandFeature[]=regions.flatMap(r=>[{kind:'mountain-range',...r.peak,radius:r.radius},{kind:'valley',...r.center,radius:rules.valleyHalfWidthMeters},...(r.lake?[{kind:'lake' as const,...r.center,radius:22}]:[])]);
 const metrics={version:rules.version,landmassCount,substantialLandmassCount:regions.length,dramaticRegionCount:regions.filter(r=>r.dramatic).length,
  regions:regions.map(r=>({x:r.center.x,z:r.center.z,areaSquareMeters:r.area,designedReliefMeters:r.relief,drainageLengthMeters:r.length,dramatic:r.dramatic,lake:r.lake}))};
 return {features,metrics,rivers:regions.filter(r=>r.path.length>2).map(r=>({pts:r.path,w:Math.max(7,size/256*1.6)})),
  coast(_x:number,_z:number,d:number){return d;},
  elevation(x:number,z:number,h:number,water:number){
   const inland=Math.max(0,Math.min(1,landDistance(x,z)/rules.shoreBlendMeters));
   h+=inland*(fbm(x*.004+seed%271,z*.004-81,4)*9+fbm(x*.011-53,z*.011+seed%419,3)*4);
   const ix=Math.max(0,Math.min(n-1,Math.round((x+half)/step))),iz=Math.max(0,Math.min(n-1,Math.round((z+half)/step)));
   const region=regions[owner[iz*n+ix]-1];
   for(const r of region?[region]:[]){
    if(Math.hypot(x-r.center.x,z-r.center.z)>r.radius*2.6)continue;
    const d=distance(x,z,r.ridge),along=Math.hypot(x-r.peak.x,z-r.peak.z);
    const envelope=Math.max(0,1-along/(Math.min(r.radius*.85,240)+80));
    h+=inland*r.relief*Math.exp(-d*d/(rules.ridgeHalfWidthMeters**2))*envelope;
    const valley=distance(x,z,r.path),blend=Math.max(0,1-valley/rules.valleyHalfWidthMeters);
    // Broad valley shoulders provide usable hiking approaches below the ridge;
    // only the narrow inner channel is cut below water by worldgen.
    h=h*(1-blend*.85)+(water+2.2+fbm(x*.009,z*.009,2)*1.5)*blend*.85;
    if(r.lake){const basin=Math.hypot(x-r.center.x,(z-r.center.z)/.72),b=Math.max(0,Math.min(1,(30-basin)/10));h=h*(1-b)+(water-1)*b;}
   }
   return h;
  }
 };
}
