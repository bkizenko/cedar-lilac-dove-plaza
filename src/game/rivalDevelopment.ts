import {resumeWeaponWork} from './warfare';
import {beginPackTaming} from './packAnimals';
import {HAULAGE,beginHaulageWork,resumeHaulageWork} from "./haulage";
import {FARM_TOOLS,beginFarmToolWork,resumeFarmToolWork} from "./farmTools";
import {buildingCost} from "./construction";
import {isRivalTeam} from "./factions";
import {missingAgeBuildings,AGE_FOOD_BUFFER_SECONDS} from './advancement';
import type { Game } from './sim';
import type { BldType, ResKind, Unit } from './types';
import { AGE_COST, BUILDINGS, HALF, MAP, LUMBER_R, QUARRY_R } from './constants';
import { isDependent, reserveSeconds, foodDemand, farmHarvestEstimate, YEAR_SECONDS } from './settlement';

export const RIVAL_RESOURCE_RANGE=320;
/** Keep a full harvest cycle plus losses; half-year storage silently capped growth. */
export function rivalStorageTarget(g:Game,team:number){
  return Math.ceil([0,1,2,3].reduce((sum,phase)=>sum+foodDemand(g,team,phase)*YEAR_SECONDS/4,0)*1.3+100);
}

/** Local familiarity plus actual scouting records; never inspect unknown distant nodes. */
export function rivalKnows(g:Game,team:number,x:number,z:number){
  if(g.state.units.some(u=>u.team===team&&u.hp>0&&Math.hypot(u.x-x,u.z-z)<26))return true;
  if(g.state.buildings.some(b=>b.team===team&&g.finished(b)&&['townhall','cornerstone','lumber','quarry'].includes(b.type)&&Math.hypot(b.x-x,b.z-z)<55))return true;
  const cx=Math.floor((x+HALF)/MAP*32),cz=Math.floor((z+HALF)/MAP*32);
  return cx>=0&&cx<32&&cz>=0&&cz<32&&!!g.state.rivalKnowledge?.find(m=>m.team===team)?.cells.includes(cz*32+cx);
}

export function rivalWorkRange(g:Game,team:number,x:number,z:number,kind:ResKind){
  // Timber does not require a camp. A known nearby forest can fund the next
  // outpost even when the last local tree was cut and the treasury is empty.
  const home=g.campOf(team);
  if(['wood','copper','iron'].includes(kind)&&Math.hypot(x-home.x,z-home.z)<=RIVAL_RESOURCE_RANGE&&rivalKnows(g,team,x,z))return true;
  return g.state.buildings.some(b=>b.team===team&&g.finished(b)&&
    (['townhall','cornerstone'].includes(b.type)&&Math.hypot(b.x-x,b.z-z)<70||
      kind==='wood'&&b.type==='lumber'&&Math.hypot(b.x-x,b.z-z)<=LUMBER_R||
      kind==='stone'&&b.type==='quarry'&&Math.hypot(b.x-x,b.z-z)<=QUARRY_R));
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
  const pending=g.state.buildings.filter(b=>b.team===team&&b.hp>0&&!g.finished(b));
  if(pending.length>=2||pending.some(b=>b.type===type))return false;
  if(type==='lumber'||type==='quarry'||type==='cornerstone'||missingAgeBuildings(g,team).includes(type))return true;
  // Shelter grows ahead of actual households, not all the way to the next era's population.
  if(type==='hut')return g.popCap(team)<p.pop+3;
  if(type==='farm'&&(p.fields<p.foodFields||reserveSeconds(g,team)<300&&p.fields<Math.ceil(p.pop/2)))return true;
  if(type==='warehouse'){
    const capacity=g.stockCap(team)+pending.filter(b=>b.type==='warehouse').length*200;
    if(p.stores<2||capacity<Math.max(rivalStorageTarget(g,team),Math.max(p.next?.food||0,foodDemand(g,team)*AGE_FOOD_BUFFER_SECONDS)+40))return true;
  }
  // Leave enough for a timber camp or stone quarry before luxury expansion.
  if(!p.saving||!p.next)return t.wood-(d.wood||0)>=BUILDINGS.lumber.wood+BUILDINGS.quarry.wood;
  return (['wood','stone','copper','iron'] as ResKind[]).every(k=>t[k]-(d[k]||0)>=(p.next![k]||0));
}

/** A bounded share of the workforce secures missing materials while others grow food. */
export function rivalMaterialPriority(g:Game,u:Unit,kind:ResKind){
  if(!isRivalTeam(u.team)||kind==='food'||reserveSeconds(g,u.team)<360)return 0;
  const t=g.tribe(u.team),target=AGE_COST[t.age+1]?.[kind]||0;
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
  const surveyors=g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u))
    .sort((a,b)=>Math.hypot(a.x-home.x,a.z-home.z)-Math.hypot(b.x-home.x,b.z-home.z)).slice(0,3);
  const known=(x:number,z:number)=>Math.hypot(x-home.x,z-home.z)<RIVAL_RESOURCE_RANGE&&rivalKnows(g,team,x,z)&&surveyors.some(u=>g.workBoard.connected(g,u.x,u.z,x,z));
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
  if(!isRivalTeam(team)||reserveSeconds(g,team)<600)return;
  let reviews=laborReviews.get(g);if(!reviews){reviews=new Map();laborReviews.set(g,reviews);}
  const due=reviews.get(team)||0;if(due>g.state.time&&due<=g.state.time+12)return;
  reviews.set(team,g.state.time+12);
  const adults=g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u));
  const foodWorkers=adults.filter(u=>u.order==='gather'&&u.job==='food');
  const spare=Math.max(0,Math.min(2,foodWorkers.length-Math.ceil(adults.length/2)));
  const t=g.tribe(team),next=AGE_COST[t.age+1];
  const shortage=(['wood','stone','copper','iron'] as ResKind[]).some(k=>(next?.[k]||0)>t[k]&&(k!=='copper'||t.age>=1)&&(k!=='iron'||t.age>=2));
  const surplusWorkers=shortage?adults.filter(u=>u.order==='gather'&&u.job&&u.job!=='food'&&t[u.job]>=Math.max(60,(next?.[u.job]||0)*1.5)):[];
  const eligible=[...surplusWorkers,...foodWorkers.slice(0,spare)].filter(u=>!u.jobLock&&!u.buildOrder&&!u.tamingWork&&!u.tributeJourney&&u.carry===0&&!u.emergency&&!u.envoy&&!u.scout&&!u.visit&&!u.expedition&&
    !u.foundingJourney&&!u.weaponWork&&!u.farmToolWork&&!u.haulageWork&&!u.studyCrop&&u.drill==null);
  let moved=0;
  for(const u of eligible){
    if(moved>=2)break;
    const materials=(['wood','stone','copper','iron'] as ResKind[]).some(k=>rivalMaterialPriority(g,u,k)>0);
    const unfinished=g.state.buildings.some(b=>b.team===team&&b.hp>0&&!g.finished(b)&&!b.plannedCost);
    if(!materials&&!unfinished&&!surplusWorkers.includes(u))continue;
    u.node=null;u.job=null;u.jobLock=false;u.order='idle';u.workCheckAt=0;
    g.workBoard.reset();g.workBoard.assign(g,u);moved++;
  }
}


/** Prosperous rivals improve actual residents, not faction-wide production multipliers. */
export function developRivalEquipment(g:Game,team:number){
 if(!isRivalTeam(team)||reserveSeconds(g,team)<600)return false;
 const adults=g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)&&!u.militia);
 if(adults.length<8||adults.some(u=>u.weaponWork&&!u.weaponWork.paused||u.haulageWork&&!u.haulageWork.paused||u.farmToolWork&&!u.farmToolWork.paused||u.tamingWork&&!u.tamingWork.paused))return false;
 const eligible=adults.filter(u=>!u.jobLock&&!u.buildOrder&&!u.tributeJourney&&!u.emergency&&!u.recalled&&!u.envoy&&!u.trade&&!u.visit&&!u.scout&&!u.expedition&&!u.foundingJourney&&!u.studyCrop&&u.drill==null&&u.carry===0&&['idle','gather'].includes(u.order));
 // Resume paid projects before reserving any new materials.
 for(const u of eligible){
  if(u.weaponWork?.paused&&resumeWeaponWork(g,u))return true;
  if(u.haulageWork?.paused&&resumeHaulageWork(g,u))return true;
  if(u.farmToolWork?.paused&&resumeFarmToolWork(g,u))return true;
 }
 const t=g.tribe(team),plan=rivalDevelopmentPlan(g,team);
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
export function developRivalCoast(g:Game,team:number){
 if(!isRivalTeam(team)||!g.tribe(team).alive||g.popNow(team)<8||reserveSeconds(g,team)<600)return false;
 if(g.state.buildings.some(b=>b.team===team&&b.hp>0&&b.type==='dock'))return false;
 let reviews=coastalReviews.get(g);if(!reviews){reviews=new Map();coastalReviews.set(g,reviews);}
 const due=reviews.get(team)||0;if(due>g.state.time&&due<=g.state.time+45)return false;
 reviews.set(team,g.state.time+45);
 const t=g.tribe(team),cost=buildingCost('dock',g,team);
 if(t.wood<(cost.wood||0)+HAULAGE.canoe.wood+16||t.stone<HAULAGE.canoe.stone||!g.canAfford(team,cost))return false;
 if(g.state.buildings.filter(b=>b.team===team&&b.hp>0&&!g.finished(b)).length>=2)return false;
 const residents=g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u));
 const home=g.campOf(team);
 let best:{x:number;z:number;score:number}|undefined;
 for(let r=14;r<=100;r+=8)for(let i=0;i<24;i++){
  const a=i*Math.PI/12,x=home.x+Math.cos(a)*r,z=home.z+Math.sin(a)*r;
  if(g.height(x,z)<g.world.waterY+.3||!rivalKnows(g,team,x,z))continue;
  if(!residents.some(u=>g.workBoard.connected(g,u.x,u.z,x,z))||!g.placementValid('dock',x,z,team))continue;
  // Known fish improve a site; undiscovered shoals never influence its score.
  const fish=g.state.fish.filter(n=>n.amount>0&&rivalKnows(g,team,n.x,n.z)&&Math.hypot(n.x-x,n.z-z)<24).length;
  const score=r-Math.min(3,fish)*8;
  if(!best||score<best.score)best={x,z,score};
 }
 return !!best&&!!g.placeBuilding('dock',best.x,best.z,team);
}
