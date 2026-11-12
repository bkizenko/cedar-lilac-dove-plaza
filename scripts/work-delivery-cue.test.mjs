import test from 'node:test';import assert from 'node:assert/strict';
const {describeDeliveries}=await import('../src/ui/workDeliveryText.ts');
const d=(kind,items,foods,readyFood)=>({projectId:1,recipe:'x',team:0,carrierId:1,workplaceId:1,deliveredAt:0,kind,items,foods,readyFood});
test('meal burst folds to one line with real quantities',()=>{
 const r=describeDeliveries([d('meal',{},{porridge:3},{porridge:3}),d('meal',{},{porridge:2,bread:4},{porridge:2,bread:4})]);
 assert.equal(r.tone,'meal');assert.match(r.text,/5 porridge/);assert.match(r.text,/4 bread/);
});
test('brew tone wins; grain-only and empty give no cue',()=>{
 assert.equal(describeDeliveries([d('meal',{},{smallBeer:2},{smallBeer:2}),d('brew',{},{beer:1},{beer:1})]).tone,'brew');
 assert.equal(describeDeliveries([]),null);
 assert.equal(describeDeliveries([d('material',{},{grain:5},{})]),null);
});
test('material batch counts items',()=>{assert.match(describeDeliveries([d('material',{plank:4},{},{})]).text,/4 items/);});
