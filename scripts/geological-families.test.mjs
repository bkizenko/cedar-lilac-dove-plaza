import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {generateWorld,sampleHeight,waterSurfaceAt} from '../src/game/worldgen.ts';
import {dryTreeRoot} from '../src/game/hydrology.ts';
const families=['mountain-range','hills','valley','lake','canyon','cliff','terrace','plateau','pillars','waterfall','dunes','wetland'];
function assertGeometry(w,label){
 const m=w.landscape.geometry;
 for(const kind of families)assert.ok(w.features.some(f=>f.kind===kind),`${label}: ${kind}`);
 assert.ok(m.mountainProminenceMeters>=30,`${label}: mountain ${m.mountainProminenceMeters}`);assert.ok(m.summitCount>=3,`${label}: summits ${m.summitCount}`);
 assert.ok(m.canyonMedianDepthMeters>=18,`${label}: canyon ${m.canyonMedianDepthMeters}`);assert.ok(m.cliffMaxRiseOver16Meters>=12);
 assert.ok(m.terraceBenchCount>=3);assert.ok(m.plateauHighAreaSquareMeters>=1500);assert.ok(m.pillarCount>=5,`${label}: pillars ${m.pillarCount}`);
 assert.ok(m.valleyFlankReliefMeters>=8,`${label}: valley ${m.valleyFlankReliefMeters}`);assert.ok(m.uplandApproachMaxGrade<1.1,`${label}: approach ${m.uplandApproachMaxGrade}`);assert.ok(m.waterfallBedDropMeters>=6.5,`${label}: fall bed ${m.waterfallBedDropMeters}`);
 assert.ok(m.hillsTransectReliefMeters>=4);assert.ok(m.dunesTransectReliefMeters>=2);assert.ok(m.lakeWetAreaSquareMeters>=700);assert.ok(m.waterfallDropMeters>=8);
 assert.ok(w.waterHeights.every(h=>h>=w.baseWaterY-1e-6));
 for(const c of w.camps)assert.ok(sampleHeight(w.heights,c.x,c.z,w.size)>waterSurfaceAt(w,c.x,c.z)+.5,`${label}: dry camp`);
 assert.ok(w.scenery.playerAboveAverage||w.scenery.candidateCount<=1,`${label}: scenic home`);
 for(const tree of w.trees)assert.ok(dryTreeRoot((x,z)=>sampleHeight(w.heights,x,z,w.size),tree.x,tree.z,waterSurfaceAt(w,tree.x,tree.z)),`${label}: flooded tree`);
 console.log(JSON.stringify({label,prominence:m.mountainProminenceMeters,canyon:m.canyonMedianDepthMeters,summits:m.summitCount,pillars:m.pillarCount,lakeArea:m.lakeWetAreaSquareMeters,player:w.camps[0]}));
}
test('v11 every map contains actual required geometry, not only feature labels',()=>{
 for(const seed of [42,9876,123456,20261031])for(const layout of ['pangaea','continents','archipelago'])assertGeometry(generateWorld(seed,11,{size:1040,layout}),`${seed}/${layout}`);
});
test('v11 large/huge holdout maps preserve complete geological family coverage',()=>{
 for(let i=0;i<20;i++){const seed=(Math.imul(i+17,0x41c64e6d))>>>0,size=[1040,1560,2080][i%3],layout=['pangaea','continents','archipelago'][Math.floor(i/3)%3];assertGeometry(generateWorld(seed,11,{size,layout}),`${seed}/${size}/${layout}`);}
});
test('local water is deterministic, weather-aware, physically elevated and descending',()=>{
 const w=generateWorld(42,11,{size:1040,layout:'pangaea'}),b=generateWorld(42,11,{size:1040,layout:'pangaea'});assert.deepEqual(w.heights,b.heights);assert.deepEqual(w.waterHeights,b.waterHeights);
 for(const body of w.waterBodies){if(body.kind==='lake'){assert.ok(body.surfaceY>w.baseWaterY+8);assert.ok(sampleHeight(w.heights,body.x,body.z,w.size)<waterSurfaceAt(w,body.x,body.z)-1);}else for(let i=1;i<body.pts.length;i++)assert.ok(body.pts[i].y<=body.pts[i-1].y);}
 const lake=w.waterBodies.find(b=>b.kind==='lake'),level=waterSurfaceAt(w,lake.x,lake.z);w.waterY+=.55;assert.ok(Math.abs(waterSurfaceAt(w,lake.x,lake.z)-level-.55)<1e-5);
});
test('v9 historical terrain hash stays unchanged',()=>{
 const old=generateWorld(42,9,{layout:'archipelago',size:1040});assert.equal(createHash('sha256').update(Buffer.from(old.heights.buffer)).digest('hex'),'c7da4d6a456ec261d6804c0696fa25f0fa4bd90746cc9a05100a079cb2474f59');assert.equal(old.waterHeights,undefined);
});
test('v11 scenic basin starts measure the distant backdrop and reserve a dry above-average home',()=>{
 for(const seed of [42,9876,123456]){
  const w=generateWorld(seed,11,{size:1040,layout:'pangaea'}),lake=w.features.find(f=>f.kind==='lake'),home=w.camps[0];
  assertGeometry(w,`${seed}/latest-basin-start`);assert.ok(w.scenery.player.backdrop>=0);assert.ok(w.scenery.player.score>w.scenery.mean);
  console.log(JSON.stringify({seed,metersFromLake:Math.hypot(home.x-lake.x,home.z-lake.z),backdrop:w.scenery.player.backdrop,beauty:w.scenery.player.score,comparableMean:w.scenery.mean}));
 }
});
