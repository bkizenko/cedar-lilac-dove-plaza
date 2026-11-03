import {parseStoredSave} from '../src/game/storageCodec.ts';
import test, { after } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { registerHooks } from "node:module";
import { Game } from "../src/game/sim.ts";
import {
  DIFFICULTIES,
  difficulty,
  difficultyId,
  difficultyEffects,
} from "../src/game/difficulty.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";
import { foodDemand } from "../src/game/settlement.ts";
import { foodSpoilage, consumeAndSpoilFood } from "../src/game/pantry.ts";
import { climateAt } from "../src/game/ecology.ts";
import { tickSurvival, ambientTemperature } from "../src/game/survivalNeeds.ts";
import { tickFrontiers } from "../src/game/frontiers.ts";
import { acceptWorkerCommand, commandDiagnostics } from "../src/game/commandGateway.ts";
import { SAVE_KEY } from "../src/game/constants.ts";
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/"))
      return next(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    return next(specifier, context);
  },
});
const { Engine } = await import("../src/game/engine.ts");
const ids = Object.keys(DIFFICULTIES),
  metrics = [];
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
function seeded(fn) {
  const old = Math.random;
  let n = 1234567;
  Math.random = () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
  try {
    return fn();
  } finally {
    Math.random = old;
  }
}
function fresh(id = "normal") {
  return seeded(() => {
    const g = new Game();
    g.reset(345, 14, { size: 1040, layout: "pangaea", difficulty: id });
    g.enterIsland();
    return g;
  });
}
const hash = (g) => createHash("sha256").update(Buffer.from(g.world.heights.buffer)).digest("hex");
const total = (g, key, prop = "amount") => g.state[key].reduce((n, x) => n + x[prop], 0);

test("all six actual new worlds preserve native geometry/entity counts and scale finite opening supplies and shared node capacities", () => {
  const base = fresh(),
    baseHash = hash(base),
    normalNodes = Object.fromEntries(
      ["trees", "stones", "forage", "fish", "copper", "iron"].map((k) => [
        k,
        { amount: total(base, k), capacity: total(base, k, "maxAmt"), count: base.state[k].length },
      ]),
    );
  for (const id of ids) {
    const g = fresh(id),
      p = DIFFICULTIES[id];
    assert.equal(g.state.difficulty, id);
    assert.equal(hash(g), baseHash);
    assert.deepEqual(g.world.camps, base.world.camps);
    assert.deepEqual(g.world.ecology.metrics, base.world.ecology.metrics);
    assert.equal(g.state.units.length, base.state.units.length);
    assert.equal(g.state.wildlife.length, base.state.wildlife.length);
    near(g.tribe(0).food, base.tribe(0).food * p.provisions);
    near(g.tribe(0).survival.waterLiters, base.tribe(0).survival.waterLiters * p.provisions);
    near(g.tribe(0).wood, base.tribe(0).wood);
    near(g.tribe(1).food, base.tribe(1).food);
    near(g.tribe(1).thinkT, base.tribe(1).thinkT * p.decisionInterval);
    for (const key of Object.keys(normalNodes)) {
      assert.equal(g.state[key].length, normalNodes[key].count);
      near(total(g, key), normalNodes[key].amount * p.abundance);
      near(total(g, key, "maxAmt"), normalNodes[key].capacity * p.abundance);
    }
    metrics.push({
      id,
      profile: p,
      opening: {
        food: g.tribe(0).food,
        water: g.tribe(0).survival.waterLiters,
        people: g.popNow(0),
        nativeTerrainSha256: hash(g),
        trees: total(g, "trees"),
        forage: total(g, "forage"),
        fish: total(g, "fish"),
      },
    });
  }
});

test("all preset partial depletion and exact finite openings survive strict saves with no load multiplier; absent legacy preset remains Normal", () => {
  for (const id of ids) {
    const g = fresh(id);
    g.tribe(0).food -= 7;
    g.tribe(0).survival.waterLiters -= 3;
    const node = g.state.trees.find((n) => n.amount > 3);
    node.amount -= 3;
    const raw = encodeGame(g),
      copy = decodeGame(raw);
    assert.equal(copy.state.difficulty, id);
    near(copy.tribe(0).food, g.tribe(0).food);
    near(copy.tribe(0).survival.waterLiters, g.tribe(0).survival.waterLiters);
    near(copy.state.trees.find((n) => n.id === node.id).amount, node.amount);
    near(copy.state.trees.find((n) => n.id === node.id).maxAmt, node.maxAmt);
    assert.equal(hash(copy), hash(g));
    assert.equal(copy.state.units.length, g.state.units.length);
  }
  const g = fresh(),
    raw = encodeGame(g);
  delete raw.state.difficulty;
  const copy = decodeGame(raw);
  assert.equal(difficulty(copy), DIFFICULTIES.normal);
  near(copy.tribe(0).food, g.tribe(0).food);
  near(copy.state.trees[0].amount, g.state.trees[0].amount);
  for (const invalid of ["toString", "constructor", "impossible", null, 3]) {
    assert.throws(() => difficultyId(invalid));
    raw.state.difficulty = invalid;
    assert.throws(() => decodeGame(raw));
  }
  const before = g.state;
  assert.throws(() => g.reset(3, 14, { difficulty: "impossible" }));
  assert.equal(g.state, before);
});

test("all presets alter actual displayed/local climate and winter exposure while Normal and absent legacy remain exactly neutral", () => {
  const g = fresh(),
    normalTemperature = climateAt(g, g.campOf(0).x, g.campOf(0).z).temperature;
  g.state.buildings = [];
  g.state.units = g.state.units.filter((u) => u.team === 0).slice(0, 1);
  g.state.weather = "frost";
  g.state.time = 0;
  g.tribe(0).wood = 0;
  let previous = -Infinity;
  const results = [];
  for (const id of ids) {
    g.state.difficulty = id;
    const p = DIFFICULTIES[id],
      temperature = climateAt(g, g.campOf(0).x, g.campOf(0).z, 0, "clear").temperature;
    near(temperature, 12 + (normalTemperature - 12) * p.climate);
    const u = g.state.units[0];
    u.coldSeconds = 0;
    u.garment = undefined;
    u.shelterId = undefined;
    g.tribe(0).survival.coldExposurePersonSeconds = 0;
    tickSurvival(g, 1);
    const exposure = u.coldSeconds || 0;
    assert.ok(exposure >= previous);
    previous = exposure;
    results.push({
      id,
      localTemperature: temperature,
      displayedCelsius: ambientTemperature(g),
      coldSeconds: exposure,
    });
  }
  assert.ok(results.at(-1).coldSeconds > results[0].coldSeconds);
  assert.ok(new Set(results.map((r) => r.displayedCelsius)).size >= 5);
  g.state.difficulty = "normal";
  const normal = climateAt(g, g.campOf(0).x, g.campOf(0).z);
  delete g.state.difficulty;
  assert.deepEqual(climateAt(g, g.campOf(0).x, g.campOf(0).z), normal);
  metrics.push({ climate: results });
});

test("actual rival strategic review cooldown and witnessed border tension causally follow all six profiles without changing command admission", () => {
  const results = [];
  for (const id of ids) {
    const g = fresh();
    g.state.difficulty = id;
    const tr = g.tribe(1);
    tr.thinkT = 0;
    const old = Math.random;
    Math.random = () => 0.5;
    try {
      g.rivalTick(1, 0);
    } finally {
      Math.random = old;
    }
    near(tr.thinkT, 2.1 * DIFFICULTIES[id].decisionInterval);
    const pending = tr.thinkT;
    g.rivalTick(1, 0.01);
    near(tr.thinkT, pending - 0.01);
    // Controlled physical local contact, not an injected knowledge record.
    g.state.buildings = [];
    g.state.units = [];
    g.world.heights.fill(4);
    g.world.rivers = [];
    g.world.features = [];
    g.world.waterBodies = [];
    g.world.waterHeights = undefined;
    g.world.ecology = undefined;
    const own = g.makeBld("townhall", 0, 60, 0),
      other = g.makeBld("townhall", 80, 60, 1),
      post = g.makeBld("cornerstone", 70, 60, 0);
    g.state.buildings = [own, other, post];
    const witness = g.spawnUnit("worker", 80, 65, 1),
      worker = g.spawnUnit("worker", 0, 70, 0);
    witness.order = "hold";
    worker.order = "hold";
    g.rebuildWalk();
    tr.hostile = false;
    tr.ally = false;
    tr.tension = 0;
    tr.trust = 0.5;
    g.state.observedClaims = [];
    g.state.time = 0;
    tickFrontiers(g);
    g.state.time = 2;
    tickFrontiers(g);
    assert.ok(
      g.state.observedClaims.some(
        (m) => m.observer === 1 && m.witnessId === witness.id && m.postId === post.id,
      ),
    );
    assert.ok(tr.tension > 0);
    assert.equal(acceptWorkerCommand(g, worker, "move"), true);
    worker.hp = 0;
    assert.equal(acceptWorkerCommand(g, worker, "move"), false);
    assert.equal(commandDiagnostics(g).accepted, 1);
    assert.equal(commandDiagnostics(g).rejected, 1);
    results.push({ id, reviewSeconds: pending, witnessedTension: tr.tension });
  }
  const normal = results.find((r) => r.id === "normal").witnessedTension;
  for (const r of results) near(r.witnessedTension, normal * DIFFICULTIES[r.id].conflictPressure);
  metrics.push({ strategyAndContact: results });
});

test("real new-world configuration protects current village, carries selected preset, preserves restart preset and refuses unprotected replacement", () => {
  const oldStorage = globalThis.localStorage,
    values = new Map();
  globalThis.localStorage = {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
  };
  try {
    const e = Object.create(Engine.prototype);
    Object.assign(e, {
      game: fresh(),
      originalGame: null,
      autosave: { invalidate() {} },
      keyboard: { groups: new Map() },
      view: { rebuild() {}, look: { set() {} } },
      audio: { unlock() {} },
      pushHud() {},
    });
    const oldSeed = e.game.state.seed;
    assert.equal(
      e.configureNewWorld({ size: 1040, layout: "continents", difficulty: "hard" }),
      true,
    );
    assert.equal(e.game.state.difficulty, "hard");
    assert.equal(e.game.world.options.layout, "continents");
    assert.equal(parseStoredSave(values.get(SAVE_KEY + ":protected")).state.seed, oldSeed);
    near(e.game.tribe(0).food, 120 * DIFFICULTIES.hard.provisions);
    e.restart({ size: 1040, layout: "pangaea" });
    assert.equal(e.game.state.difficulty, "hard");
    const state = e.game.state;
    globalThis.localStorage = {
      getItem: () => null,
      setItem() {
        throw new Error("quota");
      },
    };
    assert.equal(e.configureNewWorld({ difficulty: "easy" }), false);
    assert.equal(e.game.state, state);
    assert.match(e.game.state.banner, /Export it/);
  } finally {
    globalThis.localStorage = oldStorage;
  }
});

after(() => {
  if (process.env.DIFFICULTY_DOMAIN_REPORT)
    writeFileSync(process.env.DIFFICULTY_DOMAIN_REPORT, JSON.stringify(metrics, null, 2) + "\n");
});
test("all six presets actually consume/spoil finite provisions and execute an ordinary native-ground move", () => {
  const results = [];
  for (const id of ids) {
    const g = fresh(id),
      before = g.tribe(0).food,
      dt = 10,
      demand = foodDemand(g),
      spoil = foodSpoilage(g);
    consumeAndSpoilFood(g, 0, demand, dt);
    const events = g.state.simulationEvents.totals;
    near(events["food_consumed:0:food"], demand * dt);
    near(events["food_spoiled:0:food"], spoil * dt);
    near(g.tribe(0).food, before - (demand + spoil) * dt);
    g.state.conflict = "quiet";
    g.state.weather = "clear";
    g.state.weatherT = 900;
    g.state.visitorTimer = 900;
    g.state.scoutTimer = 900;
    g.state.raidT = 900;
    g.state.birthT = 900;
    const u = g.state.units.find((u) => u.team === 0 && u.type === "worker"),
      start = { x: u.x, z: u.z };
    let target;
    for (let i = 0; i < 16 && !target; i++) {
      const a = (i * Math.PI) / 8,
        x = u.x + Math.cos(a) * 5,
        z = u.z + Math.sin(a) * 5;
      if (g.walkable(x, z) && g.workBoard.connected(g, u.x, u.z, x, z)) target = { x, z };
    }
    assert.ok(target);
    g.clearSelect();
    g.selectEntity(u);
    g.issueMove(target.x, target.z);
    assert.equal(u.order, "move");
    let steps = 0;
    for (; steps < 200 && Math.hypot(u.x - target.x, u.z - target.z) > 1.5; steps++) g.step(0.1);
    assert.ok(Math.hypot(u.x - target.x, u.z - target.z) <= 1.5, id);
    assert.ok(Math.hypot(u.x - start.x, u.z - start.z) > 3, id);
    assert.deepEqual(g.simulationErrors, []);
    results.push({
      id,
      provisionsBefore: before,
      consumed: events["food_consumed:0:food"],
      spoiled: events["food_spoiled:0:food"],
      move: { start, target, arrival: { x: u.x, z: u.z }, steps },
    });
  }
  metrics.push({ actualProvisionUseAndMovement: results });
});
