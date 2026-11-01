import {rivalTradeReserve} from './rivalTrade';
import {knownRivalExportDemand} from './tradeIntel';
import {hasTaskCommitment} from './workCommitments';
import {releaseTreeWorker} from './workAllocation';
import {SURVIVAL_RULES,ambientTemperature} from './survivalNeeds';
import {COASTAL_BOOTSTRAP_RULES,coastalMaterialTarget,knownCoastalLaunchSites,recordCoastalReview} from './coastalStrategy';
import {planExpansion} from './plotExpansion';
import {expansionCost,plotArea} from './plots';
import {assignWoodlandPlanting} from './cultivation';
import {connectedForUnit} from './waterTravel';
import {resumeWeaponWork} from './warfare';
import {beginPackTaming} from './packAnimals';
import {HAULAGE,beginHaulageWork,resumeHaulageWork} from "./haulage";
import {FARM_TOOLS,beginFarmToolWork,resumeFarmToolWork} from "./farmTools";
import {buildingCost} from "./construction";
import {isRivalTeam} from "./factions";
import {missingAgeBuildings,AGE_FOOD_BUFFER_SECONDS} from './advancement';
import type { Game } from './sim';
import type { BldType, ResKind, Unit, Building } from './types';
import { AGE_COST, BUILDINGS, GATHER, LUMBER_R, QUARRY_R } from './constants';
import { isDependent, reserveSeconds, foodDemand, farmHarvestEstimate, YEAR_SECONDS } from './settlement';

export const RIVAL_RESOURCE_RANGE=320;
/** Keep a full harvest cycle plus losses; half-year storage silently capped growth. */
export function rivalStorageTarget(g:Game,team:number){
  return Math.ceil([0,1,2,3].reduce((sum,phase)=>sum+foodDemand(g,team,phase)*YEAR_SECONDS/4,0)*1.3+100);
}

/** Local familiarity plus actual scouting records; never inspect unknown distant nodes. */
export function rivalKnows(g:Game,team:number,x:number,z:number){
  if(g.state.units.some(u=>u.team===team&&u.hp>0&&Math.hypot(u.x-x,u.z-z)<26))return true;
  if(g.state.buildings.some(b=>b.team===team&&['townhall','cornerstone','lumber','quarry'].includes(b.type)&&Math.hypot(b.x-x,b.z-z)<55&&g.finished(b)))return true;
  const cx=Math.floor((x+(g.world.size/2))/g.world.size*32),cz=Math.floor((z+(g.world.size/2))/g.world.size*32);
  return cx>=0&&cx<32&&cz>=0&&cz<32&&!!g.state.rivalKnowledge?.find(m=>m.team===team)?.cells.includes(cz*32+cx);
}

export function rivalWorkRange(g:Game,team:number,x:number,z:number,kind:ResKind){
  // Timber does not require a camp. A known nearby forest can fund the next
  // outpost even when the last local tree was cut and the treasury is empty.
  const home=g.campOf(team);
  // Small camps can subsist and rebuild before any resource institution exists.
  if(Math.hypot(x-home.x,z-home.z)<=70&&rivalKnows(g,team,x,z))return true;
  if(['wood','copper','iron'].includes(kind)&&Math.hypot(x-home.x,z-home.z)<=RIVAL_RESOURCE_RANGE&&rivalKnows(g,team,x,z))return true;
  return g.state.buildings.some(b=>b.team===team&&
    (['townhall','cornerstone'].includes(b.type)&&Math.hypot(b.x-x,b.z-z)<70||
      kind==='wood'&&b.type==='lumber'&&Math.hypot(b.x-x,b.z-z)<=LUMBER_R||
      kind==='stone'&&b.type==='quarry'&&Math.hypot(b.x-x,b.z-z)<=QUARRY_R)&&g.finished(b));
}

/** A snapshot for one synchronous work-board assignment only. Membership and
 * knowledge are rebuilt for the next resident, so diplomacy, completed sites,
 * deaths and discoveries never wait for a cross-frame cache to expire. */
export function rivalWorkRangeContext(g:Game,team:number){
  const home=g.campOf(team),half=g.world.size/2;
  const residents=g.state.units.filter(u=>u.team===team&&u.hp>0);
  const sites=g.state.buildings.filter(b=>b.team===team&&
    ['townhall','cornerstone','lumber','quarry'].includes(b.type)&&g.finished(b));
  const knownCells=new Set(g.state.rivalKnowledge?.find(m=>m.team===team)?.cells||[]);
  const knows=(x:number,z:number)=>{
    if(residents.some(u=>Math.hypot(u.x-x,u.z-z)<26))return true;
    if(sites.some(b=>Math.hypot(b.x-x,b.z-z)<55))return true;
    const cx=Math.floor((x+half)/g.world.size*32),cz=Math.floor((z+half)/g.world.size*32);
    return cx>=0&&cx<32&&cz>=0&&cz<32&&knownCells.has(cz*32+cx);
  };
  return (x:number,z:number,kind:ResKind)=>{
    const distance=Math.hypot(x-home.x,z-home.z);
    if(distance<=70&&knows(x,z))return true;
    if(['wood','copper','iron'].includes(kind)&&distance<=RIVAL_RESOURCE_RANGE&&knows(x,z))return true;
    return sites.some(b=>
      ['townhall','cornerstone'].includes(b.type)&&Math.hypot(b.x-x,b.z-z)<70||
      kind==='wood'&&b.type==='lumber'&&Math.hypot(b.x-x,b.z-z)<=LUMBER_R||
      kind==='stone'&&b.type==='quarry'&&Math.hypot(b.x-x,b.z-z)<=QUARRY_R);
  };
}

export function rivalDevelopmentPlan(g:Game,team:number){
  const t=g.tribe(team),next=AGE_COST[t.age+1];
  const count=(type:BldType)=>g.state.buildings.filter(b=>b.team===team&&b.hp>0&&b.type===type).length;
  const fields=count('farm'),stores=count('warehouse'),pop=g.popNow(team);
  const standing=g.state.buildings.filter(b=>b.team===team&&b.hp>0&&b.type==='farm');
  const averageYield=standing.length?standing.reduce((sum,b)=>sum+farmHarvestEstimate(g,b,1,1,1),0)/standing.length:180;
  // Fund fields for all seasons and storage losses, using this biome's actual
  // output rather than assuming every farm produces the same 200 food.
  const annualNeed=[0,1,2,3].reduce((sum,phase)=>sum+foodDemand(g,team,phase)*YEAR_SECONDS/4,0)*1.3;
  const foodFields=Math.max(3,Math.ceil(annualNeed/Math.max(70,averageYield)));
  return {next,fields,stores,pop,foodFields,saving:!!next&&pop>=5&&fields>=2&&stores>=1&&reserveSeconds(g,team)>240};
}

/** Ordinary expansion may spend a surplus, not repeatedly consume the same age reserve.
 * Necessary shelter, food infrastructure and resource access still take precedence. */
export function rivalCanInvest(g:Game,team:number,type:BldType){
  const t=g.tribe(team),d=BUILDINGS[type],p=rivalDevelopmentPlan(g,team);
  if(!g.canAfford(team,buildingCost(type,g,team)))return false;
  const pending=g.state.buildings.filter(b=>b.team===team&&b.hp>0&&(!g.finished(b)||b.expansion));
  if(pending.length>=2||pending.some(b=>b.type===type))return false;
  if(type==='lumber'||type==='quarry'||type==='cornerstone'||missingAgeBuildings(g,team).includes(type))return true;
  // Shelter grows ahead of actual households, not all the way to the next era's population.
  if(type==='hut')return g.popCap(team)<p.pop+3;
  if(type==='farm'&&(p.fields<p.foodFields||reserveSeconds(g,team)<300&&p.fields<Math.ceil(p.pop/2)))return true;
  if(type==='warehouse'){
    const capacity=g.stockCap(team)+pending.filter(b=>b.type==='warehouse').length*200;
    const essential=Math.max(p.next?.food||0,foodDemand(g,team)*AGE_FOOD_BUFFER_SECONDS)+40;
    if(p.stores<2||capacity<essential)return true;
    // Annual storage is a useful target, not an emergency that may consume
    // every timber delivery forever as new families arrive. Once the community
    // has the people and safe food buffer for its next age, save that timber.
    if(capacity<rivalStorageTarget(g,team)&&(!p.saving||!p.next||p.pop<(p.next.pop||0)))return true;
  }
  // Leave enough for a timber camp or stone quarry before luxury expansion.
  if(!p.saving||!p.next)return t.wood-(d.wood||0)>=BUILDINGS.lumber.wood+BUILDINGS.quarry.wood;
  return (['wood','stone','copper','iron'] as ResKind[]).every(k=>t[k]-(d[k]||0)>=(p.next![k]||0));
}

export const RIVAL_MATERIAL_RULES={deliveryBufferLoads:1,coldFuelReserveSeconds:450,reviewSeconds:12,maximumReassignmentsPerReview:2} as const;
export type RivalMaterialKind='wood'|'stone'|'copper'|'iron';
export type RivalMaterialTargets=Record<RivalMaterialKind,number>;
/** Stocks already paid into a foundation/project are not demanded a second
 * time. These are finite working needs, not a quota to erase existing wealth. */
export function rivalMaterialReserves(g:Game,team:number):RivalMaterialTargets{
 const t=g.tribe(team),next=AGE_COST[t.age+1],planned:RivalMaterialTargets={wood:0,stone:0,copper:0,iron:0};
 for(const b of g.state.buildings){if(b.team!==team||b.hp<=0||b.planPaused)continue;
  for(const k of ['wood','stone','copper','iron'] as const)planned[k]+=b.plannedCost?.[k]||0;
  if(b.expansion&&!b.expansion.paid)planned.wood+=expansionCost(b,b.expansion).wood||0;
 }
 const cold=g.state.survivalVersion===1&&ambientTemperature(g)<SURVIVAL_RULES.coldThresholdCelsius,residents=cold?g.state.units.filter(u=>u.team===team&&u.hp>0&&!u.expedition&&!u.visit).length:0;
 const fuel=residents*SURVIVAL_RULES.woodPerPersonColdSecond*RIVAL_MATERIAL_RULES.coldFuelReserveSeconds;
 const working:RivalMaterialTargets={wood:BUILDINGS.lumber.wood+BUILDINGS.quarry.wood,stone:HAULAGE.canoe.stone+FARM_TOOLS.stoneHoe.stone,copper:FARM_TOOLS.copperTools.copper,iron:FARM_TOOLS.ironTools.iron};
 const targets={} as RivalMaterialTargets;
 for(const k of ['wood','stone','copper','iron'] as const){if(k==='copper'&&t.age<1||k==='iron'&&t.age<2){targets[k]=0;continue;}
  targets[k]=Math.ceil(Math.max(working[k],next?.[k]||0)+planned[k]+(k==='wood'?fuel:0));
 }
 return targets;
}

/** Does not consult exports or partner reports: callers may safely use this
 * own reserve while evaluating a physically returned trade report. */
export function rivalMaterialReserve(g:Game,team:number,kind:RivalMaterialKind){return rivalMaterialReserves(g,team)[kind];}
export function rivalMaterialTargets(g:Game,team:number):RivalMaterialTargets{
 const reserves=rivalMaterialReserves(g,team),next=AGE_COST[g.tribe(team).age+1],ownReserves={...reserves,food:rivalTradeReserve(g,team,'food')};
 const working:RivalMaterialTargets={wood:BUILDINGS.lumber.wood+BUILDINGS.quarry.wood,stone:HAULAGE.canoe.stone+FARM_TOOLS.stoneHoe.stone,copper:FARM_TOOLS.copperTools.copper,iron:FARM_TOOLS.ironTools.iron};
 for(const k of ['wood','stone','copper','iron'] as const){if(reserves[k]===0)continue;const unpaidCoast=Math.max(0,coastalMaterialTarget(g,team,k)-Math.max(working[k],next?.[k]||0));reserves[k]+=Math.max(unpaidCoast,knownRivalExportDemand(g,team,k,ownReserves))+GATHER[k].carry*RIVAL_MATERIAL_RULES.deliveryBufferLoads;}
 return reserves;
}

/** A bounded share of the workforce secures missing materials while others grow food. */
export function rivalMaterialPriority(g:Game,u:Unit,kind:ResKind,targets?:RivalMaterialTargets){
  if(!isRivalTeam(u.team)||kind==='food'||reserveSeconds(g,u.team)<360)return 0;
  const t=g.tribe(u.team),target=(targets||rivalMaterialTargets(g,u.team))[kind as RivalMaterialKind];
  if(!target||t[kind]>=target||kind==='copper'&&t.age<1||kind==='iron'&&t.age<2)return 0;
  const workers=g.state.units.filter(v=>v.team===u.team&&v.hp>0&&v.type==='worker'&&!isDependent(g,v));
  const already=workers.filter(v=>v!==u&&v.order==='gather'&&v.job===kind).length;
  const materialCrew=workers.filter(v=>v!==u&&v.order==='gather'&&v.job&&v.job!=='food').length;
  if(already>=Math.max(1,Math.floor(workers.length/4))||materialCrew>=Math.max(1,Math.floor(workers.length/3)))return 0;
  return kind==='wood'?250:240;
}

const visits=new WeakMap<Game,Map<number,number>>();
/** Place actual paid, reachable workplaces near discovered materials. Builders and
 * carriers use existing simulation orders; there is no remote income or auto-completion. */
export function developRivalResources(g:Game,team:number){
  if(!isRivalTeam(team)||reserveSeconds(g,team)<300)return false;
  let timers=visits.get(g);if(!timers){timers=new Map();visits.set(g,timers);}
  const due=timers.get(team)||0;
  if(due>g.state.time&&due<=g.state.time+25)return false;
  timers.set(team,g.state.time+25);
  const home=g.campOf(team),t=g.tribe(team),next=AGE_COST[t.age+1];
  // A hall center is occupied by its building. Survey access from real residents,
  // otherwise an enclosed center falsely makes every forest unreachable.
  const residents=g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u))
    .sort((a,b)=>Math.hypot(a.x-home.x,a.z-home.z)-Math.hypot(b.x-home.x,b.z-home.z));
  // A coastal resident can reach a different shore even when the nearest walkers cannot.
  const surveyors=residents.filter((u,i)=>i<3||u.haulage==='canoe');
  const known=(x:number,z:number)=>Math.hypot(x-home.x,z-home.z)<RIVAL_RESOURCE_RANGE&&rivalKnows(g,team,x,z)&&surveyors.some(u=>connectedForUnit(g,u,x,z));
  const timberCamps=g.state.buildings.filter(b=>b.team===team&&b.type==='lumber'&&g.finished(b));
  const localWood=g.state.trees.filter(n=>n.amount>0&&(Math.hypot(n.x-home.x,n.z-home.z)<70||timberCamps.some(b=>Math.hypot(b.x-n.x,b.z-n.z)<=LUMBER_R))).reduce((n,p)=>n+p.amount,0);
  const types:('lumber'|'quarry')[]=localWood<Math.max(100,(next?.wood||150)-t.wood)?['lumber','quarry']:['quarry','lumber'];
  for(const type of types){
    if(!rivalCanInvest(g,team,type))continue;
    if(type==='lumber'&&(t.wood>=Math.max(100,next?.wood||0)+50||localWood>=Math.max(100,(next?.wood||150)-t.wood)))continue;
    if(type==='quarry'&&t.stone>=Math.max(60,next?.stone||0))continue;
    const existing=g.state.buildings.filter(b=>b.team===team&&b.hp>0&&b.type===type);
    if(existing.some(b=>!g.finished(b)))continue;
    if(type==='quarry'&&existing.some(b=>b.excavation?(b.excavation.remaining>0):g.height(b.x,b.z)>=10||g.state.stones.some(n=>n.amount>0&&Math.hypot(n.x-b.x,n.z-b.z)<=QUARRY_R)))continue;
    const nodes=(type==='lumber'?g.state.trees:g.state.stones).filter(n=>n.amount>5&&known(n.x,n.z)&&
      !existing.some(b=>Math.hypot(b.x-n.x,b.z-n.z)<(type==='lumber'?LUMBER_R:QUARRY_R)))
      .sort((a,b)=>Math.hypot(a.x-home.x,a.z-home.z)-Math.hypot(b.x-home.x,b.z-home.z));
    const sites=nodes.slice(0,14).map(n=>({x:n.x,z:n.z}));
    // A known exposed mountainside is also a valid finite stone seam.
    if(type==='quarry')for(let r=30;r<=150;r+=30)
      for(let i=0;i<16;i++){const a=i*Math.PI/8,x=home.x+Math.cos(a)*r,z=home.z+Math.sin(a)*r;if(g.height(x,z)>=10&&known(x,z))sites.push({x,z});}
    // Prefer a substantial known stand/seam to repeatedly paying for tiny
    // scattered outcrops; distance remains part of that economic decision.
    const source=type==='lumber'?g.state.trees:g.state.stones;
    const resourceScore=(site:{x:number;z:number})=>
      (type==='quarry'&&g.height(site.x,site.z)>=10?320:source.filter(n=>n.amount>0&&Math.hypot(n.x-site.x,n.z-site.z)<(type==='lumber'?LUMBER_R:QUARRY_R)&&rivalKnows(g,team,n.x,n.z)).reduce((sum,n)=>sum+n.amount,0))-
      Math.hypot(site.x-home.x,site.z-home.z)*.8;
    const orderedSites=sites.map(site=>({...site,score:resourceScore(site)})).sort((a,b)=>b.score-a.score);
    for(const node of orderedSites){
      const site=g.findDryFoundation(type,node.x,node.z,14,(x,z)=>g.placementValid(type,x,z,team)&&known(x,z)&&
        !g.state.units.some(e=>e.hp>0&&g.isFoe(team,e.team)&&Math.hypot(e.x-x,e.z-z)<20));
      if(site&&g.placeBuilding(type,site.x,site.z,team))return true;
    }
  }
  // A distant established timber camp can justify a paid local unloading point.
  if(t.wood>=BUILDINGS.cornerstone.wood+24&&rivalCanInvest(g,team,'cornerstone')){
    for(const camp of g.state.buildings.filter(b=>b.team===team&&b.type==='lumber'&&g.finished(b))){
      if(Math.hypot(camp.x-home.x,camp.z-home.z)<85||g.state.buildings.some(b=>b.team===team&&b.hp>0&&['townhall','cornerstone','warehouse'].includes(b.type)&&Math.hypot(b.x-camp.x,b.z-camp.z)<45))continue;
      if(g.state.trees.filter(n=>n.amount>0&&Math.hypot(n.x-camp.x,n.z-camp.z)<30).reduce((sum,n)=>sum+n.amount,0)<100)continue;
      const site=g.findDryFoundation('cornerstone',camp.x,camp.z,18,(x,z)=>g.placementValid('cornerstone',x,z,team)&&known(x,z));
      if(site&&g.placeBuilding('cornerstone',site.x,site.z,team))return true;
    }
  }
  return false;
}

/** Progression prerequisites consume real stock and builder time too. */
export function developRivalInstitutions(g:Game,team:number){
  if(!isRivalTeam(team)||reserveSeconds(g,team)<600)return false;
  const t=g.tribe(team),home=g.campOf(team);
  const type=missingAgeBuildings(g,team).find(type=>BUILDINGS[type].age<=t.age&&rivalCanInvest(g,team,type));
  if(!type)return false;
  const site=g.findOpenSpot(home.x,home.z,type,team);
  return !!site&&!!g.placeBuilding(type,site.x,site.z,team);
}

const laborReviews=new WeakMap<Game,Map<number,number>>();
/** Surplus food must release some labor for growth; persistent food orders
 * otherwise occupy the whole workforce even when a material shortage blocks it. */
export function rebalanceRivalLabor(g:Game,team:number){
  if(!isRivalTeam(team))return;
  let reviews=laborReviews.get(g);if(!reviews){reviews=new Map();laborReviews.set(g,reviews);}
  const due=reviews.get(team)||0;if(due>g.state.time&&due<=g.state.time+RIVAL_MATERIAL_RULES.reviewSeconds)return;
  reviews.set(team,g.state.time+RIVAL_MATERIAL_RULES.reviewSeconds);
  const adults=g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u));
  const foodWorkers=adults.filter(u=>['gather','idle'].includes(u.order)&&u.job==='food');
  const reserves=reserveSeconds(g,team);
  const foodEmergency=reserves<300&&foodWorkers.length<Math.ceil(adults.length*.65);
  const spare=reserves>=600?Math.max(0,Math.min(2,foodWorkers.length-Math.ceil(adults.length/2))):0;
  const t=g.tribe(team),targets=rivalMaterialTargets(g,team);
  const surplusWorkers=adults.filter(u=>u.order==='gather'&&u.job&&u.job!=='food'&&(foodEmergency||t[u.job]>=targets[u.job]));
  const eligible=[...surplusWorkers,...(spare>0?foodWorkers:[])].filter(u=>!hasTaskCommitment(u)&&!u.militia&&!u.prisoner&&!u.resting&&!u.societyMissionId&&!u.coastalVoyageId&&!u.coastalCommissionId&&!u.jobLock&&!u.plantingWork&&!u.copperStudy&&!u.buildOrder&&!u.tamingWork&&!u.husbandryWork&&!u.tributeJourney&&Object.values(u.itemCargo||{}).every(n=>!n)&&!u.emergency&&!u.envoy&&!u.scout&&!u.visit&&!u.expedition&&
    !u.foundingJourney&&!u.weaponWork&&!u.farmToolWork&&!u.haulageWork&&!u.studyCrop&&u.drill==null);
  let moved=0;
  for(const u of eligible){
    if(moved>=RIVAL_MATERIAL_RULES.maximumReassignmentsPerReview)break;
    if(!surplusWorkers.includes(u)&&moved>=spare)continue;
    if(u.carry>0){if(surplusWorkers.includes(u)){releaseTreeWorker(g,u);u.node=null;u.order='return';u.workReason='Working stock ready — delivering the real carried surplus';moved++;}continue;}
    const materials=(['wood','stone','copper','iron'] as ResKind[]).some(k=>rivalMaterialPriority(g,u,k,targets)>0);
    const unfinished=g.state.buildings.some(b=>b.team===team&&b.hp>0&&(!g.finished(b)||b.expansion)&&!b.plannedCost);
    if(!materials&&!unfinished&&!surplusWorkers.includes(u))continue;
    releaseTreeWorker(g,u);u.node=null;u.job=null;u.gatherT=0;u.jobLock=false;u.order='idle';u.workCheckAt=0;
    g.workBoard.reset();g.workBoard.assign(g,u);moved++;
  }
}


/** Prosperous rivals improve actual residents, not faction-wide production multipliers. */
export function developRivalEquipment(g:Game,team:number){
 if(!isRivalTeam(team)||reserveSeconds(g,team)<600)return false;
 const adults=g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)&&!u.militia&&!u.prisoner);
 if(adults.length<COASTAL_BOOTSTRAP_RULES.minimumWorkingAdults||adults.some(u=>u.weaponWork&&!u.weaponWork.paused||u.haulageWork&&!u.haulageWork.paused||u.farmToolWork&&!u.farmToolWork.paused||u.tamingWork&&!u.tamingWork.paused||u.husbandryWork&&!u.husbandryWork.paused))return false;
 const eligible=adults.filter(u=>!u.societyMissionId&&!u.coastalVoyageId&&!u.coastalCommissionId&&!u.jobLock&&!u.plantingWork&&!u.copperStudy&&!u.buildOrder&&!u.tributeJourney&&!u.emergency&&!u.recalled&&!u.envoy&&!u.trade&&!u.visit&&!u.scout&&!u.expedition&&!u.foundingJourney&&!u.studyCrop&&u.drill==null&&u.carry===0&&['idle','gather'].includes(u.order));
 // Resume paid projects before reserving any new materials.
 for(const u of eligible){
  if(u.weaponWork?.paused&&resumeWeaponWork(g,u))return true;
  if(u.haulageWork?.paused&&resumeHaulageWork(g,u))return true;
  if(u.farmToolWork?.paused&&resumeFarmToolWork(g,u))return true;
 }
 const t=g.tribe(team),plan=rivalDevelopmentPlan(g,team);
 const dock=g.state.buildings.find(b=>b.team===team&&b.type==='dock'&&g.finished(b));
 if(dock&&!adults.some(u=>u.haulage==='canoe')&&t.wood>=HAULAGE.canoe.wood+COASTAL_BOOTSTRAP_RULES.minimumWorkingWoodAfterCanoe&&t.stone>=HAULAGE.canoe.stone){
  for(const u of eligible.filter(u=>!u.haulage))if(beginHaulageWork(g,'canoe',team,dock.id,u.id)){recordCoastalReview(g,team,'scout-canoe-paid');return true;}
 }
 if(adults.length<8)return false;
 const affordable=(cost:{wood:number;stone:number;copper?:number;iron?:number})=>(['wood','stone','copper','iron'] as const).every(k=>
  t[k]-(cost[k]||0)>=(plan.saving?(plan.next?.[k]||0):k==='wood'?40:k==='stone'?6:0));
 const fields=g.state.buildings.filter(b=>b.team===team&&b.type==='farm'&&g.finished(b)).length;
 const toolTarget=Math.min(fields,Math.max(1,Math.floor(adults.length/3)));
 for(const kind of ['ironTools','copperTools','stoneHoe'] as const){
  const spec=FARM_TOOLS[kind];if(t.age<spec.age||!affordable(spec))continue;
  if(adults.filter(u=>u.farmTool&&FARM_TOOLS[u.farmTool].cultivation>=spec.cultivation).length>=toolTarget)continue;
  const farmers=[...eligible].sort((a,b)=>Number(b.job==='food')-Number(a.job==='food'));
  for(const u of farmers)if(beginFarmToolWork(g,kind,team,undefined,u.id))return true;
 }
 const transportTarget=Math.max(1,Math.floor(adults.length/4));
 // A discovered goat is a real alternative to manufactured hauling equipment.
 // Keep the same treasury reserve and only one resident away from production.
 if(adults.filter(u=>!!u.haulage).length<transportTarget&&affordable({wood:2,stone:0})){
  const hearth=g.state.buildings.find(b=>b.team===team&&g.finished(b)&&['townhall','workshop'].includes(b.type));
  if(hearth)for(const u of eligible)if(beginPackTaming(g,hearth.id,team,u.id))return true;
 }
 for(const kind of ['canoe','cart','sled'] as const){
  const funded=kind==='canoe'?t.wood>=HAULAGE.canoe.wood+16&&t.stone>=HAULAGE.canoe.stone:affordable(HAULAGE[kind]);
  if(!funded||adults.filter(u=>kind==='canoe'?u.haulage==='canoe':kind==='cart'?u.haulage==='cart':!!u.haulage).length>=(kind==='canoe'?1:transportTarget))continue;
  const haulers=[...eligible].sort((a,b)=>Number(b.job==='wood'||b.job==='stone')-Number(a.job==='wood'||a.job==='stone'));
  for(const u of haulers)if(beginHaulageWork(g,kind,team,undefined,u.id))return true;
 }
 return false;
}


const coastalReviews=new WeakMap<Game,Map<number,number>>();
/** Fund a reachable local landing and its first boat before inland timber runs out. */
export function developRivalCoast(g:Game,team:number,observedPartnerDock?:{x:number;z:number;team:number;alternatives?:{x:number;z:number}[]}){
 if(!isRivalTeam(team)||!g.tribe(team).alive)return false;
 let reviews=coastalReviews.get(g);if(!reviews){reviews=new Map();coastalReviews.set(g,reviews);}
 const due=reviews.get(team)||0;if(due>g.state.time&&due<=g.state.time+45)return false;reviews.set(team,g.state.time+45);
 const adults=g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)&&!u.militia&&!u.prisoner);
 if(adults.length<COASTAL_BOOTSTRAP_RULES.minimumWorkingAdults){recordCoastalReview(g,team,'coast','Retain four working adults while one builds or explores');return false;}
 if(reserveSeconds(g,team)<COASTAL_BOOTSTRAP_RULES.homeMealSeconds){recordCoastalReview(g,team,'coast','Home meals below the coastal investment buffer');return false;}
 const docks=g.state.buildings.filter(b=>b.team===team&&b.hp>0&&b.type==='dock');
 if(docks.length&&(!observedPartnerDock||docks.length>=COASTAL_BOOTSTRAP_RULES.maximumDocks))return false;
 if(observedPartnerDock&&(!rivalKnows(g,team,observedPartnerDock.x,observedPartnerDock.z)||g.isFoe(team,observedPartnerDock.team)))return false;
 const t=g.tribe(team),cost=buildingCost('dock',g,team);
 if(t.wood<(cost.wood||0)+HAULAGE.canoe.wood+16||t.stone<HAULAGE.canoe.stone||!g.canAfford(team,cost)){recordCoastalReview(g,team,'coast','Collect the real dock and scout canoe costs while keeping working timber');return false;}
 if(g.state.buildings.filter(b=>b.team===team&&b.hp>0&&(!g.finished(b)||b.expansion)).length>=2){recordCoastalReview(g,team,'coast','Existing paid construction needs its builders first');return false;}
 const known=rivalWorkRangeContext(g,team),best=knownCoastalLaunchSites(g,team,(x,z)=>known(x,z,'wood'),observedPartnerDock)[0];
 if(!best){recordCoastalReview(g,team,'coast','No observed reachable gentle launch shore for this water route');return false;}
 const built=!!g.placeBuilding('dock',best.x,best.z,team);recordCoastalReview(g,team,built?'dock-paid':'coast',built?'':'The actual dock construction command was blocked');return built;
}


const forestryReviews=new WeakMap<Game,Map<number,number>>();
/** Reuse physical seed-funded planting; standing timber still needs to grow,
 * be felled, carried and deposited by actual residents. */
export function developRivalForestry(g:Game,team:number){
 if(!isRivalTeam(team)||!g.tribe(team).alive||reserveSeconds(g,team)<600)return false;
 const t=g.tribe(team);
 if((t.seeds||0)<=4||t.wood>=Math.max(100,AGE_COST[t.age+1]?.wood||0))return false;
 let timers=forestryReviews.get(g);if(!timers){timers=new Map();forestryReviews.set(g,timers);}
 const due=timers.get(team)||0;if(due>g.state.time&&due<=g.state.time+60)return false;
 timers.set(team,g.state.time+60);
 for(const b of g.state.buildings)if(b.team===team&&g.finished(b)&&['townhall','lumber'].includes(b.type)&&assignWoodlandPlanting(g,b.id,team,4,(x,z)=>rivalKnows(g,team,x,z))>0)return true;
 return false;
}

const plotReviews=new WeakMap<Game,Map<number,number>>();
/** Prefer extending an existing productive plot when there is safe clear ground.
 * It uses the same pending footprint, materials and builder labor as player work. */
export function developRivalPlots(g:Game,team:number){
 if(!isRivalTeam(team)||reserveSeconds(g,team)<600||g.state.buildings.some(b=>b.team===team&&b.hp>0&&b.expansion))return false;
 let reviews=plotReviews.get(g);if(!reviews){reviews=new Map();plotReviews.set(g,reviews);}
 const due=reviews.get(team)||0;if(due>g.state.time&&due<=g.state.time+30)return false;
 reviews.set(team,g.state.time+30);
 const p=rivalDevelopmentPlan(g,team),t=g.tribe(team);
 const type=g.stockCap(team)<rivalStorageTarget(g,team)?'warehouse':p.fields<p.foodFields?'farm':null;
 if(!type||!rivalCanInvest(g,team,type))return false;
 const plots=g.state.buildings.filter(b=>b.team===team&&b.type===type&&g.finished(b)).sort((a,b)=>plotArea(a)-plotArea(b));
 for(const b of plots)for(const axis of (b.w/BUILDINGS[type].w<=b.d/BUILDINGS[type].d?['w','d'] as const:['d','w'] as const)){
  const size={w:b.w,d:b.d};size[axis]+=BUILDINGS[type][axis];
  const cost=expansionCost(b,size);
  if(!g.canAfford(team,cost)||type==='farm'&&(t.seeds||0)-(cost.seeds||0)<4)continue;
  if(planExpansion(g,b,axis,team))return true;
 }
 return false;
}
