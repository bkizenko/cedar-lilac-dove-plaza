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
  // A small alert, never an automatic window: the card opens when the player asks.
  if(mode==='alert')return <button className="hud-panel pointer-events-auto absolute right-4 bottom-28 z-30 rounded-xl px-3 py-2 min-h-11" onClick={()=>setOpenId(u.id)}>{g.tribe(u.team).name} trader at your village · {introduced?'quick trade':'first visit'}</button>;
  if(mode==='introduction')return <div className="hud-panel pointer-events-auto absolute right-4 bottom-28 z-30 max-w-xs rounded-xl p-3">
    <p>{g.tribe(u.team).name}: first visit from their trader, carrying {u.carry} {u.carryType}.</p>
    <p className="text-sm">Select the trader to meet them in person and hear the offer. Quick trades from this alert open after this first visit.</p>
    <button className="min-h-8 px-2" onClick={()=>setOpenId(null)}>Close</button>
  </div>;
  const goods:ResKind[]=['food','wood','stone','copper','iron'];
  return <div className="hud-panel pointer-events-auto absolute right-4 bottom-28 z-30 max-w-xs rounded-xl p-3">
    <p>{g.tribe(u.team).name}: {u.militia?"armed visiting trader":"visiting trader"}</p><p>Carrying {u.carry} {u.carryType}. Choose your payment:</p>
    {goods.filter(k=>k!==u.carryType&&(k!=='iron'||g.tribe(0).age>=2)&&(k!=='copper'||g.tribe(0).age>=1)).map(k=>{
      const price=visitorPrice(g,u,k),issue=visitorTradeIssue(g,u,k);return <button className="m-1 min-h-8 border rounded px-2" key={k} disabled={!!issue} title={issue||'Purchased goods go into village stores'}
        onClick={()=>{const result=acceptVisitorTrade(g,u.id,k);setFeedback({id:u.id,reason:result.reason});if(!result.accepted)g.banner(result.reason,5);engine.pushHud();}}>Pay {price} {k}</button>;
    })}
    <p className="text-xs text-parchment-dim">{visitorTradeCache(g,u)?'Purchases go into village stores.':'Meet this trader at a village cache to pay from stores.'}</p>
    {feedback?.id===u.id&&<p role="status" className="text-sm">{feedback.reason}</p>}
    <button className="min-h-8 px-2" onClick={()=>setOpenId(null)}>Close</button><button className="min-h-8 px-2" onClick={()=>{declineVisitorVisit(g,u.id);engine.pushHud();}} title="Return the goods and take your answer home; repeated unchanged offers stop.">Decline visit</button>
  </div>;
}
