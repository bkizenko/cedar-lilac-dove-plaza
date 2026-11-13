#!/usr/bin/env node
// Lane D tsc helper. Runs tsconfig.check.json (types: []) and filters the known sandbox noise
// (TS2307/7016/7006/7026/2875/2882, Node `process`/`Buffer`, ImportMeta env, react-stub UI noise).
// Usage: node scripts/tsc-diff.mjs [--tsc path/to/typescript/bin/tsc] [--baseline file] [--out file] [--ui]
// Pin: run with typescript@5.6 (the sandbox default 7.x rejects baseUrl, TS5102):
//   npm i --prefix /tmp/ts5 typescript@5.6 three@0.185.1 @types/three@0.185 && ln -s /tmp/ts5/node_modules node_modules
// Without --baseline it prints real errors in src/game and src/scene (and src/ui with --ui).
// With --baseline it prints only errors not in that earlier output (line numbers ignored).
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const tsc = opt("--tsc", "node_modules/typescript/bin/tsc");
const baseline = opt("--baseline", "");
const out = opt("--out", "");
const includeUi = args.includes("--ui");

const IGNORE_CODES = /TS(2307|7016|7006|7026|2875|2882|2591)\b/;
const IGNORE_TEXT = /ImportMeta|Cannot find name '(process|Buffer)'/;
const run = spawnSync("node", [tsc, "-p", "tsconfig.check.json", "--noEmit"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
const lines = `${run.stdout}${run.stderr}`.split("\n").filter((l) => /^src\/.*error TS\d+/.test(l));
const scope = includeUi ? /^src\/(game|scene|ui|world|lib)\// : /^src\/(game|scene|world)\//;
const real = lines.filter((l) => scope.test(l) && !IGNORE_CODES.test(l) && !IGNORE_TEXT.test(l));
const key = (l) => l.replace(/\(\d+,\d+\)/, "");
let shown = real;
if (baseline) {
  const seen = new Set(readFileSync(baseline, "utf8").split("\n").map(key));
  shown = real.filter((l) => !seen.has(key(l)));
}
if (out) writeFileSync(out, real.join("\n") + "\n");
console.log(shown.length ? shown.join("\n") : "tsc: nil (no new real errors in scope)");
console.log(`# total filtered errors in scope: ${real.length}, shown: ${shown.length}`);
process.exitCode = shown.length ? 1 : 0;
