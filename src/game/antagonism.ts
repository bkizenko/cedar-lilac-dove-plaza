/** Shared personality-sensitive grievance math. Tension is saved on the tribe;
 * distance never deletes the memory of a witnessed intrusion. */
export function grievanceTemper(aggro:number,expand:number,trust:number){
 const clamp=(n:number)=>Math.max(0,Math.min(1,Number.isFinite(n)?n:0));
 const sensitivity=.65+.65*clamp(aggro)+.35*clamp(expand);
 return {sensitivity,warThreshold:.9-.18*clamp(aggro),cooling:(.0006+.0004*clamp(trust))/sensitivity};
}
export function grievanceChange(dt:number,aggro:number,expand:number,trust:number,intruders:number,overlap:number){
 const t=grievanceTemper(aggro,expand,trust);
 return Math.max(0,dt)*(intruders>0?(.006+Math.min(.018,intruders*.004))*t.sensitivity:
   Math.max(0,overlap)*.00035*t.sensitivity-t.cooling);
}
