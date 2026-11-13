import {useState} from 'react';
import {domesticationReport} from '../game/domestication';
import {useLifecycleAction} from './useLifecycleAction';
import type {HusbandryCommand} from '../game/husbandryCommands';
import {penBeddingReport} from '../game/penBedding';
import {herdRules} from '../game/animalSpecies';
import {insidePen} from '../game/penGeometry';
import {personName} from '../game/people';
import {PACK_HARNESS_RULES} from '../game/packAnimalState';
import{penWaterReport}from'../game/penWater';
import {visibleGoatsForPen, goatSearchOrderLabel} from '../game/animalOrders';
import {penPastureReport} from '../game/penPasture';
import type {Engine} from '../game/engine';
import {HERD,penAnimals,penPlacesOccupied,penPlacesReserved} from '../game/husbandry';
import {calendar} from '../game/settlement';
import {animalProcessingEnabled} from '../game/production';
export function HusbandryControls({engine,pen}:{engine:Engine;pen:number}) {
 return <HusbandryControlsInner key={`${engine.dispatchEpoch}:${pen}`} engine={engine} pen={pen}/>;
}
function HusbandryControlsInner({engine,pen}:{engine:Engine;pen:number}) {
 const action=useLifecycleAction(engine),[feedback,setFeedback]=useState(''),epoch=engine.dispatchEpoch;
 const g=engine.game,b=g.state.buildings.find(b=>b.id===pen&&b.team===0&&b.type==='pen'&&g.finished(b));
 if(!b)return null;
 const animals=penAnimals(g,pen),handling=domesticationReport(g,0);
 const away=(g.state.livestock??[]).filter(a=>a.pen===pen&&a.hp>0&&a.ledBy!==undefined).length;
 const water=b?penWaterReport(g,b):null,bedding=b?penBeddingReport(g,b):null;
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
 const pendingReturns=g.state.units.filter(u=>u.hp>0&&u.team===b?.team&&u.packPastureOrder?.pen===pen);
 const returnHandlers=g.state.units.filter(u=>u.hp>0&&u.team===b?.team&&u.type==='worker'&&!u.prisoner&&u.haulage==='pack'&&u.packAnimal&&u.packAnimal.hp>0&&!u.packPastureOrder).sort((a,c)=>Math.hypot(a.x-(b?.x??0),a.z-(b?.z??0))-Math.hypot(c.x-(b?.x??0),c.z-(b?.z??0)));
 const packAction=(species:'goat'|'horse'|'cattle',label:string,detail:string)=>{
  const paused=g.state.units.some(u=>u.hp>0&&u.husbandryWork?.pen===pen&&u.husbandryWork.action==='pack'&&u.husbandryWork.paused&&speciesOf(u.husbandryWork.animal!)===species);
  const animal=animals.filter(a=>a.species===species&&g.state.time-a.born>=herdRules(a.species).maturity&&!!b&&insidePen(b,a.x,a.z)&&!g.state.units.some(u=>u.hp>0&&u.husbandryWork?.animal===a.id)).sort((a,c)=>Number(a.sex==='female')-Number(c.sex==='female'))[0];
  return {disabled:!paused&&!animal,label:paused?(species==='goat'?'Resume pack harness':species==='horse'?'Resume horse training':'Resume cattle training'):animal?.packHarness?'Fit existing harness':label,detail:paused?'Current training progress retained':animal?.packHarness?`${PACK_HARNESS_RULES.refitSeconds}s · retained ${species} harness · no new logs`:detail};
 };
 const goatPack=packAction('goat','Fit pack harness','2 logs · uses one adult goat'),horsePack=packAction('horse','Train pack horse','Reachable stable · 6 logs · 60s · uses one adult horse'),cattlePack=packAction('cattle','Train draft cattle','Reachable stable · 8 logs · 90s · uses one adult');
 const run=(command:Omit<HusbandryCommand,'kind'|'penId'>)=>{if(engine.disposed||engine.dispatchEpoch!==epoch)return;void action.run(()=>engine.dispatch({kind:'husbandry-order',penId:pen,...command}),reply=>{if(reply.epoch===epoch&&engine.dispatchEpoch===epoch)setFeedback(reply.reason);});};
 return <div className="craft-group"><fieldset className="craft-options" disabled={action.busy} style={{border:0,margin:0,padding:0,minWidth:0}}>
  <strong>{animals.length} animals · {penPlacesOccupied(g,pen)}/{capacity} pasture places{herdSummary?` · ${herdSummary}`:''}{taming?` · ${taming} being handled`:''}{away?` · ${away} away (places reserved)`:''}</strong>
  <p>{female} female · {animals.length-female} male · {kids} young</p>
  {handling.paidAttempts>0&&<details><summary>Handling history</summary><p>Village: {handling.arrivals} home · {handling.refusals} refused · {handling.paidAttempts} attempts</p><p>{handling.baitSpent} food used for handling · {handling.successes} successful handling attempts</p><ul>{handling.recent.slice(-3).map(r=><li key={`${r.animalId}:${r.attempt}:${r.handlerId}`}>{r.species} · {r.outcome==='refused'?'Refused':r.outcome==='success'?'Handled':'Interrupted'} · {r.paidFood} food used</li>)}</ul></details>}
  <p>Usable pasture {Math.round(report?.usableAreaSquareMeters||0)} m² · Grass {Math.round((b?.pasture?.condition??1)*100)}%</p>
  <p>Stored plant feed {(b?.pasture?.feed||0).toFixed(1)} / {Math.round(report?.feedCapacity||0)} · {report?.storedFeedSeconds===Infinity?'no demand':`${Math.floor((report?.storedFeedSeconds||0)/60)} min at current herd size`}</p>
  {water?.enabled&&<p>Drinking water {water.liters.toFixed(1)} / {water.capacity} L · {(water.demand*60).toFixed(1)} L/min{water.inTransit>0?` · ${water.inTransit.toFixed(1)} L carried`:""}{water.thirsty?` · ${water.thirsty} thirsty`:""}</p>}
  {bedding&&<p title={bedding.inTransit>0?`${bedding.inTransit.toFixed(1)} straw carried for bedding`:undefined}>Bedding {bedding.units.toFixed(1)} / {Number(bedding.capacity.toFixed(1))} straw</p>}
  <p>Feed need {((report?.demandPerSecond||0)*60).toFixed(1)} / min · Pasture growth {((report?.regrowthPerSecond||0)*60).toFixed(1)} / min</p>
  {report&&capacity<report.housingCapacity&&<p>Wet or steep ground limits new animals. Existing animals stay in your herd.</p>}
  <p>{report?.keepers?`${report.keepers}/${report.keepersNeeded} keepers assigned`:'No keeper assigned'}{calendar(g).phase===3?' · Winter needs stored plant food':''}</p>
  {pendingReturns.length>0&&<div role="status"><p>{pendingReturns.length} working {pendingReturns.length===1?'animal returning':'animals returning'}</p><ul className="boat-passengers">{pendingReturns.map(u=><li key={u.id}>{personName(u)} · {u.packPastureOrder?.reason||(u.packPastureOrder?.phase==='unloading'?'Delivering carried supplies':u.packPastureOrder?.phase==='returning'?'Leading animal to pasture':'Waiting for current work')}<button type="button" onClick={()=>run({action:'cancel-return',unitId:u.id})}>Cancel return · {personName(u)}</button></li>)}</ul></div>}
  <div className="boat-actions">
   <button type="button" disabled={!returnHandlers.length} onClick={()=>run({action:'return-pack',unitId:returnHandlers[0]?.id})}>Return working animal<span>Nearest handler · current work and carried supplies come first</span></button>
   <button type="button" disabled={searchActive} onClick={()=>run({action:'search'})}>
    {searchActive?'Goat search queued':'Search for goats'}
    <span>{known?`${known} visible within reach`:`Hills and woodland within ${HERD.searchRadiusMeters} m`}</span>
   </button>
   {searchActive&&<button type="button" onClick={()=>run({action:'cancel-search'})}>Cancel search</button>}
   {searchStatus&&<span role="status">{searchStatus}</span>}
   <button type="button" disabled={!paused&&penPlacesOccupied(g,pen)+reserved>=capacity} onClick={()=>run({action:'capture',species:'goat'})}>{paused?'Resume capture':'Capture goat'}<span>{paused?'Paid progress preserved':`${HERD.tamingFood} food · ${HERD.tamingSeconds}s at the goat, plus travel`}</span></button>
   <button type="button" disabled={!pausedSheep&&penPlacesOccupied(g,pen)+reserved>=capacity} onClick={()=>run({action:'capture',species:'sheep'})}>{pausedSheep?'Resume sheep capture':'Capture sheep'}<span>6 food · approach a discovered wild sheep</span></button>
   <button type="button" disabled={!pausedHorse&&penPlacesOccupied(g,pen)+reserved+3>capacity} onClick={()=>run({action:'capture',species:'horse'})}>{pausedHorse?'Resume horse capture':'Capture horse'}<span>12 food · 120s · discovered wild horse · 3 pasture places</span></button>
   <button type="button" disabled={!pausedCattle&&penPlacesOccupied(g,pen)+reserved+4>capacity} onClick={()=>run({action:'capture',species:'cattle'})}>{pausedCattle?'Resume cattle capture':'Capture cattle'}<span>18 food · 150s · discovered wild cattle · 4 pasture places</span></button>
   <button type="button" disabled={!pausedShearer&&!animals.some(a=>a.species==='sheep'&&(a.fleece?.units||0)>=1&&g.state.time-a.born>=herdRules(a.species).maturity)} onClick={()=>run({action:'shear'})}>{pausedShearer?'Resume fleece delivery':'Clip sheep fleece'}<span>Raw fleece must be carried, washed, spun or felted, then sewn.</span></button>
   <button type="button" disabled={!pausedKeeper&&(report?.keepers||0)>=(report?.keepersNeeded||1)} onClick={()=>run({action:'care'})}>{pausedKeeper?'Resume keeper':keeper?'Assign another keeper':'Assign keeper'}</button>
   <button type="button" disabled={goatPack.disabled} onClick={()=>run({action:'pack',species:'goat'})}>{goatPack.label}<span>{goatPack.detail}</span></button>
   <button type="button" disabled={horsePack.disabled} onClick={()=>run({action:'pack',species:'horse'})}>{horsePack.label}<span>{horsePack.detail}</span></button>
   <button type="button" disabled={cattlePack.disabled} onClick={()=>run({action:'pack',species:'cattle'})}>{cattlePack.label}<span>{cattlePack.detail}</span></button>
   <button type="button" disabled={!animals.some(a=>g.state.time-a.born>=herdRules(a.species).maturity)} onClick={()=>run({action:'slaughter'})}>Slaughter one<span>{animalProcessingEnabled(g,0)?'Meat, one hide and two bones carried to stores':'Meat carried to stores'}</span></button>
   {(keeper||pausedKeeper)&&<button type="button" onClick={()=>run({action:'release-keeper',unitId:(keeper||pausedKeeper)!.id})}>Release keeper</button>}
  </div>
  <details><summary>Herd care</summary><p>Keep a male and female of the same species to breed. Sheep grow fleece only with pasture/feed, drinking water and keeper care. Fed, watered goat and cattle mothers produce milk after giving birth. A keeper brings plant food when pasture is depleted or winter comes, and carries milk home. Grass is a finite stock that regrows from usable ground, soil and seasonal moisture. More animals need more keeper trips. Keepers carry real drinking water from communal stores. Hungry or thirsty animals cannot breed or make milk; prolonged shortages harm health.</p>
   <p>Measured intake · Grazed {(b?.pasture?.grazedFood||0).toFixed(1)} · Feed delivered {(b?.pasture?.feedDelivered||0).toFixed(1)} · Feed eaten {(b?.pasture?.feedConsumed||0).toFixed(1)}</p>
   <ul className="boat-passengers">{animals.map(a=><li key={a.id}>{a.species==='cattle'?(g.state.time-a.born<herdRules(a.species).maturity?'Calf':a.sex==='female'?'Cow':'Bull'):a.species==='horse'?(g.state.time-a.born<herdRules(a.species).maturity?'Foal':a.sex==='female'?'Mare':'Stallion'):a.species==='sheep'?(g.state.time-a.born<herdRules(a.species).maturity?'Lamb':a.sex==='female'?'Ewe':'Ram'):(g.state.time-a.born<herdRules(a.species).maturity?'Kid':a.sex==='female'?'Doe':'Buck')}{a.species==='sheep'&&` · Fleece ${(a.fleece?.units||0).toFixed(1)} / 4`} · Hunger {Math.round(a.hunger)}%{water?.enabled?` · Thirst ${(a.thirstSeconds??0).toFixed(0)} s`:""} · Health {Math.round(a.hp/a.maxHp*100)}%{a.pregnancy?` · Gestation ${Math.floor(a.pregnancy/herdRules(a.species).gestation*100)}%`:''}</li>)}</ul>
  </details>
 </fieldset>{(feedback||action.error)&&<p role="status">{action.error||feedback}</p>}</div>;
}
