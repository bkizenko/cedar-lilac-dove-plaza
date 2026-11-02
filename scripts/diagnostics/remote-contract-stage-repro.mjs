import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {sendDelegation} from "../../src/game/delegations.ts";
import {knownSettlement,knownSettlementSite,sendOffer,recordTradeMeeting,reportedQuote} from "../../src/game/barter.ts";
import { Game } from "../../src/game/sim.ts";
import { scoutKnowledge } from "../../src/game/scouting.ts";
import { rivalKnows } from "../../src/game/rivalDevelopment.ts";
import { encodeGame, decodeGame } from "../../src/game/persistence.ts";
import {
  validObservedClaims,
  validObservedSettlements,
  frontierStatus,
} from "../../src/game/frontiers.ts";
const results = [];
function fixture() {
  const g = new Game();
  g.reset(345, 10);
  g.enterIsland();
  g.world.heights.fill(4);
  g.world.rivers = [];
  g.world.features = [];
  g.world.waterBodies = [];
  g.world.waterHeights = undefined;
  g.world.ecology = undefined;
  g.state.units = [];
  g.state.buildings = [
    g.makeBld("townhall", 220, 0, 0),
    g.makeBld("townhall", 0, 0, 1),
  ];
  for (const k of [
    "trees",
    "stones",
    "forage",
    "copper",
    "iron",
    "fish",
    "wildlife",
  ])
    g.state[k] = [];
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
  for (const t of g.state.tribes) {
    t.thinkT = 100000;
    t.survival.waterLiters = 200;
  }
  const builder = g.spawnUnit("worker", 210, 0, 0);
  builder.order = "hold";
  builder.jobLock = true;
  for (let i = 0; i < 6; i++) {
    const u = g.spawnUnit("worker", 8 + i, 10, 1);
    u.order = "hold";
    u.jobLock = true;
  }
  Object.assign(g.tribe(0), {
    food: 500,
    foodLots: { provisions: 500 },
    wood: 200,
    stone: 100,
  });
  Object.assign(g.tribe(1), {
    food: 500,
    foodLots: { provisions: 500 },
    alive: true,
    hostile: false,
    ally: false,
    recoveryUntil: 0,
    peaceTerm: undefined,
    compactUntil: 0,
    tension: 0,
    trust: 0.5,
    aggro: 0.5,
    expand: 0.5,
  });
  scoutKnowledge(g, { team: 1, x: 100, z: 0 });
  g.vision.fill(2);
  g.rebuildWalk();
  return { g, builder };
}

function step(g, seconds) {
  const until = g.state.time + seconds;
  while (g.state.time < until) {
    g.state.paused = false;
    g.step(0.1);
  }
  assert.deepEqual(g.simulationErrors, []);
}
function ground(g) {
  g.world.heights.fill(4);
  g.world.rivers = [];
  g.world.features = [];
  g.world.waterBodies = [];
  g.world.waterHeights = undefined;
  g.world.ecology = undefined;
  g.rebuildWalk();
  g.vision.fill(2);
}
function restored(g) {
  const raw = JSON.parse(JSON.stringify(encodeGame(g))),
    next = decodeGame(raw);
  ground(next);
  return next;
}
function walk(g, id, x, z) {
  const u = g.state.units.find((u) => u.id === id);
  if(u.team===0){g.clearSelect();g.selectEntity(u);g.issueMove(x,z);}
  else Object.assign(u, {
    order: "move",
    tx: x,
    tz: z,
    stationOnArrival: true,
    node: null,
    target: null,
  });
  let moved = 0;
  for (let i = 0; i < 2400 && Math.hypot(u.x - x, u.z - z) > 1.5; i++) {
    const last = { x: u.x, z: u.z };
    step(g, 0.1);
    moved += Math.hypot(u.x - last.x, u.z - last.z);
  }
  assert.ok(
    Math.hypot(u.x - x, u.z - z) < 1.5,
    `walker at ${u.x},${u.z} target ${x},${z}`,
  );
  return moved;
}
function paidPost(g, builder) {
  const wood = g.tribe(0).wood;
  assert.equal(g.placeBuilding("cornerstone", 100, 0), true, g.state.banner);
  const post = g.state.buildings.find((b) => b.type === "cornerstone");
  g.clearSelect();
  g.selectEntity(builder);
  g.orderConstruction(post);
  let walked = 0;
  for (let i = 0; i < 1200 && !g.finished(post); i++) {
    const x = builder.x,
      z = builder.z;
    step(g, 0.1);
    walked += Math.hypot(builder.x - x, builder.z - z);
  }
  assert.ok(g.finished(post));
  assert.ok(walked > 90);
  assert.equal(wood - g.tribe(0).wood, 70);
  return { post, walked };
}


const {g,builder}=fixture();Object.assign(g.tribe(1),{wood:40,stone:200,trust:.7,tradeCd:0});
const hall=g.state.buildings.find(b=>b.team===1&&b.type==='townhall'),entrance=g.interactionSpot(builder,hall);assert.ok(entrance);walk(g,builder.id,entrance.x,entrance.z);step(g,2.2);assert.ok(recordTradeMeeting(g,1,builder));walk(g,builder.id,220,18);step(g,2.2);
const report=structuredClone(g.state.tradeReports[0]),quote=reportedQuote(g,1,'wood','stone',20);assert.ok(quote.deal);
const output=[];
for(const consume of [false,true]){
 const copy=restored(g),u=copy.state.units.find(u=>u.id===builder.id);u.order='hold';
 if(consume)copy.spend(1,{stone:copy.tribe(1).stone}); // Explicit unobserved outside-world stock consumption.
 assert.deepEqual(copy.state.tradeReports[0],report);
 const before={sellerFreeStone:copy.tribe(1).stone,playerWood:copy.tribe(0).wood};
 const accepted=copy.dispatchTrade(u,quote.deal,1,true);
 output.push({unobservedStockConsumed:consume,accepted,before,after:{sellerFreeStone:copy.tribe(1).stone,playerWood:copy.tribe(0).wood,escrow:u.tradeReservation??null},playerPosition:{x:u.x,z:u.z},reportTime:report.time});
}
console.log(JSON.stringify({scope:'Repaired contract-stage regression: identical dated report dispatches an unescrowed proposal independent of later unobserved seller stock',physicalMeetingReport:report.time,quote:quote.deal,output,remoteStockPrerequisiteLeak:output[0].accepted!==output[1].accepted},null,2));
