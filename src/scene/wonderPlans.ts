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
export type WonderFamily='ringObservatory'|'cascadeGarden';
export type WonderStage={id:string;label:string;partIndices:number[];volumeM3:Partial<Record<'stone'|'timber'|'earth'|'cloth'|'planting',number>>};
export type WonderSpace={id:string;label:string;purpose:string;areaM2:number};
export type Stair={fromLevel:number;toLevel:number;x:number;zBottom:number;zTop:number;steps:number;riseM:number;treadM:number;width:number};
export type WonderPlan={family:WonderFamily;version:number;seed:number;footprint:{w:number;d:number};parts:Part[];stages:WonderStage[];spaces:WonderSpace[];
 circulation:{entrances:{x:number;z:number;width:number;facing:number}[];paths:[number,number][][];stairs:Stair[]};
 /** Observatory only: azimuth (radians, from +X toward +Z) of the open sight slot. */
 sightAzimuth?:number;levels?:number[]};

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

export function generateWonderPlan(family:WonderFamily,worldSeed:number,siteId:number,footprint:{w:number;d:number}):WonderPlan{
 const seed=hashSeed(worldSeed,'wonder',family,siteId,WONDER_GENERATOR_VERSION);
 return family==='ringObservatory'?ringObservatory(seed,footprint):cascadeGarden(seed,footprint);
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
