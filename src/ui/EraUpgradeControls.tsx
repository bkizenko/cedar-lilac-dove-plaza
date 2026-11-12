import {useEffect,useRef,useState} from 'react';
import type {Engine} from '../game/engine';
import type {EngineDispatchCommand} from '../game/engineDispatch';
import type {ExtensionSide} from '../game/extensionFootprints';
import {supportsEraUpgrade} from '../game/buildingFabric';
import {useOwnerReadModels} from './useOwnerReadModels';
import {GameTooltip} from './GameTooltip';

/** Selected-building actions use owner admission; no renderer-side payment. */
export function EraUpgradeControls({engine,buildingId}:{engine:Engine;buildingId:number}){
 const [side,setSide]=useState<ExtensionSide>('north'),[busy,setBusy]=useState(false),[feedback,setFeedback]=useState('');
 const mounted=useRef(true),request=useRef(0);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;request.current++;};},[]);
 useEffect(()=>{request.current++;setBusy(false);setFeedback('');},[buildingId,engine.dispatchEpoch]);
 const b=engine.game.state.buildings.find(b=>b.id===buildingId&&b.team===0&&b.hp>0),query=b&&supportsEraUpgrade(b.type)?{kind:'building-fabric' as const,buildingId}:null;
 const read=useOwnerReadModels(engine,query?[query]:[]),facts=read(query),model=facts.model;
 if(!query)return null;
 const run=async(command:EngineDispatchCommand)=>{
  const epoch=engine.dispatchEpoch,serial=++request.current;setBusy(true);setFeedback('');
  const current=()=>mounted.current&&request.current===serial&&engine.dispatchEpoch===epoch&&!engine.disposed;
  try{const result=await engine.dispatch(command);if(!current()||result.epoch!==epoch)return;if(!result.accepted)setFeedback(result.reason);engine.pushHud();}
  catch(error){if(current())setFeedback(error instanceof Error?error.message:'Work could not start');}
  finally{if(current())setBusy(false);}
 };
 const button='min-h-9 rounded-md border border-bronze/40 px-2 text-xs disabled:opacity-40';
 if(model?.work){const work=model.work,percent=Math.max(0,Math.min(100,Math.floor(work.progress/Math.max(1,work.duration)*100)));
  return <section aria-label="Building upgrade" className="space-y-1 text-xs">
   <div className="flex items-center justify-between gap-2"><span>{work.mode==='extend'?'Extension':'Rebuild'} · {percent}%</span><button className={button} disabled={busy} onClick={()=>void run({kind:'era-upgrade-pause',buildingId,paused:!work.paused})}>{work.paused?'Resume':'Pause'}</button></div>
   <progress className="h-1 w-full" max={100} value={percent} aria-label="Building upgrade progress"/>
   {(work.blockedReason||feedback)&&<p role="status">{feedback||work.blockedReason}</p>}
  </section>;
 }
 const rebuild=model?.choices.find(c=>c.mode==='rebuild'),extension=model?.choices.find(c=>c.mode==='extend'&&c.side===side);
 const tip=(choice:typeof rebuild)=>choice?.issue||facts.issue||(choice?`${choice.quote.wood} logs · ${choice.quote.stone} stone · ${choice.workSeconds}s work. Adds repairable durability; existing damage stays.`:'Checking availability');
 return <section aria-label="Building upgrade" className="space-y-1 text-xs">
  <div className="flex flex-wrap items-center gap-2">
   <GameTooltip title="Rebuild" description={tip(rebuild)}><button className={button} disabled={busy||!rebuild||!!rebuild.issue} onClick={()=>void run({kind:'begin-era-upgrade',buildingId,mode:'rebuild'})}>Rebuild</button></GameTooltip>
   <select className="min-h-9 rounded-md border border-bronze/40 bg-transparent px-1" aria-label="Extension side" value={side} onChange={e=>setSide(e.target.value as ExtensionSide)}>{(['north','south','east','west'] as const).map(s=><option key={s} value={s}>{s[0].toUpperCase()+s.slice(1)}</option>)}</select>
   <GameTooltip title="Extend" description={tip(extension)}><button className={button} disabled={busy||!extension||!!extension.issue} onClick={()=>void run({kind:'begin-era-upgrade',buildingId,mode:'extend',side})}>Extend</button></GameTooltip>
  </div>
  {feedback&&<p role="status">{feedback}</p>}
 </section>;
}
