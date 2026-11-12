import {useState} from 'react';
import {Flag,Users,Crown,Sparkles,UserPlus,UserMinus,ChevronsUp,Replace,Anchor,Swords,Wheat,Hand,ChevronLeft,ChevronRight,Compass} from 'lucide-react';
import type {Engine} from '@/game/engine';
import type {EngineDispatchCommand} from '@/game/engineDispatch';
import {vesselOf,stowCapacity} from '@/game/navalPorts';
import {useOwnerReadModels} from '../useOwnerReadModels';
import {useLifecycleAction} from '../useLifecycleAction';
import {cx,IconBtn,Stat} from './kit';

/** Hearth command panels. They only read the existing owner read models and send the existing typed commands
 * (commander-order, naval-order, boat-stop); every rule and refusal still comes from the engine, never from here. */

/** One-line result of the last command: the engine's own words, shown until the selection changes. */
function Feedback({text}:{text:string}){return text?<p className="hw-feedback" role="status">{text}</p>:null;}

/** Field or fleet commander for the current selection: rank, people or hulls, experience, aura, and one row of icon commands. */
export function CommanderStrip({engine}:{engine:Engine}){
 const g=engine.game,people=g.selectedUnits().filter(u=>u.team===0&&u.hp>0).slice(0,32),boat=g.state.boats?.find(b=>b.id===g.selectedBoat&&b.team===0&&b.hp>0);
 const unitIds=people.map(u=>u.id);if(!unitIds.length&&boat?.captain)unitIds.push(boat.captain);
 const boatIds=[...new Set([...people.flatMap(u=>u.boat?[u.boat.id]:[]),...(boat?[boat.id]:[])])].slice(0,32);
 const query={kind:'commander-controls' as const,unitIds,boatIds},read=useOwnerReadModels(engine,[query])(query),action=useLifecycleAction(engine);
 const [pick,setPick]=useState(0),[promote,setPromote]=useState(false),[note,setNote]=useState('');
 const model=read.model;
 if(!model)return null;
 const cand=model.candidate,rows=model.commanders;
 if(!rows.length&&!cand)return null;
 const c=rows[Math.min(pick,Math.max(0,rows.length-1))],epoch=engine.dispatchEpoch;
 const run=(command:EngineDispatchCommand)=>{if(engine.disposed||engine.dispatchEpoch!==epoch)return;void action.run(()=>engine.dispatch(command,{selectedUnitIds:unitIds,selectedBoatId:boat?.id}),reply=>{if(reply.epoch!==epoch||engine.dispatchEpoch!==epoch)return;setNote(reply.reason);setPromote(false);engine.pushHud();});};
 const busy=action.busy,wood=model.standardWood;
 return <div className="hw-cmd" role="group" aria-label="Command">
  {c&&<><div className="hw-row hw-cmd-head">
   <span className="hw-medal hw-medal-s" title={c.kind==='army'?'Field commander':'Fleet commander'}>{c.kind==='army'?<Flag size={26}/>:<Anchor size={26}/>}<i className="hw-rank">{c.level}</i></span>
   <div className="hw-cmd-main"><b>{c.name}</b>
    <span className="hw-bar-xp" role="progressbar" aria-label="Experience" aria-valuenow={c.xp} aria-valuemin={0} aria-valuemax={c.nextLevelXp??c.xp}><i style={{width:`${c.nextLevelXp?Math.min(100,100*c.xp/c.nextLevelXp):100}%`}}/></span></div>
   {c.status!=='serving'&&<span className="hw-chip t-bad">{c.status}</span>}</div>
   <div className="hw-sel-meta">
   <Stat icon={<Users size={22}/>} value={`${c.members}/${c.capacity}`} label={c.kind==='army'?'People under this command':'Hulls under this command'} className="hw-chip"/>
   <Stat icon={<Crown size={22}/>} value={`${model.usedSlots}/${model.slots}`} label="Command slots in use" className="hw-chip"/>
   {!!(c.traits.length+c.promotions.length)&&<Stat icon={<Sparkles size={22}/>} value={c.traits.length+c.promotions.length} label={[...c.traits,...c.promotions].map(t=>t.name).join(' · ')} className="hw-chip"/>}
   <Stat icon={<Compass size={22}/>} value={c.inRadius} label={`${c.inRadius} of ${c.members} within the ${c.radiusMeters} m aura`} tone={c.inRadius<c.members?'warn':undefined} className="hw-chip"/>
   </div></>}
  <div className="hw-row">
   {rows.length>1&&<><IconBtn small label="Previous command" onClick={()=>{setPick(i=>(i+rows.length-1)%rows.length);setPromote(false);}}><ChevronLeft size={24}/></IconBtn><IconBtn small label="Next command" onClick={()=>{setPick(i=>(i+1)%rows.length);setPromote(false);}}><ChevronRight size={24}/></IconBtn></>}
   {cand&&<IconBtn label={model.enabled?'Appoint field commander':'Organize field command'} tip={cand.armyIssue||`${wood} timber for the standard`} disabled={busy||!!cand.armyIssue} badge={wood} onClick={()=>run({kind:'commander-order',action:'appoint',unitId:cand.id,commandKind:'army'})}><Flag size={26}/></IconBtn>}
   {cand&&<IconBtn label="Appoint fleet commander" tip={cand.fleetIssue||`${wood} timber for the standard`} disabled={busy||!!cand.fleetIssue} badge={wood} onClick={()=>run({kind:'commander-order',action:'appoint',unitId:cand.id,commandKind:'fleet'})}><Anchor size={26}/></IconBtn>}
   {c&&<IconBtn label="Assign selected" tip={c.assignIssue||`${c.assignIds.length} to this command`} disabled={busy||!!c.assignIssue} badge={c.assignIds.length} onClick={()=>run({kind:'commander-order',action:'assign',commanderId:c.id,ids:c.assignIds})}><UserPlus size={26}/></IconBtn>}
   {c&&<IconBtn label="Release selected" disabled={busy||!c.releaseIds.length} badge={c.releaseIds.length} onClick={()=>run({kind:'commander-order',action:'release',commanderId:c.id,ids:c.releaseIds})}><UserMinus size={26}/></IconBtn>}
   {c&&(c.status==='captured'||c.status==='fallen')&&cand&&<IconBtn label={`Replace with ${cand.name}`} tip={c.replacementIssue||`${wood} timber for a new standard`} disabled={busy||!!c.replacementIssue} onClick={()=>run({kind:'commander-order',action:'replace',unitId:cand.id,commandKind:c.kind,replacesId:c.id})}><Replace size={26}/></IconBtn>}
   {c&&c.promotionPoints>0&&<IconBtn label="Promote" tip="Spend an earned promotion" active={promote} badge={c.promotionPoints} disabled={busy} onClick={()=>setPromote(v=>!v)}><ChevronsUp size={26}/></IconBtn>}
  </div>
  {c&&promote&&<div className="hw-row" role="group" aria-label="Promotions">{c.promotionChoices.map(p=><button key={p.id} type="button" className="hw-btn-wide" disabled={busy||!!p.issue} title={p.issue||p.name} onClick={()=>run({kind:'commander-order',action:'promote',commanderId:c.id,promotionId:p.id})}><Sparkles size={22}/>{p.name}</button>)}</div>}
  <Feedback text={action.error||note}/>
 </div>;
}

/** Selected own hull: stores, crew and the three owner orders a boat can take on its own (board, resupply, stop). Port work and
 * commissioning stay on the dock card; they need a builder pick and are not duplicated here. */
export function BoatStrip({engine}:{engine:Engine}){
 const g=engine.game,boat=g.state.boats?.find(b=>b.id===g.selectedBoat&&b.team===0&&b.hp>0),action=useLifecycleAction(engine),[note,setNote]=useState('');
 if(!boat)return null;
 const vessel=vesselOf(g,boat.id),cap=stowCapacity(g,boat.id),epoch=engine.dispatchEpoch,busy=action.busy;
 const run=(command:EngineDispatchCommand)=>{if(engine.disposed||engine.dispatchEpoch!==epoch)return;void action.run(()=>engine.dispatch(command,{selectedUnitIds:[],selectedBoatId:boat.id}),reply=>{if(reply.epoch!==epoch||engine.dispatchEpoch!==epoch)return;setNote(reply.reason);engine.pushHud();});};
 return <div className="hw-cmd" role="group" aria-label="Hull orders">
  <div className="hw-row">
   <Stat icon={<Users size={22}/>} value={`${g.state.units.filter(u=>u.boat?.id===boat.id&&u.boat.phase==='aboard').length}/${boat.capacity}`} label="Crew aboard"/>
   {vessel&&<Stat icon={<Wheat size={22}/>} value={`${Math.round(vessel.stores.food)}/${cap?.food??0}`} label="Food stowed" tone={vessel.stores.food<(cap?.food??0)*.2?'bad':undefined}/>}
   {vessel&&<Stat icon={<Swords size={22}/>} value={`${vessel.rams}`} label="Rams made"/>}
  </div>
  <div className="hw-row">
   {vessel&&<IconBtn label="Resupply" tip="Load food and missiles while moored at your finished dock" disabled={busy} onClick={()=>run({kind:'naval-order',action:'resupply',boatId:boat.id})}><Wheat size={26}/></IconBtn>}
   {vessel&&<IconBtn label="Board nearest" tip="Close on the nearest rival hull and board" disabled={busy} onClick={()=>run({kind:'naval-order',action:'board',boatId:boat.id})}><Swords size={26}/></IconBtn>}
   <IconBtn label="Stop" tip="Halt exploring and hold" disabled={busy} onClick={()=>run({kind:'boat-stop',boatId:boat.id})}><Hand size={26}/></IconBtn>
  </div>
  <Feedback text={action.error||note}/>
 </div>;
}
