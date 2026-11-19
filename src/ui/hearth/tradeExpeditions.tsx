import {useState} from 'react';
import type {Engine} from '@/game/engine';
import type {ResKind} from '@/game/types';
import {knownSettlement} from '@/game/barter';
import {tradeCapacityLeft,tradeCapacityMax,tradeCapacityRefillSeconds} from '@/game/tradeFleet';
import {isRivalTeam} from '@/game/factions';
import {acceptTradeOffer,declineTradeOffer,dispatchTradeExpedition,planExpedition,marketPrices,openTradeOffers,reputationLabel,tradeOfferIssue,tradeParties,tradePartyStatus,tradeReputation} from '@/game/tradeParties';
const GOODS:ResKind[]=['food','wood','stone','copper','iron'];
/** Small Hearth entry point: dispatch a land party or ship to a known village and watch its status. */
export function TradeExpeditions({engine}:{engine:Engine}){
 const g=engine.game,[open,setOpen]=useState(false),[team,setTeam]=useState(0),[mode,setMode]=useState<'land'|'sea'>('land'),[give,setGive]=useState<ResKind>('wood'),[amount,setAmount]=useState(10),[msg,setMsg]=useState('');
 const known=g.state.tribes.filter(t=>isRivalTeam(t.id)&&t.alive&&knownSettlement(g,t.id)),mine=tradeParties(g).filter(p=>p.kind==='expedition');
 const offers=openTradeOffers(g);
 if(!known.length&&!mine.length&&!offers.length)return null;
 if(!open)return <button className="hud-panel pointer-events-auto absolute right-4 bottom-44 z-30 rounded-xl px-3 py-2 min-h-11" onClick={()=>setOpen(true)}>Expeditions{mine.length?` · ${mine.length} out`:''}{offers.length?` · ${offers.length} offer${offers.length>1?'s':''}`:''}</button>;
 const target=team||known[0]?.id||0,plan=target?planExpedition(g,target,mode,give,Math.max(1,amount)):null,issue=plan?plan.issue:'No known village',seaPlan=target?planExpedition(g,target,'sea',give,1):null,seaOk=!!seaPlan&&!!seaPlan.route;
 return <div className="hud-panel pointer-events-auto absolute right-4 bottom-44 z-30 max-w-xs rounded-xl p-3">
  {offers.map(p=>{const o=p.offer!,why=tradeOfferIssue(g,p.id);return <div key={p.id} className="text-sm border-b pb-1 mb-1">
   <p>{g.tribe(p.team).name} traders offer {o.sellAmt} {o.sell} for {o.buyAmt} {o.buy}.</p>
   <button className="m-1 min-h-11 border rounded px-2" disabled={!!why} title={why||'Your goods ride home with their party'} onClick={()=>{setMsg(acceptTradeOffer(g,p.id).reason);engine.pushHud();}}>Accept</button>
   <button className="m-1 min-h-11 border rounded px-2" onClick={()=>{declineTradeOffer(g,p.id);engine.pushHud();}}>Decline</button>
  </div>;})}
  <p>Trade expedition</p>
  <label>To <select value={target} onChange={e=>setTeam(+e.target.value)}>{known.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
  <label> By <select value={mode} onChange={e=>setMode(e.target.value as 'land'|'sea')}><option value="land">land</option>{(seaOk||mode==='sea')&&<option value="sea">ship</option>}</select></label>
  <label> Carry <input type="number" min={1} max={Math.max(1,plan?.cargoLimit||60)} value={amount} onChange={e=>setAmount(Math.max(1,+e.target.value||1))} className="w-14"/> <select value={give} onChange={e=>setGive(e.target.value as ResKind)}>{GOODS.map(k=><option key={k} value={k}>{k}</option>)}</select></label>
  <button className="m-1 min-h-11 border rounded px-2" disabled={!!issue} title={issue||'Goods leave stores now; the party returns with payment'} onClick={()=>{const r=dispatchTradeExpedition(g,target,mode,give,amount);setMsg(r.reason);engine.pushHud();}}>Send</button>
  {plan&&target>0&&<p className="text-xs">{mode==='sea'?`${plan.shipName||'Ship'} · crew ${plan.crew} · holds ${plan.cargoLimit}${plan.slots!==undefined?` · boat slots ${plan.slotsFree}/${plan.slots} free`:''}`:`Land party · crew ${plan.crew} · carries up to ${plan.cargoLimit} (pack goats and carts add more)`}</p>}
  {target>0&&<p className="text-xs">Trade capacity at {g.tribe(target).name}: {Math.floor(tradeCapacityLeft(g,target))}/{tradeCapacityMax(g,target)}{tradeCapacityLeft(g,target)<tradeCapacityMax(g,target)?` · full again in ~${Math.ceil(tradeCapacityRefillSeconds(g,target)/60)} min`:''}</p>}
  {target>0&&!seaOk&&seaPlan?.issue?.startsWith('No water')&&<p className="text-xs text-parchment-dim">No water route there: no ship can go.</p>}
  {target>0&&known.some(t=>t.id===target)&&<p className="text-xs">Prices there: {GOODS.map(k=>`${k} ${marketPrices(g,target)[k]}`).join(', ')}. {reputationLabel(tradeReputation(g,target))}.</p>}
  {issue&&<p className="text-xs text-parchment-dim">{issue}</p>}
  {msg&&<p role="status" className="text-sm">{msg}</p>}
  {mine.map(p=><p key={p.id} className="text-sm">{tradePartyStatus(g,p)}</p>)}
  <button className="min-h-11 px-2" onClick={()=>setOpen(false)}>Close</button>
 </div>;
}
