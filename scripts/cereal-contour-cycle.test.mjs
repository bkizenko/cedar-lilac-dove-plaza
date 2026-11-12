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
import { setFieldRest,setFieldCrop } from "../src/game/cultivation.ts";
import { foodInventory, foodSpoilage } from "../src/game/pantry.ts";
import {
  PRODUCTION_RECIPES,
  recipeFoodOutputs,
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
// Runtime retains only100 finished projects. Keep observed immutable facts so
// the full-cycle ledger still includes paid batches pruned from the live UI list.
const productionHistory=new Map();
function observeProduction(g){for(const p of g.state.production?.projects||[])if(p.team===0)productionHistory.set(p.id,{id:p.id,recipe:p.recipe,phase:p.phase});}
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
    cultivated: ["grain","pulses"],
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
    items:g.tribe(0).items,cereal:g.state.cerealProcessing,
    foodLots:foodInventory(g.tribe(0)),production:g.state.production,
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
      fuel = g.tribe(0).survival.fuelBurnedWood,
      processingLogs = g.state.production?.metrics.logsUsed||0;
    g.step(0.2);observeProduction(g);
    const careLogs = wood - g.tribe(0).wood - (g.tribe(0).survival.fuelBurnedWood - fuel) - ((g.state.production?.metrics.logsUsed||0)-processingLogs);
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
    stone = t.stone,careBefore=report.preservationLogs||0,fuelBefore=t.survival.fuelBurnedWood,processingBefore=g.state.production?.metrics.logsUsed||0;
  assert.equal(g.placeBuilding(type, x, z), true, g.state.banner);
  const b = g.state.buildings.find((b) => b.type === type&&b.x===x&&b.z===z);
  assert.equal(b.build, 0);
  g.clearSelect();
  g.selectEntity(g.state.units.find((u) => u.team === 0 && !u.buildOrder&&!u.productionProjectId));
  g.orderConstruction(b);
  drive(g, 180, () => g.finished(b));
  assert.ok(g.finished(b), status(g));
  assert.ok(Math.abs(t.wood-(wood-BUILDINGS[type].wood-((report.preservationLogs||0)-careBefore)-(t.survival.fuelBurnedWood-fuelBefore)-((g.state.production?.metrics.logsUsed||0)-processingBefore)))<1e-6);report.paidBuildings??={wood:0,stone:0};report.paidBuildings.wood+=BUILDINGS[type].wood;report.paidBuildings.stone+=BUILDINGS[type].stone;
  assert.equal(t.stone, stone - BUILDINGS[type].stone);
  return b;
}
function gather(g, b, people = g.state.units.filter((u) => u.team === 0)) {
  people=people.map(p=>g.state.units.find(u=>u.id===p.id)).filter(u=>u&&!u.productionProjectId);
  if(!people.length) people=g.state.units.filter(u=>u.team===0&&!u.productionProjectId&&!u.buildOrder).slice(0,1);
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
function assertPaidProduction(g) {
  observeProduction(g);const projects=[...productionHistory.values()],m=g.state.production.metrics;
  const paid=key=>projects.reduce((n,p)=>n+(PRODUCTION_RECIPES[p.recipe][key]||0),0);
  const completed=projects.filter(p=>p.phase==='complete');
  assert.ok(projects.every(p=>p.phase!=='lost'),status(g));
  assert.equal(m.grainUsed,paid('grain'));assert.equal(m.logsUsed,paid('wood'));assert.equal(m.waterUsedLiters,paid('water'));
  assert.equal(m.consumed.flour||0,projects.reduce((n,p)=>n+(PRODUCTION_RECIPES[p.recipe].inputs.flour||0),0));
  assert.equal(m.produced.flour||0,completed.reduce((n,p)=>n+(PRODUCTION_RECIPES[p.recipe].outputs.flour||0),0));
  const output=completed.reduce((n,p)=>n+Object.values(recipeFoodOutputs(PRODUCTION_RECIPES[p.recipe])).reduce((sum,v)=>sum+(v||0),0),0);
  assert.ok(Math.abs(m.edibleFoodProduced-output)<1e-7,status(g));
}
function interruptAutomaticBatch(g) {
  // Automatic mill/oven jobs have already paid for the harvested grain. Observe
  // and interrupt that real batch, rather than demanding the same inputs again.
  const working=()=>g.state.production.projects.find(p=>p.team===0&&p.phase==='working'&&p.progress>2&&
    (PRODUCTION_RECIPES[p.recipe].outputs.flour||PRODUCTION_RECIPES[p.recipe].foodKind==='bread'));
  drive(g,120,()=>!!working());let p=working();assert.ok(p,status(g));
  const before={id:p.id,recipe:p.recipe,progress:p.progress,grain:g.state.production.metrics.grainUsed,
    flour:g.state.production.metrics.consumed.flour,logs:g.state.production.metrics.logsUsed,water:g.state.production.metrics.waterUsedLiters};
  assert.equal(pauseProductionProject(g,p.id),true);g=restore(g);p=g.state.production.projects.find(p=>p.id===before.id);
  assert.equal(p.progress,before.progress);assert.equal(resumeProduction(g,p.id),true,JSON.stringify(p));
  assert.equal(g.state.production.metrics.grainUsed,before.grain);assert.equal(g.state.production.metrics.consumed.flour,before.flour);
  assert.equal(g.state.production.metrics.logsUsed,before.logs);assert.equal(g.state.production.metrics.waterUsedLiters,before.water);
  drive(g,180,()=>p.phase==='complete'||p.phase==='lost');assert.equal(p.phase,'complete',JSON.stringify(p));
  report.stages.push({stage:'actual-paid-batch-reload',...before,finished:p.finished});return g;
}
test("a three-adult grain/pulse holding completes marked cereal harvest, paid processing/bread and a second contour crop cycle", () => {
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
  assert.equal(field.w,BUILDINGS.farm.w,'A minimum cereal plot is appropriate for three residents; the legacy suite covers expansion');
  drive(g, 250, () => field.crop.planted >= 1);
  assert.equal(field.crop.planted, 1, status(g));
  assert.equal(hash(g.world.heights), terrainBefore);
  assert.equal(g.placeBuilding("farm", 25, 70), true, g.state.banner);
  let control = g.state.buildings.filter((b) => b.type === "farm")[1];assert.equal(setFieldCrop(g,control.id,"pulses"),true);
  gather(g, control);
  drive(g, 150, () => control.crop.planted >= 1);
  assert.equal(control.crop.planted, 1, status(g));
  const fieldId = field.id,
    controlId = control.id;
  g = restore(g);
  field = g.state.buildings.find((b) => b.id === fieldId);
  control = g.state.buildings.find((b) => b.id === controlId);
  assert.equal(field.crop.planted, 1);
  assert.equal(g.tribe(0).seeds,16);
  untilTime(g, 451);
  gather(g, field);
  drive(g, 200, () => field.crop.tended >= 1);
  assert.equal(field.crop.tended, 1, status(g));
  gather(g, control);
  drive(g, 150, () => control.crop.tended >= 1);
  assert.equal(control.crop.tended, 1, status(g));
  untilTime(g, 901);
  const grainYield0=field.crop.remaining,pulseYield0=control.crop.remaining,yield0=grainYield0+pulseYield0;
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
  const farmers=g.state.units.filter(u=>u.team===0).slice(0,2),processor=g.state.units.filter(u=>u.team===0)[2];
  g.clearSelect();g.selectEntity(processor);g.assignJob('auto');gather(g,field,farmers);
  drive(g,150,()=>!!g.tribe(0).productionPractice?.threshCerealHand?.batches);
  assert.ok(g.tribe(0).productionPractice?.threshCerealHand?.batches,status(g));
  const floor=build(g,'threshingFloor',-25,70);build(g,'warehouse',-25,52);
  gather(g,field,farmers);
  drive(
    g,
    220,
    () =>
      field.crop.remaining === 0 &&
      g.state.units.filter((u) => u.team === 0).every((u) => u.carry === 0&&!(u.itemCargo?.grainSheaves||0)),
  );
  assert.equal(field.crop.remaining, 0, status(g));
  drive(g,100,()=>foodInventory(g.tribe(0)).grain>0);assert.ok(foodInventory(g.tribe(0)).grain>0,status(g));
  gather(g, control,farmers);
  drive(
    g,
    280,
    () =>
      control.crop.remaining === 0 &&
      g.state.units.filter((u) => u.team === 0).every((u) => u.carry === 0&&!(u.itemCargo?.grainSheaves||0)),
  );
  assert.equal(control.crop.remaining, 0, status(g));
  assert.ok(g.state.time<1350,status(g));assert.equal(g.state.cerealProcessing.harvestedSheaves,grainYield0*2);
  report.stages.push({
    stage: "first-harvest",
    time: g.state.time,
    finiteYield: yield0,
    grainDelivered: foodInventory(g.tribe(0)).grain,
    contourRange: survey.heightRangeMeters,
    plants: visual.grain,
  });
  // The normal automatic chain uses the finite harvested inputs while the
  // farmers gather pulses. Those paid jobs are the processing/bread proof.
  const completed=g.state.production.projects.filter(p=>p.team===0&&p.phase==='complete');
  assert.ok(completed.some(p=>p.recipe==='grindGrain'),status(g));
  assert.ok(completed.some(p=>PRODUCTION_RECIPES[p.recipe].workplace==='grindingStone'&&PRODUCTION_RECIPES[p.recipe].outputs.flour>0),status(g));
  assert.ok(completed.some(p=>PRODUCTION_RECIPES[p.recipe].foodKind==='bread'),status(g));
  assert.ok(foodInventory(g.tribe(0)).bread>0,status(g));
  assertPaidProduction(g);g=interruptAutomaticBatch(g);assertPaidProduction(g);
  untilTime(g, 1801);
  field = g.state.buildings.find((b) => b.id === fieldId);
  control = g.state.buildings.find((b) => b.id === controlId);
  assert.ok(field.fertility < 1 && control.fertility < 1);
  assert.equal(setFieldRest(g, control.id, true), true);
  gather(g,field,g.state.units.filter(u=>farmers.some(p=>p.id===u.id)));
  drive(g, 250, () => field.crop.planted >= 1);
  assert.equal(field.crop.planted, 1, status(g));
  assert.equal(control.crop.planted, 0);
  untilTime(g, 2251);
  gather(g,field,g.state.units.filter(u=>farmers.some(p=>p.id===u.id)));
  drive(g, 200, () => field.crop.tended >= 1);
  untilTime(g, 2701);const grainYield1=field.crop.remaining;
  gather(g,field,g.state.units.filter(u=>farmers.some(p=>p.id===u.id)));
  drive(
    g,
    300,
    () =>
      field.crop.remaining === 0 &&
      g.state.units.filter((u) => u.team === 0).every((u) => u.carry === 0&&!(u.itemCargo?.grainSheaves||0)),
  );
  assert.equal(field.crop.remaining, 0, status(g));
  assert.equal(control.crop.remaining,0);assert.ok(g.state.time<3150,status(g));assert.equal(g.state.cerealProcessing.harvestedSheaves,2*(grainYield0+grainYield1));
  untilTime(g,3601);
  assert.equal(g.state.production.projects.filter(p=>p.team===0&&/Cereal/.test(p.recipe)&&p.phase==="paused").length,0,status(g));
  assert.ok(g.state.cerealProcessing.cleanedGrain>200,status(g));
  assert.ok(control.fertility > field.fertility, {
    fallow: control.fertility,
    cultivated: field.fertility,
  });
  assert.equal(hash(g.world.heights), terrainBefore);
  assert.doesNotThrow(() => decodeGame(encodeGame(g)));
  assertPaidProduction(g);
  const totals = g.state.simulationEvents.totals,
    received = totals["food_received:0:food"] || 0,
    consumed = totals["food_consumed:0:food"] || 0,
    spoiled = totals["food_spoiled:0:food"] || 0;
  assert.ok(Math.abs(g.tribe(0).seeds - (16 + g.state.cerealProcessing.seedsAllocated+pulseYield0*.08)) < 1e-6);
  assert.ok(
    Math.abs(g.tribe(0).food - (900 + received - consumed - spoiled - g.state.production.metrics.grainUsed)) < 1e-6,
    JSON.stringify({
      food: g.tribe(0).food,
      expected: 900 + received - consumed - spoiled - g.state.production.metrics.grainUsed,
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
        (200 - report.paidBuildings.wood - g.state.production.metrics.logsUsed - report.preservationLogs - g.tribe(0).survival.fuelBurnedWood),
    ) < 1e-6,
  );
  assert.equal(g.tribe(0).stone,80-report.paidBuildings.stone);
  assert.ok(
    Math.abs(
      g.tribe(0).survival.waterLiters -
        (160 +
          g.tribe(0).survival.waterDeliveredLiters -
          g.tribe(0).survival.waterConsumedLiters -
          g.tribe(0).survival.waterLostLiters -
          g.state.production.metrics.waterUsedLiters),
    ) < 1e-6,
  );
  report.cerealJobs=g.state.production.projects.filter(p=>p.recipe.includes("Cereal")).map(p=>({id:p.id,recipe:p.recipe,phase:p.phase,actor:p.actorId,reason:p.blockedReason}));report.cereal=g.state.cerealProcessing;report.remainingCerealItems={grainSheaves:g.tribe(0).items?.grainSheaves||0,roughGrain:g.tribe(0).items?.roughGrain||0,straw:g.tribe(0).items?.straw||0,chaff:g.tribe(0).items?.chaff||0};
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
