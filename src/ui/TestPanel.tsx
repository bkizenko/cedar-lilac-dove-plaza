import {workAllocationDiagnostics} from '../game/workAllocation';
import {WorldSetup} from './WorldSetup';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {Engine} from '../game/engine';
import {testAction,type TestAction} from '../game/testing';
import {terrainMetrics} from '../game/terrainMetrics';
import {commandDiagnostics} from '../game/commandGateway';
import {AGES} from '../game/constants';
export function TestPanel({engine,close}:{engine:Engine;close:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),[,refresh]=useState(0);
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close();},[]);
 const g=engine.game;
 const terrain=useMemo(()=>terrainMetrics(g.world),[g.world]),scenery=g.world.scenery;
 const commands=commandDiagnostics(g),jobs=workAllocationDiagnostics(g);
 const run=(fn:()=>void)=>{fn();engine.pushHud();refresh(n=>n+1);};
 return <dialog ref={dialog} className="play-guide test-panel" onCancel={close}>
 <header><div><h2>Test lab</h2></div><button onClick={close} aria-label="Close testing panel">×</button></header>
 {g.testMode&&<>
 <p className="test-notice">Test copy · Your village is safe</p>
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
 <fieldset><legend>World</legend><label><input type="checkbox" checked={g.revealMap} onChange={e=>run(()=>{g.revealMap=e.target.checked;g.updateVision(0);})}/> Reveal the whole map</label>
 <label>Age<select value={g.tribe(0).age} onChange={e=>run(()=>{g.tribe(0).age=Number(e.target.value);engine.view.rebuild(g);})}>{AGES.map((a,i)=><option key={a} value={i}>{a}</option>)}</select></label>
 <label>Weather<select value={g.state.weather} onChange={e=>run(()=>{g.state.weather=e.target.value as typeof g.state.weather;g.state.weatherT=180;})}>{['clear','rain','storm','mist','golden','frost','drought','flood'].map(w=><option key={w}>{w}</option>)}</select></label>
 <label>Scheduled raids<select value={g.state.conflict} onChange={e=>run(()=>{g.state.conflict=e.target.value as typeof g.state.conflict;})}>{['quiet','balanced','dangerous'].map(w=><option key={w}>{w}</option>)}</select></label></fieldset>
 <fieldset><legend>Job ownership</legend><p>{jobs.activeJobs} active tree jobs · {jobs.ownershipConflicts} ownership conflicts · {jobs.reservations.failures} reservation failures</p><p>Tree gathering uses atomic worker and workplace claims. Other job families are still being migrated.</p></fieldset>
 <fieldset><legend>Command measurements</legend><p>{commands.attempted} assessed · {commands.accepted} accepted · {commands.rejected} blocked</p><p>Current session · latest 128 outcomes retained</p>{commands.outcomes.slice(-5).reverse().map((o,i)=><p key={i}>{o.timeSeconds.toFixed(1)} s · resident {o.actorId} · {o.kind}: {o.accepted?'accepted':o.reason}</p>)}</fieldset>
 <fieldset><legend>Village</legend><div className="test-actions">{([['supplies','Add supplies & seeds'],['weapons','Add weapons'],['heal','Heal & rest people'],['cultivation','Unlock crops'],['finish','Complete construction'],['raid','Land a sea raid'],['transport','Try canoe & pack goat'],['ferry','Try passenger ferry']] as [TestAction,string][]).map(([action,label])=><button key={action} onClick={()=>run(()=>{testAction(g,action);if(action==='ferry'&&g.state.selBld){engine.view.look.x=g.state.selBld.x;engine.view.look.z=g.state.selBld.z;}})}>{label}</button>)}</div></fieldset>
 <fieldset><legend>Relations</legend>{g.state.tribes.filter(t=>t.id!==0&&t.id!==3&&t.alive).map(t=><div className="test-relation" key={t.id}><span>{t.name}</span><button aria-pressed={t.hostile} onClick={()=>run(()=>{t.recoveryUntil=0;g.makeHostile(t.id);})}>War</button><button aria-pressed={!t.hostile} onClick={()=>run(()=>g.agreeTruce(t.id))}>Peace</button></div>)}</fieldset>
 <button className="test-primary" onClick={()=>{engine.endTestSession();close();}}>Return to my village</button>
 </>}
 </dialog>;
}
