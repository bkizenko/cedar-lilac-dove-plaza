import type {Game} from './sim';
import {weatherWaterLevel} from './hydrology';

/** Tides behind a game option (Grok W-World, W5). Off unless the world was created
 * with `worldOptions.tideVersion: 1` (saved with the world, so old saves stay
 * tideless). The tide uses the game's one water-level channel (`world.waterY`), the
 * same one weather uses: as with floods and droughts, river and lake surfaces shift
 * with it (waterSurfaceAt adds waterY − baseWaterY). A sea-only tide would need that
 * split, plus every cache keyed on waterY — proposed, not done. The tide is stepped (one walk rebuild per stage, never per frame) and,
 * combined with weather, stays inside the seasonal envelope the game already
 * handles (drought −0.18 … flood +0.55 m), so no new water state can strand a
 * building, dock or path that weather could not. Phase is read from saved game
 * time, so a reloaded game is at the same tide. */
export const TIDE_RULES={version:1,periodSeconds:720,stages:6,amplitudeMetres:.3} as const;
type G=Pick<Game,'world'|'state'>;
const opt=(g:G)=>(g.state.worldOptions??g.world.options) as {tideVersion?:number}|undefined;
export const tidesEnabled=(g:G)=>opt(g)?.tideVersion===1||opt(g)?.tideVersion===2;
/** v2 (W6): sea-only. `world.waterY` stays the weather level for all water, and the
 * tide is a runtime `world.seaTideY` offset applied only where the background sea is
 * the surface (waterSurfaceAt via seaSurfaceY). Rivers and lakes never move with it.
 * Existing formulas that subtract waterY become stricter at sea, never looser inland. */
export const seaOnlyTides=(g:G)=>opt(g)?.tideVersion===2;
export function tideStage(time:number){const R=TIDE_RULES;return Math.floor(((time%R.periodSeconds)+R.periodSeconds)%R.periodSeconds/R.periodSeconds*R.stages);}
export function tideOffset(time:number){const R=TIDE_RULES;return +(R.amplitudeMetres*Math.sin(2*Math.PI*(tideStage(time)+.5)/R.stages)).toFixed(4);}
/** Sea level for the current weather and tide, clamped to the seasonal envelope. */
export function tidalWaterLevel(g:G,time=g.state.time){
 const base=g.world.baseWaterY,weather=weatherWaterLevel(base,g.state.weather);if(!tidesEnabled(g))return weather;
 return Math.min(weatherWaterLevel(base,'flood'),Math.max(weatherWaterLevel(base,'drought'),weather+tideOffset(time)));
}
/** One wiring line after the weather tick. Returns true when the sea moved. */
export function advanceTide(g:Game){
 if(!tidesEnabled(g))return false;const level=tidalWaterLevel(g);
 if(seaOnlyTides(g)){const weather=weatherWaterLevel(g.world.baseWaterY,g.state.weather),tide=+(level-weather).toFixed(4);
  if(g.world.waterY===weather&&(g.world.seaTideY??0)===tide)return false;g.world.waterY=weather;g.world.seaTideY=tide;g.rebuildWalk();return true;}
 if(g.world.waterY===level)return false;
 g.world.waterY=level;g.rebuildWalk();return true;
}
export function tideFacts(g:G){
 if(!tidesEnabled(g))return{tides:false as const};
 const R=TIDE_RULES,t=g.state.time,stage=tideStage(t),stageSeconds=R.periodSeconds/R.stages,levels=Array.from({length:R.stages},(_,k)=>tideOffset(k*stageSeconds));
 const high=levels.indexOf(Math.max(...levels)),toHigh=((high-stage+R.stages)%R.stages)*stageSeconds-(t%stageSeconds);
 return{tides:true as const,seaOnly:seaOnlyTides(g),stage,offsetMetres:tideOffset(t),rangeMetres:+(Math.max(...levels)-Math.min(...levels)).toFixed(2),periodSeconds:R.periodSeconds,secondsToHigh:Math.max(0,Math.round(toHigh<0?toHigh+R.periodSeconds:toHigh))};
}
