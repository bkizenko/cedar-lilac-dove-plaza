import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game/sim.ts";
import { foodAttention, villageAppeal } from "../src/game/migration.ts";
import { tickGates, setGateMode, earthworkPace } from "../src/game/fortifications.ts";
import { beginWeaponWork, weaponWorkAI } from "../src/game/warfare.ts";
import { beginFarmToolWork, farmToolWorkAI } from "../src/game/farmTools.ts";
import { craftingQueue, craftingBenches } from "../src/game/crafting.ts";
import { raiderTarget, seaRaidAI, seaRaidStrength, seaRaidArrivalChance, campRaidAI } from "../src/game/raiders.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";
import { BUILDINGS } from "../src/game/constants.ts";
function fixture() {
  const g = new Game();
  g.reset(123456);
  g.enterIsland();
  g.world.heights.fill(4);
  g.state.buildings = [];
  g.state.units = [];
  g.state.trees = [];
  g.state.stones = [];
  g.state.forage = [];
  g.state.weather = "clear";
  g.clockState = () => ({ period: "Afternoon" });
  g.vision.fill(2);
  g.state.walkDirty = true;
  g.rebuildWalk();
  return g;
}
function bld(g, type, x = 0, z = 38, team = 0) {
  const b = g.makeBld(type, x, z, team);
  g.state.buildings.push(b);
  g.state.walkDirty = true;
  return b;
}
test("food wealth increases attraction and danger monotonically without unbounded raid pressure", () => {
  const g = fixture();
  bld(g, "townhall");
  g.spawnUnit("worker", 8, 38, 0);
  const t = g.tribe(0);
  let prior = [-1, -1, -1];
  for (const food of [0, 100, 400, 1600, 10000]) {
    t.food = food;
    const v = [foodAttention(g), villageAppeal(g), g.raidThreat()];
    for (let i = 0; i < 3; i++) assert.ok(v[i] >= prior[i]);
    prior = v;
  }
  assert.ok(prior[0] < 1);
  assert.ok(prior[2] <= 0.78);
});
test("gates admit routes in peace, shut against enemies and never close on occupants", () => {
  const g = fixture(),
    gate = bld(g, "gate");
  tickGates(g);
  assert.equal(gate.gateOpen, true);
  assert.equal(g.solidBuilding(gate), false);
  const enemy = g.spawnUnit("spearman", 10, 38, 3);
  tickGates(g);
  assert.equal(gate.gateOpen, false);
  assert.equal(g.solidBuilding(gate), true);
  enemy.x = 0;
  setGateMode(g, gate, "closed");
  assert.equal(gate.gateOpen, true);
  enemy.x = 10;
  tickGates(g);
  assert.equal(gate.gateOpen, false);
  setGateMode(g, gate, "open");
  assert.equal(gate.gateOpen, true);
  assert.equal(g.canStep(enemy, 0, 38), true);
});
test("built walls obstruct and earthworks slow everyone; plans do neither", () => {
  const g = fixture(),
    wall = bld(g, "palisade"),
    u = g.spawnUnit("worker", 8, 38, 0);
  assert.equal(g.canStep(u, 0, 38), false);
  wall.plannedCost = { wood: 6 };
  assert.equal(g.canStep(u, 0, 38), true);
  const trench = bld(g, "trench", 20);
  assert.equal(earthworkPace(g, 20, 38), 0.5);
  const moat = bld(g, "moat", 30);
  assert.equal(earthworkPace(g, 30, 38), 0.25);
  moat.build = 0.2;
  assert.equal(earthworkPace(g, 30, 38), 1);
  trench.hp = 0;
  assert.equal(earthworkPace(g, 20, 38), 1);
  assert.equal(BUILDINGS.moat.age, 4);
  assert.match(g.placementIssue("moat", 60, 38), /river or shore/);
});
test("workshop shares three benches across weapons and tools; paid extra projects wait and then finish", () => {
  const g = fixture(),
    shop = bld(g, "workshop");
  Object.assign(g.tribe(0), { wood: 100, stone: 100 });
  const workers = Array.from({ length: 4 }, (_, i) => g.spawnUnit("worker", 8 + i, 38, 0));
  for (let i = 0; i < 3; i++) assert.equal(beginWeaponWork(g, "spear", 0, shop.id), true);
  assert.equal(beginFarmToolWork(g, "stoneHoe", 0, shop.id), true);
  assert.equal(craftingQueue(g, shop).length, 4);
  assert.equal(craftingBenches(shop), 3);
  const queued = workers.find((u) => u.farmToolWork);
  g.buildingWorkReached = () => true;
  farmToolWorkAI(g, queued, 1);
  assert.equal(queued.farmToolWork.progress, 0);
  assert.equal(queued.craftingXP, undefined);
  const before = g.tribe(0).spears;
  for (let i = 0; i < 150; i++) {
    for (const u of workers) {
      weaponWorkAI(g, u, 1);
      farmToolWorkAI(g, u, 1);
    }
  }
  assert.equal(g.tribe(0).spears, before + 3);
  assert.equal(queued.farmTool, "stoneHoe");
  assert.ok(queued.craftingXP > 0);
});
test("raiders favor accessible exposed supplies and retreat from overwhelming defense", () => {
  const g = fixture(),
    u = g.spawnUnit("spearman", 0, 0, 3);
  const store = bld(g, "warehouse", 20, 0),
    tower = bld(g, "keep", -20, 0);
  g.rebuildWalk();
  assert.equal(raiderTarget(g, u), store);
  u.seaRaid = { x: -40, z: 0, goalX: 20, goalZ: 0, phase: "raid", thinkAt: 0, departAt: 480 };
  u.hp = u.maxHp * 0.2;
  g.navBudget = 10;
  seaRaidAI(g, u, 0.1);
  assert.equal(u.seaRaid.phase, "retreat");
  assert.equal(u.tx, -40);
  assert.equal(u.target, null);
  assert.ok(tower.hp > 0);
});
test("raiders breach a reachable wall when stores are enclosed", () => {
  const g = fixture();
  const store = bld(g, "warehouse", 0, 0);
  for (let x = -12; x <= 12; x += 4) {
    bld(g, "palisade", x, -12);
    bld(g, "palisade", x, 12);
  }
  for (let z = -8; z <= 8; z += 4) {
    bld(g, "palisade", -12, z);
    bld(g, "palisade", 12, z);
  }
  g.rebuildWalk();
  const u = g.spawnUnit("spearman", 0, -24, 3);
  const target = raiderTarget(g, u);
  assert.notEqual(target, store);
  assert.equal(target?.type, "palisade");
});
test("raiders carry only finite ruined supplies and leave by their landing; walls yield no pantry loot", () => {
  const g = fixture(),
    u = g.spawnUnit("spearman", 0, 0, 3),
    ruin = bld(g, "warehouse", 0, 0);
  ruin.hp = 0;
  ruin.lootTeam = 3;
  ruin.raidLoot = { food: 8 };
  u.seaRaid = { x: -20, z: 0, goalX: 0, goalZ: 0, phase: "raid", thinkAt: 0, departAt: 480 };
  seaRaidAI(g, u, 0.1);
  assert.equal(u.carry, 8);
  assert.equal(ruin.raidLoot.food, 0);
  assert.equal(u.seaRaid.phase, "retreat");
  u.x = -20;
  seaRaidAI(g, u, 0.1);
  assert.equal(u.hp, 0);
  assert.equal(u.carry, 0);
  const wall = bld(g, "palisade", 20, 0),
    before = g.tribe(0).food;
  g.lootBuilding(3, wall);
  assert.equal(g.tribe(0).food, before);
  assert.equal(wall.raidLoot, undefined);
});
test("forts, gate state, crafting experience and raid journeys survive saves; malformed values fail", () => {
  const g = fixture(),
    gate = bld(g, "gate");
  setGateMode(g, gate, "closed");
  const u = g.spawnUnit("spearman", 20, 38, 3);
  u.craftingXP = 12;
  u.seaRaid = { x: 30, z: 38, goalX: 0, goalZ: 38, phase: "retreat", thinkAt: 3, departAt: 480 };
  const save = encodeGame(g),
    loaded = decodeGame(save);
  assert.equal(loaded.state.buildings[0].gateMode, "closed");
  assert.deepEqual(loaded.state.units[0].seaRaid, u.seaRaid);
  assert.equal(loaded.state.units[0].craftingXP, 12);
  save.state.buildings[0].gateMode = "banana";
  assert.throws(() => decodeGame(save));
});
test("an actual raider advances to a wall and breaches it", () => {
  const g = fixture(),
    wall = bld(g, "palisade", 0, 0),
    u = g.spawnUnit("spearman", 0, -16, 3);
  wall.hp = 35;
  u.seaRaid = { x: 0, z: -30, goalX: 0, goalZ: 0, phase: "raid", thinkAt: 0, departAt: 480 };
  g.rebuildWalk();
  for (let i = 0; i < 1200 && wall.hp > 0; i++) {
    g.navBudget = 20;
    g.state.time += 0.1;
    seaRaidAI(g, u, 0.1);
  }
  assert.ok(wall.hp <= 0, `wall hp ${wall.hp}; raider ${u.x},${u.z}, stuck ${u.stuckT}`);
});
test("surplus shortens migration intervals while arrivals still respect housing capacity", () => {
  const run = (food) => {
    const g = fixture();
    bld(g, "townhall");
    bld(g, "hut", 20);
    for (let i = 0; i < 5; i++) g.spawnUnit("worker", 8 + i, 38, 0);
    g.tribe(0).food = food;
    g.state.growthPolicy = "eager";
    g.state.time = 601;
    g.seaT = 0;
    const random = Math.random;
    try {
      Math.random = () => 0.85;
      g.tickSea(1);
    } finally {
      Math.random = random;
    }
    assert.ok(g.popNow(0) <= g.popCap(0));
    return { interval: g.seaT, pop: g.popNow(0) };
  };
  const modest = run(200),
    rich = run(1500);
  assert.ok(rich.interval < modest.interval);
  assert.ok(rich.pop >= modest.pop);
});
test("unspecified workplace assignments spread crafting over spare benches", () => {
  const g = fixture(),
    first = bld(g, "workshop"),
    second = bld(g, "workshop", 30);
  Object.assign(g.tribe(0), { wood: 100, stone: 100 });
  for (let i = 0; i < 4; i++) g.spawnUnit("worker", 8 + i, 38, 0);
  for (let i = 0; i < 4; i++) assert.equal(beginWeaponWork(g, "spear"), true);
  assert.ok(craftingQueue(g, first).length > 0);
  assert.ok(craftingQueue(g, second).length > 0);
  assert.ok(craftingQueue(g, first).length <= 3);
  assert.ok(craftingQueue(g, second).length <= 3);
});
test("a loaded worker crosses an automatic gate and delivers to enclosed storage", () => {
  const g = fixture();
  bld(g, "townhall", 0, 0);
  for (let x = -16; x <= 16; x += 4) {
    bld(g, x === 0 ? "gate" : "palisade", x, -16);
    bld(g, "palisade", x, 16);
  }
  for (let z = -12; z <= 12; z += 4) {
    bld(g, "palisade", -16, z);
    bld(g, "palisade", 16, z);
  }
  const u = g.spawnUnit("worker", 0, -30, 0);
  Object.assign(u, { order: "return", carry: 8, carryType: "wood", recalled: true });
  const wood = g.tribe(0).wood;
  for (let i = 0; i < 1500 && u.carry; i++) {
    g.state.time += 0.1;
    g.navBudget = 20;
    tickGates(g);
    g.workerAI(u, 0.1);
  }
  assert.equal(u.carry, 0, `carrier ${u.x},${u.z}: ${u.workReason}`);
  assert.equal(g.tribe(0).wood, wood + 8);
});
test("all defense geometry has finite, compact coordinates", async () => {
  const { buildingGeos } = await import("../src/scene/meshes.ts");
  const geos = buildingGeos();
  for (const type of ["palisade", "gate", "stonewall", "trench", "moat"])
    for (const part of ["timber", "roof"]) {
      const geo = geos[type][part];
      geo.computeBoundingBox();
      assert.ok(geo.getAttribute("position").count < 4000);
      for (const v of geo.getAttribute("position").array) assert.ok(Number.isFinite(v));
      assert.ok(geo.boundingBox.max.x <= 2.001);
      assert.ok(geo.boundingBox.min.x >= -2.001);
      geo.dispose();
    }
});

test('camp patrols avoid escorted cargo, then steal finite unguarded goods',()=>{
 const g=fixture(),camp=bld(g,'hut',-20,0,3);camp.raiderCamp=true;const u=g.spawnUnit('spearman',0,0,3);u.homeCamp=camp.id;g.state.time=600;g.state.conflict='dangerous';
 const carrier=g.spawnUnit('worker',1,0,0);carrier.carry=3;carrier.carryType='wood';const escort=g.spawnUnit('spearman',3,0,0);
 campRaidAI(g,u,.1);assert.equal(carrier.carry,3);assert.equal(u.carry,0);
 escort.hp=0;u.x=0;u.z=0;campRaidAI(g,u,.1);assert.equal(carrier.carry,0);assert.equal(u.carry,3);
});

test('changing village priorities releases queued crafters without losing their paid project',()=>{
 const g=fixture(),shop=bld(g,'workshop');Object.assign(g.tribe(0),{wood:100,stone:100});for(let i=0;i<4;i++)g.spawnUnit('worker',8+i,38,0);
 for(let i=0;i<4;i++)assert.equal(beginWeaponWork(g,'spear',0,shop.id),true);
 const queue=craftingQueue(g,shop),waiting=queue[3],wood=g.tribe(0).wood;g.setLaborPriority('wood');
 assert.equal(waiting.weaponWork.paused,true);assert.notEqual(waiting.order,'hold');assert.equal(g.tribe(0).wood,wood);assert.equal(queue[0].weaponWork.paused,undefined);assert.equal(queue[0].order,'hold');
});

test("large Stone Age towns face substantial sea parties while small first villages retain scouts",()=>{
 assert.equal(seaRaidStrength(5,0,.6,1,.2).count,1);
 const forty=seaRaidStrength(40,0,.6,1,.5);assert.ok(forty.count>=6);assert.ok(forty.condition>=.9);
 assert.ok(seaRaidStrength(150,3,.6,2,.5).count>forty.count);
 assert.ok(seaRaidStrength(150,5,1,99,1,true).count<=20);
 assert.ok(seaRaidArrivalChance(.5,true)>seaRaidArrivalChance(.5,false));
});
test("visible shore departure explains retreat instead of silently deleting the last raider",()=>{
 const g=fixture(),u=g.spawnUnit('spearman',0,0,3);g.vision.fill(2);
 u.seaRaid={x:0,z:0,goalX:40,goalZ:0,phase:'retreat',thinkAt:0,departAt:480};u.carry=4;u.carryType='wood';seaRaidAI(g,u,.1);
 assert.equal(u.hp,0);assert.equal(u.carry,0);assert.match(g.state.banner,/escaped with stolen/);
 const v=g.spawnUnit('spearman',0,0,3);v.seaRaid={x:0,z:0,goalX:40,goalZ:0,phase:'retreat',thinkAt:0,departAt:480};g.vision.fill(0);g.state.banner='';seaRaidAI(g,v,.1);assert.equal(g.state.banner,'','unseen departures do not reveal remote positions');
});
