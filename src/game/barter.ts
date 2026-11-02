import {knownDiplomaticRelation,recordDiplomaticVisit} from './diplomaticKnowledge';
import {refreshSettlementSites} from './settlementKnowledge';
import {BUILDINGS} from './constants';
import type {Building} from './types';
import {TRADE_PRICING,partialPayment} from "./tradePricing";
import {hasTaskCommitment} from './workCommitments';
import {carryingCapacity} from './haulage';
import {isRivalTeam} from "./factions";
import type { Game } from "./sim";
import { predisposition } from "./people";
import type { Unit, ResKind, TradeDeal } from "./types";
import { isDependent, foodDemand, calendar } from "./settlement";

const settlementLandmarks=new WeakMap<object,Building>();
/** Last witnessed site, not a pointer to the current global hall object. */
function legacyJourney(g:Game,u:Unit,owner:number):Unit["settlementJourney"]{
 const active=(u.order==='trade'&&u.trade&&u.tradeTeam===owner)||(u.envoy?.phase==='outbound'&&u.envoy.team===owner)||(u.visit?.phase==='outbound'&&(u.visit.team??0)===owner);
 if(!active||!Number.isFinite(u.tx)||!Number.isFinite(u.tz)||Math.abs(u.tx)>g.world.size/2||Math.abs(u.tz)>g.world.size/2)return undefined;
 return {version:1 as const,owner,x:u.tx,z:u.tz,recordedAt:g.state.time};
}
export function beginSettlementJourney(g:Game,u:Unit,site:Building){u.settlementJourney={version:1,owner:site.team,siteId:site.id>0?site.id:undefined,x:site.x,z:site.z,recordedAt:g.state.time};}
export function settlementJourneySite(g:Game,u:Unit,owner:number){
 const point=u.settlementJourney?.owner===owner?u.settlementJourney:legacyJourney(g,u,owner);
 if(point){u.settlementJourney=point;return settlementMarker(g,point,owner);}
 const site=knownSettlementSite(g,owner,u.team);if(site)beginSettlementJourney(g,u,site);return site;
}
export function settlementMarker(g:Game,fact:object&{x:number;z:number;siteId?:number},owner:number){
 const cached=settlementLandmarks.get(fact);if(cached)return cached;
 const marker:Building={id:fact.siteId??0,kind:'building',type:'townhall',team:owner,x:fact.x,z:fact.z,y:g.height(fact.x,fact.z),w:BUILDINGS.townhall.w,d:BUILDINGS.townhall.d,hp:1,maxHp:1,build:1,queue:[],selected:false,rally:null,cd:0,reclaimed:false};settlementLandmarks.set(fact,marker);return marker;
}
export function knownSettlementSite(g:Game,team:number,observer=0):Building|undefined {
 refreshSettlementSites(g);
 const fact=(g.state.observedSettlements||[]).filter(m=>m.observer===observer&&m.owner===team&&m.active).sort((a,b)=>b.observedAt-a.observedAt||a.siteId-b.siteId)[0];
 if(fact)return settlementMarker(g,fact,team);
 // Serialized paid/active journeys are explicit endpoint evidence, unlike
 // old terrain. Never dereference an unknown replacement hall for recovery.
 for(const u of g.state.units.filter(u=>u.team===observer&&u.hp>0)){
  const active=legacyJourney(g,u,team);if(!active)continue;
  const endpoint=u.settlementJourney?.owner===team?u.settlementJourney:active;
  if((g.state.observedSettlements||[]).some(m=>m.observer===observer&&m.owner===team&&!m.active&&m.observedAt>=endpoint.recordedAt&&(endpoint.siteId!==undefined?m.siteId===endpoint.siteId:Math.hypot(m.x-endpoint.x,m.z-endpoint.z)<12)))continue;
  if(endpoint)return settlementMarker(g,endpoint,team);
 }
 return undefined;
}
export function knownSettlement(g:Game,team:number){return !!knownSettlementSite(g,team);}
/** Global entities may be read for a local meeting only after this actual
 * living person is physically close enough to witness them. */
export function localSettlementHall(g:Game,u:Unit,team:number){return u.hp>0&&(!u.prisoner||u.prisoner.phase==='released')?g.state.buildings.find(b=>b.team===team&&b.type==='townhall'&&g.finished(b)&&Math.hypot(u.x-b.x,u.z-b.z)<=26):undefined;}
export function eligibleTradeCarrier(g: Game, u: Unit, automatic = false) {
  return (
      u.team === 0 &&
      (u.type === "worker" || (!automatic && u.selected && u.militia)) &&
      u.hp > 0 &&
      !isDependent(g, u) &&
      !u.emergency && u.escortId===undefined &&
      !u.envoy && !u.expedition && !u.scout && !u.visit && !u.foundingJourney && !u.recalled &&
      !hasTaskCommitment(u) && u.drill == null &&
      u.carry === 0 &&
      (automatic ? u.enslavedFrom===undefined && !u.jobLock && ["idle", "gather"].includes(u.order) : ["idle", "hold", "gather"].includes(u.order))
  );
}
export function tradeCarrier(g: Game, automatic = false) {
  return g.state.units.filter(u => eligibleTradeCarrier(g,u,automatic)).sort((a,b) => Number(!automatic && b.selected)-Number(!automatic && a.selected) ||
    (predisposition(b).trading-(b.fatigue||0)*.3)-(predisposition(a).trading-(a.fatigue||0)*.3))[0];
}

export function automaticTradeReady(g: Game, foodCost = 0) {
  const adults = g.state.units.filter(u => u.team === 0 && u.hp > 0 && (u.type === "worker" || u.caravanArmed) && !isDependent(g,u));
  const away = adults.filter(u => u.envoy || u.expedition || u.scout || u.visit || u.foundingJourney || u.order === "trade" || u.tradeTeam > 0).length;
  return adults.length-away >= 4 && away < Math.max(1,Math.floor(adults.length/4)) &&
    g.tribe(0).food-foodCost >= foodDemand(g)*360;
}

/** Only a person at the meeting can reveal current terms. */
export function recordTradeMeeting(g: Game, team: number, trader: Unit) {
  const hall=localSettlementHall(g,trader,team);
  if(!isRivalTeam(team)||!g.tribe(team)?.alive||g.tribe(team).hostile||trader.team!==0||trader.hp<=0||!hall||!g.buildingWorkReached(trader,hall))return undefined;
  recordDiplomaticVisit(g,trader,team);
  const goods: ResKind[] = ["food", "wood", "stone", "copper", "iron"];
  const offers: TradeDeal[] = [];
  for (const give of goods) for (const get of goods) {
    if (give === get) continue;
    const quote = quoteShipment(g, team, give, get, 20, trader);
    if (quote.deal) offers.push(quote.deal);
  }
  const local=g.state.units.filter(u=>u.team===team&&u.hp>0&&Math.hypot(u.x-hall.x,u.z-hall.z)<60).length;
  const uncertainty=Math.max(2,Math.ceil(local*Math.max(.15,.65-(predisposition(trader).trading-.8))));
  const stocks:Partial<Record<ResKind,"scarce"|"adequate"|"plentiful">>={};
  const tribe=g.tribe(team);
  // Stocks are volunteered by trusted partners, never counted through walls.
  if(tribe.ally||(tribe.trust||0)>=.5)for(const kind of goods){
    if(kind==='copper'&&tribe.age<1||kind==='iron'&&tribe.age<2)continue;
    const reserve=Math.max(10,protectedReserve(g,team,kind));
    stocks[kind]=tribe[kind]<reserve?'scarce':tribe[kind]>reserve*3?'plentiful':'adequate';
  }
  const observation={populationLow:Math.max(0,local-uncertainty),populationHigh:local+uncertainty,
    buildings:g.state.buildings.filter(b=>b.team===team&&g.finished(b)&&Math.hypot(b.x-hall.x,b.z-hall.z)<60).length,stocks};
  const report = { team, time: g.state.time, offers, observation };
  g.state.tradeReports = (g.state.tradeReports || []).filter(r => r.team !== team);
  g.state.tradeReports.push(report);
  return report;
}
function protectedReserve(g:Game,team:number,kind:ResKind){
  if(kind==="wood")return 24;
  if(kind==="stone")return g.tribe(team).age>=1?12:4;
  if(kind!=="food")return 0;
  const {phase,remaining}=calendar(g),winterFood=foodDemand(g,team,3);
  return phase===2?winterFood*450+foodDemand(g,team)*remaining:phase===3?winterFood*Math.max(120,remaining):foodDemand(g,team)*240;
}
/** Trade willingness uses forecast needs; the UI receives a reason, never an inventory total. */
export function shipmentIssue(g: Game, team: number, deal: TradeDeal): string | null {
  const other = g.tribe(team);
  const goods = ["food", "wood", "stone", "copper", "iron"];
  if (!other || !other.alive || other.hostile) return "They are not willing to trade.";
  if (!goods.includes(deal.give) || !goods.includes(deal.get) || deal.give === deal.get ||
      !Number.isSafeInteger(deal.giveAmt) || !Number.isSafeInteger(deal.getAmt) ||
      deal.giveAmt <= 0 || deal.getAmt <= 0 || deal.giveAmt > 100 || deal.getAmt > 200)
    return "The shipment needs valid quantities of two different goods.";
  if (other[deal.get] < deal.getAmt) return "They cannot supply that quantity. Try a smaller offer or different goods.";
  const {phase} = calendar(g);
  const foodReserve = protectedReserve(g,team,"food");
  const afterFood = other.food - (deal.get === "food" ? deal.getAmt : 0) + (deal.give === "food" ? deal.giveAmt : 0);
  if (deal.get === "food" && afterFood < foodReserve)
    return phase >= 2 ? "They are keeping food for winter. Offer another resource or ask for different goods." :
      "They need that food for their people. Ask for different goods.";
  const reserve = deal.get==="food"?0:protectedReserve(g,team,deal.get);
  if (other[deal.get] - deal.getAmt < reserve) return "They are keeping those materials for village construction. Ask for different goods.";
  const wanted = deal.give === "food" ? Math.max(40, foodReserve) : deal.give === "wood" ? 60 : 30;
  if (!other.ally && (other.trust || 0) < 0.5 && other[deal.give] > wanted * 3)
    return "They already have enough of your offered goods. Try a resource they need.";
  return null;
}
export function quoteShipment(
  g: Game,
  team: number,
  give: ResKind,
  get: ResKind,
  amount: number,
  visitingTrader?: Unit,
): { deal: TradeDeal | null; reason: string } {
  const you = g.tribe(0),
    other = g.tribe(team);
  const no = (reason: string) => ({ deal: null, reason });
  if (!other || team === 0 || team === 3 || !other.alive || (!knownSettlement(g, team)&&!(visitingTrader&&localSettlementHall(g,visitingTrader,team))))
    return no("Explore their settlement first.");
  if (other.hostile) return no("Agree a truce before trading.");
  if (!visitingTrader && other.tradeCd > 0) return no("Their traders are still on the path.");
  const rules=TRADE_PRICING,worth=rules.worth;
  if (!Object.hasOwn(worth, give) || !Object.hasOwn(worth, get) || give === get)
    return no("Choose two different goods.");
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100)
    return no("Offer between 1 and 100 goods.");
  const age = Math.min(you.age, other.age);
  if (([give, get].includes("copper") && age < 1) || ([give, get].includes("iron") && age < 2))
    return no("Both settlements need the age that unlocks this metal.");
  if (!visitingTrader && you[give] < amount) return no("Your stores cannot cover that offer.");
  const need = (kind: ResKind) => (kind === "food" ? Math.max(rules.foodNeedMinimum, g.popNow(team) * rules.foodNeedPerResident) : rules.materialNeed);
  const scarcity = (kind: ResKind) =>
    Math.max(rules.scarcityMinimum, Math.min(rules.scarcityMaximum, need(kind) / Math.max(rules.minimumStock, other[kind])));
  const terms = (g.state.agePicks[2] === "econ" ? rules.economicTerms : rules.baseTerms) + Math.max(0, Math.min(1, other.trust || 0)) * rules.trustBonus - other.tension * rules.tensionPenalty;
  const marketQuantity = Math.floor(
    (amount * worth[give] * scarcity(give) * terms * (visitingTrader ? predisposition(visitingTrader).trading : 1)) / (worth[get] * scarcity(get)),
  );
  // At a physical meeting they can offer a smaller surplus rather than reject
  // every proposal that would otherwise touch their protected reserves.
  const surplus=Math.max(0,Math.floor(other[get]-protectedReserve(g,team,get)));
  const quantity=Math.min(200,marketQuantity,surplus,visitingTrader?.caravanRoute?carryingCapacity(visitingTrader,get):Infinity);
  if(surplus<1)return no(get==="food"&&calendar(g).phase>=2?"They are keeping food for winter. Ask for different goods.":"They have no surplus of those goods to exchange. Try another resource.");
  if (quantity < 1) return no("Offer more goods for at least one item in return.");
  const payment=partialPayment(amount,marketQuantity,quantity);
  const issue = shipmentIssue(g, team, {give, giveAmt:payment, get, getAmt:quantity});
  if (issue) return no(issue);
  return {
    deal: { give, giveAmt: payment, get, getAmt: quantity },
    reason:
      quantity<marketQuantity?"Partial shipment at the quoted unit price. Unspent goods stay yours; purchases arrive after the return journey.":"Terms reflect their needs, trust and tension. Goods arrive only after the return journey.",
  };
}
/** Home decisions use carried reports, never a live view into a distant stockpile. */
export function reportedQuote(g:Game,team:number,give:ResKind,get:ResKind,amount:number): {deal:TradeDeal|null;reason:string} {
  const no=(reason:string)=>({deal:null,reason});
  const report=g.state.tradeReports?.find(r=>r.team===team);
  if(!report)return no("Send a trade delegation and view its report when it arrives.");
  if(g.state.time-report.time>900)return no("That report is old. Send a trader to learn current terms.");
  if(knownDiplomaticRelation(g,team).hostile===true)return no("Last contact reported hostilities. Send a peace delegation before trading.");
  if(!Number.isSafeInteger(amount)||amount<1||amount>100||give===get)return no("Choose different goods and offer 1–100 items.");
  if(g.tribe(0)[give]<amount)return no("Your stores cannot cover that offer.");
  if(g.tribe(team).tradeCd>0)return no("Your previous carrier is still on the path.");
  const offer=report.offers.find(d=>d.give===give&&d.get===get);
  if(!offer)return no("The trader did not report an offer for those goods. Send another delegation or choose other goods.");
  const quantity=Math.min(offer.getAmt,Math.floor(offer.getAmt*amount/offer.giveAmt));
  const payment=Math.ceil(quantity*offer.giveAmt/offer.getAmt);
  if(quantity<1||quantity>200)return no("Adjust the offered quantity.");
  return {deal:{give,get,giveAmt:payment,getAmt:quantity},reason:`Last reported ${Math.floor((g.state.time-report.time)/60)} minutes ago. The trader carries your proposal; its minimum is checked at the meeting.`};
}
export function proposeShipment(
  g: Game,
  team: number,
  give: ResKind,
  get: ResKind,
  amount: number,
) {
  const quote = reportedQuote(g, team, give, get, amount);
  if (!quote.deal) {
    g.banner(quote.reason, 2.5);
    return false;
  }
  const carrier = tradeCarrier(g);
  if (!carrier) {
    g.banner("An available adult with empty hands is needed.", 2.5);
    return false;
  }
  if (!g.dispatchTrade(carrier, quote.deal, team)) return false;
  g.banner("Proposal sent. Below the reported minimum, your carrier brings the budget home.", 2.5);
  return true;
}

/** Send a proposal without consulting distant stocks. It is negotiated only on arrival. */
function startOffer(g:Game,team:number,give:ResKind,get:ResKind,amount:number,requested:number) {
  const goods:ResKind[]=["food","wood","stone","copper","iron"];
  if(!knownSettlement(g,team)||!isRivalTeam(team)||!goods.includes(give)||!goods.includes(get)||give===get||
    !Number.isSafeInteger(amount)||amount<1||amount>100||!Number.isSafeInteger(requested)||requested<1||requested>200)return null;
  if((give==="iron"||get==="iron")&&g.tribe(0).age<2)return null;
  if((give==="copper"||get==="copper")&&g.tribe(0).age<1)return null;
  const u=tradeCarrier(g);if(!u||!g.dispatchTrade(u,{give,get,giveAmt:amount,getAmt:requested},team,false))return null;
  return u;
}
export function sendOffer(g:Game,team:number,give:ResKind,get:ResKind,amount:number,requested:number) {
  const u=startOffer(g,team,give,get,amount,requested);if(!u)return false;
  u.customOffer=true;g.banner("Your trader carries the proposal. They may accept, counter or refuse at the meeting.",4);return true;
}

/** The whole offered budget travels with the person; nothing is bought remotely. */
export function sendProcurement(g: Game, team: number, give: ResKind, get: ResKind, budget: number, minimum: number) {
  const carrier = startOffer(g, team, give, get, budget, minimum);
  if (!carrier) return false;
  carrier.customOffer = undefined;
  carrier.procurement = { minimum };
  carrier.workReason = `Seeking at least ${minimum} ${get} with ${budget} ${give}`;
  g.banner("Your trader will seek the best local offer. Below your minimum, the budget comes home.", 4);
  return true;
}
