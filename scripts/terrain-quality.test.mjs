import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {generateWorld} from '../src/game/worldgen.ts';import {terrainMetrics} from '../src/game/terrainMetrics.ts';
import {Game} from '../src/game/sim.ts';import {dryTreeRoot} from '../src/game/hydrology.ts';import {encodeGame,decodeGame} from '../src/game/persistence.ts';
test('v8 roots stay above flood water and land has broad relief with gentle hiking surfaces across seeds/layouts',()=>{
 const report=[];
 for(const seed of [42,9876,123456])for(const layout of ['pangaea','continents','archipelago']){
  const w=generateWorld(seed,8,{layout,size:1040}),m=terrainMetrics(w);report.push({seed,layout,...m});
  assert.equal(m.wetTreeRoots,0,`${seed}/${layout}: roots`);assert.ok(m.trees>1500);assert.ok(m.gentleFraction>.55,`${seed}/${layout}: gentle ground ${m.gentleFraction}`);assert.ok(m.rollingFraction>.2,`${seed}/${layout}: relief`);
  assert.ok(m.highElevation-m.medianElevation>4);assert.ok(w.rivers.length>=2);assert.ok(w.features.some(f=>f.kind==='lake'));
 }
 console.log(JSON.stringify(report));
});
test('v7 terrain remains byte-identical and v8 saves reconstruct the exact generated world',()=>{
 const old=generateWorld(42,7,{layout:'archipelago',size:1040});assert.equal(createHash('sha256').update(Buffer.from(old.heights.buffer)).digest('hex'),'1fc40c9662abb6bed84355efec959f7f4d04115a2913cf04fff5872191e37921');
 const g=new Game();g.reset(42,8,{layout:'archipelago',size:1040});g.enterIsland();const copy=decodeGame(encodeGame(g));assert.deepEqual(copy.world.heights,g.world.heights);assert.deepEqual(copy.state.trees,g.state.trees);assert.equal(copy.state.worldgenVersion,8);assert.ok(g.state.trees.every(t=>dryTreeRoot((x,z)=>g.height(x,z),t.x,t.z,g.world.baseWaterY)),'supplemental starting trees also remain flood-safe');
});
test('ordinary building footprints require flood-safe ground, while existing buildings are unchanged',()=>{
 const g=new Game();g.reset(42);const base=g.world.baseWaterY;g.height=()=>base+.7;assert.equal(g.dryFoundation('hut',0,0),false);g.height=()=>base+1;assert.equal(g.dryFoundation('hut',0,0),true);
 const before=JSON.stringify(g.state.buildings);g.height=(x,z)=>Math.abs(x)>2?base-.1:base+2;assert.equal(g.dryFoundation('hut',0,0),false);assert.equal(JSON.stringify(g.state.buildings),before);
});
test('random layout round trips preserve coastline under every saved tree and building; affected v7 saves recover',()=>{
 for(const version of [7,8])for(const seed of [42,9876,123456]){
  const g=new Game();g.reset(seed,version,{size:1040,layout:'random'});g.enterIsland();const copy=decodeGame(encodeGame(g));
  assert.deepEqual(copy.world.heights,g.world.heights,`${version}/${seed}: terrain`);assert.deepEqual(copy.state.buildings,JSON.parse(JSON.stringify(g.state.buildings)));assert.deepEqual(copy.state.trees,g.state.trees);
 }
});
