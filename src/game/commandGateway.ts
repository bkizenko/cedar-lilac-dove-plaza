import type {Game} from './sim';
import type {Unit} from './types';
import {isDependent} from './settlement';

export const COMMAND_RULES = {version: 1, recentOutcomeLimit: 128} as const;
export type CommandOutcome = {timeSeconds:number; actorId:number; kind:string; accepted:boolean; reason:string|null};
type Diagnostics = {attempted:number; accepted:number; rejected:number; outcomes:CommandOutcome[]};
const diagnostics = new WeakMap<Game,Diagnostics>();
/** Session diagnostics are bounded and deliberately separate from legacy saves. */
export function resetCommandDiagnostics(g:Game){diagnostics.delete(g);}
export function commandDiagnostics(g:Game):Diagnostics {
  let d=diagnostics.get(g);
  if(!d){d={attempted:0,accepted:0,rejected:0,outcomes:[]};diagnostics.set(g,d);}
  return { ...d, outcomes:d.outcomes.map(o=>({...o})) };
}
/** Compatibility gateway: validate physical feasibility before interrupting paid work.
 * Acceptance reports actor eligibility only; target checks and the existing executor follow. */
export function acceptWorkerCommand(g:Game,u:Unit,kind:string){
  const reason=u.hp<=0?'This resident is incapacitated':
    isDependent(g,u)?'Children remain supported by the village':
    u.boat?.phase==='aboard'?'Disembark before assigning land work':null;
  let d=diagnostics.get(g);
  if(!d){d={attempted:0,accepted:0,rejected:0,outcomes:[]};diagnostics.set(g,d);}
  d.attempted++;if(reason)d.rejected++;else d.accepted++;
  d.outcomes.push({timeSeconds:g.state.time,actorId:u.id,kind,accepted:!reason,reason});
  if(d.outcomes.length>COMMAND_RULES.recentOutcomeLimit)d.outcomes.shift();
  if(reason){u.workReason=reason;g.banner(reason,3);}
  return !reason;
}
