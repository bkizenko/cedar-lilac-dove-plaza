/** Activity-based animal behaviour: daily rhythms, herds, predator-prey, gaits.
 *
 * Authoritative, deterministic and camera-independent. All randomness is a hash of (world seed, animal id, decision counter),
 * so replaying a save gives identical paths. Games without `animalBehaviourVersion===1` never reach this file's tick.
 * Species coefficients are game-scale metres and seconds (a game day cycle is ~1350 s), shaped after field ethology:
 * ungulate crepuscular peaks, midday rumination, flight-initiation distance growing with group size ("many eyes"),
 * wolf pursuit predation with limited stamina and low success against healthy prey. */
import type {Game} from './sim';
import type {Critter,CritterKind} from './types';
import {WildlifeObstacles,wildlifeSegmentSafe,wildlifeBodyRadius} from './wildlifeMovement';
import {calendar} from './settlement';

export type BehState='graze'|'walk'|'rest'|'sleep'|'ruminate'|'drink'|'wallow'|'groom'|'alert'|'flee'|'rut'|'nurse'|'stalk'|'chase'|'feed'|'fly'|'perch'|'scav';
export const BEH_STATES:readonly BehState[]=['graze','walk','rest','sleep','ruminate','drink','wallow','groom','alert','flee','rut','nurse','stalk','chase','feed','fly','perch','scav'];
export type AnimalBeh={v:1;st:BehState;until:number;gx:number;gz:number;hd:number;sp:number;n:number;grp:number;lead?:1;en:number;thirst:number;hunger:number;hab:number;acc:number;alarmUntil:number;ax:number;az:number;
 h0x:number;h0z:number;wx?:number;wz?:number;dam?:number;adult?:number;sentId?:number;sentUntil?:number;tgt?:number;blk:number;alt?:number;dust?:1};
import {ANIMAL_TRAITS,ANIMAL_RULES,animalRand,activityLevel,type Traits,type Rhythm} from './animalTraits';
export {ANIMAL_TRAITS,ANIMAL_RULES,animalRand,activityLevel};export type {Traits};
const wrap=(a:number)=>{a%=Math.PI*2;return a>Math.PI?a-Math.PI*2:a<-Math.PI?a+Math.PI*2:a;};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const rn=(g:Game,c:Critter)=>animalRand(g.state.seed,c.id,c.beh!.n++);
export function newBeh(g:Game,c:Critter):AnimalBeh{
 const T=ANIMAL_TRAITS[c.species],fl=T.role==='flier';
 return{v:1,st:fl?'fly':'graze',until:g.state.time+animalRand(g.state.seed,c.id,0)*6,gx:c.x,gz:c.z,hd:c.facing,sp:0,n:1,grp:c.id,lead:1,en:1,thirst:animalRand(g.state.seed,c.id,901)*.4,hunger:animalRand(g.state.seed,c.id,902)*.4,hab:0,acc:0,alarmUntil:0,ax:0,az:0,h0x:c.grazing?.x??c.x,h0z:c.grazing?.z??c.z,blk:0,...(fl?{alt:c.y-g.height(c.x,c.z)}:{})};
}
/** Group wild animals of each species into species-sized herds around spatial seeds (deterministic, id order). */
export function initAnimalGroups(g:Game,only?:Critter[]){
 g.state.animalBehaviourVersion=1;
 const wild=(only??g.state.wildlife).filter(c=>!c.beh);
 for(const c of wild)c.beh=newBeh(g,c);
 for(const sp of Object.keys(ANIMAL_TRAITS) as CritterKind[]){
  const T=ANIMAL_TRAITS[sp],pool=wild.filter(c=>c.species===sp&&c.hp>0).sort((a,b)=>a.id-b.id),free=new Set(pool);
  let k=0;
  for(const lead of pool){
   if(!free.has(lead))continue;free.delete(lead);
   const size=T.group[0]+Math.floor(animalRand(g.state.seed,lead.id,77)*(T.group[1]-T.group[0]+1));
   const mates=[...free].sort((a,b)=>Math.hypot(a.x-lead.x,a.z-lead.z)-Math.hypot(b.x-lead.x,b.z-lead.z)||a.id-b.id).slice(0,size-1);
   lead.beh!.grp=lead.id;lead.beh!.lead=1;
   for(const m of mates){free.delete(m);m.beh!.grp=lead.id;delete m.beh!.lead;m.beh!.h0x=lead.beh!.h0x;m.beh!.h0z=lead.beh!.h0z;}
   // some juveniles follow adult females: they shrink to young scale and mature over time
   if(T.role==='prey')for(const m of mates)if(m.id%5===0&&mates.length>2){const dam=mates.find(d=>d.id%2===1&&d!==m);if(dam){m.beh!.dam=dam.id;m.beh!.adult=m.scale;m.scale*=.62;}}
   k++;
  }
 }
}
/** Predators are placed after prey so packs hold territory away from camps. Deterministic, new games only. */
export function spawnWolfPacks(g:Game,count:number){
 const r=g.world.islandR||140,rand=(n:number)=>animalRand(g.state.seed,0xf01f,n);let n=0,packs=0;
 for(let attempt=0;attempt<400&&packs<count;attempt++){
  const a=rand(n++)*Math.PI*2,d=(g.world.options?.size?g.world.options.size*.3:r*.7)*(.35+rand(n++)*.6),x=Math.sin(a)*d,z=Math.cos(a)*d;
  if(!g.walkable(x,z)||g.world.camps.some(c=>Math.hypot(c.x-x,c.z-z)<70)||g.height(x,z)<g.waterAt(x,z)+.5)continue;
  const size=3+Math.floor(rand(n++)*4),lead=g.id();
  for(let i=0;i<size;i++){
   const ox=x+(rand(n++)-.5)*6,oz=z+(rand(n++)-.5)*6;if(!g.walkable(ox,oz))continue;
   const id=i===0?lead:g.id(),c:Critter={id,species:'wolf',x:ox,y:g.height(ox,oz),z:oz,facing:rand(n++)*6.28,vx:0,vz:0,wanderT:0,hp:5,maxHp:5,fly:0,scale:1*(.94+rand(n++)*.12),grazing:{x,z}};
   c.beh=newBeh(g,c);c.beh.grp=lead;if(i)delete c.beh.lead;c.beh.h0x=x;c.beh.h0z=z;c.beh.hunger=.2+rand(n++)*.4;g.state.wildlife.push(c);
  }
  packs++;
 }
}

type Ctx={g:Game;ob:WildlifeObstacles;t:number;hour:number;sr:number;ss:number;phase:number;wet:boolean;cold:boolean;hot:boolean;night:boolean;
 groups:Map<number,Critter[]>;preds:Critter[];byId:Map<number,Critter>;people:{x:number;z:number;vx:number;vz:number;hunting:boolean}[];tg:Map<string,number>;pg:Map<string,number[]>;carcasses:Critter[]};
const cell=12;
const MEAT_MAX:Record<string,number>={deer:24,goat:16,sheep:16,boar:32,horse:48,cattle:60,bird:0,wolf:12};
const treeCache=new WeakMap<object,{at:number;grid:Map<string,number>}>();
function treeGrid(g:Game,t:number){const c=treeCache.get(g);if(c&&t-c.at<10&&t>=c.at)return c.grid;const grid=new Map<string,number>();for(const tr of g.state.trees){if(!(tr.amount>0))continue;const k=Math.floor(tr.x/cell)+','+Math.floor(tr.z/cell);grid.set(k,(grid.get(k)||0)+1);}treeCache.set(g,{at:t,grid});return grid;}
/** Tree density 0..1 around a point (about 12 m cells, bilinear-free for speed). */
export function treeDensity(ctx:{tg:Map<string,number>},x:number,z:number){let n=0;const cx=Math.floor(x/cell),cz=Math.floor(z/cell);for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)n+=(ctx.tg.get((cx+i)+','+(cz+j))||0)*(i||j?.35:1);return clamp(n/9,0,1);}
function biomeKind(g:Game,x:number,z:number){let best='plains',d=1e12;for(const b of g.world.biomes){const e=(b.x-x)**2+(b.z-z)**2;if(e<d){d=e;best=b.kind;}}return best;}
function slopeAt(g:Game,x:number,z:number){return Math.max(Math.abs(g.height(x+2,z)-g.height(x-2,z)),Math.abs(g.height(x,z+2)-g.height(x,z-2)))/4;}

/** Habitat suitability 0..1+ of a point for a given species and the current conditions. */
export function habitatScore(ctx:Ctx,sp:CritterKind,x:number,z:number,purpose:'forage'|'rest'|'shelter'){
 const g=ctx.g,T=ANIMAL_TRAITS[sp];if(g.height(x,z)<g.waterAt(x,z)+.5||!g.walkable(x,z))return -9;
 const tree=treeDensity(ctx,x,z),bio=biomeKind(g,x,z),slope=slopeAt(g,x,z);if(slope>T.slope||tree>T.forest&&purpose!=='shelter')return -9;
 const grass=(bio==='plains'?1:bio==='hills'?.65:.3)*(1-tree*.8),browse=(bio==='forest'?.9:.5)*(.3+tree);
 let s=purpose==='forage'?(T.grazer?grass:0)*(1-T.browse*.5)+browse*T.browse+(sp==='goat'?slope*.6:0):.45+(1-slope)*.2;
 if(purpose!=='forage'||ctx.wet||ctx.cold)s+=tree*(ctx.wet||ctx.cold?1.1:.4);
 if(ctx.hot&&purpose==='rest')s+=tree*.9;
 return s;
}
function pickPatch(ctx:Ctx,c:Critter,purpose:'forage'|'rest'|'shelter',near:{x:number;z:number},radius:number){
 const g=ctx.g,b=c.beh!,T=ANIMAL_TRAITS[c.species];let best=-1e9,bx=near.x,bz=near.z;
 for(let i=0;i<8;i++){
  const a=rn(g,c)*Math.PI*2,d=6+rn(g,c)*radius,x=near.x+Math.sin(a)*d,z=near.z+Math.cos(a)*d;
  let s=habitatScore(ctx,c.species,x,z,purpose);if(s<-5)continue;
  s-=d/(radius*3)+Math.max(0,Math.hypot(x-b.h0x,z-b.h0z)-T.home)/20+(ctx.g.world.camps.some(cp=>Math.hypot(cp.x-x,cp.z-z)<14)?1:0);
  if(s>best){best=s;bx=x;bz=z;}
 }
 return{x:bx,z:bz};
}
/** Nearest standable shore point within reach (stops one step before water), cached in the animal. */
function findWater(ctx:Ctx,c:Critter,maxR=70){
 const g=ctx.g,b=c.beh!;if(b.wx!==undefined&&Math.hypot(b.wx-c.x,b.wz!-c.z)<maxR*1.2)return{x:b.wx,z:b.wz!};
 let best:{x:number;z:number}|null=null,bd=1e9;const a0=rn(g,c)*6.283;
 for(let k=0;k<20;k++){const a=a0+k*.314;let px=c.x,pz=c.z;for(let d=3;d<=maxR;d+=3){const x=c.x+Math.sin(a)*d,z=c.z+Math.cos(a)*d;if(g.height(x,z)<g.waterAt(x,z)+.25){if(d<bd&&g.walkable(px,pz)){bd=d;best={x:px,z:pz};}break;}px=x;pz=z;}}
 if(best){b.wx=best.x;b.wz=best.z;}return best;
}
const slot=(k:number,sp:number)=>{const a=k*2.399963,r=sp*Math.sqrt(k+.6)*1.05;return{x:Math.sin(a)*r,z:Math.cos(a)*r};};
const gaitOf=(T:Traits,sp:number)=>sp<(T.gaits[0]+T.gaits[1])/2?0:sp<(T.gaits[1]+T.gaits[2])/2?1:sp<(T.gaits[2]+T.gaits[3])/2?2:3;
/** 0 walk .. 3 gallop; -1 when standing. Used by animation. */
export function animalGait(c:Critter){const b=c.beh;if(!b||b.sp<.12)return -1;return gaitOf(ANIMAL_TRAITS[c.species],b.sp);}

function buildCtx(g:Game,active:Critter[],ob:WildlifeObstacles):Ctx{
 const hour=g.dayPhase()*24,sun=g.daylight(),w=g.state.weather,phase=calendar(g).phase,t=g.state.time;
 const groups=new Map<number,Critter[]>(),byId=new Map<number,Critter>(),preds:Critter[]=[],carcasses:Critter[]=[];
 for(const c of g.state.wildlife){byId.set(c.id,c);if(c.hp<=0){if(c.carcass&&c.carcass.meat>0)carcasses.push(c);continue;}if(!c.beh)continue;let l=groups.get(c.beh.grp);if(!l)groups.set(c.beh.grp,l=[]);l.push(c);if(ANIMAL_TRAITS[c.species].role==='predator')preds.push(c);}
 const people:Ctx['people']=[];const pg=new Map<string,number[]>();
 for(const u of g.state.units){if(u.hp<=0||u.boat||u.shelterId)continue;people.push({x:u.x,z:u.z,vx:u.vx||0,vz:u.vz||0,hunting:u.order==='gather'&&!!u.node&&'species' in u.node||u.order==='hold'});}
 return{g,ob,t,hour,sr:sun.sunrise,ss:sun.sunset,phase,wet:w==='rain'||w==='storm',cold:w==='frost'||phase===3,hot:phase===1&&w!=='rain'&&w!=='storm',night:hour<sun.sunrise||hour>sun.sunset,groups,preds,byId,people,tg:treeGrid(g,t),pg,carcasses};
}
function leaderOf(ctx:Ctx,c:Critter){const m=ctx.groups.get(c.beh!.grp);if(!m||m.length<2)return null;let L=m.find(x=>x.beh!.lead&&x.id===c.beh!.grp)||m.find(x=>x.beh!.lead);
 if(!L){L=m.reduce((a,x)=>x.id<a.id?x:a);for(const x of m)delete x.beh!.lead;L.beh!.lead=1;for(const x of m)x.beh!.grp=L.id;}return L===c?null:L;}

/** Flight initiation distance in metres: species base, group size (many eyes), habituation, stalking approach. */
export function flightDistance(c:Critter,groupSize:number,hunting:boolean,predator=false){
 const T=ANIMAL_TRAITS[c.species],b=c.beh,base=predator?T.fidPred:T.fid;
 return base*(1+Math.min(.5,.1*(groupSize-1)))*(predator?1:(1-Math.min(ANIMAL_RULES.habMax,b?.hab||0))*(hunting?ANIMAL_RULES.huntFidScale:1));
}
/** A hit or kill nearby: whole herd bolts, habituation resets. */
export function noteAttack(g:Game,c:Critter,x:number,z:number){
 if(!c.beh)return;const t=g.state.time;c.beh.hab=0;
 for(const m of g.state.wildlife)if(m.beh&&m.hp>0&&(m.beh.grp===c.beh.grp||Math.hypot(m.x-c.x,m.z-c.z)<22)){m.beh.alarmUntil=t+12;m.beh.ax=x;m.beh.az=z;m.beh.hab=0;}
}
function setState(g:Game,c:Critter,st:BehState,dur:number,goal?:{x:number;z:number}){const b=c.beh!;b.st=st;b.until=g.state.time+dur;if(goal){b.gx=goal.x;b.gz=goal.z;}}

function decide(ctx:Ctx,c:Critter,members:Critter[]|undefined){
 const g=ctx.g,b=c.beh!,T=ANIMAL_TRAITS[c.species],t=ctx.t,lead=leaderOf(ctx,c),size=members?.length||1;
 const f=activityLevel(T.rhythm,ctx.hour,ctx.sr,ctx.ss),r=rn(g,c);
 // predators
 if(T.role==='predator'){
  if(!lead||true){
   const prey=b.hunger>.3&&f>.35&&!ctx.people.some(p=>Math.hypot(p.x-c.x,p.z-c.z)<18)?choosePrey(ctx,c):null;
   if(prey&&(!lead||lead.beh!.st==='stalk'||lead.beh!.st==='chase')&&(!lead&&c.beh!.lead||lead)||prey&&!lead){b.tgt=prey.id;if(members)for(const m of members)m.beh!.tgt=prey.id;setState(g,c,'stalk',ANIMAL_RULES.chaseSeconds,prey);return;}
  }
  if(lead&&['walk','rest','sleep','feed'].includes(lead.beh!.st)&&lead.beh!.st!=='feed'){setState(g,c,lead.beh!.st==='walk'?'walk':'rest',4+r*6);return;}
  if(f<.35||b.hunger<.2&&r<.5){setState(g,c,r<.3?'sleep':'rest',20+r*40);return;}
  const track=b.hunger>.45?trackPrey(ctx,c):null;
  setState(g,c,'walk',14+r*20,track||pickPatch(ctx,c,'forage',{x:b.h0x,z:b.h0z},T.home));return;
 }
 if(T.role==='flier'){
  const carc=ctx.carcasses.find(k=>Math.hypot(k.x-c.x,k.z-c.z)<70&&(k.carcass?.meat||0)>0);
  if(ctx.night&&f<.3){setState(g,c,'perch',40+r*60);return;}
  if(carc){setState(g,c,'scav',20+r*20,carc);return;}
  const a=r*6.283,d=10+rn(g,c)*30;setState(g,c,'fly',10+r*15,{x:b.h0x+Math.sin(a)*d,z:b.h0z+Math.cos(a)*d});return;
 }
 // prey: followers copy the leader's activity with an individual lag
 if(lead){
  const L=lead.beh!;
  if(L.sentId===c.id&&(L.sentUntil||0)>t&&['graze','rest','ruminate','walk'].includes(L.st)){setState(g,c,'alert',Math.max(3,(L.sentUntil||t)-t));b.gx=c.x;b.gz=c.z;return;}
  const idx=members!.findIndex(m=>m===c),o=slot(idx,T.spacing);
  const pos={x:lead.x+o.x,z:lead.z+o.z};
  if(L.st==='walk'||L.st==='drink'&&false){setState(g,c,'walk',3+r*3,pos);return;}
  if(L.st==='drink'){const w=findWater(ctx,c);setState(g,c,'drink',8+r*8,w||pos);return;}
  if(L.st==='rest'||L.st==='sleep'||L.st==='ruminate'||L.st==='wallow'||L.st==='groom'){setState(g,c,L.st==='sleep'?'sleep':L.st==='wallow'?'wallow':r<.2?'groom':L.st,8+r*10,pos);return;}
  if(L.st==='rut'&&c.id%2===0&&inRut(ctx,c)){setState(g,c,'rut',6+r*6,pos);return;}
  setState(g,c,'graze',6+r*8,pos);return;
 }
 // leader / solitary decision
 const young=b.dam!==undefined;
 if(young&&leaderOfDam(ctx,c)){const d=ctx.byId.get(b.dam!)!;if(['rest','sleep','graze'].includes(d.beh!.st)&&r<.3){setState(g,c,'nurse',5+r*3,d);return;}setState(g,c,'walk',3,{x:d.x+(r-.5)*2,z:d.z+(rn(g,c)-.5)*2});return;}
 if(b.thirst>.7){const w=findWater(ctx,c);if(w){setState(g,c,'drink',10+r*8,w);return;}}
 if(T.wallow&&ctx.hot&&ctx.hour>11&&ctx.hour<16&&b.thirst>.3){const w=findWater(ctx,c);if(w){setState(g,c,'wallow',20+r*30,w);return;}}
 if(inRut(ctx,c)&&c.id%2===0&&f>.3&&r<.5){setState(g,c,'rut',10+r*10,{x:c.x+(rn(g,c)-.5)*12,z:c.z+(rn(g,c)-.5)*12});return;}
 if(size>2&&r<.35)for(const m of [members![Math.floor(rn(g,c)*size)]])if(m!==c){b.sentId=m.id;b.sentUntil=t+25+rn(g,c)*20;}
 const weatherShelter=(ctx.wet||ctx.cold&&ctx.night)&&T.browse>.4;
 if(weatherShelter&&r<.7){setState(g,c,'rest',25+r*30,pickPatch(ctx,c,'shelter',c,24));return;}
 if(r<f){const patch=pickPatch(ctx,c,'forage',c,T.home*.5);const far=Math.hypot(patch.x-c.x,patch.z-c.z)>9;setState(g,c,far?'walk':'graze',far?10+r*14:30+r*50,patch);return;}
 if(ctx.night&&f<.25&&T.rhythm==='diurnal')return setState(g,c,'sleep',50+r*80,pickPatch(ctx,c,'rest',c,18));
 if(ctx.hot&&T.dust&&r<.3){b.dust=1;setState(g,c,'groom',12+r*14);return;}
 setState(g,c,r<.55?'ruminate':r<.8?'rest':'groom',18+r*35,pickPatch(ctx,c,'rest',c,T.rhythm==='diurnal'&&ctx.hot?20:12));
}
function leaderOfDam(ctx:Ctx,c:Critter){const d=ctx.byId.get(c.beh!.dam!);if(!d||d.hp<=0||c.scale>=(c.beh!.adult||c.scale)*.92){delete c.beh!.dam;if(c.beh!.adult)c.scale=Math.max(c.scale,c.beh!.adult);return false;}return true;}
const inRut=(ctx:Ctx,c:Critter)=>ANIMAL_TRAITS[c.species].rut===ctx.phase&&!c.beh!.dam;
/** Hungry wolves follow scent and sound toward the nearest prey herd instead of wandering blind. */
function trackPrey(ctx:Ctx,c:Critter){let best:Critter|null=null,bd=150;for(const k of ctx.g.state.wildlife){if(k.hp<=0||!ANIMAL_RULES.wolfPrey.includes(k.species))continue;const d=Math.hypot(k.x-c.x,k.z-c.z);if(d<bd){bd=d;best=k;}}return best?{x:best.x+(c.id%5-2)*3,z:best.z+(c.id%3-1)*3}:null;}
function choosePrey(ctx:Ctx,c:Critter){
 let best:Critter|null=null,bs=-1e9;
 for(const k of ctx.g.state.wildlife){if(k.hp<=0||!ANIMAL_RULES.wolfPrey.includes(k.species))continue;const d=Math.hypot(k.x-c.x,k.z-c.z);if(d>44)continue;
  const sz=ctx.groups.get(k.beh?.grp??-1)?.length||1,weak=(1-k.hp/k.maxHp)*2+(k.beh?.dam!==undefined?1.5:0)+(1-(k.beh?.en??1))*1.5+(sz<3?.8:0);
  const s=weak-d/20;if(s>bs){bs=s;best=k;}}
 return best;
}

/** One behaviour + locomotion step of dt seconds for a living wild animal. */
function stepOne(ctx:Ctx,c:Critter,dt:number){
 const g=ctx.g,b=c.beh!,T=ANIMAL_TRAITS[c.species],t=ctx.t,members=ctx.groups.get(b.grp),size=members?.length||1;
 b.hunger=clamp(b.hunger+dt*(T.role==='predator'?.0014:.0009)*(ctx.cold?1.2:1),0,1);b.thirst=clamp(b.thirst+dt*(ctx.hot?.0024:.0014),0,1);
 // growth of juveniles
 if(b.adult&&c.scale<b.adult)c.scale=Math.min(b.adult,c.scale+b.adult*dt*.0002);
 const wasFlee=b.st==='flee';let threat:{x:number;z:number;d:number;pred?:boolean}|null=null;
 if(T.role!=='flier'||b.st==='perch'){
  let worst=1e9;
  for(const p of ctx.people){const d=Math.hypot(p.x-c.x,p.z-c.z);if(d>T.fid*T.vigil*(b.st==='alert'?1.3:1)*2.2)continue;
   const fid=flightDistance(c,size,p.hunting);if(c.species==='boar')continue;
   if(d<fid&&d<worst){worst=d;threat={x:p.x,z:p.z,d};}else if(d<fid*2.2&&!p.hunting&&T.role==='prey')b.hab=Math.min(1,b.hab+dt*.01);}
  if(T.role==='prey')for(const w of ctx.preds){const d=Math.hypot(w.x-c.x,w.z-c.z);if(d<flightDistance(c,size,false,true)&&['stalk','chase'].includes(w.beh!.st)&&d<worst){worst=d;threat={x:w.x,z:w.z,d,pred:true};}}
 }
 b.hab=Math.max(0,b.hab-dt*.0005);
 if(threat&&b.st!=='flee'){b.alarmUntil=t+ (threat.pred?8:10);b.ax=threat.x;b.az=threat.z;
  if(members)for(const m of members)if(m!==c&&Math.hypot(m.x-c.x,m.z-c.z)<30){m.beh!.alarmUntil=Math.max(m.beh!.alarmUntil,t+8);m.beh!.ax=threat.x;m.beh!.az=threat.z;}}
 if(b.alarmUntil>t&&b.st!=='flee'&&T.role!=='flier'&&!(c.species==='boar'&&!threat)){
  const dx=c.x-b.ax,dz=c.z-b.az,d=Math.hypot(dx,dz);
  if(T.role==='prey'&&d<T.fidPred*2.4||threat){
   // away from the threat, bent toward cover (nearest denser tree side) and along herd heading
   let a=Math.atan2(dx,dz);const cover=pickPatch(ctx,c,'shelter',{x:c.x+Math.sin(a)*14,z:c.z+Math.cos(a)*14},9);
   a=Math.atan2(Math.sin(a)*2+(cover.x-c.x)/Math.max(1,Math.hypot(cover.x-c.x,cover.z-c.z)),Math.cos(a)*2+(cover.z-c.z)/Math.max(1,Math.hypot(cover.x-c.x,cover.z-c.z)));
   const run=T.fid*(c.species==='goat'?1.6:2.6);setState(g,c,'flee',Math.min(14,run/T.gaits[3]*1.4+2),{x:c.x+Math.sin(a)*run,z:c.z+Math.cos(a)*run});
  }
 }
 if(b.st==='flee'&&t>=b.until||!wasFlee&&false){setState(g,c,'alert',4+rn(g,c)*5);b.gx=c.x;b.gz=c.z;b.alarmUntil=0;}
 else if(t>=b.until&&b.st!=='flee')decide(ctx,c,members);
 // juveniles/followers re-aim at the moving slot
 if(b.st==='walk'&&!T.role.startsWith('pred')){const L=leaderOf(ctx,c);if(L&&L.beh!.st==='walk'){const o=slot(members!.indexOf(c),T.spacing);b.gx=L.x+o.x;b.gz=L.z+o.z;}}
 const goal={x:b.gx,z:b.gz};
 let target=0,aim=goal;const d=Math.hypot(goal.x-c.x,goal.z-c.z);
 switch(b.st){
  case 'graze':{const crawl=T.gaits[0]*.16;target=d>1.5?crawl:0;if(d<.8&&rn(g,c)<dt*.25){const p=pickPatch(ctx,c,'forage',c,5);b.gx=p.x;b.gz=p.z;}break;}
  case 'walk':{target=d>1.2?clamp(T.gaits[0]*(d>12?1.9:1)*(b.hunger>.7?1.2:1),0,T.gaits[1]):0;if(d<=1.2&&t>=b.until-1)b.until=t;break;}
  case 'drink':case 'wallow':{target=d>1.2?T.gaits[0]:0;if(d<=1.6){b.thirst=Math.max(0,b.thirst-dt*.09);}break;}
  case 'rest':case 'sleep':case 'ruminate':case 'groom':{target=d>1.5?T.gaits[0]*.8:0;break;}
  case 'nurse':case 'alert':case 'feed':target=0;break;
  case 'rut':target=d>1?T.gaits[1]*.9:0;break;
  case 'flee':{b.en=Math.max(0,b.en-dt/T.gallopSeconds);target=b.en>.1?T.gaits[3]:T.gaits[1]*1.05;if(d<2&&t<b.until)b.until=t;break;}
  case 'stalk':case 'chase':{const prey=ctx.byId.get(b.tgt??-1);if(!prey||prey.hp<=0){setState(g,c,'walk',6,{x:c.x,z:c.z});break;}
   const pd=Math.hypot(prey.x-c.x,prey.z-c.z);aim=b.st==='chase'?{x:prey.x+prey.vx*.6,z:prey.z+prey.vz*.6}:{x:prey.x,z:prey.z};
   if(b.st==='stalk'){target=T.gaits[0]*1.2;if(pd<ANIMAL_RULES.stalkMetres||prey.beh?.st==='flee'&&pd<ANIMAL_RULES.chaseGiveUp*.8){b.st='chase';b.until=t+ANIMAL_RULES.chaseSeconds;}else if(t>=b.until||pd>40){setState(g,c,'walk',8,{x:c.x,z:c.z});b.tgt=undefined;}}
   else{b.en=Math.max(0,b.en-dt/T.gallopSeconds);target=b.en>.12?T.gaits[3]:T.gaits[1];
    if(pd<ANIMAL_RULES.contact*c.scale){const odds=.5+.3*(1-prey.hp/prey.maxHp)+(prey.beh?.dam!==undefined?.15:0);if(rn(g,c)<odds)kill(ctx,c,prey);else{b.en=Math.max(0,b.en-.3);b.until=Math.min(b.until,t+3);}}
    else if(pd>ANIMAL_RULES.chaseGiveUp||b.en<.12&&pd>5||t>=b.until){setState(g,c,'rest',14);b.tgt=undefined;}}
   break;}
  case 'scav':case 'fly':case 'perch':break;
 }
 if(b.st==='feed'){const k=ctx.byId.get(b.tgt??-1),floor=(MEAT_MAX[k?.species||'deer']||0)*(1-ANIMAL_RULES.feedMeatFraction);
  if(!k||!k.carcass||k.carcass.meat<=floor||b.hunger<=.02){setState(g,c,'rest',20);b.tgt=undefined;}
  else{k.carcass.meat=Math.max(floor,k.carcass.meat-dt*.25);b.hunger=Math.max(0,b.hunger-dt*.012);}}
 if(b.st==='feed'&&!(ctx.byId.get(b.tgt??-1)))target=0;
 if(T.role==='flier'){flyStep(ctx,c,dt);return;}
 if(b.st!=='flee'&&b.st!=='chase')b.en=Math.min(1,b.en+dt/50);
 // followers/neighbours keep spacing
 if(members&&size>1&&target>0&&b.st!=='chase'&&b.st!=='stalk'){let sx=0,sz=0;for(const m of members){if(m===c)continue;const e=Math.hypot(m.x-c.x,m.z-c.z);if(e<T.spacing*.9&&e>.01){sx+=(c.x-m.x)/e*(T.spacing-e);sz+=(c.z-m.z)/e*(T.spacing-e);}}aim={x:aim.x+sx*1.5,z:aim.z+sz*1.5};}
 locomote(ctx,c,dt,aim,target);
}
function kill(ctx:Ctx,w:Critter,prey:Critter){
 const g=ctx.g;if(prey.hp<=0)return;prey.hp=0;prey.vx=0;prey.vz=0;prey.wanderT=600;if(prey.beh){prey.beh.sp=0;prey.beh.st='rest';}
 prey.carcass={meat:MEAT_MAX[prey.species],diedAt:g.state.time};delete prey.huntDefense;
 noteAttack(g,prey,prey.x,prey.z);const mem=ctx.groups.get(w.beh!.grp)||[w];
 for(const m of mem){const mb=m.beh!;mb.st='feed';mb.tgt=prey.id;mb.until=g.state.time+60;mb.gx=prey.x+(animalRand(g.state.seed,m.id,mb.n++)-.5)*2;mb.gz=prey.z+(animalRand(g.state.seed,m.id,mb.n++)-.5)*2;}
 g.workBoard?.reset?.();
}
function flyStep(ctx:Ctx,c:Critter,dt:number){
 const g=ctx.g,b=c.beh!,T=ANIMAL_TRAITS.bird,t=ctx.t;let alt=b.alt??8;
 const perched=b.st==='perch';let tgtAlt=perched?.25:b.st==='scav'?5:7+(c.id%5)*.7,speed=perched?0:T.gaits[2];
 if(b.st==='scav'&&Math.hypot(b.gx-c.x,b.gz-c.z)<14){// circle the carcass: aim a point ahead on the orbit
  const a=Math.atan2(c.x-b.gx,c.z-b.gz)+.5;b.ax=b.gx+Math.sin(a)*7;b.az=b.gz+Math.cos(a)*7;}else{b.ax=b.gx;b.az=b.gz;}
 let dx=b.ax-c.x,dz=b.az-c.z;const d=Math.hypot(dx,dz);
 const L=leaderOf(ctx,c);let aimX=b.ax,aimZ=b.az;
 if(L&&!perched){const mem=ctx.groups.get(b.grp)!,o=slot(mem.indexOf(c),T.spacing*1.4);aimX=L.x+o.x;aimZ=L.z+o.z;const e=Math.hypot(aimX-c.x,aimZ-c.z);speed=clamp(L.beh!.sp*.9+e*.6,T.gaits[1],T.gaits[3]);if(L.beh!.st==='perch')tgtAlt=.25;}
 else if(!perched&&d<4&&t>b.until-3)b.until=t;
 if(perched){const lowGround=g.height(c.x,c.z);alt=Math.max(.2,alt-dt*1.2);b.sp=Math.max(0,b.sp-T.gaits[3]*dt);b.alt=alt;c.y=lowGround+alt;c.vx=0;c.vz=0;return;}
 const want=Math.atan2(aimX-c.x,aimZ-c.z),dh=wrap(want-b.hd),lim=T.turn*dt;b.hd+=clamp(dh,-lim,lim);
 const tspeed=speed*(Math.abs(dh)>1?.7:1);b.sp+=clamp(tspeed-b.sp,-ANIMAL_RULES.decel*dt,ANIMAL_RULES.accel*dt);
 const nx=c.x+Math.sin(b.hd)*b.sp*dt,nz=c.z+Math.cos(b.hd)*b.sp*dt;
 const half=(g.world.size||1040)/2-6;c.x=clamp(nx,-half,half);c.z=clamp(nz,-half,half);alt+=clamp(tgtAlt-alt,-1.5*dt,1.5*dt);b.alt=alt;c.y=g.height(c.x,c.z)+alt;
 c.vx=Math.sin(b.hd)*b.sp;c.vz=Math.cos(b.hd)*b.sp;c.facing=b.hd;
}
/** Turn-limited, accelerated, terrain-aware movement toward `aim`. Never moves farther than speed*dt; blocked animals stop. */
function locomote(ctx:Ctx,c:Critter,dt:number,aim:{x:number;z:number},target:number){
 const g=ctx.g,b=c.beh!,T=ANIMAL_TRAITS[c.species],fleeing=b.st==='flee'||b.st==='chase';
 let want=Math.hypot(aim.x-c.x,aim.z-c.z)>.05?Math.atan2(aim.x-c.x,aim.z-c.z):b.hd;
 const okAt=(h:number,L:number)=>{const x=c.x+Math.sin(h)*L,z=c.z+Math.cos(h)*L;if(!wildlifeSegmentSafe(g as never,c,{x,z},ctx.ob))return false;
  if(Math.abs(g.height(x,z)-g.height(c.x,c.z))/L>T.slope)return false;return fleeing||treeDensity(ctx,x,z)<=T.forest;};
 if(target>0){const L=Math.max(1.4,b.sp*.9+.6);if(!okAt(want,L)){let found=false;const side=c.id%2?1:-1;for(const o of[.4,.8,1.25,1.8,2.4,3]){for(const s of[side,-side]){if(okAt(want+o*s,L)){want+=o*s;found=true;break;}}if(found)break;}
   if(!found){target=0;b.blk++;if(b.blk>=4){b.blk=0;b.until=ctx.t;}}else b.blk=0;}}
 const err=wrap(want-b.hd),ang=T.turn*(1-.55*clamp(b.sp/T.gaits[3],0,1)),lim=(b.sp<.2?ANIMAL_RULES.pivot:ang)*dt;
 if(target>0||Math.abs(err)>.35&&b.sp>.05)b.hd+=clamp(err,-lim,lim);
 const align=Math.cos(wrap(want-b.hd));if(Math.abs(wrap(want-b.hd))>.5)target*=Math.max(.15,align);
 b.sp+=clamp(target-b.sp,-ANIMAL_RULES.decel*dt,ANIMAL_RULES.accel*dt*(fleeing?2.2:1));if(b.sp<.02)b.sp=0;
 const dist=b.sp*dt;if(dist>1e-6){const x=c.x+Math.sin(b.hd)*dist,z=c.z+Math.cos(b.hd)*dist;
  if(wildlifeSegmentSafe(g as never,c,{x,z},ctx.ob)){c.x=x;c.z=z;c.y=g.height(x,z);}else{b.sp=0;b.blk++;}}
 c.vx=Math.sin(b.hd)*b.sp;c.vz=Math.cos(b.hd)*b.sp;
 const fe=wrap(b.hd-c.facing);if(b.sp>.05||Math.abs(fe)>.01)c.facing+=clamp(fe,-6*dt,6*dt);
}

/** Entry point from tickWildlife: living, unhandled wildlife only. Cost is capped per call and distant animals tick rarely. */
export function tickAnimals(g:Game,animals:Critter[],dt:number,ob:WildlifeObstacles){
 if(!animals.length)return;
 if(animals.some(c=>!c.beh))initAnimalGroups(g,animals.filter(c=>!c.beh));// wild herds added after world creation (sheep, horses, cattle) are grouped on first sight
 const ctx=buildCtx(g,animals,ob),players=g.state.units.filter(u=>u.team===0&&u.hp>0);
 const due:{c:Critter;lag:number}[]=[];
 for(const c of animals){
  const b=(c.beh??=newBeh(g,c));b.acc+=dt;
  const dd=lodDistance(g,c,players),iv=dd<ANIMAL_RULES.lodNear?ANIMAL_RULES.intervalNear:dd<ANIMAL_RULES.lodMid?ANIMAL_RULES.intervalMid:ANIMAL_RULES.intervalFar;
  if(b.acc>=iv)due.push({c,lag:b.acc-iv});
 }
 if(due.length>ANIMAL_RULES.maxStepsPerTick)due.sort((a,b)=>b.lag-a.lag||a.c.id-b.c.id).length=ANIMAL_RULES.maxStepsPerTick;
 due.sort((a,b)=>a.c.id-b.c.id);
 for(const {c} of due){const step=Math.min(c.beh!.acc,ANIMAL_RULES.maxStep);c.beh!.acc=0;stepOne(ctx,c,step);}
}
function lodDistance(g:Game,c:Critter,players:{x:number;z:number}[]){let d=Math.hypot(g.campOf(0).x-c.x,g.campOf(0).z-c.z)*.8;for(const p of players){const e=Math.hypot(p.x-c.x,p.z-c.z);if(e<d)d=e;}return d;}

/** Pen-interior life for domesticated stock: grazing, resting and wandering at walking pace without spinning; young stay by a dam. */
export function penStep(g:Game,a:Critter&{born?:number;sex?:string},pen:{x:number;z:number;w:number;d:number},dt:number,inside:(x:number,z:number)=>boolean,mates:Critter[],handlerNear:boolean){
 if(!a.beh){a.beh={...newBeh(g,a),h0x:pen.x,h0z:pen.z,st:'graze'};a.beh.grp=-1;}
 const b=a.beh,T=ANIMAL_TRAITS[a.species],t=g.state.time;b.acc+=dt;const step=b.acc;if(step<.1)return;b.acc=0;
 if(t>=b.until){const r=animalRand(g.state.seed,a.id,b.n++),hour=g.dayPhase()*24,f=activityLevel(T.rhythm==='nocturnal'?'diurnal':T.rhythm,hour,g.daylight().sunrise,g.daylight().sunset);
  const young=a.scale<(a.beh.adult||a.scale)&&false;void young;
  const dam=a.born!==undefined&&g.state.time-a.born<400?mates.filter(m=>m!==a&&m.hp>0&&m.scale>a.scale*1.2).sort((p,q)=>Math.hypot(p.x-a.x,p.z-a.z)-Math.hypot(q.x-a.x,q.z-a.z))[0]:undefined;
  if(dam){setState(g,a,r<.2?'nurse':'walk',6,{x:dam.x+(r-.5)*1.4,z:dam.z+(animalRand(g.state.seed,a.id,b.n++)-.5)*1.4});}
  else if(r<f*.7){const x=pen.x+(animalRand(g.state.seed,a.id,b.n++)-.5)*pen.w*.8,z=pen.z+(animalRand(g.state.seed,a.id,b.n++)-.5)*pen.d*.8;setState(g,a,'walk',8+r*8,inside(x,z)?{x,z}:{x:pen.x,z:pen.z});}
  else setState(g,a,r<.6?'ruminate':'rest',15+r*30);
  if(b.st==='walk'&&handlerNear)setState(g,a,'graze',4);
 }
 let target=0;const d=Math.hypot(b.gx-a.x,b.gz-a.z);
 if(b.st==='walk'&&d>.8)target=T.gaits[0]*.8;else if(b.st==='walk'){setState(g,a,'graze',10+animalRand(g.state.seed,a.id,b.n++)*20);}
 const want=d>.05?Math.atan2(b.gx-a.x,b.gz-a.z):b.hd,err=wrap(want-b.hd),lim=(b.sp<.2?ANIMAL_RULES.pivot:T.turn*.6)*step;
 if(target>0)b.hd+=clamp(err,-lim,lim);
 const al=target>0?Math.max(.15,Math.cos(wrap(want-b.hd))):0;b.sp+=clamp(target*al-b.sp,-ANIMAL_RULES.decel*step,ANIMAL_RULES.accel*step);if(b.sp<.02)b.sp=0;
 if(b.sp>0){const x=a.x+Math.sin(b.hd)*b.sp*step,z=a.z+Math.cos(b.hd)*b.sp*step;if(inside(x,z)&&g.walkable(x,z)){a.x=x;a.z=z;a.y=g.height(x,z);}else{b.sp=0;setState(g,a,'graze',6+animalRand(g.state.seed,a.id,b.n++)*6);}}
 a.vx=Math.sin(b.hd)*b.sp;a.vz=Math.cos(b.hd)*b.sp;const fe=wrap(b.hd-a.facing);if(b.sp>.05)a.facing+=clamp(fe,-5*step,5*step);
}

/** Validator for saved behaviour records (optional field). */
export function validAnimalBeh(b:unknown,time:number,half:number):boolean{
 if(b===undefined)return true;if(!b||typeof b!=='object'||Array.isArray(b))return false;const o=b as Record<string,unknown>,num=(v:unknown,lo=-1e9,hi=1e9)=>typeof v==='number'&&Number.isFinite(v)&&v>=lo&&v<=hi;
 return o.v===1&&BEH_STATES.includes(o.st as BehState)&&num(o.until,0,time+4000)&&num(o.gx,-half,half)&&num(o.gz,-half,half)&&num(o.hd,-1e3,1e3)&&num(o.sp,0,12)&&num(o.n,0,1e9)&&Number.isSafeInteger(o.grp)&&num(o.en,0,1)&&num(o.thirst,0,1)&&num(o.hunger,0,1)&&num(o.hab,0,1)&&num(o.acc,0,60)&&num(o.alarmUntil,0,time+100)&&num(o.ax,-1e5,1e5)&&num(o.az,-1e5,1e5)&&num(o.h0x,-half,half)&&num(o.h0z,-half,half)&&num(o.blk,0,1e6)&&
  (o.lead===undefined||o.lead===1)&&(o.dam===undefined||Number.isSafeInteger(o.dam))&&(o.tgt===undefined||Number.isSafeInteger(o.tgt))&&(o.adult===undefined||num(o.adult,.1,5))&&(o.alt===undefined||num(o.alt,0,60))&&(o.wx===undefined||num(o.wx,-half,half))&&(o.wz===undefined||num(o.wz,-half,half))&&(o.sentId===undefined||Number.isSafeInteger(o.sentId))&&(o.sentUntil===undefined||num(o.sentUntil,0,time+200));
}
export const animalBodyRadius=wildlifeBodyRadius;
