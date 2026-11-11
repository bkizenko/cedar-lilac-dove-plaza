import{penWaterReport,releaseHusbandryKeeper}from'../game/penWater';
import {searchForWildGoats, visibleGoatsForPen, cancelGoatSearch, goatSearchOrderLabel} from '../game/animalOrders';
import {penPastureReport} from '../game/penPasture';
import type {Engine} from '../game/engine';
import {assignHusbandry,beginHerdTaming,HERD,penAnimals} from '../game/husbandry';
import {calendar} from '../game/settlement';
import {animalProcessingEnabled} from '../game/production';
export function HusbandryControls({engine,pen}:{engine:Engine;pen:number}) {
 const g=engine.game,animals=penAnimals(g,pen),b=g.state.buildings.find(b=>b.id===pen);
 const water=b?penWaterReport(g,b):null;
 const report=b?penPastureReport(g,b):null,capacity=report?.eligibleCapacity??0;
 const female=animals.filter(a=>a.sex==='female').length,kids=animals.filter(a=>g.state.time-a.born<HERD.maturity).length;
 const keeper=g.state.units.find(u=>u.hp>0&&u.husbandryWork?.pen===pen&&u.husbandryWork.action==='care'&&!u.husbandryWork.paused);
 const pausedKeeper=g.state.units.find(u=>u.hp>0&&u.husbandryWork?.pen===pen&&u.husbandryWork.action==='care'&&u.husbandryWork.paused);
 const searchActive=!!b?.goatSearch&&!['complete','exhausted'].includes(b.goatSearch.state);
 const searchStatus=b?goatSearchOrderLabel(b):null;
 const known=b?visibleGoatsForPen(g,b).length:0;
 const owned=new Set(animals.map(a=>a.id));
 const taming=g.state.units.filter(u=>u.hp>0&&u.tamingWork?.pen===pen&&!owned.has(u.tamingWork.animal)).length;
 const paused=g.state.units.some(u=>u.hp>0&&u.tamingWork?.pen===pen&&u.tamingWork.paused);
 const run=(fn:()=>unknown)=>{fn();engine.pushHud();};
 return <div className="craft-group"><div className="craft-options">
  <strong>{animals.length}/{capacity} goats{taming?` · ${taming} coming home`:''}</strong>
  <p>{female} female · {animals.length-female} male · {kids} kids</p>
  <p>Usable pasture {Math.round(report?.usableAreaSquareMeters||0)} m² · Grass {Math.round((b?.pasture?.condition??1)*100)}%</p>
  <p>Stored plant feed {(b?.pasture?.feed||0).toFixed(1)} / {Math.round(report?.feedCapacity||0)} · {report?.storedFeedSeconds===Infinity?'no demand':`${Math.floor((report?.storedFeedSeconds||0)/60)} min at current herd size`}</p>
  {water?.enabled&&<p>Drinking water {water.liters.toFixed(1)} / {water.capacity} L · {(water.demand*60).toFixed(1)} L/min{water.inTransit>0?` · ${water.inTransit.toFixed(1)} L carried`:""}{water.thirsty?` · ${water.thirsty} thirsty`:""}</p>}
  <p>Feed need {((report?.demandPerSecond||0)*60).toFixed(1)} / min · Pasture growth {((report?.regrowthPerSecond||0)*60).toFixed(1)} / min</p>
  {report&&capacity<report.housingCapacity&&<p>Wet or steep ground limits new animals. Existing animals stay in your herd.</p>}
  <p>{report?.keepers?`${report.keepers}/${report.keepersNeeded} keepers assigned`:'No keeper assigned'}{calendar(g).phase===3?' · Winter needs stored plant food':''}</p>
  <div className="boat-actions">
   <button type="button" disabled={searchActive} onClick={()=>run(()=>searchForWildGoats(g,pen).accepted)}>
    {searchActive?'Goat search queued':'Search for goats'}
    <span>{known?`${known} visible within reach`:`Hills and woodland within ${HERD.searchRadiusMeters} m`}</span>
   </button>
   {searchActive&&<button type="button" onClick={()=>run(()=>cancelGoatSearch(g,pen))}>Cancel search</button>}
   {searchStatus&&<span role="status">{searchStatus}</span>}
   <button type="button" disabled={!paused&&animals.length+taming>=capacity} onClick={()=>run(()=>beginHerdTaming(g,pen))}>{paused?'Resume capture':'Capture goat'}<span>{paused?'Paid progress preserved':`${HERD.tamingFood} food · ${HERD.tamingSeconds}s at the goat, plus travel`}</span></button>
   <button type="button" disabled={!pausedKeeper&&(report?.keepers||0)>=(report?.keepersNeeded||1)} onClick={()=>run(()=>assignHusbandry(g,pen))}>{pausedKeeper?'Resume keeper':keeper?'Assign another keeper':'Assign keeper'}</button>
   <button type="button" disabled={!animals.some(a=>g.state.time-a.born>=HERD.maturity)} onClick={()=>run(()=>assignHusbandry(g,pen,'pack'))}>Fit pack harness<span>2 logs · uses one adult goat</span></button>
   <button type="button" disabled={!animals.some(a=>g.state.time-a.born>=HERD.maturity)} onClick={()=>run(()=>assignHusbandry(g,pen,'slaughter'))}>Slaughter one<span>{animalProcessingEnabled(g,0)?'Meat, one hide and two bones carried to stores':'Meat carried to stores'}</span></button>
   {(keeper||pausedKeeper)&&<button type="button" onClick={()=>run(()=>{releaseHusbandryKeeper(g,(keeper||pausedKeeper)!);})}>Release keeper</button>}
  </div>
  <details><summary>Herd care</summary><p>Keep a male and female to raise kids. Fed, tended mothers produce milk. A keeper brings plant food when pasture is depleted or winter comes, and carries milk home. Grass is a finite stock that regrows from usable ground, soil and seasonal moisture. More animals need more keeper trips. Keepers carry real drinking water from communal stores. Hungry or thirsty animals cannot breed or make milk; prolonged shortages harm health.</p>
   <p>Measured intake · Grazed {(b?.pasture?.grazedFood||0).toFixed(1)} · Feed delivered {(b?.pasture?.feedDelivered||0).toFixed(1)} · Feed eaten {(b?.pasture?.feedConsumed||0).toFixed(1)}</p>
   <ul className="boat-passengers">{animals.map(a=><li key={a.id}>{g.state.time-a.born<HERD.maturity?'Kid':a.sex==='female'?'Doe':'Buck'} · Hunger {Math.round(a.hunger)}%{water?.enabled?` · Thirst ${(a.thirstSeconds??0).toFixed(0)} s`:""} · Health {Math.round(a.hp/a.maxHp*100)}%{a.pregnancy?` · Gestation ${Math.floor(a.pregnancy/HERD.gestation*100)}%`:''}</li>)}</ul>
  </details>
 </div></div>;
}
