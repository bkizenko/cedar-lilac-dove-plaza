import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {DEFAULT_MAP_STYLE,MAP_STYLES,parseMapStyle,resolveMapStyle,MAP_STYLE_LABELS} from '../src/scene/mapStyle.ts';
import {painterAtmosphere} from '../src/scene/painterAtmosphere.ts';
import {horizonVisibility,TerrainLightmap} from '../src/scene/terrainLight.ts';
import {painterTreeKit,PAINTER_FORMS,painterDressing,painterRock,rngFrom} from '../src/scene/painterTrees.ts';
import {painterCropColor,painterCropScale,painterCropGeometry} from '../src/scene/painterCrops.ts';
import {smoothGridNormals} from '../src/scene/painterGround.ts';
import {VEGETATION_KIT_RULES} from '../src/scene/vegetationKit.ts';

test('map style: painterly is the labelled default, classic stays selectable and archived', () => {
 assert.equal(DEFAULT_MAP_STYLE, 'painterly');
 assert.deepEqual([...MAP_STYLES].sort(), ['classic', 'painterly']);
 assert.match(MAP_STYLE_LABELS.painterly, /default/i);assert.match(MAP_STYLE_LABELS.classic, /archived/i);
 assert.equal(resolveMapStyle('', null), 'painterly');
 assert.equal(resolveMapStyle('?map=classic', null), 'classic');
 assert.equal(resolveMapStyle('?map=old', 'painterly'), 'classic');
 assert.equal(resolveMapStyle('', 'classic'), 'classic');
 assert.equal(resolveMapStyle('?map=bogus', 'nonsense'), 'painterly');
 assert.equal(parseMapStyle(' New '), 'painterly');
});

test('painter atmosphere: deterministic palette, warm low sun, grey overcast, dark night', () => {
 const base = {elev: .7, dawn: 0, dusk: 0, night: false, weather: 'clear', winter: 0, autumn: 0, spring: 0, snow: 0, day: 3};
 const noon = painterAtmosphere(base), again = painterAtmosphere(base);
 assert.deepEqual(noon, again);
 const lum = hex => {const c = new THREE.Color(hex);return c.r * .2126 + c.g * .7152 + c.b * .0722;};
 const low = painterAtmosphere({...base, elev: .08, dusk: .8});
 assert.ok(new THREE.Color(low.sun).r > new THREE.Color(low.sun).b, 'low sun is warm');
 assert.ok(new THREE.Color(low.skyHorizon).r > new THREE.Color(noon.skyHorizon).r * .95);
 const storm = painterAtmosphere({...base, weather: 'storm'});
 assert.ok(storm.sunIntensity < noon.sunIntensity * .6 && storm.cloudCover > noon.cloudCover);
 assert.ok(lum(storm.skyZenith) < lum(noon.skyZenith) + .02 || storm.saturation < noon.saturation + 1);
 const night = painterAtmosphere({...base, night: true});
 assert.ok(lum(night.skyZenith) < .03 && night.cloudShadow === 0);
 for (const p of [noon, low, storm, night]) {for (const v of [p.sunIntensity, p.hemiIntensity, p.exposure, p.fogDensity, p.saturation, p.contrast]) assert.ok(Number.isFinite(v) && v > 0);}
});

test('terrain light field: horizon visibility sees hills and the lightmap bakes bounded AO, shadow and water distance', () => {
 const ridge = (x) => x > 20 && x < 30 ? 40 : 0;
 const march = [8, 16, 25, 60];
 assert.equal(horizonVisibility(x => ridge(x), 0, 0, 1, 0, .5, march) < 1, true, 'sun behind a ridge is occluded');
 assert.equal(horizonVisibility(x => ridge(x), 0, 0, -1, 0, .5, march), 1, 'sun away from the ridge is clear');
 const ground = {size: 240, height: (x, z) => 2 + Math.sin(x / 30) * 3 + Math.cos(z / 40) * 2, waterAt: () => 0};
 const map = new TerrainLightmap(ground);
 map.bakeStatic();map.bakeSunNow(new THREE.Vector3(.5, .6, .3).normalize());
 const data = map.texture.image.data;
 assert.ok(data.length > 0 && data.length % 4 === 0);
 let min = 255, max = 0;for (let i = 0; i < data.length; i += 4) {min = Math.min(min, data[i]);max = Math.max(max, data[i]);}
 assert.ok(min >= 0 && max <= 255 && max > min, 'ambient occlusion has some range');
 map.dispose();
});

test('painterly tree kit: nine distinct rooted silhouettes inside the vertex budget, with baked vertex colour', () => {
 const shapes = new Set();
 for (const form of PAINTER_FORMS) {
  const kit = painterTreeKit(form), box = new THREE.Box3();
  for (const part of [kit.trunk, kit.canopy]) {
   part.computeBoundingBox();box.union(part.boundingBox);
   assert.ok(part.attributes.position.count <= VEGETATION_KIT_RULES.maxTreeVerticesPerPart, `${form} within budget`);
   assert.ok(part.attributes.color && part.attributes.normal && part.attributes.uv);
   for (const v of part.attributes.position.array) assert.ok(Number.isFinite(v));
   for (const v of part.attributes.color.array) assert.ok(Number.isFinite(v) && v >= 0);
  }
  assert.ok(box.min.y >= -1e-5, `${form} is rooted at y=0`);assert.ok(box.max.y > 1.5 && box.max.y < 9.5);
  shapes.add([box.max.x - box.min.x, box.max.y, box.max.z - box.min.z].map(v => v.toFixed(2)).join('/'));
  kit.trunk.dispose();kit.canopy.dispose();
 }
 assert.equal(shapes.size, PAINTER_FORMS.length);
});

test('painterly dressing geometry stays nonblocking-small and deterministic', () => {
 for (const form of ['grass', 'tallgrass', 'flowers', 'bloom', 'fern', 'reeds', 'scrub', 'shrub', 'pebbles', 'rocks', 'log']) {
  const g = painterDressing(form);g.computeBoundingBox();
  assert.ok(g.attributes.position.count > 0 && g.attributes.color);
  assert.ok(g.boundingBox.min.y >= -1e-5 && g.boundingBox.max.y < 2.0, `${form} height`);
  assert.ok(g.boundingBox.max.x - g.boundingBox.min.x < 3, `${form} footprint`);g.dispose();
 }
 const a = painterRock(7, true), b = painterRock(7, true);
 assert.deepEqual([...a.attributes.position.array], [...b.attributes.position.array]);
 assert.equal(rngFrom(5)(), rngFrom(5)());
});

test('painterly crops: growth stages read apart and scale monotonically', () => {
 const sprout = painterCropColor('grain', {planted:0, tended:0, ripened:false, remaining:5}, .1, .5), ripe = painterCropColor('grain', {planted:1, tended:1, ripened:true, remaining:5}, 1, .5);
 assert.notDeepEqual([sprout.r, sprout.g, sprout.b], [ripe.r, ripe.g, ripe.b]);
 assert.ok(ripe.r > ripe.b, 'ripe grain is golden, not blue');
 let last = 0;for (const g of [0, .2, .5, 1]) {const v = painterCropScale(g).y;assert.ok(v >= last && v <= 1);last = v;}
 for (const k of ['grain', 'pulses', 'tubers']) {const g = painterCropGeometry(k);assert.ok(g.attributes.position.count > 0);g.dispose();}
});

test('painterly terrain normals: grid smoothing keeps unit length and calms a jagged cliff', () => {
 const segs = 8, w = segs + 1, g = new THREE.BufferGeometry(), a = new Float32Array(w * w * 3);
 for (let i = 0; i < w * w; i++) {const t = i % 2 ? .9 : -.9, l = Math.hypot(t, 1);a[i * 3] = t / l;a[i * 3 + 1] = 1 / l;}
 g.setAttribute('normal', new THREE.BufferAttribute(a, 3));smoothGridNormals(g, segs, 2);
 let spread = 0;for (let i = 0; i < w * w; i++) {assert.ok(Math.abs(Math.hypot(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]) - 1) < 1e-4);spread = Math.max(spread, Math.abs(a[i * 3]));}
 assert.ok(spread < .5, 'alternating normals are averaged away');
});
