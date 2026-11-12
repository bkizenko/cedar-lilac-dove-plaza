import type {Game} from './sim';
import type {Building,ResKind,Unit} from './types';
import {isDependent,reserveSeconds} from './settlement';
import {isRivalTeam} from './factions';
import {villagePersonality} from './villagePersonality';
import {carryingCapacity} from './haulage';
import {markStolenLoad,stolenMarkRoom} from './stolenCargo';
import {queueStandDown} from './demobilization';
import {acceptPrisonerSurrender,PRISONER_RULES,type PrisonerUnit} from './captivity';
import {agreeSocietyTruce} from './societyRelations';
import {recordConflict} from './conflictMetrics';
import {CONFLICT_RULES,integrateOccupiedVillage,type ConflictUnit,type OccupationControl} from './conflictIntent';
import {createDomination,type DominationTerms} from './domination';
import {alliesOf} from './alliances';
import {siegeUnderWay} from './rivalSiege';
import {warGoalOutcome} from './rivalWarGoals';

/**
 * Natural capitulation. A community does not surrender because an attacker picked
 * "conquer" before departure; it yields when MEASURED local conditions say it is
 * beaten: residents killed or taken, armed defenders lost, key buildings held or
 * wrecked, the society starving, and no relief arriving — while the attacker is
 * still physically present with superior local force. The attacker's original
 * purpose (raid, escort, patrol) is irrelevant; plans change in the field.
 *
 * Saved as optional `state.capitulation` (absent = no fronts ever opened).
 */
export type CapitulationPhase='pressed'|'capitulated'|'accepted'|'refused'|'relieved'|'expired';
export type CapitulationOutcome='occupy'|'annex'|'tribute'|'puppet'|'autonomy'|'loot'|'captives'|'raze';
export type CapitulationFront={id:number;hallId:number;defenderTeam:number;attackerTeam:number;phase:CapitulationPhase;openedAt:number;lastMeasuredAt:number;
 residentIds:number[];armedAtOpen:number;buildingIds:number[];hallHpAtOpen:number;
 casualties:number;captured:number;lostArmed:number;buildingLoss:number;occupiedSeconds:number;starvingSeconds:number;unrelievedSeconds:number;absentSeconds:number;
 siegeSeconds?:number;goal?:'hold'|'tribute'|'loot';ratio:number;score:number;threshold:number;refusals:number;yieldedIds:number[];capitulatedAt?:number;expiresAt?:number;outcome?:CapitulationOutcome;resolvedAt?:number;reason:string};
export type CapitulationState={version:1;fronts:CapitulationFront[]};
export const CAPITULATION_RULES={version:1,communityRadiusMeters:55,reliefRadiusMeters:150,minimumPressureSeconds:20,minimumRatio:1.5,civilianDefense:.25,minimumDefense:.5,
 starvationReserveSeconds:60,starvationFullSeconds:120,occupationFullSeconds:30,unrelievedFullSeconds:180,reliefShare:.5,relievedAfterAbsentSeconds:120,offerSeconds:180,refusalStep:.15,
 weights:{casualties:.3,lostArmed:.3,buildings:.15,occupied:.25,starving:.2,unrelieved:.15,siege:.2},siegeFullSeconds:60,baseThreshold:.5,maximumFronts:256,maximumIds:256} as const;
const R=CAPITULATION_RULES;
const OPEN:CapitulationPhase[]=['pressed','capitulated'];
const st=(g:Game)=>g.state as Game['state']&{capitulation?:CapitulationState;occupations?:OccupationControl[]};
const root=(g:Game)=>st(g).capitulation??=(st(g).capitulation={version:1,fronts:[]});
const dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const free=(u:Unit)=>u.hp>0&&!(u as PrisonerUnit).prisoner&&!u.boat;
const armed=(u:Unit)=>!!u.militia||!['worker','leader'].includes(u.type);
const condition=(u:Unit)=>Math.max(0,Math.min(1,u.hp/Math.max(1,u.maxHp)));
const clamp01=(n:number)=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));

/** People who laid down arms in an open capitulation do not count as defenders resisting control or surrender. */
export function capitulationYielded(g:Game,u:Unit){
 const fronts=st(g).capitulation?.fronts;if(!fronts?.length)return false;
 return fronts.some(f=>(f.phase==='capitulated'||f.phase==='accepted')&&f.defenderTeam===u.team&&f.yieldedIds.includes(u.id));
}
/** Present, armed, hostile attackers of one team inside the community — the leverage that must still exist. */
function presentAttackers(g:Game,hall:Building,attacker:number,defender:number){
 return g.state.units.filter(u=>u.team===attacker&&free(u)&&armed(u)&&!isDependent(g,u)&&dist(u,hall)<=R.communityRadiusMeters&&g.isFoe(attacker,defender));
}
function localDefenders(g:Game,hall:Building,team:number){return g.state.units.filter(u=>u.team===team&&free(u)&&!isDependent(g,u)&&dist(u,hall)<=R.communityRadiusMeters&&!capitulationYielded(g,u));}
const power=(list:Unit[],civ=true)=>list.reduce((s,u)=>s+condition(u)*(armed(u)?1:civ?R.civilianDefense:0),0);

/** Pure measurement of one front from current state. */
export function measureFront(g:Game,f:CapitulationFront){
 const hall=g.state.buildings.find(b=>b.id===f.hallId);
 const attackers=hall&&hall.hp>0?presentAttackers(g,hall,f.attackerTeam,f.defenderTeam):[];
 const defenders=hall&&hall.hp>0?localDefenders(g,hall,f.defenderTeam):[];
 const allies=alliesOf(g,f.defenderTeam),allyLocal=hall&&allies.length?g.state.units.filter(u=>allies.includes(u.team)&&free(u)&&armed(u)&&!isDependent(g,u)&&dist(u,hall)<=R.communityRadiusMeters):[];
 const attackPower=power(attackers,false),defensePower=power(defenders)+power(allyLocal,false);
 let dead=0,captured=0;for(const id of f.residentIds){const u=g.state.units.find(p=>p.id===id);if(!u||u.hp<=0)dead++;else{const p=(u as PrisonerUnit).prisoner;if(p&&p.phase!=='released'&&p.originTeam===f.defenderTeam)captured++;}}
 const armedNow=defenders.filter(armed).length;
 const lostBuildings=f.buildingIds.filter(id=>{const b=g.state.buildings.find(x=>x.id===id);return!b||b.hp<=0||b.team!==f.defenderTeam;}).length;
 const hallLoss=hall?clamp01(1-hall.hp/Math.max(1,f.hallHpAtOpen)):1;
 const occupied=(st(g).occupations||[]).some(c=>c.hallId===f.hallId&&c.controllerTeam===f.attackerTeam&&(c.phase==='holding'||c.phase==='held'));
 const relief=hall?g.state.units.filter(u=>(u.team===f.defenderTeam||allies.includes(u.team)&&dist(u,hall)<=R.reliefRadiusMeters&&free(u)&&armed(u)||isRivalTeam(f.defenderTeam)&&u.team===0&&g.isAlly(f.defenderTeam)&&!g.isFoe(0,f.defenderTeam))&&free(u)&&armed(u)&&!isDependent(g,u)&&dist(u,hall)>R.communityRadiusMeters&&dist(u,hall)<=R.reliefRadiusMeters):[];
 return{hall,attackers,defenders,attackPower,defensePower,ratio:attackPower/Math.max(R.minimumDefense,defensePower),dead,captured,armedNow,lostBuildings,hallLoss,occupied,siege:hall?siegeUnderWay(g,hall,f.attackerTeam):false,reliefPower:power(relief,false),starving:reserveSeconds(g,f.defenderTeam)<R.starvationReserveSeconds};
}
export function frontScore(f:CapitulationFront){
 const w=R.weights,n=Math.max(1,f.residentIds.length);
 return w.casualties*clamp01((f.casualties+f.captured)/n)+w.lostArmed*(f.armedAtOpen?clamp01(f.lostArmed/f.armedAtOpen):0)+w.buildings*clamp01(f.buildingLoss)
  +w.occupied*clamp01(f.occupiedSeconds/R.occupationFullSeconds)+w.starving*clamp01(f.starvingSeconds/R.starvationFullSeconds)+w.unrelieved*clamp01(f.unrelievedSeconds/R.unrelievedFullSeconds)+w.siege*clamp01((f.siegeSeconds||0)/R.siegeFullSeconds);
}
function openFront(g:Game,hall:Building,attacker:number){
 const defender=hall.team,residents=g.state.units.filter(u=>u.team===defender&&u.hp>0&&!(u as PrisonerUnit).prisoner&&(u.homeHall===hall.id||u.homeHall===undefined&&dist(u,hall)<=R.communityRadiusMeters)).slice(0,R.maximumIds);
 const buildings=g.connectedCamp(hall).filter(b=>b.team===defender&&b.hp>0&&dist(b,hall)<=CONFLICT_RULES.settlementScopeMeters).map(b=>b.id).slice(0,R.maximumIds);if(!buildings.includes(hall.id))buildings.unshift(hall.id);
 const f:CapitulationFront={id:g.id(),hallId:hall.id,defenderTeam:defender,attackerTeam:attacker,phase:'pressed',openedAt:g.state.time,lastMeasuredAt:g.state.time,residentIds:residents.map(u=>u.id),
  armedAtOpen:localDefenders(g,hall,defender).filter(armed).length,buildingIds:buildings,hallHpAtOpen:Math.max(1,hall.hp),casualties:0,captured:0,lostArmed:0,buildingLoss:0,occupiedSeconds:0,starvingSeconds:0,unrelievedSeconds:0,absentSeconds:0,
  ratio:0,score:0,threshold:R.baseThreshold*villagePersonality(g,defender).boldness,refusals:0,yieldedIds:[],reason:'Armed attackers inside the community'};
 const s=root(g);while(s.fronts.length>=R.maximumFronts){const i=s.fronts.findIndex(x=>!OPEN.includes(x.phase));if(i<0)return null;s.fronts.splice(i,1);}
 s.fronts.push(f);return f;
}
/** Player halls record defensive objectives only; surrender stays the player’s decision.
 * NPC communities can yield. Raider camps never yield as a society. */
function defendableHalls(g:Game){return g.state.buildings.filter(b=>b.type==='townhall'&&b.hp>0&&g.finished(b)&&(b.team===0||isRivalTeam(b.team))&&g.tribe(b.team)?.alive);}
/** Call at most about once per simulated second; each front integrates its own elapsed time. */
export function tickCapitulation(g:Game){
 const halls=defendableHalls(g);
 // Open fronts from observed presence: any hostile armed team inside a community.
 for(const hall of halls){
  const near=new Set<number>();for(const u of g.state.units)if(u.team!==hall.team&&u.team!==3&&free(u)&&armed(u)&&dist(u,hall)<=R.communityRadiusMeters&&g.isFoe(u.team,hall.team))near.add(u.team);
  for(const attacker of [...near].sort((a,b)=>a-b))if(!st(g).capitulation?.fronts.some(f=>f.hallId===hall.id&&f.attackerTeam===attacker&&OPEN.includes(f.phase)))openFront(g,hall,attacker);
 }
 const fronts=st(g).capitulation?.fronts;if(!fronts)return;
 for(const f of fronts){
  if(!OPEN.includes(f.phase))continue;
  const m=measureFront(g,f),dt=Math.max(0,g.state.time-f.lastMeasuredAt);f.lastMeasuredAt=g.state.time;
  if(!m.hall||m.hall.hp<=0||m.hall.team!==f.defenderTeam){f.phase='expired';f.resolvedAt=g.state.time;f.reason=!m.hall||m.hall.hp<=0?'The community hall was destroyed':'The community changed hands';continue;}
  f.casualties=m.dead;f.captured=m.captured;f.lostArmed=Math.max(0,f.armedAtOpen-m.armedNow);f.buildingLoss=Math.max(m.lostBuildings/Math.max(1,f.buildingIds.length),m.hallLoss);f.ratio=m.ratio;
  if(!m.attackers.length){
   f.absentSeconds+=dt;
   if(f.phase==='capitulated'){f.phase='expired';f.resolvedAt=g.state.time;f.yieldedIds=[];f.reason='The attackers left before terms were accepted';continue;}
   if(f.absentSeconds>=R.relievedAfterAbsentSeconds){f.phase='relieved';f.resolvedAt=g.state.time;f.reason='Attackers withdrew; the community recovered';}
   continue;
  }
  f.absentSeconds=0;
  if(m.occupied)f.occupiedSeconds+=dt;
  if(m.starving)f.starvingSeconds+=dt;
  if(m.siege)f.siegeSeconds=(f.siegeSeconds||0)+dt;
  if(m.reliefPower<m.attackPower*R.reliefShare)f.unrelievedSeconds+=dt;else f.unrelievedSeconds=Math.max(0,f.unrelievedSeconds-dt);
  f.score=frontScore(f);
  if(f.defenderTeam===0){f.reason='The community is defending its hall';continue;}
  if(f.phase==='capitulated'){if(g.state.time>=(f.expiresAt??Infinity)){f.phase='expired';f.resolvedAt=g.state.time;f.yieldedIds=[];f.reason='Terms were not accepted in time';}continue;}
  const pressedFor=g.state.time-f.openedAt;
  f.reason=pressedFor<R.minimumPressureSeconds?'Fighting has only begun':f.ratio<R.minimumRatio?'Local defenders still hold their own':f.score<f.threshold?'Losses not yet decisive':'Ready to yield';
  if(pressedFor>=R.minimumPressureSeconds&&f.ratio>=R.minimumRatio&&f.score>=f.threshold)capitulate(g,f,m.defenders);
 }
}
function capitulate(g:Game,f:CapitulationFront,defenders:Unit[]){
 f.phase='capitulated';f.capitulatedAt=g.state.time;f.expiresAt=g.state.time+R.offerSeconds;f.yieldedIds=defenders.map(u=>u.id).slice(0,R.maximumIds);
 f.reason='The community laid down arms and asks for terms';
 // Lay down arms: no new attacks; borrowed militia weapons walk back to the cache (kept, not destroyed).
 for(const u of defenders){u.target=null;u.attackDestination=null;u.pillage=-1;if(u.emergency)u.emergency.until=g.state.time;if(u.militia)queueStandDown(g,u);else if(armed(u)){u.order='hold';u.workReason='Laid down arms — awaiting terms';}}
 recordConflict(g,'capitulation',f.attackerTeam,1,{targetId:f.hallId});
 if(f.attackerTeam===0){g.banner(`${g.tribe(f.defenderTeam).name} lays down arms at its hall and asks for terms. Keep your force there and choose terms.`,8);return;}
 // An NPC attacker decides from its own measured situation, in the field.
 acceptCapitulation(g,f.id,npcCapitulationOutcome(g,f),f.attackerTeam);
}
/** The attacker's own needs and present strength decide; nothing about the defender is read beyond what its party sees locally. */
export function npcCapitulationOutcome(g:Game,f:CapitulationFront):CapitulationOutcome{
 const field=warGoalOutcome(f);if(field)return field;
 const hall=g.state.buildings.find(b=>b.id===f.hallId),present=hall?presentAttackers(g,hall,f.attackerTeam,f.defenderTeam):[];
 const p=villagePersonality(g,f.attackerTeam),hungry=reserveSeconds(g,f.attackerTeam)<200,room=g.popCap(f.attackerTeam)-g.popNow(f.attackerTeam);
 if(hungry)return'loot';
 if(present.length>=3&&p.boldness>=1)return'tribute';
 if(room>=1&&present.length>=1&&p.caution<1)return'captives';
 return present.length>=2?'autonomy':'loot';
}
export function capitulationIssue(g:Game,id:number,actorTeam=0):string|null{
 const f=st(g).capitulation?.fronts.find(x=>x.id===id);
 if(!f||f.attackerTeam!==actorTeam)return'No capitulation offered to you here';
 if(f.phase!=='capitulated')return'This community is not offering terms now';
 if(g.state.time>=(f.expiresAt??0))return'The offer lapsed';
 const hall=g.state.buildings.find(b=>b.id===f.hallId&&b.hp>0&&b.team===f.defenderTeam);if(!hall)return'The community hall is gone';
 if(!presentAttackers(g,hall,f.attackerTeam,f.defenderTeam).length)return'Your force must still be present at the community';
 return null;
}
/** Terms are an attacker choice among distinct outcomes; every one preserves people and buildings unless 'raze' is chosen explicitly. */
export function acceptCapitulation(g:Game,id:number,outcome:CapitulationOutcome,actorTeam=0){
 const issue=capitulationIssue(g,id,actorTeam);if(issue)return{accepted:false,reason:issue};
 const f=st(g).capitulation!.fronts.find(x=>x.id===id)!,hall=g.state.buildings.find(b=>b.id===f.hallId)!;
 const present=presentAttackers(g,hall,f.attackerTeam,f.defenderTeam).sort((a,b)=>dist(a,hall)-dist(b,hall)||a.id-b.id);
 const done=(reason:string,extra:Record<string,unknown>={})=>{f.phase='accepted';f.outcome=outcome;f.resolvedAt=g.state.time;f.reason=reason;recordConflict(g,'capitulation_accepted',f.attackerTeam,1,{targetId:f.hallId,reason:outcome});return{accepted:true,reason,...extra};};
 const truce=()=>{if(f.attackerTeam===0)g.agreeTruce(f.defenderTeam);else if(f.defenderTeam===0)g.agreeTruce(f.attackerTeam);else agreeSocietyTruce(g,f.attackerTeam,f.defenderTeam);};
 if(outcome==='occupy'||outcome==='annex'){
  const control=heldOccupation(g,f,hall,present);
  if(outcome==='occupy')return done('Community surrendered intact; your garrison holds it with buildings and residents preserved',{occupationId:control.id});
  const r=integrateOccupiedVillage(g,control.id);
  if(!r.accepted){control.blockedReason=r.reason;return{accepted:false,reason:r.reason};}
  const after=st(g).capitulation?.fronts.find(x=>x.id===id)??f;after.phase='accepted';after.outcome=outcome;after.resolvedAt=g.state.time;after.reason='Community annexed intact';
  recordConflict(g,'capitulation_accepted',after.attackerTeam,1,{targetId:after.hallId,reason:outcome});return{...r,occupationId:control.id};
 }
 if(outcome==='tribute'||outcome==='puppet'||outcome==='autonomy'){
  const garrison=outcome==='autonomy'?[]:present;
  const d=createDomination(g,{overlord:f.attackerTeam,subject:f.defenderTeam,hallId:hall.id,terms:outcome as DominationTerms,garrisonIds:garrison.map(u=>u.id),origin:'capitulation'});
  if(!d.accepted)return d;truce();
  for(const u of garrison){const c=u as ConflictUnit;g.interruptMission(u);c.conflictIntent='dominate';u.pillage=-1;u.target=null;u.order='hold';u.returnAfterCombat=undefined;u.workReason='Garrisoning a dominated community — leverage must stay present';}
  if(outcome==='autonomy')for(const u of present){u.pillage=-1;u.target=null;queueStandDown(g,u);}
  return done(`${outcome==='tribute'?'Tribute':outcome==='puppet'?'Puppet':'Autonomous tributary'} terms accepted; obligations last only while leverage lasts`,{dominationId:d.id});
 }
 if(outcome==='loot'){
  const t=g.tribe(f.defenderTeam);let taken=0;
  for(const u of present){if(u.carry>0||!stolenMarkRoom(g,u))continue;const kind=(['food','wood','stone'] as ResKind[]).filter(k=>(t[k]||0)>=1).sort((a,b)=>(t[b]||0)-(t[a]||0))[0];if(!kind)break;
   const amount=Math.floor(Math.min(t[kind]||0,carryingCapacity(u,kind)));if(amount<1)continue;
   if(kind==='food')g.spend(f.defenderTeam,{food:amount});else t[kind]-=amount;
   u.carry=amount;u.carryType=kind;u.carryFood=kind==='food'?'provisions':undefined;markStolenLoad(g,u,f.defenderTeam);taken+=amount;
   g.interruptMission(u);u.pillage=-1;u.target=null;u.order='return';u.recalled=true;u.stationOnArrival=false;u.workReason='Carrying surrendered goods home';}
  truce();return done(`The community handed over ${taken} goods; your party carries them home`,{taken});
 }
 if(outcome==='captives'){
  const ids:number[]=[];
  const pool=g.state.units.filter(u=>u.team===f.defenderTeam&&u.hp>0&&u.type==='worker'&&!u.militia&&!isDependent(g,u)&&!(u as PrisonerUnit).prisoner&&f.residentIds.includes(u.id)).sort((a,b)=>dist(a,hall)-dist(b,hall)||a.id-b.id);
  for(const target of pool){if(ids.length>=present.length*PRISONER_RULES.guardCapacity)break;
   const near=present.find(p=>dist(p,target)<=PRISONER_RULES.surrenderRadiusMeters);if(!near)continue;
   const r=acceptPrisonerSurrender(g,target,f.attackerTeam);if(r.accepted)ids.push(target.id);}
  if(!ids.length)return{accepted:false,reason:'No surrendering adult stands within reach of a guard with capacity'};
  return done(`${ids.length} surrendered adults taken into custody under escort; buildings untouched`,{prisonerIds:ids});
 }
 // raze: an explicit destructive choice, never a default.
 for(const u of present){g.interruptMission(u);u.pillage=f.defenderTeam;u.order='attackmove';u.tx=hall.x;u.tz=hall.z;u.attackDestination={x:hall.x,z:hall.z};u.returnAfterCombat=true;u.workReason='Destroying the surrendered community';}
 f.yieldedIds=[];
 return done('Ordered to destroy the surrendered community',{});
}
/** Surrendered: the present party holds the hall immediately; the yielded defenders do not contest it. */
function heldOccupation(g:Game,f:CapitulationFront,hall:Building,present:Unit[]){
 const s=st(g),list=s.occupations??=(s.occupations=[]);
 let c=list.find(c=>c.hallId===hall.id&&c.controllerTeam===f.attackerTeam&&!['withdrawn','integrated','dominated'].includes(c.phase));
 const guards=present.filter(u=>dist(u,hall)<=CONFLICT_RULES.controlRadiusMeters+R.communityRadiusMeters);
 if(!c){c={id:g.id(),hallId:hall.id,formerTeam:f.defenderTeam,controllerTeam:f.attackerTeam,buildingIds:f.buildingIds.filter(id=>g.state.buildings.some(b=>b.id===id&&b.hp>0&&b.team===f.defenderTeam)),residentIds:f.residentIds.filter(id=>g.state.units.some(u=>u.id===id&&u.hp>0&&u.team===f.defenderTeam)),guardIds:[],phase:'held',holdSeconds:CONFLICT_RULES.controlHoldSeconds,createdAt:g.state.time};if(!c.buildingIds.includes(hall.id))c.buildingIds.unshift(hall.id);list.push(c);}
 // interruptMission releases prior conflict assignments, so enrol the guards afterwards.
 for(const u of guards){const a=u as ConflictUnit;g.interruptMission(u);a.conflictIntent='occupy';u.pillage=-1;u.target=null;u.returnAfterCombat=undefined;u.order='hold';u.workReason='Holding the surrendered community — buildings stay intact';}
 c.guardIds=[...new Set([...c.guardIds,...guards.map(u=>u.id)])].slice(0,512);c.phase='held';c.holdSeconds=CONFLICT_RULES.controlHoldSeconds;c.blockedReason=undefined;
 recordConflict(g,'occupation_secured',f.attackerTeam,1,{targetId:hall.id});
 return c;
}
export function refuseCapitulation(g:Game,id:number,actorTeam=0){
 const f=st(g).capitulation?.fronts.find(x=>x.id===id&&x.attackerTeam===actorTeam&&x.phase==='capitulated');if(!f)return false;
 f.phase='pressed';f.refusals++;f.threshold=Math.min(1.2,f.threshold+R.refusalStep);f.yieldedIds=[];f.expiresAt=undefined;f.reason='Terms refused; the community will resist harder';return true;
}
/** Read-only view for UI/diagnostics; carries only what the attacker's present force witnesses. */
export function capitulationOffers(g:Game,team=0){return(st(g).capitulation?.fronts||[]).filter(f=>f.attackerTeam===team&&f.phase==='capitulated').map(f=>({id:f.id,hallId:f.hallId,defenderTeam:f.defenderTeam,score:f.score,expiresIn:Math.max(0,(f.expiresAt??0)-g.state.time),measured:{casualties:f.casualties,captured:f.captured,lostArmed:f.lostArmed,buildingLoss:f.buildingLoss,occupiedSeconds:f.occupiedSeconds,starvingSeconds:f.starvingSeconds,unrelievedSeconds:f.unrelievedSeconds,ratio:f.ratio}}));}
export function capitulationDiagnostics(g:Game){const fronts=st(g).capitulation?.fronts||[];const by:Record<string,number>={};for(const f of fronts)by[f.phase]=(by[f.phase]||0)+1;return{rules:R,fronts:fronts.length,byPhase:by};}

export function validCapitulationState(state:unknown){
 const s=state as Game['state']&{capitulation?:CapitulationState};if(!s||typeof s!=='object'||!Array.isArray(s.tribes))return false;
 const c=s.capitulation;if(c===undefined)return true;
 if(!c||c.version!==1||!Array.isArray(c.fronts)||c.fronts.length>R.maximumFronts)return false;
 const fin=(n:unknown,max=1e9)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max,id=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0;
 const ids=(v:unknown)=>Array.isArray(v)&&v.length<=R.maximumIds&&v.every(id)&&new Set(v).size===v.length,team=(n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<s.tribes.length;
 const seen=new Set<number>(),open=new Set<string>();
 for(const f of c.fronts){
  if(!f||!id(f.id)||seen.has(f.id)||!id(f.hallId)||!team(f.defenderTeam)||!team(f.attackerTeam)||f.defenderTeam===f.attackerTeam||!['pressed','capitulated','accepted','refused','relieved','expired'].includes(f.phase))return false;seen.add(f.id);
  if(!ids(f.residentIds)||!ids(f.buildingIds)||!ids(f.yieldedIds)||!fin(f.openedAt)||!fin(f.lastMeasuredAt)||!fin(f.armedAtOpen,4096)||!fin(f.hallHpAtOpen)||!fin(f.casualties,4096)||!fin(f.captured,4096)||!fin(f.lostArmed,4096)||!fin(f.buildingLoss,1)||!fin(f.occupiedSeconds)||!fin(f.starvingSeconds)||!fin(f.unrelievedSeconds)||!fin(f.absentSeconds)||f.siegeSeconds!==undefined&&!fin(f.siegeSeconds)||f.goal!==undefined&&!['hold','tribute','loot'].includes(f.goal)||!fin(f.ratio,1e6)||!fin(f.score,10)||!fin(f.threshold,10)||!fin(f.refusals,1e6)||typeof f.reason!=='string'||f.reason.length>300)return false;
  if(f.capitulatedAt!==undefined&&!fin(f.capitulatedAt)||f.expiresAt!==undefined&&!fin(f.expiresAt)||f.resolvedAt!==undefined&&!fin(f.resolvedAt))return false;
  if(f.outcome!==undefined&&!['occupy','annex','tribute','puppet','autonomy','loot','captives','raze'].includes(f.outcome))return false;
  if(f.phase==='capitulated'&&(f.expiresAt===undefined||f.capitulatedAt===undefined))return false;
  if(f.yieldedIds.length&&!['capitulated','accepted'].includes(f.phase))return false;
  if(OPEN.includes(f.phase)){const k=f.hallId+':'+f.attackerTeam;if(open.has(k))return false;open.add(k);}
 }
 return true;
}
