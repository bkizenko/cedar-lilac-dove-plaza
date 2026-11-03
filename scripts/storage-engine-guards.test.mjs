import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Game } from "../src/game/sim.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";
import { SAVE_KEY } from "../src/game/constants.ts";
import { QuotaStorage } from "./fixtures/quota-storage.mjs";
import { parseStoredSave, unpackStoredJson } from "../src/game/storageCodec.ts";
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/"))
      return next(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    return next(specifier, context);
  },
});
const { Engine } = await import("../src/game/engine.ts");
function fresh(size = 1560) {
  const g = new Game();
  g.reset(1, 16, { size, layout: "pangaea" });
  g.enterIsland();
  g.state.paused = true;
  return g;
}
function engine(g) {
  const e = Object.create(Engine.prototype);
  Object.assign(e, {
    game: g,
    originalGame: null,
    disposed: false,
    importSequence: 0,
    autosave: { invalidate() {} },
    keyboard: { groups: new Map() },
    canvas: { focus() {} },
    audio: { unlock() {}, play() {} },
    view: { look: { set() {} }, rebuild() {} },
    pushHud() {},
  });
  return e;
}
const hash = (s) => createHash("sha256").update(s).digest("hex");
async function importAtQuota(old, label) {
  const storage = new QuotaStorage(5 * 1024 * 1024),
    before = JSON.stringify(encodeGame(old)),
    incoming = JSON.stringify(encodeGame(fresh(1040))),
    originalStorage = globalThis.localStorage;
  globalThis.localStorage = storage;
  try {
    const e = engine(old),
      result = await e.importVillage({ text: async () => incoming });
    assert.equal(result.applied, true, result.message);
    assert.equal(result.saved, true, result.message);
    const protectedRaw = parseStoredSave(storage.getItem(SAVE_KEY + ":protected"));
    delete protectedRaw.savedAt;
    assert.equal(JSON.stringify(protectedRaw), before);
    assert.equal(
      JSON.stringify(parseStoredSave(storage.getItem(SAVE_KEY)).state.tribes[0].food),
      JSON.stringify(JSON.parse(incoming).state.tribes[0].food),
    );
    assert.ok(storage.bytes() < storage.limit);
    assert.equal(storage.getItem("unrelated-setting"), "keep");
    console.log(
      JSON.stringify({
        label,
        actualEngineImport: true,
        applied: result.applied,
        saved: result.saved,
        oldPayloadSha256: hash(before),
        storageBytes: storage.bytes(),
        quota: storage.limit,
      }),
    );
  } finally {
    globalThis.localStorage = originalStorage;
  }
}
test("actual Engine import from a supported native1560 world protects every exact old field at5MiB", () =>
  importAtQuota(fresh(), "native1560"));
test(
  "the actual previously failing own-QA3MB village now passes the same Engine protection/import guard at5MiB",
  { skip: !process.env.OWN_QA_EXPORT },
  () =>
    importAtQuota(
      decodeGame(JSON.parse(readFileSync(process.env.OWN_QA_EXPORT, "utf8"))),
      "own-QA-original-failure",
    ),
);
test("actual current new-world configuration preserves its checkpoint through legacy-full5MiB recovery and refuses real storage failure", () => {
  const g = fresh(),
    e = engine(g),
    legacy = " \n" + JSON.stringify({ ...encodeGame(g), savedAt: 123 }) + "\n ",
    storage = new QuotaStorage(5 * 1024 * 1024),
    originalStorage = globalThis.localStorage;
  storage.setItem(SAVE_KEY + ":bak", legacy);
  let sawExactMigration = false;
  const set = storage.setItem.bind(storage);
  storage.setItem = (key, value) => {
    set(key, value);
    if (key === SAVE_KEY + ":bak" && unpackStoredJson(value) === legacy) sawExactMigration = true;
  };
  globalThis.localStorage = storage;
  try {
    const oldFood = g.tribe(0).food,
      oldSeed = g.state.seed;
    assert.equal(e.configureNewWorld({ size: 1040, layout: "pangaea", difficulty: "hard" }), true);
    assert.equal(sawExactMigration, true);
    assert.equal(e.game.state.difficulty, "hard");
    assert.equal(e.game.tribe(0).food, 102);
    const checkpoint = parseStoredSave(storage.getItem(SAVE_KEY + ":protected"));
    assert.equal(checkpoint.state.seed, oldSeed);
    assert.equal(checkpoint.state.tribes[0].food, oldFood);
    assert.ok(storage.bytes() < storage.limit);
    const now = e.game.state,
      held = [...storage.values];
    storage.setItem = () => {
      throw new DOMException("blocked", "QuotaExceededError");
    };
    assert.equal(e.configureNewWorld({ difficulty: "easy" }), false);
    assert.equal(e.game.state, now);
    assert.deepEqual([...storage.values], held);
  } finally {
    globalThis.localStorage = originalStorage;
  }
});
