import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld, sampleTriangleHeight } from '../src/game/worldgen.ts';
import { geologyAt } from '../src/game/mapgen/geology/read.ts';
import { CHUNK_RULES, ChunkTerrain, buildChunk, chunkBytes, chunkSpan, selectChunks, selectionBudget, sourceFromWorld } from '../src/game/terrainChunks.ts';

const base = { size: 1040, preset: 'river-valley', geologyVersion: 1 };
let cached;
const world = () => (cached ??= generateWorld(3, 21, base));
const same = (a, b) => a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
const GEO = ['rock', 'under', 'strata', 'soil', 'landform'];
const src = (scale = 10) => sourceFromWorld(world(), { seed: 3, scale });
const col = (c, ix) => Array.from({ length: c.n }, (_, iz) => c.heights[iz * c.n + ix]);
const row = (c, iz) => Array.from(c.heights.subarray(iz * c.n, iz * c.n + c.n));
const gcol = (c, k, ix) => Array.from({ length: c.n }, (_, iz) => c.geology[k][iz * c.n + ix]);
const grow = (c, k, iz) => Array.from(c.geology[k].subarray(iz * c.n, iz * c.n + c.n));

test('scale 1, no detail reproduces the legacy terrain and geology at every chunk vertex', () => {
  const w = world(), s = sourceFromWorld(w, { seed: 3 });
  const c = buildChunk(s, 0, -2, -1);
  for (let iz = 0; iz < c.n; iz += 5) for (let ix = 0; ix < c.n; ix += 5) {
    const x = c.x0 + ix * c.spacing, z = c.z0 + iz * c.spacing;
    assert.ok(Math.abs(c.heights[iz * c.n + ix] - Math.min(144, sampleTriangleHeight(w.heights, x, z, w.size))) < 1e-4, `height at ${x},${z}`);
    const g = geologyAt(w, x, z);
    assert.equal(c.geology.rock[iz * c.n + ix], g.rock); assert.equal(c.geology.soil[iz * c.n + ix], Math.round(g.soilDepthMeters / 0.02)); assert.equal(c.geology.landform[iz * c.n + ix], g.landform);
  }
});

test('seams: neighbouring chunks agree on shared border heights and geology (stretched world with detail)', () => {
  const s = src(10);
  for (const [cx, cz] of [[0, 0], [-3, 4], [7, -5], [3, 3]]) for (const lod of [0, 1, 3]) {
    const a = buildChunk(s, lod, cx, cz), e = buildChunk(s, lod, cx + 1, cz), n = buildChunk(s, lod, cx, cz + 1);
    assert.ok(same(col(a, a.n - 1), col(e, 0)), `east seam ${lod}:${cx}:${cz}`);
    assert.ok(same(row(a, a.n - 1), row(n, 0)), `south seam ${lod}:${cx}:${cz}`);
    for (const k of GEO) { assert.ok(same(gcol(a, k, a.n - 1), gcol(e, k, 0)), `geology ${k} east`); assert.ok(same(grow(a, k, a.n - 1), grow(n, k, 0)), `geology ${k} south`); }
  }
});

test('LOD seams: every coarse vertex equals the fine vertex at the same world point', () => {
  const s = src(10), coarse = buildChunk(s, 1, 2, -3);
  for (let q = 0; q < 4; q++) {
    const fine = buildChunk(s, 0, 4 + (q & 1), -6 + (q >> 1));
    for (let iz = 0; iz < fine.n; iz += 2) for (let ix = 0; ix < fine.n; ix += 2) {
      const cxi = ((q & 1) * 32 + ix / 2), czi = ((q >> 1) * 32 + iz / 2);
      assert.ok(Object.is(coarse.heights[czi * coarse.n + cxi], fine.heights[iz * fine.n + ix]));
    }
  }
});

test('determinism: same seed same bytes, across fresh worlds and across eviction', () => {
  const a = buildChunk(sourceFromWorld(world(), { seed: 3, scale: 8 }), 0, 5, 6), b = buildChunk(sourceFromWorld(world(), { seed: 3, scale: 8 }), 0, 5, 6);
  assert.ok(same(a.heights, b.heights)); for (const k of GEO) assert.ok(same(a.geology[k], b.geology[k]));
  const other = buildChunk(sourceFromWorld(world(), { seed: 4, scale: 8 }), 0, 5, 6);
  assert.ok(!same(a.heights, other.heights), 'detail noise depends on the seed');
  const t = new ChunkTerrain(src(8), { memoryBytes: chunkBytes() * 2 }), first = Array.from(t.get(0, 1, 1).heights);
  for (let i = 0; i < 6; i++) t.get(0, 10 + i, 10);
  assert.ok(!t.has(0, 1, 1)); assert.ok(same(first, t.get(0, 1, 1).heights));
});

test('cache: byte cap holds, LRU order, pins survive, overCap is reported not hidden', () => {
  const cap = chunkBytes() * 6, t = new ChunkTerrain(src(10), { memoryBytes: cap });
  t.pin(0, 0, 0); t.get(0, 0, 0);
  for (let i = 0; i < 60; i++) { t.get(0, i % 9 - 4, Math.floor(i / 9)); assert.ok(t.stats().bytes <= cap, 'cap respected'); }
  assert.ok(t.has(0, 0, 0), 'pinned chunk survives'); assert.ok(t.stats().evictions > 40);
  const lru = new ChunkTerrain(src(10), { memoryBytes: chunkBytes() * 3 });
  lru.get(0, 0, 0); lru.get(0, 1, 0); lru.get(0, 2, 0); lru.get(0, 0, 0); lru.get(0, 3, 0);
  assert.ok(lru.has(0, 0, 0) && !lru.has(0, 1, 0), 'least recently used goes first');
  const tight = new ChunkTerrain(src(10), { memoryBytes: chunkBytes() * 2 });
  tight.setWorkingSet([0, 1, 2, 3].map(cx => ({ lod: 0, cx, cz: 0 })));
  assert.equal(tight.stats().overCap, true); assert.equal(tight.stats().chunks, 4);
  tight.setWorkingSet([{ lod: 0, cx: 0, cz: 0 }]); assert.equal(tight.stats().overCap, false);
  assert.throws(() => new ChunkTerrain(src(1), { memoryBytes: 10 }));
});

test('selection tiles the extent exactly once, fine near the focus, within a memory budget', () => {
  const extent = 10400, refs = selectChunks(120, -300, extent), half = extent / 2;
  let area = 0; const seen = new Set();
  for (const r of refs) {
    const s = chunkSpan(r.lod), x0 = Math.max(-half, r.cx * s), x1 = Math.min(half, (r.cx + 1) * s), z0 = Math.max(-half, r.cz * s), z1 = Math.min(half, (r.cz + 1) * s);
    area += (x1 - x0) * (z1 - z0); seen.add(`${r.lod}:${r.cx}:${r.cz}`);
  }
  assert.equal(seen.size, refs.length); assert.ok(Math.abs(area - extent * extent) < 1);
  for (let k = 0; k < 400; k++) { // point sampling: exactly one chunk covers any point
    const x = ((k * 7919) % 10399) - half + 0.5, z = ((k * 104729) % 10399) - half + 0.5;
    assert.equal(refs.filter(r => { const s = chunkSpan(r.lod); return x >= r.cx * s && x < (r.cx + 1) * s && z >= r.cz * s && z < (r.cz + 1) * s; }).length, 1);
  }
  assert.equal(refs[0].lod, 0); assert.ok(refs.some(r => r.lod >= 2));
  const b = selectionBudget(refs); assert.ok(b.bytes < CHUNK_RULES.defaultMemoryBytes / 4, `${b.chunks} chunks ${b.bytes}`);
  assert.deepEqual(refs, selectChunks(120, -300, extent), 'deterministic');
  assert.ok(selectChunks(1e6, 1e6, extent).every(r => r.lod >= 3), 'a focus far outside leaves everything coarse');
});

test('edits: continuous across borders, reproduced after eviction, exported per chunk and reloaded', () => {
  const t = new ChunkTerrain(src(10), { memoryBytes: chunkBytes() * 3 });
  const before = Array.from(t.get(0, 3, 3).heights);
  t.applyEdit({ id: 1, x: 3 * 256, z: 3 * 256 + 40, radius: 30, depth: 5 }); // straddles the border between chunk 2|3 and 3
  const a = t.get(0, 2, 3), b = t.get(0, 3, 3);
  assert.ok(same(col(a, a.n - 1), col(b, 0)), 'border still continuous');
  assert.ok(!same(before, Array.from(b.heights)), 'edit changed the chunk');
  const dug = t.heightAt(3 * 256, 3 * 256 + 40), free = buildChunk(src(10), 0, 3, 3).heights[(10 * 65) + 0];
  assert.ok(Math.abs(free - dug - 5) < 0.01 || free - dug > 4.5, `bowl depth ${free - dug}`);
  for (let i = 0; i < 8; i++) t.get(0, 20 + i, 20);
  assert.ok(same(Array.from(b.heights), Array.from(t.get(0, 3, 3).heights)), 'edit survives eviction');
  const coarse = t.get(1, 1, 1); assert.ok(coarse.minY <= buildChunk(src(10), 1, 1, 1).minY);
  const shards = t.exportEdits(); assert.deepEqual(Object.keys(shards), ['0:2:3', '0:3:3']); // only touched chunks
  const fresh = new ChunkTerrain(src(10)); fresh.importEdits(JSON.parse(JSON.stringify(shards)));
  assert.ok(same(Array.from(b.heights), Array.from(fresh.get(0, 3, 3).heights)), 'reloaded edits give the same terrain');
  assert.equal(fresh.editCount(), 1);
  assert.ok(same(Array.from(fresh.get(0, 9, 9).heights), Array.from(buildChunk(src(10), 0, 9, 9).heights)), 'untouched chunk untouched');
});

test('opt-in switch: default world is unchanged, opted-in world gains a hidden chunk layer', () => {
  const plain = world(), opt = generateWorld(3, 21, { ...base, chunkTerrainVersion: 1, chunkTerrainScale: 6 });
  assert.equal(plain.chunkTerrain, undefined); assert.equal(plain.options.chunkTerrainVersion, undefined);
  assert.equal(opt.options.chunkTerrainVersion, 1); assert.equal(opt.options.chunkTerrainScale, 6);
  assert.ok(opt.chunkTerrain instanceof ChunkTerrain); assert.ok(!Object.keys(opt).includes('chunkTerrain')); assert.ok(!JSON.stringify(opt.options).includes('Terrain":{'));
  assert.ok(same(plain.heights, opt.heights), 'legacy height grid byte for byte the same');
  assert.equal(opt.chunkTerrain.source.extent, 1040 * 6);
  assert.ok(Number.isFinite(opt.chunkTerrain.heightAt(500, -700)));
  assert.ok(opt.chunkTerrain.geologyAt(500, -700).rock >= 0);
});
