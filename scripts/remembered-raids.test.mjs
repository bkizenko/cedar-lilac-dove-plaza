import { writeFileSync } from "node:fs";
import test from "node:test";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";
import { dispatchPairRaid } from "../src/game/rivalActivity.ts";
import { endowSettlementSites } from "./helpers/endowed-settlement-sites.mjs";
import assert from "node:assert/strict";
import { Game } from "../src/game/sim.ts";
import { initializeSurvival } from "../src/game/survivalNeeds.ts";
import { scoutKnowledge } from "../src/game/scouting.ts";
import { assessRivalPairRaid } from "../src/game/rivalActivity.ts";
test("paid unseen warehouse and defenses require actual observer return; departed saved party discovers real destruction only on arrival", () => {
  let g = new Game();
  g.reset(345, 2);
  g.enterIsland();
  g.state.time = 800;
  g.world.heights.fill(4);
  g.world.rivers = [];
  g.world.features = [];
  g.world.waterBodies = [];
  g.world.waterHeights = undefined;
  g.world.ecology = undefined;
  g.state.units = [];
  g.state.buildings = [];
  for (const k of ["trees", "stones", "forage", "copper", "iron", "fish", "wildlife"])
    g.state[k] = [];
  for (const [team, x, z] of [
    [0, -200, 80],
    [1, 0, 0],
    [2, 140, 0],
  ]) {
    g.state.buildings.push(g.makeBld("townhall", x, z, team));
    for (let i = 0; i < (team === 1 ? 12 : team === 2 ? 6 : 1); i++) {
      const u = g.spawnUnit(
        team === 1 && i < 6 ? "spearman" : "worker",
        x + 8 + (i % 3),
        z + 8 + Math.floor(i / 3),
        team,
      );
      u.order = "hold";
    }
    Object.assign(g.tribe(team), {
      food: 1000,
      foodLots: { provisions: 1000 },
      wood: 300,
      stone: 100,
      hostile: false,
      ally: false,
      aggro: team === 1 ? 1 : 0,
      trust: 0,
      tension: 0,
      thinkT: 100000,
    });
  }
  for (let i = 0; i < 6; i++) {
    const u = g.spawnUnit("spearman", 130 + i * 2, 35, 0);
    u.order = "hold";
    u.jobLock = true;
  }
  initializeSurvival(g);
  for (const t of g.state.tribes) t.survival.waterLiters = 200;
  endowSettlementSites(g, 1, 2);
  g.state.rivalKnowledge = [];
  scoutKnowledge(g, { team: 1, x: 140, z: 0 });
  scoutKnowledge(g, { team: 1, x: 110, z: 35 });
  g.state.rivalActivityNextReview = g.state.tribes
    .filter((t) => t.id !== 0 && t.id !== 3)
    .map((t) => ({ team: t.id, timeSeconds: 100000 }));
  g.state.autoWorkEnabled = false;
  g.state.birthT = 100000;
  g.state.weather = "clear";
  g.state.weatherT = 100000;
  g.state.raidT = 100000;
  g.state.visitorTimer = 900;
  g.state.scoutTimer = 900;
  g.state.conflict = "dangerous";
  g.calamityT = 100000;
  g.seaT = 100000;
  g.rebuildWalk();
  g.vision.fill(2);
  const before = assessRivalPairRaid(g, 1, 1000, 2),
    wood = g.tribe(2).wood;
  assert.equal(before.plan, null);
  assert.equal(g.placeBuilding("warehouse", 110, 35, 2), true, g.state.banner);
  const store = g.state.buildings.find((b) => b.type === "warehouse"),
    builder = g.state.units.find((u) => u.team === 2);
  Object.assign(builder, { order: "build", node: store });
  const paid = wood - g.tribe(2).wood;
  let witnessed = false,
    walked = 0;
  for (let i = 0; i < 4000 && !g.finished(store); i++) {
    const x = builder.x,
      z = builder.z;
    g.state.paused = false;
    g.step(0.1);
    walked += Math.hypot(builder.x - x, builder.z - z);
    witnessed ||= g.state.units.some(
      (u) => u.team === 1 && u.hp > 0 && Math.hypot(u.x - store.x, u.z - store.z) <= 26,
    );
  }
  assert.ok(g.finished(store));
  assert.equal(witnessed, false);
  assert.deepEqual(g.simulationErrors, []);
  const after = assessRivalPairRaid(g, 1, 1000, 2);

  assert.equal(after.plan, null, "old empty geography cannot reveal new paid structure");
  function advance(seconds) {
    for (let i = 0; i < seconds * 10; i++) {
      g.state.paused = false;
      g.step(0.1);
    }
    assert.deepEqual(g.simulationErrors, []);
  }
  function walk(id, x, z) {
    const u = g.state.units.find((p) => p.id === id);
    Object.assign(u, {
      order: "move",
      tx: x,
      tz: z,
      stationOnArrival: true,
      node: null,
      target: null,
      jobLock: true,
    });
    for (let i = 0; i < 2400 && Math.hypot(u.x - x, u.z - z) > 1.5; i++) advance(0.1);
    assert.ok(Math.hypot(u.x - x, u.z - z) < 1.5, `walker ${u.x},${u.z}`);
    advance(2.1);
  }
  const observer = g.state.units.find((u) => u.team === 1 && u.type === "worker"),
    observerId = observer.id;
  walk(observerId, 86, 35);
  assert.ok(observer.structureReportCargo.some((p) => p.site.id === store.id));
  assert.equal(assessRivalPairRaid(g, 1, 1000, 2).plan, null, "body still abroad");
  const home = g.state.buildings.find((b) => b.team === 1 && b.type === "townhall"),
    spot = g.interactionSpot(observer, home);
  walk(observerId, spot.x, spot.z);
  const reported = assessRivalPairRaid(g, 1, 1000, 2);
  assert.ok(reported.plan);
  assert.equal(reported.plan.target.id, store.id);
  assert.notEqual(reported.plan.target, store, "dated inert planning object");
  const fixedMetrics = structuredClone(reported.plan.metrics);
  const enemy = g.state.units.find((u) => u.team === 2 && u !== builder);
  walk(enemy.id, 108, 55);
  assert.deepEqual(
    assessRivalPairRaid(g, 1, 1000, 2).plan.metrics,
    fixedMetrics,
    "unseen changed defense cannot update returned report",
  );
  const departure = dispatchPairRaid(g, 1, 1000, 2);
  assert.equal(departure.accepted, true, departure.reason);
  const missionId = departure.missionId;
  let mission = g.state.rivalMissions.find((m) => m.id === missionId);
  assert.ok(mission.targetSite);
  assert.ok(
    mission.actors.every((a) => g.state.units.find((u) => u.id === a.id).target === null),
    "no live remote pointer",
  );
  const legacy = JSON.parse(JSON.stringify(encodeGame(g)));
  delete legacy.state.rivalMissions.find((m) => m.id === missionId).targetSite;
  g = decodeGame(legacy);
  g.world.heights.fill(4);
  g.world.rivers = [];
  g.world.waterBodies = [];
  g.world.waterHeights = undefined;
  g.world.ecology = undefined;
  g.rebuildWalk();
  mission = g.state.rivalMissions.find((m) => m.id === missionId);
  advance(0.1);
  assert.ok(
    mission.targetSite,
    "legacy paid destination recovered from serialized actual attack orders",
  );
  assert.equal(mission.targetSite.x, store.x);
  assert.equal(mission.targetSite.z, store.z);
  const actual = g.state.buildings.find((b) => b.id === store.id);
  g.clearSelect();
  for (const u of g.state.units.filter((u) => u.team === 0 && u.type === "spearman"))
    g.selectEntity(u, true);
  g.vision.fill(2);
  g.issueAttack(actual);
  let destroyedFar = false;
  for (let i = 0; i < 1200 && actual.hp > 0; i++) {
    advance(0.1);
    if (actual.hp <= 0) {
      destroyedFar = mission.actors.every((a) => {
        const u = g.state.units.find((u) => u.id === a.id);
        return !u || Math.hypot(u.x - mission.targetSite.x, u.z - mission.targetSite.z) > 26;
      });
    }
  }
  assert.ok(actual.hp <= 0, "actual local attacking people destroyed the paid warehouse");
  assert.ok(destroyedFar, "raid party still outside observation at real destruction");
  assert.equal(mission.phase, "outbound", "unseen destruction did not cancel journey");
  advance(0.2);
  assert.equal(mission.phase, "outbound");
  for (let i = 0; i < 2400 && mission.phase !== "returning" && mission.phase !== "completed"; i++)
    advance(0.1);
  assert.ok(["returning", "completed"].includes(mission.phase));
  assert.ok(
    mission.actors.some((a) => {
      const u = g.state.units.find((u) => u.id === a.id);
      return u && Math.hypot(u.x - actual.x, u.z - actual.z) <= 28;
    }),
    "party actually approached remembered site before learning absence",
  );
  if (process.env.RAID_MEMORY_REPORT)
    writeFileSync(
      process.env.RAID_MEMORY_REPORT,
      JSON.stringify(
        {
          scope:
            "Controlled connected causal report and raid scenario; not full M2-07 qualification",
          paidLogs: paid,
          realBuilderWalked: walked,
          unknownNewWarehouseIgnored: true,
          reportPublishedOnlyAfterActualReturn: true,
          unseenChangedDefensesDidNotChangeUtility: true,
          legacySavedAttackOrderEndpointResumed: true,
          initialPlayerDestructionSpearmen: 6,
          actualBuildingDestroyedOutsideRaidSight: destroyedFar,
          offscreenDestructionKeptPartyOutbound: true,
          partyLearnedAbsenceOnActualArrival: true,
        },
        null,
        2,
      ) + "\n",
    );
  const raw = JSON.parse(JSON.stringify(encodeGame(g)));
  raw.state.rivalMissions.find((m) => m.id === missionId).targetSite.x = 100000;
  assert.throws(() => decodeGame(raw));
});
