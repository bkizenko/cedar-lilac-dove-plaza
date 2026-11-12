#!/usr/bin/env node
// Board-vs-render comparison sheet with measured wood-tone numbers.
//   node tools/render-preview/compare.mjs [tuned.png] [adapter.png] [out.png]
// Defaults: docs/art-reference/h-renders/b-village.png, b-village-adapter-rig.png
// -> docs/art-reference/h-renders/g-compare-board-vs-render.png. Prints the stats.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { woodStats, fmt, BOARD_H, BOARD_H_UI, requireSharp } from './measure.mjs';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../..'), R = path.join(root, 'docs/art-reference/h-renders');
const [tuned = path.join(R, 'b-village.png'), adapter = path.join(R, 'b-village-adapter-rig.png'), out = path.join(R, 'g-compare-board-vs-render.png')] = process.argv.slice(2);
const board = path.join(root, 'docs/art-reference/style-options-D-I.png'), sharp = requireSharp();

const sb = await woodStats(board, { region: BOARD_H, exclude: BOARD_H_UI }), st = await woodStats(tuned), sa = fs.existsSync(adapter) ? await woodStats(adapter) : null;
const d = (s, k) => (s[k] - sb[k]) >= 0 ? '+' + (s[k] - sb[k]).toFixed(k === 'hue' ? 1 : 3) : (s[k] - sb[k]).toFixed(k === 'hue' ? 1 : 3);
console.log('board H        ', fmt(sb)); console.log('render (tuned) ', fmt(st)); if (sa) console.log('render (adapter)', fmt(sa));

const W = 1600, H = 1000, esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const boardCrop = await sharp(board).extract(BOARD_H).resize(600, 600).png().toBuffer();
const tunedImg = await sharp(tuned).resize(940, 588).png().toBuffer();
const adapterImg = sa ? await sharp(adapter).resize(470, 294).png().toBuffer() : null;
const sw = (x, y, hex, label) => `<rect x="${x}" y="${y}" width="28" height="18" fill="${hex}" stroke="#3a2412"/><text x="${x + 36}" y="${y + 14}" class="s">${esc(label)}</text>`;
const row = (y, name, s, delta) => `<text x="1130" y="${y}" class="b">${esc(name)}</text>
 <text x="1130" y="${y + 20}" class="s">hue ${s.hue.toFixed(1)}°  sat ${s.sat.toFixed(3)}  val ${s.val.toFixed(3)}${delta ? `   (Δ ${d(s, 'hue')}° / ${d(s, 'sat')} / ${d(s, 'val')})` : ''}</text>
 <text x="1130" y="${y + 38}" class="s">p10/50/90 val ${s.valQ.map(v => v.toFixed(2)).join('/')} · sat ${s.satQ.map(v => v.toFixed(2)).join('/')}</text>`;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
<style>.t{font:700 26px 'DejaVu Sans',sans-serif;fill:#3a2412}.b{font:700 16px 'DejaVu Sans',sans-serif;fill:#3a2412}.s{font:14px 'DejaVu Sans',sans-serif;fill:#3a2412}</style>
<text x="20" y="44" class="t">Board H vs preview render: wood-tone numbers (same pixel mask: hue 12–48°, sat ≥ .28, val ≥ .22)</text>
<text x="20" y="72" class="s">Left: original board panel H (crop, UI excluded from stats). Right: village render from real generator meshes, tuned preview rig. Below right: same scene with CARVED_LIGHT_RIG as-is.</text>
<text x="20" y="712" class="b">Original board, panel H</text>
<text x="650" y="700" class="b">Preview (tuned rig) — stand-in WebGL2, not in-game</text>
<text x="1130" y="960" class="b">Thumbnail: adapter rig as-is</text>
${row(730, 'Board H', sb, false)}
${row(800, 'Render, tuned rig', st, true)}
${sa ? row(870, 'Render, adapter rig', sa, true) : ''}
${sw(20, 730, sb.meanHex, 'board mean ' + sb.meanHex)}${sw(20, 756, st.meanHex, 'tuned mean ' + st.meanHex)}${sa ? sw(20, 782, sa.meanHex, 'adapter mean ' + sa.meanHex) : ''}
<text x="20" y="830" class="s">Reading: hue is within ~2° of the board in both renders.</text>
<text x="20" y="849" class="s">The adapter rig is ~0.22 more saturated and ~0.06 darker</text>
<text x="20" y="868" class="s">than the board: it reads brown-orange. The board is light</text>
<text x="20" y="887" class="s">honey with bright tops. The tuned rig lands within a few</text>
<text x="20" y="906" class="s">hundredths on sat/val. Its distribution is narrower (less deep</text>
<text x="20" y="925" class="s">shadow, less pale inlay); the board also has stronger grain.</text>
<text x="20" y="944" class="s">Pixel statistics of a stand-in renderer, not of the game.</text>
</svg>`;
const comps = [{ input: Buffer.from(svg), left: 0, top: 0 }, { input: boardCrop, left: 20, top: 90 }, { input: tunedImg, left: 640, top: 90 }];
if (adapterImg) comps.push({ input: adapterImg, left: 650, top: 690 + 20 + 0 });
// keep the adapter thumbnail from overlapping the stats column
comps[comps.length - 1].left = 650; if (adapterImg) comps[comps.length - 1].top = 706;
await sharp({ create: { width: W, height: H, channels: 3, background: '#ecd2a8' } }).composite(comps).png({ compressionLevel: 9, palette: true, quality: 95, colours: 256, dither: .6 }).toFile(out);
console.log('wrote', out);
