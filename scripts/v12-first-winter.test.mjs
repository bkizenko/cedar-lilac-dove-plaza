import test from 'node:test';import assert from 'node:assert/strict';
import {firstWinter} from './diagnostics/first-winter.mjs';
for(const seed of [42,123456])test(`v12 Normal/default-conflict defended first winter, seed ${seed}`,()=>{
  const result=firstWinter(seed,s=>console.log(JSON.stringify({seed,...s})),{defended:true,worldgenVersion:12,request:{size:1040,layout:'continents'}});
  console.log(JSON.stringify({seed,result}));
  assert.equal(result.worldgenVersion,12);assert.equal(result.survivalGate,true,`${seed}: survival gate`);
  assert.equal(result.needsGate,true,`${seed}: water/fuel gate`);assert.equal(result.zeroFounderLoss,true,`${seed}: founders`);
  assert.equal(result.saveRoundtrip,true);assert.equal(result.simulationErrors.length,0);assert.ok(result.completedShelters>0);
  assert.ok(result.water.waterDeliveredLiters>0);assert.ok(result.water.fuelBurnedWood>0);assert.ok(result.foodReserveSeconds>=180);
  assert.ok(result.actions.some(a=>a.type==='setAutoWork'&&a.enabled),'ordinary work delegation was an explicit player command');
  assert.ok(result.actions.some(a=>a.type==='callToArms'&&a.armed===2),'real residents were armed for defense');
  assert.equal(result.biomeRegions.length,8);
});
