import test from 'node:test';
import assert from 'node:assert/strict';
import {landscapeSample,LANDSCAPE_ART_RULES} from '../src/scene/landscapeArt.ts';
test('landscape art exposes real slopes, keeps flat valleys vegetated and remains deterministic',()=>{
 const valley=landscapeSample(42,20,30,8,.05,.02),cliff=landscapeSample(42,20,30,22,1.2,.3);
 assert.equal(valley.exposure,0);assert.equal(cliff.exposure,1);
 assert.deepEqual(cliff,landscapeSample(42,20,30,22,1.2,.3));
 const nearby=landscapeSample(42,20.1,30.1,22,1.2,.3);
 assert.ok(Math.abs(cliff.r-nearby.r)<.01);assert.ok(Math.abs(cliff.b-nearby.b)<.01);
 const layer=landscapeSample(42,20,30,22+LANDSCAPE_ART_RULES.strataMetres/2,1.2,.3);
 assert.ok(Math.abs(layer.r-cliff.r)>.01,'height strata are visible');
 for(const seed of [42,9876,123456])for(let x=-500;x<500;x+=17){
  const art=landscapeSample(seed,x,x/2,x/25,.7,.3);
  for(const k of ['r','g','b'])assert.ok(art[k]>=0&&art[k]<=1);
  assert.ok(art.shade>=.9&&art.shade<=1.1);
 }
});
