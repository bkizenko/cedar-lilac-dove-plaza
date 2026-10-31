import assert from 'node:assert/strict';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {generateWorld,sampleHeight,waterSurfaceAt} from '../../src/game/worldgen.ts';
import {dryTreeRoot} from '../../src/game/hydrology.ts';
import {MULTILAND_GEOMETRY_GATES} from '../../src/game/multipleLandmasses.ts';
const results=[],startedAt=new Date().toISOString(),sourceFingerprint=createHash('sha256').update(['worldgen.ts','multipleLandmasses.ts','composedGeography.ts','ecologicalProvinces.ts'].map(name=>readFileSync(new URL(`../../src/game/${name}`,import.meta.url),'utf8')).join('\n')).digest('hex');
for(let i=0;i<20;i++){
 const seed=Math.imul(i+17,0x41c64e6d)>>>0,size=[1040,1560,2080][i%3],layout=['pangaea','continents','archipelago'][Math.floor(i/3)%3],started=performance.now();
 try{
  const w=generateWorld(seed,13,{size,layout}),t=w.topology;
  assert.ok(t.substantialLandmassCount>=2&&t.substantialLandmassCount<=5);assert.ok(t.largestLandmassShare<=.62);assert.ok(t.secondLandmassShare>=.13&&t.secondLandmassAreaSquareMeters>=18000);
  for(const [key,min] of Object.entries(MULTILAND_GEOMETRY_GATES))assert.ok(w.landscape.regionalGeometry.some(r=>r.geometry[key]>=min),key);
  assert.equal(w.ecology.metrics.regions.length,8);
  for(const r of w.ecology.metrics.regions)assert.ok(r.largestConnectedAreaSquareMeters+1e-6>=w.ecology.metrics.minimumRegionAreaSquareMeters,r.kind);
  for(const c of w.camps)assert.ok(sampleHeight(w.heights,c.x,c.z,size)>waterSurfaceAt(w,c.x,c.z)+.5,`wet camp ${c.team}`);
  for(const tree of w.trees)assert.ok(dryTreeRoot((x,z)=>sampleHeight(w.heights,x,z,size),tree.x,tree.z,waterSurfaceAt(w,tree.x,tree.z)),`wet tree ${tree.id}`);
  assert.ok(w.scenery.playerAboveAverage||w.scenery.candidateCount<=1,'above-average home');
  results.push({seed,size,layout,status:'passed',elapsedMs:performance.now()-started,mainlands:t.substantialLandmassCount,largestShare:t.largestLandmassShare,secondArea:t.secondLandmassAreaSquareMeters,connectedBiomeAreas:w.ecology.metrics.regions.map(r=>({kind:r.kind,area:r.largestConnectedAreaSquareMeters})),trees:w.trees.length,camps:w.camps.length});
 }catch(error){results.push({seed,size,layout,status:'failed',elapsedMs:performance.now()-started,error:error.message});}
 console.log(JSON.stringify(results.at(-1)));writeFileSync('docs/qa/v13-holdouts.json',JSON.stringify({version:13,startedAt,sourceFingerprint,gate:'actual-terrain-geometry-biomes-dry-roots-camps',results},null,2)+'\n');
}
console.log(`V13 full holdouts: ${results.filter(r=>r.status==='passed').length}/${results.length}`);if(results.some(r=>r.status==='failed'))process.exitCode=1;
