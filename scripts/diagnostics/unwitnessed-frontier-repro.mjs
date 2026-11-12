import assert from "node:assert/strict";
import { Game } from "../../src/game/sim.ts";
import { scoutKnowledge } from "../../src/game/scouting.ts";
import { rivalKnows } from "../../src/game/rivalDevelopment.ts";
function fixture() {
  const g = new Game();
  g.reset(345, 10);
  g.enterIsland();
  g.world.heights.fill(4);
  g.world.rivers = [];
  g.world.features = [];
  g.world.waterBodies = [];
  g.world.waterHeights = undefined;
  g.world.ecology = undefined;
  g.state.units = [];
  g.state.buildings = [g.makeBld("townhall", 220, 0, 0), g.makeBld("townhall", 0, 0, 1)];
  for (const k of ["trees", "stones", "forage", "copper", "iron", "fish", "wildlife"])
    g.state[k] = [];
  g.state.autoWorkEnabled = false;
  g.state.growthPolicy = "stable";
  g.state.birthT = 100000;
  g.state.weather = "clear";
  g.state.weatherT = 100000;
  g.state.raidT = 100000;
  g.state.visitorTimer = 900;
  g.state.scoutTimer = 900;
  g.state.conflict = "quiet";
  g.calamityT = 100000;
  g.seaT = 100000;
  for (const t of g.state.tribes) {
    t.thinkT = 100000;
    t.survival.waterLiters = 200;
  }
  const builder = g.spawnUnit("worker", 210, 0, 0);
  builder.order = "hold";
  builder.jobLock = true;
  for (let i = 0; i < 6; i++) {
    const u = g.spawnUnit("worker", 8 + i, 10, 1);
    u.order = "hold";
    u.jobLock = true;
  }
  Object.assign(g.tribe(0), { food: 500, foodLots: { provisions: 500 }, wood: 200, stone: 100 });
  Object.assign(g.tribe(1), {
    food: 500,
    foodLots: { provisions: 500 },
    alive: true,
    hostile: false,
    ally: false,
    recoveryUntil: 0,
    peaceTerm: undefined,
    compactUntil: 0,
    tension: 0,
    trust: 0.5,
    aggro: 0.5,
    expand: 0.5,
  });
  scoutKnowledge(g, { team: 1, x: 100, z: 0 });
  g.vision.fill(2);
  g.rebuildWalk();
  return { g, builder };
}
const output = [];
for (const construct of [false, true]) {
  const { g, builder } = fixture(),
    before = { trust: g.tribe(1).trust, tension: g.tribe(1).tension },
    wood = g.tribe(0).wood;
  let post;
  if (construct) {
    assert.equal(g.placeBuilding("cornerstone", 100, 0), true, g.state.banner);
    post = g.state.buildings.find((b) => b.type === "cornerstone");
    g.clearSelect();
    g.selectEntity(builder);
    g.orderConstruction(post);
  }
  let observed = false,
    walked = 0,
    completedAt;
  for (let i = 0; i < 1200; i++) {
    g.state.paused = false;
    const x = builder.x,
      z = builder.z;
    g.step(0.1);
    walked += Math.hypot(builder.x - x, builder.z - z);
    if (post && g.finished(post) && completedAt === undefined) completedAt = g.state.time;
    observed ||= g.state.units.some(
      (u) => u.team === 1 && u.hp > 0 && Math.hypot(u.x - 100, u.z) < 26,
    );
  }
  assert.equal(observed, false);
  assert.ok(
    g.state.buildings.filter((b) => b.team === 1).every((b) => Math.hypot(b.x - 100, b.z) > 55),
  );
  if (post) assert.ok(g.finished(post));
  output.push({
    construct,
    actualWitnessEverPresent: observed,
    priorTerrainMapped: rivalKnows(g, 1, 100, 0),
    before,
    after: { trust: g.tribe(1).trust, tension: g.tribe(1).tension },
    paidLogs: wood - g.tribe(0).wood,
    completedAt,
    walked,
    errors: g.simulationErrors,
  });
}
console.log(
  JSON.stringify(
    {
      scope:
        "Diagnostic: NPC previously mapped empty terrain. Player then physically pays/builds an outpost there; no current NPC observer ever approaches, no message/returned report. Control has no outpost.",
      output,
      unwitnessedKnowledgeLeak: output[1].after.tension > output[0].after.tension + 0.01,
    },
    null,
    2,
  ),
);
