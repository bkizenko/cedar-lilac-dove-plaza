import test from 'node:test';
import assert from 'node:assert/strict';
import {GARMENT_KINDS,GARMENT_WEATHER_RULES as R,garmentWetWarmthFactor,tickGarmentWetness} from '../src/game/textiles.ts';
import {garmentRoofCovered} from '../src/game/survivalNeeds.ts';
const weather=(extra={})=>({raining:false,immersed:false,covered:false,fireFraction:0,...extra});
const resident=()=>({hp:48,garment:{item:'woolCoat',condition:.6,heatExposureSeconds:4},spareGarment:{item:'lightClothes',condition:.4}});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test('dry legacy clothes stay absent-field dry; invalid time and dead bodies gain no weather state',()=>{
 const u=resident(),before=structuredClone(u);tickGarmentWetness(u,10,weather());assert.deepEqual(u,before);assert.equal(garmentWetWarmthFactor(u.garment),1);
 for(const dt of[0,-1,NaN,Infinity]){tickGarmentWetness(u,dt,weather({raining:true}));assert.deepEqual(u,before);}
 u.hp=0;const dead=structuredClone(u);tickGarmentWetness(u,100,weather({immersed:true}));assert.deepEqual(u,dead);
});

test('actual rain and immersion wet the existing worn and spare objects without resetting condition or history',()=>{
 const u=resident(),worn=u.garment,spare=u.spareGarment;tickGarmentWetness(u,10,weather({raining:true}));assert.equal(u.garment,worn);assert.equal(u.spareGarment,spare);close(worn.wetness,R.kinds.woolCoat.rainWetPerSecond*10);close(spare.wetness,R.kinds.lightClothes.rainWetPerSecond*R.spareRainFactor*10);assert.equal(worn.condition,.6);assert.equal(worn.heatExposureSeconds,4);assert.equal(spare.condition,.4);
 const covered=resident();tickGarmentWetness(covered,100,weather({raining:true,covered:true}));assert.equal(covered.garment.wetness,undefined);assert.equal(covered.spareGarment.wetness,undefined);
 tickGarmentWetness(covered,4,weather({immersed:true,covered:true,fireFraction:1}));assert.equal(covered.garment.wetness,1);assert.equal(covered.spareGarment.wetness,1,'immersion overrides the carried spare rain reduction and any roof or fire');
});

test('wet insulation is bounded per kind and only actual supplied fire accelerates ordinary drying',()=>{
 for(const item of GARMENT_KINDS){const a={item,condition:.5};assert.equal(garmentWetWarmthFactor(a),1);a.wetness=1;close(garmentWetWarmthFactor(a),R.kinds[item].wetWarmthRetention);a.wetness=.5;assert.ok(garmentWetWarmthFactor(a)>R.kinds[item].wetWarmthRetention&&garmentWetWarmthFactor(a)<1);assert.equal(a.condition,.5);}
 const air=resident(),fire=resident();air.garment.wetness=1;fire.garment.wetness=1;tickGarmentWetness(air,10,weather({covered:true}));tickGarmentWetness(fire,10,weather({covered:true,fireFraction:.5}));assert.ok(fire.garment.wetness<air.garment.wetness);close(air.garment.wetness-fire.garment.wetness,R.fireDryPerSecond*.5*10);
 assert.ok(garmentWetWarmthFactor({item:'woolCoat',condition:1,wetness:1})>garmentWetWarmthFactor({item:'lightClothes',condition:1,wetness:1}));
});

test('roof protection requires the physical body inside the completed footprint, not nearby warmth or a stale shelter flag',()=>{
 const house={id:1,type:'house',team:0,hp:100,build:1,x:0,z:0,w:10,d:8},g={state:{buildings:[house]},finished:b=>b.build===1},u={hp:48,x:0,z:0,r:.5};assert.equal(garmentRoofCovered(g,u),true);
 u.x=5;u.shelterId=1;assert.equal(garmentRoofCovered(g,u),false,'standing beside the house is still exposed to rain');u.x=0;house.build=.5;assert.equal(garmentRoofCovered(g,u),false);house.build=1;house.hp=0;assert.equal(garmentRoofCovered(g,u),false);
});


test('repair escrow remains the same carried garment and receives spare weather exposure without condition changes',()=>{
 const garment={item:'woolCoat',condition:.3,heatExposureSeconds:9},repair={garment,initialCondition:.3,progress:12},u={hp:48,garmentRepair:repair};
 tickGarmentWetness({hp:u.hp,spareGarment:u.garmentRepair.garment},10,weather({raining:true}));
 close(garment.wetness,R.kinds.woolCoat.rainWetPerSecond*R.spareRainFactor*10);assert.equal(repair.garment,garment);assert.equal(garment.condition,.3);assert.equal(garment.heatExposureSeconds,9);assert.equal(repair.initialCondition,.3);assert.equal(repair.progress,12);
 tickGarmentWetness({hp:u.hp,spareGarment:garment},4,weather({immersed:true}));assert.equal(garment.wetness,1);
 tickGarmentWetness({hp:u.hp,spareGarment:garment},10,weather({covered:true,fireFraction:1}));assert.ok(garment.wetness<1);assert.equal(garment.condition,.3);
});
