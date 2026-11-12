import type {Game} from './sim';
import type {CapturedMethodSnapshot} from './capturedKnowledge';
import type {GameState,Unit} from './types';
import {isDependent} from './settlement';
import {hasTaskCommitment} from './workCommitments';
import {receiveFood} from './pantry';
import {supplyApproach,supplyReached} from './campAnchor';
import {isRivalTeam} from './factions';
import {releasePrisoner,type CaptiveKnowledge,type PrisonerUnit} from './captivity';
import {recordConflict} from './conflictMetrics';
import {invalidatePrisonerGuardQueries} from './prisonerGuardQueries';

/**
 * What happens to people in custody after the escort: interrogation, ransom,
 * exchange and integration. Everything is physical and conserved:
 *  - interrogation yields only the knowledge snapshot the person carried when
 *    taken (their home, its stores and fighters as of capture) — never live state;
 *  - ransom goods are carried by a living resident of the origin society from its
 *    own stock to the captor's store; the captive is released only on delivery;
 *  - exchange releases two people at once, each walking home;
 *  - integration turns a long-held captive into a free resident of the captor
 *    (housing required); provenance is kept in a ledger.
 * Saved as optional `state.captiveDealings` (absent = nothing ever happened).
 */
export type CaptiveIntel={id:number;captorTeam:number;originTeam:number;prisonerId:number;learnedAt:number;knowledge:CaptiveKnowledge|null};
export type Interrogation={prisonerId:number;captorTeam:number;progressSeconds:number;startedAt:number};
export type RansomPhase='proposed'|'pickup'|'carrying'|'paid'|'refused'|'failed';
export type Ransom={id:number;prisonerId:number;captorTeam:number;originTeam:number;kind:'wood'|'food';amount:number;phase:RansomPhase;proposedAt:number;answerAt:number;carrierId?:number;carried:number;reason:string};
export type CaptiveIntegration={methods?:CapturedMethodSnapshot;unitId:number;originTeam:number;captorTeam:number;at:number};
export type RevoltPressure={prisonerId:number;pressure:number};
export type CaptiveDealingsState={version:1;revolt?:RevoltPressure[];custodySince:{prisonerId:number;since:number}[];interrogations:Interrogation[];intel:CaptiveIntel[];ransoms:Ransom[];integrations:CaptiveIntegration[]};
export const CAPTIVE_DEALINGS_RULES={version:1,interrogationSeconds:45,ransomAfterSeconds:120,integrateAfterSeconds:600,npcIntegrateAfterSeconds:900,ransomAnswerSeconds:20,playerAnswerSeconds:600,ransomJourneySeconds:900,ransomWood:15,ransomFood:12,originReserveWood:10,
 revoltGroupMeters:12,revoltGuardMeters:18,revoltMinimum:3,revoltRatio:2,revoltHungerSeconds:60,revoltThreshold:60,maximumIntel:128,maximumRansoms:128,maximumIntegrations:512,maximumTracked:512} as const;
const R=CAPTIVE_DEALINGS_RULES;
const st=(g:Game)=>g.state as Game['state']&{captiveDealings?:CaptiveDealingsState};
const root=(g:Game)=>st(g).captiveDealings??=(st(g).captiveDealings={version:1,custodySince:[],interrogations:[],intel:[],ransoms:[],integrations:[]});
const held=(g:Game,id:number)=>g.state.units.find(u=>u.id===id&&u.hp>0&&!!(u as PrisonerUnit).prisoner&&(u as PrisonerUnit).prisoner!.phase!=='released') as PrisonerUnit|undefined;
const OPEN_RANSOM:RansomPhase[]=['proposed','pickup','carrying'];
const dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
function guardFor(g:Game,u:PrisonerUnit){const id=u.prisoner?.guardId;return id===undefined?undefined:g.state.units.find(p=>p.id===id&&p.hp>0&&p.team===u.prisoner!.captorTeam&&dist(p,u)<=18);}
function endCustodyGuard(g:Game,u:PrisonerUnit){const guard=g.state.units.find(p=>p.id===u.prisoner?.guardId);if(guard?.escortId===u.id){guard.escortId=undefined;}
 if(guard&&!g.state.units.some(p=>p!==u&&p.hp>0&&(p as PrisonerUnit).prisoner?.guardId===guard.id&&(p as PrisonerUnit).prisoner?.phase!=='released'))guard.workReason='Prisoner escort finished';}
export function custodySeconds(g:Game,id:number){const r=st(g).captiveDealings?.custodySince.find(c=>c.prisonerId===id);return r?Math.max(0,g.state.time-r.since):0;}

/** Start (or continue) questioning a guarded person in custody. Takes real time; a guard must stay present. */
export function interrogateCaptive(g:Game,id:number,actorTeam=0){
 const u=held(g,id);if(!u||u.prisoner!.captorTeam!==actorTeam)return{accepted:false,reason:'Choose a person you hold in custody'};
 if(u.prisoner!.phase!=='custody')return{accepted:false,reason:'Questioning waits until the escort reaches custody'};
 const s=root(g);if(s.intel.some(i=>i.prisonerId===id&&i.captorTeam===actorTeam))return{accepted:false,reason:'Already questioned; they have nothing more to tell'};
 if(!s.interrogations.some(i=>i.prisonerId===id))s.interrogations.push({prisonerId:id,captorTeam:actorTeam,progressSeconds:0,startedAt:g.state.time});
 return{accepted:true,reason:'Questioning under guard'};
}
export function captiveIntel(g:Game,team:number){return(st(g).captiveDealings?.intel||[]).filter(i=>i.captorTeam===team).map(i=>({...i,knowledge:i.knowledge?{...i.knowledge,home:i.knowledge.home?{...i.knowledge.home}:undefined}:null}));}

/** Captor names a price; the origin answers from its own stock. Nothing moves until a carrier physically delivers. */
export function proposeRansom(g:Game,prisonerId:number,actorTeam=0,kind:'wood'|'food'='wood'){
 const u=held(g,prisonerId);if(!u||u.prisoner!.captorTeam!==actorTeam)return{accepted:false,reason:'Choose a person you hold'};
 const origin=u.prisoner!.originTeam;if(!g.tribe(origin)?.alive)return{accepted:false,reason:'Their society no longer exists to pay'};
 const s=root(g);if(s.ransoms.some(r=>r.prisonerId===prisonerId&&OPEN_RANSOM.includes(r.phase)))return{accepted:false,reason:'A ransom for this person is already pending'};
 while(s.ransoms.length>=R.maximumRansoms){const i=s.ransoms.findIndex(r=>!OPEN_RANSOM.includes(r.phase));if(i<0)return{accepted:false,reason:'Too many pending ransoms'};s.ransoms.splice(i,1);}
 const r:Ransom={id:g.id(),prisonerId,captorTeam:actorTeam,originTeam:origin,kind,amount:kind==='wood'?R.ransomWood:R.ransomFood,phase:'proposed',proposedAt:g.state.time,answerAt:g.state.time+(origin===0?R.playerAnswerSeconds:R.ransomAnswerSeconds),carried:0,reason:'Ransom demanded'};
 s.ransoms.push(r);return{accepted:true,reason:'Ransom demanded; their answer and payment must travel',ransomId:r.id};
}
const originStock=(g:Game,team:number,kind:'wood'|'food')=>kind==='wood'?Math.max(0,g.tribe(team).wood||0):Math.max(0,g.tribe(team).food||0);
const freeCarrier=(g:Game,u:Unit,team:number)=>u.team===team&&u.hp>=u.maxHp*.5&&u.type==='worker'&&!u.militia&&!isDependent(g,u)&&!(u as PrisonerUnit).prisoner&&u.carry===0&&!hasTaskCommitment(u)&&!u.societyMissionId&&u.tradeNeedsId===undefined&&!u.tributeJourney&&!u.emergency&&!u.recalled&&!u.trade&&!u.visit&&!u.scout&&!u.expedition&&!u.envoy&&!u.foundingJourney&&!u.buildOrder&&!u.boat&&['idle','gather','hold'].includes(u.order);
/** Origin answers; acceptance names a real carrier. For the player as origin, call with asPlayer. */
export function answerRansom(g:Game,id:number,accept:boolean,asPlayer=true){
 const r=st(g).captiveDealings?.ransoms.find(r=>r.id===id&&r.phase==='proposed');if(!r||(r.originTeam===0&&!asPlayer))return false;
 if(!accept){r.phase='refused';r.reason='Refused';return true;}
 if(!held(g,r.prisonerId)){r.phase='failed';r.reason='The captive is no longer held';return true;}
 if(originStock(g,r.originTeam,r.kind)<r.amount){r.phase='refused';r.reason='Cannot pay from actual stock';return true;}
 const home=g.campOf(r.originTeam),carrier=g.state.units.filter(u=>freeCarrier(g,u,r.originTeam)).sort((a,b)=>dist(a,home)-dist(b,home)||a.id-b.id)[0];
 if(!carrier){r.phase='refused';r.reason='No free carrier to bring the ransom';return true;}
 g.interruptMission(carrier);carrier.job=null;carrier.jobLock=false;carrier.node=null;carrier.target=null;carrier.order='move';r.carrierId=carrier.id;r.phase='pickup';r.reason='A carrier is collecting the ransom';return true;
}
function npcRansomAnswer(g:Game,r:Ransom){const keep=r.kind==='wood'?R.originReserveWood:0;return originStock(g,r.originTeam,r.kind)>=r.amount+keep;}
export function exchangePrisoners(g:Game,aId:number,bId:number){
 const a=held(g,aId),b=held(g,bId);if(!a||!b)return{accepted:false,reason:'Both people must be held'};
 if(a.prisoner!.captorTeam!==b.prisoner!.originTeam||b.prisoner!.captorTeam!==a.prisoner!.originTeam)return{accepted:false,reason:'Each side must hold the other’s person'};
 endCustodyGuard(g,a);endCustodyGuard(g,b);releasePrisoner(g,aId);releasePrisoner(g,bId);recordConflict(g,'prisoner_exchange',a.prisoner!.captorTeam,1,{actorId:aId,targetId:bId});
 return{accepted:true,reason:'Both released; each walks home'};
}
/** A long-held person becomes a free resident of the captor; their origin is kept as provenance. */
export function integrateCaptive(g:Game,id:number,actorTeam=0){
 const u=held(g,id);if(!u||u.prisoner!.captorTeam!==actorTeam)return{accepted:false,reason:'Choose a person you hold'};
 if(u.prisoner!.phase!=='custody')return{accepted:false,reason:'They must reach custody first'};
 if(custodySeconds(g,id)<R.integrateAfterSeconds)return{accepted:false,reason:`They need more time in custody (${Math.ceil(R.integrateAfterSeconds-custodySeconds(g,id))}s)`};
 if(g.popNow(actorTeam)>=g.popCap(actorTeam))return{accepted:false,reason:'Housing is needed for another free resident'};
 if(st(g).captiveDealings?.ransoms.some(r=>r.prisonerId===id&&OPEN_RANSOM.includes(r.phase)))return{accepted:false,reason:'A ransom is under way'};
 const origin=u.prisoner!.originTeam,methods=u.prisoner!.methods;endCustodyGuard(g,u);u.prisoner=undefined;invalidatePrisonerGuardQueries(g);u.order='idle';u.workReason='Joined the village as a free resident';
 const s=root(g);s.integrations.push({unitId:id,originTeam:origin,captorTeam:actorTeam,at:g.state.time,...(methods?{methods}: {})});if(s.integrations.length>R.maximumIntegrations)s.integrations.shift();
 s.custodySince=s.custodySince.filter(c=>c.prisonerId!==id);recordConflict(g,'captive_integrated',actorTeam,1,{actorId:id});g.workBoard.reset();
 return{accepted:true,reason:'Now a free member of the village'};
}
export function tickCaptiveDealings(g:Game){
 const prisoners=g.state.units.filter(u=>u.hp>0&&(u as PrisonerUnit).prisoner&&(u as PrisonerUnit).prisoner!.phase!=='released') as PrisonerUnit[];
 const s=st(g).captiveDealings;if(!prisoners.length&&!s)return;
 const d=root(g);
 // Custody clocks.
 const ids=new Set(prisoners.map(u=>u.id));d.custodySince=d.custodySince.filter(c=>ids.has(c.prisonerId));
 for(const u of prisoners)if(u.prisoner!.phase==='custody'&&!d.custodySince.some(c=>c.prisonerId===u.id)&&d.custodySince.length<R.maximumTracked)d.custodySince.push({prisonerId:u.id,since:g.state.time});
 // Interrogation needs the person in custody with a guard present; progress integrates real time.
 for(const i of [...d.interrogations]){
  const u=held(g,i.prisonerId);if(!u||u.prisoner!.captorTeam!==i.captorTeam){d.interrogations=d.interrogations.filter(x=>x!==i);continue;}
  if(u.prisoner!.phase!=='custody'||!guardFor(g,u))continue;
  i.progressSeconds=Math.min(R.interrogationSeconds,i.progressSeconds+1);
  if(i.progressSeconds>=R.interrogationSeconds){
   const k=u.prisoner!.knows;d.intel.push({id:g.id(),captorTeam:i.captorTeam,originTeam:u.prisoner!.originTeam,prisonerId:u.id,learnedAt:g.state.time,knowledge:k?{...k,home:k.home?{...k.home}:undefined}:null});
   if(d.intel.length>R.maximumIntel)d.intel.shift();d.interrogations=d.interrogations.filter(x=>x!==i);recordConflict(g,'interrogation',i.captorTeam,1,{actorId:u.id});
   if(i.captorTeam===0)g.banner(k?'Questioning finished: they described their home as it was when they were taken.':'Questioning finished: they knew nothing useful.',5);
  }
 }
 // Ransom lifecycle.
 for(const r of d.ransoms){
  if(!OPEN_RANSOM.includes(r.phase))continue;
  if(r.phase==='proposed'){if(r.originTeam!==0&&g.state.time>=r.answerAt)answerRansom(g,r.id,npcRansomAnswer(g,r),false);else if(r.originTeam===0&&g.state.time>=r.answerAt){r.phase='refused';r.reason='No answer in time';}continue;}
  const c=g.state.units.find(u=>u.id===r.carrierId);
  if(!c||c.hp<=0||c.team!==r.originTeam){r.phase='failed';r.reason='The ransom carrier was lost';if(r.carried>0)recordConflict(g,'ransom_lost',r.originTeam,r.carried);r.carried=0;continue;}
  if(!held(g,r.prisonerId)){r.phase='failed';r.reason='The captive is no longer held';continue;}
  if(g.state.time-r.proposedAt>R.ransomJourneySeconds+R.playerAnswerSeconds&&r.phase==='pickup'){r.phase='failed';r.reason='The ransom never set out';r.carrierId=undefined;c.order='idle';}
 }
 tickCaptiveRevolt(g,prisoners,d);
 // NPC captors act on their own captives.
 for(const u of prisoners){const p=u.prisoner!;if(p.captorTeam===0||!isRivalTeam(p.captorTeam)||p.phase!=='custody')continue;
  if(!d.intel.some(i=>i.prisonerId===u.id&&i.captorTeam===p.captorTeam)&&!d.interrogations.some(i=>i.prisonerId===u.id))interrogateCaptive(g,u.id,p.captorTeam);
  const swap=prisoners.find(o=>o!==u&&o.prisoner!.captorTeam===p.originTeam&&o.prisoner!.originTeam===p.captorTeam&&o.prisoner!.phase==='custody');
  if(swap&&!g.isFoe(p.captorTeam,p.originTeam)&&p.originTeam!==0){exchangePrisoners(g,u.id,swap.id);continue;}
  const since=custodySeconds(g,u.id),pending=d.ransoms.some(r=>r.prisonerId===u.id&&OPEN_RANSOM.includes(r.phase)),tried=d.ransoms.some(r=>r.prisonerId===u.id);
  if(since>=R.ransomAfterSeconds&&!pending&&!tried)proposeRansom(g,u.id,p.captorTeam);
  else if(since>=R.npcIntegrateAfterSeconds&&!pending)integrateCaptive(g,u.id,p.captorTeam);
 }
}
/** Organized revolt: captives held together who clearly outnumber the guards present, or are going hungry
 * while outnumbering them, build pressure; when it boils over the whole group breaks out together. A
 * single captive cannot revolt (individual unguarded escape is handled in captivity.ts). */
function tickCaptiveRevolt(g:Game,prisoners:PrisonerUnit[],d:CaptiveDealingsState){
 const list=d.revolt??=[];const held=new Set(prisoners.map(u=>u.id));d.revolt=list.filter(r=>held.has(r.prisonerId));
 const custody=prisoners.filter(u=>u.prisoner!.phase==='custody');
 for(const u of custody){
  const group=custody.filter(o=>o.prisoner!.captorTeam===u.prisoner!.captorTeam&&dist(o,u)<=R.revoltGroupMeters);
  const guards=g.state.units.filter(p=>p.team===u.prisoner!.captorTeam&&p.hp>0&&!(p as PrisonerUnit).prisoner&&(p.militia||!['worker','leader'].includes(p.type))&&dist(p,u)<=R.revoltGuardMeters).length;
  const outnumber=group.length>=R.revoltMinimum&&group.length>=R.revoltRatio*Math.max(1,guards);
  const hungry=(u.hunger||0)>R.revoltHungerSeconds;
  let r=d.revolt!.find(x=>x.prisonerId===u.id);if(!r){r={prisonerId:u.id,pressure:0};d.revolt!.push(r);}
  r.pressure=Math.max(0,Math.min(R.revoltThreshold,r.pressure+(outnumber?1+(hungry?1:0):-1)));
 }
 for(const u of custody){const r=d.revolt!.find(x=>x.prisonerId===u.id);if(!r||r.pressure<R.revoltThreshold||!u.prisoner||u.prisoner.phase!=='custody')continue;
  const group=custody.filter(o=>o.prisoner&&o.prisoner.phase==='custody'&&o.prisoner.captorTeam===u.prisoner!.captorTeam&&dist(o,u)<=R.revoltGroupMeters);
  const captor=u.prisoner.captorTeam;for(const o of group){endCustodyGuard(g,o);releasePrisoner(g,o.id,true);o.repatriating=undefined;}
  d.revolt=d.revolt!.filter(x=>!group.some(o=>o.id===x.prisonerId));recordConflict(g,'captive_revolt',captor,group.length);
  if(captor===0)g.banner(`${group.length} captives rose together against too few guards and broke out.`,6);
 }
}
/** Drives a ransom carrier: collect at home store, carry to the captor's store nearest the captive, return. */
export function captiveDealingsAI(g:Game,u:Unit,dt:number){
 const list=st(g).captiveDealings?.ransoms;if(!list?.length)return false;
 const r=list.find(r=>r.carrierId===u.id&&(r.phase==='pickup'||r.phase==='carrying'));if(!r)return false;if(u.emergency)return false;
 const prisoner=held(g,r.prisonerId);if(!prisoner)return false;
 const team=r.phase==='pickup'?r.originTeam:r.captorTeam,from=r.phase==='pickup'?g.campOf(r.originTeam):prisoner;
 const drop=g.nearestDrop(from.x,from.z,team),spot=drop?supplyApproach(g,u,drop):null;
 if(!drop||!spot){u.order='hold';u.workReason='Ransom route blocked';return true;}
 u.job=null;u.tx=spot.x;u.tz=spot.z;
 if(!supplyReached(g,u,drop,spot)){u.order='move';g.steer(u,dt);u.workReason=r.phase==='pickup'?'Collecting ransom goods':'Carrying the ransom to the captors';return true;}
 if(r.phase==='pickup'){
  const have=originStock(g,r.originTeam,r.kind);if(have<r.amount){r.phase='failed';r.reason='The ransom goods were spent before collection';r.carrierId=undefined;u.order='idle';return true;}
  if(r.kind==='wood')g.tribe(r.originTeam).wood-=r.amount;else g.spend(r.originTeam,{food:r.amount});
  u.carry=r.amount;u.carryType=r.kind;u.carryFood=r.kind==='food'?'provisions':undefined;r.carried=r.amount;r.phase='carrying';return true;
 }
 // Delivery at the captor's store: payment lands, then the captive is released to walk home.
 const amount=Math.min(u.carry,r.carried);
 if(r.kind==='wood')g.tribe(r.captorTeam).wood+=amount;else receiveFood(g,r.captorTeam,amount,'provisions');
 u.carry=0;u.carryType=null;u.carryFood=undefined;r.carried=0;r.phase='paid';r.reason='Ransom delivered; captive released';
 endCustodyGuard(g,prisoner);releasePrisoner(g,prisoner.id);recordConflict(g,'ransom_paid',r.captorTeam,amount,{actorId:u.id,targetId:prisoner.id});
 u.recalled=true;u.order='return';u.workReason='Ransom paid — walking home';return true;
}
export function validCaptiveDealingsState(state:unknown){
 const s=state as GameState&{captiveDealings?:CaptiveDealingsState};if(!s||typeof s!=='object'||!Array.isArray(s.tribes)||!Array.isArray(s.units))return false;
 for(const person of s.units){const p=(person as PrisonerUnit).prisoner;if(p?.knows!==undefined&&!validKnowledge(p.knows))return false;}
 const d=s.captiveDealings;if(d===undefined)return true;
 const fin=(n:unknown,max=1e9)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max,id=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0,team=(n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<s.tribes.length;
 if(!d||d.version!==1||!Array.isArray(d.custodySince)||!Array.isArray(d.interrogations)||!Array.isArray(d.intel)||!Array.isArray(d.ransoms)||!Array.isArray(d.integrations))return false;
 if(d.custodySince.length>R.maximumTracked||d.interrogations.length>R.maximumTracked||d.intel.length>R.maximumIntel||d.ransoms.length>R.maximumRansoms||d.integrations.length>R.maximumIntegrations)return false;
 const once=new Set<number>();for(const c of d.custodySince){if(!c||!id(c.prisonerId)||!fin(c.since)||once.has(c.prisonerId))return false;once.add(c.prisonerId);}
 const q=new Set<number>();for(const i of d.interrogations){if(!i||!id(i.prisonerId)||!team(i.captorTeam)||!fin(i.progressSeconds,R.interrogationSeconds)||!fin(i.startedAt)||q.has(i.prisonerId))return false;q.add(i.prisonerId);}
 const ids=new Set<number>();for(const i of d.intel){if(!i||!id(i.id)||ids.has(i.id)||!team(i.captorTeam)||!team(i.originTeam)||!id(i.prisonerId)||!fin(i.learnedAt)||i.knowledge!==null&&!validKnowledge(i.knowledge))return false;ids.add(i.id);}
 const carriers=new Set<number>();for(const r of d.ransoms){if(!r||!id(r.id)||ids.has(r.id)||!id(r.prisonerId)||!team(r.captorTeam)||!team(r.originTeam)||r.captorTeam===r.originTeam||!['wood','food'].includes(r.kind)||!fin(r.amount,1e4)||!['proposed','pickup','carrying','paid','refused','failed'].includes(r.phase)||!fin(r.proposedAt)||!fin(r.answerAt)||!fin(r.carried,1e4)||typeof r.reason!=='string'||r.reason.length>300)return false;ids.add(r.id);
  if(r.carrierId!==undefined){if(!id(r.carrierId))return false;if(r.phase==='pickup'||r.phase==='carrying'){if(carriers.has(r.carrierId))return false;carriers.add(r.carrierId);}}
  if((r.phase==='pickup'||r.phase==='carrying')&&r.carrierId===undefined)return false;if(r.phase!=='carrying'&&r.carried>0)return false;}
 if(d.revolt!==undefined){if(!Array.isArray(d.revolt)||d.revolt.length>R.maximumTracked)return false;const rv=new Set<number>();for(const r of d.revolt){if(!r||!id(r.prisonerId)||rv.has(r.prisonerId)||!fin(r.pressure,R.revoltThreshold))return false;rv.add(r.prisonerId);}}
 for(const i of d.integrations)if(!i||!id(i.unitId)||!team(i.originTeam)||!team(i.captorTeam)||!fin(i.at))return false;
 return true;
}
function validKnowledge(k:unknown){
 if(!k||typeof k!=='object'||Array.isArray(k))return false;const c=k as CaptiveKnowledge;const fin=(n:unknown,max=1e9)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
 if(!fin(c.asOf)||!Number.isInteger(c.team)||c.team<0||c.team>=32||!fin(c.homeArmed,4096)||!fin(c.homeResidents,4096)||!fin(c.homeFood)||!fin(c.homeWood))return false;
 if(c.homeHallId!==undefined&&(!Number.isSafeInteger(c.homeHallId)||c.homeHallId<1))return false;
 if(c.home!==undefined&&(!c.home||!Number.isFinite(c.home.x)||!Number.isFinite(c.home.z)||Math.abs(c.home.x)>1e5||Math.abs(c.home.z)>1e5))return false;
 return true;
}
