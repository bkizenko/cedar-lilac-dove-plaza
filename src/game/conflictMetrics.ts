import type {Game} from './sim';
export const CONFLICT_EVENT_RULES={version:1,recentLimit:128} as const;
export type ConflictEventKind='context_order'|'surrender'|'prisoner_custody'|'prisoner_release'|'prisoner_escape'|'prisoner_death'|'guard_seconds'|'prisoner_food_used'|'prisoner_water_used'|'control_seconds'|'occupation_secured'|'occupation_contested'|'occupation_withdrawn'|'village_integrated'|'buildings_transferred'|'residents_transferred'|'paid_projects_transferred'|'capitulation'|'capitulation_accepted'|'domination_started'|'domination_lapsed'|'domination_rebelled'|'domination_released'|'tribute_delivered'|'tribute_lost'|'stood_down'|'interrogation'|'ransom_paid'|'ransom_lost'|'prisoner_exchange'|'captive_integrated';
export type ConflictEvent={sequence:number;timeSeconds:number;kind:ConflictEventKind;team:number;amount:number;actorId?:number;targetId?:number;reason?:string};
export type ConflictJournal={version:1;nextSequence:number;recent:ConflictEvent[];totals:Record<string,number>};
export function recordConflict(g:Game,kind:ConflictEventKind,team:number,amount=1,details:Pick<ConflictEvent,'actorId'|'targetId'|'reason'>={}){
 if(!Number.isFinite(amount)||amount<=0)return;
 const state=g.state as Game['state']&{conflictJournal?:ConflictJournal};
 const journal=state.conflictJournal??={version:1,nextSequence:1,recent:[],totals:{}};
 const key=`${kind}:${team}`;journal.totals[key]=(journal.totals[key]||0)+amount;
 // Continuous quantities remain in totals; sparse events describe transitions.
 if(['guard_seconds','prisoner_food_used','prisoner_water_used','control_seconds'].includes(kind))return;
 journal.recent.push({sequence:journal.nextSequence++,timeSeconds:g.state.time,kind,team,amount,...details});
 if(journal.recent.length>CONFLICT_EVENT_RULES.recentLimit)journal.recent.shift();
}
export function validConflictJournal(value:unknown){
 if(value===undefined)return true;
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const j=value as ConflictJournal,kinds=['context_order','surrender','prisoner_custody','prisoner_release','prisoner_escape','prisoner_death','guard_seconds','prisoner_food_used','prisoner_water_used','control_seconds','occupation_secured','occupation_contested','occupation_withdrawn','village_integrated','buildings_transferred','residents_transferred','paid_projects_transferred','capitulation','capitulation_accepted','domination_started','domination_lapsed','domination_rebelled','domination_released','tribute_delivered','tribute_lost','stood_down','interrogation','ransom_paid','ransom_lost','prisoner_exchange','captive_integrated'];
 if(j.version!==1||!Number.isSafeInteger(j.nextSequence)||j.nextSequence<1||!Array.isArray(j.recent)||j.recent.length>CONFLICT_EVENT_RULES.recentLimit||!j.totals||typeof j.totals!=='object'||Array.isArray(j.totals)||Object.keys(j.totals).length>kinds.length*32)return false;
 for(const [key,n]of Object.entries(j.totals)){const parts=key.split(':'),[kind,team]=parts;if(parts.length!==2||!kinds.includes(kind)||!/^([0-9]|[12][0-9]|3[01])$/.test(team)||!Number.isFinite(n)||n<0)return false;}
 let sequence=0;for(const e of j.recent){if(!e||!Number.isSafeInteger(e.sequence)||e.sequence<=sequence||e.sequence>=j.nextSequence||!Number.isFinite(e.timeSeconds)||e.timeSeconds<0||!kinds.includes(e.kind)||!Number.isInteger(e.team)||e.team<0||e.team>=32||!Number.isFinite(e.amount)||e.amount<=0||e.actorId!==undefined&&(!Number.isSafeInteger(e.actorId)||e.actorId<1)||e.targetId!==undefined&&(!Number.isSafeInteger(e.targetId)||e.targetId<1)||e.reason!==undefined&&(typeof e.reason!=='string'||e.reason.length>500))return false;sequence=e.sequence;}
 return true;
}
