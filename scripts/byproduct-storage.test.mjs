import test from'node:test';import assert from'node:assert/strict';
import{Game}from'../src/game/sim.ts';
import{deliverProductionCargo,storedItemUnits,itemCapacity,byproductCap,capByproductStock}from'../src/game/production.ts';
import{simplifyCerealStock}from'../src/game/cerealProcessing.ts';
import{packedItemStorageUnits}from'../src/game/inventoryVolume.ts';
function fixture(){const g=new Game();g.reset(42,10);g.enterIsland();g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.state.units=[];g.state.campSites=[{team:0,x:0,z:30}];g.state.buildings=[g.makeBld('townhall',0,30,0)];for(const b of g.state.buildings)b.y=4;g.rebuildWalk();g.vision.fill(2);g.tribe(0).items={};return g;}
test('straw and chaff do not count against the material cap',()=>{
 assert.equal(packedItemStorageUnits({straw:386,chaff:386}),0);
 assert.equal(packedItemStorageUnits({straw:386,clay:2}),1);
 const g=fixture(),before=storedItemUnits(g,0);g.tribe(0).items={straw:300,chaff:300};assert.equal(storedItemUnits(g,0),before);
});
test('simplifying one threshed field culls straw and chaff to the by-product cap and counts spoilage',()=>{
 const g=fixture(),t=g.tribe(0);t.items={grainSheaves:8*193,roughGrain:0};const baseUnits=storedItemUnits(g,0);
 assert.equal(simplifyCerealStock(g,0),true);
 assert.ok(t.items.straw<=byproductCap(g,0,'straw')+1e-9);assert.ok(t.items.chaff<=byproductCap(g,0,'chaff')+1e-9);
 assert.ok(t.items.straw>0&&t.items.chaff>0,'by-products are kept up to the cap');
 const m=g.state.production.metrics.spoiled;assert.ok((m.straw||0)>0&&(m.chaff||0)>0);
 assert.ok(storedItemUnits(g,0)-baseUnits<itemCapacity(g,0)*.2,'by-products do not crowd grain');
});
test('grain, seed and food deliveries are not blocked by a straw/chaff pile',()=>{
 const g=fixture(),t=g.tribe(0);t.items={straw:byproductCap(g,0,'straw'),chaff:byproductCap(g,0,'chaff')};
 const u=g.spawnUnit('worker',0,30,0);u.x=0;u.z=30;u.itemCargo={clay:5};
 assert.equal(deliverProductionCargo(g,u),true);assert.equal(t.items.clay,5);
});
test('capByproductStock leaves stock under the cap alone',()=>{
 const g=fixture();g.tribe(0).items={straw:5,chaff:5};capByproductStock(g,0);assert.deepEqual(g.tribe(0).items,{straw:5,chaff:5});
});
