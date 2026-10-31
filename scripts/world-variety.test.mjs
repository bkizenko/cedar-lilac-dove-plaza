import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {generateWorld,sampleHeight,waterSurfaceAt} from '../src/game/worldgen.ts';
import {variedLandforms,VARIETY_RULES} from '../src/game/worldVariety.ts';
import {dryTreeRoot} from '../src/game/hydrology.ts';
const cases=[[42,1040,'pangaea'],[42,1040,'continents'],[42,1040,'archipelago'],[1,1040,'archipelago'],[1,1560,'pangaea'],[2,2080,'continents'],[42,2080,'archipelago'],[7,1560,'archipelago']];
for(const [seed,size,layout] of cases)test(`V14 actual geometry/biomes/towns ${seed}/${size}/${layout}`,()=>{
 const w=generateWorld(seed,14,{size,layout}),v=w.variety;assert.ok(v);assert.ok(w.waterBodies.some(b=>b.kind==='lake'));assert.ok(w.waterBodies.some(b=>b.kind==='river'));assert.ok(w.waterfalls.length>0);assert.equal(w.ecology.metrics.regions.length,8);
 for(const r of w.ecology.metrics.regions)assert.ok(r.largestConnectedAreaSquareMeters+1e-6>=w.ecology.metrics.minimumRegionAreaSquareMeters,r.kind);
 const [min,max]=VARIETY_RULES.landFraction[v.mode];assert.ok(v.landFraction>=min&&v.landFraction<=max);assert.ok(w.camps.length>=3);assert.equal(v.landmasses.reduce((n,p)=>n+p.startingTownCount,0),w.camps.length);assert.ok(v.landmasses.every(p=>p.startingTownCount<=3));
 for(const c of w.camps)assert.ok(sampleHeight(w.heights,c.x,c.z,size)>waterSurfaceAt(w,c.x,c.z)+.5,'dry camp');
 for(let i=0;i<w.camps.length;i++)for(let j=0;j<i;j++)assert.ok(Math.hypot(w.camps[i].x-w.camps[j].x,w.camps[i].z-w.camps[j].z)>=VARIETY_RULES.minimumTownSpacingMeters);
 for(const tree of w.trees)assert.ok(dryTreeRoot((x,z)=>sampleHeight(w.heights,x,z,size),tree.x,tree.z,waterSurfaceAt(w,tree.x,tree.z)),`dry root ${tree.id}`);
 assert.ok(w.scenery.playerAboveAverage||w.scenery.candidateCount<=1);
 if(v.mode==='edge-continent'||v.mode==='divided-continent'){
  assert.ok(v.edgeContactMeters>200);assert.ok(v.dryCornerCount>=2);assert.ok(w.landContinuation);assert.ok(w.landContinuation.positions.length<70000);
  let boundary=0,continuedDry=0;for(let i=0;i<w.landContinuation.positions.length;i+=3){const [x,y,z]=w.landContinuation.positions.slice(i,i+3),outside=Math.max(Math.abs(x),Math.abs(z))-size/2;assert.ok(outside>=-.001&&outside<=VARIETY_RULES.continuationWidthMeters+.001);if(Math.abs(outside)<.001){boundary++;assert.ok(Math.abs(y-sampleHeight(w.heights,x,z,size))<1e-4);}else if(y>w.waterY+1)continuedDry++;}
  assert.ok(boundary>size/5);assert.ok(continuedDry>100,'actual land continues beyond bounds');
 }else{assert.equal(v.edgeContactMeters,0);assert.equal(w.landContinuation,undefined);}
 if(v.mode==='mainland-satellites'){assert.ok(v.largestLandmassShare>=.65);assert.ok(v.landmasses.length>=2);if(size===2080)assert.equal(v.landmasses[0].townSites.length,3);}
 console.log(JSON.stringify({seed,size,layout,mode:v.mode,landFraction:v.landFraction,corners:v.dryCornerCount,landmasses:v.landmasses.map(p=>({area:p.areaSquareMeters,towns:p.townSites.length})),camps:w.camps.length}));
});
test('weighted random family selection makes several major islands common and single-mainland families rare',()=>{
 const counts={};for(let seed=0;seed<2000;seed++){const land=variedLandforms(seed,{size:1040,layout:'random'});counts[land.mode]=(counts[land.mode]||0)+1;}
 for(const [mode,weight] of Object.entries(VARIETY_RULES.randomWeights))assert.ok(Math.abs(counts[mode]/2000-weight)<.035,`${mode}: ${counts[mode]}`);
 assert.ok(counts['major-islands']>counts['mainland-satellites']*5);console.log(counts);
});
const baseline=JSON.parse(readFileSync(new URL('./fixtures/world-legacy-v14.json',import.meta.url),'utf8'));
for(const [version,expected] of Object.entries(baseline.hashes))test(`V14 preserves complete historical world ${version}`,()=>{
 const w=generateWorld(baseline.seed,Number(version),baseline.request),hash=createHash('sha256').update(JSON.stringify(w,(_k,v)=>ArrayBuffer.isView(v)?Array.from(v):v)).digest('hex');assert.equal(hash,expected);assert.equal(w.variety,undefined);assert.equal(w.landContinuation,undefined);
});
