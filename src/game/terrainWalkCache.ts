import type {Game} from './sim';
type Cache={world:Game['world'];size:number;waterY:number;baseWaterY:number;heights:Float32Array;heightCopy:Float32Array;water?:Float32Array;waterCopy?:Float32Array;waterBodies:string;bridges:string;cuts:unknown;cutCount:number;grid:Uint8Array;builds:number;hits:number};
const entries=new WeakMap<Game,Cache>();
export function sameTypedValues(a:Float32Array|Uint8Array|undefined,b:Float32Array|Uint8Array|undefined){if(!a||!b)return a===b;if(a.length!==b.length)return false;for(let i=0;i<a.length;i++)if(a[i]!==b[i])return false;return true;}
/** Only static terrain is cached. Buildings are always rasterized afterward.
 * Exact snapshots detect in-place terrain/water edits; no lossy hash is used. */
export function terrainWalkBase(g:Game,build:()=>Uint8Array){
 const prototype=Object.getPrototypeOf(g);
 // Test tools/custom worlds may override samplers with closures whose state is
 // not represented by WorldData. Preserve explicit rebuild semantics for them.
 if(g.height!==prototype.height||g.waterAt!==prototype.waterAt||g.travelHeight!==prototype.travelHeight)return build();
 const world=g.world,cuts=(g.state as Game['state']&{excavations?:unknown[]}).excavations,bridges=JSON.stringify(g.state.buildings.filter(b=>b.type==='bridge'&&g.finished(b)&&b.bridge).map(b=>b.bridge)),waterBodies=world.waterHeights&&world.localWaterVersion!==17?'':JSON.stringify(world.waterBodies||[])+(world.localWaterVersion===17?JSON.stringify(world.waterfalls||[]):''),old=entries.get(g);
 if(old?.world===world&&old.size===world.size&&old.waterY===world.waterY&&old.baseWaterY===world.baseWaterY&&old.heights===world.heights&&old.water===world.waterHeights&&old.bridges===bridges&&old.waterBodies===waterBodies&&old.cuts===cuts&&old.cutCount===(cuts?.length||0)&&sameTypedValues(world.heights,old.heightCopy)&&sameTypedValues(world.waterHeights,old.waterCopy)){old.hits++;return old.grid;}
 const grid=build();entries.set(g,{world,size:world.size,waterY:world.waterY,baseWaterY:world.baseWaterY,heights:world.heights,heightCopy:world.heights.slice(),water:world.waterHeights,waterCopy:world.waterHeights?.slice(),waterBodies,bridges,cuts,cutCount:cuts?.length||0,grid,builds:(old?.builds||0)+1,hits:old?.hits||0});return grid;
}
export function terrainWalkCacheStats(g:Game){const entry=entries.get(g);return{builds:entry?.builds||0,hits:entry?.hits||0};}
