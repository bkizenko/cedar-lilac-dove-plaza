import type { Game } from "./sim";
import type { Building, Unit } from "./types";
import { calendar, foodDemand, reserveSeconds, isDependent } from "./settlement";

export function storehouses(g: Game, team: number) {
  return g.state.buildings.filter(b => b.team === team && b.type === "warehouse" && g.finished(b));
}
export function foodSpoilage(g: Game, team = 0, food = g.tribe(team).food, phase = calendar(g).phase, includeOverflow = true) {
  const stores = storehouses(g, team);
  const sheltered = Math.min(food, stores.length * 160);
  const prepared = Math.min(sheltered, stores.reduce((n, b) => n + (b.storeCare || 0) * 160, 0));
  const season = [1, 1.6, 1.1, 0.65][phase];
  const knowledge = team === 0 && g.state.agePicks[0] === "econ";
  return ((food - sheltered) * 0.00012 + (sheltered - prepared) * 0.00003 + prepared * 0.000006) *
    season * (knowledge ? 0.45 : 1) + (includeOverflow ? Math.max(0, food - g.stockCap(team)) * (knowledge ? 0.01 : 0.02) : 0);
}
export function preservationAvailable(g: Game, b: Building) {
  return b.type === "warehouse" && g.finished(b) && (b.storeCare || 0) < 0.95 &&
    g.tribe(b.team).wood >= 1 && reserveSeconds(g, b.team) >= 240;
}
export function preserveFood(g: Game, u: Unit, b: Building, dt: number) {
  if (isDependent(g, u) || !preservationAvailable(g, b)) {
    u.order = "idle"; u.node = null; u.gatherT = 0; return;
  }
  u.workReason = "Drying and smoking stored food · uses timber";
  u.gatherT += dt;
  if (u.gatherT >= 8) {
    u.gatherT = 0;
    g.tribe(b.team).wood -= 1;
    b.storeCare = Math.min(1, (b.storeCare || 0) + 0.2);
  }
}
export function winterOutlook(g: Game, team = 0) {
  const phase = calendar(g).phase;
  const seconds = phase === 3 ? calendar(g).remaining : 450;
  const demand = foodDemand(g, team, 3);
  // Estimate a no-income winter using current people, weather and maintained stores.
  const survives = (starting: number) => {
    let food = starting;
    for (let t = 0; t < seconds; t += 5) {
      food -= (demand + foodSpoilage(g, team, food, 3, false)) * Math.min(5, seconds - t);
      if (food < 0) return false;
    }
    return true;
  };
  let low = 0, high = Math.max(1, demand * seconds * 2);
  while (!survives(high) && high < 100000) high *= 2;
  for (let i = 0; i < 16; i++) {
    const mid = (low + high) / 2;
    if (survives(mid)) high = mid; else low = mid;
  }
  const needed = Math.ceil(high);
  return { needed, shortage: Math.max(0, Math.ceil(needed - g.tribe(team).food)),
    capacityShortfall: Math.max(0, needed - g.stockCap(team)), seconds };
}
