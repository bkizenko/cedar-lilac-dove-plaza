import {useState} from 'react';
import type {Engine} from '../game/engine';
import {migrantCandidates,migrantPrice,MIGRANT_RULES,type MigrantPayKind} from '../game/migrantTrade';
import {isRivalTeam} from '../game/factions';
import {isDependent} from '../game/settlement';
const KINDS:MigrantPayKind[]=['food','wood','stone','copper','iron','coins'];
/** Willing adults may move between societies by agreement. Consent comes from measured appeal; children and parents never move. */
export function MigrantTradePanel({engine}:{engine:Engine}){
 const g=engine.game,[direction,setDirection]=useState<'send'|'receive'>('send'),[pay,setPay]=useState<MigrantPayKind>('food'),[picked,setPicked]=useState<number[]>([]),[who,setWho]=useState(0),[note,setNote]=useState(''),[busy,setBusy]=useState(false);
 const counterparts=g.state.units.filter(u=>u.hp>0&&isRivalTeam(u.team)&&u.type==='worker'&&!isDependent(g,u)&&!g.isFoe(0,u.team)&&g.state.units.some(m=>m.team===0&&m.hp>0&&Math.hypot(m.x-u.x,m.z-u.z)<=MIGRANT_RULES.talkMeters*3)).slice(0,8);
 const cp=counterparts.find(c=>c.id===who)??counterparts[0];
 const people=cp?migrantCandidates(g,direction==='send'?0:cp.team,direction==='send'?cp.team:0,migrantPrice(pay)/1):[];
 const toggle=(id:number)=>setPicked(p=>p.includes(id)?p.filter(x=>x!==id):p.length<MIGRANT_RULES.maxPerDeal?[...p,id]:p);
 const go=async()=>{if(busy||!cp||!picked.length)return;setBusy(true);try{const r=await engine.dispatch({kind:'transfer-migrants',direction,unitIds:picked,counterpartId:cp.id,payKind:pay});setNote(r.reason);if(r.accepted)setPicked([]);engine.pushHud();}catch(e){setNote(e instanceof Error?e.message:'The agreement could not be made');}finally{setBusy(false);}};
 if(!counterparts.length)return <section aria-label="Migrants" className="space-y-1 text-xs"><h4>Migrants</h4><p className="text-parchment-dim">People can move only by agreement, face to face with an adult of a friendly society.</p></section>;
 return <section aria-label="Migrants" className="space-y-2 text-xs">
  <h4>Migrants by agreement</h4>
  <div className="flex flex-wrap items-end gap-2">
   <select aria-label="Direction" className="rounded border border-bronze/40 bg-ink p-1" value={direction} onChange={e=>{setDirection(e.target.value as 'send'|'receive');setPicked([]);}}><option value="send">Our people go to them</option><option value="receive">Their people join us</option></select>
   <select aria-label="Other society's adult" className="rounded border border-bronze/40 bg-ink p-1" value={cp?.id} onChange={e=>{setWho(Number(e.target.value));setPicked([]);}}>{counterparts.map(c=><option key={c.id} value={c.id}>{c.name||`Adult ${c.id}`} · {g.tribe(c.team).name}</option>)}</select>
   <select aria-label="Payment" className="rounded border border-bronze/40 bg-ink p-1" value={pay} onChange={e=>setPay(e.target.value as MigrantPayKind)}>{KINDS.map(k=><option key={k} value={k}>{k} ({migrantPrice(k)} each)</option>)}</select>
  </div>
  <ul className="max-h-32 space-y-1 overflow-y-auto">{people.map(p=><li key={p.id}><label className="flex items-center gap-2"><input type="checkbox" checked={picked.includes(p.id)} disabled={!!p.issue||busy} onChange={()=>toggle(p.id)}/><span>{p.name}</span><span className="text-parchment-dim">{p.issue||`willing (${Math.round(p.consent*100)}%)`}</span></label></li>)}</ul>
  <button type="button" className="min-h-11 rounded border border-bronze/40 px-2 py-1 disabled:opacity-50" disabled={busy||!picked.length} onClick={()=>void go()}>Agree the move</button>
  {note&&<p role="status" className="text-parchment-dim">{note}</p>}
 </section>;
}
