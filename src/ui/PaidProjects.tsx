import {useState} from 'react';
import type {Engine} from '../game/engine';
import {HAULAGE,resumeHaulageProject} from '../game/haulage';
/** Suspended work belongs to a paid project, so it stays visible after its maker
 * changes orders or dies. Resume never purchases its inputs a second time. */
export function PaidProjects({engine,workplaceId}:{engine:Engine;workplaceId:number}){
 const [feedback,setFeedback]=useState(''),g=engine.game;
 const building=g.state.buildings.find(b=>b.id===workplaceId&&b.team===0&&g.finished(b));
 if(!building)return null;
 const projects=(g.state.haulageProjects||[]).filter(p=>p.team===0&&p.work.paused&&
  (p.work.kind==='canoe'?building.type==='dock':building.type==='workshop'||p.work.kind==='sled'&&building.type==='townhall'));
 if(!projects.length)return null;
 return <div className="mt-2 space-y-2 text-xs"><p className="text-parchment-dim">Paid projects · materials already committed</p>{projects.map(p=><div key={p.id} className="rounded-md border border-bronze/40 p-2">
  <p>{p.work.vessel?'Riverboat':HAULAGE[p.work.kind].name} · {Math.min(100,Math.floor(p.work.progress/p.work.duration*100))}% complete</p>
  <p className="text-parchment-dim">{p.blockedReason||'Waiting for an available maker'}</p>
  <button type="button" className="mt-1 min-h-11 rounded-md border border-bronze/40 px-3 py-2 disabled:opacity-50" disabled={!!g.state.ended} onClick={()=>{
   const accepted=resumeHaulageProject(g,p.id,undefined,building.id),reason=accepted?'Paid work resumed — inputs preserved':p.blockedReason||'Need an available adult and a reachable crafting bench';
   setFeedback(reason);g.banner(reason,4);engine.pushHud();
  }}>Resume</button>
 </div>)}{feedback&&<p role="status">{feedback}</p>}</div>;
}
