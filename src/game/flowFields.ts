/** Shared flow fields for busy destinations (Claude request 3, Grok W-World).
 * One reverse Dijkstra field per hot goal cell replaces many per-resident A* searches
 * (`findPath` allocates ~3.5 MB of typed arrays per call on the 520² walk grid).
 * Move rules are identical to `findPath`: 8 directions, no corner cutting, cost 1 / √2,
 * so every extracted path has the same optimal cost as A* (ties may pick a different
 * but equally short cell sequence). Fields are keyed by (grid object, goal cell) and are
 * discarded whenever the navigation revision changes (any walk-grid rebuild). */
// A field costs about as much as 5–8 A* calls, so it is built only once a goal has drawn enough
// requests in one navigation revision to pay for itself (measured: 120 routes 316 ms A* vs 24 ms field).
export const FLOW_FIELD_RULES={version:1,hotRequests:8,maxFields:8,maxExpansions:140000} as const;
type Field={goal:number;dist:Float32Array;used:number};
type OwnerState={revision:number;grids:Map<Uint8Array,{counts:Map<number,number>;fields:Map<number,Field>}>;tick:number;stats:FlowFieldStats};
export type FlowFieldStats={built:number;hits:number;misses:number;evicted:number;buildMs:number};
const owners=new WeakMap<object,OwnerState>();
/** Integration switch (completion plan: new behaviour behind a switch). Off by default:
 * `flowPath` then always returns null and routing is exactly the historic A*. Codex
 * enables it per game (e.g. from a game option) after its Phase-1 performance run. */
const enabled=new WeakMap<object,boolean>();
export function setFlowFieldsEnabled(owner:object,on:boolean){enabled.set(owner,on);if(!on)owners.delete(owner);}
export function flowFieldsEnabled(owner:object){return enabled.get(owner)===true;}

export function flowFieldStats(owner:object):FlowFieldStats{return owners.get(owner)?.stats??{built:0,hits:0,misses:0,evicted:0,buildMs:0};}
export function resetFlowFields(owner:object){owners.delete(owner);}

/** A path in `findPath`'s form (cells after `start`, ending at `goal`), or null so the
 * caller falls back to `findPath` (goal not hot yet, start outside the field, or blocked). */
export function flowPath(owner:object,grid:Uint8Array,width:number,start:number,goal:number,revision:number):number[]|null{
 if(!flowFieldsEnabled(owner))return null;
 if(start<0||goal<0||start>=grid.length||goal>=grid.length||!grid[goal])return null;
 if(start===goal)return [];
 let st=owners.get(owner);if(!st){st={revision,grids:new Map(),tick:0,stats:{built:0,hits:0,misses:0,evicted:0,buildMs:0}};owners.set(owner,st);}
 if(st.revision!==revision){st.revision=revision;st.grids.clear();}
 let g=st.grids.get(grid);if(!g){g={counts:new Map(),fields:new Map()};st.grids.set(grid,g);}
 let field=g.fields.get(goal);
 if(!field){const c=(g.counts.get(goal)??0)+1;g.counts.set(goal,c);if(c<FLOW_FIELD_RULES.hotRequests){st.stats.misses++;return null;}
  const t=performance.now();field={goal,dist:buildField(grid,width,goal),used:0};st.stats.buildMs+=performance.now()-t;st.stats.built++;
  let total=0;for(const f of st.grids.values())total+=f.fields.size;
  if(total>=FLOW_FIELD_RULES.maxFields){let oldG:typeof g|null=null,oldK=-1,oldU=Infinity;for(const f of st.grids.values())for(const [k,v] of f.fields)if(v.used<oldU){oldU=v.used;oldK=k;oldG=f;}if(oldG){oldG.fields.delete(oldK);st.stats.evicted++;}}
  g.fields.set(goal,field);}
 field.used=++st.tick;
 const path=extract(grid,width,field.dist,start,goal);if(path)st.stats.hits++;else st.stats.misses++;return path;
}

function buildField(grid:Uint8Array,width:number,goal:number){
 const N=grid.length,height=N/width,dist=new Float32Array(N).fill(Infinity),closed=new Uint8Array(N);
 let heapId=new Int32Array(1024),heapF=new Float64Array(1024),size=0;
 const push=(id:number,f:number)=>{if(size===heapId.length){const a=new Int32Array(size*2);a.set(heapId);heapId=a;const b=new Float64Array(size*2);b.set(heapF);heapF=b;}let i=size++;while(i){const p=(i-1)>>1;if(heapF[p]<=f)break;heapId[i]=heapId[p];heapF[i]=heapF[p];i=p;}heapId[i]=id;heapF[i]=f;};
 const pop=()=>{const top=heapId[0],lastId=heapId[--size],lastF=heapF[size];let i=0;while(true){let j=i*2+1;if(j>=size)break;if(j+1<size&&heapF[j+1]<heapF[j])j++;if(lastF<=heapF[j])break;heapId[i]=heapId[j];heapF[i]=heapF[j];i=j;}heapId[i]=lastId;heapF[i]=lastF;return top;};
 const cost=new Float64Array(N).fill(Infinity);cost[goal]=0;push(goal,0);let budget=FLOW_FIELD_RULES.maxExpansions;
 while(size&&budget-->0){const id=pop();if(closed[id])continue;closed[id]=1;dist[id]=cost[id];const x=id%width,z=(id/width)|0;
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if((!dx&&!dz)||x+dx<0||x+dx>=width||z+dz<0||z+dz>=height)continue;const n=id+dz*width+dx;
   if(!grid[n]||closed[n]||(dx&&dz&&(!grid[id+dx]||!grid[id+dz*width])))continue;const c=cost[id]+(dx&&dz?Math.SQRT2:1);if(c<cost[n]){cost[n]=c;push(n,c);}}}
 return dist;
}

function extract(grid:Uint8Array,width:number,dist:Float32Array,start:number,goal:number){
 const height=grid.length/width,path:number[]=[];let c=start,guard=grid.length;
 while(c!==goal&&guard-->0){const x=c%width,z=(c/width)|0;let best=-1,bestV=Infinity;
  for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){if((!dx&&!dz)||x+dx<0||x+dx>=width||z+dz<0||z+dz>=height)continue;const n=c+dz*width+dx;
   if(!grid[n]||(dx&&dz&&(!grid[c+dx]||!grid[c+dz*width])))continue;const v=dist[n]+(dx&&dz?Math.SQRT2:1);if(v<bestV-1e-9){bestV=v;best=n;}}
  if(best<0||!Number.isFinite(bestV))return null;
  if(grid[c]&&Number.isFinite(dist[c])&&bestV>dist[c]+1e-3)return null; // float drift guard: never climb the field
  path.push(best);c=best;}
 return c===goal?path:null;
}
