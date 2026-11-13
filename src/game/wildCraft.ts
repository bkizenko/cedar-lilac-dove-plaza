import {bindWildCraftLoad} from './carriedLoad';
import {hasTaskCommitment} from './workCommitments';
import {isDependent,reserveSeconds} from './settlement';
import {CEREAL_RULES} from './cerealRules';
import {urgentReadyMealInputs} from './cerealProcessing';
import {supplyDrops,supplyApproach,supplyReached,type SupplyDrop} from './campAnchor';
import {clearCargoApproach} from './farmToolCargo';
import {connectedForUnit} from './waterTravel';
import {releaseTreeWorker} from './workAllocation';
import {workRuntime} from './workRuntime';
import type {JobCoordinator} from './jobCoordinator';
import {ITEM_KINDS,productionSlots} from './production';
import {FOOD_KINDS} from './foodKinds';
import {SITE_RULES,generateSites,renewSites,siteNear,drawFromSite,penAt,feedPen,validSites,type WildSite} from './wildStores';
/** Wild-craft: Dawn-of-Man-grade hunting, butchery, hide, meat/fruit and feedback chains.
 * Opt-in per game (`state.wildCraft` present). Every output is debited from a physical
 * source first: a carcass's finite parts, a station-held input, or a ledger good. Times are
 * tunable game work seconds, not historical durations. Old saves carry no field and never
 * run any of this. Reuses: climateAt, advanceDrying, hasDeliveredMethod, receiveFood,
 * takeFoodLot, tribe items/wood/water, predisposition, steer/interactionSpot. */
import type {Game} from './sim';
import type {Building,BldType,Critter,CritterKind,FoodKind,Unit,GameState} from './types';
import {climateAt} from './ecology';
import {advanceDrying,emptyDryingExposure,validDryingExposure,dryingConditions,PRESERVATION_RULES,type DryingExposure} from './foodPreservation';
import {hasDeliveredMethod} from './inheritedKnowledge';
import {receiveFood,takeFoodLot,foodInventory} from './pantry';
import {predisposition} from './people';
import {carcassAvailable,CARCASS_MEAT,huntingWeapon,type HuntableCritter} from './hunting';
import {animalProcessingEnabled,type ItemKind,type ProductionRecipe} from './production';

export const WILD_GOODS=['fat','sinew','brain','horn','soakedHide','tannedHide','frameHide','salt','hay'] as const;
export type WildGood=typeof WILD_GOODS[number];
export type GoodStock=Partial<Record<WildGood,number>>;
export const WILD_GOOD_ICON:Record<WildGood,string>={fat:'🧈',sinew:'🧵',brain:'🧠',horn:'🦴',soakedHide:'💧',tannedHide:'🟫',frameHide:'🖼',salt:'🧂',hay:'🌾'};

/** Per second at 12C, 0.6 humidity, uncovered. Climate multiplier mirrors the food pantry. */
export const WILD_SPOIL_PER_SECOND:Record<WildGood,number>={fat:.0006,sinew:.00004,brain:.003,horn:0,soakedHide:.0025,tannedHide:.0006,frameHide:.00004,salt:0,hay:.00005};
export const WILD_RULES={version:1,maxProjects:64,maxTraps:48,maxTrail:12,trailStepMeters:2,bleedFractionPerSecond:.02,trapRadius:{snare:1.2,pitfall:2},trapCheckSeconds:4,
 snareUses:3,snareCordage:2,pitfallWood:4,pitfallWorkSeconds:40,snareWorkSeconds:12,dressSeconds:6,maxGood:1e6} as const;

/** Finite extra parts per carcass beyond meat/hide/bone, by species (game units). */
export const BUTCHERY_PARTS:Record<CritterKind,{fat:number;sinew:number;brain:number;horn:number}>={
 deer:{fat:3,sinew:2,brain:1,horn:2},boar:{fat:6,sinew:2,brain:1,horn:2},goat:{fat:2,sinew:1,brain:1,horn:2},
 sheep:{fat:3,sinew:1,brain:1,horn:0},horse:{fat:4,sinew:4,brain:1,horn:0},cattle:{fat:8,sinew:4,brain:1,horn:2},bird:{fat:0,sinew:0,brain:0,horn:0},wolf:{fat:1,sinew:2,brain:1,horn:0}};

/** Hunting method by held tool and animal. Pure: the AI and the feedback share it. */
export type HuntMethod='stalk-spear'|'bow-ambush'|'thrown-stones'|'blade-close'|'snare'|'pitfall'|'dog-drive'|'fishing';
export const HUNT_METHOD_ICON:Record<HuntMethod,string>={'stalk-spear':'🔱','bow-ambush':'🏹','thrown-stones':'🪨','blade-close':'🗡','snare':'🪢','pitfall':'🕳','dog-drive':'🐕','fishing':'🎣'};
const SMALL:ReadonlySet<CritterKind>=new Set(['goat','sheep']);
export function huntMethodFor(u:Pick<Unit,'type'|'militia'>,species:CritterKind):HuntMethod|null{
 if(species==='bird')return null;
 const w=huntingWeapon(u as Unit);
 if(w==='bow')return 'bow-ambush';
 if(w==='spear')return 'stalk-spear';
 if(w==='blade')return 'blade-close';
 return SMALL.has(species)?'thrown-stones':null;
}
/** Passive methods available for a species with real stocks (cordage / timber). */
export function trapKindFor(species:CritterKind):'snare'|'pitfall'|null{
 return species==='bird'?null:SMALL.has(species)||species==='deer'?'snare':'pitfall';
}
export function snareCatches(species:CritterKind){return SMALL.has(species)||species==='deer';}

export type Trap={id:number;team:number;kind:'snare'|'pitfall';x:number;z:number;placedAt:number;uses:number;catches:number;nextCheck:number;setBy:number};
export type WildRecipeId='dressParts'|'renderFat'|'twistSinew'|'soakHide'|'barkTan'|'brainTan'|'smokeTan'|'frameDry'|'softenHide'|'dryBerries'|'boilJam'|'setSnare'|'digPitfall'|'trackWounded'|'gatherSalt'|'cutHay'|'forkHay'|'saltMeat';
export type WildRecipe={id:WildRecipeId;name:string;icon:string;station:BldType|'carcass'|'field'|'trail';workSeconds:number;
 items?:Partial<Record<ItemKind,number>>;goods?:GoodStock;foodIn?:Partial<Record<FoodKind,number>>;wood?:number;water?:number;
 outGoods?:GoodStock;outItems?:Partial<Record<ItemKind,number>>;outFood?:Partial<Record<FoodKind,number>>;
 /** Existing production recipe whose delivered proof (own, taught, traded, inherited) unlocks this; absent = observable by anyone. */
 gate?:ProductionRecipe;drying?:number;retain?:Partial<Record<ItemKind,number>>;
 /** Draws a finite good from a salt or hay site at x,z; the carried amount is removed from the site at the moment of work. */site?:'salt'|'hay';
 /** Forks held hay into the pen standing at x,z. */pen?:true};
const R=(r:WildRecipe)=>r;
export const WILD_RECIPES:Record<WildRecipeId,WildRecipe>={
 dressParts:R({id:'dressParts',name:'Field-dress fat, sinew, brain and horn',icon:'🔪',station:'carcass',workSeconds:WILD_RULES.dressSeconds}),
 renderFat:R({id:'renderFat',name:'Render fat into tallow',icon:'🧈',station:'hearth',workSeconds:24,goods:{fat:4},wood:1,outFood:{tallow:3}}),
 twistSinew:R({id:'twistSinew',name:'Twist sinew into cordage',icon:'🧵',station:'hearth',workSeconds:20,goods:{sinew:2},outItems:{cordage:2}}),
 soakHide:R({id:'soakHide',name:'Soak a scraped hide',icon:'💧',station:'tanner',workSeconds:25,items:{cleanHide:1},water:2,outGoods:{soakedHide:1},gate:'fleshHide'}),
 barkTan:R({id:'barkTan',name:'Tan with bark tannin',icon:'🌳',station:'tanner',workSeconds:70,goods:{soakedHide:1},items:{tannin:1},outGoods:{tannedHide:1},gate:'extractTannin'}),
 brainTan:R({id:'brainTan',name:'Tan with brains',icon:'🧠',station:'tanner',workSeconds:80,goods:{soakedHide:1,brain:1},water:1,outGoods:{tannedHide:1},gate:'fleshHide'}),
 smokeTan:R({id:'smokeTan',name:'Smoke-tan over a smoky fire',icon:'💨',station:'smokehouse',workSeconds:60,goods:{soakedHide:1},wood:2,outGoods:{tannedHide:1},gate:'fleshHide'}),
 frameDry:R({id:'frameDry',name:'Stretch and dry on a frame',icon:'🖼',station:'dryrack',workSeconds:10,goods:{tannedHide:1},outGoods:{frameHide:1},drying:90}),
 softenHide:R({id:'softenHide',name:'Work the dry hide supple',icon:'✋',station:'tanner',workSeconds:35,goods:{frameHide:1},outItems:{leather:1}}),
 dryBerries:R({id:'dryBerries',name:'Dry berries on a rack',icon:'🍇',station:'dryrack',workSeconds:10,foodIn:{berries:4},outFood:{driedBerries:3},drying:60}),
 boilJam:R({id:'boilJam',name:'Boil berries down to jam',icon:'🫙',station:'hearth',workSeconds:30,foodIn:{berries:4},wood:1,water:1,items:{pottery:1},retain:{pottery:1},outFood:{jam:3},gate:'cookPorridge'}),
 setSnare:R({id:'setSnare',name:'Set a snare',icon:'🪢',station:'field',workSeconds:WILD_RULES.snareWorkSeconds,items:{cordage:WILD_RULES.snareCordage}}),
 digPitfall:R({id:'digPitfall',name:'Dig and cover a pitfall',icon:'🕳',station:'field',workSeconds:WILD_RULES.pitfallWorkSeconds,wood:WILD_RULES.pitfallWood}),
 trackWounded:R({id:'trackWounded',name:'Follow the blood trail',icon:'🩸',station:'trail',workSeconds:0}),
 gatherSalt:R({id:'gatherSalt',name:'Gather salt',icon:'🧂',station:'field',workSeconds:30,site:'salt'}),
 cutHay:R({id:'cutHay',name:'Cut and rake hay',icon:'🌾',station:'field',workSeconds:36,site:'hay'}),
 forkHay:R({id:'forkHay',name:'Fork hay to the herd',icon:'🐄',station:'field',workSeconds:10,goods:{hay:SITE_RULES.fork},pen:true}),
 saltMeat:R({id:'saltMeat',name:'Salt-cure meat on a rack',icon:'🥩',station:'dryrack',workSeconds:20,foodIn:{meat:6},goods:{salt:1},outFood:{driedMeat:5},drying:80}),
};
export const WILD_RECIPE_IDS=Object.keys(WILD_RECIPES) as WildRecipeId[];

export type WildProject={paused?:true;cache?:{kind:'camp'|'building';id?:number;x:number;z:number};packet?:{x:number;z:number};id:number;team:number;recipe:WildRecipeId;actorId:number;phase:'fetch'|'go'|'work'|'dry'|'ready'|'collect'|'back';progress:number;startedAt:number;
 stationId?:number;critterId?:number;x?:number;z?:number;trapKind?:'snare'|'pitfall';trailIndex?:number;trailWait?:number;
 held:{items:Partial<Record<ItemKind,number>>;goods:GoodStock;food:Partial<Record<FoodKind,number>>;wood:number;water:number};carried:{goods:GoodStock;items:Partial<Record<ItemKind,number>>;food:Partial<Record<FoodKind,number>>};exposure?:DryingExposure};
export type Wound={since:number;trail:{x:number;z:number}[];bleed:number};
export type WildMetrics={produced:Record<string,number>;spoiled:Record<string,number>;lost:Record<string,number>;consumed:Record<string,number>;trapCatches:number;bledOut:number;completed:number};
export type WildCraftState={version:1;nextId:number;parts:Record<string,{fat:number;sinew:number;brain:number;horn:number}>;wounds:Record<string,Wound>;traps:Trap[];projects:WildProject[];
 stock:Record<string,GoodStock>;rot?:Record<string,GoodStock>;practice:Record<string,Partial<Record<WildRecipeId,number>>>;metrics:WildMetrics;lastDirector?:number;sites?:WildSite[]};

const emptyMetrics=():WildMetrics=>({produced:{},spoiled:{},lost:{},consumed:{},trapCatches:0,bledOut:0,completed:0});
export const wildCraftEnabled=(g:Game)=>g.state.wildCraft?.version===1;
export function enableWildCraft(g:Game){return g.state.wildCraft??={version:1,nextId:1,parts:{},wounds:{},traps:[],projects:[],stock:{},practice:{},metrics:emptyMetrics()};}
const bump=(m:Record<string,number>,k:string,n:number)=>{m[k]=(m[k]||0)+n;};
export function wildStock(g:Game,team:number):GoodStock{const w=g.state.wildCraft;if(!w)return {};return w.stock[String(team)]??={};}

/** Climate multiplier shared with the food pantry's formula, at a place. */
export function wildSpoilClimate(g:Game,x:number,z:number){const {temperature,humidity}=climateAt(g,x,z);return Math.max(.12,Math.min(2.8,Math.pow(2,(temperature-12)/12)*(.65+humidity*.7)));}
export function wildSpoilRate(g:Game,good:WildGood,x:number,z:number){return WILD_SPOIL_PER_SECOND[good]*wildSpoilClimate(g,x,z);}

function station(g:Game,id:number|undefined,team:number,type:BldType){const b=g.state.buildings.find(b=>b.id===id&&b.team===team&&b.type===type&&b.hp>0&&g.finished(b));return b;}
export function stationsFor(g:Game,team:number,type:BldType){return g.state.buildings.filter(b=>b.team===team&&b.type===type&&b.hp>0&&g.finished(b));}
/** Real capacity: two loaded batches per station, as the existing drying rack/smokehouse. */
export const WILD_STATION_SLOTS=2;
const slotsInUse=(w:WildCraftState,id:number)=>w.projects.filter(p=>p.stationId===id&&!['back'].includes(p.phase)).length;
const slotsHeld=(w:WildCraftState,id:number)=>w.projects.filter(p=>p.stationId===id&&['work','dry','ready','collect'].includes(p.phase)).length;

export type WildIssue=string|null;
function recipeKnown(g:Game,team:number,r:WildRecipe){
 const w=g.state.wildCraft!;if(!r.gate)return true;
 return hasDeliveredMethod(g,team,r.gate)||(w.practice[String(team)]?.[r.id]||0)>0;
}
const wildKey=(id:number)=>`wild-craft:${id}`;
function wildBodyPacket(p:WildProject){return !p.packet&&(Object.values(p.held.items).some(n=>(n||0)>0)||Object.values(p.held.goods).some(n=>(n||0)>0)||Object.values(p.held.food).some(n=>(n||0)>0)||p.held.wood>0||p.held.water>0||Object.values(p.carried.goods).some(n=>(n||0)>0)||Object.values(p.carried.items).some(n=>(n||0)>0)||Object.values(p.carried.food).some(n=>(n||0)>0));}
export function wildAdult(g:Game,u:Unit,own=false){return u.hp>0&&u.type==='worker'&&!u.militia&&!u.prisoner&&!isDependent(g,u)&&!u.emergency&&!u.recalled&&!u.boat&&!u.resting&&!u.shelterId&&!u.expedition&&!u.visit&&!u.trade&&!u.envoy&&!u.foundingJourney&&!u.tributeJourney&&!u.buildOrder&&u.drill==null&&u.carry===0&&!Object.values(u.itemCargo||{}).some(n=>(n||0)>0)&&!hasTaskCommitment(u,own?'wildWorkId':undefined);}
function sameWildCache(h:NonNullable<WildProject['cache']>,d:SupplyDrop){return Math.hypot(h.x-d.x,h.z-d.z)<.01&&(d.kind==='camp'?h.kind==='camp':h.kind==='building'&&h.id===d.id);}
function actualWildCache(g:Game,u:Unit){return supplyDrops(g,u.team).find(d=>{const spot=supplyApproach(g,u,d);return spot&&supplyReached(g,u,d,spot);});}
function wildReservations(g:Game,p:WildProject){const b=p.stationId===undefined?undefined:g.state.buildings.find(b=>b.id===p.stationId&&b.team===p.team&&g.finished(b));return b&&p.phase!=='back'?[{key:`production:${b.id}:slots`,amount:1,capacity:productionSlots(b)}]:[];}
/** Pure checks before interrupting unrelated tree ownership. JS admission is
 * synchronous; no executor can fill a checked slot between this and commit. */
function wildPreflight(g:Game,p:WildProject,jobs=workRuntime(g)){
 const id=wildKey(p.id),actor=p.paused||p.actorId===0?undefined:jobs.activeJob(p.actorId);if(actor&&actor.id!==id&&actor.kind!=='gather:wood')return false;
 return wildReservations(g,p).every(r=>jobs.reservations.used(r.key,id)+r.amount<=r.capacity);
}
function claimWild(g:Game,p:WildProject,jobs=workRuntime(g)){
 if(!wildPreflight(g,p,jobs))return false;const id=wildKey(p.id),fresh=!jobs.job(id),claims=wildReservations(g,p);
 if(fresh)jobs.propose({id,kind:'wild-craft',owner:p.team,actors:[],target:p.stationId??p.critterId??null});if(!jobs.amend(id,p.paused||p.actorId===0?[]:[p.actorId],claims)){if(fresh){jobs.finish(id,true);jobs.forget(id);}return false;}if(p.actorId>0){const u=g.state.units.find(u=>u.id===p.actorId),owned=g.state.wildCraft?.projects.find(q=>q.id===p.id)??p;if(u)bindWildCraftLoad(u,owned);}jobs.transition(id,p.paused?'reserved':p.phase==='work'||p.phase==='dry'?'working':p.phase==='back'?'returning':'traveling',p.progress);return true;
}
function releaseWild(g:Game,p:WildProject){const jobs=workRuntime(g),id=wildKey(p.id);jobs.finish(id);jobs.forget(id);}
export function rebuildWildCraftOwnership(g:Game,jobs:JobCoordinator){for(const p of g.state.wildCraft?.projects||[])claimWild(g,p,jobs);}
export function pauseWildWork(g:Game,u:Unit){const p=g.state.wildCraft?.projects.find(p=>p.id===u.wildWorkId&&p.actorId===u.id);if(!p)return false;p.paused=true;u.wildWorkPaused=!wildBodyPacket(p)?true:undefined;claimWild(g,p);return true;}
export function resumeWildWork(g:Game,unitId:number){const u=g.state.units.find(u=>u.id===unitId),p=g.state.wildCraft?.projects.find(p=>p.id===u?.wildWorkId&&p.actorId===unitId);if(!u||!p?.paused||!wildAdult(g,u,true))return false;const job=workRuntime(g).activeJob(u.id);if(job&&job.id!==wildKey(p.id)&&job.kind!=='gather:wood')return false;if(!wildPreflight(g,{...p,paused:undefined}))return false;g.interruptMission(u);releaseTreeWorker(g,u);delete p.paused;if(!claimWild(g,p)){p.paused=true;return false;}delete u.wildWorkPaused;if(p.phase==='work')p.phase='go';u.order='move';u.node=null;g.invalidateRoute(u);return true;}
/** A dead holder remains the physical location of its finite paid packet until recovered. */
export function wildBodyMustRemain(u:Unit){return u.hp<=0&&u.wildWorkId!==undefined;}
/** Why a recipe cannot start now (null = can start). Inputs are checked, not yet debited. */
export function wildIssue(g:Game,team:number,id:WildRecipeId,opts:{stationId?:number;critterId?:number}={}):WildIssue{
 const w=g.state.wildCraft;if(!w)return 'Wild-craft is not enabled';if(!Object.hasOwn(WILD_RECIPES,id)||!g.tribe(team)?.alive)return 'Choose an actual recipe and living village';const r=WILD_RECIPES[id],t=g.tribe(team);
 if(w.projects.length>=WILD_RULES.maxProjects)return 'Too many open jobs';
 if(!recipeKnown(g,team,r))return `Nobody here has seen or been taught ${r.name.toLowerCase()}`;
 if(r.station!=='carcass'&&r.station!=='field'&&r.station!=='trail'){
  const sts=stationsFor(g,team,r.station);if(!sts.length)return `Needs a finished ${r.station}`;
  const id2=opts.stationId,pick=id2!==undefined?sts.find(b=>b.id===id2):sts.find(b=>slotsInUse(w,b.id)<WILD_STATION_SLOTS);
  if(!pick)return `All ${r.station} slots are busy`;if(slotsInUse(w,pick.id)>=WILD_STATION_SLOTS)return `${r.station} slots are full`;
 }
 if((id==='setSnare'||id==='digPitfall')&&w.traps.length+w.projects.filter(p=>p.trapKind).length>=WILD_RULES.maxTraps)return 'Trap capacity is fully reserved';
 const stock=w.stock[String(team)]||{};
 for(const[k,n]of Object.entries(r.goods||{}))if((stock[k as WildGood]||0)<n!)return `Need ${n} ${k} in store`;
 for(const[k,n]of Object.entries(r.items||{}))if(((t.items||{})[k as ItemKind]||0)<n!)return `Need ${n} ${k} at the camp cache`;
 for(const[k,n]of Object.entries(r.foodIn||{}))if(foodInventory(t)[k as FoodKind]+1e-9<n!)return `Need ${n} ${k} in store`;
 if((r.wood||0)>t.wood)return `Need ${r.wood} wood`;if((r.water||0)>(t.survival?.waterLiters||0))return `Need ${r.water} litres of water`;
 if(id==='dressParts'){const c=critter(g,opts.critterId);if(!c)return 'No carcass chosen';const pl=partsLeft(g,c);if(!pl)return 'Carcass is not yet gutted or is spoiled';if(pl.fat+pl.sinew+pl.brain+pl.horn<=0)return 'Nothing left to dress';}
 return null;
}
const critter=(g:Game,id?:number)=>id===undefined?undefined:g.state.wildlife.find(c=>c.id===id) as HuntableCritter|undefined;
/** Finite parts still on a gutted, usable carcass. Initialised once from the species table. */
export function partsLeft(g:Game,c:HuntableCritter){
 const w=g.state.wildCraft;if(!w||c.hp>0||!c.carcass?.prepared||!carcassAvailable(g,c))return null;
 return w.parts[c.id]??=({...BUTCHERY_PARTS[c.species]});
}

/** Start a job: the actor is committed and the inputs are claimed (debited) from the cache at once; the actor then walks to the camp, carries them to the station and works. Cancelling refunds them. */
export function beginWildWork(g:Game,unitId:number,id:WildRecipeId,opts:{stationId?:number;critterId?:number;x?:number;z?:number}={}):{accepted:boolean;reason:string}{
 const w=g.state.wildCraft,u=g.state.units.find(u=>u.id===unitId&&u.hp>0);if(!w||!u||!Object.hasOwn(WILD_RECIPES,id))return {accepted:false,reason:'No such resident or recipe'};
 if(!wildAdult(g,u))return {accepted:false,reason:'Need a healthy free adult without another committed duty'};
 if(u.wildWorkId!==undefined)return {accepted:false,reason:'Already on a wild-craft job'};
 if(u.carry>0||Object.values(u.itemCargo||{}).some(n=>(n||0)>0))return {accepted:false,reason:'Hands are full'};
 const r=WILD_RECIPES[id];
 let sid=opts.stationId;
 if(r.station!=='carcass'&&r.station!=='field'&&r.station!=='trail'&&sid===undefined){const sts=stationsFor(g,u.team,r.station).filter(b=>slotsInUse(w,b.id)<WILD_STATION_SLOTS);sid=sts.sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0]?.id;}
 if(r.station==='field'&&(opts.x===undefined||opts.z===undefined||!r.pen&&!g.walkable(opts.x,opts.z)))return {accepted:false,reason:'Needs walkable ground'};
 if(r.site){const s=siteNear(w.sites,r.site,opts.x!,opts.z!);if(!s||!g.exploredAt(s.x,s.z))return {accepted:false,reason:r.site==='salt'?'No known salt site there':'No known hay meadow there'};if(s.left<1)return {accepted:false,reason:'That site is spent for now'};}
 if(r.pen&&!penAt(g,opts.x!,opts.z!))return {accepted:false,reason:'Choose a finished pen of your own'};
 const issue=wildIssue(g,u.team,id,{...opts,stationId:sid});if(issue)return {accepted:false,reason:issue};
 if(id==='trackWounded'&&!(opts.critterId!==undefined&&w.wounds[opts.critterId]))return {accepted:false,reason:'No blood trail'};
 const drop=supplyDrops(g,u.team).map(drop=>({drop,spot:supplyApproach(g,u,drop)})).find(d=>d.spot);if(!drop)return{accepted:false,reason:'No reachable actual supply cache'};
 const p:WildProject={id:w.nextId,team:u.team,recipe:id,actorId:u.id,phase:r.station==='carcass'||r.station==='field'||r.station==='trail'?(Object.keys({...r.items,...r.goods}).length||r.wood?'fetch':'go'):'fetch',progress:0,startedAt:g.state.time,
  ...(sid!==undefined?{stationId:sid}:{}),...(opts.critterId!==undefined?{critterId:opts.critterId}:{}),...(opts.x!==undefined?{x:opts.x,z:opts.z}:{}),
  ...(id==='setSnare'?{trapKind:'snare' as const}:id==='digPitfall'?{trapKind:'pitfall' as const}:{}),
  held:{items:{},goods:{},food:{},wood:0,water:0},carried:{goods:{},items:{},food:{}},...(r.drying?{exposure:emptyDryingExposure()}:{})};
 // Dressing and tracking begin at the carcass/trail with nothing to fetch.
 if(id==='dressParts'||id==='trackWounded'){p.phase='go';}
 if(p.phase==='fetch'){p.cache={kind:drop.drop.kind==='camp'?'camp':'building',...(drop.drop.kind==='camp'?{}:{id:drop.drop.id}),x:drop.drop.x,z:drop.drop.z};p.packet={x:drop.drop.x,z:drop.drop.z};}
 if(!wildPreflight(g,p))return{accepted:false,reason:'Actor or real workplace slot is already reserved'};releaseTreeWorker(g,u);if(!claimWild(g,p))return{accepted:false,reason:'Actor or real workplace slot is already reserved'};g.interruptMission(u);w.nextId++;if(p.phase==='fetch')debitInputs(g,p);
 w.projects.push(p);u.wildWorkId=p.id;u.order='move';u.node=null;u.workReason=`${r.icon} ${r.name}`;g.workBoard.invalidateTasks();
 return {accepted:true,reason:''};
}

function debitInputs(g:Game,p:WildProject){
 const r=WILD_RECIPES[p.recipe],t=g.tribe(p.team),w=g.state.wildCraft!,stock=wildStock(g,p.team),m=w.metrics;
 for(const[k,n]of Object.entries(r.goods||{})){stock[k as WildGood]=(stock[k as WildGood]||0)-n!;p.held.goods[k as WildGood]=n;bump(m.consumed,k,n!);}
 t.items??={};for(const[k,n]of Object.entries(r.items||{})){t.items[k as ItemKind]=(t.items[k as ItemKind]||0)-n!;p.held.items[k as ItemKind]=n;bump(m.consumed,k,n!);}
 for(const[k,n]of Object.entries(r.foodIn||{})){takeFoodLot(g,p.team,k as FoodKind,n!);p.held.food[k as FoodKind]=n;bump(m.consumed,k,n!);}
 if(r.wood){t.wood-=r.wood;p.held.wood=r.wood;}if(r.water&&t.survival){t.survival.waterLiters-=r.water;p.held.water=r.water;}
}
/** Cancelling returns every held input to the cache; nothing is lost or invented. */
export function cancelWildWork(g:Game,unitId:number){
 const w=g.state.wildCraft,u=g.state.units.find(u=>u.id===unitId);if(!w||!u||u.wildWorkId===undefined)return false;const p=w.projects.find(p=>p.id===u.wildWorkId);if(!p)return false;
 const escrow=p.phase==='fetch'&&p.cache&&supplyDrops(g,p.team).some(d=>sameWildCache(p.cache!,d)),here=actualWildCache(g,u),packetHere=here&&(!p.packet||Math.hypot(p.packet.x-u.x,p.packet.z-u.z)<1.8);
 if(!escrow&&!packetHere){pauseWildWork(g,u);u.workReason='Paid packet retained at its real place; resume and return it before canceling';return false;}
 if(p.phase==='back')credit(g,p);else refund(g,p);dropProject(g,u,p);return true;
}

function refund(g:Game,p:WildProject){
 const t=g.tribe(p.team),stock=wildStock(g,p.team);t.items??={};
 for(const[k,n]of Object.entries(p.held.goods)){stock[k as WildGood]=(stock[k as WildGood]||0)+n!;bump(g.state.wildCraft!.metrics.consumed,k,-n!);}
 for(const[k,n]of Object.entries(p.held.items)){t.items[k as ItemKind]=(t.items[k as ItemKind]||0)+n!;bump(g.state.wildCraft!.metrics.consumed,k,-n!);}
 for(const[k,n]of Object.entries(p.held.food)){const lots=foodInventory(t);lots[k as FoodKind]+=n!;t.food+=n!;t.foodLots=lots;bump(g.state.wildCraft!.metrics.consumed,k,-n!);}
 t.wood+=p.held.wood;if(t.survival)t.survival.waterLiters+=p.held.water;
 p.held={items:{},goods:{},food:{},wood:0,water:0};
 for(const[k,n]of Object.entries(p.carried.goods))stock[k as WildGood]=(stock[k as WildGood]||0)+n!;
 for(const[k,n]of Object.entries(p.carried.items))t.items[k as ItemKind]=(t.items[k as ItemKind]||0)+n!;
 for(const[k,n]of Object.entries(p.carried.food))receiveFood(g,p.team,n!,k as FoodKind);
 p.carried={goods:{},items:{},food:{}};
}
function dropProject(g:Game,u:Unit|undefined,p?:WildProject){
 const w=g.state.wildCraft!;if(p){releaseWild(g,p);w.projects=w.projects.filter(q=>q!==p);}
 if(u){const other=hasTaskCommitment(u,'wildWorkId');delete u.wildWorkId;delete u.wildWorkPaused;if(!other){u.order='idle';u.workReason='Finished wild-craft job';g.invalidateRoute?.(u);}}
 g.workBoard.invalidateTasks();
}
const walkTo=(g:Game,u:Unit,x:number,z:number,dt:number,why:string)=>{const s=g.nearestWalk(u,x,z);u.tx=s.x;u.tz=s.z;u.workReason=why;g.steer(u,dt);};
const near=(u:Unit,x:number,z:number,r=2.2)=>Math.hypot(u.x-x,u.z-z)<=r;
const workRate=(u:Unit)=>.6+predisposition(u).strength*.4;

/** Per-unit driver. Returns true while the unit is on a wild-craft job. */
export function wildCraftAI(g:Game,u:Unit,dt:number):boolean{
 const w=g.state.wildCraft;if(!w||u.wildWorkId===undefined)return false;
 const p=w.projects.find(p=>p.id===u.wildWorkId&&p.actorId===u.id);
 if(!p){delete u.wildWorkId;delete u.wildWorkPaused;return false;}if(p.paused)return false;if(!claimWild(g,p)){u.workReason='Wild-craft actor or workplace is reserved';return true;}
 const r=WILD_RECIPES[p.recipe],camp=g.campOf(p.team);
 if(p.recipe==='trackWounded')return trackAI(g,u,p,dt);
 if(p.phase==='fetch'){
  const cache=p.cache&&supplyDrops(g,p.team).find(d=>sameWildCache(p.cache!,d)),spot=cache&&supplyApproach(g,u,cache);if(!cache||!spot){u.workReason='Original paid cache needs a real reachable entrance';return true;}if(!supplyReached(g,u,cache,spot)){u.tx=spot.x;u.tz=spot.z;g.steer(u,dt);return true;}p.packet=undefined;p.phase='go';return true;
 }
 const b=p.stationId!==undefined?g.state.buildings.find(b=>b.id===p.stationId&&b.team===p.team&&b.hp>0):undefined;
 if(r.station!=='carcass'&&r.station!=='field'&&!b){pauseWildWork(g,u);u.workReason='Original workplace lost; same paid packet retained without refund';return true;}
 if(p.phase==='go'){
  if(r.station==='carcass'){const c=critter(g,p.critterId);if(!c||!partsLeft(g,c)){pauseWildWork(g,u);u.workReason='Original carcass unavailable; retained work needs a direct decision';return true;}if(!near(u,c.x,c.z,1.8)){walkTo(g,u,c.x,c.z,dt,`${r.icon} Walking to the carcass`);return true;}p.phase='work';return true;}
  if(r.station==='field'){const x=p.x??u.x,z=p.z??u.z,pen=r.pen?penAt(g,x,z):undefined;if(r.pen&&!pen){pauseWildWork(g,u);u.workReason='Original pen lost; paid hay retained at its real place';return true;}if(!near(u,x,z,pen?Math.max(pen.w,pen.d)/2+1.5:1.5)){walkTo(g,u,x,z,dt,`${r.icon} Going to the set site`);return true;}p.phase='work';return true;}
  if(!g.buildingWorkReached(u,b!)){const s=g.interactionSpot(u,b!);if(!s){u.workReason='No reachable workplace entrance';return true;}u.tx=s.x;u.tz=s.z;u.workReason=`${r.icon} Carrying inputs to the ${r.station}`;g.steer(u,dt);return true;}
  if(slotsHeld(w,b!.id)>Math.min(WILD_STATION_SLOTS,productionSlots(b!))){u.workReason=`${r.icon} Waiting for a free slot`;return true;}
  p.packet={x:u.x,z:u.z};p.phase='work';return true;
 }
 if(p.phase==='work'){
  if(b&&!g.buildingWorkReached(u,b)){p.phase='go';return true;}u.stride+=dt*6;p.progress=Math.min(r.workSeconds,p.progress+dt*workRate(u));u.workReason=`${r.icon} ${r.name} · ${Math.min(100,Math.floor(p.progress/Math.max(1,r.workSeconds)*100))}%`;
  if(p.progress<r.workSeconds)return true;
  if(p.exposure){p.phase='dry';p.actorId=0;delete u.wildWorkId;delete u.wildWorkPaused;claimWild(g,p);u.order='idle';u.workReason=`${r.icon} Loaded the rack`;g.workBoard.invalidateTasks();return false;}
  return finishWork(g,u,p);
 }
 if(p.phase==='collect'){
  if(!g.buildingWorkReached(u,b!)){const s=g.interactionSpot(u,b!);if(!s){u.workReason='No reachable workplace entrance';return true;}u.tx=s.x;u.tz=s.z;u.workReason=`${r.icon} Collecting the dry batch`;g.steer(u,dt);return true;}
  return finishWork(g,u,p);
 }
 // phase 'back': carry outputs to the camp cache, then credit.
 const drop=supplyDrops(g,p.team).map(drop=>({drop,spot:supplyApproach(g,u,drop)})).find(d=>d.spot);if(!drop?.spot){u.workReason='No reachable actual cache for finished wild goods';return true;}if(!supplyReached(g,u,drop.drop,drop.spot)){u.tx=drop.spot.x;u.tz=drop.spot.z;g.steer(u,dt);return true;}
 credit(g,p);dropProject(g,u,p);return true;
}
function wasteHeld(g:Game,p:WildProject){const m=g.state.wildCraft!.metrics;for(const grp of[p.held.goods,p.held.items,p.held.food])for(const[k,n]of Object.entries(grp))bump(m.lost,k,n!);p.held={items:{},goods:{},food:{},wood:0,water:0};g.addFloater?.(g.campOf(p.team).x,2,g.campOf(p.team).z,'ruined by wet weather','#c98');}
function finishWork(g:Game,u:Unit,p:WildProject){
 const w=g.state.wildCraft!,r=WILD_RECIPES[p.recipe];
 if(p.recipe==='dressParts'){
  const c=critter(g,p.critterId),left=c&&partsLeft(g,c);if(!c||!left){dropProject(g,u,p);return true;}
  const room=Math.max(0,6-Object.values(p.carried.goods).reduce((n,v)=>n+(v||0),0));
  let cap=room;for(const k of['fat','sinew','brain','horn'] as const){const take=Math.min(left[k],cap);left[k]-=take;cap-=take;if(take>0)p.carried.goods[k]=(p.carried.goods[k]||0)+take;}
  p.packet=undefined;p.phase='back';u.workReason='🔪 Carrying parts home';return true;
 }
 if(r.site){const s=siteNear(w.sites,r.site,p.x??u.x,p.z??u.z),take=s?drawFromSite(s,SITE_RULES.draw[r.site]):0;if(take<=0){dropProject(g,u,p);u.workReason='The site had nothing left';return true;}
  p.carried.goods[r.site]=(p.carried.goods[r.site]||0)+take;p.packet=undefined;p.phase='back';u.workReason=`${r.icon} Carrying it home`;return true;}
 if(r.pen){const pen=penAt(g,p.x??u.x,p.z??u.z),hay=p.held.goods.hay||0,took=pen?feedPen(pen,hay):0,rest=hay-took;p.held={items:{},goods:{},food:{},wood:0,water:0};
  if(rest>1e-9){bump(w.metrics.consumed,'hay',-rest);p.carried.goods.hay=rest;p.packet=undefined;p.phase='back';u.workReason='🐄 Pen feed store full; carrying the rest home';return true;}
  credit(g,p);dropProject(g,u,p);return true;}
 if(p.trapKind){const kind=p.trapKind;if(w.traps.length>=WILD_RULES.maxTraps){pauseWildWork(g,u);u.workReason='Trap capacity full; paid materials retained, no remote refund';return true;}
  w.traps.push({id:w.nextId++,team:p.team,kind,x:p.x??u.x,z:p.z??u.z,placedAt:g.state.time,uses:kind==='snare'?WILD_RULES.snareUses:1e6,catches:0,nextCheck:g.state.time+WILD_RULES.trapCheckSeconds,setBy:u.id});
  bump(w.metrics.consumed,'trapMaterials',Object.values(p.held.items).reduce((n,v)=>n+(v||0),0)+p.held.wood);p.held={items:{},goods:{},food:{},wood:0,water:0};
  w.metrics.completed++;dropProject(g,u,p);return true;}
 // outputs only from what was held: conversion, never creation
 for(const[k,n]of Object.entries(r.outGoods||{}))p.carried.goods[k as WildGood]=(p.carried.goods[k as WildGood]||0)+n!;
 for(const[k,n]of Object.entries(r.outItems||{}))p.carried.items[k as ItemKind]=(p.carried.items[k as ItemKind]||0)+n!;
 for(const[k,n]of Object.entries(r.outFood||{}))p.carried.food[k as FoodKind]=(p.carried.food[k as FoodKind]||0)+n!;
 for(const[k,n]of Object.entries(r.retain||{}))p.carried.items[k as ItemKind]=(p.carried.items[k as ItemKind]||0)+n!;
  p.held={items:{},goods:{},food:{},wood:0,water:0};p.packet=undefined;p.phase='back';u.workReason=`${r.icon} Carrying the result home`;
 return true;
}
function credit(g:Game,p:WildProject){
 const w=g.state.wildCraft!,t=g.tribe(p.team),stock=wildStock(g,p.team);t.items??={};
 for(const[k,n]of Object.entries(p.carried.goods)){stock[k as WildGood]=Math.min(WILD_RULES.maxGood,(stock[k as WildGood]||0)+n!);bump(w.metrics.produced,k,n!);}
 for(const[k,n]of Object.entries(p.carried.items)){t.items[k as ItemKind]=(t.items[k as ItemKind]||0)+n!;bump(w.metrics.produced,k,n!);}
 for(const[k,n]of Object.entries(p.carried.food)){if(n!>0){receiveFood(g,p.team,n!,k as FoodKind,'production');bump(w.metrics.produced,k,n!);}}
 p.carried={goods:{},items:{},food:{}};
 const pr=w.practice[String(p.team)]??={};pr[p.recipe]=(pr[p.recipe]||0)+1;w.metrics.completed++;
}

/** Follow a wound's blood trail point by point, then take the carcass through the ordinary hunting flow. */
function trackAI(g:Game,u:Unit,p:WildProject,dt:number){
 const w=g.state.wildCraft!,c=critter(g,p.critterId),wound=w.wounds[p.critterId!];
 const end=()=>{releaseWild(g,p);w.projects=w.projects.filter(q=>q!==p);delete u.wildWorkId;u.order='idle';g.workBoard.invalidateTasks();return true;};
 if(!c){return end();}
 if(c.hp<=0&&carcassAvailable(g,c)){releaseWild(g,p);w.projects=w.projects.filter(q=>q!==p);delete u.wildWorkId;u.order='gather';u.node=c as any;u.workReason='🩸 Found the kill';return true;}
 if(c.hp<=0)return end();
 const trail=wound?.trail||[];const i=p.trailIndex??0;
 if(i<trail.length){const pt=trail[i];if(near(u,pt.x,pt.z,2.2))p.trailIndex=i+1;else walkTo(g,u,pt.x,pt.z,dt,'🩸 Following the blood trail');return true;}
 p.trailWait=(p.trailWait||0)+dt;walkTo(g,u,c.x,c.z,dt,'🩸 Closing on the wounded animal');if(p.trailWait>20)return end();return true;
}

/** Kill a wild animal exactly as hunting does; used by bleed-out and traps. No meat beyond the species table. */
export function killWildAnimal(g:Game,c:Critter,team:number){
 if((c as HuntableCritter).carcass)return;c.hp=0;delete (c as any).huntDefense;
 (c as HuntableCritter).carcass={meat:CARCASS_MEAT[c.species],diedAt:g.state.time,...(animalProcessingEnabled(g,team)?{hides:1,bones:c.species==='boar'?3:2}:{})};
 c.vx=0;c.vz=0;c.wanderT=600;g.workBoard.reset();
}

/** Spoilage, bleeding, traps. Deterministic: no random numbers, only ids and time. */
export function tickWildCraft(g:Game,dt:number){
 const w=g.state.wildCraft;if(!w||dt<=0)return;for(const p of w.projects){const u=g.state.units.find(u=>u.id===p.actorId);if(u&&u.hp<=0&&!p.paused){p.packet??={x:u.x,z:u.z};pauseWildWork(g,u);}}
 if(!w.sites)w.sites=generateSites(g);else renewSites(g,w.sites,dt);
 // 1. ledger spoilage by weather at the camp: whole units rot when the accumulated expected loss reaches one, so counts stay integers and conserved
 for(const team of g.state.tribes){const stock=w.stock[String(team.id)];if(!stock)continue;const camp=g.campOf(team.id),rot=(w.rot??={})[String(team.id)]??={};
  for(const k of WILD_GOODS){const n=stock[k]||0;if(n<=0){delete rot[k];continue;}
   rot[k]=(rot[k]||0)+n*(1-Math.exp(-wildSpoilRate(g,k,camp.x,camp.z)*dt));
   while((rot[k]||0)>=1&&(stock[k]||0)>0){stock[k]!-=1;rot[k]!-=1;bump(w.metrics.spoiled,k,1);}
   if((stock[k]||0)<=0)delete stock[k];}}
 // 2. wounds: damaged live wildlife bleed, leaving a trail; bled-out animals become carcasses at the kill site
 for(const c of g.state.wildlife as HuntableCritter[]){
  if(c.species==='bird'||c.hp<=0){if(c.hp<=0&&w.wounds[c.id]&&!c.carcass)delete w.wounds[c.id];continue;}
  const wd=w.wounds[c.id];
  if(c.hp<c.maxHp&&!wd)w.wounds[c.id]={since:g.state.time,trail:[{x:c.x,z:c.z}],bleed:c.maxHp*WILD_RULES.bleedFractionPerSecond};
  const cur=w.wounds[c.id];if(!cur)continue;
  const last=cur.trail[cur.trail.length-1];if(!last||Math.hypot(c.x-last.x,c.z-last.z)>=WILD_RULES.trailStepMeters){cur.trail.push({x:c.x,z:c.z});if(cur.trail.length>WILD_RULES.maxTrail)cur.trail.shift();}
  c.hp=Math.max(0,c.hp-cur.bleed*dt);
  if(c.hp<=1e-6){killWildAnimal(g,c,0);w.metrics.bledOut++;}
 }
 for(const id of Object.keys(w.wounds)){const c=g.state.wildlife.find(c=>String(c.id)===id);if(!c)delete w.wounds[id];}
 // 2b. loaded racks dry on their own; the actor is free
 for(const p of [...w.projects]){if(p.phase!=='dry')continue;const b=g.state.buildings.find(b=>b.id===p.stationId&&b.hp>0);const r=WILD_RECIPES[p.recipe];
  if(!b){wasteHeld(g,p);releaseWild(g,p);w.projects=w.projects.filter(q=>q!==p);continue;}
  const res=advanceDrying(g,b,p.exposure!,dt,r.drying);
  if(res.lost){wasteHeld(g,p);releaseWild(g,p);w.projects=w.projects.filter(q=>q!==p);continue;}
  if(res.ready)p.phase='ready';}
 // 3. traps catch real wildlife passing within the trap's radius
 for(const trap of w.traps){
  if(g.state.time<trap.nextCheck||trap.uses<=0)continue;trap.nextCheck=g.state.time+WILD_RULES.trapCheckSeconds;
  const r=WILD_RULES.trapRadius[trap.kind];
  for(const c of g.state.wildlife){
   if(c.hp<=0||c.species==='bird')continue;if(trap.kind==='snare'?!snareCatches(c.species):SMALL.has(c.species))continue;
   if(Math.hypot(c.x-trap.x,c.z-trap.z)>r)continue;
   if(hash01(trap.id,c.id,Math.floor(g.state.time/WILD_RULES.trapCheckSeconds))>=(trap.kind==='snare'?.5:.7))continue;
   killWildAnimal(g,c,trap.team);(c as HuntableCritter).carcass!.diedAt=g.state.time;trap.catches++;trap.uses--;w.metrics.trapCatches++;
   if(trap.team===0)g.addFloater(trap.x,g.height(trap.x,trap.z)+1.5,trap.z,`${HUNT_METHOD_ICON[trap.kind]} caught ${c.species}`,'#efe4b0');break;
  }
 }
 w.traps=w.traps.filter(t=>t.uses>0);
 // 4. spoiled carcasses drop their unclaimed parts and wounds
 for(const id of Object.keys(w.parts)){const c=g.state.wildlife.find(c=>String(c.id)===id);if(!c||c.hp>0||!carcassAvailable(g,c)){bump(w.metrics.lost,'parts',Object.values(w.parts[id]).reduce((n,v)=>n+v,0));delete w.parts[id];}}
 for(const t of g.state.tribes)if(t.id===0)directWild(g,t.id);
}
function hash01(a:number,b:number,c:number){let n=Math.imul(a^0x9e3779b9,0x85ebca6b)^Math.imul(b+0x7f4a7c15,0xc2b2ae35)^Math.imul(c+0x165667b1,0x27d4eb2f);n=Math.imul(n^(n>>>15),0x2c1b3c6d);n^=n>>>12;return((n>>>0)%100000)/100000;}

/** A free adult carries a finished (dry) batch home from its rack. */
export function collectWildBatch(g:Game,unitId:number,projectId?:number):{accepted:boolean;reason:string}{
 const w=g.state.wildCraft,u=g.state.units.find(u=>u.id===unitId&&u.hp>0);if(!w||!u||!wildAdult(g,u)||u.wildWorkId!==undefined)return{accepted:false,reason:'Need a free adult without another paid duty or cargo'};
 const p=w.projects.find(p=>p.team===u.team&&(p.phase==='ready'&&p.actorId===0||p.paused&&g.state.units.some(old=>old.id===p.actorId&&old.hp<=0))&&(projectId===undefined||p.id===projectId));if(!p)return{accepted:false,reason:'Nothing ready or physically recoverable'};
 const old=g.state.units.find(old=>old.id===p.actorId),recover=!!old&&old.hp<=0;if(recover&&(!p.packet||!clearCargoApproach(g,u,p.packet)))return{accepted:false,reason:'Reach the same retained packet at its actual location'};
 const next={...p,actorId:u.id,paused:undefined,phase:recover?(p.phase==='fetch'?'go':p.phase==='work'?'go':p.phase):'collect'} as WildProject;
 if(!wildPreflight(g,next))return{accepted:false,reason:'Adult or workplace is already reserved'};releaseTreeWorker(g,u);if(!claimWild(g,next))return{accepted:false,reason:'Adult or workplace is already reserved'};g.interruptMission(u);if(old){delete old.wildWorkId;delete old.wildWorkPaused;}Object.assign(p,next);if(recover&&p.phase!=='go')p.packet=undefined;u.wildWorkId=p.id;delete u.wildWorkPaused;u.order='move';u.node=null;g.invalidateRoute(u);g.workBoard.invalidateTasks();return{accepted:true,reason:''};
}
/** Light director: when auto work is on, one idle adult with an obvious finished-station job takes it. Throttled, deterministic. */
function directWild(g:Game,team:number){
 const w=g.state.wildCraft!;if(g.state.autoWorkEnabled===false)return;
 if(w.lastDirector!==undefined&&g.state.time-w.lastDirector<5)return;w.lastDirector=g.state.time;
 // Preserve the existing food scheduler's next free hands and kitchen slots.
 // Already-paid/direct wild work is untouched; only new optional admissions wait.
 const lowFood=reserveSeconds(g,team)<CEREAL_RULES.foodTargetSeconds;
 if(team===0&&urgentReadyMealInputs(g))return;
 const idle=g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&u.order==='idle'&&u.wildWorkId===undefined&&wildAdult(g,u)&&u.carry<=0&&!u.productionProjectId&&!u.husbandryWork&&!u.expedition&&!u.shelterId&&!u.boat&&!u.prisoner).sort((a,b)=>a.id-b.id);
 if(!idle.length)return;
 const t=g.tribe(team),stock=wildStock(g,team);
 const order:WildRecipeId[]=lowFood?['renderFat','softenHide','frameDry','brainTan','barkTan','soakHide','twistSinew','dryBerries']:['softenHide','frameDry','brainTan','barkTan','soakHide','twistSinew','renderFat','dryBerries'];
 for(const id of order){const r=WILD_RECIPES[id];
  if(id==='soakHide'&&!((t.items?.cleanHide||0)>0))continue;
  if(id==='dryBerries'&&foodInventory(t).berries<12)continue; // keep the fresh reserve; only surplus is preserved
  if(id==='barkTan'&&(stock.brain||0)>0)continue;
  if(id==='frameDry'&&!(stock.tannedHide||0))continue;
  if(wildIssue(g,team,id))continue;
  const u=idle[0];if(beginWildWork(g,u.id,id).accepted)return;
 }
 if(collectWildBatch(g,idle[0].id).accepted)return;
 // dress parts from a gutted carcass near camp
 const camp=g.campOf(team);
 for(const c of g.state.wildlife as HuntableCritter[]){if(c.hp>0||Math.hypot(c.x-camp.x,c.z-camp.z)>60)continue;const pl=partsLeft(g,c);if(!pl||pl.fat+pl.sinew+pl.brain+pl.horn<=0)continue;if(w.projects.some(p=>p.critterId===c.id))continue;if(beginWildWork(g,idle[0].id,'dressParts',{critterId:c.id}).accepted)return;}
 // follow a blood trail of a wound this tribe made, when idle
 for(const[id,wd]of Object.entries(w.wounds)){const c=g.state.wildlife.find(c=>String(c.id)===id);if(!c||c.hp<=0||Math.hypot(c.x-camp.x,c.z-camp.z)>70)continue;if(w.projects.some(p=>String(p.critterId)===id))continue;if(wd.trail.length>=2&&beginWildWork(g,idle[0].id,'trackWounded',{critterId:c.id}).accepted)return;}
}

/** Icons-first activity and rot report. Short strings only; the HUD decides layout. */
export type WildFeedbackRow={icon:string;kind:'work'|'rot'|'trap'|'wound'|'stock';text:string;why?:string;unitId?:number;amount?:number};
export function wildCraftFeedback(g:Game,team:number):WildFeedbackRow[]{
 const w=g.state.wildCraft;if(!w)return [];const rows:WildFeedbackRow[]=[];
 for(const p of w.projects.filter(p=>p.team===team)){const u=g.state.units.find(u=>u.id===p.actorId&&u.team===team);const r=WILD_RECIPES[p.recipe];
  rows.push({icon:r.icon,kind:'work',text:`${p.paused?'paused':p.phase}${r.workSeconds?` ${Math.min(100,Math.floor(p.progress/r.workSeconds*100))}%`:''}`,why:r.name,...(u?{unitId:u.id}:{})});}
 for(const t of w.traps.filter(t=>t.team===team))rows.push({icon:HUNT_METHOD_ICON[t.kind],kind:'trap',text:`${t.catches} caught`,why:t.kind});
 for(const[id,wd]of Object.entries(w.wounds)){const c=g.state.wildlife.find(c=>String(c.id)===id);if(c&&c.hp>0&&(team!==0||g.visibleAt(c.x,c.z)))rows.push({icon:'🩸',kind:'wound',text:`${c.species} bleeding`,amount:wd.trail.length});}
 const stock=w.stock[String(team)]||{},camp=g.campOf(team);
 for(const k of WILD_GOODS){const n=stock[k]||0;if(n<=0)continue;const rate=wildSpoilRate(g,k,camp.x,camp.z);rows.push({icon:WILD_GOOD_ICON[k],kind:rate*600>.1?'rot':'stock',text:`${n.toFixed(1)}`,why:rate>0?`${Math.min(100,rate*600*100).toFixed(0)}% rots per 10 min`:'keeps',amount:n});}
 const food=foodInventory(g.tribe(team));
 if(food.berries>0)rows.push({icon:'🍇',kind:'rot',text:food.berries.toFixed(0),why:'berries rot fastest; dry or boil them'});
 return rows;
}

/** Strict save validation: finite, bounded, no unknown keys; absent = legacy (no wild-craft). */
export function validWildCraftState(s:{wildCraft?:unknown;units:Unit[]}&Partial<Omit<GameState,'wildCraft'|'units'>>):boolean{
 const v=s.wildCraft as WildCraftState|undefined;if(v===undefined)return s.units.every(u=>u.wildWorkId===undefined&&u.wildWorkPaused===undefined);
 const obj=(o:unknown):o is Record<string,unknown>=>!!o&&typeof o==='object'&&!Array.isArray(o),num=(n:unknown,max=1e12)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max,id=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0,ref=(n:unknown)=>id(n)&&(s.nextId===undefined||Number(n)<s.nextId),when=(n:unknown)=>num(n,s.time??1e12),team=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>=0&&Number(n)<64&&(!s.tribes||s.tribes.some(t=>t.id===n)),keys=(o:unknown,allowed:readonly string[])=>obj(o)&&Object.keys(o).every(k=>allowed.includes(k));
 const point=(o:unknown)=>obj(o)&&keys(o,['x','z'])&&['x','z'].every(k=>typeof o[k]==='number'&&Number.isFinite(o[k])&&Math.abs(o[k] as number)<=(s.worldOptions?.size??1040)/2);
 const stock=(o:unknown,allowed:readonly string[],caps?:Record<string,number>)=>obj(o)&&Object.entries(o).every(([k,n])=>allowed.includes(k)&&num(n,caps?caps[k]??0:WILD_RULES.maxGood));
 const goods=(o:unknown)=>stock(o,WILD_GOODS),items=(o:unknown,caps?:Record<string,number>)=>stock(o,ITEM_KINDS,caps),food=(o:unknown,caps?:Record<string,number>)=>stock(o,FOOD_KINDS,caps);
 if(!keys(v,['version','nextId','parts','wounds','traps','projects','stock','rot','practice','metrics','lastDirector','sites'])||v.version!==1||!id(v.nextId)||v.nextId>1e9||v.lastDirector!==undefined&&!when(v.lastDirector)||!validSites(v.sites,s.worldOptions?.size??1040))return false;
 const teams=(o:unknown,check:(o:unknown)=>boolean)=>obj(o)&&Object.keys(o).length<=64&&Object.entries(o).every(([k,n])=>String(Number(k))===k&&team(Number(k))&&check(n));
 if(!teams(v.stock,goods)||v.rot!==undefined&&!teams(v.rot,o=>goods(o)&&Object.values(o as GoodStock).every(n=>num(n,1))))return false;
 if(!obj(v.parts)||Object.keys(v.parts).length>10000)return false;
 for(const[k,p]of Object.entries(v.parts)){const c=s.wildlife?.find(c=>String(c.id)===k);if(!id(Number(k))||!keys(p,['fat','sinew','brain','horn'])||Object.keys(p).length!==4||s.wildlife&&(!c||c.hp>0||!c.carcass?.prepared))return false;for(const good of['fat','sinew','brain','horn']as const)if(!num(p[good],c?BUTCHERY_PARTS[c.species][good]:20))return false;}
 if(!obj(v.wounds)||Object.keys(v.wounds).length>10000)return false;for(const[k,w]of Object.entries(v.wounds)){if(!id(Number(k))||!keys(w,['since','trail','bleed'])||!when(w.since)||!num(w.bleed,1e4)||!Array.isArray(w.trail)||w.trail.length>WILD_RULES.maxTrail||!w.trail.every(point)||s.wildlife&&!s.wildlife.some(c=>String(c.id)===k))return false;}
 const ids=new Set<number>(),actors=new Set<number>();if(!Array.isArray(v.traps)||v.traps.length>WILD_RULES.maxTraps)return false;
 for(const t of v.traps){if(!keys(t,['id','team','kind','x','z','placedAt','uses','catches','nextCheck','setBy'])||!id(t.id)||t.id>=v.nextId||ids.has(t.id)||!team(t.team)||!['snare','pitfall'].includes(t.kind)||!point({x:t.x,z:t.z})||!when(t.placedAt)||!num(t.uses,t.kind==='snare'?WILD_RULES.snareUses:1e6)||!Number.isInteger(t.uses)||!num(t.catches,1e6)||!Number.isInteger(t.catches)||!num(t.nextCheck,(s.time??1e12)+WILD_RULES.trapCheckSeconds)||!ref(t.setBy))return false;ids.add(t.id);}
 if(!Array.isArray(v.projects)||v.projects.length>WILD_RULES.maxProjects)return false;
 for(const p of v.projects){if(!keys(p,['id','team','recipe','actorId','phase','progress','startedAt','stationId','critterId','x','z','trapKind','trailIndex','trailWait','held','carried','exposure','paused','cache','packet'])||!id(p.id)||p.id>=v.nextId||ids.has(p.id)||!Object.hasOwn(WILD_RECIPES,p.recipe)||!team(p.team)||!['fetch','go','work','dry','ready','collect','back'].includes(p.phase)||!when(p.startedAt)||p.paused!==undefined&&p.paused!==true)return false;ids.add(p.id);const r=WILD_RECIPES[p.recipe];if(!num(p.progress,r.workSeconds)||!Number.isInteger(p.actorId)||p.actorId<0)return false;
  const passive=['dry','ready'].includes(p.phase),u=s.units.find(u=>u.id===p.actorId);if(passive?p.actorId!==0||p.paused!==undefined:!u||u.team!==p.team||u.wildWorkId!==p.id||actors.has(u.id)||u.wildWorkPaused!==(p.paused&&!wildBodyPacket(p)?true:undefined))return false;if(u)actors.add(u.id);
  if(!keys(p.held,['items','goods','food','wood','water'])||!keys(p.carried,['items','goods','food'])||!items(p.held.items,r.items as Record<string,number>||{})||!stock(p.held.goods,WILD_GOODS,r.goods as Record<string,number>||{})||!food(p.held.food,r.foodIn as Record<string,number>||{})||!num(p.held.wood,r.wood||0)||!num(p.held.water,r.water||0)||!items(p.carried.items,{...r.outItems,...r.retain})||!food(p.carried.food,r.outFood as Record<string,number>||{}))return false;
  if(p.recipe==='dressParts'){const c=s.wildlife?.find(c=>c.id===p.critterId),caps=c?BUTCHERY_PARTS[c.species]:{fat:8,sinew:4,brain:1,horn:2};if(!stock(p.carried.goods,WILD_GOODS,caps)||Object.values(p.carried.goods).reduce((n,v)=>n+(v||0),0)>6)return false;}else if(!stock(p.carried.goods,WILD_GOODS,r.site?{[r.site]:SITE_RULES.draw[r.site]}:r.pen?{hay:SITE_RULES.fork}:r.outGoods as Record<string,number>||{}))return false;
  const carried=Object.values(p.carried.goods).some(n=>(n||0)>0)||Object.values(p.carried.items).some(n=>(n||0)>0)||Object.values(p.carried.food).some(n=>(n||0)>0);if(carried&&p.phase!=='back')return false;
  if(p.packet!==undefined&&!point(p.packet)||p.cache!==undefined&&(!keys(p.cache,['kind','id','x','z'])||!['camp','building'].includes(p.cache.kind)||!point({x:p.cache.x,z:p.cache.z})||p.cache.kind==='building'&&!ref(p.cache.id)||p.cache.kind==='camp'&&p.cache.id!==undefined)||p.phase==='fetch'&&!p.cache)return false;
  if(typeof r.station==='string'&&!['carcass','field','trail'].includes(r.station)){const b=s.buildings?.find(b=>b.id===p.stationId);if(!ref(p.stationId)||s.buildings&&(!b&&!p.paused||b&&(b.team!==p.team||b.type!==r.station||b.build<1)))return false;}else if(p.stationId!==undefined)return false;
  if(['carcass','trail'].includes(r.station)){if(!ref(p.critterId)||s.wildlife&&!s.wildlife.some(c=>c.id===p.critterId)&&!p.paused)return false;}else if(p.critterId!==undefined)return false;
  if(r.station==='field'&&(!point({x:p.x,z:p.z})||(p.recipe==='setSnare'||p.recipe==='digPitfall'?p.trapKind!==(p.recipe==='setSnare'?'snare':'pitfall'):p.trapKind!==undefined))||p.trailIndex!==undefined&&(!Number.isInteger(p.trailIndex)||!num(p.trailIndex,WILD_RULES.maxTrail))||p.trailWait!==undefined&&!num(p.trailWait,21))return false;
  if(r.drying?p.exposure===undefined||!validDryingExposure(p.exposure,r.drying):p.exposure!==undefined)return false;
 }
 if(s.units.some(u=>u.wildWorkId===undefined?u.wildWorkPaused!==undefined:!v.projects.some(p=>p.id===u.wildWorkId&&p.actorId===u.id)))return false;
 if(!teams(v.practice,o=>obj(o)&&Object.entries(o).every(([k,n])=>Object.hasOwn(WILD_RECIPES,k)&&Number.isInteger(n)&&num(n,1e9))))return false;
 const m=v.metrics;if(!keys(m,['produced','spoiled','lost','consumed','trapCatches','bledOut','completed'])||![m.trapCatches,m.bledOut,m.completed].every(n=>Number.isInteger(n)&&num(n,1e9)))return false;
 const metricKeys=[...WILD_GOODS,...ITEM_KINDS,...FOOD_KINDS,'parts','trapMaterials'];return ['produced','spoiled','lost','consumed'].every(k=>stock(m[k as keyof WildMetrics],metricKeys));
}

export function wildOrderIssue(g:Game,u:Unit){const p=g.state.wildCraft?.projects.find(p=>p.id===u.wildWorkId&&p.actorId===u.id);return p&&!p.packet&&(Object.values(p.held.items).some(n=>(n||0)>0)||Object.values(p.held.goods).some(n=>(n||0)>0)||Object.values(p.held.food).some(n=>(n||0)>0)||p.held.wood>0||p.held.water>0||Object.values(p.carried.goods).some(n=>(n||0)>0)||Object.values(p.carried.items).some(n=>(n||0)>0)||Object.values(p.carried.food).some(n=>(n||0)>0))?'This resident carries a real wild-craft packet; resume and return it before other work. Move orders remain available.':null;}
