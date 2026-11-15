import {useState} from 'react';
import type {Engine} from '../game/engine';
import {expeditionCandidates,destinationFrom,SEND_EXPEDITION_RULES} from '../game/expeditionOrder';
const BEARINGS=[['North',0],['North-east',45],['East',90],['South-east',135],['South',180],['South-west',225],['West',270],['North-west',315]] as const;
/** Choose a party, a bearing and a distance; the engine packs real provisions per person and refuses anyone unable to go. */
export function ExpeditionPanel({engine}:{engine:Engine}){
 const g=engine.game,[picked,setPicked]=useState<number[]>([]),[bearing,setBearing]=useState(0),[meters,setMeters]=useState(120),[note,setNote]=useState(''),[busy,setBusy]=useState(false);
 const people=expeditionCandidates(g),dest=destinationFrom(g,bearing,meters),ready=picked.filter(id=>people.some(p=>p.id===id&&!p.issue));
 const toggle=(id:number)=>setPicked(p=>p.includes(id)?p.filter(x=>x!==id):p.length<SEND_EXPEDITION_RULES.maximumParty?[...p,id]:p);
 const send=async()=>{if(busy||!ready.length)return;setBusy(true);try{const r=await engine.dispatch({kind:'send-expedition',unitIds:ready,x:dest.x,z:dest.z});setNote(r.reason);if(r.accepted)setPicked([]);engine.pushHud();}catch(e){setNote(e instanceof Error?e.message:'The expedition could not be sent');}finally{setBusy(false);}};
 return <section aria-label="Send expedition" className="space-y-2 text-xs">
  <h4>Send an expedition</h4>
  <p>Pick up to {SEND_EXPEDITION_RULES.maximumParty} adults, a direction and a distance from camp. Each person packs provisions from the stores and turns back when they run low.</p>
  <ul className="max-h-40 space-y-1 overflow-y-auto">{people.map(p=><li key={p.id}><label className="flex items-center gap-2"><input type="checkbox" checked={picked.includes(p.id)} disabled={!!p.issue||busy} onChange={()=>toggle(p.id)}/><span>{p.name}</span><span className="text-parchment-dim">{p.issue||`carries up to ${p.provisionUnits} food units`}</span></label></li>)}</ul>
  <div className="flex flex-wrap items-end gap-2">
   <label className="flex flex-col gap-1">Direction<select aria-label="Expedition direction" className="rounded border border-bronze/40 bg-ink p-1" value={bearing} onChange={e=>setBearing(Number(e.target.value))}>{BEARINGS.map(([n,d])=><option key={d} value={d}>{n}</option>)}</select></label>
   <label className="flex flex-col gap-1">Distance (m)<input aria-label="Expedition distance" className="w-20 rounded border border-bronze/40 bg-ink p-1" type="number" min={SEND_EXPEDITION_RULES.minimumMeters} max={SEND_EXPEDITION_RULES.maximumMeters} step={10} value={meters} onChange={e=>setMeters(Number(e.target.value)||SEND_EXPEDITION_RULES.minimumMeters)}/></label>
   <button type="button" className="min-h-9 rounded border border-bronze/40 px-2 py-1 disabled:opacity-50" disabled={busy||!ready.length} onClick={()=>void send()}>Send {ready.length||''} {ready.length===1?'person':'people'}</button>
  </div>
  {note&&<p role="status" className="text-parchment-dim">{note}</p>}
 </section>;
}
