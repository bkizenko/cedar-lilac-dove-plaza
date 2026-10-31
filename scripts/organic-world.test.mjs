import test from 'node:test';import {createHash} from 'node:crypto';import assert from 'node:assert/strict';
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
 for(const version of [3,4,5,6]){const g=new Game();g.reset(123456,version);g.enterIsland();const copy=decodeGame(encodeGame(g));assert.deepEqual(copy.world.heights,g.world.heights);assert.deepEqual(copy.state.trees,g.state.trees);}
});

test('new tributaries join the main channel exactly and remain narrower',()=>{
 for(const seed of [123456,98765,345,7719]){
  const w=generateWorld(seed,5),trunk=w.rivers[0];
  assert.deepEqual(w.heights,generateWorld(seed,5).heights);
  for(const branch of w.rivers.slice(1)){
   const end=branch.pts.at(-1);assert.ok(trunk.pts.some(p=>Math.hypot(p.x-end.x,p.z-end.z)<1e-8));
   assert.ok(branch.w<trunk.w);
  }
  for(const camp of w.camps)assert.ok(sampleHeight(w.heights,camp.x,camp.z)>w.waterY);
 }
});

test('new coast profiles vary orientation, retain viable camps and bound woodland instances',()=>{
 for(const seed of [123456,98765,345,7719]){
  const w=generateWorld(seed,6),copy=generateWorld(seed,6),old=generateWorld(seed,5);
  assert.deepEqual(w.heights,copy.heights);assert.deepEqual(w.trees,copy.trees);
  assert.notDeepEqual(w.heights,old.heights);assert.ok(w.heights.every(Number.isFinite));
  assert.ok(w.trees.length>200&&w.trees.length<1200);
  assert.equal(new Set(w.trees.map(n=>n.id)).size,w.trees.length);
  for(const c of w.camps)assert.ok(sampleHeight(w.heights,c.x,c.z)>w.waterY);
  const trunk=w.rivers[0];for(const branch of w.rivers.slice(1))assert.ok(trunk.pts.some(p=>Math.hypot(p.x-branch.pts.at(-1).x,p.z-branch.pts.at(-1).z)<1e-8));
 }
});
test('new generator leaves the previous landscape bytes and trees unchanged',()=>{
 const w=generateWorld(123456,5);
 assert.equal(createHash('sha256').update(new Uint8Array(w.heights.buffer)).digest('hex'),'cc90d16da04d7c1d61c14053ff70837346a7e47305bae3630803a377a207fb37');
 assert.equal(w.trees.length,612);
});
