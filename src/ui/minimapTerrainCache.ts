import {Game} from '../game/sim';
import {sameTypedValues} from '../game/terrainWalkCache';
const heightSampler=Game.prototype.height,waterSampler=Game.prototype.waterAt,terrainRevision=Game.prototype.terrainRevision;
/** Only these exact production samplers have a known, finite input contract.
 * Custom/test samplers keep the existing bounded 500 ms resampling path. */
export function canonicalMinimapSource(g:unknown):g is Game {
 return g instanceof Game&&g.height===heightSampler&&g.waterAt===waterSampler&&g.terrainRevision===terrainRevision;
}
export type StaticMinimapSource={state:Game['state'];localWaterVersion?:17;size:number;segs:number;waterY:number;baseWaterY:number;
 heights:Float32Array;heightCopy:Float32Array;water?:Float32Array;waterCopy?:Float32Array;
 ecology:Game['world']['ecology'];ecologySize?:number;ecologyWidth?:number;ecologyKinds?:Uint8Array;ecologyCopy?:Uint8Array;
 biomes:string;bodies:string;falls:string;cuts:string;terrainRevision:number};
export function captureMinimapSource(g:Game):StaticMinimapSource {
 const w=g.world,e=w.ecology;
 return {state:g.state,localWaterVersion:w.localWaterVersion,size:w.size,segs:w.segs,waterY:w.waterY,baseWaterY:w.baseWaterY,
  heights:w.heights,heightCopy:w.heights.slice(),water:w.waterHeights,waterCopy:w.waterHeights?.slice(),
  ecology:e,ecologySize:e?.size,ecologyWidth:e?.width,ecologyKinds:e?.kinds,ecologyCopy:e?.kinds.slice(),
  biomes:JSON.stringify(w.biomes),bodies:JSON.stringify(w.waterBodies||[]),falls:w.localWaterVersion===17?JSON.stringify(w.waterfalls||[]):'',cuts:JSON.stringify(g.state.excavations||[]),terrainRevision:g.terrainRevision()};
}
export function sameMinimapSource(g:Game,s:StaticMinimapSource):boolean {
 const w=g.world,e=w.ecology;
 return s.localWaterVersion===w.localWaterVersion&&s.state===g.state&&s.size===w.size&&s.segs===w.segs&&s.waterY===w.waterY&&s.baseWaterY===w.baseWaterY&&
  s.heights===w.heights&&sameTypedValues(s.heightCopy,w.heights)&&s.water===w.waterHeights&&sameTypedValues(s.waterCopy,w.waterHeights)&&
  s.ecology===e&&s.ecologySize===e?.size&&s.ecologyWidth===e?.width&&s.ecologyKinds===e?.kinds&&sameTypedValues(s.ecologyCopy,e?.kinds)&&
  s.biomes===JSON.stringify(w.biomes)&&s.bodies===JSON.stringify(w.waterBodies||[])&&s.falls===(w.localWaterVersion===17?JSON.stringify(w.waterfalls||[]):'')&&s.cuts===JSON.stringify(g.state.excavations||[])&&s.terrainRevision===g.terrainRevision();
}
