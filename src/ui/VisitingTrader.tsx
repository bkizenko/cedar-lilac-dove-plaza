import {useState} from 'react';
import type { Engine } from '@/game/engine';
import {visitorPrice,visitorTradeCache,visitorTradeIssue,acceptVisitorTrade,declineVisitorVisit} from '@/game/visitors';
import type {ResKind} from '@/game/types';
export function VisitingTrader({engine}:{engine:Engine}) {
  const [feedback,setFeedback]=useState<{id:number;reason:string}|null>(null);
  const g=engine.game,u=g.state.units.find(u=>u.hp>0&&u.visit?.phase==='waiting'&&u.visit.team===undefined&&g.visibleAt(u.x,u.z));
  if(!u||!u.carryType)return null;
  const goods:ResKind[]=['food','wood','stone','copper','iron'];
  return <div className="hud-panel pointer-events-auto absolute right-4 bottom-28 z-30 max-w-xs rounded-xl p-3">
    <p>{g.tribe(u.team).name}: {u.militia?"armed visiting trader":"visiting trader"}</p><p>Carrying {u.carry} {u.carryType}. Choose your payment:</p>
    {goods.filter(k=>k!==u.carryType&&(k!=='iron'||g.tribe(0).age>=2)&&(k!=='copper'||g.tribe(0).age>=1)).map(k=>{
      const price=visitorPrice(g,u,k),issue=visitorTradeIssue(g,u,k);return <button className="m-1 min-h-8 border rounded px-2" key={k} disabled={!!issue} title={issue||'Purchased goods go into village stores'}
        onClick={()=>{const result=acceptVisitorTrade(g,u.id,k);setFeedback({id:u.id,reason:result.reason});if(!result.accepted)g.banner(result.reason,5);engine.pushHud();}}>Pay {price} {k}</button>;
    })}
    <p className="text-xs text-parchment-dim">{visitorTradeCache(g,u)?'Purchases go into village stores.':'Meet this trader at a village cache to pay from stores.'}</p>
    {feedback?.id===u.id&&<p role="status" className="text-sm">{feedback.reason}</p>}
    <button className="min-h-8 px-2" onClick={()=>{declineVisitorVisit(g,u.id);engine.pushHud();}} title="Return the goods and take your answer home; repeated unchanged offers stop.">Decline visit</button>
  </div>;
}
