// Tree species sheet: real botanical geometry + real material, flat ground, headless SwiftShader.
//   node tools/render-preview/trees.mjs <shots.json> [--out=DIR] [--only=a,b]   (needs esbuild, playwright, three; THREE_DIR or repo node_modules)
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const need = (name) => { for (const b of [root, process.env.NODE_PATH, '/opt/npm-tools'].filter(Boolean)) { try { return createRequire(path.join(b, 'noop.js'))(name); } catch { } } throw new Error(name + ' not found'); };
const args = process.argv.slice(2), opt = (k, d) => (args.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3) || d;
const outDir = path.resolve(opt('out', path.join(root, 'artifacts/tree-sheets'))), only = opt('only', '') ? opt('only', '').split(',') : null;
fs.mkdirSync(outDir, { recursive: true });
const three = process.env.THREE_DIR || path.join(root, 'node_modules/three'), esbuild = need('esbuild'), { chromium } = need('playwright');
const bundle = path.join(outDir, '.trees-bundle.js');
await esbuild.build({ entryPoints: [path.join(here, 'trees-entry.ts')], bundle: true, format: 'iife', outfile: bundle, absWorkingDir: root, tsconfig: path.join(root, 'tsconfig.json'), logLevel: 'error', alias: { three: path.join(three, 'build/three.module.js') }, define: { 'process.env.NODE_ENV': '"production"' } });
const html = path.join(outDir, '.trees.html');
fs.writeFileSync(html, '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#222"><script src="' + pathToFileURL(bundle).href + '"></script>');
const shots = JSON.parse(fs.readFileSync(path.resolve(args.find(a => !a.startsWith('--'))), 'utf8'));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
let page = null;
for (const [name, spec0] of Object.entries(shots)) {
  if (only && !only.includes(name)) continue;
  const spec = { width: 1400, height: 700, ...spec0 };
  if (!page) { page = await browser.newPage({ viewport: { width: spec.width, height: spec.height } }); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text().slice(0, 400)); }); page.on('pageerror', e => console.error('[pageerror]', e.message)); await page.goto(pathToFileURL(html).href); }
  await page.setViewportSize({ width: spec.width, height: spec.height });
  const info = await page.evaluate(s => window.renderSheet(s), spec);
  await page.locator('canvas').screenshot({ path: path.join(outDir, name + '.png') });
  console.log(name, JSON.stringify(info));
}
await browser.close();
