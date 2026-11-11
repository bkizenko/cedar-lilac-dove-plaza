import {riverSurfaceData,fallingSurfacePoints} from './riverSurface';
import {lakeContains,type LocalWaterBody,type LakeBody,type Waterfall} from './localWater';
export const INDEXED_WATER_RULES={version:17,cellMetres:16,maximumCachedSizes:4,maximumBodies:128,maximumPointsPerBody:2048} as const;
type Segment={ax:number;az:number;ay:number;bx:number;bz:number;by:number;aw:number;bw:number};
type Triangle={ax:number;az:number;ay:number;bx:number;bz:number;by:number;cx:number;cz:number;cy:number;den:number};
type Entry={kind:'river';segment:Segment}|{kind:'lake';body:LakeBody}|{kind:'triangle';triangle:Triangle};
export type LocalWaterIndex={size:number;width:number;cells:Map<number,Entry[]>;segments:number;lakes:number;maximumBucketEntries:number};
/** Derived only: input coordinates are copied into a spatial index, never stored
 * on GameState, included in saves or searched globally by a gameplay query. */
export function buildLocalWaterIndex(bodies:readonly LocalWaterBody[],size:number,falls:readonly Waterfall[]=[]):LocalWaterIndex {
 const cell=INDEXED_WATER_RULES.cellMetres,width=Math.ceil(size/cell),half=size/2,cells=new Map<number,Entry[]>();let segments=0,lakes=0,maximumBucketEntries=0;
 const add=(entry:Entry,x0:number,z0:number,x1:number,z1:number)=>{for(let z=Math.max(0,Math.floor((z0+half)/cell));z<=Math.min(width-1,Math.floor((z1+half)/cell));z++)for(let x=Math.max(0,Math.floor((x0+half)/cell));x<=Math.min(width-1,Math.floor((x1+half)/cell));x++){const key=z*width+x,list=cells.get(key)||[];list.push(entry);cells.set(key,list);maximumBucketEntries=Math.max(maximumBucketEntries,list.length);}};
 const addSurface=(points:Parameters<typeof riverSurfaceData>[0],w:number,caps:Parameters<typeof riverSurfaceData>[2])=>{const data=riverSurfaceData(points,w,caps),p=data.positions;for(let i=0;i<data.indices.length;i+=3){const a=data.indices[i]*3,b=data.indices[i+1]*3,c=data.indices[i+2]*3,t={ax:p[a],ay:p[a+1],az:p[a+2],bx:p[b],by:p[b+1],bz:p[b+2],cx:p[c],cy:p[c+1],cz:p[c+2],den:0};t.den=(t.bz-t.cz)*(t.ax-t.cx)+(t.cx-t.bx)*(t.az-t.cz);if(Math.abs(t.den)<1e-10)continue;add({kind:'triangle',triangle:t},Math.min(t.ax,t.bx,t.cx),Math.min(t.az,t.bz,t.cz),Math.max(t.ax,t.bx,t.cx),Math.max(t.az,t.bz,t.cz));}};
 for(const body of bodies){
  if(body.kind==='lake'){lakes++;const p=body.shoreline;const x0=p?.length?Math.min(...p.map(p=>p.x)):body.x-body.rx,x1=p?.length?Math.max(...p.map(p=>p.x)):body.x+body.rx,z0=p?.length?Math.min(...p.map(p=>p.z)):body.z-body.rz,z1=p?.length?Math.max(...p.map(p=>p.z)):body.z+body.rz;add({kind:'lake',body},x0,z0,x1,z1);}
  else if(body.surfaceVersion===2){segments+=body.pts.length-1;addSurface(body.pts,body.width,body);}
  else for(let i=1;i<body.pts.length;i++){const a=body.pts[i-1],b=body.pts[i],aw=a.w??body.width,bw=b.w??body.width,r=Math.max(aw,bw)*.5;segments++;add({kind:'river',segment:{ax:a.x,az:a.z,ay:a.y,bx:b.x,bz:b.z,by:b.y,aw,bw}},Math.min(a.x,b.x)-r,Math.min(a.z,b.z)-r,Math.max(a.x,b.x)+r,Math.max(a.z,b.z)+r);}
 }
 for(const fall of falls)addSurface(fallingSurfacePoints(fall),fall.width,{startCap:'butt',endCap:'butt'});
 return{size,width,cells,segments,lakes,maximumBucketEntries};
}
export function indexedWaterAt(index:LocalWaterIndex,x:number,z:number,contains:(body:LakeBody,x:number,z:number)=>boolean):number|null {
 const cell=INDEXED_WATER_RULES.cellMetres,half=index.size/2;if(x< -half||x>half||z< -half||z>half)return null;const cx=Math.min(index.width-1,Math.floor((x+half)/cell)),cz=Math.min(index.width-1,Math.floor((z+half)/cell));
 const entries=index.cells.get(cz*index.width+cx);if(!entries)return null;let surface:number|null=null;
 for(const e of entries){if(e.kind==='lake'){if(contains(e.body,x,z))surface=Math.max(surface??-Infinity,e.body.surfaceY);continue;}
  if(e.kind==='triangle'){const t=e.triangle,u=((t.bz-t.cz)*(x-t.cx)+(t.cx-t.bx)*(z-t.cz))/t.den,v=((t.cz-t.az)*(x-t.cx)+(t.ax-t.cx)*(z-t.cz))/t.den;if(u>=-1e-7&&v>=-1e-7&&u+v<=1+1e-7)surface=Math.max(surface??-Infinity,t.ay*u+t.by*v+t.cy*(1-u-v));continue;}
  const s=e.segment,dx=s.bx-s.ax,dz=s.bz-s.az,len=dx*dx+dz*dz;if(len<.0001)continue;const t=Math.max(0,Math.min(1,((x-s.ax)*dx+(z-s.az)*dz)/len));if(Math.hypot(x-s.ax-t*dx,z-s.az-t*dz)<=(s.aw+(s.bw-s.aw)*t)*.5)surface=Math.max(surface??-Infinity,s.ay+(s.by-s.ay)*t);
 }return surface;
}
function copyData<T>(value:T):T {if(['function','symbol','bigint'].includes(typeof value))throw new TypeError('Water descriptors must contain plain data');if(Array.isArray(value))return value.map(v=>copyData(v)) as T;if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,copyData(v)])) as T;return value;}
function freezeData<T>(value:T):T {if(value&&typeof value==='object'){for(const v of Object.values(value))freezeData(v);Object.freeze(value);}return value;}
type Owned={indexes:{size:number;falls:readonly Waterfall[];index:LocalWaterIndex}[]};const owned=new WeakMap<LocalWaterBody[],Owned>();
/** V17 publishes immutable owned plain data. To edit, replace a body/list through
 * the tracked setter. Retained input aliases cannot bypass cache invalidation;
 * direct writes fail loudly. JSON and structuredClone remain ordinary data. */
function validateBodies(input:readonly LocalWaterBody[]){
 const finite=(n:unknown)=>typeof n==='number'&&Number.isFinite(n),point=(p:{x:number;z:number})=>p&&finite(p.x)&&finite(p.z);if(!Array.isArray(input)||input.length>INDEXED_WATER_RULES.maximumBodies)throw new TypeError('Invalid water body list');const ids=new Set<string>();
 for(const b of input){if(!b||typeof b.id!=='string'||ids.has(b.id))throw new TypeError('Water bodies need unique IDs');ids.add(b.id);
  if(b.kind==='lake'){if(!point(b)||!finite(b.surfaceY)||!finite(b.rx)||!finite(b.rz)||b.rx<=0||b.rz<=0||b.shoreline!==undefined&&(!Array.isArray(b.shoreline)||b.shoreline.length<3||b.shoreline.length>INDEXED_WATER_RULES.maximumPointsPerBody||!b.shoreline.every(point)))throw new TypeError('Invalid lake');}
  else if((b.surfaceVersion!==undefined&&b.surfaceVersion!==2)||(b.startCap!==undefined&&!['round','butt'].includes(b.startCap))||(b.endCap!==undefined&&!['round','butt'].includes(b.endCap))||b.kind!=='river'||!finite(b.width)||b.width<=0||!Array.isArray(b.pts)||b.pts.length<2||b.pts.length>INDEXED_WATER_RULES.maximumPointsPerBody||!b.pts.every((p:{x:number;z:number;y:number;w?:number})=>point(p)&&finite(p.y)&&(p.w===undefined||finite(p.w)&&p.w>0)))throw new TypeError('Invalid river');
 }
}
export function ownWaterBodies(input:readonly LocalWaterBody[]):LocalWaterBody[]{if(owned.has(input as LocalWaterBody[]))return input as LocalWaterBody[];validateBodies(input);const result=freezeData(copyData(input)) as LocalWaterBody[];owned.set(result,{indexes:[]});return result;}
const EMPTY_FALLS:Waterfall[]=[];const ownedFalls=new WeakSet<Waterfall[]>();
function ownFalls(input:readonly Waterfall[]){if(ownedFalls.has(input as Waterfall[]))return input as Waterfall[];if(!Array.isArray(input)||input.length>128||!input.every(f=>f&&['x','z','upperY','lowerY','width','dx','dz'].every(k=>Number.isFinite(f[k as keyof Waterfall]))&&f.width>0))throw new TypeError('Invalid falling water');const result=freezeData(copyData(input)) as Waterfall[];ownedFalls.add(result);return result;}
/** Allocation-free cache hit for already-owned descriptors. The bounded cache
 * and index construction are identical to the public wrapper's prior contract. */
export function ownedWaterIndexValue(bodies:LocalWaterBody[],size:number,falls:readonly Waterfall[]=EMPTY_FALLS):LocalWaterIndex {
 let o=owned.get(bodies);if(!o){bodies=ownWaterBodies(bodies);o=owned.get(bodies)!;}
 for(let i=0;i<o.indexes.length;i++){const entry=o.indexes[i];if(entry.size===size&&entry.falls===falls)return entry.index;}
 const entry={size,falls,index:buildLocalWaterIndex(bodies,size,falls)};if(o.indexes.length>=INDEXED_WATER_RULES.maximumCachedSizes)o.indexes.shift();o.indexes.push(entry);return entry.index;
}
/** Retain normalized owned bodies and a fresh wrapper for existing consumers. */
export function ownedWaterIndex(bodies:LocalWaterBody[],size:number,falls:readonly Waterfall[]=EMPTY_FALLS){
 if(!owned.has(bodies))bodies=ownWaterBodies(bodies);return{bodies,index:ownedWaterIndexValue(bodies,size,falls)};
}

type WaterWorld={localWaterVersion?:number;waterBodies?:LocalWaterBody[];waterfalls?:Waterfall[];size?:number;waterHeights?:Float32Array;waterY?:number;baseWaterY?:number};type Owner={current:LocalWaterBody[];falls:Waterfall[];revision:number;listeners:Set<()=>void>};const owners=new WeakMap<object,Owner>();
function refreshRaster(world:WaterWorld,bodies:LocalWaterBody[],falls:Waterfall[]=world.waterfalls||EMPTY_FALLS){
 if(!world.waterHeights||!world.size||world.waterY===undefined)return;const width=Math.round(Math.sqrt(world.waterHeights.length)),segs=width-1;if(segs<1||width*width!==world.waterHeights.length)throw new Error('V17 water raster must be square');const{index}=ownedWaterIndex(bodies,world.size,falls),base=world.baseWaterY??world.waterY;
 for(let z=0;z<width;z++)for(let x=0;x<width;x++){const y=indexedWaterAt(index,x/segs*world.size-world.size/2,z/segs*world.size-world.size/2,lakeContains);world.waterHeights[z*width+x]=Math.max(base,y===null?-Infinity:y);}
}
export function prepareOwnedWaterWorld<T extends WaterWorld>(world:T,rasterAlreadyCurrent=false):T {
 if(world.localWaterVersion!==17||owners.has(world))return world;const owner:Owner={current:ownWaterBodies(world.waterBodies||[]),falls:ownFalls(world.waterfalls||[]),revision:0,listeners:new Set()};owners.set(world,owner);
 Object.defineProperty(world,'waterBodies',{enumerable:true,configurable:false,get:()=>owner.current,set:(input:LocalWaterBody[])=>{const next=ownWaterBodies(input||[]);if(next===owner.current)return;refreshRaster(world,next,owner.falls);owner.current=next;owner.revision++;for(const notify of owner.listeners)notify();}});Object.defineProperty(world,'waterfalls',{enumerable:true,configurable:false,get:()=>owner.falls,set:(input:Waterfall[])=>{const next=ownFalls(input||[]);if(next===owner.falls)return;refreshRaster(world,owner.current,next);owner.falls=next;owner.revision++;for(const notify of owner.listeners)notify();}});if(!rasterAlreadyCurrent)refreshRaster(world,owner.current);return world;
}
export function localWaterRevision(world:WaterWorld){return world.localWaterVersion===17?(prepareOwnedWaterWorld(world),owners.get(world)!.revision):0;}
export function replaceLocalWaterBody(world:WaterWorld,id:string,body:LocalWaterBody|null){prepareOwnedWaterWorld(world);const list:LocalWaterBody[]=[];let found=false;for(const old of world.waterBodies||[]){if(old.id===id){found=true;if(body)list.push(body);}else list.push(old);}if(body&&!found)list.push(body);world.waterBodies=list;}
export function watchLocalWaterChanges(world:WaterWorld,notify:()=>void){if(world.localWaterVersion!==17)return()=>{};prepareOwnedWaterWorld(world);const owner=owners.get(world)!;owner.listeners.add(notify);return()=>owner.listeners.delete(notify);}

type WaterGame={world:WaterWorld;state:{walkDirty:boolean}};const bindings=new WeakMap<WaterGame,{world:WaterWorld;stop:()=>void}>();
/** Body edits are explicit whole-descriptor operations, not per-frame work. */
export function bindLocalWaterChanges(game:WaterGame){const old=bindings.get(game);if(old?.world===game.world)return;old?.stop();bindings.delete(game);if(game.world.localWaterVersion!==17)return;bindings.set(game,{world:game.world,stop:watchLocalWaterChanges(game.world,()=>{game.state.walkDirty=true;})});}

export function localWaterIndexReport(world:WaterWorld){prepareOwnedWaterWorld(world);if(world.localWaterVersion!==17||!world.size)return null;const {index}=ownedWaterIndex(world.waterBodies||[],world.size,world.waterfalls);return{version:17,revision:localWaterRevision(world),cellMetres:INDEXED_WATER_RULES.cellMetres,segments:index.segments,lakes:index.lakes,occupiedBuckets:index.cells.size,maximumBucketCandidates:index.maximumBucketEntries,wholeListQueriesPerSample:0};}
