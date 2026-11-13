// Animal render sheets: real three.js, real AnimalRigLayer (jointed gaits, head poses), legacy merged meshes for before/after, fish school.
//   node tools/render-preview/animals.mjs [--out=DIR]      NODE_PATH=/opt/npm-tools/node_modules THREE_DIR=.../three
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..');
const need = (name) => { for (const b of [root, process.env.NODE_PATH, '/opt/npm-tools', '/home/claude/.npm-global/lib/node_modules'].filter(Boolean)) { try { return createRequire(path.join(b, 'noop.js'))(name); } catch { /* next */ } } throw new Error(name + ' not found'); };
const three = [process.env.THREE_DIR, path.join(root, 'node_modules/three')].filter(Boolean).find(p => fs.existsSync(path.join(p, 'build/three.module.js')));
if (!three) throw new Error('three not found; set THREE_DIR');
const outDir = path.resolve((process.argv.find(a => a.startsWith('--out=')) || '--out=' + path.join(root, 'docs/renders/animals')).slice(6));
fs.mkdirSync(outDir, { recursive: true });
const esbuild = need('esbuild'), { chromium } = need('playwright'), sharp = need('sharp');
const bundle = path.join(outDir, '.animals-bundle.js');
await esbuild.build({ entryPoints: [path.join(here, 'animals-entry.ts')], bundle: true, format: 'iife', outfile: bundle, absWorkingDir: root, tsconfig: path.join(root, 'tsconfig.json'), logLevel: 'error',
  alias: fs.existsSync(path.join(three, 'examples/jsm')) ? { three: path.join(three, 'build/three.module.js'), 'three/addons': path.join(three, 'examples/jsm') } : { three: path.join(three, 'build/three.module.js'), 'three/addons/utils/BufferGeometryUtils.js': path.join(here, 'shims/BufferGeometryUtils.js') }, define: { 'process.env.NODE_ENV': '"production"' }, loader: { '.png': 'dataurl' } });
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
  await page.close(); console.log(name, JSON.stringify(info));
}
// speeds from ANIMAL_TRAITS gaits (walk, trot, canter, gallop)
const G = { deer: [.9, 2.2, 3.2, 4.1], horse: [1.1, 2.6, 3.8, 4.8], cattle: [.8, 1.8, 2.7, 3.5], wolf: [1, 2.4, 3.6, 4.7], boar: [.8, 1.8, 2.6, 3], goat: [.7, 1.7, 2.4, 2.9] };
const GN = ['walk', 'trot', 'canter', 'gallop'];
// Gait strips: each row a species x gait, four phases of the cycle. Side view; animals move toward +x (facing = pi/2).
let id = 1;
for (const sp of ['deer', 'horse', 'cattle', 'wolf']) {
  const cells = [];
  GN.forEach((g, r) => [0, .25, .5, .75].forEach((ph, c) => cells.push({ species: sp, x: (c - 1.5) * 2.7, z: -r * 2.2 + 3.3, speed: G[sp][r], state: r === 0 ? 'walk' : 'flee', phase: ph, facing: Math.PI / 2, id: id++, mode: 'rig' })));
  await shoot('gait-strip-' + sp, { width: 1500, height: 900, cam: { pos: [0, 9, 14], target: [0, .4, 0], fov: 38 }, cells });
}
// Posture sheet: head-down graze, head-up alert, drink, lying rest, flee gallop (deer, horse, boar) - rig, with legacy at left for comparison
for (const sp of ['deer', 'horse', 'boar', 'goat']) {
  const states = [['graze', 0], ['alert', 0], ['drink', 0], ['rest', 0], ['walk', G[sp][0]], ['flee', G[sp][3]]];
  const cells = [{ species: sp, x: -8.2, z: 0, speed: 0, state: 'graze', facing: Math.PI / 2, id: id++, mode: 'legacy', fix: true }];
  states.forEach(([st, v], i) => cells.push({ species: sp, x: -5 + i * 2.6, z: 0, speed: v, state: st, phase: .1 + i * .13, facing: Math.PI / 2, id: id++, mode: 'rig' }));
  await shoot('postures-' + sp, { width: 1500, height: 480, cam: { pos: [0, 4.2, 15], target: [0, .5, 0], fov: 33 }, cells });
}
// Legacy facing check: the old merged mesh drawn with rotation.y = facing, moving toward +z (facing 0): it points sideways.
await shoot('legacy-orientation-bug', { width: 900, height: 420, cam: { pos: [0, 9, 3], target: [0, 0, 0], fov: 40 }, cells: [
  { species: 'deer', x: -4, z: 0, speed: 3, state: 'walk', facing: 0, id: id++, mode: 'legacy' }, { species: 'deer', x: 0, z: 0, speed: 3, state: 'walk', facing: 0, id: id++, mode: 'legacy', fix: true }, { species: 'deer', x: 4, z: 0, speed: 3, state: 'walk', facing: 0, id: id++, mode: 'rig' }] });
// Fish: a school near the camera
await shoot('fish-school', { width: 1300, height: 560, cam: { pos: [0, 5.5, 9], target: [0, -.2, 0], fov: 40 }, cells: [], fish: { n: 3, t: 6.3 } });
await browser.close();
for (const f of fs.readdirSync(outDir)) if (f.startsWith('.animals')) fs.unlinkSync(path.join(outDir, f));
// check not near-black
for (const f of fs.readdirSync(outDir).filter(f => f.endsWith('.png'))) { const { channels } = await sharp(path.join(outDir, f)).stats(); const m = channels.slice(0, 3).reduce((a, c) => a + c.mean, 0) / 3; console.log(f, 'mean', m.toFixed(1), m < 40 ? 'NEAR-BLACK' : 'ok'); }
