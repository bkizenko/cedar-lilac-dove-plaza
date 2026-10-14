import type {Game} from './sim';
import type {Unit,TradeDeal} from './types';
import {receiveFood} from './pantry';

/** Reserved goods stay at the seller, outside spendable stock, until collection. */
export function reserveTradeGoods(g:Game,u:Unit,team:number,deal:TradeDeal){
  const seller=g.tribe(team);
  if(u.tradeReservation||!seller||seller[deal.get]<deal.getAmt)return false;
  g.spend(team,{[deal.get]:deal.getAmt});
  u.tradeReservation={team,kind:deal.get,amount:deal.getAmt};
  return true;
}
export function hasTradeReservation(u:Unit){
  const r=u.tradeReservation,d=u.trade;
  return !!r&&!!d&&r.team===u.tradeTeam&&r.kind===d.get&&r.amount===d.getAmt;
}
export function releaseTradeReservation(g:Game,u:Unit){
  const r=u.tradeReservation;if(!r)return;
  u.tradeReservation=undefined;
  const seller=g.tribe(r.team);if(!seller)return;
  if(r.kind==='food')receiveFood(g,r.team,r.amount);else seller[r.kind]+=r.amount;
}
export function reconcileTradeReservations(g:Game){
  for(const u of g.state.units)if(u.tradeReservation&&
    (u.hp<=0||!hasTradeReservation(u)||!u.trade||u.carryType!==u.trade.give||u.carry!==u.trade.giveAmt))releaseTradeReservation(g,u);
}
