import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {supplyApproach} from '../src/game/campAnchor.ts';
import {dispatchExistingCampRaid,seaRaidAI,canScheduleSeaRaid} from '../src/game/raiders.ts';
import {seaRaiderReturnAI} from '../src/game/seaRaiderReturn.ts';
import{createRaidPlan}from'../src/game/raidIntent.ts';
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


function strandedFixture(){const f=fixture(),{g,camp}=f;g.state.time=1300;reported(g,camp);const survivors=[];for(let i=0;i<12;i++){const u=g.spawnUnit('spearman',-180+i,-150,3),plan=createRaidPlan(g,g.id(),12,2,u.id);plan.strandedAt=g.state.time;u.seaRaid={phase:'retreat',x:u.x,z:u.z,goalX:0,goalZ:0,departAt:1300,thinkAt:1310,plan};u.order='hold';survivors.push(u);}return{...f,survivors};}
test('twelve retained legacy survivors cannot suppress departure of an existing paid finite-camp resident',()=>{const{g,u,v,camp,survivors}=strandedFixture(),ids=g.state.units.map(p=>p.id),food=g.tribe(3).food,water=g.tribe(3).survival.waterLiters,positions=survivors.map(p=>[p.x,p.z]);assert.equal(canScheduleSeaRaid(g),true);assert.equal(dispatchExistingCampRaid(g),true);assert.deepEqual(g.state.units.map(p=>p.id),ids);assert.ok(u.campTrip);assert.equal(v.homeCamp,camp.id);assert.equal(g.tribe(3).food+u.scoutProvisions.food,food);assert.equal(g.tribe(3).survival.waterLiters+u.scoutProvisions.water,water);assert.ok(survivors.every(p=>p.hp>0&&p.seaRaid.phase==='retreat'));assert.deepEqual(survivors.map(p=>[p.x,p.z]),positions);assert.equal(canScheduleSeaRaid(g),false,'the new real active band still blocks another dispatch');assert.doesNotThrow(()=>decodeGame(encodeGame(g)));});
test('legacy spawning rules retain their stranded-population ceiling',()=>{const{g}=strandedFixture();delete g.state.finiteRaiderCampVersion;assert.equal(canScheduleSeaRaid(g),false);g.state.finiteRaiderCampVersion=1;assert.equal(canScheduleSeaRaid(g),true);});
test('quiet, opening grace and a real active invader still block a finite scheduler',()=>{const{g,survivors}=strandedFixture();g.state.conflict='quiet';assert.equal(canScheduleSeaRaid(g),false);g.state.conflict='balanced';g.state.time=1199;assert.equal(canScheduleSeaRaid(g),false);g.state.time=1300;survivors[0].seaRaid.phase='raid';delete survivors[0].seaRaid.plan.strandedAt;assert.equal(canScheduleSeaRaid(g),false);});
test('ignoring the obsolete cap does not bypass real provisions, report or guard admission',()=>{const{g,camp}=strandedFixture();g.tribe(3).food=0;g.tribe(3).foodLots={};const ids=g.state.units.map(p=>p.id),next=g.state.nextId;assert.equal(canScheduleSeaRaid(g),true);assert.equal(dispatchExistingCampRaid(g),false);assert.deepEqual(g.state.units.map(p=>p.id),ids);assert.equal(g.state.nextId,next);assert.equal(camp.campEconomy.departures,0);});
