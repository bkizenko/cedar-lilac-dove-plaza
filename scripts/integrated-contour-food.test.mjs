import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Game } from "../src/game/sim.ts";
import { BUILDINGS } from "../src/game/constants.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";
import { planExpansion } from "../src/game/plotExpansion.ts";
import { surveyFieldTopography } from "../src/game/plotTopography.ts";
import { calendar } from "../src/game/settlement.ts";
import { setFieldRest } from "../src/game/cultivation.ts";
import { foodInventory, foodSpoilage } from "../src/game/pantry.ts";
import {
  beginProduction,
  productionIssue,
  pauseProductionProject,
  resumeProduction,
} from "../src/game/production.ts";
import { ContourFields } from "../src/scene/contourFields.ts";
import * as THREE from "three";
const report = {
  scope:
    "Controlled authored sloping farm terrain; finite initial stores and buildings; no later grants or forced completion",
  stages: [],
  initial: {
    people: 3,
    food: 900,
    foodLots: { provisions: 900 },
    wood: 200,
    stone: 80,
    seeds: 24,
    waterLiters: 160,
    assets: ["townhall", "hut", "four warehouses"],
  },
};
const hash = (a) => createHash("sha256").update(new Uint8Array(a.buffer)).digest("hex");
function terrain(g) {
  const n = g.world.segs + 1,
    step = g.world.size / g.world.segs;
  g.world.heights = new Float32Array(n * n);
  for (let z = 0; z < n; z++)
    for (let x = 0; x < n; x++) {
      const px = x * step - g.world.size / 2,
        pz = z * step - g.world.size / 2;
      g.world.heights[z * n + x] = 4 + px * 0.04 + pz * 0.025;
    }
  g.world.rivers = [];
  g.world.features = [];
  g.world.waterHeights = undefined;
  g.world.waterBodies = [];
  g.world.ecology = undefined;
  g.world.biomes = [{ kind: "plains", x: 0, z: 0 }];
  g.rebuildWalk();
  g.vision.fill(2);
}
function fixture() {
  const g = new Game();
  g.reset(304, 10);
  g.enterIsland();
  g.state.units = [];
  g.state.buildings = [];
  g.state.autoWorkEnabled = false;
  g.state.growthPolicy = "stable";
  g.state.weather = "clear";
  g.state.weatherT = 100000;
  g.state.raidT = 100000;
  g.state.birthT = 100000;
  g.state.visitorTimer = 900;
  g.state.conflict = "quiet";
  g.calamityT = 100000;
  g.state.encounter = undefined;
  g.state.contacts = [];
  g.state.campSites = [{ team: 0, x: 0, z: 30 }];
  for (const k of ["trees", "forage", "stones", "copper", "iron", "fish", "wildlife"])
    g.state[k] = [];
  for (const t of g.state.tribes) t.thinkT = 100000;
  terrain(g);
  for (const [type, x, z] of [
    ["townhall", 0, 30],
    ["hut", -12, 42],
    ["warehouse", -15, 10],
    ["warehouse", -30, 10],
    ["warehouse", -15, 27],
    ["warehouse", -30, 27],
  ])
    g.state.buildings.push(g.makeBld(type, x, z, 0));
  for (let i = 0; i < 3; i++) {
    const u = g.spawnUnit("worker", i * 2, 42, 0);
    u.order = "hold";
    u.jobLock = true;
  }
  const npc = g.spawnUnit("worker", 200, 220, 1);
  npc.order = "hold";
  npc.jobLock = true;
  g.state.buildings.push(g.makeBld("townhall", 200, 200, 1));
  Object.assign(g.tribe(0), {
    food: 900,
    foodLots: { provisions: 900 },
    wood: 200,
    stone: 80,
    seeds: 24,
    cultivated: ["grain"],
    items: {},
  });
  g.tribe(0).survival.waterLiters = 160;
  g.rebuildWalk();
  return g;
}
function status(g) {
  return JSON.stringify({
    time: g.state.time,
    season: calendar(g),
    people: g.state.units
      .filter((u) => u.team === 0)
      .map((u) => ({
        id: u.id,
        order: u.order,
        x: u.x,
        z: u.z,
        carry: u.carry,
        node: u.node?.id,
        reason: u.workReason,
        hp: u.hp,
      })),
    fields: g.state.buildings
      .filter((b) => b.type === "farm")
      .map((b) => ({ id: b.id, crop: b.crop, fertility: b.fertility })),
    errors: g.simulationErrors,
  });
}
function drive(g, seconds, until = () => false) {
  const end = g.state.time + seconds;
  while (g.state.time < end && !until()) {
    g.state.paused = false;
    const before = g.state.time,
      wood = g.tribe(0).wood,
      fuel = g.tribe(0).survival.fuelBurnedWood;
    g.step(0.2);
    const careLogs = wood - g.tribe(0).wood - (g.tribe(0).survival.fuelBurnedWood - fuel);
    if (careLogs > 1e-7) {
      assert.ok(Math.abs(careLogs - Math.round(careLogs)) < 1e-6, JSON.stringify({ careLogs }));
      report.preservationLogs = (report.preservationLogs || 0) + Math.round(careLogs);
    }
    assert.ok(g.state.time > before, status(g));
  }
  assert.deepEqual(g.simulationErrors, []);
  assert.ok(g.state.units.filter((u) => u.team === 0 && u.hp > 0).length >= 3, status(g));
}
function untilTime(g, time) {
  drive(g, time - g.state.time + 0.4, () => g.state.time >= time);
}
function build(g, type, x, z) {
  const t = g.tribe(0),
    wood = t.wood,
    stone = t.stone;
  assert.equal(g.placeBuilding(type, x, z), true, g.state.banner);
  const b = g.state.buildings.find((b) => b.type === type);
  assert.equal(b.build, 0);
  g.clearSelect();
  g.selectEntity(g.state.units.find((u) => u.team === 0 && !u.buildOrder));
  g.orderConstruction(b);
  drive(g, 180, () => g.finished(b));
  assert.ok(g.finished(b), status(g));
  assert.equal(t.wood, wood - BUILDINGS[type].wood);
  assert.equal(t.stone, stone - BUILDINGS[type].stone);
  return b;
}
function gather(g, b, people = g.state.units.filter((u) => u.team === 0)) {
  g.clearSelect();
  for (const u of people) u.selected = true;
  g.issueGather(b);
  assert.ok(
    people.some((u) => u.node === b),
    status(g),
  );
}
function restore(g) {
  const old = encodeGame(g),
    before = hash(g.world.heights),
    loaded = decodeGame(JSON.parse(JSON.stringify(old)));
  terrain(loaded);
  assert.equal(hash(loaded.world.heights), before);
  return loaded;
}
function batch(g, recipe, b, interrupt = false) {
  const before = g.state.time;
  assert.equal(beginProduction(g, recipe, b.id), true, productionIssue(g, recipe, b.id));
  let p = g.state.production.projects.at(-1);
  if (interrupt) {
    drive(g, 120, () => p.phase === "working" && p.progress > 2);
    assert.equal(p.phase, "working");
    const progress = p.progress,
      grain = g.state.production.metrics.grainUsed;
    assert.equal(pauseProductionProject(g, p.id), true);
    const id = p.id;
    g = restore(g);
    p = g.state.production.projects.find((p) => p.id === id);
    assert.equal(p.progress, progress);
    assert.equal(resumeProduction(g, id), true, JSON.stringify(p));
    assert.equal(g.state.production.metrics.grainUsed, grain);
  }
  drive(g, 180, () => p.phase === "complete" || p.phase === "lost");
  assert.equal(p.phase, "complete", JSON.stringify(p));
  report.stages.push({
    recipe,
    elapsed: g.state.time - before,
    projectId: p.id,
    progress: p.progress,
  });
  return g;
}
test("M1-13 integrated finite-seed contour fields, seasonal harvest, paid milling/bread, preservation and fallow", () => {
  let g = fixture();
  const terrainBefore = hash(g.world.heights),
    hearth = build(g, "hearth", 0, 56),
    grinding = build(g, "grindingStone", -10, 56),
    oven = build(g, "oven", 10, 56);
  assert.match(productionIssue(g, "grindGrain", hearth.id), /actual grain/);
  const store = g.state.buildings
      .filter((b) => b.type === "warehouse" && b.team === 0)
      .sort((a, b) => (a.storeCare || 0) - (b.storeCare || 0))[0],
    spoilBefore = foodSpoilage(g),
    wood = g.tribe(0).wood,
    careBefore = store.storeCare || 0;
  gather(g, store, g.state.units.filter((u) => u.team === 0).slice(0, 1));
  drive(g, 150, () => store.storeCare >= 0.95);
  assert.ok(store.storeCare >= 0.95, status(g));
  assert.ok(
    g.tribe(0).wood < wood,
    JSON.stringify({
      woodBefore: wood,
      woodAfter: g.tribe(0).wood,
      careBefore,
      careAfter: store.storeCare,
    }),
  );
  assert.ok(foodSpoilage(g) < spoilBefore);
  const woodAfterStations = g.tribe(0).wood,
    seedBefore = g.tribe(0).seeds;
  assert.equal(g.placeBuilding("farm", 25, 30), true, g.state.banner);
  let field = g.state.buildings.find((b) => b.type === "farm");
  assert.equal(field.build, 1);
  assert.equal(g.tribe(0).seeds, seedBefore - 4);
  const survey = surveyFieldTopography(g, field);
  assert.ok(survey.heightRangeMeters > 0.5 && survey.maxGrade < 0.1);
  const people = g.state.units.filter((u) => u.team === 0);
  gather(g, field);
  drive(g, 150, () => field.crop.planted > 0.3);
  assert.ok(field.crop.planted > 0.3);
  const plantedArea = field.crop.planted,
    seeds = g.tribe(0).seeds;
  assert.equal(planExpansion(g, field, "w"), true, g.state.banner);
  assert.equal(g.tribe(0).seeds, seeds - 4);
  assert.equal(field.crop.planted, plantedArea / 2);
  assert.equal(field.w, BUILDINGS.farm.w * 2);
  assert.equal(g.tribe(0).wood, woodAfterStations);
  drive(g, 250, () => field.crop.planted >= 1);
  assert.equal(field.crop.planted, 1, status(g));
  assert.equal(hash(g.world.heights), terrainBefore);
  assert.equal(g.placeBuilding("farm", 25, 70), true, g.state.banner);
  let control = g.state.buildings.filter((b) => b.type === "farm")[1];
  gather(g, control);
  drive(g, 150, () => control.crop.planted >= 1);
  assert.equal(control.crop.planted, 1, status(g));
  const fieldId = field.id,
    controlId = control.id;
  g = restore(g);
  field = g.state.buildings.find((b) => b.id === fieldId);
  control = g.state.buildings.find((b) => b.id === controlId);
  assert.equal(field.crop.planted, 1);
  assert.equal(g.tribe(0).seeds, 12);
  untilTime(g, 451);
  gather(g, field);
  drive(g, 200, () => field.crop.tended >= 1);
  assert.equal(field.crop.tended, 1, status(g));
  gather(g, control);
  drive(g, 150, () => control.crop.tended >= 1);
  assert.equal(control.crop.tended, 1, status(g));
  untilTime(g, 901);
  const yield0 = field.crop.remaining + control.crop.remaining;
  assert.ok(yield0 > 500, { yield0 });
  assert.equal(foodInventory(g.tribe(0)).grain, 0);
  const scene = new THREE.Scene(),
    depth = new THREE.MeshDepthMaterial(),
    layer = new ContourFields(scene, { bind() {}, depth, texture: { needsUpdate: false } });
  const visual = layer.sync(g, { x: 25, z: 45 });
  assert.ok(visual.grain > 0);
  const m = new THREE.Matrix4(),
    v = new THREE.Vector3();
  for (const mesh of scene.children)
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, m);
      v.setFromMatrixPosition(m);
      assert.ok(Math.abs(v.y - g.height(v.x, v.z)) < 1e-5);
    }
  layer.dispose();
  depth.dispose();
  gather(g, field);
  drive(
    g,
    300,
    () =>
      field.crop.remaining === 0 &&
      g.state.units.filter((u) => u.team === 0).every((u) => u.carry === 0),
  );
  assert.equal(field.crop.remaining, 0, status(g));
  assert.ok(foodInventory(g.tribe(0)).grain > 0);
  gather(g, control);
  drive(
    g,
    220,
    () =>
      control.crop.remaining === 0 &&
      g.state.units.filter((u) => u.team === 0).every((u) => u.carry === 0),
  );
  assert.equal(control.crop.remaining, 0, status(g));
  report.stages.push({
    stage: "first-harvest",
    time: g.state.time,
    finiteYield: yield0,
    grainDelivered: foodInventory(g.tribe(0)).grain,
    contourRange: survey.heightRangeMeters,
    plants: visual.grain,
  });
  g = batch(
    g,
    "grindGrain",
    g.state.buildings.find((b) => b.id === hearth.id),
    true,
  );
  g = batch(
    g,
    "bakeBread",
    g.state.buildings.find((b) => b.id === hearth.id),
  );
  g = batch(
    g,
    "grindGrainStation",
    g.state.buildings.find((b) => b.id === grinding.id),
  );
  g = batch(
    g,
    "bakeBreadOven",
    g.state.buildings.find((b) => b.id === oven.id),
  );
  assert.equal(g.state.production.metrics.grainUsed, 8);
  assert.equal(g.state.production.metrics.consumed.flour, 8);
  assert.equal(g.state.production.metrics.logsUsed, 2);
  assert.equal(g.state.production.metrics.waterUsedLiters, 4);
  assert.equal(g.state.production.metrics.edibleFoodProduced, 8);
  assert.ok(foodInventory(g.tribe(0)).bread > 0);
  assert.equal(g.state.production.metrics.produced.flour, 8);
  untilTime(g, 1801);
  field = g.state.buildings.find((b) => b.id === fieldId);
  control = g.state.buildings.find((b) => b.id === controlId);
  assert.ok(field.fertility < 1 && control.fertility < 1);
  assert.equal(setFieldRest(g, control.id, true), true);
  gather(g, field);
  drive(g, 250, () => field.crop.planted >= 1);
  assert.equal(field.crop.planted, 1, status(g));
  assert.equal(control.crop.planted, 0);
  untilTime(g, 2251);
  gather(g, field);
  drive(g, 200, () => field.crop.tended >= 1);
  untilTime(g, 2701);
  gather(g, field);
  drive(
    g,
    300,
    () =>
      field.crop.remaining === 0 &&
      g.state.units.filter((u) => u.team === 0).every((u) => u.carry === 0),
  );
  assert.equal(field.crop.remaining, 0, status(g));
  assert.equal(control.crop.remaining, 0);
  untilTime(g, 3601);
  assert.ok(control.fertility > field.fertility, {
    fallow: control.fertility,
    cultivated: field.fertility,
  });
  assert.equal(hash(g.world.heights), terrainBefore);
  assert.doesNotThrow(() => decodeGame(encodeGame(g)));
  const totals = g.state.simulationEvents.totals,
    received = totals["food_received:0:food"] || 0,
    consumed = totals["food_consumed:0:food"] || 0,
    spoiled = totals["food_spoiled:0:food"] || 0;
  assert.ok(Math.abs(g.tribe(0).seeds - (12 + (received - 8) * 0.08)) < 1e-6);
  assert.ok(
    Math.abs(g.tribe(0).food - (900 + received - consumed - spoiled - 8)) < 1e-6,
    JSON.stringify({
      food: g.tribe(0).food,
      expected: 900 + received - consumed - spoiled - 8,
      received,
      consumed,
      spoiled,
      totals,
      production: g.state.production.metrics,
    }),
  );
  assert.ok(
    Math.abs(
      g.tribe(0).wood -
        (200 - 14 - 2 - report.preservationLogs - g.tribe(0).survival.fuelBurnedWood),
    ) < 1e-6,
  );
  assert.equal(g.tribe(0).stone, 62);
  assert.ok(
    Math.abs(
      g.tribe(0).survival.waterLiters -
        (160 +
          g.tribe(0).survival.waterDeliveredLiters -
          g.tribe(0).survival.waterConsumedLiters -
          g.tribe(0).survival.waterLostLiters -
          4),
    ) < 1e-6,
  );
  report.final = {
    time: g.state.time,
    food: g.tribe(0).food,
    grain: foodInventory(g.tribe(0)).grain,
    seeds: g.tribe(0).seeds,
    wood: g.tribe(0).wood,
    water: g.tribe(0).survival.waterLiters,
    fuelBurnedWood: g.tribe(0).survival.fuelBurnedWood,
    waterConsumedLiters: g.tribe(0).survival.waterConsumedLiters,
    stone: g.tribe(0).stone,
    soil: { fallow: control.fertility, cultivated: field.fertility },
    production: g.state.production.metrics,
    foodAccounting: { received, consumed, spoiled },
  };
  console.log(JSON.stringify(report));
  if (process.env.HEARTHWILD_FOOD_CHAIN_REPORT)
    writeFileSync(process.env.HEARTHWILD_FOOD_CHAIN_REPORT, JSON.stringify(report, null, 2) + "\n");
});
