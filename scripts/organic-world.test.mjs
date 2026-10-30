import test from 'node:test';import assert from 'node:assert/strict';
import {generateWorld,sampleHeight} from '../src/game/worldgen.ts';
import {Game} from '../src/game/sim.ts';import {encodeGame,decodeGame} from '../src/game/persistence.ts';
test('organic worlds are deterministic with viable dry settlements and finite woodland',()=>{
 for(const seed of [123456,98765,345,7719]){
 const a=generateWorld(seed,4),b=generateWorld(seed,4),old=generateWorld(seed,3);
 assert.deepEqual(a.heights,b.heights);assert.deepEqual(a.trees,b.trees);assert.notDeepEqual(a.heights,old.heights);
 assert.ok(a.camps.length>=3);assert.ok(a.heights.every(Number.isFinite));
 for(const c of a.camps)assert.ok(sampleHeight(a.heights,c.x,c.z)>a.waterY);
 assert.ok(a.trees.length>old.trees.length);assert.ok(a.trees.length<old.trees.length+600);
 assert.equal(new Set(a.trees.map(n=>n.id)).size,a.trees.length);
 }
});
test('saved old and organic landscapes retain exact terrain and trees',()=>{
 for(const version of [3,4]){const g=new Game();g.reset(123456,version);g.enterIsland();const copy=decodeGame(encodeGame(g));assert.deepEqual(copy.world.heights,g.world.heights);assert.deepEqual(copy.state.trees,g.state.trees);}
});
