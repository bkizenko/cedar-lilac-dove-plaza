import {herdRules} from '../game/animalSpecies';
import{penWaterReport,releaseHusbandryKeeper}from'../game/penWater';
import {searchForWildGoats, visibleGoatsForPen, cancelGoatSearch, goatSearchOrderLabel} from '../game/animalOrders';
import {penPastureReport} from '../game/penPasture';
import type {Engine} from '../game/engine';
import {assignHusbandry,beginHerdTaming,HERD,penAnimals,penPlacesOccupied,penPlacesReserved} from '../game/husbandry';
import {calendar} from '../game/settlement';
import {animalProcessingEnabled} from '../game/production';
export function HusbandryControls({engine,pen}:{engine:Engine;pen:number}) {
 const g=engine.game,animals=penAnimals(g,pen),b=g.state.buildings.find(b=>b.id===pen);
 const away=(g.state.livestock??[]).filter(a=>a.pen===pen&&a.hp>0&&a.ledBy!==undefined).length;
 const water=b?penWaterReport(g,b):null;
 const report=b?penPastureReport(g,b):null,capacity=report?.eligibleCapacity??0;
 const female=animals.filter(a=>a.sex==='female').length,kids=animals.filter(a=>g.state.time-a.born<herdRules(a.species).maturity).length;
 const keeper=g.state.units.find(u=>u.hp>0&&u.husbandryWork?.pen===pen&&u.husbandryWork.action==='care'&&!u.husbandryWork.paused);
 const pausedShearer=g.state.units.find(u=>u.hp>0&&u.husbandryWork?.pen===pen&&u.husbandryWork.action==='shear'&&u.husbandryWork.paused);
 const pausedKeeper=g.state.units.find(u=>u.hp>0&&u.husbandryWork?.pen===pen&&u.husbandryWork.action==='care'&&u.husbandryWork.paused);
 const searchActive=!!b?.goatSearch&&!['complete','exhausted'].includes(b.goatSearch.state);
 const searchStatus=b?goatSearchOrderLabel(b):null;
 const known=b?visibleGoatsForPen(g,b).length:0;
 const owned=new Set(animals.map(a=>a.id));
 const taming=g.state.units.filter(u=>u.hp>0&&u.tamingWork?.pen===pen&&!owned.has(u.tamingWork.animal)).length;
 const speciesOf=(id:number)=>g.state.wildlife.find(a=>a.id===id)?.species??g.state.livestock?.find(a=>a.id===id)?.species;
 const pausedSpecies=(species:string)=>g.state.units.some(u=>u.hp>0&&u.tamingWork?.pen===pen&&u.tamingWork.paused&&speciesOf(u.tamingWork.animal)===species);
 const paused=pausedSpecies('goat'),pausedSheep=pausedSpecies('sheep'),pausedHorse=pausedSpecies('horse'),pausedCattle=pausedSpecies('cattle');
 const reserved=penPlacesReserved(g,pen);
 const herdSummary=(['goat','sheep','horse','cattle'] as const).map(species=>({species,count:animals.filter(a=>a.species===species).length})).filter(a=>a.count).map(a=>`${a.count} ${a.species==='sheep'||a.species==='cattle'?a.species:a.species+'s'}`).join(' · ');
 const run=(fn:()=>unknown)=>{fn();engine.pushHud();};
 return <div className="craft-group"><div className="craft-options">
  <strong>{animals.length} animals · {penPlacesOccupied(g,pen)}/{capacity} pasture places{herdSummary?` · ${herdSummary}`:''}{taming?` · ${taming} coming home`:''}{away?` · ${away} away (places reserved)`:''}</strong>
  <p>{female} female · {animals.length-female} male · {kids} young</p>
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
   <button type="button" disabled={!paused&&penPlacesOccupied(g,pen)+reserved>=capacity} onClick={()=>run(()=>beginHerdTaming(g,pen))}>{paused?'Resume capture':'Capture goat'}<span>{paused?'Paid progress preserved':`${HERD.tamingFood} food · ${HERD.tamingSeconds}s at the goat, plus travel`}</span></button>
   <button type="button" disabled={!pausedSheep&&penPlacesOccupied(g,pen)+reserved>=capacity} onClick={()=>run(()=>beginHerdTaming(g,pen,undefined,'sheep'))}>{pausedSheep?'Resume sheep capture':'Capture sheep'}<span>6 food · approach a discovered wild sheep</span></button>
   <button type="button" disabled={!pausedHorse&&penPlacesOccupied(g,pen)+reserved+3>capacity} onClick={()=>run(()=>beginHerdTaming(g,pen,undefined,'horse'))}>{pausedHorse?'Resume horse capture':'Capture horse'}<span>12 food · 120s · discovered wild horse · 3 pasture places</span></button>
   <button type="button" disabled={!pausedCattle&&penPlacesOccupied(g,pen)+reserved+4>capacity} onClick={()=>run(()=>beginHerdTaming(g,pen,undefined,'cattle'))}>{pausedCattle?'Resume cattle capture':'Capture cattle'}<span>18 food · 150s · discovered wild cattle · 4 pasture places</span></button>
   <button type="button" disabled={!pausedShearer&&!animals.some(a=>a.species==='sheep'&&(a.fleece?.units||0)>=1&&g.state.time-a.born>=herdRules(a.species).maturity)} onClick={()=>run(()=>assignHusbandry(g,pen,'shear'))}>{pausedShearer?'Resume fleece delivery':'Clip sheep fleece'}<span>Raw fleece must be carried, washed, spun or felted, then sewn.</span></button>
   <button type="button" disabled={!pausedKeeper&&(report?.keepers||0)>=(report?.keepersNeeded||1)} onClick={()=>run(()=>assignHusbandry(g,pen))}>{pausedKeeper?'Resume keeper':keeper?'Assign another keeper':'Assign keeper'}</button>
   <button type="button" disabled={!animals.some(a=>a.species==='goat'&&g.state.time-a.born>=herdRules(a.species).maturity)} onClick={()=>run(()=>assignHusbandry(g,pen,'pack','goat'))}>Fit pack harness<span>2 logs · uses one adult goat</span></button>
   <button type="button" disabled={!animals.some(a=>a.species==='horse'&&g.state.time-a.born>=herdRules(a.species).maturity)} onClick={()=>run(()=>assignHusbandry(g,pen,'pack','horse'))}>Train pack horse<span>Reachable stable · 6 logs · 60s · uses one adult horse</span></button>
   <button type="button" disabled={!animals.some(a=>a.species==='cattle'&&g.state.time-a.born>=herdRules(a.species).maturity)} onClick={()=>run(()=>assignHusbandry(g,pen,'pack','cattle'))}>Train draft cattle<span>Reachable stable · 8 logs · 90s · uses one adult</span></button>
   <button type="button" disabled={!animals.some(a=>g.state.time-a.born>=herdRules(a.species).maturity)} onClick={()=>run(()=>assignHusbandry(g,pen,'slaughter'))}>Slaughter one<span>{animalProcessingEnabled(g,0)?'Meat, one hide and two bones carried to stores':'Meat carried to stores'}</span></button>
   {(keeper||pausedKeeper)&&<button type="button" onClick={()=>run(()=>{releaseHusbandryKeeper(g,(keeper||pausedKeeper)!);})}>Release keeper</button>}
  </div>
  <details><summary>Herd care</summary><p>Keep a male and female of the same species to breed. Sheep grow fleece only with pasture/feed, drinking water and keeper care. Fed, watered goat and cattle mothers produce milk after giving birth. A keeper brings plant food when pasture is depleted or winter comes, and carries milk home. Grass is a finite stock that regrows from usable ground, soil and seasonal moisture. More animals need more keeper trips. Keepers carry real drinking water from communal stores. Hungry or thirsty animals cannot breed or make milk; prolonged shortages harm health.</p>
   <p>Measured intake · Grazed {(b?.pasture?.grazedFood||0).toFixed(1)} · Feed delivered {(b?.pasture?.feedDelivered||0).toFixed(1)} · Feed eaten {(b?.pasture?.feedConsumed||0).toFixed(1)}</p>
   <ul className="boat-passengers">{animals.map(a=><li key={a.id}>{a.species==='cattle'?(g.state.time-a.born<herdRules(a.species).maturity?'Calf':a.sex==='female'?'Cow':'Bull'):a.species==='horse'?(g.state.time-a.born<herdRules(a.species).maturity?'Foal':a.sex==='female'?'Mare':'Stallion'):a.species==='sheep'?(g.state.time-a.born<herdRules(a.species).maturity?'Lamb':a.sex==='female'?'Ewe':'Ram'):(g.state.time-a.born<herdRules(a.species).maturity?'Kid':a.sex==='female'?'Doe':'Buck')}{a.species==='sheep'&&` · Fleece ${(a.fleece?.units||0).toFixed(1)} / 4`} · Hunger {Math.round(a.hunger)}%{water?.enabled?` · Thirst ${(a.thirstSeconds??0).toFixed(0)} s`:""} · Health {Math.round(a.hp/a.maxHp*100)}%{a.pregnancy?` · Gestation ${Math.floor(a.pregnancy/herdRules(a.species).gestation*100)}%`:''}</li>)}</ul>
  </details>
 </div></div>;
}
