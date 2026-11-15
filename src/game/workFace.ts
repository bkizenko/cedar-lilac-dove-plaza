/** People work at the wall, not hovering a couple of metres out.
 *  Reaching a workplace is deliberately generous (buildingWorkReached) so crowded doors never trap anyone. Once someone is
 *  working there, settleAtWorkface eases them onto the nearest clear point against the footprint: a short straight walk, at most
 *  a few seconds, abandoned the moment any step is blocked. It never plans a route, never changes orders or cargo, and only runs
 *  for solid buildings. Presentation state lives in a WeakMap, not in saves. */
import type {Game} from './sim';
import type {Building,Unit} from './types';

/** Workplaces with a real room: the worker steps in through the wall to the station, not just to the door. Open rings, racks and sites stay outside. */
export const INDOOR_WORKPLACES:ReadonlySet<string>=new Set(['workshop','forge','oven','smokehouse','tanner','tailor','potter','kiln','butcher','fibreWorkshop']);
export const INDOOR_MIN_SIDE_M=3.6;
export const WORKFACE_RULES={insetMetres:1.1,marginMetres:.12,walkMetresPerSecond:1.3,giveUpSeconds:4,arrivedMetres:.1,resetMetres:3.5} as const;
const state=new WeakMap<Unit,{id:number;t:number;done:boolean}>();
const half=(b:Building)=>({x:b.w*.4,z:b.d*.4});
/** Gap between the person's centre and the footprint edge (the collision boundary is footprint + body radius). */
export function footprintGap(u:{x:number;z:number},b:Building){const h=half(b);return Math.hypot(Math.max(0,Math.abs(u.x-b.x)-h.x),Math.max(0,Math.abs(u.z-b.z)-h.z));}
/** Nearest point just outside the footprint to the person: the wall they will face. */
export function workFacePoint(u:Pick<Unit,'x'|'z'|'r'>,b:Building){
 const h=half(b),cx=Math.max(b.x-h.x,Math.min(b.x+h.x,u.x)),cz=Math.max(b.z-h.z,Math.min(b.z+h.z,u.z)),dx=u.x-cx,dz=u.z-cz,l=Math.hypot(dx,dz);
 const gap=u.r+WORKFACE_RULES.marginMetres;
 if(l<1e-6)return null;
 return {x:cx+dx/l*gap,z:cz+dz/l*gap};
}
export const hasInterior=(g:Game,b:Building)=>INDOOR_WORKPLACES.has(b.type)&&g.finished(b)&&Math.min(b.w,b.d)>=INDOOR_MIN_SIDE_M;
/** The station inside the room: from the wall point, straight in toward the centre, kept clear of the far wall. */
export function stationPoint(u:Pick<Unit,'r'>,b:Building,wall:{x:number;z:number}){
 const h=half(b),dx=b.x-wall.x,dz=b.z-wall.z,l=Math.hypot(dx,dz)||1,inset=Math.min(WORKFACE_RULES.insetMetres,l*.7);
 return {x:Math.max(b.x-h.x*.85,Math.min(b.x+h.x*.85,wall.x+dx/l*inset)),z:Math.max(b.z-h.z*.85,Math.min(b.z+h.z*.85,wall.z+dz/l*inset))};
}
/** Returns true once in place (or when settling does not apply). */
export function settleAtWorkface(g:Game,u:Unit,b:Building,dt:number):boolean{
 if(b.type==='bridge'||typeof g.solidBuilding!=='function'||!g.solidBuilding(b))return true;
 let s=state.get(u);
 if(!s||s.id!==b.id||footprintGap(u,b)>WORKFACE_RULES.resetMetres){s={id:b.id,t:0,done:false};state.set(u,s);}
 if(s.done)return true;
 const room=hasInterior(g,b);
 if(room&&footprintGap(u,b)<=u.r+WORKFACE_RULES.marginMetres+WORKFACE_RULES.arrivedMetres+.02||room&&footprintGap(u,b)===0){
  // at the wall (or already inside): walk in to the station. The footprint is the person's own workplace, so no collision test; the
  // station is inside that rectangle and the walk is a straight line from the wall point.
  const wall=footprintGap(u,b)===0?{x:u.x,z:u.z}:workFacePoint(u,b)!;const st=stationPoint(u,b,wall),d2=Math.hypot(st.x-u.x,st.z-u.z);
  if(d2<=WORKFACE_RULES.arrivedMetres){s.done=true;return true;}
  s.t+=dt;if(s.t>WORKFACE_RULES.giveUpSeconds+3){s.done=true;return true;}
  const step=Math.min(d2,WORKFACE_RULES.walkMetresPerSecond*dt),nx=u.x+(st.x-u.x)/d2*step,nz=u.z+(st.z-u.z)/d2*step;
  u.vx=(nx-u.x)/dt;u.vz=(nz-u.z)/dt;u.x=nx;u.z=nz;u.y=g.travelHeight(nx,nz);u.facing=Math.atan2(b.x-nx,b.z-nz);u.stride+=step*3.6;
  return false;
 }
 const p=workFacePoint(u,b);if(!p){s.done=true;return true;}
 const d=Math.hypot(p.x-u.x,p.z-u.z);
 // already at the wall, or the wall point is behind the body: nothing to do
 if(d<=WORKFACE_RULES.arrivedMetres||footprintGap(u,b)<=u.r+WORKFACE_RULES.marginMetres+WORKFACE_RULES.arrivedMetres){s.done=true;return true;}
 s.t+=dt;if(s.t>WORKFACE_RULES.giveUpSeconds){s.done=true;return true;}
 const step=Math.min(d,WORKFACE_RULES.walkMetresPerSecond*dt),nx=u.x+(p.x-u.x)/d*step,nz=u.z+(p.z-u.z)/d*step;
 if(!g.canStep(u,nx,nz)){s.done=true;return true;}
 u.vx=(nx-u.x)/dt;u.vz=(nz-u.z)/dt;u.x=nx;u.z=nz;u.y=g.travelHeight(nx,nz);u.facing=Math.atan2(b.x-nx,b.z-nz);u.stride+=step*3.6;
 return false;
}
