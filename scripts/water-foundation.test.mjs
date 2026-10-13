import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game/sim.ts";
import { foundingJourneyAI } from "../src/game/communities.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";

function emptyLand() {
  const g = new Game(); g.reset(123456); g.enterIsland();
  g.world.heights.fill(4);
  g.state.units = []; g.state.buildings = [];
  g.state.forage = []; g.state.trees = []; g.state.stones = [];
  g.state.weather = "clear"; g.vision.fill(2); g.rebuildWalk();
  return g;
}

test("sea arrivals replace the seed-1 underwater landing with dry connected foundations", () => {
  const g = new Game(); g.reset(1, 2);
  const oldX = Math.sin(-2.1) * g.world.islandR * 0.62;
  const oldZ = Math.cos(-2.1) * g.world.islandR * 0.62;
  assert.ok(g.height(oldX, oldZ) < g.world.waterY, "reproduce the old submerged landing");
  for (const u of g.state.units.filter(u => u.team === 2)) u.hp = 0;
  for (const b of g.state.buildings.filter(b => b.team === 2)) b.hp = 0;
  g.tribe(2).alive = false; g.state.walkDirty = true;
  assert.equal(g.landSeaTribe(2), true);
  const buildings = g.state.buildings.filter(b => b.team === 2 && b.hp > 0);
  assert.equal(buildings.length, 2);
  for (const b of buildings) assert.ok(g.dryFoundation(b.type, b.x, b.z, 2));
  g.rebuildWalk();
  assert.ok(g.workBoard.connected(g, buildings[0].x, buildings[0].z, buildings[1].x, buildings[1].z));
  for (const u of g.state.units.filter(u => u.team === 2 && u.hp > 0)) {
    assert.ok(g.height(u.x, u.z) > g.world.waterY + 0.3);
    assert.ok(g.workBoard.connected(g, u.x, u.z, buildings[0].x, buildings[0].z));
  }
});

test("a landing without suitable dry foundations does not revive or rewrite the faction", () => {
  const g = emptyLand(); g.tribe(2).alive = false;
  const before = JSON.stringify(g.tribe(2)), camps = JSON.stringify(g.world.camps);
  g.world.heights.fill(g.world.waterY - 1); g.rebuildWalk();
  assert.equal(g.landSeaTribe(2), false);
  assert.equal(JSON.stringify(g.tribe(2)), before);
  assert.equal(JSON.stringify(g.world.camps), camps);
  assert.equal(g.state.units.length, 0); assert.equal(g.state.buildings.length, 0);
});

test("founders reroute the whole party after flooding and spend logs only at the valid replacement", () => {
  const g = emptyLand();
  g.height = (x) => Math.abs(x) < 5 ? g.world.waterY - 0.2 : 4;
  const leader = g.spawnUnit("worker", -10, 70, 1), follower = g.spawnUnit("worker", -12, 70, 1);
  Object.assign(leader, { carry: 20, carryType: "wood", foundingJourney: { x: 0, z: 70, leader: true } });
  follower.foundingJourney = { x: 0, z: 70, leader: false }; g.rebuildWalk();
  foundingJourneyAI(g, leader, 0.1);
  assert.equal(leader.carry, 20); assert.equal(g.state.buildings.length, 0);
  assert.ok(leader.foundingJourney); assert.notEqual(leader.foundingJourney.x, 0);
  assert.deepEqual({ x: follower.foundingJourney.x, z: follower.foundingJourney.z },
    { x: leader.foundingJourney.x, z: leader.foundingJourney.z });
  assert.ok(g.dryFoundation("townhall", leader.foundingJourney.x, leader.foundingJourney.z));
  for (let i = 0; i < 600 && leader.foundingJourney; i++) {
    g.state.time += 0.1; g.navBudget = 5; foundingJourneyAI(g, leader, 0.1);
  }
  assert.equal(leader.carry, 0);
  assert.equal(g.state.buildings.length, 1); assert.equal(g.state.buildings[0].build, 0);
  assert.ok(g.dryFoundation("townhall", g.state.buildings[0].x, g.state.buildings[0].z));
});

test("blocked founders cancel safely with cargo intact if no reachable replacement exists", () => {
  const g = emptyLand(), leader = g.spawnUnit("worker", 0, 70, 1), follower = g.spawnUnit("worker", 1, 70, 1);
  Object.assign(leader, { carry: 20, carryType: "wood", foundingJourney: { x: 0, z: 70, leader: true } });
  follower.foundingJourney = { x: 0, z: 70, leader: false };
  g.world.heights.fill(g.world.waterY - 1); g.rebuildWalk();
  const wood = g.tribe(1).wood;
  foundingJourneyAI(g, leader, 0.1);
  assert.equal(leader.foundingJourney, undefined); assert.equal(follower.foundingJourney, undefined);
  assert.equal(leader.carry, 20); assert.equal(leader.carryType, "wood");
  assert.equal(g.tribe(1).wood, wood); assert.equal(g.state.buildings.length, 0);
});

test("generated starting buildings stay dry while loading preserves existing buildings exactly", () => {
  for (const seed of [1, 31, 71, 982]) {
    const g = new Game(); g.reset(seed, 2);
    for (const b of g.state.buildings.filter(b => !["dock", "bridge"].includes(b.type)))
      assert.ok(g.dryFoundation(b.type, b.x, b.z), `seed ${seed}: ${b.type} foundation`);
    const raw = JSON.parse(JSON.stringify(encodeGame(g))), loaded = decodeGame(raw);
    assert.deepEqual(loaded.state.buildings, raw.state.buildings);
    assert.deepEqual(loaded.world.heights, g.world.heights);
  }
});

test("a follower stops waiting when the founding leader dies before building", () => {
  const g = emptyLand(), leader = g.spawnUnit("worker", 0, 70, 1), follower = g.spawnUnit("worker", 1, 70, 1);
  leader.foundingJourney = { x: 0, z: 70, leader: true }; leader.hp = 0;
  follower.foundingJourney = { x: 0, z: 70, leader: false };
  foundingJourneyAI(g, follower, 0.1);
  assert.equal(follower.foundingJourney, undefined);
  assert.equal(follower.order, "idle");
  assert.equal(g.state.buildings.length, 0);
});
