import {sendTradeEscort,tradeJourney} from '../game/caravans';
import {useState} from 'react';
import type {Engine} from '../game/engine';import type {ResKind} from '../game/types';
import {reportedQuote,proposeShipment,tradeCarrier,sendOffer,sendProcurement} from '../game/barter';
import {CaravanPlanner} from './CaravanPlanner';
const names:Record<ResKind,string>={food:'Food',wood:'Timber',stone:'Stone',copper:'Copper',iron:'Iron'};
export function TradeProposal({engine,team,expanded=false}:{engine:Engine;team:number;expanded?:boolean}){
 const [give,setGive]=useState<ResKind>('food'),[get,setGet]=useState<ResKind>('wood'),[amount,setAmount]=useState(20),[requested,setRequested]=useState(8);
 const [receipt,setReceipt]=useState('');
 const g=engine.game,quote=reportedQuote(g,team,give,get,amount),carrier=tradeCarrier(g);
 const goods=(Object.keys(names) as ResKind[]).filter(k=>!['copper','iron'].includes(k)||g.tribe(0).age>=(k==='iron'?2:1));
 const run=(fn:()=>unknown,success='Order sent; goods exchange only at arrival.')=>{const result=fn();setReceipt(result===false?'Not sent. Check the available carrier, supplies and route.':success);engine.pushHud();};
 const whyNot=!carrier?'No carrier is free to take the shipment':give===get?'Choose two different goods':g.tribe(0)[give]<amount?'You do not hold that much to give':(amount<1||amount>100||!Number.isSafeInteger(amount))?'Offer between 1 and 100':(requested<1||requested>200||!Number.isSafeInteger(requested))?'Ask for between 1 and 200':undefined;
 const unavailable=!carrier||give===get||g.tribe(0)[give]<amount||amount<1||amount>100||requested<1||requested>200||!Number.isSafeInteger(amount)||!Number.isSafeInteger(requested);
 const travelers=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.tradeTeam===team&&tradeJourney(u));
 const content=<>
 <button onClick={()=>run(()=>g.sendDelegation(team,'trade'),'Trader dispatched to request a report; no purchase made.')}>Send trader for a report</button>
 <div className="trade-terms">
 <label>Offer<select aria-label="Offer" value={give} onChange={e=>setGive(e.target.value as ResKind)}>{goods.map(k=><option key={k} value={k}>{names[k]}</option>)}</select></label>
 <label>Amount<input aria-label="Amount" type="number" min={1} max={100} step={1} value={amount} onChange={e=>setAmount(Number(e.target.value))}/></label>
 <label>Receive<select aria-label="Receive" value={get} onChange={e=>setGet(e.target.value as ResKind)}>{goods.map(k=><option key={k} value={k}>{names[k]}</option>)}</select></label>
 <label>Minimum<input aria-label="Minimum" type="number" min={1} max={200} value={requested} onChange={e=>setRequested(Number(e.target.value))}/></label>
 </div>
 <div className="trade-summary" role="status" aria-label="Exchange summary"><span><b>{amount}</b> {names[give].toLowerCase()}</span><span aria-hidden="true" className="trade-arrow">→</span><span>at least <b>{requested}</b> {names[get].toLowerCase()}</span></div>
 <p className={'trade-stock'+(g.tribe(0)[give]<amount?' trade-short':'')}>{Math.floor(g.tribe(0)[give])} {names[give].toLowerCase()} in your stores{g.tribe(0)[give]<amount?' — not enough for this offer':''}</p>
 <button className="trade-primary" disabled={unavailable} title={whyNot} onClick={()=>run(()=>sendProcurement(g,team,give,get,amount,requested))}>Negotiate shipment</button>
 <p className="text-xs text-parchment-dim">Goods return with your trader. Below your minimum, the budget comes back.</p>
 {!!receipt&&<p role="status">{receipt}</p>}
 <CaravanPlanner engine={engine} team={team} give={give} get={get} budget={amount} minimum={requested}/>
 <details><summary>Reported offers & other options</summary>
 <p aria-live="polite">{quote.deal?`Last report: ${quote.deal.getAmt} ${names[get].toLowerCase()} for ${quote.deal.giveAmt} ${names[give].toLowerCase()}.`:quote.reason}</p>
 <button disabled={!quote.deal||!carrier} title={!carrier?'No carrier is free to take the shipment':!quote.deal?'No deal is possible at these amounts':undefined} onClick={()=>run(()=>proposeShipment(g,team,give,get,amount))}>Send reported proposal</button>
 <button disabled={unavailable} title={whyNot} onClick={()=>run(()=>sendOffer(g,team,give,get,amount,requested))}>Allow smaller counteroffers</button>
 </details>
 {!!travelers.length&&<details><summary>On the road · {travelers.length}</summary>{travelers.map(u=><div key={u.id}><p>{u.name||'Trader'} · {u.tradeLoading?'Loading offer':u.visit?.phase==='return'||u.order==='return'?'Returning':u.visit?.phase==='waiting'?'Negotiating':'Travelling'} · {g.state.units.filter(p=>p.hp>0&&p.escortId===u.id).length} guards{u.tradeReservation?` · ${u.tradeReservation.amount} ${names[u.tradeReservation.kind]} reserved`:''}</p><button onClick={()=>run(()=>sendTradeEscort(g,u.id))}>Add armed escort</button></div>)}</details>}
 {!carrier&&<p>Need an available adult with empty hands.</p>}
 </>;
 return expanded?<section className="trade-proposal">{content}</section>:<details className="trade-proposal"><summary>Trade & caravans</summary>{content}</details>;
}
