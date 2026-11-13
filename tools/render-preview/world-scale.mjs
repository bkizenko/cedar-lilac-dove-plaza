// World-scale chunk-grid debug image: a real generated world stretched by SCALE, tiled by the LOD-ring chunk selection, hillshaded, geology-tinted,
// chunk borders coloured by LOD. Pure Node (own PNG encoder), no browser needed.
//   node --import ./scripts/game-loader.mjs tools/render-preview/world-scale.mjs [--scale=10] [--seed=3] [--px=1600] [--out=docs/renders/world-scale] [--fx=0] [--fz=0]
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { generateWorld } from '../../src/game/worldgen.ts';
import { ChunkTerrain, selectChunks, selectionBudget, sourceFromWorld, chunkSpan } from '../../src/game/terrainChunks.ts';

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith(`--${k}=`)); return a ? a.slice(k.length + 3) : d; };
const scale = Number(arg('scale', 10)), seed = Number(arg('seed', 3)), px = Number(arg('px', 1600)), out = arg('out', 'docs/renders/world-scale'), fx = Number(arg('fx', 0)), fz = Number(arg('fz', 0));
fs.mkdirSync(out, { recursive: true });

const world = generateWorld(seed, 21, { size: 1040, preset: 'river-valley', geologyVersion: 1 });
const src = sourceFromWorld(world, { seed, scale }), t = new ChunkTerrain(src), extent = src.extent, half = extent / 2;
const refs = selectChunks(fx, fz, extent), chunks = t.setWorkingSet(refs), budget = selectionBudget(refs);

const img = new Uint8Array(px * px * 3), mpp = extent / px, sea = world.waterY;
const LOD_COL = [[230, 60, 50], [240, 150, 30], [230, 210, 40], [60, 170, 80], [50, 130, 220], [140, 80, 200]];
const rockHue = id => { const h = (id * 67) % 360, a = h / 60, f = a - Math.floor(a), q = 1 - f, c = [[1, f, 0], [q, 1, 0], [0, 1, f], [0, q, 1], [f, 0, 1], [1, 0, q]][Math.floor(a) % 6]; return c.map(v => 0.45 + 0.5 * v); };
const set = (x, z, c) => { if (x < 0 || z < 0 || x >= px || z >= px) return; const i = (z * px + x) * 3; img[i] = c[0]; img[i + 1] = c[1]; img[i + 2] = c[2]; };
for (const c of chunks) {
  const n = c.n, H = (ix, iz) => c.heights[Math.min(n - 1, Math.max(0, iz)) * n + Math.min(n - 1, Math.max(0, ix))];
  const x0 = Math.max(0, Math.floor((c.x0 + half) / mpp)), x1 = Math.min(px - 1, Math.ceil((c.x0 + c.span + half) / mpp)), z0 = Math.max(0, Math.floor((c.z0 + half) / mpp)), z1 = Math.min(px - 1, Math.ceil((c.z0 + c.span + half) / mpp));
  for (let pz = z0; pz <= z1; pz++) for (let pxl = x0; pxl <= x1; pxl++) {
    const wx = pxl * mpp - half, wz = pz * mpp - half; if (wx < c.x0 || wx >= c.x0 + c.span || wz < c.z0 || wz >= c.z0 + c.span) continue;
    const gx = (wx - c.x0) / c.spacing, gz = (wz - c.z0) / c.spacing, ix = Math.min(n - 1, Math.round(gx)), iz = Math.min(n - 1, Math.round(gz)), h = H(ix, iz);
    const dx = (H(ix + 1, iz) - H(ix - 1, iz)) / (2 * c.spacing), dz = (H(ix, iz + 1) - H(ix, iz - 1)) / (2 * c.spacing);
    const shade = Math.max(0.55, Math.min(1.35, 0.95 + (-dx * 0.7 - dz * 0.7) * 6));
    let col;
    if (h <= sea + 0.05) { const d = Math.min(1, (sea - h) / 40); col = [60 - 30 * d, 130 - 50 * d, 200 - 40 * d]; }
    else { const e = Math.min(1, (h - sea) / 90); col = [90 + 140 * e, 150 + 40 * e - 30 * e * e, 70 + 130 * e * e]; if (c.geology) { const r = rockHue(c.geology.rock[iz * n + ix]); col = col.map((v, k) => v * 0.62 + r[k] * 255 * 0.38 * 0.8); } col = col.map(v => v * shade); }
    set(pxl, pz, col.map(v => Math.max(0, Math.min(255, Math.round(v)))));
  }
}
for (const c of chunks) { // borders
  const col = LOD_COL[c.lod % LOD_COL.length], a = Math.round((c.x0 + half) / mpp), b = Math.round((c.x0 + c.span + half) / mpp), d = Math.round((c.z0 + half) / mpp), e = Math.round((c.z0 + c.span + half) / mpp), w = c.lod >= 2 ? 2 : 1;
  for (let k = 0; k < w; k++) { for (let x = a; x <= b; x++) { set(x, d + k, col); set(x, e - k, col); } for (let z = d; z <= e; z++) { set(a + k, z, col); set(b - k, z, col); } }
}
const fxp = Math.round((fx + half) / mpp), fzp = Math.round((fz + half) / mpp);
for (let k = -12; k <= 12; k++) { set(fxp + k, fzp, [255, 255, 255]); set(fxp, fzp + k, [255, 255, 255]); }
// legend: LOD swatches
for (let l = 0; l <= 4; l++) for (let y = 0; y < 14; y++) for (let x = 0; x < 40; x++) set(14 + x, 14 + l * 20 + y, LOD_COL[l]);

function png(w, h, rgb) {
  const crcT = new Uint32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xffffffff; for (const v of b) c = crcT[(c ^ v) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]), c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; Buffer.from(rgb.buffer, y * w * 3, w * 3).copy(raw, y * (w * 3 + 1) + 1); }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const file = path.join(out, `chunk-grid-${scale}x-seed${seed}.png`);
fs.writeFileSync(file, png(px, px, img));
let sum = 0; for (const v of img) sum += v;
console.log(JSON.stringify({ file, extentMetres: extent, chunks: budget.chunks, perLod: budget.perLod, dataMB: +(budget.bytes / 1048576).toFixed(2), meanBrightness: +(sum / img.length).toFixed(1), spanLod0: chunkSpan(0) }));
