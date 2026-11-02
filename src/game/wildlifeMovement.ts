import {inBounds} from './worldgen';
import type {Building,Critter} from './types';
export const WILDLIFE_MOVEMENT_RULES={bodyRadiusMeters:.38,obstacleCellMeters:16,groundProbeMeters:.5} as const;
type Point={x:number;z:number};type Solid=Pick<Building,'x'|'z'|'w'|'d'>;
function depth(b:Solid,p:Point,r:number){return Math.min(b.w/2+r-Math.abs(p.x-b.x),b.d/2+r-Math.abs(p.z-b.z));}
/** Closed segment vs expanded rectangular footprint, including a narrow wall
 * crossed between clear endpoints. This never depends on the coarse nav grid. */
function intersects(b:Solid,a:Point,p:Point,r:number){let lo=0,hi=1;for(const axis of['x','z']as const){const half=(axis==='x'?b.w:b.d)/2+r,min=b[axis]-half,max=b[axis]+half,d=p[axis]-a[axis];if(Math.abs(d)<1e-10){if(a[axis]<=min||a[axis]>=max)return false;continue;}let t0=(min-a[axis])/d,t1=(max-a[axis])/d;if(t0>t1)[t0,t1]=[t1,t0];lo=Math.max(lo,t0);hi=Math.min(hi,t1);if(lo>=hi)return false;}return hi>0&&lo<1;}
/** Fresh per wildlife tick: no cross-frame reference/door/destruction cache. */
export class WildlifeObstacles{
 private cells=new Map<string,Solid[]>();
 constructor(solids:readonly Solid[]){const cell=WILDLIFE_MOVEMENT_RULES.obstacleCellMeters;for(const b of solids)for(let z=Math.floor((b.z-b.d/2)/cell);z<=Math.floor((b.z+b.d/2)/cell);z++)for(let x=Math.floor((b.x-b.w/2)/cell);x<=Math.floor((b.x+b.w/2)/cell);x++){const key=`${x}/${z}`,list=this.cells.get(key);if(list)list.push(b);else this.cells.set(key,[b]);}}
 segmentClear(a:Point,p:Point,r:number){const cell=WILDLIFE_MOVEMENT_RULES.obstacleCellMeters,seen=new Set<Solid>();for(let z=Math.floor((Math.min(a.z,p.z)-r)/cell);z<=Math.floor((Math.max(a.z,p.z)+r)/cell);z++)for(let x=Math.floor((Math.min(a.x,p.x)-r)/cell);x<=Math.floor((Math.max(a.x,p.x)+r)/cell);x++)for(const b of this.cells.get(`${x}/${z}`)||[]){if(seen.has(b))continue;seen.add(b);const old=depth(b,a,r);if(old>0){if(depth(b,p,r)>=old-1e-9)return false;}else if(intersects(b,a,p,r))return false;}return true;}
 clearAt(p:Point,r:number){return this.segmentClear(p,p,r);}
}
type Ground={height(x:number,z:number):number;waterAt(x:number,z:number):number;world:{size:number;options?:unknown;islandR?:number}};
export function wildlifeBodyRadius(c:Pick<Critter,'scale'>){return Math.max(.18,Math.min(.75,c.scale*WILDLIFE_MOVEMENT_RULES.bodyRadiusMeters));}
function safeSegment(g:Ground,c:Critter,p:Point,obstacles:WildlifeObstacles){if(!obstacles.segmentClear(c,p,wildlifeBodyRadius(c)))return false;const n=Math.max(1,Math.ceil(Math.hypot(p.x-c.x,p.z-c.z)/WILDLIFE_MOVEMENT_RULES.groundProbeMeters));for(let i=1;i<=n;i++){const x=c.x+(p.x-c.x)*i/n,z=c.z+(p.z-c.z)*i/n;if(g.height(x,z)<=g.waterAt(x,z)+.2||!inBounds(x,z,4,g.world.size)||!g.world.options&&Math.hypot(x,z)>=(g.world.islandR||140)-6)return false;}return true;}
/** Turns preserve the current step budget. No path teleport, stock adjustment,
 * animal cloning or corpse relocation; blocked animals may physically stop. */
export function moveGroundWildlife(g:Ground,c:Critter,dt:number,obstacles:WildlifeObstacles){if(dt<=0)return;const dx=c.vx*dt,dz=c.vz*dt,target={x:c.x+dx,z:c.z+dz},direct=safeSegment(g,c,target,obstacles);let chosen:Point|null=direct?target:null;
 if(!chosen){const side=c.id%2?1:-1;for(const angle of[Math.PI/3,-Math.PI/3,Math.PI/2,-Math.PI/2,Math.PI*.75,-Math.PI*.75,Math.PI]){const a=angle*side,cos=Math.cos(a),sin=Math.sin(a),p={x:c.x+dx*cos-dz*sin,z:c.z+dx*sin+dz*cos};if(safeSegment(g,c,p,obstacles)){chosen=p;break;}}}
 if(chosen){if(!direct){c.vx=(chosen.x-c.x)/dt;c.vz=(chosen.z-c.z)/dt;}c.x=chosen.x;c.z=chosen.z;c.y=g.height(c.x,c.z);}else{c.vx*= -.4;c.vz*= -.4;c.wanderT=.4;}
}
