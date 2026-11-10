import {prepareSocietyHandover}from'../src/game/communityHandover.ts';
import test from "node:test";
import assert from "node:assert/strict";
import { Game } from "../src/game/sim.ts";
import {
  beginHousingUpgrade,
  setHousingPaused,
  housingOwnerCanContinue,
  tickHousing,
  settleHousingHandover,
  retainHousingProject,
} from "../src/game/housing.ts";
import { validHousingState } from "../src/game/housingValidation.ts";
import { encodeGame, decodeGame, validateGameSave } from "../src/game/persistence.ts";
import { measureVillageWorkload } from "../src/game/villageWorkload.ts";
import { workRuntime } from "../src/game/workRuntime.ts";
import { answerEncounter } from "../src/game/encounters.ts";
import { HOUSING_MATERIAL_KEYS } from "../src/game/housingMaterials.ts";
function step(g) {
  if (g.state.encounter) answerEncounter(g, "observe");
  const time = g.state.time;
  g.step(0.2);
  assert.ok(g.state.time > time || g.state.encounter);
  assert.deepEqual(g.simulationErrors, []);
}
function drive(g, done) {
  for (let n = 0; n < 1800 && !done(); n++) step(g);
  if (!done())
    console.error(
      JSON.stringify({
        scope: "bounded route failure",
        time: g.state.time,
        homes: g.state.buildings.filter((b) => b.renovation),
        buildingGeometry:g.state.buildings.map(b=>({id:b.id,type:b.type,team:b.team,x:b.x,z:b.z,w:b.w,d:b.d,build:b.build,hp:b.hp})),
        units: g.state.units
          .map((u) => ({
            id: u.id,team:u.team,hp:u.hp,housingWorkId:u.housingWorkId,housingCargo:u.housingCargo,
            x: u.x,
            z: u.z,
            order: u.order,
            buildOrder: u.buildOrder,
            reason: u.workReason,
            queue: u.constructionQueue,
            job: u.job,
            jobLock: u.jobLock,
            age: u.age,
          })),
      }),
    );
  assert.ok(done(), "bounded real actor progress");
}
let raw, siteId, initial;
function fixture(team=0) {
  const g = new Game();
  g.reset(42, 2);
  g.enterIsland();
  g.state.conflict = "quiet";
  g.state.autoWorkEnabled = false;
  g.state.nightWork = true;
  const t = g.tribe(team);
  t.wood = 100;
  t.stone = 40;
  t.items = { ...(t.items || {}), plantFibre: 6 };
  const home = g.campOf(team),
    spot = Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6;
      return g.findDryFoundation(
        "hut",
        home.x + Math.cos(a) * 28,
        home.z + Math.sin(a) * 28,
        10,
        (x, z) =>
          Math.hypot(x - home.x, z - home.z) > 20 &&
          g.placementValid("hut", x, z, team) &&
          g.workBoard.connected(g, home.x, home.z, x, z),
      );
    }).find(Boolean);
  const existing=team===0?null:g.state.buildings.find(b=>b.team===team&&b.type==='hut'&&g.finished(b)&&g.state.units.some(u=>u.team===team&&u.type==='worker'&&(g.buildingWorkReached(u,b)||g.interactionSpot(u,b))));
  if(!existing)assert.ok(spot);
  const b = existing??g.makeBld("hut", spot.x, spot.z, team);
  b.hp = 140;
  if(!existing)g.state.buildings.push(b);
  g.state.walkDirty = true;
  siteId = b.id;
  initial = { wood: t.wood, stone: t.stone, fibre: 6 };
  assert.equal(beginHousingUpgrade(g, b.id,team).accepted, true);
  drive(g, () => team===0?!!g.state.units.find((u) => u.housingCargo?.buildingId === b.id):(b.renovation?.progress||0)>1);
  raw = encodeGame(g);
  validateGameSave(raw);
  return g;
}
function loaded() {
  if (!raw) fixture();
  const g = decodeGame(structuredClone(raw));
  g.state.paused = false;
  return g;
}
function ledger(p) {
  for (const k of HOUSING_MATERIAL_KEYS)
    assert.ok(Math.abs(p.quote[k] - p.uncollected[k] - p.delivered[k] - p.packet[k]) < 1e-7);
}
test("paid physical housing survives actor death and replacement completion with no second debit or duplicate claim", () => {
  const g = loaded(),
    b = g.state.buildings.find((b) => b.id === siteId),
    actor = g.state.units.find((u) => u.id === b.renovation.actorId),
    paid = { wood: g.tribe(0).wood, stone: g.tribe(0).stone, fibre: g.tribe(0).items.plantFibre };
  const at = { x: actor.x, z: actor.z },
    packet = { ...actor.housingCargo.materials };
  actor.hp = 0;
  step(g);
  assert.equal(b.renovation.actorId, null);
  assert.equal(b.renovation.parcel.kind, "ground");
  assert.deepEqual(b.renovation.packet, packet);
  assert.equal(b.renovation.parcel.x, at.x);
  ledger(b.renovation);
  validateGameSave(encodeGame(g));
  g.orderConstruction(b);
  drive(g, () => b.type === "house");
  assert.equal(b.hp, 140);
  assert.equal(b.housingReceipt.workSeconds, 48);
  assert.deepEqual(
    { wood: g.tribe(0).wood, stone: g.tribe(0).stone, fibre: g.tribe(0).items.plantFibre },
    paid,
  );
  assert.equal(
    g.state.units.filter((u) => u.housingWorkId === b.id || u.housingCargo?.buildingId === b.id)
      .length,
    0,
  );
  validateGameSave(encodeGame(g));
});
test("pause carrying physically drops one packet, forecast excludes paused work, strict reload resumes actual paid inputs", () => {
  let g = loaded(),
    b = g.state.buildings.find((b) => b.id === siteId);
  const before = JSON.stringify(g.state),
    forecast = measureVillageWorkload(g);
  assert.equal(JSON.stringify(g.state), before);
  assert.equal(forecast.tasks.filter((t) => t.id === `housing:${b.id}`).length, 1);
  const releasedActor=b.renovation.actorId;
  assert.equal(workRuntime(g).activeJob(releasedActor)?.kind,"construction","the serialized live claim is actually reconstructed before Pause");
  assert.equal(setHousingPaused(g, b.id, true), true);
  assert.equal(workRuntime(g).activeJob(releasedActor),undefined,"pause immediately releases even the claim rebuilt by load before any actor-loop audit");
  assert.equal(b.renovation.parcel.kind, "ground");
  assert.equal(b.renovation.actorId, null);
  const p = measureVillageWorkload(g).tasks.find((t) => t.id === `housing:${b.id}`);
  assert.equal(p.status, "paused");
  assert.deepEqual(p.actorIds, []);
  ledger(b.renovation);
  const paused = encodeGame(g);
  validateGameSave(paused);
  g = decodeGame(paused);
  b = g.state.buildings.find((b) => b.id === siteId);
  g.state.paused = false;
  assert.equal(setHousingPaused(g, b.id, false), true);
  drive(g, () => b.type === "house");
  assert.equal(b.hp, 140);
  assert.equal(g.tribe(0).items.plantFibre, 0);
});
test("strict validator rejects forged duplicate packet view or created material units", () => {
  const g = loaded(),
    b = g.state.buildings.find((b) => b.id === siteId),
    u = g.state.units.find((u) => u.housingCargo);
  u.housingCargo.materials = {
    ...u.housingCargo.materials,
    wood: u.housingCargo.materials.wood + 1,
  };
  assert.equal(validHousingState(g.state), false);
  u.housingCargo.materials = b.renovation.packet;
  b.renovation.delivered.stone += 1;
  assert.equal(validHousingState(g.state), false);
});
test("partial target capture preserves source/carrier owners and blocks foreign inputs; whole handover transfers each real bucket once", () => {
  const g = loaded(),
    b = g.state.buildings.find((b) => b.id === siteId),
    u = g.state.units.find((u) => u.id === b.renovation.actorId);
  b.team = 1;
  tickHousing(g, 0);
  assert.equal(b.renovation.sourceTeam, 0);
  assert.equal(b.renovation.packetTeam, 0);
  assert.equal(b.renovation.custodyTeam, 1);
  assert.equal(housingOwnerCanContinue(b.renovation, 1), false);
  ledger(b.renovation);
  assert.equal(validHousingState(g.state), true);
  const sites = new Set(g.state.buildings.filter((x) => x.team === 0).map((x) => x.id));
  sites.add(b.id);
  const people = new Set(g.state.units.filter((x) => x.team === 0).map((x) => x.id));
  for (const x of g.state.buildings) if (sites.has(x.id)) x.team = 1;
  for (const x of g.state.units) if (people.has(x.id)) x.team = 1;
  settleHousingHandover(g.state, 0, 1, true, sites, people);
  assert.equal(b.renovation.sourceTeam, 1);
  assert.equal(b.renovation.packetTeam, 1);
  assert.equal(housingOwnerCanContinue(b.renovation, 1), true);
  ledger(b.renovation);
  assert.equal(validHousingState(g.state), true);
});
test("removing a paid site retains all material buckets/progress without refunding communal inventory", () => {
  const g = loaded(),
    b = g.state.buildings.find((b) => b.id === siteId),
    stocks = { wood: g.tribe(0).wood, stone: g.tribe(0).stone, fibre: g.tribe(0).items.plantFibre };
  retainHousingProject(g, b, "Controlled removal boundary");
  assert.equal(b.renovation, undefined);
  assert.equal(g.state.retainedHousingProjects.length, 1);
  const p = g.state.retainedHousingProjects[0].project;
  ledger(p);
  assert.equal(p.actorId, null);
  assert.notEqual(p.parcel.kind, "carrier");
  assert.deepEqual(
    { wood: g.tribe(0).wood, stone: g.tribe(0).stone, fibre: g.tribe(0).items.plantFibre },
    stocks,
  );
  assert.equal(validHousingState(g.state), true);
  validateGameSave(encodeGame(g));
});

test("actual prepared whole-community handover commits paid working housing ownership and finishes the same physical project",()=>{
 const g=fixture(1),b=g.state.buildings.find(b=>b.id===siteId),before=structuredClone(b.renovation),actorId=before.actorId;
 const stocks={wood:g.tribe(0).wood+g.tribe(1).wood,stone:g.tribe(0).stone+g.tribe(1).stone,fibre:(g.tribe(0).items?.plantFibre||0)+(g.tribe(1).items?.plantFibre||0)};
 const plan=prepareSocietyHandover(g,1,0);assert.equal(plan.accepted,true,plan.reason);g.commitCommunityState(plan.state);const inherited=g.state.buildings.find(v=>v.id===b.id);assert.equal(inherited.team,0);assert.equal(inherited.renovation.custodyTeam,0);assert.equal(inherited.renovation.sourceTeam,0);assert.equal(inherited.renovation.packetTeam,0);assert.deepEqual(inherited.renovation.quote,before.quote);assert.deepEqual(inherited.renovation.packet,before.packet);assert.deepEqual(inherited.renovation.delivered,before.delivered);assert.equal(inherited.renovation.progress,before.progress);assert.equal(workRuntime(g).activeJob(actorId).owner,0);assert.deepEqual({wood:g.tribe(0).wood,stone:g.tribe(0).stone,fibre:g.tribe(0).items.plantFibre||0},stocks);validateGameSave(encodeGame(g));drive(g,()=>inherited.type==='house');assert.equal(inherited.housingReceipt.paidBy,1);assert.deepEqual(inherited.housingReceipt.materials,before.quote);assert.equal(inherited.hp,140);validateGameSave(encodeGame(g));
});
