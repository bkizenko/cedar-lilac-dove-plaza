import test from 'node:test';
import assert from 'node:assert/strict';
import * as D from '../src/game/wonderDefs.ts';
test('Medieval and Renaissance have foundable wonders with real costs and effects', () => {
  assert.deepEqual(D.validRegistry(), []);
  for (const age of [4, 5]) {
    const at = D.WONDER_DEFS.filter(d => d.minAge === age && !d.earthworks);
    assert.ok(at.length >= 3, `age ${age} has ${at.length} wonders`);
    for (const d of at) {
      assert.ok(d.cost.stone > 0 && d.cost.wood > 0 && d.cost.labour > 0, d.id);
      assert.ok(d.effects.some(e => e.id === 'prestige'), d.id);
      assert.ok(d.kit, `${d.id} has a build recipe`);
    }
  }
  // Stage goods add up exactly to the cost (no free or lost materials).
  for (const id of ['cathedral', 'university', 'starFort', 'canalLocks', 'greatBridge', 'guildHall']) {
    const d = D.wonderDef(id); assert.ok(d, id);
    for (const k of ['wood', 'stone', 'food', 'copper', 'iron']) {
      let sum = 0; for (let s = 0; s < D.STAGE_COUNT; s++) sum += D.stageGoods(id, s)[k];
      assert.equal(sum, d.cost[k] ?? 0, `${id} ${k}`);
    }
  }
  assert.ok(D.wonderDef('university').effects.some(e => e.id === 'knowledge' && e.amount >= .2));
  assert.ok(D.wonderDef('starFort').effects.some(e => e.id === 'defence'));
});
