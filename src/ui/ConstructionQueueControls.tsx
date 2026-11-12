import {pendingSitePreparation,sitePreparationStatus} from '../game/sitePreparation';
import{hasConstructionWork}from'../game/constructionTargets';
import type {Engine} from '../game/engine';
import {BUILDINGS} from '../game/constants';
import {constructionPriority} from '../game/constructionQueue';
import{useEffect,useRef,useState}from'react';
import type{EngineDispatchCommand}from'../game/engineDispatch';
import{useOwnerReadModels}from'./useOwnerReadModels';
function useConstructionCommand(engine:Engine){
 const[feedback,setFeedback]=useState(''),mounted=useRef(true),latest=useRef(0),epoch=engine.dispatchEpoch;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;latest.current++;};},[engine]);
 const send=async(command:EngineDispatchCommand)=>{
  if(engine.disposed||engine.dispatchEpoch!==epoch)return;
  const request=++latest.current,g=engine.game,selection={selectedUnitIds:g.selectedUnits().map(u=>u.id),selectedBuildingId:g.state.selBld?.id,selectedBoatId:g.selectedBoat??undefined};
  const current=()=>mounted.current&&!engine.disposed&&engine.dispatchEpoch===epoch&&latest.current===request;
  try{const result=await engine.dispatch(command,selection);if(!current()||result.epoch!==engine.dispatchEpoch)return;setFeedback(result.reason);engine.pushHud();}
  catch(error){if(current())setFeedback(error instanceof Error?error.message:'The construction request could not be completed');}
 };
 return{send,feedback};
}
const control='min-h-8 rounded-md border border-bronze/40 px-2 text-xs disabled:opacity-40';
export function ConstructionSiteControls({engine,buildingId}:{engine:Engine;buildingId:number}){
 const{send,feedback}=useConstructionCommand(engine),b=engine.game.state.buildings.find(b=>b.id===buildingId);if(!b||b.team!==0||!hasConstructionWork(b))return null;
 const prep=pendingSitePreparation(b)?sitePreparationStatus(engine.game,b):undefined;
 return <div className="space-y-2">{prep&&<div className="flex items-center gap-2 text-xs"><span>Clear site · {prep.remaining.length} left</span><button className={control} onClick={()=>send({kind:'site-preparation-pause',buildingId:b.id,paused:!b.sitePreparation?.paused})}>{b.sitePreparation?.paused?'Resume':'Pause'}</button>{prep.issue&&<span title={prep.issue}>· {prep.phase}</span>}</div>}<label className="flex items-center justify-between gap-2 text-xs">Construction priority<select aria-label="Construction priority" className={control} value={constructionPriority(b)} onChange={e=>send({kind:'construction-priority',buildingId:b.id,priority:Number(e.target.value) as 0|1|2})}><option value={2}>High</option><option value={1}>Normal</option><option value={0}>Low</option></select></label><button className={control} title="Add this site after current work for the two nearest available adults. Select builders and Shift-right-click sites to queue for specific people." onClick={()=>send({kind:'queue-construction',buildingId:b.id})}>Queue for nearest builders</button>{b.expansion&&engine.game.finished(b)&&<button className={control} onClick={()=>send({kind:'order-construction',buildingId:b.id})}>Build now</button>}<p className="text-xs text-parchment-dim">Select builders, then Shift-right-click sites to queue several. Priority and village focus choose the next ready site.</p>{feedback&&<p role="status">{feedback}</p>}</div>;
}
export function BuilderQueueControls({engine}:{engine:Engine}){
 const{send,feedback}=useConstructionCommand(engine),g=engine.game,workers=g.selectedUnits().filter(u=>u.constructionQueue?.sites.length);
 const ids=[...new Set(workers.flatMap(u=>u.constructionQueue!.sites))].filter(id=>g.state.buildings.some(b=>b.id===id&&b.plannedCost));
 const queries=Array.from({length:Math.ceil(ids.length/128)},(_,i)=>({kind:'construction-status' as const,buildingIds:ids.slice(i*128,(i+1)*128)})),read=useOwnerReadModels(engine,queries),statuses=new Map<number,string>();
 for(const query of queries){const availability=read(query);for(const id of query.buildingIds)statuses.set(id,availability.issue||'Actual plan status is unavailable');for(const row of availability.model?.statuses||[])statuses.set(row.buildingId,row.status);}
 if(!workers.length)return null;
 return <details className="mt-2 space-y-2 rounded-md border border-bronze/30 p-2" open><summary className="text-xs">Builder queues · {workers.length}</summary>{workers.map(u=><div key={u.id} className="space-y-1 text-xs"><div className="flex items-center justify-between gap-2"><span>{u.name||`Builder ${u.id}`} · {u.constructionQueue!.paused?'paused':'active'}</span><button className={control} onClick={()=>send({kind:'construction-queue-control',unitId:u.id,action:u.constructionQueue?.paused?'resume':'pause'})}>{u.constructionQueue!.paused?'Resume queue':'Pause queue'}</button></div><ol>{u.constructionQueue!.sites.map((id,index)=>{const b=engine.game.state.buildings.find(b=>b.id===id);return <li key={id} className="flex items-center justify-between gap-2 py-1"><span>{index+1}. {b?BUILDINGS[b.type].name:'Site removed'}{u.buildOrder===id?' · current':b?.planPaused?' · paused':b?.plannedCost?` · ${statuses.get(b.id)||'Checking actual plan status'}`:' · queued'}</span><span className="flex gap-1">{(['up','down','remove'] as const).map(action=><button key={action} className={control} aria-label={`${action} ${b?BUILDINGS[b.type].name:'site'}`} disabled={action==='up'&&index===0||action==='down'&&index===u.constructionQueue!.sites.length-1} onClick={()=>send({kind:'construction-queue-control',unitId:u.id,siteId:id,action})}>{action==='up'?'↑':action==='down'?'↓':'Remove'}</button>)}</span></li>;})}</ol></div>)}{feedback&&<p role="status">{feedback}</p>}</details>;
}
