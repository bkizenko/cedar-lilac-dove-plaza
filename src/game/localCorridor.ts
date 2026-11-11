import type {Game} from './sim';
import type {Unit} from './types';
type Point={x:number;z:number};
export const LOCAL_CORRIDOR_RULES={stepMetres:.4,paddingMetres:4,maximumDestinationMetres:28,maximumExpandedNodes:2048,maximumCells:16384,maximumNearbyBuildings:8,retrySeconds:2} as const;
type Attempt={key:string;until:number;points:Point[]|null};
const attempts=new WeakMap<Unit,Attempt>(),metrics=new WeakMap<Game,{searches:number;expandedNodes:number;collisionQueries:number;cacheHits:number}>();
export function localCorridorDiagnostics(g:Game){return {...(metrics.get(g)??{searches:0,expandedNodes:0,collisionQueries:0,cacheHits:0})};}
/** A rare coarse-grid failure may still contain a real human-sized passage.
 * Every edge uses the same actor-radius terrain/building collision as movement.
 * This never makes water, a wall or another actor's smaller body traversable. */
export function localCorridor(g:Game,u:Unit,tx:number,tz:number):Point[]|null{
 const R=LOCAL_CORRIDOR_RULES;
 if(u.haulage==='canoe'||u.boat||Math.hypot(tx-u.x,tz-u.z)>R.maximumDestinationMetres||![u.x,u.z,tx,tz].every(Number.isFinite))return null;
 let m=metrics.get(g);if(!m){m={searches:0,expandedNodes:0,collisionQueries:0,cacheHits:0};metrics.set(g,m);}
 const key=`${g.navigationRevision()}/${u.r}/${u.x}/${u.z}/${tx}/${tz}`,old=attempts.get(u);
 if(old?.key===key&&old.until>g.state.time){m.cacheHits++;return old.points?.map(p=>({...p}))??null;}
 const save=(points:Point[]|null)=>{attempts.set(u,{key,until:g.state.time+R.retrySeconds,points});return points?.map(p=>({...p}))??null;};
 const ox=u.x-Math.ceil((Math.max(0,u.x-tx)+R.paddingMetres)/R.stepMetres)*R.stepMetres,oz=u.z-Math.ceil((Math.max(0,u.z-tz)+R.paddingMetres)/R.stepMetres)*R.stepMetres;
 const ex=Math.max(u.x,tx)+R.paddingMetres,ez=Math.max(u.z,tz)+R.paddingMetres;
 const axis=(start:number,end:number,a:number,b:number,obstacles:number[])=>{
  const values=[a,b];for(let v=start;v<=end+1e-8;v+=R.stepMetres)values.push(v);
  values.push(...obstacles.filter(v=>v>start&&v<end));return [...new Set(values.map(v=>Math.round(v*1e10)/1e10))].sort((a,b)=>a-b);
 };
 // Insert true clearance edges so a passable narrow corridor need not happen
 // to line up with the uniform grid. Only the nearest eight local buildings
 // contribute axes; every resulting edge still gets physical validation.
 const nearby=g.state.buildings.filter(b=>g.solidBuilding(b)&&Math.abs(b.x-(u.x+tx)/2)<=Math.abs(tx-u.x)/2+R.paddingMetres+b.w*.4+u.r&&Math.abs(b.z-(u.z+tz)/2)<=Math.abs(tz-u.z)/2+R.paddingMetres+b.d*.4+u.r).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z)).slice(0,R.maximumNearbyBuildings);
 const xs=axis(ox,ex,u.x,tx,nearby.flatMap(b=>[b.x-b.w*.4-u.r-.01,b.x+b.w*.4+u.r+.01]));
 const zs=axis(oz,ez,u.z,tz,nearby.flatMap(b=>[b.z-b.d*.4-u.r-.01,b.z+b.d*.4+u.r+.01]));
 const width=xs.length,height=zs.length;if(width*height>R.maximumCells)return save(null);
 const point=(at:number)=>({x:xs[at%width],z:zs[Math.floor(at/width)]});
 const coordinate=(values:number[],v:number)=>values.findIndex(n=>Math.abs(n-v)<1e-8),index=(x:number,z:number)=>coordinate(zs,z)*width+coordinate(xs,x),start=index(u.x,u.z),goal=index(tx,tz);
 const costs=new Float64Array(width*height).fill(Infinity),parents=new Int32Array(width*height).fill(-1),closed=new Uint8Array(width*height),heap:{id:number;f:number}[]=[];
 const push=(id:number,f:number)=>{heap.push({id,f});let i=heap.length-1;while(i){const parent=(i-1)>>1;if(heap[parent].f<=heap[i].f)break;[heap[i],heap[parent]]=[heap[parent],heap[i]];i=parent;}};
 const pop=()=>{const top=heap[0],last=heap.pop()!;if(heap.length){heap[0]=last;let i=0;for(;;){let child=i*2+1;if(child>=heap.length)break;if(child+1<heap.length&&heap[child+1].f<heap[child].f)child++;if(heap[i].f<=heap[child].f)break;[heap[i],heap[child]]=[heap[child],heap[i]];i=child;}}return top.id;};
 const heuristic=(at:number)=>{const p=point(at);return Math.hypot(p.x-tx,p.z-tz);};
 const probe={...u};const can=(x:number,z:number)=>{m!.collisionQueries++;return g.canStep(probe,x,z);};
 const edge=(from:Point,to:Point)=>{probe.x=from.x;probe.z=from.z;probe.y=g.travelHeight(from.x,from.z);return can((from.x+to.x)/2,(from.z+to.z)/2)&&can(to.x,to.z);};
 costs[start]=0;push(start,heuristic(start));let expanded=0,found=-1;m.searches++;
 while(heap.length&&expanded<R.maximumExpandedNodes){const at=pop();if(closed[at])continue;closed[at]=1;expanded++;const p=point(at);
  if(at===goal&&edge(p,{x:tx,z:tz})){found=at;break;}
  const cx=at%width,cz=Math.floor(at/width);
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if(!dx&&!dz)continue;const x=cx+dx,z=cz+dz,next=z*width+x;if(x<0||z<0||x>=width||z>=height||closed[next])continue;
   const q=point(next),cost=costs[at]+Math.hypot(q.x-p.x,q.z-p.z);if(cost>=costs[next])continue;
   if(!edge(p,q))continue;
   // Diagonal motion cannot cut through either adjacent blocked corner.
   if(dx&&dz&&(!edge(p,{x:q.x,z:p.z})||!edge(p,{x:p.x,z:q.z})))continue;
   costs[next]=cost;parents[next]=at;push(next,cost+heuristic(next));
  }
 }
 m.expandedNodes+=expanded;if(found<0)return save(null);
 const points:Point[]=[{x:tx,z:tz}];for(let at=found;at!==start;at=parents[at]){if(at<0)return save(null);const p=point(at);if(Math.hypot(p.x-points[0].x,p.z-points[0].z)>1e-7)points.unshift(p);}
 return save(points);
}
