import {knownDiplomaticRelation,queueDiplomaticMessage,tickDiplomaticKnowledge,validDiplomaticKnowledge} from '../src/game/diplomaticKnowledge.ts';
import {dispatchSocietyMessage} from '../src/game/rivalActivity.ts';
import {tickPeace,rejectPeace} from '../src/game/peace.ts';
import {endowSettlementSites} from './helpers/endowed-settlement-sites.mjs';
import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import {sendDelegation} from "../src/game/delegations.ts";
import {knownSettlement,knownSettlementSite,sendOffer} from "../src/game/barter.ts";
import { Game } from "../src/game/sim.ts";
import {acceptPrisonerSurrender} from '../src/game/captivity.ts';
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

import{prepareSocietyHandover}from'../src/game/communityHandover.ts';import{validateGameSave,gameSnapshot}from'../src/game/persistence.ts';
function drive(g,seconds,done){const end=g.state.time+seconds;while(g.state.time<end&&!done()){g.state.paused=false;const before=g.state.time;g.step(.1);assert.ok(g.state.time>before);assert.deepEqual(g.simulationErrors,[]);}assert.ok(done(),JSON.stringify(g.state.rivalMissions));}
test('an actual paid authority messenger returns with conserved provisions after its community joins',()=>{
 const{g}=fixture();g.state.contacts=[1,2];g.state.nightWork=true;const observer=g.state.units.find(u=>u.team===1),hall=g.state.buildings.find(b=>b.team===1),entry=g.interactionSpot(observer,hall);assert.ok(entry);Object.assign(observer,{x:entry.x,z:entry.z,y:g.height(entry.x,entry.z),order:'hold',jobLock:false});const unrelated=g.spawnUnit('worker',350,40,2);unrelated.order='hold';unrelated.jobLock=true;
 endowSettlementSites(g,1,0);const message=queueDiplomaticMessage(g,1,'frontier',undefined,observer.id);assert.ok(message);const originalAccount=structuredClone(message.account),food=g.tribe(1).food,water=g.tribe(1).survival.waterLiters;assert.equal(dispatchSocietyMessage(g,message.id),true);let mission=g.state.rivalMissions.find(m=>m.id===message.missionId);assert.ok(mission.food>0&&mission.waterLiters>0);assert.equal(g.tribe(1).food,food-mission.food);assert.equal(g.tribe(1).survival.waterLiters,water-mission.waterLiters);
 const start={x:observer.x,z:observer.z};drive(g,80,()=>Math.hypot(observer.x-start.x,observer.z-start.z)>40);assert.equal(message.phase,'carried');const paid={food:mission.food,water:mission.waterLiters,x:observer.x,z:observer.z};g.state.paused=true;const plan=prepareSocietyHandover(g,1);assert.equal(plan.accepted,true,plan.reason);g.commitCommunityState(plan.state);mission=g.state.rivalMissions.find(m=>m.id===mission.id);const body=g.state.units.find(u=>u.id===observer.id),paper=g.state.diplomaticMessages.find(m=>m.id===message.id);assert.equal(mission.team,0);assert.equal(mission.partner,0);assert.equal(mission.phase,'returning');assert.equal(paper.phase,'superseded');assert.equal(paper.deliveredAt,undefined);assert.deepEqual(paper.account,originalAccount);assert.deepEqual({food:mission.food,water:mission.waterLiters,x:body.x,z:body.z},paid);assert.doesNotThrow(()=>validateGameSave(gameSnapshot(g)));
 drive(g,180,()=>mission.phase==='completed');assert.equal(body.societyMissionId,undefined);assert.equal(paper.phase,'superseded');assert.deepEqual(paper.account,originalAccount);assert.equal(mission.food,0);assert.equal(mission.waterLiters,0);assert.doesNotThrow(()=>validateGameSave(gameSnapshot(g)));
});
