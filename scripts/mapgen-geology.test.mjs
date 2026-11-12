import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld } from '../src/game/worldgen.ts';
import { geologyAt } from '../src/game/mapgen/geology/read.ts';
import { ROCKS, LANDFORMS, HARD, SOFT } from '../src/game/mapgen/geology/rocks.ts';

const opts = preset => ({ size: 1040, preset, geologyVersion: 1 });
const cache = new Map();
const gen = (preset, seed = 3) => { const k = `${preset}/${seed}`; if (!cache.has(k)) cache.set(k, generateWorld(seed, 21, opts(preset))); return cache.get(k); };
const tagName = id => LANDFORMS[id].name;

// Signature landforms each preset must show: every entry is an any-of group, each group must be satisfied.
const SIGNATURE = {
  'river-valley': [['river-terrace', 'floodplain', 'meander-belt'], ['oxbow'], ['gorge', 'waterfall', 'canyon']],
  highland: [['cirque', 'u-valley'], ['crag', 'scree'], ['moraine', 'kettle', 'fjord']],
  steppe: [['wadi'], ['yardang', 'badlands'], ['desert-pavement']],
  lakeland: [['drumlin', 'kettle', 'moraine'], ['u-valley', 'scour-lake', 'kettle']],
  archipelago: [['volcanic-cone', 'caldera', 'lava-field'], ['sea-stack', 'spit', 'lagoon'], ['beach']],
};

test('each preset shows its signature landforms', () => {
  for (const [preset, groups] of Object.entries(SIGNATURE)) {
    const g = gen(preset).mapgen.geology;
    assert.ok(g, `${preset} has a geology read`);
    for (const any of groups) assert.ok(any.some(t => (g.counts[t] ?? 0) > 0), `${preset}: none of ${any.join('/')} (counts ${JSON.stringify(g.counts)})`);
  }
});

test('geology is deterministic for a seed and differs between seeds', () => {
  const a = generateWorld(7, 21, opts('river-valley')), b = generateWorld(7, 21, opts('river-valley')), c = generateWorld(8, 21, opts('river-valley'));
  for (const k of ['rock', 'under', 'strata', 'soil', 'landform']) assert.deepEqual(a.mapgen.geology[k], b.mapgen.geology[k], k);
  assert.deepEqual(a.mapgen.geology.landmarks, b.mapgen.geology.landmarks);
  assert.notDeepEqual(a.mapgen.geology.landform, c.mapgen.geology.landform);
});

test('no NaN in heights or geology, and all ids are in range', () => {
  for (const preset of Object.keys(SIGNATURE)) {
    const w = gen(preset), g = w.mapgen.geology;
    for (let i = 0; i < w.heights.length; i++) if (!Number.isFinite(w.heights[i])) assert.fail(`${preset} height ${i}`);
    for (let i = 0; i < g.rock.length; i++) {
      assert.ok(g.rock[i] < ROCKS.length && g.under[i] < ROCKS.length, `${preset} rock id`);
      assert.ok(g.landform[i] < LANDFORMS.length, `${preset} tag id`);
    }
    for (const lm of g.landmarks) assert.ok(Number.isFinite(lm.x) && Number.isFinite(lm.z), `${preset} landmark`);
    const r = geologyAt(w, 0, 0);
    assert.ok(r && Number.isFinite(r.soilDepthMeters) && Number.isFinite(r.hardness));
  }
});

test('starting camps sit on passable, soil-covered ground', () => {
  for (const preset of Object.keys(SIGNATURE)) {
    const w = gen(preset);
    assert.ok(w.camps.length >= 3, `${preset} camps`);
    for (const c of w.camps) {
      const r = geologyAt(w, c.x, c.z);
      assert.ok(r, `${preset} read at camp`);
      assert.ok(!['cliff', 'scree', 'crag', 'boulder-field', 'gorge', 'canyon', 'waterfall', 'sea-cliff', 'crater', 'caldera'].includes(r.landformTag), `${preset} camp on ${r.landformTag}`);
      assert.ok(r.soilDepthMeters >= 0.15, `${preset} camp soil ${r.soilDepthMeters}`);
    }
  }
});

test('cliffs, mesas, buttes, hogbacks and escarpments only occur on hard rock over soft rock', () => {
  const caprock = new Set(['cliff', 'mesa', 'butte', 'hogback', 'escarpment']);
  let seen = 0;
  for (const preset of Object.keys(SIGNATURE)) {
    const g = gen(preset).mapgen.geology;
    for (let i = 0; i < g.landform.length; i++) {
      const t = tagName(g.landform[i]);
      if (!caprock.has(t)) continue;
      seen++;
      assert.ok(ROCKS[g.rock[i]].hardness >= HARD && ROCKS[g.under[i]].hardness <= SOFT, `${preset} ${t} on ${ROCKS[g.rock[i]].name} over ${ROCKS[g.under[i]].name}`);
    }
  }
  assert.ok(seen > 0, 'at least some cap-rock landforms exist');
});

test('sea cliffs stand on hard rock, not sediment', () => {
  const g = gen('archipelago').mapgen.geology;
  let n = 0, hard = 0;
  for (let i = 0; i < g.landform.length; i++) if (tagName(g.landform[i]) === 'sea-cliff') { n++; assert.ok(ROCKS[g.rock[i]].hardness > 0.1, 'sea-cliff on unconsolidated sediment'); if (ROCKS[g.rock[i]].hardness >= 0.6) hard++; }
  assert.ok(n > 0 && hard / n > 0.9, `sea cliffs mostly hard rock (${hard}/${n})`);
});

test('geology generation stays inside the CPU budget', () => {
  for (const preset of ['river-valley', 'highland', 'lakeland']) {
    const c0 = process.cpuUsage(), w = generateWorld(41, 21, opts(preset)), c = process.cpuUsage(c0);
    assert.ok((c.user + c.system) / 1e6 < 12, `${preset} cpu ${(c.user + c.system) / 1e6}s`);
    assert.ok(w.generation.attempt <= 2, `${preset} attempt ${w.generation.attempt}`);
  }
});

test('without the flag, generation 21 carries no geology', () => {
  const w = generateWorld(3, 21, { size: 1040, preset: 'river-valley' });
  assert.equal(w.mapgen.geology, undefined);
});
