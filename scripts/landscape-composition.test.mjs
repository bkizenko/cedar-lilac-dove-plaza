import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {generateWorld,sampleHeight} from '../src/game/worldgen.ts';import {terrainMetrics} from '../src/game/terrainMetrics.ts';
import {landforms} from '../src/game/landforms.ts';import {LANDSCAPE_RULES} from '../src/game/regionalGeography.ts';
test('v10 composes relief and drainage for each substantial landmass, with safe scenic openings',()=>{
 let ordinary=0,dramatic=0;
 for(const seed of [42,9876,123456,20261031])for(const layout of ['pangaea','continents','archipelago']){
  const w=generateWorld(seed,10,{size:1040,layout}),m=w.landscape,t=terrainMetrics(w),land=landforms(seed,w.options,true);
  assert.ok(m.substantialLandmassCount>0);assert.equal(w.rivers.length,m.substantialLandmassCount);
  assert.equal(w.features.filter(f=>f.kind==='mountain-range').length,m.substantialLandmassCount);
  for(const r of m.regions){assert.ok(r.areaSquareMeters>=LANDSCAPE_RULES.substantialAreaSquareMeters);assert.ok(r.drainageLengthMeters>0);if(r.dramatic)dramatic++;else ordinary++;}
  for(const river of w.rivers){const end=river.pts.at(-1);assert.ok(land.distance(end.x,end.z)<0,'drainage reaches sea');}
  assert.equal(t.wetTreeRoots,0);assert.ok(t.gentleFraction>.5,`${seed}/${layout}: ${t.gentleFraction}`);
  assert.ok(w.scenery.playerAboveAverage||w.scenery.candidateCount<=1);
  const home=w.camps[0];assert.ok(sampleHeight(w.heights,home.x,home.z,w.size)>w.waterY+.55);
  console.log(JSON.stringify({seed,layout,regions:m.substantialLandmassCount,dramatic:m.dramaticRegionCount,gentle:t.gentleFraction,beauty:w.scenery.player.score}));
 }
 assert.ok(ordinary>dramatic&&dramatic>0,'spectacular regions are rare rather than universal');
});
test('v10 is deterministic and does not change historical v9 terrain',()=>{
 const a=generateWorld(42,10),b=generateWorld(42,10);assert.deepEqual(a.heights,b.heights);assert.deepEqual(a.landscape,b.landscape);
 const old=generateWorld(42,7,{layout:'archipelago',size:1040});assert.equal(createHash('sha256').update(Buffer.from(old.heights.buffer)).digest('hex'),'1fc40c9662abb6bed84355efec959f7f4d04115a2913cf04fff5872191e37921');
 const v9=generateWorld(42,9,{layout:'archipelago',size:1040});
 assert.equal(createHash('sha256').update(Buffer.from(v9.heights.buffer)).digest('hex'),'c7da4d6a456ec261d6804c0696fa25f0fa4bd90746cc9a05100a079cb2474f59');
 assert.equal(v9.landscape,undefined);
});
test('large and huge v10 landscapes retain safe openings and drainage on holdout seeds',()=>{
 for(const size of [1560,2080])for(const layout of ['pangaea','continents','archipelago']){
  const w=generateWorld(981723+size,10,{size,layout}),t=terrainMetrics(w);
  assert.ok(w.landscape.substantialLandmassCount>0);assert.ok(t.gentleFraction>.5);assert.equal(t.wetTreeRoots,0);
  assert.ok(w.scenery.playerAboveAverage||w.scenery.candidateCount<=1);
  assert.equal(w.rivers.length,w.landscape.substantialLandmassCount);
 }
});
