import type {Engine} from '../game/engine';
import {assignHusbandry,beginHerdTaming,HERD,penAnimals} from '../game/husbandry';
import {calendar} from '../game/settlement';
export function HusbandryControls({engine,pen}:{engine:Engine;pen:number}) {
 const g=engine.game,animals=penAnimals(g,pen),b=g.state.buildings.find(b=>b.id===pen);
 const female=animals.filter(a=>a.sex==='female').length,kids=animals.filter(a=>g.state.time-a.born<HERD.maturity).length;
 const keeper=g.state.units.find(u=>u.hp>0&&u.husbandryWork?.pen===pen&&u.husbandryWork.action==='care'&&!u.husbandryWork.paused);
 const taming=g.state.units.filter(u=>u.hp>0&&u.tamingWork?.pen===pen).length;
 const paused=g.state.units.some(u=>u.hp>0&&u.tamingWork?.pen===pen&&u.tamingWork.paused);
 const run=(fn:()=>unknown)=>{fn();engine.pushHud();};
 return <div className="craft-group"><div className="craft-options">
  <strong>{animals.length}/{HERD.capacity} goats{taming?` · ${taming} coming home`:''}</strong>
  <p>{female} female · {animals.length-female} male · {kids} kids</p>
  <p>Pasture {Math.round((b?.pasture?.condition??1)*100)}% · Feed {Math.floor(b?.pasture?.feed||0)}</p>
  <p>{keeper?`Keeper: ${keeper.name||'Resident'}`:'No keeper assigned'}{calendar(g).phase===3?' · Winter needs stored plant food':''}</p>
  <div className="boat-actions">
   <button type="button" disabled={!paused&&animals.length+taming>=HERD.capacity} onClick={()=>run(()=>beginHerdTaming(g,pen))}>{paused?'Resume capture':'Capture goat'}<span>{paused?'Paid progress preserved':'6 food · find wild goats first'}</span></button>
   <button type="button" disabled={!!keeper} onClick={()=>run(()=>assignHusbandry(g,pen))}>Assign keeper</button>
   <button type="button" disabled={!animals.some(a=>g.state.time-a.born>=HERD.maturity)} onClick={()=>run(()=>assignHusbandry(g,pen,'pack'))}>Fit pack harness<span>2 logs · uses one adult goat</span></button>
   <button type="button" disabled={!animals.some(a=>g.state.time-a.born>=HERD.maturity)} onClick={()=>run(()=>assignHusbandry(g,pen,'slaughter'))}>Slaughter one<span>Meat carried to stores</span></button>
   {keeper&&<button type="button" onClick={()=>run(()=>{g.interruptMission(keeper);keeper.husbandryWork=undefined;keeper.order=keeper.carry>0?'return':'idle';g.workBoard.reset();})}>Release keeper</button>}
  </div>
  <details><summary>Herd care</summary><p>Keep a male and female to raise kids. Fed, tended mothers produce milk. A keeper brings plant food when pasture is depleted or winter comes, and carries milk home. Crowding depletes grazing; hungry animals lose health.</p>
   <ul className="boat-passengers">{animals.map(a=><li key={a.id}>{g.state.time-a.born<HERD.maturity?'Kid':a.sex==='female'?'Doe':'Buck'} · Hunger {Math.round(a.hunger)}% · Health {Math.round(a.hp/a.maxHp*100)}%{a.pregnancy?` · Gestation ${Math.floor(a.pregnancy/HERD.gestation*100)}%`:''}</li>)}</ul>
  </details>
 </div></div>;
}
