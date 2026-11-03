import test, { after } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Game } from "../src/game/sim.ts";
import { encodeGame, validateGameSave } from "../src/game/persistence.ts";
import { SAVE_KEY } from "../src/game/constants.ts";
import { QuotaStorage } from "./fixtures/quota-storage.mjs";
import {
  saveGame,
  protectGame,
  compactLegacySaveSlots,
  readSaveSlots,
  currentSaveGeneration,
  invalidateAutosaveWrites,
  commitPreparedAutosave,
} from "../src/game/save.ts";
import { parseStoredSave, unpackStoredJson, encodeStoredJson } from "../src/game/storageCodec.ts";
import { prepareAutosave } from "../src/game/autosavePayload.ts";
const g = new Game(),
  originalRandom = Math.random;
let rng = 51;
Math.random = () => {
  rng = (Math.imul(rng, 1664525) + 1013904223) >>> 0;
  return rng / 4294967296;
};
try {
  g.reset(1, 16, { size: 1560, layout: "pangaea" });
  g.enterIsland();
} finally {
  Math.random = originalRandom;
}
const legacy = " \n" + JSON.stringify({ ...encodeGame(g), savedAt: 123 }) + "\n ",
  legacyHash = createHash("sha256").update(legacy).digest("hex"),
  reports = [];
assert.ok(legacy.length * 2 < 5 * 1024 * 1024);
after(() => {
  if (process.env.SAVE_MIGRATION_REPORT)
    writeFileSync(
      process.env.SAVE_MIGRATION_REPORT,
      JSON.stringify({ legacyHash, legacyBytes: legacy.length * 2, reports }, null, 2) + "\n",
    );
});
function run(storage, fn) {
  const old = globalThis.localStorage;
  globalThis.localStorage = storage;
  g.state.time = 1;
  try {
    return fn();
  } finally {
    globalThis.localStorage = old;
  }
}
function exact(value) {
  assert.equal(unpackStoredJson(value), legacy);
  validateGameSave(parseStoredSave(value));
  assert.equal(parseStoredSave(value).savedAt, 123);
  assert.equal(parseStoredSave(value).state.time, 0);
}
for (const slot of ["protected", "bak"])
  test(`a genuine near-full5MiB legacy raw ${slot} checkpoint migrates encoding only and manual save retries without losing its exact JSON`, () => {
    const s = new QuotaStorage(5 * 1024 * 1024);
    s.setItem(SAVE_KEY + ":" + slot, legacy);
    run(s, () => {
      const generation = currentSaveGeneration();
      assert.equal(saveGame(g, true), true);
      assert.ok(currentSaveGeneration() > generation);
      exact(s.getItem(SAVE_KEY + ":" + slot));
      assert.notEqual(s.getItem(SAVE_KEY + ":" + slot), legacy);
      assert.equal(parseStoredSave(s.getItem(SAVE_KEY)).state.time, 1);
      assert.equal(s.getItem("unrelated-setting"), "keep");
      assert.ok(s.bytes() < s.limit);
      reports.push({
        slot,
        quota: s.limit,
        totalBytes: s.bytes(),
        exactOldJson: true,
        savedAt: 123,
        currentTime: 1,
      });
    });
  });
test("worker quota compaction supersedes its old raw snapshot/generation and only a fresh job may commit", () => {
  const s = new QuotaStorage(5 * 1024 * 1024);
  s.setItem(SAVE_KEY + ":protected", legacy);
  run(s, () => {
    const expected = readSaveSlots(s),
      generation = currentSaveGeneration(),
      job = { id: 40, snapshot: { ...encodeGame(g), savedAt: 500 }, expected },
      result = prepareAutosave(job);
    assert.equal(result.status, "ready");
    assert.equal(
      commitPreparedAutosave(
        expected,
        generation,
        result.serialized,
        result.previousPrimaryValid,
        s,
      ),
      "superseded",
    );
    assert.equal(s.getItem(SAVE_KEY), null);
    exact(s.getItem(SAVE_KEY + ":protected"));
    const afterMigration = s.getItem(SAVE_KEY + ":protected");
    assert.equal(
      commitPreparedAutosave(
        expected,
        generation,
        result.serialized,
        result.previousPrimaryValid,
        s,
      ),
      "superseded",
    );
    const freshExpected = readSaveSlots(s),
      freshGeneration = currentSaveGeneration(),
      fresh = prepareAutosave({
        id: 41,
        snapshot: { ...encodeGame(g), savedAt: 501 },
        expected: freshExpected,
      });
    assert.equal(
      commitPreparedAutosave(
        freshExpected,
        freshGeneration,
        fresh.serialized,
        fresh.previousPrimaryValid,
        s,
      ),
      "committed",
    );
    assert.equal(s.getItem(SAVE_KEY + ":protected"), afterMigration);
    assert.equal(parseStoredSave(s.getItem(SAVE_KEY)).state.time, 1);
  });
});
test("explicit protection also retries after encoding-only conversion of an old near-full backup, preserving that backup", () => {
  const s = new QuotaStorage(5 * 1024 * 1024);
  s.setItem(SAVE_KEY + ":bak", legacy);
  run(s, () => {
    assert.equal(protectGame(g), true);
    assert.equal(s.getItem(SAVE_KEY), null);
    exact(s.getItem(SAVE_KEY + ":bak"));
    assert.equal(parseStoredSave(s.getItem(SAVE_KEY + ":protected")).state.time, 1);
    assert.ok(s.bytes() < s.limit);
  });
});
test("unknown/corrupt managed checkpoints and unrelated values remain byte-identical during attempted compaction", () => {
  const s = new QuotaStorage(5 * 1024 * 1024);
  s.setItem(SAVE_KEY + ":protected", '{"version":1,"state":{}}');
  s.setItem(SAVE_KEY + ":bak", '{"hearthwildStorage":2,"data":"future"}');
  const before = [...s.values],
    generation = currentSaveGeneration();
  assert.deepEqual(compactLegacySaveSlots(s, readSaveSlots(s), generation), {
    status: "unchanged",
    changed: false,
  });
  assert.deepEqual([...s.values], before);
  assert.equal(currentSaveGeneration(), generation);
});
test("every replacement rechecks the entire raw snapshot and generation after preparing compression", () => {
  const s = new QuotaStorage(5 * 1024 * 1024);
  s.setItem(SAVE_KEY + ":protected", legacy);
  let expected = readSaveSlots(s),
    generation = currentSaveGeneration();
  invalidateAutosaveWrites();
  assert.equal(compactLegacySaveSlots(s, expected, generation).status, "superseded");
  assert.equal(s.getItem(SAVE_KEY + ":protected"), legacy);
  expected = readSaveSlots(s);
  generation = currentSaveGeneration();
  const get = s.getItem.bind(s),
    other = JSON.stringify({ ...JSON.parse(legacy), savedAt: 999 });
  let changed = false;
  s.getItem = (k) => {
    if (!changed) {
      changed = true;
      s.setItem(SAVE_KEY + ":protected", other);
    }
    return get(k);
  };
  const result = compactLegacySaveSlots(s, expected, generation);
  assert.equal(result.status, "superseded");
  assert.equal(result.changed, false);
  assert.equal(s.getItem(SAVE_KEY + ":protected"), other);
});
test("partial write failure retains every old state exactly; a stale prepared response is never retargeted", () => {
  const s = new QuotaStorage(10 * 1024 * 1024);
  s.setItem(SAVE_KEY + ":bak", legacy);
  s.setItem(SAVE_KEY + ":protected", legacy);
  run(s, () => {
    const expected = readSaveSlots(s),
      generation = currentSaveGeneration(),
      prepared = prepareAutosave({ id: 60, snapshot: encodeGame(g), expected }),
      set = s.setItem.bind(s),
      keys = [...s.values.keys()];
    s.setItem = (k, v) => {
      if (k === SAVE_KEY || k === SAVE_KEY + ":protected")
        throw new DOMException("forced quota", "QuotaExceededError");
      set(k, v);
    };
    assert.equal(saveGame(g, true), false);
    assert.equal(s.getItem(SAVE_KEY), null);
    exact(s.getItem(SAVE_KEY + ":bak"));
    assert.equal(s.getItem(SAVE_KEY + ":protected"), legacy);
    assert.deepEqual([...s.values.keys()], keys);
    assert.equal(s.getItem("unrelated-setting"), "keep");
    assert.equal(
      commitPreparedAutosave(
        expected,
        generation,
        prepared.serialized,
        prepared.previousPrimaryValid,
        s,
      ),
      "superseded",
    );
  });
});
test("after one own conversion, a changed foreign slot cancels the remaining conversions without replacing newer data", () => {
  const s = new QuotaStorage(10 * 1024 * 1024);
  s.setItem(SAVE_KEY + ":bak", legacy);
  s.setItem(SAVE_KEY + ":protected", legacy);
  const expected = readSaveSlots(s),
    generation = currentSaveGeneration(),
    other = JSON.stringify({ ...JSON.parse(legacy), savedAt: 999 }),
    set = s.setItem.bind(s);
  let injected = false;
  s.setItem = (k, v) => {
    set(k, v);
    if (k === SAVE_KEY + ":bak" && !injected) {
      injected = true;
      set(SAVE_KEY + ":protected", other);
    }
  };
  const result = compactLegacySaveSlots(s, expected, generation);
  assert.deepEqual(result, { status: "superseded", changed: true });
  exact(s.getItem(SAVE_KEY + ":bak"));
  assert.equal(s.getItem(SAVE_KEY + ":protected"), other);
  assert.equal(parseStoredSave(other).savedAt, 999);
});
test("denied first conversion reports a real failure, invalidates its old job, and only fresh jobs recover after writes resume", () => {
  const s = new QuotaStorage(5 * 1024 * 1024);
  s.setItem(SAVE_KEY + ":protected", legacy);
  run(s, () => {
    const before = [...s.values],
      set = s.setItem.bind(s),
      expected = readSaveSlots(s),
      generation = currentSaveGeneration(),
      prepared = prepareAutosave({ id: 70, snapshot: encodeGame(g), expected });
    s.setItem = () => {
      throw new DOMException("blocked", "QuotaExceededError");
    };
    assert.equal(
      commitPreparedAutosave(
        expected,
        generation,
        prepared.serialized,
        prepared.previousPrimaryValid,
        s,
      ),
      "failed",
    );
    assert.deepEqual([...s.values], before);
    assert.ok(currentSaveGeneration() > generation);
    assert.equal(
      commitPreparedAutosave(
        expected,
        generation,
        prepared.serialized,
        prepared.previousPrimaryValid,
        s,
      ),
      "superseded",
    );
    const freshExpected = readSaveSlots(s),
      freshGeneration = currentSaveGeneration(),
      fresh = prepareAutosave({ id: 71, snapshot: encodeGame(g), expected: freshExpected });
    assert.equal(
      commitPreparedAutosave(
        freshExpected,
        freshGeneration,
        fresh.serialized,
        fresh.previousPrimaryValid,
        s,
      ),
      "failed",
    );
    assert.deepEqual([...s.values], before);
    s.setItem = set;
    let last;
    for (let id = 72; id < 75; id++) {
      const nextExpected = readSaveSlots(s),
        nextGeneration = currentSaveGeneration(),
        next = prepareAutosave({ id, snapshot: encodeGame(g), expected: nextExpected });
      last = commitPreparedAutosave(
        nextExpected,
        nextGeneration,
        next.serialized,
        next.previousPrimaryValid,
        s,
      );
      if (last === "committed") break;
      assert.equal(last, "superseded");
    }
    assert.equal(last, "committed");
    exact(s.getItem(SAVE_KEY + ":protected"));
    assert.equal(parseStoredSave(s.getItem(SAVE_KEY)).state.time, 1);
  });
});
