import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {sendDelegation} from "../src/game/delegations.ts";
import {knownSettlement,knownSettlementSite,sendOffer} from "../src/game/barter.ts";
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

test("old terrain knowledge cannot reveal paid construction; a real walking observer creates a persistent dated claim", () => {
  let { g, builder } = fixture();
  const witnessId = g.state.units.find((u) => u.team === 1).id;
  const { post, walked } = paidPost(g, builder);
  step(g, 10);
  assert.equal(
    rivalKnows(g, 1, 100, 0),
    true,
    "historically surveyed terrain is intentionally endowed",
  );
  assert.equal(g.tribe(1).tension, 0);
  assert.equal(g.tribe(1).trust, 0.5);
  assert.equal(g.state.observedClaims, undefined);
  const witnessedWalk = walk(g, witnessId, 100, 12);
  step(g, 2.2);
  let fact = g.state.observedClaims.find(
    (m) => m.observer === 1 && m.postId === post.id,
  );
  assert.ok(fact.active);
  assert.equal(fact.witnessId, witnessId);
  assert.ok(g.tribe(1).tension > 0);
  const departureWalk = walk(g, witnessId, 8, 10);
  step(g, 2.2);
  fact = structuredClone(
    g.state.observedClaims.find(
      (m) => m.observer === 1 && m.postId === post.id,
    ),
  );
  const beforeSave = g.tribe(1).tension;
  g = restored(g);
  assert.deepEqual(
    g.state.observedClaims.find((m) => m.postId === post.id),
    fact,
  );
  // These are explicit opposing-world actions, not extra observations. The
  // source entity moves and nearby deposits change while the observer is away.
  const live = g.state.buildings.find((b) => b.id === post.id);
  live.x = 300;
  live.z = 100;
  g.rebuildWalk();
  g.state.trees.push({
    id: g.id(),
    kind: "tree",
    x: 101,
    z: 0,
    y: 4,
    amount: 900,
    maxAmt: 900,
    regenT: 0,
    scale: 1,
    rich: 1,
  });
  step(g, 4.4);
  assert.deepEqual(
    g.state.observedClaims.find((m) => m.postId === post.id),
    fact,
  );
  assert.ok(
    g.tribe(1).tension >= beforeSave,
    "known old claim remains a grievance",
  );
  g = restored(g);
  assert.deepEqual(
    g.state.observedClaims.find((m) => m.postId === post.id),
    fact,
  );
  const returnWalk = walk(g, witnessId, 100, 12);
  step(g, 2.2);
  const revised = g.state.observedClaims.find((m) => m.postId === post.id);
  assert.equal(revised.active, false);
  assert.equal(revised.x, 100);
  assert.equal(revised.z, 0);
  assert.ok(revised.observedAt > fact.observedAt);
  const tension = g.tribe(1).tension;
  step(g, 4.4);
  assert.ok(
    g.tribe(1).tension <= tension,
    "a witnessed empty old site ends this grievance",
  );
  assert.equal(
    g.state.observedClaims.some((m) => m.active && m.x === 300),
    false,
    "no following a remote moved structure",
  );
  results.push({
    scenario:
      "paid outpost / actual observer / stale memory / saved return / actual empty-site revisit",
    paidLogs: 70,
    builderWalked: walked,
    observerWalked: witnessedWalk + departureWalk + returnWalk,
    lastKnownBeforeRevisit: fact,
    afterRevisit: revised,
  });
});

test("unseen destruction and new construction do not edit remembered claim identity; reobservation does", () => {
  const { g, builder } = fixture(),
    { post } = paidPost(g, builder),
    id = g.state.units.find((u) => u.team === 1).id;
  walk(g, id, 100, 12);
  step(g, 2.2);
  walk(g, id, 8, 10);
  step(g, 2.2);
  const fact = structuredClone(g.state.observedClaims[0]);
  // Opponent destroys the old post and establishes another while unobserved.
  g.state.buildings = g.state.buildings.filter((b) => b.id !== post.id);
  const next = g.makeBld("cornerstone", 100, 0, 0);
  g.state.buildings.push(next);
  g.rebuildWalk();
  step(g, 4.4);
  assert.deepEqual(g.state.observedClaims, [fact]);
  walk(g, id, 100, 12);
  step(g, 2.2);
  assert.equal(
    g.state.observedClaims.find((m) => m.postId === post.id).active,
    false,
  );
  assert.equal(
    g.state.observedClaims.find((m) => m.postId === next.id).active,
    true,
  );
  results.push({
    scenario: "unseen destroyed and replacement post",
    oldId: post.id,
    replacementId: next.id,
    memories: g.state.observedClaims,
  });
});

test("strict save validation bounds observed claims without requiring historical witnesses/posts to remain alive", () => {
  const { g, builder } = fixture(),
    { post } = paidPost(g, builder),
    w = g.state.units.find((u) => u.team === 1);
  walk(g, w.id, 100, 12);
  step(g, 2.2);
  const raw = JSON.parse(JSON.stringify(encodeGame(g)));
  assert.ok(raw.state.observedClaims?.length);
  assert.doesNotThrow(() => decodeGame(raw));
  for (const mutate of [
    (s) => (s.observedClaims[0].observedAt = s.time + 1),
    (s) => (s.observedClaims[0].observer = 0),
    (s) => (s.observedClaims[0].owner = 2),
    (s) => (s.observedClaims[0].value = 1.01),
    (s) => (s.observedClaims[0].woodland = 3),
    (s) => (s.observedClaims[0].x = 100000),
    (s) => (s.observedClaims[0].cargo = 100),
    (s) => s.observedClaims.push(structuredClone(s.observedClaims[0])),
    (s) => (s.observedClaims[0].witnessId = s.nextId),
  ]) {
    const bad = structuredClone(raw);
    mutate(bad.state);
    assert.equal(validObservedClaims(bad.state), false);
    assert.throws(() => decodeGame(bad));
  }
  const legacy = structuredClone(raw);
  delete legacy.state.observedClaims;
  assert.doesNotThrow(() => decodeGame(legacy));
  const historical = structuredClone(raw);
  historical.state.units = historical.state.units.filter((u) => u.id !== w.id);
  historical.state.buildings = historical.state.buildings.filter(
    (b) => b.id !== post.id,
  );
  historical.state.selection = [];
  historical.state.selBld = null;
  assert.equal(validObservedClaims(historical.state), true);
  assert.doesNotThrow(() => decodeGame(historical));
  results.push({
    scenario: "strict validation",
    rejectedMutations: 9,
    legacySaveAccepted: true,
    removedWitnessAndPostAccepted: true,
  });
});

test("a dead body at a newly built claim cannot establish society knowledge", () => {
  const { g, builder } = fixture(),
    body = g.state.units.find((u) => u.team === 1);
  // Initial authored placement of a dead body is deliberately not a living
  // observer. The remaining five-person society stays at its distant home.
  Object.assign(body, { x: 100, z: 12, hp: 0 });
  paidPost(g, builder);
  step(g, 4.4);
  assert.equal(g.state.observedClaims, undefined);
  assert.equal(g.tribe(1).tension, 0);
  results.push({
    scenario: "dead body is not an observer",
    tension: g.tribe(1).tension,
  });
});

test("foreign settlement appraisals retain only physically witnessed dated sites across unseen new towns, movement and removal", () => {
  let { g, builder } = fixture();
  const { post } = paidPost(g, builder),
    builderId = builder.id;
  assert.equal(
    frontierStatus(g, post).nearRival,
    500,
    "old terrain is not current site knowledge",
  );
  const walkedToFirst = walk(g, builderId, 0, 18);
  step(g, 2.2);
  assert.equal(frontierStatus(g, post).nearRival, 100);
  const first = g.state.buildings.find(
      (b) => b.team === 1 && b.type === "townhall",
    ),
    firstId = first.id;
  walk(g, builderId, 220, 18);
  step(g, 2.2);
  const rememberedFirst = structuredClone(
    g.state.observedSettlements.find(
      (m) => m.observer === 0 && m.siteId === firstId,
    ),
  );
  // Explicit outside-world changes challenge whether hidden live state leaks.
  // They do not qualify paid enemy town construction or mobile buildings.
  const second = g.makeBld("townhall", 155, 0, 1),
    secondId = second.id;
  g.state.buildings.push(second);
  first.x = -250;
  g.rebuildWalk();
  step(g, 2.2);
  assert.equal(frontierStatus(g, post).nearRival, 100);
  assert.equal(
    g.state.observedSettlements.some(
      (m) => m.observer === 0 && m.siteId === secondId,
    ),
    false,
  );
  assert.deepEqual(
    g.state.observedSettlements.find(
      (m) => m.observer === 0 && m.siteId === firstId,
    ),
    rememberedFirst,
  );
  g = restored(g);
  let localPost = g.state.buildings.find((b) => b.id === post.id);
  assert.equal(frontierStatus(g, localPost).nearRival, 100);
  walk(g, builderId, 155, 18);
  step(g, 2.2);
  assert.equal(
    frontierStatus(g, localPost).nearRival,
    55,
    "physical local observation adds the second town",
  );
  const observedSecond = structuredClone(
    g.state.observedSettlements.find(
      (m) => m.observer === 0 && m.siteId === secondId,
    ),
  );
  walk(g, builderId, 220, 18);
  step(g, 2.2);
  const beforeRemoval = structuredClone(
    g.state.observedSettlements.find(
      (m) => m.observer === 0 && m.siteId === secondId,
    ),
  );
  g.state.buildings = g.state.buildings.filter((b) => b.id !== secondId);
  g.rebuildWalk();
  step(g, 2.2);
  assert.equal(
    frontierStatus(g, localPost).nearRival,
    55,
    "unseen removal does not silently update memory",
  );
  assert.deepEqual(
    g.state.observedSettlements.find(
      (m) => m.observer === 0 && m.siteId === secondId,
    ),
    beforeRemoval,
  );
  g = restored(g);
  localPost = g.state.buildings.find((b) => b.id === post.id);
  assert.equal(frontierStatus(g, localPost).nearRival, 55);
  walk(g, builderId, 155, 18);
  step(g, 2.2);
  assert.equal(
    frontierStatus(g, localPost).nearRival,
    100,
    "revisiting empty second site updates only that fact",
  );
  const raw = JSON.parse(JSON.stringify(encodeGame(g)));
  for (const mutate of [
    (m) => (m.observer = m.owner),
    (m) => (m.owner = 3),
    (m) => (m.observedAt = g.state.time + 1),
    (m) => (m.siteId = raw.state.nextId),
    (m) => (m.witnessId = m.siteId),
    (m) => (m.active = "yes"),
    (m) => (m.cargo = 10),
    (m) => (m.x = 100000),
  ]) {
    const bad = structuredClone(raw);
    mutate(bad.state.observedSettlements[0]);
    assert.equal(validObservedSettlements(bad.state), false);
    assert.throws(() => decodeGame(bad));
  }
  const duplicate = structuredClone(raw);
  duplicate.state.observedSettlements.push(
    structuredClone(duplicate.state.observedSettlements[0]),
  );
  assert.throws(() => decodeGame(duplicate));
  const legacy = structuredClone(raw);
  delete legacy.state.observedSettlements;
  const unknown = decodeGame(legacy);
  ground(unknown);
  assert.equal(
    frontierStatus(
      unknown,
      unknown.state.buildings.find((b) => b.id === post.id),
    ).nearRival,
    500,
    "absent legacy memory is conservative",
  );
  results.push({
    scenario:
      "actual settlement witness / unseen secondary town and movement / saved remembered removal / actual revisit",
    walkedToFirst,
    rememberedFirst,
    observedSecond,
    settlementValidationRejected: 9,
    legacyNearRival: 500,
  });
});

test("paid unseen town creation and real offscreen destruction leave a paid legacy carrier walking to its recorded old site",()=>{
 let {g,builder}=fixture();
 const npcBuilder=g.state.units.find(u=>u.team===1);Object.assign(npcBuilder,{x:150,z:100,tx:150,tz:100});
 const attackers=Array.from({length:4},(_,i)=>{const u=g.spawnUnit('spearman',-35,65+i*5,3);u.order='hold';return u;});
 Object.assign(g.tribe(1),{wood:300,stone:200}); // Declared initial town-building endowment.
 const builderId=builder.id;g.rebuildWalk();walk(g,builderId,0,18);step(g,2.2);walk(g,builderId,220,18);step(g,2.2);
 const initial=knownSettlementSite(g,1);assert.ok(initial);assert.equal(initial.x,0);
 const wood=g.tribe(1).wood,stone=g.tribe(1).stone;
 assert.equal(g.placeBuilding('townhall',155,80,1),true,g.state.banner);
 const second=g.state.buildings.find(b=>b.team===1&&b.type==='townhall'&&b.id!==initial.id);assert.ok(second);const paidTown={wood:wood-g.tribe(1).wood,stone:stone-g.tribe(1).stone};
 Object.assign(npcBuilder,{order:'build',node:second,jobLock:false});
 for(let i=0;i<3000&&!g.finished(second);i++)step(g,.1);
 assert.ok(g.finished(second),'NPC adult must perform actual paid construction');
 assert.ok(wood>g.tribe(1).wood||stone>g.tribe(1).stone);
 assert.equal(g.state.observedSettlements.some(m=>m.observer===0&&m.siteId===second.id),false);
 const old=g.state.buildings.find(b=>b.id===initial.id);
 for(const u of attackers)Object.assign(u,{order:'attack',target:old,tx:old.x,tz:old.z});
 for(let i=0;i<6000&&old.hp>0;i++)step(g,.1);
 assert.ok(old.hp<=0,'the original hall must fall to ordinary real combat');
 for(const u of attackers){u.order='move';u.target=null;u.tx=-200;u.tz=150;}
 for(let i=0;i<1500&&attackers.some(u=>u.hp>0&&u.x>-100);i++)step(g,.1);
 assert.equal(knownSettlement(g,1),true,'unseen destruction does not tell the player');
 assert.equal(knownSettlementSite(g,1).x,0,'no redirection to the new unseen hall');
 builder=g.state.units.find(u=>u.id===builderId);builder.order='hold';g.clearSelect();g.selectEntity(builder);
 assert.equal(sendOffer(g,1,'food','wood',10,10),true);
 assert.equal(builder.carry,10);assert.deepEqual({x:builder.settlementJourney.x,z:builder.settlementJourney.z},{x:0,z:0});
 const raw=JSON.parse(JSON.stringify(encodeGame(g)));delete raw.state.observedSettlements;
 for(const u of raw.state.units)delete u.settlementJourney;
 g=decodeGame(raw);ground(g);builder=g.state.units.find(u=>u.id===builderId);
 assert.equal(builder.carry,10,'legacy paid cargo survives decoding');
 let walked=0,visitedNew=false,learnedAt;
 for(let i=0;i<5000&&builder.trade;i++){
  const x=builder.x,z=builder.z;step(g,.1);walked+=Math.hypot(builder.x-x,builder.z-z);
  visitedNew ||= Math.hypot(builder.x-second.x,builder.z-second.z)<26;
  if(!builder.trade)learnedAt={x:builder.x,z:builder.z,time:g.state.time};
 }
 assert.equal(builder.trade,null,JSON.stringify({x:builder.x,z:builder.z,hp:builder.hp,order:builder.order,reason:builder.workReason,journey:builder.settlementJourney,carry:builder.carry}));assert.equal(builder.order,'return');assert.equal(builder.carry,10);assert.equal(builder.carryType,'food');
 assert.ok(Math.hypot(builder.x,builder.z)<26,'absence is discovered physically at the old endpoint');assert.ok(walked>160);assert.equal(visitedNew,false);
 results.push({scenario:'paid unseen town / real combat destruction / legacy paid land journey',newTownPaid:paidTown,walked,visitedNew,learnedAt,carriedBudget:builder.carry});
});

test("a legacy paid gift delegation retains its serialized last endpoint and completes the real meeting",()=>{
 let {g,builder}=fixture();const id=builder.id;walk(g,id,0,18);step(g,2.2);walk(g,id,220,18);step(g,2.2);
 const before=g.tribe(0).food;g.clearSelect();g.selectEntity(builder);builder.order='hold';assert.equal(sendDelegation(g,1,'gift',builder),true);assert.equal(before-g.tribe(0).food,30);assert.equal(builder.carry,30);
 const raw=JSON.parse(JSON.stringify(encodeGame(g)));
 for(const mutate of [m=>m.recordedAt=g.state.time+1,m=>m.owner=0,m=>m.x=100000,m=>m.stock=400,m=>m.siteId=raw.state.nextId]){
  const bad=structuredClone(raw);mutate(bad.state.units.find(u=>u.id===id).settlementJourney);assert.throws(()=>decodeGame(bad));
 }
 delete raw.state.observedSettlements;for(const u of raw.state.units)delete u.settlementJourney;
 g=decodeGame(raw);ground(g);builder=g.state.units.find(u=>u.id===id);let walked=0,actualMeeting=false;
 for(let i=0;i<5000&&builder.envoy;i++){const x=builder.x,z=builder.z;step(g,.1);walked+=Math.hypot(builder.x-x,builder.z-z);actualMeeting ||= Math.hypot(builder.x,builder.z)<26&&builder.envoy?.talk>=20;}
 assert.equal(builder.envoy,undefined);assert.equal(builder.carry,0);assert.equal(actualMeeting,true);assert.ok(walked>350);
 results.push({scenario:'legacy paid gift delegation',paidFood:30,walked,actualMeeting,endpointCorruptionsRejected:5});
});

test.after(() => {
  if (process.env.CLAIM_REPORT)
    writeFileSync(
      process.env.CLAIM_REPORT,
      JSON.stringify(
        {
          runtimeBaseline: "920952a",
          scope:
            "Focused witnessed frontier claims; not full M2-07 qualification",
          results,
        },
        null,
        2,
      ),
    );
});
