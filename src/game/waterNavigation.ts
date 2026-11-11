import {localWaterRevision} from './indexedLocalWater';
import type {Game} from './sim';
import {sameTypedValues} from './terrainWalkCache';

export const WATER_NAVIGATION_RULES={sliceMilliseconds:2,sliceCadenceMilliseconds:16,operationsPerYield:128} as const;
export type WaterNavigation={revision:number;grid:Uint8Array;labels:Int32Array;width:number};
export type WaterNavigationRequest={status:'pending'}|{status:'ready';navigation:WaterNavigation};
type Key={world:Game['world'];banks:Game['world']['bankTerrain'];state:Game['state'];walk:Uint8Array;revision:number;size:number;waterY:number;baseWaterY:number;heights:Float32Array;water?:Float32Array;terrainRevision:number;height:Game['height'];waterAt:Game['waterAt'];customTime:number|undefined;bodyRevision:number};
type Base={key:Key;flags:Uint8Array;heightCopy:Float32Array;waterCopy?:Float32Array;waterBodies:string};
type Snapshot={key:Key;walkCopy:Uint8Array;heightCopy:Float32Array;waterCopy?:Float32Array;waterBodies:string;falls:NonNullable<Game['world']['waterfalls']>;solids:{x:number;z:number;w:number;d:number}[];solidSignature:string};
type Completed={key:Key;navigation:WaterNavigation;outputCopy:Uint8Array};
type Built={navigation:WaterNavigation;snapshot:Snapshot;base:Base};
type Job={waterOnly:boolean;key:Key;generator:Generator<void,Built>};
type Runtime={world:Game['world'];state:Game['state'];completed:Map<boolean,Completed>;pending:Set<boolean>;job?:Job;lastSlice:number;base?:Base;metrics:{slices:number;maximumSliceMs:number;builds:number;baseReuses:number;labelReuses:number;restarts:number}};
const runtimes=new WeakMap<Game,Runtime>();
function runtime(g:Game){let r=runtimes.get(g);if(!r||r.world!==g.world||r.state!==g.state){r={world:g.world,state:g.state,completed:new Map(),pending:new Set(),lastSlice:-Infinity,metrics:{slices:0,maximumSliceMs:0,builds:0,baseReuses:0,labelReuses:0,restarts:0}};runtimes.set(g,r);}return r;}
function canonical(g:Game){const p=Object.getPrototypeOf(g);return g.height===p.height&&g.waterAt===p.waterAt;}
function key(g:Game):Key{return{world:g.world,banks:g.world.bankTerrain,state:g.state,walk:g.walk,revision:g.navigationRevision(),size:g.world.size,waterY:g.world.waterY,baseWaterY:g.world.baseWaterY,heights:g.world.heights,water:g.world.waterHeights,terrainRevision:g.terrainRevision(),height:g.height,waterAt:g.waterAt,customTime:canonical(g)?undefined:g.state.time,bodyRevision:localWaterRevision(g.world)};}
function current(g:Game,k:Key){return k.bodyRevision===localWaterRevision(g.world)&&!g.state.walkDirty&&k.world===g.world&&k.banks===g.world.bankTerrain&&k.state===g.state&&k.walk===g.walk&&k.revision===g.navigationRevision()&&k.size===g.world.size&&k.waterY===g.world.waterY&&k.baseWaterY===g.world.baseWaterY&&k.heights===g.world.heights&&k.water===g.world.waterHeights&&k.terrainRevision===g.terrainRevision()&&k.height===g.height&&k.waterAt===g.waterAt&&(k.customTime===undefined||k.customTime===g.state.time);}
function waterBodies(g:Game){return g.world.waterHeights&&g.world.localWaterVersion!==17?'':JSON.stringify(g.world.waterBodies||[]);}
function solids(g:Game){return g.state.buildings.filter(b=>!(b.hp<=0||b.plannedCost||['dock','bridge','farm','pen','quarry','lumber','grove','cairn','cornerstone','trench','moat'].includes(b.type)||b.type==='gate'&&b.gateOpen)).map(b=>({x:b.x,z:b.z,w:b.w,d:b.d}));}
function snapshot(g:Game,k:Key):Snapshot{const buildings=solids(g);return{key:k,walkCopy:g.walk.slice(),heightCopy:g.world.heights.slice(),waterCopy:g.world.waterHeights?.slice(),waterBodies:waterBodies(g),falls:(g.world.waterfalls||[]).map(f=>({...f})),solids:buildings,solidSignature:JSON.stringify(buildings)};}
function snapshotCurrent(g:Game,s:Snapshot){return current(g,s.key)&&sameTypedValues(g.walk,s.walkCopy)&&sameTypedValues(g.world.heights,s.heightCopy)&&sameTypedValues(g.world.waterHeights,s.waterCopy)&&waterBodies(g)===s.waterBodies&&JSON.stringify(g.world.waterfalls||[])===JSON.stringify(s.falls)&&JSON.stringify(solids(g))===s.solidSignature;}
function reusableBase(g:Game,b:Base|undefined,s:Snapshot){const k=s.key,o=b?.key;return !!(b&&o&&canonical(g)&&o.world===k.world&&o.banks===k.banks&&o.state===k.state&&o.size===k.size&&o.waterY===k.waterY&&o.baseWaterY===k.baseWaterY&&o.heights===k.heights&&o.water===k.water&&o.terrainRevision===k.terrainRevision&&o.height===k.height&&o.waterAt===k.waterAt&&b.flags.length===g.walk.length&&b.waterBodies===s.waterBodies&&sameTypedValues(b.heightCopy,s.heightCopy)&&sameTypedValues(b.waterCopy,s.waterCopy));}
/** No partially built grid is published. Yield batches cover sampling, raster
 * application and component traversal; default samplers read the captured
 * world/revision, which is revalidated before atomic publication. */
function* build(g:Game,r:Runtime,k:Key,waterOnly:boolean):Generator<void,Built>{
 const s=snapshot(g,k),width=Math.sqrt(s.walkCopy.length),cell=k.size/width,half=k.size/2;let operations=0;
 let base:Base;
 if(reusableBase(g,r.base,s)){base=r.base!;r.metrics.baseReuses++;}
 else{
  const flags=new Uint8Array(s.walkCopy.length);
  for(let z=0;z<width;z++)for(let x=0;x<width;x++){
   const wx=-half+(x+.5)*cell,wz=-half+(z+.5)*cell,h=g.height(wx,wz);
   if(Math.abs(wx)<=half-2&&Math.abs(wz)<=half-2){
    const level=g.waterAt(wx,wz);
    if(h>=level+.3)flags[z*width+x]=2;
    if(h<level+.3){const surface=Math.max(h,level+.16);
     if(Math.abs(surface-Math.max(g.height(wx+cell,wz),g.waterAt(wx+cell,wz)+.16))<=2.45&&Math.abs(surface-Math.max(g.height(wx,wz+cell),g.waterAt(wx,wz+cell)+.16))<=2.45)flags[z*width+x]=1;
    }
   }
   if(++operations%WATER_NAVIGATION_RULES.operationsPerYield===0)yield;
  }
  base={key:k,flags,heightCopy:s.heightCopy,waterCopy:s.waterCopy,waterBodies:s.waterBodies};
 }
 const grid=s.walkCopy.slice();
 for(let i=0;i<grid.length;i++){if(base.flags[i]===1)grid[i]=1;else if(waterOnly&&base.flags[i]===2)grid[i]=0;if(++operations%WATER_NAVIGATION_RULES.operationsPerYield===0)yield;}
 for(const fall of s.falls)if(fall.upperY-fall.lowerY>2.45){
  const radius=fall.width*.7+cell,length=Math.hypot(fall.dx,fall.dz)||1,dirX=fall.dx/length,dirZ=fall.dz/length;
  for(let z=Math.max(0,Math.floor((fall.z-radius+half)/cell));z<=Math.min(width-1,Math.ceil((fall.z+radius+half)/cell));z++)
   for(let x=Math.max(0,Math.floor((fall.x-radius+half)/cell));x<=Math.min(width-1,Math.ceil((fall.x+radius+half)/cell));x++){
    const dx=-half+(x+.5)*cell-fall.x,dz=-half+(z+.5)*cell-fall.z;
    if(Math.abs(dx*dirX+dz*dirZ)<cell*1.5&&Math.abs(-dx*dirZ+dz*dirX)<radius)grid[z*width+x]=0;
    if(++operations%WATER_NAVIGATION_RULES.operationsPerYield===0)yield;
   }
 }
 for(const b of s.solids){const rx=b.w*.4+.75,rz=b.d*.4+.75;
  for(let z=Math.max(0,Math.floor((b.z-rz+half)/cell));z<=Math.min(width-1,Math.floor((b.z+rz+half)/cell));z++)
   for(let x=Math.max(0,Math.floor((b.x-rx+half)/cell));x<=Math.min(width-1,Math.floor((b.x+rx+half)/cell));x++){
    if(Math.abs(-half+(x+.5)*cell-b.x)<rx&&Math.abs(-half+(z+.5)*cell-b.z)<rz)grid[z*width+x]=0;
    if(++operations%WATER_NAVIGATION_RULES.operationsPerYield===0)yield;
   }
 }
 const previous=r.completed.get(waterOnly)?.navigation;
 if(previous?.width===width&&sameTypedValues(grid,r.completed.get(waterOnly)!.outputCopy)){r.metrics.labelReuses++;return{navigation:{revision:k.revision,grid,labels:previous.labels,width},snapshot:s,base};}
 const labels=new Int32Array(grid.length),queue=new Int32Array(grid.length);let label=0;
 for(let start=0;start<grid.length;start++){
  if(grid[start]&&!labels[start]){
   label++;let head=0,tail=1;queue[0]=start;labels[start]=label;
   while(head<tail){const at=queue[head++],x=at%width,z=Math.floor(at/width);let n;
    // Same east/west/south/north order as the original traversal, no per-cell arrays.
    if(x+1<width){n=at+1;if(grid[n]&&!labels[n]){labels[n]=label;queue[tail++]=n;}}
    if(x>0){n=at-1;if(grid[n]&&!labels[n]){labels[n]=label;queue[tail++]=n;}}
    if(z+1<width){n=at+width;if(grid[n]&&!labels[n]){labels[n]=label;queue[tail++]=n;}}
    if(z>0){n=at-width;if(grid[n]&&!labels[n]){labels[n]=label;queue[tail++]=n;}}
    if(++operations%WATER_NAVIGATION_RULES.operationsPerYield===0)yield;
   }
  }
  if(++operations%WATER_NAVIGATION_RULES.operationsPerYield===0)yield;
 }
 return{navigation:{revision:k.revision,grid,labels,width},snapshot:s,base};
}
function publish(g:Game,r:Runtime,waterOnly:boolean,b:Built){if(!snapshotCurrent(g,b.snapshot)){r.metrics.restarts++;return false;}r.base=b.base;r.completed.set(waterOnly,{key:b.snapshot.key,navigation:b.navigation,outputCopy:b.navigation.grid.slice()});r.pending.delete(waterOnly);r.metrics.builds++;return true;}
/** Compatibility contract: an explicit synchronous lookup remains exact. NPC
 * opportunity callers should request preparation first to avoid cold blocking. */
export function waterNavigation(g:Game,waterOnly=false):WaterNavigation{
 if(g.state.walkDirty)g.rebuildWalk();
 const r=runtime(g),old=r.completed.get(waterOnly);if(old&&current(g,old.key))return old.navigation;
 const job=r.job?.waterOnly===waterOnly&&current(g,r.job.key)?r.job:{waterOnly,key:key(g),generator:undefined as unknown as Generator<void,Built>};
 if(!job.generator)job.generator=build(g,r,job.key,waterOnly);
 for(;;){const result=job.generator.next();if(result.done){if(r.job===job)r.job=undefined;if(publish(g,r,waterOnly,result.value))return result.value.navigation;return waterNavigation(g,waterOnly);}}
}
/** Additive API: pending is preparation, never proof that a route is absent. */
export function requestWaterNavigation(g:Game,waterOnly=true):WaterNavigationRequest{
 const r=runtime(g),old=r.completed.get(waterOnly);if(old&&current(g,old.key))return{status:'ready',navigation:old.navigation};
 r.pending.add(waterOnly);tickWaterNavigationPreparation(g);
 const ready=r.completed.get(waterOnly);return ready&&current(g,ready.key)?{status:'ready',navigation:ready.navigation}:{status:'pending'};
}
/** Shared budget across both navigation modes and every caller in a frame. */
export function tickWaterNavigationPreparation(g:Game){
 const cached=runtimes.get(g);if(!cached)return;const r=runtime(g);if(!r.pending.size)return;
 const start=performance.now();if(start-r.lastSlice<WATER_NAVIGATION_RULES.sliceCadenceMilliseconds)return;r.lastSlice=start;
 if(g.state.walkDirty)return;
 try{
  while(performance.now()-start<WATER_NAVIGATION_RULES.sliceMilliseconds){
   if(r.job&&!current(g,r.job.key)){r.job=undefined;r.metrics.restarts++;}
   if(!r.job){const mode=r.pending.values().next();if(mode.done)break;const k=key(g);r.job={waterOnly:mode.value,key:k,generator:build(g,r,k,mode.value)};}
   const job=r.job,result=job.generator.next();if(result.done){r.job=undefined;publish(g,r,job.waterOnly,result.value);}
  }
 }finally{r.metrics.slices++;r.metrics.maximumSliceMs=Math.max(r.metrics.maximumSliceMs,performance.now()-start);}
}
export function waterNavigationPreparationStatus(g:Game){const entry=runtimes.get(g),r=entry?.world===g.world&&entry.state===g.state?entry:undefined;return{pending:r?.pending.size||0,...(r?.metrics||{slices:0,maximumSliceMs:0,builds:0,baseReuses:0,labelReuses:0,restarts:0})};}
