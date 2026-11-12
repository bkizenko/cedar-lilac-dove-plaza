import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {BUILDINGS} from '../src/game/constants.ts';
import {getBuildingGrammar,setBuildingGrammar,BUILDING_FAMILIES} from '../src/scene/buildingFamilies.ts';
import {carvedBuildingSpec} from '../src/scene/buildingStyleMap.ts';
import {getCarvedPalette,setCarvedPalette,carvedSwatch} from '../src/scene/carvedPalette.ts';
import {specTriangles} from '../src/scene/buildingParts.ts';
import {CarvedBuildingLayer} from '../src/scene/carvedBuildingLayer.ts';

const fp=type=>({w:BUILDINGS[type].w,d:BUILDINGS[type].d});
const input=(type,extra={})=>({worldSeed:11,type,id:3,era:2,habitat:'plains',footprint:fp(type),settlementSeed:1,...extra});

test('village grammar and palette are the defaults, legacy stays selectable and restorable', () => {
  assert.equal(getBuildingGrammar(), 'village');
  assert.equal(getCarvedPalette(), 'village');
  const village = carvedBuildingSpec(input('watermill', {waterSide: '+z'}));
  setBuildingGrammar('legacy');
  try {
    const legacy = carvedBuildingSpec(input('watermill', {waterSide: '+z'}));
    assert.notEqual(village.variantKey, legacy.variantKey, 'grammar is part of the variant key');
    assert.ok(!legacy.parts.some(p => p.anim), 'legacy mill has no rotor parts');
  } finally { setBuildingGrammar('village'); }
  assert.equal(getBuildingGrammar(), 'village');
  for (const f of Object.keys(BUILDING_FAMILIES)) assert.ok(BUILDING_FAMILIES[f].reference.length > 20, f);
});

test('palette switch changes swatches and returns to the same values', () => {
  const a = carvedSwatch('shingle');
  setCarvedPalette('honey');
  try { assert.notDeepEqual(carvedSwatch('thatch'), carvedSwatch('slate')); } finally { setCarvedPalette('village'); }
  assert.deepEqual(carvedSwatch('shingle'), a);
});

test('watermill and windmill carry rotor parts inside budget with a real wheel and sails', () => {
  const mill = carvedBuildingSpec(input('watermill', {waterSide: '+z'}));
  const wheel = mill.parts.filter(p => p.anim?.kind === 'wheel');
  assert.ok(wheel.length >= 40, 'wheel has rims, spokes and paddles ' + wheel.length);
  assert.ok(new Set(wheel.map(p => p.anim.id)).size === 1, 'one rotor id for the wheel');
  const [pa] = wheel;
  assert.ok(Math.abs(Math.hypot(...pa.anim.axis) - 1) < 1e-6, 'unit axis');
  assert.ok(specTriangles(mill, 0) <= 2600 && specTriangles(mill, 1) <= 1400 && specTriangles(mill, 2) <= 700);
  const wind = carvedBuildingSpec(input('windmill'));
  const sails = wind.parts.filter(p => p.anim?.kind === 'sails');
  assert.ok(sails.length >= 20, 'four sails with lattice ' + sails.length);
  assert.ok(specTriangles(wind, 0) <= 2600 && specTriangles(wind, 2) <= 700);
});

test('rotating a mill with its water side keeps the wheel axis along the stream-crossing direction', () => {
  for (const side of ['+x', '-x', '+z', '-z']) {
    const s = carvedBuildingSpec(input('watermill', {waterSide: side}));
    const p = s.parts.find(q => q.anim?.kind === 'wheel');
    assert.ok(p, side);
    const [ax, , az] = p.anim.axis;
    assert.ok(Math.abs(ax) + Math.abs(az) > .99, 'axis stays horizontal ' + side);
  }
});

test('layer spins mill rotors from instance spin and leaves static mills still', () => {
  const scene = new THREE.Scene(), layer = new CarvedBuildingLayer(scene), cam = new THREE.Vector3(0, 0, 0);
  const mk = spin => ({worldSeed: 11, type: 'watermill', id: 3, era: 2, habitat: 'plains', footprint: fp('watermill'), x: 0, y: 0, z: 0, yaw: 0, spin});
  layer.sync([mk(2)], cam, () => 0);
  const rotors = [...layer.pickSources().keys()].filter(m => m.name.includes('~'));
  assert.ok(rotors.length >= 1, 'a rotor mesh exists for the wheel');
  const before = new THREE.Matrix4(), after = new THREE.Matrix4();
  rotors[0].getMatrixAt(0, before);
  layer.animate(.25);
  rotors[0].getMatrixAt(0, after);
  assert.ok(before.elements.some((v, i) => Math.abs(v - after.elements[i]) > 1e-6), 'rotor matrix changed');
  layer.dispose();
  const layer2 = new CarvedBuildingLayer(new THREE.Scene());
  layer2.sync([mk(0)], cam, () => 0);
  const r2 = [...layer2.pickSources().keys()].filter(m => m.name.includes('~'))[0], m0 = new THREE.Matrix4(), m1 = new THREE.Matrix4();
  r2.getMatrixAt(0, m0); layer2.animate(.5); r2.getMatrixAt(0, m1);
  assert.deepEqual(m0.elements, m1.elements, 'no spin when the mill is not producing');
  layer2.dispose();
});
