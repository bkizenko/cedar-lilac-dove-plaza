import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { buildingCost } from "../src/game/construction.ts";
import { supplyDrops, supplyApproach, supplyReached } from "../src/game/campAnchor.ts";
import { supplyAccounting } from "../src/game/simulationEvents.ts";
import { Game } from "../src/game/sim.ts";
import { encodeGame, decodeGame, validateGameSave } from "../src/game/persistence.ts";

const reports = [];
const terrain = (g) =>
  createHash("sha256")
    .update(Buffer.from(g.world.heights.buffer))
    .update(g.world.waterHeights ? Buffer.from(g.world.waterHeights.buffer) : "")
    .update(
      JSON.stringify({
        waterY: g.world.waterY,
        baseWaterY: g.world.baseWaterY,
        waterBodies: g.world.waterBodies,
        rivers: g.world.rivers,
        features: g.world.features,
        camps: g.world.camps,
      }),
    )
    .digest("hex");
function fixture(seed, team) {
  const g = new Game();
  g.reset(seed, 14, { size: 1040, layout: "pangaea" });
  g.enterIsland();
  const original = g.state.units.filter((u) => u.team === team && u.type === "worker").slice(0, 5),
    player = g.state.units.filter((u) => u.team === 0);
  assert.equal(original.length, 5);
  g.state.units = [...player, ...original];
  for (const u of g.state.units) {
    u.order = "hold";
    u.jobLock = u.team === 0;
  }
  assert.equal(g.state.buildings.filter((b) => b.team === team).length, 0);
  g.state.autoWorkEnabled = false;
  g.state.conflict = "quiet";
  g.state.weather = "clear";
  g.state.weatherT = 10000;
  g.state.raidT = 10000;
  g.state.visitorTimer = 900;
  g.state.scoutTimer = 900;
  g.state.birthT = 10000;
  g.calamityT = 10000;
  for (const t of g.state.tribes) {
    t.thinkT = 100000;
    t.survival.waterLiters = 100;
  }
  Object.assign(g.tribe(0), { food: 500, foodLots: { provisions: 500 } });
  Object.assign(g.tribe(team), {
    food: 35,
    foodLots: { provisions: 35 },
    wood: 32,
    stone: 12,
    seeds: 0,
    items: { rawMeat: 32 },
    hostile: false,
    ally: false,
    aggro: 0,
    trust: 0.5,
    thinkT: 0,
  });
  validateGameSave(encodeGame(g));
  return {
    g,
    firstHallCost: buildingCost("townhall", g, team).wood,
    ids: original.map((u) => u.id),
    hash: terrain(g),
    positions: original.map((u) => ({ id: u.id, x: u.x, y: u.y, z: u.z })),
    camp: { ...g.campOf(team) },
  };
}
function advance(g, seconds, done, ledger) {
  for (let i = 0; i < seconds * 10 && !done(); i++) {
    const parcels = g.state.units
      .filter((u) => u.team === ledger.team && u.rawHuntMeat && u.carry > 0)
      .map((u) => ({
        id: u.id,
        amount: u.carry,
        x: u.x,
        z: u.z,
        atSupplyBefore: supplyDrops(g, u.team).some((d) => {
          const p = supplyApproach(g, u, d);
          return p && supplyReached(g, u, d, p);
        }),
      }));
    g.state.paused = false;
    g.step(0.1);
    for (const parcel of parcels) {
      const u = g.state.units.find((u) => u.id === parcel.id);
      if (u && u.hp > 0 && !u.rawHuntMeat && u.carry === 0) {
        assert.ok(
          parcel.atSupplyBefore ||
            supplyDrops(g, u.team).some((d) => {
              const p = supplyApproach(g, u, d);
              return p && supplyReached(g, u, d, p);
            }),
          JSON.stringify({ parcel, u: { x: u.x, z: u.z }, camp: g.campOf(u.team) }),
        );
        ledger.rawDeliveries.push({ ...parcel, arrivalX: u.x, arrivalZ: u.z, time: g.state.time });
      }
    }
    assert.ok(!g.state.ended);
    assert.deepEqual(g.simulationErrors, []);
  }
}
function diagnostics(g, team) {
  return {
    time: g.state.time,
    camp: g.campOf(team),
    stock: g.tribe(team),
    buildings: g.state.buildings.filter((b) => b.team === team),
    projects: g.state.production?.projects,
    workers: g.state.units
      .filter((u) => u.team === team)
      .map((u) => ({
        id: u.id,
        x: u.x,
        z: u.z,
        order: u.order,
        job: u.job,
        lock: u.jobLock,
        node: u.node?.id,
        reason: u.workReason,
        project: u.productionProjectId,
        resting: u.resting,
      })),
  };
}
for (const [seed, team] of [
  [345, 1],
  [345, 2],
  [917, 1],
])
  test(`native V14 seed ${seed} society ${team} physically funds and builds hearth, cooks and delivers across two strict saves`, () => {
    const originalRandom = Math.random,
      rngSeed = (Math.imul(seed, 2654435761) ^ team) >>> 0;
    let rngState = rngSeed,
      rngDraws = 0;
    Math.random = () => {
      rngDraws++;
      rngState = (Math.imul(rngState, 1664525) + 1013904223) >>> 0;
      return rngState / 4294967296;
    };
    try {
      let { g, firstHallCost, ids, hash, positions, camp } = fixture(seed, team);
      const ledger = { team, rawDeliveries: [] };
      advance(
        g,
        160,
        () =>
          g.state.buildings.some(
            (b) => b.team === team && b.type === "hearth" && b.build > 0 && b.build < 1,
          ),
        ledger,
      );
      let hearth = g.state.buildings.find((b) => b.team === team && b.type === "hearth");
      assert.ok(
        hearth && hearth.build > 0 && hearth.build < 1,
        JSON.stringify(diagnostics(g, team)),
      );
      const foundation = {
        id: hearth.id,
        x: hearth.x,
        y: hearth.y,
        z: hearth.z,
        build: hearth.build,
        time: g.state.time,
      };
      assert.equal(g.tribe(team).wood, 28);
      assert.equal(g.tribe(team).stone, 8);
      g = decodeGame(encodeGame(g));
      assert.equal(terrain(g), hash);
      hearth = g.state.buildings.find((b) => b.id === foundation.id);
      assert.equal(hearth.build, foundation.build);
      advance(
        g,
        220,
        () =>
          g.state.production?.projects.some(
            (p) =>
              p.team === team && p.recipe === "cookMeat" && p.phase === "working" && p.progress > 1,
          ),
        ledger,
      );
      const paid = g.state.production?.projects.find(
        (p) => p.team === team && p.recipe === "cookMeat" && p.phase === "working",
      );
      assert.ok(paid, JSON.stringify(diagnostics(g, team)));
      const batch = {
        id: paid.id,
        actorId: paid.actorId,
        phase: paid.phase,
        progress: paid.progress,
        time: g.state.time,
        wood: g.tribe(team).wood,
        raw: g.tribe(team).items.rawMeat,
      };
      g = decodeGame(encodeGame(g));
      assert.equal(terrain(g), hash);
      assert.equal(
        g.state.production.projects.find((p) => p.id === batch.id).progress,
        batch.progress,
      );
      assert.equal(g.tribe(team).wood, batch.wood);
      assert.equal(g.tribe(team).items.rawMeat, batch.raw);
      advance(
        g,
        300,
        () =>
          g.state.production.projects.filter(
            (p) => p.team === team && p.recipe === "cookMeat" && p.phase === "complete",
          ).length >= 5,
        ledger,
      );
      const completed = g.state.production.projects.filter(
        (p) => p.team === team && p.recipe === "cookMeat" && p.phase === "complete",
      );
      assert.ok(completed.length >= 5, JSON.stringify(diagnostics(g, team)));
      assert.ok(ids.every((id) => g.state.units.some((u) => u.id === id && u.hp > 0)));
      assert.equal(
        g.state.buildings.filter((b) => b.team === team && b.type === "hearth").length,
        1,
      );
      assert.equal(g.state.production.metrics.logsUsed, completed.length);
      assert.equal(g.state.production.metrics.edibleFoodProduced, completed.length * 4);
      assert.ok(g.state.production.projects.every((p) => p.team === team));
      assert.ok(g.state.tribes.filter((t) => t.id !== team).every((t) => !(t.items?.rawMeat > 0)));
      const raw = g.tribe(team).items.rawMeat,
        consumed = g.state.production.metrics.consumed.rawMeat,
        spoiled = g.state.production.metrics.spoiled.rawMeat;
      const physicallyDeliveredRaw = ledger.rawDeliveries.reduce((n, p) => n + p.amount, 0);
      assert.ok(
        Math.abs(raw + consumed + spoiled - 32 - physicallyDeliveredRaw) < 1e-6,
        JSON.stringify({ raw, consumed, spoiled, physicallyDeliveredRaw }),
      );
      const accounting = supplyAccounting(g, team),
        survival = g.tribe(team).survival,
        structures = g.state.buildings.filter((b) => b.team === team),
        paidCosts = structures.reduce(
          (sum, b) => {
            const c = buildingCost(b.type, g, team);
            if (b.type === "townhall") c.wood = firstHallCost;
            sum.wood += c.wood || 0;
            sum.stone += c.stone || 0;
            return sum;
          },
          { wood: 0, stone: 0 },
        );
      assert.ok(
        Math.abs(
          g.tribe(team).wood -
            (32 +
              accounting.cargoDelivered.wood -
              paidCosts.wood -
              completed.length -
              survival.fuelBurnedWood),
        ) < 1e-6,
        JSON.stringify({
          wood: g.tribe(team).wood,
          accounting,
          paidCosts,
          structures,
          production: g.state.production.metrics,
        }),
      );
      assert.ok(
        Math.abs(g.tribe(team).stone - (12 + accounting.cargoDelivered.stone - paidCosts.stone)) <
          1e-6,
      );
      assert.ok(
        Math.abs(
          g.tribe(team).food -
            (35 + accounting.foodReceived - accounting.foodConsumed - accounting.foodSpoiled),
        ) < 1e-6,
      );
      assert.ok(
        Math.abs(
          survival.waterLiters -
            (100 +
              survival.waterDeliveredLiters -
              survival.waterConsumedLiters -
              survival.waterLostLiters -
              g.state.production.metrics.waterUsedLiters),
        ) < 1e-6,
      );
      assert.equal(terrain(g), hash);
      assert.doesNotThrow(() => decodeGame(encodeGame(g)));
      assert.ok(structures.filter((b) => b.type === "townhall").length <= 1);
      reports.push({
        seed,
        externalRng: { seed: rngSeed, draws: rngDraws, end: rngState },
        worldgenVersion: 14,
        layout: "pangaea",
        size: 1040,
        team,
        camp,
        positions,
        initial: {
          food: 35,
          rawMeat: 32,
          wood: 32,
          stone: 12,
          water: 100,
          people: 5,
          buildings: 0,
        },
        terrainSha256: hash,
        foundation,
        batch,
        final: {
          time: g.state.time,
          batches: completed.length,
          cookedFoodReceived: completed.length * 4,
          accounting,
          paidCosts,
          structures: structures.map((b) => ({
            id: b.id,
            type: b.type,
            x: b.x,
            y: b.y,
            z: b.z,
            build: b.build,
          })),
          survival,
          food: g.tribe(team).food,
          rawMeat: raw,
          rawConsumed: consumed,
          rawSpoiled: spoiled,
          physicallyDeliveredRaw,
          rawDeliveries: ledger.rawDeliveries,
          logsUsed: g.state.production.metrics.logsUsed,
          wood: g.tribe(team).wood,
          stone: g.tribe(team).stone,
          water: g.tribe(team).survival.waterLiters,
          livingOriginalPeople: ids.length,
        },
      });
      if (process.env.NATIVE_RIVAL_FOOD_REPORT)
        writeFileSync(
          process.env.NATIVE_RIVAL_FOOD_REPORT,
          JSON.stringify(reports, null, 2) + "\n",
        );
    } finally {
      Math.random = originalRandom;
    }
  });
