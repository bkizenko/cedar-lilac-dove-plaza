import {parseStoredSave} from '../src/game/storageCodec.ts';
import test from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { Game } from "../src/game/sim.ts";
import { encodeGame, decodeGame } from "../src/game/persistence.ts";
import { SAVE_KEY } from "../src/game/constants.ts";
registerHooks({
  resolve(specifier, context, next) {
    if (specifier.startsWith("@/"))
      return next(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    return next(specifier, context);
  },
});
const { Engine } = await import("../src/game/engine.ts");
function opening(seed) {
  const g = new Game();
  g.reset(seed, 14, { size: 1040, layout: "pangaea" });
  g.enterIsland();
  return encodeGame(g);
}
const original = opening(17),
  incoming = opening(23),
  replacement = opening(41);
function deferred() {
  let resolve, reject;
  const promise = new Promise((a, b) => {
    resolve = a;
    reject = b;
  });
  return { file: { text: () => promise }, resolve, reject };
}
function fixture() {
  const e = Object.create(Engine.prototype);
  Object.assign(e, {
    game: decodeGame(original),
    originalGame: null,
    disposed: false,
    importSequence: 0,
    autosave: { invalidate() {}, dispose() {} },
    keyboard: { groups: new Map() },
    canvas: { focus() {}, removeEventListener() {} },
    audio: { unlock() {}, play() {}, dispose() {} },
    view: {
      look: { set() {} },
      rebuild(g) {
        e.rebuilt.push(g);
      },
      renderer: { setAnimationLoop() {} },
      dispose() {},
    },
    rebuilt: [],
    shown: [],
    ro: null,
  });
  e.pushHud = () => e.shown.push({ game: e.game, banner: e.game.state.banner });
  return e;
}
async function storage(body, fail = () => false) {
  const previous = globalThis.localStorage,
    values = new Map(),
    writes = [];
  globalThis.localStorage = {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => {
      writes.push({ key: k, value: v });
      if (fail(k, v)) throw new Error("quota");
      values.set(k, v);
    },
  };
  try {
    return await body({ values, writes });
  } finally {
    globalThis.localStorage = previous;
  }
}

test("actual import restores the validated village, protects old inventory and returns applied/saved outcome", () =>
  storage(async ({ values }) => {
    const e = fixture(),
      old = e.game,
      result = await e.importVillage({ text: async () => JSON.stringify(incoming) });
    assert.equal(result.applied, true);
    assert.equal(result.saved, true);
    assert.equal(e.game.state.seed, 23);
    assert.equal(e.game.tribe(0).food, incoming.state.tribes[0].food);
    assert.equal(e.rebuilt.length, 1);
    assert.equal(parseStoredSave(values.get(SAVE_KEY)).state.seed, 23);
    assert.equal(parseStoredSave(values.get(SAVE_KEY + ":protected")).state.seed, old.state.seed);
    assert.equal(e.shown.at(-1).game, e.game);
    assert.match(result.message, /imported/);
  }));

test("delayed file cannot overwrite an actual Engine restart or write its old payload afterward", () =>
  storage(async ({ values, writes }) => {
    const e = fixture(),
      d = deferred(),
      oldState = e.game.state,
      pending = e.importVillage(d.file);
    await e.restart({ layout: "pangaea", size: 1040 });
    assert.notEqual(e.game.state, oldState);
    const now = e.game.state,
      shown = e.shown.length,
      count = writes.length,
      savedBefore = [...values.entries()];
    d.resolve(JSON.stringify(incoming));
    const result = await pending;
    assert.deepEqual(result, {
      applied: false,
      saved: false,
      message: "Import cancelled — the active village changed.",
    });
    assert.equal(e.game.state, now);
    assert.equal(e.shown.length, shown);
    assert.equal(writes.length, count);
    assert.deepEqual([...values.entries()], savedBefore);
  }));

test("same Game object with an actual replaced state invalidates delayed import before parsing or saving", () =>
  storage(async ({ writes }) => {
    const e = fixture(),
      d = deferred(),
      g = e.game,
      pending = e.importVillage(d.file);
    g.reset(71, 14, { size: 1040, layout: "pangaea" });
    g.enterIsland();
    const state = g.state,
      banner = state.banner;
    d.resolve("{");
    const result = await pending;
    assert.equal(result.applied, false);
    assert.match(result.message, /cancelled/);
    assert.equal(e.game, g);
    assert.equal(g.state, state);
    assert.equal(state.banner, banner);
    assert.equal(writes.length, 0);
    assert.equal(e.rebuilt.length, 0);
  }));

test("a newer import wins and an older delayed file cannot restore or save over it", () =>
  storage(async ({ values, writes }) => {
    const e = fixture(),
      older = deferred(),
      newer = deferred(),
      a = e.importVillage(older.file),
      b = e.importVillage(newer.file);
    newer.resolve(JSON.stringify(replacement));
    const newest = await b;
    assert.equal(newest.applied, true);
    assert.equal(newest.saved, true);
    assert.equal(e.game.state.seed, 41);
    const count = writes.length,
      banner = e.game.state.banner;
    older.resolve(JSON.stringify(incoming));
    const stale = await a;
    assert.equal(stale.applied, false);
    assert.equal(stale.saved, false);
    assert.match(stale.message, /cancelled/);
    assert.equal(e.game.state.seed, 41);
    assert.equal(e.game.state.banner, banner);
    assert.equal(writes.length, count);
    assert.equal(parseStoredSave(values.get(SAVE_KEY)).state.seed, 41);
  }));

test("actual disposal retains its checkpoint but delayed import never writes/restores a disposed engine", () =>
  storage(async ({ values, writes }) => {
    const e = fixture(),
      d = deferred(),
      pending = e.importVillage(d.file),
      oldWindow = globalThis.window,
      oldDocument = globalThis.document;
    globalThis.window = { removeEventListener() {} };
    globalThis.document = { removeEventListener() {} };
    try {
      await e.dispose();
      const count = writes.length,
        g = e.game;
      assert.equal(e.disposed, true);
      assert.equal(parseStoredSave(values.get(SAVE_KEY)).state.seed, 17);
      d.resolve(JSON.stringify(incoming));
      const result = await pending;
      assert.equal(result.applied, false);
      assert.equal(e.game, g);
      assert.equal(writes.length, count);
      assert.equal(e.rebuilt.length, 0);
    } finally {
      globalThis.window = oldWindow;
      globalThis.document = oldDocument;
    }
  }));

test("failure to protect the current village refuses import without applying or replacing saved stock", () =>
  storage(
    async ({ values }) => {
      const e = fixture(),
        g = e.game,
        food = g.tribe(0).food,
        result = await e.importVillage({ text: async () => JSON.stringify(incoming) });
      assert.equal(result.applied, false);
      assert.equal(result.saved, false);
      assert.match(result.message, /protect your current village/);
      assert.equal(e.game, g);
      assert.equal(g.tribe(0).food, food);
      assert.equal(e.rebuilt.length, 0);
      assert.equal(values.size, 0);
    },
    () => true,
  ));

test("post-restore primary quota failure truthfully reports applied but unsaved, preserving the original checkpoint", () =>
  storage(
    async ({ values }) => {
      const e = fixture(),
        result = await e.importVillage({ text: async () => JSON.stringify(incoming) });
      assert.equal(result.applied, true);
      assert.equal(result.saved, false);
      assert.match(result.message, /imported but local saving failed/);
      assert.equal(e.game.state.seed, 23);
      assert.equal(parseStoredSave(values.get(SAVE_KEY)).state.seed, 17);
      assert.equal(parseStoredSave(values.get(SAVE_KEY + ":protected")).state.seed, 17);
      assert.equal(e.rebuilt.length, 1);
    },
    (key, value) => key === SAVE_KEY && parseStoredSave(value).state.seed === 23,
  ));

test("read/parse/validator failures keep actual active village and publish their returned error", () =>
  storage(async ({ writes }) => {
    for (const file of [
      {
        text: async () => {
          throw new Error("File could not be read");
        },
      },
      { text: async () => "{header" },
      { text: async () => JSON.stringify({ version: 0, state: {} }) },
    ]) {
      const e = fixture(),
        g = e.game,
        result = await e.importVillage(file);
      assert.equal(result.applied, false);
      assert.equal(result.saved, false);
      assert.ok(result.message);
      assert.equal(e.game, g);
      assert.equal(e.shown.at(-1).banner, result.message);
      assert.equal(e.rebuilt.length, 0);
    }
    assert.equal(writes.length, 0);
  }));

test("renderer preparation failure preserves the original village and never claims the import applied", () =>
  storage(async ({ values }) => {
    const e = fixture();
    e.view.rebuild = () => {
      throw new Error("Renderer unavailable");
    };
    const originalOwner=e.game;
    const result = await e.importVillage({ text: async () => JSON.stringify(incoming) });
    assert.equal(result.applied, false);
    assert.equal(result.saved, false);
    assert.match(result.message, /Renderer unavailable/);
    assert.equal(e.game, originalOwner, 'renderer preparation must not replace the authoritative village');
    assert.equal(e.game.state.seed, 17);
    assert.equal(parseStoredSave(values.get(SAVE_KEY)).state.seed, 17);
  }));
