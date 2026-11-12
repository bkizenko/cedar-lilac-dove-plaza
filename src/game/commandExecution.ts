import type {Game} from './sim';
import type {Building,ResourceNode,Critter,Unit} from './types';
import type {ProductionProject} from './production';
import {peekWorkRuntime} from './workRuntime';

/** Measurements only. These bounds never admit, reject, retime or repair work. */
export const COMMAND_EXECUTION_RULES={version:1,recentLimit:128,ownershipLimit:64,reasonLimit:24,movementEpsilonMeters:.001} as const;
export type ExecutionKind='move'|'gather'|'build'|'production';
type Status='pending'|'executing'|'completed'|'superseded'|'lost'|'displaced'|'evicted'|'unsupported';
type Target=Building|ResourceNode|Critter|ProductionProject;
export type CommandTrace={id:number;actorId:number;kind:ExecutionKind;targetId:number|null;issuedAt:number;firstMotionAt:number|null;firstUsefulAt:number|null;firstExecutionAt:number|null;completedAt:number|null;endedAt:number|null;status:Status;completion:string|null;movementMeters:number;handsOnWorkSeconds:number;usefulIncrements:number;deliveredUnits:number;blockedCommandSeconds:number;blockedByReason:Record<string,number>;waitingCommandSeconds:number;waitingByReason:Record<string,number>;lastBlockedReason:string|null;executionLatencySeconds:number|null;executionWallLatencyMs:number|null};
export type OwnershipObservation={type:'owner_conflict'|'reservation_failure';jobId:string;actorId?:number;previousOwner?:string;reason:string};
type Sample={x:number;z:number;cargo:number;items:number;resource:number;resourceId:number|null;build:number;project:number};
type Active={trace:CommandTrace;actor:Unit;target?:Target;destination?:{x:number;z:number};issuedWall:number;baseline:Sample|null;observedAt:number|null;usefulObservedAt:number|null};
type Context={state:Game['state'];startedAt:number;nextId:number;recent:CommandTrace[];active:Map<number,Active>;issued:number;completed:number;evicted:number;untracedDispatches:number;waitingByReason:Record<string,number>;blockedByReason:Record<string,number>;ownership:{attempted:number;succeeded:number;denied:number;unexpectedDisplacements:number;reservationFailures:number;failureReasons:Record<string,number>;recent:(OwnershipObservation&{time:number})[]}};
const contexts=new WeakMap<Game,Context>();
function context(g:Game){let c=contexts.get(g);if(!c||c.state!==g.state){c={state:g.state,startedAt:g.state.time,nextId:1,recent:[],active:new Map(),issued:0,completed:0,evicted:0,untracedDispatches:0,waitingByReason:{},blockedByReason:{},ownership:{attempted:0,succeeded:0,denied:0,unexpectedDisplacements:0,reservationFailures:0,failureReasons:{},recent:[]}};contexts.set(g,c);}return c;}
const nowWall=()=>typeof performance==='undefined'?0:performance.now();
function accumulate(map:Record<string,number>,key:string,n:number){if(!(key in map)&&Object.keys(map).length>=COMMAND_EXECUTION_RULES.reasonLimit)key='other';map[key]=(map[key]||0)+n;}
export function resetCommandExecution(g:Game){contexts.delete(g);}
/** Snapshot the existing owner without initializing/reconciling the work ledger. */
export function commandOwnerBefore(g:Game,u:Unit){return peekWorkRuntime(g)?.activeJob(u.id)?.id??null;}
function sample(a:Active):Sample{const u=a.actor,node=u.node;
 return{x:u.x,z:u.z,cargo:u.carry,items:u.itemCargo?Object.values(u.itemCargo).reduce((n,v)=>n+(v||0),0):0,resource:node&&'amount'in node?node.amount:node&&'carcass'in node?node.carcass?.meat??0:0,resourceId:node?.id??null,build:a.target&&'build'in a.target?a.target.build:0,project:a.target&&'progress'in a.target?a.target.progress:0};
}
function end(c:Context,a:Active,status:Status,time:number,completion:string|null=null){a.trace.status=status;a.trace.endedAt=time;a.trace.completion=completion;if(status==='completed'){a.trace.completedAt=time;c.completed++;}if(c.active.get(a.actor.id)===a)c.active.delete(a.actor.id);}
const untracedGatherTarget=(node:Target|null|undefined)=>!!node&&('species'in node||'type'in node&&!['dock','quarry'].includes(node.type)||'kind'in node&&node.kind==='farm');
const ordinaryWaiting=new Set(['passive_process','rest_or_shelter','pickup_wait','replacement_carrier']);
function inactive(c:Context,a:Active,reason:string,dt:number){if(ordinaryWaiting.has(reason)){a.trace.waitingCommandSeconds+=dt;accumulate(a.trace.waitingByReason,reason,dt);accumulate(c.waitingByReason,reason,dt);a.trace.lastBlockedReason=null;}else{a.trace.blockedCommandSeconds+=dt;accumulate(a.trace.blockedByReason,reason,dt);accumulate(c.blockedByReason,reason,dt);a.trace.lastBlockedReason=reason;}}
/** Observe only actual ordinary-resource work, after physical work-surface admission. */
export function commandUsefulWork(g:Game,u:Unit,seconds:number){const c=contexts.get(g),a=c?.state===g.state?c.active.get(u.id):undefined;if(!a||a.trace.kind!=='gather'||!Number.isFinite(seconds)||seconds<=0||untracedGatherTarget(u.node)||a.trace.targetId!==null&&u.node?.id!==a.trace.targetId)return;a.usefulObservedAt=g.state.time;a.trace.handsOnWorkSeconds+=seconds;a.trace.firstUsefulAt??=g.state.time;executed(a,g.state.time);}

/** Called AFTER a real command has installed its order/target or paid project. */
export function commandIssued(g:Game,u:Unit,kind:ExecutionKind,target?:Target,ownerBefore:string|null=null,destination?:{x:number;z:number}){
 const c=context(g),old=c.active.get(u.id);if(old)end(c,old,'superseded',g.state.time,'new_explicit_command');
 if(kind==='gather'&&untracedGatherTarget(target)){c.untracedDispatches++;return;}
 if(kind==='production'&&target)for(const previous of c.active.values())if(previous.trace.kind==='production'&&previous.trace.targetId===target.id)end(c,previous,'superseded',g.state.time,'paid_project_resumed');
 // Movement may intentionally coexist with a carried paid owner. An unchanged
 // owner is not a refused handover; denials come from real coordinator attempts.
 if(ownerBefore&&commandOwnerBefore(g,u)!==ownerBefore){c.ownership.attempted++;c.ownership.succeeded++;}
 const trace:CommandTrace={id:c.nextId++,actorId:u.id,kind,targetId:target?.id??null,issuedAt:g.state.time,firstMotionAt:null,firstUsefulAt:null,firstExecutionAt:null,completedAt:null,endedAt:null,status:'pending',completion:null,movementMeters:0,handsOnWorkSeconds:0,usefulIncrements:0,deliveredUnits:0,blockedCommandSeconds:0,blockedByReason:{},waitingCommandSeconds:0,waitingByReason:{},lastBlockedReason:null,executionLatencySeconds:null,executionWallLatencyMs:null};
 const a:Active={trace,actor:u,target,destination,issuedWall:nowWall(),baseline:null,observedAt:null,usefulObservedAt:null};c.recent.push(trace);c.active.set(u.id,a);c.issued++;
 if(c.recent.length>COMMAND_EXECUTION_RULES.recentLimit){const removed=c.recent.shift()!;const active=c.active.get(removed.actorId);if(active?.trace===removed){end(c,active,'evicted',g.state.time,'bounded_diagnostic_history');c.evicted++;}}
}
/** Fast no-context/no-active path for ordinary untraced actors. */
export function beginCommandActor(g:Game,u:Unit){const c=contexts.get(g);if(c?.state!==g.state)return;const a=c.active.get(u.id);if(a){a.baseline=a.trace.kind==='production'&&(a.target as ProductionProject).actorId!==u.id?null:sample(a);}}
function blockedReason(g:Game,a:Active){const u=a.actor,p=a.trace.kind==='production'?a.target as ProductionProject:undefined,reason=p?.blockedReason||u.workReason||'';
 if(p?.phase==='paused'||p?.phase==='stored')return'paid_work_paused';
 if(p&&['curing','fermenting','cooling'].includes(p.phase))return'passive_process';
 if(p&&p.actorId!==u.id)return p.actorId===null?'pickup_wait':'replacement_carrier';
 if(u.emergency)return'local_emergency';if(u.resting||u.shelterId!==undefined)return'rest_or_shelter';
 if(/storage.*full|cache.*full|no room.*stor/i.test(reason))return'storage_capacity';if(/bench|slot.*reserved|ownership|another.*job/i.test(reason))return'workplace_or_owner_capacity';
 if(/no reachable|route blocked|unreachable|clear.*entrance|blocked.*route|no clear.*route|no.*path/i.test(reason))return'route_unavailable';
 if((u.retryWorkAt||0)>g.state.time&&u.blockedTask!==undefined)return'route_retry';if(u.stuckT>0)return'route_obstructed';
 if(/need.*(wood|log|food|water|sample|material|fuel)|waiting.*(suppl|material|fuel)/i.test(reason))return'waiting_for_inputs';
 if(/adult|maker.*unavailable|carrier.*unavailable/i.test(reason))return'actor_unavailable';
 if(g.navigationBudgetRemaining()<=0&&['move','return','explore','gather','build'].includes(u.order))return'navigation_budget';return'awaiting_executor';
}
function executed(a:Active,time:number){if(a.trace.firstExecutionAt!==null)return;a.trace.firstExecutionAt=time;a.trace.executionLatencySeconds=Math.max(0,time-a.trace.issuedAt);a.trace.executionWallLatencyMs=Math.max(0,nowWall()-a.issuedWall);a.trace.status='executing';}
export function endCommandActor(g:Game,u:Unit,dt:number){const c=contexts.get(g),a=c?.state===g.state?c.active.get(u.id):undefined;if(!c||!a||!a.baseline||dt<=0)return;const before=a.baseline,after=sample(a);a.baseline=null;a.observedAt=g.state.time;
 const moved=Math.hypot(after.x-before.x,after.z-before.z),useful=a.usefulObservedAt===g.state.time||(a.trace.kind==='gather'?((a.trace.targetId===null||before.resourceId===a.trace.targetId)&&(after.cargo>before.cargo||after.items>before.items||after.resourceId!==null&&after.resourceId===before.resourceId&&after.resource<before.resource)):a.trace.kind==='build'?after.build>before.build:a.trace.kind==='production'?after.project>before.project:false);
 if(moved>COMMAND_EXECUTION_RULES.movementEpsilonMeters){a.trace.movementMeters+=moved;a.trace.firstMotionAt??=g.state.time;executed(a,g.state.time);}
 if(useful){a.trace.usefulIncrements++;a.trace.firstUsefulAt??=g.state.time;executed(a,g.state.time);}
 inspectCompletion(g,c,a);if(c.active.get(u.id)!==a)return;
 if(moved<=COMMAND_EXECUTION_RULES.movementEpsilonMeters&&!useful){inactive(c,a,blockedReason(g,a),dt);}else a.trace.lastBlockedReason=null;
 inspectCompletion(g,c,a);
}
function inspectCompletion(g:Game,c:Context,a:Active){const t=a.trace,u=a.actor;if(t.kind==='gather'&&untracedGatherTarget(u.node)){c.untracedDispatches++;end(c,a,'unsupported',g.state.time,'untraced_gather_domain');return;}if(u.hp<=0&&t.kind!=='production'){end(c,a,'lost',g.state.time,'actor_lost');return;}
 if(t.kind==='production'){const p=a.target as ProductionProject;if(p.phase==='complete'){end(c,a,'completed',g.state.time,'paid_batch_delivered');return;}if(p.phase==='lost'){end(c,a,'lost',g.state.time,'paid_batch_lost');return;}}
 if(t.kind==='build'&&a.target&&'build'in a.target&&a.target.build>=1&&!a.target.plannedCost){end(c,a,'completed',g.state.time,'structure_completed');return;}
 if(t.kind==='move'&&a.destination&&['hold','idle'].includes(u.order)&&Math.hypot(u.x-a.destination.x,u.z-a.destination.z)<=Math.max(1.6,u.r*2)){executed(a,g.state.time);end(c,a,'completed',g.state.time,t.firstMotionAt===null?'already_at_destination':'destination_reached');return;}
 // Explicit replacement is recorded by commandIssued. This is an actual
 // unannounced executor displacement, excluding known physical interruptions.
 if(!u.emergency&&!u.recalled&&t.kind==='gather'&&t.targetId!==null&&u.order==='gather'&&u.node&&u.node.id!==t.targetId){c.ownership.unexpectedDisplacements++;end(c,a,'displaced',g.state.time,'executor_replaced_gather_target');return;}
 if(!u.emergency&&!u.recalled&&!u.resting&&!u.shelterId&&t.kind==='move'&&!['move','idle','hold'].includes(u.order)){c.ownership.unexpectedDisplacements++;end(c,a,'displaced',g.state.time,'executor_replaced_move');}
}
/** Reconcile factual terminal state after global tick/death cleanup too. */
export function finishCommandFrame(g:Game,dt:number){const c=contexts.get(g);if(c?.state!==g.state||!c.active.size)return;for(const a of c.active.values()){if(a.trace.kind!=='production'&&!g.state.units.includes(a.actor)){end(c,a,'lost',g.state.time,'actor_removed');continue;}inspectCompletion(g,c,a);if(c.active.get(a.actor.id)!==a)continue;if(a.observedAt!==g.state.time&&dt>0){inactive(c,a,blockedReason(g,a),dt);}inspectCompletion(g,c,a);}}
/** Only the ordinary successful physical-delivery accounting path calls this. */
export function commandCargoDelivered(g:Game,actorId:number,amount:number){const c=contexts.get(g),a=c?.state===g.state?c.active.get(actorId):undefined;if(!c||!a||a.trace.kind!=='gather'||amount<=0||a.trace.firstUsefulAt===null)return;a.trace.deliveredUnits+=amount;end(c,a,'completed',g.state.time,'first_gather_load_delivered');}
export function commandOwnershipObserved(g:Game,event:OwnershipObservation){const c=context(g);if(event.type==='owner_conflict'){c.ownership.attempted++;c.ownership.denied++;}else{c.ownership.reservationFailures++;const reason=event.reason.startsWith('Insufficient capacity:')?event.reason:'invalid_quantity';accumulate(c.ownership.failureReasons,reason,1);}c.ownership.recent.push({...event,time:g.state.time});if(c.ownership.recent.length>COMMAND_EXECUTION_RULES.ownershipLimit)c.ownership.recent.shift();}
/** Read-only snapshots; no ledger bootstrap, route query or gameplay mutation. */
export function commandExecutionDiagnostics(g:Game){const c=contexts.get(g),valid=c?.state===g.state?c:undefined;return{version:COMMAND_EXECUTION_RULES.version,sessionStartedAt:valid?.startedAt??g.state.time,resetPolicy:'Current native session; new world and reload reset measurements. Saved work is never re-issued by telemetry.',coverage:['move destination','ordinary resource hands-on work and first delivered load','new-structure completion (extensions unsupported)','paid production delivery'],unsupported:'Fields, planting, hunting, store tending, extensions and other domain commands have no execution trace; eligibility is separate.',issued:valid?.issued??0,completed:valid?.completed??0,active:valid?.active.size??0,evicted:valid?.evicted??0,untracedDispatches:valid?.untracedDispatches??0,waitingCommandSeconds:Object.values(valid?.waitingByReason??{}).reduce((n,v)=>n+v,0),waitingByReason:{...valid?.waitingByReason},blockedCommandSeconds:Object.values(valid?.blockedByReason??{}).reduce((n,v)=>n+v,0),blockedByReason:{...valid?.blockedByReason},ownership:valid?{...valid.ownership,failureReasons:{...valid.ownership.failureReasons},recent:valid.ownership.recent.map(o=>({...o}))}:{attempted:0,succeeded:0,denied:0,unexpectedDisplacements:0,reservationFailures:0,failureReasons:{},recent:[]},recent:(valid?.recent??[]).map(t=>({...t,blockedByReason:{...t.blockedByReason},waitingByReason:{...t.waitingByReason}}))};}
