import test from 'node:test';import assert from 'node:assert/strict';
import {generateWorld,sampleHeight,waterSurfaceAt} from '../src/game/worldgen.ts';
import {repairRiparianTerrain} from '../src/game/riparianRepair.ts';
test('a physical riparian deficit is repaired with a wet side-channel and substantial connected habitat',()=>{
 const seed=Math.imul(32,0x41c64e6d)>>>0,w=generateWorld(seed,12,{size:2080,layout:'pangaea'});
 assert.ok(w.ecologyRepair.changedCells>0);assert.ok(w.ecologyRepair.cutVolumeCubicMeters>0);
 const channel=w.waterBodies.find(b=>b.id==='floodplain-side-channel');assert.equal(channel.kind,'river');assert.ok(channel.pts.length>3,'side-channel has a curved course');
 let samples=0,wet=0;
 for(let i=1;i<channel.pts.length;i++)for(let j=0;j<=4;j++){
  const t=j/4,a=channel.pts[i-1],b=channel.pts[i],x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;samples++;
  if(sampleHeight(w.heights,x,z,w.size)<waterSurfaceAt(w,x,z)-.05)wet++;
 }
 assert.ok(wet/samples>.95,`${wet}/${samples} actual side-channel bed samples are wet`);
 const wetland=w.ecology.metrics.regions.find(r=>r.kind==='wetland');assert.ok(wetland.largestConnectedAreaSquareMeters>=w.ecology.metrics.minimumRegionAreaSquareMeters);
 assert.ok(w.landscape.geometry.canyonMedianDepthMeters>=18,'required canyon geometry survives repair');
 assert.ok(w.landscape.geometry.pillarCount>=5);assert.ok(w.landscape.geometry.lakeWetAreaSquareMeters>=700);
 console.log(JSON.stringify({repair:w.ecologyRepair,wetSamples:wet,totalSamples:samples,wetlandArea:wetland.largestConnectedAreaSquareMeters,minimumArea:w.ecology.metrics.minimumRegionAreaSquareMeters}));
});
test('physical repair rejects historical generation versions',()=>{
 assert.throws(()=>repairRiparianTerrain({},42,11),/new v12/);
});
