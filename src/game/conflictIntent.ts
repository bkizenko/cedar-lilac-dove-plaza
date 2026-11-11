import{raidMayTargetBuilding,raidMayTargetCivilian}from'./raidIntent';
import{prepareOwnedHandover}from'./communityHandover';
import{reconcileWaterCargoEvidence}from'./boatPractice';
import{adoptHerdWaterLoad,reconcilePenWater}from'./penWater';
import {pauseHaulageWork} from './haulage';
import {workRuntime} from './workRuntime';
import type {Game} from './sim';
import type {Unit,Building} from './types';
import {isDependent} from './settlement';
import {acceptPrisonerSurrender,type PrisonerUnit} from './captivity';
import {recordConflict} from './conflictMetrics';
import {queueStandDown} from './demobilization';
import {capitulationYielded,tickCapitulation,validCapitulationState} from './capitulation';
import {createDomination,dominationCarrierAI,dominationGarrisonAI,tickDomination,validDominationState,dominations,type DominationTerms} from './domination';
import {tickAlliances,allianceReliefAI,validAllianceState} from './alliances';
import {captiveDealingsAI,tickCaptiveDealings,validCaptiveDealingsState} from './captiveDealings';
export type ConflictIntent='loot'|'capture'|'occupy'|'dominate';
export type ConflictUnit=Unit&{conflictIntent?:ConflictIntent;captureTargetId?:number};
export type OccupationControl={id:number;hallId:number;formerTeam:number;controllerTeam:number;buildingIds:number[];residentIds:number[];guardIds:number[];phase:'approaching'|'holding'|'held'|'integrated'|'contested'|'withdrawn'|'dominated';integratedAt?:number;holdSeconds:number;createdAt:number;blockedReason?:string};
type ConflictState=Game['state']&{occupations?:OccupationControl[]};
export const CONFLICT_RULES={version:1,controlRadiusMeters:16,settlementScopeMeters:40,controlHoldSeconds:30,minimumGuards:1,surrenderApproachMeters:5,surrenderMooringMeters:24} as const;
const controls=(g:Game)=>(g.state as ConflictState).occupations??((g.state as ConflictState).occupations=[]);
// A concealed, badly wounded retreating defender cannot project control over
// the hall. Healthy sheltered guards and anyone actively attacking still resist.
const defendsControl=(g:Game,u:Unit,team:number,opponent:number)=>!capitulationYielded(g,u)&&(armed(g,u,team)&&!(u.shelterId!==undefined&&!!u.emergency&&u.hp<u.maxHp*.3&&u.order!=='attack'&&g.state.buildings.some(b=>b.id===u.shelterId&&b.team===team&&g.finished(b)&&g.buildingWorkReached(u,b))))||u.team===team&&u.hp>0&&!isDependent(g,u)&&u.order==='attack'&&u.target?.team===opponent;
const armed=(g:Game,u:Unit,team:number)=>u.team===team&&u.hp>0&&!isDependent(g,u)&&!(u as PrisonerUnit).prisoner&&(u.militia||!['worker','leader'].includes(u.type));
/** Intent follows contextual orders, without a mandatory departure modal. */
export function setPartyIntent(g:Game,actors:Unit[],intent:ConflictIntent){
 for(const actor of actors){g.interruptMission(actor);const u=actor as ConflictUnit;u.conflictIntent=intent;u.captureTargetId=undefined;u.pillage=-1;u.returnAfterCombat=undefined;u.target=null;u.node=null;u.order='hold';recordConflict(g,'context_order',u.team,1,{actorId:u.id,reason:intent});}
}
export function missionMayTargetBuilding(_g:Game,actor:Unit,target:Building){
 if(!raidMayTargetBuilding(actor,target))return false;
 const intent=(actor as ConflictUnit).conflictIntent;
 if(intent==='capture')return false;
 if(intent==='occupy'||intent==='loot')return ['palisade','stonewall','gate','watchtower','keep'].includes(target.type);
 return true;
}
export function missionMayTargetCivilian(_g:Game,actor:Unit,target:Unit){
 if(!raidMayTargetCivilian(actor,target))return false;
 const prisoner=(target as PrisonerUnit).prisoner;
 if(prisoner&&prisoner.phase!=='released'&&(prisoner.captorTeam===actor.team||prisoner.originTeam===actor.team))return false;
 const u=actor as ConflictUnit;if(u.conflictIntent==='capture'&&u.captureTargetId===target.id)return false;
 const activeThreat=target.order==='attack'&&target.target?.team===actor.team&&target.target.hp>0&&Math.hypot(target.x-target.target.x,target.z-target.target.z)<=Math.max(6,target.range+3);
 return !((u.conflictIntent==='occupy'||u.conflictIntent==='loot')&&target.type==='worker'&&!target.militia&&!activeThreat);
}
/** Capture is a deliberate approach/surrender task, distinct from a lethal attack. */
export function captureTarget(g:Game,id:number){
 const target=g.state.units.find(u=>u.id===id&&u.hp>0);
 if(!target||target.team===0||target.type!=='worker'||target.militia||isDependent(g,target)||(target as PrisonerUnit).prisoner)return {accepted:false,reason:'Choose a living unarmed adult who can surrender'};
 if(!g.visibleAt(target.x,target.z))return {accepted:false,reason:'Reach and see the person before seeking surrender'};
 const actors=g.selectedUnits().filter(u=>armed(g,u,0)&&!u.boat);
 if(!actors.length)return {accepted:false,reason:'Select armed adults to approach the person'};
 if(!actors.some(u=>g.workBoard.connected(g,u.x,u.z,target.x,target.z)))return {accepted:false,reason:'No reachable land route to the person'};
 setPartyIntent(g,actors,'capture');
 for(const actor of actors){const u=actor as ConflictUnit;u.captureTargetId=id;u.order='move';u.tx=target.x;u.tz=target.z;u.workReason='Approaching to demand surrender; no lethal attack ordered';}
 return {accepted:true,reason:'Approaching to obtain surrender',actors:actors.map(u=>u.id)};
}
/** Run before combat AI for people with a deliberate capture order. */
export function captureIntentAI(g:Game,person:Unit,dt:number){
 const u=person as ConflictUnit;if(u.conflictIntent!=='capture'||u.captureTargetId===undefined)return false;
 const target=g.state.units.find(p=>p.id===u.captureTargetId&&p.hp>0);
 if(!target||(target as PrisonerUnit).prisoner){u.captureTargetId=undefined;u.order='hold';u.workReason=target?'Surrender accepted — guard escort is taking over':'Capture target lost';return false;}
 if(u.hp<=0||u.emergency)return false;
 u.target=null;u.node=null;
 if(Math.hypot(u.x-target.x,u.z-target.z)>CONFLICT_RULES.surrenderApproachMeters){
  if(!g.workBoard.connected(g,u.x,u.z,target.x,target.z)){u.order='hold';u.workReason='Capture approach blocked — clear a route or withdraw';return true;}
  const spot=g.nearestWalk(u,target.x,target.z);if(!spot){u.order='hold';u.workReason='No reachable surrender approach';return true;}
  u.order='move';u.tx=spot.x;u.tz=spot.z;g.steer(u,dt);return true;
 }
 const result=acceptPrisonerSurrender(g,target,u.team);u.order='hold';u.workReason=result.reason;
 if(result.accepted)for(const actor of g.state.units){const member=actor as ConflictUnit;if(member.captureTargetId===target.id){member.captureTargetId=undefined;member.conflictIntent=undefined;}}
 return true;
}
/** Contextual control order: keep a living village intact rather than pillaging it. */
export function secureVillage(g:Game,hallId:number){
 const hall=g.state.buildings.find(b=>b.id===hallId&&b.hp>0&&b.type==='townhall'&&b.team!==0&&!b.plannedCost);
 if(!hall||!g.exploredAt(hall.x,hall.z))return {accepted:false,reason:'Discover a living settlement hall before securing it'};
 const selected=g.selectedUnits().filter(u=>armed(g,u,0)&&!u.boat);
 const guards=selected.length?selected:g.state.units.filter(u=>armed(g,u,0)&&!u.boat&&Math.hypot(u.x-hall.x,u.z-hall.z)<=CONFLICT_RULES.controlRadiusMeters);
 if(!guards.length)return {accepted:false,reason:'Bring armed adults to the village or select a party to approach it'};
 if(!guards.some(u=>g.interactionSpot(u,hall)))return {accepted:false,reason:'No reachable entrance to the village control point'};
 setPartyIntent(g,guards,'occupy');
 let control=controls(g).find(c=>c.hallId===hall.id&&c.controllerTeam===0&&c.phase!=='withdrawn'&&c.phase!=='integrated'&&c.phase!=='dominated');
 if(!control){
  const buildingIds=g.connectedCamp(hall).filter(b=>Math.hypot(b.x-hall.x,b.z-hall.z)<=CONFLICT_RULES.settlementScopeMeters).map(b=>b.id);
  const residentIds=g.state.units.filter(u=>u.team===hall.team&&(u.homeHall===hall.id||u.homeHall===undefined&&Math.hypot(u.x-hall.x,u.z-hall.z)<=CONFLICT_RULES.settlementScopeMeters)).map(u=>u.id);
  control={id:g.id(),hallId:hall.id,formerTeam:hall.team,controllerTeam:0,buildingIds,residentIds,guardIds:guards.map(u=>u.id),phase:'approaching',holdSeconds:0,createdAt:g.state.time};controls(g).push(control);
 }else control.guardIds=[...new Set([...control.guardIds,...guards.map(u=>u.id)])];
 for(const guard of guards){const spot=g.interactionSpot(guard,hall)!;guard.order='move';guard.tx=spot.x;guard.tz=spot.z;guard.workReason='Securing the living village — protected buildings stay intact';}
 return {accepted:true,reason:'Approaching to secure local control',occupationId:control.id};
}
export function occupationActorAI(g:Game,u:Unit,dt:number){
 if(dominationCarrierAI(g,u,dt)||captiveDealingsAI(g,u,dt)||dominationGarrisonAI(g,u,dt)||allianceReliefAI(g,u,dt))return true;
 if((u as ConflictUnit).conflictIntent!=='occupy'||u.emergency)return false;
 const control=controls(g).find(c=>c.phase!=='withdrawn'&&c.guardIds.includes(u.id));if(!control)return false;
 const hall=g.state.buildings.find(b=>b.id===control.hallId&&b.hp>0);if(!hall)return false;
 if(u.target?.kind==='unit'&&u.target.hp>0&&u.target.type!=='worker')return false;
 if(Math.hypot(u.x-hall.x,u.z-hall.z)<=CONFLICT_RULES.controlRadiusMeters){u.order='hold';u.workReason=control.phase==='held'?'Garrison holding the village':'Holding the village control point';return false;}
 const spot=g.interactionSpot(u,hall);if(!spot){u.order='hold';u.workReason='Village approach blocked — no reachable entrance';return true;}
 u.order='move';u.tx=spot.x;u.tz=spot.z;g.steer(u,dt);return true;
}
/** Physical control is separate from legal ownership; no remote annexation/goods. */
export function tickOccupation(g:Game,dt:number){
 if(!Number.isFinite(dt)||dt<=0)return;
 for(const control of controls(g)){
  if(control.phase==='withdrawn'||control.phase==='integrated'||control.phase==='dominated')continue;
  const hall=g.state.buildings.find(b=>b.id===control.hallId&&b.hp>0);
  if(!hall||hall.team!==control.formerTeam){control.phase='contested';control.holdSeconds=0;control.blockedReason=!hall?'Control point lost':'Village ownership changed';continue;}
  const guards=g.state.units.filter(u=>control.guardIds.includes(u.id)&&armed(g,u,control.controllerTeam)&&(u as ConflictUnit).conflictIntent==='occupy'&&Math.hypot(u.x-hall.x,u.z-hall.z)<=CONFLICT_RULES.controlRadiusMeters);
  const defenders=g.state.units.filter(u=>defendsControl(g,u,control.formerTeam,control.controllerTeam)&&Math.hypot(u.x-hall.x,u.z-hall.z)<=CONFLICT_RULES.controlRadiusMeters);
  if(guards.length&&control.controllerTeam===0&&!g.tribe(control.formerTeam).hostile)g.makeHostile(control.formerTeam);
  if(guards.length<CONFLICT_RULES.minimumGuards||defenders.length){
   if(control.phase!=='contested')recordConflict(g,'occupation_contested',control.controllerTeam,1,{targetId:hall.id});
   control.phase='contested';control.holdSeconds=0;control.blockedReason=!guards.length?'No present garrison controls the village':'Local defenders still contest control';continue;
  }
  if(control.phase!=='held')control.phase='holding';control.blockedReason=undefined;
  control.holdSeconds=Math.min(CONFLICT_RULES.controlHoldSeconds,control.holdSeconds+dt);recordConflict(g,'control_seconds',control.controllerTeam,dt,{targetId:hall.id});
  if(control.holdSeconds>=CONFLICT_RULES.controlHoldSeconds&&control.phase!=='held'){control.phase='held';recordConflict(g,'occupation_secured',control.controllerTeam,1,{targetId:hall.id});}
 }
 // Societies-owned follow-on systems ride this existing hook (no new sim.ts wiring).
 if(Math.floor(g.state.time)!==Math.floor(g.state.time-dt)){tickAlliances(g);tickCapitulation(g);tickDomination(g);tickCaptiveDealings(g);tickConflictStandDown(g);}
}
export function withdrawOccupation(g:Game,id:number){const control=controls(g).find(c=>c.id===id);if(!control||control.phase==='withdrawn'||control.phase==='integrated'||control.phase==='dominated')return false;control.phase='withdrawn';for(const u of g.state.units)if(control.guardIds.includes(u.id)&&(u as ConflictUnit).conflictIntent==='occupy'){(u as ConflictUnit).conflictIntent=undefined;u.pillage=-1;u.target=null;if(u.militia)queueStandDown(g,u);else{u.order='return';u.recalled=true;}u.workReason='Withdrawing from occupation with possessions';}recordConflict(g,'occupation_withdrawn',control.controllerTeam,1,{targetId:control.hallId});return true;}
/** Dispatcher hook for an explicit override; preserve the custody status itself. */
export function releaseConflictAssignment(g:Game,u:Unit){const actor=u as ConflictUnit;actor.conflictIntent=undefined;actor.captureTargetId=undefined;for(const person of g.state.units){const p=(person as PrisonerUnit).prisoner;if(p&&p.phase!=='released'&&p.guardId===u.id)p.guardId=undefined;}for(const c of controls(g))if(c.guardIds.includes(u.id))c.guardIds=c.guardIds.filter(id=>id!==u.id);}

export function validConflictIntentState(state:unknown){
 if(!state||typeof state!=='object')return false;
 const s=state as ConflictState;if(!Array.isArray(s.units)||!Array.isArray(s.tribes))return false;
 const id=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>0;
 const ids=(v:unknown,max:number)=>Array.isArray(v)&&v.length<=max&&v.every(id)&&new Set(v).size===v.length;
 for(const person of s.units){const u=person as ConflictUnit;if(u.conflictIntent!==undefined&&!['loot','capture','occupy','dominate'].includes(u.conflictIntent))return false;if(u.captureTargetId!==undefined&&(!id(u.captureTargetId)||u.conflictIntent!=='capture'))return false;}
 if(s.occupations===undefined)return validCapitulationState(s)&&validDominationState(s)&&validCaptiveDealingsState(s)&&validAllianceState(s);
 if(!Array.isArray(s.occupations)||s.occupations.length>1024)return false;
 const seen=new Set<number>(),activeSites=new Set<string>();for(const c of s.occupations){
  if(!c||!id(c.id)||seen.has(c.id)||!id(c.hallId)||!Number.isInteger(c.formerTeam)||!Number.isInteger(c.controllerTeam)||c.formerTeam<0||c.controllerTeam<0||c.formerTeam>=s.tribes.length||c.controllerTeam>=s.tribes.length||c.formerTeam===c.controllerTeam||!ids(c.buildingIds,256)||!c.buildingIds.includes(c.hallId)||!ids(c.residentIds,4096)||!ids(c.guardIds,512)||!['approaching','holding','held','integrated','contested','withdrawn','dominated'].includes(c.phase)||!Number.isFinite(c.holdSeconds)||c.holdSeconds<0||c.holdSeconds>CONFLICT_RULES.controlHoldSeconds||!Number.isFinite(c.createdAt)||c.createdAt<0||c.blockedReason!==undefined&&(typeof c.blockedReason!=='string'||c.blockedReason.length>500)||c.integratedAt!==undefined&&(!Number.isFinite(c.integratedAt)||c.integratedAt<0))return false;seen.add(c.id);const site=`${c.controllerTeam}:${c.hallId}`;if(c.phase!=='withdrawn'&&c.phase!=='integrated'&&c.phase!=='dominated'){if(activeSites.has(site))return false;activeSites.add(site);}
 }
 return validCapitulationState(s)&&validDominationState(s)&&validCaptiveDealingsState(s)&&validAllianceState(s);
}

/** Read-only contextual status; local presence is checked again on acceptance. */
export function occupationStatus(g:Game,id:number){
 const control=(g.state as ConflictState).occupations?.find(c=>c.id===id);if(!control)return {accepted:false,reason:'No recorded village control',guards:0,defenders:0,holdSeconds:0};
 const hall=g.state.buildings.find(b=>b.id===control.hallId&&b.hp>0);
 const guards=hall?g.state.units.filter(u=>control.guardIds.includes(u.id)&&armed(g,u,control.controllerTeam)&&(u as ConflictUnit).conflictIntent==='occupy'&&Math.hypot(u.x-hall.x,u.z-hall.z)<=CONFLICT_RULES.controlRadiusMeters):[];
 const defenders=hall?g.state.units.filter(u=>defendsControl(g,u,control.formerTeam,control.controllerTeam)&&Math.hypot(u.x-hall.x,u.z-hall.z)<=CONFLICT_RULES.controlRadiusMeters):[];
 const reason=control.phase==='integrated'||control.integratedAt!==undefined?'This village has already accepted local integration':control.phase==='dominated'?'This village already owes obligations under domination':!hall?'The village control point was lost':hall.team!==control.formerTeam?'Village ownership already changed':control.phase==='withdrawn'?'The occupying party withdrew':guards.length<CONFLICT_RULES.minimumGuards?'Bring a garrison to the village control point':defenders.length?'Local defenders still contest control':control.phase!=='held'?'Hold the village control point until local surrender is secured':null;
 return {accepted:reason===null,reason,phase:control.phase,guards:guards.length,defenders:defenders.length,holdSeconds:control.holdSeconds,remainingSeconds:Math.max(0,CONFLICT_RULES.controlHoldSeconds-control.holdSeconds)};
}
/** Accept the locally held village's surrender without annexing a whole society.
 * Existing objects, wounds, parent links, carried goods and paid progress persist. */
export function integrateOccupiedVillage(g:Game,id:number){
 const control=controls(g).find(c=>c.id===id),status=occupationStatus(g,id);
 if(!control||!status.accepted){if(control)control.blockedReason=status.reason||'Local surrender is not ready';return {accepted:false,reason:status.reason||'No recorded village control'};}
 const buildings=g.state.buildings.filter(b=>control.buildingIds.includes(b.id)&&b.team===control.formerTeam&&b.hp>0);
 const buildingIds=new Set(buildings.map(b=>b.id));
 const candidates=g.state.units.filter(u=>control.residentIds.includes(u.id)&&u.team===control.formerTeam&&u.hp>0&&!(u as PrisonerUnit).prisoner&&(u.homeHall===undefined||buildingIds.has(u.homeHall)));
 const candidateIds=new Set(candidates.map(u=>u.id));
 // Local surrender can transfer an entire moored vessel, never a distant or
 // mixed crew. Keeping excluded sailors with their original hull avoids a
 // remote annexation or detaching people over water merely to satisfy a save.
 const hulls=(g.state.boats||[]).filter(b=>{
  if(b.team!==control.formerTeam||b.hp<=0||b.exploration||!buildingIds.has(b.dock))return false;
  const dock=buildings.find(d=>d.id===b.dock&&d.type==='dock');if(!dock||Math.hypot(b.x-dock.x,b.z-dock.z)>CONFLICT_RULES.surrenderMooringMeters)return false;
  if(g.state.coastalVoyages?.some(v=>v.boatId===b.id&&!['complete','lost'].includes(v.phase)))return false;
  const crew=g.state.units.filter(u=>u.hp>0&&u.boat?.id===b.id);
  return crew.every(u=>candidateIds.has(u.id)&&Math.hypot(u.x-b.x,u.z-b.z)<=CONFLICT_RULES.surrenderMooringMeters&&u.order!=='move');
 });
 const hullIds=new Set(hulls.map(b=>b.id)),residents=candidates.filter(u=>!u.boat||hullIds.has(u.boat.id));
 const plan=prepareOwnedHandover(g,control.formerTeam,control.controllerTeam,{siteIds:buildings.map(b=>b.id),residentIds:residents.map(u=>u.id),boatIds:hulls.map(b=>b.id),occupationId:control.id});
 if(!plan.accepted)return{accepted:false,reason:plan.reason};
 g.commitCommunityState(plan.state);
 const paid=plan.record.productionIds.length+plan.record.haulageProjectIds.length;
 standDownGuards(g,control.guardIds,'occupy');
 recordConflict(g,'village_integrated',control.controllerTeam,1,{targetId:control.hallId});recordConflict(g,'buildings_transferred',control.controllerTeam,buildings.length,{targetId:control.hallId});recordConflict(g,'residents_transferred',control.controllerTeam,residents.length,{targetId:control.hallId});recordConflict(g,'paid_projects_transferred',control.controllerTeam,paid,{targetId:control.hallId});
 return{accepted:true,reason:'The local village joined intact; distant communities and unlocalized stores remain independent',buildings:buildings.length,residents:residents.length,paidProjects:paid,boats:hulls.length};
}

/** A securing party is not automatically a lethal threat to uninvolved local
 * residents. Actual attacks still raise the normal alarm; third parties do too. */
export function occupationProtectsCivilian(g:Game,person:Unit,actor:Unit){
 if(person.type!=='worker'||person.militia||person.order==='attack'||actor.conflictIntent!=='occupy')return false;
 return (g.state.occupations||[]).some(c=>c.phase!=='withdrawn'&&c.phase!=='integrated'&&c.formerTeam===person.team&&c.controllerTeam===actor.team&&c.residentIds.includes(person.id)&&c.guardIds.includes(actor.id));
}

/** Hold a locally secured village as a dominated community instead of annexing it:
 * ownership, buildings and residents stay with the subject; the guards become its garrison. */
export function dominateOccupiedVillage(g:Game,id:number,terms:DominationTerms='tribute'){
 const control=controls(g).find(c=>c.id===id),status=occupationStatus(g,id);
 if(!control||!status.accepted)return{accepted:false,reason:status.reason||'No recorded village control'};
 const hall=g.state.buildings.find(b=>b.id===control.hallId)!;
 const guards=g.state.units.filter(u=>control.guardIds.includes(u.id)&&armed(g,u,control.controllerTeam)&&(u as ConflictUnit).conflictIntent==='occupy'&&Math.hypot(u.x-hall.x,u.z-hall.z)<=CONFLICT_RULES.controlRadiusMeters);
 const d=createDomination(g,{overlord:control.controllerTeam,subject:control.formerTeam,hallId:hall.id,terms,garrisonIds:terms==='autonomy'?[]:guards.map(u=>u.id),origin:'occupation'});
 if(!d.accepted)return d;
 control.phase='dominated';control.blockedReason=undefined;
 if(control.controllerTeam===0)g.agreeTruce(control.formerTeam);
 for(const u of guards){const a=u as ConflictUnit;if(terms==='autonomy'){a.conflictIntent=undefined;queueStandDown(g,u);}else{a.conflictIntent='dominate';u.order='hold';u.workReason='Garrisoning a dominated community — leverage must stay present';}}
 return{accepted:true,reason:'The village stays intact and owes obligations while leverage lasts',dominationId:d.id};
}
/** Duty ended: clear the given intent and send people home to work (militia return weapons to stores). */
export function standDownGuards(g:Game,ids:number[],intent:ConflictIntent){
 for(const id of ids){const u=g.state.units.find(p=>p.id===id&&p.hp>0) as ConflictUnit|undefined;if(!u||u.conflictIntent!==intent)continue;u.conflictIntent=undefined;u.pillage=-1;u.target=null;queueStandDown(g,u);u.workReason='Duty ended — returning to village work';}
}
/** Militia/garrison stand-down sweep: anyone still marked for occupation, domination or prisoner
 * duty that no longer exists returns home. Ongoing custody keeps its guards. */
export function tickConflictStandDown(g:Game){
 const live=new Set<number>(),ended=new Set<number>(),garrison=new Set<number>(),guarding=new Set<number>();
 for(const c of controls(g))for(const id of c.guardIds)(['withdrawn','integrated','dominated'].includes(c.phase)?ended:live).add(id);
 for(const d of dominations(g))if(d.phase==='active')for(const id of d.garrisonIds)garrison.add(id);
 for(const p of g.state.units){const custody=(p as PrisonerUnit).prisoner;if(p.hp>0&&custody&&custody.phase!=='released'&&custody.guardId!==undefined)guarding.add(custody.guardId);}
 for(const person of g.state.units){const u=person as ConflictUnit;if(u.hp<=0)continue;
  // Only marks left behind by an occupation that actually ended; a party just told to secure a village keeps its order.
  if(u.conflictIntent==='occupy'&&ended.has(u.id)&&!live.has(u.id)&&!u.captureTargetId){u.conflictIntent=undefined;queueStandDown(g,u);u.workReason='Occupation ended — returning to village work';recordConflict(g,'stood_down',u.team,1,{actorId:u.id,reason:'occupation'});continue;}
  if(u.conflictIntent==='dominate'&&!garrison.has(u.id)){u.conflictIntent=undefined;queueStandDown(g,u);u.workReason='Garrison duty ended — returning to village work';recordConflict(g,'stood_down',u.team,1,{actorId:u.id,reason:'garrison'});continue;}
  // A guard whose last prisoner was released, ransomed, integrated or died.
  if((u.workReason==='Prisoner escort finished'||u.workReason==='Guarding prisoners in custody')&&!guarding.has(u.id)){if(u.escortId!==undefined&&g.state.units.some(p=>p.id===u.escortId&&p.hp>0&&(p as PrisonerUnit).prisoner?.phase!=='released'&&!!(p as PrisonerUnit).prisoner))continue;u.escortId=undefined;queueStandDown(g,u);u.workReason='Prisoner duty ended — returning to village work';recordConflict(g,'stood_down',u.team,1,{actorId:u.id,reason:'custody'});}
 }
}
