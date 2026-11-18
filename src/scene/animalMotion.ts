/** Pure presentation-motion helpers for animals: distance-driven gait phase, turn-rate-limited heading, slope pitch, turn lean. No clock, no randomness. */
const TAU=Math.PI*2;
/** Shortest signed angle difference a-b in (-PI, PI]. */
export const angleDiff=(a:number,b:number)=>{const d=(a-b)%TAU;return d>Math.PI?d-TAU:d<=-Math.PI?d+TAU:d;};
/** Stride phase (0..1) advances by metres moved / stride length, so feet never slide faster or slower than the ground moves. Teleports (> maxStep) do not advance it. */
export function advancePhase(phase:number,distance:number,stride:number,maxStep=3):number{
 if(!(stride>0)||!(distance>0)||distance>maxStep)return ((phase%1)+1)%1;
 return (((phase+distance/stride)%1)+1)%1;
}
/** Heading easing toward `target` with an angular-velocity cap (rad/s); `ease` is the exponential rate (1/s). Never rotates the long way round or overshoots. */
export function turnToward(cur:number,target:number,dt:number,maxRate:number,ease=9):number{
 if(!(dt>0))return cur;
 const d=angleDiff(target,cur),want=d*(1-Math.exp(-dt*ease)),cap=maxRate*dt;
 return cur+Math.max(-cap,Math.min(cap,want));
}
/** Body pitch (rad, nose up positive) from the ground height change over the horizontal distance moved, clamped and softened. */
export function slopePitch(dy:number,dist:number,max=.35):number{
 if(!(dist>1e-4))return 0;
 const p=Math.atan2(dy,dist);return Math.max(-max,Math.min(max,p*.8));
}
/** Smooth a value toward a target at exponential rate k (1/s). */
export const easeTo=(cur:number,target:number,dt:number,k=6)=>cur+(target-cur)*(1-Math.exp(-Math.max(0,dt)*k));
/** Roll (rad) leaning into a turn: proportional to turn rate x speed, clamped. Positive turn (left) gives a lean toward the inside. */
export function turnLean(turnRate:number,speed:number,max=.12):number{
 return Math.max(-max,Math.min(max,turnRate*speed*.05));
}
/** Per-animal idle phase offset in seconds (0..period) from an integer seed, so herds never animate in lock-step. */
export const idleOffset=(seed:number,period=17)=>((Math.abs(Math.imul(seed|0,2654435761))>>>0)%1000)/1000*period;
/** Drawn-position snap rule: only a real relocation (spawn reuse, capture, load) snaps the eased body to the sim position.
 * A fast animal at 4x game speed legitimately leads the eased body by a few metres every frame; snapping at 3 m made
 * galloping deer pop/teleport (BUG-BORIS-ANIMAL-GLITCH). `speed` is the sim velocity in m/s. */
export const SNAP_GAP_METERS=10;
export const shouldSnapPresentation=(gap:number,speed=0)=>!(gap<=SNAP_GAP_METERS+.6*Math.max(0,Number.isFinite(speed)?speed:0));
