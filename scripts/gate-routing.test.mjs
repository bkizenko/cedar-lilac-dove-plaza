import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game/sim.ts";
import { setGateMode, tickGates } from "../src/game/fortifications.ts";
function fixture() {
  const g = new Game();
  g.reset(123456);
  g.enterIsland();
  g.world.heights.fill(4);
  Object.assign(g.state, { buildings: [], units: [], trees: [], stones: [], forage: [], weather: "clear" });
  g.clockState = () => ({ period: "Afternoon" });
  g.vision.fill(2);
  return g;
}
/** Square palisade ring (half-size 16, 4m cells) with one gate in the south wall. */
function ring(g, gateMode) {
  for (let i = -16; i <= 16; i += 4) for (const [x, z] of [[i, -16], [-16, i], [16, i], [i, 16]]) {
    if (x === 0 && z === 16) continue;
    g.state.buildings.push(g.makeBld("palisade", x, z, 0));
  }
  const gate = g.makeBld("gate", 0, 16, 0);
  g.state.buildings.push(gate);
  g.state.walkDirty = true;
  g.rebuildWalk();
  setGateMode(g, gate, gateMode);
  g.rebuildWalk();
  return gate;
}
function walk(g, mode) {
  const gate = ring(g, mode), u = g.spawnUnit("worker", 0, 0, 0);
  u.order = "move"; u.stationOnArrival = true; u.tx = 0; u.tz = 40; u.target = null;
  let maxStep = 0, px = u.x, pz = u.z;
  for (let i = 0; i < 1500; i++) {
    g.step(1 / 30); tickGates(g);
    const d = Math.hypot(u.x - px, u.z - pz); maxStep = Math.max(maxStep, d); px = u.x; pz = u.z;
  }
  return { u, gate, maxStep };
}
test("open gate: a unit inside the ring walks out through the gate with no teleport", () => {
  const { u, gate, maxStep } = walk(fixture(), "open");
  assert.equal(gate.gateOpen, true);
  assert.ok(u.z > 20, `unit reached outside (z=${u.z})`);
  assert.ok(maxStep < 1, `no per-tick jump (max ${maxStep})`);
});
test("closed gate: a unit inside stays enclosed; no wall is crossed and nothing teleports", () => {
  const g = fixture(), { u, gate, maxStep } = walk(g, "closed");
  assert.ok(!gate.gateOpen);
  assert.equal(g.solidBuilding(gate), true);
  assert.ok(Math.abs(u.x) < 16 && u.z < 16, `unit still inside (${u.x},${u.z})`);
  assert.ok(maxStep < 1);
});
