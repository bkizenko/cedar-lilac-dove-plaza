import {reconcileArmorHolders} from './armor';
import{validHandoverProvenance}from'./communityHandoverValidation';
import{reconcileWaterCargoEvidence}from'./boatPractice';
import{reconcilePenWater}from'./penWater';
import {mayGuardPrisoner,invalidatePrisonerGuardQueries} from './prisonerGuardQueries';
import {receiveFood} from './pantry';
import {recordConflict} from './conflictMetrics';
import {supplyApproach,supplyReached} from './campAnchor';
import {isRivalTeam} from './factions';
import type {Game} from './sim';
import type {Unit} from './types';
import {isDependent} from './settlement';
import {capitulationYielded} from './capitulation';

/** Stationed guards have finite capacity; the same guard cannot cover every camp. */
export function captiveGuardCoverage(g:Game){
 const coverage=new Set<number>();
 const captives=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.enslavedFrom!==undefined)
  .sort((a,b)=>(b.captivityUnrest||0)-(a.captivityUnrest||0)||a.id-b.id);
 const guards=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.enslavedFrom===undefined&&!isDependent(g,u)&&
  (u.militia||!['worker','leader'].includes(u.type))&&(['idle','hold'].includes(u.order)||u.order==='move'&&u.escortId!==undefined)&&u.carry===0&&
  !u.resting&&!u.shelterId&&!u.emergency&&!u.envoy&&!u.visit&&!u.scout&&!u.expedition&&!u.trade&&!u.tributeJourney);
 const assigned=new Map<number,number>();
 for(const u of captives){
  const guard=guards.filter(p=>(assigned.get(p.id)||0)<3&&(p.escortId===undefined||p.escortId===u.id)&&Math.hypot(p.x-u.x,p.z-u.z)<18&&g.workBoard.connected(g,p.x,p.z,u.x,u.z))
   .sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
  if(guard){assigned.set(guard.id,(assigned.get(guard.id)||0)+1);coverage.add(u.id);}
 }
 return coverage;
}
export function captivityDescription(u:Unit,guarded:boolean){
 return `Resistance ${Math.round(u.captivityUnrest||0)}% · ${guarded?'guarded':'unguarded'} · hunger and forced work increase resistance`;
}
/** Resistance develops from actual conditions. Escapes move existing people and cargo. */
export function tickCaptivity(g:Game,dt:number){
 if(!Number.isFinite(dt)||dt<=0||!g.state.units.some(u=>u.team===0&&u.hp>0&&u.enslavedFrom!==undefined))return;
 const covered=captiveGuardCoverage(g);
 for(const u of g.state.units){
  if(u.team!==0||u.hp<=0||u.enslavedFrom===undefined)continue;
  const working=['gather','build'].includes(u.order);
  const hardship=(u.hunger||0)>30?.12:0;
  const rate=covered.has(u.id)?-.06+hardship:.05+(working?.1:0)+hardship+((u.fatigue||0)>.6?.05:0);
  u.captivityUnrest=Math.max(0,Math.min(100,(u.captivityUnrest||0)+rate*dt));
  if(u.captivityUnrest<100||u.boat)continue;
  const origin=u.enslavedFrom,home=g.state.buildings.find(b=>b.team===origin&&b.type==='townhall'&&g.finished(b));
  if(!g.tribe(origin)?.alive||!home){
   u.enslavedFrom=undefined;u.captivityUnrest=undefined;
   g.banner('An enslaved resident refuses further forced service and joins as a free villager.',6);continue;
  }
  g.interruptMission(u);u.team=origin;reconcilePenWater(g);reconcileWaterCargoEvidence(g);reconcileArmorHolders(g);u.enslavedFrom=undefined;u.captivityUnrest=undefined;u.selected=false;
  u.target=null;u.node=null;u.pillage=-1;u.attackDestination=null;u.job=null;u.jobLock=false;
  u.recalled=true;u.stationOnArrival=false;u.order='return';u.workReason='Escaping captivity — returning to the home settlement';
  g.workBoard.reset();g.banner(`An enslaved resident has escaped toward ${g.tribe(origin).name}, carrying what was in their hands.`,7);
 }
}


/** A civilian can surrender to nearby superior force before a fatal blow.
 * Arrows or towers alone cannot remotely convert people into healed recruits. */
export function tryCivilianSurrender(g:Game,u:Unit,attackerTeam:number,damage:number){
 if(!Number.isFinite(damage)||damage<=0||attackerTeam!==0||!isRivalTeam(u.team)||u.hp<=0||damage<u.hp||u.type!=='worker'||u.militia||isDependent(g,u)||g.popNow(0)>=g.popCap(0))return false;
 const armed=(p:Unit)=>p.hp>0&&!isDependent(g,p)&&(p.militia||!['worker','leader'].includes(p.type));
 const captors=g.state.units.filter(p=>p.team===0&&p.enslavedFrom===undefined&&armed(p)&&Math.hypot(p.x-u.x,p.z-u.z)<6);
 const defenders=g.state.units.filter(p=>p.team===u.team&&armed(p)&&Math.hypot(p.x-u.x,p.z-u.z)<12);
 if(!captors.length||captors.length<defenders.length*2)return false;
 const home=g.state.buildings.find(b=>b.team===0&&b.type==='townhall'&&g.finished(b)&&g.interactionSpot(u,b));
 if(!home)return false;
 const origin=u.team,health=u.hp;
 g.makeHostile(origin);g.interruptMission(u);
 u.team=0;reconcilePenWater(g);reconcileWaterCargoEvidence(g);reconcileArmorHolders(g);u.enslavedFrom=origin;u.captivityUnrest=40;u.homeHall=home.id;
 u.hp=Math.max(1,Math.min(health,u.maxHp*.2));u.selected=false;u.pillage=-1;u.attackDestination=null;
 u.target=null;u.node=null;u.job=null;u.jobLock=false;u.recalled=true;u.stationOnArrival=false;u.order='return';
 u.workReason='Surrendered — walking to the captors’ settlement';g.state.conquestAt=g.state.time;
 g.addFloater(u.x,u.y+2,u.z,'Surrendered','#e8cf83');
 g.workBoard.reset();g.banner('A surrounded adult surrendered. They walk to your settlement; keep guards nearby or free them in Village.',6);
 return true;
}


/** Release one existing person to walk home; no payment or diplomatic benefit at distance. */
export function repatriateCaptive(g:Game,id:number){
 const u=g.state.units.find(p=>p.id===id&&p.team===0&&p.hp>0&&p.enslavedFrom!==undefined);
 if(!u)return false;
 const origin=u.enslavedFrom!;
 const home=g.state.buildings.find(b=>b.team===origin&&b.type==='townhall'&&g.finished(b)&&g.interactionSpot(u,b));
 if(!g.tribe(origin)?.alive||!home){g.banner('No reachable home settlement. You can still free this person to join your village.',5);return false;}
 g.interruptMission(u);u.team=origin;reconcilePenWater(g);reconcileWaterCargoEvidence(g);reconcileArmorHolders(g);u.enslavedFrom=undefined;u.captivityUnrest=undefined;u.repatriating=true;
 u.selected=false;u.target=null;u.node=null;u.job=null;u.jobLock=false;u.pillage=-1;u.attackDestination=null;
 u.recalled=true;u.stationOnArrival=false;u.order='return';u.workReason='Released from captivity — walking home';
 g.workBoard.reset();g.banner('Released to return home with their belongings. Goodwill follows their safe arrival.',5);return true;
}
export function finishRepatriation(g:Game,u:Unit){
 if(!u.repatriating||u.hp<=0||!isRivalTeam(u.team)||!g.state.buildings.some(b=>b.team===u.team&&g.finished(b)&&['townhall','warehouse'].includes(b.type)&&g.buildingWorkReached(u,b)))return;
 u.repatriating=undefined;
 const t=g.tribe(u.team);t.trust=Math.min(1,(t.trust||0)+.15);
 g.banner(`${t.name} welcomes a person you released. Relations improve; existing wars still need a peace agreement.`,6);
}

/** New prisoners are held in custody, not automatically assigned forced labor.
 * Existing enslavedFrom saves retain their previous meaning. */
/** What one person knew about their own home at the moment they were taken (never refreshed afterwards). */
export type CaptiveKnowledge={team:number;asOf:number;homeHallId?:number;home?:{x:number;z:number};homeArmed:number;homeResidents:number;homeFood:number;homeWood:number};
export function captiveKnowledgeSnapshot(g:Game,u:Unit,origin:number):CaptiveKnowledge{
 const hall=g.state.buildings.find(b=>b.id===u.homeHall&&b.team===origin&&b.hp>0)??g.state.buildings.filter(b=>b.team===origin&&b.type==='townhall'&&b.hp>0).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
 const near=hall?g.state.units.filter(p=>p!==u&&p.team===origin&&p.hp>0&&!(p as PrisonerUnit).prisoner&&Math.hypot(p.x-hall.x,p.z-hall.z)<=55):[];
 const t=g.tribe(origin),round5=(n:number)=>Math.max(0,Math.round((Number.isFinite(n)?n:0)/5)*5);
 return{team:origin,asOf:g.state.time,homeHallId:hall?.id,home:hall?{x:hall.x,z:hall.z}:undefined,homeArmed:near.filter(p=>p.militia||!['worker','leader'].includes(p.type)).length,homeResidents:near.length,homeFood:round5(t?.food||0),homeWood:round5(t?.wood||0)};
}
export type PrisonerCustody={knows?:CaptiveKnowledge;rejoinedTeam?:number;rejoinedHandoverId?:number;originTeam:number;captorTeam:number;originHomeHall?:number;phase:'escorting'|'custody'|'released';guardId?:number;food:number;waterLiters:number;unguardedSeconds:number};
export type PrisonerUnit=Unit&{prisoner?:PrisonerCustody};
export const PRISONER_RULES={version:1,guardCapacity:3,surrenderRadiusMeters:6,defenderRadiusMeters:12,superiorityRatio:2,escortSeparationMeters:8,unguardedEscapeSeconds:30,localSupplyRadiusMeters:3,foodPerSecond:.036,waterLitersPerSecond:.008,foodGraceSeconds:60,foodFatalSeconds:160,waterGraceSeconds:180,waterFatalSeconds:1800} as const;
export const prisonerIndependentNeeds=(u:Unit)=>!!(u as PrisonerUnit).prisoner&&(u as PrisonerUnit).prisoner!.phase!=='custody';
const armedPrisonerGuard=(g:Game,u:Unit,team:number)=>u.team===team&&u.hp>0&&!isDependent(g,u)&&!(u as PrisonerUnit).prisoner&&u.enslavedFrom===undefined&&(u.militia||!['worker','leader'].includes(u.type));
function guardLoad(g:Game,id:number){return g.state.units.filter(u=>u.hp>0&&(u as PrisonerUnit).prisoner?.phase!=='released'&&(u as PrisonerUnit).prisoner?.guardId===id).length;}
/** Called only after the surrender decision, with nearby actual captors. */
export function acceptPrisonerSurrender(g:Game,target:Unit,captorTeam=0){
 const u=target as PrisonerUnit;
 if(u.hp<=0||u.team===captorTeam||u.prisoner||u.enslavedFrom!==undefined||u.type!=='worker'||u.militia||u.boat||isDependent(g,u))return {accepted:false,reason:'Only a living unarmed adult can accept these surrender terms'};
 const captors=g.state.units.filter(p=>armedPrisonerGuard(g,p,captorTeam)&&Math.hypot(p.x-u.x,p.z-u.z)<=PRISONER_RULES.surrenderRadiusMeters&&g.workBoard.connected(g,p.x,p.z,u.x,u.z));
 const defenders=g.state.units.filter(p=>armedPrisonerGuard(g,p,u.team)&&!capitulationYielded(g,p)&&Math.hypot(p.x-u.x,p.z-u.z)<=PRISONER_RULES.defenderRadiusMeters);
 if(!captors.length||captors.length<defenders.length*PRISONER_RULES.superiorityRatio)return {accepted:false,reason:'Reach the person with enough local force to obtain surrender'};
 const guard=captors.filter(p=>guardLoad(g,p.id)<PRISONER_RULES.guardCapacity&&((p as Unit&{conflictIntent?:string}).conflictIntent==='capture'||['idle','hold'].includes(p.order)&&(!p.escortId||guardLoad(g,p.id)>0))&&(!p.carry||p.carryType==='food')&&!p.emergency&&!p.envoy&&!p.expedition&&!p.visit&&!p.trade&&!p.boat).sort((a,b)=>guardLoad(g,a.id)-guardLoad(g,b.id)||a.id-b.id)[0];
 if(!guard)return {accepted:false,reason:'No nearby guard has capacity to escort another prisoner'};
 const origin=u.team,home=u.homeHall;if(captorTeam===0&&isRivalTeam(origin))g.makeHostile(origin);g.interruptMission(u);if(guardLoad(g,guard.id)===0)g.interruptMission(guard);
 const knows=captiveKnowledgeSnapshot(g,u,origin);
 u.prisoner={originTeam:origin,captorTeam,originHomeHall:home,phase:'escorting',guardId:guard.id,food:0,waterLiters:0,unguardedSeconds:0,knows};invalidatePrisonerGuardQueries(g);
 u.team=captorTeam;reconcilePenWater(g);reconcileWaterCargoEvidence(g);reconcileArmorHolders(g);u.selected=false;u.homeHall=undefined;u.target=null;u.node=null;u.job=null;u.jobLock=false;u.pillage=-1;u.order='hold';u.workReason='Surrendered — waiting for a guarded route to custody';
 guard.order='hold';guard.target=null;guard.node=null;guard.pillage=-1;guard.returnAfterCombat=undefined;guard.escortId=u.id;
 recordConflict(g,'surrender',captorTeam,1,{actorId:guard.id,targetId:u.id});g.workBoard.reset();
 return {accepted:true,reason:'Surrender accepted; the same person needs a guard, supplies and physical delivery',prisonerId:u.id};
}
/** A nearby carrier supplies real cargo, never a distant society stockpile. */
export function provisionPrisoner(g:Game,id:number,carrierId:number){
 const u=g.state.units.find(u=>u.id===id&&u.hp>0) as PrisonerUnit|undefined,carrier=g.state.units.find(u=>u.id===carrierId&&u.hp>0);
 if(!u?.prisoner||!carrier||carrier.team!==u.prisoner.captorTeam||Math.hypot(carrier.x-u.x,carrier.z-u.z)>PRISONER_RULES.localSupplyRadiusMeters)return false;
 let delivered=false;
 if(carrier.carryType==='food'&&carrier.carry>0){const food=Math.min(carrier.carry,12-u.prisoner.food);if(food>0){carrier.carry-=food;u.prisoner.food+=food;delivered=true;if(carrier.carry===0){carrier.carryType=null;carrier.carryFood=undefined;}}}
 if(g.state.survivalVersion===1&&carrier.waterWork&&carrier.waterWork.liters>0){const water=Math.min(carrier.waterWork.liters,4-u.prisoner.waterLiters);if(water>0){carrier.waterWork.liters-=water;u.prisoner.waterLiters+=water;delivered=true;}}
 return delivered;
}
function prisonerTravelNeeds(g:Game,u:PrisonerUnit,dt:number){
 const p=u.prisoner!,waterDemand=g.state.survivalVersion===1?PRISONER_RULES.waterLitersPerSecond*dt:0;const food=Math.min(p.food,PRISONER_RULES.foodPerSecond*dt),water=Math.min(p.waterLiters,waterDemand);p.food-=food;p.waterLiters-=water;
 recordConflict(g,'prisoner_food_used',p.captorTeam,food,{actorId:u.id});recordConflict(g,'prisoner_water_used',p.captorTeam,water,{actorId:u.id});
 const hunger=u.hunger||0,thirst=u.thirstSeconds||0;
 u.hunger=Math.max(0,hunger+(food+1e-9<PRISONER_RULES.foodPerSecond*dt?dt:-dt*3));u.thirstSeconds=Math.max(0,thirst+(water+1e-9<waterDemand?dt:-dt*3));
 const exposure=Math.max(0,u.hunger-PRISONER_RULES.foodGraceSeconds)-Math.max(0,hunger-PRISONER_RULES.foodGraceSeconds);
 const dehydration=Math.max(0,u.thirstSeconds-PRISONER_RULES.waterGraceSeconds)-Math.max(0,thirst-PRISONER_RULES.waterGraceSeconds);
 u.hp-=Math.max(0,exposure)*u.maxHp/PRISONER_RULES.foodFatalSeconds+Math.max(0,dehydration)*u.maxHp/PRISONER_RULES.waterFatalSeconds;
 if(u.hp<=0){u.hp=0;recordPrisonerDeath(g,u);}
}
function clearPrisonerGuard(g:Game,u:PrisonerUnit){const guard=g.state.units.find(p=>p.id===u.prisoner?.guardId);if(guard?.escortId===u.id){guard.escortId=undefined;guard.order='hold';guard.workReason='Prisoner escort finished';}}
/** Release preserves bodily state, origin and possessions; the person walks home. */
export function releasePrisoner(g:Game,id:number,escaped=false){
 const u=g.state.units.find(u=>u.id===id&&u.hp>0) as PrisonerUnit|undefined;if(!u?.prisoner||u.prisoner.phase==='released')return false;
 const p=u.prisoner;clearPrisonerGuard(g,u);g.interruptMission(u);u.team=p.originTeam;reconcilePenWater(g);reconcileWaterCargoEvidence(g);reconcileArmorHolders(g);u.homeHall=p.originHomeHall;if(g.tribe(p.originTeam))g.tribe(p.originTeam).alive=true;
 p.phase='released';u.recalled=true;u.repatriating=true;u.order='return';u.target=null;u.node=null;u.job=null;u.jobLock=false;u.pillage=-1;u.workReason='Released prisoner — returning home with belongings';
 recordConflict(g,escaped?'prisoner_escape':'prisoner_release',p.captorTeam,1,{actorId:u.id});g.workBoard.reset();return true;
}
/** Must run before generic worker/escort AI. Captives never become automatic labor. */
export function prisonerAI(g:Game,person:Unit,dt:number){
 const u=person as PrisonerUnit;
 if(!u.prisoner){
  if(u.emergency||u.hp<=0||!mayGuardPrisoner(g,u.id))return false;
  let assigned=false,traveling:PrisonerUnit|undefined;
  // Most residents guard nobody. Read the sparse custody marker first, and
  // stop at the same first escorting person the previous filter/find selected.
  for(const person of g.state.units){const p=person as PrisonerUnit,custody=p.prisoner;
   if(custody?.guardId!==u.id||!(p.hp>0)||custody.phase==='released')continue;
   assigned=true;if(custody.phase==='escorting'){traveling=p;break;}
  }
  if(!assigned)return false;
  if(!traveling){u.order='hold';u.node=null;u.target=null;u.workReason='Guarding prisoners in custody';return true;}
  if(Math.hypot(u.x-traveling.x,u.z-traveling.z)>PRISONER_RULES.escortSeparationMeters){u.tx=traveling.x;u.tz=traveling.z;u.order='move';g.steer(u,dt);u.workReason='Regrouping with prisoner before continuing';return true;}
  const drop=g.nearestDrop(u.x,u.z,u.team),spot=drop?supplyApproach(g,u,drop):null;
  if(!drop||!spot){u.order='hold';u.workReason='Prisoner escort needs a reachable friendly camp or store';return true;}
  u.tx=spot.x;u.tz=spot.z;if(!supplyReached(g,u,drop,spot)){u.order='move';g.steer(u,dt);}else u.order='hold';u.workReason='Escorting prisoners to custody';return true;
 }
 const p=u.prisoner;if(u.hp<=0)return true;
 if(p.phase==='released'){
  const homeTeam=p.rejoinedTeam??p.originTeam;
  prisonerTravelNeeds(g,u,Math.max(0,dt));if(u.hp<=0)return true;
  const home=g.nearestDrop(u.x,u.z,homeTeam),spot=home?supplyApproach(g,u,home):null;
  if(!home||!spot){u.order='hold';u.workReason='Released — no reachable home cache for return';return true;}
  if(supplyReached(g,u,home,spot)){
   if(p.food>0)receiveFood(g,homeTeam,p.food);const stock=g.tribe(homeTeam).survival;if(stock)stock.waterLiters+=p.waterLiters;
   p.food=0;p.waterLiters=0;u.prisoner=undefined;u.recalled=undefined;finishRepatriation(g,u);if(u.repatriating){const origin=g.tribe(u.team);origin.trust=Math.min(1,(origin.trust||0)+.15);u.repatriating=undefined;}u.order='idle';u.workReason='Released person arrived home with remaining provisions';g.workBoard.reset();return true;
  }
  u.tx=spot.x;u.tz=spot.z;u.order='move';g.steer(u,dt);u.workReason='Released — walking home with carried provisions';return true;
 }
 if(p.phase==='escorting')prisonerTravelNeeds(g,u,Math.max(0,dt));if(u.hp<=0){clearPrisonerGuard(g,u);return true;}
 const guard=g.state.units.find(guard=>guard.id===p.guardId&&armedPrisonerGuard(g,guard,p.captorTeam)&&!guard.emergency&&Math.hypot(guard.x-u.x,guard.z-u.z)<=18&&g.workBoard.connected(g,guard.x,guard.z,u.x,u.z));
 if(!guard){
  p.unguardedSeconds+=Math.max(0,dt);u.order='hold';u.node=null;u.target=null;u.workReason='Prisoner unguarded — escape risk rising';
  if(p.unguardedSeconds>=PRISONER_RULES.unguardedEscapeSeconds){releasePrisoner(g,u.id,true);u.repatriating=undefined;}
  return true;
 }
 p.unguardedSeconds=0;recordConflict(g,'guard_seconds',p.captorTeam,Math.max(0,dt),{actorId:guard.id,targetId:u.id});
 if(p.phase==='custody'){u.order='hold';u.node=null;u.target=null;u.job=null;u.jobLock=false;u.workReason='Prisoner in guarded custody — no labor assigned';return true;}
 const drop=g.nearestDrop(u.x,u.z,p.captorTeam),spot=drop?supplyApproach(g,u,drop):null;
 if(!drop||!spot){u.order='hold';u.workReason='Prisoner waiting for a reachable custody site';return true;}
 if(supplyReached(g,u,drop,spot)){p.phase='custody';u.order='hold';u.node=null;u.target=null;recordConflict(g,'prisoner_custody',p.captorTeam,1,{actorId:u.id});return true;}
 if(Math.hypot(guard.x-u.x,guard.z-u.z)>PRISONER_RULES.escortSeparationMeters){u.order='hold';u.workReason='Waiting for prisoner escort to catch up';return true;}
 u.tx=spot.x;u.tz=spot.z;u.order='move';g.steer(u,dt);u.workReason='Walking under escort to custody';return true;
}

/** Validate optional new custody saves without reinterpreting enslavedFrom saves. */
export function validPrisonerState(state:unknown){
 if(!state||typeof state!=='object'||!Array.isArray((state as Game['state']).units)||!Array.isArray((state as Game['state']).tribes))return false;
 const s=state as Game['state'];
 const nonnegative=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=1e9;
 for(const person of s.units){const u=person as PrisonerUnit,p=u.prisoner;if(p===undefined)continue;
  if(!p||typeof p!=='object'||!Number.isInteger(p.originTeam)||!Number.isInteger(p.captorTeam)||p.originTeam<0||p.captorTeam<0||p.originTeam>=s.tribes.length||p.captorTeam>=s.tribes.length||p.originTeam===p.captorTeam||!['escorting','custody','released'].includes(p.phase)||p.guardId!==undefined&&(!Number.isSafeInteger(p.guardId)||p.guardId<1)||!nonnegative(p.food)||p.food>12||!nonnegative(p.waterLiters)||p.waterLiters>4||!nonnegative(p.unguardedSeconds)||u.enslavedFrom!==undefined)return false;
  if(p.originHomeHall!==undefined&&(!Number.isSafeInteger(p.originHomeHall)||p.originHomeHall<1))return false;
  if(p.rejoinedTeam!==undefined||p.rejoinedHandoverId!==undefined){if(p.phase!=='released'||!Number.isSafeInteger(p.rejoinedTeam)||!validHandoverProvenance(s,{id:u.id,team:p.rejoinedTeam!,originTeam:p.originTeam,handoverId:p.rejoinedHandoverId},'residentIds'))return false;}
  if(u.team!==(p.phase==='released'?(p.rejoinedTeam??p.originTeam):p.captorTeam))return false;
 }
 return true;
}
/** A replacement guard is assigned explicitly and must actually reach the person. */
export function assignPrisonerGuard(g:Game,id:number,guardId?:number){
 const u=g.state.units.find(p=>p.id===id&&p.hp>0) as PrisonerUnit|undefined;if(!u?.prisoner||u.prisoner.phase==='released')return {accepted:false,reason:'Choose a person currently in custody'};
 const guard=g.state.units.filter(p=>(guardId===undefined||p.id===guardId)&&armedPrisonerGuard(g,p,u.prisoner!.captorTeam)&&!p.emergency&&!p.envoy&&!p.expedition&&!p.visit&&!p.trade&&!p.boat&&(!p.escortId||guardLoad(g,p.id)>0)&&guardLoad(g,p.id)<PRISONER_RULES.guardCapacity&&['idle','hold','move'].includes(p.order)&&g.workBoard.connected(g,p.x,p.z,u.x,u.z)).sort((a,b)=>Number(b.selected)-Number(a.selected)||Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
 if(!guard)return {accepted:false,reason:'Need an available armed guard with capacity and a reachable route'};
 if(guardLoad(g,guard.id)===0)g.interruptMission(guard);u.prisoner.guardId=guard.id;invalidatePrisonerGuardQueries(g);guard.escortId=u.id;guard.order='move';guard.tx=u.x;guard.tz=u.z;guard.workReason='Joining prisoner escort — protection begins on arrival';
 return {accepted:true,reason:'Guard is physically joining the prisoner escort',guardId:guard.id};
}
const recordedPrisonerDeaths=new WeakSet<Unit>();
export function recordPrisonerDeath(g:Game,u:Unit){if(u.prisoner&&u.hp<=0&&!recordedPrisonerDeaths.has(u)){recordedPrisonerDeaths.add(u);recordConflict(g,'prisoner_death',u.prisoner.captorTeam,1,{actorId:u.id});}}
