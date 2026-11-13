import {useState} from 'react';
import type {Engine} from '../game/engine';
import {PLAYER_TRADE_NAMES,type PlayerTradeCommand,type PlayerTradeModel} from '../game/playerTrade';
import {useOwnerReadModels} from './useOwnerReadModels';
import {useLifecycleAction} from './useLifecycleAction';

type GoodKind=PlayerTradeModel['goods'][number]['kind'];
const button='min-h-9 rounded border border-bronze/40 px-2 py-1 text-xs disabled:opacity-50';
const field='min-h-9 max-w-full rounded border border-bronze/40 bg-ink p-1 text-parchment';

/** Terms and stores come only from the owner read model; the engine validates orders. */
function TradeSheet({model,inboxOnly,busy,run}:{model:PlayerTradeModel;inboxOnly:boolean;busy:boolean;run:(command:PlayerTradeCommand)=>void}){
 const [give,setGive]=useState<GoodKind>('food'),[get,setGet]=useState<GoodKind>('wood'),[amount,setAmount]=useState('20');
 const offered=model.goods.find(g=>g.kind===give),received=model.goods.find(g=>g.kind===get),quantity=Number(amount);
 const maxAmount=offered?Math.max(0,Math.floor(Math.min(offered.held,offered.maxOffer))):0;
 const invalid=!offered||!received||give===get||!Number.isSafeInteger(quantity)||quantity<1||quantity>maxAmount;
 const offers=inboxOnly?model.offers.filter(o=>o.to===0&&o.canAnswer):model.offers;
 if(inboxOnly&&!offers.length)return null;
 return <section className="space-y-2 text-xs" aria-label={inboxOnly?'Incoming trade offers':'Trade offers'}>
  {!inboxOnly&&model.partnerKnown&&model.team!==null&&<>
   <div className="flex flex-wrap items-end gap-2">
    <label className="flex min-w-0 flex-col gap-1">Offer<select aria-label="Goods to offer" className={field} disabled={busy} value={give} onChange={e=>setGive(e.target.value as GoodKind)}>{model.goods.map(g=><option key={g.kind} value={g.kind}>{PLAYER_TRADE_NAMES[g.kind]}</option>)}</select></label>
    <label className="flex min-w-0 flex-col gap-1">Quantity<input aria-label="Quantity to offer" className={`${field} w-20`} type="number" min={1} max={maxAmount} step={1} disabled={busy} value={amount} onChange={e=>setAmount(e.target.value)}/></label>
    <label className="flex min-w-0 flex-col gap-1">Receive<select aria-label="Goods to receive" className={field} disabled={busy} value={get} onChange={e=>setGet(e.target.value as GoodKind)}>{model.goods.map(g=><option key={g.kind} value={g.kind} disabled={g.kind===give}>{PLAYER_TRADE_NAMES[g.kind]}</option>)}</select></label>
   </div>
   {offered&&<p className="text-parchment-dim">{Math.floor(offered.held)} {PLAYER_TRADE_NAMES[give].toLowerCase()} held · maximum offer {maxAmount}{received?` · ${Math.floor(received.held)} ${PLAYER_TRADE_NAMES[get].toLowerCase()} held`:''}</p>}
   <button type="button" className={button} disabled={busy||invalid} onClick={()=>{if(!invalid&&model.team!==null)run({kind:'propose-needs-trade',team:model.team,give,get,amount:quantity});}}>Send offer</button>
  </>}
  {offers.map(offer=>{
   const incoming=offer.to===0,pay=incoming?offer.get:offer.give,take=incoming?offer.give:offer.get;
   return <div key={offer.id} className="space-y-1 border-t border-bronze/20 pt-2">
    <p>{offer.partnerName} · {offer.status}</p>
    <p>Give {pay.amount} {PLAYER_TRADE_NAMES[pay.kind].toLowerCase()} · Receive {take.amount} {PLAYER_TRADE_NAMES[take.kind].toLowerCase()}{offer.ownCarriers!==null?` · ${offer.ownCarriers} carriers`:''}</p>
    {incoming&&offer.canAnswer&&<>
     <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={busy||!!offer.answerIssue} title={offer.answerIssue||'Agree to these goods and quantities'} onClick={()=>run({kind:'answer-needs-trade',offerId:offer.id,accept:true})}>Accept</button><button type="button" className={button} disabled={busy} onClick={()=>run({kind:'answer-needs-trade',offerId:offer.id,accept:false})}>Decline</button></div>
     {offer.answerIssue&&<p className="text-parchment-dim">{offer.answerIssue}</p>}
    </>}
   </div>;
  })}
  {!inboxOnly&&!offers.length&&<p className="text-parchment-dim">No trade journeys or incoming offers.</p>}
 </section>;
}

export function NeedsTradeControls({engine,team,inboxOnly=false}:{engine:Engine;team?:number;inboxOnly?:boolean}){
 const query={kind:'needs-trade' as const,...(team===undefined?{}:{team})},read=useOwnerReadModels(engine,[query])(query),action=useLifecycleAction(engine),epoch=engine.dispatchEpoch;
 const [feedback,setFeedback]=useState<{epoch:number;team:number|undefined;text:string}|null>(null);
 const run=(command:PlayerTradeCommand)=>{
  if(action.busy||engine.disposed||engine.dispatchEpoch!==epoch)return;
  void action.run(()=>engine.dispatch(command),reply=>{
   if(reply.epoch!==epoch||engine.dispatchEpoch!==epoch)return;
   setFeedback({epoch,team,text:reply.reason});engine.pushHud();
  });
 };
 if(inboxOnly&&!read.model?.offers.some(o=>o.to===0&&o.canAnswer))return null;
 const message=feedback?.epoch===epoch&&feedback.team===team?feedback.text:'';
 return <>
  {read.model?<TradeSheet key={`${epoch}:${team??'all'}`} model={read.model} inboxOnly={inboxOnly} busy={action.busy} run={run}/>:<p className="text-xs text-parchment-dim">{read.issue}</p>}
  {(message||action.error)&&<p role="status" className="text-xs text-parchment-dim">{action.error||message}</p>}
 </>;
}
