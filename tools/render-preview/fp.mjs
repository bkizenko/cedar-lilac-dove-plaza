#!/usr/bin/env node
// REAL first-person frames: the game's own WorldView + HudHearth on a real generated village, camera at adult eye height. See docs/FIRST_PERSON_DESIGN.md.
//   NODE_PATH=/opt/npm-tools/node_modules THREE_DIR=.../three/ node tools/render-preview/fp.mjs [--out=DIR] [--only=a,b,c,d] [--w=1440 --h=810] [--seed=7] [--skin=brythen] [--min-lum=70] [--probe]
// Outputs PNG (never JPEG): <name>.png (world + HUD, what a player sees), <name>-world.png (world only, used for the luminance check), fp-report.json.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const need = (name) => { for (const b of [root, process.env.NODE_PATH, '/opt/npm-tools', '/opt/npm-tools/node_modules', '/home/claude/.npm-global/lib/node_modules'].filter(Boolean)) { try { return createRequire(path.join(b, 'noop.js'))(name); } catch { } } throw new Error(name + ' not found'); };
const args = process.argv.slice(2), opt = (k, d) => { const a = args.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : d; };
const outDir = path.resolve(opt('out', path.join(root, 'docs/renders/firstperson-real'))), only = opt('only', '') ? opt('only', '').split(',') : null;
const W = +opt('w', 1440), H = +opt('h', 810), seed = +opt('seed', 7), skin = opt('skin', 'brythen'), minLum = +opt('min-lum', 70), probe = args.includes('--probe'), noHud = args.includes('--no-hud');
const shotsFile = opt('shots', path.join(here, 'fp-shots.json'));
fs.mkdirSync(outDir, { recursive: true });
const findThree = () => { const c = [process.env.THREE_DIR, path.join(root, 'node_modules/three'), ...(fs.existsSync('/mnt/user-data/uploads') ? fs.readdirSync('/mnt/user-data/uploads', { withFileTypes: true }).filter(d => d.isDirectory()).map(d => path.join('/mnt/user-data/uploads', d.name, 'node_modules/three')) : [])].filter(Boolean); const hit = c.find(p => fs.existsSync(path.join(p, 'build/three.module.js'))); if (!hit) throw new Error('three not found; set THREE_DIR'); return hit; };
const esbuild = need('esbuild'), { chromium } = need('playwright'), sharp = need('sharp'), three = findThree();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hw-fp-')), bundle = path.join(tmp, 'fp.js');
// lucide-react is shimmed from react-icons when it is not installed (same trick as ui-hud-shot.mjs)
const shim = path.join(tmp, 'lucide-shim.mjs');
{ const names = new Set(), walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (/\.tsx?$/.test(e.name)) for (const m of fs.readFileSync(f, 'utf8').matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]lucide-react['"]/g)) m[1].split(',').map(x => x.trim().split(/\s+as\s+/)[0]).filter(Boolean).forEach(n => names.add(n)); } }; walk(path.join(root, 'src')); walk(here);
  const alias = { TriangleAlert: 'LuTriangleAlert', Home: 'LuHouse', Hourglass: 'LuHourglass' };
  fs.writeFileSync(shim, "import * as L from 'react-icons/lu';import React from 'react';\n" + [...names].filter(n => /^[A-Z]\w*$/.test(n) && n !== 'type').map(n => `export const ${n}=(p)=>React.createElement(L.${alias[n] || 'Lu' + n}||L.LuCircle,{...p,'data-icon':'${n}'});`).join('\n') + '\nexport default {};\n'); }
const addons = { name: 'addons', setup(b) {
  b.onResolve({ filter: /^three\/addons\// }, a => { const f = path.join(three, 'examples/jsm', a.path.slice(13)); return fs.existsSync(f) ? { path: f } : { path: path.join(here, 'shims', a.path.includes('postprocessing') ? 'post.js' : path.basename(a.path)) }; });
  b.onResolve({ filter: /^three\/examples\/jsm\/libs\/fflate\.module\.js$/ }, () => ({ path: path.join(here, 'shims/fflate.js') }));
  b.onResolve({ filter: /^node:zlib$/ }, () => ({ path: path.join(here, 'shims/empty.js') }));
  b.onResolve({ filter: /^lucide-react$/ }, () => ({ path: shim })); } };
await esbuild.build({ entryPoints: [path.join(here, 'fp-entry.tsx')], bundle: true, format: 'iife', outfile: bundle, absWorkingDir: root, tsconfig: path.join(root, 'tsconfig.json'), logLevel: 'error', jsx: 'automatic', loader: { '.css': 'empty' },
  alias: { three: path.join(three, 'build/three.module.js') }, plugins: [addons], nodePaths: [process.env.NODE_PATH || '/opt/npm-tools/node_modules'], define: { 'process.env.NODE_ENV': '"production"' } });
const css = ['hearth.css', 'glance.css', 'wildPanel.css'].map(f => fs.readFileSync(path.join(root, 'src/ui/hearth', f), 'utf8')).join('\n');
const html = path.join(tmp, 'fp.html');
fs.writeFileSync(html, `<!doctype html><meta charset=utf-8><style>html,body{margin:0;height:100%;overflow:hidden;background:#222;color:#f8efd9;font-family:system-ui,sans-serif}#root{position:fixed;inset:0;pointer-events:none}.world-minimap{position:relative;width:100%}.world-minimap canvas{width:100%;height:auto;display:block}${css}</style><canvas id=c></canvas><div id=root></div><script src="${pathToFileURL(bundle).href}"></script>`);
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--js-flags=--max-old-space-size=4096'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('[page]', m.text().slice(0, 300)); });
page.on('pageerror', e => console.error('[pageerror]', e.message));
await page.addInitScript(() => { try { localStorage.setItem('hearthwild.ui.hintGraphics', '1'); } catch { } });
await page.goto(pathToFileURL(html).href);
await page.waitForFunction(() => window.fpReady === true, null, { timeout: 60000 });
const layout = await page.evaluate(o => window.fpBoot(o), { seed, width: W, height: H, skin });
console.log('LAYOUT', JSON.stringify(layout));
fs.writeFileSync(path.join(outDir, 'fp-layout.json'), JSON.stringify(layout, null, 1));
if (probe) { await browser.close(); process.exit(0); }
const shots = JSON.parse(fs.readFileSync(shotsFile, 'utf8').replace(/"\$([A-Za-z.]+)([+-]\d+(?:\.\d+)?)?"/g, (_, k, off) => { let v = layout; for (const p of k.split('.')) v = v[p]; return String(v + (off ? +off : 0)); }));
const meanLum = async (file) => { const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true }); let s = 0, n = info.width * info.height; for (let i = 0; i < data.length; i += 3) { const f = c => { c /= 255; return c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4; }; const Y = .2126 * f(data[i]) + .7152 * f(data[i + 1]) + .0722 * f(data[i + 2]); s += Y; } return { linear: +(s / n).toFixed(4), srgb255: +(((s / n) <= .0031308 ? 12.92 * (s / n) : 1.055 * (s / n) ** (1 / 2.4) - .055) * 255).toFixed(1),
  mean255: (() => { let t = 0; for (let i = 0; i < data.length; i += 3) t += .2126 * data[i] + .7152 * data[i + 1] + .0722 * data[i + 2]; return +(t / n).toFixed(1); })() }; };
const report = {}; let failed = 0;
for (const [name, S0] of Object.entries(shots)) {
  if (only && !only.includes(name)) continue;
  const S = { width: W, height: H, ...S0 };
  if (S.stage) await page.evaluate(s => window.fpStage(s), { ...S.stage, eye: S.eye, yaw: S.yaw });
  await page.evaluate(() => window.fpHideHud());
  const info = await page.evaluate(s => window.fpShot(s), S);
  if (S.tree) console.log(name, 'TREE', (await page.evaluate(() => window.fpTree())).join('\n'));
  if (S.bisect) { const r = await page.evaluate(([x, y]) => window.fpBisect(x, y), S.bisect); const base = r[0][1].join(); console.log(name, 'BISECT base', base); for (const q of r.slice(1)) if (q[3].join() !== base) console.log(name, 'BISECT changes', JSON.stringify(q)); }
  if (S.profile) console.log(name, 'PROFILE', JSON.stringify(await page.evaluate(([x, y, a, l, st]) => window.fpProfile(x, y, a, l, st), [S.eye[0], S.eye[1], S.yaw, S.profile[0], S.profile[1]])));
  if (S.grid) console.log(name, 'GRID x0=' + (S.grid[0]-S.grid[2]) + ' step=' + S.grid[3] + '\n' + (await page.evaluate(a => window.fpGrid(...a), S.grid)).join('\n'));
  if (S.find) console.log(name, 'FIND', JSON.stringify(await page.evaluate(([x, y]) => window.fpFind(x, y), S.find)));
  if (S.pick) console.log(name, 'PICK', JSON.stringify(await page.evaluate(([x, y]) => window.fpPick(x, y), S.pick)));
  const worldFile = path.join(outDir, name + '-world.png');
  await page.screenshot({ path: worldFile });
  const lum = await meanLum(worldFile);
  let hud = null;
  if (!noHud && S.hud !== false) { hud = await page.evaluate(s => window.fpHud(s), S); await page.screenshot({ path: path.join(outDir, name + '.png') }); }
  else fs.copyFileSync(worldFile, path.join(outDir, name + '.png'));
  const pass = lum.mean255 >= minLum; if (!pass) failed++;
  report[name] = { eye: info.eye, ground: info.ground, near: info.near, far: info.far, fog: info.fogDensity, exposure: info.exposure, sun: info.sun, bands: info.bands, dd: info.dd, tris: info.tris, calls: info.calls, meanLuminance255: lum.mean255, meanLuminanceSrgbOfLinearMean: lum.srgb255, threshold: minLum, pass, hud };
  console.log(name, JSON.stringify(report[name]));
  await page.evaluate(() => { document.getElementById('root').innerHTML = ''; });
}
fs.writeFileSync(path.join(outDir, 'fp-report.json'), JSON.stringify(report, null, 1));
await browser.close(); fs.rmSync(tmp, { recursive: true, force: true });
if (failed) { console.error(failed + ' frame(s) under the luminance threshold ' + minLum); process.exit(2); }
