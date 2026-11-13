// ITEM catalogue sheets: real three.js + real src/scene/itemModels.ts generators, SwiftShader, no network.
//   node tools/render-preview/items.mjs [<category>... | all | civs | wear | lod] [--out=DIR] [--skin=civ:skoldar] [--ids=spear,bow] [--only-era=2]
// Output default: docs/renders/items/. Needs esbuild + playwright + sharp (repo node_modules, NODE_PATH, /opt/npm-tools) and three (THREE_DIR or node_modules).
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
  const c = [process.env.THREE_DIR, path.join(root, 'node_modules/three'), '/mnt/user-data/uploads/hearthwild.nosync/node_modules/three'].filter(Boolean);
  const hit = c.find(p => fs.existsSync(path.join(p, 'build/three.module.js')));
  if (!hit) throw new Error('three not found; set THREE_DIR');
  return hit;
};
const args = process.argv.slice(2), opt = (k, d) => (args.find(a => a.startsWith('--' + k + '=')) || '').slice(k.length + 3) || d;
const outDir = path.resolve(opt('out', path.join(root, 'docs/renders/items'))), skin = opt('skin', 'civ:skoldar'), idsOpt = opt('ids', ''), onlyEra = opt('only-era', '');
const pos = args.filter(a => !a.startsWith('--'));
fs.mkdirSync(outDir, { recursive: true });
const esbuild = need('esbuild'), { chromium } = need('playwright'), sharp = need('sharp');
const three = findThree(), tmp = path.join(outDir, '.tmp'); fs.mkdirSync(tmp, { recursive: true });
const bundle = path.join(tmp, 'items-bundle.js');
await esbuild.build({ entryPoints: [path.join(here, 'items-entry.ts')], bundle: true, format: 'iife', outfile: bundle, absWorkingDir: root, tsconfig: path.join(root, 'tsconfig.json'), logLevel: 'error',
  alias: fs.existsSync(path.join(three, 'examples/jsm')) ? { three: path.join(three, 'build/three.module.js'), 'three/addons': path.join(three, 'examples/jsm') } : { three: path.join(three, 'build/three.module.js') } });
const html = path.join(tmp, 'items.html');
fs.writeFileSync(html, '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#222"><script src="' + pathToFileURL(bundle).href + '"></script>');
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const probe = await browser.newPage(); await probe.goto(pathToFileURL(html).href);
const DEFS = await probe.evaluate(() => window.itemDefs()); const SKINS = await probe.evaluate(() => window.skinIds()); await probe.close();
const ERAS = ['0 flint and bone', '1 copper', '2 bronze', '3 iron', '4 steel'];
async function shoot(name, spec) {
  const page = await browser.newPage({ viewport: { width: spec.width, height: spec.height } });
  page.on('console', m => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', e => console.error('[pageerror]', e.message));
  await page.goto(pathToFileURL(html).href);
  const info = await page.evaluate(s => window.renderItems(s), spec);
  const out = path.join(tmp, name + '.png'); await page.locator('canvas').screenshot({ path: out }); await page.close(); return { out, info };
}
const svg = (t, W, h, size = 16, fill = '#eee', bg = '#1b1b1b', anchor = 'start') => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${h}"><rect width="100%" height="100%" fill="${bg}"/><text x="${anchor === 'middle' ? W / 2 : 8}" y="${h / 2 + size / 3}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" fill="${fill}">${t.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text></svg>`);
const tiltOf = (d, tall) => (d.frame === 'hand' && tall ? -52 : 0);
const stats = {};
/** rows = items, columns = eras (or a list of reqs per row) */
async function sheet(file, title, rows, o = {}) {
  const cols = o.cols ?? 5, tw = o.tw ?? 260, th = o.th ?? 300, labW = 120, headH = 26, titleH = 34;
  const tiles = rows.flatMap(r => r.reqs.map(q => ({ req: q.req, tiltDeg: q.tilt ?? r.tilt ?? 0, az: q.az ?? o.az, el: q.el ?? o.el, ground: r.ground, zoom: q.zoom ?? r.zoom ?? o.zoom, focus: q.focus ?? r.focus, fr: q.fr ?? r.fr })));
  const nr = rows.length, spec = { width: tw * cols, height: th * nr, cols, tiles, bg: o.bg };
  const r = await shoot(path.basename(file, '.png'), spec);
  const comp = [{ input: svg(title, tw * cols + labW, titleH, 17, '#fff'), top: 0, left: 0 }];
  (o.heads ?? ERAS).forEach((h, i) => comp.push({ input: svg(h, tw, headH, 13, '#ddd', '#262626', 'middle'), top: titleH, left: labW + i * tw }));
  rows.forEach((row, i) => comp.push({ input: svg(row.label, labW, th, 13, '#ddd', '#262626'), top: titleH + headH + i * th, left: 0 }));
  comp.push({ input: r.out, top: titleH + headH, left: labW });
  await sharp({ create: { width: tw * cols + labW, height: th * nr + titleH + headH, channels: 3, background: '#1b1b1b' } }).composite(comp).png({ compressionLevel: 9 }).toFile(file);
  for (const s of r.info.stats) (stats[s.id] ||= []).push({ era: s.era, tris: s.tris, buildMs: s.buildMs, size: s.size });
  return r.info;
}
const R = (id, era, extra = {}) => ({ req: { id, era, skin, condition: .92, seed: 7, lod: 0, ...extra } });
const eraRow = (d, extra = {}) => ({ label: d.name, ground: d.frame === 'world', reqs: [0, 1, 2, 3, 4].filter(e => onlyEra === '' || +onlyEra === e).map(e => R(d.id, e, extra)), tilt: tiltOf(d, true) });
const want = d => !idsOpt || idsOpt.split(',').includes(d.id);
async function category(cat) {
  const ds = DEFS.filter(d => (cat === 'weapons' ? ['melee', 'ranged', 'shield', 'siege'].includes(d.category) : d.category === cat) && want(d));
  if (!ds.length) return;
  const world = ds.every(d => d.frame === 'world');
  const per = world ? 2 : 4, chunks = [];
  for (let i = 0; i < ds.length; i += per) chunks.push(ds.slice(i, i + per));
  let n = 0;
  for (const ch of chunks) {
    const rows = ch.map(d => eraRow(d)), big = world || ch.some(d => ['pike', 'spear', 'bow', 'warBow', 'javelin'].includes(d.id));
    await sheet(path.join(outDir, `cat-${cat}${chunks.length > 1 ? '-' + (++n) : ''}.png`), `${cat}: ${ch.map(d => d.name).join(', ')} - by era (${skin})`, rows, { tw: world ? 340 : 280, th: world ? 280 : big ? 330 : 260, cols: onlyEra === '' ? 5 : 1, heads: onlyEra === '' ? ERAS : [ERAS[+onlyEra]] });
  }
}
async function wear() {
  const ids = (idsOpt ? idsOpt.split(',') : ['spear', 'bladeSword', 'handAxe', 'bow', 'shield', 'club']).filter(i => DEFS.some(d => d.id === i));
  const rows = ids.map(id => { const d = DEFS.find(x => x.id === id); return { label: d.name, tilt: tiltOf(d, true), ground: d.frame === 'world', reqs: [[1, 0], [.65, 0], [.3, 0], [.1, 0], [.5, 1]].map(([cnd, br]) => R(id, 2, { condition: cnd, variant: br ? 'broken' : id === 'shield' ? undefined : undefined })) }; });
  await sheet(path.join(outDir, 'wear.png'), 'Condition at the bronze age: new, used, worn, ruined, broken', rows, { heads: ['new', 'used', 'worn', 'ruined', 'broken'], tw: 260, th: 300 });
}
async function civs() {
  const sk = (idsOpt ? [] : ['civ:aureline', 'civ:hanrei', 'civ:steppan', 'civ:sandrill', 'civ:kaaltun', 'civ:mekhari', 'civ:skoldar', 'civ:nilemark', 'civ:tigrane', 'civ:rusvolt']).filter(s => SKINS.includes(s));
  for (const [id, era] of [['spear', 3], ['bladeSword', 3], ['shield', 3], ['handAxe', 3]]) {
    const d = DEFS.find(x => x.id === id);
    await sheet(path.join(outDir, `civs-${id}.png`), `${d.name} by civilization, iron age`, [{ label: d.name, tilt: tiltOf(d, true), reqs: sk.slice(0, 5).map(s => R(id, era, { skin: s })) }, { label: '', tilt: tiltOf(d, true), reqs: sk.slice(5, 10).map(s => R(id, era, { skin: s })) }], { heads: sk.slice(0, 5), tw: 260, th: 320 });
  }
}
const DETAIL = { spear: [[0, 1.45, 0], .3], javelin: [[0, .98, 0], .24], pike: [[0, 2.62, 0], .3], club: [[0, .48, 0], .2], handAxe: [[0, .5, .07], .22], bladeSword: [[0, .3, 0], .5], warPick: [[0, .5, .08], .24], dagger: [[0, .08, 0], .24],
  shield: [[-.12, .1, .12], .5], bow: [[0, 0, .05], .36], warBow: [[0, 0, .05], .36], crossbow: [[0, .1, 0], .55], sling: [[0, .5, 0], .3], atlatl: [[0, .2, 0], .38], quiver: [[0, -.15, 0], .45], arrow: [[0, .4, 0], .12] };
async function detail() {
  const ids = (idsOpt ? idsOpt.split(',') : Object.keys(DETAIL)).filter(i => DEFS.some(d => d.id === i));
  const eras = onlyEra === '' ? [0, 2, 4] : [+onlyEra];
  for (let i = 0; i < ids.length; i += 2) {
    const ch = ids.slice(i, i + 2), rows = ch.map(id => { const d = DEFS.find(x => x.id === id), f = DETAIL[id]; return { label: d.name, tilt: ['spear', 'javelin', 'pike', 'club', 'handAxe', 'warPick', 'arrow'].includes(id) ? 0 : 0, reqs: eras.map(e => R(id, e, { })).map(q => ({ ...q, focus: f?.[0], fr: f?.[1] })) }; });
    await sheet(path.join(outDir, `det-${ch.join('-')}.png`), `detail: ${ch.join(', ')} (${skin})`, rows, { cols: eras.length, heads: eras.map(e => ERAS[e]), tw: 520, th: 460, el: 12, az: 30 });
  }
}
/** the item tier a ground item showed at the default camera under the old thresholds (mid, lod 1) next to the near tier it now shows (lod 0): same items, era 2 */
async function lodPair() {
  const ids = (idsOpt ? idsOpt.split(',') : ['spear', 'bow', 'handAxe', 'shield', 'pot', 'hoe']).filter(i => DEFS.some(d => d.id === i));
  const rows = ids.map(id => { const d = DEFS.find(x => x.id === id); return { label: d.name, tilt: tiltOf(d, true), ground: d.frame === 'world', reqs: [R(id, 2, { lod: 2 }), R(id, 2, { lod: 1 }), R(id, 2, { lod: 0 })] }; });
  const info = await sheet(path.join(outDir, 'lod-tiers.png'), 'Item tiers, bronze age: far (lod 2) | mid (lod 1, shown at the default zoom before) | near (lod 0, shown now)', rows, { heads: ['far', 'mid (before, default zoom)', 'near (after)'], cols: 3, tw: 300, th: 280 });
  console.log(JSON.stringify(Object.fromEntries(ids.map(i => [i, (stats[i] || []).map(s => s.tris)]))));
  return info;
}
const targets = pos.length ? pos : ['all'];
for (const t of targets) {
  if (t === 'wear') await wear();
  else if (t === 'detail') await detail();
  else if (t === 'civs') await civs();
  else if (t === 'lod') await lodPair();
  else if (t === 'all') { for (const c of ['weapons', 'farm', 'craft', 'hunt', 'fish', 'carry', 'ship', 'light']) await category(c); await wear(); await civs(); }
  else await category(t);
}
fs.writeFileSync(path.join(outDir, 'stats.json'), JSON.stringify(stats, null, 1));
await browser.close();
console.log('done', outDir);
