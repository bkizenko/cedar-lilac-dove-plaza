import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld, waterSurfaceAt, sampleHeight } from '../src/game/worldgen.ts';
import { PRESETS } from '../src/game/mapgen/presets.ts';

const SIZE = 1040;
const cache = new Map();
const build = (preset, seed) => {
  const key = `${preset}:${seed}`;
  if (!cache.has(key)) cache.set(key, generateWorld(seed, 20, { size: SIZE, preset }));
  return cache.get(key);
};
const SEEDS = [3, 41];
const KINDS = ['meadow', 'mixed-woodland', 'conifer-forest', 'alpine', 'wetland', 'dry-scrub', 'arid', 'warm-coast'];

/** Land mask on a coarse lattice and 4-connected component labels. */
function landmasses(w, step = 8) {
  const n = Math.floor(w.size / step), half = w.size / 2, id = new Int32Array(n * n).fill(-1), sizes = [];
  const wet = (x, z) => sampleHeight(w.heights, x, z, w.size) < waterSurfaceAt(w, x, z) + 0.25;
  const at = (i) => [(i % n + 0.5) * step - half, (Math.floor(i / n) + 0.5) * step - half];
  for (let i = 0; i < n * n; i++) {
    if (id[i] >= 0) continue;
    const [x, z] = at(i);
    if (wet(x, z)) { id[i] = -2; continue; }
    const q = [i]; id[i] = sizes.length; let c = 0;
    for (let k = 0; k < q.length; k++) {
      c++;
      const j = q[k], jx = j % n, jz = Math.floor(j / n);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const X = jx + dx, Z = jz + dz; if (X < 0 || Z < 0 || X >= n || Z >= n) continue;
        const m = Z * n + X; if (id[m] !== -1) continue;
        const [px, pz] = at(m);
        if (wet(px, pz)) { id[m] = -2; continue; }
        id[m] = sizes.length; q.push(m);
      }
    }
    sizes.push(c * step * step);
  }
  const label = (x, z) => { const X = Math.floor((x + half) / step), Z = Math.floor((z + half) / step); return X < 0 || Z < 0 || X >= n || Z >= n ? -1 : id[Z * n + X]; };
  return { label, sizes };
}

test('v20 generation is deterministic and varies with seed', () => {
  const a = generateWorld(7, 20, { size: SIZE, preset: 'island' }), b = generateWorld(7, 20, { size: SIZE, preset: 'island' }), c = generateWorld(8, 20, { size: SIZE, preset: 'island' });
  assert.deepEqual(Array.from(a.heights), Array.from(b.heights));
  assert.deepEqual(a.camps, b.camps);
  assert.deepEqual(a.trees.slice(0, 50), b.trees.slice(0, 50));
  assert.notDeepEqual(Array.from(a.heights.slice(0, 4000)), Array.from(c.heights.slice(0, 4000)));
  assert.equal(a.options.preset, 'island');
});

test('every preset builds with the requested character', () => {
  for (const preset of Object.keys(PRESETS)) for (const seed of SEEDS) {
    const w = build(preset, seed);
    assert.equal(w.options.preset, preset);
    const land = w.mapgen.landFraction;
    assert.ok(land > 0.1 && land < 0.8, `${preset}/${seed} land ${land}`);
    assert.equal(w.camps.length >= 3, true, `${preset}/${seed} camps`);
  }
});

test('river water surfaces never climb downstream', () => {
  for (const preset of Object.keys(PRESETS)) for (const seed of SEEDS) {
    const w = build(preset, seed);
    for (const body of w.waterBodies.filter(b => b.kind === 'river')) {
      for (let i = 1; i < body.pts.length; i++) assert.ok(body.pts[i].y <= body.pts[i - 1].y + 1e-3, `${preset}/${seed} ${body.id} rises at ${i}: ${body.pts[i - 1].y} -> ${body.pts[i].y}`);
    }
  }
});

test('starts are dry, fair and share enough connected land', () => {
  for (const preset of Object.keys(PRESETS)) for (const seed of SEEDS) {
    const w = build(preset, seed), lm = landmasses(w);
    for (const c of w.camps) {
      const h = sampleHeight(w.heights, c.x, c.z, w.size);
      assert.ok(h > waterSurfaceAt(w, c.x, c.z) + 0.5, `${preset}/${seed} camp ${c.team} is wet`);
      const l = lm.label(c.x, c.z);
      assert.ok(l >= 0 && lm.sizes[l] > 30000, `${preset}/${seed} camp ${c.team} on a ${lm.sizes[l]} m2 islet`);
    }
    if (!['archipelago', 'continents'].includes(preset)) {
      const labels = new Set(w.camps.map(c => lm.label(c.x, c.z)));
      assert.equal(labels.size, 1, `${preset}/${seed} camps are split across landmasses`);
    }
    assert.ok(w.mapgen.fairness.minimum > 0.45, `${preset}/${seed} weakest start ${w.mapgen.fairness.minimum}`);
    assert.ok(w.mapgen.fairness.spread < 2.2, `${preset}/${seed} fairness spread ${w.mapgen.fairness.spread}`);
  }
});

test('each start has wood, stone, food and water within reach, and ore exists on a settled landmass', () => {
  for (const preset of Object.keys(PRESETS)) for (const seed of SEEDS) {
    const w = build(preset, seed), lm = landmasses(w);
    for (const c of w.camps) {
      const near = (arr, r) => arr.filter(p => Math.hypot(p.x - c.x, p.z - c.z) < r).length;
      assert.ok(near(w.trees, 160) >= 8, `${preset}/${seed} camp ${c.team} trees`);
      assert.ok(near(w.stones, 260) >= 1, `${preset}/${seed} camp ${c.team} stone`);
      assert.ok(near(w.forage, 220) + near(w.fish, 220) >= 2, `${preset}/${seed} camp ${c.team} food`);
      let wet = false;
      for (let a = 0; a < 24 && !wet; a++) for (let r = 12; r <= 180 && !wet; r += 12) { const x = c.x + Math.cos(a / 24 * 6.2832) * r, z = c.z + Math.sin(a / 24 * 6.2832) * r; wet = sampleHeight(w.heights, x, z, w.size) < waterSurfaceAt(w, x, z) + 0.25; }
      assert.ok(wet, `${preset}/${seed} camp ${c.team} has no water within 180 m`);
    }
    const settled = new Set(w.camps.map(c => lm.label(c.x, c.z)));
    const ore = [...w.copper, ...w.iron].filter(o => settled.has(lm.label(o.x, o.z)));
    assert.ok(ore.length >= 4, `${preset}/${seed} reachable ore ${ore.length}`);
    for (const t of w.trees) assert.ok(sampleHeight(w.heights, t.x, t.z, w.size) >= waterSurfaceAt(w, t.x, t.z) - 0.05, `${preset}/${seed} tree in water`);
  }
});

test('biome mix is plausible and follows elevation', () => {
  for (const preset of Object.keys(PRESETS)) for (const seed of SEEDS) {
    const w = build(preset, seed), regions = w.ecology.metrics.regions, land = w.ecology.metrics.landAreaSquareMeters;
    const share = Object.fromEntries(regions.map(r => [r.kind, r.areaSquareMeters / land]));
    assert.ok(Math.max(...Object.values(share)) < 0.8, `${preset}/${seed} one biome dominates: ${JSON.stringify(share)}`);
    assert.ok(regions.filter(r => r.areaSquareMeters / land > 0.03).length >= 3, `${preset}/${seed} too few biomes`);
    const alpine = regions.find(r => r.kind === 'alpine'), meadow = regions.find(r => r.kind === 'meadow');
    if (alpine.areaSquareMeters > 4000 && meadow.areaSquareMeters > 4000) assert.ok(alpine.meanElevationMeters > meadow.meanElevationMeters, `${preset}/${seed} alpine below meadow`);
  }
  const steppe = build('steppe', 3).ecology.metrics.regions, river = build('river-valley', 3).ecology.metrics.regions;
  const dry = (r) => r.filter(x => x.kind === 'arid' || x.kind === 'dry-scrub').reduce((s, x) => s + x.areaSquareMeters, 0);
  assert.ok(dry(steppe) > dry(river), 'steppe should be drier than river valley');
});

test('terrain keeps buildable ground (no cliff-steep majority)', () => {
  for (const preset of Object.keys(PRESETS)) {
    const w = build(preset, 3), n = Math.round(Math.sqrt(w.heights.length));
    let steep = 0, land = 0;
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < n - 1; j++) { const h = w.heights[i * n + j]; if (h < w.waterY + 1) continue; land++; if (Math.abs(w.heights[i * n + j + 1] - h) / (w.size / (n - 1)) > 1.2) steep++; }
    assert.ok(steep / land < 0.18, `${preset} ${steep / land} of land is cliff-steep`);
  }
});
