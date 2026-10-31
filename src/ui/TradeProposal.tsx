import {sendTradeEscort,tradeJourney} from '../game/caravans';
import {useState} from 'react';
import type {Engine} from '../game/engine';import type {ResKind} from '../game/types';
import {reportedQuote,proposeShipment,tradeCarrier,sendOffer,sendProcurement} from '../game/barter';
import {CaravanPlanner} from './CaravanPlanner';
const names:Record<ResKind,string>={food:'Food',wood:'Timber',stone:'Stone',copper:'Copper',iron:'Iron'};
export function TradeProposal({engine,team}:{engine:Engine;team:number}){
 const [give,setGive]=useState<ResKind>('food'),[get,setGet]=useState<ResKind>('wood'),[amount,setAmount]=useState(20),[requested,setRequested]=useState(8);
 const g=engine.game,quote=reportedQuote(g,team,give,get,amount),carrier=tradeCarrier(g);
 const goods=(Object.keys(names) as ResKind[]).filter(k=>!['copper','iron'].includes(k)||g.tribe(0).age>=(k==='iron'?2:1));
 const run=(fn:()=>unknown)=>{fn();engine.pushHud();};
 const unavailable=!carrier||give===get||g.tribe(0)[give]<amount||amount<1||requested<1;
 const travelers=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.tradeTeam===team&&tradeJourney(u));
 return <details className="trade-proposal"><summary>Trade & caravans</summary>
 <button onClick={()=>run(()=>g.sendDelegation(team,'trade'))}>Send trader for a report</button>
 <div className="trade-terms">
 <label>Offer<select value={give} onChange={e=>setGive(e.target.value as ResKind)}>{goods.map(k=><option key={k} value={k}>{names[k]}</option>)}</select></label>
 <label>Amount<input type="number" min={1} max={100} step={1} value={amount} onChange={e=>setAmount(Number(e.target.value))}/></label>
 <label>Receive<select value={get} onChange={e=>setGet(e.target.value as ResKind)}>{goods.map(k=><option key={k} value={k}>{names[k]}</option>)}</select></label>
 <label>Minimum<input type="number" min={1} max={200} value={requested} onChange={e=>setRequested(Number(e.target.value))}/></label>
 </div>
 <p>{Math.floor(g.tribe(0)[give])} {names[give].toLowerCase()} in your stores</p>
 <button disabled={unavailable} onClick={()=>run(()=>sendProcurement(g,team,give,get,amount,requested))}>Negotiate shipment</button>
 <p>The trader carries the offer. Below your minimum, the budget comes home.</p>
 <CaravanPlanner engine={engine} team={team} give={give} get={get} budget={amount} minimum={requested}/>
 <details><summary>Reported offers & other options</summary>
 <p aria-live="polite">{quote.deal?`Last report: ${quote.deal.getAmt} ${names[get].toLowerCase()} for ${quote.deal.giveAmt} ${names[give].toLowerCase()}.`:quote.reason}</p>
 <button disabled={!quote.deal||!carrier} onClick={()=>run(()=>proposeShipment(g,team,give,get,amount))}>Reserve reported offer</button>
 <button disabled={unavailable} onClick={()=>run(()=>sendOffer(g,team,give,get,amount,requested))}>Allow smaller counteroffers</button>
 </details>
 {!!travelers.length&&<details><summary>On the road · {travelers.length}</summary>{travelers.map(u=><div key={u.id}><p>{u.name||'Trader'} · {g.state.units.filter(p=>p.hp>0&&p.escortId===u.id).length} guards{u.tradeReservation?` · ${u.tradeReservation.amount} ${names[u.tradeReservation.kind]} reserved`:''}</p><button onClick={()=>run(()=>sendTradeEscort(g,u.id))}>Add armed escort</button></div>)}</details>}
 {!carrier&&<p>Need an available adult with empty hands.</p>}
 </details>;
}
