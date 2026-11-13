import test from 'node:test';import assert from 'node:assert/strict';
import{readyExpeditionForageKind,addExpeditionForage,EXPEDITION_FOOD_CATALOGUE}from'../src/game/expeditionProvisions.ts';
import{packedFoodNourishment}from'../src/game/packedFoodCustody.ts';
test('raw wild cereal cannot enter a ready journey packet by being renamed berries or provisions',()=>{
 assert.equal(readyExpeditionForageKind('wild-grain'),null);
 const u={team:0,expedition:{food:2,foodUsed:0,foodCustody:{version:1,legacyUnits:2,lots:[]},returning:false,forage:0}},g={state:{time:10}};
 const before=JSON.stringify(u);assert.equal(addExpeditionForage(g,u,1,4,5,'grain'),false);assert.equal(JSON.stringify(u),before);
});
test('actual ready forage keeps pulse/tuber identity and source rather than upgrading unknown legacy food',()=>{
 const u={team:0,expedition:{food:2,foodUsed:0,foodCustody:{version:1,legacyUnits:2,lots:[]},returning:false,forage:0}},g={state:{time:10}};
 for(const species of['wild-pulses','wild-tubers'])assert.equal(addExpeditionForage(g,u,1,4,5,readyExpeditionForageKind(species)),true);
 assert.equal(u.expedition.foodCustody.legacyUnits,2);assert.deepEqual(u.expedition.foodCustody.lots.map(l=>l.kind),['pulses','tubers']);assert.ok(u.expedition.foodCustody.lots.every(l=>l.origin.anchorKind==='forage'&&l.origin.loadedAt===10));assert.equal(packedFoodNourishment(u.expedition,EXPEDITION_FOOD_CATALOGUE),4);
});
