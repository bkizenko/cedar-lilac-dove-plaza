/** River-level geology, applied to the traced river chains before the height field carves them: waterfalls and gorges at
 * hard-rock steps, gravel-braided reaches on alluvial fans, river terraces and meander belts on soft low-gradient reaches,
 * oxbow lakes cut off from meander bends. Also rasterises the resulting fluvial tags for the per-cell geology read. */
import { clamp, smoothstep } from '../noise';
import { WATER_Y } from '../../constants';
import { ROCKS, HARD, TAG, TAG_PRIORITY } from './rocks';
import { rockAt, idxOf, PROV, type GeoState } from './structure';
import type { Hydrology, Chain } from '../hydro';
import type { LakeShape } from '../heightfield';
import type { Waterfall } from '../../localWater';

const hardnessAt = (st: GeoState, x: number, z: number, y: number) => ROCKS[rockAt(st, idxOf(st, x, z), y)].hardness;
const polyBounds = (poly: { x: number; z: number }[]) => { const xs = poly.map(p => p.x), zs = poly.map(p => p.z); const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs); return { x: (x0 + x1) / 2, z: (z0 + z1) / 2, rx: (x1 - x0) / 2, rz: (z1 - z0) / 2, bounds: [x0, z0, x1, z1] as [number, number, number, number] }; };

export type FluvialResult = { falls: Waterfall[]; oxbows: LakeShape[]; knicks: { x: number; z: number }[] };

export function shapeRivers(st: GeoState, hy: Hydrology, rainSea: number): FluvialResult {
  const falls: Waterfall[] = [], knicks: { x: number; z: number }[] = [], oxbows: LakeShape[] = [];
  // ---- per-point rock, gorge, braid and terrace attributes ------------------------------------------------------------------------------------
  for (const ch of hy.chains) {
    const pts = ch.pts, len = pts.length;
    for (let i = 0; i < len; i++) {
      const p = pts[i], a = pts[Math.max(0, i - 3)], b = pts[Math.min(len - 1, i + 3)], dist = Math.hypot(b.x - a.x, b.z - a.z) || 1, slope = Math.max(0, (a.y - b.y) / dist);
      const hard = hardnessAt(st, p.x, p.z, p.y), ford = !!p.ford;
      if (ford) continue;
      const rock = rockAt(st, idxOf(st, p.x, p.z), p.y);
      if (hard >= HARD && slope > 0.04) p.gorge = clamp((slope - 0.04) / 0.05) * 0.7 + 0.2;
      if (st.fans.some(f => Math.hypot(f.x - p.x, f.z - p.z) < f.r * 0.8) && p.w >= 5 && slope < 0.07) p.braid = 1;
      if (slope < 0.02 && hard < 0.45 && p.w >= 5.5 && (rock === 7 || rock === 5)) p.terr = clamp((0.02 - slope) / 0.014) * clamp((p.w - 5) / 4);
    }
    // smooth the attributes along the chain so reaches, not single points, change character
    for (const k of ['gorge', 'braid', 'terr'] as const) {
      const v = pts.map(p => p[k] ?? 0);
      for (let i = 0; i < len; i++) { let s = 0, c = 0; for (let d = -2; d <= 2; d++) { const j = i + d; if (j >= 0 && j < len) { s += v[j]; c++; } } pts[i][k] = s / c; }
    }
  }
  // ---- waterfalls: concentrate the drop of the steepest hard-rock windows into one step ----------------------------------------------------------------
  const scored: { ch: Chain; j: number; drop: number }[] = [];
  for (const ch of hy.chains) {
    if (ch.source === 'delta') continue;
    const pts = ch.pts, len = pts.length;
    for (let j = 4; j < len - 8; j++) {
      const hard = hardnessAt(st, pts[j].x, pts[j].z, pts[j].y);
      if (hard < HARD || pts[j].ford || pts[j + 1].ford) continue;
      const drop = pts[j - 3].y - pts[j + 4].y;
      if (drop >= 2.4 && pts[j].w >= 4.5) scored.push({ ch, j, drop });
    }
  }
  scored.sort((a, b) => b.drop - a.drop);
  const usedChains = new Map<string, number[]>();
  for (const s of scored) {
    if (falls.length >= 7) break;
    const taken = usedChains.get(s.ch.id) ?? [];
    if (taken.some(t => Math.abs(t - s.j) < 14) || taken.length >= 2) continue;
    taken.push(s.j); usedChains.set(s.ch.id, taken);
    const pts = s.ch.pts, j = s.j, yTop = pts[j - 3].y, yBot = pts[j + 4].y, step = Math.min(7, (yTop - yBot) * 0.75);
    for (let k = j - 3; k <= j; k++) pts[k].y = Math.max(pts[k].y, yTop - 0.02 * (k - (j - 3)));
    for (let k = j + 1; k <= j + 4; k++) pts[k].y = Math.min(pts[k].y, pts[j].y - step);
    for (let k = j + 1; k <= j + 4; k++) pts[k].y = Math.max(pts[k].y, yBot);
    for (let k = 1; k < pts.length; k++) pts[k].y = Math.min(pts[k].y, pts[k - 1].y);
    const a = pts[j], b = pts[j + 1];
    if (a.y - b.y >= 1.2) {
      falls.push({ x: a.x, z: a.z, upperY: a.y + WATER_Y, lowerY: b.y + WATER_Y, width: Math.max(3, a.w), dx: b.x - a.x, dz: b.z - a.z });
      knicks.push({ x: pts[j - 2].x, z: pts[j - 2].z });
      for (let k = j - 2; k <= j + 5; k++) pts[k].gorge = Math.max(pts[k].gorge ?? 0, 0.9);
    }
  }
  // ---- oxbow lakes: cut-off loops beside the sinuous, low-gradient reaches of large rivers -----------------------------------------------------------------
  const others = (ch: Chain, x: number, z: number, r: number) => hy.chains.some(o => o !== ch && o.pts.some(p => Math.hypot(p.x - x, p.z - z) < r + p.w * 0.5));
  const target = st.presetId === 'river-valley' ? 4 : 2;
  const chains = [...hy.chains].filter(c => c.source !== 'delta').sort((a, b) => b.flow - a.flow);
  for (const ch of chains) {
    if (oxbows.length >= target) break;
    const pts = ch.pts, len = pts.length;
    for (let i = 8; i < len - 18 && oxbows.length < target; i += 6) {
      const seg = pts.slice(i, i + 9);
      if (seg.some(p => p.w < 5 || (p.gorge ?? 0) > 0.35 || p.y < 0.4)) continue;
      const slope = (seg[0].y - seg[8].y) / (Math.hypot(seg[8].x - seg[0].x, seg[8].z - seg[0].z) || 1);
      if (slope > 0.1) continue;
      // sinuosity of the window: path length over chord
      let L = 0; for (let k = 1; k < seg.length; k++) L += Math.hypot(seg[k].x - seg[k - 1].x, seg[k].z - seg[k - 1].z);
      const chord = Math.hypot(seg[8].x - seg[0].x, seg[8].z - seg[0].z) || 1;
      if (L / chord < 1.03) continue;
      const mid = seg[4], s0 = st.rng() < 0.5 ? -1 : 1, off = mid.w * 0.5 + 22;
      const attempt = (side: number) => {
        const ctr: { x: number; z: number }[] = [];
        for (let k = 0; k < seg.length; k++) {
          const a = pts[Math.max(0, i + k - 1)], b = pts[Math.min(len - 1, i + k + 1)], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, bulge = Math.sin((k / 8) * Math.PI), o = off + 10 * bulge;
          ctr.push({ x: seg[k].x + (-dz / l) * o * side, z: seg[k].z + (dx / l) * o * side });
        }
        if (ctr.some(p => others(ch, p.x, p.z, 15) || Math.abs(p.x) > st.half - 30 || Math.abs(p.z) > st.half - 30 || st.prov[idxOf(st, p.x, p.z)] === 0)) return null;
        const half = 5.2, wAt = (k: number) => half * (0.35 + 0.65 * Math.sin((k / 8) * Math.PI)), nrm = (k: number) => { const a = ctr[Math.max(0, k - 1)], b = ctr[Math.min(ctr.length - 1, k + 1)], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1; return { x: -dz / l, z: dx / l }; };
        const poly: { x: number; z: number }[] = [];
        for (let k = 0; k < ctr.length; k++) { const q = nrm(k); poly.push({ x: ctr[k].x - q.x * wAt(k), z: ctr[k].z - q.z * wAt(k) }); }
        for (let k = ctr.length - 1; k >= 0; k--) { const q = nrm(k); poly.push({ x: ctr[k].x + q.x * wAt(k), z: ctr[k].z + q.z * wAt(k) }); }
        return poly;
      };
      const poly = attempt(s0) ?? attempt(-s0);
      if (!poly) continue;
      if (oxbows.some(o => Math.hypot(o.x - mid.x, o.z - mid.z) < 120)) continue;
      oxbows.push({ id: `oxbow-${oxbows.length}`, level: mid.y + 0.3, poly, ...polyBounds(poly) });
      st.landmarks.push({ tag: 'oxbow', x: mid.x, z: mid.z, radius: 30 });
      for (let k = i; k < i + 9; k++) pts[k].terr = Math.max(pts[k].terr ?? 0, 0.5);
      i += 24;
    }
  }
  void rainSea;
  return { falls, oxbows, knicks };
}

/** Rasterise fluvial landform tags and floodplain soil on the game lattice. */
export function fluvialRaster(st: GeoState, hy: Hydrology, fx: FluvialResult, n: number, size: number) {
  const tags = new Uint8Array(n * n), alluvium = new Float32Array(n * n), sg = size / (n - 1), half = size / 2;
  const put = (x: number, z: number, r: number, name: string, soil = 0) => {
    const id = TAG[name], pr = Math.ceil(r / sg);
    const cx = Math.round((x + half) / sg), cz = Math.round((z + half) / sg);
    for (let dz = -pr; dz <= pr; dz++) for (let dx = -pr; dx <= pr; dx++) {
      const X = cx + dx, Z = cz + dz;
      if (X < 0 || Z < 0 || X >= n || Z >= n || Math.hypot(dx, dz) * sg > r) continue;
      const i = Z * n + X;
      if (TAG_PRIORITY[id] > TAG_PRIORITY[tags[i]]) tags[i] = id;
      if (soil) alluvium[i] = Math.max(alluvium[i], soil);
    }
  };
  for (const ch of hy.chains) {
    for (let i = 0; i < ch.pts.length; i += 1) {
      const p = ch.pts[i];
      if (p.ford) continue;
      const fp = Math.max(p.fp, p.w);
      if ((p.gorge ?? 0) > 0.3) put(p.x, p.z, p.w * 0.5 + 7, st.prov[idxOf(st, p.x, p.z)] >= 2 && st.prov[idxOf(st, p.x, p.z)] <= 4 ? 'canyon' : 'gorge');
      else if ((p.braid ?? 0) > 0.5) put(p.x, p.z, Math.min(fp, 26), 'braided-reach');
      else if ((p.terr ?? 0) > 0.35) { put(p.x, p.z, Math.min(fp * 1.2 + 6, 34), 'river-terrace', 1.0); put(p.x, p.z, Math.min(fp * 0.7, 20), 'meander-belt', 1.2); }
      else if (p.y < 12 && p.w >= 6) put(p.x, p.z, Math.min(fp * 0.8, 30), 'floodplain', 0.9);
    }
  }
  for (const f of fx.falls) put(f.x, f.z, 9, 'waterfall');
  for (const k of fx.knicks) put(k.x, k.z, 11, 'knickpoint');
  for (const o of fx.oxbows) { const c = o.poly; for (const p of c) put(p.x, p.z, 7, 'oxbow', 1.0); }
  return { tags, alluvium };
}
void PROV; void smoothstep;
