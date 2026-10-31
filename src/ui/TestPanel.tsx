import {WorldSetup} from './WorldSetup';
import {useEffect,useRef,useState} from 'react';
import type {Engine} from '../game/engine';
import {testAction,type TestAction} from '../game/testing';
import {AGES} from '../game/constants';
export function TestPanel({engine,close}:{engine:Engine;close:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),[,refresh]=useState(0);
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close();},[]);
 const g=engine.game,run=(fn:()=>void)=>{fn();engine.pushHud();refresh(n=>n+1);};
 return <dialog ref={dialog} className="play-guide test-panel" onCancel={close}>
 <header><div><h2>Test lab</h2></div><button onClick={close} aria-label="Close testing panel">×</button></header>
 {g.testMode&&<>
 <p className="test-notice">Test copy · Your village is safe</p>
 <WorldSetup engine={engine}/>
 <fieldset><legend>World</legend><label><input type="checkbox" checked={g.revealMap} onChange={e=>run(()=>{g.revealMap=e.target.checked;g.updateVision(0);})}/> Reveal the whole map</label>
 <label>Age<select value={g.tribe(0).age} onChange={e=>run(()=>{g.tribe(0).age=Number(e.target.value);engine.view.rebuild(g);})}>{AGES.map((a,i)=><option key={a} value={i}>{a}</option>)}</select></label>
 <label>Weather<select value={g.state.weather} onChange={e=>run(()=>{g.state.weather=e.target.value as typeof g.state.weather;g.state.weatherT=180;})}>{['clear','rain','storm','mist','golden','frost','drought','flood'].map(w=><option key={w}>{w}</option>)}</select></label>
 <label>Scheduled raids<select value={g.state.conflict} onChange={e=>run(()=>{g.state.conflict=e.target.value as typeof g.state.conflict;})}>{['quiet','balanced','dangerous'].map(w=><option key={w}>{w}</option>)}</select></label></fieldset>
 <fieldset><legend>Village</legend><div className="test-actions">{([['supplies','Add supplies & seeds'],['weapons','Add weapons'],['heal','Heal & rest people'],['cultivation','Unlock crops'],['finish','Complete construction'],['raid','Land a sea raid'],['transport','Try canoe & pack goat'],['ferry','Try passenger ferry']] as [TestAction,string][]).map(([action,label])=><button key={action} onClick={()=>run(()=>{testAction(g,action);if(action==='ferry'&&g.state.selBld){engine.view.look.x=g.state.selBld.x;engine.view.look.z=g.state.selBld.z;}})}>{label}</button>)}</div></fieldset>
 <fieldset><legend>Relations</legend>{g.state.tribes.filter(t=>t.id!==0&&t.id!==3&&t.alive).map(t=><div className="test-relation" key={t.id}><span>{t.name}</span><button aria-pressed={t.hostile} onClick={()=>run(()=>{t.recoveryUntil=0;g.makeHostile(t.id);})}>War</button><button aria-pressed={!t.hostile} onClick={()=>run(()=>g.agreeTruce(t.id))}>Peace</button></div>)}</fieldset>
 <button className="test-primary" onClick={()=>{engine.endTestSession();close();}}>Return to my village</button>
 </>}
 </dialog>;
}
