import type { Game } from "./sim";
import { knownSettlement, tradeCarrier, automaticTradeReady } from "./barter";
import { sendDelegation } from "./delegations";

const nextCheck = new WeakMap<Game, number>();

/** Trade focus staffs approved routes and learns offers; it never invents purchases. */
export function tickTradeFocus(g: Game) {
  if (g.state.laborPolicy !== "trade" || g.state.time < (nextCheck.get(g) || 0)) return;
  nextCheck.set(g, g.state.time + 20);
  // At least three adults remain at home; one inquiry at a time prevents a
  // forgotten policy from emptying the village into the surrounding world.
  if (!automaticTradeReady(g) || g.state.units.some(u => u.team === 0 && u.hp > 0 && u.envoy)) return;
  const carrier = tradeCarrier(g,true);
  if (!carrier) return;
  const partners = g.state.tribes.filter(t => t.id > 0 && t.id !== 3 && t.alive && !t.hostile && knownSettlement(g,t.id))
    .map(t => ({ team: t.id, time: g.state.tradeReports?.find(r => r.team === t.id)?.time ?? -Infinity }))
    .filter(t => !Number.isFinite(t.time) || g.state.time-t.time >= 900)
    .sort((a,b) => a.time-b.time);
  for (const partner of partners) if (sendDelegation(g,partner.team,"trade",carrier)) return;
}
