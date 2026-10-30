import test from 'node:test';import assert from 'node:assert/strict';
import {pineGeo} from '../src/scene/meshes.ts';
test('shared tree detail stays within a modest geometry budget and has finite shaded foliage',()=>{
 const {trunk,canopy}=pineGeo();
 for(const g of [trunk,canopy]){
 const pos=g.getAttribute('position');assert.ok(pos.count/3<160);assert.ok(Array.from(pos.array).every(Number.isFinite));
 g.computeBoundingBox();assert.ok(g.boundingBox.min.y>=-1e-6);assert.ok(g.boundingBox.max.y<6);
 }
 const colors=canopy.getAttribute('color');assert.equal(colors.count,canopy.getAttribute('position').count);
 assert.ok(Math.min(...colors.array)<Math.max(...colors.array));trunk.dispose();canopy.dispose();
});
