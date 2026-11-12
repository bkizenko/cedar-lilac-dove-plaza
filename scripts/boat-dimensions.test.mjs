import test from 'node:test';
import assert from 'node:assert/strict';
import {BOAT_CLASSES,boatClass} from '../src/game/boatClasses.ts';
import {hullClassGeometry} from '../src/scene/hullFleet.ts';
import {riverboatGeo} from '../src/scene/meshes.ts';
test('advisory metre dimensions contain existing fixed hull meshes including scout outrigger without changing legacy class',()=>{
 for(const kind of Object.keys(BOAT_CLASSES)){
  const geometry=kind==='riverboat'?riverboatGeo():hullClassGeometry(kind);
  try{geometry.computeBoundingBox();const b=geometry.boundingBox,c=BOAT_CLASSES[kind];
   assert.ok(b.max.z-b.min.z<=c.length+1e-6,kind+' length');
   assert.ok(b.max.x-b.min.x<=c.beam+1e-6,kind+' beam');
   assert.ok(c.length-(b.max.z-b.min.z)<.1,kind+' conservative rounding');
   assert.ok(c.beam-(b.max.x-b.min.x)<.1,kind+' conservative rounding');
  }finally{geometry.dispose();}
 }
 assert.equal(boatClass({}),BOAT_CLASSES.riverboat,'absent old-save hull class remains the five-seat ferry');
 assert.deepEqual(Object.values(BOAT_CLASSES).map(c=>[c.seats,c.maxHp,c.wood,c.stone,c.cordage,c.seconds]),[[5,300,40,4,0,150],[2,180,24,2,4,100],[8,420,64,6,8,240]]);
});
