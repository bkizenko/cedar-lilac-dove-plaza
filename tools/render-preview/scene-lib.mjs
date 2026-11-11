// Scene assembly helpers for the H render preview. Runs in Node after
// scripts/game-loader.mjs is registered, so it can import the real pure
// generator modules from src/scene. Nothing here changes geometry or colour
// produced by the generator: building/tree/caravan/wonder meshes come straight
// from buildCarvedMesh(); terrain colours come from carvedTerrainColorsForPositions().
const S = '../../src/scene/';
export const parts = await import(S + 'buildingParts.ts');
export const mesh = await import(S + 'carvedMesh.ts');
export const palette = await import(S + 'carvedPalette.ts');
export const terrace = await import(S + 'carvedTerrace.ts');
export const style = await import(S + 'buildingStyleMap.ts');
export const families = await import(S + 'buildingFamilies.ts');
export const trees = await import(S + 'carvedTrees.ts');
export const caravans = await import(S + 'caravanModels.ts');
export const wonders = await import(S + 'wonderPlans.ts');
export const constants = await import('../../src/game/constants.ts');

/** Material id table shared by every backend (stand-in, three.js, Blender):
 * the palette's CarvedMaterialId list, then preview-only ids. */
export const MAT_IDS = [...palette.CARVED_MATERIAL_IDS, 'terrain', 'plinth'];
export const MAT = Object.fromEntries(MAT_IDS.map((m, i) => [m, i]));
/** Per-vertex material index for buildCarvedMesh(spec, tier): it emits parts in
 * partsAtLod order with exactly partTriangles(p) triangles each (tested upstream). */
export function specMatIds(spec, tier) {
  const out = [];
  for (const p of parts.partsAtLod(spec, tier)) { const n = parts.partTriangles(p) * 3, id = MAT[p.mat]; for (let i = 0; i < n; i++) out.push(id); }
  return new Uint8Array(out);
}

/** Accumulates non-indexed triangle soup (pos, normal, sRGB colour, grain, uv). */
export class Soup {
  constructor(name = 'soup', cast = true) { this.name = name; this.cast = cast; this.p = []; this.n = []; this.c = []; this.g = []; this.u = []; this.m = []; this.tris = 0; }
  /** Add a CarvedMeshData with placement (yaw about Y, then translate). */
  add(d, { x = 0, y = 0, z = 0, yaw = 0, scale = 1, sy = scale, tint = null } = {}) {
    const c = Math.cos(yaw), s = Math.sin(yaw), vc = d.positions.length / 3;
    for (let i = 0; i < vc; i++) {
      const px = d.positions[i * 3] * scale, py = d.positions[i * 3 + 1] * sy, pz = d.positions[i * 3 + 2] * scale;
      // three's Y rotation: x' = x cos + z sin ; z' = -x sin + z cos
      this.p.push(px * c + pz * s + x, py + y, -px * s + pz * c + z);
      const nx = d.normals[i * 3], ny = d.normals[i * 3 + 1], nz = d.normals[i * 3 + 2];
      this.n.push(nx * c + nz * s, ny, -nx * s + nz * c);
      const t = tint || [1, 1, 1];
      this.c.push(d.colors[i * 3] * t[0], d.colors[i * 3 + 1] * t[1], d.colors[i * 3 + 2] * t[2]);
      this.g.push(d.grain[i]); this.u.push(d.uvs[i * 2], d.uvs[i * 2 + 1]); this.m.push(d.mats ? d.mats[i] : MAT.woodMid);
    }
    this.tris += vc / 3;
  }
  encode() { return { name: this.name, cast: this.cast, flat: true, pos: f32(this.p), nrm: f32(this.n), col: f32(this.c), grain: f32(this.g), uv: f32(this.u), mat: u8(this.m) }; }
}
export const f32 = a => Buffer.from(new Float32Array(a).buffer).toString('base64');
export const u32 = a => Buffer.from(new Uint32Array(a).buffer).toString('base64');
export const u8 = a => Buffer.from(new Uint8Array(a).buffer).toString('base64');

const meshCache = new Map();
export function specMesh(spec, tier = 0) {
  const k = spec.variantKey + '#' + tier + '#' + spec.parts.length;
  if (!meshCache.has(k)) { const m = mesh.buildCarvedMesh(spec, tier); m.mats = specMatIds(spec, tier); meshCache.set(k, m); }
  return meshCache.get(k);
}

/** Impostor card exactly as carvedBuildingLayer.ts builds it: two crossed unit
 * quads scaled to impostorCard(spec), wall swatch colour, top vertices x0.78. */
export function impostorMesh(spec) {
  const card = mesh.impostorCard(spec), rgb = palette.hexToRgb(palette.CARVED_MATERIALS[card.wall].hex);
  const p = [], n = [], c = [], g = [], u = [];
  const quad = (ax, az, nx, nz) => {
    const v = [[-ax, 0, -az], [ax, 0, az], [ax, 1, az], [-ax, 0, -az], [ax, 1, az], [-ax, 1, -az]];
    for (const q of v) { p.push(q[0] * .5 * card.width, q[1] * card.height, q[2] * .5 * card.depth); const s = q[1] > 0 ? .78 : 1; c.push(rgb[0] * s, rgb[1] * s, rgb[2] * s); n.push(nx, 0, nz); g.push(0); u.push(0, 0); }
  };
  quad(1, 0, 0, 1); quad(0, 1, 1, 0);
  // card material is DoubleSide in the adapter; add back faces so it shows from any yaw
  quad(1, 0, 0, -1); quad(0, 1, -1, 0);
  return { positions: new Float32Array(p), normals: new Float32Array(n), colors: new Float32Array(c), grain: new Float32Array(g), uvs: new Float32Array(u), mats: new Uint8Array(p.length / 3).fill(MAT[card.wall]) };
}

/** Flat colour box/slab helper for sheet plinths (not generator content). */
export function slab(w, d, h, hex, grain = .6) {
  const spec = { family: 'plinth', variantKey: `slab|${w}|${d}|${h}|${hex}`, footprint: { w, d }, notes: { reference: '' }, parts: [{ shape: 'box', mat: 'woodMid', size: [w, h, d], pos: [0, -h, 0], lod: 2 }] };
  const m = mesh.buildCarvedMesh(spec, 0), rgb = palette.hexToRgb(hex);
  for (let i = 0; i < m.colors.length; i += 3) { m.colors[i] = rgb[0]; m.colors[i + 1] = rgb[1]; m.colors[i + 2] = rgb[2]; }
  m.grain.fill(grain); m.mats = new Uint8Array(m.grain.length).fill(MAT.plinth);
  return m;
}

/** Indexed terrain grid. `height(x,z)` is the display height; `colorHeight`
 * (default = height) is what carvedTerrainColorsForPositions samples. */
export function terrainMesh({ x0, x1, z0, z1, step, height, colorHeight = height, waterY, seed = 0, pathWeight, name = 'terrain', grain = .35, grainAmplitude = null, natural = false }) {
  const nx = Math.round((x1 - x0) / step) + 1, nz = Math.round((z1 - z0) / step) + 1;
  const pos = new Float32Array(nx * nz * 3), nrm = new Float32Array(nx * nz * 3), uv = new Float32Array(nx * nz * 2), gr = new Float32Array(nx * nz).fill(grain);
  const H = new Float32Array(nx * nz);
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = x0 + i * step, z = z0 + j * step, k = j * nx + i; H[k] = height(x, z); pos[k * 3] = x; pos[k * 3 + 1] = H[k]; pos[k * 3 + 2] = z; uv[k * 2] = x / palette.CARVED_GRAIN.tileMetres; uv[k * 2 + 1] = z / palette.CARVED_GRAIN.tileMetres * .35; }
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
    const k = j * nx + i, hl = H[j * nx + Math.max(0, i - 1)], hr = H[j * nx + Math.min(nx - 1, i + 1)], hd = H[Math.max(0, j - 1) * nx + i], hu = H[Math.min(nz - 1, j + 1) * nx + i];
    const n = [-(hr - hl) / (2 * step), 1, -(hu - hd) / (2 * step)], l = Math.hypot(...n); nrm[k * 3] = n[0] / l; nrm[k * 3 + 1] = n[1] / l; nrm[k * 3 + 2] = n[2] / l;
  }
  let col;
  if (natural) { col = naturalTerrainColors(pos, height, waterY, pathWeight, seed); gr.fill(0); }
  else if (grainAmplitude == null) col = terrace.carvedTerrainColorsForPositions(pos, colorHeight, waterY, seed, pathWeight);
  else { // same as carvedTerrainColorsForPositions, with the grain term rescaled (preview proposal)
    col = new Float32Array(nx * nz * 3); const path = palette.hexToRgb(palette.CARVED_TERRAIN.path), A = palette.CARVED_TERRAIN.grainAmplitude;
    for (let k = 0; k < nx * nz; k++) {
      const x = pos[k * 3], z = pos[k * 3 + 2], s = terrace.carvedTerraceSample(colorHeight, x, z, waterY, seed); let rgb = s.rgb;
      if (s.band >= 0) { const f = (1 + s.grain * grainAmplitude) / (1 + s.grain * A); rgb = rgb.map(c => Math.min(1, c * f)); }
      const p = pathWeight ? Math.max(0, Math.min(1, pathWeight(x, z))) : 0; if (p > 0 && s.band >= 0) rgb = rgb.map((c, i) => c + (path[i] - c) * p);
      col[k * 3] = rgb[0]; col[k * 3 + 1] = rgb[1]; col[k * 3 + 2] = rgb[2];
    }
  }
  const idx = [];
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx, d = c + 1; idx.push(a, c, b, b, c, d); }
  return { name, cast: true, flat: false, pos: f32(pos), nrm: f32(nrm), col: f32(col), grain: f32(gr), uv: f32(uv), idx: u32(idx), mat: u8(new Uint8Array(nx * nz).fill(MAT.terrain)), tris: idx.length / 3 };
}

/** Natural (non-carved) terrain palette for the golden-hour review: grass, dry
 * grass, soil, rock on steep slopes, sandy banks, riverbed. Preview-only values;
 * the generator has no natural terrain palette (carvedTerrace is the H look). */
export const NATURAL_TERRAIN = { grass: '#7d8a46', grassDry: '#a59c5c', soil: '#9a7a52', rock: '#8f877a', bank: '#bba57a', bed: '#5f7479', path: '#c8ad80' };
const vhash = (x, z, s) => { const h = Math.sin(x * 127.1 + z * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); };
export function valueNoise(x, z, s = 0) { const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi, u = xf * xf * (3 - 2 * xf), v = zf * zf * (3 - 2 * zf);
  const a = vhash(xi, zi, s), b = vhash(xi + 1, zi, s), c = vhash(xi, zi + 1, s), d = vhash(xi + 1, zi + 1, s); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; }
export function naturalTerrainColors(pos, height, waterY, pathWeight, seed = 0) {
  const n = pos.length / 3, out = new Float32Array(n * 3), C = Object.fromEntries(Object.entries(NATURAL_TERRAIN).map(([k, v]) => [k, palette.hexToRgb(v)]));
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.max(0, Math.min(1, t)));
  for (let i = 0; i < n; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2], e = .6;
    const slope = Math.hypot(height(x + e, z) - height(x - e, z), height(x, z + e) - height(x, z - e)) / (2 * e);
    const n1 = valueNoise(x * .06, z * .06, seed), n2 = valueNoise(x * .35, z * .35, seed + 7), n3 = valueNoise(x * 1.7, z * 1.7, seed + 3);
    let c = mix(C.grass, C.grassDry, n1 * 1.3 - .25 + (y - waterY) * .03);
    c = mix(c, C.soil, (n2 - .72) * 3);
    c = mix(c, C.rock, (slope - .55) * 2.2);
    const above = y - waterY;
    if (above < .9) c = mix(c, C.bank, 1 - above / .9);
    if (above < 0) c = mix(C.bank, C.bed, Math.min(1, -above / 1.0));
    const p = pathWeight ? pathWeight(x, z) : 0; if (p > 0 && above > 0) c = mix(c, C.path, p * .9);
    const k = .93 + n3 * .12; out[i * 3] = c[0] * k; out[i * 3 + 1] = c[1] * k; out[i * 3 + 2] = c[2] * k;
  }
  return out;
}

/** Flat water surface (grain = -1 flags water in the shader), palette water swatch. */
export function waterMesh(x0, x1, z0, z1, y, hex = palette.CARVED_MATERIALS.water.hex) {
  const rgb = palette.hexToRgb(hex), p = [x0, y, z0, x0, y, z1, x1, y, z1, x0, y, z0, x1, y, z1, x1, y, z0];
  return { name: 'water', cast: false, flat: true, water: true, pos: f32(p), nrm: f32(Array(6).fill([0, 1, 0]).flat()), col: f32(Array(6).fill(rgb).flat()), grain: f32(Array(6).fill(-1)), uv: f32(Array(12).fill(0)), mat: u8(Array(6).fill(MAT.water)) };
}

export function grainTexture() {
  const size = palette.CARVED_GRAIN.textureSize;
  return { size, pixels: Buffer.from(palette.woodGrainPixels(size)).toString('base64') };
}

/** The adapter's rig (CARVED_LIGHT_RIG) with a sun direction added; the rig
 * itself does not define one. */
export function adapterRig(over = {}) {
  const R = palette.CARVED_LIGHT_RIG;
  return { label: 'adapter rig (CARVED_LIGHT_RIG as-is)', exposure: R.exposure, hemiSky: R.hemiSky, hemiGround: R.hemiGround, hemiIntensity: R.hemiIntensity, sun: R.sun, sunIntensity: R.sunIntensity,
    bounce: R.bounce, bounceIntensity: R.bounceIntensity, fog: R.fog, fogNearMetres: R.fogNearMetres, fogFarMetres: R.fogFarMetres, sunDir: [-.55, .62, .45], shadows: true, shadowSoft: 1.6, ...over };
}
