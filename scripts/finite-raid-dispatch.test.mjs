import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {supplyApproach} from '../src/game/campAnchor.ts';
import {dispatchExistingCampRaid,seaRaidAI} from '../src/game/raiders.ts';
import {seaRaiderReturnAI} from '../src/game/seaRaiderReturn.ts';
import {campTripAI} from '../src/game/finiteCamp.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(native = false) {
  const g = new Game();
  g.reset(123456, native ? 14 : 10);
  g.enterIsland();
  if (!native) {
    g.world.heights.fill(4);
    g.world.rivers = [];
    g.world.waterBodies = [];
    g.world.waterHeights = undefined;
    g.world.ecology = undefined;
  }
  const center = native ? g.campOf(0) : { x: 0, z: 0 };
  g.state.units = [];
  g.state.buildings = [];
  g.state.autoWorkEnabled = false;
  g.state.contacts = [1, 2, 3];
  g.state.conflict = "balanced";
  g.state.nightWork = true;
  g.state.time = 400;
  g.state.weather = "clear";
  g.state.weatherT =
    g.state.raidT =
    g.state.birthT =
    g.state.scoutTimer =
    g.state.visitorTimer =
      900;
  g.calamityT = 1e5;
  g.state.growthPolicy = "stable";
  for (const k of ["trees", "stones", "forage", "fish", "wildlife", "copper", "iron"])
    g.state[k] = [];
  for (const t of g.state.tribes) {
    Object.assign(t, {
      food: 100,
      foodLots: { provisions: 100 },
      wood: 10,
      stone: 10,
      spears: 0,
      bows: 0,
      blades: 0,
      thinkT: 1e5,
    });
    t.survival.waterLiters = 30;
  }
  const camp = g.makeBld("hut", center.x, center.z, 3);
  camp.raiderCamp = true;
  g.state.buildings = [camp];
  const u = g.spawnUnit("spearman", center.x + 6, center.z, 3),
    v = g.spawnUnit("spearman", center.x - 6, center.z, 3);
  for (const p of [u, v]) {
    p.homeCamp = camp.id;
    p.order = "hold";
  }
  for (const [team, offset] of [
    [2, 100],
    [0, -100],
  ]) {
    const p = g.spawnUnit("worker", center.x + offset, center.z, team);
    p.order = "hold";
    p.jobLock = true;
  }
  g.rebuildWalk();
  walkHome(g, u, camp);
  return { g, u, v, camp, center };
}
function walkHome(g, u, b) {
  const p = supplyApproach(g, u, b);
  assert.ok(p, "real entrance");
  u.tx = p.x;
  u.tz = p.z;
  for (let i = 0; i < 1000 && !g.buildingWorkReached(u, b); i++) {
    g.navBudget = 20;
    g.steer(u, 0.1);
  }
  assert.ok(g.buildingWorkReached(u, b), u.workReason);
  u.target = null;
  u.node = null;
  u.order = "hold";
}
function reported(g, camp, x = 28, z = 0) {
  const b = g.makeBld("warehouse", camp.x + x, camp.z + z, 0);
  g.state.buildings.push(b);
  g.rebuildWalk();
  const report = {
    version: 1,
    campId: camp.id,
    siteId: b.id,
    team: 0,
    x: b.x,
    z: b.z,
    observedAt: g.state.time,
  };
  camp.campEconomy = {
    version: 1,
    knownSites: [report],
    lastDispatchAt: 0,
    departures: 0,
    returns: 0,
    lost: 0,
    foodPaid: 0,
    waterPaid: 0,
    foodUsed: 0,
    waterUsed: 0,
  };
  return { b, report };
}

test('scheduled raid dispatch preserves finite IDs, pays supplies and physically approaches the reported store',()=>{
 const {g,u,v,camp}=fixture();const {b}=reported(g,camp,28,0),ids=g.state.units.map(p=>p.id),initial={x:u.x,z:u.z,food:g.tribe(3).food,water:g.tribe(3).survival.waterLiters};
 const banners=[];g.banner=(...args)=>banners.push(args);let alarms=0;g.defendHome=()=>alarms++;g.callAlliesTo=()=>alarms++;
 g.spawnRaid();
 assert.deepEqual(g.state.units.map(p=>p.id),ids);assert.ok(u.campTrip);assert.equal(v.homeCamp,camp.id);assert.equal(u.seaRaid.x,initial.x);assert.equal(u.seaRaid.z,initial.z);assert.equal(u.x,initial.x);assert.equal(u.z,initial.z);
 assert.ok(g.tribe(3).food<initial.food);assert.ok(g.tribe(3).survival.waterLiters<initial.water);assert.equal(g.tribe(3).food+u.scoutProvisions.food,initial.food);assert.equal(g.tribe(3).survival.waterLiters+u.scoutProvisions.water,initial.water);
 assert.equal(alarms,0,'no village-wide defense signal from a remote departure');assert.equal(banners.length,0);
 const initialDistance=Math.hypot(u.x-b.x,u.z-b.z);
 for(let i=0;i<450&&Math.hypot(u.x-b.x,u.z-b.z)>8;i++){g.state.time+=.1;g.navBudget=30;seaRaidAI(g,u,.1);}
 assert.ok(Math.hypot(u.x-b.x,u.z-b.z)<8,`real actor must approach: ${u.workReason}`);assert.ok(Math.hypot(u.x-b.x,u.z-b.z)<initialDistance-10);assert.deepEqual(g.state.units.map(p=>p.id),ids);
 const restored=decodeGame(encodeGame(g));assert.ok(restored.state.units.some(p=>p.id===u.id&&p.campTrip));
 // Retiring is a real journey by the same actor, never a disappearance.
 u.seaRaid.phase='retreat';
 for(let i=0;i<1200&&u.seaRaid;i++){g.state.time+=.1;g.navBudget=30;if(!seaRaiderReturnAI(g,u,.1))seaRaidAI(g,u,.1);}
 assert.equal(u.seaRaid,undefined);assert.equal(u.homeCamp,camp.id);assert.deepEqual(g.state.units.map(p=>p.id),ids);assert.ok(g.buildingWorkReached(u,camp));
});

test('a scheduler cannot create a party or free provisions without a report, available second guard and paid stocks',()=>{
 for(const missing of ['report','guard','food','water']){
  const {g,u,v,camp}=fixture();reported(g,camp);
  if(missing==='report')camp.campEconomy.knownSites=[];if(missing==='guard')v.hp=0;if(missing==='food'){g.tribe(3).food=0;g.tribe(3).foodLots={};}if(missing==='water')g.tribe(3).survival.waterLiters=0;
  const before={ids:g.state.units.map(p=>p.id),food:g.tribe(3).food,water:g.tribe(3).survival.waterLiters,next:g.state.nextId};
  assert.equal(dispatchExistingCampRaid(g),false,missing);assert.deepEqual(g.state.units.map(p=>p.id),before.ids);assert.equal(g.state.nextId,before.next);assert.equal(g.tribe(3).food,before.food);assert.equal(g.tribe(3).survival.waterLiters,before.water);assert.equal(u.seaRaid,undefined);
 }
});

test('quiet conflict, stale reports and unavailable native origin never fall back to a shore spawn',()=>{
 for(const reason of ['quiet','stale','origin']){
  const {g,camp}=fixture();reported(g,camp);if(reason==='quiet')g.state.conflict='quiet';if(reason==='stale')camp.campEconomy.knownSites[0].observedAt-=400;if(reason==='origin')camp.hp=0;
  const ids=g.state.units.map(p=>p.id),food=g.tribe(3).food;g.spawnRaid();assert.deepEqual(g.state.units.map(p=>p.id),ids);assert.equal(g.tribe(3).food,food);assert.ok(g.state.units.every(p=>!p.seaRaid));
 }
});

test('ordinary world ticks keep a finite campaign active outbound and at work, then finish it without removing returning people',()=>{
 const {g,u,v,camp}=fixture();g.state.time=1500;const {b}=reported(g,camp);const ids=g.state.units.map(p=>p.id);
 g.spawnRaid();assert.equal(u.homeCamp,undefined,'outbound actor is not an idle home guard');assert.equal(v.homeCamp,camp.id);assert.equal(g.state.raidCampaign.active,true);g.state.paused=false;
 let traveled=false,worked=false;
 for(let i=0;i<800&&u.seaRaid?.phase==='raid';i++){
  const previous={x:u.x,z:u.z};g.step(.1);assert.equal(g.state.paused,false);traveled ||= Math.hypot(u.x-previous.x,u.z-previous.z)>0;
  if((u.seaRaid?.plan?.workSeconds||0)>0)worked=true;
  if(u.seaRaid?.phase==='raid')assert.equal(g.state.raidCampaign.active,true,'the pending raid does not instantly finish or demobilize defenders');
 }
 assert.ok(traveled);assert.ok(worked,'real supply work is reached through the ordinary simulation');assert.ok(u.carry>0,'the same actor physically takes an actual load');
 g.step(.1);assert.equal(g.state.raidCampaign.active,false,'unopposed withdrawal ends the campaign alarm');assert.ok(g.state.units.some(p=>p.id===u.id&&p.hp>0),'campaign completion retains the moving survivor');
 for(let i=0;i<1600&&u.seaRaid;i++)g.step(.1);
 assert.equal(u.seaRaid,undefined);assert.equal(u.homeCamp,camp.id);assert.ok(g.buildingWorkReached(u,camp));assert.deepEqual(g.state.units.map(p=>p.id),ids);assert.ok(g.state.buildings.includes(b));
});

test('an obsolete remembered store causes a real search and return, never phantom loot or replacement people',()=>{
 const {g,u,camp}=fixture();g.state.time=1500;const {b}=reported(g,camp);b.hp=0;g.rebuildWalk();
 const ids=g.state.units.map(p=>p.id),food=g.tribe(0).food;g.spawnRaid();assert.ok(u.campTrip,'a camp may travel to its own dated report without knowing an unseen demolition');g.state.paused=false;
 let moved=false;const origin={x:u.x,z:u.z};
 for(let i=0;i<1800&&u.seaRaid;i++){g.step(.1);moved ||= Math.hypot(u.x-origin.x,u.z-origin.z)>5;assert.equal(u.seaRaid?.plan?.metrics.lootTaken||0,0,'missing target cannot grant goods');}
 assert.ok(moved);assert.equal(u.seaRaid,undefined);assert.equal(u.homeCamp,camp.id);assert.deepEqual(g.state.units.map(p=>p.id),ids);assert.ok(g.tribe(0).food<=food,'ordinary consumption is allowed; a missing store grants no food');
});


test('raid withdrawal records its first actual injury, local opposition, deadline or carried-loot cause exactly once',()=>{
 for(const cause of ['injury','defenders','deadline','loot']){
  const {g,u,camp}=fixture();reported(g,camp);g.spawnRaid();const plan=u.seaRaid.plan;
  // Exercise the generic raid guard; the camp-specific paid-pack executor is
  // independently qualified below. Actor and any carried loot remain real.
  u.campTrip=undefined;
  if(cause==='injury')u.hp=u.maxHp*.2;
  if(cause==='defenders')for(let i=0;i<6;i++)g.spawnUnit('spearman',u.x+2+i*.2,u.z+2,0);
  if(cause==='deadline')g.state.time=u.seaRaid.departAt+1;
  if(cause==='loot'){g.tribe(0).food-=4;g.tribe(0).foodLots.provisions-=4;u.carry=4;u.carryType='food';}
  seaRaidAI(g,u,0);
  const patterns={injury:/serious injury/,defenders:/6 nearby defenders overwhelm 2 raiders/,deadline:/deadline reached/,loot:/carried supplies/};
  assert.match(plan.reason,patterns[cause]);assert.equal(u.seaRaid.phase,'retreat');assert.equal(plan.metrics.withdrawals,1);
  const first=plan.reason;u.hp=u.maxHp*.1;g.state.time=u.seaRaid.departAt+5;seaRaidAI(g,u,0);
  assert.equal(plan.reason,first,'later true conditions cannot rewrite the original withdrawal decision');assert.equal(plan.metrics.withdrawals,1);
 }
});

test('finite outward deadline or missing food/water records one first-cause decision before generic raid handling',()=>{
 for(const cause of ['deadline','missing','food','water']){
  const {g,u,camp}=fixture();reported(g,camp);g.spawnRaid();const plan=u.seaRaid.plan;
  if(cause==='deadline')g.state.time=u.seaRaid.departAt;
  if(cause==='missing')u.scoutProvisions=undefined;
  if(cause==='food')u.scoutProvisions.food=0;
  if(cause==='water')u.scoutProvisions.water=0;
  campTripAI(g,u);
  const patterns={deadline:/deadline reached/,missing:/provisions are missing/,food:/travel food exhausted/,water:/drinking water exhausted/};
  assert.match(plan.reason,patterns[cause]);assert.equal(u.seaRaid.phase,'retreat');assert.equal(plan.metrics.withdrawals,1);
  const first=plan.reason;campTripAI(g,u);seaRaidAI(g,u,0);assert.equal(plan.reason,first);assert.equal(plan.metrics.withdrawals,1,'camp and generic guards cannot double-count the same decision');
 }
});
