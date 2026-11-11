#!/usr/bin/env node
// Usage: node tools/render-preview/render.mjs <scene> <out.png> [--rig=adapter|tuned]
//        node tools/render-preview/render.mjs all [outDir] [--rig=adapter|tuned]
// Builds the scene from the real pure generator modules (src/scene) in Node,
// then renders it with the dependency-free WebGL2 page renderer.html in
// headless Chromium (Playwright). Output: 1600x1000 PNG (800x500 CSS at DPR 2).
// Scenes: see `node tools/render-preview/render.mjs list`.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, '../../scripts/game-loader.mjs')).href);
const { SCENES } = await import('./scenes.mjs');
const { renderToPng } = await import('./chromium-render.mjs');

const args = process.argv.slice(2), flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const [sceneName, out] = args.filter(a => !a.startsWith('--'));
if (sceneName === 'all') {
  const { OUTPUTS } = await import('./outputs.mjs');
  const dir = path.resolve(out || path.join(here, '../../docs/art-reference/h-renders'));
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, file] of OUTPUTS) { const scene = await SCENES[name]({ rig: flags.rig || 'tuned' }); await renderToPng(scene, path.join(dir, file)); console.error('[render] ' + file); }
  process.exit(0);
}
if (!sceneName || sceneName === 'list' || !SCENES[sceneName]) { console.log('scenes:', Object.keys(SCENES).join(', ')); process.exit(sceneName === 'list' ? 0 : 1); }
const t0 = Date.now();
const scene = await SCENES[sceneName]({ rig: flags.rig || 'tuned' });
console.error(`[render] built ${sceneName} in ${Date.now() - t0} ms`);
const outPath = path.resolve(out || `${sceneName}.png`);
await renderToPng(scene, outPath);
console.error(`[render] wrote ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(0)} KB) in ${Date.now() - t0} ms`);

