import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game/sim.ts";
import { calendar } from "../src/game/settlement.ts";

// ASTRA-19: recruitment into a surviving herd is offscreen, finite and bounded.
function edgeHerd() {
  const g = new Game();
  g.reset(71, 2);
  g.enterIsland();
  g.state.units = [];
  g.state.buildings = [];
  g.vision.fill(0);
  g.state.time = 10;
  assert.ok(calendar(g).phase <= 1, "fixture is in a recruiting season");
  const half = g.world.size / 2;
  const live = g.state.wildlife.find(c => c.species === "deer" && c.hp > 0) ?? g.state.wildlife.find(c => c.species !== "bird" && c.hp > 0);
  live.x = half - 3; live.z = 0;
  return { g, live, half };
}
test("recruitment never places an animal outside the world or on non-walkable ground, and only revives, never adds", () => {
  const { g, live, half } = edgeHerd();
  const dead = g.state.wildlife.filter(c => c.species === live.species && c !== live).slice(0, 10);
  assert.ok(dead.length >= 3);
  for (const c of dead) { c.hp = 0; c.carcass = undefined; c.wanderT = 0; }
  const total = g.state.wildlife.length;
  for (let i = 0; i < 40; i++) {
    for (const c of dead) if (c.hp <= 0) c.wanderT = 0;
    g.tickWildlife(1);
    for (const c of dead) if (c.hp > 0) {
      assert.ok(Math.abs(c.x) < half - 1 && Math.abs(c.z) < half - 1, `inside world (${c.x},${c.z})`);
      assert.ok(g.walkable(c.x, c.z), `walkable (${c.x},${c.z})`);
      assert.ok(!g.visibleAt(c.x, c.z), "offscreen recruitment only");
    }
  }
  assert.ok(dead.some(c => c.hp > 0), "some animals were recruited");
  assert.equal(g.state.wildlife.length, total, "recruitment revives existing slots; no new free animals");
});
