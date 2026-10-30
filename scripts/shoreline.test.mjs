import test from 'node:test';import assert from 'node:assert/strict';import {shorelineAt} from '../src/scene/shoreline.ts';
test('shore palette follows low water edges at any world coordinate',()=>{
 for(const x of [0,100,450]){
 const h=(px,z)=>z<0?-1:.7;assert.equal(shorelineAt(h,x,4,0),true);assert.equal(shorelineAt(h,x,30,0),false);
 }
});
test('dry inland, submerged ground and high cliffs are not beach fringes',()=>{
 assert.equal(shorelineAt(()=>.8,0,0,0),false);assert.equal(shorelineAt(()=>-1,0,0,0),false);
 assert.equal(shorelineAt((x,z)=>z<0?-1:20,0,4,0),false);
});
