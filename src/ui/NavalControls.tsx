import {useState} from 'react';
import type {Engine} from '../game/engine';
import type {EngineDispatchCommand} from '../game/engineDispatch';
import type {NavalOwnerControlsModel} from '../game/navalOwnerControls';
import type {PortWork} from '../game/navalClasses';
import {GameDisclosure} from './GameDisclosure';
import {GameTooltip} from './GameTooltip';
import {useOwnerReadModels} from './useOwnerReadModels';
type Choice={dockId?:number;boatId?:number;builderId?:number;workId:PortWork;designId:string};
type ViewProps={model:NavalOwnerControlsModel;choice:Choice;choose:(choice:Partial<Choice>)=>void;run:(command:EngineDispatchCommand)=>Promise<void>;selectHull?:(id:number)=>void;busy?:boolean;feedback?:string};
const button='rounded border border-bronze/40 px-2 py-1 text-xs disabled:opacity-50',select='min-w-0 rounded border border-parchment/20 bg-black/20 px-2 py-1 text-xs';
/** Pure rendering of owner facts; all actions go through existing typed commands. */
export function NavalControlsView({model:m,choice,choose,run,selectHull,busy=false,feedback=''}:ViewProps){
 const work=m.works.find(w=>w.id===choice.workId)??m.works[0],design=m.designs.find(d=>d.id===choice.designId)??m.designs[0];
 const workIssue=m.issue||work?.issue,designIssue=m.issue||design?.issue;
 return <section className="space-y-2 text-xs" aria-label="Port and fleet controls">
  {!!m.ports.length&&<label className="flex items-center gap-2">Harbour<select className={select} value={m.dock?.id??0} onChange={e=>choose({dockId:Number(e.target.value)||undefined})}>{m.ports.map(p=><option key={p.id} value={p.id}>{p.name} · {p.tier}</option>)}</select></label>}
  {m.dock&&<p>{m.dock.moored}/{m.dock.moorage} moored{m.dock.blockaded?' · Harbour blockaded':''}</p>}
  <label className="flex items-center gap-2">Builder<select className={select} value={m.builder?.id??0} onChange={e=>choose({builderId:Number(e.target.value)||undefined})}>{!m.builder&&<option value={0}>No available adult</option>}{m.builders.map(u=><option key={u.id} value={u.id}>{u.name}</option>)}</select></label>
  {m.issue&&<p className="text-parchment/60">{m.issue}</p>}
  {m.dock&&<><label className="flex items-center gap-2">Port work<select className={select} value={work?.id} onChange={e=>choose({workId:e.target.value as PortWork})}>{m.works.map(w=><option key={w.id} value={w.id}>{w.name}{m.dock!.works.includes(w.id)?' · built':''}</option>)}</select></label>
   {work&&<div><button type="button" className={button} disabled={busy||!!workIssue} title={workIssue||'Pays once. The builder travels to this dock and works there.'} onClick={()=>m.builder&&m.dock?run({kind:'naval-order',action:'port-work',dockId:m.dock.id,work:work.id,builderId:m.builder.id}):Promise.resolve()}>Build {work.name.toLowerCase()}</button><span className="ml-2 text-parchment/60">{work.wood} logs · {work.stone} stone{work.cordage?` · ${work.cordage} cordage`:''} · {work.seconds}s work</span>{workIssue&&<p>{workIssue}</p>}</div>}
   <label className="flex items-center gap-2">Fleet hull<select className={select} value={design?.id} onChange={e=>choose({designId:e.target.value})}>{m.designs.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
   {design&&<div><button type="button" className={button} disabled={busy||!!designIssue} title={designIssue||'Pays the actual hull inputs once; its shipwright must reach this dock.'} onClick={()=>m.builder&&m.dock?run({kind:'naval-order',action:'commission',dockId:m.dock.id,design:design.id,builderId:m.builder.id}):Promise.resolve()}>Commission {design.name.toLowerCase()}</button><span className="ml-2 text-parchment/60">{design.wood} logs · {design.stone} stone · {design.cordage} cordage{design.copper?` · ${design.copper} copper`:''} · {design.seconds}s work</span>{designIssue&&<p>{designIssue}</p>}</div>}
  </>}
  {!!m.projects.length&&<div aria-label="Paid naval work" className="space-y-1">{m.projects.map(p=><div key={p.id} data-project-id={p.id}><span>{p.name} · {p.phase==='paused'?'Paused':'In progress'} · {p.progress.toFixed(1)}/{p.seconds}s</span>{p.phase==='paused'&&<><button type="button" className={`${button} ml-2`} disabled={busy||!!p.issue||!m.builder} title={p.issue||'The same paid materials and progress continue; no second payment.'} onClick={()=>m.builder?run({kind:'naval-order',action:p.resumeAction,projectId:p.id,builderId:m.builder.id}):Promise.resolve()}>Resume paid work</button>{p.issue&&<p>{p.issue}</p>}</>}</div>)}<GameTooltip title="Paid work stays with its project" description="Moving the builder elsewhere pauses the work. Choose an available replacement and Resume; materials are not charged again."><span className="text-parchment/50">About paused work</span></GameTooltip></div>}
  {!!m.boats.length&&<><label className="flex items-center gap-2">Owned hull<select className={select} value={m.boat?.id??0} onChange={e=>choose({boatId:Number(e.target.value)||undefined})}>{m.boats.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
   {m.boat&&<div aria-label="Owned fleet hull"><p>{m.boat.crew} aboard · Hull {m.boat.hp.toFixed(0)}{m.boat.commissioned?` · ${m.boat.food.toFixed(1)} rations · ${m.boat.missiles} missiles`:''}{m.boat.starved?' · Rations exhausted':''}</p>
    {selectHull&&<button type="button" className={button} onClick={()=>selectHull(m.boat!.id)}>Select this hull</button>}
    {m.boat.commissioned&&<><button type="button" className={`${button} ml-2`} disabled={busy||!!m.supply.issue} title={m.supply.issue||'Load real food and timber-made missiles only at a friendly harbour.'} onClick={()=>run({kind:'naval-order',action:'resupply',boatId:m.boat!.id})}>Load supplies</button>{m.supply.issue?<p>{m.supply.issue}</p>:<p>{m.supply.food.toFixed(1)} food + {m.supply.wood} logs → {m.supply.missiles} missiles loaded</p>}</>}
    {!!m.targets.length&&<div className="space-y-1" aria-label="Visible boarding targets">{m.targets.map(target=><div key={target.id}><button type="button" className={button} disabled={busy||!!target.issue} title={target.issue||'Actual aboard crew must close to grapnel range and fight through the ordinary combat path.'} onClick={()=>run({kind:'naval-order',action:'board',boatId:m.boat!.id,targetBoatId:target.id})}>Board {target.name.toLowerCase()}</button>{target.issue&&<span className="ml-2">{target.issue}</span>}</div>)}</div>}
   </div>}
  </>}
  {feedback&&<p role="status">{feedback}</p>}
 </section>;
}
function NavalControlsInner({engine,dockId,boatId}:{engine:Engine;dockId?:number;boatId?:number}){
 const[choice,setChoice]=useState<Choice>({dockId,boatId,workId:'breakwater',designId:'riverPatrol'}),[feedback,setFeedback]=useState(''),[busy,setBusy]=useState(false);
 const query={kind:'naval-controls' as const,dockId:choice.dockId,boatId:choice.boatId,builderId:choice.builderId},read=useOwnerReadModels(engine,[query]),reply=read(query);
 const run=async(command:EngineDispatchCommand)=>{const epoch=engine.dispatchEpoch;setBusy(true);try{const result=await engine.dispatch(command);if(engine.dispatchEpoch===epoch&&result.epoch===epoch)setFeedback(result.reason);}catch(error){if(engine.dispatchEpoch===epoch)setFeedback(error instanceof Error?error.message:String(error));}finally{if(engine.dispatchEpoch===epoch)setBusy(false);}};
 if(!reply.model)return <p className="text-xs text-parchment/60">{reply.issue}</p>;
 return <NavalControlsView model={reply.model} choice={choice} choose={next=>setChoice(old=>({...old,...next}))} run={run} busy={busy} feedback={feedback} selectHull={id=>{engine.game.selectBoat(id);engine.pushHud();}}/>;
}
/** Closed disclosure performs no readiness/route queries. Existing BoatControls
 * provides this same contextual entry in both Hearth and Classic interfaces. */
export function NavalControls({engine,dockId,boatId}:{engine:Engine;dockId?:number;boatId?:number}){return <GameDisclosure label="Port & fleet"><NavalControlsInner key={`${engine.dispatchEpoch}:${dockId}:${boatId}`} engine={engine} dockId={dockId} boatId={boatId}/></GameDisclosure>;}
