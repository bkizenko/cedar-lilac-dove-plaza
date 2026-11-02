import {endowSettlementSites} from './helpers/endowed-settlement-sites.mjs';
import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { initializeSurvival } from "../src/game/survivalNeeds.ts";
import { Game } from "../src/game/sim.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";
import { dispatchRivalBarter } from "../src/game/rivalTrade.ts";
import { scoutKnowledge } from "../src/game/scouting.ts";
import {
  partnerTradeIntel,
  tradeIntelAdvice,
  knownRivalExportDemand,
  TRADE_INTEL_RULES,
} from "../src/game/tradeIntel.ts";
import { sendDelegation } from "../src/game/delegations.ts";
import { reportedQuote } from "../src/game/barter.ts";
const results = [];
function ground(g) {
  g.world.heights.fill(4);
  g.world.rivers = [];
  g.world.features = [];
  g.world.waterBodies = [];
  g.world.waterHeights = undefined;
  g.world.ecology = undefined;
  g.world.biomes = [{ kind: "plains", x: 0, z: 0 }];
  g.rebuildWalk();
  g.vision.fill(2);
}
function fixture() {
  const g = new Game();
  g.reset(345, 2);
  g.enterIsland();
  g.state.units = [];
  g.state.buildings = [];
  g.state.autoWorkEnabled = false;
  g.state.growthPolicy = "stable";
  g.state.birthT = 100000;
  g.state.weather = "clear";
  g.state.weatherT = 100000;
  g.state.raidT = 100000;
  g.state.visitorTimer = 900;
  g.state.scoutTimer = 900;
  g.state.conflict = "quiet";
  g.calamityT = 100000;
  g.seaT = 100000;
  for (const k of ["trees", "forage", "stones", "copper", "iron", "fish", "wildlife"])
    g.state[k] = [];
  ground(g);
  for (const [team, x, z] of [
    [0, -180, 80],
    [1, 0, 0],
    [2, 90, 0],
  ]) {
    g.state.buildings.push(g.makeBld("townhall", x, z, team));
    for (let i = 0; i < (team ? 6 : 3); i++) {
      const u = g.spawnUnit("worker", x + 8 + i, z + 10, team);
      u.order = "idle";
      u.jobLock = false;
    }
    const t = g.tribe(team);
    Object.assign(t, {
      food: 1600,
      foodLots: { provisions: 1600 },
      wood: team === 1 ? 0 : 200,
      stone: team === 1 ? 160 : 0,
      age: 0,
      hostile: false,
      alive: true,
      trust: 0.7,
      tension: 0,
      thinkT: 100000,
    });
  }
  for (const t of g.state.tribes) t.thinkT = 100000;
  initializeSurvival(g);
  for (const team of [0, 1, 2]) g.tribe(team).survival.waterLiters = 200;
  g.rebuildWalk();
  endowSettlementSites(g,0,1);endowSettlementSites(g,1,2);return g;
}
function drive(g, seconds, until = () => false, check = () => {}) {
  const end = g.state.time + seconds;
  while (g.state.time < end && !until()) {
    g.state.paused = false;
    const before = g.state.time;
    g.step(0.1);
    assert.ok(g.state.time > before);
    assert.deepEqual(g.simulationErrors, []);
    check();
  }
}
function restore(g) {
  const raw = encodeGame(g),
    copy = decodeGame(JSON.parse(JSON.stringify(raw)));
  ground(copy);
  return copy;
}
test("NPC ordinary roundtrip keeps a dated report on its body through saved transit, unaffected by later unseen changes", () => {
  let g = fixture();
  scoutKnowledge(g, { team: 1, x: 90, z: 0 });
  assert.equal(partnerTradeIntel(g, 1, 2), null);
  assert.equal(tradeIntelAdvice(g, 1, 2, "stone", "wood").status, "unknown");
  assert.equal(knownRivalExportDemand(g, 1, "stone"), 0);
  const stoneBefore = g.tribe(1).stone;
  assert.equal(dispatchRivalBarter(g, 1), true);
  let u = g.state.units.find((u) => u.team === 1 && u.visit);
  assert.ok(u);
  const id = u.id,
    start = { x: u.x, z: u.z };
  assert.equal(g.tribe(1).stone, stoneBefore - 32);
  assert.equal(u.tradeIntelCargo, undefined);
  drive(
    g,
    100,
    () => !!u.tradeIntelCargo?.length,
    () => assert.equal(partnerTradeIntel(g, 1, 2), null),
  );
  assert.ok(u.tradeIntelCargo?.length);
  assert.equal(u.visit.phase, "return");
  assert.ok(Math.hypot(u.x - start.x, u.z - start.z) > 50);
  const carried = structuredClone(u.tradeIntelCargo[0]),
    meeting = { x: u.x, z: u.z, time: g.state.time },
    cargo = { kind: u.carryType, amount: u.carry };
  assert.equal(carried.quote.accepted, true);
  assert.equal(carried.goods.find((k) => k.kind === "stone").need, "needs");
  assert.equal(partnerTradeIntel(g, 1, 2), null);
  drive(g, 3);
  assert.ok(Math.hypot(u.x, u.z) > 20);
  assert.deepEqual(u.tradeIntelCargo[0], carried);
  g.tribe(2).wood = 0;
  g.tribe(2).stone = 900;
  const remote = g.makeBld("hut", 250, 200, 2);
  g.state.buildings.push(remote);
  g.state.walkDirty = true;
  drive(g, 1);
  assert.deepEqual(
    u.tradeIntelCargo[0],
    carried,
    "Distant stock/building changes cannot edit a witnessed report",
  );
  assert.equal(tradeIntelAdvice(g, 1, 2, "stone", "wood").status, "unknown");
  const x = u.x,
    z = u.z;
  g = restore(g);
  u = g.state.units.find((v) => v.id === id);
  assert.equal(u.x, x);
  assert.equal(u.z, z);
  assert.deepEqual(u.tradeIntelCargo, [carried]);
  assert.deepEqual({ kind: u.carryType, amount: u.carry }, cargo);
  assert.equal(partnerTradeIntel(g, 1, 2), null);
  let arrived = false;
  drive(
    g,
    100,
    () => !u.visit,
    () => {
      if (u.tradeIntelCargo?.length) assert.equal(partnerTradeIntel(g, 1, 2), null);
      else arrived = true;
    },
  );
  assert.equal(u.visit, undefined);
  assert.equal(arrived, true);
  const info = partnerTradeIntel(g, 1, 2);
  assert.ok(info);
  assert.equal(info.report.observedAt, meeting.time);
  assert.ok(info.report.receivedAt > info.report.observedAt);
  assert.deepEqual(info.report.goods, carried.goods);
  assert.equal(info.report.goods.find((k) => k.kind === "stone").need, "needs");
  assert.equal(info.report.goods.find((k) => k.kind === "wood").canOffer, true);
  assert.equal(g.tribe(2).wood, 0);
  assert.ok(g.tribe(2).stone >= 900);
  assert.ok(info.ageSeconds > 0);
  assert.equal(g.state.tradeIntel.metrics.returned, 1);
  assert.equal(u.tradeIntelCargo, undefined);
  assert.equal(g.tribe(1).wood, cargo.amount);
  assert.ok(
    Math.hypot(u.x, u.z) <= Math.max(g.state.buildings[1].w, g.state.buildings[1].d) * 0.55 + 3,
  );
  results.push({
    case: "npc-carried-report",
    carrier: id,
    meeting,
    arrival: { x: u.x, z: u.z, time: g.state.time },
    goods: info.report.goods,
    unseenChanges: { wood: 0, stone: 900, newUnseenHut: remote.id },
    savedInTransit: true,
    cargoDelivered: cargo,
  });
});
test("player learns only witnessed meeting estimates; later unseen stocks and buildings leave them unchanged", () => {
  let g = fixture();
  g.state.buildings.find((b) => b.team === 0).x = 0;
  g.state.buildings.find((b) => b.team === 0).z = 80;
  for (const u of g.state.units.filter((u) => u.team === 0)) {
    u.x = 8;
    u.z = 90;
    u.y = 4;
    u.order = "hold";
  }
  g.state.buildings.find((b) => b.team === 1).x = 110;
  g.state.buildings.find((b) => b.team === 1).z = 80;
  for (const u of g.state.units.filter((u) => u.team === 1)) {
    u.x = 118 + (u.id % 4);
    u.z = 90;
    u.y = 4;
    u.order = "hold";
  }
  Object.assign(g.tribe(1), {
    food: 900,
    foodLots: { provisions: 900 },
    wood: 200,
    stone: 160,
    trust: 0.7,
  });
  g.rebuildWalk();
  const u = g.state.units.find((u) => u.team === 0),
    id = u.id;
  endowSettlementSites(g,0,1); // Initial site was authored above before this scenario starts.
  assert.equal(reportedQuote(g, 1, "wood", "stone", 20).deal, null);
  assert.equal(sendDelegation(g, 1, "trade", u), true);
  drive(
    g,
    140,
    () => !!g.state.tradeReports?.length,
    () => {
      if (u.envoy?.phase === "outbound" && u.envoy.talk < 20)
        assert.equal(g.state.tradeReports?.length || 0, 0);
    },
  );
  assert.ok(g.state.tradeReports?.length);
  assert.equal(u.envoy.phase, "return");
  const report = structuredClone(g.state.tradeReports[0]);
  assert.equal(report.observation.buildings, 1);
  assert.ok(report.observation.populationLow < 6 && report.observation.populationHigh > 6);
  assert.equal(report.observation.stocks.wood, "plentiful");
  drive(g, 5);
  assert.ok(Math.hypot(u.x - 110, u.z - 80) > 15);
  g.tribe(1).wood = 0;
  g.tribe(1).stone = 999;
  g.state.buildings.push(g.makeBld("hut", 300, 300, 1));
  g.state.walkDirty = true;
  drive(g, 1);
  assert.deepEqual(g.state.tradeReports[0], report);
  const quoteBefore = reportedQuote(g, 1, "wood", "stone", 20);
  g = restore(g);
  const restored = g.state.units.find((v) => v.id === id);
  assert.deepEqual(restored.envoy.report, report);
  assert.deepEqual(g.state.tradeReports[0], report);
  assert.deepEqual(reportedQuote(g, 1, "wood", "stone", 20), quoteBefore);
  drive(g, 140, () => !restored.envoy);
  assert.equal(restored.envoy, undefined);
  assert.deepEqual(g.state.tradeReports[0], report);
  results.push({
    case: "player-witnessed-live-meeting",
    carrier: id,
    observationTime: report.time,
    unseenLaterStock: { wood: 0, stone: 999 },
    observation: report.observation,
    datedOffers: report.offers.length,
    savedOnReturn: true,
  });
  if (process.env.HEARTHWILD_INFORMATION_REPORT)
    writeFileSync(
      process.env.HEARTHWILD_INFORMATION_REPORT,
      JSON.stringify(
        {
          scope:
            "Controlled quiet two-NPC and player delegation routes; player local observations intentionally live, NPC private market report delivered home",
          results,
        },
        null,
        2,
      ) + "\n",
    );
});
