import type {LocalWaterIndex} from './indexedLocalWater';
import {indexedWaterAt} from './indexedLocalWater';
import type {LakeBody,LocalWaterBody,Waterfall} from './localWater';
/** Derived raw indexed surfaces only. Exact numeric coordinates, never a raster
 * approximation. Current sea/base offsets remain the caller's responsibility. */
export const EXACT_WATER_MEMO_RULES=Object.freeze({maximumEntriesPerWorld:16384});
type WaterOwner={waterBodies?:LocalWaterBody[];waterfalls?:Waterfall[];size?:number};
type Row={bodies:WaterOwner['waterBodies'];falls:WaterOwner['waterfalls'];size:number|undefined;index:LocalWaterIndex;values:Map<number,Map<number,number|null>>;entries:number;hits:number;misses:number;invalidations:number;capacityResets:number;bypasses:number};
const rows=new WeakMap<object,Row>();
export function exactWaterMemoAt(world:WaterOwner,index:LocalWaterIndex,x:number,z:number,contains:(body:LakeBody,x:number,z:number)=>boolean){
 let row=rows.get(world);
 if(!row){row={bodies:world.waterBodies,falls:world.waterfalls,size:world.size,index,values:new Map(),entries:0,hits:0,misses:0,invalidations:0,capacityResets:0,bypasses:0};rows.set(world,row);}
 else if(row.bodies!==world.waterBodies||row.falls!==world.waterfalls||row.size!==world.size||row.index!==index){row.values.clear();row.entries=0;row.bodies=world.waterBodies;row.falls=world.waterfalls;row.size=world.size;row.index=index;row.invalidations++;}
 // Preserve the index's existing nonfinite/bounds behavior, without retaining
 // unbounded invalid coordinates. No per-hit arrays, coordinate strings or keys.
 if(!Number.isFinite(x)||!Number.isFinite(z)||Math.abs(x)>index.size/2||Math.abs(z)>index.size/2){row.bypasses++;return indexedWaterAt(index,x,z,contains);}
 let column=row.values.get(x);const cached=column?.get(z);
 if(cached!==undefined){row.hits++;return cached;}
 row.misses++;const surface=indexedWaterAt(index,x,z,contains);
 if(row.entries>=EXACT_WATER_MEMO_RULES.maximumEntriesPerWorld){row.values.clear();row.entries=0;row.capacityResets++;column=undefined;}
 if(!column){column=new Map();row.values.set(x,column);}column.set(z,surface);row.entries++;return surface;
}
/** Diagnostics only: no saved state and no global references retaining worlds. */
export function exactWaterMemoReport(world:object){const r=rows.get(world);return r?{entries:r.entries,columns:r.values.size,hits:r.hits,misses:r.misses,invalidations:r.invalidations,capacityResets:r.capacityResets,bypasses:r.bypasses,maximumEntriesPerWorld:EXACT_WATER_MEMO_RULES.maximumEntriesPerWorld}:null;}
