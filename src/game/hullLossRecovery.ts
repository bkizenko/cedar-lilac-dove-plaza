import type {Game} from './sim';
import type {GameState,Unit} from './types';
import {requestWaterNavigation,type WaterNavigation} from './waterTravel';
import {supplyDrops,supplyApproach} from './campAnchor';

export const HULL_RECOVERY_RULES={version:1,swimMetresPerSecond:.85,wadeMetresPerSecond:1.1,swimFeetDepthMetres:1.1,verticalMetresPerSecond:1.5,probeMetres:.35,maximumPathPoints:1024,maximumCells:65536,maximumSearches:8,nodesPerCall:32,nodesPerStep:128,retrySeconds:3} as const;
type Point={x:number;z:number};
export type HullLossRecovery={version:1;hullId:number;startedAt:number;nextSearchAt:number;revision:number;path:Point[]};
const R=HULL_RECOVERY_RULES;
/** Unit y is its feet, not its head or a hull surface. Deep swimmers keep their
 * torso submerged; a shallow wader's feet stay on actual ground/deck. */
export function recoverySurfaceHeight(g:Game,x:number,z:number){return Math.max(g.travelHeight(x,z),g.waterAt(x,z)-R.swimFeetDepthMetres);}
export function recoveryAshore(g:Game,u:Unit){return g.walkable(u.x,u.z)&&g.travelHeight(u.x,u.z)>g.waterAt(u.x,u.z)+.3;}
/** A missing real hull transfers no equipment, cargo, ownership or position. */
export function beginHullLossRecovery(g:Game,u:Unit,hullId:number){
 if(u.hp<=0||u.prisoner)return false;
 if(!u.hullRecovery)u.hullRecovery={version:1,hullId,startedAt:g.state.time,nextSearchAt:g.state.time,revision:-1,path:[]};
 u.boat=undefined;u.haulage=undefined;u.order='hold';u.node=null;u.target=null;g.invalidateRoute(u);
 return true;
}
function segmentClear(g:Game,u:Unit,a:Point,b:Point){
 const n=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/R.probeMetres));let probe={...u,x:a.x,z:a.z,y:recoverySurfaceHeight(g,a.x,a.z)};
 for(let j=1;j<=n;j++){const x=a.x+(b.x-a.x)*j/n,z=a.z+(b.z-a.z)*j/n;if(!g.canStep(probe,x,z))return false;probe={...probe,x,z,y:recoverySurfaceHeight(g,x,z)};}return true;
}
function reachesHome(g:Game,u:Unit,p:Point){const probe={...u,...p,y:g.travelHeight(p.x,p.z)};return supplyDrops(g,u.team).some(d=>!!supplyApproach(g,probe,d));}
type ShoreSearch={nav:WaterNavigation;revision:number;team:number;x:number;z:number;parents:Map<number,number>;queue:number[];head:number;fallback?:Point[];hasHome:boolean};
type SearchContext={world:Game['world'];state:GameState;time:number;remaining:number;searches:Map<Unit,ShoreSearch>};
const searches=new WeakMap<Game,SearchContext>();
function searchContext(g:Game){let c=searches.get(g);if(!c||c.world!==g.world||c.state!==g.state){c={world:g.world,state:g.state,time:g.state.time,remaining:R.nodesPerStep,searches:new Map()};searches.set(g,c);}if(c.time!==g.state.time){c.time=g.state.time;c.remaining=R.nodesPerStep;}return c;}
/** Incremental, bounded component traversal through the existing navigation API.
 * A large world grid is not a failed route: only visited cells consume this
 * recovery's budget. Every admitted edge uses the original physical body test.
 * Derived searches reset on world/state/nav revision and are never saved. */
function plan(g:Game,u:Unit):Point[]|undefined{
 const request=requestWaterNavigation(g,false);if(request.status==='pending')return undefined;
 const nav=request.navigation,n=nav.width,cell=g.world.size/n,half=g.world.size/2,ix=Math.floor((u.x+half)/cell),iz=Math.floor((u.z+half)/cell);
 if(ix<0||iz<0||ix>=n||iz>=n)return [];
 const c=searchContext(g),revision=g.navigationRevision(),point=(i:number)=>({x:(i%n+.5)*cell-half,z:(Math.floor(i/n)+.5)*cell-half});
 let search=c.searches.get(u);
 if(!search||search.nav!==nav||search.revision!==revision||search.team!==u.team||search.x!==u.x||search.z!==u.z){
  c.searches.delete(u);for(const [body]of c.searches)if(body.hp<=0||!body.hullRecovery||!g.state.units.includes(body))c.searches.delete(body);
  if(c.searches.size>=R.maximumSearches)return undefined;
  const start=iz*n+ix;if(!segmentClear(g,u,u,point(start)))return [];
  search={nav,revision,team:u.team,x:u.x,z:u.z,parents:new Map([[start,-1]]),queue:[start],head:0,hasHome:supplyDrops(g,u.team).length>0};c.searches.set(u,search);
 }
 let processed=0;
 while(search.head<search.queue.length&&processed<R.nodesPerCall&&c.remaining>0){
  processed++;c.remaining--;const at=search.queue[search.head++],p=point(at);
  if(nav.grid[at]&&g.walkable(p.x,p.z)&&g.travelHeight(p.x,p.z)>g.waterAt(p.x,p.z)+.3){
   const reverse:Point[]=[];for(let k=at;k>=0;k=search.parents.get(k)!){reverse.push(point(k));if(reverse.length>R.maximumPathPoints)break;}
   if(reverse.length<=R.maximumPathPoints){const path=reverse.reverse();search.fallback??=path;if(!search.hasHome||reachesHome(g,u,p)){c.searches.delete(u);return path;}}
  }
  const x=at%n,z=Math.floor(at/n);
  for(const next of [z>0?at-n:-1,x+1<n?at+1:-1,z+1<n?at+n:-1,x>0?at-1:-1]){
   if(next<0||search.parents.has(next)||!nav.grid[next]||search.parents.size>=R.maximumCells)continue;
   if(!segmentClear(g,u,p,point(next)))continue;search.parents.set(next,at);search.queue.push(next);
  }
 }
 if(search.head<search.queue.length)return undefined;
 c.searches.delete(u);return search.fallback??[];
}
/** Called only by Game.steer's explicit recovery seam. No ordinary actor gains
 * swimming permission; the same canStep solid/radius/boundary rules still apply. */
export function steerHullRecovery(g:Game,u:Unit,dt:number){
 const r=u.hullRecovery;if(!r||!(dt>0)||!Number.isFinite(dt))return false;
 const seconds=Math.min(dt,.34),vertical=R.verticalMetresPerSecond*seconds;
 const settle=(target=recoverySurfaceHeight(g,u.x,u.z))=>{u.y+=Math.max(-vertical,Math.min(vertical,target-u.y));};
 const landed=()=>{if(!recoveryAshore(g,u)||Math.abs(u.y-g.travelHeight(u.x,u.z))>1e-6)return false;delete u.hullRecovery;u.order='hold';u.vx=0;u.vz=0;g.invalidateRoute(u);return true;};
 if(recoveryAshore(g,u)){settle(g.travelHeight(u.x,u.z));return landed();}
 const revision=g.navigationRevision();if(r.revision!==revision){r.path=[];r.nextSearchAt=g.state.time;r.revision=revision;}
 if(!r.path.length){if(g.state.time<r.nextSearchAt){settle();return false;}const path=plan(g,u);if(path===undefined){settle();u.workReason='Hull lost — preparing a connected shore route';return false;}r.path=path;r.nextSearchAt=g.state.time+R.retrySeconds;if(!path.length){settle();u.workReason='Hull lost — no physically reachable shore yet; cargo remains with survivor';return false;}}
 const p=r.path[0],distance=Math.hypot(p.x-u.x,p.z-u.z);if(distance<1e-8){settle();r.path.shift();return false;}
 const depth=g.waterAt(u.x,u.z)-g.height(u.x,u.z),swimming=depth>R.swimFeetDepthMetres,speed=swimming?R.swimMetresPerSecond:R.wadeMetresPerSecond;
 const step=Math.min(distance,speed*seconds),x=u.x+(p.x-u.x)/distance*step,z=u.z+(p.z-u.z)/distance*step;
 if(!g.canStep(u,x,z)||!segmentClear(g,u,u,{x,z})){settle();r.path=[];r.nextSearchAt=g.state.time+R.retrySeconds;u.workReason='Hull lost — shore approach blocked; retaining body and cargo';return false;}
 const ground=g.travelHeight(x,z),target=recoverySurfaceHeight(g,x,z),nextY=u.y+Math.max(-vertical,Math.min(vertical,target-u.y));
 // A valid shore step can rise faster than bounded vertical settling. Clamber
 // at the actual shore edge before advancing, never place feet under its ground.
 if(ground>nextY+1e-6){settle(target);u.vx=0;u.vz=0;u.workReason='Climbing out at the connected shore';return false;}
 u.vx=(x-u.x)/dt;u.vz=(z-u.z)/dt;u.x=x;u.z=z;u.y=nextY;u.facing=Math.atan2(p.x-x,p.z-z);u.stride+=step*3.6;
 if(step===distance)r.path.shift();u.workReason=swimming?'Swimming toward a connected shore with carried supplies':'Wading toward dry shore with carried supplies';
 return landed();
}
/** Runs before ordinary riverboat/work/mission executors for this survivor. */
export function hullLossRecoveryAI(g:Game,u:Unit,dt:number){
 // Captivity returns to the prisoner executor; rescuing a captive offshore is
 // still a separate limitation, never permission to escape the guard's custody.
 if(u.hp<=0||u.prisoner){delete u.hullRecovery;return false;}
 // Bootstrap here, before seaRaiderReturnAI can hold a missing-hull actor.
 // riverboatAI remains a compatible entry, not the only initializer.
 if(!u.hullRecovery&&u.boat&&!g.state.boats?.some(b=>b.id===u.boat!.id&&b.hp>0))beginHullLossRecovery(g,u,u.boat.id);
 if(!u.hullRecovery)return false;
 u.order='hold';g.steer(u,dt);return true;
}
export function validHullLossRecovery(s:GameState){
 const half=(s.worldOptions?.size??1040)/2,finite=(n:unknown)=>typeof n==='number'&&Number.isFinite(n);
 return s.units.every(u=>{const r=u.hullRecovery;if(r===undefined)return true;
  return !!r&&r.version===1&&Number.isSafeInteger(r.hullId)&&r.hullId>0&&r.hullId<s.nextId&&finite(r.startedAt)&&r.startedAt>=0&&r.startedAt<=s.time&&finite(r.nextSearchAt)&&r.nextSearchAt>=0&&r.nextSearchAt<=s.time+R.retrySeconds+.001&&Number.isSafeInteger(r.revision)&&r.revision>=-1&&Array.isArray(r.path)&&r.path.length<=R.maximumPathPoints&&r.path.every(p=>p&&finite(p.x)&&finite(p.z)&&Math.abs(p.x)<half&&Math.abs(p.z)<half)&&!u.boat&&u.haulage===undefined;
 });
}
