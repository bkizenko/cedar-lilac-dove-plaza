import{useState}from'react';
import type{Engine}from'../game/engine';
import type{EngineDispatchCommand}from'../game/engineDispatch';
import type{CommanderControlsModel}from'../game/commanderControls';
import{useOwnerReadModels}from'./useOwnerReadModels';
import{useLifecycleAction}from'./useLifecycleAction';
const button='min-h-9 rounded border border-bronze/40 px-2 py-1 text-xs disabled:opacity-50';
/** Compact owner information; commands always revalidate in the native engine. */
export function CommanderControlSheet({model,run,busy=false}:{model:CommanderControlsModel;run:(c:EngineDispatchCommand)=>void;busy?:boolean}){
 const[managed,setManaged]=useState<number|undefined>(),candidate=model.candidate,selected=model.commanders.find(c=>c.id===managed)||model.commanders.find(c=>c.unitId===candidate?.id)||model.commanders[0];
 return <section className="space-y-2 text-xs" aria-label="Commanders">
 <p>{model.usedSlots}/{model.slots} commands · Standards cost {model.standardWood} timber</p>
 {candidate&&<div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={busy||!!candidate.armyIssue} title={candidate.armyIssue||'Appoint this actual person; no experience or soldiers are created'} onClick={()=>run({kind:'commander-order',action:'appoint',unitId:candidate.id,commandKind:'army'})}>{model.enabled?'Appoint field commander':'Organize field command'} · {model.standardWood} timber</button><button type="button" className={button} disabled={busy||!!candidate.fleetIssue} title={candidate.fleetIssue||'Appoint the actual aboard person to fleet command'} onClick={()=>run({kind:'commander-order',action:'appoint',unitId:candidate.id,commandKind:'fleet'})}>Appoint fleet commander · {model.standardWood} timber</button></div>}
 {!!model.commanders.length&&<><label className="block">Command <select aria-label="Command to manage" className="ml-2 max-w-full rounded border border-bronze/40 bg-ink p-1" value={selected?.id} onChange={e=>setManaged(Number(e.target.value))}>{model.commanders.map(c=><option key={c.id} value={c.id}>{c.name} · {c.kind==='army'?'Field':'Fleet'} · {c.status}</option>)}</select></label>{selected&&<>
 <p>{selected.status} · Rank {selected.level} · XP {selected.xp}{selected.nextLevelXp!==null?`/${selected.nextLevelXp}`:' (maximum)'}</p>
 <p>{selected.members}/{selected.capacity} {selected.kind==='army'?'people':'hulls'} · {selected.inRadius} within {selected.radiusMeters} m</p>
 <p title="Effects apply only to assigned members physically inside this radius; combined bonuses are capped.">{selected.traits.map(t=>t.name).join(' · ')}{selected.promotions.length?` · ${selected.promotions.map(p=>p.name).join(' · ')}`:''}</p>
 <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={busy||!!selected.assignIssue} title={selected.assignIssue||'Assign only the eligible selected people or hulls'} onClick={()=>run({kind:'commander-order',action:'assign',commanderId:selected.id,ids:selected.assignIds})}>Assign selected ({selected.assignIds.length})</button><button type="button" className={button} disabled={busy||!selected.releaseIds.length} onClick={()=>run({kind:'commander-order',action:'release',commanderId:selected.id,ids:selected.releaseIds})}>Release selected ({selected.releaseIds.length})</button>
 {(selected.status==='captured'||selected.status==='fallen')&&candidate&&<button type="button" className={button} disabled={busy||!!selected.replacementIssue} title={selected.replacementIssue||'Replacement uses the selected real person and a new paid standard'} onClick={()=>run({kind:'commander-order',action:'replace',unitId:candidate.id,commandKind:selected.kind,replacesId:selected.id})}>Replace with {candidate.name} · {model.standardWood} timber</button>}</div>
 {selected.promotionPoints>0?<label className="block">{selected.promotionPoints} earned promotion{selected.promotionPoints===1?'':'s'} <select aria-label="Earned commander promotion" className="ml-2 max-w-full rounded border border-bronze/40 bg-ink p-1" value="" disabled={busy||!selected.promotionChoices.length} onChange={e=>{if(e.target.value)run({kind:'commander-order',action:'promote',commanderId:selected.id,promotionId:e.target.value});}}><option value="">Choose promotion</option>{selected.promotionChoices.map(p=><option key={p.id} value={p.id} disabled={!!p.issue}>{p.name}</option>)}</select></label>:<p className="text-parchment-dim">Experience comes from actual group combat or practice.</p>}
 </>}</>}
 </section>;
}
export function CommanderControls({engine}:{engine:Engine}){
 const g=engine.game,people=g.selectedUnits().filter(u=>u.team===0&&u.hp>0).slice(0,32),selectedBoat=g.state.boats?.find(b=>b.id===g.selectedBoat&&b.team===0&&b.hp>0),unitIds=people.map(u=>u.id);if(!unitIds.length&&selectedBoat?.captain)unitIds.push(selectedBoat.captain);
 const boatIds=[...new Set([...people.flatMap(u=>u.boat?[u.boat.id]:[]),...(selectedBoat?[selectedBoat.id]:[])])].slice(0,32),query={kind:'commander-controls' as const,unitIds,boatIds},read=useOwnerReadModels(engine,[query])(query),action=useLifecycleAction(engine),[feedback,setFeedback]=useState('');
 const run=(command:EngineDispatchCommand)=>{void action.run(()=>engine.dispatch(command,{selectedUnitIds:unitIds,selectedBoatId:selectedBoat?.id}),reply=>{setFeedback(reply.reason);engine.pushHud();});};
 return <>{read.model?<CommanderControlSheet model={read.model} run={run} busy={action.busy}/>:<p className="text-xs">{read.issue}</p>}{(feedback||action.error)&&<p role="status" className="text-xs text-parchment-dim">{action.error||feedback}</p>}</>;
}
