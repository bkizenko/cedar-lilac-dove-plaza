// TASTE ENVELOPE contact sheets: real generators, real three.js + real CharacterRigLayer (SwiftShader, no network).
//   NODE_PATH=/opt/npm-tools/node_modules THREE_DIR=<three dir> node tools/render-preview/taste.mjs [generated|legacy|legacy-fixed|era|all] [--out=DIR]
// Output default: docs/renders/taste-envelope/. Each cell: house + civic + worker/farmer/soldier/ruler (the civ's own look) + banner (cloth colour, emblem, cut).
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const need = (name) => { for (const b of [root, process.env.NODE_PATH, '/opt/npm-tools'].filter(Boolean)) { try { return createRequire(path.join(b, 'noop.js'))(name); } catch { /* next */ } } throw new Error(name + ' not found'); };
const three = [process.env.THREE_DIR, path.join(root, 'node_modules/three')].filter(Boolean).find(p => fs.existsSync(path.join(p, 'build/three.module.js')));
if (!three) throw new Error('three not found; set THREE_DIR');
const args = process.argv.slice(2), outDir = path.resolve((args.find(a => a.startsWith('--out=')) || '--out=' + path.join(root, 'docs/renders/taste-envelope')).slice(6));
const pos = args.filter(a => !a.startsWith('--')), want = pos.length ? pos : ['all'];
fs.mkdirSync(outDir, { recursive: true });
const esbuild = need('esbuild'), { chromium } = need('playwright'), sharp = need('sharp');
const tmp = path.join(outDir, '.tmp'); fs.mkdirSync(tmp, { recursive: true });
const bundle = path.join(tmp, 'taste-bundle.js');
await esbuild.build({ entryPoints: [path.join(here, 'taste-entry.ts')], bundle: true, format: 'iife', outfile: bundle, absWorkingDir: root, tsconfig: path.join(root, 'tsconfig.json'), logLevel: 'error',
  alias: fs.existsSync(path.join(three, 'examples/jsm')) ? { three: path.join(three, 'build/three.module.js'), 'three/addons': path.join(three, 'examples/jsm') } : { three: path.join(three, 'build/three.module.js') } });
const html = path.join(tmp, 'taste.html');
fs.writeFileSync(html, '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#222"><script src="' + pathToFileURL(bundle).href + '"></script>');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 700, height: 520 } });
page.on('pageerror', e => console.error('[pageerror]', e.message));
page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
await page.goto(pathToFileURL(html).href);
const buf = (d) => Buffer.from(d.split(',')[1], 'base64');
const CW = 560, CH = 400, FW = 180, FH = 130;
const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
async function cell(spec, label) {
  const r = await page.evaluate(s => window.renderTaste(s), { width: CW, height: CH, ...spec });
  const sw = Object.values(r.info.palette || {}).slice(0, 7);
  const bar = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="34">${sw.map((c, i) => `<rect x="${i * 34}" y="4" width="32" height="26" fill="${c}"/>`).join('')}<text x="${7 * 34 + 8}" y="14" font-family="sans-serif" font-size="12" font-weight="700" fill="#f2e8d0">${esc(label)}</text><text x="${7 * 34 + 8}" y="29" font-family="sans-serif" font-size="11" fill="#cfc6ae">${esc(`${r.info.grammar} ${r.info.roof} ${r.info.cut}/${r.info.head} ${r.info.genome ? r.info.genome.ornament : ''}`)}</text></svg>`);
  const img = await sharp({ create: { width: CW, height: CH + 34, channels: 3, background: '#1b1b1b' } }).composite([{ input: buf(r.png), top: 0, left: 0 }, { input: await sharp(buf(r.flag)).resize(FW * .6, FH * .6).png().toBuffer(), top: 6, left: CW - FW * .6 - 6 }, { input: bar, top: CH, left: 0 }]).png().toBuffer();
  return { img, info: r.info };
}
async function sheet(file, specs, cols, title) {
  const cells = [], infos = [];
  for (const [spec, label] of specs) { const c = await cell(spec, label); cells.push(c.img); infos.push({ label, ...c.info }); }
  const rows = Math.ceil(cells.length / cols), TH = 36, W = cols * CW, H = TH + rows * (CH + 34);
  const head = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${TH}"><rect width="100%" height="100%" fill="#111"/><text x="12" y="24" font-family="sans-serif" font-size="17" font-weight="700" fill="#f2e8d0">${esc(title)}</text></svg>`);
  await sharp({ create: { width: W, height: H, channels: 3, background: '#111' } }).composite([{ input: head, top: 0, left: 0 }, ...cells.map((input, i) => ({ input, left: (i % cols) * CW, top: TH + Math.floor(i / cols) * (CH + 34) }))]).png({ compressionLevel: 9 }).toFile(file);
  const stats = await sharp(file).stats();
  console.log(path.basename(file), 'mean', stats.channels.map(c => c.mean.toFixed(1)).join('/'), 'size', W + 'x' + H);
  return { file: path.basename(file), mean: stats.channels.map(c => +c.mean.toFixed(1)), infos };
}
const out = {};
const gen24 = []; for (let g = 0; g < 4; g++) for (let s = 0; s < 6; s++) gen24.push([{ mode: 'generated', gameSeed: 100 + g, slot: s }, `game ${100 + g} civ ${s}`]);
if (want.includes('all') || want.includes('generated')) out.generated = await sheet(path.join(outDir, 'contact-generated-24.png'), gen24, 4, 'Taste envelope: 24 generated civs (4 games x 6 civs). Cell = house, civic, worker/farmer/soldier/ruler, banner, palette chips');
const leg = []; for (let g = 0; g < 4; g++) for (let s = 0; s < 6; s++) leg.push([{ mode: s % 2 ? 'remix' : 'free', gameSeed: 100 + g, slot: s }, `legacy ${s % 2 ? 'remix' : 'free'} ${100 + g}/${s}`]);
if (want.includes('all') || want.includes('legacy')) out.legacy = await sheet(path.join(outDir, 'contact-legacy-unenveloped-24.png'), leg, 4, 'BEFORE: 24 legacy free/remix civs (same seeds, envelope OFF)');
if (want.includes('all') || want.includes('legacy-fixed')) out.legacyFixed = await sheet(path.join(outDir, 'contact-legacy-repaired-24.png'), leg.map(([s, l]) => [{ ...s, envelope: true }, l.replace('legacy', 'repaired')]), 4, 'AFTER: the same 24 legacy civs with the taste-envelope repair switch ON');
if (want.includes('all') || want.includes('era')) {
  const eras = [0, 1, 2, 3, 4, 5], rows = [];
  for (const [gs, sl] of [[100, 0], [100, 2], [101, 1], [103, 4]]) { const r = await page.evaluate(s => window.renderTaste(s), { mode: 'generated', gameSeed: gs, slot: sl, width: 1500, height: 330, eraStrip: eras }); rows.push(buf(r.png)); }
  const H = rows.length * 330; await sharp({ create: { width: 1500, height: H, channels: 3, background: '#111' } }).composite(rows.map((input, i) => ({ input, left: 0, top: i * 330 }))).png().toFile(path.join(outDir, 'era-progression.png'));
  const st = await sharp(path.join(outDir, 'era-progression.png')).stats(); console.log('era-progression.png mean', st.channels.map(c => c.mean.toFixed(1)).join('/'));
  out.era = { file: 'era-progression.png', mean: st.channels.map(c => +c.mean.toFixed(1)) };
}
fs.writeFileSync(path.join(outDir, 'sheets.json'), JSON.stringify(out, null, 1));
await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
