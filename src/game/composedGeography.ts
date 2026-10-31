import {WATER_Y} from './constants';
import {fbm,mulberry32} from './rng';
import type {LandFeature} from './geography';
import {lakeContains,lakeBoundaryDistance,localWaterAt,type LocalWaterBody,type Waterfall} from './localWater';
export const COMPOSED_RULES={version:2,mountainReliefMeters:58,grandReliefMeters:84,grandProbability:.22,
 minimumCanyonDepthMeters:22,plateauHeightMeters:27,terraceRiseMeters:5,pillarHeightMeters:20,
 lakeRiseMeters:10,lakeRadiusMeters:32,riverWidthMeters:11,waterfallDropMeters:10,
 uplandGentleGradeTarget:.55,duneAmplitudeMeters:3.5,duneWavelengthMeters:25,hillAmplitudeMeters:7,shoreBlendMeters:24};
type P={x:number;z:number};
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const smooth=(v:number)=>{const t=clamp(v);return t*t*(3-2*t);};
function nearest(x:number,z:number,path:P[]){let distance=Infinity,index=0,t=0;for(let i=1;i<path.length;i++){
 const a=path[i-1],b=path[i],dx=b.x-a.x,dz=b.z-a.z,k=clamp(((x-a.x)*dx+(z-a.z)*dz)/(dx*dx+dz*dz||1));
 const d=Math.hypot(x-a.x-k*dx,z-a.z-k*dz);if(d<distance){distance=d;index=i-1;t=k;}
 }return{distance,index,t};}
/** New v11 landscape only. Coarse topology is reserved before these connected
 * provinces are built; old regional geography remains available for save loads. */
export function composedGeography(seed:number,size:number,landDistance:(x:number,z:number)=>number){
 const rules=COMPOSED_RULES,rand=mulberry32(seed^0x7741f32);let center={x:0,z:0},inland=0;
 for(let z=-size*.42;z<size*.42;z+=16)for(let x=-size*.42;x<size*.42;x+=16){const d=landDistance(x,z);if(d>inland){inland=d;center={x,z};}}
 if(inland<140)throw new Error('Primary landscape lacks space for required geological provinces');
 const r=Math.min(260,inland*.84),angle=rand()*Math.PI*2,cs=Math.cos(angle),sn=Math.sin(angle);
 const point=(u:number,v:number)=>({x:center.x+u*cs-v*sn,z:center.z+u*sn+v*cs});
 const coords=(x:number,z:number)=>({u:(x-center.x)*cs+(z-center.z)*sn,v:-(x-center.x)*sn+(z-center.z)*cs});
 const grand=rand()<rules.grandProbability,relief=(grand?rules.grandReliefMeters:rules.mountainReliefMeters)*(.94+rand()*.12);
 const lake=point(-r*.52,-r*.26),lakeY=WATER_Y+rules.lakeRiseMeters;
 const channelLocal=[[-r*.52,-r*.26],[-r*.25,-r*.33],[0,-r*.29],[r*.22,-r*.28],[r*.24,-r*.28],
  ...Array.from({length:17},(_,i)=>{const t=i/16;return[r*(.29+.70*t),r*(-.28-.08*t+Math.sin(t*Math.PI*2)*.11*Math.sin(t*Math.PI))];})];
 const main=channelLocal.map(([u,v])=>point(u,v));
 const mouthDirection={x:cs,z:sn};let end=main.at(-1)!;
 for(let i=0;i<80&&landDistance(end.x,end.z)>-12;i++){end={x:end.x+mouthDirection.x*10,z:end.z+mouthDirection.z*10};main.push(end);}
 // A duplicated x/z at the fall edge creates a genuine vertical water drop:
 // upper channel ends here; lower stream begins downstream at sea-level height.
 const fall=main[4],fallLower=main[5];
 const upper=main.slice(0,5).map((p,i)=>({...p,y:lakeY-i*.08}));
 const lower=main.slice(5).map((p,i)=>({...p,y:WATER_Y+Math.max(0,.25-i*.025)}));
 const lakePhase=rand()*Math.PI*2,lakeRotation=angle+.4;
 const shoreline=Array.from({length:56},(_,i)=>{
  const a=i*Math.PI*2/56,variation=1+.17*Math.sin(a*3+lakePhase)+.10*Math.cos(a*5-lakePhase*.7)+.045*Math.sin(a*9+lakePhase);
  const dx=Math.cos(a)*rules.lakeRadiusMeters*1.15*variation,dz=Math.sin(a)*rules.lakeRadiusMeters*.80*variation;
  return{x:lake.x+dx*Math.cos(lakeRotation)-dz*Math.sin(lakeRotation),z:lake.z+dx*Math.sin(lakeRotation)+dz*Math.cos(lakeRotation)};
 });
 const waterBodies:LocalWaterBody[]=[{kind:'lake',id:'primary-lake',...lake,rx:rules.lakeRadiusMeters*1.5,rz:rules.lakeRadiusMeters*1.5,surfaceY:lakeY,shoreline},
 {kind:'river',id:'upper-river',pts:upper,width:rules.riverWidthMeters},{kind:'river',id:'lower-river',pts:lower,width:rules.riverWidthMeters+2}];
 const waterfalls:Waterfall[]=[{...fall,upperY:upper.at(-1)!.y,lowerY:lower[0].y,width:rules.riverWidthMeters,dx:fallLower.x-fall.x,dz:fallLower.z-fall.z}];
 const tributary=[point(-r*.1,r*.12),point(-r*.02,-r*.04),main[2]];
 waterBodies.push({kind:'river',id:'tributary',width:7,pts:tributary.map((p,i)=>({...p,y:lakeY+.2-i*.18}))});
 for(const body of waterBodies)if(body.kind==='river')body.pts=body.pts.map((p,i)=>({...p,w:body.width*(1+.15*Math.sin(i*.70+lakePhase)*Math.sin(i/(body.pts.length-1)*Math.PI))}));
 const pillars=Array.from({length:7},(_,i)=>{const a=i*2.399,rad=12+Math.sqrt(i)*13;return{...point(-r*.62+Math.cos(a)*rad,r*.12+Math.sin(a)*rad),radius:7+rand()*3,height:rules.pillarHeightMeters+rand()*8};});
 const peakMarks=[-.48,0,.48].map((u,i)=>point(r*u,r*(.47+Math.sin(i*1.8)*.06)));
 const features:LandFeature[]=[{kind:'mountain-range',...point(0,r*.48),radius:r},
 {kind:'hills',...point(-r*.25,-r*.60),radius:r*.6},{kind:'valley',...point(-r*.25,-r*.26),radius:r*.65},
 {kind:'lake',...lake,radius:rules.lakeRadiusMeters},{kind:'canyon',...point(r*.58,-r*.32),radius:r*.5},
 {kind:'cliff',...point(r*.55,r*.15),radius:r*.45},{kind:'terrace',...point(r*.57,-r*.52),radius:r*.4},
 {kind:'plateau',...point(r*.56,r*.02),radius:r*.6},{kind:'pillars',...point(-r*.62,r*.12),radius:60},
 {kind:'waterfall',...fall,radius:18},{kind:'dunes',...point(-r*.05,-r*.78),radius:r*.46,shape:{rx:r*.46,rz:r*.18,rotation:angle}},
 {kind:'wetland',...point(-r*.63,-r*.42),radius:24}];
 const surveyStep=24,surveyN=Math.ceil(size/surveyStep)+1,surveyHalf=(surveyN-1)*surveyStep/2,survey=new Uint8Array(surveyN*surveyN);
 for(let i=0;i<survey.length;i++)survey[i]=Number(landDistance(i%surveyN*surveyStep-surveyHalf,Math.floor(i/surveyN)*surveyStep-surveyHalf)>0);
 let landmassCount=0,substantialLandmassCount=0,primaryArea=0;
 const centerIx=Math.round((center.x+surveyHalf)/surveyStep),centerIz=Math.round((center.z+surveyHalf)/surveyStep),centerCell=centerIz*surveyN+centerIx;
 for(let i=0;i<survey.length;i++)if(survey[i]===1){landmassCount++;const queue=[i];survey[i]=2;let isPrimary=false;
  for(let q=0;q<queue.length;q++){const at=queue[q];if(at===centerCell)isPrimary=true;for(const j of [at%surveyN?at-1:-1,at%surveyN<surveyN-1?at+1:-1,at>=surveyN?at-surveyN:-1,at<surveyN*(surveyN-1)?at+surveyN:-1])if(j>=0&&survey[j]===1){survey[j]=2;queue.push(j);}}
  const area=queue.length*surveyStep**2;if(area>=18000)substantialLandmassCount++;if(isPrimary)primaryArea=area;
 }
 const metrics={version:2,landmassCount,substantialLandmassCount,dramaticRegionCount:Number(grand),
 regions:[{...center,areaSquareMeters:primaryArea,designedReliefMeters:relief,drainageLengthMeters:main.reduce((sum,p,i)=>i?sum+Math.hypot(p.x-main[i-1].x,p.z-main[i-1].z):0,0),dramatic:grand,lake:true}],
 geometry:undefined as ReturnType<typeof measure>|undefined,primaryRadiusMeters:r,requiredFeatureFamilies:features.map(f=>f.kind),waterfallDropMeters:waterfalls[0].upperY-waterfalls[0].lowerY};
 const measure=(height:(x:number,z:number)=>number)=>{
  const at=(u:number,v:number)=>{const p=point(u,v);return height(p.x,p.z);};
  const range=(values:number[])=>Math.max(...values)-Math.min(...values);
  const median=(values:number[])=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)]??0;
  const mountainSamples=Array.from({length:Math.ceil(r*1.8/4)},(_,i)=>{const u=-r*.9+i*4;return{u,h:at(u,r*.48+Math.sin(u/(r*.25))*r*.035)};});
  const basinFloor=at(-r*.25,-r*.29),mountainProminence=Math.max(...mountainSamples.map(p=>p.h))-basinFloor;
  const peaks=mountainSamples.filter((p,i)=>i>0&&i<mountainSamples.length-1&&p.h>mountainSamples[i-1].h&&p.h>=mountainSamples[i+1].h&&p.h>basinFloor+25);
  const distinctPeaks:typeof peaks=[];for(const p of [...peaks].sort((a,b)=>b.h-a.h))if(distinctPeaks.every(q=>Math.abs(q.u-p.u)>r*.19))distinctPeaks.push(p);
  const canyonSections=Array.from({length:7},(_,i)=>{
   const u=r*(.35+i*.07),guess=point(u,-r*.32),hit=nearest(guess.x,guess.z,main.slice(4)),a=main[hit.index+4],b=main[hit.index+5];
   const x=a.x+(b.x-a.x)*hit.t,z=a.z+(b.z-a.z)*hit.t,dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz)||1;
   const cross=(d:number)=>height(x-dz/len*d,z+dx/len*d);
   const floor=cross(0),left=Math.max(...[20,36,52,68,84,100,116].map(cross)),right=Math.max(...[-20,-36,-52,-68,-84,-100,-116].map(cross));
   const benches:{height:number;variation:number;widthMeters:number}[]=[];
   for(const sign of [-1,1]){
    let run:number[]=[];
    const finish=()=>{if(run.length>=4){const h=median(run);if(h>floor+3&&h<lakeY+15&&benches.every(b=>Math.abs(b.height-h)>2.5))benches.push({height:h,variation:range(run),widthMeters:run.length*2});}run=[];};
    for(let d=10;d<=100;d+=2){const h=cross(d*sign),next=cross((d+2)*sign);if(Math.abs(next-h)<.35)run.push(h);else finish();}finish();
   }
   return{depthMeters:Math.min(left,right)-floor,benches};
  });
  const plateauHeights:number[]=[];let cliffMax=0,cliffEdgeSamples=0;
  for(let u=r*.2;u<r*.95;u+=4)for(let v=-r*.72;v<r*.22;v+=4){
   const h=at(u,v);
   if(h>rules.plateauHeightMeters-1&&Math.max(Math.abs(at(u+2,v)-at(u-2,v)),Math.abs(at(u,v+2)-at(u,v-2)))/4<.25)plateauHeights.push(h);
   const delta=Math.max(Math.abs(at(u+8,v)-at(u-8,v)),Math.abs(at(u,v+8)-at(u,v-8)));
   cliffMax=Math.max(cliffMax,delta);if(delta>=12)cliffEdgeSamples++;
  }
  const measuredPillars=pillars.map(p=>{
   const top=Math.max(...[-2,0,2].flatMap(dx=>[-2,0,2].map(dz=>height(p.x+dx,p.z+dz))));
   const base=median(Array.from({length:12},(_,i)=>{const a=i*Math.PI/6,d=p.radius+6;return height(p.x+Math.cos(a)*d,p.z+Math.sin(a)*d);}));return top-base;
  });
  const hillSamples:number[]=[],duneSamples:number[]=[];
  for(let u=-r*.6;u<r*.3;u+=3){hillSamples.push(at(u,-r*.58));duneSamples.push(at(u,-r*.78));}
  const lakeBody=waterBodies[0];let lakeWetArea=0;
  if(lakeBody.kind==='lake')for(let dz=-lakeBody.rz;dz<=lakeBody.rz;dz+=4)for(let dx=-lakeBody.rx;dx<=lakeBody.rx;dx+=4){
   if(lakeContains(lakeBody,lakeBody.x+dx,lakeBody.z+dz)&&height(lakeBody.x+dx,lakeBody.z+dz)<lakeBody.surfaceY-.1)lakeWetArea+=16;
  }
  const wetlandPoint=point(-r*.63,-r*.42),wetlandHeight=height(wetlandPoint.x,wetlandPoint.z);
  const rampSamples=Array.from({length:Math.floor(r*.60/2)+1},(_,i)=>{const u=r*.10+i*2;return at(u,-r*1.04+(u-r*.10)*(.32/.60));});
  const rampMaxGrade=Math.max(...rampSamples.slice(1).map((y,i)=>Math.abs(y-rampSamples[i])/Math.hypot(2,2*.32/.60)));
  return{uplandApproachMaxGrade:rampMaxGrade,uplandApproachGentleTargetMet:rampMaxGrade<=rules.uplandGentleGradeTarget,mountainProminenceMeters:mountainProminence,summitCount:distinctPeaks.length,canyonMedianDepthMeters:median(canyonSections.map(s=>s.depthMeters)),
   canyonSections,cliffMaxRiseOver16Meters:cliffMax,cliffEdgeSampleCount:cliffEdgeSamples,
   terraceBenchCount:Math.max(...canyonSections.map(s=>s.benches.filter(b=>b.variation<1.7&&b.widthMeters>=8).length)),
   plateauHighAreaSquareMeters:plateauHeights.length*16,pillarReliefMeters:measuredPillars,pillarCount:measuredPillars.filter(h=>h>=12).length,
   hillsTransectReliefMeters:range(hillSamples),dunesTransectReliefMeters:range(duneSamples),lakeWetAreaSquareMeters:lakeWetArea,
   valleyFlankReliefMeters:Math.min(Math.max(...[60,90,120,150].map(d=>at(-r*.20,-r*.29+d))),Math.max(...[60,90,120,150].map(d=>at(-r*.20,-r*.29-d))))-at(-r*.20,-r*.29+16),
   waterfallBedDropMeters:height(fall.x,fall.z)-height(fallLower.x,fallLower.z),
   wetlandHeightAboveLakeMeters:wetlandHeight-lakeY,waterfallDropMeters:waterfalls[0].upperY-waterfalls[0].lowerY};
 };
 return{measure,features,metrics,waterBodies,waterfalls,center,radius:r,peakMarks,pillars,
 rivers:[{pts:main,w:rules.riverWidthMeters},{pts:tributary,w:7}],coast(_x:number,_z:number,d:number){return d;},
 elevation:function terrainElevation(x:number,z:number,_old:number,water:number,skipRamp=false):number{
  const {u,v}=coords(x,z),shore=smooth(landDistance(x,z)/rules.shoreBlendMeters);
  // Large forms, intermediate spurs and fine ground relief use separate scales.
  // No blanket smoothing toward sea level is applied across the whole basin.
  let h=water+2.5+fbm(x*.009+seed%991,z*.009,4)*3;
  h+=shore*(Math.sin(u/29+Math.sin(v/55))*Math.sin(v/38)*2+fbm(x*.025,z*.025,3)*1.8);
  const primary=smooth((r*1.7-Math.hypot(u,v))/(r*.5));
  const ridgeV=r*.48+Math.sin(u/(r*.25))*r*.035;
  const ridgeDist=Math.abs(v-ridgeV),ridgeEnvelope=smooth((r*1.10-Math.abs(u))/(r*.22));
  const summit=(.53+.47*(.5+.5*Math.cos(u/(r*.24)*Math.PI)))*relief;
  h+=shore*primary*ridgeEnvelope*summit*Math.exp(-((ridgeDist/(r*.18))**2));
  // Branching lower spurs emerge from the ridge, separated by genuine gullies.
  const spurBand=Math.exp(-(((v-r*.23)/(r*.24))**2)),spurs=(.5+.5*Math.cos(u/(r*.20)*Math.PI+v/33));
  h+=shore*primary*spurBand*spurs*spurs*relief*.23;
  const hills=Math.exp(-(((v+r*.55)/(r*.40))**2))*primary;
  const southernShoulder=Math.exp(-(((v+r*.54)/(r*.13))**2))*smooth((r*.25-u)/(r*.2))*smooth((u+r*.98)/(r*.2));
  h+=shore*primary*southernShoulder*16;
  h+=shore*hills*rules.hillAmplitudeMeters*(.5+.5*Math.sin(u/24+Math.sin(v/35)));
  // Connected plateau with hard rim; the stream cuts its center, leaving
  // traversable benches rather than turning the entire upland into a bowl.
  const shelf=Math.hypot((u-r*.55)/(r*.64),(v+r*.25)/(r*.52));
  const shelfBlend=smooth((1.08-shelf)/.12)*primary;
  h=h*(1-shelfBlend)+(water+rules.plateauHeightMeters+fbm(x*.03,z*.03,2)*.7)*shelfBlend;
  const cn=nearest(x,z,main.slice(4)),ca=main[cn.index+4],cb=main[cn.index+5];
  const side=ca&&cb?Math.sign((cb.x-ca.x)*(z-ca.z)-(cb.z-ca.z)*(x-ca.x)):1;
  const along=cn.index+cn.t,widthVariation=side>0?.92+.10*Math.sin(along*.45+lakePhase):1.04+.12*Math.cos(along*.35-lakePhase);
  const d=(cn.distance+(fbm(x*.018+seed%331,z*.018,3)-.5)*8)/widthVariation;
  if(u>r*.21&&u<r*1.25&&shelf<1.10){
   // Three broad benches separated by short steep risers, all above the channel.
   let section=water+2+fbm(x*.012+seed%229,z*.012,2)*.6;
   if(side>0){
    section+=5.5*smooth((d-12)/7);
    section+=5.5*smooth((d-32)/8);
    section+=5.5*smooth((d-53)/7);
    section+=(rules.plateauHeightMeters-18.5)*smooth((d-74)/9);
   }else{
    section+=7*smooth((d-17)/10);
    section+=8*smooth((d-45)/12);
    section+=(rules.plateauHeightMeters-17)*smooth((d-77)/11);
   }
   const influence=smooth((r*.50-d)/12)*shelfBlend;h=h*(1-influence)+section*influence;
  }
  // A wooded ravine floor supports a compact pillar district. Each spire is
  // literal heightfield, with nonuniform widths and intervening lower passages.
  const pillarZone=Math.hypot(u+r*.62,v-r*.12),zone=smooth((75-pillarZone)/14);
  h=h*(1-zone)+(water+6+fbm(x*.025,z*.025,2)*2)*zone;
  for(const p of pillars){const d=Math.hypot(x-p.x,z-p.z),top=smooth((p.radius-d)/3);h+=p.height*top;}
  const duneZone=Math.hypot((u+r*.05)/(r*.46),(v+r*.78)/(r*.18)),duneBlend=smooth((1.1-duneZone)/.2);
  const duneWave=(Math.sin(u/rules.duneWavelengthMeters*Math.PI*2+Math.sin(v/23))*.5+.5)**1.5;
  h=h*(1-duneBlend)+(water+4+rules.duneAmplitudeMeters*duneWave)*duneBlend;
  const dryChannel=Math.abs(v+r*.78-Math.sin(u/42)*8);if(duneZone<1&&dryChannel<3)h-=1.2*smooth((3-dryChannel)/2);
  // A continuous dry approach climbs the southern outer shelf, avoiding the
  // river incision and ending on the plateau rather than inside its terraces.
  const rampV=-r*1.04+(u-r*.10)*(.32/.60),rampDistance=Math.abs(v-rampV);
  if(!skipRamp&&u>r*.10&&u<r*.70&&rampDistance<13){
   const blend=smooth((13-rampDistance)/6)*smooth((u-r*.10)/24)*smooth((r*.70-u)/24);
   const endpoint=point(r*.70,-r*.72),endHeight=terrainElevation(endpoint.x,endpoint.z,0,water,true);
   const rampH=water+5+clamp((u-r*.10)/(r*.60))*(endHeight-water-5);
   h=h*(1-blend)+rampH*blend;
  }
  // Broad upper-lake catchment and low shoreline shelves.
  const lakeBody=waterBodies[0];
  if(lakeBody.kind==='lake'){
   const shoreDistance=lakeBoundaryDistance(lakeBody,x,z),shoreWidth=18+7*Math.sin(Math.atan2(z-lake.z,x-lake.x)*3+lakePhase);
   const surround=smooth((shoreWidth-shoreDistance)/shoreWidth);
   // Inlets, low beaches and occasional steeper shoulders replace a uniform
   // excavated elliptical bowl. Outflow carving below cuts through this bank.
   const bankH=lakeY+.35+Math.max(0,shoreDistance)*(.11+.05*Math.sin((x+z)*.04));
   h=h*(1-surround)+bankH*surround;
  }
  const wetland=point(-r*.63,-r*.42),wetBlend=smooth((26-Math.hypot(x-wetland.x,z-wetland.z))/8);
  h=h*(1-wetBlend)+(lakeY+.35+fbm(x*.12,z*.12,2)*.35)*wetBlend;
  for(const body of waterBodies){
   if(body.kind==='lake'){
    const d=lakeBoundaryDistance(body,x,z);if(d<0){const blend=smooth(-d/3);const bed=body.surfaceY-.35-1.6*smooth(-d/13);h=h*(1-blend)+bed*blend;}
   }else{
    const near=nearest(x,z,body.pts),a=body.pts[near.index],b=body.pts[near.index+1];if(!a||!b)continue;
    const y=a.y+(b.y-a.y)*near.t,width=(a.w??body.width)+((b.w??body.width)-(a.w??body.width))*near.t,bank=smooth((width*.5+5-near.distance)/5);
    // The upper river lies in a raised catchment, not as an unsupported ribbon
    // above low ground. Its nearby dry banks rise to the same basin elevation.
    if(y>water+2&&near.distance<width*.5+28){
     const shoulder=smooth((width*.5+28-near.distance)/18);
     h=h*(1-shoulder)+Math.max(h,y+1.4)*shoulder;
    }
    // Narrow channel walls retain the surrounding canyon instead of flattening it.
    if(near.distance<width*.5+5)h=h*(1-bank)+(y-1.3)*bank;
   }
  }
  // Lake carving is last among water-body operations so river-bank shoulders
  // cannot accidentally refill most of the lake basin.
  for(const body of waterBodies)if(body.kind==='lake'){
   const d=lakeBoundaryDistance(body,x,z);
   if(d<0){const blend=smooth(-d/2);const bed=body.surfaceY-.35-1.6*smooth(-d/13);h=h*(1-blend)+bed*blend;}
  }
  // The waterfall's physical bed drops between upper and lower streams.
  const fw=nearest(x,z,[fall,fallLower]);if(fw.distance<rules.riverWidthMeters*.5+3){
   const blend=smooth((rules.riverWidthMeters*.5+3-fw.distance)/3),floor=waterfalls[0].upperY-fw.t*(waterfalls[0].upperY-waterfalls[0].lowerY)-1.3;
   h=h*(1-blend)+floor*blend;
  }
  return water+(h-water)*shore;
 }
 };
}
