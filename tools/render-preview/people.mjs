// People render sheets: real three.js, real CharacterRigLayer + real animator, archived legacy people for before/after.
//   node tools/render-preview/people.mjs [sheet ...] [--out=DIR]      sheets: lineup classes jobs death distance all
// Needs esbuild + playwright (repo node_modules, NODE_PATH, or /opt/npm-tools) and three (repo node_modules or THREE_DIR).
// No network. SwiftShader flags make it work headless.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const need = (name) => {
  for (const b of [root, process.env.NODE_PATH, '/opt/npm-tools', '/home/claude/.npm-global/lib/node_modules'].filter(Boolean)) {
    try { return createRequire(path.join(b, 'noop.js'))(name); } catch { /* next */ }
  }
  throw new Error(name + ' not found (npm ci, or set NODE_PATH)');
};
const findThree = () => {
  const c = [process.env.THREE_DIR, path.join(root, 'node_modules/three'), ...fs.readdirSync('/mnt/user-data/uploads', { withFileTypes: true }).filter(d => d.isDirectory()).map(d => path.join('/mnt/user-data/uploads', d.name, 'node_modules/three'))].filter(Boolean);
  const hit = c.find(p => fs.existsSync(path.join(p, 'build/three.module.js')));
  if (!hit) throw new Error('three not found; set THREE_DIR');
  return hit;
};
const args = process.argv.slice(2), outDir = path.resolve((args.find(a => a.startsWith('--out=')) || '--out=' + path.join(root, 'artifacts/people-renders')).slice(6));
const sheets = args.filter(a => !a.startsWith('--')), want = sheets.length ? sheets : ['all'];
fs.mkdirSync(outDir, { recursive: true });

const SIX = ['sandrill', 'nilemark', 'hanrei', 'aureline', 'rusvolt', 'steppan'];
const G = (item, extra = {}) => ({ garment: { item, condition: .95 }, ...extra });
const ARMOR = { armor: { kind: 'paddedTorso', condition: .9 } };
const GARM_BY_CIV = { sandrill: 'lightClothes', nilemark: 'lightClothes', hanrei: 'woolCoat', aureline: 'lightClothes', rusvolt: 'woolCoat', steppan: 'hideCoat', tigrane: 'woolCoat', vedara: 'lightClothes' };
const person = (civ, type, x, z, o = {}) => ({ row: { civ, type, gear: G(GARM_BY_CIV[civ] || 'woolCoat', type === 'spearman' || type === 'swordsman' ? ARMOR : {}), ...o }, x, z, facing: o.facing ?? 0 });
const sheetsDef = {
  lineup: (mode, civs = SIX.slice(0, 3)) => ({ width: 1500, height: 640, mode, season: 'summer', era: 3, seconds: 1.3, cam: { pos: [0, 4.2, 17], target: [0, 1.5, 0], fov: 31 },
    people: civs.flatMap((civ, i) => ['worker', 'spearman', 'archer', 'swordsman', 'leader'].map((t, j) => person(civ, t, (i - 1) * 6.6 + (j - 2) * 1.2, 0, { facing: .25, order: 'idle', id: 100 + i * 10 + j }))) }),
  classes: (mode) => ({ width: 1300, height: 560, mode, season: 'summer', era: 3, seconds: 1.3, cam: { pos: [0, 3.5, 11], target: [0, 1.4, 0], fov: 32 },
    people: [['hanrei', 'worker', 'child'], ['hanrei', 'worker', null], ['hanrei', 'worker', 'elder'], ['hanrei', 'spearman', null], ['hanrei', 'archer', null], ['hanrei', 'leader', 'leader'],
      ['rusvolt', 'worker', 'child'], ['rusvolt', 'worker', 'elder'], ['rusvolt', 'swordsman', null], ['rusvolt', 'leader', 'leader']].map(([civ, t, cls], i) => person(civ, t, (i % 6 - 2.5) * 2.3, i < 6 ? 0 : -3.6, { cls: cls || undefined, facing: .3, id: 500 + i })) }),
  jobs: (mode) => {
    const jobs = [
      ['chop', { order: 'gather', node: { kind: 'tree' } }], ['quarry', { order: 'gather', node: { kind: 'stone' } }], ['build', { order: 'build' }], ['till', { order: 'gather', node: { type: 'farm' }, farm: { planted: 0 } }],
      ['plant', { order: 'gather', node: { type: 'farm' }, farm: { planted: 3, tended: 3 } }], ['harvest', { order: 'gather', node: { type: 'farm' }, farm: { ripened: true, planted: 3 } }], ['fish', { order: 'gather', node: { kind: 'fish' } }],
      ['haul', { order: 'move', moving: true, haulage: 'sled' }], ['carry', { order: 'move', moving: true, carry: 9 }], ['thresh', { order: 'idle', recipe: 'threshCereal' }], ['grind', { order: 'idle', recipe: 'grindGrain' }], ['walk', { order: 'move', moving: true }],
    ];
    const fights = [['spearman', 'thrust'], ['archer', 'shoot'], ['swordsman', 'slash']];
    const rows = [];
    jobs.forEach(([name, o], i) => { for (let k = 0; k < 3; k++) rows.push(person('sandrill', 'worker', (i - 5.5) * 1.75, (o.moving ? -5.5 : 0) + (k - 1) * 1.5 - (o.moving ? 0 : 0), { ...o, id: 900 + i * 10 + k * 3, facing: o.moving ? 0 : .4 })); });
    return { width: 1700, height: 700, mode, season: 'summer', era: 3, seconds: 2.2, cam: { pos: [0, 5.2, 14.5], target: [0, 1.1, -.6], fov: 36 }, people: rows, jobs: jobs.map(j => j[0]) };
  },
  /** Clip review: exact phases of every job/fight clip through the same rig (pure clip sampling, no sim). */
  strips: (mode, part = 0) => {
    const all = [['chop', 'worker'], ['quarry', 'worker'], ['build', 'worker'], ['till', 'worker'], ['plant', 'worker'], ['harvest', 'worker'], ['fish', 'worker'], ['carry', 'worker'], ['haul', 'worker'], ['craft', 'worker'], ['thrust', 'spearman'], ['shoot', 'archer'], ['slash', 'swordsman'], ['walk', 'worker']];
    const rows = all.slice(part * 5, part * 5 + 5), strips = [];
    rows.forEach(([clip, type], r) => [0, .25, .5, .75].forEach((ph, c) => strips.push({ civ: (r + part) % 2 ? 'hanrei' : 'rusvolt', type, clip, phase: ph, x: (c - 1.5) * .92 + (r - 2) * 4.0, z: 0, facing: 1.25,
      gear: G((r + part) % 2 ? 'woolCoat' : 'hideCoat', type === 'spearman' || type === 'swordsman' ? ARMOR : {}) })));
    return { width: 1700, height: 640, mode, season: 'summer', era: 3, seconds: 0, cam: { pos: [0, 3.2, 13.2], target: [0, 1.0, 0], fov: 33 }, strips, people: [], names: rows.map(r => r[0]) };
  },
  fights: (mode) => ({ width: 1400, height: 560, mode, season: 'summer', era: 3, seconds: 1.7, cam: { pos: [0, 4.5, 12], target: [0, 1.3, 0], fov: 32 },
    people: ['spearman', 'archer', 'swordsman', 'warden', 'worker'].flatMap((t, i) => [0, 1, 2].map(k => person(i % 2 ? 'aureline' : 'rusvolt', t, (i - 2) * 2.6, k * -2.4 + 1.5, { order: 'attack', target: true, id: 1300 + i * 10 + k, facing: .45, gear: G(i % 2 ? 'lightClothes' : 'woolCoat', t === 'archer' ? {} : ARMOR) }))) }),
  death: (mode) => ({ width: 1400, height: 520, mode, season: 'summer', era: 3, seconds: 3.4, cam: { pos: [0, 6.5, 7.5], target: [0, .2, -.2], fov: 36 },
    people: Array.from({ length: 8 }, (_, i) => person(i % 2 ? 'hanrei' : 'rusvolt', i % 3 === 2 ? 'spearman' : 'worker', (i - 3.5) * 1.6, 0, { id: 2000 + i * 7, facing: i % 4 === 1 ? 2.4 : .3, moving: i % 4 === 0, order: i % 4 === 0 ? 'move' : 'idle', dieAt: 1.4 + (i < 4 ? i * .22 : (i - 4) * .22 + 1.1), gear: G(i % 2 ? 'woolCoat' : 'hideCoat', i % 3 === 2 ? ARMOR : {}) })) }),
  distance: (mode, d = 32) => {
    const ppl = []; const civs = ['sandrill', 'hanrei', 'rusvolt', 'steppan'];
    civs.forEach((civ, ci) => { ['worker', 'worker', 'spearman', 'spearman', 'archer', 'swordsman', 'leader'].forEach((t, j) => ppl.push(person(civ, t, (ci - 1.5) * 6.2 + (j - 3) * .85, (j % 2) * -1.1, { facing: .15, id: 3000 + ci * 20 + j, order: 'idle' }))); });
    const H = 1000; return { width: 1500, height: H, clip: { x: 0, y: H / 2 - 130, width: 1500, height: 260 }, mode, season: 'summer', era: 3, seconds: 1.0, cam: { pos: [0, d * .42, d], target: [0, 1.3, 0], fov: 40 }, people: ppl };
  },
};

const esbuild = need('esbuild'), { chromium } = need('playwright');
const three = findThree();
const bundle = path.join(outDir, '.people-bundle.js');
await esbuild.build({ entryPoints: [path.join(here, 'people-entry.ts')], bundle: true, format: 'iife', outfile: bundle, absWorkingDir: root, tsconfig: path.join(root, 'tsconfig.json'), logLevel: 'error',
  alias: fs.existsSync(path.join(three, 'examples/jsm')) ? { three: path.join(three, 'build/three.module.js'), 'three/addons': path.join(three, 'examples/jsm') } : { three: path.join(three, 'build/three.module.js'), 'three/addons/utils/BufferGeometryUtils.js': path.join(here, 'shims/BufferGeometryUtils.js') }, define: { 'process.env.NODE_ENV': '"production"' }, loader: { '.png': 'dataurl' } });
const html = path.join(outDir, '.people.html');
fs.writeFileSync(html, '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#222"><script src="' + pathToFileURL(bundle).href + '"></script>');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function shoot(name, spec) {
  const page = await browser.newPage({ viewport: { width: spec.width, height: spec.height } });
  page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto(pathToFileURL(html).href);
  const info = await page.evaluate(s => window.renderPeople(s), spec);
  const out = path.join(outDir, name + '.png');
  if (spec.clip) await page.screenshot({ path: out, clip: spec.clip }); else await page.locator('canvas').screenshot({ path: out });
  await page.close();
  console.log(name, JSON.stringify(info));
}
const all = want.includes('all');
for (const mode of ['rig', 'legacy']) {
  for (const s of ['lineup', 'classes', 'jobs', 'strips', 'fights', 'death']) if (all || want.includes(s)) {
    if (mode === 'legacy' && (s === 'death' || s === 'strips')) continue;
    if (s === 'lineup') { await shoot(`lineup-a-${mode}`, sheetsDef.lineup(mode, SIX.slice(0, 3))); await shoot(`lineup-b-${mode}`, sheetsDef.lineup(mode, SIX.slice(3))); continue; }
    if (s === 'strips') { for (const part of [0, 1, 2]) await shoot(`strips-${'abc'[part]}-${mode}`, sheetsDef.strips(mode, part)); continue; }
    await shoot(`${s}-${mode}`, sheetsDef[s](mode));
  }
}
if (all || want.includes('distance')) for (const [n, d] of [['near', 26], ['mid', 52], ['far', 105]]) { await shoot('distance-' + n + '-rig', sheetsDef.distance('rig', d)); await shoot('distance-' + n + '-legacy', sheetsDef.distance('legacy', d)); }
await browser.close();
// Before/after composites (legacy above, rig below) for every sheet that has both.
const sharp = need('sharp');
const names = fs.readdirSync(outDir).filter(f => f.endsWith('-rig.png')).map(f => f.slice(0, -8));
for (const n of names) {
  const a = path.join(outDir, n + '-legacy.png'), b = path.join(outDir, n + '-rig.png');
  if (!fs.existsSync(a)) continue;
  const A = await sharp(a).metadata(), B = await sharp(b).metadata(), W = Math.max(A.width, B.width), lab = 34;
  const svg = t => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${lab}"><rect width="100%" height="100%" fill="#1b1b1b"/><text x="14" y="23" font-family="sans-serif" font-size="18" font-weight="700" fill="#f2e8d0">${t}</text></svg>`);
  await sharp({ create: { width: W, height: A.height + B.height + lab * 2, channels: 3, background: '#1b1b1b' } }).composite([
    { input: svg('BEFORE: legacy people set (merged unit mesh + worn garment layers) - ' + n), top: 0, left: 0 }, { input: a, top: lab, left: 0 },
    { input: svg('AFTER: shared character rig - ' + n), top: lab + A.height, left: 0 }, { input: b, top: lab * 2 + A.height, left: 0 }]).png().toFile(path.join(outDir, n + '-before-after.png'));
}
