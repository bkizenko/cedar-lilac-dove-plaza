import test from "node:test";
import assert from "node:assert/strict";
import { predisposition } from "../src/game/people.ts";
import { Game } from "../src/game/sim.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";
import { neighborIntent, farmWork, crop } from "../src/game/settlement.ts";
const fixture = () => {
  const g = new Game();
  g.reset(123456);
  g.enterIsland();
  return g;
};
function militaryFixture() {
  const g = fixture(), home = g.campOf(0);
  g.spawnUnit("spearman", home.x + 4, home.z - 5, 0);
  g.spawnUnit("spearman", home.x - 5, home.z - 4, 0);
  return g;
}
test("save restores full state and object identity", () => {
  const g = fixture(),
    w = g.state.units.find((u) => u.team === 0 && u.type === "worker"),
    enemy = g.state.units.find((u) => u.team !== 0);
  w.node = g.state.forage[0];
  w.order = "gather";
  w.target = enemy;
  g.state.weather = "frost";
  g.state.weatherT = 123;
  g.state.tribes[0].copper = 47;
  g.state.agePicks = ["econ"];
  g.vision[0] = 1;
  g.visAge[0] = 42;
  g.seaT = 17;
  g.calamityT = 23;
  g.looted.add(999);
  const r = decodeGame(JSON.parse(JSON.stringify(encodeGame(g)))),
    rw = r.state.units.find((u) => u.id === w.id);
  assert.equal(rw.node, r.state.forage[0]);
  assert.equal(
    rw.target,
    r.state.units.find((u) => u.id === enemy.id),
  );
  assert.equal(r.state.weatherT, 123);
  assert.equal(r.state.tribes[0].copper, 47);
  assert.equal(r.seaT, 17);
  assert.equal(r.calamityT, 23);
  assert.equal(r.vision[0], 1);
  assert.equal(r.visAge[0], 42);
  assert.deepEqual(r.state.agePicks, ["econ"]);
  assert.equal(r.state.paused, true);
  assert.notEqual(rw, w);
});
test("invalid saves do not mutate original", () => {
  const g = fixture(),
    s = encodeGame(g);
  assert.throws(() => decodeGame({ ...s, version: -1 }));
  s.state.units[0].x = NaN;
  assert.throws(() => decodeGame(s));
  assert.ok(Number.isFinite(g.state.units[0].x));
});
test("ten simulated minutes remain finite and saveable", () => {
  const g = fixture();
  for (let i = 0; i < 18000; i++) g.step(1 / 30);
  assert.ok(g.state.units.every((u) => [u.x, u.y, u.z, u.hp].every(Number.isFinite)));
  assert.doesNotThrow(() => decodeGame(encodeGame(g)));
});
test("hold fires in place; attack-move resumes", () => {
  const g = fixture(),
    a = g.spawnUnit("spearman", g.campOf(0).x, g.campOf(0).z, 0);
  const enemy = g.spawnUnit("spearman", a.x + 1, a.z, 3);
  enemy.hp = 100;
  a.order = "hold";
  a.cd = 0;
  const x = a.x,
    z = a.z;
  g.updateVision();
  g.combatAI(a, 1 / 30);
  assert.ok(enemy.hp < 100);
  assert.equal(a.x, x);
  assert.equal(a.z, z);
  assert.equal(a.order, "hold");
  g.clearSelect();
  a.selected = true;
  g.issueMove(x + 20, z + 20, true);
  g.combatAI(a, 1 / 30);
  assert.equal(a.order, "attack");
  enemy.hp = 0;
  g.combatAI(a, 1 / 30);
  assert.equal(a.order, "attackmove");
  assert.equal(a.tx, x + 20);
  assert.equal(a.tz, z + 20);
});
test("exploration does not vanish after 55 seconds", () => {
  const g = fixture();
  g.vision[0] = 2;
  g.updateVision(100);
  assert.equal(g.vision[0], 1);
});
test("A* exits a U obstacle and forbids diagonal clipping", async () => {
  const { findPath } = await import("../src/game/navigation.ts");
  const grid = new Uint8Array(100).fill(1);
  for (let z = 2; z <= 7; z++) {
    grid[z * 10 + 3] = 0;
    grid[z * 10 + 7] = 0;
  }
  for (let x = 3; x <= 7; x++) grid[7 * 10 + x] = 0;
  const path = findPath(grid, 10, 55, 85);
  assert.ok(path && path.length > 12);
  assert.ok(path.every((n) => grid[n]));
  assert.equal(findPath(new Uint8Array([1, 0, 0, 1]), 2, 0, 3), null);
});
test("unit routes around a hall without teleporting", () => {
  const g = fixture();
  g.state.buildings = [];
  g.state.units = [];
  const b = g.makeBld("townhall", 0, 38, 0);
  g.state.buildings.push(b);
  const u = g.spawnUnit("spearman", -12, 38, 0);
  u.tx = 12;
  u.tz = 38;
  u.order = "move";
  g.state.walkDirty = true;
  let maxStep = 0;
  for (let i = 0; i < 1200; i++) {
    g.navBudget = 4;
    const x = u.x,
      z = u.z;
    g.steer(u, 1 / 30);
    g.state.time += 1 / 30;
    maxStep = Math.max(maxStep, Math.hypot(u.x - x, u.z - z));
  }
  assert.ok(maxStep <= u.speed * predisposition(u).speed / 30 + 1e-5);
  assert.ok(Math.hypot(u.x - 12, u.z - 38) < 1, `final ${u.x},${u.z}`);
});

test("backup survives a corrupt primary save and quota failure", async () => {
  const { saveGame, loadRaw } = await import("../src/game/save.ts");
  const { SAVE_KEY } = await import("../src/game/constants.ts");
  const entries = new Map();
  globalThis.localStorage = {
    getItem: (k) => entries.get(k) || null,
    setItem: (k, v) => entries.set(k, v),
  };
  const g = fixture();
  assert.equal(saveGame(g), true);
  g.state.tribes[0].food = 321;
  assert.equal(saveGame(g), true);
  entries.set(SAVE_KEY, "broken");
  assert.ok(loadRaw());
  globalThis.localStorage.setItem = () => {
    throw new Error("quota");
  };
  assert.equal(saveGame(g), false);
  assert.ok(loadRaw());
  delete globalThis.localStorage;
});
test("acoustic score crossfades, holds peace, and releases audio", async () => {
  const { AcousticScore } = await import("../src/game/music.ts");
  const decks = [];
  globalThis.document = { hidden: false, addEventListener() {}, removeEventListener() {} };
  globalThis.Audio = class {
    volume = 0;
    currentTime = 0;
    paused = false;
    constructor(src) {
      this.src = src;
      decks.push(this);
    }
    listeners = {};
    addEventListener(name, callback) { this.listeners[name] = callback; }
    play() {
      this.paused = false;
      return Promise.resolve();
    }
    pause() {
      this.paused = true;
    }
    removeAttribute() {
      this.src = "";
    }
    load() {}
  };
  const score = new AcousticScore();
  score.unlock();
  score.update("village", 12, false);
  assert.equal(decks[0].volume, 0.15);
  score.update("battle", 2, false);
  assert.equal(score.stage, "battle");
  assert.ok(decks[0].volume > 0 && decks[2].volume > 0);
  score.update("adventure", 10, false);
  assert.equal(score.stage, "battle");
  score.update("adventure", 10, false);
  assert.equal(score.stage, "adventure");
  decks[1].pause();
  decks[1].listeners.ended();
  score.update("adventure", 30, false);
  assert.equal(decks[1].paused, true, "a piece is followed by quiet time");
  score.update("adventure", 110, false);
  assert.equal(decks[1].paused, false, "music resumes after the rest");
  score.setMuted(true);
  assert.ok(decks.every((a) => a.volume === 0));
  score.update("adventure", 1, true);
  assert.ok(decks.every((a) => a.paused));
  score.dispose();
  assert.ok(decks.every((a) => a.src === ""));
  delete globalThis.Audio;
  delete globalThis.document;
});

test("crowd separation handles coincident spawns and honors hold", () => {
  const g = fixture();
  g.state.units = [];
  g.state.buildings = [];
  const a = g.spawnUnit("spearman", 0, 38, 0),
    b = g.spawnUnit("spearman", 0, 38, 0);
  a.order = "hold";
  b.order = "idle";
  g.separate(1 / 30);
  assert.equal(a.x, 0);
  assert.equal(a.z, 38);
  assert.ok(Math.hypot(b.x - a.x, b.z - a.z) > 0);
  assert.ok(g.canStep(b, b.x, b.z));
});

test("camera keys work from HUD buttons but not text fields", async () => {
  const { KeyboardCommands } = await import("../src/game/keyboard.ts");
  const g = fixture();
  let focused = false;
  const e = {
    game: g,
    keys: new Set(),
    canvas: {
      focus() {
        focused = true;
      },
    },
    pushHud() {},
  };
  const keys = new KeyboardCommands(e);
  const button = { closest: (q) => (q === "button,a,summary" ? {} : null) };
  keys.key({ code: "KeyW", target: button, preventDefault() {}, repeat: false });
  assert.ok(e.keys.has("KeyW"));
  assert.equal(focused, true);
  const input = { closest: (q) => (q.includes("input") ? {} : null) };
  keys.key({ code: "KeyD", target: input, preventDefault() {} });
  assert.equal(e.keys.size, 0);
});
test("task board reserves slots and falls back to other useful work", async () => {
  const g = fixture();
  g.state.units = [];
  g.state.buildings = [];
  g.state.wildlife = [];
  g.state.forage = g.state.forage.slice(0, 1);
  g.state.copper = [];
  g.state.iron = [];
  const n = g.state.forage[0];
  n.amount = 20;
  n.x = 0;
  n.z = 38;
  const tree = g.state.trees[0];
  tree.x = 3;
  tree.z = 38;
  tree.amount = 20;
  g.state.trees = [tree];
  const camp = g.makeBld("lumber", 3, 38, 0);
  camp.build = 1;
  g.state.buildings = [camp];
  g.tribe(0).food = 0;
  const us = Array.from({ length: 4 }, () => g.spawnUnit("worker", 0, 38, 0));
  g.vision.fill(2);
  for (const u of us) g.workBoard.assign(g, u);
  assert.equal(us.filter((u) => u.node === n).length, 2);
  assert.equal(us.filter((u) => u.node === tree).length, 2);
  assert.ok(us.every((u) => u.order === "gather"));
});
test("blocked workers release the task and explain lack of work", () => {
  const g = fixture();
  g.state.buildings = [];
  g.state.wildlife = [];
  g.state.forage = [];
  g.state.trees = [];
  g.state.stones = [];
  g.state.copper = [];
  g.state.iron = [];
  const u = g.state.units.find((u) => u.type === "worker" && u.team === 0);
  u.order = "idle";
  g.workBoard.reset();
  g.workerAI(u, 1 / 30);
  assert.match(u.workReason, /No known reachable work/);
});
test("civilians shelter, armed residents defend, and then resume jobs", async () => {
  const { emergencyResponse } = await import("../src/game/settlement.ts");
  const g = fixture();
  g.state.units = [];
  const a = g.spawnUnit("worker", 0, 38, 0),
    b = g.spawnUnit("worker", 1, 38, 0);
  a.job = "wood";
  a.jobLock = true;
  g.tribe(0).spears = 1;
  g.tribe(0).bows = 0;
  const foe = g.spawnUnit("spearman", 5, 38, 3);
  g.updateVision();
  assert.equal(emergencyResponse(g, a, 1 / 30), true);
  assert.equal(a.type, "spearman");
  assert.equal(a.target, foe);
  assert.equal(g.tribe(0).spears, 0);
  assert.equal(emergencyResponse(g, b, 1 / 30), true);
  assert.equal(b.type, "worker");
  assert.match(b.workReason, /shelter/);
  foe.hp = 0;
  g.state.time = 11;
  assert.equal(emergencyResponse(g, a, 1 / 30), false);
  assert.equal(a.type, "worker");
  assert.equal(a.job, "wood");
  assert.equal(a.jobLock, true);
  assert.equal(g.tribe(0).spears, 1);
});
test("farms require seasonal labor and uncollected harvest expires", async () => {
  const { farmWork, crop } = await import("../src/game/settlement.ts");
  const g = fixture();
  const b = g.makeBld("farm", 12, 38, 0);
  b.build = 1;
  const u = g.spawnUnit("worker", 12, 38, 0);
  farmWork(g, u, b, 180);
  assert.equal(b.crop.planted, 1);
  assert.equal(u.carry, 0);
  g.state.time = 450;
  farmWork(g, u, b, 220);
  assert.equal(b.crop.tended, 1);
  g.state.time = 900;
  farmWork(g, u, b, 0.8);
  assert.equal(u.carry, 2);
  const {soilQuality}=await import("../src/game/ecology.ts");
  assert.equal(b.crop.remaining, Math.floor(260*1.2*(0.65+soilQuality(g,b.x,b.z)*0.5))-2);
  g.state.time = 1350;
  crop(g, b);
  assert.equal(b.crop.remaining, 0);
  g.state.time = 1800;
  crop(g, b);
  assert.equal(b.crop.planted, 0);
});
test("neighbor decisions respect grace period, trust and quiet frontier", async () => {
  const { neighborIntent } = await import("../src/game/settlement.ts");
  const g = fixture(),
    t = g.tribe(1);
  t.ally = false;
  t.hostile = true;
  t.tension = 1;
  t.aggro = 1;
  for (let i = 0; i < 12; i++) g.spawnUnit("spearman", 80, -80, 1);
  assert.equal(neighborIntent(g, 1), "trade");
  g.state.time = 700;
  assert.equal(neighborIntent(g, 1), "raid");
  t.trust = 0.5;
  assert.equal(neighborIntent(g, 1), "trade");
  t.trust = 0;
  t.hostile = false;
  g.state.conflict = "quiet";
  assert.equal(neighborIntent(g, 1), "trade");
});
test("new seasonal, work and emergency state survives saving", async () => {
  const g = fixture(),
    u = g.state.units.find((u) => u.team === 0 && u.type === "worker"),
    b = g.state.buildings[0];
  g.state.laborPolicy = "food";
  g.state.conflict = "quiet";
  u.emergency = { until: 20, job: "wood", jobLock: true, autoArmed: false };
  u.workReason = "Taking shelter";
  b.crop = { year: 0, planted: 0.5, tended: 0.2, remaining: 0, ripened: false };
  g.tribe(1).trust = 0.4;
  const r = decodeGame(encodeGame(g));
  assert.equal(r.state.laborPolicy, "food");
  assert.equal(r.state.conflict, "quiet");
  assert.deepEqual(r.state.units.find((x) => x.id === u.id).emergency, u.emergency);
  assert.deepEqual(r.state.buildings[0].crop, b.crop);
  assert.equal(r.tribe(1).trust, 0.4);
});

test("raid marches toward an unseen settlement instead of reacquiring it forever", () => {
  const g = militaryFixture(),
    hall = g.state.buildings.find((b) => b.team === 1 && b.type === "townhall");
  g.vision.fill(1);
  g.issuePillage(hall);
  const army = g.state.units.filter((u) => u.team === 0 && u.type !== "worker");
  assert.ok(army.length);
  for (const u of army) {
    assert.equal(u.order, "attackmove");
    assert.equal(u.target, null);
    assert.ok(u.attackDestination);
  }
  const u = army[0],
    x = u.x,
    z = u.z;
  for (let i = 0; i < 90; i++) {
    g.navBudget = 4;
    g.combatAI(u, 1 / 30);
    g.updateProjectiles(1 / 30);
    g.state.time += 1 / 30;
  }
  assert.ok(Math.hypot(u.x - x, u.z - z) > 0.2, `raid stayed at ${x},${z}`);
});
test("truce clears both armies targets and prevents immediate renewed hostility", () => {
  const g = militaryFixture(),
    hall = g.state.buildings.find((b) => b.team === 1 && b.type === "townhall");
  g.vision.fill(1);
  g.issuePillage(hall);
  const enemy = g.state.units.find((u) => u.team === 1 && u.type !== "worker"),
    ours = g.state.units.find((u) => u.team === 0 && u.type !== "worker");
  enemy.target = ours;
  enemy.order = "attack";
  g.agreeTruce(1);
  assert.equal(g.isFoe(0, 1), false);
  assert.equal(enemy.target, null);
  assert.equal(ours.pillage, -1);
  assert.equal(ours.attackDestination, null);
  assert.equal(enemy.order, "move");
  assert.ok(g.tribe(1).recoveryUntil >= g.state.time + 600);
});
test("selecting a building clears unit selection and queues an arming order while paused", () => {
  const g = fixture(),
    hall = g.state.buildings.find((b) => b.team === 0 && b.type === "townhall");
  g.state.units.find((u) => u.team === 0).selected = true;
  g.selectEntity(hall);
  assert.equal(g.selectedUnits().length, 0);
  assert.equal(g.state.selBld, hall);
  g.tribe(0).food = 4000;
  g.tribe(0).wood = 80;
  const bar = g.makeBld("barracks", hall.x + 14, hall.z, 0);
  g.state.buildings.push(bar);
  g.state.selBld = bar;
  g.state.paused = true;
  g.trainSelected("worker");
  assert.equal(hall.queue.length, 0);
  g.tribe(0).age = 1;
  g.trainSelected("spearman");
  assert.equal(bar.queue.length, 1);
  assert.equal(bar.queue[0].unit, "spearman");
});
test("new world has a wider map and distant settlement starts", async () => {
  const { MAP } = await import("../src/game/constants.ts");
  const { generateWorld } = await import("../src/game/worldgen.ts");
  assert.equal(MAP, 1040);
  for (const seed of [123456, 71, 982]) {
    const world = generateWorld(seed),
      home = world.camps[0];
    for (const camp of world.camps.slice(1))
      assert.ok(Math.hypot(camp.x - home.x, camp.z - home.z) > 300, `seed ${seed}: nearby rival`);
  }
});

test("raid crosses the wider island and engages defenders", () => {
  const g = militaryFixture(),
    hall = g.state.buildings.find((b) => b.team === 1 && b.type === "townhall");
  g.vision.fill(1);
  g.issuePillage(hall);
  const u = g.state.units.find((u) => u.team === 0 && u.type !== "worker");
  const defenders = g.state.units.filter((u) => u.team === 1);
  const before = defenders.reduce((s, u) => s + u.hp, 0);
  for (let i = 0; i < 12000; i++) {
    g.navBudget = 4;
    if (i % 30 === 0) g.updateVision();
    g.combatAI(u, 1 / 30);
    g.updateProjectiles(1 / 30);
    g.state.time += 1 / 30;
  }
  assert.ok(Math.hypot(u.x - hall.x, u.z - hall.z) < 30, "army must reach the enemy settlement");
  assert.ok(defenders.reduce((s, u) => s + u.hp, 0) < before, "army must damage a defender");
});

test("raiders attack an undefended settlement instead of stopping beside it", () => {
  const g = militaryFixture(),
    hall = g.state.buildings.find((b) => b.team === 1 && b.type === "townhall");
  g.state.units = g.state.units.filter((u) => u.team !== 1);
  const buildings = g.state.buildings.filter((b) => b.team === 1),
    before = buildings.reduce((s, b) => s + b.hp, 0);
  g.vision.fill(1);
  g.issuePillage(hall);
  const u = g.state.units.find((u) => u.team === 0 && u.type !== "worker");
  for (let i = 0; i < 12000; i++) {
    g.navBudget = 4;
    if (i % 30 === 0) g.updateVision();
    g.combatAI(u, 1 / 30);
    g.updateProjectiles(1 / 30);
    g.state.time += 1 / 30;
  }
  assert.ok(buildings.reduce((s, b) => s + b.hp, 0) < before);
});

test("growth requires surplus; newborns consume food before joining the workforce", async () => {
  const { isDependent, foodDemand } = await import("../src/game/settlement.ts");
  const g = fixture();
  g.tribe(0).food = 1000;
  g.state.birthT = 0;
  const before = g.popNow(0);
  g.tickPeople(0.1);
  assert.ok(g.popNow(0)>before && g.popNow(0)<=Math.min(before+3,g.popCap(0)));
  const child = g.state.units.find((u) => u.team === 0 && isDependent(g, u));
  assert.ok(child);
  const demand = foodDemand(g);
  g.workerAI(child, 1);
  assert.equal(child.order, "idle");
  assert.equal(child.node, null);
  g.tribe(0).spears = 20;
  g.callToArms();
  assert.equal(child.type, "worker");
  const restored = decodeGame(encodeGame(g));
  assert.equal(restored.state.units.find((u) => u.id === child.id).maturesAt, child.maturesAt);
  g.state.time = child.maturesAt;
  g.tickPeople(0.1);
  assert.equal(child.maturesAt, undefined);
  assert.ok(foodDemand(g) > demand);
  g.workerAI(child, 0.1);
  assert.notEqual(child.order, "idle");
});
test("unsolicited settler arrivals stop unless welcomed with adequate reserves", () => {
  const g = fixture(),
    before = g.popNow(0);
  g.state.growthPolicy = "stable";
  g.tribe(0).food = 1000;
  g.landSeaFolk();
  assert.equal(g.popNow(0), before);
  g.state.growthPolicy = "welcome";
  g.tribe(0).food = 25;
  g.landSeaFolk();
  assert.equal(g.popNow(0), before);
  g.tribe(0).food = 1000;
  g.landSeaFolk();
  assert.ok(g.popNow(0)>before && g.popNow(0)<=Math.min(before+3,g.popCap(0)));
});
test("cropping depletes fertility; a fallow year restores it and is saved", async () => {
  const { crop, farmAvailable } = await import("../src/game/settlement.ts");
  const g = fixture(),
    b = g.makeBld("farm", 20, 40, 0);
  g.state.buildings.push(b);
  crop(g, b).planted = 1;
  g.state.time = 1800;
  crop(g, b);
  assert.equal(b.fertility, 0.88);
  b.fallowYear = 1;
  assert.equal(farmAvailable(g, b), false);
  const restored = decodeGame(encodeGame(g));
  assert.equal(restored.state.buildings.find((x) => x.id === b.id).fallowYear, 1);
  g.state.time = 3600;
  crop(g, b);
  assert.equal(b.fertility, 1);
  assert.equal(farmAvailable(g, b), true);
});

test("storage capacity constrains food work and protects surplus from rapid spoilage", () => {
  const g = fixture(),
    u = g.state.units.find((u) => u.team === 0 && u.type === "worker");
  g.tribe(0).food = g.stockCap(0) + 100;
  u.job = "food";
  u.jobLock = true;
  u.order = "idle";
  u.node = null;
  g.workBoard.assign(g, u);
  assert.equal(u.order, "idle");
  assert.match(u.workReason, /stores full/);
  const food = g.tribe(0).food;
  g.tickPeople(1);
  const exposedLoss = food - g.tribe(0).food;
  const warehouse = g.makeBld("warehouse", 70, 70, 0);
  g.state.buildings.push(warehouse);
  g.tribe(0).food = food;
  g.tickPeople(1);
  assert.ok(food - g.tribe(0).food < exposedLoss);
});

test("a regular caravan spends outbound cargo and credits goods only after the return journey", () => {
  const g = fixture(),
    rival = g.tribe(1);
  rival.stone = 100;
  g.tribe(0).food = 300;
  const route = {
    id: g.id(),
    team: 1,
    rival: rival.name,
    give: "food",
    giveAmt: 20,
    get: "stone",
    getAmt: 8,
    interval: 42,
    t: 0,
  };
  g.state.routes.push(route);
  const before = g.tribe(0).stone;
  route.paused = true;
  g.tickRoutes(1);
  assert.equal(route.workerId, undefined);
  assert.equal(g.tribe(0).food, 300);
  route.paused = false;
  g.tickRoutes(1);
  const carrier = g.state.units.find((u) => u.id === route.workerId);
  assert.ok(carrier);
  assert.equal(carrier.carry, 20);
  assert.equal(g.tribe(0).food, 280);
  assert.equal(g.tribe(0).stone, before);
  g.tickRoutes(1);
  assert.equal(g.tribe(0).food, 280, "no duplicate dispatch");
  const saved = decodeGame(encodeGame(g));
  assert.equal(saved.state.routes[0].workerId, carrier.id);
  assert.equal(saved.state.units.find((u) => u.id === carrier.id).carry, 20);
  let exchanged = false;
  for (let i = 0; i < 24000; i++) {
    g.navBudget = 4;
    g.workerAI(carrier, 1 / 30);
    g.state.time += 1 / 30;
    if (carrier.carryType === "stone") {
      exchanged = true;
      assert.equal(g.tribe(0).stone, before, "cargo must get home first");
    }
    if (!carrier.trade && carrier.carry === 0) break;
  }
  assert.ok(exchanged);
  assert.equal(g.tribe(0).stone, before + 8);
  assert.equal(rival.stone, 92);
});
test("war interrupts a trade without creating or teleporting a refund", () => {
  const g = fixture(),
    u = g.state.units.find((u) => u.team === 0 && u.type === "worker");
  g.tribe(0).food = 100;
  g.tribe(1).stone = 100; // This scenario starts with a willing, sufficiently supplied partner.
  g.dispatchTrade(u, { give: "food", giveAmt: 20, get: "stone", getAmt: 8 }, 1);
  g.tribe(1).hostile = true;
  g.tradeAI(u, 0.1);
  assert.equal(g.tribe(0).food, 80);
  assert.equal(u.carry, 20);
  assert.equal(u.order, "return");
  assert.equal(u.trade, null);
});

test("winter exhausts wild food until spring", () => {
  const g = fixture(),
    n = g.state.forage[0];
  g.state.time = 1400;
  n.amount = 0;
  n.regenT = 1;
  g.tickRegen(30);
  assert.equal(n.amount, 0);
  assert.equal(n.regenT, 1);
  g.state.time = 1801;
  g.state.weather = "clear";
  g.tickRegen(30);
  assert.ok(n.amount > 0);
});

test("people are born or welcomed, and soldiers are armed adults", () => {
  const g = fixture(),
    hall = g.state.buildings.find((b) => b.team === 0 && b.type === "townhall");
  const before = g.popNow(0);
  assert.equal(g.enqueueTrain(hall, "worker"), false);
  assert.equal(g.popNow(0), before);
  g.state.growthPolicy = "welcome";
  g.tribe(0).food = 5000;
  assert.equal(g.enqueueTrain(hall, "worker"), false);
  g.landSeaFolk();
  assert.ok(g.popNow(0)>before && g.popNow(0)<=Math.min(before+3,g.popCap(0)));
  const barracks = g.makeBld("barracks", hall.x + 16, hall.z, 0);
  g.state.buildings.push(barracks);
  g.tribe(0).food = 500;
  g.tribe(0).wood = 80;
  const workers = () => g.state.units.filter((u) => u.team === 0 && u.type === "worker" && u.hp > 0).length;
  const w0 = workers();
  const pop = g.popNow(0);
  g.tribe(0).age = 1;
  assert.equal(g.enqueueTrain(barracks, "spearman"), true);
  barracks.queue[0].t = barracks.queue[0].max;
  g.updateTraining(0.01);
  assert.equal(g.popNow(0), pop);
  assert.equal(workers(), w0 - 1);
  assert.ok(g.state.units.some((u) => u.team === 0 && u.type === "spearman" && !u.militia));
});

test("marked trees are felled first, and burning a hall takes stores", async () => {
  const { FOW, HALF, MAP } = await import("../src/game/constants.ts");
  const g = militaryFixture();
  const home = g.campOf(0);
  const far = g.state.trees.find((t) => t.amount > 0 && Math.hypot(t.x - home.x, t.z - home.z) > 40);
  assert.ok(far);
  g.vision.fill(2);
  assert.equal(g.markChop([far.id]), 1);
  const u = g.state.units.find((x) => x.team === 0 && x.type === "worker" && x.hp > 0);
  u.job = "wood";
  assert.equal(g.findNode(u, "wood"), far);
  assert.equal(g.markChop([far.id]), 0);
  assert.equal(g.chopMarks.has(far.id), false);
  g.updateVision(0);
  const hall = g.state.buildings.find((b) => b.team === 0 && b.type === "townhall");
  const cell = MAP / FOW;
  const ix = ((hall.x + HALF) / cell) | 0;
  const iz = ((hall.z + HALF) / cell) | 0;
  assert.equal(g.territory[iz * FOW + ix], 0);
  const rivalHall = g.state.buildings.find((b) => b.team === 1 && b.type === "townhall");
  const foe = g.state.units.find((x) => x.team === 1 && x.type === "worker" && x.hp > 0);
  const atk = g.state.units.find((x) => x.team === 0 && x.type !== "worker" && x.hp > 0);
  const pop = g.popNow(0);
  foe.hp = 1;
  g.dealDamage(atk, foe);
  assert.equal(foe.team, 0);
  assert.ok(foe.hp > 0);
  assert.equal(g.popNow(0), pop + 1);
  g.tribe(1).food = 100;
  g.tribe(0).food = 10;
  rivalHall.hp = 1;
  g.dealDamage(atk, rivalHall);
  assert.ok(rivalHall.hp <= 0);
  assert.ok(g.tribe(0).food > 10);
  assert.ok(g.tribe(1).food < 100);
});
test("unscouted shores stay off the map", () => {
  const g = fixture();
  const home = g.campOf(0);
  const rival = g.campOf(1);
  assert.equal(g.exploredAt(home.x, home.z), true);
  assert.equal(g.exploredAt(rival.x, rival.z), false);
  assert.equal(g.snapshot().camps.filter((c) => c.known).length, 0);
});
test("age paths change storage, wood, and the walk home — not every job", () => {
  const g = fixture();
  const worker = g.state.units.find((u) => u.team === 0 && u.type === "worker");
  const baseCap = g.stockCap(0);
  const baseWood = g.campBonus(worker, "wood");
  const baseStone = g.campBonus(worker, "stone");
  g.state.agePicks = ["econ"];
  assert.ok(g.stockCap(0) >= baseCap + 140);
  assert.ok(Math.abs(g.campBonus(worker, "stone") - baseStone) < 0.02);
  g.state.agePicks = ["army", "econ"];
  assert.ok(g.campBonus(worker, "wood") < baseWood);
  assert.ok(Math.abs(g.campBonus(worker, "stone") - baseStone) < 0.02);
  g.state.agePicks = ["econ", "army", "army", "econ"];
  const farm =
    g.state.buildings.find((b) => b.team === 0 && b.type === "farm") || g.makeBld("farm", 8, 8, 0);
  if (!g.state.buildings.includes(farm)) g.state.buildings.push(farm);
  farm.build = 1;
  farm.fallowYear = undefined;
  farm.crop = { year: 0, planted: 0, tended: 0, remaining: 0, ripened: false };
  g.state.time = 10;
  farmWork(g, worker, farm, 90);
  assert.ok(farm.crop.planted > 0.65);
  worker.order = "return";
  worker.x = 0;
  worker.z = 0;
  worker.tx = 20;
  worker.tz = 0;
  const home = g.campOf(0);
  worker.speed = 2;
  const run = () => {
    worker.x = home.x;
    worker.z = home.z;
    worker.y = g.height(home.x, home.z);
    worker.tx = home.x + 16;
    worker.tz = home.z;
    worker.order = "return";
    const x0 = worker.x;
    const z0 = worker.z;
    g.steer(worker, 1);
    return Math.hypot(worker.x - x0, worker.z - z0);
  };
  g.state.agePicks = ["army", "army", "army", "army", "econ"];
  const ledgers = run();
  g.state.agePicks = [];
  const plain = run();
  assert.ok(ledgers > plain + 0.15);
});
test("hunters march in a line across the order", () => {
  const g = fixture();
  const hall = g.campOf(0);
  g.clearSelect();
  const men = [];
  for (let i = 0; i < 5; i++) {
    const u = g.spawnUnit("spearman", hall.x, hall.z + i * 0.2, 0);
    u.selected = true;
    men.push(u);
  }
  g.issueMove(hall.x + 40, hall.z, false);
  const zs = men.map((u) => u.tz);
  const xs = men.map((u) => u.tx);
  const zSpread = Math.max(...zs) - Math.min(...zs);
  const xSpread = Math.max(...xs) - Math.min(...xs);
  assert.ok(zSpread > 4);
  assert.ok(zSpread > xSpread);
});
test("a grazing compact spends food, is saved, and holds a neighbor to trade", () => {
  const g = fixture();
  g.state.time = 800;
  g.state.conflict = "dangerous";
  const n = g.tribe(1);
  n.trust = 0;
  n.tension = 0.2;
  n.hostile = false;
  n.ally = false;
  n.aggro = 0.2;
  n.food = 500;
  n.compactUntil = 0;
  assert.equal(neighborIntent(g, 1), "defend");
  n.trust = 0.4;
  g.tribe(0).food = 80;
  assert.equal(g.offerCompact(1), true);
  assert.equal(g.tribe(0).food, 60);
  assert.ok(n.compactUntil > g.state.time);
  n.trust = 0;
  n.tension = 1;
  assert.equal(neighborIntent(g, 1), "trade");
  const loaded = decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));
  assert.equal(loaded.tribe(1).compactUntil, n.compactUntil);
});
test("open fields ripen a larger harvest", () => {
  const g = fixture();
  const farm = g.makeBld("farm", 6, 6, 0);
  farm.fertility = 1;
  farm.crop = { year: 0, planted: 1, tended: 1, remaining: 0, ripened: false };
  g.state.time = 900;
  g.state.agePicks = [];
  const plain = crop(g, farm).remaining;
  farm.crop = { year: 0, planted: 1, tended: 1, remaining: 0, ripened: false };
  g.state.agePicks = ["army", "army", "army", "econ"];
  const rich = crop(g, farm).remaining;
  assert.ok(rich > plain);
});
test("the band plants its home hall, then a cornerstone claims distant ground", () => {
  const g = fixture();
  const home = g.campOf(0);
  g.enterAsBand();
  assert.equal(g.state.founding, true);
  assert.equal(g.state.ended, null);
  g.checkVictory();
  assert.equal(g.state.ended, null);
  const nearFood = g.state.forage.find((f) => Math.hypot(f.x - home.x, f.z - home.z) < 40);
  assert.ok(nearFood);
  let planted = false;
  for (let i = 0; i < 12 && !planted; i++) {
    const a = (i / 12) * Math.PI * 2;
    planted = g.placeBuilding(
      "townhall",
      nearFood.x + Math.cos(a) * 8,
      nearFood.z + Math.sin(a) * 8,
      0,
    );
  }
  assert.equal(planted, true);
  assert.equal(g.state.founding, false);
  const hall = g.state.buildings.find((b) => b.team === 0 && b.type === "townhall" && b.hp > 0);
  assert.ok(hall);
  const far = g.state.trees.find((t) => Math.hypot(t.x - hall.x, t.z - hall.z) > 70);
  assert.ok(far, "timber should sit in distant clumps");
  g.tribe(0).wood = 200;
  assert.equal(g.placeBuilding("townhall", hall.x + 8, hall.z, 0), false);
  let claimed = false;
  for (let i = 0; i < 16 && !claimed; i++) {
    const a = (i / 16) * Math.PI * 2;
    claimed = g.placeBuilding("cornerstone", far.x + Math.cos(a) * 12, far.z + Math.sin(a) * 12, 0);
  }
  assert.equal(claimed, true);
  assert.equal(g.tribe(0).wood, 130);
});
test("stone is a clump, not a ring around the first camp", () => {
  const g = fixture();
  const home = g.campOf(0);
  const near = g.state.stones.filter((s) => Math.hypot(s.x - home.x, s.z - home.z) < 30);
  assert.equal(near.length, 0);
  assert.ok(g.state.stones.length >= 4);
});
test("berry herds never arrive", () => {
  const g = fixture();
  const food = g.tribe(0).food;
  g.state.event = "herd";
  g.state.eventT = 0;
  g.state.time = 400;
  g.calamityT = 1e9;
  g.tickEvents(30);
  assert.equal(g.state.event, "none");
  assert.equal(g.tribe(0).food, food);
  g.state.eventT = 0;
  for (let i = 0; i < 12; i++) g.tickEvents(40);
  assert.equal(g.state.event, "none");
  assert.equal(g.tribe(0).food, food);
});

// A flat, isolated valley keeps travel, construction and hauling deterministic.
function cornerstoneValley() {
  const g = fixture();
  g.world.heights.fill(4);
  g.state.buildings = [g.makeBld("townhall", 0, 38, 0)];
  g.state.units = g.state.units.filter((u) => u.team === 0 && u.type === "worker").slice(0, 1);
  const w = g.state.units[0];
  Object.assign(w, { x: 8, z: 38, y: 4, order: "idle", job: null, jobLock: false, carry: 0 });
  const tree = g.state.trees[0];
  g.state.trees = [140, 230, 320].flatMap((x) => Array.from({length: 6}, (_, i) => ({
    ...tree, id: g.id(), x: x + (i % 3) * 4 - 4, z: 50 + Math.floor(i / 3) * 4,
    amount: 100, rich: 1,
  })));
  g.state.stones = []; g.state.forage = []; g.state.copper = []; g.state.iron = [];
  g.state.wildlife = [];
  g.tribe(0).wood = 500;
  g.state.weather = "clear";
  g.rebuildWalk();
  return { g, w };
}

test("cornerstones require distant clumps and never create a second hall", () => {
  const {g} = cornerstoneValley();
  assert.equal(g.placeBuilding("townhall", 140, 38), false);
  assert.equal(g.placeBuilding("cornerstone", 20, 38), false);
  assert.equal(g.placeBuilding("cornerstone", 90, 38), false, "empty ground is not a clump");
  assert.equal(g.placeBuilding("cornerstone", 140, 38), true);
  assert.equal(g.placeBuilding("cornerstone", 150, 38), false);
  assert.equal(g.placeBuilding("cornerstone", 230, 38), true);
  assert.equal(g.placeBuilding("cornerstone", 320, 38), false, "unfinished markers count toward the limit");
  assert.equal(g.tribe(0).wood, 360);
  assert.equal(g.state.buildings.filter(b => b.type === "townhall").length, 1);
  assert.equal(g.popCap(0), 8, "markers do not create housing or people");
});

test("workers walk out, build the cornerstone, gather its clump and deliver locally", () => {
  const {g, w} = cornerstoneValley();
  assert.equal(g.findNode(w, "wood"), null, "unclaimed distant timber is unavailable");
  g.stampVision(140, 50, 20, 1); // A scout has discovered this resource clump.
  assert.equal(g.placeBuilding("cornerstone", 140, 38), true);
  const marker = g.state.buildings.find(b => b.type === "cornerstone");
  assert.equal(g.nearestDrop(140, 38, 0).type, "townhall", "unfinished marker cannot receive goods");
  const before = g.tribe(0).wood;
  let delivered = false;
  for (let i = 0; i < 2400 && !delivered; i++) {
    g.state.time += 0.1;
    g.navBudget = 20;
    g.updateVision(0.1);
    if (g.state.walkDirty) { g.rebuildWalk(); g.state.walkDirty = false; }
    if (w.order === "build") g.buildAI(w, 0.1);
    else g.workerAI(w, 0.1);
    delivered = g.tribe(0).wood > before;
  }
  assert.equal(marker.build, 1);
  assert.equal(g.nearestDrop(w.x, w.z, 0), marker);
  assert.ok(delivered, "real harvesting must credit stock through a local delivery");
  assert.ok(Math.hypot(w.x - marker.x, w.z - marker.z) < 5);
  const saved = encodeGame(g);
  assert.equal(saved.version, 17);
  const restored = decodeGame(JSON.parse(JSON.stringify(saved)));
  assert.equal(restored.nearestDrop(140, 38, 0).type, "cornerstone");
  marker.hp = 0;
  assert.equal(g.cornerstoneAt(140, 50, 0), undefined);
  assert.equal(g.nearestDrop(140, 38, 0).type, "townhall");
});

test("tree designations become reachable work without recalling builders or haulers", () => {
  const {g, w} = cornerstoneValley();
  g.vision.fill(2);
  const tree = g.state.trees[0];
  w.order = "return"; w.carry = 4; w.carryType = "food";
  assert.equal(g.markChop([tree.id]), 1);
  assert.equal(w.order, "return");
  assert.equal(w.carry, 4);
  w.carry = 0; w.order = "idle"; w.job = null;
  g.workBoard.assign(g, w);
  assert.equal(w.node, tree, "the normal scheduler must claim distant marked trees");
  assert.equal(w.order, "gather");
  assert.equal(w.job, "wood");
  const saved = encodeGame(g);
  const restored = decodeGame(JSON.parse(JSON.stringify(saved)));
  assert.ok(restored.chopMarks.has(tree.id));
  delete saved.chopMarks;
  assert.equal(decodeGame(saved).chopMarks.size, 0, "earlier version-17 saves still load");
  g.reset(123456);
  assert.equal(g.chopMarks.size, 0);
});

test("tree marks cannot discover unseen timber or redirect another tribe", () => {
  const {g, w} = cornerstoneValley();
  const tree = g.state.trees[0];
  g.vision.fill(0);
  assert.equal(g.markChop([tree.id]), 0);
  g.vision.fill(2);
  g.markChop([tree.id]);
  w.team = 1;
  g.workBoard.assign(g, w);
  assert.notEqual(w.node, tree);
  const saved = encodeGame(g);
  saved.chopMarks = ["invalid"];
  assert.throws(() => decodeGame(saved));
});

test("a selected squad raids without recalling the home guard, and can withdraw", () => {
  const g = fixture();
  g.clearSelect(); g.vision.fill(1);
  const home = g.campOf(0);
  const squad = g.spawnUnit("spearman", home.x, home.z, 0);
  const guard = g.spawnUnit("spearman", home.x + 2, home.z, 0);
  squad.selected = true; guard.order = "hold";
  const hall = g.state.buildings.find(b => b.team === 1 && b.type === "townhall");
  g.issuePillage(hall);
  assert.equal(squad.pillage, 1);
  assert.equal(guard.order, "hold");
  assert.equal(guard.pillage, -1);
  assert.equal(guard.selected, false);
  g.issueMove(home.x, home.z);
  assert.equal(squad.pillage, -1);
  assert.equal(squad.attackDestination, null);
  assert.equal(squad.target, null);
  assert.equal(squad.order, "move");
});

test("raid commands and follow-up targets respect unexplored territory", () => {
  const g = fixture();
  g.vision.fill(0);
  const hall = g.state.buildings.find(b => b.team === 1 && b.type === "townhall");
  g.spawnUnit("spearman", g.campOf(0).x, g.campOf(0).z, 0);
  const army = g.commandedMilitary();
  g.issuePillage(hall);
  assert.ok(army.every(u => u.pillage === -1));
  assert.equal(g.pickRaidRival(), null);
  army[0].pillage = 1;
  assert.equal(g.nextPillage(army[0]), null);
  g.vision.fill(1);
  assert.ok(g.nextPillage(army[0]));
});


test("shipment quotes require contact and respond to trust and scarcity", async () => {
  const {quoteShipment} = await import("../src/game/barter.ts");
  const g = fixture();
  Object.assign(g.tribe(0), {food: 200});
  Object.assign(g.tribe(1), {food: 80, wood: 200, tradeCd: 0, hostile: false, trust: 0, tension: 0});
  g.vision.fill(0);
  assert.equal(quoteShipment(g, 1, "food", "wood", 30).deal, null);
  g.vision.fill(1);
  const baseline = quoteShipment(g, 1, "food", "wood", 30).deal.getAmt;
  g.tribe(1).trust = 1;
  assert.ok(quoteShipment(g, 1, "food", "wood", 30).deal.getAmt > baseline);
  g.tribe(1).hostile = true;
  assert.equal(quoteShipment(g, 1, "food", "wood", 30).deal, null);
});

test("shipment validation rejects invalid quantities and unavailable goods", async () => {
  const {quoteShipment} = await import("../src/game/barter.ts");
  const g = fixture(); g.vision.fill(1);
  Object.assign(g.tribe(0), {food: 30, age: 0});
  Object.assign(g.tribe(1), {wood: 200, tradeCd: 0, hostile: false});
  for (const amount of [NaN, Infinity, -1, 0, 1.5, 101, 31])
    assert.equal(quoteShipment(g, 1, "food", "wood", amount).deal, null);
  for (const kind of ["food", "iron", "toString"])
    assert.equal(quoteShipment(g, 1, "food", kind, 20).deal, null);
  g.tribe(1).wood = 0;
  assert.equal(quoteShipment(g, 1, "food", "wood", 20).deal, null);
});

test("negotiated goods travel with a saved carrier instead of arriving instantly", async () => {
  const {reportedQuote, proposeShipment} = await import("../src/game/barter.ts");
  const g = fixture(); g.vision.fill(1); g.clearSelect();
  Object.assign(g.tribe(0), {food: 200});
  Object.assign(g.tribe(1), {food: 80, wood: 200, tradeCd: 0, hostile: false});
  const wood = g.tribe(0).wood;
  g.state.tradeReports=[{team:1,time:g.state.time,offers:[{give:"food",get:"wood",giveAmt:20,getAmt:16}]}];
  const quote = reportedQuote(g, 1, "food", "wood", 30).deal;
  assert.equal(proposeShipment(g, 1, "food", "wood", 30), true);
  const carrier = g.state.units.find(u => u.team === 0 && u.order === "trade");
  assert.deepEqual(carrier.trade, quote);
  assert.equal(carrier.carry, 30);
  assert.equal(g.tribe(0).food, 170);
  assert.equal(g.tribe(0).wood, wood);
  assert.equal(proposeShipment(g, 1, "food", "wood", 30), false);
  assert.equal(g.tribe(0).food, 170);
  const restored = decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));
  assert.equal(restored.state.units.find(u => u.id === carrier.id).carry, 30);
});

test("urgent food gathering outranks community logging marks", () => {
  const {g, w} = cornerstoneValley(); g.vision.fill(2); g.tribe(0).food = 0;
  const berries = {...g.state.trees[0], id: g.id(), kind: "forage", x: 14, z: 38, amount: 100};
  g.state.forage = [berries];
  g.markChop([g.state.trees[0].id]);
  g.workBoard.assign(g, w);
  assert.equal(w.job, "food");
  assert.equal(w.node, berries);
});


test("new settlements begin with one completed hut and a clear opening", () => {
  for (const seed of [12, 345, 6789]) {
    const g = new Game(); g.reset(seed); g.enterIsland();
    const huts = g.state.buildings.filter(b => b.team === 0 && b.type === "hut" && b.hp > 0);
    assert.equal(huts.length, 1);
    assert.equal(huts[0].build, 1);
    assert.equal(g.state.founding, false);
    assert.equal(g.state.weather, "clear");
    assert.equal(g.seasonMix().snow, 0, "the first spring does not inherit winter snow cover");
    g.tickWeather(299);
    assert.equal(g.state.weather, "clear");
  }
});


test("early villagers hunt without a separate profession and cannot drill a standing army", () => {
  const g = fixture();
  assert.ok(g.state.units.filter(u => u.team === 0).every(u => u.type === "worker"));
  const worker = g.state.units.find(u => u.team === 0);
  g.clearSelect(); worker.selected = true; g.tribe(0).food = 5000;
  g.assignJob("hunt");
  assert.equal(worker.type, "worker");
  assert.equal(worker.huntOnly, true);
  g.assignJob("drill");
  assert.equal(worker.drill, undefined);
  const hall = g.campOf(0), barracks = g.makeBld("barracks", hall.x + 10, hall.z, 0);
  assert.equal(g.enqueueTrain(barracks, "spearman"), false);
  g.tribe(0).age = 1;
  g.assignJob("drill");
  assert.equal(worker.drill, 0);
});

test("biomes affect harvested crops and winter food demand, including after save", async () => {
  const {foodDemand} = await import("../src/game/settlement.ts");
  const g = fixture(), home = g.campOf(0);
  const farm = g.makeBld("farm", home.x, home.z, 0);
  const originalBiomes = g.world.biomes;
  const yieldFor = kind => {
    g.world.biomes = [{kind, x: home.x, z: home.z}];
    g.state.time = 900;
    farm.crop = {year:0, planted:1, tended:1, remaining:0, ripened:false};
    return crop(g, farm).remaining;
  };
  const plains = yieldFor("plains"), forest = yieldFor("forest"), hills = yieldFor("hills");
  assert.ok(plains > forest && forest > hills);
  g.state.time = 1350;
  const exposed = foodDemand(g);
  g.world.biomes[0].kind = "forest";
  assert.ok(foodDemand(g) < exposed);
  g.world.biomes = originalBiomes;
  const restored = decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));
  assert.equal(foodDemand(restored), foodDemand(g));
});


test("selected adult villagers can raid without creating a hunter profession", async () => {
  const {emergencyResponse} = await import("../src/game/settlement.ts");
  const g = fixture(); g.clearSelect(); g.vision.fill(1);
  const adults = g.state.units.filter(u => u.team === 0);
  adults[0].selected = true;
  adults[1].selected = true; adults[1].maturesAt = 200;
  const hall = g.state.buildings.find(b => b.team === 1 && b.type === "townhall");
  g.issuePillage(hall);
  assert.equal(adults[0].type, "worker");
  assert.equal(adults[0].order, "attackmove");
  assert.equal(adults[0].pillage, 1);
  const foe = g.spawnUnit("spearman", adults[0].x + 4, adults[0].z, 1);
  g.vision.fill(2);
  assert.equal(emergencyResponse(g, adults[0], 0.1), false);
  assert.equal(adults[0].order, "attackmove");
  foe.hp = 0;
  assert.equal(adults[1].pillage, -1);
  assert.equal(adults[2].pillage, -1);
  const home = g.campOf(0);
  g.issueMove(home.x, home.z);
  assert.equal(adults[0].pillage, -1);
});


test("minerals remain depleted while habitat affects renewable vegetation", () => {
  const g = fixture(); g.state.weather = "clear";
  const base = {...g.state.forage[0], amount:0, regenT:100};
  g.state.stones = [{...base, kind:"stone"}];
  g.state.copper = [{...base, kind:"copper"}];
  g.state.iron = [{...base, kind:"iron"}];
  g.world.biomes = [{kind:"forest", x:base.x, z:base.z}];
  g.state.forage = [{...base}];
  g.tickRegen(10);
  assert.equal(g.state.forage[0].regenT, 88);
  g.tickRegen(10000);
  for (const list of [g.state.stones,g.state.copper,g.state.iron]) assert.equal(list[0].amount, 0);
});

test("wildlife recovery needs a surviving herd, warm season, unseen dry land", () => {
  const {g} = cornerstoneValley(); g.vision.fill(0);
  const animal = {id:g.id(),species:"deer",x:0,z:38,y:4,hp:0,maxHp:3,scale:1,vx:0,vz:0,facing:0,wanderT:0,fly:0};
  g.state.wildlife = [animal];
  g.tickWildlife(1); assert.equal(animal.hp, 0);
  g.state.wildlife.push({...animal,id:g.id(),hp:3,wanderT:100});
  g.state.time = 1350; animal.wanderT = 0;
  g.tickWildlife(1); assert.equal(animal.hp, 0);
  g.state.time = 0; animal.wanderT = 0; g.vision.fill(2);
  g.tickWildlife(1); assert.equal(animal.hp, 0);
  animal.wanderT = 0; g.vision.fill(0);
  g.tickWildlife(1); assert.equal(animal.hp, 3);
  assert.ok(animal.y > g.world.waterY);
});


test("work assignment cannot locate unexplored food or track unseen wildlife", () => {
  const {g,w} = cornerstoneValley();
  const berry = {...g.state.trees[0],kind:"forage",x:18,z:38};
  g.state.forage=[berry]; g.vision.fill(0);
  assert.equal(g.findNode(w,"food"),null);
  g.workBoard.assign(g,w); assert.equal(w.node,null);
  g.vision.fill(1); w.workCheckAt=0; g.workBoard.reset();
  g.workBoard.assign(g,w); assert.equal(w.node,berry);
  g.state.wildlife=[{id:g.id(),species:"deer",x:20,z:38,y:4,hp:3,maxHp:3,scale:1,vx:0,vz:0,facing:0,wanderT:10,fly:0}];
  assert.equal(g.findHunt(w),null);
  g.vision.fill(2); assert.ok(g.findHunt(w));
});

test("store preparation uses labor and timber, survives saves, and limits spoilage", async () => {
  const {foodSpoilage,preserveFood} = await import("../src/game/pantry.ts");
  const {g,w} = cornerstoneValley();
  const store=g.makeBld("warehouse",w.x,w.z,0);g.state.buildings.push(store);
  g.tribe(0).food=300;g.tribe(0).wood=10;
  const before=foodSpoilage(g);w.gatherT=0;
  preserveFood(g,w,store,7);assert.equal(g.tribe(0).wood,10);
  preserveFood(g,w,store,1);assert.equal(g.tribe(0).wood,9);
  assert.equal(store.storeCare,0.2);assert.ok(foodSpoilage(g)<before);
  const saved=encodeGame(g), restored=decodeGame(saved);
  assert.equal(restored.state.buildings.find(b=>b.id===store.id).storeCare,0.2);
  saved.state.buildings.find(b=>b.id===store.id).storeCare=2;
  assert.throws(()=>decodeGame(saved));
  g.tribe(0).food=1;preserveFood(g,w,store,8);assert.equal(g.tribe(0).wood,9);
});

test("winter estimates include dependents, habitat, capacity and the remaining season", async () => {
  const {winterOutlook,foodSpoilage} = await import("../src/game/pantry.ts");
  const g=fixture();g.tribe(0).food=0;
  const whole=winterOutlook(g);assert.ok(whole.needed>0);
  g.state.time=1700;assert.ok(winterOutlook(g).needed<whole.needed);
  assert.ok(foodSpoilage(g,0,200,1)>foodSpoilage(g,0,200,3));
});

test("healthy adults do not die of old age after three game years", () => {
  const g=fixture();g.state.birthT=1e9;g.tribe(0).food=10000;
  const people=g.state.units.filter(u=>u.team===0);
  for(const u of people)u.ageT=28*1800;
  g.tickPeople(1);
  assert.ok(people.every(u=>u.hp>0));
  assert.equal(g.state.growthPolicy,"welcome");
  const save=encodeGame(g); delete save.demographicVersion;
  for(const u of save.state.units)u.ageT=2000;
  const loaded=decodeGame(save);
  assert.ok(loaded.state.units.filter(u=>u.team===0).every(u=>u.ageT>=18*1800));
});


test("fever is recoverable instead of randomly killing a villager instantly", () => {
  const g=fixture(); g.state.time=100; g.calamityT=0; g.state.birthT=1e9;
  g.tribeFortune=()=>0.5;
  const random=Math.random;
  try { Math.random=()=>0.55; g.tickCalamity(1); } finally {Math.random=random;}
  const sick=g.state.units.find(u=>u.sickUntil);
  assert.ok(sick); assert.ok(sick.hp>0 && sick.hp<sick.maxHp);
  g.tribe(sick.team).food=500;g.state.time=sick.sickUntil+1;
  g.tickPeople(0.1);assert.equal(sick.sickUntil,undefined);assert.equal(sick.hp,sick.maxHp);
});


test("obsolete worker training queues refund stores instead of creating people", () => {
  const g=fixture(), hall=g.state.buildings.find(b=>b.team===0&&b.type==="townhall");
  const people=g.popNow(0), food=g.tribe(0).food;
  hall.queue.push({unit:"worker",t:6,max:6});
  g.updateTraining(0.1);
  assert.equal(g.popNow(0),people); assert.ok(g.tribe(0).food>food);
  assert.equal(hall.queue.length,0);
});

test("scouting persists beyond five destinations and holds when exploration ends", () => {
  const g = fixture(), u = g.state.units.find(u => u.team === 0 && u.type === "worker");
  u.selected = true;
  g.findExploreTarget = () => ({x: u.x + 20, z: u.z});
  g.issueExplore();
  g.steer = () => true;
  for (let i = 0; i < 12; i++) g.exploreAI(u, 1 / 30);
  assert.equal(u.order, "explore");
  g.findExploreTarget = () => null;
  g.exploreAI(u, 1 / 30);
  assert.equal(u.order, "hold");
});
test("remembered resources accept gathering; undiscovered resources do not", () => {
  const g = fixture(), u = g.state.units.find(u => u.team === 0 && u.type === "worker");
  const tree = g.state.trees[0];
  g.vision.fill(0);
  assert.equal(g.resourceAt(tree.x, tree.z), null);
  g.issueGather(tree);
  assert.notEqual(u.node, tree);
  g.stampVision(tree.x, tree.z, 10, 1);
  assert.equal(g.visibleAt(tree.x, tree.z), false);
  assert.equal(g.resourceAt(tree.x, tree.z), tree);
  g.clearSelect(); u.selected = true;
  g.issueGather(tree);
  assert.equal(u.order, "gather");
  assert.equal(u.node, tree);
});
test("discovery points persist once across ages and reject damaged records", async () => {
  const {recordDiscoveries, discoveryScore} = await import("../src/game/discovery.ts");
  const g = fixture();
  g.vision.fill(0);
  recordDiscoveries(g);
  assert.equal(g.state.discoveries.some(h => h.id === "copper"), false);
  const ore = g.state.copper[0];
  g.stampVision(ore.x, ore.z, 10, 1);
  recordDiscoveries(g);
  const before = discoveryScore(g);
  g.tribe(0).age = 1;
  recordDiscoveries(g);
  assert.equal(discoveryScore(g), before);
  assert.equal(discoveryScore(g, 1), 0);
  const restored = decodeGame(encodeGame(g));
  recordDiscoveries(restored);
  assert.equal(discoveryScore(restored), before);
  const bad = encodeGame(g);
  bad.state.discoveries.push({...bad.state.discoveries[0]});
  assert.throws(() => decodeGame(bad));
  const old = encodeGame(g); delete old.state.discoveries;
  assert.doesNotThrow(() => decodeGame(old));
});

test("known distant trees need no lumber camp and the camp benefit stays local", () => {
  const g = fixture(), w = g.state.units.find(u => u.team === 0 && u.type === "worker");
  const home = g.campOf(0);
  const tree = {...g.state.trees[0], id:g.id(), x:home.x+60, z:home.z, amount:100};
  g.state.trees = [tree]; g.vision.fill(1);
  assert.equal(g.findNode(w, "wood"), tree);
  w.x = tree.x; w.z = tree.z;
  const before = g.campBonus(w, "wood");
  const camp = g.makeBld("lumber", home.x, home.z, 0);camp.build=1;g.state.buildings.push(camp);
  assert.equal(g.campBonus(w, "wood"), before);
  camp.x=tree.x;camp.z=tree.z;
  assert.ok(g.campBonus(w,"wood") < before*0.7);
});
test("manual scouting destinations hold on arrival and survive reload", () => {
  const g=fixture(), w=g.state.units.find(u=>u.team===0&&u.type==="worker");
  g.clearSelect();w.selected=true;g.issueMove(w.x+20,w.z);
  const restored=decodeGame(encodeGame(g)), rw=restored.state.units.find(u=>u.id===w.id);
  restored.steer=()=>true;
  restored.workerAI(rw,1/30);
  assert.equal(rw.order,"hold");
  restored.workerAI(rw,1/30);assert.equal(rw.order,"hold");
});
test("standing stones record investigation without creating resources", () => {
  const g=fixture(), w=g.state.units.find(u=>u.team===0&&u.type==="worker");
  const m=g.world.megaliths[0];w.x=m.x;w.z=m.z;
  const before=[g.tribe(0).food,g.tribe(0).wood,g.tribe(0).stone];
  g.lootMegaliths(w);g.lootMegaliths(w);
  assert.ok(g.looted.has(0));
  assert.deepEqual([g.tribe(0).food,g.tribe(0).wood,g.tribe(0).stone],before);
});
test("legacy traditions require earned points, apply without new stock and persist", async () => {
  const {recordDiscoveries,adoptTradition,unspentLegacy}=await import("../src/game/discovery.ts");
  const g=fixture();g.vision.fill(1);recordDiscoveries(g);
  const before=g.stockCap(0), food=g.tribe(0).food;
  assert.ok(unspentLegacy(g)>=12);
  assert.equal(adoptTradition(g,"winter-stores"),true);
  assert.equal(g.stockCap(0),before+80);assert.equal(g.tribe(0).food,food);
  assert.equal(adoptTradition(g,"winter-stores"),false);
  assert.equal(adoptTradition(g,"woodcraft"),false);
  const r=decodeGame(encodeGame(g));assert.equal(r.stockCap(0),g.stockCap(0));
  r.tribe(0).age=1;assert.equal(adoptTradition(r,"woodcraft"),true);
  const fresh=fixture();assert.equal(adoptTradition(fresh,"woodcraft"),false);
});
test("age commitment revalidates population and buildings instead of bypassing them", () => {
  const g=fixture();Object.assign(g.tribe(0),{food:1000,wood:1000,stone:1000});
  const before=g.tribe(0).food;g.commitAge(0,"econ");
  assert.equal(g.tribe(0).age,0);assert.equal(g.tribe(0).food,before);
  const home=g.campOf(0);while(g.popNow(0)<8)g.spawnUnit("worker",home.x,home.z,0);
  g.commitAge(0,"econ");assert.equal(g.tribe(0).age,1);
});

test("scouts resume their expedition after taking shelter, including across saves", async () => {
  const {emergencyResponse}=await import("../src/game/settlement.ts");
  const g=fixture(),w=g.state.units.find(u=>u.team===0&&u.type==="worker");
  g.tribe(0).spears=0;g.tribe(0).bows=0;
  w.order="explore";w.tx=w.x+50;w.tz=w.z;
  const expected=w.tx;const foe=g.spawnUnit("spearman",w.x+2,w.z,3);
  g.stampVision(foe.x,foe.z,10,2);
  assert.equal(emergencyResponse(g,w,0.01),true);
  const r=decodeGame(encodeGame(g)),rw=r.state.units.find(u=>u.id===w.id);
  r.state.units.find(u=>u.id===foe.id).hp=0;
  r.state.time=rw.emergency.until+1;
  emergencyResponse(r,rw,0.01);
  assert.equal(rw.order,"explore");assert.equal(rw.tx,expected);
});
test("favorable random events do not add unexplained goods", () => {
  const g=fixture();g.state.time=100;g.calamityT=0;
  const before=g.state.tribes.map(t=>[t.food,t.wood,t.stone]);
  const rand=Math.random;try {Math.random=()=>0.99;g.tickCalamity(1);} finally {Math.random=rand;}
  assert.deepEqual(g.state.tribes.map(t=>[t.food,t.wood,t.stone]),before);
});

test("partners protect winter food and refuse goods they already have in abundance", async () => {
  const {quoteShipment}=await import("../src/game/barter.ts");
  const g=fixture();g.vision.fill(1);g.state.time=1350;
  Object.assign(g.tribe(0),{wood:100,food:200});
  Object.assign(g.tribe(1),{food:60,wood:60,stone:100,hostile:false,tradeCd:0,trust:0});
  const winter=quoteShipment(g,1,"wood","food",20);
  assert.equal(winter.deal,null);assert.match(winter.reason,/winter/);
  g.state.time=50;g.tribe(1).food=300;
  const surplus=quoteShipment(g,1,"food","stone",20);
  assert.equal(surplus.deal,null);assert.match(surplus.reason,/already have enough/);
});
test("market knowledge improves quoted terms without generating bonus cargo", async () => {
  const {quoteShipment}=await import("../src/game/barter.ts");
  const g=fixture();g.vision.fill(1);g.state.time=50;
  Object.assign(g.tribe(0),{food:300});
  Object.assign(g.tribe(1),{food:80,wood:250,hostile:false,tradeCd:0,trust:1});
  const base=quoteShipment(g,1,"food","wood",20).deal;
  g.state.agePicks=["econ","econ","econ"];
  const improved=quoteShipment(g,1,"food","wood",20).deal;assert.ok(improved.getAmt>base.getAmt);
  const u=g.state.units.find(u=>u.team===0&&u.type==="worker");
  assert.equal(g.dispatchTrade(u,improved,1),true);
  const hall=g.state.buildings.find(b=>b.team===1&&b.type==="townhall");u.x=hall.x;u.z=hall.z;
  const stock=g.tribe(1).wood;g.tradeAI(u,0.1);
  assert.equal(u.carry,improved.getAmt);assert.equal(g.tribe(1).wood,stock-improved.getAmt);
});
test("quick exchange cannot conjure goods without a discovered partner", () => {
  const g=fixture();g.vision.fill(0);const food=g.tribe(0).food,wood=g.tribe(0).wood;
  g.bankTrade("food","wood");assert.equal(g.tribe(0).food,food);assert.equal(g.tribe(0).wood,wood);
});

test("seeded raider camps have finite bands and persist across reloads", () => {
  const g=fixture(), camps=g.state.buildings.filter(b=>b.raiderCamp);
  assert.ok(camps.length>=1&&camps.length<=2);
  const home=g.campOf(0);
  for(const c of camps)assert.ok(Math.hypot(c.x-home.x,c.z-home.z)>=100);
  const r=decodeGame(encodeGame(g));
  assert.equal(r.state.units.filter(u=>u.homeCamp!==undefined).length,camps.length*2);
  assert.deepEqual(r.state.buildings.filter(b=>b.raiderCamp).map(b=>b.id),camps.map(b=>b.id));
  const c=r.state.buildings.find(b=>b.raiderCamp),u=r.state.units.find(u=>u.homeCamp===c.id);
  const count=r.state.units.length;c.hp=0;r.barbarianAI(u,500);
  assert.equal(u.order,"hold");assert.equal(r.state.units.length,count);
});
test("camp raiders steal and haul real cargo but respect the opening grace and quiet mode", () => {
  const g=fixture(), c=g.state.buildings.find(b=>b.raiderCamp), raider=g.state.units.find(u=>u.homeCamp===c.id);
  const w=g.state.units.find(u=>u.team===0&&u.type==="worker");
  w.x=c.x+10;w.z=c.z;w.carry=10;w.carryType="wood";raider.x=w.x+1;raider.z=w.z;
  g.state.time=100;raider.wanderT=0;g.barbarianAI(raider,0.1);assert.equal(w.carry,10);
  g.state.time=400;g.state.conflict="quiet";raider.wanderT=0;g.barbarianAI(raider,0.1);assert.equal(w.carry,10);
  g.state.conflict="balanced";raider.wanderT=0;g.barbarianAI(raider,0.1);
  assert.equal(w.carry,6);assert.equal(raider.carry,4);
  const stock=g.tribe(3).wood;raider.x=c.x+3;raider.z=c.z;g.barbarianAI(raider,0.1);
  assert.equal(g.tribe(3).wood,stock+4);assert.equal(raider.carry,0);
});
test("a stolen outbound shipment cannot exchange the missing goods", () => {
  const g=fixture();g.vision.fill(1);Object.assign(g.tribe(1),{stone:100,hostile:false,tradeCd:0});
  const w=g.state.units.find(u=>u.team===0&&u.type==="worker");
  assert.equal(g.dispatchTrade(w,{give:"food",giveAmt:20,get:"stone",getAmt:8},1),true);
  w.carry-=4;const before=[g.tribe(1).food,g.tribe(1).stone];g.tradeAI(w,0.1);
  assert.equal(w.order,"return");assert.equal(w.carry,16);assert.equal(w.trade,null);
  assert.deepEqual([g.tribe(1).food,g.tribe(1).stone],before);
});

test("territory control cannot create daily stock without harvesting", () => {
  const g=fixture();for(const r of g.state.regions)r.owner=0;
  const before=[g.tribe(0).food,g.tribe(0).wood,g.tribe(0).stone,g.tribe(0).copper,g.tribe(0).iron];
  g.state.harvestDay=-1;g.tickHarvest();
  assert.deepEqual([g.tribe(0).food,g.tribe(0).wood,g.tribe(0).stone,g.tribe(0).copper,g.tribe(0).iron],before);
});

test("direct group wood orders reserve at most two workers per tree", () => {
  const g=fixture();g.vision.fill(1);g.clearSelect();
  for(const u of g.state.units.filter(u=>u.team===0)){u.selected=true;u.carry=0;u.node=null;u.order="idle";}
  g.assignJob("wood");
  const counts=new Map();for(const u of g.selectedUnits())if(u.node?.kind==="tree")counts.set(u.node.id,(counts.get(u.node.id)||0)+1);
  assert.ok(counts.size>=2);assert.ok([...counts.values()].every(n=>n<=2));
  g.issueGather(g.state.trees[0]);
  const after=new Map();for(const u of g.selectedUnits())if(u.node?.kind==="tree")after.set(u.node.id,(after.get(u.node.id)||0)+1);
  assert.ok([...after.values()].every(n=>n<=2));
});
test("continued resource theft in a rival village causes warnings and hostility; visiting does not", () => {
  const g=fixture(),hall=g.state.buildings.find(b=>b.team===1&&b.type==="townhall"),w=g.state.units.find(u=>u.team===0);
  const tree=g.state.trees[0];tree.x=hall.x+8;tree.z=hall.z;w.node=tree;w.order="hold";w.job="wood";
  const rival=g.tribe(1);rival.tension=0.1;rival.hostile=false;rival.trust=0.5;
  g.tickInfluence(5);assert.equal(rival.hostile,false);assert.ok(rival.tension<=0.1);
  w.order="gather";for(let i=0;i<30;i++)g.tickInfluence(1);
  assert.equal(rival.hostile,true);assert.ok(rival.trust<0.5);
  w.order="move";const tension=rival.tension;g.tickInfluence(1);assert.ok(rival.tension<tension);
});
test("territory tint fades from occupied buildings instead of a uniform circle", () => {
  const g=fixture(),hall=g.state.buildings.find(b=>b.team===0&&b.type==="townhall");
  g.state.buildings=[hall];g.paintTerritory();
  const strength=Array.from(g.territoryStrength).filter(n=>n>0);
  assert.ok(strength.some(n=>n>0.7));assert.ok(strength.some(n=>n<0.15));
});
test("timber stone and hunting village policies survive save/load", () => {
  const g=fixture();for(const policy of ["wood","stone","hunt"]){g.state.laborPolicy=policy;assert.equal(decodeGame(encodeGame(g)).state.laborPolicy,policy);}
});

test("protected checkpoint survives autosaves and both rolling save failures", async()=>{
  const {saveGame,protectGame,loadRaw}=await import("../src/game/save.ts"),{SAVE_KEY}=await import("../src/game/constants.ts");
  const entries=new Map();globalThis.localStorage={getItem:k=>entries.get(k)||null,setItem:(k,v)=>entries.set(k,v)};
  try{const g=fixture();g.tribe(0).food=123;assert.equal(protectGame(g),true);g.tribe(0).food=456;saveGame(g);
    assert.equal(loadRaw(true).state.tribes[0].food,123);entries.set(SAVE_KEY,"bad");entries.set(SAVE_KEY+":bak","bad");
    assert.equal(loadRaw().state.tribes[0].food,123);
  }finally{delete globalThis.localStorage;}
});
test("wood orders scout unknown terrain and resume cutting discovered timber",()=>{
  const g=fixture(),u=g.state.units.find(u=>u.team===0);g.clearSelect();u.selected=true;u.carry=0;g.vision.fill(0);
  g.findExploreTarget=()=>({x:u.x+20,z:u.z});g.assignJob("wood");assert.equal(u.order,"explore");assert.equal(u.searchJob,"wood");
  g.vision.fill(1);g.state.time+=2;g.exploreAI(u,0.01);assert.equal(u.order,"gather");assert.equal(u.node.kind,"tree");assert.equal(u.searchJob,undefined);
});
test("recall cancels raids and delegations but conserves carried supplies",()=>{
  const g=fixture(),u=g.state.units.find(u=>u.team===0);u.carry=7;u.carryType="wood";u.pillage=1;u.order="explore";
  const before=g.tribe(0).wood;g.soundRecall();assert.equal(u.pillage,-1);assert.equal(u.order,"move");assert.equal(u.carry,7);
  g.steer=()=>true;g.workerAI(u,0.01);assert.equal(u.order,"hold");assert.equal(g.tribe(0).wood,before+7);assert.equal(u.carry,0);
});
test("raiding causes hostility at the settlement rather than when the command leaves home",()=>{
  const g=militaryFixture();g.vision.fill(2);g.clearSelect();const u=g.state.units.find(u=>u.team===0&&u.type==="spearman");u.selected=true;
  const hall=g.state.buildings.find(b=>b.team===1&&b.type==="townhall");g.tribe(1).hostile=false;g.issuePillage(hall);
  assert.equal(g.tribe(1).hostile,false);g.combatAI(u,0.01);assert.equal(g.tribe(1).hostile,false);
  u.x=hall.x+20;u.z=hall.z;g.combatAI(u,0.01);assert.equal(g.tribe(1).hostile,true);
});
test("trading terms appear at the meeting and then become stale", async()=>{
  const {reportedQuote}=await import("../src/game/barter.ts");const g=fixture();g.vision.fill(2);g.clearSelect();Object.assign(g.tribe(0),{food:200});Object.assign(g.tribe(1),{food:80,wood:200,hostile:false,tradeCd:0});
  assert.equal(reportedQuote(g,1,"food","wood",20).deal,null);assert.equal(g.sendDelegation(1,"trade"),true);
  const u=g.state.units.find(u=>u.envoy),hall=g.state.buildings.find(b=>b.team===1&&b.type==="townhall");u.x=hall.x+Math.max(hall.w,hall.d)*0.55+1;u.z=hall.z;
  g.workerAI(u,21);assert.equal(u.envoy.phase,"return");assert.equal(g.state.tradeReports?.length,1);
  const r=decodeGame(encodeGame(g)),ru=r.state.units.find(x=>x.id===u.id),home=r.state.buildings.find(b=>b.team===0&&b.type==="townhall");ru.x=home.x+Math.max(home.w,home.d)*0.55+1;ru.z=home.z;r.workerAI(ru,1);
  const quote=reportedQuote(r,1,"food","wood",20).deal;assert.ok(quote);r.tribe(1).wood=0;assert.deepEqual(reportedQuote(r,1,"food","wood",20).deal,quote);
  r.state.time+=901;assert.equal(reportedQuote(r,1,"food","wood",20).deal,null);
});
test("peace proposal travels before affecting relations",()=>{
  const g=fixture();g.vision.fill(2);g.clearSelect();g.tribe(1).hostile=true;assert.equal(g.sendDelegation(1,"peace"),true);
  assert.equal(g.tribe(1).hostile,true);const u=g.state.units.find(u=>u.envoy),hall=g.state.buildings.find(b=>b.team===1&&b.type==="townhall");u.x=hall.x+Math.max(hall.w,hall.d)*0.55+1;u.z=hall.z;
  g.workerAI(u,21);assert.equal(g.tribe(1).hostile,false);assert.equal(u.envoy.phase,"return");
});
test("a well supplied village can welcome an outsider group without exceeding housing",()=>{
  const g=fixture();Object.assign(g.tribe(0),{food:1000});g.state.growthPolicy="welcome";
  const old=Math.random;try{Math.random=()=>0.99;const before=g.popNow(0);g.landSeaFolk();assert.ok(g.popNow(0)>before+1);assert.ok(g.popNow(0)<=g.popCap(0));}finally{Math.random=old;}
});
test("recall works for children and soldiers and can be cancelled by a new order",()=>{
  const g=militaryFixture(),child=g.state.units.find(u=>u.team===0&&u.type==="worker");child.maturesAt=g.state.time+100;
  const soldier=g.state.units.find(u=>u.team===0&&u.type==="spearman");g.soundRecall();g.steer=()=>true;
  g.workerAI(child,0.01);g.workerAI(soldier,0.01);assert.equal(child.order,"hold");assert.equal(soldier.order,"hold");
  g.soundRecall();g.clearSelect();soldier.selected=true;g.issueMove(soldier.x+20,soldier.z);assert.equal(soldier.recalled,undefined);
});
test("gift carrier transports actual food and only improves trust on delivery",()=>{
  const g=fixture();g.vision.fill(2);g.clearSelect();const food=g.tribe(0).food,other=g.tribe(1).food,trust=g.tribe(1).trust||0;
  assert.equal(g.sendDelegation(1,"gift"),true);const u=g.state.units.find(u=>u.envoy);assert.equal(u.carry,30);assert.equal(g.tribe(0).food,food-30);
  assert.equal(g.tribe(1).food,other);assert.equal(g.tribe(1).trust||0,trust);
  const hall=g.state.buildings.find(b=>b.team===1&&b.type==="townhall");u.x=hall.x+Math.max(hall.w,hall.d)*0.55+1;u.z=hall.z;g.workerAI(u,21);
  assert.equal(g.tribe(1).food,other+30);assert.equal(u.carry,0);assert.ok(g.tribe(1).trust>trust);
});
test("seasonal field work outranks berries except during an immediate food emergency",()=>{
  const g=fixture(),home=g.campOf(0),farm=g.makeBld("farm",home.x+14,home.z,0),u=g.state.units.find(u=>u.team===0);
  farm.build=1;g.state.buildings.push(farm);g.rebuildWalk();g.vision.fill(2);g.tribe(0).food=200;
  u.job="food";u.jobLock=true;u.order="idle";u.node=null;u.carry=0;g.workBoard.reset();g.workBoard.assign(g,u);
  assert.equal(u.node,farm);
  u.node=null;u.order="idle";u.workCheckAt=0;g.tribe(0).food=5;g.workBoard.reset();g.workBoard.assign(g,u);
  assert.notEqual(u.node,farm);
});

test("children in a small village need food, with a grace period and saved hunger",()=>{
  const g=fixture();g.state.units=g.state.units.filter(u=>u.team!==0).concat(g.state.units.filter(u=>u.team===0).slice(0,2));
  const u=g.state.units.find(u=>u.team===0);u.maturesAt=g.state.time+10000;g.tribe(0).food=0;
  const hp=u.hp;g.tickPeople(100);assert.equal(u.hp,hp);g.tickPeople(100);assert.ok(u.hp<hp);
  const r=decodeGame(encodeGame(g));assert.equal(r.state.units.find(p=>p.id===u.id).hunger,200);
  g.tribe(0).food=100;g.tickPeople(10);assert.equal(u.hunger,170);
});
test("construction does not steal travelers or workers already on another building",()=>{
  const g=fixture(),h=g.campOf(0),b=g.makeBld("farm",h.x+15,h.z,0),workers=g.state.units.filter(u=>u.team===0);
  for(const u of workers)u.order="hold";
  workers[0].order="explore";workers[1].order="build";g.assignBuilders(b);
  assert.equal(workers[0].order,"explore");assert.notEqual(workers[1].node,b);
});
test("river banks improve soil potential and resource selection uses a separate focus",async()=>{
  const {soilQuality}=await import("../src/game/ecology.ts");const g=fixture();g.height=()=>2;
  g.world.biomes=[{kind:"plains",x:0,z:0}];g.world.rivers=[{pts:[{x:0,z:-100},{x:0,z:100}],w:4}];
  assert.ok(soilQuality(g,8,0)>soilQuality(g,80,0));
  g.state.units=[];g.state.buildings=[];g.vision.fill(2);const tree=g.state.trees[0];g.selectAt(tree.x,tree.z,false);
  assert.equal(g.selectedResource,tree);g.clearSelect();assert.equal(g.selectedResource,null);
});

test("personal predispositions are stable, bounded and survive save identity",async()=>{
  const {predisposition}=await import("../src/game/people.ts");const g=fixture(),r=decodeGame(encodeGame(g));
  const values=g.state.units.map(u=>predisposition(u));assert.ok(new Set(values.map(v=>v.speed)).size>1);
  for(let i=0;i<values.length;i++){assert.deepEqual(values[i],predisposition(r.state.units[i]));assert.ok(values[i].speed>0.8&&values[i].speed<1.25);}
});

test("a custom offer needs no remote report and is negotiated only after travel",async()=>{
  const {sendOffer}=await import("../src/game/barter.ts");const g=fixture();g.vision.fill(2);g.clearSelect();
  Object.assign(g.tribe(0),{food:200});Object.assign(g.tribe(1),{food:80,wood:200,hostile:false,tradeCd:0});
  const theirWood=g.tribe(1).wood;assert.equal(sendOffer(g,1,"food","wood",20,100),true);
  const u=g.state.units.find(u=>u.customOffer);assert.equal(g.tribe(1).wood,theirWood);assert.equal(u.carry,20);
  const r=decodeGame(encodeGame(g)),ru=r.state.units.find(p=>p.id===u.id),h=r.state.buildings.find(b=>b.team===1&&b.type==="townhall");
  ru.x=h.x+Math.max(h.w,h.d)*0.55+1;ru.z=h.z;r.tradeAI(ru,1);
  assert.equal(ru.order,"return");assert.ok(ru.carry>0&&ru.carry<100);assert.equal(ru.carryType,"wood");
  assert.equal(r.tribe(1).wood+ru.carry,theirWood);
});
