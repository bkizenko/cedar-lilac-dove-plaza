import type {Game} from './sim';
import type {Unit} from './types';
import {isRivalTeam} from './factions';
import {isDependent} from './settlement';
import {hasTaskCommitment} from './workCommitments';
import {societyRelation,declareSocietyHostility} from './societyRelations';
import {queueStandDown} from './demobilization';
import {recordConflict} from './conflictMetrics';
import type {PrisonerUnit} from './captivity';
import type {ConflictUnit} from './conflictIntent';

/**
 * NPC↔NPC alliances. A pact forms only from each society's OWN relations: mutual
 * trust, no hostility between them, and a shared enemy both are already at war
 * with. Effects are physical: when an ally's community has hostile armed people
 * inside it, the partner joins the war and sends real armed residents (keeping a
 * home guard) who walk there; they count as relief for capitulation. Pacts break
 * on any hostility between partners and lapse when trust decays.
 * Saved as optional `state.alliances` (absent = none).
 */
export type AlliancePhase='active'|'broken'|'lapsed';
export type ReliefAssignment={unitId:number;hallId:number;assignedAt:number};
export type Pact={id:number;a:number;b:number;phase:AlliancePhase;formedAt:number;commonEnemy:number;reason:string;endedAt?:number;relief:ReliefAssignment[]};
export type AllianceState={version:1;nextReviewAt:number;pacts:Pact[]};
export const ALLIANCE_RULES={version:1,reviewSeconds:30,formTrust:.5,lapseTrust:.3,communityRadiusMeters:55,reliefRangeMeters:400,reliefSeconds:300,maximumReliefPerCall:4,homeGuard:1,maximumPacts:128} as const;
const R=ALLIANCE_RULES;
const st=(g:Game)=>g.state as Game['state']&{alliances?:AllianceState};
const root=(g:Game)=>st(g).alliances??=(st(g).alliances={version:1,nextReviewAt:0,pacts:[]});
const dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const armed=(u:Unit)=>!!u.militia||!['worker','leader'].includes(u.type);
const live=(u:Unit)=>u.hp>0&&!(u as PrisonerUnit).prisoner&&!u.boat;
const pair=(a:number,b:number)=>a<b?[a,b]:[b,a];

export function activePact(g:Game,a:number,b:number){const [x,y]=pair(a,b);return st(g).alliances?.pacts.find(p=>p.phase==='active'&&p.a===x&&p.b===y);}
export function alliesOf(g:Game,team:number){return(st(g).alliances?.pacts||[]).filter(p=>p.phase==='active'&&(p.a===team||p.b===team)).map(p=>p.a===team?p.b:p.a);}
const mutualTrust=(g:Game,a:number,b:number)=>Math.min(societyRelation(g,a,b).trust,societyRelation(g,b,a).trust);
/** Shared enemy taken from each side's own directed relation, never a global census. */
function sharedEnemy(g:Game,a:number,b:number){
 for(const t of g.state.tribes){const e=t.id;if(e===a||e===b||e===3||!g.tribe(e)?.alive)continue;
  if(g.isFoe(a,e)&&g.isFoe(b,e)&&societyRelation(g,a,e).known&&societyRelation(g,b,e).known)return e;}
 return -1;
}
export function reviewAlliances(g:Game){
 const s=root(g);
 for(const p of s.pacts){if(p.phase!=='active')continue;
  if(g.isFoe(p.a,p.b)){end(g,p,'broken','Hostility between partners broke the pact');continue;}
  if(!g.tribe(p.a)?.alive||!g.tribe(p.b)?.alive){end(g,p,'lapsed','A partner society is gone');continue;}
  if(mutualTrust(g,p.a,p.b)<R.lapseTrust)end(g,p,'lapsed','Trust decayed');}
 const teams=g.state.tribes.filter(t=>isRivalTeam(t.id)&&t.alive).map(t=>t.id).sort((x,y)=>x-y);
 for(let i=0;i<teams.length;i++)for(let j=i+1;j<teams.length;j++){const a=teams[i],b=teams[j];
  if(activePact(g,a,b)||g.isFoe(a,b)||!societyRelation(g,a,b).known||!societyRelation(g,b,a).known||mutualTrust(g,a,b)<R.formTrust)continue;
  const e=sharedEnemy(g,a,b);if(e<0)continue;
  while(s.pacts.length>=R.maximumPacts){const k=s.pacts.findIndex(p=>p.phase!=='active');if(k<0)return;s.pacts.splice(k,1);}
  s.pacts.push({id:g.id(),a,b,phase:'active',formedAt:g.state.time,commonEnemy:e,reason:'Mutual trust against a shared enemy',relief:[]});
  recordConflict(g,'alliance_formed',a,1,{targetId:b});}
}
function end(g:Game,p:Pact,phase:Exclude<AlliancePhase,'active'>,reason:string){p.phase=phase;p.reason=reason;p.endedAt=g.state.time;releaseRelief(g,p,p.relief.map(r=>r.unitId));recordConflict(g,'alliance_ended',p.a,1,{targetId:p.b,reason:phase});}
function releaseRelief(g:Game,p:Pact,ids:number[]){for(const id of ids){const u=g.state.units.find(x=>x.id===id&&x.hp>0);p.relief=p.relief.filter(r=>r.unitId!==id);if(u){u.target=null;queueStandDown(g,u);u.workReason='Relief for an ally finished — returning home';}}}
const reliefFree=(g:Game,u:Unit,team:number)=>u.team===team&&live(u)&&armed(u)&&!isDependent(g,u)&&u.hp>=u.maxHp*.5&&!u.emergency&&!u.societyMissionId&&!hasTaskCommitment(u)&&u.tradeNeedsId===undefined&&!(u as ConflictUnit).conflictIntent&&u.escortId===undefined&&!u.recalled&&['idle','hold','gather'].includes(u.order)&&u.carry===0;
const assigned=(g:Game,id:number)=>(st(g).alliances?.pacts||[]).some(p=>p.relief.some(r=>r.unitId===id));
/** Each second: allies of a community with hostile armed people inside it join the war and send relief. */
export function tickAlliances(g:Game){
 const s=st(g).alliances;if(!s&&g.state.time<R.reviewSeconds)return;
 const r=root(g);if(g.state.time>=r.nextReviewAt){r.nextReviewAt=g.state.time+R.reviewSeconds;reviewAlliances(g);}
 for(const p of r.pacts){if(p.phase!=='active')continue;
  // Expire finished relief.
  for(const a of [...p.relief]){const u=g.state.units.find(x=>x.id===a.unitId);const hall=g.state.buildings.find(b=>b.id===a.hallId&&b.hp>0);
   if(!u||u.hp<=0){p.relief=p.relief.filter(x=>x!==a);continue;}
   const threat=hall&&threatsAt(g,hall,hall.team).length>0;
   if(!hall||(!threat&&dist(u,hall)<=R.communityRadiusMeters)||g.state.time-a.assignedAt>R.reliefSeconds)releaseRelief(g,p,[a.unitId]);}
  for(const [ally,partner] of [[p.a,p.b],[p.b,p.a]] as const){
   for(const hall of g.state.buildings){if(hall.team!==partner||hall.type!=='townhall'||hall.hp<=0||!g.finished(hall))continue;
    const foes=threatsAt(g,hall,partner);if(!foes.length)continue;
    for(const e of new Set(foes.map(f=>f.team)))if(e!==ally&&e!==3&&!g.isFoe(ally,e)&&!activePact(g,ally,e)){declareSocietyHostility(g,ally,e);recordConflict(g,'ally_joined_war',ally,1,{targetId:e});}
    const already=p.relief.filter(x=>x.hallId===hall.id).length;if(already>=foes.length)continue;
    const pool=g.state.units.filter(u=>reliefFree(g,u,ally)&&!assigned(g,u.id)&&dist(u,hall)<=R.reliefRangeMeters).sort((x,y)=>dist(x,hall)-dist(y,hall)||x.id-y.id);
    const armedHome=g.state.units.filter(u=>u.team===ally&&live(u)&&armed(u)).length-p.relief.filter(x=>g.state.units.some(u=>u.id===x.unitId&&u.team===ally)).length;
    const n=Math.max(0,Math.min(R.maximumReliefPerCall,foes.length-already,pool.length,armedHome-R.homeGuard));
    for(const u of pool.slice(0,n)){g.interruptMission(u);u.order='move';u.target=null;u.node=null;u.workReason='Marching to relieve an ally';p.relief.push({unitId:u.id,hallId:hall.id,assignedAt:g.state.time});recordConflict(g,'ally_relief_sent',ally,1,{actorId:u.id,targetId:hall.id});}
   }
  }
 }
}
function threatsAt(g:Game,hall:{x:number;z:number},team:number){return g.state.units.filter(u=>u.team!==team&&live(u)&&armed(u)&&dist(u,hall)<=R.communityRadiusMeters&&g.isFoe(u.team,team));}
/** Drives a relief marcher until it reaches the ally community; combat AI takes over there. */
export function allianceReliefAI(g:Game,u:Unit,dt:number){
 const pacts=st(g).alliances?.pacts;if(!pacts?.length)return false;
 const a=pacts.find(p=>p.phase==='active'&&p.relief.some(r=>r.unitId===u.id))?.relief.find(r=>r.unitId===u.id);if(!a||u.emergency)return false;
 const hall=g.state.buildings.find(b=>b.id===a.hallId&&b.hp>0);if(!hall)return false;
 if(u.target&&u.target.hp>0)return false;
 if(dist(u,hall)<=R.communityRadiusMeters*.6){const foe=threatsAt(g,hall,hall.team).filter(f=>g.isFoe(u.team,f.team)).sort((x,y)=>dist(x,u)-dist(y,u))[0];if(foe){u.target=foe;u.order='attack';return false;}u.order='hold';u.workReason='Guarding an ally community';return true;}
 const spot=g.interactionSpot(u,hall);if(!spot){u.order='hold';u.workReason='No route to the ally';return true;}
 u.tx=spot.x;u.tz=spot.z;u.order='move';g.steer(u,dt);u.workReason='Marching to relieve an ally';return true;
}
export function validAllianceState(state:unknown){
 const s=state as Game['state']&{alliances?:AllianceState};if(!s||typeof s!=='object'||!Array.isArray(s.tribes))return false;
 const v=s.alliances;if(v===undefined)return true;
 if(!v||v.version!==1||!Number.isFinite(v.nextReviewAt)||v.nextReviewAt<0||!Array.isArray(v.pacts)||v.pacts.length>R.maximumPacts)return false;
 const team=(n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<s.tribes.length&&n!==3,id=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0;
 const ids=new Set<number>(),activePairs=new Set<string>(),units=new Set<number>();
 for(const p of v.pacts){
  if(!p||!id(p.id)||ids.has(p.id)||!team(p.a)||!team(p.b)||p.a>=p.b||!['active','broken','lapsed'].includes(p.phase)||!Number.isFinite(p.formedAt)||p.formedAt<0||!Number.isInteger(p.commonEnemy)||typeof p.reason!=='string'||p.reason.length>300||!Array.isArray(p.relief)||p.relief.length>64)return false;ids.add(p.id);
  if(p.endedAt!==undefined&&(!Number.isFinite(p.endedAt)||p.endedAt<0))return false;
  if(p.phase==='active'){const k=p.a+':'+p.b;if(activePairs.has(k))return false;activePairs.add(k);}else if(p.relief.length)return false;
  for(const r of p.relief){if(!r||!id(r.unitId)||!id(r.hallId)||!Number.isFinite(r.assignedAt)||r.assignedAt<0||units.has(r.unitId))return false;units.add(r.unitId);}
 }
 return true;
}
