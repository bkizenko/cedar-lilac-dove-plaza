import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game/sim.ts";
import {
  queueBuildingRepair,
  pauseBuildingRepair,
  tickBuildingMaintenance,
  BUILDING_MAINTENANCE,
  repairQuote,
} from "../src/game/buildingMaintenance.ts";
import { encodeGame, decodeGame, gameSnapshot, validateGameSave } from "../src/game/persistence.ts";
import { workRuntime } from "../src/game/workRuntime.ts";
import { measureVillageWorkload } from "../src/game/villageWorkload.ts";
import { prepareSocietyHandover, prepareOwnedHandover } from "../src/game/communityHandover.ts";
function fixture(team = 0) {
  const g = new Game();
  g.reset(42, 10);
  g.enterIsland();
  g.world.heights.fill(4);
  g.world.rivers = [];
  g.world.waterBodies = [];
  g.world.features = [];
  g.state.units = [];
  g.state.buildings = [];
  for (const k of ["trees", "stones", "forage", "fish", "wildlife", "copper", "iron"])
    g.state[k] = [];
  g.state.autoWorkEnabled = false;
  g.state.nightWork = true;
  g.state.contacts = [1, 2];
  g.state.weather = "clear";
  g.state.weatherT = g.state.raidT = 10000;
  g.state.visitorTimer = g.state.scoutTimer = 900;
  g.calamityT = 10000;
  g.state.conflict = "quiet";
  for (const t of g.state.tribes) {
    Object.assign(t, {
      food: 1000,
      foodLots: { provisions: 1000 },
      wood: 100,
      stone: 100,
      thinkT: 10000,
    });
    t.survival.waterLiters = 100;
  }
  const hall = g.makeBld("townhall", 0, 30, team),
    hut = g.makeBld("hut", 32, 30, team);
  g.state.buildings = [hall, hut];
  const worker = g.spawnUnit("worker", 0, 38, team),
    replacement = g.spawnUnit("worker", 6, 38, team),
    other = g.spawnUnit("worker", 100, 30, team === 0 ? 1 : 0);
  other.jobLock = true;
  for (const u of [worker, replacement, other]) u.order = "hold";
  hut.hp = hut.maxHp * 0.5;
  g.vision.fill(2);
  g.rebuildWalk();
  return { g, hall, hut, worker, replacement };
}
function drive(g, seconds, done) {
  const end = g.state.time + seconds;
  while (g.state.time < end && !done()) {
    g.state.paused = false;
    const before = g.state.time;
    g.step(0.1);
    assert.ok(g.state.time > before);
    assert.deepEqual(g.simulationErrors, []);
  }
  assert.ok(
    done(),
    JSON.stringify({
      b: g.state.buildings.map((b) => ({ id: b.id, repair: b.repair })),
      u: g.state.units.map((u) => ({ id: u.id, x: u.x, z: u.z, why: u.workReason })),
    }),
  );
}
test("old saves keep passive wear off, including after a real repair command", () => {
  const { g, hut, worker } = fixture();
  delete g.state.buildingMaintenanceVersion;
  const hp = hut.hp;
  tickBuildingMaintenance(g, 100000);
  assert.equal(hut.hp, hp);
  assert.equal(hut.maintenance, undefined);
  assert.equal(queueBuildingRepair(g, hut.id, worker.id).accepted, true);
  assert.equal(hut.maintenance.wearEnabled, false);
  pauseBuildingRepair(g, worker);
  const condition = hut.maintenance.condition;
  tickBuildingMaintenance(g, 100000);
  assert.equal(hut.maintenance.condition, condition);
  const restored = decodeGame(encodeGame(g));
  assert.equal(restored.state.buildingMaintenanceVersion, undefined);
  assert.equal(
    restored.state.buildings.find((b) => b.id === hut.id).maintenance.wearEnabled,
    false,
  );
});
test("new-world grace then material/weather/use wear is measured and never heals combat damage", () => {
  const { g, hall, hut } = fixture();
  hut.hp = hut.maxHp;
  tickBuildingMaintenance(g, 1800);
  assert.equal(hut.hp, hut.maxHp);
  tickBuildingMaintenance(g, 100);
  const clear = hut.maintenance.totalWear;
  assert.ok(Math.abs(clear - 100 * BUILDING_MAINTENANCE.timberWearPerSecond) < 1e-9);
  g.state.weather = "storm";
  tickBuildingMaintenance(g, 100);
  assert.ok(Math.abs(hut.maintenance.totalWear - clear - clear * 2) < 1e-9);
  hut.hp = 1;
  tickBuildingMaintenance(g, 1e8);
  assert.equal(hut.hp, 1);
  assert.equal(hut.maintenance.condition, 0.7);
  assert.ok(hall.maintenance.totalWear > 0);
});
test("paid materials and actual travel precede gradual repair, strict save remains valid", () => {
  const { g, hut, worker } = fixture();
  const hp = hut.hp,
    quote = repairQuote(hut),
    wood = g.tribe(0).wood,
    stone = g.tribe(0).stone;
  assert.equal(queueBuildingRepair(g, hut.id, worker.id).accepted, true);
  assert.equal(g.tribe(0).wood, wood - (quote.materials.wood || 0));
  assert.equal(g.tribe(0).stone, stone - (quote.materials.stone || 0));
  assert.equal(hut.hp, hp);
  assert.equal(workRuntime(g).activeJob(worker.id).kind, "maintenance");
  drive(g, 60, () => hut.repair?.phase === "carrying");
  assert.equal(hut.hp, hp);
  const start = { x: worker.x, z: worker.z };
  drive(g, 60, () => hut.repair?.progress > 0);
  assert.ok(Math.hypot(worker.x - start.x, worker.z - start.z) > 10);
  assert.ok(hut.hp > hp && hut.hp < hut.maxHp);
  assert.doesNotThrow(() => validateGameSave(gameSnapshot(g)));
  drive(g, 200, () => !hut.repair);
  assert.ok(Math.abs(hut.hp - hut.maxHp) < 1e-7);
  assert.equal(hut.maintenance.repairsCompleted, 1);
  assert.ok(hut.maintenance.repairedHp > 0);
  assert.equal(g.tribe(0).wood, wood - (quote.materials.wood || 0));
  assert.equal(workRuntime(g).activeJob(worker.id), undefined);
  assert.doesNotThrow(() => decodeGame(encodeGame(g)));
});
test("interrupting a carried packet drops it in place; replacement collects and resumes without repaying", () => {
  const { g, hut, worker, replacement } = fixture();
  queueBuildingRepair(g, hut.id, worker.id);
  drive(g, 60, () => hut.repair?.phase === "carrying" && Math.hypot(worker.x, worker.z - 30) > 14);
  const stock = g.tribe(0).wood,
    pos = { x: worker.x, z: worker.z };
  g.interruptMission(worker);
  worker.order = "hold";
  assert.equal(hut.repair.phase, "paused");
  assert.deepEqual(hut.repair.parcel, { kind: "ground", ...pos });
  assert.equal(worker.buildingRepairId, undefined);
  assert.equal(queueBuildingRepair(g, hut.id, replacement.id).accepted, true);
  assert.equal(g.tribe(0).wood, stock);
  drive(g, 200, () => !hut.repair);
  assert.ok(Math.abs(hut.hp - hut.maxHp) < 1e-7);
  assert.equal(g.tribe(0).wood, stock);
});
test("dead builder retains paid packet and labor for a replacement", () => {
  const { g, hut, worker, replacement } = fixture();
  queueBuildingRepair(g, hut.id, worker.id);
  drive(g, 90, () => hut.repair?.progress > 2);
  const progress = hut.repair.progress,
    stock = g.tribe(0).wood;
  worker.hp = 0;
  tickBuildingMaintenance(g, 0);
  assert.equal(hut.repair.actorId, null);
  assert.equal(hut.repair.progress, progress);
  assert.equal(hut.repair.parcel.kind, "site");
  assert.equal(queueBuildingRepair(g, hut.id, replacement.id).accepted, true);
  drive(g, 200, () => !hut.repair);
  assert.equal(g.tribe(0).wood, stock);
});
test("queued repairs count planned labor and respect job locks, direct tasks and explicit priorities", () => {
  const { g, hut, worker, replacement } = fixture();
  worker.jobLock = replacement.jobLock = true;
  const wood = g.tribe(0).wood;
  assert.equal(queueBuildingRepair(g, hut.id).accepted, true);
  assert.equal(hut.repair.actorId, null);
  const a = measureVillageWorkload(g),
    t = a.tasks.find((t) => t.id === `building-repair:${hut.id}`);
  assert.ok(t.personSeconds > 0);
  assert.equal(t.status, "blocked");
  assert.equal(g.tribe(0).wood, wood - (hut.repair.materials.wood || 0));
  assert.equal(queueBuildingRepair(g, hut.id, worker.id).accepted, false);
  assert.equal(hut.repair.actorId, null);
  worker.jobLock = false;
  worker.order = "move";
  assert.equal(queueBuildingRepair(g, hut.id, worker.id).accepted, false);
  worker.order = "hold";
  assert.equal(queueBuildingRepair(g, hut.id, worker.id).accepted, true);
  assert.equal(workRuntime(g).activeJob(worker.id).target, hut.id);
});
test("whole society handover preserves same paid packet, progress and current shared owner", () => {
  const { g, hut, worker } = fixture(1);
  queueBuildingRepair(g, hut.id, worker.id);
  drive(g, 90, () => hut.repair?.progress > 2);
  const before = structuredClone(hut.repair),
    wood = g.tribe(0).wood + g.tribe(1).wood;
  g.state.paused = true;
  const plan = prepareSocietyHandover(g, 1);
  assert.equal(plan.accepted, true, plan.reason);
  g.commitCommunityState(plan.state);
  const b = g.state.buildings.find((b) => b.id === hut.id);
  assert.deepEqual(b.repair, { ...before, custodyTeam: 0 });
  assert.equal(b.team, 0);
  assert.equal(workRuntime(g).activeJob(worker.id).owner, 0);
  assert.equal(g.tribe(0).wood, wood);
  assert.doesNotThrow(() => validateGameSave(gameSnapshot(g)));
  drive(g, 200, () => !b.repair);
  assert.equal(g.tribe(0).wood, wood);
});
test("local capture retains an old-custody cache packet without blocking annexation or crediting the new owner", () => {
  const { g, hut, worker } = fixture(1);
  queueBuildingRepair(g, hut.id, worker.id);
  const paid = structuredClone(hut.repair),
    wood = g.tribe(0).wood;
  const plan = prepareOwnedHandover(g, 1, 0, {
    siteIds: [hut.id],
    residentIds: [worker.id],
    boatIds: [],
    occupationId: g.id(),
  });
  assert.equal(plan.accepted, true, plan.reason);
  g.commitCommunityState(plan.state);
  const b = g.state.buildings.find((b) => b.id === hut.id),
    claim = g.state.retainedBuildingRepairs[0];
  assert.equal(b.team, 0);
  assert.equal(b.repair, undefined);
  assert.equal(claim.team, 1);
  assert.deepEqual(claim.repair.materials, paid.materials);
  assert.deepEqual(claim.repair.source, paid.source);
  assert.equal(claim.repair.progress, paid.progress);
  assert.equal(g.tribe(0).wood, wood);
  assert.equal(claim.repair.phase, "paused");
  assert.equal(g.state.units.find((u) => u.id === worker.id).buildingRepairId, undefined);
  assert.doesNotThrow(() => validateGameSave(gameSnapshot(g)));
  assert.equal(queueBuildingRepair(g, b.id, worker.id).accepted, true);
  assert.equal(g.tribe(0).wood, wood - (b.repair.materials.wood || 0));
  assert.equal(g.state.retainedBuildingRepairs.length, 1);
});

test("strict repair records reject forged ownership, overprogress and invalid escrow without mutating live state", () => {
  const { g, hut, worker } = fixture();
  queueBuildingRepair(g, hut.id, worker.id);
  const snapshot = gameSnapshot(g);
  for (const change of [
    (p) => (p.progress = p.duration + 1),
    (p) => (p.actorId = 999999),
    (p) => (p.materials = { wood: -1 }),
    (p) => (p.parcel.x = Infinity),
  ]) {
    const bad = structuredClone(snapshot);
    change(bad.state.buildings.find((b) => b.id === hut.id).repair);
    assert.throws(() => validateGameSave(bad));
  }
  assert.doesNotThrow(() => validateGameSave(snapshot));
});
test("large fortification repair uses bounded material loads and several real cache trips", () => {
  const { g, hut, worker } = fixture();
  hut.type = "forge";
  hut.maxHp = 1000;
  hut.hp = 100;
  const quote = repairQuote(hut);
  assert.ok(Object.values(quote.materials).reduce((n, v) => n + v, 0) > 8);
  assert.equal(queueBuildingRepair(g, hut.id, worker.id).accepted, true);
  const p = hut.repair,
    wood = g.tribe(0).wood,
    stone = g.tribe(0).stone;
  let loads = 0,
    last = "";
  const end = g.state.time + 600;
  while (hut.repair && g.state.time < end) {
    g.state.paused = false;
    const before = g.state.time;
    g.step(0.1);
    assert.ok(g.state.time > before);
    assert.deepEqual(g.simulationErrors, []);
    if (hut.repair) {
      assert.ok(Object.values(p.packet).reduce((n, v) => n + v, 0) <= 8);
      if (p.phase === "carrying" && last !== "carrying") loads++;
      last = p.phase;
      if (p.phase === "working")
        assert.equal(
          Object.values(p.uncollected).reduce((n, v) => n + v, 0),
          0,
        );
    }
  }
  assert.equal(hut.repair, undefined);
  assert.ok(loads >= 2);
  assert.equal(g.tribe(0).wood, wood);
  assert.equal(g.tribe(0).stone, stone);
  assert.equal(hut.maintenance.materialsPaid.wood, quote.materials.wood);
  assert.equal(hut.maintenance.materialsPaid.stone, quote.materials.stone);
});
test("NPC damage repair pays the same finite rules while player Auto work stays off", () => {
  const { g, hut, worker } = fixture(1);
  worker.order = "idle";
  const quote = repairQuote(hut),
    wood = g.tribe(1).wood;
  assert.equal(g.state.autoWorkEnabled, false);
  tickBuildingMaintenance(g, 0);
  assert.ok(hut.repair);
  assert.equal(hut.repair.actorId, worker.id);
  assert.equal(g.tribe(1).wood, wood - (quote.materials.wood || 0));
  drive(g, 180, () => !hut.repair);
  assert.ok(hut.hp > hut.maxHp * 0.99);
});
test("new and explicitly adopted halls receive no old free healing, untouched legacy hall does", () => {
  for (const mode of ["new", "legacy", "adopted"]) {
    const { g, hall, worker } = fixture();
    hall.hp = hall.maxHp * 0.5;
    if (mode !== "new") delete g.state.buildingMaintenanceVersion;
    const before = hall.hp;
    if (mode === "adopted") {
      queueBuildingRepair(g, hall.id, worker.id);
      pauseBuildingRepair(g, worker);
    }
    g.state.paused = false;
    g.step(0.1);
    assert.deepEqual(g.simulationErrors, []);
    if (mode === "legacy") assert.ok(hall.hp > before);
    else assert.equal(hall.hp, before);
  }
});
import { nativeBoatVillage } from "./helpers/native-boat-village.mjs";
test("native terrain repair survives paused save/load, resumes with same finite materials and body", () => {
  let { g, dock, people } = nativeBoatVillage(3, 100);
  g.state.contacts = [1, 2];
  const worker = people[1];
  people[0].jobLock = true;
  people[2].jobLock = true;
  const other = g.spawnUnit(
    "worker",
    g.world.camps.find((c) => c.team === 2).x,
    g.world.camps.find((c) => c.team === 2).z,
    2,
  );
  other.order = "hold";
  other.jobLock = true;
  dock.hp = dock.maxHp * 0.55;
  const quote = repairQuote(dock),
    wood = g.tribe(0).wood,
    stone = g.tribe(0).stone;
  assert.equal(queueBuildingRepair(g, dock.id, worker.id).accepted, true);
  drive(g, 100, () => dock.repair?.progress > 2);
  g.interruptMission(worker);
  worker.order = "hold";
  const progress = dock.repair.progress,
    id = dock.id,
    actorId = worker.id,
    terrain = Array.from(g.world.heights),
    saved = encodeGame(g);
  g = decodeGame(saved);
  assert.deepEqual(
    Array.from(g.world.heights),
    terrain,
    "Native terrain reconstructed without repair",
  );
  dock = g.state.buildings.find((b) => b.id === id);
  assert.equal(dock.repair.progress, progress);
  assert.equal(dock.repair.phase, "paused");
  assert.equal(queueBuildingRepair(g, id, actorId).accepted, true);
  assert.equal(g.tribe(0).wood, wood - (quote.materials.wood || 0));
  drive(g, 180, () => !dock.repair);
  assert.ok(Math.abs(dock.hp - dock.maxHp) < 1e-7);
  assert.equal(g.tribe(0).wood, wood - (quote.materials.wood || 0));
  assert.equal(g.tribe(0).stone, stone - (quote.materials.stone || 0));
  assert.doesNotThrow(() => decodeGame(encodeGame(g)));
});
test("queued shared repair claims choose the highest actual BUILD priority without stealing a locked person", () => {
  const { g, hut, worker, replacement } = fixture();
  replacement.jobLock = worker.jobLock = true;
  const other = g.makeBld("hut", 50, 30, 0);
  other.hp = other.maxHp * 0.5;
  other.constructionPriority = 2;
  hut.constructionPriority = 0;
  g.state.buildings.push(other);
  g.rebuildWalk();
  queueBuildingRepair(g, hut.id);
  queueBuildingRepair(g, other.id);
  assert.equal(hut.repair.actorId, null);
  assert.equal(other.repair.actorId, null);
  worker.jobLock = false;
  worker.order = "idle";
  g.state.autoWorkEnabled = true;
  tickBuildingMaintenance(g, 0);
  assert.equal(other.repair.actorId, worker.id);
  assert.equal(hut.repair.actorId, null);
  assert.equal(replacement.buildingRepairId, undefined);
});
test("local on-site repair ownership split retains paid progress and uses an actual replacement without new materials", () => {
  const { g, hut, worker } = fixture(1);
  const newMaker = g.state.units.find((u) => u.team === 0);
  newMaker.jobLock = false;
  queueBuildingRepair(g, hut.id, worker.id);
  drive(g, 90, () => hut.repair?.progress > 2);
  const before = {
    progress: hut.repair.progress,
    paid: structuredClone(hut.repair.materials),
    wood: g.tribe(0).wood,
  };
  const plan = prepareOwnedHandover(g, 1, 0, {
    siteIds: [hut.id],
    residentIds: [],
    boatIds: [],
    occupationId: g.id(),
  });
  assert.equal(plan.accepted, true, plan.reason);
  g.commitCommunityState(plan.state);
  const b = g.state.buildings.find((b) => b.id === hut.id),
    old = g.state.units.find((u) => u.id === worker.id);
  assert.equal(b.team, 0);
  assert.equal(b.repair.actorId, null);
  assert.equal(old.buildingRepairId, undefined);
  assert.equal(b.repair.progress, before.progress);
  assert.equal(b.repair.paidBy, 1);
  assert.deepEqual(b.repair.materials, before.paid);
  assert.equal(queueBuildingRepair(g, b.id, newMaker.id).accepted, true);
  drive(g, 180, () => !b.repair);
  assert.equal(g.tribe(0).wood, before.wood);
  assert.doesNotThrow(() => validateGameSave(gameSnapshot(g)));
});
test("automatic repair never takes a stationed held adult or consumes reserve goods without an eligible worker", () => {
  const { g, hut, worker, replacement } = fixture();
  g.state.autoWorkEnabled = true;
  worker.order = replacement.order = "hold";
  const wood = g.tribe(0).wood;
  tickBuildingMaintenance(g, 0);
  assert.equal(hut.repair, undefined);
  assert.equal(worker.buildingRepairId, undefined);
  assert.equal(g.tribe(0).wood, wood);
});
test("a captured carried repair packet stays at the actual body location as a paused old-custody claim", () => {
  const { g, hut, worker } = fixture(1);
  queueBuildingRepair(g, hut.id, worker.id);
  drive(g, 60, () => hut.repair?.phase === "carrying" && Math.hypot(worker.x, worker.z - 30) > 14);
  const packet = structuredClone(hut.repair.packet),
    where = { x: worker.x, z: worker.z };
  const plan = prepareOwnedHandover(g, 1, 0, {
    siteIds: [hut.id],
    residentIds: [],
    boatIds: [],
    occupationId: g.id(),
  });
  assert.equal(plan.accepted, true, plan.reason);
  g.commitCommunityState(plan.state);
  const claim = g.state.retainedBuildingRepairs[0];
  assert.equal(claim.team, 1);
  assert.equal(claim.repair.phase, "paused");
  assert.deepEqual(claim.repair.packet, packet);
  assert.deepEqual(claim.repair.parcel, { kind: "ground", ...where });
  assert.doesNotThrow(() => decodeGame(encodeGame(g)));
});
test("reunifying a captured repair restores its old finite claim with no second payment even when stocks are empty", () => {
  const { g, hut, worker } = fixture(1);
  g.tribe(1).wood = repairQuote(hut).materials.wood;
  queueBuildingRepair(g, hut.id, worker.id);
  assert.equal(g.tribe(1).wood, 0);
  const paid = structuredClone(hut.repair.materials);
  let plan = prepareOwnedHandover(g, 1, 0, {
    siteIds: [hut.id],
    residentIds: [],
    boatIds: [],
    occupationId: g.id(),
  });
  assert.equal(plan.accepted, true, plan.reason);
  g.commitCommunityState(plan.state);
  assert.equal(g.state.retainedBuildingRepairs.length, 1);
  plan = prepareOwnedHandover(g, 0, 1, {
    siteIds: [hut.id],
    residentIds: [],
    boatIds: [],
    occupationId: g.id(),
  });
  assert.equal(plan.accepted, true, plan.reason);
  g.commitCommunityState(plan.state);
  const b = g.state.buildings.find((b) => b.id === hut.id);
  assert.equal(queueBuildingRepair(g, b.id, worker.id).accepted, true);
  assert.deepEqual(b.repair.materials, paid);
  assert.equal(g.state.retainedBuildingRepairs.length, 0);
  assert.equal(g.tribe(1).wood, 0);
  drive(g, 180, () => !b.repair);
  assert.equal(g.tribe(1).wood, 0);
  assert.doesNotThrow(() => validateGameSave(gameSnapshot(g)));
});
test("repair estimates, workload and strict validation remain read-only and consume no random draws", () => {
  const { g, hut, worker } = fixture();
  queueBuildingRepair(g, hut.id, worker.id);
  const before = JSON.stringify(gameSnapshot(g)),
    original = Math.random;
  let draws = 0;
  Math.random = () => {
    draws++;
    return 0.5;
  };
  try {
    for (let i = 0; i < 3; i++) {
      repairQuote(hut);
      measureVillageWorkload(g);
      validateGameSave(gameSnapshot(g));
    }
  } finally {
    Math.random = original;
  }
  assert.equal(draws, 0);
  assert.equal(JSON.stringify(gameSnapshot(g)), before);
});
