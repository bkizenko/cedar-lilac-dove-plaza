import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Game } from "../src/game/sim.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";
import { BUILDINGS } from "../src/game/constants.ts";
import { surveyFieldTopography } from "../src/game/plotTopography.ts";
import { planExpansion } from "../src/game/plotExpansion.ts";
import { staffField } from "../src/game/fieldWork.ts";
const seed = -935736685,
  g = new Game();
g.reset(seed, 16, { size: 1040, layout: "archipelago" });
g.enterIsland();
const home = g.campOf(0),
  terrainHash = createHash("sha256").update(new Uint8Array(g.world.heights.buffer)).digest("hex");
g.state.autoWorkEnabled = false;
g.state.growthPolicy = "stable";
g.state.birthT = 100000;
g.state.conflict = "quiet";
g.state.raidT = 100000;
g.state.weather = "clear";
g.state.weatherT = 100000;
g.state.visitorTimer = 900;
g.calamityT = 100000;
for (const t of g.state.tribes) t.thinkT = 100000;
// Inspection-only initial endowment: known grain, seed baskets, household food,
// collected water, and previously cleared campsite. No terrain height changes.
const initialTrees = g.state.trees.length;
g.state.trees = g.state.trees.filter((n) => Math.hypot(n.x - home.x, n.z - home.z) > 85);
const t = g.tribe(0);
Object.assign(t, {
  food: 700,
  foodLots: { provisions: 700 },
  wood: 100,
  stone: 40,
  seeds: 16,
  cultivated: ["grain"],
});
t.survival.waterLiters = 100;
g.vision.fill(2);
g.rebuildWalk();
const size = { w: BUILDINGS.farm.w, d: BUILDINGS.farm.d },
  expanded = { w: size.w * 2, d: size.d },
  candidates = [];
for (let z = -64; z <= 64; z += 4)
  for (let x = -64; x <= 64; x += 4) {
    const px = home.x + x,
      pz = home.z + z;
    if (
      Math.hypot(x, z) < 15 ||
      Math.hypot(x, z) > 65 ||
      g.placementIssue("farm", px, pz, 0, expanded)
    )
      continue;
    const survey = surveyFieldTopography(g, { x: px, z: pz, ...expanded });
    if (survey.heightRangeMeters < 0.45 || survey.maxGrade > 0.3) continue;
    candidates.push({
      x: px,
      z: pz,
      survey,
      score: survey.heightRangeMeters - Math.hypot(x, z) * 0.03,
    });
  }
candidates.sort((a, b) => b.score - a.score);
assert.ok(candidates.length, "No legal sloped field candidate");
const chosen = candidates[0];
assert.equal(g.placeBuilding("farm", chosen.x, chosen.z, 0, size), true, g.state.banner);
const field = g.state.buildings.find((b) => b.team === 0 && b.type === "farm");
assert.ok(field);
assert.equal(t.seeds, 12);
assert.equal(planExpansion(g, field, "w"), true, g.state.banner);
assert.equal(t.seeds, 8);
assert.equal(staffField(g, field) > 0, true);
let walked = 0;
const previous = new Map(
  g.state.units.filter((u) => u.team === 0).map((u) => [u.id, { x: u.x, z: u.z }]),
);
function driveTo(time, until = () => false) {
  while (g.state.time < time && !until()) {
    g.state.paused = false;
    g.step(0.2);
    assert.deepEqual(g.simulationErrors, []);
    for (const u of g.state.units.filter((u) => u.team === 0)) {
      const old = previous.get(u.id);
      if (old) walked += Math.hypot(u.x - old.x, u.z - old.z);
      previous.set(u.id, { x: u.x, z: u.z });
    }
  }
}
driveTo(420, () => field.crop.planted >= 1);
assert.equal(
  field.crop.planted,
  1,
  JSON.stringify({
    time: g.state.time,
    crop: field.crop,
    people: g.state.units
      .filter((u) => u.team === 0)
      .map((u) => ({ order: u.order, reason: u.workReason, node: u.node?.id })),
  }),
);
driveTo(451);
assert.ok(staffField(g, field) > 0);
driveTo(880, () => field.crop.tended >= 1);
assert.equal(field.crop.tended, 1);
driveTo(901);
assert.ok(field.crop.ripened && field.crop.remaining > 0);
g.state.paused = true;
g.state.selBld = field;
g.clearSelect();
field.selected = true;
g.state.selBld = field;
const data = encodeGame(g),
  restored = decodeGame(JSON.parse(JSON.stringify(data)));
assert.equal(
  createHash("sha256").update(new Uint8Array(restored.world.heights.buffer)).digest("hex"),
  terrainHash,
);
assert.equal(
  restored.state.buildings.find((b) => b.id === field.id).crop.remaining,
  field.crop.remaining,
);
const out = process.argv[2] || ".play/natural-contour-food-visual.json";
writeFileSync(out, JSON.stringify(data));
const report = {
  scope:
    "Natural V16 heightfield inspection setup; initial cleared campsite and finite household endowments; actual seed-funded base marking/expansion and ordinary spring sow/summer tend, no forced crop progress",
  seed,
  generation: 16,
  size: 1040,
  layout: "archipelago",
  initial: {
    food: 700,
    wood: 100,
    stone: 40,
    seeds: 16,
    waterLiters: 100,
    clearedTrees: initialTrees - g.state.trees.length,
  },
  home: { x: home.x, z: home.z },
  field: {
    id: field.id,
    x: field.x,
    z: field.z,
    w: field.w,
    d: field.d,
    crop: field.crop,
    survey: chosen.survey,
  },
  walkedMeters: walked,
  time: g.state.time,
  seedsRemaining: t.seeds,
  terrainHash,
  save: out,
};
writeFileSync(out.replace(/\.json$/, ".report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify(report));
