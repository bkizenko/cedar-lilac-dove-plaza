import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { Game } from '../src/game/sim.ts';
import { encodeGame, decodeGame, validateGameSave } from '../src/game/persistence.ts';

const hash = (w) => createHash('sha256').update(JSON.stringify(w, (_k, v) => (ArrayBuffer.isView(v) ? Array.from(v) : v))).digest('hex');

for (const [seed, preset, size] of [[4, 'river-valley', 1040], [9, 'island', 1560], [2, 'steppe', 1040]]) {
  test(`v20 ${preset}/${seed}/${size} plays, saves and restores the exact landscape`, () => {
    const g = new Game();
    g.reset(seed, 20, { preset, size });
    g.enterIsland();
    assert.equal(g.state.worldgenVersion, 20);
    assert.equal(g.world.options.preset, preset);
    assert.ok(g.world.mapgen.name);
    for (let i = 0; i < 40; i++) g.step(0.25);
    const raw = JSON.parse(JSON.stringify(encodeGame(g)));
    validateGameSave(raw);
    const back = decodeGame(raw);
    assert.equal(hash(back.world.heights), hash(g.world.heights));
    assert.equal(hash(back.world.camps), hash(g.world.camps));
    assert.equal(hash(back.world.trees), hash(g.world.trees));
    assert.equal(back.world.options.preset, preset);
  });
}

test('v20 save with an unknown preset is rejected', () => {
  const g = new Game();
  g.reset(4, 20, { preset: 'pangaea' });
  g.enterIsland();
  const raw = JSON.parse(JSON.stringify(encodeGame(g)));
  const holder = raw.worldOptions ? raw : raw.state; holder.worldOptions.preset = "moonbase";
  assert.throws(() => validateGameSave(raw));
});
