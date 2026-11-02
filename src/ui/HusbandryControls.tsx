import {searchForWildGoats} from '../game/animalOrders';
import {penPastureReport} from '../game/penPasture';
import type {Engine} from '../game/engine';
import {assignHusbandry,beginHerdTaming,HERD,penAnimals} from '../game/husbandry';
import {calendar} from '../game/settlement';
export function HusbandryControls({engine,pen}:{engine:Engine;pen:number}) {
 const g=engine.game,animals=penAnimals(g,pen),b=g.state.buildings.find(b=>b.id===pen);
 const report=b?penPastureReport(g,b):null,capacity=report?.eligibleCapacity??0;
 const female=animals.filter(a=>a.sex==='female').length,kids=animals.filter(a=>g.state.time-a.born<HERD.maturity).length;
 const keeper=g.state.units.find(u=>u.hp>0&&u.husbandryWork?.pen===pen&&u.husbandryWork.action==='care'&&!u.husbandryWork.paused);
 const owned=new Set(animals.map(a=>a.id));
 const taming=g.state.units.filter(u=>u.hp>0&&u.tamingWork?.pen===pen&&!owned.has(u.tamingWork.animal)).length;
 const paused=g.state.units.some(u=>u.hp>0&&u.tamingWork?.pen===pen&&u.tamingWork.paused);
 const run=(fn:()=>unknown)=>{fn();engine.pushHud();};
 return <div className="craft-group"><div className="craft-options">
  <strong>{animals.length}/{capacity} goats{taming?` · ${taming} coming home`:''}</strong>
  <p>{female} female · {animals.length-female} male · {kids} kids</p>
  <p>Usable pasture {Math.round(report?.usableAreaSquareMeters||0)} m² · Grass {Math.round((b?.pasture?.condition??1)*100)}%</p>
  <p>Stored plant feed {(b?.pasture?.feed||0).toFixed(1)} / {Math.round(report?.feedCapacity||0)} · {report?.storedFeedSeconds===Infinity?'no demand':`${Math.floor((report?.storedFeedSeconds||0)/60)} min at current herd size`}</p>
  <p>Feed need {((report?.demandPerSecond||0)*60).toFixed(1)} / min · Pasture growth {((report?.regrowthPerSecond||0)*60).toFixed(1)} / min</p>
  {report&&capacity<report.housingCapacity&&<p>Wet or steep ground limits new animals. Existing animals stay in your herd.</p>}
  <p>{report?.keepers?`${report.keepers}/${report.keepersNeeded} keepers assigned`:'No keeper assigned'}{calendar(g).phase===3?' · Winter needs stored plant food':''}</p>
  <div className="boat-actions">
   <button type="button" onClick={()=>run(()=>searchForWildGoats(g,pen).accepted)}>Search woodland for goats<span>Real scout with journey food; capture needs a visible goat</span></button>
   <button type="button" disabled={!paused&&animals.length+taming>=capacity} onClick={()=>run(()=>beginHerdTaming(g,pen))}>{paused?'Resume capture':'Capture goat'}<span>{paused?'Paid progress preserved':'6 food · find wild goats first'}</span></button>
   <button type="button" disabled={(report?.keepers||0)>=(report?.keepersNeeded||1)} onClick={()=>run(()=>assignHusbandry(g,pen))}>{keeper?'Assign another keeper':'Assign keeper'}</button>
   <button type="button" disabled={!animals.some(a=>g.state.time-a.born>=HERD.maturity)} onClick={()=>run(()=>assignHusbandry(g,pen,'pack'))}>Fit pack harness<span>2 logs · uses one adult goat</span></button>
   <button type="button" disabled={!animals.some(a=>g.state.time-a.born>=HERD.maturity)} onClick={()=>run(()=>assignHusbandry(g,pen,'slaughter'))}>Slaughter one<span>Meat carried to stores</span></button>
   {keeper&&<button type="button" onClick={()=>run(()=>{g.interruptMission(keeper);keeper.husbandryWork=undefined;keeper.order=keeper.carry>0?'return':'idle';g.workBoard.reset();})}>Release keeper</button>}
  </div>
  <details><summary>Herd care</summary><p>Keep a male and female to raise kids. Fed, tended mothers produce milk. A keeper brings plant food when pasture is depleted or winter comes, and carries milk home. Grass is a finite stock that regrows from usable ground, soil and seasonal moisture. More animals need more keeper trips. Hungry animals lose health.</p>
   <p>Measured intake · Grazed {(b?.pasture?.grazedFood||0).toFixed(1)} · Feed delivered {(b?.pasture?.feedDelivered||0).toFixed(1)} · Feed eaten {(b?.pasture?.feedConsumed||0).toFixed(1)}</p>
   <ul className="boat-passengers">{animals.map(a=><li key={a.id}>{g.state.time-a.born<HERD.maturity?'Kid':a.sex==='female'?'Doe':'Buck'} · Hunger {Math.round(a.hunger)}% · Health {Math.round(a.hp/a.maxHp*100)}%{a.pregnancy?` · Gestation ${Math.floor(a.pregnancy/HERD.gestation*100)}%`:''}</li>)}</ul>
  </details>
 </div></div>;
}
