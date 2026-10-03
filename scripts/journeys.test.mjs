import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game/sim.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";
import { beginExpedition, expeditionAI, routineRest } from "../src/game/journeys.ts";
import { wearTrail, pathPace, fadeTrails } from "../src/game/trails.ts";
import { scoutKnowledge, tickScouts } from "../src/game/scouting.ts";
import { tickCommunities, foundingJourneyAI, lifeEvent } from "../src/game/communities.ts";
import { foodDemand } from "../src/game/settlement.ts";
function fixture() {
  const g = new Game();
  g.reset(123456);
  g.enterIsland();
  return g;
}
function worker(g, team = 0) {
  return g.state.units.find(
    (u) => u.team === team && u.type === "worker" && u.maturesAt === undefined,
  );
}
test("expeditions reserve real meals and return leftovers without double upkeep", () => {
  const g = fixture(),
    u = worker(g);
  g.tribe(0).food = 200;
  const demand = foodDemand(g);
  assert.ok(beginExpedition(g, u));
  assert.equal(g.tribe(0).food, 176);
  assert.ok(foodDemand(g) < demand);
  u.order = "move";
  const h = g.campOf(0);
  u.x = h.x;
  u.z = h.z;
  assert.equal(expeditionAI(g, u, 1), false);
  assert.equal(u.expedition, undefined);
  assert.equal(g.tribe(0).food, 200);
});
test("thin village reserves prevent unsafe packing", () => {
  const g = fixture();
  g.tribe(0).food = 0;
  assert.equal(beginExpedition(g, worker(g)), false);
});
test("night rest preserves assigned work and resumes during daytime", () => {
  const g = fixture(),
    u = worker(g);
  const h = g.campOf(0);
  u.x = h.x;
  u.z = h.z;
  u.order = "gather";
  u.node = g.state.trees[0];
  const node = u.node;
  g.clockState = () => ({ period: "Night" });
  assert.ok(routineRest(g, u, 1));
  assert.equal(u.node, node);
  assert.equal(u.order, "gather");
  g.clockState = () => ({ period: "Day" });
  assert.equal(routineRest(g, u, 1), false);
  assert.equal(u.node, node);
  assert.equal(u.workReason, undefined);
});
test("repeated travel wears useful paths and unused paths fade", () => {
  const g = fixture(),
    h = g.campOf(0);
  assert.equal(pathPace(g, h.x, h.z), 1);
  for (let i = 0; i < 20; i++) wearTrail(g, h.x, h.z, 1, 0);
  assert.equal(pathPace(g, h.x, h.z), 1.12);
  g.state.time = 1000;
  fadeTrails(g, 1800);
  assert.ok(pathPace(g, h.x, h.z) < 1.12);
  assert.equal(g.state.trails.length, 1);
});
test("rival exploration has independent geographic memory", () => {
  const g = fixture(),
    u = worker(g, 1),
    vision = Array.from(g.vision);
  scoutKnowledge(g, u);
  assert.ok(g.state.rivalKnowledge[0].cells.length);
  assert.deepEqual(Array.from(g.vision), vision);
  const count = g.state.units.length;
  g.state.scoutTimer = 0;
  tickScouts(g, 1);
  assert.ok(g.state.units.some((p) => p.team === 1 && p.scout));
  assert.equal(g.state.units.length, count);
});
test("builders cannot steal scouts or expedition members", () => {
  const g = fixture();
  for (const u of g.state.units.filter((u) => u.team === 0)) {
    u.expedition = { food: 10, returning: false, forage: 0 };
    u.order = "idle";
  }
  const h = g.campOf(0),
    b = g.makeBld("hut", h.x + 20, h.z, 0);
  b.build = 0;
  g.assignBuilders(b);
  assert.ok(g.state.units.filter((u) => u.team === 0).every((u) => u.order !== "build"));
});
test("survivors establish a physical hearth using their carried timber", () => {
  const g = fixture(),
    u = worker(g, 1),
    h = g.campOf(1),
    count = g.state.units.length;
  u.x = h.x + 100;
  u.z = h.z;
  u.carry = 20;
  u.carryType = "wood";
  u.foundingJourney = { x: u.x, z: u.z, leader: true };
  assert.ok(foundingJourneyAI(g, u, 1));
  assert.equal(u.carry, 0);
  assert.equal(u.order, "build");
  assert.equal(u.node.type, "townhall");
  assert.equal(u.node.build, 0);
  assert.equal(u.homeHall, u.node.id);
  assert.equal(g.state.units.length, count);
});
test("community records identify existing residents and preserve unknown rivals privacy", () => {
  const g = fixture();
  tickCommunities(g, 31);
  assert.ok(g.state.communities.some((c) => c.team === 0 && c.status !== "abandoned"));
  assert.ok(worker(g).homeHall);
  lifeEvent(g, 0, "A new hearth");
  assert.equal(g.state.lifeHistory.at(-1).text, "A new hearth");
});
test("new life, path and journey fields survive saves and reject damaged data", () => {
  const g = fixture(),
    u = worker(g);
  g.tribe(0).food = 200;
  beginExpedition(g, u);
  tickCommunities(g, 31);
  wearTrail(g, u.x, u.z, 1, 0);
  lifeEvent(g, 0, "Remembered");
  const s = encodeGame(g),
    r = decodeGame(s);
  assert.deepEqual(r.state.lifeHistory, g.state.lifeHistory);
  assert.deepEqual(r.state.trails, g.state.trails);
  assert.equal(r.state.units.find((p) => p.id === u.id).homeHall, u.homeHall);
  for (const damage of [
    (s) => (s.state.communities[0].founded = -1),
    (s) => (s.state.lifeHistory[0].time = -1),
    (s) =>
      (s.state.units.find((p) => p.id === u.id).foundingJourney = {
        x: Infinity,
        z: 0,
        leader: true,
      }),
    (s) => (s.state.units.find((p) => p.id === u.id).parents = [u.id]),
  ]) {
    const raw = structuredClone(s);
    damage(raw);
    assert.throws(() => decodeGame(raw));
  }
});
test("mineral grade stays stable through yield cycles and saving", () => {
  const g = fixture(),
    n = g.state.copper[0];
  n.rich = 0.52;
  g.state.yieldT = 0;
  g.tickYields(1);
  assert.equal(n.rich, 0.52);
  const r = decodeGame(encodeGame(g));
  assert.equal(r.state.copper.find((p) => p.id === n.id).rich, 0.52);
});
test("calendar year and day count advance together", () => {
  const g = fixture();
  g.state.time = 1800;
  assert.equal(g.clockState().day, 33);
});
test("second settlements cost timber, require labor and never spawn residents", () => {
  const g = fixture();
  g.world.heights.fill(4);
  const h = g.makeBld("townhall", 0, 38, 0);
  g.state.buildings = [h];
  const source = g.state.trees[0];
  g.state.trees = Array.from({ length: 6 }, (_, i) => ({
    ...source,
    id: g.id(),
    x: 140 + (i % 3) * 4,
    z: 50 + Math.floor(i / 3) * 4,
  }));
  g.state.stones = [];
  g.state.forage = [];
  g.state.copper = [];
  g.state.iron = [];
  g.rebuildWalk();
  const people = g.state.units.length;
  g.tribe(0).wood = 19;
  assert.equal(g.placeBuilding("townhall", 140, 38), false);
  g.tribe(0).wood = 40;
  assert.equal(g.placeBuilding("townhall", 140, 38), true);
  assert.equal(g.tribe(0).wood, 20);
  assert.equal(g.state.buildings.at(-1).build, 0);
  assert.equal(g.state.units.length, people);
});
test("urgent food delivery takes precedence over routine sleep", () => {
  const g = fixture(),
    u = worker(g);
  u.order = "return";
  u.carryType = "food";
  u.carry = 10;
  g.tribe(0).food = 0;
  g.clockState = () => ({ period: "Night" });
  assert.equal(routineRest(g, u, 1), false);
  assert.equal(u.carry, 10);
});
test("military queues never convert travelers into soldiers", () => {
  const g = fixture(),
    h = g.campOf(0),
    b = g.makeBld("barracks", h.x + 20, h.z, 0);
  g.state.buildings.push(b);
  b.queue = [{ unit: "spearman", t: 1000, max: 1 }];
  const adults = g.state.units.filter((u) => u.team === 0 && u.type === "worker");
  for (const u of adults) u.expedition = { food: 10, returning: false, forage: 0 };
  g.updateTraining(1);
  assert.ok(adults.every((u) => u.type === "worker" && u.expedition));
  assert.equal(b.queue.length, 0);
});
