import {useState} from 'react';
import type {Engine} from '../game/engine';
import {peoplePrice,PEOPLE_TRADE_RULES} from '../game/captiveDealings';
import {personName} from '../game/people';
/** Offer a held captive to the trader in front of you; the engine checks custody, distance, peace and the trader's real load. */
export function CaptiveSaleActions({engine,buyerId}:{engine:Engine;buyerId:number}){
 const g=engine.game,[note,setNote]=useState(''),[busy,setBusy]=useState(false),buyer=g.state.units.find(u=>u.id===buyerId&&u.hp>0);
 if(!buyer||buyer.team===0)return null;
 const held=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.prisoner&&u.prisoner.phase==='custody'&&Math.hypot(u.x-buyer.x,u.z-buyer.z)<=PEOPLE_TRADE_RULES.talkMeters);
 if(!held.length&&!note)return null;
 const ask=buyer.carryType?peoplePrice(buyer.carryType):0;
 const sell=async(id:number)=>{if(busy)return;setBusy(true);try{const r=await engine.dispatch({kind:'sell-captive',prisonerId:id,buyerId});setNote(r.reason);engine.pushHud();}catch(e){setNote(e instanceof Error?e.message:'The sale could not be made');}finally{setBusy(false);}};
 return <div className="space-y-1 text-xs" aria-label="Trade in people">
  {held.map(u=><button key={u.id} type="button" className="w-full rounded border border-bronze/40 px-3 py-2 text-left disabled:opacity-50" disabled={busy} title="Their home society will resent this" onClick={()=>void sell(u.id)}>Hand over captive {personName(u)}{ask?` for ${ask} ${buyer.carryType}`:''}</button>)}
  {note&&<p role="status" className="text-parchment-dim">{note}</p>}
 </div>;
}
