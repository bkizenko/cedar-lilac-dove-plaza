// Animal render sheets: real three.js, real AnimalRigLayer + pose solver, legacy merged meshes for before/after.
//   node tools/render-preview/animals.mjs [sheet ...] [--out=DIR] [--modes=new,legacy]
//   sheets: lineup near mid far seasons sexage poses strips all
// Needs esbuild + playwright (NODE_PATH=/opt/npm-tools/node_modules) and three (THREE_DIR). No network.
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const need = (name) => {
  for (const b of [root, process.env.NODE_PATH, '/opt/npm-tools', '/opt/npm-tools/node_modules'].filter(Boolean)) {
    try { return createRequire(path.join(b, 'noop.js'))(name); } catch { /* next */ }
  }
  throw new Error(name + ' not found (set NODE_PATH)');
};
const findThree = () => {
  const c = [process.env.THREE_DIR, path.join(root, 'node_modules/three')].filter(Boolean);
  const hit = c.find(p => fs.existsSync(path.join(p, 'build/three.module.js')));
  if (!hit) throw new Error('three not found; set THREE_DIR');
  return hit;
};
const args = process.argv.slice(2), outDir = path.resolve((args.find(a => a.startsWith('--out=')) || '--out=' + path.join(root, 'docs/renders/animal-models')).slice(6));
const want = args.filter(a => !a.startsWith('--')), sheets = want.length ? want : ['all'];
fs.mkdirSync(outDir, { recursive: true });
const modes = (args.find(a => a.startsWith('--modes=')) || '--modes=new').slice(8).split(',');
const QUAD = ['redDeer', 'fallowDeer', 'roeDeer', 'boar', 'wolf', 'fox', 'bear', 'aurochs', 'cattle', 'mouflon', 'sheep', 'ibex', 'goat', 'wildHorse', 'horse', 'donkey', 'hare'];
const BIRD = ['duck', 'goose', 'raptor'], FISH = ['trout', 'carp', 'pike', 'eel'];
const SIZE = { redDeer: 1.3, fallowDeer: .95, roeDeer: .8, boar: 1, wolf: .9, fox: .5, bear: 1.3, aurochs: 1.9, cattle: 1.4, mouflon: .85, sheep: .8, ibex: 1, goat: .8, wildHorse: 1.5, horse: 1.6, donkey: 1.3, hare: .35, duck: .5, goose: .7, raptor: .8, trout: .5, carp: .5, pike: .7, eel: .7 };
const A = (species, x, z, o = {}) => ({ species, x, z, facing: o.facing ?? 0.0, ...o });
const row = (list, spacing, o = {}, z0 = 0) => list.map((s, i) => A(s, (i - (list.length - 1) / 2) * spacing, z0, { id: 100 + i * 7, ...o }));
const sheetsDef = {
  // facing is rotation about Y; +X is the animal's front, so facing 0 shows the right-hand flank to a camera on +Z
  lineup: (tier, who = QUAD, sp = 2.9) => ({ width: 1700, height: 640, mode: 'new', cam: { pos: [0, 2.6, 15], target: [0, .75, 0], fov: 32 }, animals: row(who, sp, { tier, facing: 0 }) }),
  near: (who) => ({ width: 1500, height: 560, mode: 'new', cam: { pos: [0, 1.7, 10.5], target: [0, .8, 0], fov: 32 }, animals: row(who, 3.1, { tier: 0, facing: .3 }) }),
  seasons: (sp) => ({ width: 1500, height: 520, mode: 'new', cam: { pos: [0, 1.8, 8.6], target: [0, .8, 0], fov: 32 }, animals: [0, 1, 2, 3].map((season, i) => A(sp, (i - 1.5) * 2.7, 0, { season, within: .5, id: 311, tier: 0, sex: 'm', facing: .3 })) }),
  sexage: (sp) => ({ width: 1500, height: 520, mode: 'new', cam: { pos: [0, 1.8, 8.6], target: [0, .7, 0], fov: 32 }, animals: [['m', 1], ['f', 1], ['m', .35], ['f', .6]].map(([sex, age], i) => A(sp, (i - 1.5) * 2.6, 0, { sex, age, id: 211 + i, tier: 0, season: 1, facing: .3, size: undefined })) }),
  poses: (sp) => ({ width: 1700, height: 460, mode: 'new', cam: { pos: [0, 1.6, 9.5], target: [0, .75, 0], fov: 32 }, animals: ['idle', 'graze', 'alert', 'drink', 'walk', 'trot', 'gallop'].map((gait, i) => A(sp, (i - 3) * 2.4, 0, { gait, phase: .15, id: 421, tier: 0, facing: 0 })) }),
  strips: (sp) => ({ width: 1700, height: 700, mode: 'new', cam: { pos: [0, 2.4, 11], target: [0, .75, -1.4], fov: 34 }, animals: ['walk', 'trot', 'gallop'].flatMap((gait, r) => [0, 1, 2, 3, 4, 5, 6].map((k, i) => A(sp, (i - 3) * 2.2, -r * 2.2 + 1.5, { gait, phase: k / 7, id: 421, tier: 0, facing: 0 }))) }),
};
const esbuild = need('esbuild'), { chromium } = need('playwright'), three = findThree();
const bundle = path.join(outDir, '.animals-bundle.js');
await esbuild.build({ entryPoints: [path.join(here, 'animals-entry.ts')], bundle: true, format: 'iife', outfile: bundle, absWorkingDir: root, tsconfig: path.join(root, 'tsconfig.json'), logLevel: 'error',
  alias: fs.existsSync(path.join(three, 'examples/jsm')) ? { three: path.join(three, 'build/three.module.js'), 'three/addons': path.join(three, 'examples/jsm') } : { three: path.join(three, 'build/three.module.js'), 'three/addons/utils/BufferGeometryUtils.js': path.join(here, 'shims/BufferGeometryUtils.js') }, define: { 'process.env.NODE_ENV': '"production"' } });
const html = path.join(outDir, '.animals.html');
fs.writeFileSync(html, '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#222"><script src="' + pathToFileURL(bundle).href + '"></script>');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
async function shoot(name, spec) {
  const page = await browser.newPage({ viewport: { width: spec.width, height: spec.height } });
  page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto(pathToFileURL(html).href);
  const info = await page.evaluate(s => window.renderAnimals(s), spec);
  await page.locator('canvas').screenshot({ path: path.join(outDir, name + '.png') });
  await page.close();
  console.log(name, JSON.stringify(info));
}
const all = sheets.includes('all'), has = s => all || sheets.includes(s);
const mode = modes[0];
const withMode = s => ({ ...s, mode });
const chunks = (a, n) => a.reduce((o, x, i) => (i % n ? o[o.length - 1].push(x) : o.push([x]), o), []);
if (has('near')) for (const [i, g] of chunks([...QUAD], 4).entries()) await shoot(`near-${mode}-${i + 1}`, withMode(sheetsDef.near(g)));
if (has('mid')) for (const [i, g] of chunks([...QUAD], 9).entries()) await shoot(`mid-${mode}-${i + 1}`, withMode(sheetsDef.lineup(1, g, 3.4)));
if (has('far')) for (const [i, g] of chunks([...QUAD], 9).entries()) await shoot(`far-${mode}-${i + 1}`, withMode(sheetsDef.lineup(2, g, 3.4)));
const flyRow = (gait, y = 0, o = {}) => BIRD.flatMap((b, i) => ['m', 'f'].map((sex, j) => A(b, (i * 2 + j - 2.5) * 1.25, 0, { gait, sex, id: 77 + i * 5 + j, tier: 0, facing: .5, y, phase: (i * 2 + j) * .17, ...o })));
if (has('birds')) {
  await shoot(`near-${mode}-birds-stand`, { width: 1500, height: 520, mode, cam: { pos: [0, 1.1, 6.2], target: [0, .3, 0], fov: 32 }, animals: flyRow('idle') });
  await shoot(`near-${mode}-birds-fly`, { width: 1500, height: 520, mode, cam: { pos: [0, 2.2, 7.2], target: [0, 1.6, 0], fov: 34 }, animals: flyRow('fly', 1.4).map((a, i) => ({ ...a, facing: 1.2, z: (i % 2) * 1.2 })) });
  await shoot(`near-${mode}-birds-swim`, { width: 1500, height: 520, mode, water: true, cam: { pos: [0, 1.0, 6.2], target: [0, 0, 0], fov: 32 }, animals: flyRow('swim') });
}
if (has('fish')) {
  const fy = FISH.flatMap((f, i) => [0, .25, .5, .75].map((ph, j) => A(f, (i - 1.5) * 2.4 + (j - 1.5) * .0, (j - 1.5) * 0.7, { gait: 'swim', phase: ph, id: 5 + i, tier: 0, facing: 0, y: -.12 })));
  await shoot(`near-${mode}-fish`, { width: 1500, height: 560, mode, water: true, cam: { pos: [0, 4.6, 5.4], target: [0, -.1, 0], fov: 34 }, animals: fy });
  await shoot(`near-${mode}-fish-side`, { width: 1500, height: 400, mode, water: true, cam: { pos: [0, .5, 6.5], target: [0, -.1, 0], fov: 30 }, animals: FISH.map((f, i) => A(f, (i - 1.5) * 1.9, 0, { gait: 'swim', phase: .2, id: 5 + i, tier: 0, facing: 0, y: -.15 })) });
}
for (const sp of (args.find(a => a.startsWith('--species=')) || '--species=redDeer,wolf,horse,boar,cattle').slice(10).split(',')) {
  if (has('seasons')) await shoot(`seasons-${sp}`, withMode(sheetsDef.seasons(sp)));
  if (has('sexage')) await shoot(`sexage-${sp}`, withMode(sheetsDef.sexage(sp)));
  if (has('poses')) await shoot(`poses-${sp}`, withMode(sheetsDef.poses(sp)));
  if (has('strips')) await shoot(`strips-${sp}`, withMode(sheetsDef.strips(sp)));
}
await browser.close();
