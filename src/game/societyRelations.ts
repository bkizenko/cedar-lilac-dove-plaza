import {recordDiplomaticAttack,recordDiplomaticLegal} from './diplomaticKnowledge';
import type {Game} from './sim';
import type {Building,Unit} from './types';

/** Sentiment is directed. A war permits either side to defend itself, while
 * an agreement changes only its two signatories, never every rival at once. */
export type SocietyRelation={from:number;to:number;known:boolean;trust:number;grievance:number;hostile:boolean;peaceUntil:number;lastContactSeconds:number};
export type SocietyRelationState={societyRelations?:SocietyRelation[]};
export const SOCIETY_RELATION_RULES={version:1,maximumPairs:992,attackGrievance:.18,peaceGrievanceRecovery:.3,peaceTrustFloor:.4,peaceSeconds:600,contactRadiusMeters:12} as const;
const state=(g:Game)=>g.state as Game['state']&SocietyRelationState;
const validPair=(g:Game,a:number,b:number)=>a!==b&&a!==3&&b!==3&&Number.isInteger(a)&&Number.isInteger(b)&&a>=0&&b>=0&&!!g.tribe(a)&&!!g.tribe(b);
/** Reading a relation does not discover a society or allocate a save entry. */
export function societyRelation(g:Game,from:number,to:number):Readonly<SocietyRelation>{
 const recorded=state(g).societyRelations?.find(r=>r.from===from&&r.to===to);
 const legacy=from===0?g.tribe(to):to===0?g.tribe(from):undefined;
 // Existing player trade, territorial warnings and alliance controls still
 // maintain this facade. Directed NPC pairs never read player-relative mood.
 if(recorded)return legacy?{...recorded,hostile:!!legacy.hostile,trust:legacy.trust||0,grievance:to===0?Math.max(recorded.grievance,legacy.tension||0):recorded.grievance,peaceUntil:legacy.hostile?0:Math.max(recorded.peaceUntil,legacy.compactUntil||0)}:recorded;
 return {from,to,known:false,trust:legacy?.trust||0,grievance:legacy?.tension||0,hostile:!!legacy?.hostile,peaceUntil:legacy?.compactUntil||0,lastContactSeconds:0};
}
function edit(g:Game,from:number,to:number){
 const s=state(g),pairs=s.societyRelations??=[];let relation=pairs.find(r=>r.from===from&&r.to===to);
 if(!relation){relation={...societyRelation(g,from,to)};pairs.push(relation);}return relation;
}
const pairIndexes=new WeakMap<Game,{list:SocietyRelation[];length:number;byKey:Map<number,SocietyRelation>}>();
function indexedPair(g:Game,a:number,b:number){const list=state(g).societyRelations;if(!list?.length)return undefined;let index=pairIndexes.get(g);if(!index||index.list!==list||index.length!==list.length){index={list,length:list.length,byKey:new Map(list.map(r=>[r.from*1024+r.to,r]))};pairIndexes.set(g,index);}return index.byKey.get(a*1024+b);}
export function societiesAreFoes(g:Game,a:number,b:number){
 if(a===b)return false;if(a===3||b===3)return true;
 // Preserve the legacy player's authoritative facade without pair-table scans
 // or temporary relation objects in the hot targeting path.
 if(a===0)return !!g.tribe(b)?.hostile;if(b===0)return !!g.tribe(a)?.hostile;
 if(a<0||b<0||a>=g.state.tribes.length||b>=g.state.tribes.length)return false;
 const ab=indexedPair(g,a,b),ba=indexedPair(g,b,a);
 if(ab&&ba&&ab.peaceUntil>g.state.time&&ba.peaceUntil>g.state.time)return false;
 return !!ab?.hostile||!!ba?.hostile;
}
/** Call on a real encounter, never merely because a planner inspected a target. */
export function recordSocietyContact(g:Game,a:Unit,b:Unit|Building){
 if(!validPair(g,a.team,b.team)||a.hp<=0||b.hp<=0||!g.state.units.includes(a)||!(b.kind==='unit'?g.state.units.includes(b):g.state.buildings.includes(b))||Math.hypot(a.x-b.x,a.z-b.z)>SOCIETY_RELATION_RULES.contactRadiusMeters+('w'in b?Math.max(b.w,b.d)*.5:0))return false;
 for(const [from,to]of [[a.team,b.team],[b.team,a.team]]){const r=edit(g,from,to);r.known=true;r.lastContactSeconds=g.state.time;}return true;
}
/** A dispatched threat may declare war on contact; a plan alone cannot do so. */
export function declareSocietyHostility(g:Game,from:number,to:number){
 if(!validPair(g,from,to))return false;const r=edit(g,from,to);r.known=true;r.hostile=true;r.peaceUntil=0;r.trust=0;
 const reverse=edit(g,to,from);reverse.peaceUntil=0;
 if(from===0||to===0){const rival=g.tribe(from===0?to:from);rival.hostile=true;rival.ally=false;rival.trust=0;if(from===0)recordDiplomaticLegal(g,to,true);}
 return true;
}
/** The victim's own damage is firsthand evidence; no global enemy stock lookup. */
export function recordSocietyAttack(g:Game,attacker:Unit|Building,victim:Unit|Building,damage:number){
 if(!Number.isFinite(damage)||damage<=0||!validPair(g,attacker.team,victim.team)||!(attacker.kind==='unit'?g.state.units.includes(attacker):g.state.buildings.includes(attacker))||!(victim.kind==='unit'?g.state.units.includes(victim):g.state.buildings.includes(victim)))return false;
 declareSocietyHostility(g,attacker.team,victim.team);edit(g,attacker.team,victim.team).lastContactSeconds=g.state.time;const r=edit(g,victim.team,attacker.team);r.known=true;r.hostile=true;r.lastContactSeconds=g.state.time;r.grievance=Math.min(1,r.grievance+SOCIETY_RELATION_RULES.attackGrievance);r.trust=0;recordDiplomaticAttack(g,attacker,victim);return true;
}
/** Authoritative legal adapter; legacy peace calls can use it without claiming
 * a messenger physically arrived. The contextual acceptance below checks that. */
export function agreeSocietyTruce(g:Game,a:number,b:number){
 if(!validPair(g,a,b))return false;
 for(const [from,to]of [[a,b],[b,a]]){const r=edit(g,from,to);r.hostile=false;r.peaceUntil=g.state.time+SOCIETY_RELATION_RULES.peaceSeconds;r.trust=Math.max(r.trust,SOCIETY_RELATION_RULES.peaceTrustFloor);r.grievance=Math.max(0,r.grievance-SOCIETY_RELATION_RULES.peaceGrievanceRecovery);}
 if(a===0||b===0){const t=g.tribe(a===0?b:a);t.hostile=false;t.ally=false;t.compactUntil=g.state.time+SOCIETY_RELATION_RULES.peaceSeconds;t.trust=Math.max(t.trust||0,SOCIETY_RELATION_RULES.peaceTrustFloor);}
 // Clear only combat commitments against this signatory. A cached target or
 // legacy pillage order must not immediately restart a witnessed truce.
 if(a===0||b===0)recordDiplomaticLegal(g,a===0?b:a,false);
 for(const u of g.state.units){const other=u.team===a?b:u.team===b?a:null;if(other===null||u.hp<=0)continue;if(u.target?.team!==other&&u.pillage!==other)continue;u.target=null;u.pillage=-1;u.attackDestination=null;u.order='return';u.recalled=true;u.workReason='Truce agreed — withdrawing with existing possessions';if(u.emergency)u.emergency.until=g.state.time;}
 return true;
}
/** Caller establishes physical mutual contact before accepting terms. */
export function acceptSocietyPeace(g:Game,messenger:Unit,receiver:Unit|Building){return recordSocietyContact(g,messenger,receiver)&&agreeSocietyTruce(g,messenger.team,receiver.team);}
export function validSocietyRelations(value:unknown,tribeCount:number){
 if(value===undefined)return true;if(!Array.isArray(value)||value.length>SOCIETY_RELATION_RULES.maximumPairs)return false;
 const seen=new Set<string>();for(const r of value){if(!r||!Number.isInteger(r.from)||!Number.isInteger(r.to)||r.from<0||r.to<0||r.from>=tribeCount||r.to>=tribeCount||r.from===r.to||r.from===3||r.to===3||typeof r.known!=='boolean'||typeof r.hostile!=='boolean'||![r.trust,r.grievance].every(n=>Number.isFinite(n)&&n>=0&&n<=1)||![r.peaceUntil,r.lastContactSeconds].every(n=>Number.isFinite(n)&&n>=0))return false;const key=`${r.from}:${r.to}`;if(seen.has(key))return false;seen.add(key);}return true;
}
