import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game/sim.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";
import { neighborIntent, farmWork, crop } from "../src/game/settlement.ts";
const fixture = () => {
  const g = new Game();
  g.reset(123456);
  g.enterIsland();
  return g;
};
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
    a = g.state.units.find((u) => u.team === 0 && u.type === "spearman");
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
  assert.ok(maxStep <= u.speed / 30 + 1e-5);
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
  assert.match(u.workReason, /No reachable work/);
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
  assert.equal(b.crop.remaining, 258);
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
  const g = fixture(),
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
  const g = fixture(),
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
  const g = fixture(),
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
  const g = fixture(),
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
  assert.equal(g.popNow(0), before + 1);
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
  g.tribe(0).food = 1000;
  g.landSeaFolk();
  assert.equal(g.popNow(0), before);
  g.state.growthPolicy = "welcome";
  g.tribe(0).food = 25;
  g.landSeaFolk();
  assert.equal(g.popNow(0), before);
  g.tribe(0).food = 1000;
  g.landSeaFolk();
  assert.equal(g.popNow(0), before + 1);
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
  assert.equal(g.enqueueTrain(hall, "worker"), true);
  hall.queue[0].t = hall.queue[0].max;
  g.updateTraining(0.01);
  assert.equal(g.popNow(0), before + 1);
  const barracks = g.makeBld("barracks", hall.x + 16, hall.z, 0);
  g.state.buildings.push(barracks);
  g.tribe(0).food = 500;
  g.tribe(0).wood = 80;
  const workers = () => g.state.units.filter((u) => u.team === 0 && u.type === "worker" && u.hp > 0).length;
  const w0 = workers();
  const pop = g.popNow(0);
  assert.equal(g.enqueueTrain(barracks, "spearman"), true);
  barracks.queue[0].t = barracks.queue[0].max;
  g.updateTraining(0.01);
  assert.equal(g.popNow(0), pop);
  assert.equal(workers(), w0 - 1);
  assert.ok(g.state.units.some((u) => u.team === 0 && u.type === "spearman" && !u.militia));
});

test("marked trees are felled first, and burning a hall takes stores", async () => {
  const { FOW, HALF, MAP } = await import("../src/game/constants.ts");
  const g = fixture();
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
  assert.equal(g.placeBuilding("cornerstone", 140, 38), true);
  const marker = g.state.buildings.find(b => b.type === "cornerstone");
  assert.equal(g.nearestDrop(140, 38, 0).type, "townhall", "unfinished marker cannot receive goods");
  const before = g.tribe(0).wood;
  let delivered = false;
  for (let i = 0; i < 2400 && !delivered; i++) {
    g.state.time += 0.1;
    g.navBudget = 20;
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
  const {quoteShipment, proposeShipment} = await import("../src/game/barter.ts");
  const g = fixture(); g.vision.fill(1); g.clearSelect();
  Object.assign(g.tribe(0), {food: 200});
  Object.assign(g.tribe(1), {food: 80, wood: 200, tradeCd: 0, hostile: false});
  const wood = g.tribe(0).wood;
  const quote = quoteShipment(g, 1, "food", "wood", 30).deal;
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
    g.tickWeather(299);
    assert.equal(g.state.weather, "clear");
  }
});
