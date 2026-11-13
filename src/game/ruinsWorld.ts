import type {Game} from './sim';
import type {Unit,ResKind} from './types';
import {hash32} from './rulerCore';
import {climateAt} from './ecology';
import {skinOfTeam} from './skinState';
import {wonderDef} from './wonderDefs';
import type {WonderRecord} from './wonderRecords';
import {CIV_IDS} from '../scene/civStyles';

/** Ruins in the world (pure queries plus a small state): what an abandoned village, a fallen wonder or an older people's site leaves behind.
 *
 *  - A ruin is a record in `state.ruins.sites` (optional save field; absent = legacy behaviour, nothing changes).
 *  - Decay is DERIVED from time since it fell: decay = decay0 + (now - fell) / (years * yearSeconds), 0 sound .. 1 reclaimed. The renderer
 *    (scene/ruinLayer.ts) turns decay into scene/ruins.ts collapse stages, vegetation overgrowth and sand drift; nothing ticks per frame.
 *  - Loot is finite and slot-driven: each site carries a fixed list of finds (stone, timber, grain, copper, iron, or a lore fragment) tied to
 *    the artifact slots of ruins.ts (hearth, threshold, roofFall, rubble, floorPit, wallNiche, foundation). A slot opens only once the ruin has
 *    decayed far enough (a floor pit is dug, a foundation is reached under fallen walls); a find is taken once and never regenerates.
 *  - Sources: hp-0 finished buildings (destroyed or abandoned halls), wonders whose society is gone, and "ancient sites" of an earlier people
 *    placed at world start from the game seed alone (hashed positions; it never touches the map generator's random stream, so every map is
 *    unchanged). New games switch it on; old saves carry no switch and keep the legacy cairns only. */
export const RUIN_RULES={version:1,yearSeconds:90,villageYears:20,maxSites:48,scanEvery:20,digCooldown:25,lootReach:3,ancient:{min:4,max:7,tries:400,fromCamp:110,spacing:80,edge:90,decay:[.45,.85] as const,years:60},
 /** a building smaller than this (m2) leaves no ruin worth a name */minFootprint:9,kinds:['townhall','hut','house','barracks','warehouse','workshop','forge','kiln','potter','temple','market','keep','stables','university','smokehouse','oven','fibreWorkshop','tailor','tanner','butcher','lumber','dock','watchtower'] as readonly string[]} as const;
export type RuinKind='village'|'wonder'|'ancient';
export type LootKind='stone'|'wood'|'copper'|'iron'|'food'|'lore';
export type SlotName='hearth'|'threshold'|'roofFall'|'rubble'|'floorPit'|'wallNiche'|'foundation';
export type RuinLoot={slot:SlotName;kind:LootKind;amount:number;depthM:number;rarity:0|1|2;taken?:boolean};
export type RuinSite={id:number;kind:RuinKind;x:number;z:number;w:number;d:number;yaw:number;seed:number;/** game time it fell (negative: older than the game) */fell:number;decay0:number;years:number;team:number;
 /** what it was: a building type or a wonder id; 'settlement' for an ancient site */was:string;/** civ id whose style it is built in */style:string;loot:RuinLoot[];src?:number;dugAt?:number};
export type RuinsState={version:1;enabled:boolean;nextId:number;sites:RuinSite[];/** sites a worker has searched */found:number;/** lore fragments recovered */lore:number;seen?:number[]};
type St={ruins?:RuinsState};
const st=(g:Pick<Game,'state'>)=>g.state as Game['state']&St;
export const ruinsOf=(g:Pick<Game,'state'>):readonly RuinSite[]=>st(g).ruins?.sites??[];
export const ruinsEnabled=(g:Pick<Game,'state'>)=>st(g).ruins?.enabled===true;

/** Slot access: the decay a ruin must reach before this slot can be reached, and what it can hold. */
export const SLOT_RULES:Record<SlotName,{open:number;holds:LootKind[];access:'open'|'under-rubble'|'in-wall'|'under-wall'|'dug'}>={
 hearth:{open:0,holds:['food','stone'],access:'open'},threshold:{open:.1,holds:['stone','copper'],access:'open'},floorPit:{open:.2,holds:['food','copper','iron'],access:'dug'},
 roofFall:{open:.25,holds:['wood'],access:'under-rubble'},rubble:{open:.35,holds:['stone','copper'],access:'under-rubble'},wallNiche:{open:.5,holds:['copper','lore'],access:'in-wall'},foundation:{open:.6,holds:['iron','copper','lore'],access:'under-wall'},
};
const SLOTS:Record<RuinKind,SlotName[]>={village:['hearth','threshold','roofFall','rubble'],wonder:['threshold','rubble','floorPit','wallNiche','foundation'],ancient:['hearth','floorPit','rubble','wallNiche','foundation']};
const AMOUNT:Record<LootKind,[number,number]>={stone:[8,18],wood:[6,14],food:[6,12],copper:[3,8],iron:[2,5],lore:[1,1]};
/** The finite finds of a ruin, fixed by its seed (pure). Ancient sites and wonders always keep one lore fragment in their deepest slot. */
export function ruinLoot(seed:number,kind:RuinKind):RuinLoot[]{
 const out:RuinLoot[]=SLOTS[kind].map(slot=>{
  const h=hash32('ruin-loot',seed,slot),rarity=(h%7===0?2:h%3===0?1:0) as 0|1|2,holds=SLOT_RULES[slot].holds.filter(k=>k!=='lore'||rarity===2),pickKind=holds[hash32('ruin-kind',seed,slot)%holds.length];
  const [lo,hi]=AMOUNT[pickKind],amount=pickKind==='lore'?1:lo+hash32('ruin-amt',seed,slot)%(hi-lo+1)+rarity*2;
  return{slot,kind:pickKind,amount,depthM:slot==='floorPit'?1.2:slot==='foundation'?1.8:slot==='rubble'||slot==='roofFall'?.4:0,rarity};
 });
 if(kind!=='village'){const deep=out[out.length-1];deep.kind='lore';deep.amount=1;deep.rarity=2;}
 return out;
}
const ruinYears=(kind:RuinKind,was:string)=>kind==='wonder'?wonderDef(was)?.ruinYears??30:kind==='ancient'?RUIN_RULES.ancient.years:RUIN_RULES.villageYears;
/** 0 sound .. 1 reclaimed. Monotonic in time. */
export function ruinDecay(site:Pick<RuinSite,'fell'|'decay0'|'years'>,time:number):number{
 const age=Math.max(0,time-site.fell);return Math.max(0,Math.min(1,site.decay0+age/(site.years*RUIN_RULES.yearSeconds)));
}
export type RuinStage='weathered'|'broken'|'collapsed'|'reclaimed';
export const ruinStage=(decay:number):RuinStage=>decay<.25?'weathered':decay<.5?'broken':decay<.8?'collapsed':'reclaimed';
export const RUIN_STAGE_WORDS:Record<RuinStage,string>={weathered:'Weathered: roof gone, walls standing',broken:'Broken: walls cut to a ragged skyline',collapsed:'Collapsed: rubble heaps and stumps',reclaimed:'Reclaimed: trees and vines over the stones'};
export function ruinClimate(g:Game,x:number,z:number):'arid'|'temperate'|'cold'|'wet'{
 const c=climateAt(g,x,z);return c.temperature<4?'cold':c.humidity>.65?'wet':c.humidity<.3&&c.temperature>14?'arid':'temperate';
}
export type RuinView={id:number;kind:RuinKind;x:number;z:number;w:number;d:number;yaw:number;seed:number;decay:number;stage:RuinStage;climate:'arid'|'temperate'|'cold'|'wet';style:string;was:string;team:number;open:number;left:number;lore:boolean;label:string;words:string};
/** Read model: what the player may see. Own ruins and any ruin on explored ground; finds are counted, not spoiled. */
export function ruinViews(g:Game):RuinView[]{
 return ruinsOf(g).filter(s=>g.exploredAt(s.x,s.z)).map(s=>{
  const decay=ruinDecay(s,g.state.time),stage=ruinStage(decay),left=s.loot.filter(l=>!l.taken).length,open=s.loot.filter(l=>!l.taken&&SLOT_RULES[l.slot].open<=decay).length;
  const label=s.kind==='ancient'?'Ancient site':s.kind==='wonder'?`Fallen ${wonderDef(s.was)?.label??'wonder'}`:`Ruined ${s.was}`;
  return{id:s.id,kind:s.kind,x:s.x,z:s.z,w:s.w,d:s.d,yaw:s.yaw,seed:s.seed,decay,stage,climate:ruinClimate(g,s.x,s.z),style:s.style,was:s.was,team:s.team,open,left,lore:s.loot.some(l=>!l.taken&&l.kind==='lore'),label,words:RUIN_STAGE_WORDS[stage]};
 });
}
const styleOfTeam=(g:Game,team:number,seed:number)=>skinOfTeam(g.state,team)?.grammar??CIV_IDS[seed%CIV_IDS.length];
function add(g:Game,s:Omit<RuinSite,'id'|'loot'|'years'|'decay0'>&{decay0?:number;years?:number}):RuinSite|null{
 const R=st(g).ruins;if(!R?.enabled)return null;
 const site:RuinSite={...s,id:R.nextId++,years:s.years??ruinYears(s.kind,s.was),decay0:s.decay0??0,loot:ruinLoot(s.seed,s.kind)};
 R.sites.push(site);
 // the oldest, most decayed ruin is forgotten first
 while(R.sites.length>RUIN_RULES.maxSites){let worst=0;R.sites.forEach((q,i)=>{if(ruinDecay(q,g.state.time)>ruinDecay(R.sites[worst],g.state.time))worst=i;});R.sites.splice(worst,1);}
 return site;
}
/** A wonder whose society is gone becomes a ruin; the wonder record stays (marked fallen) so history is not rewritten. */
export function fellWonder(g:Game,r:WonderRecord):RuinSite|null{
 if(r.fallen!==undefined)return null;r.fallen=g.state.time;
 return add(g,{kind:'wonder',x:r.x,z:r.z,w:r.w,d:r.d,yaw:r.yaw,seed:hash32('ruin-wonder',r.seed,r.id)>>>0,fell:g.state.time,team:r.team,was:r.family,style:styleOfTeam(g,r.team,r.seed)});
}
/** Ancient sites: where an earlier people lived. Hashed from the seed; dry, gentle, far from every start and from each other. */
export function ancientSiteSpots(g:Game):{x:number;z:number;yaw:number;seed:number;w:number;d:number;decay0:number;style:string}[]{
 const A=RUIN_RULES.ancient,half=g.world.size/2-A.edge,camps=[...(g.state.campSites??[]),...g.world.camps],out:{x:number;z:number;yaw:number;seed:number;w:number;d:number;decay0:number;style:string}[]=[];
 const want=A.min+hash32('ancient-count',g.state.seed)%(A.max-A.min+1);
 for(let k=0;k<A.tries&&out.length<want;k++){
  const h=hash32('ancient-spot',g.state.seed,k),x=Math.round(((h%2001)/1000-1)*half*10)/10,z=Math.round(((hash32('ancient-z',g.state.seed,k)%2001)/1000-1)*half*10)/10;
  if(g.height(x,z)-g.waterAt(x,z)<1.2)continue;
  if(camps.some(c=>Math.hypot(c.x-x,c.z-z)<A.fromCamp)||out.some(o=>Math.hypot(o.x-x,o.z-z)<A.spacing))continue;
  const here=g.height(x,z),grade=Math.max(Math.abs(g.height(x+6,z)-here),Math.abs(g.height(x,z+6)-here))/6;if(grade>.28)continue;
  const seed=hash32('ancient-seed',g.state.seed,k)>>>0;
  out.push({x,z,yaw:(hash32('ancient-yaw',seed)%4)*Math.PI/2,seed,w:14+hash32('ancient-w',seed)%12,d:12+hash32('ancient-d',seed)%12,decay0:A.decay[0]+(hash32('ancient-decay',seed)%1000)/1000*(A.decay[1]-A.decay[0]),style:CIV_IDS[seed%CIV_IDS.length]});
 }
 return out;
}
export function enableRuins(g:Game){
 const s=st(g);if(s.ruins)return;
 s.ruins={version:1,enabled:true,nextId:1,sites:[],found:0,lore:0,seen:[]};
 for(const a of ancientSiteSpots(g))add(g,{kind:'ancient',x:a.x,z:a.z,w:a.w,d:a.d,yaw:a.yaw,seed:a.seed,fell:-RUIN_RULES.yearSeconds*100,decay0:a.decay0,years:RUIN_RULES.ancient.years,team:-1,was:'settlement',style:a.style});
}
const clock=new WeakMap<Game,number>();
/** Called every sim tick (cheap): switches the system on for a brand-new game and scans for fallen buildings. */
export function tickRuins(g:Game,dt:number){
 const s=st(g);
 if(!s.ruins&&g.state.time<10)enableRuins(g);
 const R=s.ruins;if(!R?.enabled)return;
 const t=(clock.get(g)??0)+dt;if(t<RUIN_RULES.scanEvery){clock.set(g,t);return;}clock.set(g,0);
 const seen=new Set(R.seen??[]);
 for(const b of g.state.buildings){
  if(b.hp>0||seen.has(b.id)||!RUIN_RULES.kinds.includes(b.type)||b.w*b.d<RUIN_RULES.minFootprint||b.build<1)continue;
  seen.add(b.id);(R.seen??(R.seen=[])).push(b.id);if(R.seen.length>400)R.seen.splice(0,R.seen.length-400);
  add(g,{kind:'village',x:b.x,z:b.z,w:b.w,d:b.d,yaw:0,seed:hash32('ruin-village',g.state.seed,b.id)>>>0,fell:g.state.time,team:b.team,was:b.type,style:styleOfTeam(g,b.team,b.id),src:b.id});
 }
}
export type DigResult={ok:true;kind:LootKind;amount:number;site:number;slot:SlotName}|{ok:false};
/** A free player worker standing at a ruin takes the next find whose slot has opened. Finite: a find is taken once. */
export function lootRuins(g:Game,u:Unit):boolean{
 const R=st(g).ruins;if(!R?.enabled||u.team!==0||u.type!=='worker'||u.hp<=0||u.carry>0)return false;
 for(const site of R.sites){
  if(Math.hypot(u.x-site.x,u.z-site.z)>Math.max(site.w,site.d)/2+RUIN_RULES.lootReach)continue;
  if(site.dugAt!==undefined&&g.state.time-site.dugAt<RUIN_RULES.digCooldown)continue;
  const decay=ruinDecay(site,g.state.time),find=site.loot.find(l=>!l.taken&&SLOT_RULES[l.slot].open<=decay);
  if(!find)continue;
  find.taken=true;site.dugAt=g.state.time;
  if(!site.loot.some(l=>l.kind!=='lore'&&l.taken&&l!==find))R.found++;
  const label=site.kind==='ancient'?'an old site':site.kind==='wonder'?'a fallen great work':'a ruin';
  if(find.kind==='lore'){R.lore++;g.banner(`Recovered a carved record in ${label}: the old makers' methods are written there`,7);g.onSfx('drop');}
  else{u.carry=find.amount;u.carryType=find.kind as ResKind;u.carryFood=find.kind==='food'?'grain':undefined;u.recalled=true;u.stationOnArrival=false;u.order='return';u.workReason=`Salvage from ${label}: ${find.amount} ${find.kind}`;g.banner(u.workReason,6);g.onSfx('drop');}
  return true;
 }
 return false;
}
export function validRuins(s:any):boolean{
 const r=s?.ruins;if(r===undefined)return true;
 const fin=(v:unknown)=>typeof v==='number'&&Number.isFinite(v);
 if(!r||r.version!==1||typeof r.enabled!=='boolean'||!Number.isSafeInteger(r.nextId)||r.nextId<1||!Array.isArray(r.sites)||r.sites.length>RUIN_RULES.maxSites||!fin(r.found)||r.found<0||!fin(r.lore)||r.lore<0)return false;
 if(r.seen!==undefined&&(!Array.isArray(r.seen)||r.seen.length>400||!r.seen.every(Number.isSafeInteger)))return false;
 const ids=new Set<number>();
 for(const q of r.sites){
  if(!q||!Number.isInteger(q.id)||q.id<1||q.id>=r.nextId||ids.has(q.id)||!['village','wonder','ancient'].includes(q.kind)||![q.x,q.z,q.w,q.d,q.yaw,q.seed,q.fell,q.decay0,q.years].every(fin)||q.w<4||q.w>90||q.d<4||q.d>90||q.decay0<0||q.decay0>1||q.years<=0||typeof q.was!=='string'||typeof q.style!=='string'||!Number.isInteger(q.team))return false;
  ids.add(q.id);if(!Array.isArray(q.loot)||q.loot.length>8)return false;
  for(const l of q.loot)if(!l||!(l.slot in SLOT_RULES)||!['stone','wood','copper','iron','food','lore'].includes(l.kind)||!Number.isInteger(l.amount)||l.amount<1||l.amount>40||![0,1,2].includes(l.rarity)||!fin(l.depthM)||(l.taken!==undefined&&typeof l.taken!=='boolean'))return false;
  if(q.dugAt!==undefined&&!fin(q.dugAt))return false;
 }
 return true;
}
