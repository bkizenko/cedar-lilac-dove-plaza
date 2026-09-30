import type { Game } from "./sim";
import type { ResKind, TradeDeal } from "./types";
import { isDependent } from "./settlement";

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
      u.carry === 0 &&
      (u.selected ? u.order !== "trade" : ["idle", "hold", "gather"].includes(u.order)),
  );
}
export function quoteShipment(
  g: Game,
  team: number,
  give: ResKind,
  get: ResKind,
  amount: number,
): { deal: TradeDeal | null; reason: string } {
  const you = g.tribe(0),
    other = g.tribe(team);
  const no = (reason: string) => ({ deal: null, reason });
  if (!other || team === 0 || team === 3 || !other.alive || !knownSettlement(g, team))
    return no("Explore their settlement first.");
  if (other.hostile) return no("Agree a truce before trading.");
  if (other.tradeCd > 0) return no("Their traders are still on the path.");
  const worth: Record<ResKind, number> = { food: 1, wood: 1.2, stone: 2.2, copper: 4.5, iron: 6.5 };
  if (!Object.hasOwn(worth, give) || !Object.hasOwn(worth, get) || give === get)
    return no("Choose two different goods.");
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100)
    return no("Offer between 1 and 100 goods.");
  const age = Math.min(you.age, other.age);
  if (([give, get].includes("copper") && age < 1) || ([give, get].includes("iron") && age < 2))
    return no("Both settlements need the age that unlocks this metal.");
  if (you[give] < amount) return no("Your stores cannot cover that offer.");
  const need = (kind: ResKind) => (kind === "food" ? Math.max(40, g.popNow(team) * 15) : 60);
  const scarcity = (kind: ResKind) =>
    Math.max(0.65, Math.min(1.8, need(kind) / Math.max(10, other[kind])));
  const terms = 0.76 + Math.max(0, Math.min(1, other.trust || 0)) * 0.18 - other.tension * 0.08;
  const quantity = Math.floor(
    (amount * worth[give] * scarcity(give) * terms) / (worth[get] * scarcity(get)),
  );
  if (quantity < 1) return no("Offer more goods for at least one item in return.");
  if (other[get] < quantity)
    return no("They cannot supply that quantity. Try a smaller offer or different goods.");
  return {
    deal: { give, giveAmt: amount, get, getAmt: quantity },
    reason:
      "Terms reflect their reserves, trust and tension. Goods arrive only after the return journey.",
  };
}
export function proposeShipment(
  g: Game,
  team: number,
  give: ResKind,
  get: ResKind,
  amount: number,
) {
  const quote = quoteShipment(g, team, give, get, amount);
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
