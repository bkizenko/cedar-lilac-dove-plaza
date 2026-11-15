import type {Game} from './sim';
import {walkSlopeClass,climbPace,climbFatigueRate} from './slopeTiers';
/** Per-cell walking-cost class (1..4) for the shared walk grid, derived from terrain only (no save state).
 * Built lazily on first routing request and cached per world/terrain; routing (navigation.ts, flowFields.ts) weights steps by WALK_SLOPE_COST. */
const cache=new WeakMap<Game,{world:Game['world'];heights:unknown;height:unknown;rev:number;size:number;grid:Uint8Array}>();
export function walkSlopeGrid(g:Game,width:number):Uint8Array{
 const rev=(g as Game&{terrainRevision?:()=>number}).terrainRevision?.()??0,old=cache.get(g);
 if(old&&old.world===g.world&&old.heights===g.world.heights&&old.height===g.height&&old.rev===rev&&old.size===width)return old.grid;
 const cell=g.world.size/width,half=g.world.size/2,grid=new Uint8Array(width*width).fill(1);
 const h=new Float32Array((width+2)*(width+2));
 for(let iz=-1;iz<=width;iz++)for(let ix=-1;ix<=width;ix++)h[(iz+1)*(width+2)+ix+1]=g.travelHeight(-half+(ix+.5)*cell,-half+(iz+.5)*cell);
 const at=(ix:number,iz:number)=>h[(iz+1)*(width+2)+ix+1];
 for(let iz=0;iz<width;iz++)for(let ix=0;ix<width;ix++){
  const gx=(at(ix+1,iz)-at(ix-1,iz))/(2*cell),gz=(at(ix,iz+1)-at(ix,iz-1))/(2*cell);
  grid[iz*width+ix]=walkSlopeClass(Math.atan(Math.hypot(gx,gz))*180/Math.PI);
 }
 cache.set(g,{world:g.world,heights:g.world.heights,height:g.height,rev,size:width,grid});return grid;
}
/** Signed grade (rise over run, uphill positive) of the step u -> (nx,nz). */
export function stepGrade(g:Game,x:number,z:number,nx:number,nz:number){const run=Math.hypot(nx-x,nz-z);return run>1e-6?(g.travelHeight(nx,nz)-g.travelHeight(x,z))/run:0;}
/** Pace multiplier for a walking step: uphill is slower, a very steep descent is careful. Level = 1. */
export function stepPace(g:Game,x:number,z:number,tx:number,tz:number){const d=Math.hypot(tx-x,tz-z);if(d<1e-6)return 1;const k=1.5/d;return climbPace(stepGrade(g,x,z,x+(tx-x)*k,z+(tz-z)*k));}
/** Climbing tires people: fatigue accrues only on steep uphill ground. */
export function climbTire(g:Game,u:{fatigue?:number},x:number,z:number,tx:number,tz:number,dt:number){
 const d=Math.hypot(tx-x,tz-z);if(d<1e-6)return;const k=1.5/d,r=climbFatigueRate(stepGrade(g,x,z,x+(tx-x)*k,z+(tz-z)*k));
 if(r>0)u.fatigue=Math.min(1,(u.fatigue||0)+r*dt);
}
