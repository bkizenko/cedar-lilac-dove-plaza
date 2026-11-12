import test from'node:test';import assert from'node:assert/strict';import{nativeDairyVillage}from'./helpers/native-dairy-village.mjs';import{decodeGame,encodeGame}from'../src/game/persistence.ts';import{enableWildCraft,wildStock}from'../src/game/wildCraft.ts';import{reserveSeconds}from'../src/game/settlement.ts';import{CEREAL_RULES}from'../src/game/cerealRules.ts';
/** Declared finite opening: one free native adult, finished natural hearth,
 * eight actual fish, two ready provisions, two sinew and finite fuel/water.
 * No locations, resources, food or progress are edited after execution starts. */
test('ordinary automatic meals keep the last free adult and kitchen ahead of discretionary sinew work when ready food is low',()=>{
 const f=nativeDairyVillage(),g=decodeGame(f.save),t=g.tribe(0),u=g.state.units.find(u=>u.id===f.worker);Object.assign(t,{food:10,foodLots:{provisions:2,fish:8},wood:100});t.survival.waterLiters=300;enableWildCraft(g);wildStock(g,0).sinew=2;g.state.autoWorkEnabled=true;u.order='idle';u.jobLock=false;
 assert.ok(reserveSeconds(g,0)<CEREAL_RULES.foodTargetSeconds);assert.equal(g.state.units.filter(u=>u.team===0&&u.hp>0&&!u.jobLock).length,1);let cooking;
 for(let n=0;n<30&&!cooking;n++){g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.ok(!g.state.ended);cooking=g.state.production?.projects.find(p=>p.team===0&&p.recipe==='cookFish'&&p.actorId===u.id);assert.equal(u.wildWorkId,undefined,'Last cook must not be reserved for discretionary cordage');}
 assert.ok(cooking,'Existing ordinary food review admits real paid fish cooking');assert.equal(wildStock(g,0).sinew,2);assert.equal(g.state.wildCraft.projects.length,0);assert.equal(cooking.recipe,'cookFish');assert.ok((t.foodLots.fish||0)<=4,'Four finite fish paid into the real cooking batch');
 for(let n=0;n<600&&!(g.state.wildCraft.metrics.produced.cordage||0)&&!['complete'].includes(cooking.phase);n++){g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.ok(!g.state.ended);if((t.foodLots?.cookedFish||0)>0)break;}
 assert.ok((t.foodLots?.cookedFish||0)>0,'Same actual cook physically finishes and delivers edible fish');assert.equal(wildStock(g,0).sinew,2);assert.equal(g.state.wildCraft.metrics.produced.cordage||0,0);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});

test('low reserves without a payable ordinary meal still admit real finite fat rendering ahead of cordage',()=>{
 const f=nativeDairyVillage(),g=decodeGame(f.save),t=g.tribe(0),u=g.state.units.find(u=>u.id===f.worker);Object.assign(t,{food:2,foodLots:{provisions:2},wood:100});t.survival.waterLiters=300;enableWildCraft(g);Object.assign(wildStock(g,0),{sinew:2,fat:4});g.state.autoWorkEnabled=true;u.order='idle';u.jobLock=false;
 assert.ok(reserveSeconds(g,0)<CEREAL_RULES.foodTargetSeconds);g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);const p=g.state.wildCraft.projects.find(p=>p.actorId===u.id);assert.equal(p?.recipe,'renderFat');assert.equal(wildStock(g,0).fat||0,0);assert.equal(wildStock(g,0).sinew,2);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
