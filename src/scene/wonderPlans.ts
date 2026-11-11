/** Seeded wonder plans for two approved families (docs/art-reference/
 * approved-wonder-concepts.png; GLB blockouts in docs/art-reference/archive/
 * 3d-prototypes/): Ring Observatory and Cascade Garden. Pure specs: parts
 * (shared with the carved building pipeline), functional spaces, circulation
 * and phased construction stages with PHYSICAL quantities (m³ by material).
 * Prices, labour rates and scoring belong to Codex; site slope/water/flow
 * constraints belong to Grok — inputs here are placeholders for those.
 *
 * Different seeds vary arrangement and structure (ring radius, segment count,
 * openings, entry and sight-slot azimuths, instrument layout; terrace count,
 * depths, wall heights, stair sides, spine position, pergola), not paint.
 * Plans carry a generator version so a save can reproduce them exactly. */
import {beam,hashSeed,part,partBounds,pick,range,rotatePoint,seededRandom,type Part,type Rng} from './buildingParts';
import type {CarvedMaterialId} from './carvedPalette';

export const WONDER_GENERATOR_VERSION=1;
export type WonderFamily='ringObservatory'|'cascadeGarden'|'crescentHarbor'|'millMarket';
/** Site facts Grok supplies at placement; only the harbour and market consume them. */
export type WonderSite={tidalRangeM?:number;exposed?:boolean;flow?:'still'|'river'|'tidal';flowDir?:1|-1;flowSpeedMps?:number;riverWidthM?:number;bankHeightM?:number};
import {HULL_SEATS,hullSize} from './hullSizes';
export {HULL_SEATS,hullSize};
export type Berth={id:string;hullClass:keyof typeof HULL_SEATS;seats:number;x:number;z:number;yaw:number;length:number;beam:number;bollards:{x:number;z:number}[];/** quay-walk point where a crew steps aboard */boarding:[number,number]};
export type WonderStage={id:string;label:string;partIndices:number[];volumeM3:Partial<Record<'stone'|'timber'|'earth'|'cloth'|'planting',number>>};
export type WonderSpace={id:string;label:string;purpose:string;areaM2:number};
export type Stair={fromLevel:number;toLevel:number;x:number;zBottom:number;zTop:number;steps:number;riseM:number;treadM:number;width:number;bottom?:[number,number];top?:[number,number]};
export type WonderPlan={family:WonderFamily;version:number;seed:number;footprint:{w:number;d:number};parts:Part[];stages:WonderStage[];spaces:WonderSpace[];
 circulation:{entrances:{x:number;z:number;width:number;facing:number}[];paths:[number,number][][];stairs:Stair[]};
 /** Observatory only: azimuth (radians, from +X toward +Z) of the open sight slot. */
 sightAzimuth?:number;levels?:number[];
 /** Harbour: water basin (circle), berths for real hull classes, y of the quay top. */
 basin?:{cx:number;cz:number;r:number};berths?:Berth[];quayTopY?:number;
 /** Mill market: channel rectangle, water surface y, wheel immersion, court level, bridge, stalls. */
 channel?:{z0:number;z1:number;x0:number;x1:number};waterSurfaceY?:number;wheel?:{x:number;y:number;z0:number;z1:number;radius:number;bottomY:number;immersionM:number};courtY?:number;bridge?:{x:number;width:number;spanZ0:number;spanZ1:number;deckY:number};stalls?:{id:string;x:number;z:number;access:[number,number]}[];aisleHalfWidth?:number};

const MATERIAL_CLASS:Partial<Record<CarvedMaterialId,'stone'|'timber'|'earth'|'cloth'|'planting'>>={stone:'stone',stoneDark:'stone',plaster:'stone',woodLight:'timber',woodMid:'timber',woodDark:'timber',woodEdge:'timber',trunk:'timber',cloth:'cloth',foliage:'planting',foliageDark:'planting',thatch:'timber',shingle:'timber',tile:'stone'};
function partVolume(p:Part){const [w,h,d]=p.size;switch(p.shape){case 'box':return w*h*d;case 'cylinder':return Math.PI*h*((w/2)**2+(d/2)**2)/2;case 'cone':case 'pyramid':return w*h*d/3;case 'sphere':return Math.PI/6*w*h*d;default:return w*h*d/2;}}
function stage(id:string,label:string,parts:Part[],idx:number[]):WonderStage{
 const vol:WonderStage['volumeM3']={};
 for(const i of idx){const c=MATERIAL_CLASS[parts[i].mat];if(!c)continue;vol[c]=Math.round(((vol[c]??0)+partVolume(parts[i]))*100)/100;}
 return {id,label,partIndices:idx,volumeM3:vol};
}

/** Ring Observatory: an interrupted stone ring framing a sighting court, an
 * offset entry stair, an unobstructed astronomical slot, timber sighting
 * frames and a central gnomon (cf. the approved concept and GLB blockout). */
function ringObservatory(seed:number,fp:{w:number;d:number}):WonderPlan{
 const r=seededRandom(seed),parts:Part[]=[],groups:Record<string,number[]>={found:[],lower:[],upper:[],instruments:[],approach:[]};
 const add=(g:string,p:Part)=>{groups[g].push(parts.length);parts.push(p);};
 const stairLen=range(r,1.6,2.4),maxR=Math.min(fp.w,fp.d)/2-stairLen-.6,R=Math.min(maxR,range(r,7.5,10.5)),n=pick(r,[16,18,20,22,24]);
 const wallH=range(r,2.6,3.8),thick=range(r,.9,1.3),found=range(r,.3,.5),seg=2*Math.PI*R/n;
 const entryA=range(r,0,Math.PI*2),slotA=(entryA+Math.PI+range(r,-.9,.9)+Math.PI*2)%(Math.PI*2);
 const idxOf=(a:number)=>((Math.round(a/(Math.PI*2)*n)%n)+n)%n,entry=idxOf(entryA),slot=idxOf(slotA);
 const openings=new Set<number>();const openCount=pick(r,[2,3,4]);
 while(openings.size<openCount){const i=Math.floor(r()*n);if(Math.abs(i-entry)>1&&Math.abs(i-entry)<n-1&&i!==slot)openings.add(i);}
 const segAngle=(i:number)=>i/n*Math.PI*2,at=(a:number,rad:number):[number,number]=>[Math.cos(a)*rad,Math.sin(a)*rad];
 // Foundation course under the whole ring (true footing, follows the ring, not a square plinth).
 for(let i=0;i<n;i++){const a=segAngle(i),[x,z]=at(a,R);add('found',part('box','stoneDark',[seg*1.02,found,thick+.3],[x,0,z],2,[0,-a-Math.PI/2,0]));}
 add('found',part('cylinder','stone',[2*(R-thick/2),found*.6,2*(R-thick/2)],[0,0,0],2,undefined,24));
 for(let i=0;i<n;i++){
  if(i===entry||i===slot)continue;const a=segAngle(i),[x,z]=at(a,R),yaw=-a-Math.PI/2;
  if(openings.has(i)){add('upper',part('box','stone',[seg*1.04,.55,thick],[x,found+wallH-.55,z],2,[0,yaw,0]));continue;} // arch lintel over an opening
  add('lower',part('box','stone',[seg*.97,wallH*.55,thick],[x,found,z],2,[0,yaw,0]));
  add('upper',part('box','stone',[seg*.97,wallH*.45,thick*.92],[x,found+wallH*.55,z],2,[0,yaw,0]));
  if(i%2===0)add('upper',part('box','stoneDark',[seg*.5,.12,thick+.08],[x,found+wallH*.55-.06,z],0,[0,yaw,0]));
 }
 // Openings need piers under their lintels: thicken neighbours' ends.
 for(const i of openings)for(const s of[-1,1]){const a=segAngle(i)+s*(Math.PI/n),[x,z]=at(a,R);add('lower',part('box','stone',[.5,wallH-.55,thick*1.05],[x,found,z],1,[0,-a-Math.PI/2,0]));}
 // Gnomon and sighting frames aligned to the slot and two seeded seasonal azimuths.
 add('instruments',part('cylinder','stoneDark',[1.2,.5,1.2],[0,found*.6,0],1,undefined,10));
 add('instruments',part('cylinder','woodDark',[.35,range(r,2.2,3),.28],[0,found*.6+.5,0],2,undefined,8));
 // Frames sit on the snapped slot line (posts straddle it) and on seasonal
 // azimuths kept well off the slot so they never block the sight line.
 const sight=segAngle(slot),frames=[sight,...Array.from({length:pick(r,[1,2,3])},()=>sight+pick(r,[-1,1])*range(r,.45,1.2))];
 for(const a of frames){const [x,z]=at(a,R*range(r,.45,.6)),tx=-Math.sin(a)*.6,tz=Math.cos(a)*.6,h=range(r,2,2.8);
  add('instruments',beam('woodDark',[x+tx,found*.6,z+tz],[x+tx,found*.6+h,z+tz],.16,2));add('instruments',beam('woodDark',[x-tx,found*.6,z-tz],[x-tx,found*.6+h,z-tz],.16,2));
  add('instruments',part('box','woodEdge',[1.5,.14,.14],[x,found*.6+h-.1,z],1,[0,-a-Math.PI/2,0]));}
 // Offset entry stair outside the entry gap, climbing the foundation course.
 const steps=Math.max(2,Math.ceil(found/.18)),tread=stairLen/steps,ew=seg*1.6;
 for(let k=0;k<steps;k++){const rad=R+thick/2+stairLen-(k+.5)*tread,[x,z]=at(segAngle(entry),rad);add('approach',part('box','stone',[ew,found*(k+1)/steps,tread],[x,0,z],1,[0,-segAngle(entry)-Math.PI/2,0]));}
 for(const s of[-1,1]){const a=segAngle(entry)+s*(Math.PI/n*1.15),[x,z]=at(a,R+.2);add('approach',part('box','cloth',[.06,1.6,.9],[x,found+wallH*.35,z],0,[0,-a,0]));}
 const [ex,ez]=at(segAngle(entry),R+thick/2+stairLen);
 return {family:'ringObservatory',version:WONDER_GENERATOR_VERSION,seed,footprint:{...fp},parts,sightAzimuth:segAngle(slot),
  stages:[stage('footing','Footing course and court floor',parts,groups.found),stage('ring-lower','Lower ring courses',parts,groups.lower),stage('ring-upper','Upper courses and lintels',parts,groups.upper),stage('instruments','Gnomon and sighting frames',parts,groups.instruments),stage('approach','Entry stair and banners',parts,groups.approach)],
  spaces:[{id:'court',label:'Sighting court',purpose:'Observe sun and star risings through the slot; mark seasons for planting',areaM2:Math.round(Math.PI*(R-thick/2)**2)},{id:'gallery',label:'Ring wall walk',purpose:'Gathered audience during seasonal observations',areaM2:Math.round(2*Math.PI*R*thick)}],
  circulation:{entrances:[{x:ex,z:ez,width:ew,facing:segAngle(entry)}],paths:[[[ex,ez],[0,0]],Array.from({length:13},(_,i)=>{const [x,z]=at(i/12*Math.PI*2,R-thick-.8);return [x,z] as [number,number];})],stairs:[{fromLevel:0,toLevel:found,x:ex,zBottom:ez,zTop:ez,steps,riseM:found/steps,treadM:tread,width:ew}]}};
}

/** Cascade Garden: 2-4 terraces stepping down toward +Z with real retaining
 * walls, a gravity water spine with a cascade at each wall, alternating stair
 * flights, planted beds and a top pergola (approved concept; GLB blockout). */
function cascadeGarden(seed:number,fp:{w:number;d:number}):WonderPlan{
 const r=seededRandom(seed),parts:Part[]=[],groups:Record<string,number[]>={ground:[],water:[],stairs:[],planting:[],pergola:[]};
 const add=(g:string,p:Part)=>{groups[g].push(parts.length);parts.push(p);};
 const W=fp.w-.6,count=pick(r,[2,3,3,4]),depths=Array.from({length:count},()=>range(r,.8,1.3)),sum=depths.reduce((a,b)=>a+b,0);
 const D=fp.d-.6,ds=depths.map(x=>x/sum*D),walls=Array.from({length:count},(_,i)=>i===0?0:range(r,1.1,2)),levels:number[]=[];
 let acc=0;for(let i=0;i<count;i++){acc+=walls[i];levels.push(Math.round(acc*100)/100);}
 // Terrace i: z from zFront(i) (toward +Z) to zBack(i); terrace 0 is lowest/front.
 const zFront:number[]=[],zBack:number[]=[];let z=D/2;for(let i=0;i<count;i++){zFront.push(z);z-=ds[i];zBack.push(z);}
 const spineX=range(r,-W*.2,W*.2),stairSide0=pick(r,[-1,1]),stairs:Stair[]=[];
 for(let i=0;i<count;i++){
  const y=levels[i],depth=ds[i],cz=(zFront[i]+zBack[i])/2;
  if(y>0)add('ground',part('box','stoneDark',[W,y,depth],[0,0,cz],2)); // retained fill: the terrace body itself
  add('ground',part('box','woodInlay',[W,.06,depth],[0,y,cz],1)); // walking surface
  if(i>0){add('ground',part('box','stone',[W,y+.35,.45],[0,0,zFront[i]-.225],2));} // retaining wall + parapet
  // Water channel along the terrace and a cascade down the wall in front of it.
  add('water',part('box','stone',[.7,.18,depth],[spineX,y,cz],1));add('water',part('box','water',[.45,.05,depth],[spineX,y+.18,cz],1));
  if(i>0)add('water',part('box','water',[.4,walls[i],.08],[spineX,levels[i-1],zFront[i]+.04],1));
  // Planted beds in rows either side of the spine, keeping a walkway clear.
  const rows=depth>2.4?2:1;for(let k=0;k<rows;k++)for(const s of[-1,1]){const bw=W/2-Math.abs(spineX)-2.9;/* leaves a 2 m side lane for stair flights */if(bw<.8)continue;const bx=spineX+s*(.9+bw/2),bz=zBack[i]+(k+.5)*depth/rows;
   add('planting',part('box','stoneDark',[bw,.3,Math.min(1.1,depth/rows-.6)],[bx,y+.06,bz],1));add('planting',part('box','foliage',[bw-.15,.28,Math.min(.95,depth/rows-.75)],[bx,y+.36,bz],0));}
  if(chance01(r,.6)){const tx=Math.max(-W/2+2.6,Math.min(W/2-2.6,spineX+pick(r,[-1,1])*W*.32)),tz=cz;add('planting',part('cylinder','trunk',[.22,1.3,.18],[tx,y+.06,tz],1,undefined,6));add('planting',part('sphere','foliage',[1.4,1.2,1.4],[tx,y+1.2,tz],1));}
  // Stair flight from terrace i-1 up to terrace i, built on the lower terrace against the wall.
  if(i>0){const side=(i%2?1:-1)*stairSide0,rise=walls[i],steps=Math.ceil(rise/.18),tread=.32,run=steps*tread,sx=side*(W/2-1.1),width=1.4,z0=zFront[i]+run,base=levels[i-1];
   for(let k=0;k<steps;k++)add('stairs',part('box','stone',[width,base+rise*(k+1)/steps,tread],[sx,0,z0-(k+.5)*tread],1));
   stairs.push({fromLevel:base,toLevel:levels[i],x:sx,zBottom:z0,zTop:zFront[i],steps,riseM:rise/steps,treadM:tread,width});}
 }
 // Pergola over the top terrace (timber posts and slatted beams, cloth shade).
 const top=count-1,py=levels[top],pz=(zFront[top]+zBack[top])/2,pw=Math.min(W*.5,range(r,3.5,5.5)),pd=Math.min(ds[top]-.6,range(r,1.8,2.6)),px=-spineX*.5,ph=range(r,2.3,2.7);
 for(const sx of[-1,1])for(const sz of[-1,1])add('pergola',beam('woodDark',[px+sx*pw/2,py+.06,pz+sz*pd/2],[px+sx*pw/2,py+ph,pz+sz*pd/2],.16,2));
 for(const sz of[-1,1])add('pergola',part('box','woodMid',[pw+.4,.16,.16],[px,py+ph,pz+sz*pd/2],1));
 for(let k=0;k<pick(r,[4,5,6]);k++)add('pergola',part('box','woodLight',[.1,.1,pd+.3],[px-pw/2+(k+.5)*pw/6,py+ph+.16,pz],0));
 if(chance01(r,.5))add('pergola',part('box','cloth',[pw,.04,pd*.7],[px,py+ph+.26,pz],0));
 const front=D/2;
 return {family:'cascadeGarden',version:WONDER_GENERATOR_VERSION,seed,footprint:{...fp},parts,levels,
  stages:[stage('groundworks','Retaining walls and terrace fill',parts,groups.ground),stage('water','Water spine and cascades',parts,groups.water),stage('stairs','Stair flights',parts,groups.stairs),stage('planting','Beds and trees',parts,groups.planting),stage('pergola','Top pergola',parts,groups.pergola)],
  spaces:levels.map((y,i)=>({id:`terrace-${i}`,label:i===top?'Upper teaching terrace':i===0?'Lower garden court':'Middle terrace',purpose:i===top?'Shade, instruction in grafting and irrigation':'Planted beds watered from the spine',areaM2:Math.round(W*ds[i])})),
  circulation:{entrances:[{x:0,z:front,width:W*.5,facing:Math.PI/2}],paths:[[[0,front],...stairs.map(s=>[s.x,s.zTop] as [number,number])]],stairs}};
}
const chance01=(r:Rng,p:number)=>r()<p;

export function generateWonderPlan(family:WonderFamily,worldSeed:number,siteId:number,footprint:{w:number;d:number},site?:WonderSite):WonderPlan{
 const seed=hashSeed(worldSeed,'wonder',family,siteId,WONDER_GENERATOR_VERSION);
 return family==='ringObservatory'?ringObservatory(seed,footprint):family==='cascadeGarden'?cascadeGarden(seed,footprint):family==='crescentHarbor'?crescentHarbor(seed,footprint,site):millMarket(seed,footprint,site);
}
/** True when the straight segment (ax,az)->(bx,bz) at height y passes
 * through any part. Yaw-only boxes are tested in their own frame (exact);
 * other parts conservatively by their world bounds. */
export function segmentBlocked(plan:WonderPlan,a:[number,number],b:[number,number],y:number,ignore:(p:Part)=>boolean=()=>false){
 for(const p of plan.parts){if(ignore(p))continue;const q=partBounds(p);if(q.minY>y||q.maxY<y)continue;
  const yawOnly=p.shape==='box'&&(!p.rot||Math.abs(p.rot[0])<1e-9&&Math.abs(p.rot[2])<1e-9);
  for(let t=0;t<=1;t+=.01){const x=a[0]+(b[0]-a[0])*t,z=a[1]+(b[1]-a[1])*t;
   if(yawOnly){const l=rotatePoint([x-p.pos[0],0,z-p.pos[2]],[0,-(p.rot?.[1]??0),0]);if(Math.abs(l[0])<p.size[0]/2&&Math.abs(l[2])<p.size[2]/2)return true;}
   else if(x>q.minX&&x<q.maxX&&z>q.minZ&&z<q.maxZ)return true;}}
 return false;
}

const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const steppedRise=(height:number)=>{const n=Math.max(2,Math.ceil(height/.18));return {n,rise:height/n};};

/** Crescent Harbor: a stone quay arc round a circular basin open to the sea at
 * +Z (cf. Mediterranean crescent harbours), warehouses with an arcaded front
 * behind the quay, a landward street stair, stairs down to the water and
 * bollard berths sized to the real hull classes. Water sits at y=0; the quay
 * (solid rubble core + fill) tops out at quayTopY (tidal sites stand higher).
 * Warehouses stand on plinths exactly their own size at quay level. */
function crescentHarbor(seed:number,fp:{w:number;d:number},site?:WonderSite):WonderPlan{
 const r=seededRandom(seed),parts:Part[]=[],groups:Record<string,number[]>={quay:[],waterStairs:[],berthing:[],warehouses:[],arcade:[],light:[]};
 const add=(g:string,p:Part)=>{groups[g].push(parts.length);parts.push(p);};
 const tidal=site?.tidalRangeM??0,quayH=Math.round(clamp(range(r,1,1.4)+tidal*.35,1,2.2)*100)/100,exposed=site?.exposed??chance01(r,.5);
 const quayW=range(r,3,3.6),wd=range(r,3.6,4.2),maxOuter=Math.min(fp.w/2-.2,fp.d-.4)/1;
 const Rb=clamp(range(r,9,11.5),7,maxOuter-quayW-wd-.2),outer=Rb+quayW+wd,zc=-fp.d/2+outer+1,C=[0,zc] as const;
 const phi=range(r,95,108)*Math.PI/180,a0=-Math.PI/2-phi,a1=-Math.PI/2+phi,at=(a:number,rad:number):[number,number]=>[C[0]+Math.cos(a)*rad,C[1]+Math.sin(a)*rad],yawT=(a:number)=>-a-Math.PI/2;
 const aStreet=-Math.PI/2+range(r,-.25,.25),streetHalf=2.6/(Rb+quayW);
 // Basin surface (water at y=0) and the quay arc: solid segments tangent to the circle.
 add('quay',part('cylinder','water',[2*Rb,.05,2*Rb],[C[0],0,C[1]],2,undefined,28));
 const arcLen=(a1-a0)*(Rb+quayW/2),n=Math.ceil(arcLen/2.4),da=(a1-a0)/n,segLen=da*(Rb+quayW/2);
 for(let i=0;i<n;i++){const a=a0+(i+.5)*da,[x,z]=at(a,Rb+quayW/2);add('quay',part('box','stone',[segLen*1.05,quayH,quayW],[x,0,z],2,[0,yawT(a),0]));
  const [kx,kz]=at(a,Rb+.18);add('quay',part('box','stoneDark',[segLen*1.05,.16,.36],[kx,quayH,kz],1,[0,yawT(a),0]));}
 // Landward street stair, rising outward-to-inward onto the quay.
 const {n:ln,rise:lr}=steppedRise(quayH),tread=.32,ew=2.6;
 for(let k=0;k<ln-1;k++){const [x,z]=at(aStreet,Rb+quayW+(k+.5)*tread);add('quay',part('box','stone',[ew,quayH-lr*(k+1),tread],[x,0,z],1,[0,yawT(aStreet),0]));}
 const stairs:Stair[]=[],landTop=at(aStreet,Rb+quayW-.2),landBot=at(aStreet,Rb+quayW+(ln-1)*tread);
 stairs.push({fromLevel:0,toLevel:quayH,x:landTop[0],zBottom:landBot[1],zTop:landTop[1],steps:ln,riseM:lr,treadM:tread,width:ew,bottom:landBot,top:landTop});
 // Stairs down to the water at 2-3 seeded angles away from the street and horns.
 const nW=pick(r,[1,2,2]),stairAngles:number[]=[];
 for(let i=0;i<nW;i++){const a=nW===1?aStreet+pick(r,[-1,1])*range(r,.7,1.1):a0+.7+(i?.78:.22)*(a1-a0-1.4)+range(r,-.06,.06);stairAngles.push(a);}
 const sw=1.5;
 for(const a of stairAngles){for(let k=0;k<ln-1;k++){const [x,z]=at(a,Rb-(k+.5)*tread);add('waterStairs',part('box','stone',[sw,quayH-lr*(k+1),tread],[x,0,z],1,[0,yawT(a),0]));}
  const top=at(a,Rb+.5),bot=at(a,Rb-(ln-1)*tread);stairs.push({fromLevel:0,toLevel:quayH,x:top[0],zBottom:bot[1],zTop:top[1],steps:ln,riseM:lr,treadM:tread,width:sw,bottom:bot,top});}
 // Berths: pack real hull classes along the quay, skipping stair zones; hulls lie tangent with all corners inside the basin.
 const classes=Object.keys(HULL_SEATS) as (keyof typeof HULL_SEATS)[],berths:Berth[]=[],walk=Rb+quayW/2;
 let a=a0+.42;const aEnd=a1-.42;let guard=0;
 while(a<aEnd&&guard++<400){
  const cls=pick(r,classes),h=hullSize(HULL_SEATS[cls]),half=h.length/2,span=(h.length+.9)/(Rb+.2),mid=a+span/2;
  const rh=Math.sqrt((Rb-.2)**2-half**2)-h.beam/2;if(rh<=1||Rb-(rh+h.beam/2)>1.6){a+=.12;continue;}
  const blocked=stairAngles.some(s=>Math.abs(s-mid)<span/2+(sw/2+.9)/Rb+.12);
  if(blocked){a+=.1;continue;}if(mid+span/2>aEnd){a+=.15;continue;}
  const [hx,hz]=at(mid,rh+h.beam/2-h.beam/2),id=`berth-${berths.length+1}`,bol=[-1,1].map(s=>{const aa=mid+s*(half-.5)/Rb;const [bx,bz]=at(aa,Rb+.3);return {x:bx,z:bz};});
  berths.push({id,hullClass:cls,seats:HULL_SEATS[cls],x:hx,z:hz,yaw:yawT(mid),length:h.length,beam:h.beam,bollards:bol,boarding:at(mid,Rb+quayW*.5)});
  for(const b of bol)add('berthing',part('cylinder','woodDark',[.28,.45,.24],[b.x,quayH+.16,b.z],1,undefined,6));
  const [fx,fz]=at(mid,Rb+.06);add('berthing',part('box','woodEdge',[h.length*.5,.3,.12],[fx,quayH-.4,fz],0,[0,yawT(mid),0]));
  a+=span;
 }
 // Warehouses behind the quay, on plinths exactly their own size; the street gap stays open.
 const rIn=Rb+quayW,rMid=rIn+wd/2,wh=range(r,3,3.8),warehouseAngles:{a:number;wl:number}[]=[];
 let wa=a0+.25;while(wa<a1-.25){const wl=range(r,5,7.2),span=wl/rMid;const mid=wa+span/2;
  if(Math.abs(mid-aStreet)<span/2+streetHalf+.04){wa=aStreet+streetHalf+.04;continue;}
  if(mid+span/2>a1-.2)break;warehouseAngles.push({a:mid,wl});wa+=span+.06;}
 const arcadeIdx=new Set<number>();warehouseAngles.forEach((_,i)=>{if(chance01(r,.45))arcadeIdx.add(i);});
 warehouseAngles.forEach(({a:wa2,wl},i)=>{const [x,z]=at(wa2,rMid),yw=yawT(wa2),pitch=range(r,.5,.7),rise=wd/2*Math.tan(pitch);
  add('warehouses',part('box','stoneDark',[wl,quayH,wd],[x,0,z],2,[0,yw,0]));add('warehouses',part('box','woodMid',[wl,wh,wd],[x,quayH,z],2,[0,yw,0]));
  add('warehouses',part('prism','shingle',[wd+.5,rise,wl+.5],[x,quayH+wh,z],2,[0,-wa2,0]));
  const [dx,dz]=at(wa2,rIn+.04);add('warehouses',part('box','recess',[2,2.3,.08],[dx,quayH,dz],0,[0,yw,0]));
  for(const s of[-1,1]){const [bx,bz]=at(wa2+s*(wl/2-.4)/rMid,rIn+.05);add('warehouses',part('box','woodEdge',[.25,wh,.2],[bx,quayH,bz],1,[0,yw,0]));}
  if(arcadeIdx.has(i)){const cols=Math.max(3,Math.round(wl/1.7));
   for(let c=0;c<cols;c++){const [cx,cz]=at(wa2+(-wl/2+.4+c*(wl-.8)/(cols-1))/rMid,rIn-1.35);add('arcade',part('cylinder','stone',[.36,2.5,.32],[cx,quayH,cz],2,undefined,8));}
   const [lx,lz]=at(wa2,rIn-1.35);add('arcade',part('box','stoneDark',[wl,.22,.5],[lx,quayH+2.5,lz],1,[0,yw,0]));
   const [wx,wz]=at(wa2,rIn-.68);add('arcade',part('wedge','shingle',[wl,.55,1.55],[wx,quayH+2.72,wz],1,[0,yw,0]));}});
 if(exposed){const [lx,lz]=at(a1-.02,Rb+quayW/2);add('light',part('cylinder','stone',[1.7,4.8,1.3],[lx,quayH,lz],2,undefined,8));add('light',part('box','iron',[1.2,.9,1.2],[lx,quayH+4.8,lz],1));add('light',part('pyramid','shingle',[1.6,.9,1.6],[lx,quayH+5.7,lz],1));}
 // Circulation: street to quay stair, quay walk along the arc, each stair top on the walk.
 const quayWalk=Array.from({length:25},(_,i)=>at(a0+.1+i/24*(a1-a0-.2),walk));
 const entrance=at(aStreet,outer+.4),street:[number,number][]=[entrance,landBot,landTop,at(aStreet,walk)];
 const area=(l:number,w:number)=>Math.round(l*w);
 const keys=Object.keys(groups).filter(k=>groups[k].length);
 const labels:Record<string,string>={quay:'Quay, street stair and basin',waterStairs:'Stairs to the water',berthing:'Bollards and fenders',warehouses:'Warehouse plinths, walls and roofs',arcade:'Arcaded loading walk',light:'Harbour light'};
 return {family:'crescentHarbor',version:WONDER_GENERATOR_VERSION,seed,footprint:{...fp},parts,basin:{cx:C[0],cz:C[1],r:Rb},berths,quayTopY:quayH,
  stages:keys.map(k=>stage(k==='quay'?'groundworks':k,labels[k],parts,groups[k])),
  spaces:[{id:'quay',label:'Quay promenade',purpose:'Load and unload hulls, walk between berths and stairs',areaM2:area(arcLen,quayW)},{id:'warehouses',label:'Quay warehouses',purpose:'Sheltered store for waterborne goods at quay level',areaM2:warehouseAngles.reduce((s,w)=>s+Math.round(w.wl*wd),0)},{id:'basin',label:'Sheltered basin',purpose:'Moor hulls out of the swell',areaM2:Math.round(Math.PI*Rb*Rb)}],
  circulation:{entrances:[{x:entrance[0],z:entrance[1],width:ew,facing:aStreet}],paths:[street,quayWalk],stairs}};
}

/** Mill Market: a stone-banked channel carrying the stream east-west, a mill on the
 * north court with an undershot wheel standing in the water, a hump-backed
 * stone arch bridge to a southern landing court, and a row of market stalls
 * on the north court with a clear aisle. Water surface sits at waterSurfaceY
 * (>0 so the wheel bottom is below it while every part stays above y=0);
 * courts are solid stone-faced fill at courtY, no larger than the market itself. */
function millMarket(seed:number,fp:{w:number;d:number},site?:WonderSite):WonderPlan{
 const r=seededRandom(seed),parts:Part[]=[],groups:Record<string,number[]>={channel:[],courts:[],mill:[],bridge:[],stalls:[],rails:[]};
 const add=(g:string,p:Part)=>{groups[g].push(parts.length);parts.push(p);};
 const bankH=Math.round(clamp(site?.bankHeightM??range(r,.8,1.1),.6,1.6)*100)/100,Wc=clamp(site?.riverWidthM??range(r,5,6.4),4.5,8),waterY=.3,fast=(site?.flowSpeedMps??1)>1.5;
 const dir=site?.flowDir??pick(r,[1,-1] as const),W=fp.w-.4,zc=range(r,-1.2,1.2),z0=zc-Wc/2,z1=zc+Wc/2,Dn=Math.min(8.6,z0-(-fp.d/2)-.3-1.9),Ds=Math.min(5,fp.d/2-.2-z1-1.9);
 add('channel',part('box','water',[fp.w,waterY,Wc],[0,0,zc],2));
 add('courts',part('box','stone',[W,bankH,Dn],[0,0,z0-Dn/2],2));add('courts',part('box','stone',[Math.min(W,16),bankH,Ds],[0,0,z1+Ds/2],2));
 for(const [zz,dd] of[[z0-.18,.36],[z1+.18,.36]])add('courts',part('box','stoneDark',[W,.12,dd],[0,bankH,zz],0));
 // Mill on the upstream/downstream side of the bridge, south wall on the channel edge.
 const mw=range(r,5,6),md=range(r,4,4.6),mx=-dir*(W/2-mw/2-1.2),mh=range(r,3,3.6),mz=z0-md/2;
 add('mill',part('box',fast?'stone':'woodMid',[mw,mh,md],[mx,bankH,mz],2));
 const pitch=range(r,.55,.75),rise=md/2*Math.tan(pitch);add('mill',part('prism','shingle',[md+.5,rise,mw+.5],[mx,bankH+mh,mz],2,[0,Math.PI/2,0]));
 add('mill',part('box','woodEdge',[.9,2,.08],[mx+mw*.2,bankH,z0-md-.04],1));add('mill',part('box','recess',[.7,.7,.08],[mx-mw*.2,bankH+mh-1,z0-md-.04],0));
 add('mill',beam('woodDark',[mx-mw/2+.5,bankH+mh+rise*.7,z0-md-.1],[mx-mw/2+.5,bankH+mh+rise*.7,z0-md-1.1],.12,0)); // sack hoist
 const R=range(r,1.4,1.8),tw=range(r,.7,.95),dip=.2,ya=waterY-dip+R;
 add('mill',part('cylinder','woodDark',[2*R,tw,2*R],[mx,ya,z0+.04],2,[Math.PI/2,0,0],12));
 const nP=pick(r,[8,10,12]);for(let i=0;i<nP;i++){const a=i/nP*Math.PI*2,px=mx+Math.cos(a)*(R-.08),py=ya+Math.sin(a)*(R-.08);
  if(py-.26<.03)continue;add('mill',part('box','woodMid',[.3,.12,tw+.06],[px,py-.06,z0+.04],1,[0,0,a]));}
 add('mill',part('cylinder','woodEdge',[.24,1.1,.24],[mx,ya,z0-.5],1,[Math.PI/2,0,0],6));
 if(fast){add('mill',part('box','stone',[.5,waterY+.5,Wc],[mx-dir*(R+1.6),0,zc],1));add('mill',part('box','woodDark',[.14,.7,Wc*.6],[mx-dir*(R+1.6),waterY+.5,zc],0));}
 // Arch bridge: voussoirs on abutments, haunch fill, slab deck, parapets, steps down to each court.
 const bx=-dir*range(r,1.5,5.5),B=2.4,span=Wc,sp=bankH+.35,f=range(r,1,1.3),t=.35,Rr=(span*span/4+f*f)/(2*f),cy=sp+f-Rr,th0=Math.asin(span/2/Rr);
 const nV=9,yD=sp+f+t+.35,ab=1.1;
 for(const s of[-1,1])add('bridge',part('box','stoneDark',[B,sp,ab],[bx,0,s<0?z0-ab/2+.02:z1+ab/2-.02],2));
 const vl=2*Rr*Math.sin(th0/(nV-1))*1.12;
 for(let i=0;i<nV;i++){const ph=-th0+i*2*th0/(nV-1);add('bridge',part('box','stone',[B,t,vl],[bx,cy+Math.cos(ph)*Rr,zc+Math.sin(ph)*Rr],2,[ph,0,0]));}
 const strips=7,sl=span/strips;
 for(let j=0;j<strips;j++){const zz=zc-span/2+(j+.5)*sl,zn=Math.min(Math.abs(zz-zc-sl/2),Math.abs(zz-zc+sl/2)),zq=Math.abs(zz-zc)<sl/2?0:zn,yE=cy+Math.sqrt(Math.max(0,(Rr+t)**2-zq*zq));
  add('bridge',part('box','stone',[B,Math.max(.05,yD-.3-yE+.02),sl],[bx,yE-.01,zz],1));}
 const deckL=span+2*ab;add('bridge',part('box','stoneDark',[B,.3,deckL],[bx,yD-.3,zc],2));
 for(const s of[-1,1])add('bridge',part('box','stone',[.28,.62,deckL],[bx+s*(B/2-.14),yD,zc],1));
 const H3=yD-bankH,{n:bn,rise:br}=steppedRise(H3),btread=.28,stairs:Stair[]=[];
 for(const [sgn,edge] of[[-1,z0],[1,z1]] as const){
  for(let k=0;k<bn-1;k++)add('bridge',part('box','stone',[B,H3-br*(k+1)+0,btread],[bx,bankH,edge+sgn*(ab-.02+(k+.5)*btread)],1));
  const top:[number,number]=[bx,edge+sgn*(ab-.02)],bot:[number,number]=[bx,edge+sgn*(ab-.02+(bn-1)*btread)];
  stairs.push({fromLevel:bankH,toLevel:yD,x:bx,zBottom:bot[1],zTop:top[1],steps:bn,riseM:br,treadM:btread,width:B,bottom:bot,top});}
 // Market stalls along the north court's back edge, facing the channel; clear aisle in front, joined to the bridge's north steps.
 const sd=1.3,sw=range(r,2,2.5),nS=pick(r,[3,4,5]),stalls:NonNullable<WonderPlan['stalls']>=[];
 const tailZ=z0-ab+.02-(bn-1)*btread-.4,aisleZ=tailZ-.2,fz=aisleZ-1.25,backZ=fz-sd;
 const stallXs:number[]=[];for(let i=0;i<nS;i++){const x=dir>0?bx+B/2+2.4+sw/2+i*(sw+.5):bx-B/2-2.4-sw/2-i*(sw+.5);if(Math.abs(x)+sw/2<=W/2-.4&&Math.abs(x-mx)>mw/2+sw/2+.5&&backZ>=z0-Dn+.15)stallXs.push(x);}
 stallXs.forEach((x,i)=>{const h=range(r,2,2.3);
  for(const dx of[-sw/2+.07,sw/2-.07])for(const [dz,hh] of[[-sd/2+.07,h+.25],[sd/2-.07,h]] as const)add('stalls',beam('woodDark',[x+dx,bankH,backZ+sd/2+dz],[x+dx,bankH+hh,backZ+sd/2+dz],.09,1));
  add('stalls',part('box','woodMid',[sw,.85,.35],[x,bankH,fz-.2],2));add('stalls',part('wedge',i%2?'cloth':'woodLight',[sw+.25,.35,sd+.25],[x,bankH+h-.05,backZ+sd/2],2));
  stalls.push({id:`stall-${i+1}`,x,z:fz-.2,access:[x,fz+.6]});});
 // Guard rail posts along both bank edges, broken at the bridge, so nobody walks into the water.
 for(const [zz,s] of[[z0-.18,-1],[z1+.18,1]] as const){const lo=-W/2+.3,hi=W/2-.3;for(let x=lo;x<=hi;x+=1.6){if(Math.abs(x-bx)<B/2+.4)continue;if(s<0&&Math.abs(x-mx)<mw/2+.2)continue;
  add('rails',part('cylinder','woodDark',[.12,.8,.1],[x,bankH+.12,zz],0,undefined,5));}}
 // Circulation: north entry steps (court to ground), aisle to stalls and mill door, bridge, south landing and steps.
 const {n:en,rise:er}=steppedRise(bankH),etread=.32;
 const nTop:[number,number]=[bx,z0-Dn+.1],nBot:[number,number]=[bx,z0-Dn-(en-1)*etread];
 for(let k=0;k<en-1;k++)add('courts',part('box','stone',[2.4,bankH-er*(k+1),etread],[bx,0,z0-Dn-(k+.5)*etread],1));
 stairs.push({fromLevel:0,toLevel:bankH,x:bx,zBottom:nBot[1],zTop:nTop[1],steps:en,riseM:er,treadM:etread,width:2.4,bottom:nBot,top:nTop});
 const sTop:[number,number]=[bx,z1+Ds-.1],sBot:[number,number]=[bx,z1+Ds+(en-1)*etread];
 for(let k=0;k<en-1;k++)add('courts',part('box','stone',[2.4,bankH-er*(k+1),etread],[bx,0,z1+Ds+(k+.5)*etread],1));
 stairs.push({fromLevel:0,toLevel:bankH,x:bx,zBottom:sBot[1],zTop:sTop[1],steps:en,riseM:er,treadM:etread,width:2.4,bottom:sBot,top:sTop});
 const brN:[number,number]=[bx,z0-ab],brS:[number,number]=[bx,z1+ab],bridgeTail:[number,number]=[bx,tailZ];
 const aisle:[number,number][]=[[bx,aisleZ],...[...stallXs].sort((p,q)=>Math.abs(p-bx)-Math.abs(q-bx)).map(x=>[x,aisleZ] as [number,number])];
 const millDoor:[number,number]=[mx+mw*.2,z0-md-.8],millWalk:[number,number][]=[[bx,aisleZ],[millDoor[0],aisleZ],millDoor];
 const entrances=[{x:nBot[0],z:nBot[1],width:2.4,facing:-Math.PI/2},{x:sBot[0],z:sBot[1],width:2.4,facing:Math.PI/2}];
 const labels:Record<string,string>={channel:'Millstream channel',courts:'Stone-faced courts and entry steps',mill:'Mill house, wheel and hoist',bridge:'Arched bridge and approach steps',stalls:'Market stalls',rails:'Bank guard rails'};
 const keys=Object.keys(groups).filter(k=>groups[k].length);
 return {family:'millMarket',version:WONDER_GENERATOR_VERSION,seed,footprint:{...fp},parts,channel:{z0,z1,x0:-fp.w/2,x1:fp.w/2},waterSurfaceY:waterY,courtY:bankH,
  wheel:{x:mx,y:ya,z0:z0+.04,z1:z0+.04+tw,radius:R,bottomY:ya-R,immersionM:Math.round((waterY-(ya-R))*1000)/1000},bridge:{x:bx,width:B,spanZ0:z0,spanZ1:z1,deckY:yD},stalls,aisleHalfWidth:1.2,
  stages:keys.map(k=>stage(k==='channel'?'groundworks':k,labels[k],parts,groups[k])),
  spaces:[{id:'market',label:'Market court',purpose:'Sell and trade goods from stalls along a clear aisle',areaM2:Math.round(W*Dn)},{id:'mill',label:'Mill house',purpose:'Grind grain with an undershot wheel turned by the channel',areaM2:Math.round(mw*md)},{id:'landing',label:'South landing',purpose:'Receive carts and walkers crossing the bridge',areaM2:Math.round(Math.min(W,16)*Ds)}],
  circulation:{entrances,paths:[[nBot,nTop,[bx,aisleZ]],[[bx,aisleZ],bridgeTail,brN,[bx,zc],brS,sTop,sBot],aisle,millWalk],stairs}};
}
