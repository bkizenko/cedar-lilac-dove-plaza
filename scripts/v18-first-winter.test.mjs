import test from 'node:test';import assert from 'node:assert/strict';import {firstWinter} from './diagnostics/first-winter.mjs';
test('current V18 Normal default-conflict camp survives its first winter through ordinary commands and physical water delivery',()=>{
 const result=firstWinter(42,()=>{},{defended:true,worldgenVersion:18,request:{size:1040,layout:'continents'}});
 console.log(JSON.stringify({v18FirstWinter:result}));
 assert.equal(result.worldgenVersion,18);assert.equal(result.conflict,'default');assert.equal(result.survivalGate,true);assert.equal(result.needsGate,true);assert.equal(result.zeroFounderLoss,true);assert.equal(result.saveRoundtrip,true);assert.deepEqual(result.simulationErrors,[]);
 assert.ok(result.livingAdults>=2);assert.ok(result.foodReserveSeconds>=180);assert.ok(result.completedShelters>0);assert.ok(result.water.waterDeliveredLiters>0);assert.ok(result.water.fuelBurnedWood>0);assert.equal(result.maximumThirstSeconds,0);assert.equal(result.biomeRegions.length,8);
 assert.ok(result.actions.some(a=>a.type==='setAutoWork'&&a.enabled));assert.ok(result.actions.some(a=>a.type==='callToArms'&&a.armed===2));
});
