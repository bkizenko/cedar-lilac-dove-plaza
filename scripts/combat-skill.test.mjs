import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {combatLevel,combatDefence,combatPractice,combatRank} from '../src/game/warfare.ts';
function world(){const g=new Game();g.reset(4242,3);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[];g.vision.fill(2);g.rebuildWalk();return g;}
test('practice level and defence are bounded and rise with xp',()=>{
 assert.equal(combatLevel({combatXP:0}),0);assert.equal(combatDefence({}),1);
 assert.ok(combatDefence({combatXP:150})>combatDefence({combatXP:20}));assert.ok(combatDefence({combatXP:1e9})<=1.15+1e-9);
 assert.ok(combatPractice({combatXP:1e9})<=1.25+1e-9);assert.equal(combatRank({combatXP:150}),'Hardened');
});
test('a veteran takes less damage than a green fighter ',()=>{
 const g=world(),a=g.spawnUnit('spearman',0,0,0),b=g.spawnUnit('spearman',5,0,0);a.militia=b.militia=true;a.combatXP=0;b.combatXP=150;a.hp=b.hp=a.maxHp=b.maxHp=100;
 g.applyCombatDamage(1,a,10);g.applyCombatDamage(1,b,10);
 assert.ok(b.hp>a.hp,'veteran lost less');assert.ok(b.combatXP<=150);
});
