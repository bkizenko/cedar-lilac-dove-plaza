import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Game } from "../src/game/sim.ts";
import { huntingSightClear } from "../src/game/hunting.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";
const hash = (g) => createHash("sha256").update(Buffer.from(g.world.heights.buffer)).digest("hex");
test("a field hunter tracks a truly moving deer out of current sight on unchanged native ground, saves its dated point, then physically returns", () => {
  const oldRandom = Math.random;
  let rng = 40110;
  Math.random = () => {
    rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
    return rng / 4294967296;
  };
  try {
    let g = new Game();
    g.reset(1, 14, { size: 1040, layout: "pangaea" });
    g.enterIsland();
    g.state.autoWorkEnabled = false;
    g.state.conflict = "quiet";
    g.state.weather = "clear";
    g.state.weatherT = 10000;
    g.state.raidT = 10000;
    g.state.visitorTimer = 900;
    g.state.birthT = 10000;
    g.calamityT = 10000;
    for (const t of g.state.tribes) t.thinkT = 10000;
    for (const u of g.state.units.filter((u) => u.team === 0)) u.order = "hold";
    Object.assign(g.tribe(0), {
      food: 60,
      foodLots: { provisions: 60 },
      wood: 40,
      stone: 20,
      bows: 0,
      spears: 0,
      blades: 0,
      items: {},
    });
    g.tribe(0).survival.waterLiters = 100;
    // Explicit initial expedition pose on real seed1/V14 terrain; all later body,
    // prey, visibility and path changes are produced by ordinary simulation.
    const ids = g.state.units.filter((u) => u.team === 0).map((u) => u.id),
      hunter = g.state.units.find((u) => u.team === 0 && u.type === "worker"),
      hunterId = hunter.id,
      home = { ...g.campOf(0) },
      start = { x: -40.86737138671876, z: 241.79467667297143 },
      animalStart = { x: -48.66160002077871, z: 237.29467667297143 };
    assert.ok(g.walkable(start.x, start.z));
    assert.ok(g.walkable(animalStart.x, animalStart.z));
    assert.ok(g.workBoard.connected(g, start.x, start.z, home.x, home.z));
    Object.assign(hunter, { ...start, y: g.height(start.x, start.z), tx: start.x, tz: start.z });
    const c = {
        id: g.id(),
        species: "deer",
        ...animalStart,
        y: g.height(animalStart.x, animalStart.z),
        hp: 3,
        maxHp: 3,
        facing: 0,
        vx: -0.8660254037844388 * 4,
        vz: -0.4999999999999997 * 4,
        wanderT: 10000,
        fly: 0,
        scale: 1,
        grazing: { ...animalStart },
      },
      preyId = c.id;
    g.state.wildlife = [c];
    const terrain = hash(g);
    g.updateVision(0);
    assert.equal(g.visibleAt(c.x, c.z), true);
    assert.equal(
      huntingSightClear(
        g,
        { x: hunter.x, y: hunter.y + 1.2, z: hunter.z },
        { x: c.x, y: c.y + 0.4, z: c.z },
      ),
      true,
    );
    g.clearSelect();
    g.selectEntity(hunter);
    g.issueGather(c);
    const body = () => g.state.units.find((u) => u.id === hunterId),
      prey = () => g.state.wildlife.find((p) => p.id === preyId);
    let trackingSeconds = 0,
      reacquired = false;
    const decisions = [];
    function instrument() {
      const steer = g.steer.bind(g);
      g.steer = (u, dt) => {
        if (u.id === hunterId && u.workReason === "Tracking last-seen prey")
          decisions.push({
            time: g.state.time,
            observer: { x: u.x, y: u.y, z: u.z },
            animal: { x: prey().x, y: prey().y, z: prey().z },
            visible: g.visibleAt(prey().x, prey().z),
            lineClear: huntingSightClear(
              g,
              { x: u.x, y: u.y + 1.2, z: u.z },
              { x: prey().x, y: prey().y + 0.4, z: prey().z },
            ),
          });
        return steer(u, dt);
      };
    }
    instrument();
    function step() {
      g.state.paused = false;
      g.step(0.1);
      assert.deepEqual(g.simulationErrors, []);
      assert.ok(!g.state.ended);
      for (const id of ids) assert.ok(g.state.units.some((u) => u.id === id && u.hp > 0));
      if (body().workReason === "Tracking last-seen prey") trackingSeconds += 0.1;
    }
    for (let i = 0; i < 150 && body().workReason !== "Tracking last-seen prey"; i++) step();
    assert.equal(body().workReason, "Tracking last-seen prey");
    const trail = structuredClone(body().huntTrail),
      lostAt = g.state.time,
      actualPoint = { x: prey().x, z: prey().z },
      pose = { x: body().x, z: body().z };
    assert.ok(trail.seenAt < g.state.time);
    assert.ok(Math.hypot(trail.x - actualPoint.x, trail.z - actualPoint.z) > 0.1);
    assert.ok(
      !decisions.at(-1).lineClear || !decisions.at(-1).visible,
      "actual current sight was lost at the unchanged AI decision; no visibility override",
    );
    const target = g.nearestWalk(body(), trail.x, trail.z);
    assert.deepEqual(
      { x: body().tx, z: body().tz },
      { x: target.x, z: target.z },
      "path target is the actually remembered point",
    );
    g.state.paused = true;
    const raw = encodeGame(g);
    g = decodeGame(raw);
    instrument();
    assert.deepEqual(body().huntTrail, trail);
    assert.deepEqual({ x: body().x, z: body().z }, pose);
    assert.equal(hash(g), terrain);
    for (let i = 0; i < 500; i++) {
      step();
      if (body().huntTrail?.seenAt > trail.seenAt) {
        reacquired = true;
        break;
      }
      if (body().node !== prey()) break;
    }
    assert.ok(
      reacquired || body().node !== prey(),
      "ordinary sight reacquisition or bounded trail conclusion",
    );
    const conclusionAt = g.state.time;
    g.soundRecall();
    for (let i = 0; i < 1800 && body().recalled; i++) step();
    assert.equal(body().recalled, undefined);
    assert.ok(prey().hp > 0, "this was a tracking/recall encounter, no kill is claimed");
    assert.equal(g.state.simulationEvents?.totals["food_received:0:food"] || 0, 0);
    assert.equal(g.tribe(0).items.rawMeat || 0, 0);
    assert.equal(hash(g), terrain);
    assert.doesNotThrow(() => decodeGame(encodeGame(g)));
    const report = {
      scope:
        "Connected natural tracking, saved dated observation, ordinary reacquisition/conclusion and physical recall; separate food case provides edible catch",
      seed: 1,
      worldgenVersion: 14,
      layout: "pangaea",
      initial: {
        people: ids.length,
        food: 60,
        wood: 40,
        stone: 20,
        water: 100,
        expeditionPose: start,
        authoredMovingDeer: animalStart,
      },
      terrainSha256: terrain,
      terrainUnchanged: true,
      actualHunterId: hunterId,
      actualAnimalId: preyId,
      trackingObserved: true,
      trackingSeconds,
      decisionObservations: decisions,
      lostAt,
      lastSeen: trail,
      hiddenActualPoint: actualPoint,
      reacquired,
      conclusionAt,
      physicalReturnAt: g.state.time,
      foodProduced: 0,
      foodConsumed: g.state.simulationEvents?.totals["food_consumed:0:food"],
      waterConsumed: g.tribe(0).survival.waterConsumedLiters,
      allOriginalPeopleSurvive: true,
      limits: [
        "Explicit initial expedition pose and deer endowment; no midrun geometry/body/animal/visibility correction.",
        "No food or kill claimed for this recalled encounter.",
      ],
    };
    if (process.env.HEARTHWILD_TRACKING_REPORT)
      writeFileSync(process.env.HEARTHWILD_TRACKING_REPORT, JSON.stringify(report, null, 2) + "\n");
  } finally {
    Math.random = oldRandom;
  }
});
