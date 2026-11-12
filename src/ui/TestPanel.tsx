import{commandExecutionDiagnostics}from'../game/commandExecution';
import {useLifecycleAction} from './useLifecycleAction';
import {hasTestLabSave} from '../game/save';
import {VillageSaveButton} from './VillageSaveButton';
import{herdWaterAccounting}from'../game/penWater';
import {supplyAccounting} from '../game/simulationEvents';
import {workAllocationDiagnostics} from '../game/workAllocation';
import {WorldSetup} from './WorldSetup';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {Engine} from '../game/engine';
import {testAction,type TestAction} from '../game/testing';
import {terrainMetrics} from '../game/terrainMetrics';
import {commandDiagnostics} from '../game/commandGateway';
import {AGES} from '../game/constants';
import {PROVINCE_PROFILES} from '../game/ecologicalProvinces';
export function TestPanel({engine,close}:{engine:Engine;close:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),[,refresh]=useState(0);
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close();},[]);
 const [saveStatus,setSaveStatus]=useState("");
 const lifecycle=useLifecycleAction(engine);
 const g=engine.game;
 const terrain=useMemo(()=>terrainMetrics(g.world),[g.world]),scenery=g.world.scenery;
 const execution=commandExecutionDiagnostics(g),commands=commandDiagnostics(g),jobs=workAllocationDiagnostics(g),supplies=supplyAccounting(g),herdWater=herdWaterAccounting(g);
 const run=(fn:()=>void)=>{fn();engine.pushHud();refresh(n=>n+1);};
 return <dialog ref={dialog} className="play-guide test-panel" onCancel={close}>
 <header><div><h2>Test lab</h2></div><button onClick={close} aria-label="Close testing panel">×</button></header>
 {g.testMode&&<>
 <p className="test-notice">Test copy · Your village is safe</p>
 <fieldset><legend>Saved test run</legend>
 <p>One local save slot for the Test Lab.</p>
 <div className="test-actions">
 <VillageSaveButton engine={engine} onResult={setSaveStatus}/>
 <button disabled={lifecycle.busy||!hasTestLabSave()} title="Replaces the current test run with the saved one" onClick={()=>void lifecycle.run(()=>engine.loadTestSession(),setSaveStatus)}>Load test run</button>
 </div>
 {(saveStatus||lifecycle.error)&&<p role="status">{lifecycle.error||saveStatus}</p>}
 </fieldset>
 <WorldSetup engine={engine}/>
 <fieldset><legend>Landscape measurements</legend>
 <p>Seed {g.state.seed} · generation {g.state.worldgenVersion??1}</p>
 <p>Land {Math.round(terrain.landFraction*100)}% · gentle ground {Math.round(terrain.gentleFraction*100)}% · rolling terrain {Math.round(terrain.rollingFraction*100)}%</p>
 {scenery?<><p>Starting beauty {scenery.player.score.toFixed(1)}/100 · suitable-site average {scenery.mean.toFixed(1)} · percentile {Math.round(scenery.playerPercentile*100)}</p>
 <p>Water {Math.round(scenery.player.water*100)} · relief {Math.round(scenery.player.relief*100)} · outlook {Math.round(scenery.player.outlook*100)} · contrast {Math.round(scenery.player.contrast*100)}</p>
 <p>All dry terrain: {scenery.dryLandMean.toFixed(1)}/100 across {scenery.dryLandSampleCount} samples · target {scenery.playerAboveAverage?'met':'unavailable on this seed'}</p>
 <p>{scenery.candidateCount} suitable sites · beauty range {scenery.minimum.toFixed(1)}–{scenery.maximum.toFixed(1)}. Higher scores reflect more varied landscape composition.</p></>:<p>Scenery measurements are available in new worlds. This village retains its original terrain.</p>}
 </fieldset>
 {g.world.landscape&&<fieldset><legend>Landscape composition</legend><p>{g.world.landscape.substantialLandmassCount} substantial landmasses · {g.world.landscape.dramaticRegionCount} dramatic regions</p><p>{g.world.landscape.regions.map((r,i)=>`Region ${i+1}: ${r.designedReliefMeters.toFixed(0)} m designed relief, ${r.drainageLengthMeters.toFixed(0)} m drainage${r.dramatic?', dramatic':''}`).join(' · ')}</p></fieldset>}
 {g.world.variety&&<fieldset><legend>Land and settlement survey</legend><p>{g.world.variety.mode.replaceAll('-',' ')} · {(g.world.variety.largestLandmassShare*100).toFixed(0)}% of land in the largest region · {g.world.variety.edgeContactMeters.toFixed(0)} m of dry map edges · {g.world.variety.dryCornerCount} dry corners</p>{g.world.variety.landmasses.filter(p=>p.areaSquareMeters>=18000).map((p,i)=><p key={p.id}>Landmass {i+1}: {(p.areaSquareMeters/1000000).toFixed(2)} km² · {p.townSites.length} surveyed town sites · {p.startingTownCount} starting camps</p>)}</fieldset>}
 {g.world.ecology&&<fieldset><legend>Biomes and geographical features</legend>{g.world.ecology.metrics.regions.map(p=><p key={p.kind}>{PROVINCE_PROFILES[p.kind].name}: {(p.largestConnectedAreaSquareMeters/10000).toFixed(1)} connected hectares · mean elevation {p.meanElevationMeters.toFixed(0)} m</p>)}<p>Physical features: {[...new Set((g.world.features??[]).map(f=>f.kind.replaceAll('-',' ')))].join(', ')}.</p><p>{g.world.rivers.length} river courses · {g.world.waterBodies?.filter(b=>b.kind==='lake').length??0} lakes · {g.world.waterfalls?.length??0} waterfalls</p></fieldset>}
 <fieldset><legend>World</legend><label><input type="checkbox" checked={g.revealMap} onChange={e=>run(()=>{g.revealMap=e.target.checked;g.updateVision(0);})}/> Reveal the whole map</label>
 <label>Age<select value={g.tribe(0).age} onChange={e=>run(()=>{g.tribe(0).age=Number(e.target.value);engine.view.rebuild(g);})}>{AGES.map((a,i)=><option key={a} value={i}>{a}</option>)}</select></label>
 <label>Weather<select value={g.state.weather} onChange={e=>run(()=>{g.state.weather=e.target.value as typeof g.state.weather;g.state.weatherT=180;})}>{['clear','rain','storm','mist','golden','frost','drought','flood'].map(w=><option key={w}>{w}</option>)}</select></label>
 <label>Scheduled raids<select value={g.state.conflict} onChange={e=>run(()=>{g.state.conflict=e.target.value as typeof g.state.conflict;})}>{['quiet','balanced','dangerous'].map(w=><option key={w}>{w}</option>)}</select></label></fieldset>
 <fieldset><legend>Supply accounting</legend><p>Food received {supplies.foodReceived.toFixed(1)} · eaten {supplies.foodConsumed.toFixed(1)} · spoiled {supplies.foodSpoiled.toFixed(1)}</p><p>Cargo delivered: {Object.entries(supplies.cargoDelivered).map(([kind,n])=>`${kind} ${n.toFixed(1)}`).join(' · ')}</p><p>Measured since accounting began. Food receipt and cargo delivery can describe the same goods; do not add those totals together.</p></fieldset>
 {g.state.survivalVersion===1&&<fieldset><legend>Herd water accounting</legend><p>Communal transfer: −{herdWater.withdrawn.toFixed(2)} L fetched + {herdWater.returned.toFixed(2)} L returned = {herdWater.communalNetTransferLiters.toFixed(2)} L net stock change.</p><p>Herd: {herdWater.stored.toFixed(2)} L stored · {herdWater.carried.toFixed(2)} L carried · {herdWater.consumed.toFixed(2)} L drunk · {herdWater.lost.toFixed(2)} L lost · balance error {herdWater.balanceErrorLiters.toFixed(6)} L.</p><p>These are physical transfers, separate from resident drinking and fresh water collected. An absolute communal-water error requires a recorded opening stock and all other carried mission water; it is not inferred here.</p></fieldset>}
 <fieldset><legend>Job ownership</legend><p>{jobs.activeJobs} active tree jobs · {jobs.ownershipConflicts} ownership conflicts · {jobs.reservations.failures} reservation failures</p><p>Tree gathering uses atomic worker and workplace claims. Other job families are still being migrated.</p></fieldset>
 <fieldset><legend>Command measurements</legend><p>Eligibility: {commands.attempted} assessed · {commands.accepted} eligible · {commands.rejected} refused. Eligibility is not execution.</p>
 <p>Actual dispatch: {execution.issued} issued · {execution.completed} completed milestones · {execution.active} tracked. {execution.blockedCommandSeconds.toFixed(2)} blocked/waiting command-seconds; simultaneous commands are counted separately.</p>
 <p>Ownership requests: {execution.ownership.attempted} · {execution.ownership.succeeded} explicit handovers succeeded · {execution.ownership.denied} denied · {execution.ownership.unexpectedDisplacements} unexpected executor replacements. Reservation failures: {execution.ownership.reservationFailures}.</p>
 {Object.entries(execution.blockedByReason).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([reason,seconds])=><p key={reason}>{reason.replaceAll('_',' ')}: {seconds.toFixed(2)} simulation seconds</p>)}
 {execution.recent.slice(-5).reverse().map(o=><p key={o.id}>Resident {o.actorId} · {o.kind} · {o.status}: execution {o.executionLatencySeconds===null?'not observed':`${o.executionLatencySeconds.toFixed(3)} s after issue`} · useful work {o.firstUsefulAt===null?'not observed':`${(o.firstUsefulAt-o.issuedAt).toFixed(3)} s`} · {o.blockedCommandSeconds.toFixed(2)} s blocked{ o.completion?` · ${o.completion.replaceAll('_',' ')}`:''}</p>)}
 <p>{execution.resetPolicy} Motion, useful work and completion are distinct. Gathering completes one delivered-load milestone, not a lifetime job. New structure and paid production traces are supported; other domain commands are untraced. Latest128 traces retained.</p></fieldset>
 <fieldset><legend>Village</legend><div className="test-actions">{([['supplies','Add supplies & seeds'],['weapons','Add weapons'],['heal','Heal & rest people'],['cultivation','Unlock crops'],['finish','Complete construction'],['raid','Land a sea raid'],['transport','Try canoe & pack goat'],['ferry','Try passenger ferry']] as [TestAction,string][]).map(([action,label])=><button key={action} onClick={()=>run(()=>{testAction(g,action);if(action==='ferry'&&g.state.selBld){engine.view.look.x=g.state.selBld.x;engine.view.look.z=g.state.selBld.z;}})}>{label}</button>)}</div></fieldset>
 <fieldset><legend>Relations</legend>{g.state.tribes.filter(t=>t.id!==0&&t.id!==3&&t.alive).map(t=><div className="test-relation" key={t.id}><span>{t.name}</span><button aria-pressed={t.hostile} onClick={()=>run(()=>{t.recoveryUntil=0;g.makeHostile(t.id);})}>War</button><button aria-pressed={!t.hostile} onClick={()=>run(()=>g.agreeTruce(t.id))}>Peace</button></div>)}</fieldset>
 <button className="test-primary" disabled={lifecycle.busy} onClick={()=>void lifecycle.run(()=>engine.endTestSession(),close)}>Return to my village</button>
 </>}
 </dialog>;
}
