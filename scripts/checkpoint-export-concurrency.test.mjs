import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {SimulationCheckpointSaver} from '../src/game/simulationCheckpointSave.ts';
import {serializeStoredSave} from '../src/game/storageCodec.ts';
import {SAVE_KEY} from '../src/game/constants.ts';

let opening;
function fixture() {
  opening ??= nativeDairyVillage().save;
  const snapshot = structuredClone(opening);
  snapshot.savedAt = 1000;
  const reply = {
    source: 'main', sessionEpoch: 1, serialized: serializeStoredSave(snapshot),
    context: {started:true, awaitingStart:false, testMode:false, revealMap:false},
    clock: {tick:0, time:snapshot.state.time, paused:true, speed:1, stateRevision:0, appliedSequence:0},
    rng: null,
  };
  let epoch = 1;
  const pending = [], writes = [], slots = new Map([
    [SAVE_KEY, 'held primary'], [SAVE_KEY + ':bak', 'held backup'],
    [SAVE_KEY + ':protected', 'held protection'],
  ]);
  const storage = {getItem:k=>slots.get(k)??null, setItem:(k,v)=>{writes.push(k);slots.set(k,v);}};
  const saver = new SimulationCheckpointSaver({
    checkpoint:()=>new Promise(resolve=>pending.push(resolve)),
    currentEpoch:()=>epoch, allowed:()=>true,
  }, storage);
  return {saver,pending,reply,slots,writes,replaceSession:()=>epoch++};
}

test('an export finishes without cancelling an earlier pending durable village save', async () => {
  const f=fixture(), before=[...f.slots];
  const save=f.saver.save(), exported=f.saver.save('export');
  f.pending[1](f.reply);
  assert.equal((await exported).status,'committed');
  assert.deepEqual([...f.slots],before,'export itself writes no durable bytes');
  f.pending[0](f.reply);
  assert.equal((await save).status,'committed','read-only export must not supersede the durable save');
  assert.equal(f.slots.get(SAVE_KEY),f.reply.serialized);
  assert.equal(f.slots.get(SAVE_KEY+':bak'),'held backup');
  assert.equal(f.slots.get(SAVE_KEY+':protected'),'held protection');
  assert.deepEqual(f.writes,[SAVE_KEY]);
});

test('overlapping exports preserve a pending protected checkpoint and can complete in either order', async () => {
  const f=fixture(), before=[...f.slots];
  const save=f.saver.save('protected'), first=f.saver.save('export'), second=f.saver.save('export');
  f.pending[2](f.reply);assert.equal((await second).status,'committed');
  f.pending[1](f.reply);assert.equal((await first).status,'committed');
  assert.deepEqual([...f.slots],before);
  f.pending[0](f.reply);assert.equal((await save).status,'committed');
  assert.equal(f.slots.get(SAVE_KEY),'held primary');
  assert.equal(f.slots.get(SAVE_KEY+':bak'),'held backup');
  assert.equal(f.slots.get(SAVE_KEY+':protected'),f.reply.serialized);
  assert.deepEqual(f.writes,[SAVE_KEY+':protected']);
});

test('session replacement still rejects both pending export and save without storage mutation', async () => {
  const f=fixture(), before=[...f.slots];
  const save=f.saver.save(), exported=f.saver.save('export');f.replaceSession();
  f.pending[1](f.reply);f.pending[0](f.reply);
  assert.equal((await exported).status,'superseded');assert.equal((await save).status,'superseded');
  assert.deepEqual([...f.slots],before);assert.deepEqual(f.writes,[]);
});
