#!/usr/bin/env node
// Cuts the labelled evidence crops for docs/FIRST_PERSON_DESIGN.md out of the real frames (PNG in, PNG out, 2x Lanczos).
//   NODE_PATH=/opt/npm-tools/node_modules node tools/render-preview/fp-crops.mjs [dir=docs/renders/firstperson-real]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const need = (name) => { for (const b of [process.env.NODE_PATH, '/opt/npm-tools/node_modules', '/opt/npm-tools'].filter(Boolean)) { try { return createRequire(path.join(b, 'noop.js'))(name); } catch { } } throw new Error(name + ' not found'); };
const sharp = need('sharp'), dir = path.resolve(process.argv[2] || 'docs/renders/firstperson-real'), out = path.join(dir, 'findings');
fs.mkdirSync(out, { recursive: true });
// [output, source frame, left, top, width, height]
const crops = [
  ['f1a-terrain-facets-right-bank.png', 'd-river-world.png', 1000, 470, 440, 340],
  ['f1b-terrain-streaks-left-slope.png', 'd-river-world.png', 0, 330, 520, 480],
  ['f2a-near-lod-visitor-at-3m.png', 'c-hall-door-world.png', 780, 60, 400, 640],
  ['f2b-near-lod-steward-walk-pose.png', 'a-street-world.png', 500, 260, 300, 400],
  ['f3a-hall-door-flat-slab.png', 'c-hall-door-world.png', 330, 60, 480, 520],
  ['f3b-hut-door-painted-on.png', 'a-street-world.png', 250, 250, 180, 200],
];
for (const [o, src, left, top, width, height] of crops) {
  await sharp(path.join(dir, src)).extract({ left, top, width, height }).resize(width * 2, height * 2, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toFile(path.join(out, o));
  console.log(o);
}
// 2x2 shadow sheet: default (off), 512 map +-110 m, 1024 map +-110 m, 1024 map +-40 m
const names = ['f4a-shadows-default-off.png', 'f4b-shadows-med-110.png', 'f4c-shadows-high-110.png', 'f4d-shadows-high-40.png'], w = 720, h = 405;
await sharp({ create: { width: w * 2, height: h * 2, channels: 3, background: '#111' } }).composite(await Promise.all(names.map(async (n, i) => ({ input: await sharp(path.join(out, n)).resize(w, h).png().toBuffer(), left: (i % 2) * w, top: Math.floor(i / 2) * h }))))
  .png({ compressionLevel: 9 }).toFile(path.join(out, 'f4-shadows-sheet.png'));
console.log('f4-shadows-sheet.png');
