// PEOPLE v2 contact sheets: real three.js + real CharacterRigLayer/peopleLook/peopleKit/peopleGear, SwiftShader, no network.
//   node tools/render-preview/people2.mjs [civ <skin>... | roles | armor | overview | silhouettes | crowd | all] [--out=DIR] [--rig1]
// Output default: docs/renders/people2/. Needs esbuild + playwright + sharp (repo node_modules, NODE_PATH, /opt/npm-tools) and three (THREE_DIR or node_modules).
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
const args = process.argv.slice(2), outDir = path.resolve((args.find(a => a.startsWith('--out=')) || '--out=' + path.join(root, 'docs/renders/people2')).slice(6));
const rig1 = args.includes('--rig1'), nearOff = args.includes('--near-off'), pos = args.filter(a => !a.startsWith('--'));
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
  const info = await page.evaluate(s => window.renderPeople2(s), { ...spec, rig1, nearOff });
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
const stats = {};
/** The per-civ contact sheet: close three-quarter (civilian, child, elder, farmer, soldier, ruler), summer vs winter (worker/soldier/ruler), RTS-zoom crowd. */
async function civSheet(skin) {
  const W = 1500, parts = [];
  // 1. close three-quarter, summer: worker, child, elder, farmer, hunter, smith, soldier(sim gear), scout, ruler
  const closeRoles = [['worker', {}], ['worker', { cls: 'child' }], ['worker', { cls: 'elder' }], ['worker', { role: 'farmer' }], ['archer', {}], ['worker', { role: 'smith', recipe: 'smeltCopper' }], ['spearman', {}, ARMOR], ['ranger', { role: 'scout' }], ['worker', { role: 'merchant' }], ['leader', { cls: 'leader' }]];
  const n = closeRoles.length;
  const place = (i) => [(i % 5 - 2) * 2.05, i < 5 ? 0 : 0];
  const mk = (list, k) => list.map(([t, o, g], i) => P(skin, t, (i - 2) * 2.05, 0, { ...o, id: 40 + (i + k * 5) * 13, facing: .55 }, 'summer', g || {}));
  const rowA = await shoot(`ca-${skin}`, { width: W, height: 500, season: 'summer', era: 3, seconds: .6, cam: { pos: [0, 2.0, 8.0], target: [0, 1.1, 0], fov: 33 }, people: mk(closeRoles.slice(0, 5), 0) });
  const rowB = await shoot(`cb-${skin}`, { width: W, height: 500, season: 'summer', era: 3, seconds: .6, cam: { pos: [0, 2.0, 8.0], target: [0, 1.1, 0], fov: 33 }, people: mk(closeRoles.slice(5), 1) });
  const close = { out: await sharp({ create: { width: W, height: 1000, channels: 3, background: '#1b1b1b' } }).composite([{ input: rowA.out, top: 0, left: 0 }, { input: rowB.out, top: 500, left: 0 }]).png().toBuffer(), info: rowA.info }; void place;
  parts.push({ label: `${skin}: close three-quarter, summer - worker, child, elder, farmer, hunter, smith, soldier (owned padded torso), scout, merchant, ruler`, img: close.out });
  // 2. summer vs winter
  const seasons = [];
  for (const [si, season] of ['summer', 'winter'].entries()) for (const [i, [t, o, g]] of [['worker', {}], ['worker', { role: 'farmer' }], ['spearman', {}, ARMOR], ['leader', { cls: 'leader' }], ['worker', { cls: 'child' }]].entries()) seasons.push(P(skin, t, (si * 5 + i - 4.5) * 1.55, 0, { ...o, id: 70 + i * 11, facing: .5 }, season, g || {}));
  const sea = await shoot(`s-${skin}`, { width: W, height: 500, season: 'summer', era: 3, seconds: .4, cam: { pos: [0, 2.4, 9.8], target: [0, 1.2, 0], fov: 31 }, people: seasons.map((p, i) => i < 5 ? p : p) });
  // winter people need the winter season in the layer: render as two shots side by side
  const sumS = await shoot(`ss-${skin}`, { width: W / 2, height: 480, season: 'summer', era: 3, seconds: .4, cam: { pos: [0, 2.4, 6.8], target: [0, 1.2, 0], fov: 33 }, people: seasons.slice(0, 5).map((p, i) => ({ ...p, x: (i - 2) * 1.5 })) });
  const winS = await shoot(`sw-${skin}`, { width: W / 2, height: 480, season: 'winter', era: 3, seconds: .4, cam: { pos: [0, 2.4, 6.8], target: [0, 1.2, 0], fov: 33 }, ground: '#d9dede', bg: '#c9d3d8', people: seasons.slice(5).map((p, i) => ({ ...p, x: (i - 2) * 1.5 })) });
  const pair = await sharp({ create: { width: W, height: 480, channels: 3, background: '#1b1b1b' } }).composite([{ input: sumS.out, left: 0, top: 0 }, { input: winS.out, left: W / 2, top: 0 }]).png().toBuffer();
  parts.push({ label: `${skin}: summer (left) vs winter (right) - worker, farmer, soldier, ruler, child`, img: pair }); void sea;
  // 3. RTS-zoom crowd at mid/far distance
  const crowd = [];
  const mix = ['worker', 'worker', 'worker', 'spearman', 'archer', 'worker', 'swordsman', 'worker', 'leader', 'worker'];
  for (let i = 0; i < 40; i++) { const t = mix[i % mix.length], c = i % 7 === 3 ? 'child' : i % 11 === 5 ? 'elder' : undefined; crowd.push(P(skin, t, ((i % 10) - 4.5) * 1.5 + ((i * 7) % 5) * .15, -Math.floor(i / 10) * 1.9, { cls: c || (t === 'leader' ? 'leader' : undefined), id: 200 + i * 7, facing: .3 + (i % 5) * .5, moving: i % 6 === 0, order: i % 6 === 0 ? 'move' : 'idle' }, 'summer', t === 'spearman' || t === 'swordsman' ? ARMOR : {})); }
  const rts = await shoot(`r-${skin}`, { width: W, height: 520, season: 'summer', era: 3, seconds: .5, cam: { pos: [0, 18, 26], target: [0, 0.8, -3], fov: 34 }, people: crowd });
  stats[skin] = { close: close.info, rts: rts.info };
  parts.push({ label: `${skin}: RTS-zoom crowd (40 people: workers, children, elders, spear, archer, sword, ruler)`, img: rts.out });
  await stack(path.join(outDir, `civ-${skin.replace(':', '-')}.png`), parts);
}
async function rolesSheet() {
  const skins = ['civ:hanrei', 'civ:skoldar', 'civ:kaaltun', 'civ:sahelan'], parts = [];
  const roles = [['worker', { cls: 'child' }], ['worker', { cls: 'elder' }], ['worker', { role: 'farmer' }], ['archer', { role: 'hunter' }], ['worker', { role: 'smith', recipe: 'smeltCopper' }], ['worker', { role: 'priest' }], ['leader', { cls: 'leader' }], ['spearman', {}], ['ranger', { role: 'scout' }], ['worker', { role: 'merchant' }]];
  for (const skin of skins) {
    const r = await shoot(`roles-${skin}`, { width: 1600, height: 470, season: 'summer', era: 3, seconds: .6, cam: { pos: [0, 2.3, 9.6], target: [0, 1.2, 0], fov: 31 }, people: roles.map(([t, o], i) => P(skin, t, (i - 4.5) * 1.62, 0, { ...o, id: 300 + i * 9, facing: .5 }, 'summer', t === 'spearman' ? ARMOR : {})) });
    parts.push({ label: `${skin}: child, elder, farmer, hunter, smith, priest, ruler, soldier, scout, merchant`, img: r.out });
  }
  await stack(path.join(outDir, 'roles.png'), parts);
}
async function armorSheet() {
  const skins = ['civ:aureline', 'civ:steppan', 'civ:kaaltun'], parts = [], styles = [['quilted', 'paddedTorso'], ['scaleCuirass'], ['lamellar'], ['mail'], ['plate'], ['hideCuirass']];
  for (const skin of skins) {
    const r = await shoot(`armor-${skin}`, { width: 1600, height: 470, season: 'summer', era: 3, seconds: .5, cam: { pos: [0, 2.3, 8.8], target: [0, 1.2, 0], fov: 31 },
      people: [['paddedTorso', 'leatherCap', 'woodShield'], ['hideCuirass', 'leatherCap', 'hideShield'], ['scaleCuirass', 'bronzeHelm', 'bronzeShield'], ['lamellar', 'ironHelm', 'woodShield'], ['mail', 'ironHelm', 'woodShield'], ['plate', 'ironHelm', 'bronzeShield']].map(([a, h, s], i) => P(skin, i % 3 === 1 ? 'swordsman' : 'spearman', (i - 2.5) * 1.8, 0, { id: 400 + i * 5, facing: .5 }, 'summer', { armor: { kind: a, condition: .9 }, helmet: { kind: h, condition: .9 }, shield: { kind: s, condition: .9 } })) });
    parts.push({ label: `${skin}: protection types by owned asset - padded (this society's style), hide, scale, lamellar, mail, plate (helmets and shields drawn only when owned; preview owns them)`, img: r.out });
  }
  void styles;
  await stack(path.join(outDir, 'armor.png'), parts);
}
async function wear() {
  const parts = [];
  for (const skin of ['civ:aureline', 'civ:steppan']) {
    const r = await shoot(`wear-${skin}`, { width: 1600, height: 470, season: 'summer', era: 3, seconds: .5, cam: { pos: [0, 1.6, 4.6], target: [0, 1.0, 0], fov: 31 },
      people: [.95, .7, .5, .3, .1].map((c, i) => P(skin, 'spearman', (i - 2) * 1.0, 0, { id: 400 + i * 5, facing: .25 }, 'summer', { armor: { kind: i % 2 ? 'scaleCuirass' : 'paddedTorso', condition: c }, helmet: { kind: i % 2 ? 'bronzeHelm' : 'leatherCap', condition: c }, shield: { kind: i % 2 ? 'bronzeShield' : 'woodShield', condition: c } })) });
    parts.push({ label: `${skin}: owned armor + helmet + shield wear by condition .95 .7 .5 .3 .1 (cosmetic; near LOD only)`, img: r.out });
  }
  await stack(path.join(outDir, 'wear.png'), parts);
}
async function lineup(file, ids, extra = {}) {
  const per = 3, rows = [];
  for (let i = 0; i < ids.length; i += 6) rows.push(ids.slice(i, i + 6));
  const parts = [];
  for (const row of rows) {
    const ppl = row.flatMap((skin, si) => [['worker', {}], ['spearman', {}, ARMOR], ['leader', { cls: 'leader' }]].map(([t, o, g], j) => P(skin, t, (si - (row.length - 1) / 2) * 3.7 + (j - 1) * 1.15, 0, { ...o, id: 500 + si * 31 + j * 5, facing: .4 }, 'summer', g || {})));
    const r = await shoot('lu' + (extra.sil ? 's' : 'c') + rows.indexOf(row), { width: 1600, height: extra.sil ? 380 : 440, season: 'summer', era: 3, seconds: .3, cam: { pos: [0, 2.3, 12.6], target: [0, 1.2, 0], fov: 31 }, people: ppl, sil: !!extra.sil, shadows: !extra.sil });
    parts.push({ label: row.join('   |   ') + (extra.sil ? '   (silhouette only)' : ''), img: r.out });
  }
  await stack(file, parts); void per;
}
/** Items v2: the real rig carrying the era's weapons for a society, flint to steel. */
async function handsSheet() {
  const skins = (process.env.HANDS_SKINS || 'civ:skoldar,civ:hanrei,civ:kaaltun').split(','), parts = [];
  for (const skin of skins.filter(k => ALL.includes(k))) for (const era of [0, 2, 4]) {
    const shield = (kind) => ({ shield: { kind, condition: .9 }, garment: { item: 'lightClothes', condition: .95 } });
    const row = [['spearman', {}, {}], ['archer', {}, {}], ['swordsman', {}, {}], ['warden', {}, {}], ['spearman', {}, shield(era < 2 ? 'hideShield' : era < 4 ? 'bronzeShield' : 'woodShield')], ['worker', { role: 'priest' }, {}], ['leader', { cls: 'leader' }, {}]];
    const people = row.map(([t, o, g], i) => P(skin, t, (i - 3) * 1.55, 0, { ...o, id: 70 + i * 11 + era, facing: .7 }, 'summer', g));
    const r = await shoot(`hands-${skin}-${era}`, { width: 1500, height: 440, season: 'summer', era, seconds: .6, cam: { pos: [0, 1.7, 7.4], target: [0, 1.1, 0], fov: 32 }, people });
    parts.push({ label: `${skin} era ${era}: spearman, archer, swordsman, warden (axe), shield-bearer, priest (staff), leader (standard)`, img: r.out });
    stats[`${skin}-${era}`] = { close: r.info, rts: r.info };
  }
  await stack(path.join(outDir, 'hands.png'), parts);
}
async function toolsSheet() {
  const skins = (process.env.HANDS_SKINS || 'civ:skoldar,civ:hanrei').split(','), parts = [];
  for (const skin of skins.filter(k => ALL.includes(k))) for (const era of [0, 2, 4]) for (const [dist, cam] of [['game', { pos: [0, 1.7, 7.4], target: [0, 1.0, 0], fov: 32 }], ['rts', { pos: [0, 9, 14], target: [0, .8, 0], fov: 34 }]]) {
    const row = [['worker', { order: 'gather', node: { kind: 'tree' } }], ['worker', { order: 'gather', node: { kind: 'rock' } }], ['worker', { order: 'gather', node: { kind: 'fish' } }], ['worker', { role: 'farmer', order: 'gather', node: { kind: 'farm' } }], ['worker', { role: 'smith', recipe: 'smeltCopper' }], ['worker', { role: 'builder', recipe: 'buildHut' }]];
    const people = row.map(([t, o], i) => P(skin, t, (i - 2.5) * 1.5, 0, { ...o, id: 90 + i * 17 + era, facing: .7 }, 'summer', {}));
    const r = await shoot(`tools-${skin}-${era}-${dist}`, { width: 1500, height: dist === 'game' ? 440 : 360, season: 'summer', era, seconds: .7, cam, people });
    parts.push({ label: `${skin} era ${era} ${dist}: woodcutter, quarrier, angler, farmer, smith, builder (tool in hand)`, img: r.out });
    stats[`tools-${skin}-${era}-${dist}`] = { close: r.info, rts: r.info };
  }
  await stack(path.join(outDir, 'tools.png'), parts);
}
// near-detail sheet: 3 civs x 4 roles at close range (faces, hands, feet, cloth); run once with --near-off for the before image
async function nearSheet() {
  const civs = (process.env.NEAR_CIVS || 'civ:skoldar,civ:hanrei,civ:aureline').split(',').filter(k => ALL.includes(k));
  for (const skin of civs) {
    const people = [['worker', {}], ['worker', { role: 'farmer' }], ['spearman', {}], ['leader', { cls: 'leader' }]].map(([t, o], i) => P(skin, t, (i - 1.5) * 1.1, 0, { ...o, id: 410 + i * 13, facing: .35 }, 'summer', t === 'spearman' ? {} : {}));
    const r = await shoot(`near-${skin.replace(':', '-')}-${nearOff ? 'before' : 'after'}`, { width: 1500, height: 760, season: 'summer', era: 3, seconds: .5, cam: { pos: [0.4, 1.35, 4.3], target: [0, 1.0, 0], fov: 30 }, people }, outDir);
    stats['near-' + skin] = r.info;
  }
}
const want = pos.length ? pos : ['all'];
if (want[0] === 'civ') for (const s of want.slice(1)) await civSheet(s);
else {
  const all = want.includes('all');
  if (all || want.includes('civs')) for (const s of ALL) await civSheet(s);
  if (want.includes('near')) await nearSheet();
  if (want.includes('hands')) await handsSheet();
  if (want.includes('tools')) await toolsSheet();
  if (all || want.includes('roles')) await rolesSheet();
  if (all || want.includes('armor')) await armorSheet();
  if (want.includes('wear')) await wear();
  if (all || want.includes('overview')) await lineup(path.join(outDir, 'overview.png'), ALL);
  if (all || want.includes('silhouettes')) await lineup(path.join(outDir, 'silhouettes.png'), ALL, { sil: true });
}
fs.writeFileSync(path.join(outDir, 'stats.json'), JSON.stringify(stats, null, 1));
await browser.close();
console.log('done', outDir, Object.keys(stats).length ? JSON.stringify(Object.fromEntries(Object.entries(stats).map(([k, v]) => [k, { close: v.close.triangles, rts: v.rts.triangles, rtsDraws: v.rts.draws, cpu: v.rts.cpuMsPerFrame }])) ) : '');
