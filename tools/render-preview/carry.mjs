// Gait and load-carrying render sheets: real three.js, real CharacterRigLayer, real clips, real carry styles and load geometry.
//   NODE_PATH=/opt/npm-tools/node_modules THREE_DIR=.../three node tools/render-preview/carry.mjs [gait|carry|stance|heads|all] [--modes=v2,rig1] [--out=DIR] [--entry=carry-entry.ts]
// Modes: v2 = the default game people (people v2 looks); rig1 = ?people=rig1 (first rig). Writes PNGs and checks none is near-black.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const need = (name) => { for (const b of [root, process.env.NODE_PATH, '/opt/npm-tools', '/home/claude/.npm-global/lib/node_modules'].filter(Boolean)) { try { return createRequire(path.join(b, 'noop.js'))(name); } catch { /* next */ } } throw new Error(name + ' not found'); };
const findThree = () => { const c = [process.env.THREE_DIR, path.join(root, 'node_modules/three'), ...fs.readdirSync('/mnt/user-data/uploads', { withFileTypes: true }).filter(d => d.isDirectory()).map(d => path.join('/mnt/user-data/uploads', d.name, 'node_modules/three'))].filter(Boolean); const hit = c.find(p => fs.existsSync(path.join(p, 'build/three.module.js'))); if (!hit) throw new Error('three not found; set THREE_DIR'); return hit; };
const args = process.argv.slice(2), opt = (k, d) => (args.find(a => a.startsWith('--' + k + '=')) || '--' + k + '=' + d).slice(k.length + 3);
const outDir = path.resolve(opt('out', path.join(root, 'docs/renders/carry'))), entry = opt('entry', 'carry-entry.ts'), tag = opt('tag', '');
const only = opt('styles', '').split(',').filter(Boolean), want = args.filter(a => !a.startsWith('--')), sheets = want.length ? want : ['all'], modes = opt('modes', 'v2,rig1').split(',');
fs.mkdirSync(outDir, { recursive: true });
const esbuild = need('esbuild'), { chromium } = need('playwright'), sharp = need('sharp'), three = findThree();
const bundle = path.join(outDir, '.carry-bundle.js');
await esbuild.build({ entryPoints: [path.join(here, entry)], bundle: true, format: 'iife', outfile: bundle, absWorkingDir: root, tsconfig: path.join(root, 'tsconfig.json'), logLevel: 'error',
  alias: fs.existsSync(path.join(three, 'examples/jsm')) ? { three: path.join(three, 'build/three.module.js'), 'three/addons': path.join(three, 'examples/jsm') } : { three: path.join(three, 'build/three.module.js'), 'three/addons/utils/BufferGeometryUtils.js': path.join(here, 'shims/BufferGeometryUtils.js') }, define: { 'process.env.NODE_ENV': '"production"' }, loader: { '.png': 'dataurl' } });
const html = path.join(outDir, '.carry.html');
fs.writeFileSync(html, '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#222"><script src="' + pathToFileURL(bundle).href + '"></script>');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const W = 1500, H = 400, PH = [0, .2, .4, .6, .8];
const VIEWS = { side: { facing: Math.PI / 2, dx: 3.0 }, front: { facing: 0, dx: 2.6 }, back: { facing: Math.PI, dx: 2.6 } };
async function row(mode, view, items, extra = {}) {
  const V = VIEWS[view], n = items.length, spread = extra.dx ?? V.dx;
  const its = items.map((it, i) => ({ ...it, x: (i - (n - 1) / 2) * spread, facing: V.facing + (it.yaw || 0) }));
  const cam = view === 'side' ? { pos: [0, 1.5, 8.2], target: [0, 1.0, 0], fov: 33 } : { pos: [0, 1.5, view === 'back' ? -8.2 : 8.2], target: [0, 1.0, 0], fov: 33 };
  const spec = { width: W, height: H, mode, season: 'summer', era: 3, cam: extra.cam || cam, items: its };
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); }); page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto(pathToFileURL(html).href);
  await page.evaluate(s => window.renderCarry(s), spec);
  const buf = await page.locator('canvas').screenshot(); await page.close(); return buf;
}
const label = (t, w, h = 30) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#1b1b1b"/><text x="12" y="21" font-family="sans-serif" font-size="16" font-weight="700" fill="#f2e8d0">${t}</text></svg>`);
async function stack(name, title, rows) {
  const lab = 30, parts = [{ input: label(title, W), top: 0, left: 0 }];
  rows.forEach((r, i) => { parts.push({ input: label(r.label, W, 22), top: lab + i * (H + 22), left: 0 }); parts.push({ input: r.buf, top: lab + i * (H + 22) + 22, left: 0 }); });
  const out = path.join(outDir, name + '.png');
  await sharp({ create: { width: W, height: lab + rows.length * (H + 22), channels: 3, background: '#1b1b1b' } }).composite(parts).png().toFile(out);
  const st = await sharp(out).stats(), lum = (st.channels[0].mean + st.channels[1].mean + st.channels[2].mean) / 3;
  console.log(name, 'mean luminance', lum.toFixed(1), lum < 40 ? 'NEAR-BLACK' : 'ok'); if (lum < 40) process.exitCode = 1;
}
const phases = (clip, extra = {}) => PH.map(p => ({ clip, phase: p, ...extra }));
const STYLE_CIV = { shoulderLog: ['rusvolt', 'wood', .55], poleFront: ['hanrei', 'wood', 1], poleRear: ['hanrei', 'wood', 1], bundleBack: ['brythen', 'wood', .9], tumplineBasket: ['quillan', 'food', .8], headLoad: ['sahelan', 'food', .8], yoke: ['hanrei', 'food', .8], sackBack: ['steppan', 'food', .8], stoneFrame: ['skoldar', 'stone', .85] };
const CIV3 = ['hanrei', 'rusvolt', 'sahelan'];
for (const mode of modes) {
  if (sheets.includes('all') || sheets.includes('gait')) {
    for (const clip of ['walk', 'haul', 'run']) {
      const rows = [];
      for (const view of ['side', 'front', 'back']) rows.push({ label: `${clip} ${view} (phases 0, .2 .. .8)`, buf: await row(mode, view, phases(clip, { civ: CIV3[0], speed: clip === 'run' ? 6.5 : undefined, ...(clip === 'run' ? { clip: 'walk' } : {}) })) });
      await stack(`${tag}gait-${clip}-${mode}`, `${tag}${clip}: feet under the hips, narrow step width (${mode})`, rows);
    }
  }
  if (sheets.includes('all') || sheets.includes('carry')) {
    for (const [style, [civ, kind, load]] of Object.entries(STYLE_CIV)) {
      if (only.length && !only.includes(style)) continue;
      const rows = [];
      for (const view of ['side', 'front', 'back']) rows.push({ label: `${style} ${view}: ${kind}, load ${load}`, buf: await row(mode, view, phases('carry', { civ, carry: { style, kind, load, seed: 5 } }), style === 'yoke' ? { dx: 2.5 } : {}) });
      await stack(`${tag}carry-${style}-${mode}`, `${tag}carry style ${style} (${civ}, ${mode})`, rows);
    }
  }
  if (sheets.includes('all') || sheets.includes('stance')) {
    const rows = [];
    for (const view of ['front', 'side']) rows.push({ label: `work stances ${view}: chop, quarry, till, build, plant, harvest, fight`, buf: await row(mode, view, ['chop', 'quarry', 'till', 'build', 'plant', 'harvest', 'fight'].map((c, i) => ({ clip: c, phase: c === 'plant' || c === 'harvest' ? .5 : .4, civ: CIV3[i % 3] })), { dx: 1.55 }) });
    await stack(`${tag}stance-${mode}`, `${tag}work stances stay narrow (${mode})`, rows);
  }
  if (sheets.includes('headsclose')) {
    const rows = [], civs = ['sandrill', 'hanrei', 'rusvolt', 'steppan', 'sahelan', 'quillan'];
    for (const view of ['front']) rows.push({ label: `heads close-up ${view} (near tier, camera 12 m)`, buf: await row(mode, view, civs.map(civ => ({ clip: 'walk', phase: .25, civ })), { dx: .95, cam: { pos: [0, 1.65, 12], target: [0, 1.65, 0], fov: 9.5 } }) });
    await stack(`${tag}headsclose-${mode}`, `${tag}head close-up (${mode})`, rows);
  }
  if (sheets.includes('all') || sheets.includes('heads')) {
    const rows = [], civs = ['sandrill', 'hanrei', 'rusvolt', 'steppan', 'sahelan', 'quillan'];
    for (const [nm, d] of [['near', 20], ['mid', 140], ['far', 300]]) {
      const fov = 2 * Math.atan(.62 / d) * 180 / Math.PI * 1.0;
      rows.push({ label: `heads at the ${nm} tier (camera ${d} m)`, buf: await row(mode, 'front', civs.map(civ => ({ clip: 'walk', phase: .25, civ })), { dx: Math.max(.7, d * .045), cam: { pos: [0, 1.75, d], target: [0, 1.75, 0], fov: Math.max(2.4, fov * 6.2) } }) });
    }
    await stack(`${tag}heads-${mode}`, `${tag}head read at each LOD tier (${mode})`, rows);
  }
}
await browser.close();
