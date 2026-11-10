import type { Game } from "./sim";
import type { Building, Unit, GameState, Cost } from "./types";
import type { JobCoordinator } from "./jobCoordinator";
import { BUILDINGS } from "./constants";
import { workRuntime } from "./workRuntime";
import { hasTaskCommitment } from "./workCommitments";
import { isDependent, reserveSeconds } from "./settlement";
import { predisposition } from "./people";
import { supplyDrops, supplyApproach, supplyReached } from "./campAnchor";
export const BUILDING_MAINTENANCE = Object.freeze({
  version: 1,
  graceSeconds: 1800,
  timberWearPerSecond: 1 / 500000,
  stoneWearPerSecond: 1 / 1000000,
  minimumCondition: 0.7,
  warningCondition: 0.9,
  rainMultiplier: 1.35,
  stormMultiplier: 2,
  useMultiplier: 1.2,
  secondsPerHp: 0.22,
  minimumWorkSeconds: 8,
  reviewSeconds: 1,
  autoReviewSeconds: 10,
  minimumFoodSeconds: 240,
  minimumTimberReserve: 12,
  minimumStoneReserve: 4,
  packetCapacity: 8,
  packetMinimumSpeed: 0.8,
});
type Point = { x: number; z: number };
export type BuildingCare = {
  version: 1;
  condition: number;
  graceRemaining: number;
  wearSeconds: number;
  totalWear: number;
  lastRate: number;
  wearEnabled: boolean;
  repairedHp: number;
  repairWork: number;
  repairsCompleted: number;
  materialsPaid: { wood: number; stone: number };
};
export type BuildingRepair = {
  version: 1;
  actorId: number | null;
  phase: "queued" | "loading" | "carrying" | "working" | "paused";
  progress: number;
  duration: number;
  referenceMaxHp: number;
  hpBudget: number;
  conditionBudget: number;
  materials: Cost;
  uncollected: Cost;
  delivered: Cost;
  packet: Cost;
  source: Point & { cacheId?: number };
  custodyTeam: number;
  paidBy: number;
  started: number;
  parcel: Point & { kind: "cache" | "ground" | "site" | "carrier"; cacheId?: number };
  blockedReason: string;
};
export type RetainedBuildingRepair = {
  id: number;
  buildingId: number;
  team: number;
  repair: BuildingRepair;
};
const excluded = new Set(["farm", "trench", "bridge"]);
const keys = (v: object, list: string[]) => Object.keys(v).every((k) => list.includes(k));
const positive = (v: unknown, max = 1e12) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= max;
const materialTotal = (v: Cost) => Object.values(v).reduce((sum, n) => sum + (n || 0), 0);
export function repairPacketSpeed(g: Game, u: Unit) {
  if (u.buildingRepairId === undefined) return 1;
  const p = g.state.buildings.find((b) => b.id === u.buildingRepairId)?.repair;
  return p?.parcel.kind === "carrier"
    ? 1 -
        ((1 - BUILDING_MAINTENANCE.packetMinimumSpeed) * materialTotal(p.packet)) /
          BUILDING_MAINTENANCE.packetCapacity
    : 1;
}
const jobId = (b: Building) => `building-repair:${b.id}`;
export function maintenanceMaterial(b: Building) {
  const c = BUILDINGS[b.type];
  return (c.stone || 0) > (c.wood || 0) ? "stone" : "timber";
}
export function buildingCareEnabled(g: Game, b: Building) {
  return (
    !excluded.has(b.type) &&
    g.finished(b) &&
    (g.state.buildingMaintenanceVersion === 1 || b.maintenance?.wearEnabled === true)
  );
}
export function repairQuote(b: Building) {
  const hpBudget = Math.max(0, b.maxHp - b.hp),
    conditionBudget = Math.max(0, 1 - (b.maintenance?.condition ?? 1)),
    fraction = Math.max(hpBudget / b.maxHp, conditionBudget),
    c = BUILDINGS[b.type],
    materials: Cost = {};
  if (fraction <= 1e-8) return null;
  const wood = Math.ceil(Math.max(1, c.wood || 0) * fraction * 0.35),
    stone = Math.ceil((c.stone || 0) * fraction * 0.35);
  if (wood) materials.wood = wood;
  if (stone) materials.stone = stone;
  return {
    hpBudget,
    conditionBudget,
    materials,
    duration: Math.max(
      BUILDING_MAINTENANCE.minimumWorkSeconds,
      hpBudget * BUILDING_MAINTENANCE.secondsPerHp,
    ),
  };
}
function care(g: Game, b: Building) {
  return (b.maintenance ??= {
    version: 1,
    condition: 1,
    graceRemaining: BUILDING_MAINTENANCE.graceSeconds,
    wearSeconds: 0,
    totalWear: 0,
    lastRate: 0,
    wearEnabled: g.state.buildingMaintenanceVersion === 1,
    repairedHp: 0,
    repairWork: 0,
    repairsCompleted: 0,
    materialsPaid: { wood: 0, stone: 0 },
  });
}
function free(g: Game, u: Unit, existing = false) {
  return (
    u.hp > 0 &&
    u.type === "worker" &&
    !isDependent(g, u) &&
    !u.prisoner &&
    !u.militia &&
    !u.emergency &&
    !u.resting &&
    !u.recalled &&
    !u.jobLock &&
    !u.buildOrder &&
    !u.escortId &&
    !u.envoy &&
    !u.visit &&
    !u.trade &&
    !u.scout &&
    !u.expedition &&
    !u.foundingJourney &&
    !u.tributeJourney &&
    u.drill == null &&
    !["occupy", "capture"].includes(u.conflictIntent || "") &&
    u.carry === 0 &&
    !Object.values(u.itemCargo || {}).some((v) => v) &&
    !hasTaskCommitment(u, existing ? "buildingRepairId" : undefined) &&
    ["idle", "hold", "gather"].includes(u.order)
  );
}
function claim(g: Game, b: Building, u: Unit, jobs = workRuntime(g)) {
  const id = jobId(b);
  if (!jobs.job(id))
    jobs.propose({ id, kind: "maintenance", owner: b.team, actors: [u.id], target: b.id });
  return jobs.amend(id, [u.id], [{ key: `building:${b.id}:repair`, amount: 1, capacity: 1 }]);
}
export function rebuildBuildingRepairOwnership(g: Game, jobs: JobCoordinator) {
  for (const b of g.state.buildings) {
    const p = b.repair;
    if (!p || p.phase === "paused" || p.actorId === null) continue;
    const u = g.state.units.find((u) => u.id === p.actorId);
    if (u && u.hp > 0 && u.team === b.team && u.buildingRepairId === b.id) claim(g, b, u, jobs);
  }
}
function release(g: Game, b: Building) {
  const jobs = workRuntime(g);
  jobs.finish(jobId(b), true);
  jobs.forget(jobId(b));
}
export function pauseBuildingRepair(g: Game, u: Unit) {
  if (u.buildingRepairId === undefined) return;
  const b = g.state.buildings.find((b) => b.id === u.buildingRepairId),
    p = b?.repair;
  if (p && p.actorId === u.id) {
    if (p.parcel.kind === "carrier") p.parcel = { kind: "ground", x: u.x, z: u.z };
    p.phase = "paused";
    p.actorId = null;
    p.blockedReason = "Paid materials and completed work retained; resume when ready";
    release(g, b!);
  }
  delete u.buildingRepairId;
  if (u.order === "build") u.order = "hold";
}
function selectActor(g: Game, b: Building, id?: number, manual = false) {
  return g.state.units.find(
    (u) =>
      u.team === b.team &&
      (id === undefined || u.id === id) &&
      free(g, u) &&
      (manual || u.order !== "hold") &&
      (id !== undefined ||
        !(
          u.constructionQueue &&
          !u.constructionQueue.paused &&
          u.constructionQueue.sites.some((id) => {
            const pending = g.state.buildings.find(
              (p) => p.id === id && p.hp > 0 && !g.finished(p),
            );
            return pending && (pending.constructionPriority ?? 1) >= (b.constructionPriority ?? 1);
          })
        )) &&
      !!g.interactionSpot(u, b),
  );
}
export function buildingRepairIssue(g: Game, id: number) {
  const b = g.state.buildings.find((b) => b.id === id);
  if (!b || !g.finished(b) || b.hp <= 0) return "Finish a standing building first";
  if(b.renovation)return "Finish the housing renovation before separate repair work";
  if (excluded.has(b.type)) return "This landscape structure does not use building repairs";
  if (
    b.repair ||
    g.state.retainedBuildingRepairs?.some((c) => c.buildingId === b.id && c.team === b.team)
  )
    return null;
  const q = repairQuote(b);
  if (!q) return "No repairs needed";
  for (const [k, n] of Object.entries(q.materials))
    if ((g.tribe(b.team)[k as "wood" | "stone"] || 0) < n!)
      return `Need ${n} ${k} at an owned cache`;
  if (!supplyDrops(g, b.team).length) return "Need an owned cache for repair materials";
  return null;
}
export function queueBuildingRepair(g: Game, id: number, actorId?: number) {
  const b = g.state.buildings.find((b) => b.id === id),
    issue = buildingRepairIssue(g, id);
  if (!b || issue) return { accepted: false, reason: issue || "Building unavailable" };
  if (actorId !== undefined && b.repair?.actorId !== actorId && !selectActor(g, b, actorId, true))
    return { accepted: false, reason: "Choose a free adult with empty hands and a route" };
  if (!b.repair) {
    const previous = g.state.retainedBuildingRepairs?.find(
      (c) => c.buildingId === b.id && c.team === b.team,
    );
    if (previous) {
      b.repair = previous.repair;
      g.state.retainedBuildingRepairs = g.state.retainedBuildingRepairs!.filter(
        (c) => c !== previous,
      );
    }
  }
  if (b.repair) {
    if (b.repair.actorId !== null)
      return { accepted: true, reason: "The same paid repair is already assigned" };
    if (actorId !== undefined && !selectActor(g, b, actorId, true))
      return { accepted: false, reason: "Choose a free adult with empty hands and a route" };
    if (b.repair.phase === "paused") b.repair.phase = "queued";
    if (!assignBuildingRepair(g, b, actorId, true) && actorId !== undefined)
      return { accepted: false, reason: "Choose a free adult with empty hands and a route" };
    return { accepted: true, reason: "Paid repair queued" };
  }
  const q = repairQuote(b)!;
  const cache = supplyDrops(g, b.team)
    .slice()
    .sort((a, c) => Math.hypot(a.x - b.x, a.z - b.z) - Math.hypot(c.x - b.x, c.z - b.z))[0];
  if (!cache) return { accepted: false, reason: "Need a real material cache" };
  if (actorId !== undefined && !selectActor(g, b, actorId, true))
    return { accepted: false, reason: "Choose a free adult with empty hands and a route" };
  g.spend(b.team, q.materials);
  const maintained = care(g, b);
  maintained.materialsPaid.wood += q.materials.wood || 0;
  maintained.materialsPaid.stone += q.materials.stone || 0;
  b.repair = {
    version: 1,
    actorId: null,
    phase: "queued",
    progress: 0,
    ...q,
    referenceMaxHp: b.maxHp,
    uncollected: { ...q.materials },
    delivered: {},
    packet: {},
    source: { x: cache.x, z: cache.z, ...(cache.kind === "building" ? { cacheId: cache.id } : {}) },
    custodyTeam: b.team,
    paidBy: b.team,
    started: g.state.time,
    parcel: {
      kind: "cache",
      x: cache.x,
      z: cache.z,
      ...(cache.kind === "building" ? { cacheId: cache.id } : {}),
    },
    blockedReason: "Waiting for an available builder",
  };
  assignBuildingRepair(g, b, actorId, true);
  return {
    accepted: true,
    reason: "Materials reserved; a builder must collect them and repair on site",
  };
}
export function assignBuildingRepair(g: Game, b: Building, actorId?: number, manual = false) {
  const p = b.repair;
  if (!p || p.actorId !== null || p.phase === "paused") return false;
  const u = selectActor(g, b, actorId, manual);
  if (!u || !claim(g, b, u)) return false;
  g.interruptMission(u);
  if (!claim(g, b, u)) return false;
  p.actorId = u.id;
  p.phase = p.parcel.kind === "site" && !materialTotal(p.uncollected) ? "working" : "loading";
  p.blockedReason = "";
  u.buildingRepairId = b.id;
  u.order = "hold";
  u.node = null;
  u.target = null;
  return true;
}
export function buildingRepairAI(g: Game, u: Unit, dt: number) {
  if (u.buildingRepairId === undefined) return false;
  const b = g.state.buildings.find((b) => b.id === u.buildingRepairId),
    p = b?.repair;
  if (!b || !p || p.actorId !== u.id || u.team !== b.team || b.hp <= 0) {
    pauseBuildingRepair(g, u);
    return false;
  }
  if (p.phase === "paused") return false;
  if (!claim(g, b, u)) {
    p.blockedReason = "Resident already has other reserved work";
    return true;
  }
  u.order = "build";
  if (p.parcel.kind === "carrier") {
    p.parcel.x = u.x;
    p.parcel.z = u.z;
  }
  if (p.phase === "loading") {
    if (p.parcel.kind === "cache") {
      const d = supplyDrops(g, b.team).find((d) =>
          p.parcel.cacheId !== undefined
            ? d.kind === "building" && d.id === p.parcel.cacheId
            : Math.hypot(d.x - p.parcel.x, d.z - p.parcel.z) < 0.1,
        ),
        spot = d ? supplyApproach(g, u, d) : null;
      if (!d || !spot) {
        p.blockedReason = "Reserved material cache is inaccessible; paid materials retained";
        return true;
      }
      u.tx = spot.x;
      u.tz = spot.z;
      if (!supplyReached(g, u, d, spot)) {
        g.steer(u, dt);
        u.workReason = "Collecting reserved repair materials";
        return true;
      }
    } else {
      u.tx = p.parcel.x;
      u.tz = p.parcel.z;
      if (Math.hypot(u.x - p.parcel.x, u.z - p.parcel.z) > 1.8) {
        g.steer(u, dt);
        u.workReason = "Collecting the actual dropped repair packet";
        return true;
      }
    }
    if (!materialTotal(p.packet)) {
      let room = BUILDING_MAINTENANCE.packetCapacity;
      for (const key of ["wood", "stone"] as const) {
        const amount = Math.min(room, p.uncollected[key] || 0);
        if (amount) {
          p.packet[key] = amount;
          p.uncollected[key] = (p.uncollected[key] || 0) - amount;
          room -= amount;
        }
      }
    }
    p.parcel = { kind: "carrier", x: u.x, z: u.z };
    p.phase = "carrying";
  }
  const spot = g.interactionSpot(u, b);
  if (!spot) {
    p.blockedReason = "No reachable building repair approach";
    return true;
  }
  u.tx = spot.x;
  u.tz = spot.z;
  if (!g.buildingWorkReached(u, b)) {
    g.steer(u, dt);
    u.workReason = "Carrying repair materials to the building";
    workRuntime(g).transition(jobId(b), "traveling", p.progress);
    return true;
  }
  for (const key of ["wood", "stone"] as const) {
    if (p.packet[key]) p.delivered[key] = (p.delivered[key] || 0) + p.packet[key]!;
  }
  p.packet = {};
  if (materialTotal(p.uncollected) > 0) {
    p.parcel = { kind: "cache", ...p.source };
    p.phase = "loading";
    u.workReason = "Returning for the next finite repair load";
    return true;
  }
  p.parcel = { kind: "site", x: b.x, z: b.z };
  p.phase = "working";
  p.blockedReason = "";
  u.workReason = `Repairing ${BUILDINGS[b.type].name}`;
  const work = Math.min(p.duration - p.progress, dt * predisposition(u).strength),
    fraction = work / p.duration;
  p.progress += work;
  const beforeHp = b.hp;
  b.hp = Math.min(b.maxHp, b.hp + p.hpBudget * fraction);
  if (b.maintenance) {
    b.maintenance.repairedHp += b.hp - beforeHp;
    b.maintenance.repairWork += work;
  }
  if (b.maintenance)
    b.maintenance.condition = Math.min(1, b.maintenance.condition + p.conditionBudget * fraction);
  workRuntime(g).transition(jobId(b), "working", p.progress);
  if (p.progress + 1e-8 >= p.duration) {
    if (b.maintenance) b.maintenance.repairsCompleted++;
    workRuntime(g).finish(jobId(b));
    workRuntime(g).forget(jobId(b));
    delete b.repair;
    delete u.buildingRepairId;
    u.order = "idle";
    u.workReason = "Building repair complete";
  }
  return true;
}
const audits = new WeakMap<Game, { state: GameState; next: number; nextAuto: number }>();
export function tickBuildingMaintenance(g: Game, dt: number) {
  const used = new Set(
    (g.state.production?.projects || [])
      .filter((p) => p.phase === "working")
      .map((p) => p.workplace),
  );
  for (const b of g.state.buildings) {
    if (b.hp <= 0) {
      if (b.repair?.actorId !== null && b.repair?.actorId !== undefined) {
        const u = g.state.units.find((u) => u.id === b.repair!.actorId);
        if (u) pauseBuildingRepair(g, u);
        else {
          b.repair.actorId = null;
          b.repair.phase = "paused";
          release(g, b);
        }
      }
      continue;
    }
    if (buildingCareEnabled(g, b)) {
      const m = care(g, b);
      const wearDt = Math.max(0, dt - m.graceRemaining);
      m.graceRemaining = Math.max(0, m.graceRemaining - dt);
      const rate =
        (maintenanceMaterial(b) === "stone"
          ? BUILDING_MAINTENANCE.stoneWearPerSecond
          : BUILDING_MAINTENANCE.timberWearPerSecond) *
        (g.state.weather === "storm"
          ? BUILDING_MAINTENANCE.stormMultiplier
          : g.state.weather === "rain"
            ? BUILDING_MAINTENANCE.rainMultiplier
            : 1) *
        (used.has(b.id) || b.queue.length ? BUILDING_MAINTENANCE.useMultiplier : 1);
      m.lastRate = rate;
      m.wearSeconds += wearDt;
      const wear = Math.min(
        Math.max(0, m.condition - BUILDING_MAINTENANCE.minimumCondition),
        wearDt * rate,
      );
      m.condition -= wear;
      m.totalWear += wear;
      b.hp = Math.max(
        Math.min(b.hp, b.maxHp * BUILDING_MAINTENANCE.minimumCondition),
        b.hp - b.maxHp * wear,
      );
    }
    const p = b.repair;
    if (p && p.actorId !== null) {
      const u = g.state.units.find((u) => u.id === p.actorId);
      if (!u || u.hp <= 0 || u.team !== b.team || u.buildingRepairId !== b.id) {
        if (p.parcel.kind === "carrier")
          p.parcel = { kind: "ground", x: u?.x ?? p.parcel.x, z: u?.z ?? p.parcel.z };
        if (u) delete u.buildingRepairId;
        p.actorId = null;
        p.phase = "queued";
        p.blockedReason = "Replacement builder needed; paid packet retained";
        release(g, b);
      }
    }
  }
  let audit = audits.get(g);
  if (!audit || audit.state !== g.state) {
    audit = { state: g.state, next: 0, nextAuto: 0 };
    audits.set(g, audit);
  }
  if (g.state.time < audit.next) return;
  audit.next = g.state.time + BUILDING_MAINTENANCE.reviewSeconds;
  if (g.state.buildingMaintenanceVersion === 1 && g.state.time >= audit.nextAuto) {
    audit.nextAuto = g.state.time + BUILDING_MAINTENANCE.autoReviewSeconds;
    for (const t of g.state.tribes) {
      if (
        !t.alive ||
        t.id === 3 ||
        (t.id === 0 && !g.state.autoWorkEnabled) ||
        reserveSeconds(g, t.id) < BUILDING_MAINTENANCE.minimumFoodSeconds ||
        g.state.buildings.some((b) => b.team === t.id && b.repair)
      )
        continue;
      const target = g.state.buildings
        .filter(
          (b) =>
            b.team === t.id &&
            b.hp > 0 &&
            g.finished(b) &&
            !excluded.has(b.type) &&
            b.constructionPriority !== 0 &&
            (b.hp < b.maxHp * 0.85 ||
              (b.maintenance?.condition ?? 1) < BUILDING_MAINTENANCE.warningCondition),
        )
        .sort(
          (a, b) =>
            (b.constructionPriority ?? 1) - (a.constructionPriority ?? 1) ||
            a.hp / a.maxHp - b.hp / b.maxHp ||
            a.id - b.id,
        )[0];
      if (!target) continue;
      const candidate = selectActor(g, target);
      if (!candidate) continue;
      const q = repairQuote(target);
      if (
        q &&
        t.wood - (q.materials.wood || 0) >= BUILDING_MAINTENANCE.minimumTimberReserve &&
        t.stone - (q.materials.stone || 0) >= BUILDING_MAINTENANCE.minimumStoneReserve
      )
        queueBuildingRepair(g, target.id, candidate.id);
    }
  }
  const queued = g.state.buildings.filter(
    (b) => b.repair?.phase === "queued" && b.repair.actorId === null,
  );
  queued.sort(
    (a, b) => (b.constructionPriority ?? 1) - (a.constructionPriority ?? 1) || a.id - b.id,
  );
  for (const b of queued) if (b.team !== 0 || g.state.autoWorkEnabled) assignBuildingRepair(g, b);
}
/** Ownership can split without making the conquest fail or moving a parcel.
 * Detached paid claims remain paused at their original physical locations. */
export function settleMaintenanceHandover(
  s: GameState,
  fromTeam: number,
  toTeam: number,
  local: boolean,
  siteIds: Set<number>,
  residentIds: Set<number>,
) {
  for (const retained of s.retainedBuildingRepairs || [])
    if (!local && retained.team === fromTeam) {
      retained.team = toTeam;
      retained.repair.custodyTeam = toTeam;
    }
  for (const b of s.buildings) {
    const p = b.repair;
    if (!p) continue;
    const u = s.units.find((u) => u.id === p.actorId),
      crossed = b.team !== p.custodyTeam;
    const splitCache =
      local &&
      materialTotal(p.uncollected) > 0 &&
      ((siteIds.has(b.id) && (!p.source.cacheId || !siteIds.has(p.source.cacheId))) ||
        (!siteIds.has(b.id) && p.source.cacheId !== undefined && siteIds.has(p.source.cacheId)));
    const splitCarrier =
      local &&
      p.parcel.kind === "carrier" &&
      siteIds.has(b.id) !== residentIds.has(p.actorId ?? -1);
    if (splitCache || splitCarrier) {
      if (p.parcel.kind === "carrier")
        p.parcel = { kind: "ground", x: u?.x ?? p.parcel.x, z: u?.z ?? p.parcel.z };
      if (u) delete u.buildingRepairId;
      p.actorId = null;
      p.phase = "paused";
      p.blockedReason =
        "Ownership separated this paid repair from its physical materials; claim retained at the original cache/packet/site";
      s.retainedBuildingRepairs ??= [];
      if (s.retainedBuildingRepairs.length >= 4096)
        throw new Error("Retained paid repair records are full");
      s.retainedBuildingRepairs.push({
        id: s.nextId++,
        buildingId: b.id,
        team: p.custodyTeam,
        repair: p,
      });
      delete b.repair;
      continue;
    }
    if (crossed) p.custodyTeam = b.team;
    if (p.actorId !== null && (!u || u.team !== b.team)) {
      if (u) delete u.buildingRepairId;
      p.actorId = null;
      p.phase = "queued";
      p.blockedReason = "Paid repair and physical packet remain; choose a same-owner builder";
    }
  }
}
export function setBuildingRepairPriority(g: Game, b: Building, value: 0 | 1 | 2) {
  if (![0, 1, 2].includes(value) || b.hp <= 0) return false;
  b.constructionPriority = value;
  g.workBoard.reset();
  return true;
}
export function validBuildingMaintenance(s: GameState) {
  if (s.buildingMaintenanceVersion !== undefined && s.buildingMaintenanceVersion !== 1)
    return false;
  const actors = new Set<number>();
  const rows = [...s.buildings];
  if (s.retainedBuildingRepairs !== undefined) {
    if (!Array.isArray(s.retainedBuildingRepairs) || s.retainedBuildingRepairs.length > 4096)
      return false;
    const seen = new Set<number>();
    for (const c of s.retainedBuildingRepairs) {
      const target = s.buildings.find((b) => b.id === c?.buildingId);
      if (
        !c ||
        !keys(c, ["id", "buildingId", "team", "repair"]) ||
        !Number.isSafeInteger(c.id) ||
        c.id <= 0 ||
        c.id >= s.nextId ||
        seen.has(c.id) ||
        !target ||
        !Number.isInteger(c.team) ||
        !s.tribes[c.team] ||
        !c.repair ||
        c.repair.phase !== "paused" ||
        c.repair.actorId !== null ||
        c.repair.custodyTeam !== c.team
      )
        return false;
      seen.add(c.id);
      rows.push({ ...target, team: c.team, repair: c.repair });
    }
  }
  for (const b of rows) {
    const m = b.maintenance;
    if (
      b.maintenance !== undefined &&
      (!m ||
        !keys(m, [
          "version",
          "condition",
          "graceRemaining",
          "wearSeconds",
          "totalWear",
          "lastRate",
          "wearEnabled",
          "repairedHp",
          "repairWork",
          "repairsCompleted",
          "materialsPaid",
        ]) ||
        m.version !== 1 ||
        !positive(m.condition, 1) ||
        !positive(m.graceRemaining, BUILDING_MAINTENANCE.graceSeconds) ||
        !positive(m.wearSeconds) ||
        !positive(m.totalWear) ||
        !positive(m.lastRate, 1) ||
        typeof m.wearEnabled !== "boolean" ||
        !positive(m.repairedHp) ||
        !positive(m.repairWork) ||
        !Number.isSafeInteger(m.repairsCompleted) ||
        m.repairsCompleted < 0 ||
        !m.materialsPaid ||
        !keys(m.materialsPaid, ["wood", "stone"]) ||
        !positive(m.materialsPaid.wood) ||
        !positive(m.materialsPaid.stone))
    )
      return false;
    const p = b.repair;
    if (p === undefined) continue;
    if (
      !p ||
      !keys(p, [
        "version",
        "actorId",
        "phase",
        "progress",
        "duration",
        "referenceMaxHp",
        "hpBudget",
        "conditionBudget",
        "materials",
        "uncollected",
        "delivered",
        "packet",
        "source",
        "custodyTeam",
        "paidBy",
        "started",
        "parcel",
        "blockedReason",
      ]) ||
      p.version !== 1 ||
      !["queued", "loading", "carrying", "working", "paused"].includes(p.phase) ||
      !positive(p.progress) ||
      !positive(p.duration, 1e6) ||
      p.duration <= 0 ||
      p.progress > p.duration ||
      !positive(p.referenceMaxHp, 1e8) ||
      p.referenceMaxHp <= 0 ||
      !positive(p.hpBudget, p.referenceMaxHp) ||
      !positive(p.conditionBudget, 1) ||
      p.custodyTeam !== b.team ||
      !Number.isInteger(p.paidBy) ||
      !s.tribes[p.paidBy] ||
      !positive(p.started, s.time) ||
      typeof p.blockedReason !== "string" ||
      p.blockedReason.length > 400 ||
      !p.materials ||
      !keys(p.materials, ["wood", "stone"]) ||
      !Object.values(p.materials).some((v) => v! > 0) ||
      Object.values(p.materials).some((v) => !positive(v, 10000)) ||
      !p.parcel ||
      !keys(p.parcel, ["kind", "x", "z", "cacheId"]) ||
      !["cache", "ground", "site", "carrier"].includes(p.parcel.kind) ||
      ![p.parcel.x, p.parcel.z].every(
        (v) =>
          typeof v === "number" &&
          Number.isFinite(v) &&
          Math.abs(v) < (s.worldOptions?.size || 1040) / 2,
      ) ||
      (p.parcel.cacheId !== undefined &&
        (!Number.isSafeInteger(p.parcel.cacheId) ||
          p.parcel.cacheId <= 0 ||
          p.parcel.cacheId >= s.nextId))
    )
      return false;
    if (
      !p.source ||
      !keys(p.source, ["x", "z", "cacheId"]) ||
      ![p.source.x, p.source.z].every(
        (v) =>
          typeof v === "number" &&
          Number.isFinite(v) &&
          Math.abs(v) < (s.worldOptions?.size || 1040) / 2,
      ) ||
      (p.source.cacheId !== undefined &&
        (!Number.isSafeInteger(p.source.cacheId) ||
          p.source.cacheId <= 0 ||
          p.source.cacheId >= s.nextId)) ||
      [p.uncollected, p.delivered, p.packet].some(
        (v) =>
          !v ||
          !keys(v, ["wood", "stone"]) ||
          Object.values(v).some((n) => !positive(n, 10000) || !Number.isInteger(n)),
      ) ||
      materialTotal(p.packet) > BUILDING_MAINTENANCE.packetCapacity ||
      (["wood", "stone"] as const).some(
        (k) =>
          (p.uncollected[k] || 0) + (p.delivered[k] || 0) + (p.packet[k] || 0) !==
          (p.materials[k] || 0),
      )
    )
      return false;
    if (
      !m ||
      (p.phase === "working" &&
        (materialTotal(p.uncollected) > 0 ||
          materialTotal(p.packet) > 0 ||
          p.parcel.kind !== "site")) ||
      (p.phase === "carrying" && (p.parcel.kind !== "carrier" || materialTotal(p.packet) <= 0))
    )
      return false;
    if (p.actorId !== null) {
      const u = s.units.find((u) => u.id === p.actorId);
      if (!u || u.hp <= 0 || u.team !== b.team || u.buildingRepairId !== b.id || actors.has(u.id))
        return false;
      actors.add(u.id);
    } else if (!["queued", "paused"].includes(p.phase)) return false;
    if (p.parcel.kind === "carrier" && p.actorId === null) return false;
  }
  return s.units.every(
    (u) =>
      u.buildingRepairId === undefined ||
      s.buildings.some((b) => b.id === u.buildingRepairId && b.repair?.actorId === u.id),
  );
}
