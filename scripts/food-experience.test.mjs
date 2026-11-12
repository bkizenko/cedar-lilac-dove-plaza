import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {decodeGame,encodeGame} from '../src/game/persistence.ts';
import {foodInventory,consumeAndSpoilFood,receiveFood} from '../src/game/pantry.ts';
import {FOOD_TASTE,FOOD_EXPERIENCE_RULES,foodExperienceReport} from '../src/game/foodExperience.ts';
import {villageAppeal} from '../src/game/migration.ts';
import {PRODUCTION_RECIPES} from '../src/game/production.ts';
const terrain=g=>createHash('sha256').update(JSON.stringify({heights:Array.from(g.world.heights),rivers:g.world.rivers,features:g.world.features})).digest('hex');
let opening;
function fixture(kind='provisions'){
 opening??=nativeDairyVillage();const g=decodeGame(opening.save),t=g.tribe(0);t.food=100;t.foodLots={[kind]:100};delete t.foodExperience;return g;
}
test('actual nourishment eaten earns taste, never delivered stock or spoilage; bread retains its separate nutrition',()=>{
 const g=fixture('bread'),t=g.tribe(0);receiveFood(g,0,4,'meat','production');assert.equal(t.foodExperience,undefined);
 t.food=100;t.foodLots={bread:100};const before=foodInventory(t).bread;
 assert.equal(consumeAndSpoilFood(g,0,1,1),0);const e=t.foodExperience;
 assert.ok(Math.abs(e.nourishmentEaten-1)<1e-10);assert.ok(Math.abs(e.hedons-FOOD_TASTE.bread)<1e-10);assert.equal(e.rawUnits,0);
 assert.ok(before-foodInventory(t).bread>1/1.2,'spoilage is debited separately, without earning pleasure');
 const prior=structuredClone(e);consumeAndSpoilFood(g,0,0,10);assert.deepEqual(e,prior,'zero meal requirement/spoilage creates no meal credit');
});
test('tunable taste rewards slower bread separately from porridge without changing recipes or emergency nutrition',()=>{
 const bread=fixture('bread'),porridge=fixture('porridge');consumeAndSpoilFood(bread,0,1,180);consumeAndSpoilFood(porridge,0,1,180);
 assert.ok(FOOD_TASTE.bread>FOOD_TASTE.porridge);assert.ok(foodExperienceReport(bread.tribe(0),bread.state.time).mood>foodExperienceReport(porridge.tribe(0),porridge.state.time).mood);
 assert.ok(PRODUCTION_RECIPES.bakeBread||Object.values(PRODUCTION_RECIPES).some(r=>r.foodKind==='bread'));
 const raw=fixture('grain');raw.tribe(0).food=10;raw.tribe(0).foodLots={grain:10};consumeAndSpoilFood(raw,0,.1,1);assert.ok(Math.abs(raw.tribe(0).foodExperience.nourishmentEaten-.1)<1e-10);assert.equal(raw.tribe(0).foodExperience.hedons,0);assert.ok(raw.tribe(0).foodExperience.rawUnits>.99);
 const fish=fixture('fish');consumeAndSpoilFood(fish,0,.1,1);assert.ok(Math.abs(fish.tribe(0).foodExperience.hedons-.1*FOOD_TASTE.fish)<1e-10,'raw fish uses its configured taste on the emergency path too');
});
test('food mood affects attraction only within its bound, decays, and read models never mutate state',()=>{
 const g=fixture('meat'),t=g.tribe(0),baseline=villageAppeal(g);consumeAndSpoilFood(g,0,.01,180);
 const e=t.foodExperience;assert.ok(foodExperienceReport(t,g.state.time).mood>0);
 const withMood=villageAppeal(g);delete t.foodExperience;const without=villageAppeal(g);t.foodExperience=e;
 assert.ok(withMood>without);assert.ok(withMood-without<=FOOD_EXPERIENCE_RULES.appealWeight);assert.ok(baseline>=0);
 const json=JSON.stringify(encodeGame(g));foodExperienceReport(t,g.state.time);villageAppeal(g);assert.equal(JSON.stringify(encodeGame(g)),json);
 assert.ok(Math.abs(foodExperienceReport(t,g.state.time+1800).mood)<.0001);
});
test('legacy saves invent no meals, strict saves retain actual evidence and reject impossible mood or future credit',()=>{
 const g=fixture();assert.equal(decodeGame(encodeGame(g)).tribe(0).foodExperience,undefined);consumeAndSpoilFood(g,0,1,1);
 assert.deepEqual(decodeGame(encodeGame(g)).tribe(0).foodExperience,g.tribe(0).foodExperience);
 for(const mutate of [e=>e.version=2,e=>e.lastAt+=100,e=>e.hedons=-1,e=>e.recentSatiety=2,e=>e.recentPleasure=11,e=>e.rawUnits=Infinity,e=>{e.hedons=100;e.nourishmentEaten=1;},e=>{e.nourishmentEaten=0;e.hedons=0;e.rawUnits=0;e.recentSatiety=1;e.recentPleasure=10;}]){const save=structuredClone(encodeGame(g));mutate(save.state.tribes[0].foodExperience);assert.throws(()=>decodeGame(save));}
});
test('ordinary native simulation consumes real finite food and persists its exact meal memory without terrain changes',()=>{
 let g=fixture('bread');const hash=terrain(g),before=g.tribe(0).food;
 for(let i=0;i<25;i++){g.state.paused=false;g.step(.2);}
 assert.deepEqual(g.simulationErrors,[]);assert.ok(g.tribe(0).food<before);assert.ok(g.tribe(0).foodExperience.nourishmentEaten>0);assert.ok(g.tribe(0).foodExperience.hedons>0);assert.equal(terrain(g),hash);
 const e=structuredClone(g.tribe(0).foodExperience);g=decodeGame(encodeGame(g));assert.deepEqual(g.tribe(0).foodExperience,e);assert.equal(terrain(g),hash);
});
