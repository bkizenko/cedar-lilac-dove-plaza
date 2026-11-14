// Lane D tsc check that works with TS 7 (no baseUrl) and no node_modules.
// Usage: node scripts/tsc-diff.mjs [dir-prefix ...]   e.g. src/game src/scene
// Prints real errors only (agreed noise codes, node-types and ImportMeta env noise removed).
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const raw = readFileSync('tsconfig.json', 'utf8').replace(/^\s*\/\/.*$/gm, '');
const cfg = JSON.parse(raw);
delete cfg.compilerOptions.baseUrl;
cfg.compilerOptions.types = [];
cfg.include = ['src'];
const tmp = 'tsconfig.tmpcheck.json';
writeFileSync(tmp, JSON.stringify(cfg));
const r = spawnSync('tsc', ['-p', tmp, '--noEmit'], { encoding: 'utf8', maxBuffer: 1 << 28 });
rmSync(tmp, { force: true });
const noise = /TS2307|TS7016|TS7006|TS7026|TS2875|TS2882|TS2591|ImportMeta/;
const only = process.argv.slice(2);
const lines = (r.stdout + r.stderr).split('\n').filter((l) => / error TS/.test(l) && !noise.test(l) && (!only.length || only.some((p) => l.startsWith(p))));
console.log(lines.join('\n') || 'tsc diff: nil');
process.exit(lines.length ? 1 : 0);
