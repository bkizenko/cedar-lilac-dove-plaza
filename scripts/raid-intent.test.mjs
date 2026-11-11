import {prepareFiniteRaid} from './finite-raid-fixture.mjs';
import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game/sim.ts";
import {
  createRaidPlan,
  chooseRaidIntent,
  RAID_INTENT_RULES,
  validRaidIntents,
  limitedRaidAI,
  raidIntentReport,
} from "../src/game/raidIntent.ts";
import { takeFoodLot } from "../src/game/pantry.ts";
import { encodeGame, decodeGame, gameSnapshot, validateGameSave } from "../src/game/persistence.ts";
import { seaRaidAI, finishSeaRaid, canScheduleSeaRaid } from "../src/game/raiders.ts";
import { DIFFICULTIES } from "../src/game/difficulty.ts";
import { missionMayTargetCivilian, missionMayTargetBuilding } from "../src/game/conflictIntent.ts";
function fixture(intent, near = false) {
  const g = new Game();
  g.reset(42, 10, { size: 1040, layout: "continents" });
  g.enterIsland();
  g.world.heights.fill(4);
  g.world.rivers = [];
  g.world.waterBodies = [];
  g.world.waterHeights = undefined;
  g.world.ecology = undefined;
  g.state.units = [];
  g.state.buildings = [];
  g.state.autoWorkEnabled = false;
  g.state.contacts = [1, 2, 3];
  g.state.nightWork = true;
  g.state.conflict = "quiet";
  g.state.weather = "clear";
  g.state.weatherT = g.state.raidT = 1e5;
  g.state.visitorTimer = g.state.birthT = g.state.scoutTimer = 900;
  g.state.scoutTimer = 900;
  g.state.growthPolicy = "stable";
  g.calamityT = 1e5;
  for (const k of ["trees", "stones", "forage", "fish", "wildlife", "copper", "iron"])
    g.state[k] = [];
  for (const t of g.state.tribes) {
    Object.assign(t, {
      food: 1000,
      foodLots: { provisions: 1000 },
      wood: 100,
      stone: 50,
      spears: 0,
      bows: 0,
      blades: 0,
      thinkT: 1e5,
    });
    t.survival.waterLiters = 100;
  }
  const store = g.makeBld("warehouse", 20, 20, 0),
    camp = g.makeBld("hut", -30, 20, 3);
  camp.raiderCamp = true;
  g.state.buildings = [store, camp];
  const victim = g.spawnUnit("worker", near ? 5 : 50, 20, 0);
  victim.order = "hold";
  victim.jobLock = true;
  if (near) {
    victim.hp = victim.maxHp * 0.3;
    assert.equal(takeFoodLot(g, 0, "provisions", 4), true);
    victim.carry = 4;
    victim.carryType = "food";
    victim.carryFood = "provisions";
  }
  const u = g.spawnUnit("spearman", near ? 0 : -10, 20, 3),
    other = g.spawnUnit("worker", 150, 50, 2);
  other.order = "hold";
  other.jobLock = true;
  const survivor = g.spawnUnit("worker", 180, 50, 0);
  survivor.order = "hold";
  survivor.jobLock = true;
  const plan = createRaidPlan(g, g.id(), 1, 2, u.id);
  plan.selectedIntent = plan.intent = intent;
  u.seaRaid = {
    x: u.x,
    z: u.z,
    goalX: 20,
    goalZ: 20,
    phase: "raid",
    thinkAt: 0,
    departAt: 480,
    plan,
  };
  u.order = "move";
  u.tx = 20;
  u.tz = 20;
  g.vision.fill(2);
  g.rebuildWalk();
  return { g, u, victim, store, camp, plan };
}
function drive(g, seconds, done) {
  const end = g.state.time + seconds;
  while (g.state.time < end && !done()) {
    g.state.paused = false;
    const before = g.state.time;
    g.step(0.1);
    assert.ok(
      g.state.time > before,
      JSON.stringify({
        paused: g.state.paused,
        ended: g.state.ended,
        encounter: g.state.encounter,
      }),
    );
    assert.deepEqual(g.simulationErrors, []);
  }
  assert.ok(
    done(),
    JSON.stringify(
      g.state.units.map((u) => ({
        id: u.id,
        team: u.team,
        x: u.x,
        z: u.z,
        why: u.workReason,
        raid: u.seaRaid,
        return: u.seaRaidReturn,
        prisoner: u.prisoner,
      })),
    ),
  );
}
test("first tiny bands scout while harder profiles produce a measured larger destructive share and rare annihilation", () => {
  let previous = -1;
  for (const d of Object.values(DIFFICULTIES)) {
    let severe = 0,
      ann = 0;
    for (let i = 0; i < 10000; i++) {
      assert.equal(chooseRaidIntent(d.band, 2, 1, i / 10000), "scout");
      const pick = chooseRaidIntent(d.band, 8, 3, i / 10000);
      severe += pick === "destructive" || pick === "annihilation";
      ann += pick === "annihilation";
    }
    assert.ok(severe >= previous);
    previous = severe;
    assert.ok(ann <= 500);
  }
  assert.equal(chooseRaidIntent(0.5, 8, 3, 0), "destructive");
});
test("new scouting party physically observes and returns without harming homes or unarmed people", () => {
  const { g, u, victim, store, camp } = fixture("scout");
  const hp = { person: victim.hp, store: store.hp },
    count = g.state.units.length;
  drive(g, 100, () => u.homeCamp === camp.id);
  assert.equal(store.hp, hp.store);
  assert.equal(victim.hp, hp.person);
  assert.equal(g.state.units.length, count);
  assert.ok(g.state.raidIntentHistory[0].plan.metrics.observations > 0);
  assert.equal(g.state.raidIntentHistory[0].plan.metrics.lootTaken, 0);
  assert.equal(g.state.raidIntentHistory[0].outcome, "returned");
  assert.doesNotThrow(() => decodeGame(encodeGame(g)));
});
test("limited loot physically collects a finite pantry lot from a standing warehouse then carries it home once", () => {
  const { g, u, victim, store, camp } = fixture("loot"),
    food = g.tribe(0).food,
    homeFood = g.tribe(3).food,
    hp = store.hp;
  let taken = 0,
    previous = g.state.time;
  drive(g, 100, () => {
    taken = Math.max(taken, u.seaRaid?.plan?.metrics.lootTaken || 0);
    return u.homeCamp === camp.id;
  });
  const record = g.state.raidIntentHistory.find((r) => r.actorId === u.id);
  assert.ok(record.plan.metrics.lootTaken > 0 && record.plan.metrics.lootTaken <= 8);
  assert.ok(record.plan.metrics.lootWorkSeconds >= RAID_INTENT_RULES.collectionSeconds);
  assert.equal(store.hp, hp);
  assert.equal(victim.team, 0);
  assert.equal(record.cargo, record.plan.metrics.lootTaken);
  assert.equal(u.carry, 0);
  assert.equal(record.outcome, "returned");
  assert.ok(g.tribe(0).food < food);
  assert.equal(g.state.raidIntentHistory.filter((r) => r.actorId === u.id).length, 1);
  assert.doesNotThrow(() => validateGameSave(gameSnapshot(g)));
});
test("capture obtains real surrender with finite carried provisions and escorts the same person to an actual camp", () => {
  const { g, u, victim, camp, store } = fixture("capture", true),
    id = victim.id,
    where = { x: victim.x, z: victim.z },
    hp = store.hp;
  drive(g, 100, () => victim.prisoner?.phase === "custody" && u.homeCamp === camp.id);
  assert.equal(victim.id, id);
  assert.equal(victim.team, 3);
  assert.equal(victim.prisoner.originTeam, 0);
  assert.equal(victim.prisoner.guardId, u.id);
  assert.ok(g.buildingWorkReached(victim, camp));
  assert.equal(store.hp, hp);
  assert.equal(g.state.raidIntentHistory.find((r) => r.actorId === u.id).plan.metrics.captives, 1);
  assert.equal(victim.carry, 0);
  assert.ok(victim.prisoner.food < 4 && victim.prisoner.food > 0);
  assert.doesNotThrow(() => decodeGame(encodeGame(g)));
});
test("nonlethal target contracts protect ordinary civilians and homes while allowing actual armed interception", () => {
  const { g, u, victim, store } = fixture("loot");
  assert.equal(missionMayTargetCivilian(g, u, victim), false);
  assert.equal(missionMayTargetBuilding(g, u, store), false);
  const leader = g.spawnUnit("leader", 80, 20, 0);
  assert.equal(missionMayTargetCivilian(g, u, leader), false);
  victim.x = u.x + 2;
  victim.z = u.z;
  victim.y = g.height(victim.x, victim.z);
  victim.order = "attack";
  victim.target = u;
  assert.equal(missionMayTargetCivilian(g, u, victim), true);
  u.seaRaid.plan.intent = u.seaRaid.plan.selectedIntent = "destructive";
  assert.equal(missionMayTargetCivilian(g, u, leader), false);
  assert.equal(missionMayTargetBuilding(g, u, store), true);
  u.seaRaid.plan.intent = u.seaRaid.plan.selectedIntent = "annihilation";
  assert.equal(missionMayTargetCivilian(g, u, leader), true);
});
test("versioned raid plan saves remain strict and validation consumes no random draws", () => {
  const { g, u } = fixture("loot"),
    raw = gameSnapshot(g),
    random = Math.random;
  let draws = 0;
  Math.random = () => {
    draws++;
    return 0.5;
  };
  try {
    assert.doesNotThrow(() => validateGameSave(raw));
  } finally {
    Math.random = random;
  }
  assert.equal(draws, 0);
  for (const mutate of [
    (p) => (p.intent = "fake"),
    (p) => (p.actorId = g.state.units.find((v) => v.id !== u.id).id),
    (p) => delete p.metrics.lootTaken,
    (p) => (p.seenSites = [g.state.nextId + 1]),
    (p) => (p.metrics.lootTaken = 99),
    (p) => (p.reviewAt = g.state.time + 20),
  ]) {
    const bad = structuredClone(raw);
    mutate(bad.state.units.find((v) => v.id === u.id).seaRaid.plan);
    assert.throws(() => validateGameSave(bad));
  }
  for (const invalid of [undefined, null, {}]) {
    const bad = structuredClone(g.state);
    bad.raidIntentHistory = [{ actorId: u.id, time: 0, outcome: "lost", cargo: 0, plan: invalid }];
    assert.equal(validRaidIntents(bad), false);
  }
  const old = structuredClone(raw);
  delete old.state.units.find((v) => v.id === u.id).seaRaid.plan;
  assert.doesNotThrow(() => validateGameSave(old));
});
test("ordinary native scheduled dispatch assigns existing residents a shared versioned camp plan", () => {
  const g = new Game();
  g.reset(42, 16, { size: 1040, layout: "continents" });
  g.enterIsland();
  g.state.time = 1300;
  g.state.contacts = [1, 2, 3];
  const {crew}=prepareFiniteRaid(g);const ids=g.state.units.map(u=>u.id);g.spawnRaid();
  assert.deepEqual(g.state.units.map(u=>u.id),ids);
  const party = g.state.units.filter((u) => u.seaRaid);
  assert.ok(party.length > 0, "A real finite native camp can dispatch");
  assert.ok(party.every((u) => u.seaRaid.plan?.version === 1 && u.seaRaid.plan.intent === "loot"));
  assert.ok(party.every(u=>crew.includes(u)));
  assert.equal(new Set(party.map((u) => u.seaRaid.plan.bandId)).size, 1);
  assert.equal(party[0].seaRaid.plan.initialBand, party.length);
  assert.doesNotThrow(() => decodeGame(encodeGame(g)));
});
test("actual reached-store collection conserves one edible lot and repeated executor calls cannot mint a second load", () => {
  const { g, u, plan } = fixture("loot");
  drive(g, 30, () => plan.workSeconds > 0);
  const food = g.tribe(0).food;
  g.state.time += 3;
  assert.equal(limitedRaidAI(g, u, 3), true);
  assert.equal(u.carryType, "food");
  assert.equal(g.tribe(0).food + u.carry, food);
  assert.equal(plan.metrics.lootTaken, u.carry);
  const after = g.tribe(0).food,
    cargo = u.carry;
  limitedRaidAI(g, u, 0.1);
  assert.equal(g.tribe(0).food, after);
  assert.equal(u.carry, cargo);
  assert.equal(u.seaRaid.phase, "retreat");
  assert.doesNotThrow(() => validateGameSave(gameSnapshot(g)));
});
test("a new-plan stranded withdrawal preserves the visible body and property without permanently blocking later raids", () => {
  const { g, u, store } = fixture("scout");
  g.state.buildings = g.state.buildings.filter((b) => b.team !== 3);
  g.rebuildWalk();
  g.state.conflict = "balanced";
  g.state.time = 1300;
  Object.assign(u.seaRaid.plan, { selectedAt: 1300, observedAt: 1300, reviewAt: 1300 });
  g.state.raidCampaign = {
    active: true,
    adults: 2,
    buildings: 1,
    loss: 0,
    people: g.state.units.filter((v) => v.team === 0).map((v) => v.id),
    sites: [store.id],
  };
  const id = u.id,
    count = g.state.units.length;
  drive(g, 20, () => u.seaRaid?.plan?.strandedAt !== undefined);
  finishSeaRaid(g);
  assert.equal(g.state.raidCampaign.active, false);
  assert.equal(canScheduleSeaRaid(g), true);
  assert.equal(g.state.units.length, count);
  assert.equal(u.id, id);
  assert.ok(u.hp > 0);
  assert.equal(u.homeCamp, undefined);
  assert.equal(u.order, "hold");
  assert.equal(g.state.raidIntentHistory.at(-1).outcome, "stranded");
  assert.equal(g.state.raidIntentHistory.at(-1).cargo, 0);
  assert.doesNotThrow(() => decodeGame(encodeGame(g)));
});
test("raid observation/history reports copy data without changing gameplay state or drawing random numbers", () => {
  const { g, u } = fixture("loot");
  g.state.time += 0.1;
  g.navBudget = 8;
  seaRaidAI(g, u, 0.1);
  const before = JSON.stringify(gameSnapshot(g)),
    random = Math.random;
  let draws = 0;
  Math.random = () => {
    draws++;
    return 0.5;
  };
  try {
    const report = raidIntentReport(g);
    report.active[0].plan.seenSites.push(999999);
    raidIntentReport(g);
    assert.doesNotThrow(() => validateGameSave(gameSnapshot(g)));
  } finally {
    Math.random = random;
  }
  assert.equal(draws, 0);
  assert.equal(JSON.stringify(gameSnapshot(g)), before);
});
test("destructive intent can damage a reached settlement objective but returns its finite carried ruin loot", () => {
  const { g, u, victim, store, camp } = fixture("destructive");
  victim.hp = victim.maxHp * 0.3;
  drive(g, 120, () => u.homeCamp === camp.id);
  assert.equal(store.hp, 0);
  assert.ok(victim.hp > 0);
  const record = g.state.raidIntentHistory.find(
    (r) => r.actorId === u.id && r.outcome === "returned",
  );
  assert.ok(record);
  assert.ok(record.plan.metrics.lootTaken > 0 && record.plan.metrics.lootTaken <= 8);
  assert.equal(record.cargo, record.plan.metrics.lootTaken);
  assert.doesNotThrow(() => validateGameSave(gameSnapshot(g)));
});
test("rare annihilation objective does not stop merely to collect ruin goods", () => {
  const { g, u, victim, store } = fixture("annihilation");
  victim.hp = victim.maxHp * 0.3;
  drive(g, 100, () => store.hp <= 0);
  for (let i = 0; i < 5; i++) {
    g.state.paused = false;
    g.step(0.1);
  }
  assert.equal(u.carry, 0);
  assert.equal(u.seaRaid.plan.metrics.lootTaken, 0);
  assert.equal(u.seaRaid.phase, "raid");
  assert.doesNotThrow(() => validateGameSave(gameSnapshot(g)));
});
test("even severe new objectives withdraw when the real band member is badly wounded", () => {
  const { g, u } = fixture("annihilation");
  u.hp = u.maxHp * 0.2;
  g.state.time += 0.1;
  g.navBudget = 8;
  seaRaidAI(g, u, 0.1);
  assert.equal(u.seaRaid.phase, "retreat");
  assert.equal(u.seaRaid.plan.metrics.withdrawals, 1);
  assert.ok(u.hp > 0);
});

test('a loot band arriving at an empty objective searches separate reachable approaches and withdraws',()=>{
 const {g,u,plan}=fixture('loot');
 g.state.buildings=[];
 g.rebuildWalk();
 const v=g.spawnUnit('spearman',u.x,u.z,3);
 v.seaRaid={...u.seaRaid,plan:{...plan,actorId:v.id}};
 for(const actor of [u,v]){
  actor.seaRaid.goalX=actor.x;actor.seaRaid.goalZ=actor.z;
  actor.seaRaid.plan.targetId=undefined;
 }
 g.steer=()=>false;
 limitedRaidAI(g,u,.1);limitedRaidAI(g,v,.1);
 assert.notDeepEqual([u.tx,u.tz],[v.tx,v.tz]);
 assert.equal(u.order,'move');assert.equal(v.order,'move');
 Object.assign(u,{x:u.tx,z:u.tz});
 limitedRaidAI(g,u,.1);
 assert.equal(u.seaRaid.phase,'retreat');
});
