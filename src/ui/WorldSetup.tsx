import {useState} from 'react';
import type {Engine} from '../game/engine';
import type {WorldRequest,WorldOptions} from '../game/worldOptions';
export function WorldSetup({engine}:{engine:Engine}) {
 const [layout,setLayout]=useState<WorldRequest['layout']>('random');
 const [size,setSize]=useState<WorldOptions['size']>(1560);
 const [busy,setBusy]=useState(false);
 return <div className="world-setup">
  <label>Landmasses<select value={layout} onChange={e=>setLayout(e.target.value as WorldRequest['layout'])}>
   <option value="random">Surprise me</option><option value="pangaea">Pangaea</option><option value="continents">Continents</option><option value="archipelago">Archipelago</option>
  </select></label>
  <label>World size<select value={size} onChange={e=>setSize(Number(e.target.value) as WorldOptions['size'])}>
   <option value={1040}>Standard</option><option value={1560}>Large · 2.25× area</option><option value={2080}>Huge · 4× area</option>
  </select></label>
  <button type="button" disabled={busy} onClick={()=>{setBusy(true);requestAnimationFrame(()=>{engine.configureNewWorld({layout,size});setBusy(false);});}}>{busy?'Generating…':'New world'}</button>
  <span>{engine.game.world.options?.layout??'Classic island'} · {Math.round(engine.game.world.size)} m across</span>
 </div>;
}
