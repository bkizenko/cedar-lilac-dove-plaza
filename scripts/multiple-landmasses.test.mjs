import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {generateWorld} from '../src/game/worldgen.ts';
import {multipleLandmasses,MULTILAND_RULES} from '../src/game/multipleLandmasses.ts';
const catalogue=['mountain-range','hills','valley','lake','canyon','cliff','terrace','plateau','pillars','waterfall','dunes','wetland'];
for(const [seed,size,layout] of [[42,1040,'pangaea'],[1,1040,'pangaea'],[1,1040,'continents'],[7,1040,'archipelago'],[4,1560,'pangaea'],[2,2080,'archipelago']])test(`v13 actual final terrain ${seed}/${size}/${layout}`,()=>{
 const world=generateWorld(seed,13,{size,layout}),m=world.topology;
 assert.ok(m.substantialLandmassCount>=2&&m.substantialLandmassCount<=5);
 assert.ok(m.largestLandmassShare<=MULTILAND_RULES.maximumLargestShare);
 assert.ok(m.secondLandmassShare>=MULTILAND_RULES.minimumSecondShare);
 assert.ok(m.secondLandmassAreaSquareMeters>=MULTILAND_RULES.minimumAreaSquareMeters);
 for(const kind of catalogue)assert.ok(world.features.some(f=>f.kind===kind),kind);
 const geometry=world.landscape.regionalGeometry.map(r=>r.geometry);
 for(const [metric,minimum] of Object.entries({mountainProminenceMeters:30,summitCount:3,canyonMedianDepthMeters:18,cliffMaxRiseOver16Meters:12,terraceBenchCount:3,plateauHighAreaSquareMeters:1500,pillarCount:5,valleyFlankReliefMeters:8,waterfallBedDropMeters:6.5,hillsTransectReliefMeters:4,dunesTransectReliefMeters:2,lakeWetAreaSquareMeters:700}))assert.ok(geometry.some(g=>g[metric]>=minimum),`${metric}: ${geometry.map(g=>g[metric])}`);
 assert.equal(world.ecology.metrics.regions.length,8);
 for(const region of world.ecology.metrics.regions)assert.ok(region.largestConnectedAreaSquareMeters+1e-6>=world.ecology.metrics.minimumRegionAreaSquareMeters,region.kind);
 const lakeIslands=new Set(world.waterBodies.filter(b=>b.kind==='lake').map(b=>b.id.split('-').slice(0,2).join('-')));
 assert.equal(lakeIslands.size,m.substantialLandmassCount,'independent real freshwater catchments on each substantial mainland');
 assert.ok(new Set(world.waterBodies.map(b=>b.id)).size===world.waterBodies.length);
});
test('new topology varies mainland count and size without layout exceptions',()=>{
 const counts=new Set();
 for(let seed=0;seed<32;seed++)for(const layout of ['pangaea','continents','archipelago']){
  const land=multipleLandmasses(seed,{size:1040,layout});counts.add(land.islands.length);
  assert.ok(land.islands.length>=2&&land.islands.length<=5);
  assert.ok(new Set(land.islands.map(i=>i.radius)).size>1);
 }
 assert.deepEqual([...counts].sort(),[2,3,4,5]);
});
// Old-save compatibility was dropped (11-11): legacy generators need not stay
// byte-identical to their October hashes, only deterministic and single-landmass.
for(const version of [7,10,11,12])test(`complete legacy v${version} world is deterministic`,()=>{
 const digest=w=>createHash('sha256').update(JSON.stringify(w,(_k,v)=>ArrayBuffer.isView(v)?Array.from(v):v)).digest('hex');
 const world=generateWorld(42,version,{size:1040,layout:'pangaea'});
 assert.equal(digest(world),digest(generateWorld(42,version,{size:1040,layout:'pangaea'})));
 assert.equal(world.topology,undefined);
});
