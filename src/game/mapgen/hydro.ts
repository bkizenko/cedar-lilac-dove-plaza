/** Hydrology on the working grid: lake basins, rain-weighted drainage, and river channels that
 * flow strictly downhill, merge into trunks, meander on flat ground and end at sea or lake. */
import { Noise, clamp, smoothstep } from './noise';
import { priorityFlood, accumulate, DX, DZ, type Flow } from './flow';
import { components, type Terrain } from './terrain';
import type { Climate } from './climate';
import type { PresetSpec } from './presets';
export type RiverPoint = { x: number; z: number; y: number; w: number; ford?: boolean; fp: number };
export type Chain = {
  id: string;
  pts: RiverPoint[];
  mouth: 'sea' | 'lake' | 'river';
  into?: string;
  /** Drainage weight at the end of the chain (relative flow). */
  flow: number;
  lakeId?: string;
  source: 'spring' | 'lake' | 'delta';
};
export type Lake = { id: string; cells: number[]; level: number; x: number; z: number; areaM2: number; depth: number; kind: 'valley' | 'tarn' | 'basin' };
export type Delta = { x: number; z: number; dx: number; dz: number; radius: number; chain: string };
export type Hydrology = {
  chains: Chain[];
  lakes: Lake[];
  deltas: Delta[];
  /** Filled drainage surface (metres above sea), same grid. */
  filled: Float32Array;
  /** Rain-weighted contributing area (m^2 equivalents). */
  acc: Float32Array;
  rec: Int32Array;
  lakeMask: Int32Array;
  riverCells: Uint8Array;
};
const smoothPath = (pts: { x: number; z: number }[], passes: number, fixedEnds: [boolean, boolean]) => {
  for (let k = 0; k < passes; k++) {
    const copy = pts.map(p => ({ ...p }));
    for (let i = 1; i < pts.length - 1; i++) {
      pts[i].x = copy[i - 1].x * 0.25 + copy[i].x * 0.5 + copy[i + 1].x * 0.25;
      pts[i].z = copy[i - 1].z * 0.25 + copy[i].z * 0.5 + copy[i + 1].z * 0.25;
    }
    if (!fixedEnds[0] && pts.length > 2) { pts[0].x = copy[0].x * 0.5 + copy[1].x * 0.5; pts[0].z = copy[0].z * 0.5 + copy[1].z * 0.5; }
  }
};
export function buildHydrology(seed: number, t: Terrain, c: Climate, preset: PresetSpec, rand: () => number): Hydrology {
  const { n, cell, size, h, sea } = t, total = n * n, half = size / 2, area = cell * cell;
  const R = (a: number, b: number) => a + (b - a) * rand();
  const noise = new Noise(seed ^ 0x6a09e667);
  const px = (i: number) => (i % n) * cell - half, pz = (i: number) => ((i / n) | 0) * cell - half;
  const weight = new Float32Array(total);
  for (let i = 0; i < total; i++) weight[i] = sea[i] ? 0 : area * (0.25 + 0.95 * c.rain[i]);
  // ---- lakes: dig basins on suitable ground, then let the flood fill decide the real surface --
  let flow = priorityFlood(h, n, sea, cell, 0.003);
  let acc = accumulate(flow, weight, total);
  const wanted = Math.round(R(preset.lakes[0], preset.lakes[1] + 0.999));
  const slopeAt = (i: number) => {
    const r = flow.rec[i];
    if (r < 0) return 1;
    const d = Math.abs(i % n - r % n) + Math.abs(((i / n) | 0) - ((r / n) | 0)) === 2 ? cell * Math.SQRT2 : cell;
    return (flow.filled[i] - flow.filled[r]) / d;
  };
  const landTotal = (() => { let k = 0; for (let i = 0; i < total; i++) k += sea[i] ? 0 : 1; return k * area; })();
  const dug: { x: number; z: number; kind: Lake['kind'] }[] = [];
  const spacing = 0.13 * size;
  const sites: { i: number; kind: Lake['kind']; score: number }[] = [];
  for (let i = 0; i < total; i++) {
    if (sea[i] || t.signed[i] < 0.07 * size) continue;
    const s = slopeAt(i), a = acc[i] / landTotal;
    if (s > 0.045 && !(preset.id === 'highland')) continue;
    // valley lakes sit on mid-size rivers; tarns sit high on gentle ground with little drainage
    if (a > 0.012 && a < 0.2 && s < 0.035) sites.push({ i, kind: 'valley', score: Math.sqrt(a) * 2 + (0.04 - s) * 6 + rand() * 0.5 });
    else if (preset.id === 'highland' && h[i] > 28 && a < 0.01 && s < 0.05) sites.push({ i, kind: 'tarn', score: 0.4 + rand() * 0.6 });
    else if (preset.id === 'steppe' && a > 0.003 && a < 0.06 && s < 0.02) sites.push({ i, kind: 'basin', score: 0.3 + rand() * 0.5 });
  }
  sites.sort((a, b) => b.score - a.score);
  for (const s of sites) {
    if (dug.length >= wanted) break;
    const x = px(s.i), z = pz(s.i);
    if (dug.some(d => Math.hypot(d.x - x, d.z - z) < spacing)) continue;
    dug.push({ x, z, kind: s.kind });
    const r = flow.rec[s.i], dirx = r >= 0 ? px(r) - x : 1, dirz = r >= 0 ? pz(r) - z : 0, len = Math.hypot(dirx, dirz) || 1, ca = dirx / len, sa = dirz / len;
    const scale = size / 1040;
    const major = (s.kind === 'valley' ? R(38, 78) : s.kind === 'tarn' ? R(20, 40) : R(45, 85)) * scale * (preset.id === 'lakeland' ? 1.25 : 1);
    const minor = major * R(0.42, 0.8), depth = s.kind === 'tarn' ? R(2.6, 4.5) : R(3.2, 6.5), pad = Math.max(major, minor) * 1.9;
    for (let zz = Math.max(0, Math.floor((z + pad + half) / cell)); zz >= Math.max(0, Math.floor((z - pad + half) / cell)); zz--) {
      for (let xx = Math.max(0, Math.floor((x - pad + half) / cell)); xx <= Math.min(n - 1, Math.floor((x + pad + half) / cell)); xx++) {
        const j = zz * n + xx;
        if (sea[j]) continue;
        const dx = xx * cell - half - x, dz = zz * cell - half - z, along = dx * ca + dz * sa, across = -dx * sa + dz * ca;
        const wobble = 1 + 0.2 * noise.fbm(xx * 0.09 + dug.length * 7, zz * 0.09, 2);
        const rr = Math.hypot(along / major, across / minor) * wobble;
        if (rr >= 1.15) continue;
        h[j] -= depth * smoothstep(1.15, 0.3, rr);
      }
    }
  }
  // ---- fill tiny pits, keep big depressions as lakes -------------------------------------------
  flow = priorityFlood(h, n, sea, cell, 0.003);
  const pit = new Uint8Array(total);
  for (let i = 0; i < total; i++) pit[i] = !sea[i] && flow.filled[i] - h[i] > 0.04 ? 1 : 0;
  const comp = components(pit, n, 1);
  const lakeMask = new Int32Array(total).fill(-1), lakes: Lake[] = [];
  const stats = comp.areas.map(() => ({ max: 0, level: -1e9, sx: 0, sz: 0, cells: [] as number[] }));
  for (let i = 0; i < total; i++) {
    const k = comp.labels[i];
    if (k < 0 || !pit[i]) continue;
    const st = stats[k], d = flow.filled[i] - h[i];
    st.max = Math.max(st.max, d);
    st.level = Math.max(st.level, flow.filled[i]);
    st.sx += px(i);
    st.sz += pz(i);
    st.cells.push(i);
  }
  stats.forEach((st, k) => {
    if (!st.cells.length) return;
    const areaM2 = st.cells.length * area;
    if (areaM2 >= 420 && st.max >= 0.7) {
      const id = `lake-${lakes.length}`;
      const kinds = dug.find(d => Math.hypot(d.x - st.sx / st.cells.length, d.z - st.sz / st.cells.length) < 120)?.kind ?? 'basin';
      lakes.push({ id, cells: st.cells, level: st.level, x: st.sx / st.cells.length, z: st.sz / st.cells.length, areaM2, depth: st.max, kind: kinds });
      for (const i of st.cells) lakeMask[i] = lakes.length - 1;
    } else for (const i of st.cells) h[i] = flow.filled[i];
  });
  // a final flow with the small pits filled in place
  flow = priorityFlood(h, n, sea, cell, 0.003);
  acc = accumulate(flow, weight, total);
  // ---- which cells carry a river ----------------------------------------------------------------
  const { rec, filled } = flow;
  const landCells: number[] = [];
  for (let i = 0; i < total; i++) if (!sea[i] && lakeMask[i] < 0 && t.signed[i] > cell * 0.8) landCells.push(i);
  const accSorted = landCells.map(i => acc[i]).sort((a, b) => a - b);
  const density = clamp(0.03 * preset.riverDensity, 0.012, 0.07);
  const threshold = accSorted[Math.max(0, Math.floor(accSorted.length * (1 - density)))] ?? 1e12;
  const riverCells = new Uint8Array(total);
  // streams are born higher up in ranges and uplands (orographic rain, steep catchments), so mountain
  // rivers have real headwaters instead of appearing mid-slope
  const upland = (i: number) => Math.max(smoothstep(0.1, 0.5, t.uplift[i]), 0.7 * smoothstep(22, 60, h[i]));
  for (const i of landCells) if (acc[i] >= threshold * (1 - 0.62 * upland(i))) riverCells[i] = 1;
  // a lowered threshold upstream must still connect to the sea: carry channels down to the first marked cell
  for (let k = flow.order.length - 1; k >= 0; k--) {
    const i = flow.order[k], r = flow.rec[i];
    if (riverCells[i] && r >= 0 && !sea[r] && lakeMask[r] < 0 && !riverCells[r] && t.signed[r] > cell * 0.8) riverCells[r] = 1;
  }
  // length to the sea along river cells, to decide trunks
  const lengthToEnd = new Float32Array(total);
  for (let k = 0; k < flow.order.length; k++) {
    const i = flow.order[k];
    if (!riverCells[i]) continue;
    const r = rec[i];
    lengthToEnd[i] = 1 + (r >= 0 && riverCells[r] ? lengthToEnd[r] : 0);
  }
  const donors = new Int32Array(total);
  for (let i = 0; i < total; i++) if (riverCells[i] && rec[i] >= 0 && riverCells[rec[i]]) donors[rec[i]]++;
  const lakeDonor = new Int32Array(total).fill(-1);
  for (let i = 0; i < total; i++) if (lakeMask[i] >= 0 && rec[i] >= 0 && lakeMask[rec[i]] < 0 && riverCells[rec[i]]) lakeDonor[rec[i]] = i;
  const sources: number[] = [];
  for (let i = 0; i < total; i++) if (riverCells[i] && donors[i] === 0) sources.push(i);
  // wide rivers first so that trunks claim shared cells
  const reach = (i: number) => acc[i] * 0 + (rec[i] >= 0 ? acc[rec[i]] : 0);
  sources.sort((a, b) => {
    const ta = lengthToEnd[a] + (lakeDonor[a] >= 0 ? 4 : 0), tb = lengthToEnd[b] + (lakeDonor[b] >= 0 ? 4 : 0);
    return tb - ta || reach(b) - reach(a) || a - b;
  });
  const owner = new Int32Array(total).fill(-1);
  type Raw = { cells: number[]; mouth: Chain['mouth']; into?: number; lakeId?: string; source: Chain['source']; seaCell?: number; joinCell?: number };
  const raws: Raw[] = [];
  for (const s of sources) {
    let i = s;
    const cells: number[] = [];
    let source: Chain['source'] = 'spring';
    if (lakeDonor[s] >= 0) {
      cells.push(lakeDonor[s]);
      source = 'lake';
    }
    let mouth: Chain['mouth'] = 'sea', into: number | undefined, lakeId: string | undefined, seaCell: number | undefined, joinCell: number | undefined;
    for (let guard = 0; guard < total; guard++) {
      if (owner[i] >= 0) { mouth = 'river'; into = owner[i]; joinCell = i; break; }
      cells.push(i);
      owner[i] = raws.length;
      const r = rec[i];
      if (r < 0) break;
      if (sea[r]) { seaCell = r; mouth = 'sea'; break; }
      if (lakeMask[r] >= 0) { cells.push(r); mouth = 'lake'; lakeId = lakes[lakeMask[r]].id; break; }
      i = r;
    }
    if (cells.length < 3 && mouth === 'river') continue;
    raws.push({ cells, mouth, into, lakeId, source, seaCell, joinCell });
  }
  // ---- turn cell chains into smooth, monotone river polylines ----------------------------------
  const ds = clamp(cell * 1.15, 6, 10);
  const wMin = 4.6, wMax = 6 + size / 150;
  let accMax = 1;
  for (const r of raws) accMax = Math.max(accMax, acc[r.cells[r.cells.length - 1]]);
  const chains: Chain[] = [];
  const idOf = (k: number) => `river-${k}`;
  const lakeLevel = (id: string) => lakes.find(l => l.id === id)!.level;
  raws.forEach((raw, k) => {
    const cellsXZ = raw.cells.map(i => ({ x: px(i), z: pz(i) }));
    // sea mouth: continue seawards so the channel really opens into the sea
    if (raw.mouth === 'sea' && raw.seaCell !== undefined) {
      const last = cellsXZ[cellsXZ.length - 1], sc = { x: px(raw.seaCell), z: pz(raw.seaCell) }, dx = sc.x - last.x, dz = sc.z - last.z, len = Math.hypot(dx, dz) || 1;
      cellsXZ.push(sc, { x: sc.x + (dx / len) * cell * 1.2, z: sc.z + (dz / len) * cell * 1.2 });
    }
    if (raw.mouth === 'river' && raw.joinCell !== undefined) cellsXZ.push({ x: px(raw.joinCell), z: pz(raw.joinCell) });
    const yRaw = raw.cells.map(i => filled[i]);
    if (raw.mouth === 'sea') yRaw.push(0, 0);
    if (raw.mouth === 'river') yRaw.push(raw.joinCell !== undefined ? filled[raw.joinCell] : 0);
    const flowRaw = raw.cells.map(i => acc[i]);
    while (flowRaw.length < cellsXZ.length) flowRaw.push(flowRaw[flowRaw.length - 1]);
    const smoothed = cellsXZ.map(p => ({ ...p }));
    smoothPath(smoothed, 3, [false, raw.mouth === 'river' || raw.mouth === 'sea']);
    // arc-length parameterisation of the smoothed path
    const arc = [0];
    for (let i = 1; i < smoothed.length; i++) arc.push(arc[i - 1] + Math.hypot(smoothed[i].x - smoothed[i - 1].x, smoothed[i].z - smoothed[i - 1].z));
    const total = arc[arc.length - 1] || 1, count = Math.max(2, Math.round(total / ds));
    const pts: RiverPoint[] = [];
    let seg = 1;
    for (let q = 0; q <= count; q++) {
      const target = (q / count) * total;
      while (seg < arc.length - 1 && arc[seg] < target) seg++;
      const a = smoothed[seg - 1], b = smoothed[seg], span = arc[seg] - arc[seg - 1] || 1, f = clamp((target - arc[seg - 1]) / span);
      const y = yRaw[seg - 1] + (yRaw[seg] - yRaw[seg - 1]) * f, fl = flowRaw[seg - 1] + (flowRaw[seg] - flowRaw[seg - 1]) * f;
      pts.push({ x: a.x + (b.x - a.x) * f, z: a.z + (b.z - a.z) * f, y, w: (wMin + (wMax - wMin) * Math.pow(clamp(fl / accMax), 0.42)) * (raw.source === 'spring' ? 0.42 + 0.58 * smoothstep(0, 70, target) : 1), fp: 0 });
    }
    // moving-average the surface so it is smooth, then force a monotone descent
    const ys = pts.map(p => p.y), smooth = ys.map((_, i) => {
      let s = 0, cnt = 0;
      for (let d = -4; d <= 4; d++) {
        const j = i + d;
        if (j >= 0 && j < ys.length) { s += ys[j]; cnt++; }
      }
      return s / cnt;
    });
    chains.push({ id: idOf(k), pts: pts.map((p, i) => ({ ...p, y: smooth[i] })), mouth: raw.mouth, into: raw.into !== undefined ? idOf(raw.into) : undefined, flow: flowRaw[flowRaw.length - 1], lakeId: raw.lakeId, source: raw.source });
  });
  // ---- joins: snap each tributary end to its trunk, set matching levels, then monotone profile ---
  const byId = new Map(chains.map(ch => [ch.id, ch]));
  const finalOrder = chains.map((_, i) => i).sort((a, b) => {
    // trunks before tributaries: process by dependency depth
    const depth = (ch: Chain): number => (ch.into ? 1 + depth(byId.get(ch.into)!) : 0);
    return depth(chains[a]) - depth(chains[b]);
  });
  for (const k of finalOrder) {
    const ch = chains[k], pts = ch.pts;
    let yEnd: number | undefined;
    if (ch.mouth === 'sea') yEnd = 0;
    else if (ch.mouth === 'lake') yEnd = lakeLevel(ch.lakeId!);
    else if (ch.into) {
      const trunk = byId.get(ch.into)!, end = pts[pts.length - 1];
      let best = Infinity, bi = 0, bt = 0;
      for (let i = 1; i < trunk.pts.length; i++) {
        const a = trunk.pts[i - 1], b = trunk.pts[i], dx = b.x - a.x, dz = b.z - a.z, tt = clamp(((end.x - a.x) * dx + (end.z - a.z) * dz) / (dx * dx + dz * dz || 1)), d = Math.hypot(end.x - a.x - dx * tt, end.z - a.z - dz * tt);
        if (d < best) { best = d; bi = i; bt = tt; }
      }
      const a = trunk.pts[bi - 1], b = trunk.pts[bi];
      end.x = a.x + (b.x - a.x) * bt;
      end.z = a.z + (b.z - a.z) * bt;
      yEnd = a.y + (b.y - a.y) * bt;
      end.w = Math.min(end.w, (a.w + (b.w - a.w) * bt) * 0.85);
    }
    if (ch.source === 'lake') {
      // outflow starts at the lake surface
      const lake = lakes.find(l => l.cells.includes(raws[Number(ch.id.slice(6))].cells[0]));
      if (lake) pts[0].y = lake.level;
    }
    if (yEnd !== undefined) pts[pts.length - 1].y = yEnd;
    for (let i = pts.length - 2; i >= 0; i--) pts[i].y = Math.max(pts[i].y, pts[i + 1].y);
    for (let i = 1; i < pts.length; i++) pts[i].y = Math.min(pts[i].y, pts[i - 1].y);
    if (yEnd !== undefined) pts[pts.length - 1].y = Math.min(pts[pts.length - 1].y, Math.max(yEnd, pts[pts.length - 2]?.y ?? yEnd));
    if (yEnd !== undefined) for (let i = 0; i < pts.length; i++) pts[i].y = Math.max(pts[i].y, yEnd);
    // gradient-based floodplain half-width and meanders on gentle reaches
    const len = pts.length;
    const slope = pts.map((_, i) => {
      const a = pts[Math.max(0, i - 3)], b = pts[Math.min(len - 1, i + 3)], dist = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      return Math.max(0, (a.y - b.y) / dist);
    });
    const meanderAmp = preset.meander;
    const phase = rand() * 100, wavelength = 14;
    const offsets = pts.map((p, i) => {
      const flat = smoothstep(0.05, 0.008, slope[i]);
      const taper = Math.min(smoothstep(0, 5, i), smoothstep(0, 4, len - 1 - i));
      const sArc = i * ds;
      const lam = wavelength * Math.max(6, p.w);
      return noise.at(sArc / lam + phase, k0(ch.id) * 3.7) * Math.min(38, p.w * 1.6 * meanderAmp) * flat * taper;
    });
    const orig = pts.map(p => ({ x: p.x, z: p.z }));
    for (let i = 0; i < len; i++) {
      const a = orig[Math.max(0, i - 1)], b = orig[Math.min(len - 1, i + 1)], dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1;
      pts[i].x += (-dz / l) * offsets[i];
      pts[i].z += (dx / l) * offsets[i];
      pts[i].fp = clamp(pts[i].w * 0.9 + 70 * smoothstep(0.045, 0.004, slope[i]) * clamp(pts[i].w / wMax + 0.25), 5, 90);
    }
  }
  // widen estuaries
  for (const ch of chains) {
    if (ch.mouth !== 'sea') continue;
    const len = ch.pts.length;
    for (let i = Math.max(0, len - 7); i < len; i++) ch.pts[i].w *= 1 + 0.55 * smoothstep(len - 8, len - 1, i);
  }
  // ---- deltas: a lowland trunk splits into distributaries that fan out across the coastal plain ---------
  const deltas: Delta[] = [];
  const cellAt = (x: number, z: number) => Math.max(0, Math.min(n - 1, Math.round((z + half) / cell))) * n + Math.max(0, Math.min(n - 1, Math.round((x + half) / cell)));
  const isSea = (x: number, z: number) => sea[cellAt(x, z)] === 1 || Math.abs(x) > half - 2 || Math.abs(z) > half - 2;
  let nextId = chains.length;
  const trunks = chains.filter(c => c.mouth === 'sea').sort((a, b) => b.flow - a.flow).slice(0, 3);
  for (const ch of trunks) {
    if (rand() > preset.delta || ch.pts.length < 16) continue;
    let m = ch.pts.length - 1;
    while (m > 0 && isSea(ch.pts[m].x, ch.pts[m].z)) m--;
    m++; // first point already at sea
    // the split sits where the plain is low and flat enough for the river to wander
    let k = Math.min(22, m - 4);
    while (k >= 8) {
      let flat = true;
      for (let i = m - k; i <= m; i++) { const p = ch.pts[Math.min(i, ch.pts.length - 1)]; if (h[cellAt(p.x, p.z)] > 11) { flat = false; break; } }
      if (flat) break;
      k--;
    }
    if (k < 8) continue;
    const s0 = ch.pts[m - k], seaPt = ch.pts[Math.min(m, ch.pts.length - 1)], dirx0 = seaPt.x - s0.x, dirz0 = seaPt.z - s0.z, dl = Math.hypot(dirx0, dirz0) || 1;
    const base = Math.atan2(dirz0, dirx0), reachM = Math.max(110, dl * 1.15), branches: Chain[] = [];
    const angles = ch.pts[m - k].w > 8.5 ? [-0.62, 0.62, -0.24, 0.3] : [-0.5, 0.5, 0.05];
    for (const ang of angles) {
      if (branches.length >= 2 + (ch.pts[m - k].w > 8.5 ? 1 : 0)) break;
      const pts: RiverPoint[] = [];
      let x = s0.x, z = s0.z, heading = base + ang, ok = false, travelled = 0, phase = rand() * 6.28;
      pts.push({ x, z, y: s0.y, w: s0.w * 0.62, fp: 16 });
      for (let step = 1; step <= 60; step++) {
        heading += (base + ang * 0.55 - heading) * 0.06 + Math.sin(phase + step * 0.55) * 0.07;
        x += Math.cos(heading) * ds; z += Math.sin(heading) * ds; travelled += ds;
        if (travelled > reachM * 1.8) break;
        pts.push({ x, z, y: 0, w: s0.w * (0.62 + 0.25 * Math.min(1, travelled / reachM)), fp: 16 });
        if (isSea(x, z)) { ok = true; break; }
      }
      if (!ok || pts.length < 6) continue;
      // two more points seaward so the channel opens into the water
      const e = pts[pts.length - 1], q = pts[pts.length - 2];
      pts.push({ x: e.x + (e.x - q.x) * 1.2, z: e.z + (e.z - q.z) * 1.2, y: 0, w: e.w * 1.25, fp: 10 });
      // surface runs from the trunk level down to the sea; it must never cross land that stands above it
      const last = pts.length - 1;
      let rises = false;
      pts.forEach((p, i) => { const f = i / last; p.y = s0.y * Math.pow(1 - f, 1.15); if (!isSea(p.x, p.z) && h[cellAt(p.x, p.z)] > p.y + 3.2) rises = true; });
      if (rises) continue;
      // keep distributaries apart from each other and from the trunk's own mouth
      const mid = pts[Math.floor(pts.length * 0.7)];
      if (branches.some(b => { const o = b.pts[Math.floor(b.pts.length * 0.7)]; return Math.hypot(o.x - mid.x, o.z - mid.z) < 26; })) continue;
      if (Math.hypot(seaPt.x - e.x, seaPt.z - e.z) < 24) continue;
      branches.push({ id: `river-${nextId++}`, pts, mouth: 'sea', flow: ch.flow * 0.35, source: 'delta' });
    }
    if (!branches.length) continue;
    // the plain itself: low, gently rising ground around the fan so the distributaries really spread out,
    // and the trunk's own surface follows it down (never above the ground it crosses)
    const plain = (cx2: number, cz2: number) => 0.55 + 0.034 * Math.max(0, t.signed[cellAt(cx2, cz2)]);
    const all = [ch, ...branches], fx = all.reduce((sum, b) => sum + b.pts[b.pts.length - 1].x, 0) / all.length, fz = all.reduce((sum, b) => sum + b.pts[b.pts.length - 1].z, 0) / all.length;
    const cxm = (s0.x + fx) / 2, czm = (s0.z + fz) / 2, R0 = Math.max(70, Math.hypot(fx - s0.x, fz - s0.z) * 0.75 + 40);
    // lowering ground beside a lake would flood its rim into the plain: leave deltas away from lakes
    if (lakes.some(l => l.cells.some(i => Math.hypot(px(i) - cxm, pz(i) - czm) < R0 + 70))) continue;
    for (let zz = Math.max(0, Math.floor((czm - R0 + half) / cell)); zz <= Math.min(n - 1, Math.ceil((czm + R0 + half) / cell)); zz++) {
      for (let xx = Math.max(0, Math.floor((cxm - R0 + half) / cell)); xx <= Math.min(n - 1, Math.ceil((cxm + R0 + half) / cell)); xx++) {
        const j = zz * n + xx;
        if (sea[j] || lakeMask[j] >= 0) continue;
        const wgt = 1 - smoothstep(0.5 * R0, R0, Math.hypot(xx * cell - half - cxm, zz * cell - half - czm)), target = plain(xx * cell - half, zz * cell - half);
        if (h[j] > target) h[j] -= (h[j] - target) * wgt;
      }
    }
    for (let i = m - k; i < ch.pts.length; i++) { const p = ch.pts[i]; p.y = Math.min(p.y, plain(p.x, p.z) + 0.08); }
    for (let i = 1; i < ch.pts.length; i++) ch.pts[i].y = Math.min(ch.pts[i].y, ch.pts[i - 1].y);
    for (const b of branches) { b.pts[0].y = ch.pts[m - k].y; b.pts.forEach((p, i) => { const f = i / (b.pts.length - 1); p.y = ch.pts[m - k].y * Math.pow(1 - f, 1.15); }); }
    const cx = branches.reduce((sum, b) => sum + b.pts[b.pts.length - 1].x, seaPt.x) / (branches.length + 1), cz = branches.reduce((sum, b) => sum + b.pts[b.pts.length - 1].z, seaPt.z) / (branches.length + 1);
    deltas.push({ x: (cx + s0.x) / 2, z: (cz + s0.z) / 2, dx: Math.cos(base), dz: Math.sin(base), radius: Math.max(60, Math.hypot(cx - s0.x, cz - s0.z) * 0.75 + 30), chain: ch.id });
    // the trunk narrows below the split because it now shares its water
    for (let i = m - k; i < ch.pts.length; i++) ch.pts[i].w *= 0.8;
    for (const b of branches) chains.push(b);
  }
  // ---- fords: broad, gentle, shallow reaches away from joins and mouths ----------------------------------
  // dense enough that a river between two parts of an island is usually crossable within a few minutes' walk
  const fordSpacing = 70;
  const fords: { x: number; z: number }[] = [];
  for (const ch of chains) {
    if (ch.source === 'delta') continue;
    const len = ch.pts.length;
    for (let i = 8; i < len - 9; i++) {
      const p = ch.pts[i];
      if (p.w < 4 || p.w > 20) continue;
      const a = ch.pts[i - 4], b = ch.pts[i + 4], dist = Math.hypot(b.x - a.x, b.z - a.z) || 1, slope = (a.y - b.y) / dist;
      if (slope > 0.11) continue;
      if (fords.some(f => Math.hypot(f.x - p.x, f.z - p.z) < fordSpacing)) continue;
      if (t.signed[Math.round((p.z + half) / cell) * n + Math.round((p.x + half) / cell)] < 14) continue;
      fords.push({ x: p.x, z: p.z });
      for (let d = -3; d <= 3; d++) ch.pts[i + d].ford = true;
    }
  }
  return { chains, lakes, deltas, filled, acc, rec, lakeMask, riverCells };
}
const k0 = (id: string) => Number(id.slice(6)) || 0;
