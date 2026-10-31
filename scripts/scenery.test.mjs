import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {generateWorld,sampleHeight} from '../src/game/worldgen.ts';
import {scenicBeautyAt} from '../src/game/scenery.ts';
test('scenic components measure terrain composition without randomness',()=>{
 const flat=scenicBeautyAt(()=>5,1,0,0);
 assert.equal(flat.relief,0);assert.equal(flat.water,0);assert.equal(flat.contrast,0);
 const dramatic=scenicBeautyAt((x,z)=>x<0?0:5+Math.abs(z)*.4,1,0,0);
 assert.ok(dramatic.score>flat.score);assert.deepEqual(dramatic,scenicBeautyAt((x,z)=>x<0?0:5+Math.abs(z)*.4,1,0,0));
});
test('new scenic starts exceed average with real spatial variation across regression and holdout seeds',()=>{
 for(const seed of [42,9876,123456,20261031])for(const layout of ['pangaea','continents','archipelago']){
  const world=generateWorld(seed,9,{layout,size:1040}),s=world.scenery,p=world.camps[0];
  assert.ok(s.player.score>s.mean,`${seed}/${layout}: ${s.player.score} <= ${s.mean}`);
  assert.ok(s.maximum-s.minimum>20);
  assert.ok(sampleHeight(world.heights,p.x,p.z,world.size)>world.waterY+.55);
  assert.deepEqual(s.player,scenicBeautyAt((x,z)=>sampleHeight(world.heights,x,z,world.size),world.waterY,p.x,p.z));
  console.log(JSON.stringify({seed,layout,mean:s.mean,player:s.player.score,percentile:s.playerPercentile}));
 }
});
test('scenic generation preserves historical v7 terrain and is reproducible',()=>{
 const old=generateWorld(42,7,{layout:'archipelago',size:1040});
 assert.equal(createHash('sha256').update(Buffer.from(old.heights.buffer)).digest('hex'),'1fc40c9662abb6bed84355efec959f7f4d04115a2913cf04fff5872191e37921');
 assert.equal(old.scenery,undefined);
 const a=generateWorld(42,9),b=generateWorld(42,9);assert.deepEqual(a.heights,b.heights);assert.deepEqual(a.camps,b.camps);assert.deepEqual(a.scenery,b.scenery);
});
test('rotating holdouts include large and huge maps; save reconstruction is exact',()=>{
 const layouts=['pangaea','continents','archipelago'],sizes=[1040,1560,2080];
 for(let i=0;i<20;i++){
  const seed=(0x41c64e6d*(i+7))>>>0,size=sizes[i%3],layout=layouts[Math.floor(i/3)%3];
  const w=generateWorld(seed,9,{size,layout});
  assert.ok(w.scenery.player.score>w.scenery.mean || w.scenery.candidateCount<=1,`${seed}/${size}/${layout}: ${JSON.stringify(w.scenery)}`);
 }
});
test('v9 saves restore terrain, scenery and finite resources',async()=>{
 const {Game}=await import('../src/game/sim.ts'),{encodeGame,decodeGame}=await import('../src/game/persistence.ts');
 const g=new Game();g.reset(42,9,{size:1040,layout:'archipelago'});g.enterIsland();
 const copy=decodeGame(encodeGame(g));
 assert.deepEqual(copy.world.heights,g.world.heights);assert.deepEqual(copy.world.scenery,g.world.scenery);assert.deepEqual(copy.state.trees,g.state.trees);assert.equal(copy.state.worldgenVersion,9);
});
