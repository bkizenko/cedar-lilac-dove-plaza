import type { Game } from "./sim";
import type { Unit, Building, GameState } from "./types";
import type { JobCoordinator } from "./jobCoordinator";
import { workRuntime } from "./workRuntime";
import { hasTaskCommitment } from "./workCommitments";
import { findPath } from "./navigation";
import { createRaidPlan } from "./raidIntent";
import { loadScoutProvisions, returnScoutPackAtCache } from "./scoutProvisions";
import { UNITS } from "./constants";
export const FINITE_CAMP_RULES = Object.freeze({
  version: 1,
  sightMeters: 22,
  observationSeconds: 2,
  reportLifetimeSeconds: 300,
  maximumSites: 12,
  travelSeconds: 180,
  homeMealSeconds: 90,
  homeWaterSeconds: 120,
  outwardSeconds: 55,
  onsiteSeconds: 150,
  returnReserveSeconds: 30,
  maximumTravelSeconds: 600,
  maximumOutboundPeople: 12,
  dispatchIntervalSeconds: 120,
  waterLowLiters: 8,
  waterReadyLiters: 18,
});
export type CampReport = {
  version: 1;
  campId: number;
  siteId: number;
  team: number;
  x: number;
  z: number;
  observedAt: number;
};
export type CampEconomy = {
  version: 1;
  knownSites: CampReport[];
  lastDispatchAt: number;
  departures: number;
  returns: number;
  lost: number;
  foodPaid: number;
  waterPaid: number;
  foodUsed: number;
  waterUsed: number;
};
export type CampSupport = {
  version: 1;
  actorId: number;
  campId: number;
  started: number;
  damage: number;
  range: number;
  rof: number;
};
export type CampTrip = {
  version: 1;
  id: number;
  actorId: number;
  campId: number;
  started: number;
  paidFood: number;
  paidWater: number;
  foodUsed: number;
  waterUsed: number;
};
const economy = (b: Building) =>
  b.campEconomy ??
  (b.campEconomy = {
    version: 1,
    knownSites: [],
    lastDispatchAt: 0,
    departures: 0,
    returns: 0,
    lost: 0,
    foodPaid: 0,
    waterPaid: 0,
    foodUsed: 0,
    waterUsed: 0,
  });
const home = (g: Game, id: number) =>
  g.state.buildings.find((b) => b.id === id && b.team === 3 && b.raiderCamp && g.finished(b));
const healthy = (u: Unit) =>
  u.hp > u.maxHp * 0.6 &&
  !u.prisoner &&
  !u.escortId &&
  !u.boat &&
  !u.haulage &&
  !u.recalled &&
  !u.jobLock &&
  !u.target &&
  !u.carry &&
  !u.militia &&
  !hasTaskCommitment(u);
const underAttack = (g: Game, u: Unit, b: Building) =>
  g.state.units.some(
    (e) =>
      e.hp > 0 &&
      g.isFoe(3, e.team) &&
      (e.target === u || e.target === b) &&
      Math.hypot(e.x - u.x, e.z - u.z) < 20,
  );
const guards = (g: Game, b: Building) =>
  g.state.units.filter(
    (u) => u.hp > 0 && u.team === 3 && u.homeCamp === b.id && u.type === "spearman" && healthy(u),
  );
const nearbyGuard = (g: Game, b: Building, actor: Unit) =>
  guards(g, b).some((p) => p !== actor && Math.hypot(p.x - b.x, p.z - b.z) <= 12);
const moveHome = (g: Game, u: Unit, b: Building, dt: number) => {
  const p = g.interactionSpot(u, b);
  if (!p) {
    u.order = "hold";
    u.workReason = "Camp entrance blocked — keeping the same person and supplies";
    return false;
  }
  if (g.buildingWorkReached(u, b)) return true;
  u.tx = p.x;
  u.tz = p.z;
  u.order = "move";
  u.node = null;
  u.target = null;
  g.steer(u, dt);
  return false;
};
const jobId = (u: Unit) => `camp-trip:${u.campTrip!.id}`;
function claim(g: Game, u: Unit, jobs = workRuntime(g)) {
  const trip = u.campTrip;
  if (!trip || u.hp <= 0 || u.team !== 3 || u.prisoner) return false;
  const id = jobId(u);
  if (!jobs.job(id))
    jobs.propose({ id, kind: "camp-trip", owner: 3, actors: [u.id], target: trip.campId });
  return jobs.amend(id, [u.id], [{ key: `camp:${trip.campId}:outbound`, amount: 1, capacity: FINITE_CAMP_RULES.maximumOutboundPeople }]);
}
export function rebuildCampOwnership(g: Game, jobs: JobCoordinator) {
  for (const u of g.state.units) if (u.campTrip) claim(g, u, jobs);
}
/** Measure the actual bounded ground route before paying a pack. The same
 * budget covers outward travel, useful time at the objective and a real return. */
export function campTripBudget(g:Game,u:Unit,report:CampReport){
 if(g.state.walkDirty)g.rebuildWalk();
 const target=g.state.buildings.find(b=>b.id===report.siteId&&b.hp>0),spot=target?g.interactionSpot(u,target):g.walkable(report.x,report.z)?{x:report.x,z:report.z}:null;
 if(!spot)return null;
 const width=Math.sqrt(g.walk.length),cell=g.world.size/width,index=(x:number,z:number)=>Math.floor((z+g.world.size/2)/cell)*width+Math.floor((x+g.world.size/2)/cell);
 const route=findPath(g.walk,width,index(u.x,u.z),index(spot.x,spot.z));if(!route)return null;
 let length=0,x=u.x,z=u.z;for(const id of route){const nx=(id%width+.5)*cell-g.world.size/2,nz=(Math.floor(id/width)+.5)*cell-g.world.size/2;length+=Math.hypot(nx-x,nz-z);x=nx;z=nz;}length+=Math.hypot(spot.x-x,spot.z-z);
 const speed=g.travelSpeed(u)*.75;if(!Number.isFinite(speed)||speed<=0)return null;
 const walkingSeconds=Math.ceil(length/speed),outwardSeconds=Math.max(FINITE_CAMP_RULES.outwardSeconds,walkingSeconds+FINITE_CAMP_RULES.onsiteSeconds),budgetSeconds=Math.max(FINITE_CAMP_RULES.travelSeconds,walkingSeconds*2+FINITE_CAMP_RULES.onsiteSeconds+FINITE_CAMP_RULES.returnReserveSeconds);
 return budgetSeconds<=FINITE_CAMP_RULES.maximumTravelSeconds?{walkingSeconds,outwardSeconds,budgetSeconds,length}:null;
}
/** A camp sends an existing body, never a replacement spawn. Paid packs use the
 * same actual food/water consumption and cache-return executor as scouts. */
export function beginCampTrip(g: Game, u: Unit, report: CampReport) {
  const b = u.homeCamp === undefined ? undefined : home(g, u.homeCamp);
  if (
    g.state.finiteRaiderCampVersion !== 1 ||
    !b ||
    u.type !== "spearman" ||
    !healthy(u) ||
    underAttack(g, u, b) ||
    !nearbyGuard(g, b, u) ||
    !g.buildingWorkReached(u, b) ||
    g.state.conflict === "quiet" ||
    g.state.time - report.observedAt > FINITE_CAMP_RULES.reportLifetimeSeconds ||
    report.campId !== b.id ||
    !b.campEconomy?.knownSites.some((p) => JSON.stringify(p) === JSON.stringify(report))
  )
    return false;
  if (g.state.units.filter((p) => p.campTrip?.campId === b.id && p.hp > 0).length>=FINITE_CAMP_RULES.maximumOutboundPeople) return false;
  const budget=campTripBudget(g,u,report);if(!budget)return false;
  const id = g.state.nextId,
    trip: CampTrip = {
      version: 1,
      id,
      actorId: u.id,
      campId: b.id,
      started: g.state.time,
      paidFood: 0,
      paidWater: 0,
      foodUsed: 0,
      waterUsed: 0,
    };
  u.campTrip = trip;
  if (!claim(g, u)) {
    workRuntime(g).finish(jobId(u), true);
    workRuntime(g).forget(jobId(u));
    delete u.campTrip;
    return false;
  }
  if (
    !loadScoutProvisions(g, u, {
      budgetSeconds: budget.budgetSeconds,
      homeMealSeconds: FINITE_CAMP_RULES.homeMealSeconds,
      homeWaterSeconds: FINITE_CAMP_RULES.homeWaterSeconds,
    })
  ) {
    workRuntime(g).finish(jobId(u), true);
    workRuntime(g).forget(jobId(u));
    delete u.campTrip;
    return false;
  }
  g.id();
  trip.paidFood = u.scoutProvisions!.food;
  trip.paidWater = u.scoutProvisions!.water;
  const plan = createRaidPlan(g, id, 1, 2, u.id);
  plan.selectedIntent = plan.intent = "loot";
  plan.reason =
    "A real camp patrol reported this store; finite provisions and a defender are retained";
  u.seaRaid = {
    plan,
    x: u.x,
    z: u.z,
    goalX: report.x,
    goalZ: report.z,
    phase: "raid",
    thinkAt: 0,
    departAt: g.state.time + budget.outwardSeconds,
  };
  u.homeCamp = undefined;
  u.campReport = undefined;
  u.node = null;
  u.target = null;
  u.order = "move";
  g.invalidateRoute(u);
  const e = economy(b);
  e.lastDispatchAt = g.state.time;
  e.departures++;
  e.foodPaid += trip.paidFood;
  e.waterPaid += trip.paidWater;
  return true;
}
export function finishCampTrip(g: Game, u: Unit, returned = false) {
  const trip = u.campTrip;
  if (!trip) return true;
  const paidPack = u.scoutProvisions,
    foodUsed = paidPack?.foodUsed ?? trip.foodUsed,
    waterUsed = paidPack?.waterUsed ?? trip.waterUsed;
  if (returned && !returnScoutPackAtCache(g, u)) return false;
  const b = g.state.buildings.find((b) => b.id === trip.campId && b.raiderCamp),
    e = b ? economy(b) : undefined;
  if (e) {
    e[returned ? "returns" : "lost"]++;
    e.foodUsed += foodUsed;
    e.waterUsed += waterUsed;
  }
  workRuntime(g).finish(jobId(u), !returned);
  workRuntime(g).forget(jobId(u));
  delete u.campTrip;
  return true;
}
export function campTripAI(g: Game, u: Unit) {
  if (!u.campTrip) return;
  claim(g, u);
  const p = u.scoutProvisions,
    r = u.seaRaid;
  if (!r) return;
  // A dated outward deadline leaves the remaining paid pack for the actual
  // return. It does not promise a route that geography cannot provide.
  if (
    r.phase === "raid" &&
    (g.state.time >= r.departAt ||
      !p ||
      p.food <= 0.001 ||
      (g.state.survivalVersion === 1 && p.water <= 0.001))
  ) {
    const reason = g.state.time >= r.departAt
      ? "Withdrawing: outward journey deadline reached"
      : !p ? "Withdrawing: travel provisions are missing"
      : p.food <= 0.001 ? "Withdrawing: carried travel food exhausted"
      : "Withdrawing: carried drinking water exhausted";
    if(r.plan){r.plan.reason=reason;r.plan.metrics.withdrawals++;}
    r.phase = "retreat";
    u.workReason = reason;
    u.target = null;
    u.node = null;
    u.seaRaidReturn = undefined;
  }
}
/** One actual guard temporarily puts its spear in the communal cache, hauls
 * water through the ordinary worker executor, then retrieves a real spear. */
export function campSupportAI(g: Game, u: Unit, dt: number) {
  const role = u.campSupport;
  if (!role || u.team !== 3 || u.prisoner) return false;
  const b = home(g, role.campId);
  if (!b) {
    u.order = "hold";
    u.workReason = "Camp lost — the unarmed survivor keeps any actual water cargo";
    return true;
  }
  if (u.waterWork) {
    if (u.waterWork.paused && u.waterWork.liters > 0) {
      u.order = "return";
      u.workReason = "Returning the retained actual water load before resuming support";
      return false;
    }
    u.order = u.waterWork.paused ? "idle" : "hold";
    u.workReason = u.waterWork.paused
      ? "Retained water job awaiting automatic resumption"
      : "Hauling actual drinking water to camp";
    // An empty interrupted water job retains its site/progress. It must not
    // fall through into unrelated production or ordinary resource assignment.
    return true;
  }
  if (!moveHome(g, u, b, dt)) return true;
  const stock = g.tribe(3);
  if ((stock.survival?.waterLiters ?? 0) < FINITE_CAMP_RULES.waterReadyLiters) {
    u.order = "idle";
    u.workReason = "Camp water carrier — waiting for an actual freshwater collection job";
    return true;
  }
  if (stock.spears < 1) {
    u.order = "idle";
    u.workReason = "The stored spear is unavailable — remaining unarmed";
    return true;
  }
  stock.spears--;
  u.type = "spearman";
  u.dmg = role.damage;
  u.range = role.range;
  u.rof = role.rof;
  u.homeCamp = b.id;
  delete u.campSupport;
  u.order = "hold";
  u.workReason = "Actual water delivered; the same guard retrieved a stored spear";
  return true;
}
/** Reports travel with their observer. A remote camp never reads enemy stocks,
 * unseen buildings or an observer's new knowledge until that body returns. */
export function finiteCampGuardAI(g: Game, u: Unit, dt: number) {
  if (
    g.state.finiteRaiderCampVersion !== 1 ||
    u.homeCamp === undefined ||
    u.team !== 3 ||
    u.type !== "spearman" ||
    !healthy(u)
  )
    return false;
  const b = home(g, u.homeCamp);
  if (!b || underAttack(g, u, b)) return false;
  const r = u.campReport;
  if (r) {
    if (!moveHome(g, u, b, dt)) return true;
    const e = economy(b);
    e.knownSites = e.knownSites
      .filter(
        (p) =>
          p.siteId !== r.siteId &&
          g.state.time - p.observedAt <= FINITE_CAMP_RULES.reportLifetimeSeconds,
      )
      .slice(-(FINITE_CAMP_RULES.maximumSites - 1));
    e.knownSites.push({ ...r });
    delete u.campReport;
    u.order = "hold";
  }
  if ((g.tribe(3).survival?.waterLiters ?? Infinity) < FINITE_CAMP_RULES.waterLowLiters) {
    if (!moveHome(g, u, b, dt)) return true;
    if (!nearbyGuard(g, b, u)) {
      u.order = "hold";
      u.workReason = "Waiting for the other actual guard before collecting water";
      return true;
    }
    u.campSupport = {
      version: 1,
      actorId: u.id,
      campId: b.id,
      started: g.state.time,
      damage: u.dmg,
      range: u.range,
      rof: u.rof,
    };
    g.tribe(3).spears++;
    u.type = "worker";
    u.dmg = UNITS.worker.dmg;
    u.range = UNITS.worker.range;
    u.rof = UNITS.worker.rof;
    u.homeCamp = undefined;
    u.node = null;
    u.target = null;
    u.order = "idle";
    return true;
  }
  const away = g.state.units.some(
    (p) =>
      p.hp > 0 && (p.campTrip?.campId === b.id || (p.campSupport?.campId === b.id && p.team === 3)),
  );
  if (away) {
    if (!moveHome(g, u, b, dt)) return true;
    u.order = "hold";
    u.workReason = "The remaining real guard watches camp while the other resident travels";
    return true;
  }
  const e = b.campEconomy;
  if (
    e &&
    g.state.time - e.lastDispatchAt >= FINITE_CAMP_RULES.dispatchIntervalSeconds &&
    e.knownSites.some((p) => g.state.time - p.observedAt <= FINITE_CAMP_RULES.reportLifetimeSeconds)
  ) {
    if (!moveHome(g, u, b, dt)) return true;
    const report = e.knownSites.find(
      (p) => g.state.time - p.observedAt <= FINITE_CAMP_RULES.reportLifetimeSeconds,
    );
    if (report && beginCampTrip(g, u, report)) return true;
  }
  if (g.state.time >= (u.campObserveAt ?? 0)) {
    u.campObserveAt = g.state.time + FINITE_CAMP_RULES.observationSeconds;
    const site = g.state.buildings.find(
      (p) =>
        g.isFoe(3, p.team) &&
        g.finished(p) &&
        ["warehouse", "townhall"].includes(p.type) &&
        Math.hypot(p.x - u.x, p.z - u.z) < (g.isNight() ? 12 : FINITE_CAMP_RULES.sightMeters) &&
        !e?.knownSites.some(
          (r) =>
            r.siteId === p.id &&
            g.state.time - r.observedAt < FINITE_CAMP_RULES.reportLifetimeSeconds,
        ),
    );
    if (site) {
      u.campReport = {
        version: 1,
        campId: b.id,
        siteId: site.id,
        team: site.team,
        x: site.x,
        z: site.z,
        observedAt: g.state.time,
      };
      return true;
    }
  }
  return false;
}
export function validFiniteCamps(s: GameState) {
  if (s.finiteRaiderCampVersion !== undefined && s.finiteRaiderCampVersion !== 1) return false;
  const id = (n: unknown) => Number.isSafeInteger(n) && Number(n) > 0 && Number(n) < s.nextId,
    finite = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0,
    half = (s.worldOptions?.size ?? 1040) / 2;
  const keys = (v: object, allowed: string[]) => Object.keys(v).every((k) => allowed.includes(k));
  const report = (r: CampReport) =>
    r &&
    keys(r, ["version", "campId", "siteId", "team", "x", "z", "observedAt"]) &&
    r.version === 1 &&
    id(r.campId) &&
    id(r.siteId) &&
    Number.isInteger(r.team) &&
    r.team >= 0 &&
    r.team < 3 &&
    Number.isFinite(r.x) &&
    Math.abs(r.x) <= half &&
    Number.isFinite(r.z) &&
    Math.abs(r.z) <= half &&
    finite(r.observedAt) &&
    r.observedAt <= s.time;
  const trips = new Set<number>(),
    camps = new Map<number,number>(),paid=new Map<number,{food:number;water:number}>();
  for (const u of s.units) {
    if (
      u.campObserveAt !== undefined &&
      (s.finiteRaiderCampVersion !== 1 ||
        !finite(u.campObserveAt) ||
        u.campObserveAt > s.time + FINITE_CAMP_RULES.observationSeconds)
    )
      return false;
    if (
      u.campReport !== undefined &&
      (s.finiteRaiderCampVersion !== 1 ||
        !report(u.campReport) ||
        u.team !== 3 ||
        u.homeCamp !== u.campReport.campId)
    )
      return false;
    const role = u.campSupport;
    if (u.campSupport !== undefined && !role) return false;
    if (
      role &&
      (s.finiteRaiderCampVersion !== 1 ||
        !role ||
        role.version !== 1 ||
        !keys(role, ["version", "actorId", "campId", "started", "damage", "range", "rof"]) ||
        role.actorId !== u.id ||
        !id(role.campId) ||
        !finite(role.started) ||
        role.started > s.time ||
        !["damage", "range", "rof"].every(
          (k) =>
            finite(role[k as keyof CampSupport]) && Number(role[k as keyof CampSupport]) <= 100,
        ) ||
        role.damage < 1 ||
        role.range < 1 ||
        role.range > 30 ||
        role.rof < 0.05 ||
        role.rof > 30 ||
        (u.team === 3 && u.type !== "worker"))
    )
      return false;
    const t = u.campTrip;
    if (u.campTrip !== undefined && !t) return false;
    if (t) {
      if (
        t.version !== 1 ||
        !keys(t, [
          "version",
          "id",
          "actorId",
          "campId",
          "started",
          "paidFood",
          "paidWater",
          "foodUsed",
          "waterUsed",
        ]) ||
        !id(t.id) ||
        t.actorId !== u.id ||
        !id(t.campId) ||
        u.team !== 3 ||
        !u.seaRaid ||
        u.seaRaid.plan?.bandId !== t.id ||
        u.seaRaid.plan?.selectedIntent !== "loot" ||
        u.seaRaid.plan?.selectedAt !== t.started ||
        !u.scoutProvisions ||
        u.homeCamp !== undefined ||
        role ||
        !finite(t.started) ||
        t.started > s.time ||
        s.finiteRaiderCampVersion !== 1 ||
        !finite(t.foodUsed) ||
        !finite(t.waterUsed) ||
        t.foodUsed > t.paidFood ||
        t.waterUsed > t.paidWater ||
        Math.abs(t.foodUsed - u.scoutProvisions.foodUsed) > 1e-6 ||
        Math.abs(t.waterUsed - u.scoutProvisions.waterUsed) > 1e-6 ||
        !finite(t.paidFood) ||
        t.paidFood > 100 ||
        !finite(t.paidWater) ||
        t.paidWater > 20 ||
        Math.abs(u.scoutProvisions.food + u.scoutProvisions.foodUsed - t.paidFood) > 1e-6 ||
        Math.abs(u.scoutProvisions.water + u.scoutProvisions.waterUsed - t.paidWater) > 1e-6 ||
        trips.has(t.id) ||
        (camps.get(t.campId)||0)>=FINITE_CAMP_RULES.maximumOutboundPeople
      )
        return false;
      trips.add(t.id);
      camps.set(t.campId,(camps.get(t.campId)||0)+1);
      const total=paid.get(t.campId)||{food:0,water:0};total.food+=t.paidFood;total.water+=t.paidWater;paid.set(t.campId,total);
    }
  }
  for (const b of s.buildings) {
    const e = b.campEconomy,active=camps.get(b.id)||0,committed=paid.get(b.id);
    if(active&&(!e||active+e.returns+e.lost>e.departures||committed!.food>e.foodPaid+1e-6||committed!.water>e.waterPaid+1e-6))return false;
    if (b.campEconomy !== undefined && !e) return false;
    if (
      e &&
      (s.finiteRaiderCampVersion !== 1 ||
        !b.raiderCamp ||
        e.version !== 1 ||
        !keys(e, [
          "version",
          "knownSites",
          "lastDispatchAt",
          "departures",
          "returns",
          "lost",
          "foodPaid",
          "waterPaid",
          "foodUsed",
          "waterUsed",
        ]) ||
        !Array.isArray(e.knownSites) ||
        e.knownSites.length > FINITE_CAMP_RULES.maximumSites ||
        !e.knownSites.every(report) ||
        e.knownSites.some((r) => r.campId !== b.id) ||
        new Set(e.knownSites.map((r) => r.siteId)).size !== e.knownSites.length ||
        ![
          "lastDispatchAt",
          "departures",
          "returns",
          "lost",
          "foodPaid",
          "waterPaid",
          "foodUsed",
          "waterUsed",
        ].every((k) => finite(e[k as keyof CampEconomy])) ||
        e.lastDispatchAt > s.time ||
        e.returns + e.lost > e.departures ||
        !["departures", "returns", "lost"].every((k) =>
          Number.isSafeInteger(e[k as keyof CampEconomy]),
        ) ||
        e.foodUsed > e.foodPaid + 1e-6 ||
        e.waterUsed > e.waterPaid + 1e-6)
    )
      return false;
  }
  return true;
}

/** Read-only campaign diagnostics: physical camp stock remains the existing
 * communal team cache, not an invented per-camp inventory. */
export function finiteCampReport(g: Game) {
  return {
    scope: "finite overland camp residents; legacy shore-spawned naval bands are separate",
    camps: g.state.buildings
      .filter((b) => b.raiderCamp)
      .map((b) => ({
        id: b.id,
        owner: b.team,
        alive: b.hp > 0,
        economy: b.campEconomy
          ? { ...b.campEconomy, knownSites: b.campEconomy.knownSites.map((p) => ({ ...p })) }
          : null,
        residentIds: g.state.units
          .filter(
            (u) =>
              u.hp > 0 &&
              (u.homeCamp === b.id ||
                u.campSupport?.campId === b.id ||
                u.campTrip?.campId === b.id),
          )
          .map((u) => u.id),
      })),
  };
}
