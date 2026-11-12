/** Structural geology of a map: which rock lies where, how its strata dip, where faults and volcanoes are, and how
 * erodible each cell is. Everything is a pure function of the seed and the tectonic context that `buildTerrain` already
 * produced (ranges, uplift, coast distance); it never touches the base generator's random stream.
 *
 * Model (docs/GEOLOGY_MODEL.md): a map is a *structural coordinate* s = height + tilt + phase. Sedimentary provinces
 * are a repeating stack of beds (hard sandstone / limestone / basalt over soft shale / ash). The bed under a cell is
 * found from s alone, so strata band, rock id and outcrop pattern all follow from the same cause. Beds dip away from
 * range axes, so hard beds outcrop as long strike ridges (hogbacks, cuestas) at range fronts and as flat benches on
 * level ground. */
import { Noise, clamp, smoothstep, distanceTransform } from '../noise';
import { mulberry32 } from '../../rng';
import { ROCKS, HARD, RECIPES, TAG, TAG_PRIORITY, type RecipeName } from './rocks';
import type { GeoSpec } from '../presets';
import type { Range } from '../terrain';

export const PROV = { none: 0, granite: 1, sandstone: 2, limestone: 3, shale: 4, basalt: 5, volcanic: 6, sediment: 7 } as const;
const PROV_RECIPE: Partial<Record<number, RecipeName>> = { 2: 'sandstone-series', 3: 'limestone-series', 4: 'shale-series', 5: 'basalt-flows', 6: 'volcanic-pile' };
const SINGLE_ROCK: Record<number, number> = { 1: 1, 7: 7 };
export type Landmark = { tag: string; x: number; z: number; radius: number; note?: string };
export type LakeOrigin = { x: number; z: number; origin: string; radius: number };
type Province = { beds: { rock: number; thick: number; start: number; hard: boolean }[]; period: number; phase: number; delta: Float32Array };
const TABLE = 1024;
const ss = (t: number) => t * t * (3 - 2 * t);
export type Fault = { cx: number; cz: number; ux: number; uz: number; len: number; throwM: number; halfWidth?: number };

export type GeoState = {
  n: number; cell: number; size: number; half: number;
  spec: GeoSpec; presetId: string;
  rng: () => number; noise: Noise; seed: number;
  /** Province id per working cell (PROV). */
  prov: Uint8Array;
  /** Structural tilt in metres: how much the bed index shifts across the map. */
  tilt: Float32Array;
  /** Painted landform tag per working cell. */
  tag: Uint8Array;
  landmarks: Landmark[];
  lakeOrigins: LakeOrigin[];
  provinces: Province[];
  rift?: Fault & { floorDrop: number };
  faults: Fault[];
  /** Mean dip steepness (rise per metre) at range fronts; drives hogbacks. */
  dipSteepness: number;
  /** Fans and braided zones found by the surface stage, read by the river stage. */
  fans: { x: number; z: number; r: number }[];
  glacierValleys: { x: number; z: number }[][];
  volcanoes: { x: number; z: number; R: number; caldera: boolean }[];
  playas?: { x: number; z: number; rx: number; rz: number; ang: number }[];
  notes: Record<string, number>;
};

export const paint = (st: GeoState, i: number, name: string) => { const id = TAG[name]; if (TAG_PRIORITY[id] > TAG_PRIORITY[st.tag[i]]) st.tag[i] = id; };
export const idxOf = (st: GeoState, x: number, z: number) => Math.max(0, Math.min(st.n - 1, Math.round((z + st.half) / st.cell))) * st.n + Math.max(0, Math.min(st.n - 1, Math.round((x + st.half) / st.cell)));
export const cellX = (st: GeoState, i: number) => (i % st.n) * st.cell - st.half;
export const cellZ = (st: GeoState, i: number) => Math.floor(i / st.n) * st.cell - st.half;

function buildProvince(name: RecipeName, rng: () => number): Province {
  const beds: Province['beds'] = [];
  let start = 0;
  for (const [rock, thick] of RECIPES[name]) {
    const t = thick * (0.88 + 0.24 * rng());
    beds.push({ rock, thick: t, start, hard: ROCKS[rock].hardness >= HARD });
    start += t;
  }
  const period = start, delta = new Float32Array(TABLE);
  for (let k = 0; k < TABLE; k++) {
    const u = (k / TABLE) * period;
    let b = beds.length - 1;
    for (let q = 0; q < beds.length; q++) if (u < beds[q].start + beds[q].thick) { b = q; break; }
    const bed = beds[b], t = clamp((u - bed.start) / bed.thick), phi = bed.hard ? ss(ss(ss(t))) : t;
    delta[k] = bed.start + bed.thick * phi - u;
  }
  return { beds, period, phase: rng() * period, delta };
}
const wrap = (v: number, p: number) => ((v % p) + p) % p;

export function planGeology(seed: number, size: number, n: number, cell: number, spec: GeoSpec, presetId: string, sea: Uint8Array, signed: Float32Array, ranges: Range[], uplift: Float32Array, axis: number, h0: Float32Array): GeoState {
  const total = n * n, half = size / 2, rng = mulberry32(seed ^ 0x6e01091c), noise = new Noise(seed ^ 0x2b7e1516);
  const R = (a: number, b: number) => a + (b - a) * rng();
  const scale = size / 1040;
  const prov = new Uint8Array(total);
  const px = (i: number) => (i % n) * cell - half, pz = (i: number) => Math.floor(i / n) * cell - half;
  // ---- sedimentary platform: warped Voronoi zones, each one layered recipe ----------------------------------------
  const mix = spec.mix, mixTotal = mix.sandstone + mix.limestone + mix.shale;
  const pickType = () => { const r = rng() * mixTotal; return r < mix.sandstone ? PROV.sandstone : r < mix.sandstone + mix.limestone ? PROV.limestone : PROV.shale; };
  const seeds = Array.from({ length: 5 + ((rng() * 3) | 0) }, () => ({ x: R(-0.42, 0.42) * size, z: R(-0.42, 0.42) * size, type: pickType() }));
  // guarantee every type with weight >= 0.25 appears at least once
  (['sandstone', 'limestone', 'shale'] as const).forEach((k, q) => { if (mix[k] >= 0.25 && !seeds.some(s => s.type === PROV[k])) seeds[q].type = PROV[k]; });
  for (let i = 0; i < total; i++) {
    if (sea[i]) continue;
    const x = px(i), z = pz(i), wx = x + 70 * scale * noise.fbm(x * 0.004 + 2, z * 0.004, 3), wz = z + 70 * scale * noise.fbm(x * 0.004 - 5, z * 0.004 + 9, 3);
    let best = 1e18, type: number = PROV.shale;
    for (const s of seeds) { const d = (s.x - wx) ** 2 + (s.z - wz) ** 2; if (d < best) { best = d; type = s.type; } }
    prov[i] = type;
  }
  // ---- structural tilt: beds dip away from every range axis, gently seaward elsewhere ---------------------------------------
  const spineMask = new Uint8Array(total);
  let widthSum = 0;
  for (const rg of ranges) {
    widthSum += rg.width;
    for (let s = 1; s < rg.spine.length; s++) {
      const a = rg.spine[s - 1], b = rg.spine[s], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (cell * 0.5)));
      for (let q = 0; q <= steps; q++) {
        const x = Math.round((a.x + (b.x - a.x) * q / steps + half) / cell), z = Math.round((a.z + (b.z - a.z) * q / steps + half) / cell);
        if (x >= 0 && z >= 0 && x < n && z < n) spineMask[z * n + x] = 1;
      }
    }
  }
  const spineDist = ranges.length ? distanceTransform(spineMask, n) : new Float32Array(total).fill(1e4);
  const L = Math.max(40, (ranges.length ? widthSum / ranges.length : 60) * 1.7), steep = R(0.55, 1), A = steep * L * 0.95, dipAngle = rng() * Math.PI * 2;
  const tilt = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    const d = spineDist[i] * cell, x = px(i), z = pz(i);
    tilt[i] = A * (1 - Math.exp(-d / L)) + 0.035 * d + 0.02 * (Math.cos(dipAngle) * x + Math.sin(dipAngle) * z) + 3.2 * noise.fbm(x * 0.006 + 11, z * 0.006, 3);
  }
  // ---- crystalline basement: range cores and plutons -----------------------------------------------------------------------
  const coreThreshold = 0.46 - 0.15 * spec.granite;
  for (let i = 0; i < total; i++) if (!sea[i] && uplift[i] > coreThreshold) prov[i] = PROV.granite;
  const blob = (cx: number, cz: number, rx: number, rz: number, ang: number, value: number, ragged: number, only?: (i: number) => boolean) => {
    const c = Math.cos(ang), s = Math.sin(ang), reach = Math.max(rx, rz) * 1.4;
    for (let zz = Math.max(0, Math.floor((cz - reach + half) / cell)); zz <= Math.min(n - 1, Math.ceil((cz + reach + half) / cell)); zz++) {
      for (let xx = Math.max(0, Math.floor((cx - reach + half) / cell)); xx <= Math.min(n - 1, Math.ceil((cx + reach + half) / cell)); xx++) {
        const i = zz * n + xx;
        if (sea[i] || (only && !only(i))) continue;
        const dx = xx * cell - half - cx, dz = zz * cell - half - cz, u = dx * c + dz * s, v = -dx * s + dz * c;
        const r = Math.hypot(u / rx, v / rz) * (1 + ragged * noise.fbm(xx * 0.07 + cx, zz * 0.07, 2));
        if (r < 1) prov[i] = value;
      }
    }
  };
  const interior = (minSigned: number, maxUplift = 0.3) => {
    for (let t = 0; t < 400; t++) {
      const i = Math.floor(rng() * total);
      if (!sea[i] && signed[i] > minSigned && uplift[i] < maxUplift) return i;
    }
    return -1;
  };
  const plutons = Math.round(spec.granite * (2 + rng() * 3));
  for (let k = 0; k < plutons; k++) { const i = interior(50 * scale, 0.5); if (i >= 0) blob(px(i), pz(i), R(45, 95) * scale, R(35, 70) * scale, rng() * Math.PI, PROV.granite, 0.35); }
  // ---- flood-basalt plateau (traps) --------------------------------------------------------------------------------------------
  const basaltBlobs = rng() < spec.basalt * 1.4 ? (spec.basalt > 0.5 && rng() < 0.5 ? 2 : 1) : 0;
  for (let k = 0; k < basaltBlobs; k++) { const i = interior(70 * scale, 0.25); if (i >= 0) blob(px(i), pz(i), R(85, 150) * scale, R(60, 110) * scale, rng() * Math.PI, PROV.basalt, 0.3, j => prov[j] !== PROV.granite || uplift[j] < 0.3); }
  // ---- coastal plain and floodplain basin: unconsolidated sediment on low ground away from the ranges -----------------
  const lowland = presetId === 'river-valley' ? 9 : 5;
  for (let i = 0; i < total; i++) if (!sea[i] && h0[i] < lowland && uplift[i] < 0.03 && prov[i] !== PROV.granite && prov[i] !== PROV.basalt && spineDist[i] * cell > L * 1.6) prov[i] = PROV.sediment;
  const provinces: Province[] = [];
  for (const [id, name] of Object.entries(PROV_RECIPE)) provinces[Number(id)] = buildProvince(name!, rng);
  const st: GeoState = {
    n, cell, size, half, spec, presetId, rng, noise, seed, prov, tilt, tag: new Uint8Array(total), landmarks: [], lakeOrigins: [], provinces,
    faults: [], dipSteepness: steep, fans: [], glacierValleys: [], volcanoes: [], notes: {},
  };
  // ---- faults and rift ------------------------------------------------------------------------------------------------------------
  const lineThrough = (minSigned: number, lenLo: number, lenHi: number, angle: number) => {
    const i = interior(minSigned, 0.5);
    if (i < 0) return null;
    return { cx: px(i), cz: pz(i), ux: Math.cos(angle), uz: Math.sin(angle), len: R(lenLo, lenHi) * size, throwM: 0 };
  };
  if (rng() < spec.rift * 1.1) {
    const f = lineThrough(110 * scale, 0.3, 0.5, axis + (rng() < 0.5 ? 0 : Math.PI / 2) + R(-0.25, 0.25));
    if (f) st.rift = { ...f, throwM: R(7, 12), halfWidth: R(32, 50) * scale, floorDrop: R(12, 24) };
  }
  const scarps = rng() < 0.35 + 0.55 * spec.rift ? 1 + (rng() < 0.3 ? 1 : 0) : 0;
  for (let k = 0; k < scarps; k++) { const f = lineThrough(90 * scale, 0.28, 0.46, axis + R(-0.55, 0.55)); if (f) st.faults.push({ ...f, throwM: R(8, 17) * (rng() < 0.5 ? 1 : -1) }); }
  return st;
}

/** Along-strike and across-strike coordinates of a fault line, plus its taper. */
function faultFrame(f: Fault, x: number, z: number) {
  const dx = x - f.cx, dz = z - f.cz, along = dx * f.ux + dz * f.uz, across = -dx * f.uz + dz * f.ux, t = along / f.len + 0.5;
  return { along, across, env: smoothstep(0, 0.14, t) * smoothstep(0, 0.14, 1 - t) };
}

/** Normal faults and the rift valley are imposed before erosion so rivers and slope retreat then shape the scarps. */
export function applyFaults(st: GeoState, h: Float32Array, sea: Uint8Array) {
  const { n, cell, half } = st;
  if (!st.rift && !st.faults.length) return;
  for (let i = 0; i < h.length; i++) {
    if (sea[i]) continue;
    const x = (i % n) * cell - half, z = Math.floor(i / n) * cell - half;
    let dh = 0;
    if (st.rift) {
      const { across, env } = faultFrame(st.rift, x, z), a = Math.abs(across), w = st.rift.halfWidth!;
      // graben floor between two faults, uplifted shoulders either side (flank uplift of a rift)
      dh += env * (st.rift.throwM * Math.exp(-(((a - w * 1.25) / (w * 0.85)) ** 2)) * (a > w * 0.6 ? 1 : 0) - st.rift.floorDrop * (1 - smoothstep(w * 0.78, w * 1.12, a)));
    }
    for (const f of st.faults) { const { across, env } = faultFrame(f, x, z); dh += f.throwM * env * (smoothstep(-5, 5, across) - 0.5); }
    h[i] = Math.max(0.55, h[i] + dh);
  }
}

export const rockAt = (st: GeoState, i: number, h: number): number => {
  const pv = st.prov[i];
  if (!pv) return 0;
  const single = SINGLE_ROCK[pv];
  if (single !== undefined) return single;
  const p = st.provinces[pv], u = wrap(h + st.tilt[i] + p.phase, p.period);
  for (const b of p.beds) if (u < b.start + b.thick) return b.rock;
  return p.beds[p.beds.length - 1].rock;
};
/** Stratum index within the local stack (0 = lowest) or 255 where the rock is not layered. */
export const bandAt = (st: GeoState, i: number, h: number): number => {
  const p = st.provinces[st.prov[i]];
  if (!p) return 255;
  const u = wrap(h + st.tilt[i] + st.provinces[st.prov[i]].phase, p.period);
  for (let q = 0; q < p.beds.length; q++) if (u < p.beds[q].start + p.beds[q].thick) return q;
  return p.beds.length - 1;
};
/** Rock of the bed beneath the one at the surface (the same rock where nothing is layered). */
export const underAt = (st: GeoState, i: number, h: number): number => {
  const p = st.provinces[st.prov[i]];
  if (!p) return rockAt(st, i, h);
  const b = bandAt(st, i, h);
  return p.beds[(b + p.beds.length - 1) % p.beds.length].rock;
};
export const erodibilityAt = (st: GeoState, i: number, h: number) => ROCKS[rockAt(st, i, h)].erodibility;
/** Bed index of a stratified cell and the fractional position within it (0 bottom, 1 top). */
export const bedPosition = (st: GeoState, i: number, h: number) => {
  const p = st.provinces[st.prov[i]];
  if (!p) return null;
  const u = wrap(h + st.tilt[i] + p.phase, p.period);
  for (let q = 0; q < p.beds.length; q++) if (u < p.beds[q].start + p.beds[q].thick) return { band: q, t: (u - p.beds[q].start) / p.beds[q].thick, hard: p.beds[q].hard, thick: p.beds[q].thick };
  return null;
};

/** Hard-bed relief: each hard bed becomes a cliff band with a flat tread above and below, each soft bed a plain slope.
 * Gain grows with dip, so steeply dipping hard beds stand up as hogbacks. */
export function stratigraphicRelief(st: GeoState, h: Float32Array, sea: Uint8Array, signed: Float32Array) {
  const { n, cell } = st, total = n * n;
  let mask = new Float32Array(total);
  for (let i = 0; i < total; i++) mask[i] = st.provinces[st.prov[i]] ? 1 : 0;
  for (let pass = 0; pass < 3; pass++) {
    const next = new Float32Array(total);
    for (let z = 0; z < n; z++) for (let x = 0; x < n; x++) {
      let s = 0, c = 0;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) { const X = x + dx, Z = z + dz; if (X >= 0 && Z >= 0 && X < n && Z < n) { s += mask[Z * n + X]; c++; } }
      next[z * n + x] = s / c;
    }
    mask = next;
  }
  const out = Float32Array.from(h);
  for (let z = 1; z < n - 1; z++) for (let x = 1; x < n - 1; x++) {
    const i = z * n + x, p = st.provinces[st.prov[i]];
    if (!p || sea[i]) continue;
    const w = mask[i] * smoothstep(28, 70, signed[i]);
    if (w <= 0.01) continue;
    const gx = (st.tilt[i + 1] - st.tilt[i - 1]) / (2 * cell), gz = (st.tilt[i + n] - st.tilt[i - n]) / (2 * cell), g = Math.hypot(gx, gz);
    // Gentle ground keeps its shape (a plain does not grow stairs); the remap bites on slopes (valley walls, scarps) and
    // on steeply dipping beds, where outcrop relief is real.
    const raw = Math.hypot(h[i + 1] - h[i - 1], h[i + n] - h[i - n]) / (2 * cell);
    const gain = (smoothstep(0.07, 0.3, raw) + 2.6 * smoothstep(0.1, 0.5, g)) * (st.prov[i] === PROV.basalt ? 1.35 : 1);
    const u = wrap(h[i] + st.tilt[i] + p.phase, p.period), k = Math.min(TABLE - 1, Math.floor((u / p.period) * TABLE));
    out[i] = Math.max(0.5, h[i] + w * gain * p.delta[k]);
  }
  // one light binomial pass on the added relief only: cliff bands stay crisp but lose the cell-sized staircase along their edges
  const add = new Float32Array(total);
  for (let i = 0; i < total; i++) add[i] = out[i] - h[i];
  for (let z = 1; z < n - 1; z++) for (let x = 1; x < n - 1; x++) {
    const i = z * n + x;
    if (add[i] === 0 && add[i - 1] === 0 && add[i + 1] === 0 && add[i - n] === 0 && add[i + n] === 0) continue;
    const sm = (add[i] * 4 + add[i - 1] * 2 + add[i + 1] * 2 + add[i - n] * 2 + add[i + n] * 2 + add[i - n - 1] + add[i - n + 1] + add[i + n - 1] + add[i + n + 1]) / 16;
    out[i] = Math.max(0.5, h[i] + sm);
  }
  h.set(out);
}

/** Rounded granite domes (inselbergs) standing above shield plains. */
export function inselbergs(st: GeoState, h: Float32Array, sea: Uint8Array) {
  const { n, cell, half, rng } = st, total = n * n, scale = st.size / 1040;
  if (st.spec.granite < 0.2) return;
  const want = Math.round(2 + st.spec.granite * 5), done: { x: number; z: number }[] = [];
  for (let t = 0; t < 3000 && done.length < want; t++) {
    const i = Math.floor(rng() * total);
    if (sea[i] || st.prov[i] !== PROV.granite) continue;
    const x = cellX(st, i), z = cellZ(st, i);
    if (done.some(d => Math.hypot(d.x - x, d.z - z) < 70 * scale)) continue;
    // only where granite is a plain, not inside a range (a dome on a range would just read as a bump)
    const slope = Math.abs(h[i + 1] - h[i - 1]) / (2 * cell);
    if (slope > 0.2 || h[i] > 60) continue;
    done.push({ x, z });
    const Rd = (12 + rng() * 16) * scale, Hd = 10 + rng() * 14, sx = 1 + rng() * 0.5, ang = rng() * Math.PI, c = Math.cos(ang), s = Math.sin(ang), reach = Rd * sx * 1.2;
    for (let zz = Math.max(0, Math.floor((z - reach + half) / cell)); zz <= Math.min(n - 1, Math.ceil((z + reach + half) / cell)); zz++) {
      for (let xx = Math.max(0, Math.floor((x - reach + half) / cell)); xx <= Math.min(n - 1, Math.ceil((x + reach + half) / cell)); xx++) {
        const j = zz * n + xx;
        if (sea[j]) continue;
        const dx = xx * cell - half - x, dz = zz * cell - half - z, u = (dx * c + dz * s) / (Rd * sx), v = (-dx * s + dz * c) / Rd, r2 = u * u + v * v;
        if (r2 >= 1) continue;
        h[j] += Hd * Math.pow(1 - r2, 0.5) * (0.9 + 0.1 * st.noise.at(xx * 0.4, zz * 0.4));
        paint(st, j, 'inselberg');
      }
    }
    st.landmarks.push({ tag: 'inselberg', x, z, radius: Rd * 1.3 });
  }
}

/** Young volcanoes (after erosion, so they are crisp): cone, optional caldera or crater, and a lava flow. */
export function volcanoes(st: GeoState, h: Float32Array, sea: Uint8Array, signed: Float32Array, uplift: Float32Array) {
  const { n, cell, half, rng, noise } = st, total = n * n, scale = st.size / 1040;
  const want = Math.round(st.spec.volcanic * (1 + 2 * rng()));
  if (want <= 0) return;
  // inland candidates ranked by distance from the sea, so island volcanoes crown the island
  const cands: number[] = [];
  for (let i = 0; i < total; i++) if (!sea[i] && signed[i] > 34 * scale && uplift[i] < 0.5) cands.push(i);
  if (!cands.length) return;
  cands.sort((a, b) => signed[b] - signed[a]);
  const top = cands.slice(0, Math.max(10, Math.floor(cands.length * (st.presetId === 'archipelago' ? 0.5 : 0.25))));
  for (let k = 0; k < want; k++) {
    let site = -1;
    for (let t = 0; t < 60; t++) {
      const i = top[Math.floor(rng() * top.length)], x = cellX(st, i), z = cellZ(st, i);
      if (st.volcanoes.every(v => Math.hypot(v.x - x, v.z - z) > 150 * scale)) { site = i; break; }
    }
    if (site < 0) break;
    const x = cellX(st, site), z = cellZ(st, site), R = clamp(signed[site] * 1.05 + 28, 52, 105 * scale + 20), Hc = (24 + rng() * 22) * (0.8 + 0.5 * st.spec.volcanic);
    const caldera = k === 0 ? rng() < 0.65 : rng() < 0.25, rc = (caldera ? 0.36 : 0.12) * R, depth = caldera ? 13 + rng() * 9 : 4 + rng() * 3;
    const P = (r: number) => Hc * Math.pow(1 - clamp(r / R), 1.55);
    for (let zz = Math.max(0, Math.floor((z - R * 1.2 + half) / cell)); zz <= Math.min(n - 1, Math.ceil((z + R * 1.2 + half) / cell)); zz++) {
      for (let xx = Math.max(0, Math.floor((x - R * 1.2 + half) / cell)); xx <= Math.min(n - 1, Math.ceil((x + R * 1.2 + half) / cell)); xx++) {
        const j = zz * n + xx;
        if (sea[j]) continue;
        const dx = xx * cell - half - x, dz = zz * cell - half - z, r = Math.hypot(dx, dz), ang = Math.atan2(dz, dx);
        if (r >= R * 1.15) continue;
        const wob = 1 + 0.13 * noise.at(Math.cos(ang) * 1.6 + k * 7, Math.sin(ang) * 1.6), rcw = rc * wob;
        // radial gullies on the flanks, strongest mid-slope
        const gully = 1 + 0.07 * noise.at(ang * 3.1 + k * 11, r * 0.05) * smoothstep(rc, R * 0.5, r);
        let add = P(Math.max(r, rcw)) * gully;
        if (r < rcw) add -= depth * (1 - smoothstep(0.6 * rcw, rcw, r));
        else add += 1.8 * Math.exp(-(((r - rcw) / (0.07 * R)) ** 2));
        h[j] += add;
        st.prov[j] = PROV.volcanic;
        if (r < rcw * 1.05) paint(st, j, 'caldera'); else if (r < R * 0.95) paint(st, j, 'volcanic-cone');
      }
    }
    st.volcanoes.push({ x, z, R, caldera });
    st.landmarks.push({ tag: caldera ? 'caldera' : 'volcanic-cone', x, z, radius: R });
    st.lakeOrigins.push({ x, z, origin: caldera ? 'caldera' : 'crater', radius: rc });
    // lava flow: steepest descent from the flank for a few hundred metres, raised, rough and basaltic
    const a0 = rng() * Math.PI * 2;
    let cx = Math.round((x + Math.cos(a0) * R * 0.55 + half) / cell), cz = Math.round((z + Math.sin(a0) * R * 0.55 + half) / cell);
    const flowLen = Math.round((50 + rng() * 40) * scale);
    for (let step = 0; step < flowLen; step++) {
      if (cx < 2 || cz < 2 || cx >= n - 2 || cz >= n - 2) break;
      const i = cz * n + cx;
      if (sea[i]) break;
      const wRad = 2.3 + 0.9 * noise.at(step * 0.3 + k, 3.3) + step / flowLen * 0.7;
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        const j = (cz + dz) * n + cx + dx, d = Math.hypot(dx, dz);
        if (d > wRad || sea[j]) continue;
        const lump = 1.1 + 1.0 * (noise.at((cx + dx) * 0.55, (cz + dz) * 0.55) * 0.5 + 0.5);
        h[j] += lump * (1 - d / (wRad + 0.5)) * (1 - 0.35 * step / flowLen);
        st.prov[j] = PROV.basalt;
        paint(st, j, 'lava-field');
      }
      let bi = -1, bh = h[i];
      for (let d2 = 0; d2 < 8; d2++) {
        const DXs = [1, -1, 0, 0, 1, 1, -1, -1], DZs = [0, 0, 1, -1, 1, -1, 1, -1], j = (cz + DZs[d2]) * n + cx + DXs[d2];
        if (h[j] < bh - 0.02) { bh = h[j]; bi = j; }
      }
      if (bi < 0) break;
      cx = bi % n; cz = Math.floor(bi / n);
    }
  }
}

/** Dig lake basins along a rift floor (hydrology turns closed depressions into lakes); tag the scarps and the floor. */
export function riftFeatures(st: GeoState, h: Float32Array, sea: Uint8Array) {
  const { n, cell, half } = st;
  if (st.rift) {
    const f = st.rift, w = f.halfWidth!;
    for (let i = 0; i < h.length; i++) {
      if (sea[i]) continue;
      const x = cellX(st, i), z = cellZ(st, i), { across, env } = faultFrame(f, x, z), a = Math.abs(across);
      if (env > 0.4 && a < w * 0.85) paint(st, i, 'rift-valley');
      if (env > 0.3 && Math.abs(a - w * 0.95) < 7) { const g = Math.abs(h[Math.min(h.length - 1, i + 1)] - h[Math.max(0, i - 1)]) / (2 * cell); if (g > 0.14) paint(st, i, 'fault-scarp'); }
    }
    const basins = 1 + (st.rng() < 0.55 ? 1 : 0);
    for (let k = 0; k < basins; k++) {
      const t = (basins === 1 ? 0.5 : 0.3 + 0.4 * k) * f.len - f.len / 2 + (st.rng() - 0.5) * 0.1 * f.len, bx = f.cx + f.ux * t, bz = f.cz + f.uz * t;
      const major = (48 + st.rng() * 28) * st.size / 1040, minor = Math.min(major * 0.5, w * 0.8), depth = 5 + st.rng() * 3.5, pad = major * 1.9;
      for (let zz = Math.max(0, Math.floor((bz - pad + half) / cell)); zz <= Math.min(n - 1, Math.ceil((bz + pad + half) / cell)); zz++) {
        for (let xx = Math.max(0, Math.floor((bx - pad + half) / cell)); xx <= Math.min(n - 1, Math.ceil((bx + pad + half) / cell)); xx++) {
          const j = zz * n + xx;
          if (sea[j]) continue;
          const dx = xx * cell - half - bx, dz = zz * cell - half - bz, al = dx * f.ux + dz * f.uz, ac = -dx * f.uz + dz * f.ux;
          const rr = Math.hypot(al / major, ac / minor) * (1 + 0.15 * st.noise.fbm(xx * 0.08 + k * 5, zz * 0.08, 2));
          if (rr < 1.15) h[j] -= depth * smoothstep(1.15, 0.3, rr);
        }
      }
      st.lakeOrigins.push({ x: bx, z: bz, origin: 'tectonic-basin', radius: major });
    }
    const mid = f.len * 0.0;
    st.landmarks.push({ tag: 'rift-valley', x: f.cx + f.ux * mid, z: f.cz + f.uz * mid, radius: f.len / 2 });
  }
  for (const f of st.faults) {
    for (let i = 0; i < h.length; i++) {
      if (sea[i]) continue;
      const { across, env } = faultFrame(f, cellX(st, i), cellZ(st, i));
      if (env > 0.3 && Math.abs(across) < 9) { const g = Math.abs(h[Math.min(h.length - 1, i + n)] - h[Math.max(0, i - n)]) / (2 * cell), g2 = Math.abs(h[Math.min(h.length - 1, i + 1)] - h[Math.max(0, i - 1)]) / (2 * cell); if (Math.max(g, g2) > 0.16) paint(st, i, 'fault-scarp'); }
    }
    st.landmarks.push({ tag: 'fault-scarp', x: f.cx, z: f.cz, radius: f.len / 2 });
  }
}
