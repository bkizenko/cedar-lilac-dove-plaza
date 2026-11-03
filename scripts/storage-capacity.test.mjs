import test, { after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { registerHooks } from "node:module";
import { Game } from "../src/game/sim.ts";
import { encodeGame, decodeGame, validateGameSave } from "../src/game/persistence.ts";
import {
  saveGame,
  protectGame,
  loadRaw,
  hasSave,
  readSaveSlots,
  commitPreparedAutosave,
  currentSaveGeneration,
} from "../src/game/save.ts";
import { parseStoredSave, unpackStoredJson, encodeStoredJson } from "../src/game/storageCodec.ts";
import { preflightAutosave, prepareAutosave } from "../src/game/autosavePayload.ts";
import { SAVE_KEY } from "../src/game/constants.ts";
import { QuotaStorage } from "./fixtures/quota-storage.mjs";
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/"))
      return next(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    return next(specifier, context);
  },
});
const { Engine } = await import("../src/game/engine.ts");
const reports = [],
  hash = (s) => createHash("sha256").update(s).digest("hex");
after(() => {
  if (process.env.SAVE_CAPACITY_REPORT)
    writeFileSync(process.env.SAVE_CAPACITY_REPORT, JSON.stringify(reports, null, 2) + "\n");
});
function generated(size = 1040) {
  const old = Math.random;
  let n = 51;
  Math.random = () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
  try {
    const g = new Game();
    g.reset(1, 16, { size, layout: "pangaea" });
    g.enterIsland();
    g.state.paused = true;
    return g;
  } finally {
    Math.random = old;
  }
}
function adapter(storage, fn) {
  const old = globalThis.localStorage;
  globalThis.localStorage = storage;
  try {
    return fn();
  } finally {
    globalThis.localStorage = old;
  }
}
function roundtrip(g, label) {
  const initial = JSON.stringify(encodeGame(g)),
    originalTime = g.state.time,
    originalFood = g.tribe(0).food;
  for (const mib of [5, 10]) {
    g.state.time = originalTime;
    const storage = new QuotaStorage(mib * 1024 * 1024);
    adapter(storage, () => {
      assert.equal(saveGame(g, true), true);
      assert.equal(protectGame(g), true);
      const protectedBytes = storage.getItem(SAVE_KEY + ":protected");
      g.state.time = originalTime + 1;
      assert.equal(saveGame(g, true), true);
      const slots = readSaveSlots(storage);
      assert.ok(slots.primary && slots.backup && slots.protected);
      assert.equal(slots.protected, protectedBytes);
      for (const value of Object.values(slots)) {
        const raw = parseStoredSave(value);
        validateGameSave(raw);
        assert.equal(raw.state.tribes[0].food, originalFood);
      }
      assert.equal(parseStoredSave(slots.primary).state.time, originalTime + 1);
      assert.equal(parseStoredSave(slots.backup).state.time, originalTime);
      assert.equal(parseStoredSave(slots.protected).state.time, originalTime);
      const loaded = parseStoredSave(slots.primary);
      assert.equal(loaded.state.time, originalTime + 1);
      assert.equal(loaded.state.tribes[0].food, originalFood);
      const snapshot = encodeGame(g);
      g.state.time = originalTime + 0.5;
      const before = [...storage.values];
      assert.equal(saveGame(g), true);
      assert.deepEqual(
        [...storage.values],
        before,
        "newer primary is preserved without a single rewritten key",
      );
      g.state.time = originalTime + 2;
      const expected = readSaveSlots(storage),
        pre = preflightAutosave({
          id: 4,
          phase: "preflight",
          seed: g.state.seed,
          time: g.state.time,
          expected,
        });
      assert.equal(pre.result.status, "preflight");
      const result = prepareAutosave(
        { id: 4, snapshot: { ...encodeGame(g), savedAt: Date.now() }, expected },
        undefined,
        { primary: pre.primary },
      );
      assert.equal(result.status, "ready");
      assert.equal(result.validCandidates, 3);
      assert.equal(
        commitPreparedAutosave(
          expected,
          currentSaveGeneration(),
          result.serialized,
          result.previousPrimaryValid,
          storage,
        ),
        "committed",
      );
      assert.equal(storage.getItem(SAVE_KEY + ":protected"), protectedBytes);
      assert.equal(parseStoredSave(storage.getItem(SAVE_KEY)).state.time, originalTime + 2);
      assert.equal(storage.getItem("unrelated-setting"), "keep");
      assert.ok(storage.bytes() <= storage.limit);
      reports.push({
        label,
        size: g.world.size,
        quotaMiB: mib,
        initialJsonBytes: Buffer.byteLength(initial),
        initialSha256: hash(initial),
        storageBytes: storage.bytes(),
        allThreeSlots: true,
        failures: storage.failures.length,
        firstSerializedCharacters: slots.primary.length,
        strictRoundtrip: true,
        originalFood,
      });
    });
  }
  g.state.time = originalTime;
}
for (const size of [1040, 1560, 2080])
  test(`native V16 ${size} saves/protects/rotates all three full checkpoints at genuine5/10MiB limits without evicting keys`, () =>
    roundtrip(generated(size), `native-${size}`));
test(
  "the exact own-QA fresh1560 export that failed protection now preserves all checkpoints under both limits",
  { skip: !process.env.OWN_QA_EXPORT },
  () => {
    const raw = JSON.parse(readFileSync(process.env.OWN_QA_EXPORT, "utf8"));
    validateGameSave(raw);
    roundtrip(decodeGame(raw), "own-QA-original-failure");
  },
);
test("raw legacy reads, compressed stale preflight and exact raw-slot CAS all retain their existing meaning", () => {
  const g = generated(),
    storage = new QuotaStorage(10 * 1024 * 1024);
  adapter(storage, () => {
    const legacy = JSON.stringify({ ...encodeGame(g), savedAt: 10 });
    storage.setItem(SAVE_KEY, legacy);
    assert.equal(hasSave(), true);
    assert.equal(loadRaw().state.seed, g.state.seed);
    g.state.time = 2;
    assert.equal(saveGame(g, true), true);
    assert.equal(storage.getItem(SAVE_KEY + ":bak"), legacy);
    const protectedBytes = storage.getItem(SAVE_KEY + ":protected");
    const expected = readSaveSlots(storage);
    assert.equal(
      preflightAutosave({ id: 7, phase: "preflight", seed: g.state.seed, time: 1, expected }).result
        .status,
      "stale",
    );
    const prepared = prepareAutosave({
      id: 8,
      snapshot: { ...encodeGame(g), savedAt: 20 },
      expected,
    });
    assert.equal(prepared.status, "ready");
    storage.setItem(SAVE_KEY + ":protected", JSON.stringify({ ...encodeGame(g), savedAt: 30 }));
    const changed = storage.getItem(SAVE_KEY + ":protected"),
      primary = storage.getItem(SAVE_KEY);
    assert.equal(
      commitPreparedAutosave(expected, currentSaveGeneration(), prepared.serialized, true, storage),
      "superseded",
    );
    assert.equal(storage.getItem(SAVE_KEY), primary);
    assert.equal(storage.getItem(SAVE_KEY + ":protected"), changed);
    assert.notEqual(changed, protectedBytes);
    const semantic = () =>
      [...storage.values].map(([k, v]) => [k, k.startsWith(SAVE_KEY) ? unpackStoredJson(v) : v]);
    const before = semantic();
    storage.failKey = SAVE_KEY;
    g.state.time = 3;
    assert.equal(saveGame(g, true), false);
    assert.deepEqual(semantic(), before);
    storage.failKey = SAVE_KEY + ":protected";
    assert.equal(protectGame(g), false);
    assert.deepEqual(semantic(), before);
  });
});
test("recognized damaged or future compressed checkpoints never trigger fresh-world fallback or overwrite existing storage", () => {
  const storage = new QuotaStorage(5 * 1024 * 1024),
    envelope = JSON.parse(encodeStoredJson(JSON.stringify({ padding: "x".repeat(300000) })));
  envelope.hearthwildStorage = 2;
  storage.setItem(SAVE_KEY, JSON.stringify(envelope));
  adapter(storage, () => {
    assert.equal(hasSave(), true);
    assert.equal(loadRaw(), null);
    const before = [...storage.values],
      old = console.error;
    console.error = () => {};
    try {
      assert.throws(
        () =>
          Engine.prototype.begin.call({
            running: false,
            game: { reset: () => assert.fail("must not replace the held village") },
            setQuality: () => assert.fail("must not replace the held village"),
          }),
        /saved village could not be restored/,
      );
    } finally {
      console.error = old;
    }
    assert.deepEqual([...storage.values], before);
  });
});
