import test from'node:test';import assert from'node:assert/strict';import{readFileSync}from'node:fs';
import{decodeGame,encodeGame,validateGameSave}from'../src/game/persistence.ts';
import{beginHousingUpgrade,housingApproach}from'../src/game/housing.ts';import{workRuntime}from'../src/game/workRuntime.ts';
// PUBLIC generated controlled fixture from the actual failed combined cohort.
// This is not a private user's village. NativeV2 terrain/geometry/people are exact;
// the original test declared100logs40stone6fibre and140HP on the target old hut.
function load(name){const raw=JSON.parse(readFileSync(new URL(`fixtures/${name}`,import.meta.url),'utf8'));validateGameSave(raw);const g=decodeGame(raw);g.state.paused=false;return g;}
test('exact initial unreachable native hut holds an unpaid intent without reserving a builder or spending',()=>{
 const g=load('housing-unreachable-initial-v2.json'),b=g.state.buildings.find(b=>b.id===389),people=g.state.units.filter(u=>u.team===1&&u.type==='worker'),t=g.tribe(1),stock={wood:t.wood,stone:t.stone,fibre:t.items.plantFibre};
 assert.ok(people.length>0);assert.ok(people.every(u=>!housingApproach(g,u,b)),'the recorded hut is initially inaccessible, not sealed later');assert.equal(beginHousingUpgrade(g,b.id,1).accepted,true);g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.equal(b.renovation.paid,false);assert.equal(b.renovation.actorId,null);assert.deepEqual({wood:t.wood,stone:t.stone,fibre:t.items.plantFibre},stock);assert.equal(g.state.units.some(u=>u.housingWorkId===b.id||u.housingCargo?.buildingId===b.id),false);assert.ok(people.every(u=>workRuntime(g).activeJob(u.id)?.target!==b.id));validateGameSave(encodeGame(g));
});
test('an already-paid unreachable packet remains at its actual carrier with original escrow and zero artificial delivery',()=>{
 const g=load('housing-paid-blocked-v2.json'),b=g.state.buildings.find(b=>b.id===389),before=structuredClone(b.renovation),u=g.state.units.find(u=>u.id===before.actorId);assert.equal(before.paid,true);assert.equal(before.packet.wood,8);assert.equal(before.progress,0);assert.equal(housingApproach(g,u,b),null);g.step(.2);assert.deepEqual(g.simulationErrors,[]);const p=b.renovation;assert.equal(p.paid,true);assert.equal(p.actorId,u.id);for(const key of['quote','uncollected','delivered','packet','source'])assert.deepEqual(p[key],before[key]);assert.equal(p.progress,0);assert.equal(p.parcel.kind,'carrier');assert.equal(p.parcel.x,u.x);assert.equal(p.parcel.z,u.z);assert.deepEqual(u.housingCargo.materials,p.packet);validateGameSave(encodeGame(g));
});
