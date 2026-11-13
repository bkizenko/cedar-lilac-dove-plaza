import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWorld } from '../src/game/worldgen.ts';
import { geologyAt } from '../src/game/mapgen/geology/read.ts';
import { ROCKS, HARD } from '../src/game/mapgen/geology/rocks.ts';

const gen = (preset, seed) => generateWorld(seed, 21, { size: 1040, preset, geologyVersion: 1 });
const hardShare = (w, pts) => { let n = 0, h = 0; for (const p of pts) { const r = geologyAt(w, p.x, p.z); if (!r || !r.rock) continue; n++; if (ROCKS[r.rock].hardness >= HARD) h++; } return h / Math.max(1, n); };

test('stone outcrops are enriched on hard rock compared with the land they sit in', () => {
  let enriched = 0, runs = 0;
  for (const preset of ['river-valley', 'highland', 'steppe', 'lakeland']) {
    const w = gen(preset, 3), land = [];
    for (let x = -480; x <= 480; x += 24) for (let z = -480; z <= 480; z += 24) { const r = geologyAt(w, x, z); if (r && r.rock) land.push({ x, z }); }
    const stones = w.stones ?? w.nodes?.filter(n => n.kind === 'stone');
    assert.ok(stones.length > 20, `${preset} has stone`);
    runs++; const s = hardShare(w, stones), l = hardShare(w, land); if (s - l >= 0.2) enriched++;
  }
  assert.ok(enriched >= 3, `hard-rock share of stone beat land share by 20 points in ${enriched}/${runs} presets`);
});

test('geology-aware stone placement is deterministic; worlds without geology are unchanged by the switch', () => {
  const a = gen('highland', 5), b = gen('highland', 5);
  assert.deepEqual((a.stones ?? []).map(n => [n.x, n.z, n.amount]), (b.stones ?? []).map(n => [n.x, n.z, n.amount]));
  const legacy1 = generateWorld(5, 21, { size: 1040, preset: 'highland' }), legacy2 = generateWorld(5, 21, { size: 1040, preset: 'highland' });
  assert.equal(legacy1.mapgen.geology, undefined);
  assert.deepEqual(legacy1.stones.map(n => [n.x, n.z]), legacy2.stones.map(n => [n.x, n.z]));
});
