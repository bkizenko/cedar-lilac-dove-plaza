import {useState} from 'react';
import {Handshake} from 'lucide-react';
import {FoldHandle,FoldMin,useFold} from './hearth/fold';
import type { Engine } from '@/game/engine';
import {visitorPrice,visitorTradeCache,visitorTradeIssue,acceptVisitorTrade,declineVisitorVisit,visitorIntroduced} from '@/game/visitors';
import type {Game} from '@/game/sim';
import type {ResKind,Unit} from '@/game/types';
/** What the trader card may show. Quick repeat trades (payment choices straight from this
 * alert) exist only after a completed first actual visit from that society; an
 * unintroduced trader only gets a small alert and a pointer to meet them in person. */
export type TraderCardMode='hidden'|'alert'|'introduction'|'choices';
export function traderCardMode(g:Game,u:Unit|undefined,openId:number|null):TraderCardMode{
  if(!u||!u.carryType)return 'hidden';
  if(openId!==u.id)return 'alert';
  return visitorIntroduced(g,u.team)?'choices':'introduction';
}
/** The one payment shown on the one-tap card: what the trader asked for if the village can pay it, else the cheapest valid payment. Real prices only. */
export function oneTapTradeOffer(g:Game,u:Unit):{give:ResKind;price:number;wanted:boolean}|null{
  if(!u.carryType||u.visit?.phase!=='waiting')return null;
  const goods:ResKind[]=(['food','wood','stone','copper','iron'] as ResKind[]).filter(k=>k!==u.carryType&&(k!=='iron'||g.tribe(0).age>=2)&&(k!=='copper'||g.tribe(0).age>=1));
  const valid=goods.map(k=>({give:k,price:visitorPrice(g,u,k)})).filter((o):o is {give:ResKind;price:number}=>typeof o.price==='number'&&o.price>0&&!visitorTradeIssue(g,u,o.give));
  if(!valid.length)return null;
  const wanted=u.visit?.wanted?valid.find(o=>o.give===u.visit!.wanted):undefined;
  const pick=wanted??valid.sort((a,b)=>a.price-b.price)[0];
  return {...pick,wanted:!!wanted};
}
export function VisitingTrader({engine,fold}:{engine:Engine;fold?:boolean}) {
  return fold?<HearthTrader engine={engine}/>:<TraderCard engine={engine}/>;
}
function HearthTrader({engine}:{engine:Engine}){
  const f=useFold('trader');
  const g=engine.game,u=g.state.units.find(u=>u.hp>0&&u.visit?.phase==='waiting'&&u.visit.team===undefined&&g.visibleAt(u.x,u.z));
  if(!u||!u.carryType)return null;
  if(!f.showPanel)return <FoldHandle f={f} icon={<Handshake size={24}/>} className="at-trader"/>;
  return <div className={'hw-trader-wrap '+f.cls}><FoldMin f={f} className="hw-trader-min"/><TraderCard engine={engine}/></div>;
}
function TraderCard({engine}:{engine:Engine}) {
  const [feedback,setFeedback]=useState<{id:number;reason:string}|null>(null),[openId,setOpenId]=useState<number|null>(null);
  const g=engine.game,u=g.state.units.find(u=>u.hp>0&&u.visit?.phase==='waiting'&&u.visit.team===undefined&&g.visibleAt(u.x,u.z));
  const mode=traderCardMode(g,u,openId);
  if(!u||mode==='hidden')return null;
  const introduced=visitorIntroduced(g,u.team);
  // An introduced trader gets one folded card: what they carry, the payment they want, one-tap Accept or Decline.
  const offer=mode==='alert'&&introduced?oneTapTradeOffer(g,u):null;
  if(offer)return <div className="hud-panel pointer-events-auto absolute right-4 bottom-28 z-30 max-w-[min(20rem,calc(100vw-2rem))] rounded-xl p-3" role="group" aria-label="Trader offer">
    <p>{g.tribe(u.team).name} trader · quick trade</p>
    <p><strong>Offers {u.carry} {u.carryType}</strong> · wants <strong>{offer.price} {offer.give}</strong>{offer.wanted?'':' (their best price you can pay)'}</p>
    {feedback?.id===u.id&&<p role="status" className="text-sm">{feedback.reason}</p>}
    <div className="mt-1 flex flex-wrap gap-1">
      <button className="min-h-11 min-w-11 rounded border px-3" onClick={()=>{const result=acceptVisitorTrade(g,u.id,offer.give);setFeedback({id:u.id,reason:result.reason});if(!result.accepted)g.banner(result.reason,5);engine.pushHud();}}>Accept</button>
      <button className="min-h-11 min-w-11 rounded border px-3" onClick={()=>{declineVisitorVisit(g,u.id);engine.pushHud();}} title="Return the goods and take your answer home; repeated unchanged offers stop.">Decline</button>
      <button className="min-h-11 min-w-11 px-2 underline" onClick={()=>setOpenId(u.id)}>Other payments</button>
    </div>
  </div>;
  // A small alert, never an automatic window: the card opens when the player asks.
  if(mode==='alert')return <button className="hud-panel pointer-events-auto absolute right-4 bottom-28 z-30 rounded-xl px-3 py-2 min-h-11" onClick={()=>setOpenId(u.id)}>{g.tribe(u.team).name} trader at your village · {introduced?'quick trade':'first visit'}</button>;
  if(mode==='introduction')return <div className="hud-panel pointer-events-auto absolute right-4 bottom-28 z-30 max-w-xs rounded-xl p-3">
    <p>{g.tribe(u.team).name}: first visit from their trader, carrying {u.carry} {u.carryType}.</p>
    <p className="text-sm">Select the trader to meet them in person and hear the offer. Quick trades from this alert open after this first visit.</p>
    <button className="min-h-11 px-2" onClick={()=>setOpenId(null)}>Close</button>
  </div>;
  const goods:ResKind[]=['food','wood','stone','copper','iron'];
  return <div className="hud-panel pointer-events-auto absolute right-4 bottom-28 z-30 max-w-xs rounded-xl p-3">
    <p>{g.tribe(u.team).name}: {u.militia?"armed visiting trader":"visiting trader"}</p><p>Carrying {u.carry} {u.carryType}. Choose your payment:</p>
    {goods.filter(k=>k!==u.carryType&&(k!=='iron'||g.tribe(0).age>=2)&&(k!=='copper'||g.tribe(0).age>=1)).map(k=>{
      const price=visitorPrice(g,u,k),issue=visitorTradeIssue(g,u,k);return <button className="m-1 min-h-11 border rounded px-2" key={k} disabled={!!issue} title={issue||'Purchased goods go into village stores'}
        onClick={()=>{const result=acceptVisitorTrade(g,u.id,k);setFeedback({id:u.id,reason:result.reason});if(!result.accepted)g.banner(result.reason,5);engine.pushHud();}}>Pay {price} {k}</button>;
    })}
    <p className="text-xs text-parchment-dim">{visitorTradeCache(g,u)?'Purchases go into village stores.':'Meet this trader at a village cache to pay from stores.'}</p>
    {feedback?.id===u.id&&<p role="status" className="text-sm">{feedback.reason}</p>}
    <button className="min-h-11 px-2" onClick={()=>setOpenId(null)}>Close</button><button className="min-h-11 px-2" onClick={()=>{declineVisitorVisit(g,u.id);engine.pushHud();}} title="Return the goods and take your answer home; repeated unchanged offers stop.">Decline visit</button>
  </div>;
}
