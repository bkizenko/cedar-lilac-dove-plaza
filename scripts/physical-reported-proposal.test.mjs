import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {sendDelegation} from "../src/game/delegations.ts";
import {knownSettlement,knownSettlementSite,sendOffer,recordTradeMeeting,reportedQuote,proposeShipment} from "../src/game/barter.ts";
import { Game } from "../src/game/sim.ts";
import { scoutKnowledge } from "../src/game/scouting.ts";
import { rivalKnows } from "../src/game/rivalDevelopment.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";
import {
  validObservedClaims,
  validObservedSettlements,
  frontierStatus,
} from "../src/game/frontiers.ts";
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


test("identical dated home proposals ignore unseen seller stock; actual arrival accepts or returns the finite budget below its agreed minimum",()=>{
 const {g, builder}=fixture();Object.assign(g.tribe(1),{wood:40,stone:200,trust:.7,tradeCd:0});
 const hall=g.state.buildings.find(b=>b.team===1&&b.type==='townhall'),entrance=g.interactionSpot(builder,hall);assert.ok(entrance);
 walk(g,builder.id,entrance.x,entrance.z);step(g,2.2);assert.ok(recordTradeMeeting(g,1,builder));const home=g.state.buildings.find(b=>b.team===0&&b.type==='townhall'),homeEntrance=g.interactionSpot(builder,home);assert.ok(homeEntrance);walk(g,builder.id,homeEntrance.x,homeEntrance.z);step(g,2.2);assert.ok(g.buildingWorkReached(builder,home),'the real carrier loads the budget at its home cache');
 const report=structuredClone(g.state.tradeReports[0]),quote=reportedQuote(g,1,'wood','stone',20).deal;assert.ok(quote);
 assert.equal(g.state.units.some(u=>u.tradeReservation),false,'a dated report did not escrow a guarantee');
 const outcomes=[];
 for(const stock of [200,0,50]){
  let copy=restored(g),u=copy.state.units.find(u=>u.id===builder.id);u.order='hold';
  copy.spend(1,{stone:copy.tribe(1).stone-stock}); // Explicit unobserved consumption; no resource grant.
  assert.deepEqual(copy.state.tradeReports[0],report);
  const before={ourWood:copy.tribe(0).wood,ourStone:copy.tribe(0).stone,theirWood:copy.tribe(1).wood,theirStone:copy.tribe(1).stone,fuelBurned:[0,1].reduce((n,t)=>n+(copy.tribe(t).survival?.fuelBurnedWood||0),0)};
  assert.equal(proposeShipment(copy,1,'wood','stone',20),true);
  assert.equal(u.carry,quote.giveAmt);assert.deepEqual(u.procurement,{minimum:quote.getAmt});assert.equal(u.tradeReservation,undefined);
  assert.equal(copy.tribe(1).stone,stock,'home acceptance neither reads nor escrows their goods');
  assert.equal(copy.tribe(0).wood,before.ourWood-quote.giveAmt);
  const raw=JSON.parse(JSON.stringify(encodeGame(copy)));copy=decodeGame(raw);ground(copy);u=copy.state.units.find(p=>p.id===builder.id);
  let meters=0;for(let i=0;i<4000&&u.trade;i++){const x=u.x,z=u.z;step(copy,.1);meters+=Math.hypot(u.x-x,u.z-z);}
  assert.equal(u.trade,null);assert.equal(u.order,'return');assert.ok(Math.hypot(u.x-hall.x,u.z-hall.z)<26,'decision happens only at the physical meeting');assert.ok(meters>160);
  const meeting={kind:u.carryType,amount:u.carry};
  if(stock===200){assert.equal(meeting.kind,'stone');assert.ok(meeting.amount>=quote.getAmt);assert.equal(copy.tribe(1).stone+meeting.amount,stock);}
  else{assert.equal(meeting.kind,'wood');assert.equal(meeting.amount,quote.giveAmt);assert.equal(copy.tribe(1).stone,stock);}
  for(let i=0;i<4000&&u.carry;i++)step(copy,.1);
  assert.equal(u.carry,0,'same real carrier physically delivers purchased goods or returned budget');
  if(stock===200){assert.equal(copy.tribe(0).stone,before.ourStone+meeting.amount);assert.equal(copy.tribe(0).wood,before.ourWood-quote.giveAmt);}
  else{assert.equal(copy.tribe(0).wood,before.ourWood);assert.equal(copy.tribe(0).stone,before.ourStone);}
  assert.equal(copy.tribe(0).stone+copy.tribe(1).stone,before.ourStone+stock);
  const fuelBurned=[0,1].reduce((n,t)=>n+(copy.tribe(t).survival?.fuelBurnedWood||0),0)-before.fuelBurned;
  assert.ok(Math.abs(copy.tribe(0).wood+copy.tribe(1).wood+fuelBurned-before.ourWood-before.theirWood)<1e-7,'payment/budget wood is conserved, including measured fire fuel');
  outcomes.push({unseenSellerStock:stock,homeAccepted:true,minimum:quote.getAmt,paidBudget:quote.giveAmt,escrowAtDeparture:false,walkedToMeeting:meters,meeting,woodFuelConsumed:fuelBurned,physicallyHome:true});
 }
 results.push({scenario:'dated proposal home A/B and real local acceptance/refusal',quote,outcomes});
});
test.after(()=>{if(process.env.PROPOSAL_REPORT)writeFileSync(process.env.PROPOSAL_REPORT,JSON.stringify({scope:'New dated proposals do not remotely reserve; existing held guarantees tested separately',results},null,2));});
