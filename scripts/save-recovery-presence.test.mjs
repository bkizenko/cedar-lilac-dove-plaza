import test from 'node:test';
import assert from 'node:assert/strict';
import {hasSave, loadRaw} from '../src/game/save.ts';
import {SAVE_KEY, SAVE_VERSION} from '../src/game/constants.ts';
import {Engine} from '../src/game/engine.ts';

function withSlots(entries, fn) {
  const previous = globalThis.localStorage;
  const data = new Map(entries);
  const writes = [];
  globalThis.localStorage = {
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => { writes.push([key, value]); data.set(key, value); },
  };
  try { fn(data, writes); }
  finally { globalThis.localStorage = previous; }
}

test('an occupied village slot is never mistaken for an empty profile when its contents cannot load', () => {
  for (const key of [SAVE_KEY, SAVE_KEY + ':bak', SAVE_KEY + ':protected']) {
    for (const raw of [
      '{"version":',
      JSON.stringify({version: SAVE_VERSION + 1, state: {seed: 42, time: 100}}),
      JSON.stringify({version: SAVE_VERSION - 1, state: {seed: 42, time: 100}}),
      JSON.stringify({version: SAVE_VERSION}),
      'null',
      '',
    ]) {
      withSlots([[key, raw]], (data, writes) => {
        assert.equal(hasSave(), true, `${key} must remain held for recovery: ${raw}`);
        assert.equal(loadRaw(), null, 'presence never weakens strict load validation');
        assert.deepEqual([...data], [[key, raw]], 'detection and recovery keep exact source bytes');
        assert.deepEqual(writes, []);
      });
    }
  }
});

test('a genuinely empty profile and an isolated Test Lab save do not count as a real village', () => {
  for (const entries of [[], [[SAVE_KEY + ':test-lab', '{"test":true}']]]) {
    withSlots(entries, (_data, writes) => {
      assert.equal(hasSave(), false);
      assert.equal(loadRaw(), null);
      assert.deepEqual(writes, []);
    });
  }
});

test('the real startup guard refuses to reset or replace an unreadable held village', () => {
  const error = console.error;
  console.error = () => {};
  try {
    for (const key of [SAVE_KEY, SAVE_KEY + ':bak', SAVE_KEY + ':protected']) {
      for (const raw of ['{"version":', JSON.stringify({version: SAVE_VERSION + 1, state: {seed: 42}})]) {
        withSlots([[key, raw]], (data, writes) => {
          assert.throws(() => Engine.prototype.begin.call({
            running: false,
            game: {reset: () => assert.fail('must not replace the held village')},
            safetyLower: () => assert.fail('must not create a fallback village'),
          }), /saved village could not be restored/);
          assert.deepEqual([...data], [[key, raw]]);
          assert.deepEqual(writes, []);
        });
      }
    }
  } finally { console.error = error; }
});
