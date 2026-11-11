import type {Game} from './sim';
import type {Unit,TradeDeal,Building} from './types';
import {supplyDrops,supplyApproach,supplyReached} from './campAnchor';
import {beginSettlementJourney,settlementJourneySite} from './barter';
import {knownDiplomaticRelation} from './diplomaticKnowledge';

type LoadingUnit=Unit&{tradeLoading?:true};
const looseCargo=(u:Unit)=>Object.values(u.itemCargo||{}).some(n=>(n||0)>0)||(u.waterWork?.liters||0)>0;
function loadingCache(g:Game,u:Unit){
 return supplyDrops(g,u.team).map(drop=>({drop,spot:supplyApproach(g,u,drop)})).filter(p=>p.spot).sort((a,b)=>Math.hypot(a.spot!.x-u.x,a.spot!.z-u.z)-Math.hypot(b.spot!.x-u.x,b.spot!.z-u.z))[0];
}
function cancelLoading(g:Game,u:LoadingUnit,reason:string){
 delete u.tradeLoading;u.trade=null;u.procurement=undefined;u.customOffer=undefined;u.tradeTeam=0;
 if(u.order==='trade'){u.order=u.carry>0||looseCargo(u)?'return':'idle';u.node=null;u.target=null;u.workReason=reason;g.invalidateRoute(u);}
}
function payAtCache(g:Game,u:LoadingUnit){
 const deal=u.trade,other=g.tribe(u.tradeTeam);
 if(!deal||!other||knownDiplomaticRelation(g,u.tradeTeam).hostile===true){cancelLoading(g,u,'Trade loading cancelled; no budget was withdrawn');return false;}
 if(!g.canAfford(u.team,{[deal.give]:deal.giveAmt})){cancelLoading(g,u,'Trade budget no longer available at the cache; nothing was withdrawn');return false;}
 const hall=settlementJourneySite(g,u,u.tradeTeam);
 if(!hall){cancelLoading(g,u,'No known meeting site remains; nothing was withdrawn');return false;}
 g.spend(u.team,{[deal.give]:deal.giveAmt});u.carry=deal.giveAmt;u.carryType=deal.give;u.carryFood=deal.give==='food'?'provisions':undefined;
 delete u.tradeLoading;other.tradeCd=32;u.tx=hall.x;u.tz=hall.z;u.workReason='Carrying a trade proposal to '+other.name;g.invalidateRoute(u);return true;
}
/** Reserve only intent until an empty-handed carrier physically reaches a cache. */
export function beginTradeLoading(g:Game,u:LoadingUnit,deal:TradeDeal,team:number,hall:Building,accepted=true){
 if(u.carry!==0||looseCargo(u)||u.tradeLoading||u.tradeReservation||hall.team!==team)return false;
 const cache=loadingCache(g,u);if(!cache?.spot)return false;
 u.trade={...deal};u.tradeTeam=team;u.order='trade';u.customOffer=undefined;u.procurement=accepted?{minimum:deal.getAmt}:undefined;u.node=null;u.target=null;u.carryType=null;u.carryFood=undefined;u.tradeLoading=true;
 beginSettlementJourney(g,u,hall);
 if(supplyReached(g,u,cache.drop,cache.spot))return payAtCache(g,u);
 u.tx=cache.spot.x;u.tz=cache.spot.z;u.workReason='Walking to load the trade budget at a real cache; nothing withdrawn yet';g.invalidateRoute(u);return true;
}
/** Run before tradeAI's loaded-budget check. No seller goods are touched here. */
export function tradeLoadingAI(g:Game,u:LoadingUnit,dt:number){
 if(!u.tradeLoading)return false;
 if(u.hp<=0||u.order!=='trade'||!u.trade||u.carry!==0||looseCargo(u)){
  // An interrupted request has no payment to refund. Preserve unrelated cargo.
  cancelLoading(g,u,'Unpaid trade loading cancelled');return true;
 }
 const cache=loadingCache(g,u);
 if(!cache?.spot){cancelLoading(g,u,'No reachable cache to load the trade budget; nothing was withdrawn');return true;}
 u.tx=cache.spot.x;u.tz=cache.spot.z;u.workReason='Walking to load the trade budget at a real cache; nothing withdrawn yet';
 if(supplyReached(g,u,cache.drop,cache.spot))payAtCache(g,u);else g.steer(u,dt);
 return true;
}
export function validTradeLoadingUnit(v:unknown){
 if(!v||typeof v!=='object')return false;const u=v as Record<string,any>;
 if(u.tradeLoading===undefined)return true;
 const d=u.trade,goods=['food','wood','stone','copper','iron'];
 return u.tradeLoading===true&&u.team===0&&(u.order==='trade'||u.emergency?.resume?.order==='trade')&&u.carry===0&&u.carryType===null&&!Object.values(u.itemCargo||{}).some(n=>typeof n!=='number'||n>0)&&!(u.waterWork?.liters>0)&&u.tradeReservation===undefined&&Number.isInteger(u.tradeTeam)&&u.tradeTeam>0&&u.tradeTeam!==3&&!!d&&goods.includes(d.give)&&goods.includes(d.get)&&d.give!==d.get&&Number.isSafeInteger(d.giveAmt)&&d.giveAmt>0&&d.giveAmt<=100&&Number.isSafeInteger(d.getAmt)&&d.getAmt>0&&d.getAmt<=200&&u.settlementJourney?.owner===u.tradeTeam;
}
