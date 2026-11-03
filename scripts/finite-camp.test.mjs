import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game/sim.ts";
import {
  beginCampTrip,
  finiteCampGuardAI,
  campSupportAI,
  validFiniteCamps,
  finishCampTrip,
  finiteCampReport,
} from "../src/game/finiteCamp.ts";
import { tickScoutProvisions } from "../src/game/scoutProvisions.ts";
import { seaRaidAI, campRaidAI } from "../src/game/raiders.ts";
import { seaRaiderReturnAI, beginSeaRaiderReturn } from "../src/game/seaRaiderReturn.ts";
import { supplyApproach } from "../src/game/campAnchor.ts";
import { foodDemand } from "../src/game/settlement.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";
import { workRuntime } from "../src/game/workRuntime.ts";
function fixture(native = false) {
  const g = new Game();
  g.reset(123456, native ? 14 : 10);
  g.enterIsland();
  if (!native) {
    g.world.heights.fill(4);
    g.world.rivers = [];
    g.world.waterBodies = [];
    g.world.waterHeights = undefined;
    g.world.ecology = undefined;
  }
  const center = native ? g.campOf(0) : { x: 0, z: 0 };
  g.state.units = [];
  g.state.buildings = [];
  g.state.autoWorkEnabled = false;
  g.state.contacts = [1, 2, 3];
  g.state.conflict = "balanced";
  g.state.nightWork = true;
  g.state.time = 400;
  g.state.weather = "clear";
  g.state.weatherT =
    g.state.raidT =
    g.state.birthT =
    g.state.scoutTimer =
    g.state.visitorTimer =
      900;
  g.calamityT = 1e5;
  g.state.growthPolicy = "stable";
  for (const k of ["trees", "stones", "forage", "fish", "wildlife", "copper", "iron"])
    g.state[k] = [];
  for (const t of g.state.tribes) {
    Object.assign(t, {
      food: 100,
      foodLots: { provisions: 100 },
      wood: 10,
      stone: 10,
      spears: 0,
      bows: 0,
      blades: 0,
      thinkT: 1e5,
    });
    t.survival.waterLiters = 30;
  }
  const camp = g.makeBld("hut", center.x, center.z, 3);
  camp.raiderCamp = true;
  g.state.buildings = [camp];
  const u = g.spawnUnit("spearman", center.x + 6, center.z, 3),
    v = g.spawnUnit("spearman", center.x - 6, center.z, 3);
  for (const p of [u, v]) {
    p.homeCamp = camp.id;
    p.order = "hold";
  }
  for (const [team, offset] of [
    [2, 100],
    [0, -100],
  ]) {
    const p = g.spawnUnit("worker", center.x + offset, center.z, team);
    p.order = "hold";
    p.jobLock = true;
  }
  g.rebuildWalk();
  walkHome(g, u, camp);
  return { g, u, v, camp, center };
}
function walkHome(g, u, b) {
  const p = supplyApproach(g, u, b);
  assert.ok(p, "real entrance");
  u.tx = p.x;
  u.tz = p.z;
  for (let i = 0; i < 1000 && !g.buildingWorkReached(u, b); i++) {
    g.navBudget = 20;
    g.steer(u, 0.1);
  }
  assert.ok(g.buildingWorkReached(u, b), u.workReason);
  u.target = null;
  u.node = null;
  u.order = "hold";
}
function reported(g, camp, x = 28, z = 0) {
  const b = g.makeBld("warehouse", camp.x + x, camp.z + z, 0);
  g.state.buildings.push(b);
  g.rebuildWalk();
  const report = {
    version: 1,
    campId: camp.id,
    siteId: b.id,
    team: 0,
    x: b.x,
    z: b.z,
    observedAt: g.state.time,
  };
  camp.campEconomy = {
    version: 1,
    knownSites: [report],
    lastDispatchAt: 0,
    departures: 0,
    returns: 0,
    lost: 0,
    foodPaid: 0,
    waterPaid: 0,
    foodUsed: 0,
    waterUsed: 0,
  };
  return { b, report };
}
function drive(g, seconds, until = () => false) {
  for (let i = 0; i < seconds * 10 && !until(); i++) {
    g.state.time += 0.1;
    g.navBudget = 30;
    for (const u of g.state.units) {
      if (u.hp <= 0) continue;
      if (seaRaiderReturnAI(g, u, 0.1)) continue;
      if (u.seaRaid) seaRaidAI(g, u, 0.1);
    }
    tickScoutProvisions(g, 0.1);
  }
}
test("finite camp dispatch pays the same guard pack and retains actual defender; no duplicate communal consumption", () => {
  const { g, u, v, camp } = fixture(),
    { report } = reported(g, camp);
  const n = g.state.units.length,
    food = g.tribe(3).food,
    water = g.tribe(3).survival.waterLiters;
  assert.equal(beginCampTrip(g, u, report), true);
  assert.equal(g.state.units.length, n);
  assert.equal(v.homeCamp, camp.id);
  assert.ok(u.scoutProvisions);
  const p = u.scoutProvisions;
  assert.equal(g.tribe(3).food, food - p.food);
  assert.equal(g.tribe(3).survival.waterLiters, water - p.water);
  assert.equal(foodDemand(g, 3) > 0, true);
  const after = g.tribe(3).food;
  tickScoutProvisions(g, 3);
  assert.equal(g.tribe(3).food, after);
  assert.ok(u.scoutProvisions, "not refunded at departure cache");
  assert.ok(p.foodUsed > 0 && p.waterUsed > 0);
  assert.equal(beginCampTrip(g, v, report), false);
  assert.equal(workRuntime(g).activeJob(u.id).kind, "camp-trip");
  assert.equal(validFiniteCamps(g.state), true);
});
test("unseen stock, empty home reserves or a missing real defender cannot finance dispatch", () => {
  for (const missing of ["report", "water", "food", "defender"]) {
    const { g, u, v, camp } = fixture(),
      { report } = reported(g, camp);
    if (missing === "report") camp.campEconomy.knownSites = [];
    if (missing === "water") g.tribe(3).survival.waterLiters = 0;
    if (missing === "food") g.tribe(3).food = 0;
    if (missing === "defender") v.hp = 0;
    const before = JSON.stringify([
      g.tribe(3).food,
      g.tribe(3).survival.waterLiters,
      g.state.units.length,
      g.state.nextId,
    ]);
    assert.equal(beginCampTrip(g, u, report), false, missing);
    assert.equal(
      JSON.stringify([
        g.tribe(3).food,
        g.tribe(3).survival.waterLiters,
        g.state.units.length,
        g.state.nextId,
      ]),
      before,
    );
    assert.equal(u.campTrip, undefined);
    assert.equal(u.scoutProvisions, undefined);
  }
});
test("actual observer carries local coordinates home before the camp can use them", () => {
  const { g, u, camp } = fixture();
  const b = g.makeBld("warehouse", u.x + 18, u.z, 0);
  g.state.buildings.push(b);
  g.rebuildWalk();
  u.x += 10;
  u.y = g.height(u.x, u.z);
  assert.equal(finiteCampGuardAI(g, u, 0.1), true);
  assert.ok(u.campReport);
  assert.equal(camp.campEconomy, undefined);
  for (let i = 0; i < 500 && u.campReport; i++) {
    g.state.time += 0.1;
    g.navBudget = 20;
    finiteCampGuardAI(g, u, 0.1);
  }
  assert.equal(u.campReport, undefined);
  assert.ok(g.buildingWorkReached(u, camp));
  assert.equal(camp.campEconomy.knownSites[0].siteId, b.id);
});
test("a finite overland guard takes goods, returns its same body, and refunds unused paid pack once", () => {
  const { g, u, camp } = fixture(),
    { b, report } = reported(g, camp);
  const food3 = g.tribe(3).food,
    food0 = g.tribe(0).food,
    n = g.state.units.length;
  assert.equal(beginCampTrip(g, u, report), true);
  drive(g, 130, () => !u.campTrip);
  assert.equal(
    u.campTrip,
    undefined,
    JSON.stringify({
      x: u.x,
      z: u.z,
      reason: u.workReason,
      raid: u.seaRaid,
      return: u.seaRaidReturn,
    }),
  );
  assert.equal(u.homeCamp, camp.id);
  assert.equal(u.scoutProvisions, undefined);
  assert.equal(u.seaRaid, undefined);
  assert.equal(g.state.units.length, n);
  assert.ok(b.hp > 0);
  assert.ok(g.tribe(0).food < food0);
  const e = camp.campEconomy;
  assert.equal(e.departures, 1);
  assert.equal(e.returns, 1);
  assert.ok(Math.abs(g.tribe(3).food - (food3 + food0 - g.tribe(0).food - e.foodUsed)) < 1e-7);
  const stock = g.tribe(3).food;
  drive(g, 5);
  assert.equal(g.tribe(3).food, stock);
});
test("support duty stores the existing spear and retrieves a paid actual spear without healing or new heads", () => {
  const { g, u, v, camp } = fixture();
  g.tribe(3).survival.waterLiters = 2;
  u.hp -= 5;
  const hp = u.hp,
    n = g.state.units.length;
  assert.equal(finiteCampGuardAI(g, u, 0.1), true);
  assert.equal(u.type, "worker");
  assert.equal(u.hp, hp);
  assert.equal(u.homeCamp, undefined);
  assert.equal(g.tribe(3).spears, 1);
  assert.ok(u.campSupport);
  assert.equal(v.type, "spearman");
  campSupportAI(g, u, 0.1);
  assert.equal(u.type, "worker");
  assert.equal(u.order, "idle");
  g.tribe(3).survival.waterLiters = 20;
  assert.equal(campSupportAI(g, u, 0.1), true);
  assert.equal(u.type, "spearman");
  assert.equal(u.hp, hp);
  assert.equal(u.homeCamp, camp.id);
  assert.equal(g.tribe(3).spears, 0);
  assert.equal(u.campSupport, undefined);
  assert.equal(g.state.units.length, n);
});
test("native terrain paid pack and actor claim survive strict save/load with no terrain repair", () => {
  let { g, u, v, camp } = fixture(true);
  walkHome(g, v, camp);
  const { report } = reported(g, camp, 20, 12);
  assert.equal(beginCampTrip(g, u, report), true);
  const id = u.id,
    pack = { ...u.scoutProvisions };
  g.state.time += 1;
  tickScoutProvisions(g, 1);
  const actual = { ...u.scoutProvisions },
    trip = { ...u.campTrip };
  g = decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));
  u = g.state.units.find((p) => p.id === id);
  assert.deepEqual(u.campTrip, trip);
  assert.deepEqual(u.scoutProvisions, actual);
  assert.equal(workRuntime(g).activeJob(id).kind, "camp-trip");
  assert.ok(pack.food > actual.food);
  assert.equal(validFiniteCamps(g.state), true);
  drive(g, 130, () => !u.campTrip);
  assert.equal(u.campTrip, undefined, u.workReason);
  assert.equal(u.homeCamp, camp.id);
  assert.equal(u.scoutProvisions, undefined);
  assert.equal(g.state.buildings.find((b) => b.id === camp.id).campEconomy.returns, 1);
  decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));
});
test("strict save rejects forged pack ownership/payment and inconsistent same-camp double deployments", () => {
  const { g, u, camp } = fixture(),
    { report } = reported(g, camp);
  assert.equal(beginCampTrip(g, u, report), true);
  const duplicate = JSON.parse(JSON.stringify(encodeGame(g))),
    copy = duplicate.state.units.find((p) => p.id !== u.id && p.homeCamp === camp.id),
    source = duplicate.state.units.find((p) => p.id === u.id),
    newId = duplicate.state.nextId++;
  copy.homeCamp = undefined;
  copy.campTrip = { ...source.campTrip, id: newId, actorId: copy.id };
  copy.scoutProvisions = { ...source.scoutProvisions };
  copy.seaRaid = structuredClone(source.seaRaid);
  copy.seaRaid.plan.bandId = newId;
  copy.seaRaid.plan.actorId = copy.id;
  assert.throws(
    () => decodeGame(duplicate),
    "a second active claim on the same camp cannot survive strict save",
  );
  for (const alter of [
    (p) => p.campTrip.actorId++,
    (p) => p.campTrip.paidWater++,
    (p) => (p.campTrip.id = g.state.nextId + 1),
    (p) => delete p.campTrip,
  ]) {
    const raw = JSON.parse(JSON.stringify(encodeGame(g)));
    alter(raw.state.units.find((p) => p.id === u.id));
    assert.throws(() => decodeGame(raw));
  }
});
test("legacy saved camps keep their prior patrol behavior without automatic finite-system conversion", () => {
  const { g, u, camp } = fixture();
  delete g.state.finiteRaiderCampVersion;
  g.tribe(3).survival.waterLiters = 0;
  assert.equal(finiteCampGuardAI(g, u, 1), false);
  assert.equal(u.type, "spearman");
  assert.equal(u.campSupport, undefined);
  assert.equal(camp.campEconomy, undefined);
  decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));
});
test("an existing native camp guard actually collects freshwater and returns to its stored spear with Auto work off", () => {
  const { g, u, v, camp } = fixture(true);
  walkHome(g, v, camp);
  g.tribe(3).survival.waterLiters = 2;
  const n = g.state.units.length,
    hp = u.hp;
  assert.equal(finiteCampGuardAI(g, u, 0.1), true);
  assert.equal(u.type, "worker");
  const id = u.id;
  let observed = false,
    interrupted = false,
    resumed = false,
    maxDistance = 0;
  g.state.paused = false;
  for (let i = 0; i < 1600 && (u.campSupport || !observed); i++) {
    const time = g.state.time;
    g.step(0.2);
    assert.ok(g.state.time > time, "ordinary simulation clock advances");
    observed ||= !!u.waterWork;
    if (u.waterWork && !interrupted) {
      const work = u.waterWork;
      g.interruptMission(u);
      assert.equal(u.waterWork, work);
      assert.equal(work.paused, true);
      interrupted = true;
    } else if (interrupted && u.waterWork && !u.waterWork.paused) resumed = true;
    maxDistance = Math.max(maxDistance, Math.hypot(u.x - camp.x, u.z - camp.z));
  }
  assert.deepEqual(g.simulationErrors, []);
  assert.equal(observed, true, "existing water job actually assigned");
  assert.equal(interrupted, true);
  assert.equal(resumed, true, "retained actual water job resumes after interruption");
  assert.ok(maxDistance > 8, "same body actually left camp");
  assert.ok(g.tribe(3).survival.waterDeliveredLiters >= 24, "actual freshwater load delivered");
  assert.equal(u.id, id);
  assert.equal(u.type, "spearman", u.workReason);
  assert.equal(u.campSupport, undefined);
  assert.equal(u.homeCamp, camp.id);
  assert.ok(u.hp <= hp, "support role never heals");
  assert.equal(g.state.units.length, n);
  assert.equal(g.tribe(3).spears, 0);
  assert.equal(v.type, "spearman");
  assert.equal(g.state.autoWorkEnabled, false);
  decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));
});
test("paid camp trip death releases its one-body claim and loses remaining provisions instead of crediting cache", () => {
  const { g, u, camp } = fixture(),
    { report } = reported(g, camp);
  assert.equal(beginCampTrip(g, u, report), true);
  g.state.time += 3;
  tickScoutProvisions(g, 3);
  const food = g.tribe(3).food,
    water = g.tribe(3).survival.waterLiters,
    pack = { ...u.scoutProvisions };
  u.hp = 0;
  finishCampTrip(g, u);
  tickScoutProvisions(g, 0);
  assert.equal(u.scoutProvisions, undefined);
  assert.equal(u.campTrip, undefined);
  assert.equal(workRuntime(g).activeJob(u.id), undefined);
  assert.equal(camp.campEconomy.lost, 1);
  assert.equal(g.tribe(3).food, food);
  assert.equal(g.tribe(3).survival.waterLiters, water);
  assert.equal(g.tribe(3).survival.waterLostLiters, pack.water);
  assert.equal(camp.campEconomy.foodUsed, pack.foodUsed);
});
test("interrupted camp trip retains its paid pack; a lost camp never refunds at a distance", () => {
  const { g, u, camp } = fixture(),
    { report } = reported(g, camp);
  assert.equal(beginCampTrip(g, u, report), true);
  drive(g, 2);
  g.interruptMission(u);
  assert.ok(u.campTrip);
  assert.ok(u.scoutProvisions);
  const food = g.tribe(3).food,
    water = g.tribe(3).survival.waterLiters;
  camp.hp = 0;
  assert.equal(finishCampTrip(g, u, true), false);
  assert.equal(g.tribe(3).food, food);
  assert.equal(g.tribe(3).survival.waterLiters, water);
  assert.ok(u.campTrip);
  assert.ok(u.scoutProvisions);
  decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));
});
test("a temporarily unarmed native water carrier can be captured with the same body and finite water cargo", async () => {
  const { beginWaterCollection, waterCollectionAI } = await import("../src/game/survivalNeeds.ts");
  const { acceptPrisonerSurrender } = await import("../src/game/captivity.ts");
  const { g, u, v, camp } = fixture(true);
  walkHome(g, v, camp);
  g.tribe(3).survival.waterLiters = 2;
  finiteCampGuardAI(g, u, 0.1);
  assert.equal(u.type, "worker");
  const result = beginWaterCollection(g, 3, true);
  assert.equal(result.accepted, true, result.reason);
  assert.equal(result.actorId, u.id);
  const bank = { x: u.waterWork.bankX, z: u.waterWork.bankZ };
  for (const dx of [-1, 1]) {
    const guard = g.spawnUnit("spearman", bank.x + dx, bank.z, 0);
    guard.order = "hold";
    guard.jobLock = true;
  }
  const count = g.state.units.length,
    id = u.id;
  for (let i = 0; i < 1600 && u.waterWork?.liters === 0; i++) {
    g.state.time += 0.2;
    g.navBudget = 30;
    waterCollectionAI(g, u, 0.2);
  }
  assert.ok(u.waterWork?.liters > 0, "actually collected a load at freshwater");
  const liters = u.waterWork.liters,
    spears = g.tribe(3).spears,
    stock = g.tribe(3).survival.waterLiters;
  const surrendered = acceptPrisonerSurrender(g, u, 0);
  assert.equal(surrendered.accepted, true, surrendered.reason);
  assert.equal(u.id, id);
  assert.equal(u.team, 0);
  assert.equal(u.type, "worker");
  assert.equal(u.homeCamp, undefined);
  assert.equal(u.waterWork.liters, liters);
  assert.equal(u.waterWork.paused, true);
  assert.equal(
    campSupportAI(g, u, 1),
    false,
    "custody cannot turn the person back into enemy guard",
  );
  assert.equal(g.tribe(3).spears, spears);
  assert.equal(g.tribe(0).spears, 0);
  assert.equal(g.tribe(3).survival.waterLiters, stock);
  assert.equal(g.state.units.length, count);
  const saved = decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));
  assert.equal(saved.state.units.find((p) => p.id === id).waterWork.liters, liters);
});
test("the remaining home watcher retaliates against real nearby attackers instead of freezing on support duty", () => {
  const { g, u, v, camp } = fixture();
  g.tribe(3).survival.waterLiters = 2;
  finiteCampGuardAI(g, u, 0.1);
  const attacker = g.spawnUnit("spearman", v.x + 2, v.z, 0);
  attacker.target = camp;
  attacker.order = "attack";
  assert.equal(finiteCampGuardAI(g, v, 0.1), false);
  assert.equal(campRaidAI(g, v, 0.1), true);
  assert.equal(v.target, attacker);
  assert.equal(v.order, "attack");
});
test("a destroyed camp preserves the actual returning pack and redirects it to a reached owned refuge", () => {
  let { g, u, camp } = fixture();
  const refuge = g.makeBld("hut", camp.x - 30, camp.z - 28, 3);
  refuge.raiderCamp = true;
  g.state.buildings.push(refuge);
  g.rebuildWalk();
  const { report } = reported(g, camp);
  assert.equal(beginCampTrip(g, u, report), true);
  drive(g, 2);
  u.seaRaid.phase = "retreat";
  assert.equal(beginSeaRaiderReturn(g, u), true);
  camp.hp = 0;
  const before = g.tribe(3).food;
  g = decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));
  g.world.heights.fill(4);
  g.world.rivers = [];
  g.world.waterBodies = [];
  g.world.waterHeights = undefined;
  g.world.ecology = undefined;
  g.rebuildWalk();
  u = g.state.units.find((p) => p.id === u.id);
  assert.ok(u.scoutProvisions);
  assert.equal(g.tribe(3).food, before);
  drive(g, 130, () => !u.campTrip);
  assert.equal(u.campTrip, undefined, u.workReason);
  assert.equal(u.homeCamp, refuge.id);
  assert.ok(
    g.buildingWorkReached(
      u,
      g.state.buildings.find((b) => b.id === refuge.id),
    ),
  );
  assert.equal(u.scoutProvisions, undefined);
  decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));
});

test("finite-camp diagnostics and strict checks are read-only, reject null objects and do not draw randomness", () => {
  const { g, u, camp } = fixture(),
    { report } = reported(g, camp);
  assert.equal(beginCampTrip(g, u, report), true);
  const before = JSON.stringify(encodeGame(g)),
    random = Math.random;
  let draws = 0;
  Math.random = () => {
    draws++;
    return 0.5;
  };
  try {
    assert.equal(validFiniteCamps(g.state), true);
    const r = finiteCampReport(g);
    r.camps[0].economy.departures = 999;
    r.camps[0].economy.knownSites[0].x = 999;
    r.camps[0].residentIds.length = 0;
    assert.equal(draws, 0);
  } finally {
    Math.random = random;
  }
  assert.equal(JSON.stringify(encodeGame(g)), before);
  for (const mutate of [
    (s) => (s.units.find((p) => p.id === u.id).campTrip = null),
    (s) => (s.buildings.find((b) => b.id === camp.id).campEconomy = null),
    (s) => (s.units.find((p) => p.id === u.id).campSupport = null),
  ]) {
    const raw = JSON.parse(before);
    mutate(raw.state);
    assert.throws(() => decodeGame(raw));
  }
});
