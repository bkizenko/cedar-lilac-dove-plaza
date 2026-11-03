import test from "node:test";
import assert from "node:assert/strict";
import { Unzlib } from "three/examples/jsm/libs/fflate.module.js";
import {
  SAVE_CODEC_RULES,
  packStorageBytes,
  unpackStorageBytes,
  encodeStoredJson,
  serializeStoredSave,
  unpackStoredJson,
  parseStoredSave,
} from "../src/game/storageCodec.ts";
test("UTF15 packing is canonical and round-trips every byte/padding length without controls or surrogates", () => {
  let r = 41;
  for (const size of [...Array.from({ length: 40 }, (_, i) => i), 4095, 4096, 8193]) {
    const bytes = Uint8Array.from({ length: size }, () => {
        r = (Math.imul(r, 1664525) + 1013904223) >>> 0;
        return r & 255;
      }),
      packed = packStorageBytes(bytes);
    assert.equal(packed.length, Math.ceil((size * 8) / 15));
    assert.doesNotMatch(packed, /[\u0000-\u009f\ud800-\udfff]/u);
    assert.ok([...packed].every((c) => c.charCodeAt(0) >= 0x4000 && c.charCodeAt(0) <= 0xbfff));
    assert.deepEqual(unpackStorageBytes(packed, size), bytes);
    assert.equal(JSON.parse(JSON.stringify({ packed })).packed, packed);
  }
  assert.throws(() => unpackStorageBytes("x", 1));
  assert.throws(() => unpackStorageBytes(String.fromCharCode(0x4100), 1));
});
test("large Unicode/checkpoint JSON round-trips byte-for-byte and raw legacy JSON remains exact", () => {
  const value = {
      name: '壺 🦌 𓀀 café e\u0301 \u0000 \\ " \ud800',
      places: Array.from({ length: 14000 }, (_, i) => ({
        i,
        label: "河口の村 — поселение 🦌",
        amount: (Math.PI * i) / 97,
      })),
    },
    json = JSON.stringify(value),
    stored = encodeStoredJson(json);
  assert.ok(json.length >= SAVE_CODEC_RULES.minimumCharacters);
  assert.equal(JSON.parse(stored).hearthwildStorage, 1);
  assert.ok(stored.length < json.length);
  assert.equal(unpackStoredJson(stored), json);
  assert.deepEqual(parseStoredSave(stored), value);
  const legacy = ' { "old": [1, 2, "壺"] } ';
  assert.equal(unpackStoredJson(legacy), legacy);
  assert.deepEqual(parseStoredSave(legacy), JSON.parse(legacy));
  assert.equal(serializeStoredSave({ small: true }), '\u007b"small":true\u007d');
});
test("unknown codec, malformed lengths, forged checksum, truncated bodies and noncanonical characters fail closed", () => {
  const stored = serializeStoredSave({ lots: "food 🦌 壺".repeat(50000) }),
    e = JSON.parse(stored);
  for (const change of [
    (x) => (x.hearthwildStorage = 2),
    (x) => (x.codec = "unknown"),
    (x) => (x.utf8Bytes = SAVE_CODEC_RULES.maximumDecodedBytes + 1),
    (x) => (x.utf8Bytes = -1),
    (x) => (x.utf8Bytes = 1.2),
    (x) => x.utf8Bytes++,
    (x) => x.compressedBytes++,
    (x) => (x.compressedBytes = SAVE_CODEC_RULES.maximumCompressedBytes + 1),
    (x) => (x.adler32 = (x.adler32 + 1) >>> 0),
    (x) => (x.data = x.data.slice(0, -1)),
    (x) => (x.data = "\ud800" + x.data.slice(1)),
    (x) => (x.extra = true),
  ]) {
    const bad = structuredClone(e);
    change(bad);
    assert.throws(() => parseStoredSave(JSON.stringify(bad)));
  }
});
test("forged tiny decoded size aborts a genuine multi-megabyte zip-bomb during the first fixed-size inflate input, not after the whole stream", () => {
  const e = JSON.parse(serializeStoredSave({ bomb: "x".repeat(4 * 1024 * 1024) }));
  assert.ok(e.compressedBytes > SAVE_CODEC_RULES.inflateInputChunkBytes);
  e.utf8Bytes = 32;
  const push = Unzlib.prototype.push;
  let fed = 0,
    calls = 0;
  Unzlib.prototype.push = function (chunk, final) {
    fed += chunk.length;
    calls++;
    return push.call(this, chunk, final);
  };
  try {
    assert.throws(() => parseStoredSave(JSON.stringify(e)));
    assert.equal(calls, 1);
    assert.ok(fed <= SAVE_CODEC_RULES.inflateInputChunkBytes);
    assert.ok(fed < e.compressedBytes);
  } finally {
    Unzlib.prototype.push = push;
  }
});
