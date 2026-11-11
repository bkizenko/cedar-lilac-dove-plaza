import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {supplyApproach} from '../src/game/campAnchor.ts';
import {dispatchExistingCampRaid,seaRaidAI} from '../src/game/raiders.ts';
import {seaRaiderReturnAI} from '../src/game/seaRaiderReturn.ts';
import{tickScoutProvisions}from'../src/game/scoutProvisions.ts';
import {campTripAI,campTripBudget,FINITE_CAMP_RULES} from '../src/game/finiteCamp.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(native = false) {
  const g = new Game();
  g.reset(123456, native ? 18 : 10,native?{size:1560,layout:'pangaea'}:undefined);
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


test('finite group dispatch sends existing paid residents while retaining one real camp defender',()=>{
 const{g,u,v,camp}=fixture();const{report}=reported(g,camp,80,0);for(let i=0;i<2;i++){const p=g.spawnUnit('spearman',camp.x+5,camp.z+1+i,3);p.homeCamp=camp.id;p.order='hold';walkHome(g,p,camp);}const ids=g.state.units.map(u=>u.id),food=g.tribe(3).food,water=g.tribe(3).survival.waterLiters;
 assert.equal(dispatchExistingCampRaid(g),true);const party=g.state.units.filter(p=>p.campTrip?.campId===camp.id),watchers=g.state.units.filter(p=>p.team===3&&p.homeCamp===camp.id);assert.equal(party.length,3);assert.equal(watchers.length,1);assert.ok(Math.hypot(watchers[0].x-camp.x,watchers[0].z-camp.z)<=12);assert.deepEqual(g.state.units.map(u=>u.id),ids);assert.equal(new Set(party.map(u=>u.campTrip.id)).size,3);assert.ok(party.every(u=>u.seaRaid.plan.initialBand===3));assert.ok(Math.abs(g.tribe(3).food+party.reduce((n,u)=>n+u.scoutProvisions.food,0)-food)<1e-8);assert.ok(Math.abs(g.tribe(3).survival.waterLiters+party.reduce((n,u)=>n+u.scoutProvisions.water,0)-water)<1e-8);assert.equal(camp.campEconomy.departures,3);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));const forged=structuredClone(encodeGame(g));forged.state.buildings.find(b=>b.id===camp.id).campEconomy.foodPaid=0;assert.throws(()=>decodeGame(forged));
});
test('native paid camp raid actually walks toward a distant report beyond the old55second deadline',()=>{
 const{g,u,camp}=fixture(true);let chosen;for(const[dx,dz]of Array.from({length:96},(_,i)=>{const r=180+Math.floor(i/16)*70,a=(i%16)*Math.PI/8;return[Math.cos(a)*r,Math.sin(a)*r];})){const x=camp.x+dx,z=camp.z+dz;if(![[0,0],[-4,-4],[-4,4],[4,-4],[4,4]].every(([dx,dz])=>g.walkable(x+dx,z+dz)))continue;const b=g.makeBld('warehouse',x,z,0);g.state.buildings.push(b);g.rebuildWalk();const report={version:1,campId:camp.id,siteId:b.id,team:0,x,z,observedAt:g.state.time};const budget=campTripBudget(g,u,report);if(budget&&budget.walkingSeconds>100){chosen={b,report,budget};break;}g.state.buildings.pop();g.rebuildWalk();}assert.ok(chosen,'native reachable longer journey');camp.campEconomy={version:1,knownSites:[chosen.report],lastDispatchAt:0,departures:0,returns:0,lost:0,foodPaid:0,waterPaid:0,foodUsed:0,waterUsed:0};assert.equal(dispatchExistingCampRaid(g),true);const start={x:u.x,z:u.z},time=g.state.time,initialDistance=Math.hypot(u.x-chosen.b.x,u.z-chosen.b.z);assert.ok(u.seaRaid.departAt-time>=chosen.budget.walkingSeconds+FINITE_CAMP_RULES.onsiteSeconds);assert.ok(u.scoutProvisions.water>=.008*(chosen.budget.walkingSeconds*2+FINITE_CAMP_RULES.onsiteSeconds+FINITE_CAMP_RULES.returnReserveSeconds));for(let i=0;i<560&&u.seaRaid?.phase==='raid';i++){g.state.time+=.1;g.navBudget=4;tickScoutProvisions(g,.1);seaRaidAI(g,u,.1);}assert.ok(g.state.time-time>55);assert.equal(u.seaRaid.phase,'raid');assert.ok(Math.hypot(u.x-start.x,u.z-start.z)>20);assert.ok(Math.hypot(u.x-chosen.b.x,u.z-chosen.b.z)<initialDistance-20);assert.ok(u.scoutProvisions.foodUsed>0&&u.scoutProvisions.waterUsed>0);console.log(JSON.stringify({nativeSeed:g.state.seed,world:g.state.worldOptions,routeMetres:chosen.budget.length,walkingBudgetSeconds:chosen.budget.walkingSeconds,paidPackSeconds:chosen.budget.budgetSeconds,outwardDeadlineSeconds:u.seaRaid.departAt-time,actualWalkSeconds:g.state.time-time,displacementMetres:Math.hypot(u.x-start.x,u.z-start.z)}));assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('overbudget or disconnected trips cannot spend a pack or create an outward body',()=>{const{g,u,camp}=fixture();const{report}=reported(g,camp,80,0);u.speed=.15;const before={food:g.tribe(3).food,water:g.tribe(3).survival.waterLiters,ids:g.state.units.map(u=>u.id),next:g.state.nextId};assert.equal(campTripBudget(g,u,report),null);assert.equal(dispatchExistingCampRaid(g),false);assert.equal(g.tribe(3).food,before.food);assert.equal(g.tribe(3).survival.waterLiters,before.water);assert.equal(g.state.nextId,before.next);assert.deepEqual(g.state.units.map(u=>u.id),before.ids);});
