// Top-down and ground-level PNG previews of generated v21 maps (hillshade + biomes/rock + water + starts).
// usage: node --import ./scripts/game-loader.mjs scripts/mapgen-preview.mjs <preset|random> <seed> [size=1560] [outDir=docs/renders/mapgen] [mode=biome|height|geology|rock]
// env:   GEO=0        skip the geology layer (pre-geology v21 terrain)
//        V=20         frozen published v20 generator instead of v21
//        ZOOM=cx,cz,span   top-down close-up window in metres instead of the whole map
//        VIEW=x,z,yawDeg,pitchDeg,fovDeg,eyeHeight[,name]   perspective ground-level view (heights, water, rock/biome colour, trees)
//        PX=3        pixels per working cell for the top-down image
import { generateWorld, sampleHeight, waterSurfaceAt } from '../src/game/worldgen.ts';
import { ROCKS, LANDFORMS } from '../src/game/mapgen/geology/rocks.ts';
import { writePng } from './lib/png.mjs';
import fs from 'node:fs';
const [preset = 'pangaea', seedArg = '1', sizeArg = '1560', outDir = 'docs/renders/mapgen', mode = 'biome'] = process.argv.slice(2);
const seed = Number(seedArg) | 0, size = Number(sizeArg), version = Number(process.env.V || 21);
const request = { size, ...(preset === 'random' ? {} : { preset }), ...(version >= 21 && process.env.GEO !== '0' ? { geologyVersion: 1 } : {}) };
const t0 = Date.now();
const w = generateWorld(seed, version, request);
const dt = Date.now() - t0;
fs.mkdirSync(outDir, { recursive: true });
const geo = w.mapgen.geology;
const PAL = { meadow: [150, 178, 92], 'mixed-woodland': [74, 128, 70], 'conifer-forest': [48, 96, 80], alpine: [150, 146, 140], wetland: [96, 150, 120], 'dry-scrub': [190, 168, 104], arid: [214, 188, 128], 'warm-coast': [102, 156, 84] };
const KINDS = ['meadow', 'mixed-woodland', 'conifer-forest', 'alpine', 'wetland', 'dry-scrub', 'arid', 'warm-coast'];
const eco = w.ecology;
const H = (x, z) => sampleHeight(w.heights, x, z, size);
// distinct colour per landform tag (hue wheel keyed by id) for the geology overlay
const hsl = (hh, s, l) => { const a = s * Math.min(l, 1 - l), f = n => { const k = (n + hh / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0) * 255, f(8) * 255, f(4) * 255]; };
const TAGC = LANDFORMS.map((t, i) => (i === 0 ? null : hsl((i * 137.5) % 360, 0.85, 0.5)));
const geoIndex = (x, z) => { const g = geo, segs = g.n - 1; return Math.max(0, Math.min(segs, Math.round((z / g.size + 0.5) * segs))) * g.n + Math.max(0, Math.min(segs, Math.round((x / g.size + 0.5) * segs))); };
// bilinear rock colour and soil depth, so cell-sized steps in the lattice do not show as blocks in the image
const geoBil = (x, z) => {
  const g = geo, segs = g.n - 1, gx = Math.max(0, Math.min(segs - 0.001, (x / g.size + 0.5) * segs)), gz = Math.max(0, Math.min(segs - 0.001, (z / g.size + 0.5) * segs)), ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
  const rk = [0, 0, 0]; let soil = 0;
  for (const [ox, oz, wt] of [[0, 0, (1 - fx) * (1 - fz)], [1, 0, fx * (1 - fz)], [0, 1, (1 - fx) * fz], [1, 1, fx * fz]]) { const i = (iz + oz) * g.n + ix + ox, c = ROCKS[g.rock[i]]?.color ?? [150, 150, 150]; rk[0] += c[0] * wt; rk[1] += c[1] * wt; rk[2] += c[2] * wt; soil += g.soil[i] * 0.02 * wt; }
  return { rk, soil };
};
const surfaceColour = (x, z, m) => {
  if (m === 'rock' || m === 'geology') {
    if (m === 'rock') return geoBil(x, z).rk;
    const i = geoIndex(x, z), { rk, soil } = geoBil(x, z), tg = geo.landform[i];
    // soil-covered ground reads green-brown, bare rock reads as the rock colour
    const cover = Math.min(1, soil / 1.0), c = [rk[0] * (1 - 0.5 * cover) + 96 * 0.5 * cover, rk[1] * (1 - 0.5 * cover) + 132 * 0.5 * cover, rk[2] * (1 - 0.5 * cover) + 70 * 0.5 * cover];
    if (m === 'geology' && tg && TAGC[tg]) return [c[0] * 0.35 + TAGC[tg][0] * 0.65, c[1] * 0.35 + TAGC[tg][1] * 0.65, c[2] * 0.35 + TAGC[tg][2] * 0.65];
    return c;
  }
  const gx = Math.max(0, Math.min(eco.width - 1.001, (x / size + 0.5) * eco.width - 0.5)), gz = Math.max(0, Math.min(eco.width - 1.001, (z / size + 0.5) * eco.width - 0.5)), ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
  const c = [0, 0, 0];
  for (const [ox, oz, wt] of [[0, 0, (1 - fx) * (1 - fz)], [1, 0, fx * (1 - fz)], [0, 1, (1 - fx) * fz], [1, 1, fx * fz]]) { const k = PAL[KINDS[eco.kinds[(iz + oz) * eco.width + ix + ox]]] || [150, 150, 150]; c[0] += k[0] * wt; c[1] += k[1] * wt; c[2] += k[2] * wt; }
  // bare rock and scree show through the biome tint where there is no soil (what the economy reads from geology)
  if (geo && process.env.COVER !== '0') {
    const { rk, soil } = geoBil(x, z), bare = 1 - Math.min(1, soil / 0.45);
    return [c[0] * (1 - 0.8 * bare) + rk[0] * 0.8 * bare, c[1] * (1 - 0.8 * bare) + rk[1] * 0.8 * bare, c[2] * (1 - 0.8 * bare) + rk[2] * 0.8 * bare];
  }
  return c;
};
const shadeAt = (x, z, e = 1.5, k = 2.4) => {
  const sx = (H(x + e, z) - H(x - e, z)) / (2 * e), sz = (H(x, z + e) - H(x, z - e)) / (2 * e);
  let nx = -sx * k, ny = 1, nz = -sz * k; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
  return 0.42 + 0.7 * Math.max(0, nx * -0.55 + ny * 0.7 + nz * -0.45);
};
const view = (process.env.VIEW || '').split(',');
if (view.length >= 6 && view.slice(0, 6).every(v => Number.isFinite(Number(v)))) {
  // ---- ground-level perspective: ray-march the lattice heights, shade by normal, haze with distance ---------------------------------
  const [ex, ez, yawDeg, pitchDeg, fovDeg, eyeH] = view.slice(0, 6).map(Number), vname = view[6] || 'view';
  const W = Number(process.env.VW || 960), Hh = Number(process.env.VH || 540), yaw = yawDeg * Math.PI / 180, pitch = pitchDeg * Math.PI / 180, fov = fovDeg * Math.PI / 180;
  const segs = Math.round(Math.sqrt(w.heights.length)) - 1, n = segs + 1;
  const wl = new Float32Array(n * n);
  for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) wl[iz * n + ix] = Math.max(w.waterY, waterSurfaceAt(w, (ix / segs - 0.5) * size, (iz / segs - 0.5) * size));
  const bil = (f, x, z) => { const gx = Math.max(0, Math.min(segs - 0.001, (x / size + 0.5) * segs)), gz = Math.max(0, Math.min(segs - 0.001, (z / size + 0.5) * segs)), ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz, i = iz * n + ix; return f[i] * (1 - fx) * (1 - fz) + f[i + 1] * fx * (1 - fz) + f[i + n] * (1 - fx) * fz + f[i + n + 1] * fx * fz; };
  const top = (x, z) => Math.max(bil(w.heights, x, z), bil(wl, x, z));
  const eyeY = top(ex, ez) + eyeH;
  const rgb = new Uint8Array(W * Hh * 3), depth = new Float32Array(W * Hh).fill(1e9);
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), tanF = Math.tan(fov / 2), maxD = Number(process.env.VD || 1100);
  const sky = (v) => [120 + 70 * v, 160 + 55 * v, 205 + 35 * v];
  for (let py = 0; py < Hh; py++) for (let pxl = 0; pxl < W; pxl++) {
    const u = ((pxl + 0.5) / W * 2 - 1) * tanF, v = -((py + 0.5) / Hh * 2 - 1) * tanF * (Hh / W);
    // camera basis: forward (cy,sy) in xz, pitch up
    let dx = cy * cp - 0 * 0, dy = sp, dz = sy * cp;
    const rx = -sy, rz = cy, ux = -cy * sp, uy = cp, uz = -sy * sp;
    dx = dx + rx * u + ux * v; dy = dy + uy * v; dz = dz + rz * u + uz * v;
    const dl = Math.hypot(dx, dy, dz); dx /= dl; dy /= dl; dz /= dl;
    let t = 0.8, hit = false, prevT = 0, x = 0, z = 0, y = 0;
    while (t < maxD) {
      x = ex + dx * t; z = ez + dz * t; y = eyeY + dy * t;
      if (Math.abs(x) > size / 2 || Math.abs(z) > size / 2) break;
      if (y < top(x, z)) { hit = true; break; }
      prevT = t; t += Math.max(0.9, t * 0.011);
    }
    const o = (py * W + pxl) * 3;
    if (!hit) { const s = sky(Math.max(0, Math.min(1, dy * 2.2 + 0.1))); rgb[o] = s[0]; rgb[o + 1] = s[1]; rgb[o + 2] = s[2]; continue; }
    let lo = prevT, hi = t;
    for (let k = 0; k < 7; k++) { const m = (lo + hi) / 2; if (eyeY + dy * m < top(ex + dx * m, ez + dz * m)) hi = m; else lo = m; }
    t = (lo + hi) / 2; x = ex + dx * t; z = ez + dz * t;
    depth[py * W + pxl] = t;
    const ground = bil(w.heights, x, z), lvl = bil(wl, x, z), wet = ground < lvl + 0.02;
    let c;
    if (wet) { const d = Math.min(1, (lvl - ground) / 4); const sea = lvl <= w.waterY + 0.01; c = [(sea ? 60 : 78) - 30 * d, (sea ? 124 : 142) - 34 * d, (sea ? 168 : 186) - 30 * d]; const sun = 0.82 + 0.2 * Math.max(0, dy * -1); c = c.map(q => q * sun); }
    else {
      const base = surfaceColour(x, z, mode === 'height' ? 'biome' : mode), sh = shadeAt(x, z, 2, 1.6);
      c = [base[0] * sh * 1.08, base[1] * sh * 1.08, base[2] * sh * 1.08];
    }
    const haze = 1 - Math.exp(-Math.pow(t / 900, 1.35)), hz = [178, 196, 218];
    rgb[o] = Math.min(255, c[0] * (1 - haze) + hz[0] * haze); rgb[o + 1] = Math.min(255, c[1] * (1 - haze) + hz[1] * haze); rgb[o + 2] = Math.min(255, c[2] * (1 - haze) + hz[2] * haze);
  }
  // trees as small shaded blobs so the ground reads at human scale
  const focal = (Hh / 2) / (tanF * (Hh / W));
  const plot = (pt, rad, col) => {
    const vx = pt.x - ex, vy = pt.y - eyeY, vz = pt.z - ez, fwdx = cy * cp, fwdy = sp, fwdz = sy * cp;
    const dep = vx * fwdx + vy * fwdy + vz * fwdz; if (dep < 3) return;
    const rx = -sy, rz = cy, ux = -cy * sp, uy = cp, uz = -sy * sp, sxp = (vx * rx + vz * rz) / dep, syp = (vx * ux + vy * uy + vz * uz) / dep;
    const sx = W / 2 + sxp * focal * (Hh / W) * (W / Hh) , sy2 = Hh / 2 - syp * focal;
    const r = Math.max(1, Math.round(rad * focal / dep));
    for (let dy2 = -r * 2; dy2 <= 0; dy2++) for (let dx2 = -r; dx2 <= r; dx2++) {
      if ((dx2 / r) ** 2 + (dy2 / (r * 2)) ** 2 > 1) continue;
      const X = Math.round(sx + dx2), Y = Math.round(sy2 + dy2); if (X < 0 || Y < 0 || X >= W || Y >= Hh || depth[Y * W + X] < dep - 1) continue;
      const o = (Y * W + X) * 3, haze = 1 - Math.exp(-Math.pow(dep / 900, 1.35)), sh = 0.8 + 0.3 * (-dy2 / (r * 2 + 1));
      rgb[o] = col[0] * sh * (1 - haze) + 178 * haze; rgb[o + 1] = col[1] * sh * (1 - haze) + 196 * haze; rgb[o + 2] = col[2] * sh * (1 - haze) + 218 * haze;
    }
  };
  for (const tr of w.trees) { if (Math.hypot(tr.x - ex, tr.z - ez) > 520) continue; plot({ x: tr.x, y: tr.y + 4.5 * (tr.scale || 1) * 0.5, z: tr.z }, 1.6 * (tr.scale || 1), [38, 84, 46]); }
  for (const st of w.stones) { if (Math.hypot(st.x - ex, st.z - ez) > 300) continue; plot({ x: st.x, y: st.y + 0.8, z: st.z }, 0.9, [128, 124, 118]); }
  fs.mkdirSync(outDir, { recursive: true });
  const vfile = `${outDir}/${w.options.preset}_${seed}_${vname}.png`;
  writePng(vfile, W, Hh, rgb);
  console.log(JSON.stringify({ view: vfile, ms: dt }));
  process.exit(0);
}
// ---- top-down ----------------------------------------------------------------------------------------------------------------------------
const zoom = (process.env.ZOOM || '').split(',').map(Number), span = zoom.length === 3 && zoom.every(Number.isFinite) ? zoom[2] : size, zcx = span !== size ? zoom[0] : 0, zcz = span !== size ? zoom[1] : 0;
const px = Number(process.env.PX || 3), W = Math.round(size / 1040 * 256) * 2, S = Math.round(W * px * (span !== size ? Math.max(1, Math.min(3, size / span)) : 1));
const rgb = new Uint8Array(S * S * 3);
const zoomed = span !== size;
for (let zi = 0; zi < S; zi++) for (let xi = 0; xi < S; xi++) {
  const x = zcx + (xi / S - 0.5) * span, z = zcz + (zi / S - 0.5) * span, h = H(x, z);
  const shade = shadeAt(x, z, zoomed ? 1.2 : 1.5, zoomed ? 2 : 2.4);
  const o = (zi * S + xi) * 3;
  let r, g, b;
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
    const c = surfaceColour(x, z, mode);
    r = c[0] * shade * 1.05; g = c[1] * shade * 1.05; b = c[2] * shade * 1.05;
  }
  rgb[o] = Math.min(255, r); rgb[o + 1] = Math.min(255, g); rgb[o + 2] = Math.min(255, b);
}
const dot = (x, z, rad, col) => { const cx = ((x - zcx) / span + 0.5) * S, cz = ((z - zcz) / span + 0.5) * S; for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) { if (dx * dx + dz * dz > rad * rad) continue; const X = Math.round(cx + dx), Z = Math.round(cz + dz); if (X < 0 || Z < 0 || X >= S || Z >= S) continue; const o = (Z * S + X) * 3; rgb[o] = col[0]; rgb[o + 1] = col[1]; rgb[o + 2] = col[2]; } };
const T = { 0: [255, 255, 255], 1: [220, 40, 40], 2: [240, 180, 30], 4: [160, 60, 200], 5: [40, 200, 200] };
if (!zoomed) {
  for (const f of w.copper) dot(f.x, f.z, 1, [200, 100, 40]);
  for (const f of w.iron) dot(f.x, f.z, 1, [60, 60, 70]);
}
for (const c of w.camps) { dot(c.x, c.z, zoomed ? 5 : 9, [0, 0, 0]); dot(c.x, c.z, zoomed ? 3 : 7, T[c.team] || [255, 255, 255]); }
const name = `${w.options.preset}_${seed}_${size}${mode === 'height' ? '_h' : mode === 'biome' ? '' : '_' + mode}${zoomed ? `_zoom${Math.round(zcx)}_${Math.round(zcz)}_${Math.round(span)}` : ''}.png`;
writePng(`${outDir}/${name}`, S, S, rgb);
const legend = geo ? Object.entries(geo.counts).filter(([k]) => !k.endsWith('-cells')).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' ') : '';
console.log(JSON.stringify({ name, ms: dt, land: +w.mapgen.landFraction.toFixed(3), rivers: w.mapgen.rivers, lakes: w.mapgen.lakes, trees: w.trees.length, stones: w.stones.length, forage: w.forage.length, fish: w.fish.length, camps: w.camps.length, fairness: w.mapgen.fairness, geology: legend }));
if (geo && mode === 'geology') console.log('legend', LANDFORMS.slice(1).map(t => `${t.name}=rgb(${TAGC[t.id].map(Math.round)})`).join(' '));
