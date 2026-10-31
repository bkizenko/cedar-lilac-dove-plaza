import type {Game} from './sim';
import type {Building,Unit} from './types';
import type {RivalRaidPlan} from './rivalOperations';
import {OPERATION_RULES} from './rivalOperations';
import {isRivalTeam} from './factions';
import {hasTaskCommitment} from './workCommitments';
import {isDependent,reserveSeconds,FOOD_PER_PERSON_SECOND} from './settlement';
import {rivalKnows} from './rivalDevelopment';
import {supplyDrops,supplyApproach,supplyReached} from './campAnchor';
import {receiveFood} from './pantry';
import {recordSimulationEvent} from './simulationEvents';
import {recordHaulDelivery} from './haulage';
import {deliverSamples} from './cultivation';
import {deliverWaterCargo} from './survivalNeeds';
import {societyRelation,societiesAreFoes,recordSocietyContact,declareSocietyHostility,acceptSocietyPeace} from './societyRelations';

export const RIVAL_ACTIVITY_RULES={version:1,reviewSeconds:90,firstReviewSeconds:120,raidRecoverySeconds:360,peaceRetrySeconds:180,recentLimit:128,maximumMissions:256,contactMeters:12,talkSeconds:4,minimumDiplomaticAdults:4,minimumFoodSeconds:180,maximumJourneySeconds:480,travelAllowance:1.6,waterPerSecond:.008,foodGraceSeconds:60,waterGraceSeconds:180} as const;
export type RivalActivityKind='raid'|'peace';
export type RivalActivityStage='reviewed'|'blocked'|'feasible'|'departed'|'contact'|'resolved'|'returning'|'returned'|'lost'|'cancelled'|'meters'|'food_used'|'water_used'|'goods_delivered'|'actors_returned'|'actors_lost';
export type RivalActivityEvent={timeSeconds:number;team:number;partner:number;kind:RivalActivityKind;stage:RivalActivityStage;amount:number;missionId?:number;actorIds?:number[];reason?:string};
export type RivalActivityJournal={version:1;totals:Record<string,number>;recent:RivalActivityEvent[]};
export type RivalMissionActor={id:number;lastX:number;lastZ:number;lost?:boolean;returned?:boolean};
export type RivalMission={id:number;team:number;partner:number;kind:RivalActivityKind;targetId:number;phase:'outbound'|'contact'|'returning'|'suspended'|'completed'|'lost';actors:RivalMissionActor[];createdAt:number;talkSeconds:number;food:number;waterLiters:number;resolved:boolean;blockedReason?:string};
export type RivalActivityUnit=Unit&{societyMissionId?:number};
export type RivalActivityState={rivalActivity?:RivalActivityJournal;rivalMissions?:RivalMission[];rivalActivityNextReview?:{team:number;timeSeconds:number}[]};
const state=(g:Game)=>g.state as Game['state']&RivalActivityState;
const missionIndexes=new WeakMap<Game,{list:RivalMission[];length:number;byId:Map<number,RivalMission>}>();
function actorMission(g:Game,u:Unit){const id=u.societyMissionId;if(!id)return undefined;const list=state(g).rivalMissions;if(!list)return undefined;let index=missionIndexes.get(g);if(!index||index.list!==list||index.length!==list.length||!index.byId.has(id)){index={list,length:list.length,byId:new Map(list.map(m=>[m.id,m]))};missionIndexes.set(g,index);}return index.byId.get(id);}

const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const active=(m:RivalMission)=>m.phase!=='completed'&&m.phase!=='lost';
export function recordRivalActivity(g:Game,event:Omit<RivalActivityEvent,'timeSeconds'|'amount'>&{amount?:number}){
 const amount=event.amount??1;if(!Number.isFinite(amount)||amount<=0)return;
 const journal=state(g).rivalActivity??={version:1,totals:{},recent:[]};
 const key=`${event.team}:${event.partner}:${event.kind}:${event.stage}`;journal.totals[key]=(journal.totals[key]||0)+amount;
 if(['meters','food_used','water_used'].includes(event.stage))return;
 journal.recent.push({...event,timeSeconds:g.state.time,amount});if(journal.recent.length>RIVAL_ACTIVITY_RULES.recentLimit)journal.recent.shift();
}
function freeActor(g:Game,u:Unit){return u.hp>=u.maxHp*OPERATION_RULES.militaryReadinessHealthRatio&&!u.prisoner&&!isDependent(g,u)&&!(u as RivalActivityUnit).societyMissionId&&!hasTaskCommitment(u)&&u.carry===0&&!u.jobLock&&!u.buildOrder&&!u.trade&&!u.visit&&!u.envoy&&!u.scout&&!u.expedition&&!u.tributeJourney&&!u.foundingJourney&&!u.emergency&&!u.recalled&&u.escortId===undefined&&u.conflictIntent!=='capture'&&u.conflictIntent!=='occupy'&&!u.huntOnly&&u.massRaidTarget===undefined&&u.pillage<0&&u.drill==null&&['idle','hold','gather'].includes(u.order);}
function knownPartners(g:Game,team:number){return g.state.tribes.filter(t=>t.id!==team&&t.id!==3&&t.alive&&supplyDrops(g,t.id).some(d=>rivalKnows(g,team,d.x,d.z))).map(t=>t.id);}
const refusal=(g:Game,team:number,partner:number,kind:RivalActivityKind,reason:string)=>{recordRivalActivity(g,{team,partner,kind,stage:'blocked',reason});return {accepted:false as const,reason};};

/** All pair candidates use this society's own remembered ground/local sight.
 * No remote treasury or global enemy force count contributes to utility. */
export type RivalRaidAssessment={plan:RivalRaidPlan|null;reason:string|null;counts:{adults:number;readyFighters:number;retainedGuards:number;availableFighters:number;knownPartners:number;eligiblePartners:number;knownTargets:number;reachableTargets:number}};
export function assessRivalPairRaid(g:Game,team:number,reserve:number,partner?:number):RivalRaidAssessment{
 const counts={adults:0,readyFighters:0,retainedGuards:0,availableFighters:0,knownPartners:0,eligiblePartners:0,knownTargets:0,reachableTargets:0};
 const blocked=(reason:string):RivalRaidAssessment=>({plan:null,reason,counts});
 if(!isRivalTeam(team)||!g.tribe(team)?.alive)return blocked('No living rival society can dispatch this party');
 if(reserve<OPERATION_RULES.minFoodSeconds)return blocked('Food reserve is below the raid departure minimum');
 const t=g.tribe(team),home=supplyDrops(g,team)[0];if(!home)return blocked('No existing home cache can support a round trip');
 const adults=g.state.units.filter(u=>u.team===team&&u.hp>0&&!isDependent(g,u));
 const ready=adults.filter(u=>u.type!=='leader'&&(u.militia||u.type!=='worker')&&u.hp>=u.maxHp*OPERATION_RULES.militaryReadinessHealthRatio&&freeActor(g,u));
 counts.adults=adults.length;counts.readyFighters=ready.length;
 const guards=Math.max(1,Math.ceil(adults.length*OPERATION_RULES.guardFraction));
 const homeGuards=ready.filter(u=>distance(u,home)<OPERATION_RULES.localDefenseRadius).sort((a,b)=>distance(a,home)-distance(b,home)).slice(0,guards);counts.retainedGuards=homeGuards.length;if(homeGuards.length<guards)return blocked('Not enough ready guards would remain near home');
 const available=ready.filter(u=>!homeGuards.includes(u));const count=Math.min(12+t.age*3,Math.max(2,Math.floor(adults.length*OPERATION_RULES.raidFraction)),available.length);counts.availableFighters=available.length;if(count<2)return blocked('At least two available fighters are needed after retaining guards');
 const strength=(u:Unit)=>Math.max(.2,u.dmg/10)*Math.min(1,u.hp/Math.max(1,u.maxHp));
 const fighters=available.sort((a,b)=>strength(b)-strength(a)||a.id-b.id).slice(0,count),power=fighters.reduce((n,u)=>n+strength(u),0);
 const values:Partial<Record<Building['type'],number>>={warehouse:7,farm:5,lumber:5,quarry:4,market:6,cornerstone:3,hut:2,dock:4};
 const known=knownPartners(g,team);counts.knownPartners=known.length;
 const partners=known.filter(other=>{
  if(partner!==undefined&&other!==partner)return false;if((other===0&&g.isAlly(team)||g.isAlly(team)&&g.isAlly(other))&&!societiesAreFoes(g,team,other))return false;const relation=societyRelation(g,team,other),reverse=societyRelation(g,other,team);
  if(relation.peaceUntil>g.state.time&&reverse.peaceUntil>g.state.time)return false;
  if(g.state.conflict==='quiet'&&!societiesAreFoes(g,team,other))return false;
  if(g.state.time<(g.state.conflict==='dangerous'?300:600))return false;
  return societiesAreFoes(g,team,other)||relation.grievance>.52||t.aggro>.65&&relation.trust<.35;
 });
 counts.eligiblePartners=partners.length;if(!partners.length)return blocked('No known partner is eligible after treaty, grievance and opening protection checks');
 const candidates=g.state.buildings.filter(b=>partners.includes(b.team)&&g.finished(b)&&b.type!=='townhall'&&rivalKnows(g,team,b.x,b.z)&&distance(home,b)<Math.min(700,Math.max(180,g.world.size*.4)))
  .sort((a,b)=>(values[b.type]??1)-(values[a.type]??1)||distance(home,a)-distance(home,b)).slice(0,OPERATION_RULES.maxTargets);
 counts.knownTargets=candidates.length;if(!candidates.length)return blocked('No exposed known structure offers a raid target');
 let best:RivalRaidPlan|null=null;for(const target of candidates){
  const spot=g.interactionSpot(fighters[0],target);if(!spot||!fighters.every(u=>g.workBoard.connected(g,u.x,u.z,spot.x,spot.z)))continue;
  counts.reachableTargets++;
  const observed=g.state.units.filter(u=>u.team===target.team&&u.hp>0&&!isDependent(g,u)&&distance(u,target)<OPERATION_RULES.localDefenseRadius&&rivalKnows(g,team,u.x,u.z));
  const resistance=observed.reduce((n,u)=>n+strength(u)*(u.militia||!['worker','leader'].includes(u.type)?1:.3),0)+g.state.buildings.filter(b=>b.team===target.team&&g.finished(b)&&['watchtower','keep','barracks'].includes(b.type)&&distance(b,target)<35&&rivalKnows(g,team,b.x,b.z)).length*2;
  const relation=societyRelation(g,team,target.team),grievance=relation.grievance*(target.type==='cornerstone'?6:3),reward=(values[target.type]??1)*(.6+t.aggro*.7+(reserve<450?.3:0));
  const metrics={reward,grievance,travelCost:distance(home,target)*OPERATION_RULES.travelCostPerMeter,defenseCost:resistance/Math.max(1,power)*OPERATION_RULES.defenseWeight,structureCost:Math.min(2,target.hp/500),nightBonus:g.isNight()?OPERATION_RULES.nightBonus:0,observedDefenders:observed.length,power,guards};
  const utility=reward+grievance-metrics.travelCost-metrics.defenseCost-metrics.structureCost+metrics.nightBonus;
  if(utility>OPERATION_RULES.minUtility&&(!best||utility>best.utility))best={target,fighters,metrics,utility,reason:grievance>1?'Known local grievance':'Known exposed supplies'};
 }return {plan:best,reason:best?null:counts.reachableTargets?'Known defenses and travel costs outweigh expected reward':'Known targets need a reachable route for the whole party',counts};
}
export function planRivalPairRaid(g:Game,team:number,reserve:number,partner?:number){return assessRivalPairRaid(g,team,reserve,partner).plan;}

function newMission(g:Game,team:number,partner:number,kind:RivalActivityKind,targetId:number,actors:Unit[],food=0,waterLiters=0){
 const missions=state(g).rivalMissions??=[];
 while(missions.length>=RIVAL_ACTIVITY_RULES.maximumMissions){const old=missions.findIndex(m=>!active(m));if(old<0)return null;missions.splice(old,1);}
 const m:RivalMission={id:g.id(),team,partner,kind,targetId,phase:'outbound',actors:actors.map(u=>({id:u.id,lastX:u.x,lastZ:u.z})),createdAt:g.state.time,talkSeconds:0,food,waterLiters,resolved:false};
 for(const u of actors){g.interruptMission(u);(u as RivalActivityUnit).societyMissionId=m.id;u.node=null;u.target=null;u.job=null;u.jobLock=false;u.stuckT=0;}
 missions.push(m);recordRivalActivity(g,{team,partner,kind,stage:'departed',missionId:m.id,actorIds:actors.map(u=>u.id)});g.workBoard.reset();return m;
}
/** Uses existing finite fighters. Contact, not departure, changes the relation. */
export function dispatchPairRaid(g:Game,team:number,reserve:number,partner:number){
 const other=partner;recordRivalActivity(g,{team,partner:other,kind:'raid',stage:'reviewed'});
 if(state(g).rivalMissions?.some(m=>m.team===team&&m.kind==='raid'&&active(m)))return refusal(g,team,other,'raid','An existing party must finish or return');
 const assessment=assessRivalPairRaid(g,team,reserve,partner),plan=assessment.plan;if(!plan)return refusal(g,team,other,'raid',assessment.reason||'No feasible raid target');
 recordRivalActivity(g,{team,partner:plan.target.team,kind:'raid',stage:'feasible'});
 const m=newMission(g,team,plan.target.team,'raid',plan.target.id,plan.fighters);if(!m)return refusal(g,team,plan.target.team,'raid','All bounded mission slots are active');
 for(const u of plan.fighters){u.order='attackmove';u.tx=plan.target.x;u.tz=plan.target.z;u.attackDestination={x:plan.target.x,z:plan.target.z};u.target=plan.target;u.pillage=plan.target.team;u.workReason='Raiding a known neighboring society';g.invalidateRoute(u);}return {accepted:true as const,missionId:m.id,partner:plan.target.team};
}
/** A messenger must load paid provisions at its own physical cache. */
export function dispatchSocietyPeace(g:Game,team:number,partner:number){
 recordRivalActivity(g,{team,partner,kind:'peace',stage:'reviewed'});
 if(!isRivalTeam(team)||team===partner||partner===3||!g.tribe(partner)?.alive)return refusal(g,team,partner,'peace','Choose a different living settled society');
 if(!societiesAreFoes(g,team,partner)&&societyRelation(g,team,partner).grievance<.3)return refusal(g,team,partner,'peace','No known war or grievance needs a truce');
 if(state(g).rivalMissions?.some(m=>m.team===team&&m.kind==='peace'&&active(m)))return refusal(g,team,partner,'peace','A diplomatic messenger is already away');
 const adults=g.state.units.filter(u=>u.team===team&&u.hp>0&&!isDependent(g,u));if(adults.length<RIVAL_ACTIVITY_RULES.minimumDiplomaticAdults||reserveSeconds(g,team)<RIVAL_ACTIVITY_RULES.minimumFoodSeconds)return refusal(g,team,partner,'peace','Keep enough adults and food at home before sending a messenger');
 const homes=supplyDrops(g,team),targets=supplyDrops(g,partner).filter(d=>rivalKnows(g,team,d.x,d.z));
 for(const u of adults.filter(u=>u.type==='worker'&&!u.militia&&freeActor(g,u))){
  const home=homes.find(h=>{const spot=supplyApproach(g,u,h);return spot&&supplyReached(g,u,h,spot);});if(!home)continue;
  for(const target of targets){const spot=supplyApproach(g,u,target);if(!spot)continue;
   const seconds=Math.min(RIVAL_ACTIVITY_RULES.maximumJourneySeconds,Math.max(60,distance(home,target)*2/Math.max(.1,u.speed)*RIVAL_ACTIVITY_RULES.travelAllowance+RIVAL_ACTIVITY_RULES.talkSeconds));
   const food=seconds*FOOD_PER_PERSON_SECOND,waterLiters=g.state.survivalVersion===1?seconds*RIVAL_ACTIVITY_RULES.waterPerSecond:0;
   if(g.tribe(team).food<food||(g.tribe(team).survival?.waterLiters??0)<waterLiters)continue;
   const targetId=target.kind==='camp'?-partner-1:target.id;
   recordRivalActivity(g,{team,partner,kind:'peace',stage:'feasible'});const m=newMission(g,team,partner,'peace',targetId,[u],food,waterLiters);if(!m)return refusal(g,team,partner,'peace','All bounded mission slots are active');
   g.spend(team,{food});if(waterLiters)g.tribe(team).survival!.waterLiters-=waterLiters;u.order='move';u.tx=spot.x;u.tz=spot.z;u.workReason='Carrying a peace proposal to a known neighboring society';return {accepted:true as const,missionId:m.id,actorId:u.id};
  }
 }return refusal(g,team,partner,'peace','Need an available adult at a cache, paid travel provisions and a known reachable partner');
}
function returnMission(g:Game,m:RivalMission,reason:string){if(m.phase==='returning'||!active(m))return;m.phase='returning';m.blockedReason=reason;for(const a of m.actors){const u=g.state.units.find(u=>u.id===a.id&&u.hp>0);if(u){u.target=null;u.pillage=-1;u.attackDestination=null;u.order='return';u.recalled=true;u.workReason=reason;}}recordRivalActivity(g,{team:m.team,partner:m.partner,kind:m.kind,stage:'returning',missionId:m.id,reason});}
/** Cleanup hook on an explicit override. The mission and paid carried pack
 * remain owned by the same person; a new assignment cannot duplicate them. */
export function cancelSocietyMission(g:Game,u:Unit){if(!u.societyMissionId)return false;const id=(u as RivalActivityUnit).societyMissionId,m=state(g).rivalMissions?.find(m=>m.id===id&&active(m));if(!m)return false;m.phase='suspended';m.blockedReason='Explicit order suspended the journey; carried provisions remain with the same person';recordRivalActivity(g,{team:m.team,partner:m.partner,kind:m.kind,stage:'cancelled',missionId:m.id,actorIds:[u.id],reason:m.blockedReason});return true;}
export function resumeSocietyMission(g:Game,id:number){const m=state(g).rivalMissions?.find(m=>m.id===id&&m.phase==='suspended');if(!m||m.actors.some(a=>{const u=g.state.units.find(u=>u.id===a.id&&u.hp>0&&u.team===m.team);return !u||u.emergency||u.prisoner||u.jobLock||u.conflictIntent==='occupy'||u.conflictIntent==='capture'||!['idle','hold'].includes(u.order)||hasTaskCommitment({...u,societyMissionId:undefined} as RivalActivityUnit);}))return false;m.phase='returning';m.blockedReason='Resuming the physical return with remaining provisions';return true;}
/** Physical packs keep feeding the same person even after an explicit interruption.
 * Call once per tick; ordinary remote-store needs must exclude this actor. */
export function tickSocietyMissionNeeds(g:Game,dt:number){
 if(!Number.isFinite(dt)||dt<=0)return;
 for(const m of state(g).rivalMissions||[]){if(!active(m)||m.kind!=='peace')continue;const u=g.state.units.find(u=>u.id===m.actors[0]?.id&&u.hp>0&&u.team===m.team);if(!u)continue;
  const demand=FOOD_PER_PERSON_SECOND*dt,waterDemand=g.state.survivalVersion===1?RIVAL_ACTIVITY_RULES.waterPerSecond*dt:0,food=Math.min(m.food,demand),water=Math.min(m.waterLiters,waterDemand);m.food-=food;m.waterLiters-=water;
  recordRivalActivity(g,{team:m.team,partner:m.partner,kind:m.kind,stage:'food_used',amount:food,missionId:m.id});recordRivalActivity(g,{team:m.team,partner:m.partner,kind:m.kind,stage:'water_used',amount:water,missionId:m.id});
  const stock=g.tribe(m.team).survival;if(stock)stock.waterConsumedLiters+=water;
  const hunger=u.hunger||0,thirst=u.thirstSeconds||0;u.hunger=Math.max(0,hunger+(food+1e-9<demand?dt:-dt*3));u.thirstSeconds=Math.max(0,thirst+(water+1e-9<waterDemand?dt:-dt*3));
  const hungerExposure=Math.max(0,u.hunger-RIVAL_ACTIVITY_RULES.foodGraceSeconds)-Math.max(0,hunger-RIVAL_ACTIVITY_RULES.foodGraceSeconds),thirstExposure=Math.max(0,u.thirstSeconds-RIVAL_ACTIVITY_RULES.waterGraceSeconds)-Math.max(0,thirst-RIVAL_ACTIVITY_RULES.waterGraceSeconds);u.hp=Math.max(0,u.hp-Math.max(0,hungerExposure)*u.maxHp/160-Math.max(0,thirstExposure)*u.maxHp/1800);
  if(m.phase!=='suspended'&&(u.hunger>RIVAL_ACTIVITY_RULES.foodGraceSeconds||u.thirstSeconds>RIVAL_ACTIVITY_RULES.waterGraceSeconds))returnMission(g,m,'Travel provisions exhausted; returning with the same messenger');
 }
}
export function societyMissionIndependentNeeds(g:Game,u:Unit){const m=actorMission(g,u);return !!m&&m.kind==='peace'&&active(m);}
/** This adapter must precede ordinary worker AI, with its actors registered in
 * commitments and excluded from remote food/water consumption by the caller. */
export function societyMissionAI(g:Game,u:Unit,dt:number){
 if(!u.societyMissionId)return false;
 const m=actorMission(g,u);if(!m||!active(m)||!Number.isFinite(dt)||dt<=0)return false;
 if(m.kind==='raid'&&m.phase!=='returning')return false;
 if(m.phase==='suspended'||u.emergency)return false;
 if(m.phase!=='returning'&&g.state.time-m.createdAt>RIVAL_ACTIVITY_RULES.maximumJourneySeconds)returnMission(g,m,'Journey time limit reached — returning the same resident');
 const returning=m.phase==='returning',target=returning?supplyDrops(g,m.team).sort((a,b)=>distance(u,a)-distance(u,b)).find(d=>!!supplyApproach(g,u,d)):supplyDrops(g,m.partner).find(d=>d.kind==='camp'?m.targetId===-m.partner-1:d.id===m.targetId);
 const spot=target&&supplyApproach(g,u,target);if(!target||!spot){if(!returning){returnMission(g,m,'Partner or route lost — returning with paid supplies');return true;}m.blockedReason='No reachable cache or settlement entrance';u.order='hold';return true;}
 u.tx=spot.x;u.tz=spot.z;u.target=null;u.order=returning?'return':'move';
 if(!supplyReached(g,u,target,spot)){g.steer(u,dt);return true;}
 if(returning){
  deliverWaterCargo(g,u);
  if(u.carry>0&&u.carryType){const kind=u.carryType,amount=u.carry;recordSimulationEvent(g,'cargo_delivered',u.team,kind,amount,u.id);deliverSamples(g,u);if(kind==='food')receiveFood(g,u.team,amount,u.carryFood);else g.tribe(u.team)[kind]+=amount;recordHaulDelivery(g,u);recordRivalActivity(g,{team:m.team,partner:m.partner,kind:m.kind,stage:'goods_delivered',amount,missionId:m.id,actorIds:[u.id],reason:kind});u.carry=0;u.carryType=null;u.carryFood=undefined;}
  if(m.kind==='peace'){receiveFood(g,m.team,m.food);const stock=g.tribe(m.team).survival;if(stock)stock.waterLiters+=m.waterLiters;m.food=0;m.waterLiters=0;}
  const actor=m.actors.find(a=>a.id===u.id)!;actor.returned=true;(u as RivalActivityUnit).societyMissionId=undefined;u.order='idle';u.recalled=false;u.workReason='Journey completed — physically home';recordRivalActivity(g,{team:m.team,partner:m.partner,kind:m.kind,stage:'actors_returned',missionId:m.id,actorIds:[u.id]});g.workBoard.reset();return true;
 }
 const receiver=g.state.units.find(p=>p.team===m.partner&&p.hp>0&&!p.prisoner&&!isDependent(g,p)&&distance(p,u)<=RIVAL_ACTIVITY_RULES.contactMeters&&distance(p,target)<=RIVAL_ACTIVITY_RULES.contactMeters+('w'in target?Math.max(target.w,target.d)*.5:target.radius));
 if(!receiver){m.blockedReason='Waiting for a living local representative';return true;}
 if(m.phase!=='contact'){m.phase='contact';recordSocietyContact(g,u,receiver);recordRivalActivity(g,{team:m.team,partner:m.partner,kind:m.kind,stage:'contact',missionId:m.id,actorIds:[u.id]});}
 m.talkSeconds+=dt;if(m.talkSeconds<RIVAL_ACTIVITY_RULES.talkSeconds)return true;
 const refused=societyRelation(g,m.partner,m.team).grievance>.85||g.state.units.some(p=>p.team===m.partner&&p.hp>0&&p.order==='attack'&&p.target===u&&distance(p,u)<RIVAL_ACTIVITY_RULES.contactMeters);
 m.resolved=!refused&&acceptSocietyPeace(g,u,receiver);recordRivalActivity(g,{team:m.team,partner:m.partner,kind:m.kind,stage:'resolved',missionId:m.id,reason:m.resolved?'Truce accepted at physical contact':'Local representatives refused the proposal'});returnMission(g,m,m.resolved?'Truce witnessed — carrying the result home':'Peace refused — returning with remaining provisions');return true;
}
/** Observe executor outcomes rather than counting utility calculations as raids. */
export function tickRivalActivity(g:Game){
 for(const m of state(g).rivalMissions||[]){if(!active(m))continue;
  const target=g.state.buildings.find(b=>b.id===m.targetId);
  for(const a of m.actors){if(a.lost||a.returned)continue;const u=g.state.units.find(u=>u.id===a.id&&u.hp>0&&u.team===m.team);
   if(!u){const captured=g.state.units.find(person=>person.id===a.id&&person.hp>0&&person.prisoner);if(m.kind==='peace'&&captured?.prisoner){(captured as RivalActivityUnit).societyMissionId=undefined;captured.prisoner.food+=m.food;captured.prisoner.waterLiters+=m.waterLiters;const stock=g.tribe(m.team).survival;if(stock)stock.waterLostLiters+=m.waterLiters;m.food=0;m.waterLiters=0;}a.lost=true;recordRivalActivity(g,{team:m.team,partner:m.partner,kind:m.kind,stage:'actors_lost',missionId:m.id,actorIds:[a.id],reason:captured?'The same captured person retains carried provisions':'Actor died or is missing'});continue;}
   if(m.phase!=='suspended')recordRivalActivity(g,{team:m.team,partner:m.partner,kind:m.kind,stage:'meters',amount:distance(u,{x:a.lastX,z:a.lastZ}),missionId:m.id});a.lastX=u.x;a.lastZ=u.z;
   if(m.kind==='raid'&&m.phase==='outbound'){const contact=g.state.units.find(other=>other.team===m.partner&&other.hp>0&&distance(u,other)<=RIVAL_ACTIVITY_RULES.contactMeters)||(target&&target.hp>0&&distance(u,target)<=RIVAL_ACTIVITY_RULES.contactMeters+Math.max(target.w,target.d)*.5?target:undefined);if(contact){recordSocietyContact(g,u,contact);declareSocietyHostility(g,m.team,m.partner);m.phase='contact';recordRivalActivity(g,{team:m.team,partner:m.partner,kind:m.kind,stage:'contact',missionId:m.id,actorIds:[u.id]});}}
  }
  if(m.kind==='raid'&&m.phase!=='returning'&&m.phase!=='suspended'&&!societiesAreFoes(g,m.team,m.partner)&&societyRelation(g,m.team,m.partner).peaceUntil>g.state.time&&societyRelation(g,m.partner,m.team).peaceUntil>g.state.time)returnMission(g,m,'Pair truce agreed — physically withdrawing this party');
  const loaded=m.kind==='raid'&&m.actors.some(a=>{const u=g.state.units.find(u=>u.id===a.id&&u.hp>0);return !!u&&u.carry>0;});
  if(m.kind==='raid'&&m.phase!=='returning'&&m.phase!=='suspended'&&(loaded||!target||target.hp<=0||!g.tribe(m.partner).alive||g.state.time-m.createdAt>RIVAL_ACTIVITY_RULES.maximumJourneySeconds)){m.resolved=loaded||!!target&&target.hp<=0;recordRivalActivity(g,{team:m.team,partner:m.partner,kind:m.kind,stage:'resolved',missionId:m.id,reason:loaded?'Finite goods loaded; delivery is counted separately':m.resolved?'The targeted structure was destroyed; delivery is counted separately':'Target lost or journey limit reached'});returnMission(g,m,'Raid ended — withdrawing surviving residents');}
  if(m.actors.every(a=>a.returned||a.lost)){m.phase=m.actors.some(a=>a.returned)?'completed':'lost';recordRivalActivity(g,{team:m.team,partner:m.partner,kind:m.kind,stage:m.phase==='completed'?'returned':'lost',missionId:m.id,actorIds:m.actors.filter(a=>a.returned).map(a=>a.id)});if(m.kind==='peace'&&m.phase==='lost'){const stock=g.tribe(m.team).survival;if(stock)stock.waterLostLiters+=m.waterLiters;m.food=0;m.waterLiters=0;}}
 }
}

/** Strict optional save extension. Missing/dead actors remain valid so cleanup
 * can measure real losses; duplicate live ownership is never accepted. */
export function validRivalActivityState(value:unknown,tribeCount:number){
 if(!value||typeof value!=='object')return false;const s=value as RivalActivityState;
 const finite=(v:unknown)=>typeof v==='number'&&Number.isFinite(v),id=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>0;
 const team=(v:unknown)=>Number.isInteger(v)&&Number(v)>=0&&Number(v)<tribeCount;
 const kinds=['raid','peace'],stages=['reviewed','blocked','feasible','departed','contact','resolved','returning','returned','lost','cancelled','meters','food_used','water_used','goods_delivered','actors_returned','actors_lost'];
 if(s.rivalActivity!==undefined){const j=s.rivalActivity;if(!j||j.version!==1||!j.totals||typeof j.totals!=='object'||Array.isArray(j.totals)||Object.keys(j.totals).length>tribeCount*tribeCount*kinds.length*stages.length||!Array.isArray(j.recent)||j.recent.length>RIVAL_ACTIVITY_RULES.recentLimit)return false;
  for(const [key,n]of Object.entries(j.totals)){const [from,to,kind,stage,...extra]=key.split(':');if(extra.length||!/^(0|[1-9][0-9]*)$/.test(from)||!/^(0|[1-9][0-9]*)$/.test(to)||!team(Number(from))||!team(Number(to))||!kinds.includes(kind)||!stages.includes(stage)||!finite(n)||n<0)return false;}
  for(const e of j.recent)if(!e||!team(e.team)||!team(e.partner)||!kinds.includes(e.kind)||!stages.includes(e.stage)||!finite(e.amount)||e.amount<=0||!finite(e.timeSeconds)||e.timeSeconds<0||e.missionId!==undefined&&!id(e.missionId)||e.actorIds!==undefined&&(!Array.isArray(e.actorIds)||e.actorIds.length>32||e.actorIds.some(v=>!id(v))||new Set(e.actorIds).size!==e.actorIds.length)||e.reason!==undefined&&(typeof e.reason!=='string'||e.reason.length>500))return false;
 }
 if(s.rivalActivityNextReview!==undefined){if(!Array.isArray(s.rivalActivityNextReview)||s.rivalActivityNextReview.length>tribeCount)return false;const seen=new Set<number>();for(const r of s.rivalActivityNextReview){if(!r||!team(r.team)||r.team===0||r.team===3||seen.has(r.team)||!finite(r.timeSeconds)||r.timeSeconds<0)return false;seen.add(r.team);}}
 if(s.rivalMissions===undefined)return !Array.isArray((value as {units?:RivalActivityUnit[]}).units)||(value as {units:RivalActivityUnit[]}).units.every(u=>u.societyMissionId===undefined);if(!Array.isArray(s.rivalMissions)||s.rivalMissions.length>RIVAL_ACTIVITY_RULES.maximumMissions)return false;
 const ids=new Set<number>(),owners=new Set<number>();for(const m of s.rivalMissions){
  if(!m||!id(m.id)||ids.has(m.id)||!team(m.team)||!team(m.partner)||m.team===m.partner||m.team===3||m.partner===3||!kinds.includes(m.kind)||!(id(m.targetId)||m.kind==='peace'&&m.targetId===-m.partner-1)||!['outbound','contact','returning','suspended','completed','lost'].includes(m.phase)||!Array.isArray(m.actors)||!m.actors.length||m.actors.length>32||m.kind==='peace'&&m.actors.length!==1||![m.createdAt,m.talkSeconds,m.food,m.waterLiters].every(n=>finite(n)&&n>=0)||m.food>10000||m.waterLiters>1000||typeof m.resolved!=='boolean'||m.blockedReason!==undefined&&(typeof m.blockedReason!=='string'||m.blockedReason.length>500))return false;ids.add(m.id);const actors=new Set<number>();
  for(const a of m.actors){if(!a||!id(a.id)||actors.has(a.id)||!finite(a.lastX)||!finite(a.lastZ)||a.lost!==undefined&&typeof a.lost!=='boolean'||a.returned!==undefined&&typeof a.returned!=='boolean'||a.lost&&a.returned)return false;actors.add(a.id);if(active(m)&&!a.lost&&!a.returned){if(owners.has(a.id))return false;owners.add(a.id);}}
 }
 const units=(value as {units?:RivalActivityUnit[]}).units;if(units!==undefined){if(!Array.isArray(units))return false;for(const m of s.rivalMissions)if(active(m))for(const a of m.actors){const u=units.find(u=>u.id===a.id);if(u&&u.hp>0&&!a.lost&&!a.returned&&u.societyMissionId!==m.id)return false;}for(const u of units){if(u.societyMissionId===undefined)continue;if(!id(u.societyMissionId))return false;const m=s.rivalMissions.find(m=>m.id===u.societyMissionId);if(!m||!m.actors.some(a=>a.id===u.id))return false;if(u.hp>0&&active(m)&&!m.actors.some(a=>a.id===u.id&&a.lost)&&u.team!==m.team)return false;}}
 return true;
}

/** Ordinary target selection honors a messenger's declared parley toward its
 * recipient only. Explicit attacks and unrelated societies receive no immunity. */
export function isSocietyPeaceMessengerFor(g:Game,u:Unit,recipient:number){const m=actorMission(g,u);return !!m&&m.kind==='peace'&&m.partner===recipient&&m.team===u.team&&(m.phase==='outbound'||m.phase==='contact');}
export function rivalPairActivityStatus(g:Game,team:number,partner:number,kind:RivalActivityKind){
 const totals=state(g).rivalActivity?.totals||{},value=(stage:RivalActivityStage)=>totals[`${team}:${partner}:${kind}:${stage}`]||0;
 const departures=value('departed');return {reviews:value('reviewed'),blocked:value('blocked'),departures,contacts:value('contact'),resolved:value('resolved'),returned:value('returned'),actorsReturned:value('actors_returned'),actorsLost:value('actors_lost'),meters:value('meters'),goodsDelivered:value('goods_delivered'),contactRate:departures?value('contact')/departures:null,returnRate:departures?value('returned')/departures:null};
}

/** A bounded review uses only known partners. It runs before discretionary
 * development so the same adult cannot be borrowed by two independent plans. */
export function reviewRivalSocietyActivity(g:Game,team:number,reserve:number){
 if(!isRivalTeam(team)||!g.tribe(team)?.alive||g.state.time<RIVAL_ACTIVITY_RULES.firstReviewSeconds)return false;
 const reviews=state(g).rivalActivityNextReview??=[];let review=reviews.find(r=>r.team===team);if(review&&review.timeSeconds>g.state.time)return false;if(!review){review={team,timeSeconds:0};reviews.push(review);}review.timeSeconds=g.state.time+RIVAL_ACTIVITY_RULES.reviewSeconds;
 const partners=knownPartners(g,team),t=g.tribe(team);
 if(state(g).rivalMissions?.some(m=>m.team===team&&active(m)))return false;
 for(const other of partners.filter(other=>other!==0&&societiesAreFoes(g,team,other))){
  const recent=state(g).rivalMissions?.some(m=>m.team===team&&m.partner===other&&m.kind==='peace'&&g.state.time-m.createdAt<RIVAL_ACTIVITY_RULES.peaceRetrySeconds);
  if(!recent&&(t.aggro<.55||reserve<450||g.state.time<(t.recoveryUntil||0))&&dispatchSocietyPeace(g,team,other).accepted)return true;
 }
 if(g.state.time<(t.recoveryUntil||0))return false;
 const assessment=assessRivalPairRaid(g,team,reserve);if(!assessment.plan)return false;const partner=assessment.plan.target.team;
 if(state(g).rivalMissions?.some(m=>m.team===team&&m.partner===partner&&m.kind==='raid'&&g.state.time-m.createdAt<RIVAL_ACTIVITY_RULES.raidRecoverySeconds))return false;
 return dispatchPairRaid(g,team,reserve,partner).accepted;
}
