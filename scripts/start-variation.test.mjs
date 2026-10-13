import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { generateWorld, sampleHeight } from "../src/game/worldgen.ts";
import { Game } from "../src/game/sim.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";

// Geometry captured before the habitat-resource pass: legacy saves reconstruct
// their terrain from seed, including the shoreline pads placed at generation's end.
const cases = [
  [123456, "plains", "134d933ca6a6dab7ac3df4becb1ccf54db2e2e431797803bf6a89f9acdb5c130"],
  [71, "hills", "b109e6b328f42643197321a5ad1bb02ae9ec7f59478bdb5c3e42cde07de2c785"],
  [982, "forest", "90dc00128b44c23ac4885d13218a969fbcd190a9ce69f6ff33a59ae3addada01"],
  [1001, "hills", "d4deb2bd5f95e25a958f693bc1a50f03c8163d82c839304b42125cff0ba712f3"],
  [1002, "plains", "5515e585855f3c496ffd800657de392dc8178305ac250d97d9e20f75c7c0f54d"],
  [1003, "forest", "4ceff8a4ab826d8508ffd1cb5f264b90619b18ef69803debfb7c3bbe2326ee77"],
];

test("new habitats have different useful resource mixes without moving existing terrain", () => {
  for (const [seed, habitat, hash] of cases) {
    const w = generateWorld(seed, 2), home = w.camps[0];
    const distance = n => Math.hypot(n.x - home.x, n.z - home.z);
    const local = nodes => nodes.filter(n => distance(n) < 72);
    assert.equal(w.biomes[0].kind, habitat);
    assert.equal(createHash("sha256").update(Buffer.from(w.heights.buffer)).digest("hex"), hash);
    assert.ok(w.forage.filter(n => distance(n) < 35).length >= 4, `seed ${seed}: reachable opening food`);
    assert.ok(w.trees.filter(n => distance(n) < 35).reduce((sum, n) => sum + n.amount, 0) >= 70,
      `seed ${seed}: enough close timber for practical construction`);
    if (habitat === "forest") assert.ok(local(w.trees).length >= 45, `seed ${seed}: substantial woodland`);
    if (habitat === "plains") {
      assert.ok(local(w.forage).length >= 25, `seed ${seed}: edible meadow plants`);
      assert.ok(local(w.trees).length <= 12, `seed ${seed}: sparse accessible timber`);
    }
    if (habitat === "hills") assert.ok(local(w.stones).length >= 10, `seed ${seed}: rocky resource advantage`);
    const nodes = [...w.trees, ...w.forage, ...w.stones, ...w.fish, ...w.copper, ...w.iron];
    assert.equal(new Set(nodes.map(n => n.id)).size, nodes.length, "resource identities remain unique");
    for (const n of [...local(w.trees), ...local(w.forage), ...local(w.stones)]) {
      assert.ok(distance(n) >= 16, "keep a clear hearth and shelter area");
      assert.ok(sampleHeight(w.heights, n.x, n.z) >= w.waterY + 0.55, "land resources stand on dry ground");
      const steps = Math.ceil(distance(n) / 2);
      let previous = sampleHeight(w.heights, home.x, home.z);
      for (let i = 1; i <= steps; i++) {
        const y = sampleHeight(w.heights, home.x + (n.x - home.x) * i / steps, home.z + (n.z - home.z) * i / steps);
        assert.ok(y >= w.waterY + 0.32 && Math.abs(y - previous) <= 1.25, "opening supplies have a dry gentle approach");
        previous = y;
      }
    }
  }
});

test("loading an established village keeps every saved resource position, identity and depletion", () => {
  const g = new Game();
  g.reset(982, 2);
  // Deliberately differ from generation, as an older or heavily worked village does.
  g.state.trees = g.state.trees.slice(3);
  g.state.forage[0].amount = 0;
  g.state.forage[0].pressure = 0.83;
  g.state.forage[0].regenT = 73;
  g.state.stones[0].amount = 2;
  g.state.trees[0].x += 0.25;
  const before = encodeGame(g), restored = decodeGame(before);
  for (const kind of ["trees", "forage", "stones", "fish", "copper", "iron"])
    assert.deepEqual(restored.state[kind], before.state[kind], `${kind} must not be regenerated when loading`);
  assert.deepEqual(restored.world.heights, g.world.heights);
});

test("a cliff-bound legacy start relocates only its new hearth and supplies to reachable ground", () => {
  const g = new Game(); g.reset(31, 2);
  const w = g.world, home = g.campOf(0);
  assert.ok(Math.hypot(home.x - 11.25842109043908, home.z - 140.42991089413607) >= 24,
    "seed 31 previously put a dry hearth inside a steep crater");
  assert.equal(createHash("sha256").update(Buffer.from(w.heights.buffer)).digest("hex"),
    "bb240ab0538edf54efe7b04ff877649af579bebcbafda41e91f3d360a1f75178",
    "repair must not move the terrain underneath established villages");
  const close = n => Math.hypot(n.x - home.x, n.z - home.z) < 35;
  assert.ok(w.forage.filter(close).length >= 4);
  assert.ok(w.trees.filter(close).reduce((sum, n) => sum + n.amount, 0) >= 70);
  const residents = g.state.units.filter(u => u.team === 0);
  for (const n of [...residents, ...w.forage.filter(close), ...w.trees.filter(close)]) {
    assert.ok(g.walkable(n.x, n.z), "residents and opening supplies occupy real walk cells");
    assert.ok(g.workBoard.connected(g, home.x, home.z, n.x, n.z), "supplies share the hearth's walk region");
  }

  // Model an established save made at the old position, before the generation repair.
  // Loading it must preserve the user's settlement even though new games now differ.
  const dx = 11.25842109043908 - home.x, dz = 140.42991089413607 - home.z;
  for (const n of [...g.state.buildings, ...residents].filter(n => n.team === 0)) {
    n.x += dx; n.z += dz; n.y = g.height(n.x, n.z);
  }
  const raw = JSON.parse(JSON.stringify(encodeGame(g))), loaded = decodeGame(raw);
  assert.deepEqual(loaded.state.buildings, raw.state.buildings);
  for (const n of raw.state.units.filter(u => u.team === 0)) {
    const restored = loaded.state.units.find(u => u.id === n.id);
    assert.equal(restored.x, n.x); assert.equal(restored.z, n.z);
  }
  assert.deepEqual(loaded.world.heights, w.heights);
});
