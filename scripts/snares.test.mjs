import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game/sim.ts";
import { BUILDINGS } from "../src/game/constants.ts";
import { SNARE_RULES, rollSnare, snareMeat, collectSnare, validSnareState, snareCatches } from "../src/game/snares.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";

function fixture() {
  const g = new Game(); g.reset(123456); g.enterIsland();
  g.world.heights.fill(4); g.state.units = []; g.state.buildings = [];
  g.state.trees = []; g.state.forage = []; g.state.fish = []; g.state.stones = [];
  g.state.weather = "clear"; g.vision.fill(2);
  g.state.buildings = [g.makeBld("townhall", 0, 60, 0)];
  const s = g.makeBld("snare", 0, 30, 0); s.build = 1; g.state.buildings.push(s);
  const mk = (species, x = 0, z = 33) => ({ id: g.id(), species, x, z, y: 4, hp: 2, maxHp: 2, facing: 0, vx: 0, vz: 0, wanderT: 20, fly: 0, scale: 1 });
  return { g, s, mk };
}
function roll(g, s, windows) { for (let i = 0; i < windows; i++) { g.state.time += SNARE_RULES.rollSeconds; rollSnare(g, s); } }

test("snare is a cheap Stone-age wild structure", () => {
  const d = BUILDINGS.snare; assert.equal(d.age, 0); assert.ok(d.wood <= 5 && d.stone === 0 && d.food === 0);
});
test("catches come out of the real wildlife stock, bounded by what is about and by capacity", () => {
  const { g, s, mk } = fixture();
  g.state.wildlife = [mk("bird"), mk("bird"), mk("goat"), mk("deer"), mk("boar"), mk("goat", 200, 200)];
  const before = g.state.wildlife.length;
  for (const sp of ["bird", "bird", "goat", "deer"]) SNARE_RULES.chance[sp] = 1; // certain for this test only
  try { roll(g, s, 10); } finally { SNARE_RULES.chance.bird = .35; SNARE_RULES.chance.goat = .25; SNARE_RULES.chance.deer = .1; }
  assert.equal(snareCatches(g, s).length, SNARE_RULES.maxHeld, "never holds more than the cap");
  assert.equal(g.state.wildlife.length, before - SNARE_RULES.maxHeld, "each catch removed one animal");
  assert.ok(g.state.wildlife.some(c => c.species === "boar"), "boar is never snared");
  assert.ok(g.state.wildlife.some(c => c.x === 200), "distant animals are untouched");
});
test("no prey, no catch; unfinished snares catch nothing", () => {
  const { g, s } = fixture(); g.state.wildlife = []; roll(g, s, 20); assert.equal(snareMeat(g, s), 0);
  const { g: g2, s: s2, mk } = fixture(); g2.state.wildlife = [mk("bird")]; s2.build = 0.2; SNARE_RULES.chance.bird = 1;
  try { roll(g2, s2, 5); } finally { SNARE_RULES.chance.bird = .35; }
  assert.equal(g2.state.wildlife.length, 1);
});
test("a roll is deterministic and a window rolls once", () => {
  const run = () => { const { g, s, mk } = fixture(); g.state.wildlife = [mk("goat"), mk("bird")]; roll(g, s, 40); return JSON.stringify([s.snare, g.state.wildlife.length]); };
  assert.equal(run(), run());
  const { g, s } = fixture(); g.state.time = 1000; rollSnare(g, s); const r = s.snare.rolled; rollSnare(g, s); assert.equal(s.snare.rolled, r);
});
test("catches spoil if left, and a worker collects the meat into their load", () => {
  const { g, s, mk } = fixture(); g.state.wildlife = [mk("goat")]; SNARE_RULES.chance.goat = 1;
  try { roll(g, s, 1); } finally { SNARE_RULES.chance.goat = .25; }
  assert.equal(snareMeat(g, s), 16);
  const u = g.spawnUnit("worker", 0, 31, 0); u.carry = 0;
  const took = collectSnare(g, u, s);
  assert.equal(took, 16); assert.equal(u.carry, 16); assert.equal(u.carryFood, "meat"); assert.equal(snareMeat(g, s), 0);
  const { g: g2, s: s2, mk: mk2 } = fixture(); g2.state.wildlife = [mk2("bird")]; SNARE_RULES.chance.bird = 1;
  try { roll(g2, s2, 1); } finally { SNARE_RULES.chance.bird = .35; }
  assert.ok(snareMeat(g2, s2) > 0); g2.state.time += SNARE_RULES.spoilSeconds + 1; assert.equal(snareMeat(g2, s2), 0);
});
test("snare state validates and survives a save; bad state is rejected", () => {
  assert.ok(validSnareState(undefined, 10, "hut")); assert.ok(!validSnareState({ catches: [], rolled: -1 }, 10, "hut"));
  assert.ok(validSnareState({ catches: [{ species: "bird", meat: 3, at: 5 }], rolled: 2 }, 10, "snare"));
  assert.ok(!validSnareState({ catches: [{ species: "boar", meat: 3, at: 5 }], rolled: 2 }, 10, "snare"));
  assert.ok(!validSnareState({ catches: [{ species: "bird", meat: 99, at: 5 }], rolled: 2 }, 10, "snare"));
  assert.ok(!validSnareState({ catches: [{ species: "bird", meat: 3, at: 50 }], rolled: 2 }, 10, "snare"));
  const { g, s, mk } = fixture(); g.state.wildlife = [mk("bird")]; SNARE_RULES.chance.bird = 1;
  try { roll(g, s, 1); } finally { SNARE_RULES.chance.bird = .35; }
  const held = snareMeat(g, s); assert.ok(held > 0);
  const g2 = decodeGame(encodeGame(g));
  const s2 = g2.state.buildings.find(b => b.type === "snare"); assert.equal(snareMeat(g2, s2), held);
});
test("a loaded snare is a food node for a food worker; an empty one is not", () => {
  const { g, s, mk } = fixture(); g.state.wildlife = [mk("goat")]; SNARE_RULES.chance.goat = 1;
  const u = g.spawnUnit("worker", 0, 36, 0); u.maturesAt = 0; u.job = "food";
  assert.notEqual(g.findNode(u, "food"), s, "empty snare is not a node");
  try { roll(g, s, 1); } finally { SNARE_RULES.chance.goat = .25; }
  assert.equal(g.findNode(u, "food"), s, "loaded snare is a food node");
  assert.equal(g.resKind(s), "food");
});
