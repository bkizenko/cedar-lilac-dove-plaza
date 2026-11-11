import {supplyDrops,supplyApproach,supplyReached} from './campAnchor';
import {lifeEvent} from './communities';
import {knownSettlementSite,localSettlementHall,beginSettlementJourney,settlementJourneySite} from './barter';
import{carryVisitorRefusal,visitorOfferOnCooldown,VISITOR_REFUSAL_RULES}from'./visitorRefusals';
import{observePartnerTrade,deliverTradeIntel}from'./tradeIntel';
import {equipCaravan} from "./caravans";
import {isRivalTeam} from "./factions";
import {settleRivalBarter,reportRivalRefusal} from "./rivalTrade";
import {receiveFood} from "./pantry";
import type { Game } from './sim';
import type { Unit, ResKind } from './types';
import { isDependent, foodDemand, reserveSeconds } from './settlement';
const worth:Record<ResKind,number>={food:1,wood:1.2,stone:2.2,copper:4.5,iron:6.5};
export function tickVisitors(g:Game,dt:number) {
  g.state.visitorTimer=(g.state.visitorTimer??300)-dt;
  if(g.state.visitorTimer>0)return;
  g.state.visitorTimer=90;
  if(g.state.units.some(u=>u.visit&&u.visit.team===undefined&&u.hp>0))return;
  const rivals=g.state.tribes.filter(t=>isRivalTeam(t.id)&&t.alive&&!t.hostile);
  for(const t of rivals) {
    const home=knownSettlementSite(g,0,t.id);if(!home)continue;
    if(reserveSeconds(g,t.id)<240||g.popNow(t.id)<5||g.state.units.some(u=>u.team===t.id&&u.hp>0&&u.visit))continue;
    const u=g.state.units.find(u=>u.team===t.id&&u.type==='worker'&&u.hp>0&&!isDependent(g,u)&&!u.emergency&&u.carry===0&&!u.visit&&!u.scout&&!u.expedition&&!u.foundingJourney&&!u.weaponWork&&!u.haulageWork&&!u.farmToolWork&&!u.studyCrop&&!u.recalled&&!u.envoy&&u.drill==null&&!u.buildOrder&&!u.jobLock&&!u.tamingWork&&!u.husbandryWork&&!u.tributeJourney&&['idle','gather'].includes(u.order)&&!!g.interactionSpot(u,home));
    if(!u)continue;
    const available=(['food','wood','stone','copper','iron'] as ResKind[]).filter(good=>!(good==='copper'&&t.age<1)&&!(good==='iron'&&t.age<2))
      .map(good=>({good,spare:t[good]-(good==='food'?foodDemand(g,t.id)*240:good==='wood'?20:10)}))
      .filter(item=>item.spare>=8).sort((a,b)=>(b.good===t.spec?30:0)+b.spare*worth[b.good]-(a.good===t.spec?30:0)-a.spare*worth[a.good]);
    if(!available.length)continue;
    const chosen=available.find(({good,spare})=>{const amount=Math.min(24,Math.floor(spare));return !visitorOfferOnCooldown(g,t.id,good,amount,visitorQuoteTerms(g,t.id,good,amount));});if(!chosen)continue;
    const {good,spare}=chosen,amount=Math.min(24,Math.floor(spare));
    equipCaravan(g,u);
    g.spend(t.id,{[good]:amount});u.carry=amount;u.carryType=good;u.carryFood=good==='food'?'provisions':undefined;
    beginSettlementJourney(g,u,home);u.visit={phase:'outbound',wait:0};u.order='move';u.node=null;u.target=null;u.tx=home.x;u.tz=home.z;
    u.job=null;u.jobLock=false;u.stuckT=0;u.workReason='Carrying goods to meet another community';g.state.visitorTimer=360;break;
  }
}
function cancelVisit(u:Unit){
  u.visit=undefined;u.order='return';u.node=null;u.target=null;u.stuckT=0;
  u.recalled=true;u.stationOnArrival=false;
  u.workReason='Trading journey interrupted — returning home with remaining goods';
}
export function visitorAI(g:Game,u:Unit,dt:number) {
  const m=u.visit;if(!m)return false;
  const partner=m.team??0,local=m.phase!=='return'?localSettlementHall(g,u,partner):undefined;
  const home=m.phase==='return'?g.state.buildings.find(b=>b.team===u.team&&b.type==='townhall'&&g.finished(b)):(local||settlementJourneySite(g,u,partner));
  if(!home||g.isFoe(u.team,m.team??0)){cancelVisit(u);return true;}
  if(u.stuckT>8){cancelVisit(u);return true;}
  if(m.phase==='waiting') {
    m.wait+=dt;u.vx=0;u.vz=0;
    if(m.wait>=120){m.phase='return';u.order='move';u.workReason='Returning after the trading visit';}return true;
  }
  const approach=g.interactionSpot(u,home);
  if(!approach){cancelVisit(u);return true;}
  u.tx=approach.x;u.tz=approach.z;
  if(!g.buildingWorkReached(u,home)){g.steer(u,dt);return true;}
  if(m.phase==='outbound'&&!local){cancelVisit(u);return true;}
  if(m.phase==='outbound'&&m.team!==undefined){
    const exchanged=settleRivalBarter(g,u);m.phase='return';u.stuckT=0;
    if(!exchanged)u.workReason='Offer declined — carrying the goods home';return true;
  }
  if(m.phase==='outbound') {m.phase='waiting';u.order='hold';u.workReason='Visiting trader — awaiting your offer';g.banner(g.tribe(u.team).name+' has sent a trader to your village',5);}
  else {
    reportRivalRefusal(g,u);
    deliverTradeIntel(g,u);
    if(u.carryType&&u.carry>0){if(u.carryType==='food')receiveFood(g,u.team,u.carry,u.carryFood);else g.tribe(u.team)[u.carryType]+=u.carry;}
    u.carry=0;u.carryType=null;u.carryFood=undefined;u.visit=undefined;u.order='idle';u.node=null;
  }
  return true;
}
function visitorQuote(g:Game,team:number,offered:ResKind,amount:number,payment:ResKind){
 if(offered===payment)return null;const t=g.tribe(team),need=payment==='food'?Math.max(30,foodDemand(g,team)*450):40;
 const scarcity=Math.max(0.7,Math.min(1.5,need/Math.max(10,t[payment])));return Math.max(1,Math.ceil(amount*worth[offered]/worth[payment]/scarcity*(1.1-(t.trust||0)*0.15)));
}
function visitorQuoteTerms(g:Game,team:number,offered:ResKind,amount:number,localBuyerAge?:number){
 const payments:ResKind[]=['food','wood','stone','copper','iron'];
 let known=new Set<ResKind>(['food','wood','stone']);
 if(localBuyerAge!==undefined)known=new Set(payments.filter(k=>(k!=='copper'||localBuyerAge>=1)&&(k!=='iron'||localBuyerAge>=2)));
 else{
  for(const r of g.state.tradeIntel?.visitorRefusals||[])if(r.seller===team&&r.buyer===0&&r.offered===offered)known.add(r.payment);
  const report=g.state.tradeIntel?.reports.find(r=>r.observer===team&&r.partner===0);
  if(report&&g.state.time-report.observedAt<=VISITOR_REFUSAL_RULES.needReportFreshSeconds)for(const good of report.goods)if(good.need!=='unavailable')known.add(good.kind);
 }
 return payments.filter(k=>k!==offered&&known.has(k)).map(payment=>({payment,price:visitorQuote(g,team,offered,amount,payment)!}));
}
export function visitorPrice(g:Game,u:Unit,give:ResKind){if(!u.visit||u.visit.phase!=='waiting'||!u.carryType)return null;return visitorQuote(g,u.team,u.carryType,u.carry,give);}
/** Refusing is a real conversation, not a remote ban: this person must carry
 * the answer home before their society changes its next offer. */
export function declineVisitorVisit(g:Game,id:number){
 const u=g.state.units.find(p=>p.id===id&&p.hp>0);if(!u||u.visit?.phase!=='waiting'||u.visit.team!==undefined||!u.carryType||!g.visibleAt(u.x,u.z))return {accepted:false,reason:'This trader is no longer here with an offer'};
 if(!carryVisitorRefusal(g,u,visitorQuoteTerms(g,u.team,u.carryType,u.carry,g.tribe(0).age)))return {accepted:false,reason:'The trader needs to be here with a valid local offer'};u.visit.phase='return';u.order='move';u.node=null;u.target=null;u.workReason='Taking the declined offer and your answer home';const reason='Offer declined. The same trader is taking your answer and unchanged goods home.';g.banner(reason,5);return {accepted:true,reason};
}
/** Quotes and acceptance use the same actual cache frontage, including remote
 * stores and relocated settlements. The original camp circle is not a cache. */
export function visitorTradeCache(g:Game,u:Unit){
 return supplyDrops(g,0).find(drop=>{const at=supplyApproach(g,u,drop);return !!at&&supplyReached(g,u,drop,at);});
}
export function visitorTradeIssue(g:Game,u:Unit|undefined,give:ResKind):string|null{
 if(!u||u.hp<=0||u.visit?.phase!=='waiting'||u.visit.team!==undefined||!u.carryType||u.carry<=0)return 'This trader no longer has that offer.';
 if(!['food','wood','stone','copper','iron'].includes(give)||give===u.carryType)return 'Choose a different resource as payment.';
 if(g.isFoe(0,u.team)||u.prisoner)return 'This person cannot agree to a peaceful trade.';
 if(!g.visibleAt(u.x,u.z))return 'Reach and see this trader before exchanging goods.';
 if(!visitorTradeCache(g,u))return 'Meet this trader at a village cache to pay from stores.';
 if((give==='copper'&&g.tribe(0).age<1)||(give==='iron'&&g.tribe(0).age<2))return 'Your village has not adopted this metal as a trade good.';
 const price=visitorPrice(g,u,give);
 if(!price)return 'This payment is no longer offered.';
 if(g.tribe(0)[give]<price)return `Need ${Math.ceil(price-g.tribe(0)[give])} more ${give==='wood'?'logs':give} in village stores.`;
 return null;
}
export function acceptVisitorTrade(g:Game,id:number,give:ResKind){
 const u=g.state.units.find(u=>u.id===id&&u.hp>0),issue=visitorTradeIssue(g,u,give);
 if(issue||!u)return {accepted:false,reason:issue||'This trader is no longer here.'};
 const price=visitorPrice(g,u,give)!,purchase={kind:u.carryType!,amount:u.carry,food:u.carryFood};
 observePartnerTrade(g,u,0,{give:purchase.kind,get:give,offered:purchase.amount,receivable:price,accepted:true,reason:'accepted'});
 g.spend(0,{[give]:price});
 if(purchase.kind==='food')receiveFood(g,0,purchase.amount,purchase.food);else g.tribe(0)[purchase.kind]+=purchase.amount;
 u.carry=price;u.carryType=give;u.carryFood=give==='food'?'provisions':undefined;
 u.visit!.phase='return';u.order='move';g.tribe(u.team).trust=Math.min(1,(g.tribe(u.team).trust||0)+0.1);
 const label=(kind:ResKind)=>kind==='wood'?'logs':kind;
 const reason=`Paid ${price} ${label(give)}; received ${purchase.amount} ${label(purchase.kind)} in village stores. The trader carries your payment home.`;
 lifeEvent(g,0,`Trade: ${reason}`);
 return {accepted:true,reason};
}
/** Compatibility for existing automatic and test callers. */
export function tradeWithVisitor(g:Game,id:number,give:ResKind){return acceptVisitorTrade(g,id,give).accepted;}
