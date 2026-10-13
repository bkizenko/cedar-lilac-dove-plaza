import type { Game } from "./sim";
import type { Critter, CritterKind, Unit } from "./types";
import { GATHER_WORK_RATE } from "./constants";
import { reserveSeconds } from "./settlement";
import { carryingCapacity } from "./haulage";
import { climateAt } from "./ecology";
import { predisposition } from "./people";

export type Carcass = { meat: number; diedAt: number };
export type HuntableCritter = Critter & { carcass?: Carcass };
export const CARCASS_MEAT = { deer: 24, boar: 32, goat: 16, bird: 0 } as const;

/** Old dead wildlife has no carcass field: loading cannot recreate eaten meat. */
export function carcassStateValid(value: unknown, species: CritterKind, hp: number, now: number) {
  if (value === undefined) return true;
  if (!value || typeof value !== "object" || Array.isArray(value) || hp > 0 || species === "bird") return false;
  const c = value as Carcass;
  return Number.isFinite(c.meat) && c.meat >= 0 && c.meat <= CARCASS_MEAT[species] &&
    Number.isFinite(c.diedAt) && c.diedAt >= 0 && c.diedAt <= now;
}

function carcassLifetime(g: Game, c: Critter) {
  const climate = climateAt(g, c.x, c.z);
  const warmth = Math.max(0.5, 0.65 + Math.max(-8, climate.temperature) / 15);
  return Math.max(100, Math.min(720, 360 / (warmth * (0.8 + climate.humidity * 0.4))));
}

export function carcassAvailable(g: Game, c: HuntableCritter) {
  return c.hp <= 0 && c.species !== "bird" && !!c.carcass && c.carcass.meat > 0 &&
    g.state.time >= c.carcass.diedAt && g.state.time - c.carcass.diedAt < carcassLifetime(g, c);
}

export function huntable(g: Game, c: HuntableCritter) {
  return c.species !== "bird" && (c.hp > 0 || carcassAvailable(g, c));
}

/** Call before wildlife recruitment. Usable remains persist; spoiled meat never returns. */
export function updateCarcass(g: Game, c: HuntableCritter) {
  if (c.hp > 0 || !c.carcass) return false;
  if (!carcassAvailable(g, c)) c.carcass.meat = 0;
  return c.carcass.meat > 0;
}

export function wildlifeFleeSpeed(c: Critter) {
  const base = c.species === "deer" ? 4 : c.species === "boar" ? 2.8 : 2.5;
  return base * (0.6 + 0.4 * Math.max(0, Math.min(1, c.hp / Math.max(1, c.maxHp))));
}

function finishTask(g: Game, u: Unit, reason: string) {
  u.node = null; u.gatherT = 0;
  u.order = u.carry > 0 ? "return" : "idle";
  u.workReason = reason;
  g.workBoard.reset();
}

/** Civilian hunting and butchery share normal paths, finite cargo and physical delivery. */
export function workerHuntAI(g: Game, u: Unit, dt: number): boolean {
  if (u.order !== "gather" || !u.node || !("species" in u.node) || u.hp <= 0) return false;
  const c = u.node as HuntableCritter;
  if (!huntable(g, c)) {
    finishTask(g, u, "The carcass is exhausted or spoiled — finding other food");
    return true;
  }
  if (u.carry > 0 && (u.carryType !== "food" || (u.carryFood || "provisions") !== "meat")) {
    u.order = "return"; u.workReason = "Delivering the current load before hunting";
    return true;
  }
  if (u.carry >= carryingCapacity(u, "food")) {
    u.order = "return"; u.workReason = "Carrying the hunting catch home";
    return true;
  }
  if (u.team === 0 && (c.hp > 0 ? !g.visibleAt(c.x, c.z) : !g.exploredAt(c.x, c.z))) {
    finishTask(g, u, "Lost sight of the herd — exploring to find food again");
    return true;
  }
  if (u.team !== 0 && Math.hypot(c.x - g.campOf(u.team).x, c.z - g.campOf(u.team).z) > 75) {
    finishTask(g, u, "Herd beyond safe gathering range — returning to local work");
    return true;
  }
  const armed = ["spearman", "archer", "swordsman"].includes(u.type);
  const alive = c.hp > 0;
  const range = alive ? u.type === "archer" ? 8 : armed ? 6 : 5 : 1.8;
  const urgency = reserveSeconds(g,u.team) < 240 ? 1.25 : 1;
  const period = alive ? (armed ? 1.8 : 2.2) / 2 : 1.8 / (GATHER_WORK_RATE * urgency);
  // Ready the next throw while stalking, but never accumulate remote butchery.
  if (alive) u.gatherT = Math.min(period, u.gatherT + dt * predisposition(u).strength);
  const inReach = () => Math.hypot(c.x - u.x, c.z - u.z) <= range;
  if (!inReach()) {
    const spot = g.nearestWalk(u, c.x, c.z);
    if (!g.walkable(spot.x, spot.z) || !g.workBoard.connected(g, u.x, u.z, spot.x, spot.z)) {
      u.blockedTask = c.id; u.retryWorkAt = g.state.time + 30;
      finishTask(g, u, "Hunting route blocked — seeking reachable food");
      return true;
    }
    u.tx = spot.x; u.tz = spot.z;
    u.workReason = alive ? `Stalking ${c.species}` : "Walking to butcher the hunting catch";
    if (g.steer(u, dt) && !inReach()) {
      u.blockedTask = c.id; u.retryWorkAt = g.state.time + 30;
      finishTask(g, u, "Cannot reach the hunting catch — finding another food source");
    }
    return true;
  }
  u.facing = Math.atan2(c.x - u.x, c.z - u.z);
  u.stride += dt * 8;
  if (!alive) u.gatherT += dt * predisposition(u).strength;
  u.workReason = alive ? `Hunting ${c.species}` : `Butchering ${c.species} · ${Math.ceil(c.carcass!.meat)} meat remains`;
  if (u.gatherT < period) return true;
  u.gatherT = 0;
  if (alive) {
    c.hp = Math.max(0, c.hp - (armed ? 1.5 : 1));
    if (u.team === 0) g.onSfx("hit");
    if (c.hp === 0) {
      // Only this live-to-dead transition creates meat. Old corpses, loading,
      // repeated task calls and multiple workers cannot award it twice.
      c.carcass = { meat: CARCASS_MEAT[c.species], diedAt: g.state.time };
      c.vx = 0; c.vz = 0; c.wanderT = 600;
      g.workBoard.reset();
      g.addBurst(c.x, c.y + 0.3, c.z, "#8a5a3a", 6);
      if (u.team === 0) g.addFloater(c.x, c.y + 1.8, c.z, `${CARCASS_MEAT[c.species]} meat to carry home`, "#efe4b0");
    }
    return true;
  }
  const carcass = c.carcass!;
  const taken = Math.min(3, carcass.meat, Math.max(0, carryingCapacity(u, "food") - u.carry));
  carcass.meat -= taken;
  u.carry += taken; u.carryType = "food"; u.carryFood = "meat";
  if (u.carry >= carryingCapacity(u, "food") || (u.carry >= 8 && reserveSeconds(g,u.team) < 90) || carcass.meat === 0) {
    u.order = "return"; u.workReason = "Carrying the hunting catch home";
    if (carcass.meat === 0) g.workBoard.reset();
  }
  return true;
}
