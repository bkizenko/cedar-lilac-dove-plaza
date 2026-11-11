import type { GameState, Unit } from '../game/types';
import { workerActivity } from '../game/workerActivity';

export function WorkerActivity({state,resident}:{state:GameState;resident:Unit}){
 const a=workerActivity(state,resident);
 return <div className="space-y-1">
  <div>{a.recipe?`${a.recipe} · `:''}{a.stage}</div>
  {a.progress!==undefined&&<progress className="h-1 w-full" value={a.progress} max={1} aria-label="Batch work completed"/>}
  {a.blocked&&<div className="text-blood">{a.blocked}</div>}
  <details><summary>Task details</summary>
   {a.source&&<div>From · {a.source}</div>}
   {a.destination&&<div>To · {a.destination}</div>}
   <div>Carried · {a.cargo.join(' · ')||'Empty hands'}</div>
   {a.batchCargo.length>0&&<div>Paid batch carried · {a.batchCargo.join(' · ')}</div>}
   {a.projectId!==undefined&&<div>Batch #{a.projectId} · {Math.floor(a.workSeconds||0)}/{a.requiredWorkSeconds}s work · {Math.floor(a.batchAgeSeconds||0)}s since assigned</div>}
  </details>
 </div>;
}
