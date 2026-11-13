// ARMS close-up strips (people v2 default path): per civ, rows = idle/walk/carry/spear-hold/chop, columns = front/side/back; roles sheet; game and mid distance.
//   node tools/render-preview/arms.mjs [civs|roles|dist|all] [--rig1] [--out=DIR] [--tag=before|after]
// Output default: docs/renders/arms/. Needs esbuild + playwright + sharp (repo node_modules, NODE_PATH, /opt/npm-tools) and three (THREE_DIR or node_modules).
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
  const c = [process.env.THREE_DIR, path.join(root, 'node_modules/three'), ...(fs.existsSync('/mnt/user-data/uploads') ? fs.readdirSync('/mnt/user-data/uploads', { withFileTypes: true }).filter(d => d.isDirectory()).map(d => path.join('/mnt/user-data/uploads', d.name, 'node_modules/three')) : [])].filter(Boolean);
  const hit = c.find(p => fs.existsSync(path.join(p, 'build/three.module.js')));
  if (!hit) throw new Error('three not found; set THREE_DIR');
  return hit;
};
const args = process.argv.slice(2), outDir = path.resolve((args.find(a => a.startsWith('--out=')) || '--out=' + path.join(root, 'docs/renders/arms')).slice(6));
const rig1 = args.includes('--rig1'), pos = args.filter(a => !a.startsWith('--'));
fs.mkdirSync(outDir, { recursive: true });
const esbuild = need('esbuild'), { chromium } = need('playwright'), sharp = need('sharp');
const three = findThree(), tmp = path.join(outDir, '.tmp'); fs.mkdirSync(tmp, { recursive: true });
const bundle = path.join(tmp, 'people2-bundle.js');
await esbuild.build({ entryPoints: [path.join(here, 'people2-entry.ts')], bundle: true, format: 'iife', outfile: bundle, absWorkingDir: root, tsconfig: path.join(root, 'tsconfig.json'), logLevel: 'error',
  alias: fs.existsSync(path.join(three, 'examples/jsm')) ? { three: path.join(three, 'build/three.module.js'), 'three/addons': path.join(three, 'examples/jsm') } : { three: path.join(three, 'build/three.module.js'), 'three/addons/utils/BufferGeometryUtils.js': path.join(here, 'shims/BufferGeometryUtils.js') }, define: { 'process.env.NODE_ENV': '"production"' }, loader: { '.png': 'dataurl' } });
const html = path.join(tmp, 'people2.html');
fs.writeFileSync(html, '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#222"><script src="' + pathToFileURL(bundle).href + '"></script>');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const probe = await browser.newPage(); await probe.goto(pathToFileURL(html).href);
const ALL = await probe.evaluate(() => window.skinIds()); await probe.close();
const COLD = new Set(['skoldar', 'rusvolt', 'steppan', 'quillan', 'frost-slate', 'ochre-felt', 'civ:skoldar', 'civ:rusvolt', 'civ:steppan', 'civ:quillan']);
const G = (item, extra = {}) => ({ garment: { item, condition: .95 }, ...extra });
const ARMOR = { armor: { kind: 'paddedTorso', condition: .9 } };
const seasonGarment = (skin, season) => season === 'winter' ? (COLD.has(skin) || [...COLD].some(c => skin.includes(c.replace('civ:', ''))) ? 'hideCoat' : 'woolCoat') : season === 'summer' ? 'lightClothes' : 'leatherClothes';
const P = (skin, type, x, z, o = {}, season = 'summer', gearExtra = {}) => ({ row: { skin, type, gear: G(o.garment || seasonGarment(skin, season), gearExtra), ...o }, x, z, facing: o.facing ?? .5 });
async function shoot(name, spec, dir = tmp) {
  const page = await browser.newPage({ viewport: { width: spec.width, height: spec.height } });
  page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto(pathToFileURL(html).href);
  const info = await page.evaluate(s => window.renderPeople2(s), { ...spec, rig1 });
  const out = path.join(dir, name + '.png');
  await page.locator('canvas').screenshot({ path: out });
  await page.close();
  return { out, info };
}
const label = (t, W, h = 30) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}"><rect width="100%" height="100%" fill="#1b1b1b"/><text x="12" y="21" font-family="sans-serif" font-size="16" font-weight="700" fill="#f2e8d0">${t}</text></svg>`);
async function stack(file, parts) { // parts: [{label, img}]
  const metas = await Promise.all(parts.map(p => sharp(p.img).metadata())), W = Math.max(...metas.map(m => m.width)), lab = 30;
  const H = parts.length * lab + metas.reduce((n, m) => n + m.height, 0); let y = 0; const comp = [];
  parts.forEach((p, i) => { comp.push({ input: label(p.label, W), top: y, left: 0 }); y += lab; comp.push({ input: p.img, top: y, left: 0 }); y += metas[i].height; });
  await sharp({ create: { width: W, height: H, channels: 3, background: '#1b1b1b' } }).composite(comp).png({ compressionLevel: 9 }).toFile(file);
}
const TAG = (args.find(a => a.startsWith('--tag=')) || '--tag=after').slice(6);
const CIVS = ['civ:hanrei', 'civ:skoldar', 'civ:kaaltun', 'civ:sahelan', 'civ:steppan', 'civ:aureline'].filter(c => ALL.includes(c));
const POSES = [
  ['idle', 'worker', {}, 0], ['walk', 'worker', { moving: true, order: 'move' }, .25], ['carry', 'worker', { moving: true, order: 'move', carry: 8 }, .25],
  ['spear-hold', 'spearman', {}, 0], ['chop', 'worker', { order: 'gather', node: { kind: 'tree' } }, .45],
];
const VIEWS = [['front', 0], ['side', Math.PI / 2], ['back', Math.PI]];
const CAM = { pos: [0, 1.3, 5.6], target: [0, .95, 0], fov: 30 };
const strip = async (name, skin, type, o, seconds, gear, cam = CAM, W = 1500, H = 520, season = 'summer') => {
  const mv = o.moving ? 2.4 * seconds / 2 : 0; // start behind so the walker is centred mid-clip
  const people = VIEWS.map(([, f], i) => P(skin, type, (i - 1) * 1.5 - Math.sin(f) * mv, -Math.cos(f) * mv, { ...o, id: 40 + i * 13, facing: f }, season, gear));
  return shoot(name, { width: W, height: H, season, era: 3, seconds, cam, people });
};
async function civs() {
  for (const skin of CIVS) {
    const parts = [];
    for (const [pn, type, o, secs] of POSES) {
      const r = await strip(`arm-${skin}-${pn}`, skin, type, o, secs + .3, type === 'spearman' ? ARMOR : {});
      parts.push({ label: `${TAG} ${skin} ${pn}: front / side / back, near LOD`, img: r.out });
    }
    await stack(path.join(outDir, `${TAG}-civ-${skin.replace(':', '-')}.png`), parts);
  }
}
const ROLE9 = [['child', 'worker', { cls: 'child' }], ['elder', 'worker', { cls: 'elder' }], ['farmer', 'worker', { role: 'farmer' }], ['hunter', 'archer', { role: 'hunter' }], ['smith', 'worker', { role: 'smith', recipe: 'smeltCopper' }], ['priest', 'worker', { role: 'priest' }], ['ruler', 'leader', { cls: 'leader' }], ['soldier', 'spearman', {}], ['scout', 'ranger', { role: 'scout' }]];
async function roles() {
  const parts = [];
  for (const skin of ['civ:hanrei', 'civ:skoldar']) for (const [mode, o2, secs] of [['idle', {}, .3], ['walk', { moving: true, order: 'move' }, .55]]) {
    const people = ROLE9.map(([, t, o], i) => P(skin, t, (i - 4) * 1.05, 0, { ...o2, ...o, id: 300 + i * 9, facing: .45 }, 'summer', t === 'spearman' ? ARMOR : {}));
    const r = await shoot(`roles-${skin}-${mode}`, { width: 1700, height: 460, season: 'summer', era: 3, seconds: secs, cam: { pos: [0, 1.3, 7.2], target: [0, .95, 0], fov: 30 }, people });
    parts.push({ label: `${TAG} ${skin} ${mode}: child, elder, farmer, hunter, smith, priest, ruler, soldier, scout (near LOD, 3/4 view)`, img: r.out });
  }
  await stack(path.join(outDir, `${TAG}-roles.png`), parts);
}
async function dist() {
  const parts = [];
  for (const [dn, cam, lab] of [['game', { pos: [0, 5, 11], target: [0, 1, 0], fov: 32 }, 'game default distance (near LOD)'], ['mid', { pos: [0, 24, 44], target: [0, 1, 0], fov: 32 }, 'mid LOD (~50 m)']]) {
    for (const skin of ['civ:hanrei', 'civ:skoldar', 'civ:sahelan']) {
      const people = ['worker', 'worker', 'spearman', 'archer', 'worker', 'leader', 'worker', 'worker'].map((t, i) => P(skin, t, (i - 3.5) * 1.4, 0, { id: 500 + i * 7, facing: .5 + i * .3, moving: i % 3 === 1, order: i % 3 === 1 ? 'move' : 'idle', carry: i === 4 ? 8 : 0, cls: t === 'leader' ? 'leader' : undefined }, 'summer', t === 'spearman' ? ARMOR : {}));
      const r = await shoot(`dist-${dn}-${skin}`, { width: 1500, height: dn === 'game' ? 520 : 420, season: 'summer', era: 3, seconds: .5, cam, people });
      parts.push({ label: `${TAG} ${skin}: ${lab}`, img: r.out });
    }
  }
  await stack(path.join(outDir, `${TAG}-distance.png`), parts);
}
const what = pos.length ? pos : ['all'];
if (what.includes('civs') || what.includes('all')) await civs();
if (what.includes('roles') || what.includes('all')) await roles();
if (what.includes('dist') || what.includes('all')) await dist();
await browser.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log('done', outDir);
