import { supplyAccounting } from "../../src/game/simulationEvents.ts";
import {
  surveyFibre,
  beginFibreGather,
  fibreGatherIssue,
  fibreReport,
} from "../../src/game/fibre.ts";
import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/"))
      return next(new URL(`../../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    return next(specifier, context);
  },
});
const { Engine } = await import("../../src/game/engine.ts");
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync(".qualification", { recursive: true });
import { Game } from "../../src/game/sim.ts";
import {
  beginHousingUpgrade,
  beginHomeUse,
  housingAdoptionIssue,
  housingStatus,
} from "../../src/game/housing.ts";
import { encodeGame, decodeGame, validateGameSave } from "../../src/game/persistence.ts";
import { answerEncounter } from "../../src/game/encounters.ts";
import { HOUSING_MATERIAL_KEYS } from "../../src/game/housingMaterials.ts";
let g = new Game();
g.reset(20261103, 18, { size: 1040, layout: "pangaea" });
g.enterIsland();
g.state.conflict = "quiet";
g.state.autoWorkEnabled = false;
const t = g.tribe(0);
t.wood = 200;
t.stone = 80;
t.items = { ...(t.items || {}), plantFibre: 0 };
// Declared initial existing-village/material endowment, before any Game.step.
// Native terrain/resources/original people remain unchanged; no midrun grants.
const fibreWorker = g.state.units.find(u => u.team === 0 && u.type === "worker");
assert.ok(fibreWorker, "native founder");
const safeSite = (type, center, radius, accept = () => true) => {
  const size = { townhall: 10, hut: 5.4 }[type];
  return g.findDryFoundation(type, center.x, center.z, radius, (x, z) =>
    accept(x, z) && g.placementValid(type, x, z, 0) &&
    g.workBoard.connected(g, fibreWorker.x, fibreWorker.z, x, z) &&
    !g.state.units.some(u => Math.abs(u.x - x) < size / 2 + 2 && Math.abs(u.z - z) < size / 2 + 2)
  );
};
const hallSite = safeSite("townhall", g.campOf(0), 50);
assert.ok(hallSite, "dry connected native hall site");
const hall = g.makeBld("townhall", hallSite.x, hallSite.z, 0);
g.state.buildings.push(hall);
g.state.walkDirty = true;
const hutSite = safeSite("hut", hall, 60, (x, z) => Math.hypot(x - hall.x, z - hall.z) > 23);
assert.ok(hutSite, "dry connected native hut with a genuine hauling distance");
const hut = g.makeBld("hut", hutSite.x, hutSite.z, 0);
hut.hp = 150;
g.state.buildings.push(hut);
g.state.founding = false;
g.state.walkDirty = true;
g.workBoard.reset();
const openingLedger = {
  food: g.tribe(0).food,
  water: { ...g.tribe(0).survival },
  events: supplyAccounting(g),
};
assert.equal(
  surveyFibre(g, fibreWorker.id),
  true,
  "native known trees yield a surveyed real bast source",
);
let fibreSteps = 0;
while ((g.tribe(0).items?.plantFibre || 0) < 12) {
  const patch = g.state.fibre.patches.find((p) => !fibreGatherIssue(g, fibreWorker.id, p.id));
  assert.ok(patch, "actual known finite patch remains available");
  assert.equal(beginFibreGather(g, fibreWorker.id, patch.id), true);
  while (fibreWorker.fibreWork) {
    if (g.state.encounter) answerEncounter(g, "observe");
    const before = g.state.time;
    g.step(0.2);
    assert.ok(g.state.time > before || g.state.encounter);
    assert.deepEqual(g.simulationErrors, []);
    assert.ok(++fibreSteps < 2000, "bounded actual finite fibre delivery: " + JSON.stringify({ phase: fibreWorker.fibreWork?.phase, reason: fibreWorker.workReason, x: fibreWorker.x, z: fibreWorker.z, tx: fibreWorker.tx, tz: fibreWorker.tz, hall: hallSite }));
  }
}
const fibreEvidence = fibreReport(g);
assert.equal(fibreEvidence.metrics.harvested, 12);
assert.equal(fibreEvidence.metrics.delivered, 12);
assert.equal(fibreEvidence.metrics.standingWoodConsumed, 3);
validateGameSave(encodeGame(g));
const buildingId = hut.id,
  initial = {
    wood: t.wood,
    stone: t.stone,
    fibre: t.items.plantFibre,
    cap: g.popCap(0),
    fuel: t.survival?.fuelBurnedWood || 0,
    hp: hut.hp,
  },
  observations = [];
assert.ok(housingAdoptionIssue(g));
assert.equal(
  g.placeBuilding("house", hut.x, hut.z),
  false,
  "no adopted method, no new advanced-home site",
);
const engine = () => ({ game: g, pushHud() {} });
assert.equal(Engine.prototype.upgradeHome.call(engine(), buildingId).accepted, true);
let steps = 0,
  walk = 0,
  lastPosition = new Map(g.state.units.map((u) => [u.id, { x: u.x, z: u.z }]));
const home = () => g.state.buildings.find((b) => b.id === buildingId);
function step() {
  if (g.state.encounter) answerEncounter(g, "observe");
  const before = g.state.time;
  g.step(0.2);
  assert.ok(
    g.state.time > before || g.state.encounter,
    "clock advances or a real encounter needs answer",
  );
  assert.deepEqual(g.simulationErrors, []);
  for (const u of g.state.units) {
    const p = lastPosition.get(u.id);
    if (p && u.housingWorkId === buildingId) walk += Math.hypot(u.x - p.x, u.z - p.z);
    lastPosition.set(u.id, { x: u.x, z: u.z });
  }
  if (++steps % 100 === 0)
    console.error(
      JSON.stringify({
        steps,
        time: g.state.time,
        site: { type: home()?.type, build: home()?.build, p: home()?.renovation },
        workers: g.state.units
          .filter((u) => u.team === 0)
          .map((u) => ({
            id: u.id,
            order: u.order,
            buildOrder: u.buildOrder,
            work: u.housingWorkId,
            reason: u.workReason,
            x: u.x,
            z: u.z,
            q: u.constructionQueue,
          })),
      }),
    );
  assert.ok(steps < 5000, "bounded physical housing drive");
}
try {
  while (!g.state.units.some((u) => u.housingCargo?.buildingId === buildingId)) step();
  assert.equal(home().type, "hut");
  assert.equal(home().build, 1);
  assert.equal(g.popCap(0), initial.cap);
  const actorId = home().renovation.actorId,
    p = home().renovation;
  assert.ok(walk > 0);
  assert.equal(g.tribe(0).stone, initial.stone - 8);
  assert.equal(g.tribe(0).items.plantFibre, 6);
  assert.ok(
    Math.abs(
      g.tribe(0).wood + (g.tribe(0).survival.fuelBurnedWood - initial.fuel) - (initial.wood - 24),
    ) < 1e-6,
  );
  for (const k of HOUSING_MATERIAL_KEYS)
    assert.equal(p.quote[k], p.uncollected[k] + p.delivered[k] + p.packet[k]);
  const raw = encodeGame(g);
  validateGameSave(raw);
  writeFileSync(".qualification/hearthwild-housing-native-paid-carrying.json", JSON.stringify(raw));
  g = decodeGame(structuredClone(raw));
  assert.equal(g.state.paused, true);
  const pausedTime = g.state.time;
  g.step(0.2);
  assert.equal(g.state.time, pausedTime);
  Engine.prototype.setPaused.call(engine(), false);
  while (home().type !== "house") step();
  assert.equal(g.popCap(0), initial.cap + 2);
  assert.ok(home().hp <= initial.hp);
  assert.equal(home().maxHp, 320);
  assert.equal(home().housingReceipt.workSeconds, 48);
  assert.ok(housingAdoptionIssue(g));
  const trial = Engine.prototype.tryHome.call(engine(), buildingId);
  assert.equal(trial.accepted, true, trial.reason);
  while (housingAdoptionIssue(g)) step();
  validateGameSave(encodeGame(g));
  const site = g.findOpenSpot(home().x, home().z, "house", 0);
  assert.ok(site, "real native new-home footprint exists");
  assert.equal(g.placeBuilding("house", site.x, site.z), true);
  const advanced = g.state.buildings.find(
    (b) => b.type === "house" && b.renovation?.mode === "new",
  );
  assert.ok(advanced);
  const nextId = advanced.id;
  while(!g.state.units.some(u=>u.housingCargo?.buildingId===nextId))step();
  const removal=decodeGame(encodeGame(g)),doomed=removal.state.buildings.find(b=>b.id===nextId),removalStock={wood:removal.tribe(0).wood,stone:removal.tribe(0).stone,fibre:removal.tribe(0).items.plantFibre};removal.state.selBld=doomed;removal.recycleSelected();assert.deepEqual({wood:removal.tribe(0).wood,stone:removal.tribe(0).stone,fibre:removal.tribe(0).items.plantFibre},removalStock,'unfinished paid house cannot salvage already-retained reserved inputs a second time');assert.equal(removal.state.retainedHousingProjects.length,1);validateGameSave(encodeGame(removal));
  while (g.state.buildings.find((b) => b.id === nextId)?.build < 1) step();
  const built = g.state.buildings.find((b) => b.id === nextId);
  assert.equal(built.housingReceipt.mode, "new");
  assert.equal(built.housingReceipt.workSeconds, 48);
  assert.equal(g.tribe(0).stone, initial.stone - 16);
  assert.equal(g.tribe(0).items.plantFibre, 0);
  assert.ok(
    Math.abs(
      g.tribe(0).wood + (g.tribe(0).survival.fuelBurnedWood - initial.fuel) - (initial.wood - 48),
    ) < 1e-6,
  );
  validateGameSave(encodeGame(g));
  const accounting = supplyAccounting(g),
    survival = { ...g.tribe(0).survival };
  assert.ok(
    Math.abs(
      g.tribe(0).food -
        (openingLedger.food +
          accounting.foodReceived -
          openingLedger.events.foodReceived -
          accounting.foodConsumed +
          openingLedger.events.foodConsumed -
          accounting.foodSpoiled +
          openingLedger.events.foodSpoiled),
    ) < 1e-5,
    "exact finite food ledger",
  );
  assert.ok(
    Math.abs(
      survival.waterLiters -
        (openingLedger.water.waterLiters +
          survival.waterDeliveredLiters -
          openingLedger.water.waterDeliveredLiters -
          survival.waterConsumedLiters +
          openingLedger.water.waterConsumedLiters -
          survival.waterLostLiters +
          openingLedger.water.waterLostLiters),
    ) < 1e-5,
    "exact communal water ledger, no herd in this scenario",
  );
  const finalSave = encodeGame(g);
  writeFileSync(".qualification/hearthwild-housing-native-paid-qa.json", JSON.stringify(finalSave));
  writeFileSync(
    ".qualification/hearthwild-housing-native-paid-qa.meta.json",
    JSON.stringify(
      {
        scope:
          "Actual native paid/use/delivery chain with declared initial old hut/hall and wood/stone; fibre harvested from native trees; no midrun corrections.",
        home: { x: home().x, z: home().z },
        newHome: { x: built.x, z: built.z },
        camera: {
          target: { x: home().x, z: home().z },
          closeDistance: 24,
          midDistance: 65,
          wideDistance: 150,
        },
        pausedOnImport: true,
      },
      null,
      2,
    ),
  );
  const report = {
    scope:
      "Controlled initial existing-hut/material endowment. Actual native V18 terrain/original bodies, public project commands and Game.step. Engine upgrade/use/Resume and actual new-house placement, finite input packets, native Game.step. Controlled initial wood/stone and completed old hut. Fibre starts at zero: native finite bast is surveyed, physically harvested/carried/delivered before housing. No from-scratch default survival claim.",
    initial,
    openingLedger,
    finalLedger: { food: g.tribe(0).food, accounting, survival },
    fibreEvidence,
    actorId,
    walkMetres: walk,
    steps,
    time: g.state.time,
    home: {
      id: home().id,
      type: home().type,
      hp: home().hp,
      maxHp: home().maxHp,
      receipt: home().housingReceipt,
    },
    stocks: { wood: g.tribe(0).wood, stone: g.tribe(0).stone, fibre: g.tribe(0).items.plantFibre },
    newHome: { id: built.id, x: built.x, z: built.z, hp: built.hp, receipt: built.housingReceipt },
    observations,
  };
  writeFileSync(".qualification/hearthwild-housing-connected-pilot.json", JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} catch (error) {
  const report = {
    error: String(error),
    time: g.state.time,
    steps,
    status: home() ? housingStatus(g, home()) : null,
    home: home(),
    workers: g.state.units
      .filter((u) => u.team === 0)
      .map((u) => ({
        id: u.id,
        order: u.order,
        buildOrder: u.buildOrder,
        housingWorkId: u.housingWorkId,
        cargo: u.housingCargo,
        reason: u.workReason,
        x: u.x,
        z: u.z,
        q: u.constructionQueue,
      })),
  };
  writeFileSync(
    ".qualification/hearthwild-housing-connected-pilot-failure.json",
    JSON.stringify(report, null, 2),
  );
  throw error;
}
