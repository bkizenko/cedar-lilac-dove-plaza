#!/usr/bin/env node
// REAL three.js preview renders (three 0.185.1 from the repo's node_modules).
//   npm ci
//   npx playwright install --with-deps chromium     (CI / fresh machine)
//   node tools/render-preview/render-three.mjs all [--rig=adapter|tuned] [--tone=neutral|agx|aces] [--no-ao]
//   node tools/render-preview/render-three.mjs <scene> <out.png> [...]
// Scenes are built by the same scenes.mjs as the stand-in renderer (real
// generator output from src/scene). Pages are served by a tiny local static
// server so the importmap can load /node_modules/three without Vite.
// Outputs (all): docs/art-reference/h-renders/three/<same names as the stand-in>,
// plus village tone-mapping variants b-village-agx.png / b-village-aces.png.
// Headless-GL safe: Chromium runs WebGL on SwiftShader when no GPU exists.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
await import(pathToFileURL(path.join(root, 'scripts/game-loader.mjs')).href);
const { SCENES } = await import('./scenes.mjs');
const { OUTPUTS } = await import('./outputs.mjs');

const args = process.argv.slice(2), flags = Object.fromEntries(args.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? true]; }));
const [sceneName, out] = args.filter(a => !a.startsWith('--'));
if (!fs.existsSync(path.join(root, 'node_modules/three/build/three.module.js'))) { console.error('node_modules/three missing: run `npm ci` first.'); process.exit(2); }

function req() { // prefer the repo's playwright (package-lock 1.62.1), else a global install
  for (const base of [root, process.env.NODE_PATH || '/home/claude/.npm-global/lib/node_modules']) { try { return createRequire(path.join(base, base === root ? 'package.json' : 'x.js')); } catch { } }
  throw new Error('playwright not found');
}
const require_ = req();
const { chromium } = require_('playwright');
let sharp = null; try { sharp = require_('sharp'); } catch { }

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
const server = http.createServer((q, r) => {
  const u = decodeURIComponent(new URL(q.url, 'http://x').pathname), f = path.join(root, u);
  if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); r.end(); return; }
  r.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
});
await new Promise(res => server.listen(0, '127.0.0.1', res));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });

async function renderOne(name, outPath, tone = flags.tone || 'neutral') {
  const scene = await SCENES[name]({ rig: flags.rig || (flags.terrain === 'carved' ? 'tuned' : 'golden'), terrain: flags.terrain || 'natural' }), W = scene.width || 800, H = scene.height || 500;
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto(base + (fs.existsSync(path.join(root, 'node_modules/three/examples/jsm/postprocessing/EffectComposer.js')) ? '/tools/render-preview/three.html' : '/tools/render-preview/three-lite.html'));
  await page.waitForFunction(() => window.threeReady === true, null, { timeout: 60000 });
  const res = await page.evaluate(([s, o]) => window.renderSceneThree(s, o), [{ ...scene, width: W, height: H, pixelRatio: 2 }, { tone, ao: !flags['no-ao'] }]);
  console.error('[three]', name, JSON.stringify(res));
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const raw = await page.locator('#wrap').screenshot();
  let buf = raw;
  if (sharp) { buf = await sharp(raw).png({ compressionLevel: 9 }).toBuffer(); if (buf.length > 1.45e6) buf = await sharp(raw).png({ compressionLevel: 9, palette: true, quality: 95, colours: 256, dither: .6 }).toBuffer(); }
  fs.writeFileSync(outPath, buf); await page.close();
  console.error(`[three] wrote ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`);
}

try {
  if (sceneName === 'all') {
    const dir = path.resolve(out || path.join(root, 'docs/art-reference/h-renders/three'));
    for (const [name, file] of OUTPUTS) await renderOne(name, path.join(dir, file));
    await renderOne('village', path.join(dir, 'b-village-agx.png'), 'agx');
    await renderOne('village', path.join(dir, 'b-village-aces.png'), 'aces');
    if (!flags.rig) { // adapter rig as-is, for an honest "what the current palette+rig gives" view
      const saved = flags.rig; flags.rig = 'adapter'; await renderOne('village', path.join(dir, 'b-village-adapter-rig.png')); flags.rig = saved;
    }
  } else if (SCENES[sceneName]) await renderOne(sceneName, path.resolve(out || `${sceneName}-three.png`));
  else { console.log('scenes: all,', Object.keys(SCENES).join(', ')); process.exitCode = 1; }
} finally { await browser.close(); server.close(); }
