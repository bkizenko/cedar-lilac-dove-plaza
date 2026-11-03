import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { Game } from "../src/game/sim.ts";
import { encodeGame, decodeGame, validateGameSave } from "../src/game/persistence.ts";
import { saveGame, protectGame } from "../src/game/save.ts";
import { SAVE_KEY } from "../src/game/constants.ts";
import { zlibSync, strToU8 } from "three/examples/jsm/libs/fflate.module.js";
class QuotaStorage {
  constructor(limit) {
    this.limit = limit;
    this.values = new Map([["unrelated-setting", "keep"]]);
    this.failures = [];
  }
  getItem(k) {
    return this.values.get(k) ?? null;
  }
  setItem(k, v) {
    k = String(k);
    v = String(v);
    const next = new Map(this.values);
    next.set(k, v);
    const bytes = [...next].reduce((n, [a, b]) => n + 2 * (a.length + b.length), 0);
    if (bytes > this.limit) {
      this.failures.push({
        key:
          k === SAVE_KEY
            ? "primary"
            : k.endsWith(":protected")
              ? "protected"
              : k.endsWith(":bak")
                ? "backup"
                : "other",
        name: "QuotaExceededError",
        attemptedUtf16Bytes: bytes,
      });
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    }
    this.values = next;
  }
  report() {
    return {
      bytes: [...this.values].reduce((n, [a, b]) => n + 2 * (a.length + b.length), 0),
      saveKeys: [...this.values]
        .filter(([k]) => k.startsWith(SAVE_KEY))
        .map(([k, v]) => ({
          slot: k === SAVE_KEY ? "primary" : k.endsWith(":protected") ? "protected" : "backup",
          utf16Bytes: 2 * (k.length + v.length),
        })),
      unrelatedPreserved: this.getItem("unrelated-setting") === "keep",
      failures: this.failures,
    };
  }
}
const reports = [];
function measure(label, g, exportSource) {
  const raw = encodeGame(g);
  validateGameSave(raw);
  const json = JSON.stringify(raw),
    utf8 = Buffer.byteLength(json),
    compressed = {};
  for (const level of [1, 6]) {
    const bytes = zlibSync(strToU8(json), { level });
    const text = Buffer.from(bytes).toString("base64");
    compressed[level] = {
      compressedBytes: bytes.length,
      base64Characters: text.length,
      utf16StorageBytes: text.length * 2,
    };
  }
  const quotas = [];
  for (const mib of [5, 10]) {
    const storage = new QuotaStorage(mib * 1024 * 1024);
    globalThis.localStorage = storage;
    const primary = saveGame(g),
      protectedCheckpoint = protectGame(g);
    quotas.push({ quotaMiB: mib, primary, protectedCheckpoint, ...storage.report() });
  }
  const result = {
    label,
    exportSource,
    seed: g.state.seed,
    worldgenVersion: g.state.worldgenVersion,
    size: g.world.size,
    layout: g.world.options?.layout,
    people: g.state.units.length,
    trees: g.state.trees.length,
    jsonUtf8Bytes: utf8,
    jsonCharacters: json.length,
    jsonUtf16Bytes: json.length * 2,
    jsonSha256: createHash("sha256").update(json).digest("hex"),
    compressed,
    quotas,
  };
  reports.push(result);
  console.log(JSON.stringify(result));
  writeFileSync("/tmp/save-capacity-audit-metrics.json", JSON.stringify(reports, null, 2) + "\n");
}
const oldStorage = globalThis.localStorage,
  random = Math.random;
let n = 4063;
Math.random = () => {
  n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
  return n / 4294967296;
};
try {
  if (process.env.OWN_QA_EXPORT) {
    const text = readFileSync(process.env.OWN_QA_EXPORT, "utf8"),
      raw = JSON.parse(text);
    validateGameSave(raw);
    measure("own-QA-fresh-export", decodeGame(raw), {
      utf8Bytes: Buffer.byteLength(text),
      sha256: createHash("sha256").update(text).digest("hex"),
    });
  }
  for (const size of [1040, 1560, 2080]) {
    const g = new Game();
    g.reset(1, 16, { size, layout: "pangaea" });
    g.enterIsland();
    g.state.paused = true;
    measure("native-V16-opening", g);
  }
} finally {
  globalThis.localStorage = oldStorage;
  Math.random = random;
}
