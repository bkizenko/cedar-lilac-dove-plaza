import { Game } from "../src/game/sim.ts";
import { encodeGame, validateGameSave } from "../src/game/persistence.ts";
import { saveGame } from "../src/game/save.ts";
import { SAVE_KEY } from "../src/game/constants.ts";
import { encodeStoredJson, unpackStoredJson, parseStoredSave } from "../src/game/storageCodec.ts";
import { QuotaStorage } from "./fixtures/quota-storage.mjs";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
const old = globalThis.localStorage,
  random = Math.random;
let n = 51;
Math.random = () => {
  n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
  return n / 4294967296;
};
try {
  const g = new Game();
  g.reset(1, 16, { size: 1560, layout: "pangaea" });
  g.enterIsland();
  const raw = JSON.stringify({ ...encodeGame(g), savedAt: 123 }),
    storage = new QuotaStorage(5 * 1024 * 1024);
  storage.setItem(SAVE_KEY + ":protected", raw);
  globalThis.localStorage = storage;
  g.state.time = 1;
  const before = saveGame(g, true),
    held = storage.getItem(SAVE_KEY + ":protected"),
    primary = storage.getItem(SAVE_KEY),
    encoded = encodeStoredJson(raw);
  validateGameSave(parseStoredSave(encoded));
  if (unpackStoredJson(encoded) !== raw) throw Error("not exact");
  storage.setItem(SAVE_KEY + ":protected", encoded);
  const after = saveGame(g, true);
  if (storage.getItem(SAVE_KEY + ":protected") !== encoded)
    throw Error("protected checkpoint altered");
  const report = {
    case: "legacy raw protected checkpoint only",
    quotaBytes: storage.limit,
    rawProtectedBytes: raw.length * 2,
    before: {
      primarySaved: before,
      primaryAbsent: primary === null,
      protectedUnchanged: held === raw,
    },
    encodingOnlyExperiment: {
      decodedExact: unpackStoredJson(encoded) === raw,
      validated: true,
      savedAt: parseStoredSave(encoded).savedAt,
      oldTime: parseStoredSave(encoded).state.time,
      oldJsonSha256: createHash("sha256").update(raw).digest("hex"),
      compressedProtectedBytes: encoded.length * 2,
    },
    after: {
      primarySaved: after,
      protectedStillSameEncoding: storage.getItem(SAVE_KEY + ":protected") === encoded,
      totalBytes: storage.bytes(),
      unrelatedPreserved: storage.getItem("unrelated-setting") === "keep",
    },
  };
  writeFileSync("/tmp/storage-legacy-capacity-audit.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
} finally {
  globalThis.localStorage = old;
  Math.random = random;
}
