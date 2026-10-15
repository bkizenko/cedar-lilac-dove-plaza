import {isRivalTeam} from "./factions";
import type { Game } from "./sim";
import { predisposition } from "./people";
import type { Unit, ResKind, TradeDeal } from "./types";
import { isDependent, foodDemand, calendar } from "./settlement";

export function knownSettlement(g: Game, team: number) {
  const hall=g.state.buildings.find(b=>b.team===team&&b.type==='townhall'&&b.hp>0);
  return !!hall&&(g.exploredAt(hall.x,hall.z)||g.state.buildings.some(b=>b.team===team&&g.finished(b)&&
    Math.hypot(b.x-hall.x,b.z-hall.z)<40&&g.exploredAt(b.x,b.z)));
}
export function eligibleTradeCarrier(g: Game, u: Unit, automatic = false) {
  return (
      u.team === 0 &&
      (u.type === "worker" || (!automatic && u.selected && u.militia)) &&
      u.hp > 0 &&
      !isDependent(g, u) &&
      !u.emergency &&
      !u.envoy && !u.expedition && !u.scout && !u.visit && !u.foundingJourney && !u.recalled &&
      !u.haulageWork && !u.farmToolWork && !u.weaponWork && !u.studyCrop && u.drill == null &&
      u.carry === 0 &&
      (automatic ? !u.jobLock && ["idle", "gather"].includes(u.order) : ["idle", "hold", "gather"].includes(u.order))
  );
}
export function tradeCarrier(g: Game, automatic = false) {
  return g.state.units.filter(u => eligibleTradeCarrier(g,u,automatic)).sort((a,b) => Number(!automatic && b.selected)-Number(!automatic && a.selected) ||
    (predisposition(b).trading-(b.fatigue||0)*.3)-(predisposition(a).trading-(a.fatigue||0)*.3))[0];
}

export function automaticTradeReady(g: Game, foodCost = 0) {
  const adults = g.state.units.filter(u => u.team === 0 && u.hp > 0 && u.type === "worker" && !isDependent(g,u));
  const away = adults.filter(u => u.envoy || u.expedition || u.scout || u.visit || u.foundingJourney || u.order === "trade" || u.tradeTeam > 0).length;
  return adults.length-away >= 4 && away < Math.max(1,Math.floor(adults.length/4)) &&
    g.tribe(0).food-foodCost >= foodDemand(g)*360;
}

/** Only a person at the meeting can reveal current terms. */
export function recordTradeMeeting(g: Game, team: number, trader: Unit) {
  const goods: ResKind[] = ["food", "wood", "stone", "copper", "iron"];
  const offers: TradeDeal[] = [];
  for (const give of goods) for (const get of goods) {
    if (give === get) continue;
    const quote = quoteShipment(g, team, give, get, 20, trader);
    if (quote.deal) offers.push(quote.deal);
  }
  const report = { team, time: g.state.time, offers };
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
  if (!other || team === 0 || team === 3 || !other.alive || !knownSettlement(g, team))
    return no("Explore their settlement first.");
  if (other.hostile) return no("Agree a truce before trading.");
  if (!visitingTrader && other.tradeCd > 0) return no("Their traders are still on the path.");
  const worth: Record<ResKind, number> = { food: 1, wood: 1.2, stone: 2.2, copper: 4.5, iron: 6.5 };
  if (!Object.hasOwn(worth, give) || !Object.hasOwn(worth, get) || give === get)
    return no("Choose two different goods.");
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100)
    return no("Offer between 1 and 100 goods.");
  const age = Math.min(you.age, other.age);
  if (([give, get].includes("copper") && age < 1) || ([give, get].includes("iron") && age < 2))
    return no("Both settlements need the age that unlocks this metal.");
  if (!visitingTrader && you[give] < amount) return no("Your stores cannot cover that offer.");
  const need = (kind: ResKind) => (kind === "food" ? Math.max(40, g.popNow(team) * 15) : 60);
  const scarcity = (kind: ResKind) =>
    Math.max(0.65, Math.min(1.8, need(kind) / Math.max(10, other[kind])));
  const terms = (g.state.agePicks[2] === "econ" ? 0.95 : 0.86) + Math.max(0, Math.min(1, other.trust || 0)) * 0.18 - other.tension * 0.08;
  const marketQuantity = Math.floor(
    (amount * worth[give] * scarcity(give) * terms * (visitingTrader ? predisposition(visitingTrader).trading * (0.95 + (((visitingTrader.id*31+Math.floor(g.state.time/60)*17)%101)/100)*0.1) : 1)) / (worth[get] * scarcity(get)),
  );
  // At a physical meeting they can offer a smaller surplus rather than reject
  // every proposal that would otherwise touch their protected reserves.
  const surplus=Math.max(0,Math.floor(other[get]-protectedReserve(g,team,get)));
  const quantity=Math.min(200,marketQuantity,surplus);
  if(surplus<1)return no(get==="food"&&calendar(g).phase>=2?"They are keeping food for winter. Ask for different goods.":"They have no surplus of those goods to exchange. Try another resource.");
  if (quantity < 1) return no("Offer more goods for at least one item in return.");
  const issue = shipmentIssue(g, team, {give, giveAmt:amount, get, getAmt:quantity});
  if (issue) return no(issue);
  return {
    deal: { give, giveAmt: amount, get, getAmt: quantity },
    reason:
      quantity<marketQuantity?"They can only offer a smaller surplus. Goods arrive after the return journey.":"Terms reflect their needs, trust and tension. Goods arrive only after the return journey.",
  };
}
/** Home decisions use carried reports, never a live view into a distant stockpile. */
export function reportedQuote(g:Game,team:number,give:ResKind,get:ResKind,amount:number): {deal:TradeDeal|null;reason:string} {
  const no=(reason:string)=>({deal:null,reason});
  const report=g.state.tradeReports?.find(r=>r.team===team);
  if(!report)return no("Send a trade delegation and view its report when it arrives.");
  if(g.state.time-report.time>900)return no("That report is old. Send a trader to learn current terms.");
  if(g.tribe(team)?.hostile)return no("Send a peace delegation before trading.");
  if(!Number.isSafeInteger(amount)||amount<1||amount>100||give===get)return no("Choose different goods and offer 1–100 items.");
  if(g.tribe(0)[give]<amount)return no("Your stores cannot cover that offer.");
  if(g.tribe(team).tradeCd>0)return no("Your previous carrier is still on the path.");
  const offer=report.offers.find(d=>d.give===give&&d.get===get);
  if(!offer)return no("The trader did not report an offer for those goods. Send another delegation or choose other goods.");
  const quantity=Math.floor(offer.getAmt*amount/offer.giveAmt);
  if(quantity<1||quantity>200)return no("Adjust the offered quantity.");
  return {deal:{give,get,giveAmt:amount,getAmt:quantity},reason:`Last reported ${Math.floor((g.state.time-report.time)/60)} minutes ago. Accepting checks availability and sets the promised goods aside.`};
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
  g.banner("Shipment reserved. A carrier leaves to collect the promised goods.", 2.5);
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
