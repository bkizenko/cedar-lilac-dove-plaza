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


function relationsFixture(){const f=fixture();f.g.state.diplomaticReports=undefined;f.g.state.diplomaticMessages=undefined;for(const u of f.g.state.units){u.jobLock=false;u.diplomaticAccount=undefined;}endowSettlementSites(f.g,0,1);endowSettlementSites(f.g,1,0);return f;}
function wait(g,predicate,limit=500){for(let i=0;i<limit*10&&!predicate();i++)step(g,.1);assert.ok(predicate(),JSON.stringify({time:g.state.time,messages:g.state.diplomaticMessages,missions:g.state.rivalMissions,actors:g.state.units.filter(u=>u.societyMissionId).map(u=>({id:u.id,x:u.x,z:u.z,hp:u.hp,order:u.order,reason:u.workReason}))}));}
function homeSpot(g,u,team){const h=g.state.buildings.find(b=>b.team===team&&b.type==='townhall');const p=g.interactionSpot(u,h);assert.ok(p);return p;}
function prepareComplaint(withGuard=false){const {g,builder}=relationsFixture(),observer=g.state.units.find(u=>u.team===1);const guard=withGuard?g.spawnUnit('spearman',210,25,0):undefined;if(guard){guard.order='hold';guard.jobLock=true;}paidPost(g,builder);const p=homeSpot(g,builder,0);walk(g,builder.id,p.x,p.z);walk(g,observer.id,100,12);wait(g,()=>!!g.state.diplomaticMessages?.some(m=>m.kind==='frontier'));assert.equal(knownDiplomaticRelation(g,1).known,false);const row=g.snapshot().tribes.find(t=>t.id===1);assert.equal(row.relationKnown,false);assert.equal(row.tension,0);assert.ok(g.tribe(1).tension>=.28);const m=g.state.diplomaticMessages.find(m=>m.kind==='frontier');const home=homeSpot(g,observer,1);walk(g,observer.id,home.x,home.z);wait(g,()=>m.missionId!==undefined||observer.order==='hold',20);if(m.missionId===undefined)assert.equal(dispatchSocietyMessage(g,m.id),true,JSON.stringify({m,observer:{x:observer.x,z:observer.z,order:observer.order,hp:observer.hp,jobLock:observer.jobLock},missions:g.state.rivalMissions}));const carrier=g.state.units.find(u=>u.id===m.carrierId);return {g,builder,observer:carrier,m,guard};}

test('an unseen frontier objection travels with a real paid speaker, saves in transit, and updates only dated known relations at actual contact',()=>{
 let {g,m,observer}=prepareComplaint();const packet=structuredClone(m.account),mission=g.state.rivalMissions.find(p=>p.id===m.missionId),paid={food:mission.food,water:mission.waterLiters};assert.ok(paid.food>0&&paid.water>0);
 wait(g,()=>observer.x>45);const account=structuredClone(observer.diplomaticAccount);assert.ok(account);assert.equal(knownDiplomaticRelation(g,1).known,false);
 g.tribe(1).trust=.01;g.tribe(1).tension=.01;
 const id=m.id,actorId=observer.id,at={x:observer.x,z:observer.z};g=restored(g);m=g.state.diplomaticMessages.find(p=>p.id===id);observer=g.state.units.find(p=>p.id===actorId);assert.deepEqual({x:observer.x,z:observer.z},at);assert.deepEqual(m.account,packet);assert.equal(knownDiplomaticRelation(g,1).known,false);
 wait(g,()=>m.phase==='delivered');assert.ok(g.state.units.some(u=>u.team===0&&Math.hypot(u.x-observer.x,u.z-observer.z)<=12));
 const report=knownDiplomaticRelation(g,1);assert.equal(report.known,true);assert.ok(report.report.observedAt<=m.deliveredAt);assert.notEqual(report.trust,.01);assert.deepEqual(m.account,packet);assert.equal(g.tribe(1).hostile,false,'a complaint never signs or declares a treaty');
 const before=structuredClone(report.report);g.tribe(1).trust=.99;g.tribe(1).tension=.99;step(g,2.2);assert.deepEqual(knownDiplomaticRelation(g,1).report,before);
 wait(g,()=>g.state.rivalMissions.find(p=>p.id===mission.id).phase==='completed');step(g,181);assert.equal(knownDiplomaticRelation(g,1).stale,true);
 assert.deepEqual(decodeGame(encodeGame(g)).state.diplomaticReports,g.state.diplomaticReports);
 results.push({scenario:'paid physical frontier complaint',paidPack:paid,sourceAccount:account,deliveredAt:m.deliveredAt,actorId,staleAfterSeconds:180});
});

test('a dead or captured speaker cannot publish its undelivered account',()=>{
 let {g,m,observer}=prepareComplaint();wait(g,()=>observer.x>45);observer.hp=0;step(g,2.2);assert.equal(m.phase,'lost');assert.equal(knownDiplomaticRelation(g,1).known,false);
 // A declared initial guard physically intercepts the same messenger and
 // uses the real surrender/custody API; no prisoner record is fabricated.
 let guard;({g,m,observer,guard}=prepareComplaint(true));wait(g,()=>observer.x>45);g.clearSelect();g.selectEntity(guard);g.issueMove(100,0);wait(g,()=>Math.hypot(guard.x-observer.x,guard.z-observer.z)<=5.5,80);g.haltSelected();const surrendered=acceptPrisonerSurrender(g,observer,0);assert.equal(surrendered.accepted,true,surrendered.reason);step(g,.1);assert.equal(m.phase,'carried');assert.equal(g.state.diplomaticReports?.some(r=>r.via==='message')||false,false);assert.ok(observer.prisoner);assert.ok(g.state.units.includes(observer));assert.doesNotThrow(()=>decodeGame(encodeGame(g)));assert.deepEqual(m.account,g.state.diplomaticMessages.find(p=>p.id===m.id).account);
 results.push({scenario:'speaker death loses message; captivity retains it without publication'});
});

test('the same20food compact proposal departs despite unseen trust differences and is accepted or returned only at the real meeting',()=>{
 const {g,builder}=relationsFixture(),startFood=g.tribe(0).food;const p=homeSpot(g,builder,0);walk(g,builder.id,p.x,p.z);const atHome=JSON.parse(JSON.stringify(encodeGame(g)));
 const branches=[];
 for(const trust of [.8,.1]){
  let copy=decodeGame(atHome);ground(copy);const u=copy.state.units.find(p=>p.id===builder.id);u.order='hold';copy.tribe(1).trust=trust;
  const food=copy.tribe(0).food;assert.equal(copy.offerCompact(1),true);assert.equal(food-copy.tribe(0).food,20);assert.equal(u.carry,20);assert.equal(copy.tribe(1).compactUntil||0,0);assert.equal(knownDiplomaticRelation(copy,1).known,false);
  wait(copy,()=>u.envoy?.phase==='return');const accepted=trust>.35;assert.equal(u.carry,accepted?0:20);assert.equal((copy.tribe(1).compactUntil||0)>copy.state.time,accepted);assert.equal(knownDiplomaticRelation(copy,1).known,true);
  wait(copy,()=>!u.envoy);assert.equal(u.carry,0);assert.ok(copy.tribe(0).food<=food-(accepted?20:0));branches.push({trust,departurePaid20:true,accepted,physicallyReturned:true});
 }
 results.push({scenario:'compact local acceptance A/B',branches});
});

test('peace terms are not exposed by a remote decision; a provisioned messenger must actually deliver them',()=>{
 const {g,builder}=relationsFixture();g.tribe(1).hostile=true;g.tribe(1).nextPeaceOffer=0;g.state.observedSettlements=g.state.observedSettlements.filter(m=>m.observer!==0);
 // Initial military endowment establishes the pre-existing pressure scenario.
 for(let i=0;i<30;i++){const u=g.spawnUnit('spearman',210+i%3,10+Math.floor(i/3),0);u.order='hold';}
 tickPeace(g);assert.equal(g.tribe(1).peaceOffer,undefined);const m=g.state.diplomaticMessages.find(p=>p.kind==='peaceOffer');assert.ok(m);assert.equal(knownDiplomaticRelation(g,1).known,false);
 const person=g.state.units.find(u=>u.team===1),p=homeSpot(g,person,1);walk(g,person.id,p.x,p.z);const dest=homeSpot(g,builder,0);walk(g,builder.id,dest.x,dest.z);assert.equal(dispatchSocietyMessage(g,m.id),true);
 wait(g,()=>!!g.tribe(1).peaceOffer);assert.equal(m.phase,'delivered');assert.equal(g.tribe(1).hostile,true,'delivering terms cannot silently agree a truce');assert.ok(g.tribe(1).peaceOffer.expires>g.state.time);assert.equal(knownDiplomaticRelation(g,1).hostile,true);
 const raw=encodeGame(g);for(const mutate of [m=>m.account.observedAt=g.state.time+1,m=>m.account.trust=2,m=>m.extra='hidden',m=>m.carrierId=raw.state.nextId,m=>m.kind='truceNow']){const bad=structuredClone(raw);mutate(bad.state.diplomaticMessages[0]);assert.throws(()=>decodeGame(bad));}
 assert.doesNotThrow(()=>decodeGame(raw));rejectPeace(g,1);assert.equal(g.tribe(1).peaceOffer,undefined);assert.ok(g.tribe(1).nextPeaceOffer>=g.state.time+300);wait(g,()=>g.state.rivalMissions.find(p=>p.id===m.missionId).phase==='completed');results.push({scenario:'paid delivered peace terms',term:m.term,deliveredAt:m.deliveredAt,strictCorruptionsRejected:5});
});

test('a real blocked route returns the same speaker and packet; restoring the route permits a second paid delivery attempt',()=>{
 const {g,m,observer}=prepareComplaint();wait(g,()=>observer.x>35);const firstId=m.missionId,packet=structuredClone(m.account);
 const cells=Math.sqrt(g.world.heights.length)-1;
 for(let z=0;z<=cells;z++)for(let x=0;x<=cells;x++){const wx=x/cells*g.world.size-g.world.size/2;if(wx>100&&wx<125)g.world.heights[z*(cells+1)+x]=g.world.waterY-2;}
 g.rebuildWalk();wait(g,()=>g.state.rivalMissions.find(p=>p.id===firstId).phase==='completed');
 assert.equal(m.phase,'carried');assert.equal(m.missionId,undefined);assert.equal(m.carrierId,observer.id);assert.equal(knownDiplomaticRelation(g,1).known,false);assert.deepEqual(m.account,packet);
 const oldMission=g.state.rivalMissions.find(p=>p.id===firstId);assert.equal(oldMission.food,0);assert.equal(oldMission.waterLiters,0);
 g.world.heights.fill(4);g.rebuildWalk();assert.equal(dispatchSocietyMessage(g,m.id),true);assert.notEqual(m.missionId,firstId);wait(g,()=>m.phase==='delivered');assert.deepEqual(m.account,packet);assert.equal(knownDiplomaticRelation(g,1).known,true);
 results.push({scenario:'blocked physical message route and paid retry',firstMissionId:firstId,retryMissionId:m.missionId,sameCarrierId:observer.id,packetUnchanged:true});
});

test('the player retains its own legal agreements and witnessed attacks without inventing private trust',()=>{
 const {g}=relationsFixture();assert.equal(knownDiplomaticRelation(g,1).known,false);g.makeHostile(1);assert.equal(knownDiplomaticRelation(g,1).hostile,true);g.agreeTruce(1);assert.equal(knownDiplomaticRelation(g,1).hostile,false);assert.equal(knownDiplomaticRelation(g,1).trust,undefined);
 const legal=structuredClone(knownDiplomaticRelation(g,1).report);g.tribe(1).trust=.01;g.tribe(1).tension=1;assert.deepEqual(knownDiplomaticRelation(g,1).report,legal);
 const raw=encodeGame(g);delete raw.state.diplomaticReports;delete raw.state.diplomaticMessages;for(const u of raw.state.units)delete u.diplomaticAccount;raw.state.tribes[1].peaceTerm='whitePeace';
 const loaded=decodeGame(raw);assert.equal(loaded.tribe(1).peaceTerm,'whitePeace');assert.equal(knownDiplomaticRelation(loaded,1).known,true);assert.equal(knownDiplomaticRelation(loaded,1).hostile,false);assert.equal(knownDiplomaticRelation(loaded,1).trust,undefined);
 for(const team of[0,1])for(const key of['food','wood','stone'])assert.equal(loaded.tribe(team)[key],raw.state.tribes[team][key]);
 results.push({scenario:'known own legal status; conservative legacy private mood; inventories retained'});
});

test.after(()=>{if(process.env.DIPLOMACY_REPORT)writeFileSync(process.env.DIPLOMACY_REPORT,JSON.stringify({baseline:'79d6148',scope:'Physical player-facing diplomatic information; not full all-pair knowledge qualification',results},null,2));});
