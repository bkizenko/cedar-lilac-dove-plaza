// Whole-map render harness: real Game world + real WorldView (src/scene/world.ts), real three.js, headless SwiftShader.
//   node tools/render-preview/map.mjs <shots.json> [--out=DIR] [--only=name,name]
// Needs esbuild + playwright (/opt/npm-tools or NODE_PATH) and three (repo node_modules, THREE_DIR, or /mnt/user-data/uploads/*/node_modules/three).
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const need = (name) => { for (const b of [root, process.env.NODE_PATH, '/opt/npm-tools', '/home/claude/.npm-global/lib/node_modules'].filter(Boolean)) { try { return createRequire(path.join(b, 'noop.js'))(name); } catch { } } throw new Error(name + ' not found'); };
const findThree = () => {
  const c = [process.env.THREE_DIR, path.join(root, 'node_modules/three'), ...(fs.existsSync('/mnt/user-data/uploads') ? fs.readdirSync('/mnt/user-data/uploads', { withFileTypes: true }).filter(d => d.isDirectory()).map(d => path.join('/mnt/user-data/uploads', d.name, 'node_modules/three')) : [])].filter(Boolean);
  const hit = c.find(p => fs.existsSync(path.join(p, 'build/three.module.js'))); if (!hit) throw new Error('three not found; set THREE_DIR'); return hit;
};
const args = process.argv.slice(2);
const opt = (k, d) => (args.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3) || d;
const outDir = path.resolve(opt('out', path.join(root, 'artifacts/concept-renders')));
const only = opt('only', '') ? opt('only', '').split(',') : null;
fs.mkdirSync(outDir, { recursive: true });
const esbuild = need('esbuild'), { chromium } = need('playwright'), three = findThree();
const bundle = path.join(outDir, '.map-bundle.js');
const addons = { name: 'addons', setup(b) { b.onResolve({ filter: /^three\/addons\// }, a => { const f = path.join(three, 'examples/jsm', a.path.slice(13)); return fs.existsSync(f) ? { path: f } : { path: path.join(here, '..', 'render-preview', 'shims', a.path.includes('postprocessing') ? 'post.js' : path.basename(a.path)) }; }); } };
await esbuild.build({ entryPoints: [path.join(here, 'map-concept-entry.ts')], bundle: true, format: 'iife', outfile: bundle, absWorkingDir: root, tsconfig: path.join(root, 'tsconfig.json'), logLevel: 'error',
  alias: { three: path.join(three, 'build/three.module.js') }, plugins: [addons], define: { 'process.env.NODE_ENV': '"production"' } });
const html = path.join(outDir, '.map.html');
fs.writeFileSync(html, '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#222"><script src="' + pathToFileURL(bundle).href + '"></script>');
const shots = JSON.parse(fs.readFileSync(path.resolve(args.find(a => !a.startsWith('--'))), 'utf8'));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--max-old-space-size=4096'] });
let page = null;
for (const [name, spec0] of Object.entries(shots)) {
  if (only && !only.includes(name)) continue;
  const spec = { width: 1280, height: 720, ...spec0 };
  if (!page) {
    page = await browser.newPage({ viewport: { width: spec.width, height: spec.height } });
    page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text().slice(0, 300)); });
    page.on('pageerror', e => console.error('[pageerror]', e.message));
    await page.goto(pathToFileURL(html).href);
  }
  await page.setViewportSize({ width: spec.width, height: spec.height });
  const info = await page.evaluate(s => window.renderMap(s), spec);
  await page.locator('canvas').screenshot({ path: path.join(outDir, name + '.png'), timeout: 180000 });
  console.log(name, JSON.stringify(info).slice(0, 8000));
  if (spec.eval) console.log(name, 'EVAL', JSON.stringify(await page.evaluate(spec.eval)));
}
await browser.close();
