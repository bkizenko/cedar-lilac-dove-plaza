// Top-down PNG preview of generated v20 maps (hillshade + biomes + water + starts).
// usage: node --import ./scripts/game-loader.mjs scripts/mapgen-preview.mjs <preset|random> <seed> [size=1560] [outDir=docs/renders/mapgen] [mode=biome|height]
import { generateWorld, sampleHeight, waterSurfaceAt } from '../src/game/worldgen.ts';
import { writePng } from './lib/png.mjs';
import fs from 'node:fs';
const [preset = 'pangaea', seedArg = '1', sizeArg = '1560', outDir = 'docs/renders/mapgen', mode = 'biome'] = process.argv.slice(2);
const seed = Number(seedArg) | 0, size = Number(sizeArg);
const request = { size, ...(preset === 'random' ? {} : { preset }) };
const t0 = Date.now();
const w = generateWorld(seed, 20, request);
const dt = Date.now() - t0;
fs.mkdirSync(outDir, { recursive: true });
// ZOOM=cx,cz,span (metres) renders a close-up window instead of the whole map
const zoom = (process.env.ZOOM || '').split(',').map(Number), span = zoom.length === 3 && zoom.every(Number.isFinite) ? zoom[2] : size, zcx = span !== size ? zoom[0] : 0, zcz = span !== size ? zoom[1] : 0;
const px = 3, W = Math.round(size / 1040 * 256) * 2, S = W * px;
const rgb = new Uint8Array(S * S * 3);
const PAL = { meadow: [150, 178, 92], 'mixed-woodland': [74, 128, 70], 'conifer-forest': [48, 96, 80], alpine: [150, 146, 140], wetland: [96, 150, 120], 'dry-scrub': [190, 168, 104], arid: [214, 188, 128], 'warm-coast': [102, 156, 84] };
const KINDS = ['meadow', 'mixed-woodland', 'conifer-forest', 'alpine', 'wetland', 'dry-scrub', 'arid', 'warm-coast'];
const eco = w.ecology;
const H = (x, z) => sampleHeight(w.heights, x, z, size);
for (let zi = 0; zi < S; zi++) for (let xi = 0; xi < S; xi++) {
  const x = zcx + (xi / S - 0.5) * span, z = zcz + (zi / S - 0.5) * span, h = H(x, z), e = 1.5;
  const sx = (H(x + e, z) - H(x - e, z)) / (2 * e), sz = (H(x, z + e) - H(x, z - e)) / (2 * e);
  let nx = -sx * 2.4, ny = 1, nz = -sz * 2.4; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
  const shade = 0.42 + 0.7 * Math.max(0, nx * -0.55 + ny * 0.7 + nz * -0.45);
  const o = (zi * S + xi) * 3;
  const wet = w.waterHeights ? 0 : 0;
  void wet;
  let r, g, b;
  const gi = Math.floor((z / size + 0.5) * eco.width) * eco.width + Math.floor((x / size + 0.5) * eco.width);
  const lvl = waterSurfaceAt(w, x, z);
  const water = h < lvl + 0.02;
  if (water) {
    const sea = h < w.waterY + 0.02 && lvl <= w.waterY + 0.001;
    const d = Math.min(1, (lvl - h) / (sea ? 10 : 3));
    r = (sea ? 52 : 70) - 28 * d; g = (sea ? 118 : 138) - 40 * d; b = (sea ? 168 : 190) - 30 * d;
    r *= 0.85 + 0.2 * shade; g *= 0.85 + 0.2 * shade; b *= 0.85 + 0.2 * shade;
  } else if (mode === 'height') {
    const t = Math.min(1, (h - w.waterY) / 100); r = (90 + 150 * t) * shade; g = (150 - 20 * t + 60 * t * t) * shade; b = (80 + 120 * t * t) * shade;
  } else {
    // bilinear blend of the four nearest province cells, as the in-game surface does
    const gx = Math.max(0, Math.min(eco.width - 1.001, (x / size + 0.5) * eco.width - 0.5)), gz = Math.max(0, Math.min(eco.width - 1.001, (z / size + 0.5) * eco.width - 0.5)), ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
    const c = [0, 0, 0];
    for (const [ox, oz, wt] of [[0, 0, (1 - fx) * (1 - fz)], [1, 0, fx * (1 - fz)], [0, 1, (1 - fx) * fz], [1, 1, fx * fz]]) { const k = PAL[KINDS[eco.kinds[(iz + oz) * eco.width + ix + ox]]] || [150, 150, 150]; c[0] += k[0] * wt; c[1] += k[1] * wt; c[2] += k[2] * wt; }
    void gi;
    r = c[0] * shade * 1.05; g = c[1] * shade * 1.05; b = c[2] * shade * 1.05;
  }
  rgb[o] = Math.min(255, r); rgb[o + 1] = Math.min(255, g); rgb[o + 2] = Math.min(255, b);
}
const dot = (x, z, rad, col) => { const cx = ((x - zcx) / span + 0.5) * S, cz = ((z - zcz) / span + 0.5) * S; for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) { if (dx * dx + dz * dz > rad * rad) continue; const X = Math.round(cx + dx), Z = Math.round(cz + dz); if (X < 0 || Z < 0 || X >= S || Z >= S) continue; const o = (Z * S + X) * 3; rgb[o] = col[0]; rgb[o + 1] = col[1]; rgb[o + 2] = col[2]; } };
const T = { 0: [255, 255, 255], 1: [220, 40, 40], 2: [240, 180, 30], 4: [160, 60, 200], 5: [40, 200, 200] };
for (const f of w.copper) dot(f.x, f.z, 1, [200, 100, 40]);
for (const f of w.iron) dot(f.x, f.z, 1, [60, 60, 70]);
for (const c of w.camps) { dot(c.x, c.z, 9, [0, 0, 0]); dot(c.x, c.z, 7, T[c.team] || [255, 255, 255]); }
const name = `${w.options.preset}_${seed}_${size}${mode === 'height' ? '_h' : ''}.png`;
writePng(`${outDir}/${name}`, S, S, rgb);
console.log(JSON.stringify({ name, ms: dt, land: +w.mapgen.landFraction.toFixed(3), rivers: w.mapgen.rivers, lakes: w.mapgen.lakes, trees: w.trees.length, stones: w.stones.length, forage: w.forage.length, fish: w.fish.length, copper: w.copper.length, iron: w.iron.length, camps: w.camps.length, starts: w.mapgen.starts.map(s => `${s.team}:${s.character}:${s.quality.toFixed(2)}`).join(' '), fairness: w.mapgen.fairness }));
