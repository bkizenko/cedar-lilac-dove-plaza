/** Continuous height function H(x,z) for a generated map: smooth base relief, micro detail,
 * river valleys with floodplains and wet beds, and carved lake basins. All world metres. */
import { Noise, clamp, smoothstep, sampleGrid } from './noise';
import type { Terrain } from './terrain';
import type { Hydrology, Chain } from './hydro';
import { WATER_Y } from '../constants';
import type { LocalWaterBody } from '../localWater';
type Seg = { ax: number; az: number; ay: number; aw: number; afp: number; bx: number; bz: number; by: number; bw: number; bfp: number; ford: boolean; chain: number };
const CELL = 32;
/** Catmull-Rom bicubic limited to the four nearest samples' range: no overshoot at coasts. */
function limitedCubic(f: Float32Array, n: number, size: number, x: number, z: number) {
  const segs = n - 1, gx = clamp((x / size + 0.5) * segs, 0, segs), gz = clamp((z / size + 0.5) * segs, 0, segs);
  const ix = Math.min(segs - 1, Math.floor(gx)), iz = Math.min(segs - 1, Math.floor(gz)), fx = gx - ix, fz = gz - iz;
  const cr = (p0: number, p1: number, p2: number, p3: number, t: number) => p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
  const row = (zz: number) => {
    const o = Math.max(0, Math.min(segs, zz)) * n;
    return cr(f[o + Math.max(0, ix - 1)], f[o + ix], f[o + ix + 1], f[o + Math.min(segs, ix + 2)], fx);
  };
  const v = cr(row(iz - 1), row(iz), row(iz + 1), row(iz + 2), fz);
  const i = iz * n + ix, a = f[i], b = f[i + 1], c = f[i + n], d = f[i + n + 1];
  return clamp(v, Math.min(a, b, c, d) - 0.0, Math.max(a, b, c, d) + 0.0);
}
export type LakeShape = { id: string; level: number; poly: { x: number; z: number }[]; x: number; z: number; rx: number; rz: number; bounds: [number, number, number, number] };
export class HeightField {
  readonly t: Terrain;
  readonly hy: Hydrology;
  readonly size: number;
  readonly detail: Noise;
  readonly rough: Float32Array;
  private grid = new Map<number, Seg[]>();
  private gw: number;
  lakes: LakeShape[] = [];
  constructor(t: Terrain, hy: Hydrology, seed: number) {
    this.t = t;
    this.hy = hy;
    this.size = t.size;
    this.detail = new Noise(seed ^ 0x3c6ef372);
    this.gw = Math.ceil(t.size / CELL);
    this.rough = new Float32Array(t.n * t.n);
    for (let i = 0; i < this.rough.length; i++) this.rough[i] = clamp(t.uplift[i] * 1.3 + 0.08);
    hy.chains.forEach((ch, k) => this.addChain(ch, k));
  }
  private addChain(ch: Chain, k: number) {
    const half = this.size / 2;
    for (let i = 1; i < ch.pts.length; i++) {
      const a = ch.pts[i - 1], b = ch.pts[i], seg: Seg = { ax: a.x, az: a.z, ay: a.y, aw: a.w, afp: a.fp, bx: b.x, bz: b.z, by: b.y, bw: b.w, bfp: b.fp, ford: !!(a.ford && b.ford), chain: k };
      const reach = Math.max(a.w, b.w) * 0.5 + Math.max(a.fp, b.fp) * 2.1 + 22;
      const x0 = Math.floor((Math.min(a.x, b.x) - reach + half) / CELL), x1 = Math.floor((Math.max(a.x, b.x) + reach + half) / CELL);
      const z0 = Math.floor((Math.min(a.z, b.z) - reach + half) / CELL), z1 = Math.floor((Math.max(a.z, b.z) + reach + half) / CELL);
      for (let z = Math.max(0, z0); z <= Math.min(this.gw - 1, z1); z++) {
        for (let x = Math.max(0, x0); x <= Math.min(this.gw - 1, x1); x++) {
          const key = z * this.gw + x, list = this.grid.get(key);
          if (list) list.push(seg);
          else this.grid.set(key, [seg]);
        }
      }
    }
  }
  /** Smooth relief only (metres above sea level 0) with micro detail but no rivers or lakes. */
  base(x: number, z: number) {
    const t = this.t;
    let h = limitedCubic(t.h, t.n, t.size, x, z);
    if (h > 0.3) {
      const r = sampleGrid(this.rough, t.n, t.size, x, z), coastFade = smoothstep(0, 14, sampleGrid(t.signed, t.n, t.size, x, z));
      const nz = this.detail.fbm(x * 0.045, z * 0.045, 3) * (0.35 + 1.6 * r) + this.detail.at(x * 0.19, z * 0.19) * 0.12;
      h += nz * coastFade;
    }
    return h;
  }
  /** World height (water level = WATER_Y). */
  at(x: number, z: number) {
    let h = this.base(x, z);
    const half = this.size / 2;
    const list = this.grid.get(clamp(Math.floor((z + half) / CELL), 0, this.gw - 1) * this.gw + clamp(Math.floor((x + half) / CELL), 0, this.gw - 1));
    if (list && h > -0.5) {
      // Every nearby segment offers a continuous valley profile (bed inside the channel, soft bank
      // outside); the offers are blended by proximity so there are no Voronoi seams or terraces.
      let emin = Infinity;
      const offers: { e: number; k: number; delta: number }[] = [];
      for (const s of list) {
        const dx = s.bx - s.ax, dz = s.bz - s.az, tt = clamp(((x - s.ax) * dx + (z - s.az) * dz) / (dx * dx + dz * dz || 1));
        const d = Math.hypot(x - s.ax - dx * tt, z - s.az - dz * tt), w = s.aw + (s.bw - s.aw) * tt, e = d - w * 0.5, fp = s.afp + (s.bfp - s.afp) * tt;
        const reach = fp * 2.1 + 20;
        if (e >= reach) continue;
        const y = s.ay + (s.by - s.ay) * tt;
        let target: number;
        if (e <= 0) {
          const q = clamp(-e / (w * 0.5)), depthMax = s.ford ? 0.22 : clamp(0.45 + 0.06 * w, 0.8, 1.7);
          target = y - depthMax * (1 - (1 - q) * (1 - q));
        } else target = y + 0.42 * smoothstep(0, 3, e) + 0.032 * e * (1 + e / (fp * 1.2));
        const k = 1 - smoothstep(fp, reach, e);
        offers.push({ e, k, delta: target - h });
        if (e < emin) emin = e;
      }
      if (offers.length) {
        let wsum = 0, dsum = 0, keep = 1;
        for (const o of offers) {
          const near = Math.max(0, o.e - emin) / 3, wt = o.k / (1 + near * near * near * near);
          wsum += wt; dsum += wt * o.delta; keep *= 1 - o.k;
        }
        if (wsum > 1e-6) {
          const raw = dsum / wsum, capUp = 1.2 + 40 * (1 - smoothstep(0, 4, emin));
          h += Math.min(raw, capUp) * (1 - keep);
        }
      }
    }
    for (const lake of this.lakes) {
      const [x0, z0, x1, z1] = lake.bounds;
      if (x < x0 - 20 || x > x1 + 20 || z < z0 - 20 || z > z1 + 20) continue;
      const sd = polyDistance(lake.poly, x, z);
      if (sd > 20) continue;
      const target = lake.level - 0.2 + 0.12 * Math.max(-20, sd), k = 1 - smoothstep(6, 20, sd);
      h = h + (Math.min(target, sd < 0 ? target : target) - h) * k;
    }
    return h + WATER_Y;
  }
}
/** Signed distance (negative inside) to a closed polygon. */
export function polyDistance(poly: { x: number; z: number }[], x: number, z: number) {
  let d2 = Infinity, inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j], dx = b.x - a.x, dz = b.z - a.z;
    if ((a.z > z) !== (b.z > z) && x < (dx * (z - a.z)) / (b.z - a.z) + a.x) inside = !inside;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1)), ex = x - a.x - t * dx, ez = z - a.z - t * dz;
    d2 = Math.min(d2, ex * ex + ez * ez);
  }
  const d = Math.sqrt(d2);
  return inside ? -d : d;
}
/** Extract smoothed lake shorelines from the base field at lake level and register them. */
export function carveLakes(hf: HeightField) {
  const { hy, t } = hf, res = 2.5;
  for (const lake of hy.lakes) {
    // grid over a window around the lake cells
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    const half = t.size / 2;
    for (const i of lake.cells) {
      const x = (i % t.n) * t.cell - half, z = ((i / t.n) | 0) * t.cell - half;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z);
    }
    const pad = 3 * t.cell;
    x0 -= pad; x1 += pad; z0 -= pad; z1 += pad;
    const w = Math.ceil((x1 - x0) / res) + 1, d = Math.ceil((z1 - z0) / res) + 1;
    const inside = new Uint8Array(w * d);
    for (let gz = 0; gz < d; gz++) for (let gx = 0; gx < w; gx++) inside[gz * w + gx] = hf.base(x0 + gx * res, z0 + gz * res) < lake.level - 0.02 ? 1 : 0;
    // keep only the component nearest the lake centroid
    const cx = Math.round((lake.x - x0) / res), cz = Math.round((lake.z - z0) / res);
    let seed = -1, bestD = Infinity;
    for (const i of lake.cells) {
      const gx = Math.round(((i % t.n) * t.cell - half - x0) / res), gz = Math.round((((i / t.n) | 0) * t.cell - half - z0) / res);
      const idx = gz * w + gx;
      if (gx >= 0 && gz >= 0 && gx < w && gz < d && inside[idx] && Math.hypot(gx - cx, gz - cz) < bestD) { bestD = Math.hypot(gx - cx, gz - cz); seed = idx; }
    }
    if (seed < 0) continue;
    const keep = new Uint8Array(w * d), stack = [seed];
    keep[seed] = 1;
    while (stack.length) {
      const c = stack.pop()!, gx = c % w, gz = (c / w) | 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = gx + dx, nz = gz + dz;
        if (nx < 0 || nz < 0 || nx >= w || nz >= d) continue;
        const j = nz * w + nx;
        if (inside[j] && !keep[j]) { keep[j] = 1; stack.push(j); }
      }
    }
    const boundary = traceBoundary(keep, w, d);
    if (boundary.length < 8) continue;
    let poly = boundary.map(([gx, gz]) => ({ x: x0 + gx * res, z: z0 + gz * res }));
    // thin the polygon and smooth with Chaikin
    const step = Math.max(1, Math.floor(poly.length / 64));
    poly = poly.filter((_, i) => i % step === 0);
    for (let pass = 0; pass < 2; pass++) {
      const next: { x: number; z: number }[] = [];
      for (let i = 0; i < poly.length; i++) {
        const a = poly[i], b = poly[(i + 1) % poly.length];
        next.push({ x: a.x * 0.75 + b.x * 0.25, z: a.z * 0.75 + b.z * 0.25 }, { x: a.x * 0.25 + b.x * 0.75, z: a.z * 0.25 + b.z * 0.75 });
      }
      poly = next;
    }
    const xs = poly.map(p => p.x), zs = poly.map(p => p.z);
    const bx0 = Math.min(...xs), bx1 = Math.max(...xs), bz0 = Math.min(...zs), bz1 = Math.max(...zs);
    hf.lakes.push({ id: lake.id, level: lake.level, poly, x: (bx0 + bx1) / 2, z: (bz0 + bz1) / 2, rx: (bx1 - bx0) / 2, rz: (bz1 - bz0) / 2, bounds: [bx0, bz0, bx1, bz1] });
  }
}
/** Moore-neighbour boundary trace of the (single) component in `mask`; returns boundary cell coords in order. */
function traceBoundary(mask: Uint8Array, w: number, d: number): [number, number][] {
  const at = (x: number, z: number) => (x >= 0 && z >= 0 && x < w && z < d ? mask[z * w + x] : 0);
  let sx = -1, sz = -1;
  outer: for (let z = 0; z < d; z++) for (let x = 0; x < w; x++) if (mask[z * w + x]) { sx = x; sz = z; break outer; }
  if (sx < 0) return [];
  const dirs: [number, number][] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  const path: [number, number][] = [[sx, sz]];
  let cx = sx, cz = sz, back = 4; // entered from the west
  for (let guard = 0; guard < w * d * 4; guard++) {
    let found = false;
    for (let k = 0; k < 8; k++) {
      const dir = (back + 1 + k) % 8, nx = cx + dirs[dir][0], nz = cz + dirs[dir][1];
      if (at(nx, nz)) {
        cx = nx; cz = nz;
        back = (dir + 4) % 8;
        found = true;
        break;
      }
    }
    if (!found) break;
    if (cx === sx && cz === sz) break;
    path.push([cx, cz]);
  }
  return path;
}
export function riverBodies(hy: Hydrology): LocalWaterBody[] {
  return hy.chains.map(ch => ({
    kind: 'river' as const,
    id: ch.id,
    width: Math.max(...ch.pts.map(p => p.w)),
    pts: ch.pts.map(p => ({ x: p.x, z: p.z, y: p.y + WATER_Y, w: p.w })),
    surfaceVersion: 2 as const,
    startCap: ch.source === 'spring' ? ('round' as const) : ('butt' as const),
    endCap: 'butt' as const,
  }));
}
