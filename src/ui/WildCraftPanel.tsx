import {useState} from 'react';
import {useLifecycleAction} from './useLifecycleAction';
import type {Engine} from '../game/engine';
import {useOwnerReadModels} from './useOwnerReadModels';
import type {WildCraftRow,WildCraftSection} from '../game/wildCraftView';
const Q={kind:'wild-craft'} as const;
const HEAD:Record<WildCraftSection,string>={working:'Who is working',afield:'Out in the wild',stores:'Hides, fat and what is rotting'};
/** Owner feedback and controls for the same paid projects. Hidden on saves without wild-craft. */
export function WildCraftSheet({rows,onControl,busy=false}:{rows:WildCraftRow[];busy?:boolean;onControl?:(projectId:number,paused:boolean)=>void}){
 const sections=(['working','afield','stores'] as WildCraftSection[]).map(s=>({s,items:rows.filter(r=>r.section===s)})).filter(x=>x.items.length);
 if(!sections.length)return <p className="text-xs text-parchment-dim">Nothing is being hunted, tanned or stored right now.</p>;
 return <div className="space-y-3 text-xs">{sections.map(({s,items})=><section key={s} aria-label={HEAD[s]}>
  <h4 className="mb-1 font-semibold">{HEAD[s]}</h4>
  <ul className="space-y-1">{items.map((r,i)=><li key={s+i} className={`flex items-center gap-2 rounded border px-2 py-1 ${r.urgent?'border-blood/60':'border-bronze/30'}`}>
   <span aria-hidden="true" className="text-base">{r.icon}</span>
   <span className="flex-1">{r.who?`${r.who} · `:''}{r.why?`${r.why} · `:''}{r.text}</span>
   {r.projectId!==undefined&&onControl&&<button type="button" disabled={busy} onClick={()=>onControl(r.projectId!,!r.paused)}>{r.paused?'Resume paid work':'Pause work'}</button>}
   {r.urgent&&<span className="text-blood" role="img" aria-label="Needs attention">!</span>}
  </li>)}</ul></section>)}</div>;
}
export function WildCraftPanel({engine}:{engine:Engine}){
 const action=useLifecycleAction(engine),[feedback,setFeedback]=useState(''),epoch=engine.dispatchEpoch;
 const read=useOwnerReadModels(engine,[Q]),m=read(Q).model?.wild;
 if(!m?.enabled)return null;
 return <section aria-label="Wild craft" className="space-y-2"><h3>Hunting and hides</h3><WildCraftSheet rows={m.rows} busy={action.busy} onControl={(projectId,paused)=>{if(engine.disposed||engine.dispatchEpoch!==epoch)return;void action.run(()=>engine.dispatch({kind:'wild-work-control',projectId,paused}),r=>{if(r.epoch===epoch&&engine.dispatchEpoch===epoch)setFeedback(r.reason);});}}/>{(feedback||action.error)&&<p role="status" className="text-xs">{action.error||feedback}</p>}</section>;
}
