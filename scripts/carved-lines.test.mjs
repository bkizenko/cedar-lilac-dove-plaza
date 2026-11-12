import test from 'node:test';
import assert from 'node:assert/strict';
import {lineIndex,joinMaskFor,waterSideFor,warehouseModules,bridgePose} from '../src/scene/carvedLines.ts';
import {JOIN} from '../src/scene/buildingHelpers.ts';
import {carvedBuildingSpec} from '../src/scene/buildingStyleMap.ts';
import {specTriangles,floatingParts} from '../src/scene/buildingParts.ts';

const cell=(type,x,z)=>({type,x,z,hp:10});

test('join masks follow neighbours on the 2 m grid and mix palisade, stone wall and gate', () => {
  const b=[cell('palisade',0,0),cell('stonewall',4,0),cell('gate',-4,0),cell('palisade',0,4),cell('trench',0,-4)];
  const idx=lineIndex(b);
  assert.equal(joinMaskFor(idx,b[0]),JOIN.px|JOIN.nx|JOIN.pz);
  assert.equal(joinMaskFor(idx,b[1]),JOIN.nx);
  assert.equal(joinMaskFor(idx,b[4]),0, 'a trench does not join a wall');
  assert.equal(joinMaskFor(lineIndex([{...b[0],hp:0}]),b[0]),0);
});

test('water side picks the wet direction, default +z', () => {
  assert.equal(waterSideFor(0,0,(x)=>x<-4),'-x');
  assert.equal(waterSideFor(0,0,()=>false),'+z');
});

test('warehouse modules tile the plot', () => {
  const m=warehouseModules({w:13.2,d:6},{w:6.6,d:6});
  assert.equal(m.length,2);assert.ok(Math.abs(m[0].w-6.6)<1e-9);
  assert.ok(Math.abs(m[1].x-m[0].x-6.6)<1e-9);
});

test('bridge pose follows the span', () => {
  const p=bridgePose({ax:0,az:0,bx:0,bz:12},5.2,()=>0);
  assert.equal(p.footprint.d,12);assert.equal(p.pitch,-0);assert.equal(p.yaw,0);
});

test('join cells and gate states stay inside budgets with no floating parts', () => {
  for(const type of ['palisade','stonewall','gate'])for(const join of [0,JOIN.px,JOIN.px|JOIN.nx,JOIN.px|JOIN.pz,15])for(const gateOpen of [false,true]){
    const s=carvedBuildingSpec({worldSeed:3,type,id:2,era:2,footprint:{w:4,d:4},join,gateOpen});
    assert.ok(specTriangles(s,0)<=2600,type+join);
    assert.equal(floatingParts(s).length,0,type+' '+join);
  }
});
