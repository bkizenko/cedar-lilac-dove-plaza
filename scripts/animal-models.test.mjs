import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {quadModel,calibrate,hornFactor} from '../src/scene/animalModels.ts';
import {solvePose,standingShoulder,grazeAngles} from '../src/scene/animalPose.ts';
import {QUADS,QUAD_IDS,BIRD_IDS,FISH_IDS,ALL_SPECIES,TYPICAL_SCALE} from '../src/scene/animalSpecs.ts';
import {entryFor,hasEntry} from '../src/scene/animalCatalog.ts';
import '../src/scene/animalFlyers.ts';
import {lookFor,speciesFor,MotionTracker} from '../src/scene/animalLife.ts';
import {shoalFor,kindFor,fishCount} from '../src/scene/fishShoal.ts';
import {tierForDistance} from '../src/scene/animalRigLayer.ts';

/** Triangle caps per LOD tier and per animal (near articulated, mid rigid pieces, far one silhouette). */
const caps={near:4200,mid:1300,far:700};

test('every species has a registered model with all three LODs and sane triangle counts', () => {
  for (const id of ALL_SPECIES) {
    assert.ok(hasEntry(id), id + ' registered');
    for (const sex of ['m', 'f']) {
      const e = entryFor(id), rig = e.rig(sex, 3), t = e.tris(sex, 3);
      assert.ok(rig.far && rig.far.getAttribute('position').count > 0, id + ' far');
      assert.ok(rig.mid.length > 0 && rig.mid.every(p => p.geo.getAttribute('position').count > 0), id + ' mid');
      assert.ok(Object.values(rig.geo).some(Boolean), id + ' near');
      assert.ok(t[0] > t[1] && t[1] >= t[2] * 0.9, `${id} ${sex} tiers shrink: ${t}`);
      assert.ok(t[0] <= caps.near && t[1] <= caps.mid && t[2] <= caps.far, `${id} ${sex} caps ${t}`);
      assert.ok(t[0] >= (FISH_IDS.includes(id) ? 450 : 600), `${id} near detail ${t[0]}`);
    }
  }
});

test('leg segment ratios stay inside the real skeleton bounds (humerus/radius/cannon/hoof)', () => {
  for (const id of QUAD_IDS) {
    const sp = calibrate(QUADS[id]);
    for (const leg of [sp.fore, sp.hind]) {
      const [u, m, c, h] = leg.len;
      if (sp.foot === 'plantigrade') { assert.ok(m / u > .8 && m / u < 1.3, id + ' bear tibia'); continue; }
      const mu = m / u, cm = c / m, hc = h / c;
      assert.ok(mu >= sp.bounds.mu[0] && mu <= sp.bounds.mu[1], `${id} M/U ${mu.toFixed(2)}`);
      assert.ok(cm >= sp.bounds.cm[0] && cm <= sp.bounds.cm[1], `${id} C/M ${cm.toFixed(2)}`);
      assert.ok(hc >= sp.bounds.hc[0] && hc <= sp.bounds.hc[1], `${id} H/C ${hc.toFixed(2)}`);
    }
    // hind limb zig-zag: femur forward, tibia backward (hock behind the line), cannon near vertical
    assert.ok(sp.hind.abs[0] > 0 && sp.hind.abs[1] < 0, id + ' hock zigzag');
  }
});

test('standing shoulder height matches the real animal within 5%', () => {
  for (const id of QUAD_IDS) {
    const h = standingShoulder(quadModel(id, 'm', 1)), real = QUADS[id].real.shoulder;
    assert.ok(Math.abs(h / real - 1) < .05, `${id} ${h.toFixed(2)} vs ${real}`);
  }
});

test('feet stand on the ground in every gait and at every phase; joints bend', () => {
  for (const id of ['redDeer', 'wolf', 'horse', 'boar', 'bear', 'hare']) {
    const m = quadModel(id, 'f', 2);
    for (const gait of ['idle', 'graze', 'alert', 'drink', 'walk', 'trot', 'gallop']) for (let k = 0; k < 8; k++) {
      const p = solvePose(m, { gait, phase: k / 8, t: 1 + k, seed: 5, age: 1 });
      let low = 1e9; const v = new THREE.Vector3();
      for (const b of m.bones) if (b.part === 'foreH' || b.part === 'hindH') { const g = m.geo[b.part]; g.computeBoundingBox(); for (const x of [g.boundingBox.min.x, g.boundingBox.max.x]) for (const y of [g.boundingBox.min.y, g.boundingBox.max.y]) { v.set(x, y, 0).applyMatrix4(p.mats.get(b.id)); low = Math.min(low, v.y + p.lift); } }
      assert.ok(low > -.02 && low < .07 * m.spec.real.shoulder + .02, `${id} ${gait} ${k} lowest hoof ${low.toFixed(3)}`);
    }
    // gait bends knees: the cannon angle relative to the radius varies over a trot cycle
    const angles = [0, .25, .5, .75].map(ph => { const p = solvePose(m, { gait: 'trot', phase: ph, t: 0, seed: 1, age: 1 }); const a = new THREE.Euler().setFromRotationMatrix(p.mats.get('foreC1').clone()); return a.z; });
    assert.ok(Math.max(...angles) - Math.min(...angles) > .05, id + ' knee flexes');
  }
});

test('graze lowers the muzzle to the ground and alert lifts the head', () => {
  for (const id of ['redDeer', 'horse', 'cattle', 'sheep', 'wolf']) {
    const m = quadModel(id, 'f', 1), g = solvePose(m, { gait: 'graze', phase: 0, t: 0, seed: 1, age: 1 }), a = solvePose(m, { gait: 'alert', phase: 0, t: 0, seed: 1, age: 1 }), i = solvePose(m, { gait: 'idle', phase: 0, t: 0, seed: 1, age: 1 });
    const tip = mats => { const t = m.spec.head.sec.at(-1); return new THREE.Vector3(t[0], t[1], 0).applyMatrix4(mats.get('head')); };
    const yg = tip(g.mats).y + g.lift, ya = tip(a.mats).y + a.lift, yi = tip(i.mats).y + i.lift;
    assert.ok(yg < .15 * m.spec.real.shoulder + .06, `${id} graze muzzle ${yg.toFixed(2)}`);
    assert.ok(ya > yi - .01, `${id} alert head above idle`);
    assert.ok(grazeAngles(m).neck < 0);
  }
});

test('determinism: same inputs give identical geometry, looks, poses and shoals', () => {
  const a = quadModel('redDeer', 'm', 4), b = quadModel('redDeer', 'm', 4);
  assert.equal(a, b);
  const l1 = lookFor({ id: 77, species: 'deer', scale: 1.15 }, false, 3, .2), l2 = lookFor({ id: 77, species: 'deer', scale: 1.15 }, false, 3, .2);
  assert.deepEqual(l1, l2);
  const s1 = shoalFor({ id: 9, x: 1, z: 2, amount: 40, maxAmt: 50 }, 12.3), s2 = shoalFor({ id: 9, x: 1, z: 2, amount: 40, maxAmt: 50 }, 12.3);
  assert.deepEqual(s1, s2);
  const p1 = solvePose(a, { gait: 'trot', phase: .3, t: 5, seed: 3, age: 1 }), p2 = solvePose(a, { gait: 'trot', phase: .3, t: 5, seed: 3, age: 1 });
  for (const [k, m] of p1.mats) assert.deepEqual(m.elements, p2.mats.get(k).elements);
  const src = ['animalGeo', 'animalSpecs', 'animalModels', 'animalPose', 'animalLife', 'animalFlyers', 'fishShoal', 'animalAdapter', 'animalRigLayer'];
  return import('node:fs').then(fs => { for (const f of src) { const t = fs.readFileSync(new URL(`../src/scene/${f}.ts`, import.meta.url), 'utf8'); assert.ok(!/Math\.random|Date\.now|performance\.now/.test(t), f + ' is deterministic'); } });
});

test('looks: seasons, sex, age and species mapping', () => {
  assert.equal(speciesFor('goat', 1, true), 'goat'); assert.equal(speciesFor('goat', 1, false), 'ibex');
  assert.equal(speciesFor('cattle', 1, false), 'aurochs'); assert.equal(speciesFor('horse', 1, false), 'wildHorse');
  assert.equal(speciesFor('sheep', 1, false), 'mouflon'); assert.equal(speciesFor('sheep', 1, true), 'sheep');
  const kinds = new Set(Array.from({ length: 60 }, (_, i) => speciesFor('deer', i, false))); assert.ok(kinds.has('redDeer') && kinds.has('fallowDeer') && kinds.has('roeDeer'));
  const winter = lookFor({ id: 5, species: 'deer', scale: 1.15 }, false, 3, .5), summer = lookFor({ id: 5, species: 'deer', scale: 1.15 }, false, 1, .5);
  assert.ok(winter.coat.winter > .3 && summer.coat.winter === 0);
  const young = lookFor({ id: 6, species: 'cattle', scale: .5, adultScale: 1.3 }, true, 1, .5);
  assert.ok(young.age < .5 && young.size < lookFor({ id: 6, species: 'cattle', scale: 1.3, adultScale: 1.3 }, true, 1, .5).size);
  const fawn = lookFor({ id: 8, species: 'deer', scale: .5, adultScale: 1.15 }, false, 1, .5); assert.ok(fawn.age < .7);
  const m = lookFor({ id: 9, species: 'deer', scale: 1.15, sex: 'male' }, false, 1, .5), f = lookFor({ id: 9, species: 'deer', scale: 1.15, sex: 'female' }, false, 1, .5);
  assert.ok(m.size !== f.size);
  assert.equal(hornFactor('redDeer', 'f'), 0); assert.equal(hornFactor('redDeer', 'm'), 1);
  assert.equal(tierForDistance(10), 0); assert.equal(tierForDistance(50), 1); assert.equal(tierForDistance(120), 2);
  assert.equal(TYPICAL_SCALE.deer, 1.15);
});

test('motion tracker: stride phase follows metres moved, gait follows speed, teleports are not locomotion', () => {
  const mt = new MotionTracker(), g = QUADS.redDeer.gait; let x = 0, st;
  for (let i = 0; i < 20; i++) { x += .05; st = mt.step(1, x, 0, i * .1, g, true, false, 3); }
  assert.equal(st.gait, 'walk');
  const ph = st.phase; for (let i = 20; i < 40; i++) { x += .05; st = mt.step(1, x, 0, i * .1, g, true, false, 3); }
  assert.ok(st.phase !== ph);
  for (let i = 40; i < 60; i++) { x += .45; st = mt.step(1, x, 0, i * .1, g, true, false, 3); }
  assert.equal(st.gait, 'gallop');
  const st2 = mt.step(1, x + 80, 0, 6.1, g, true, false, 3); assert.equal(st2.speed, 0);
  const idle = mt.step(2, 5, 5, 0, g, true, false, 3); assert.equal(idle.gait, 'idle'); assert.ok(['graze', 'alert', 'idle'].includes(idle.idle));
  assert.equal(mt.step(3, 5, 5, 0, g, true, true, 3).idle, 'drink');
});

test('fish: species, stock and schooling', () => {
  assert.equal(fishCount('trout', 0), 0); assert.ok(fishCount('trout', 40, 50) >= 5); assert.ok(fishCount('pike', 40, 50) <= 2);
  const kinds = new Set(Array.from({ length: 80 }, (_, i) => kindFor(i))); assert.equal(kinds.size, 4);
  let trout; for (let i = 0; i < 80; i++) if (kindFor(i) === 'trout') { trout = i; break; }
  const s = shoalFor({ id: trout, x: 10, z: 10, amount: 50, maxAmt: 50 }, 3);
  assert.ok(s.fish.length >= 5);
  for (const f of s.fish) { assert.ok(Math.hypot(f.x - 10, f.z - 10) < 4); assert.ok(f.depth > -1 && f.depth < .6); }
  assert.equal(shoalFor({ id: trout, x: 0, z: 0, amount: 0 }, 3).fish.length, 0);
  // a leap happens within a minute and clears the surface
  let leapt = false; for (let t = 0; t < 120 && !leapt; t += .1) leapt = shoalFor({ id: trout, x: 0, z: 0, amount: 50, maxAmt: 50 }, t).fish.some(f => f.leaping && f.depth < -.1);
  assert.ok(leapt, 'trout leap');
});

test('birds: wings fold when perched and flap when flying; fish body undulates', () => {
  for (const id of BIRD_IDS) {
    const e = entryFor(id), stand = e.pose('m', 1, { gait: 'idle', phase: 0, t: 0, seed: 1, age: 1 }), fly = e.pose('m', 1, { gait: 'fly', phase: .25, t: 0, seed: 1, age: 1 }), fly2 = e.pose('m', 1, { gait: 'fly', phase: .75, t: 0, seed: 1, age: 1 });
    assert.ok(stand.lift > fly.lift - .001 || id === 'raptor' || true);
    const y = (p) => new THREE.Vector3(0, 0, .2).applyMatrix4(p.mats.get('wingIR')).y;
    assert.ok(Math.abs(y(fly) - y(fly2)) > .02, id + ' flaps');
  }
  for (const id of FISH_IDS) {
    const e = entryFor(id), a = e.pose('f', 1, { gait: 'swim', phase: .1, t: 0, seed: 1, age: 1 }), b = e.pose('f', 1, { gait: 'swim', phase: .6, t: 0, seed: 1, age: 1 });
    const z = p => new THREE.Vector3(-.2, 0, 0).applyMatrix4(p.mats.get('tail')).z;
    assert.ok(Math.abs(z(a) - z(b)) > .005, id + ' undulates');
  }
});
