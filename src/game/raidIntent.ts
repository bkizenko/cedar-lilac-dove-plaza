import {witnessRaidDefense,noteRaidDefenseAttempt} from './warPrestige';
import {markStolenLoad,stolenMarkRoom} from './stolenCargo';
import type { Game } from "./sim";
import type { Unit, Building, GameState, FoodKind } from "./types";
import { difficulty } from "./difficulty";
import { mulberry32 } from "./rng";
import { foodInventory, takeFoodLot } from "./pantry";
import { carryingCapacity } from "./haulage";
import { isDependent } from "./settlement";
import { hasTaskCommitment } from "./workCommitments";
import { acceptPrisonerSurrender, provisionPrisoner, PRISONER_RULES } from "./captivity";
export const RAID_INTENT_RULES = Object.freeze({
  version: 1,
  localSightMeters: 36,
  observationSeconds: 1,
  collectionSeconds: 3,
  scoutSeconds: 60,
  limitedRaidSeconds: 150,
  maximumObservations: 64,
  maximumHistory: 256,
  maximumStrandedPeople: 12,
  custodyCampMeters: 80,
  captiveFood: 2,
  baseLoot: 4,
  maximumLoot: 8,
});
export type RaidIntent = "scout" | "loot" | "capture" | "destructive" | "annihilation";
export type RaidPlan = {
  version: 1;
  bandId: number;
  actorId: number;
  selectedIntent: RaidIntent;
  intent: RaidIntent;
  selectedAt: number;
  initialBand: number;
  severity: number;
  roll: number;
  targetId?: number;
  strandedAt?: number;
  workSeconds: number;
  reason: string;
  seenSites: number[];
  seenDefenders: number[];
  seenResidents: number[];
  observedAt: number;
  reviewAt: number;
  metrics: {
    observations: number;
    lootTaken: number;
    lootWorkSeconds: number;
    captives: number;
    withdrawals: number;
  };
};
export type RaidIntentHistory = {
  actorId: number;
  time: number;
  outcome: "returned" | "lost" | "stranded";
  cargo: number;
  deliveredCaptives?: number;
  plan: RaidPlan;
};
const intents = ["scout", "loot", "capture", "destructive", "annihilation"] as const;
const liveArmed = (u: Unit) =>
  u.hp > 0 && ((u.type !== "worker" && u.type !== "leader") || u.militia);
const activeAttack = (actor: Unit, target: Unit) =>
  target.order === "attack" &&
  target.target?.team === actor.team &&
  target.target.hp > 0 &&
  Math.hypot(target.x - target.target.x, target.z - target.target.z) <=
    Math.max(6, target.range + 3);
export function raidThreateningDefender(actor: Unit, target: Unit) {
  return liveArmed(target) || activeAttack(actor, target);
}
export function chooseRaidIntent(
  severity: number,
  count: number,
  wave: number,
  roll: number,
): RaidIntent {
  if (count <= 2 && wave <= 1) return "scout";
  const annihilation = Math.min(0.05, Math.max(0, severity - 0.9) * 0.035),
    destructive = 0.04 + severity * 0.1,
    capture = 0.12 + severity * 0.06;
  return roll < annihilation
    ? "annihilation"
    : roll < annihilation + destructive
      ? "destructive"
      : roll < annihilation + destructive + capture
        ? "capture"
        : "loot";
}
export function createRaidPlan(
  g: Game,
  bandId: number,
  count: number,
  wave: number,
  actorId: number,
): RaidPlan {
  const severity = Math.min(
      2,
      Math.max(0.25, difficulty(g).band + (g.state.conflict === "dangerous" ? 0.15 : 0)),
    ),
    roll = mulberry32(g.state.seed ^ bandId ^ 0x61ad20)(),
    intent = chooseRaidIntent(severity, count, wave, roll);
  return {
    version: 1,
    bandId,
    actorId,
    selectedIntent: intent,
    intent,
    selectedAt: g.state.time,
    initialBand: count,
    severity,
    roll,
    workSeconds: 0,
    reason: "",
    seenSites: [],
    seenDefenders: [],
    seenResidents: [],
    observedAt: g.state.time,
    reviewAt: g.state.time,
    metrics: { observations: 0, lootTaken: 0, lootWorkSeconds: 0, captives: 0, withdrawals: 0 },
  };
}
export function copyRaidPlan(p: RaidPlan): RaidPlan {
  return {
    ...p,
    seenSites: [...p.seenSites],
    seenDefenders: [...p.seenDefenders],
    seenResidents: [...p.seenResidents],
    metrics: { ...p.metrics },
  };
}
export function raidMayTargetBuilding(actor: Unit, target: Building) {
  const p = actor.seaRaid?.plan;
  if (!p || p.intent === "annihilation" || p.intent === "destructive") return true;
  return (
    actor.seaRaid?.phase === "retreat" && ["gate", "palisade", "stonewall"].includes(target.type)
  );
}
export function raidMayTargetCivilian(actor: Unit, target: Unit) {
  const p = actor.seaRaid?.plan;
  return !p || p.intent === "annihilation" || liveArmed(target) || activeAttack(actor, target);
}
function observe(g: Game, u: Unit, p: RaidPlan) {
  if (g.state.time < p.reviewAt) return;
  p.reviewAt = g.state.time + RAID_INTENT_RULES.observationSeconds;
  let n = 0;
  for (const b of g.state.buildings)
    if (
      b.hp > 0 &&
      g.isFoe(u.team, b.team) &&
      Math.hypot(b.x - u.x, b.z - u.z) <= RAID_INTENT_RULES.localSightMeters &&
      !p.seenSites.includes(b.id) &&
      p.seenSites.length < RAID_INTENT_RULES.maximumObservations
    ) {
      p.seenSites.push(b.id);
      n++;
    }
  for (const v of g.state.units)
    if (
      (liveArmed(v) || activeAttack(u, v)) &&
      g.isFoe(u.team, v.team) &&
      Math.hypot(v.x - u.x, v.z - u.z) <= RAID_INTENT_RULES.localSightMeters &&
      !p.seenDefenders.includes(v.id) &&
      p.seenDefenders.length < RAID_INTENT_RULES.maximumObservations
    ) {
      p.seenDefenders.push(v.id);
      n++;
    }
  for (const v of g.state.units)
    if (
      v.hp > 0 &&
      !liveArmed(v) &&
      !activeAttack(u, v) &&
      g.isFoe(u.team, v.team) &&
      Math.hypot(v.x - u.x, v.z - u.z) <= RAID_INTENT_RULES.localSightMeters &&
      !p.seenResidents.includes(v.id) &&
      p.seenResidents.length < RAID_INTENT_RULES.maximumObservations
    ) {
      p.seenResidents.push(v.id);
      n++;
    }
  if (n) {
    p.metrics.observations += n;
    p.observedAt = g.state.time;
  }
}
export function observeRaidIntent(g: Game, u: Unit) {
  if (u.seaRaid?.plan) {observe(g, u, u.seaRaid.plan);witnessRaidDefense(g,u);}
}
function withdraw(u: Unit, p: RaidPlan, reason: string) {
  if (u.seaRaid!.phase !== "retreat") p.metrics.withdrawals++;
  u.seaRaid!.phase = "retreat";
  u.target = null;
  p.reason = reason;
  u.workReason = reason;
}
function stores(g: Game, u: Unit, p: RaidPlan) {
  return g.state.buildings
    .filter(
      (b) =>
        b.hp > 0 &&
        g.finished(b) &&
        g.isFoe(u.team, b.team) &&
        ["warehouse", "townhall"].includes(b.type) &&
        p.seenSites.includes(b.id) &&
        !!g.interactionSpot(u, b),
    )
    .sort((a, b) => Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z));
}
function loadGoods(g: Game, u: Unit, p: RaidPlan, dt: number, foodOnly = false) {
  let b =
    p.targetId === undefined
      ? undefined
      : g.state.buildings.find(
          (b) =>
            b.id === p.targetId &&
            b.hp > 0 &&
            g.isFoe(u.team, b.team) &&
            ["warehouse", "townhall"].includes(b.type),
        );
  if (!b || !g.interactionSpot(u, b)) {
    b = stores(g, u, p)[0];
    p.targetId = b?.id;
    p.workSeconds = 0;
  }
  if (!b) return false;
  const spot = g.interactionSpot(u, b);
  if (!spot) return false;
  u.target = null;
  u.order = "move";
  u.tx = spot.x;
  u.tz = spot.z;
  u.workReason = "Approaching the store";
  if (!g.buildingWorkReached(u, b)) {
    g.steer(u, dt);
    return true;
  }
  u.order = "hold";
  noteRaidDefenseAttempt(g,u,b.team);
  p.workSeconds += dt;
  p.metrics.lootWorkSeconds += dt;
  u.workReason = "Taking supplies";
  if (p.workSeconds < RAID_INTENT_RULES.collectionSeconds) return true;
  // Stocks are inspected only now, at the actual physical cache.
  const t = g.tribe(b.team),
    quota = Math.min(
      RAID_INTENT_RULES.maximumLoot,
      RAID_INTENT_RULES.baseLoot + Math.max(0, Math.floor((p.severity - 1) * 4)),
    ),
    kind = (
      foodOnly ? (["food"] as const) : (["food", "wood", "stone", "copper", "iron"] as const)
    ).find((k) => t[k] > 0);
  if (!kind) {
    p.targetId = undefined;
    p.reason = "The reached store has no usable goods";
    withdraw(u, p, p.reason);
    return true;
  }
  if(!stolenMarkRoom(g,u)){u.workReason="Waiting for stolen cargo provenance capacity";return true;}
  let amount = Math.min(quota, carryingCapacity(u, kind), t[kind]);
  let lot: FoodKind | undefined;
  if (kind === "food") {
    const available = foodInventory(t);
    lot = (Object.keys(available) as FoodKind[]).find((k) => available[k] > 0);
    if (!lot) return true;
    amount = Math.min(amount, available[lot]);
    if (!takeFoodLot(g, b.team, lot, amount)) return true;
  } else t[kind] -= amount;
  u.carry = amount;
  u.carryType = kind;
  u.carryFood = lot;
  markStolenLoad(g,u,b.team,p.bandId);
  witnessRaidDefense(g,u);
  p.metrics.lootTaken += amount;
  p.workSeconds = 0;
  if (!foodOnly) withdraw(u, p, "Leaving with supplies");
  return true;
}
const supplySearch = new WeakMap<Unit, {band: number; x: number; z: number}>();
function searchForRaidSupplies(g: Game, u: Unit, p: RaidPlan, dt: number) {
 const raid = u.seaRaid!;
 const prior = supplySearch.get(u);
 let search = prior?.band === p.bandId ? prior : undefined;
 if (!search && (Math.hypot(u.x-raid.goalX,u.z-raid.goalZ)>2 && u.stuckT<=6)) {
  u.tx=raid.goalX;u.tz=raid.goalZ;
 } else {
  if (!search) {
   const start = (Math.imul(u.id, 2654435761) >>> 0) / 4294967296 * Math.PI * 2;
   for (let i=0;i<8;i++) {
    const angle=start+i*Math.PI/4, radius=14+(u.id%5)*2;
    const x=raid.goalX+Math.cos(angle)*radius,z=raid.goalZ+Math.sin(angle)*radius;
    if(!g.walkable(x,z)||!g.workBoard.connected(g,u.x,u.z,x,z))continue;
    search={band:p.bandId,x,z};supplySearch.set(u,search);u.stuckT=0;break;
   }
  }
  if(!search||Math.hypot(u.x-search.x,u.z-search.z)<1.4||u.stuckT>6) {
   withdraw(u,p,"No reachable supplies found after searching the area");
   return true;
  }
  u.tx=search.x;u.tz=search.z;
 }
 u.order="move";
 u.workReason="Looking for a reachable supply store";
 g.steer(u,dt);
 return true;
}

/** Handles only new nonlethal plans; legacy and destructive parties retain combat. */
export function limitedRaidAI(g: Game, u: Unit, dt: number) {
  const p = u.seaRaid?.plan;
  if (!p) return false;
  observe(g, u, p);
  witnessRaidDefense(g,u);
  if (p.intent === "destructive" || p.intent === "annihilation") return false;
  u.target = null;
  if (p.intent === "scout") {
    if (
      p.seenSites.length ||
      p.seenResidents.length ||
      p.seenDefenders.length ||
      g.state.time - p.selectedAt >= RAID_INTENT_RULES.scoutSeconds
    ) {
      withdraw(u, p, "Scouts are returning");
      return true;
    }
    u.order = "move";
    u.tx = u.seaRaid!.goalX;
    u.tz = u.seaRaid!.goalZ;
    u.workReason = "Scouting";
    g.steer(u, dt);
    return true;
  }
  if (!u.campTrip && g.state.time - p.selectedAt >= RAID_INTENT_RULES.limitedRaidSeconds) {
    withdraw(u, p, "Withdrawing");
    return true;
  }
  if (p.intent === "capture") {
    const camp = g.state.buildings.find(
      (b) =>
        b.team === u.team &&
        b.raiderCamp &&
        g.finished(b) &&
        Math.hypot(b.x - u.x, b.z - u.z) <= RAID_INTENT_RULES.custodyCampMeters &&
        !!g.interactionSpot(u, b),
    );
    if (!camp) {
      p.intent = "loot";
      p.reason = "No nearby reachable raider camp for physical custody; seeking goods instead";
    } else {
      const victim = g.state.units
        .filter(
          (v) =>
            v.hp > 0 &&
            g.isFoe(u.team, v.team) &&
            v.type === "worker" &&
            !v.militia &&
            !v.prisoner &&
            !v.boat &&
            v.shelterId === undefined &&
            !isDependent(g, v) &&
            !hasTaskCommitment(v) &&
            Math.hypot(v.x - u.x, v.z - u.z) <= RAID_INTENT_RULES.localSightMeters &&
            Math.hypot(v.x - camp.x, v.z - camp.z) <= RAID_INTENT_RULES.custodyCampMeters &&
            g.workBoard.connected(g, u.x, u.z, v.x, v.z),
        )
        .sort((a, b) => Math.hypot(a.x - u.x, a.z - u.z) - Math.hypot(b.x - u.x, b.z - u.z))[0];
      if (
        victim &&
        ((u.carryType === "food" && u.carry >= RAID_INTENT_RULES.captiveFood) ||
          (victim.carryType === "food" && victim.carry >= RAID_INTENT_RULES.captiveFood))
      ) {
        u.order = "move";
        u.tx = victim.x;
        u.tz = victim.z;
        u.workReason = "Demanding surrender";
        if (Math.hypot(victim.x - u.x, victim.z - u.z) > PRISONER_RULES.surrenderRadiusMeters) {
          g.steer(u, dt);
          return true;
        }
        u.order = "hold";
        noteRaidDefenseAttempt(g,u,victim.team);
        const result = acceptPrisonerSurrender(g, victim, u.team);
        if (result.accepted) {
          if (u.carryType === "food") provisionPrisoner(g, victim.id, u.id);
          if (victim.carryType === "food") provisionPrisoner(g, victim.id, victim.id);
          p.metrics.captives++;
          withdraw(u, p, "Taking a captive back to camp");
        } else p.reason = result.reason;
        return true;
      }
      if (!u.carry && loadGoods(g, u, p, dt, true)) return true;
    }
  }
  if (u.carry > 0) {
    withdraw(u, p, "Carrying supplies home");
    return true;
  }
  if (loadGoods(g, u, p, dt)) return true;
  return searchForRaidSupplies(g,u,p,dt);
}
export function finishRaidPlan(g: Game, u: Unit, outcome: "returned" | "lost" | "stranded") {
  const p = u.seaRaid?.plan;
  if (!p) return;
  const list = (g.state.raidIntentHistory ??= []);
  if (list.some((r) => r.actorId === u.id && r.plan.bandId === p.bandId && r.outcome === outcome))
    return;
  const deliveredCaptives=outcome==='returned'&&u.escortId&&g.state.units.some(v=>v.id===u.escortId&&v.prisoner?.phase==='custody'&&v.prisoner.captorTeam===3)?1:0;
  list.push({ actorId: u.id, time: g.state.time, outcome, cargo: u.carry, ...(deliveredCaptives?{deliveredCaptives}:{}),plan: copyRaidPlan(p) });
  if (list.length > RAID_INTENT_RULES.maximumHistory)
    list.splice(0, list.length - RAID_INTENT_RULES.maximumHistory);
}
export function markRaidStranded(g: Game, u: Unit) {
  const p = u.seaRaid?.plan;
  if (!p || u.seaRaid?.phase !== "retreat" || Math.hypot(u.x - u.seaRaid.x, u.z - u.seaRaid.z) >= 5)
    return;
  if (p.strandedAt === undefined) p.strandedAt = g.state.time;
  finishRaidPlan(g, u, "stranded");
}
export function raidIntentReport(g: Game) {
  return {
    active: g.state.units
      .filter((u) => u.seaRaid?.plan)
      .map((u) => ({
        actorId: u.id,
        phase: u.seaRaid!.phase,
        plan: copyRaidPlan(u.seaRaid!.plan!),
      })),
    recent: (g.state.raidIntentHistory || []).map((r) => ({ ...r, plan: copyRaidPlan(r.plan) })),
  };
}
const finite = (n: unknown, max = 1e12) =>
  typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= max;
const keys = (v: object, allowed: string[]) => Object.keys(v).every((k) => allowed.includes(k));
function validPlan(s: GameState, p: RaidPlan, at = s.time) {
  const id = (n: unknown) => Number.isSafeInteger(n) && Number(n) > 0 && Number(n) < s.nextId;
  if (
    !p ||
    !keys(p, [
      "version",
      "bandId",
      "actorId",
      "selectedIntent",
      "intent",
      "selectedAt",
      "initialBand",
      "severity",
      "roll",
      "targetId",
      "strandedAt",
      "workSeconds",
      "reason",
      "seenSites",
      "seenDefenders",
      "seenResidents",
      "observedAt",
      "reviewAt",
      "metrics",
    ]) ||
    p.version !== 1 ||
    !id(p.bandId) ||
    !id(p.actorId) ||
    !intents.includes(p.intent) ||
    !intents.includes(p.selectedIntent) ||
    !finite(p.selectedAt, at) ||
    !Number.isSafeInteger(p.initialBand) ||
    p.initialBand < 1 ||
    p.initialBand > 36 ||
    !finite(p.severity, 2) ||
    p.severity < 0.25 ||
    !finite(p.roll, 1) ||
    (p.targetId !== undefined && !id(p.targetId)) ||
    (p.strandedAt !== undefined && !finite(p.strandedAt, at)) ||
    !finite(p.workSeconds, 4) ||
    typeof p.reason !== "string" ||
    p.reason.length > 400 ||
    !finite(p.observedAt, at) ||
    p.observedAt < p.selectedAt ||
    !finite(p.reviewAt, at + RAID_INTENT_RULES.observationSeconds + 0.001) ||
    ![p.seenSites, p.seenDefenders, p.seenResidents].every(
      (a) =>
        Array.isArray(a) &&
        a.length <= RAID_INTENT_RULES.maximumObservations &&
        new Set(a).size === a.length &&
        a.every(id),
    ) ||
    !p.metrics ||
    !keys(p.metrics, ["observations", "lootTaken", "lootWorkSeconds", "captives", "withdrawals"]) ||
    !(["observations", "lootTaken", "lootWorkSeconds", "captives", "withdrawals"] as const).every(
      (k) => finite(p.metrics[k]),
    ) ||
    !Number.isInteger(p.metrics.observations) ||
    p.metrics.observations !==
      p.seenSites.length + p.seenDefenders.length + p.seenResidents.length ||
    !Number.isInteger(p.metrics.captives) ||
    !Number.isInteger(p.metrics.withdrawals) ||
    p.metrics.withdrawals > 1 ||
    p.metrics.lootTaken > RAID_INTENT_RULES.maximumLoot ||
    p.metrics.captives > 1
  )
    return false;
  return true;
}
export function validRaidIntents(s: GameState) {
  for (const u of s.units)
    if (
      u.seaRaid?.plan !== undefined &&
      (!validPlan(s, u.seaRaid.plan) ||
        u.seaRaid.plan.actorId !== u.id ||
        (u.seaRaid.plan.strandedAt !== undefined &&
          (u.seaRaid.phase !== "retreat" ||
            u.boat ||
            Math.hypot(u.x - u.seaRaid.x, u.z - u.seaRaid.z) >= 5)))
    )
      return false;
  if (s.raidIntentHistory !== undefined) {
    if (
      !Array.isArray(s.raidIntentHistory) ||
      s.raidIntentHistory.length > RAID_INTENT_RULES.maximumHistory
    )
      return false;
    const seen = new Set<string>();
    for (const r of s.raidIntentHistory) {
      const key = `${r?.actorId}:${r?.plan?.bandId}:${r?.outcome}`;
      if (
        !r ||
        !keys(r, ["actorId", "time", "outcome", "cargo", "deliveredCaptives", "plan"]) ||
        !Number.isSafeInteger(r.actorId) ||
        r.actorId <= 0 ||
        r.actorId >= s.nextId ||
        !finite(r.time, s.time) ||
        !r.plan ||
        r.plan.actorId !== r.actorId ||
        r.time < r.plan.selectedAt ||
        !["returned", "lost", "stranded"].includes(r.outcome) ||
        !finite(r.cargo, 24) ||
        (r.deliveredCaptives!==undefined&&(r.deliveredCaptives!==1||r.outcome!=="returned"||r.plan.metrics.captives<1)) ||
        !validPlan(s, r.plan, r.time) ||
        seen.has(key)
      )
        return false;
      seen.add(key);
    }
  }
  return true;
}
