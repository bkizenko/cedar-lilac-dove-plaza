import test from 'node:test';
import assert from 'node:assert/strict';
const {storageFill,totalCapacity}=await import('../src/ui/hearth/storageFill.ts');
test('bands',()=>{
 assert.equal(storageFill(0,100).tone,'green');
 assert.equal(storageFill(59,100).tone,'green');
 assert.equal(storageFill(60,100).tone,'amber');
 assert.equal(storageFill(89,100).tone,'amber');
 assert.equal(storageFill(90,100).tone,'red');
 assert.equal(storageFill(99,100).full,false);
});
test('full and overflow',()=>{
 const f=storageFill(150,100);assert.deepEqual(f,{fill:1,tone:'red',full:true,percent:100});
});
test('fallbacks',()=>{
 for(const c of [0,-5,Infinity,NaN,null,undefined])assert.equal(storageFill(10,c),null);
 assert.equal(storageFill(-3,100).fill,0);
 assert.equal(storageFill(NaN,100).fill,0);
});
test('totalCapacity',()=>{
 assert.equal(totalCapacity([100,200]),300);
 assert.equal(totalCapacity([]),null);
 assert.equal(totalCapacity([0,0]),null);
 assert.equal(totalCapacity([100,Infinity]),null);
});
