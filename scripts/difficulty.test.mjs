import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {DIFFICULTIES} from '../src/game/difficulty.ts';
import {foodDemand} from '../src/game/settlement.ts';import {foodSpoilage} from '../src/game/pantry.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
test('six difficulties scale real food needs, spoilage and incoming damage; legacy default is neutral',()=>{
 const g=new Game();g.reset(123456);g.enterIsland();const demand=foodDemand(g),spoil=foodSpoilage(g);
 assert.equal(Object.keys(DIFFICULTIES).length,6);
 for(const [id,p] of Object.entries(DIFFICULTIES)){
 g.state.difficulty=id;assert.ok(Math.abs(foodDemand(g)-demand*p.food)<1e-8);assert.ok(Math.abs(foodSpoilage(g)-spoil*p.spoil)<1e-8);
 const b=g.makeBld('hut',0,0,0);const hp=b.hp;g.applyCombatDamage(3,b,10);assert.equal(b.hp,hp-10*p.damage);
 }
 delete g.state.difficulty;assert.equal(foodDemand(g),demand);
});
test('difficulty survives saves without replacing people or terrain; invalid presets are rejected',()=>{
 const g=new Game();g.reset(123456);g.enterIsland();g.state.difficulty='survival';const raw=encodeGame(g),copy=decodeGame(raw);
 assert.equal(copy.state.difficulty,'survival');assert.deepEqual(copy.world.heights,g.world.heights);assert.equal(copy.state.units.length,g.state.units.length);
 raw.state.difficulty='impossible';assert.throws(()=>decodeGame(raw));raw.state.difficulty='toString';assert.throws(()=>decodeGame(raw));
});
