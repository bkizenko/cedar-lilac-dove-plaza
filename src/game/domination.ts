import type {Game} from './sim';
import type {Building,Unit} from './types';
import {isDependent} from './settlement';
import {hasTaskCommitment} from './workCommitments';
import {queueStandDown} from './demobilization';
import {declareSocietyHostility} from './societyRelations';
import {recordConflict} from './conflictMetrics';
import type {ConflictUnit} from './conflictIntent';
import type {PrisonerUnit} from './captivity';

/**
 * Tribute / puppet / autonomy over ONE community. Domination is sustained
 * leverage, not a one-time dialog reward:
 *  - leverage is measured every second from the overlord's armed people actually
 *    present against the subject's local armed power;
 *  - obligations (wood installments) accrue on a schedule and are carried
 *    physically by a subject resident; undelivered goods remain the subject's;
 *  - upkeep: the garrison is held at the community (off work) and the overlord
 *    owes protection — unanswered third-party threats breed resistance;
 *  - resistance rises with weak leverage, defaults and unanswered threats;
 *  - without leverage the arrangement LAPSES; at full resistance the community REBELS.
 * Buildings and residents stay with the subject throughout (no burning, no transfer).
 * Saved as optional `state.dominations` (absent = none).
 */
export type DominationTerms='tribute'|'puppet'|'autonomy';
export type DominationPhase='active'|'lapsed'|'released'|'rebelled';
export type DominationCarry={unitId:number;phase:'pickup'|'deliver'|'return';amount:number;startedAt:number};
export type Domination={id:number;overlord:number;subject:number;hallId:number;terms:DominationTerms;origin:'capitulation'|'occupation';phase:DominationPhase;createdAt:number;lastMeasuredAt:number;
 garrisonIds:number[];leverage:number;leverageLowSeconds:number;resistance:number;unansweredThreatSeconds:number;
 obligation:{kind:'wood';amount:number;intervalSeconds:number;owed:number;paid:number;dueCount:number;nextDueAt:number;forgiven:number};
 carry?:DominationCarry;endedAt?:number;endReason?:string;reason:string};
export type DominationState={version:1;list:Domination[]};
export const DOMINATION_RULES={version:1,communityRadiusMeters:40,autonomyRadiusMeters:120,
 terms:{tribute:{amount:10,intervalSeconds:120,requiredLeverage:1},puppet:{amount:6,intervalSeconds:120,requiredLeverage:.75},autonomy:{amount:4,intervalSeconds:180,requiredLeverage:.5}},
 lapseSeconds:180,resistanceLowLeverage:.4,resistanceDefault:.15,resistanceUnanswered:.3,resistanceRecovery:.05,minimumDefense:.5,civilianDefense:.25,carryTimeoutSeconds:600,maximumCarry:20,maximum:128,maximumGarrison:64} as const;
const R=DOMINATION_RULES;
const st=(g:Game)=>g.state as Game['state']&{dominations?:DominationState};
const dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const free=(u:Unit)=>u.hp>0&&!(u as PrisonerUnit).prisoner&&!u.boat;
const armed=(u:Unit)=>!!u.militia||!['worker','leader'].includes(u.type);
const cond=(u:Unit)=>Math.max(0,Math.min(1,u.hp/Math.max(1,u.maxHp)));

export function dominations(g:Game){return st(g).dominations?.list??[];}
export function activeDominationOf(g:Game,hallId:number){return dominations(g).find(d=>d.hallId===hallId&&d.phase==='active');}
export function createDomination(g:Game,o:{overlord:number;subject:number;hallId:number;terms:DominationTerms;garrisonIds:number[];origin:'capitulation'|'occupation'}){
 const hall=g.state.buildings.find(b=>b.id===o.hallId&&b.hp>0&&b.team===o.subject&&b.type==='townhall');
 if(!hall||o.overlord===o.subject||o.subject===0||o.subject===3||o.overlord===3)return{accepted:false as const,reason:'A living subject community hall is required'};
 if(activeDominationOf(g,o.hallId))return{accepted:false as const,reason:'This community already owes obligations'};
 if(o.terms!=='autonomy'&&!o.garrisonIds.length)return{accepted:false as const,reason:'Tribute and puppet terms need a present garrison'};
 const s=st(g).dominations??=(st(g).dominations={version:1,list:[]});
 while(s.list.length>=R.maximum){const i=s.list.findIndex(d=>d.phase!=='active');if(i<0)return{accepted:false as const,reason:'Too many arrangements'};s.list.splice(i,1);}
 const t=R.terms[o.terms];
 const d:Domination={id:g.id(),overlord:o.overlord,subject:o.subject,hallId:o.hallId,terms:o.terms,origin:o.origin,phase:'active',createdAt:g.state.time,lastMeasuredAt:g.state.time,
  garrisonIds:[...new Set(o.garrisonIds)].slice(0,R.maximumGarrison),leverage:0,leverageLowSeconds:0,resistance:0,unansweredThreatSeconds:0,
  obligation:{kind:'wood',amount:t.amount,intervalSeconds:t.intervalSeconds,owed:0,paid:0,dueCount:0,nextDueAt:g.state.time+t.intervalSeconds,forgiven:0},reason:'Obligations begin'};
 s.list.push(d);
 if(o.terms==='puppet'&&o.overlord===0){const sub=g.tribe(o.subject);sub.ally=true;}
 recordConflict(g,'domination_started',o.overlord,1,{targetId:o.hallId,reason:o.terms});
 return{accepted:true as const,reason:'Domination established',id:d.id};
}
/** Pure leverage measurement from bodies present now. */
export function measureLeverage(g:Game,d:Domination){
 const hall=g.state.buildings.find(b=>b.id===d.hallId);if(!hall||hall.hp<=0)return{hall,leverage:0,overlordPower:0,subjectPower:0,threats:0,overlordPresent:0};
 const radius=d.terms==='autonomy'?R.autonomyRadiusMeters:R.communityRadiusMeters;
 const over=g.state.units.filter(u=>u.team===d.overlord&&free(u)&&armed(u)&&!isDependent(g,u)&&dist(u,hall)<=radius);
 const sub=g.state.units.filter(u=>u.team===d.subject&&free(u)&&!isDependent(g,u)&&dist(u,hall)<=R.communityRadiusMeters);
 const overlordPower=over.reduce((s,u)=>s+cond(u),0),subjectPower=sub.reduce((s,u)=>s+cond(u)*(armed(u)?1:R.civilianDefense),0);
 const threats=g.state.units.filter(u=>u.team!==d.subject&&u.team!==d.overlord&&free(u)&&armed(u)&&dist(u,hall)<=R.communityRadiusMeters&&g.isFoe(u.team,d.subject)).length;
 const localOver=over.filter(u=>dist(u,hall)<=R.communityRadiusMeters).length;
 return{hall,leverage:overlordPower/Math.max(R.minimumDefense,subjectPower),overlordPower,subjectPower,threats,overlordPresent:localOver};
}
function end(g:Game,d:Domination,phase:Exclude<DominationPhase,'active'>,reason:string){
 d.phase=phase;d.endedAt=g.state.time;d.endReason=reason;d.reason=reason;
 if(d.obligation.owed>0){d.obligation.forgiven+=d.obligation.owed;d.obligation.owed=0;}
 if(d.overlord===0&&d.terms==='puppet'){const sub=g.tribe(d.subject);if(sub)sub.ally=false;}
 releaseGarrison(g,d);
 recordConflict(g,phase==='lapsed'?'domination_lapsed':phase==='rebelled'?'domination_rebelled':'domination_released',d.overlord,1,{targetId:d.hallId});
}
function releaseGarrison(g:Game,d:Domination){
 const ids=d.garrisonIds;d.garrisonIds=[];
 for(const id of ids){const u=g.state.units.find(p=>p.id===id&&p.hp>0) as ConflictUnit|undefined;if(!u||u.conflictIntent!=='dominate')continue;
  if(dominations(g).some(x=>x.phase==='active'&&x.garrisonIds.includes(u.id)))continue;
  u.conflictIntent=undefined;queueStandDown(g,u);u.workReason='Garrison duty ended — returning home to work';}
}
/** Revive a society that had been wiped from the map when one of its communities stands up again (G5 rise and fall). */
export function refoundSociety(g:Game,team:number,reason:string){
 const t=g.tribe(team);if(!t||team===0||team===3||t.alive)return false;
 if(!g.state.units.some(u=>u.team===team&&u.hp>0&&!(u as PrisonerUnit).prisoner))return false;
 t.alive=true;if(t.peaceTerm==='annexation')t.peaceTerm=undefined;
 g.banner(`${t.name} rises again: ${reason}`,6);return true;
}
export function tickDomination(g:Game){
 const list=st(g).dominations?.list;if(!list?.length)return;
 for(const d of list){
  if(d.phase!=='active')continue;
  const dt=Math.max(0,g.state.time-d.lastMeasuredAt);d.lastMeasuredAt=g.state.time;
  const hall=g.state.buildings.find(b=>b.id===d.hallId);
  if(!hall||hall.hp<=0||hall.team!==d.subject){end(g,d,'released',!hall||hall.hp<=0?'The subject community hall is gone':'The community changed hands');continue;}
  if(!g.tribe(d.overlord)?.alive&&!g.state.units.some(u=>u.team===d.overlord&&u.hp>0)){end(g,d,'lapsed','The overlord society no longer exists');continue;}
  d.garrisonIds=d.garrisonIds.filter(id=>g.state.units.some(u=>u.id===id&&u.hp>0&&u.team===d.overlord&&(u as ConflictUnit).conflictIntent==='dominate'));
  const m=measureLeverage(g,d),need=R.terms[d.terms].requiredLeverage;d.leverage=m.leverage;
  const low=m.leverage<need;
  if(low){d.leverageLowSeconds+=dt;d.resistance+=R.resistanceLowLeverage*dt;}else d.leverageLowSeconds=Math.max(0,d.leverageLowSeconds-dt);
  if(d.obligation.owed>2*d.obligation.amount)d.resistance+=R.resistanceDefault*dt;
  if(m.threats>0&&m.overlordPresent===0){d.unansweredThreatSeconds+=dt;d.resistance+=R.resistanceUnanswered*dt;}
  if(!low&&d.obligation.owed<=d.obligation.amount&&!(m.threats>0&&m.overlordPresent===0))d.resistance-=R.resistanceRecovery*dt;
  d.resistance=Math.max(0,Math.min(100,d.resistance));
  if(d.resistance>=100&&low){
   end(g,d,'rebelled','The community rose against an absent overlord');
   if(d.overlord===0)g.makeHostile(d.subject);else declareSocietyHostility(g,d.subject,d.overlord);
   refoundSociety(g,d.subject,'a dominated community threw off its overlord');continue;}
  if(d.leverageLowSeconds>=R.lapseSeconds){end(g,d,'lapsed','No leverage remained; obligations lapsed');continue;}
  d.reason=low?`Leverage weak (${m.leverage.toFixed(2)} < ${need}); lapses in ${Math.ceil(R.lapseSeconds-d.leverageLowSeconds)}s`:m.threats>0&&!m.overlordPresent?'Raiders threaten the community and no overlord force answers':'Obligations enforced by present force';
  while(g.state.time>=d.obligation.nextDueAt){d.obligation.owed+=d.obligation.amount;d.obligation.dueCount++;d.obligation.nextDueAt+=d.obligation.intervalSeconds;}
  reconcileCarry(g,d,hall);
 }
}
const carrierBusy=(g:Game,u:Unit)=>u.carry>0||hasTaskCommitment(u)||!!u.societyMissionId||u.tradeNeedsId!==undefined||!!u.tributeJourney||!!u.emergency||!!u.recalled||!!u.trade||!!u.visit||!!u.scout||!!u.expedition||!!u.envoy||!!u.foundingJourney||!!u.buildOrder||!['idle','gather','hold'].includes(u.order)||u.militia||u.type!=='worker'||isDependent(g,u)||!!(u as PrisonerUnit).prisoner||u.boat!==undefined&&u.boat!==null;
function overlordStore(g:Game,d:Domination,u:Unit){return g.state.buildings.filter(b=>b.team===d.overlord&&b.type==='townhall'&&b.hp>0&&g.finished(b)).sort((a,b)=>dist(a,u)-dist(b,u)).find(b=>!!g.interactionSpot(u,b));}
function reconcileCarry(g:Game,d:Domination,hall:Building){
 const c=d.carry;
 if(c){const u=g.state.units.find(p=>p.id===c.unitId);
  // A carrier who died with cargo leaves a real parcel owned by the subject (stolenCargo); nothing is credited.
  if(!u||u.hp<=0||u.team!==d.subject){d.carry=undefined;d.reason='Tribute carrier lost on the road';recordConflict(g,'tribute_lost',d.subject,Math.max(1,c.amount),{targetId:d.hallId});return;}
  if(g.state.time-c.startedAt>R.carryTimeoutSeconds&&c.phase!=='return'){c.phase='return';}
  return;}
 const sub=g.tribe(d.subject);if(d.obligation.owed<=0||!sub||(sub.wood||0)<1)return;
 const u=g.state.units.filter(p=>p.team===d.subject&&p.hp>0&&!carrierBusy(g,p)&&dist(p,hall)<=R.communityRadiusMeters).sort((a,b)=>dist(a,hall)-dist(b,hall)||a.id-b.id)[0];
 if(!u||!overlordStore(g,d,u))return;
 g.interruptMission(u);u.job=null;u.jobLock=false;u.node=null;u.target=null;u.order='move';d.carry={unitId:u.id,phase:'pickup',amount:0,startedAt:g.state.time};
}
/** Physical installment: pick up at the subject hall, deliver to the overlord hall, walk home. */
export function dominationCarrierAI(g:Game,u:Unit,dt:number){
 const list=st(g).dominations?.list;if(!list?.length)return false;
 const d=list.find(d=>d.phase==='active'&&d.carry?.unitId===u.id);if(!d){
  const stale=list.find(d=>d.phase!=='active'&&d.carry?.unitId===u.id);
  if(stale){const c=stale.carry!;stale.carry=undefined;if(u.carryType==='wood'&&c.phase==='deliver'){g.tribe(stale.subject).wood+=u.carry;u.carry=0;u.carryType=null;}u.order='idle';}
  return false;}
 if(u.emergency)return false;
 const c=d.carry!,home=g.state.buildings.find(b=>b.id===d.hallId)!;
 const dest=c.phase==='deliver'?overlordStore(g,d,u):home;
 if(!dest){c.phase='return';u.workReason='Tribute road blocked — bringing goods home';}
 const target=dest??home,spot=g.interactionSpot(u,target);
 if(!spot){u.order='hold';u.workReason='No reachable route for tribute';return true;}
 u.tx=spot.x;u.tz=spot.z;u.job=null;
 u.workReason=c.phase==='pickup'?'Collecting tribute at the hall':c.phase==='deliver'?`Carrying ${c.amount} tribute logs to the overlord`:'Tribute duty — walking home';
 if(!g.buildingWorkReached(u,target)){u.order='move';g.steer(u,dt);return true;}
 const sub=g.tribe(d.subject);
 if(c.phase==='pickup'){
  const amount=Math.floor(Math.min(R.maximumCarry,d.obligation.owed,Math.max(0,sub.wood||0)));
  if(amount<1){d.carry=undefined;u.order='idle';return true;}
  sub.wood-=amount;u.carry=amount;u.carryType='wood';c.amount=amount;c.phase='deliver';c.startedAt=g.state.time;return true;
 }
 if(c.phase==='deliver'){
  const amount=u.carryType==='wood'?Math.min(c.amount,u.carry,d.obligation.owed):0;
  if(amount>0){g.tribe(d.overlord).wood+=amount;d.obligation.owed-=amount;d.obligation.paid+=amount;u.carry-=amount;c.amount-=amount;recordConflict(g,'tribute_delivered',d.overlord,amount,{actorId:u.id,targetId:d.hallId});}
  if(u.carry<=0){u.carry=0;u.carryType=null;}
  c.phase='return';return true;
 }
 // Back at the subject hall: any undelivered remainder returns to the subject's own stock.
 if(u.carryType==='wood'&&u.carry>0){sub.wood+=u.carry;u.carry=0;u.carryType=null;}
 d.carry=undefined;u.order='idle';u.workReason='Tribute duty finished';return true;
}
/** Garrison holds the community (the upkeep): stays near the hall rather than working. */
export function dominationGarrisonAI(g:Game,u:Unit,dt:number){
 if((u as ConflictUnit).conflictIntent!=='dominate'||u.emergency)return false;
 const d=dominations(g).find(d=>d.phase==='active'&&d.garrisonIds.includes(u.id));if(!d)return false;
 const hall=g.state.buildings.find(b=>b.id===d.hallId&&b.hp>0);if(!hall)return false;
 if(u.target?.kind==='unit'&&u.target.hp>0)return false;
 if(dist(u,hall)<=R.communityRadiusMeters*.5){u.order='hold';u.workReason='Garrisoning a dominated community';return false;}
 const spot=g.interactionSpot(u,hall);if(!spot){u.order='hold';u.workReason='Garrison route blocked';return true;}
 u.order='move';u.tx=spot.x;u.tz=spot.z;g.steer(u,dt);u.workReason='Returning to garrison duty';return true;
}
export function releaseDomination(g:Game,id:number,actorTeam=0){const d=dominations(g).find(d=>d.id===id&&d.phase==='active'&&d.overlord===actorTeam);if(!d)return false;end(g,d,'released','The overlord released the community');return true;}
/** Adds present armed people to a garrison (reinforcement restores leverage). */
export function reinforceDomination(g:Game,id:number,unitIds:number[]){
 const d=dominations(g).find(d=>d.id===id&&d.phase==='active');if(!d)return 0;let n=0;
 for(const uid of unitIds){const u=g.state.units.find(p=>p.id===uid&&p.hp>0&&p.team===d.overlord&&armed(p)&&!(p as PrisonerUnit).prisoner);if(!u||d.garrisonIds.includes(u.id)||d.garrisonIds.length>=R.maximumGarrison)continue;
  g.interruptMission(u);(u as ConflictUnit).conflictIntent='dominate';u.pillage=-1;u.target=null;d.garrisonIds.push(u.id);n++;}
 return n;
}
export function dominationStatus(g:Game,id:number){const d=dominations(g).find(d=>d.id===id);if(!d)return null;return{id:d.id,phase:d.phase,terms:d.terms,overlord:d.overlord,subject:d.subject,hallId:d.hallId,leverage:d.leverage,required:R.terms[d.terms].requiredLeverage,resistance:d.resistance,owed:d.obligation.owed,paid:d.obligation.paid,forgiven:d.obligation.forgiven,garrison:d.garrisonIds.length,lapseIn:Math.max(0,R.lapseSeconds-d.leverageLowSeconds),reason:d.reason};}

export function validDominationState(state:unknown){
 const s=state as Game['state']&{dominations?:DominationState};if(!s||typeof s!=='object'||!Array.isArray(s.tribes)||!Array.isArray(s.units))return false;
 const v=s.dominations;if(v===undefined)return true;
 if(!v||v.version!==1||!Array.isArray(v.list)||v.list.length>R.maximum)return false;
 const fin=(n:unknown,max=1e9)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max,id=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0,team=(n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<s.tribes.length;
 const seen=new Set<number>(),activeHalls=new Set<number>(),carriers=new Set<number>();
 for(const d of v.list){
  if(!d||!id(d.id)||seen.has(d.id)||!team(d.overlord)||!team(d.subject)||d.overlord===d.subject||!id(d.hallId)||!['tribute','puppet','autonomy'].includes(d.terms)||!['capitulation','occupation'].includes(d.origin)||!['active','lapsed','released','rebelled'].includes(d.phase))return false;seen.add(d.id);
  if(!Array.isArray(d.garrisonIds)||d.garrisonIds.length>R.maximumGarrison||!d.garrisonIds.every(id)||new Set(d.garrisonIds).size!==d.garrisonIds.length)return false;
  if(!fin(d.createdAt)||!fin(d.lastMeasuredAt)||!fin(d.leverage,1e6)||!fin(d.leverageLowSeconds)||!fin(d.resistance,100)||!fin(d.unansweredThreatSeconds)||typeof d.reason!=='string'||d.reason.length>300)return false;
  const o=d.obligation;if(!o||o.kind!=='wood'||!fin(o.amount,1e4)||!fin(o.intervalSeconds,1e6)||o.intervalSeconds<1||!fin(o.owed)||!fin(o.paid)||!fin(o.dueCount)||!fin(o.nextDueAt)||!fin(o.forgiven))return false;
  if(d.endedAt!==undefined&&!fin(d.endedAt)||d.endReason!==undefined&&(typeof d.endReason!=='string'||d.endReason.length>300))return false;
  if(d.phase!=='active'&&(d.garrisonIds.length||d.obligation.owed>0))return false;
  if(d.phase==='active'){if(activeHalls.has(d.hallId))return false;activeHalls.add(d.hallId);}
  if(d.carry!==undefined){const c=d.carry;if(!c||!id(c.unitId)||!['pickup','deliver','return'].includes(c.phase)||!fin(c.amount,R.maximumCarry)||!fin(c.startedAt)||carriers.has(c.unitId))return false;carriers.add(c.unitId);}
 }
 return true;
}
