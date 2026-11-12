/** Large-scale terrain: land/sea layout per preset, tectonic-style ranges, plateaus, then
 * stream-power erosion so valleys, ridges and drainage come out coherent. Working grid only. */
import { Noise, clamp, smoothstep, distanceTransform } from './noise';
import { priorityFlood, accumulate, DX, DZ } from './flow';
import type { PresetSpec } from './presets';
import { planGeology, applyFaults, stratigraphicRelief, inselbergs, volcanoes, riftFeatures, erodibilityAt, type GeoState } from './geology/structure';
export type Range = { spine: { x: number; z: number }[]; width: number; height: number; length: number };
export type Terrain = {
  /** Vertices per side (cells + 1). */
  n: number;
  size: number;
  cell: number;
  /** Metres above the coast (sea level = 0). Sea floor is negative. */
  h: Float32Array;
  sea: Uint8Array;
  /** Metres from the shore: positive inland, negative at sea. */
  signed: Float32Array;
  ranges: Range[];
  /** Normalised 0..1 uplift envelope (where mountains were raised). */
  uplift: Float32Array;
  /** Dominant tectonic axis (radians). */
  axis: number;
  landFraction: number;
  /** Structural geology plan (rock provinces, strata, faults, volcanoes); only present when the geology layer is on. */
  geo?: GeoState;
};
const idx = (n: number) => (x: number, z: number) => z * n + x;
function quantile(values: Float32Array, q: number) {
  const copy = Float32Array.from(values);
  copy.sort();
  return copy[Math.min(copy.length - 1, Math.max(0, Math.floor(q * copy.length)))];
}
type Blob = { x: number; z: number; rx: number; rz: number; a: number };
function blobField(blobs: Blob[], u: number, v: number, k: number) {
  let sum = 0;
  for (const b of blobs) {
    const c = Math.cos(b.a), s = Math.sin(b.a), dx = u - b.x, dz = v - b.z, px = dx * c + dz * s, pz = -dx * s + dz * c;
    const r = Math.hypot(px / b.rx, pz / b.rz);
    sum += Math.exp(k * (1 - r) * Math.min(b.rx, b.rz));
  }
  return Math.log(sum + 1e-12) / k;
}
export function buildBlobs(preset: PresetSpec, rand: () => number, attempt: number): { blobs: Blob[]; gulf?: Blob } {
  const R = (a: number, b: number) => a + (b - a) * rand();
  const blobs: Blob[] = [];
  let gulf: Blob | undefined;
  switch (preset.id) {
    case 'archipelago': {
      // size classes: a few big islands, several mid-size ones and a scatter of islets, each kept apart by a navigable channel
      const classes: { count: number; r: [number, number]; d: [number, number]; gap: number }[] = [
        { count: 3 + ((rand() * 2) | 0), r: [0.075, 0.135], d: [0.1, 0.3], gap: 0.05 },
        { count: 4 + ((rand() * 3) | 0), r: [0.04, 0.07], d: [0.08, 0.36], gap: 0.035 },
        { count: 7 + ((rand() * 5) | 0), r: [0.012, 0.03], d: [0.08, 0.4], gap: 0.028 },
      ];
      classes.forEach((cls, ci) => {
        let made = 0;
        for (let tries = 0; made < cls.count && tries < 260; tries++) {
          const r = R(cls.r[0], cls.r[1]) * (ci === 0 && made === 0 ? 1.25 : 1);
          const ang = rand() * Math.PI * 2, d = ci === 0 && made === 0 ? R(0, 0.07) : R(cls.d[0], cls.d[1]);
          const b = { x: Math.cos(ang) * d, z: Math.sin(ang) * d, rx: r * R(0.85, 1.35), rz: r * R(0.7, 1.1), a: rand() * Math.PI };
          if (blobs.every(o => Math.hypot(o.x - b.x, o.z - b.z) > Math.max(o.rx, o.rz) + Math.max(b.rx, b.rz) + cls.gap)) { blobs.push(b); made++; }
        }
      });
      break;
    }
    case 'island': {
      const a = rand() * Math.PI;
      blobs.push({ x: R(-0.04, 0.04), z: R(-0.04, 0.04), rx: R(0.28, 0.33), rz: R(0.2, 0.26), a });
      for (let i = 0; i < 3 + ((rand() * 3) | 0); i++) {
        const ang = rand() * Math.PI * 2, d = R(0.15, 0.24), r = R(0.07, 0.12);
        blobs.push({ x: Math.cos(ang) * d, z: Math.sin(ang) * d, rx: r * R(0.9, 1.4), rz: r * R(0.6, 1), a: rand() * Math.PI });
      }
      for (let i = 0; i < 4; i++) {
        const ang = rand() * Math.PI * 2, d = R(0.33, 0.4), r = R(0.02, 0.04);
        blobs.push({ x: Math.cos(ang) * d, z: Math.sin(ang) * d, rx: r, rz: r, a: 0 });
      }
      break;
    }
    case 'continents': {
      const ang = rand() * Math.PI, nx = Math.cos(ang), nz = Math.sin(ang), tx = -nz, tz = nx;
      const gap = R(0.07, 0.1) + attempt * 0.012;
      for (const side of [-1, 1]) {
        const off = side * (0.205 + gap * 0.5 + R(-0.015, 0.015));
        for (let i = 0; i < 4; i++) {
          const along = (i - 1.5) * R(0.13, 0.17) + R(-0.03, 0.03);
          const r = R(0.1, 0.15);
          blobs.push({ x: tx * off + nx * along, z: tz * off + nz * along, rx: r * R(1, 1.3), rz: r * R(0.8, 1.1), a: ang + R(-0.5, 0.5) });
        }
      }
      break;
    }
    case 'pangaea':
    case 'river-valley':
    case 'lakeland': {
      const a = rand() * Math.PI;
      blobs.push({ x: R(-0.03, 0.03), z: R(-0.03, 0.03), rx: R(0.3, 0.36), rz: R(0.22, 0.28), a });
      for (let i = 0; i < 4; i++) {
        const ang = rand() * Math.PI * 2, d = R(0.2, 0.3), r = R(0.09, 0.15);
        blobs.push({ x: Math.cos(ang) * d, z: Math.sin(ang) * d, rx: r * R(1, 1.5), rz: r * R(0.7, 1), a: rand() * Math.PI });
      }
      const ga = rand() * Math.PI * 2;
      gulf = { x: Math.cos(ga) * 0.31, z: Math.sin(ga) * 0.31, rx: R(0.1, 0.15), rz: R(0.06, 0.1), a: ga };
      break;
    }
    case 'highland': {
      const a = rand() * Math.PI;
      blobs.push({ x: R(-0.03, 0.03), z: R(-0.03, 0.03), rx: R(0.27, 0.32), rz: R(0.18, 0.23), a });
      for (let i = 0; i < 3; i++) {
        const ang = rand() * Math.PI * 2, d = R(0.15, 0.22), r = R(0.07, 0.12);
        blobs.push({ x: Math.cos(ang) * d, z: Math.sin(ang) * d, rx: r * R(1, 1.5), rz: r * R(0.7, 1), a: rand() * Math.PI });
      }
      break;
    }
    case 'steppe': {
      const a = rand() * Math.PI;
      blobs.push({ x: R(-0.04, 0.04), z: R(-0.04, 0.04), rx: R(0.36, 0.42), rz: R(0.27, 0.33), a });
      for (let i = 0; i < 2; i++) {
        const ang = rand() * Math.PI * 2, d = R(0.22, 0.3), r = R(0.08, 0.13);
        blobs.push({ x: Math.cos(ang) * d, z: Math.sin(ang) * d, rx: r * R(1, 1.5), rz: r, a: rand() * Math.PI });
      }
      break;
    }
  }
  return { blobs, gulf };
}
/** Connected components over a boolean raster (4-connected). Returns labels and areas in cells. */
export function components(mask: Uint8Array, n: number, want = 1) {
  const labels = new Int32Array(n * n).fill(-1), areas: number[] = [], stack = new Int32Array(n * n);
  for (let s = 0; s < n * n; s++) {
    if (labels[s] >= 0 || mask[s] !== want) continue;
    const id = areas.length;
    let top = 0, area = 0;
    stack[top++] = s;
    labels[s] = id;
    while (top) {
      const c = stack[--top], x = c % n, z = (c / n) | 0;
      area++;
      if (x > 0 && labels[c - 1] < 0 && mask[c - 1] === want) { labels[c - 1] = id; stack[top++] = c - 1; }
      if (x < n - 1 && labels[c + 1] < 0 && mask[c + 1] === want) { labels[c + 1] = id; stack[top++] = c + 1; }
      if (z > 0 && labels[c - n] < 0 && mask[c - n] === want) { labels[c - n] = id; stack[top++] = c - n; }
      if (z < n - 1 && labels[c + n] < 0 && mask[c + n] === want) { labels[c + n] = id; stack[top++] = c + n; }
    }
    areas.push(area);
  }
  return { labels, areas };
}
export type TerrainOptions = { erosionIterations?: number; geology?: boolean };
export function buildTerrain(seed: number, size: number, n: number, preset: PresetSpec, rand: () => number, opts: TerrainOptions = {}): Terrain {
  const total = n * n, cell = size / (n - 1), at = idx(n);
  const warp = new Noise(seed ^ 0x51ed270b), detail = new Noise(seed ^ 0x2f6a2c37), hill = new Noise(seed ^ 0x7a3e9b15), ridge = new Noise(seed ^ 0x13198a2e);
  const R = (a: number, b: number) => a + (b - a) * rand();
  const targetLand = R(preset.land[0], preset.land[1]);
  // ---- 1. land / sea layout -------------------------------------------------
  let C = new Float32Array(total), sea = new Uint8Array(total), best: { C: Float32Array; sea: Uint8Array; score: number } | undefined;
  const field = (blobs: Blob[], gulf: Blob | undefined, grid: number, scale: number) => {
    const out = new Float32Array(grid * grid), sb = blobs.map(b => ({ ...b, rx: b.rx * scale, rz: b.rz * scale }));
    for (let z = 0; z < grid; z++) {
      for (let x = 0; x < grid; x++) {
        const u = x / (grid - 1) - 0.5, v = z / (grid - 1) - 0.5;
        const wu = u + warp.fbm(u * 1.7 + 3.1, v * 1.7, 3) * 0.13 + warp.fbm(u * 5 + 9, v * 5, 2) * 0.03, wv = v + warp.fbm(u * 1.7 - 7.7, v * 1.7 + 5.3, 3) * 0.13 + warp.fbm(u * 5 - 4, v * 5 + 2, 2) * 0.03;
        let c = blobField(sb, wu, wv, 55);
        if (gulf) {
          const cg = Math.cos(gulf.a), sg = Math.sin(gulf.a), dx = wu - gulf.x, dz = wv - gulf.z, px = dx * cg + dz * sg, pz = -dx * sg + dz * cg;
          c -= 0.16 * smoothstep(1, 0.35, Math.hypot(px / gulf.rx, pz / gulf.rz));
        }
        c += detail.fbm(u * 3.2, v * 3.2, 3) * 0.075 + detail.fbm(u * 8.5 + 11, v * 8.5, 3) * 0.034 + detail.fbm(u * 21 + 5, v * 21 - 3, 2) * 0.005;
        const m = Math.hypot(u, v) * 0.9 + Math.max(Math.abs(u), Math.abs(v)) * 0.1;
        c -= 1.2 * smoothstep(0.41, 0.48, m);
        out[z * grid + x] = c;
      }
    }
    return out;
  };
  for (let attempt = 0; attempt < 6; attempt++) {
    const { blobs, gulf } = buildBlobs(preset, rand, attempt);
    // Solve a radius scale so the land fraction lands inside the preset's range.
    let scale = 1;
    for (let k = 0; k < 6; k++) {
      const coarse = field(blobs, gulf, 97, scale);
      let land = 0;
      for (let i = 0; i < coarse.length; i++) land += coarse[i] > 0 ? 1 : 0;
      const fraction = land / coarse.length;
      if (Math.abs(fraction - targetLand) < 0.015) break;
      scale = clamp(scale * Math.pow(targetLand / Math.max(0.02, fraction), 0.6), 0.6, 1.3);
    }
    C = field(blobs, gulf, n, scale);
    const s = new Uint8Array(total);
    for (let i = 0; i < total; i++) s[i] = C[i] > 0 ? 0 : 1;
    // remove tiny land specks and enclosed sea pockets
    const minIsland = preset.id === 'archipelago' ? 28 : 90;
    const land = components(s, n, 0);
    for (let i = 0; i < total; i++) if (!s[i] && land.areas[land.labels[i]] < minIsland) s[i] = 1;
    const seaComp = components(s, n, 1);
    const border = new Set<number>();
    for (let k = 0; k < n; k++) for (const e of [at(k, 0), at(k, n - 1), at(0, k), at(n - 1, k)]) border.add(seaComp.labels[e]);
    for (let i = 0; i < total; i++) if (s[i] && !border.has(seaComp.labels[i]) && seaComp.areas[seaComp.labels[i]] < total * 0.02) s[i] = 0;
    const comp = components(s, n, 0);
    const substantial = comp.areas.filter(a => a * cell * cell > 22000).length;
    const [lo, hi] = preset.landmasses;
    const score = substantial >= lo && substantial <= hi ? 100 : -Math.abs(substantial - (lo + hi) / 2);
    if (!best || score > best.score) best = { C: Float32Array.from(C), sea: s, score };
    if (score === 100) break;
  }
  C = best!.C as typeof C;
  sea = best!.sea as typeof sea;
  let landCells = 0;
  for (let i = 0; i < total; i++) landCells += sea[i] ? 0 : 1;
  const landFraction = landCells / total;
  // ---- 2. signed distance to the coast ---------------------------------------
  const toSea = distanceTransform(sea, n), landMask = new Uint8Array(total);
  for (let i = 0; i < total; i++) landMask[i] = sea[i] ? 0 : 1;
  const toLand = distanceTransform(landMask, n), signed = new Float32Array(total);
  for (let i = 0; i < total; i++) signed[i] = sea[i] ? -(toLand[i] - 0.5) * cell : (toSea[i] - 0.5) * cell;
  // ---- 3. tectonic ranges ----------------------------------------------------
  const axis = rand() * Math.PI;
  const rangeCount = Math.round(R(preset.ranges.count[0], preset.ranges.count[1] + 0.999));
  const ranges: Range[] = [];
  const candidates: number[] = [];
  const innerMin = preset.ranges.inland ? 0.1 * size : 0.03 * size, innerMax = preset.ranges.inland ? 1e9 : 0.17 * size;
  for (let i = 0; i < total; i++) if (signed[i] > innerMin && signed[i] < innerMax) candidates.push(i);
  if (!candidates.length) for (let i = 0; i < total; i++) if (signed[i] > 0.02 * size) candidates.push(i);
  for (let r = 0; r < rangeCount && candidates.length; r++) {
    let pickIndex = candidates[Math.floor(rand() * candidates.length)];
    // spread ranges apart
    for (let tries = 0; tries < 30; tries++) {
      const cand = candidates[Math.floor(rand() * candidates.length)], cx = (cand % n) / (n - 1) * size - size / 2, cz = ((cand / n) | 0) / (n - 1) * size - size / 2;
      if (ranges.every(o => o.spine.every(p => Math.hypot(p.x - cx, p.z - cz) > size * 0.12))) { pickIndex = cand; break; }
    }
    const cx = (pickIndex % n) / (n - 1) * size - size / 2, cz = ((pickIndex / n) | 0) / (n - 1) * size - size / 2;
    const angle = axis + R(-0.45, 0.45) + (r === rangeCount - 1 && rangeCount > 2 ? R(0.6, 1.1) : 0);
    const length = R(preset.ranges.length[0], preset.ranges.length[1]) * size, steps = 28;
    const spine: { x: number; z: number }[] = [];
    const wig = R(0.05, 0.12) * size, phase = rand() * 9;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps - 0.5, along = t * length;
      const lateral = ridge.fbm(t * 3 + phase, r * 7.3, 3) * wig * 2.2;
      spine.push({ x: cx + Math.cos(angle) * along - Math.sin(angle) * lateral, z: cz + Math.sin(angle) * along + Math.cos(angle) * lateral });
    }
    ranges.push({ spine, width: R(preset.ranges.width[0], preset.ranges.width[1]) * size, height: R(preset.ranges.height[0], preset.ranges.height[1]) * preset.relief, length });
  }
  const uplift = new Float32Array(total), uMeters = new Float32Array(total);
  for (let z = 0; z < n; z++) {
    for (let x = 0; x < n; x++) {
      const i = at(x, z);
      if (sea[i]) continue;
      const px = x * cell - size / 2, pz = z * cell - size / 2;
      let sum = 0, peak = 0;
      for (let r = 0; r < ranges.length; r++) {
        const rg = ranges[r];
        let dBest = 1e9, tBest = 0;
        for (let s = 1; s < rg.spine.length; s++) {
          const a = rg.spine[s - 1], b = rg.spine[s], dx = b.x - a.x, dz = b.z - a.z, len2 = dx * dx + dz * dz || 1;
          const t = clamp(((px - a.x) * dx + (pz - a.z) * dz) / len2), d = Math.hypot(px - a.x - dx * t, pz - a.z - dz * t);
          if (d < dBest) { dBest = d; tBest = (s - 1 + t) / (rg.spine.length - 1); }
        }
        const taper = smoothstep(0, 0.2, tBest) * smoothstep(0, 0.2, 1 - tBest);
        const crest = 0.62 + 0.38 * (ridge.fbm(tBest * 5 + r * 3.1, 2.7, 3) * 0.5 + 0.5) * 1.6;
        const w = rg.width * 0.8 * (0.8 + 0.5 * ridge.fbm(px / size * 3 + r, pz / size * 3, 2));
        const body = Math.exp(-((dBest / w) * (dBest / w))), foot = Math.exp(-((dBest / (w * 2.8)) * (dBest / (w * 2.8)))) * 0.26;
        const e = taper * (body * Math.min(1.25, crest) + foot);
        sum += e * rg.height * 0.58;
        peak = Math.max(peak, e);
      }
      const coast = preset.ranges.inland ? smoothstep(0.012 * size, 0.1 * size, signed[i]) : smoothstep(0, 0.035 * size, signed[i]);
      uMeters[i] = sum * coast;
      uplift[i] = clamp(peak * coast);
    }
  }
  // ---- 4. base relief ----------------------------------------------------------
  const h = new Float32Array(total);
  const bmax = 9 + 9 * preset.plateau + 6 * preset.relief;
  for (let z = 0; z < n; z++) {
    for (let x = 0; x < n; x++) {
      const i = at(x, z), u = x / (n - 1) - 0.5, v = z / (n - 1) - 0.5;
      if (sea[i]) {
        const d = -signed[i];
        h[i] = -(1.1 + Math.min(14, d * 0.028 + 0.0000085 * d * d));
        continue;
      }
      const D = signed[i];
      let y = 0.42 + 0.06 * Math.min(D, 28) + bmax * (1 - Math.exp(-D / (0.1 * size))) * smoothstep(0, 40, D);
      const wu = u + hill.fbm(u * 2 + 1, v * 2, 2) * 0.12, wv = v + hill.fbm(u * 2 - 5, v * 2 + 3, 2) * 0.12;
      y += hill.fbm(wu * 3.6, wv * 3.6, 4) * 15 * preset.hills * smoothstep(8, 0.06 * size, D);
      y += hill.ridged(wu * 7.4 + 4, wv * 7.4, 4) * 9 * preset.hills * smoothstep(8, 0.08 * size, D);
      y += hill.fbm(u * 19 + 4, v * 19, 3) * 1.6 * preset.hills * smoothstep(6, 0.04 * size, D);
      y += uMeters[i];
      const rough = clamp(uMeters[i] / 40 + 0.06);
      y += (ridge.ridged(u * 6.2, v * 6.2, 5) - 0.38) * 24 * preset.relief * rough;
      h[i] = Math.max(0.35, y);
    }
  }
  // plateaus / terraces: benches separated by short scarps, later softened by erosion
  if (preset.plateau > 0) {
    const level = 8 + 6 * rand(), zone = new Noise(seed ^ 0x3d4e5f);
    for (let i = 0; i < total; i++) {
      if (sea[i] || signed[i] < 25) continue;
      const u = (i % n) / (n - 1) - 0.5, v = ((i / n) | 0) / (n - 1) - 0.5;
      const z = smoothstep(0.05, 0.4, zone.fbm(u * 1.8 + 9, v * 1.8, 3) + preset.plateau - 0.42) * smoothstep(25, 120, signed[i]);
      if (z <= 0) continue;
      const q = h[i] / level, f = q - Math.floor(q), terraced = (Math.floor(q) + smoothstep(0.2, 0.85, f)) * level;
      h[i] = h[i] * (1 - z * 0.7) + terraced * z * 0.7;
    }
  }
  // ---- 4b. geology: rock provinces, tilt, and faults are set before erosion so differential erosion can act on them ----
  const geo = opts.geology ? planGeology(seed, size, n, cell, preset.geo, preset.id, sea, signed, ranges, uplift, axis, h) : undefined;
  if (geo) applyFaults(geo, h, sea);
  // ---- 5. stream-power erosion ------------------------------------------------
  const iterations = opts.erosionIterations ?? 26, jitter = new Float32Array(total);
  for (let i = 0; i < total; i++) jitter[i] = 0.8 + 0.4 * rand();
  const K = 0.0021 * (cell / 6), m = 0.5, kd = 0.07, tmp = new Float32Array(total), area = cell * cell;
  const eRock = geo ? new Float32Array(total) : undefined;
  for (let it = 0; it < iterations; it++) {
    // hard rock resists the river (knickpoints, cliffs, mesas survive); soft shale and sediment are stripped
    if (geo && eRock) for (let i = 0; i < total; i++) eRock[i] = sea[i] ? 1 : erodibilityAt(geo, i, h[i]);
    const flow = priorityFlood(h, n, sea, cell, 0.004, jitter);
    const A = accumulate(flow, area, total);
    const { order, rec, filled } = flow;
    for (let t = 0; t < order.length; t++) {
      const i = order[t], r = rec[i];
      if (r < 0) continue;
      const dist = cell * (Math.abs((i % n) - (r % n)) + Math.abs(((i / n) | 0) - ((r / n) | 0)) === 2 ? Math.SQRT2 : 1);
      const k = (K * (eRock ? eRock[i] : 1) * Math.pow(A[i], m)) / dist;
      const hr = sea[r] ? 0 : h[r];
      const next = (filled[i] + k * hr) / (1 + k);
      h[i] = Math.max(sea[r] ? 0.3 : hr + 0.002, next);
    }
    // hillslope diffusion
    tmp.set(h);
    for (let z = 1; z < n - 1; z++) {
      for (let x = 1; x < n - 1; x++) {
        const i = at(x, z);
        if (sea[i]) continue;
        const avg = (tmp[i - 1] + tmp[i + 1] + tmp[i - n] + tmp[i + n]) * 0.25;
        h[i] = Math.max(0.3, tmp[i] + (avg - tmp[i]) * (eRock ? kd * Math.sqrt(eRock[i]) : kd));
      }
    }
  }
  // ---- 5b. geology after erosion: banded strata, domes, young volcanoes, rift lakes ---------------------------------------------
  if (geo) {
    stratigraphicRelief(geo, h, sea, signed);
    inselbergs(geo, h, sea);
    volcanoes(geo, h, sea, signed, uplift);
    riftFeatures(geo, h, sea);
  }
  // ---- 6. sub-cell coastline: place the waterline from the continuous land potential, not the cell mask,
  // so shores are smooth curves at 1 m scale (bays and capes survive; staircase teeth do not)
  const coast0 = h.slice();
  for (let z = 1; z < n - 1; z++) {
    for (let x = 1; x < n - 1; x++) {
      const i = at(x, z), gx = (C[i + 1] - C[i - 1]) / (2 * cell), gz = (C[i + n] - C[i - n]) / (2 * cell), g = Math.hypot(gx, gz);
      if (g < 1e-7 || (C[i] > 0) === !!sea[i]) continue;
      const d = C[i] / g;
      if (Math.abs(d) > 2.4 * cell) continue;
      const w = smoothstep(1.2 * cell, 2.4 * cell, Math.abs(d)), v = d * 0.08 * (1 - w) + coast0[i] * w;
      h[i] = sea[i] ? Math.min(-0.04, v) : Math.max(0.04, v);
    }
  }
  return { n, size, cell, h, sea, signed, ranges, uplift, axis, landFraction, geo };
}
export { DX, DZ };
