/** Keep a slow simulation from monopolising the next drawing opportunity.
 * Fixed simulation quanta are preserved; excess real-time debt is discarded,
 * never converted into a larger simulation step or skipped world events. */
export const FRAME_SIMULATION_RULES=Object.freeze({stepSeconds:1/30,wallBudgetMs:10,maximumSteps:3,maximumPendingSeconds:1/30});
export function advanceFrameSimulation(pending:number,elapsed:number,step:(dt:number)=>void,now=()=>performance.now()){
 const r=FRAME_SIMULATION_RULES;let accumulator=Math.max(0,pending)+Math.max(0,elapsed),steps=0;
 const start=now();
 while(accumulator+1e-12>=r.stepSeconds&&steps<r.maximumSteps){
  if(steps>0&&now()-start>=r.wallBudgetMs)break;
  step(r.stepSeconds);accumulator=Math.max(0,accumulator-r.stepSeconds);steps++;
 }
 const deferred=accumulator>=r.stepSeconds-1e-12,discardedSeconds=Math.max(0,accumulator-r.maximumPendingSeconds);
 return {pendingSeconds:Math.min(accumulator,r.maximumPendingSeconds),steps,limited:deferred,discardedSeconds};
}
