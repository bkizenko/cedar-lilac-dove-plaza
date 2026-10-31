import type {Engine} from '@/game/engine';
import {EXCAVATION_RULES,excavationDepth,setExcavationDepth,cutRadius,excavationCuts} from '@/game/excavation';
export function ExcavationControls({engine}:{engine:Engine}){
 const depth=excavationDepth(engine.game),span=4*.36+2*cutRadius({depth});
 return <div className="flex flex-wrap items-center gap-2 text-sm">
  <label htmlFor="trench-depth">Trench depth</label>
  <select id="trench-depth" value={depth} onChange={event=>{setExcavationDepth(engine.game,Number(event.target.value));engine.pushHud();}} aria-label="Trench depth">
   {EXCAVATION_RULES.depths.map(value=><option key={value} value={value}>{value} m</option>)}
  </select>
  <span>Sloped banks need {span.toFixed(1)} m clear · deeper cuts take more digging</span>
 </div>;
}
export function ExcavationReadout({engine,buildingId}:{engine:Engine;buildingId:number}){
 const b=engine.game.state.buildings.find(b=>b.id===buildingId) as (import('@/game/types').Building&{excavationDepth?:number;excavationVolume?:number;excavationWorkSeconds?:number})|undefined;if(!b)return null;
 const cut=excavationCuts(engine.game).find(c=>c.buildingId===buildingId);
 return <p className="text-xs text-parchment-dim">{b.excavationDepth??1} m deep{b.excavationVolume!==undefined?` · ${b.excavationVolume.toFixed(1)} m³ of soil`:''}{b.excavationWorkSeconds!==undefined?` · ${Math.ceil(b.excavationWorkSeconds)} work seconds`:''}{cut?' · Excavated ground remains after removing the marker':b.build>=1?' · Existing marker — no physical cut recorded':' · Ground changes when digging is complete'}</p>;
}
