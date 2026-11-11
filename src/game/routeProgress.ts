import type {Unit} from './types';
type Point={x:number;z:number};
/** Movement anti-loop rules. Units: metres and simulation seconds.
 * A step that moves the body but never brings it meaningfully closer to the
 * active waypoint is not progress: wall sliding, sidestep oscillation and a
 * coarse-cell recovery tug-of-war all move a little every frame. */
export const ROUTE_PROGRESS_RULES={minimumGainMetres:.25,stallSeconds:3,preciseDirectMetres:28,directSampleMetres:.25} as const;
type Watch={tx:number;tz:number;route:object;points:number;best:number;since:number};
const watches=new WeakMap<Unit,Watch>();
/** Records one movement sample and returns seconds since the actor last made
 * real progress toward the same destination. Replanning the same destination
 * keeps the stall clock, so an identical failing route cannot reset it. */
export function routeStallSeconds(u:Unit,route:{tx:number;tz:number;points:readonly Point[]},now:number):number{
 const point=route.points[0];if(!point){watches.delete(u);return 0;}
 const distance=Math.hypot(point.x-u.x,point.z-u.z);
 let w=watches.get(u);
 if(!w||Math.hypot(w.tx-route.tx,w.tz-route.tz)>2){w={tx:route.tx,tz:route.tz,route,points:route.points.length,best:distance,since:now};watches.set(u,w);return 0;}
 if(w.route!==route){w.route=route;w.points=route.points.length;w.best=distance;w.tx=route.tx;w.tz=route.tz;return now-w.since;}
 if(route.points.length<w.points||distance<w.best-ROUTE_PROGRESS_RULES.minimumGainMetres){w.points=route.points.length;w.best=distance;w.since=now;return 0;}
 return now-w.since;
}
export function clearRouteProgress(u:Unit){watches.delete(u);}
/** True when a straight segment is clear for this exact body at fine spacing.
 * Each sample is checked from the previous sample, the same chained physical
 * test that actual movement applies, so a clear line cannot clip a corner
 * between coarse one-metre samples. */
export function preciseSegmentClear(g:{canStep(u:Unit,x:number,z:number):boolean;travelHeight(x:number,z:number):number},u:Unit,tx:number,tz:number):boolean{
 const distance=Math.hypot(tx-u.x,tz-u.z),samples=Math.max(1,Math.ceil(distance/ROUTE_PROGRESS_RULES.directSampleMetres));
 let probe=u;
 for(let i=1;i<=samples;i++){const x=u.x+(tx-u.x)*i/samples,z=u.z+(tz-u.z)*i/samples;if(!g.canStep(probe,x,z))return false;probe={...u,x,z,y:g.travelHeight(x,z)};}
 return true;
}
