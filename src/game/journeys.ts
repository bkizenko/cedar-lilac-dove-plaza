import type { Game } from "./sim";
import type { Unit } from "./types";
import { foodDemand, FOOD_PER_PERSON_SECOND, reserveSeconds } from "./settlement";
import { predisposition } from "./people";
export function beginExpedition(g: Game, u: Unit) {
  if (u.expedition) return true;
  const t = g.tribe(u.team),
    available = Math.max(0, t.food - foodDemand(g, u.team) * 90);
  const food = Math.min(24, Math.floor(available));
  if (food < 6) return false;
  t.food -= food;
  u.expedition = { food, returning: false, forage: 0 };
  return true;
}
export function expeditionAI(g: Game, u: Unit, dt: number) {
  const e = u.expedition;
  if (!e) return false;
  const halls = g.state.buildings.filter(
    (b) => b.team === u.team && b.type === "townhall" && g.finished(b),
  );
  const home =
    halls.find((b) => b.id === u.homeHall) ||
    halls.sort((a, b) => Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z))[0];
  if (!home) return false;
  const distance = Math.hypot(u.x - home.x, u.z - home.z);
  if (distance < Math.max(home.w, home.d) * 0.55 + 3 && (e.returning || u.order !== "explore")) {
    g.tribe(u.team).food += e.food;
    u.expedition = undefined;
    if (e.returning) {
      u.order = "idle";
      u.node = null;
      u.workReason = "Expedition home — unused provisions returned";
    }
    return false;
  }
  e.food = Math.max(0, e.food - dt * FOOD_PER_PERSON_SECOND * predisposition(u).appetite);
  if (e.returning && (u.order !== "move" || Math.hypot(u.tx - home.x, u.tz - home.z) > 1))
    e.returning = false;
  if (u.order !== "explore" && !e.returning) return false;
  const threat = g.state.units.some(
    (p) => p.hp > 0 && g.isFoe(u.team, p.team) && Math.hypot(p.x - u.x, p.z - u.z) < 20,
  );
  if (!threat && !e.returning && e.food > 2 && e.food < 12) {
    const patch = g.state.forage.find((n) => n.amount >= 1 && Math.hypot(n.x - u.x, n.z - u.z) < 5);
    if (patch) {
      e.forage += dt;
      u.workReason = "Foraging nearby wild food for the journey";
      if (e.forage >= 8) {
        e.forage -= 8;
        patch.amount -= 1;
        e.food += 1;
      }
      if (e.forage > 0) return true;
    }
  }
  const returnNeed = Math.max(2, (distance / Math.max(1, u.speed)) * FOOD_PER_PERSON_SECOND * 1.4);
  if (e.food <= returnNeed || threat || u.stuckT > 8) e.returning = true;
  const night = g.clockState().period === "Night";
  if (night && !threat && distance > 18) {
    u.fatigue = Math.max(0, (u.fatigue || 0) - dt / 15);
    u.workReason = "Night camp — resting with journey provisions";
    return true;
  }
  if (e.returning) {
    u.order = "move";
    u.tx = home.x;
    u.tz = home.z;
    u.workReason = "Returning before journey provisions run out";
    g.steer(u, dt);
    return true;
  }
  return false;
}
export function routineRest(g: Game, u: Unit, dt: number) {
  if (
    u.type !== "worker" ||
    u.foundingJourney ||
    u.expedition ||
    u.envoy ||
    u.visit ||
    u.scout ||
    u.recalled ||
    u.emergency ||
    u.pillage >= 0 ||
    !["idle", "gather", "build", "return", "hold"].includes(u.order)
  )
    return false;
  if (
    u.order === "return" &&
    u.carryType === "food" &&
    u.carry > 0 &&
    reserveSeconds(g, u.team) < 120
  )
    return false;
  const resting =
    (g.clockState().period === "Night" && !g.state.nightWork) || g.state.weather === "storm";
  if (!resting) {
    if (/^(Sleeping|Sheltering|Seeking shelter)/.test(u.workReason || "")) u.workReason = undefined;
    u.fatigue = Math.min(1, (u.fatigue || 0) + dt / 180);
    return false;
  }
  const shelter = g.state.buildings
    .filter(
      (b) => b.team === u.team && g.finished(b) && ["hut", "townhall", "keep"].includes(b.type),
    )
    .sort((a, b) => Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z))[0];
  if (!shelter) return false;
  if (Math.hypot(u.x - shelter.x, u.z - shelter.z) > Math.max(shelter.w, shelter.d) * 0.55 + 2) {
    u.tx = shelter.x;
    u.tz = shelter.z;
    g.steer(u, dt);
    u.workReason = "Seeking shelter for rest";
    return true;
  }
  u.fatigue = Math.max(0, (u.fatigue || 0) - dt / 20);
  u.workReason =
    g.state.weather === "storm" ? "Sheltering from the storm" : "Sleeping near the hearth";
  if (!u.sickUntil && (u.hunger || 0) < 10) u.hp = Math.min(u.maxHp, u.hp + (dt * u.maxHp) / 900);
  return true;
}
