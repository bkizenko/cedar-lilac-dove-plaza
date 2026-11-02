import type { Engine } from '@/game/engine';
import {visitorPrice,tradeWithVisitor,declineVisitorVisit} from '@/game/visitors';
import type {ResKind} from '@/game/types';
export function VisitingTrader({engine}:{engine:Engine}) {
  const g=engine.game,u=g.state.units.find(u=>u.hp>0&&u.visit?.phase==='waiting'&&u.visit.team===undefined&&g.visibleAt(u.x,u.z));
  if(!u||!u.carryType)return null;
  const goods:ResKind[]=['food','wood','stone','copper','iron'];
  return <div className="hud-panel pointer-events-auto absolute right-4 bottom-28 z-30 max-w-xs rounded-xl p-3">
    <p>{g.tribe(u.team).name}: {u.militia?"armed visiting trader":"visiting trader"}</p><p>Carrying {u.carry} {u.carryType}. Choose your payment:</p>
    {goods.filter(k=>k!==u.carryType&&(k!=='iron'||g.tribe(0).age>=2)&&(k!=='copper'||g.tribe(0).age>=1)).map(k=>{
      const price=visitorPrice(g,u,k);return <button className="m-1 min-h-8 border rounded px-2" key={k} disabled={!price||g.tribe(0)[k]<price}
        onClick={()=>{tradeWithVisitor(g,u.id,k);engine.pushHud();}}>Pay {price} {k}</button>;
    })}
    <button className="min-h-8 px-2" onClick={()=>{declineVisitorVisit(g,u.id);engine.pushHud();}} title="Return the goods and take your answer home; repeated unchanged offers stop.">Decline visit</button>
  </div>;
}
