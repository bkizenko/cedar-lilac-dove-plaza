import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game/sim.ts";
import { carryingCapacity } from "../src/game/haulage.ts";
import { CARCASS_MEAT, carcassAvailable, carcassStateValid, huntable, updateCarcass, wildlifeFleeSpeed, workerHuntAI } from "../src/game/hunting.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";

function fixture(species = "deer") {
  const g = new Game(); g.reset(123456); g.enterIsland();
  g.world.heights.fill(4); g.state.units = []; g.state.buildings = [];
  g.state.trees = []; g.state.forage = []; g.state.fish = []; g.state.stones = [];
  g.state.weather = "clear"; g.clockState = () => ({ period: "Day" });
  g.vision.fill(2);
  g.state.buildings = [g.makeBld("townhall", 0, 60, 0)];
  const u = g.spawnUnit("worker", 0, 38, 0);
  const hp = species === "deer" ? 3 : species === "boar" ? 4 : 2;
  const prey = { id: g.id(), species, x: 3, z: 38, y: 4, hp, maxHp: hp,
    facing: 0, vx: 0, vz: 0, wanderT: 20, fly: 0, scale: 1 };
  g.state.wildlife = [prey];
  Object.assign(u, { order: "gather", node: prey, job: "food", jobLock: true, huntOnly: true });
  g.rebuildWalk();
  return { g, u, prey };
}
function advance(g, u, dt = 0.1) {
  g.state.time += dt; g.navBudget = 5; workerHuntAI(g, u, dt);
}

test("civilian hits yield no meat until the animal dies and its finite carcass is butchered", () => {
  const { g, u, prey } = fixture();
  const food = g.tribe(0).food;
  for (let i = 0; i < 80 && prey.hp === prey.maxHp; i++) advance(g, u);
  assert.equal(prey.hp, 2); assert.equal(u.carry, 0); assert.equal(prey.carcass, undefined);
  for (let i = 0; i < 150 && prey.hp > 0; i++) advance(g, u);
  assert.equal(prey.hp, 0); assert.equal(prey.carcass.meat, 24);
  assert.equal(u.carry, 0); assert.equal(g.tribe(0).food, food);
  for (let i = 0; i < 100 && u.carry === 0; i++) advance(g, u);
  assert.ok(u.carry > 0); assert.equal(prey.carcass.meat + u.carry, 24);
  assert.equal(g.tribe(0).food, food, "only normal delivery may increase village food");
});

test("two civilians share one carcass with exact loads and physically deliver all finite meat", () => {
  const { g, u, prey } = fixture("boar");
  prey.hp = 0; prey.carcass = { meat: 32, diedAt: 0 };
  const other = g.spawnUnit("worker", 4, 38, 0);
  u.haulage = "sled";
  const workers = [u, other], food = g.tribe(0).food;
  for (let i = 0; i < 1800 && g.tribe(0).food < food + 32; i++) {
    g.state.time += 0.1; g.navBudget = 8;
    for (const p of workers) {
      if (p.order === "return") g.workerAI(p, 0.1);
      else {
        Object.assign(p, { order: "gather", node: prey, job: "food", jobLock: true, huntOnly: true });
        workerHuntAI(g, p, 0.1);
      }
      assert.ok(p.carry <= carryingCapacity(p, "food"), "neither a basket nor a sled may overload");
    }
    assert.ok(Math.abs(prey.carcass.meat + workers.reduce((n, p) => n + p.carry, 0) + g.tribe(0).food - food - 32) < 1e-8,
      "meat stays conserved between carcass, carriers and delivered stores");
  }
  assert.equal(g.tribe(0).food, food + 32); assert.equal(prey.carcass.meat, 0);
  for (const p of workers) { p.node = prey; p.order = "gather"; workerHuntAI(g, p, 10); }
  assert.equal(g.tribe(0).food, food + 32); assert.equal(prey.carcass.meat, 0);
});

test("distant or disconnected carcasses cannot be harvested remotely", () => {
  const { g, u, prey } = fixture();
  prey.x = 60; prey.hp = 0; prey.carcass = { meat: 24, diedAt: 0 };
  advance(g, u);
  assert.equal(u.carry, 0); assert.equal(prey.carcass.meat, 24);
  g.height = (x) => x > 20 && x < 40 ? g.world.waterY - 1 : 4; g.rebuildWalk();
  advance(g, u);
  assert.equal(u.carry, 0); assert.equal(prey.carcass.meat, 24);
  assert.equal(u.node, null); assert.match(u.workReason, /blocked/);
});

test("a Stone Age civilian physically pursues moving deer and returns a real meat load", () => {
  const { g, u, prey } = fixture(); prey.x = 14;
  const food = g.tribe(0).food, start = { x: u.x, z: u.z };
  let moved = false;
  for (let i = 0; i < 1200 && g.tribe(0).food === food; i++) {
    g.state.time += 0.1; g.navBudget = 5;
    if (u.order === "return") g.workerAI(u, 0.1);
    else workerHuntAI(g, u, 0.1);
    g.tickWildlife(0.1);
    moved ||= Math.hypot(u.x - start.x, u.z - start.z) > 5;
  }
  assert.ok(moved); assert.equal(prey.hp, 0);
  assert.ok(g.tribe(0).food > food, "actual pursuit, butchery and delivery must complete");
  assert.equal(g.tribe(0).food - food + u.carry + prey.carcass.meat, CARCASS_MEAT.deer);
});

test("hunters cannot discover unseen live prey or create food from legacy dead animals", () => {
  const { g, u, prey } = fixture();
  g.vision.fill(0); workerHuntAI(g, u, 10);
  assert.equal(prey.hp, 3); assert.equal(u.carry, 0); assert.equal(u.node, null);
  g.vision.fill(2); prey.hp = 0; u.node = prey; u.order = "gather";
  assert.equal(huntable(g, prey), false); workerHuntAI(g, u, 10);
  assert.equal(prey.carcass, undefined); assert.equal(u.carry, 0);
  assert.equal(huntable(g, { ...prey, hp: 1, species: "bird" }), false);
});

test("summer carcasses spoil sooner; cold preserves them and spoilage cannot reverse", () => {
  const { g, prey } = fixture(); prey.hp = 0;
  g.state.time = 600; prey.carcass = { meat: 24, diedAt: 450 };
  assert.equal(carcassAvailable(g, prey), false);
  assert.equal(updateCarcass(g, prey), false); assert.equal(prey.carcass.meat, 0);
  g.state.time = 1500;
  assert.equal(carcassAvailable(g, prey), false);
  const fresh = { ...prey, carcass: { meat: 24, diedAt: 1350 } };
  assert.equal(carcassAvailable(g, fresh), true);
  assert.equal(updateCarcass(g, fresh), true); assert.equal(fresh.carcass.meat, 24);
});

test("hunting respects mixed cargo and an equipped spear modestly speeds the kill", () => {
  const { g, u, prey } = fixture();
  Object.assign(u, { carry: 4, carryType: "food", carryFood: "berries" });
  workerHuntAI(g, u, 10); assert.equal(u.order, "return"); assert.equal(prey.hp, 3);
  assert.equal(u.carryFood, "berries"); assert.equal(u.carry, 4);
  Object.assign(u, { carry: 0, carryType: null, carryFood: undefined, type: "spearman", militia: true, order: "gather", gatherT: 0 });
  for (let i = 0; i < 70 && prey.hp > 0; i++) advance(g, u);
  assert.equal(prey.hp, 0); assert.equal(prey.carcass.meat, CARCASS_MEAT.deer); assert.equal(u.carry, 0);
  assert.ok(wildlifeFleeSpeed({ ...prey, hp: 1 }) < wildlifeFleeSpeed({ ...prey, hp: 3 }));
});

test("optional carcass saves preserve remaining meat and reject invalid reconstruction metadata", () => {
  const { g, prey } = fixture(); g.state.time = 40; prey.hp = 0; prey.carcass = { meat: 7, diedAt: 12 };
  const loaded = decodeGame(encodeGame(g));
  assert.deepEqual(loaded.state.wildlife[0].carcass, prey.carcass);
  assert.equal(carcassStateValid(undefined, "deer", 0, 40), true);
  assert.equal(carcassStateValid(prey.carcass, "deer", 0, 40), true);
  for (const invalid of [null, { meat: -1, diedAt: 1 }, { meat: 25, diedAt: 1 }, { meat: 4, diedAt: 41 }, { meat: 4, diedAt: NaN }, { meat: "4", diedAt: 1 }])
    assert.equal(carcassStateValid(invalid, "deer", 0, 40), false);
  assert.equal(carcassStateValid(prey.carcass, "deer", 1, 40), false);
  assert.equal(carcassStateValid(prey.carcass, "bird", 0, 40), false);
});

test('unthreatened animals walk back toward saved grazing grounds rather than drifting away forever',()=>{
 const {g,prey}=fixture();g.state.units=[];Object.assign(prey,{x:80,z:38,grazing:{x:0,z:38},wanderT:0,vx:0,vz:0});
 for(let i=0;i<600;i++)g.tickWildlife(.2);
 assert.ok(Math.hypot(prey.x,prey.z-38)<45);
 const restored=decodeGame(encodeGame(g));assert.deepEqual(restored.state.wildlife[0].grazing,{x:0,z:38});
 const invalid=encodeGame(g);invalid.state.wildlife[0].grazing.x=Infinity;assert.throws(()=>decodeGame(invalid),/damaged/);
});
