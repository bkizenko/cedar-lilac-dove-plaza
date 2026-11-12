/** The per-cell geology read: rock id, strata band, soil depth and landform tag on the game height grid, derived from the
 * structural plan and the *final* heights, so what is read always matches what is rendered.
 *   world.mapgen.geology = { n, size, rock, under, strata, soil, landform, ... } and `geologyAt(world, x, z)`. */
import { clamp, smoothstep, Noise } from '../noise';
import { ROCKS, HARD, SOFT, LANDFORMS, TAG, TAG_PRIORITY, tagName, rockName } from './rocks';
import { idxOf, rockAt, underAt, bandAt, bedPosition, PROV, type GeoState, type Landmark } from './structure';

export type GeologyLake = { id: string; origin: string; x: number; z: number; areaM2: number };
export type GeologyGrid = {
  version: 1;
  /** Vertices per side (same lattice as `world.heights`). */
  n: number;
  size: number;
  /** Rock at the surface (see ROCKS in geology/rocks.ts). */
  rock: Uint8Array;
  /** Rock of the bed directly beneath the surface bed (== rock where not layered). */
  under: Uint8Array;
  /** Stratum index in the local stack, 255 where the rock is not layered. */
  strata: Uint8Array;
  /** Soil depth in units of 2 cm (255 = 5.1 m). 0 = bare rock. */
  soil: Uint8Array;
  /** Landform tag id (LANDFORMS in geology/rocks.ts); 0 = ordinary ground. */
  landform: Uint8Array;
  landmarks: Landmark[];
  lakes: GeologyLake[];
  /** Number of cells carrying each tag name. */
  counts: Record<string, number>;
  rockCounts: Record<string, number>;
  /** Provinces on the working grid, for debugging and previews. */
  provinceAt: (x: number, z: number) => number;
};
export type GeologyRead = { rock: number; rockName: string; under: number; strata: number; soilDepthMeters: number; landform: number; landformTag: string; hardness: number };

const SOIL_UNIT = 0.02;
export type ReadInputs = {
  st: GeoState; heights: Float32Array; n: number; size: number; waterY: number;
  /** True where the ground is under fresh or sea water. */
  wet: (x: number, z: number) => boolean;
  /** Extra tags painted by river code, in game coordinates: called for every cell, returns a tag name or ''. */
  fluvialTag?: (x: number, z: number, ix: number, iz: number) => string;
  fluvialSoil?: (x: number, z: number) => number;
};

export function buildGeologyGrid(inp: ReadInputs): GeologyGrid {
  const { st, heights, n, size, waterY } = inp, total = n * n, sg = size / (n - 1), half = size / 2;
  const rock = new Uint8Array(total), under = new Uint8Array(total), strata = new Uint8Array(total).fill(255), soil = new Uint8Array(total), landform = new Uint8Array(total);
  const slope = new Float32Array(total), wetMask = new Uint8Array(total), conv = new Float32Array(total);
  const H = (ix: number, iz: number) => heights[Math.max(0, Math.min(n - 1, iz)) * n + Math.max(0, Math.min(n - 1, ix))] - waterY;
  const noise = new Noise(st.seed ^ 0x51ed1a7);
  const px = (ix: number) => ix * sg - half;
  for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
    const i = iz * n + ix;
    slope[i] = Math.max(Math.hypot(H(ix + 1, iz) - H(ix - 1, iz), H(ix, iz + 1) - H(ix, iz - 1)) / (2 * sg), 0);
    conv[i] = H(ix, iz) - (H(ix + 3, iz) + H(ix - 3, iz) + H(ix, iz + 3) + H(ix, iz - 3)) / 4;
    wetMask[i] = inp.wet(px(ix), px(iz)) ? 1 : 0;
  }
  // ---- rock, strata and soil -------------------------------------------------------------------------------------------------------
  for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
    const i = iz * n + ix;
    if (wetMask[i]) continue;
    const x = px(ix), z = px(iz), wi = idxOf(st, x, z), h = H(ix, iz);
    if (!st.prov[wi]) { rock[i] = 7; under[i] = 7; soil[i] = 100; continue; } // islets and shores not on the provinced grid: loose sand
    const r = rockAt(st, wi, h);
    rock[i] = r;
    under[i] = underAt(st, wi, h);
    strata[i] = bandAt(st, wi, h);
    const info = ROCKS[r], s = slope[i];
    let depth = info.soil * (1 - smoothstep(0.22, 0.95, s)) * (1 + clamp(conv[i] * -0.35, -0.5, 1.2)) * (1 - 0.55 * smoothstep(55, 125, h));
    if (inp.fluvialSoil) depth += inp.fluvialSoil(x, z);
    soil[i] = Math.round(clamp(depth, 0, 5.1) / SOIL_UNIT);
  }
  // ---- landform tags: process tags painted on the working grid, then tags derived from rock, slope and position ------------
  const tagAtWork = (x: number, z: number) => st.tag[idxOf(st, x, z)];
  const hardAt = (i: number) => ROCKS[rock[i]].hardness >= HARD && ROCKS[under[i]].hardness <= SOFT && strata[i] !== 255;
  const set = (i: number, name: string) => { const id = TAG[name]; if (TAG_PRIORITY[id] > TAG_PRIORITY[landform[i]]) landform[i] = id; };
  for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
    const i = iz * n + ix;
    if (wetMask[i]) { const t = tagAtWork(px(ix), px(iz)); if (t === TAG.lagoon || t === TAG['sea-stack']) landform[i] = t; continue; }
    landform[i] = tagAtWork(px(ix), px(iz));
    if (inp.fluvialTag) { const f = inp.fluvialTag(px(ix), px(iz), ix, iz); if (f) set(i, f); }
  }
  const cliff = new Uint8Array(total);
  for (let i = 0; i < total; i++) {
    if (wetMask[i]) continue;
    const s = slope[i];
    if (s >= 0.8 && hardAt(i)) { cliff[i] = 1; set(i, rock[i] === 2 ? 'basalt-columns' : 'cliff'); }
    else if (s >= 0.9 && rock[i] === 1) set(i, 'crag');
    else if (s >= 0.75 && rock[i] === 2) { cliff[i] = 1; set(i, 'basalt-columns'); }
  }
  // scree: gentle-steep ground directly below a cliff or crag
  for (let iz = 2; iz < n - 2; iz++) for (let ix = 2; ix < n - 2; ix++) {
    const i = iz * n + ix;
    if (wetMask[i] || cliff[i] || slope[i] < 0.26 || slope[i] > 0.95) continue;
    const gx = H(ix + 1, iz) - H(ix - 1, iz), gz = H(ix, iz + 1) - H(ix, iz - 1), gl = Math.hypot(gx, gz) || 1;
    for (const d of [3, 5]) {
      const ux = Math.round(ix + (gx / gl) * d), uz = Math.round(iz + (gz / gl) * d);
      if (ux < 0 || uz < 0 || ux >= n || uz >= n) continue;
      const j = uz * n + ux;
      if (cliff[j] || (slope[j] >= 0.9 && rock[j] === 1)) { set(i, 'scree'); soil[i] = Math.min(soil[i], 4); break; }
    }
  }
  // mesas and buttes: flat caprock treads standing well above the surrounding ground
  const tread = new Uint8Array(total);
  const ringMin = (ix: number, iz: number) => { let m = Infinity; for (const r of [6, 11]) for (let a = 0; a < 8; a++) m = Math.min(m, H(Math.round(ix + Math.cos(a * Math.PI / 4) * r), Math.round(iz + Math.sin(a * Math.PI / 4) * r))); return m; };
  for (let iz = 12; iz < n - 12; iz++) for (let ix = 12; ix < n - 12; ix++) {
    const i = iz * n + ix;
    if (wetMask[i] || slope[i] > 0.16 || !hardAt(i) || rock[i] === 2 && st.prov[idxOf(st, px(ix), px(iz))] === PROV.volcanic) continue;
    const bp = bedPosition(st, idxOf(st, px(ix), px(iz)), H(ix, iz));
    if (!bp || !bp.hard || bp.t < 0.82) continue;
    if (H(ix, iz) - ringMin(ix, iz) >= 8) tread[i] = 1;
  }
  const comp = new Int32Array(total).fill(-1);
  const stack: number[] = [];
  let mesaCells = 0, butteCells = 0;
  for (let s0 = 0; s0 < total; s0++) {
    if (!tread[s0] || comp[s0] >= 0) continue;
    const cells: number[] = [s0];
    comp[s0] = s0;
    stack.length = 0; stack.push(s0);
    while (stack.length) {
      const c = stack.pop()!, cx = c % n, cz = (c / n) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const X = cx + dx, Z = cz + dz; if (X < 0 || Z < 0 || X >= n || Z >= n) continue; const j = Z * n + X; if (tread[j] && comp[j] < 0) { comp[j] = s0; cells.push(j); stack.push(j); } }
    }
    const area = cells.length * sg * sg;
    if (area < 120) continue;
    const name = area >= 2600 ? 'mesa' : 'butte';
    for (const c of cells) set(c, name);
    if (name === 'mesa') mesaCells += cells.length; else butteCells += cells.length;
  }
  // hogbacks and cuestas: hard beds on tilted ground, from the tilt gradient of the structural plan
  for (let iz = 4; iz < n - 4; iz++) for (let ix = 4; ix < n - 4; ix++) {
    const i = iz * n + ix;
    if (wetMask[i] || !hardAt(i) || landform[i] !== 0) continue;
    const wi = idxOf(st, px(ix), px(iz)), wn = st.n, cs = st.cell;
    const gT = Math.hypot(st.tilt[Math.min(st.tilt.length - 1, wi + 1)] - st.tilt[Math.max(0, wi - 1)], st.tilt[Math.min(st.tilt.length - 1, wi + wn)] - st.tilt[Math.max(0, wi - wn)]) / (2 * cs);
    const bp = bedPosition(st, wi, H(ix, iz));
    if (!bp || !bp.hard) continue;
    if (gT > 0.3 && conv[i] > 0.9 && slope[i] < 1) set(i, 'hogback');
    else if (gT > 0.07 && gT <= 0.3 && bp.t > 0.8 && slope[i] < 0.2) set(i, 'cuesta');
  }
  // escarpments: long continuous cap-rock faces
  const seen = new Uint8Array(total);
  for (let s0 = 0; s0 < total; s0++) {
    if (!cliff[s0] || seen[s0] || rock[s0] === 2) continue;
    const cells: number[] = [s0];
    seen[s0] = 1; stack.length = 0; stack.push(s0);
    while (stack.length) {
      const c = stack.pop()!, cx = c % n, cz = (c / n) | 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const X = cx + dx, Z = cz + dz; if (X < 0 || Z < 0 || X >= n || Z >= n) continue; const j = Z * n + X; if (cliff[j] && !seen[j]) { seen[j] = 1; cells.push(j); stack.push(j); } }
    }
    if (cells.length >= 90) for (const c of cells) set(c, 'escarpment');
  }
  // boulder fields and bare strata
  for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) {
    const i = iz * n + ix;
    if (wetMask[i]) continue;
    const s = slope[i], d = soil[i] * SOIL_UNIT, r = rock[i];
    if ((r === 1 || r === 2 || r === 3) && s > 0.12 && s < 0.6 && d < 0.3 && noise.fbm(px(ix) * 0.05, px(iz) * 0.05, 2) > 0.18) set(i, 'boulder-field');
    if (strata[i] !== 255 && d < 0.12 && s > 0.3) set(i, 'exposed-strata');
    if (r === 4 && d < 0.1 && s < 0.3) set(i, 'limestone-pavement');
    if (landform[i] === TAG.cliff || landform[i] === TAG.escarpment || landform[i] === TAG.crag || landform[i] === TAG['basalt-columns']) soil[i] = 0;
  }
  // ---- rare exceptional vistas: large relief beside water, kept sparse ------------------------------------------------------------
  const vistas: Landmark[] = [];
  const cands: { x: number; z: number; score: number; i: number }[] = [];
  for (let iz = 20; iz < n - 20; iz += 5) for (let ix = 20; ix < n - 20; ix += 5) {
    const i = iz * n + ix;
    if (wetMask[i] || slope[i] > 0.5) continue;
    let lo = Infinity, hi = -Infinity, water = 0;
    for (let a = 0; a < 12; a++) for (const r of [14, 26, 40]) { const X = Math.round(ix + Math.cos(a * Math.PI / 6) * r), Z = Math.round(iz + Math.sin(a * Math.PI / 6) * r); const h = H(X, Z); lo = Math.min(lo, h); hi = Math.max(hi, h); if (wetMask[Math.max(0, Math.min(n - 1, Z)) * n + Math.max(0, Math.min(n - 1, X))]) water++; }
    const relief = Math.max(hi - H(ix, iz), H(ix, iz) - lo);
    if (H(ix, iz) < 14 || water < 4 || H(ix, iz) - lo < 12) continue;
    cands.push({ x: px(ix), z: px(iz), i, score: relief * (1 + water / 18) + (landform[i] ? 8 : 0) });
  }
  cands.sort((a, b) => b.score - a.score);
  for (const c of cands) {
    if (vistas.length >= 2) break;
    if (vistas.every(v => Math.hypot(v.x - c.x, v.z - c.z) > 0.28 * size)) vistas.push({ tag: 'vista', x: c.x, z: c.z, radius: 40 });
  }
  const counts: Record<string, number> = {}, rockCounts: Record<string, number> = {};
  for (let i = 0; i < total; i++) { if (landform[i]) { const k = tagName(landform[i]); counts[k] = (counts[k] || 0) + 1; } if (rock[i]) { const k = rockName(rock[i]); rockCounts[k] = (rockCounts[k] || 0) + 1; } }
  counts['mesa-cells'] = mesaCells; counts['butte-cells'] = butteCells;
  const landmarks = [...st.landmarks, ...vistas];
  void LANDFORMS;
  return { version: 1, n, size, rock, under, strata, soil, landform, landmarks, lakes: [], counts, rockCounts, provinceAt: (x, z) => st.prov[idxOf(st, x, z)] };
}

/** Read the geology under world point (x, z) (bilinear-free: the nearest lattice vertex). */
export function geologyAt(world: { size: number; mapgen?: { geology?: GeologyGrid } }, x: number, z: number): GeologyRead | null {
  const g = world.mapgen?.geology;
  if (!g) return null;
  const segs = g.n - 1, ix = Math.max(0, Math.min(segs, Math.round((x / g.size + 0.5) * segs))), iz = Math.max(0, Math.min(segs, Math.round((z / g.size + 0.5) * segs))), i = iz * g.n + ix;
  return { rock: g.rock[i], rockName: rockName(g.rock[i]), under: g.under[i], strata: g.strata[i], soilDepthMeters: g.soil[i] * SOIL_UNIT, landform: g.landform[i], landformTag: tagName(g.landform[i]), hardness: ROCKS[g.rock[i]].hardness };
}
