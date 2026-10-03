import type { Game } from "./sim";
import { predisposition } from "./people";
import type { Unit, ResKind, TradeDeal } from "./types";
import { isDependent, foodDemand, calendar } from "./settlement";

export function knownSettlement(g: Game, team: number) {
  return g.state.buildings.some(
    (b) => b.team === team && b.type === "townhall" && b.hp > 0 && g.exploredAt(b.x, b.z),
  );
}
export function tradeCarrier(g: Game) {
  return g.state.units.find(
    (u) =>
      u.team === 0 &&
      u.type === "worker" &&
      u.hp > 0 &&
      !isDependent(g, u) &&
      !u.emergency &&
      !u.envoy &&
      u.carry === 0 &&
      (u.selected ? u.order !== "trade" : ["idle", "hold", "gather"].includes(u.order)),
  );
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
  const {phase, remaining} = calendar(g);
  const winterFood = foodDemand(g, team, 3);
  const foodReserve = phase === 2 ? winterFood * 450 + foodDemand(g, team) * remaining :
    phase === 3 ? winterFood * Math.max(120, remaining) : foodDemand(g, team) * 240;
  const afterFood = other.food - (deal.get === "food" ? deal.getAmt : 0) + (deal.give === "food" ? deal.giveAmt : 0);
  if (deal.get === "food" && afterFood < foodReserve)
    return phase >= 2 ? "They are keeping food for winter. Offer another resource or ask for different goods." :
      "They need that food for their people. Ask for different goods.";
  const reserve = deal.get === "wood" ? 24 : deal.get === "stone" ? (other.age >= 1 ? 12 : 4) : 0;
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
  const terms = (g.state.agePicks[2] === "econ" ? 0.95 : 0.76) + Math.max(0, Math.min(1, other.trust || 0)) * 0.18 - other.tension * 0.08;
  const quantity = Math.floor(
    (amount * worth[give] * scarcity(give) * terms * (visitingTrader ? predisposition(visitingTrader).trading * (0.95 + (((visitingTrader.id*31+Math.floor(g.state.time/60)*17)%101)/100)*0.1) : 1)) / (worth[get] * scarcity(get)),
  );
  if (quantity < 1) return no("Offer more goods for at least one item in return.");
  const issue = shipmentIssue(g, team, {give, giveAmt:amount, get, getAmt:quantity});
  if (issue) return no(issue);
  return {
    deal: { give, giveAmt: amount, get, getAmt: quantity },
    reason:
      "Terms reflect their needs, trust and tension. Goods arrive only after the return journey.",
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
  return {deal:{give,get,giveAmt:amount,getAmt:quantity},reason:`Last reported ${Math.floor((g.state.time-report.time)/60)} minutes ago. The partner may revise or refuse these terms on arrival.`};
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
  g.banner("A carrier leaves with your offer.", 2.5);
  return true;
}

/** Send a proposal without consulting distant stocks. It is negotiated only on arrival. */
export function sendOffer(g:Game,team:number,give:ResKind,get:ResKind,amount:number,requested:number) {
  const goods:ResKind[]=["food","wood","stone","copper","iron"];
  if(!knownSettlement(g,team)||![1,2].includes(team)||!goods.includes(give)||!goods.includes(get)||give===get||
    !Number.isSafeInteger(amount)||amount<1||amount>100||!Number.isSafeInteger(requested)||requested<1||requested>200)return false;
  if((give==="iron"||get==="iron")&&g.tribe(0).age<2)return false;
  if((give==="copper"||get==="copper")&&g.tribe(0).age<1)return false;
  const u=tradeCarrier(g);if(!u||!g.dispatchTrade(u,{give,get,giveAmt:amount,getAmt:requested},team))return false;
  u.customOffer=true;g.banner("Your trader carries the proposal. They may accept, counter or refuse at the meeting.",4);return true;
}
