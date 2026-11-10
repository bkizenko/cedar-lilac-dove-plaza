import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game/sim.ts";
import { initializeSurvival, ambientTemperature } from "../src/game/survivalNeeds.ts";
import { tickHousing, beginHousingUpgrade, preferredRivalHome } from "../src/game/housing.ts";
import { validateGameSave, encodeGame, decodeGame } from "../src/game/persistence.ts";
function thermal(type, far = false, renovation = false) {
  const g = new Game();
  g.reset(42, 2);
  g.enterIsland();
  const u = g.state.units.find((u) => u.team === 0 && u.type === "worker");
  g.state.units = [u];
  g.state.buildings = [];
  g.state.time = 1500;
  g.state.weather = "mist";
  g.state.weatherT = 10000;
  g.state.conflict = "quiet";
  g.state.autoWorkEnabled = false;
  g.state.nightWork = true;
  g.tribe(0).wood = 0;
  g.tribe(0).food = 100;
  initializeSurvival(g);
  const b = g.makeBld(type, u.x + (far ? 100 : 0), u.z, 0);
  g.state.buildings.push(b);
  u.order = "hold";
  u.node = null;
  u.job = null;
  u.coldSeconds = 0;
  if (!far) u.shelterId = b.id;
  if (renovation) {
    g.tribe(0).wood = 0;
    assert.equal(beginHousingUpgrade(g, b.id).accepted, true);
  }
  const temp = ambientTemperature(g);
  for (let n = 0; n < 5; n++) g.step(0.2);
  assert.deepEqual(g.simulationErrors, []);
  return { cold: u.coldSeconds, temp, cap: g.popCap(0), b };
}
test("actual Game.step cold protection applies only at completed house; unfinished upgrade retains original hut protection/capacity", () => {
  const hut = thermal("hut"),
    house = thermal("house"),
    far = thermal("house", true),
    pending = thermal("hut", false, true);
  assert.equal(hut.temp, house.temp);
  assert.ok(hut.cold > house.cold, JSON.stringify({ hut, house }));
  assert.ok(far.cold > house.cold);
  assert.ok(Math.abs(pending.cold - hut.cold) < 1e-7);
  assert.equal(pending.cap, hut.cap);
  assert.equal(house.cap, hut.cap + 2);
});
test("ordinary bounded NPC review plans real housing only from crowding and actual reserves, no fibre or learned-method grant", () => {
  const g = new Game();
  g.reset(42, 2);
  g.enterIsland();
  g.state.conflict = "quiet";
  const team = 1,
    t = g.tribe(team),
    home = g.campOf(team);
  t.wood = 150;
  t.stone = 60;
  t.food = 1000;
  t.items = { ...(t.items || {}), plantFibre: 0 };
  while (g.popNow(team) < g.popCap(team) - 1) g.spawnUnit("worker", home.x + 10, home.z + 10, team);
  const before = g.popCap(team),initialPayload=encodeGame(g);
  tickHousing(g, 0);
  assert.equal(
    g.state.buildings.some((b) => b.team === team && b.renovation),
    false,
  );
  assert.equal(preferredRivalHome(g, team), "hut");
  // Different declared INITIAL fixture, not a midrun grant: same native map,
  // crowding, genuinely stored endowment6fibre. No Game.step has occurred.
  const candidate=decodeGame(initialPayload),ct=candidate.tribe(team);ct.items.plantFibre=6;
  tickHousing(candidate,0);
  const b = candidate.state.buildings.find((b) => b.team === team && b.renovation);
  assert.ok(b, "native planner reserves actual existing hut, not an invented free house");
  assert.equal(b.type, "hut");
  assert.equal(b.build, 1);
  assert.equal(b.renovation.paid, false);
  assert.equal(g.popCap(team), before);
  assert.equal(ct.items.plantFibre, 6);
  assert.equal(
    g.state.units.some((u) => u.team === team && u.housingSkill),
    false,
  );
  assert.equal(preferredRivalHome(g, team), "hut");
  validateGameSave(encodeGame(candidate));
});
