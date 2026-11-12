/** Surface-process landforms, applied to the working grid after the climate exists and before hydrology reads the land:
 * glaciers (cirques, U-valleys, moraines, kettles, fjords, drift lowlands), coasts (cliffs, stacks, spits, bars, lagoons,
 * flats), wind (dunes, wadis, yardangs, playas, pavement), alluvial fans, and humid-karst towers. Each landform is driven by
 * the climate field or the rock that exists at the place; nothing here is placed by noise alone. See docs/GEOLOGY_MODEL.md. */
import { clamp, smoothstep, distanceTransform } from '../noise';
import { priorityFlood, accumulate, DX, DZ } from '../flow';
import { ROCKS, HARD } from './rocks';
import { PROV, paint, idxOf, cellX, cellZ, rockAt, type GeoState } from './structure';
import type { Terrain } from '../terrain';
import type { Climate } from '../climate';

type Ctx = { st: GeoState; t: Terrain; c: Climate; flow: ReturnType<typeof priorityFlood>; accRain: Float32Array; accCells: Float32Array; slope: Float32Array; scale: number; landQuantile: (v: Float32Array, q: number) => number };
const gauss = (d: number, w: number) => Math.exp(-(d * d) / (w * w));

/** Stamp a smooth additive bump (metres) along a polyline; returns the cells touched. */
function ridge(st: GeoState, h: Float32Array, sea: Uint8Array | null, pts: { x: number; z: number }[], width: number, height: number, tag: string | null, raiseSea = false, gap?: (k: number) => number) {
  const { n, cell, half } = st, touched = new Set<number>(), pad = Math.ceil(width * 2.4 / cell);
  for (let k = 0; k < pts.length; k++) {
    const p = pts[k], amp = height * (gap ? gap(k) : 1);
    if (amp <= 0.01) continue;
    const cx = Math.round((p.x + half) / cell), cz = Math.round((p.z + half) / cell);
    for (let dz = -pad; dz <= pad; dz++) for (let dx = -pad; dx <= pad; dx++) {
      const X = cx + dx, Z = cz + dz;
      if (X < 1 || Z < 1 || X >= n - 1 || Z >= n - 1) continue;
      const i = Z * n + X, d = Math.hypot(X * cell - half - p.x, Z * cell - half - p.z);
      if (sea && sea[i] && !raiseSea) continue;
      const g = amp * gauss(d, width);
      if (g < 0.02) continue;
      if (raiseSea) { if (g > h[i]) h[i] = g; } else h[i] += g;
      if (tag && g > amp * 0.25) { paint(st, i, tag); touched.add(i); }
    }
  }
  return touched;
}
const pit = (st: GeoState, h: Float32Array, sea: Uint8Array, x: number, z: number, major: number, minor: number, ang: number, depth: number, tag: string | null) => {
  const { n, cell, half } = st, c = Math.cos(ang), s = Math.sin(ang), pad = Math.max(major, minor) * 1.4;
  for (let zz = Math.max(1, Math.floor((z - pad + half) / cell)); zz <= Math.min(n - 2, Math.ceil((z + pad + half) / cell)); zz++) for (let xx = Math.max(1, Math.floor((x - pad + half) / cell)); xx <= Math.min(n - 2, Math.ceil((x + pad + half) / cell)); xx++) {
    const i = zz * n + xx;
    if (sea[i]) continue;
    const dx = xx * cell - half - x, dz = zz * cell - half - z, rr = Math.hypot((dx * c + dz * s) / major, (-dx * s + dz * c) / minor) * (1 + 0.12 * st.noise.at(xx * 0.21, zz * 0.21));
    if (rr < 1.2) { h[i] -= depth * smoothstep(1.2, 0.25, rr); if (tag && rr < 0.9) paint(st, i, tag); }
  }
};
const downhill = (ctx: Ctx, i: number) => ctx.flow.rec[i];

export function surfaceProcesses(t: Terrain, c: Climate) {
  const st = t.geo;
  if (!st) return;
  const { n, cell, size, h, sea, signed } = t, total = n * n, scale = size / 1040;
  const flow = priorityFlood(h, n, sea, cell, 0.003);
  const rainW = new Float32Array(total);
  for (let i = 0; i < total; i++) rainW[i] = sea[i] ? 0 : cell * cell * (0.25 + 0.95 * c.rain[i]);
  const accRain = accumulate(flow, rainW, total), accCells = accumulate(flow, 1, total);
  const slope = new Float32Array(total);
  for (let z = 1; z < n - 1; z++) for (let x = 1; x < n - 1; x++) { const i = z * n + x; slope[i] = Math.hypot(h[i + 1] - h[i - 1], h[i + n] - h[i - n]) / (2 * cell); }
  const landQuantile = (v: Float32Array, q: number) => { const a: number[] = []; for (let i = 0; i < total; i++) if (!sea[i]) a.push(v[i]); a.sort((p, r) => p - r); return a[Math.min(a.length - 1, Math.floor(q * a.length))] ?? 0; };
  const ctx: Ctx = { st, t, c, flow, accRain, accCells, slope, scale, landQuantile };
  alluvialFans(ctx);
  glaciation(ctx);
  aeolian(ctx);
  humidKarst(ctx);
  coasts(ctx);
  refreshShore(t, st);
}

// ---------------------------------------------------------------------------------------------------------------------------------
function alluvialFans(ctx: Ctx) {
  const { st, t, flow, accRain, scale } = ctx, { n, cell, h, sea, signed } = t, total = n * n, half = t.size / 2;
  const thr = ctx.landQuantile(accRain, 0.93), cands: { i: number; a: number }[] = [];
  for (let i = 0; i < total; i++) {
    if (sea[i] || accRain[i] < thr || signed[i] < 40 * scale || ctx.slope[i] > 0.05) continue;
    const r = flow.rec[i];
    if (r < 0) continue;
    const dx = (i % n) - (r % n), dz = Math.floor(i / n) - Math.floor(r / n), up = (k: number) => { const X = Math.round((i % n) + dx * k), Z = Math.round(Math.floor(i / n) + dz * k); return X < 0 || Z < 0 || X >= n || Z >= n ? h[i] : h[Z * n + X]; };
    if (up(17) - h[i] >= 9) cands.push({ i, a: accRain[i] });
  }
  cands.sort((a, b) => b.a - a.a);
  const fans: { x: number; z: number; r: number }[] = [];
  for (const cd of cands) {
    if (fans.length >= 5) break;
    const x = cellX(st, cd.i), z = cellZ(st, cd.i);
    if (fans.some(f => Math.hypot(f.x - x, f.z - z) < 110 * scale)) continue;
    const r = flow.rec[cd.i], dirx = (r % n) - (cd.i % n), dirz = Math.floor(r / n) - Math.floor(cd.i / n), dl = Math.hypot(dirx, dirz) || 1, ux = dirx / dl, uz = dirz / dl;
    const Rf = (44 + 38 * st.rng()) * scale + 10, sf = 0.028 + 0.02 * st.rng(), apex = h[cd.i] + 0.9;
    for (let zz = Math.max(1, Math.floor((z - Rf + half) / cell)); zz <= Math.min(n - 2, Math.ceil((z + Rf + half) / cell)); zz++) for (let xx = Math.max(1, Math.floor((x - Rf + half) / cell)); xx <= Math.min(n - 2, Math.ceil((x + Rf + half) / cell)); xx++) {
      const j = zz * n + xx;
      if (sea[j]) continue;
      const dx = xx * cell - half - x, dz = zz * cell - half - z, d = Math.hypot(dx, dz);
      if (d > Rf || d < 1) continue;
      const cosT = (dx * ux + dz * uz) / d, ang = Math.acos(clamp(cosT, -1, 1));
      const wAng = ang < 1.05 ? Math.pow(Math.cos(ang / 1.05 * Math.PI / 2), 2) : 0, wRad = 1 - smoothstep(0.6 * Rf, Rf, d);
      const target = apex - sf * d, w = wAng * wRad;
      if (w <= 0.02 || target <= h[j]) continue;
      h[j] += (target - h[j]) * w;
      if (w > 0.3) { paint(st, j, 'alluvial-fan'); if (st.prov[j] !== PROV.granite) st.prov[j] = PROV.sediment; }
    }
    fans.push({ x, z, r: Rf });
    st.landmarks.push({ tag: 'alluvial-fan', x, z, radius: Rf });
  }
  st.fans = fans;
}

// ---------------------------------------------------------------------------------------------------------------------------------
function glaciation(ctx: Ctx) {
  const { st, t, c, flow, scale } = ctx, { n, cell, h, sea, signed } = t, half = t.size / 2, total = n * n, g = st.spec.glacial;
  if (g < 0.08) return;
  const rng = st.rng, R = (a: number, b: number) => a + (b - a) * rng();
  // ice needs real cold: at most the coldest slice of the land, and never warmer than the preset's ice-age legacy allows
  const Tq = Math.min(ctx.landQuantile(c.temp, 0.05 + 0.27 * g), 2.5 + 8.5 * g);
  const cold = (i: number) => c.temp[i] < Tq;
  const smooth = (i: number, d = 2) => { let s = 0, k = 0; for (let dz = -d; dz <= d; dz++) for (let dx = -d; dx <= d; dx++) { const j = i + dz * n + dx; if (j >= 0 && j < total) { s += h[j]; k++; } } return s / k; };
  // ---- cirques at the heads of cold valleys ----------------------------------------------------------------------------------------
  const wantCirques = Math.round(2 + 9 * g);
  const hi: number[] = [];
  for (let i = 0; i < total; i++) if (!sea[i] && cold(i) && h[i] > 24 && signed[i] > 30 && ctx.slope[i] > 0.12 && ctx.slope[i] < 0.55) hi.push(i);
  hi.sort((a, b) => h[b] - h[a]);
  const cirques: { x: number; z: number; ux: number; uz: number }[] = [];
  for (const i of hi) {
    if (cirques.length >= wantCirques) break;
    const x = cellX(st, i), z = cellZ(st, i);
    if (cirques.some(q => Math.hypot(q.x - x, q.z - z) < 70 * scale)) continue;
    const gx = smooth(i + 3) - smooth(i - 3), gz = smooth(i + 3 * n) - smooth(i - 3 * n), gl = Math.hypot(gx, gz);
    if (gl < 1e-3) continue;
    cirques.push({ x, z, ux: -gx / gl, uz: -gz / gl });
  }
  const paths: { x: number; z: number; i: number }[][] = [];
  for (const q of cirques) {
    const Rc = R(22, 34) * scale + 4, D = R(7, 12), cx = q.x + q.ux * Rc * 0.35, cz = q.z + q.uz * Rc * 0.35, hc = h[idxOf(st, cx, cz)], floor = hc - D;
    for (let zz = Math.max(1, Math.floor((cz - Rc * 1.7 + half) / cell)); zz <= Math.min(n - 2, Math.ceil((cz + Rc * 1.7 + half) / cell)); zz++) for (let xx = Math.max(1, Math.floor((cx - Rc * 1.7 + half) / cell)); xx <= Math.min(n - 2, Math.ceil((cx + Rc * 1.7 + half) / cell)); xx++) {
      const j = zz * n + xx;
      if (sea[j]) continue;
      const dx = xx * cell - half - cx, dz = zz * cell - half - cz, a = dx * q.ux + dz * q.uz, b = -dx * q.uz + dz * q.ux, rr = Math.hypot(a / (Rc * 1.1), b / Rc);
      if (rr > 1.45) continue;
      const wall = a < -0.1 * Rc ? (-a / Rc - 0.1) * Rc * 1.5 : 0, lip = 2.2 * smoothstep(0.3 * Rc, 0.95 * Rc, a), target = floor + wall + lip + Math.max(0, rr - 0.75) * 9;
      const w = 1 - smoothstep(1.0, 1.45, rr);
      if (target < h[j]) { h[j] += (target - h[j]) * w; if (rr < 0.95) paint(st, j, 'cirque'); }
    }
    // rock basin (tarn): a scoured hollow behind the lip
    pit(st, h, sea, cx + q.ux * Rc * 0.1, cz + q.uz * Rc * 0.1, Rc * 0.6, Rc * 0.5, 0, 2.6, null);
    st.lakeOrigins.push({ x: cx, z: cz, origin: 'glacial-scour', radius: Rc * 0.6 });
    st.landmarks.push({ tag: 'cirque', x: cx, z: cz, radius: Rc });
    // ---- valley glacier path: follow the steepest descent while the climate is cold -------------------------------------------------------
    const path: { x: number; z: number; i: number }[] = [];
    let i = idxOf(st, cx + q.ux * Rc * 1.0, cz + q.uz * Rc * 1.0);
    const maxLen = Math.round((170 + 230 * g) * scale / cell * 1.0);
    for (let k = 0; k < maxLen; k++) {
      path.push({ x: cellX(st, i), z: cellZ(st, i), i });
      const r = flow.rec[i];
      if (r < 0 || sea[r]) { if (r >= 0) path.push({ x: cellX(st, r), z: cellZ(st, r), i: r }); break; }
      if (!cold(r) && k > 10 && c.temp[r] > Tq + 2.2) break;
      i = r;
    }
    if (path.length >= 8) paths.push(path);
  }
  for (const path of paths) {
    const m = path.length, floor = path.map(p => h[p.i]);
    // overdeepened but monotone floor, smoothed
    for (let k = 0; k < m; k++) { let s = 0, cnt = 0; for (let d = -3; d <= 3; d++) { const j = k + d; if (j >= 0 && j < m) { s += floor[j]; cnt++; } } floor[k] = s / cnt - 1.2; }
    for (let k = 1; k < m; k++) floor[k] = Math.min(floor[k], floor[k - 1] - 0.01);
    const last = path[m - 1], toSea = sea[last.i] || signed[last.i] < 40;
    if (toSea) for (let k = Math.max(0, m - 14); k < m; k++) floor[k] = Math.min(floor[k], floor[Math.max(0, m - 14)] - (k - (m - 14)) / 14 * 16 - (k - (m - 14)) * 0.2);
    // carve a parabolic U across each path cell
    const widthAt = (k: number) => (15 + 17 * smoothstep(0, 28, k)) * (0.7 + 0.3 * scale);
    for (let k = 0; k < m; k++) {
      const p = path[k], W = widthAt(k), Hw = 0.75 * W, reach = Math.ceil(W * 1.35 / cell);
      for (let dz = -reach; dz <= reach; dz++) for (let dx = -reach; dx <= reach; dx++) {
        const X = (p.i % n) + dx, Z = Math.floor(p.i / n) + dz;
        if (X < 1 || Z < 1 || X >= n - 1 || Z >= n - 1) continue;
        const j = Z * n + X, d = Math.hypot(dx, dz) * cell;
        if (d > W * 1.35 || (sea[j] && !toSea)) continue;
        const u = d / W, target = floor[k] + Hw * Math.pow(Math.max(0, u - 0.22), 2) * 1.6;
        const w = 1 - smoothstep(1.0, 1.35, u);
        if (target < h[j]) { h[j] += (target - h[j]) * w; if (d < W * 0.95 && !sea[j]) paint(st, j, toSea && (floor[k] < 0.8 || signed[j] < 60) ? 'fjord' : 'u-valley'); }
      }
    }
    st.glacierValleys.push(path.map(p => ({ x: p.x, z: p.z })));
    const mid = path[Math.floor(m / 2)];
    st.landmarks.push({ tag: toSea ? 'fjord' : 'u-valley', x: mid.x, z: mid.z, radius: 60 });
    // lakes in the trough: a ribbon lake behind a rock bar, never on a fjord
    if (!toSea && m > 22) {
      const k = Math.floor(m * 0.6), p = path[k], q = path[Math.min(m - 1, k + 3)], ang = Math.atan2(q.z - p.z, q.x - p.x);
      pit(st, h, sea, p.x, p.z, 40 * scale + 10, 13, ang, 4.5, null);
      st.lakeOrigins.push({ x: p.x, z: p.z, origin: 'glacial-scour', radius: 40 });
    }
    if (!toSea) {
      // terminal moraine arc across the valley mouth, and kettles on the outwash beyond it
      const e = path[m - 1], b = path[Math.max(0, m - 5)], dirx = e.x - b.x, dirz = e.z - b.z, dl = Math.hypot(dirx, dirz) || 1, ux = dirx / dl, uz = dirz / dl, W = widthAt(m - 1);
      const arc: { x: number; z: number }[] = [];
      for (let s = -1.5; s <= 1.5; s += 0.09) arc.push({ x: e.x + ux * (s * s * W * 0.55 + 4) - uz * s * W, z: e.z + uz * (s * s * W * 0.55 + 4) + ux * s * W });
      ridge(st, h, sea, arc, 5.5, R(3.2, 5.5), 'moraine', false, k => 0.55 + 0.45 * Math.abs(st.noise.at(k * 0.7 + e.x * 0.01, 4.1)));
      st.landmarks.push({ tag: 'moraine', x: e.x + ux * 12, z: e.z + uz * 12, radius: W * 1.5 });
      const kettles = 3 + Math.floor(rng() * 3);
      for (let kk = 0; kk < kettles; kk++) {
        const along = R(26, 80), lat = R(-1, 1) * W * 1.4, kx = e.x + ux * along - uz * lat, kz = e.z + uz * along + ux * lat, ki = idxOf(st, kx, kz);
        if (sea[ki] || ctx.slope[ki] > 0.12) continue;
        const r = R(12.5, 16) * (0.8 + 0.2 * scale);
        pit(st, h, sea, kx, kz, r, r * R(0.8, 1), rng() * 3, 3.2, 'kettle');
        st.lakeOrigins.push({ x: kx, z: kz, origin: 'kettle', radius: r });
      }
    }
  }
  // ---- drift lowlands: where ice sheets once covered low ground (cold side of the map), scour, drumlins, moraine belt and kettles -------
  if (g >= 0.6 && st.presetId !== 'highland') { // continental drift lowlands: where ice sheets once covered low country
    const px = (i: number) => cellX(st, i) / t.size, pz = (i: number) => cellZ(st, i) / t.size, along = (i: number) => px(i) * c.pole.x + pz(i) * c.pole.z;
    const margin = R(-0.04, 0.2), fx = -c.pole.x, fz = -c.pole.z; // ice flowed away from the cold side
    const belt: { x: number; z: number }[] = [];
    for (let s = -0.55; s <= 0.55; s += 0.012) {
      const wobble = 0.045 * st.noise.fbm(s * 5 + 3, 1.7, 2) + 0.018 * Math.sin(s * 40);
      belt.push({ x: (c.pole.x * (margin + wobble) - c.pole.z * s) * t.size, z: (c.pole.z * (margin + wobble) + c.pole.x * s) * t.size });
    }
    const onLand = belt.filter(p => { const i = idxOf(st, p.x, p.z); return !sea[i] && signed[i] > 25 && h[i] < 40; });
    const touched = ridge(st, h, sea, onLand, 6.5, R(3.4, 5.4), 'moraine', false, k => 0.35 + 0.65 * smoothstep(-0.2, 0.5, st.noise.at(k * 0.31 + 20, 0.5)));
    for (const i of touched) if (st.prov[i] !== PROV.granite) st.prov[i] = PROV.sediment;
    if (onLand.length) { const mid = onLand[Math.floor(onLand.length / 2)]; st.landmarks.push({ tag: 'moraine', x: mid.x, z: mid.z, radius: 110 }); }
    const flowAng = Math.atan2(fz, fx);
    // drumlins just up-ice of the margin
    const drum: number[] = [];
    for (let i = 0; i < total; i++) { const a = along(i); if (!sea[i] && signed[i] > 30 && a > margin + 0.03 && a < margin + 0.3 && ctx.slope[i] < 0.08 && h[i] < 34) drum.push(i); }
    const wantDrum = Math.round(24 + 16 * g), placed: { x: number; z: number }[] = [];
    for (let tries = 0; tries < 900 && placed.length < wantDrum && drum.length; tries++) {
      const i = drum[Math.floor(rng() * drum.length)], x = cellX(st, i), z = cellZ(st, i);
      if (placed.some(p => Math.hypot(p.x - x, p.z - z) < 30)) continue;
      placed.push({ x, z });
      const L = R(34, 62), Wd = R(11, 19), Hd = R(2.8, 6), ca = Math.cos(flowAng), sa = Math.sin(flowAng);
      for (let zz = Math.max(1, Math.floor((z - L + half) / cell)); zz <= Math.min(n - 2, Math.ceil((z + L + half) / cell)); zz++) for (let xx = Math.max(1, Math.floor((x - L + half) / cell)); xx <= Math.min(n - 2, Math.ceil((x + L + half) / cell)); xx++) {
        const j = zz * n + xx;
        if (sea[j]) continue;
        const dx = xx * cell - half - x, dz = zz * cell - half - z, u = (dx * ca + dz * sa) / L, v = (-dx * sa + dz * ca) / Wd, r2 = u * u * 1.0 + v * v;
        // stoss end blunt, lee end tapering (drumlins are steeper up-ice)
        const taper = u > 0 ? 1 - 0.35 * u : 1;
        if (r2 < 1) { h[j] += Hd * Math.pow(1 - r2, 0.9) * taper; paint(st, j, 'drumlin'); if (st.prov[j] !== PROV.granite) st.prov[j] = PROV.sediment; }
      }
    }
    // ice-scour lake basins (elongated along the flow) and kettles on the outwash plain
    const scourWanted = 2 + Math.round(2 * g);
    for (let tries = 0, made = 0; tries < 500 && made < scourWanted && drum.length; tries++) {
      const i = drum[Math.floor(rng() * drum.length)], x = cellX(st, i), z = cellZ(st, i);
      if (st.lakeOrigins.some(o => Math.hypot(o.x - x, o.z - z) < 110 * scale)) continue;
      pit(st, h, sea, x, z, R(48, 80) * scale + 8, R(19, 30) * scale + 6, flowAng, R(3.8, 6), null);
      st.lakeOrigins.push({ x, z, origin: 'glacial-scour', radius: 60 });
      made++;
    }
    const outwash: number[] = [];
    for (let i = 0; i < total; i++) { const a = along(i); if (!sea[i] && signed[i] > 30 && a < margin - 0.01 && a > margin - 0.16 && ctx.slope[i] < 0.06 && h[i] < 30) outwash.push(i); }
    for (let tries = 0, made = 0; tries < 600 && made < 7 && outwash.length; tries++) {
      const i = outwash[Math.floor(rng() * outwash.length)], x = cellX(st, i), z = cellZ(st, i);
      if (st.lakeOrigins.some(o => Math.hypot(o.x - x, o.z - z) < 60)) continue;
      const r = R(12.5, 17);
      pit(st, h, sea, x, z, r, r * R(0.75, 1), rng() * 3, 3.2, 'kettle');
      st.lakeOrigins.push({ x, z, origin: 'kettle', radius: r });
      made++;
    }
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------
function aeolian(ctx: Ctx) {
  const { st, t, c, flow, accCells, scale } = ctx, { n, cell, h, sea, signed } = t, total = n * n, half = t.size / 2, rng = st.rng;
  const dry = new Float32Array(total);
  let anyDry = 0;
  for (let i = 0; i < total; i++) { if (sea[i]) continue; dry[i] = clamp((0.34 - c.rain[i]) / 0.18) * (c.temp[i] > 4 ? 1 : 0.35); if (dry[i] > 0.3) anyDry++; }
  if (anyDry < 300) return;
  const w = c.wind, wx = w.x, wz = w.z, lam = 36 * scale + 6;
  const sandy = (r: number) => r === 3 || r === 7;
  // ---- dunes: sandy, dry, gentle ground; crest geometry from the wind (transverse and linear fields) -------------------------------------------------
  for (let i = 0; i < total; i++) {
    if (sea[i] || dry[i] < 0.38 || ctx.slope[i] > 0.1 || signed[i] < 22) continue;
    const x = cellX(st, i), z = cellZ(st, i), rk = rockAt(st, i, h[i]);
    if (!sandy(rk)) continue;
    const field = st.noise.fbm(x * 0.0065 + 31, z * 0.0065, 3), patch = smoothstep(0.02, 0.2, field) * smoothstep(0.38, 0.62, dry[i]);
    if (patch <= 0.02) continue;
    const along = x * wx + z * wz, across = -x * wz + z * wx, linear = st.noise.fbm(x * 0.004 + 77, z * 0.004, 2) > 0.12;
    let f: number;
    if (linear) f = (across + 11 * lam * st.noise.fbm(along * 0.004, across * 0.0008, 2)) / (lam * 1.5);
    else f = (along + 0.9 * lam * st.noise.fbm(across * 0.017 + 4, along * 0.002, 2) * 3) / lam;
    f -= Math.floor(f);
    const saw = f < 0.7 ? Math.pow(f / 0.7, 1.3) : Math.pow(1 - (f - 0.7) / 0.3, 1.7), amp = (2.3 + 3.2 * dry[i]) * patch;
    h[i] += amp * (saw - 0.4);
    if (patch > 0.5) { paint(st, i, 'dune'); st.prov[i] = PROV.sediment; }
  }
  // ---- wadis: dry flash-flood channels along drainage lines in the dry zone ----------------------------------------------------------------------------------
  const wadiThr = Math.max(30, ctx.landQuantile(accCells, 0.965));
  for (let i = 0; i < total; i++) {
    if (sea[i] || dry[i] < 0.4 || accCells[i] < wadiThr || signed[i] < 50 || ctx.slope[i] > 0.18) continue;
    const r = flow.rec[i];
    if (r < 0 || sea[r]) continue;
    h[i] -= 1.3 * dry[i];
    paint(st, i, 'wadi');
    for (let k = 0; k < 4; k++) { const j = i + DX[k] + DZ[k] * n; if (!sea[j]) { h[j] -= 0.45 * dry[i]; paint(st, j, 'wadi'); } }
  }
  // ---- yardangs and badlands on soft rock; desert pavement on stable flats ----------------------------------------------------------------------------------
  for (let i = 0; i < total; i++) {
    if (sea[i] || dry[i] < 0.45 || signed[i] < 25) continue;
    const x = cellX(st, i), z = cellZ(st, i), rk = rockAt(st, i, h[i]), tg = st.tag[i];
    if (tg === 45 || tg === 47) continue;
    if ((rk === 5 || rk === 7 || rk === 6) && ctx.slope[i] < 0.12) {
      const along = x * wx + z * wz, across = -x * wz + z * wx, v = st.noise.ridged(along * 0.0045 + 9, across * 0.048, 3), m = smoothstep(0.62, 0.86, v) * smoothstep(0.55, 0.85, dry[i]);
      if (m > 0.05) { h[i] += 2.8 * m; if (m > 0.45) paint(st, i, 'yardang'); }
    } else if (rk === 5 && ctx.slope[i] > 0.16) {
      const v = st.noise.ridged(x * 0.045, z * 0.045, 3) - 0.45;
      h[i] += v * 3.2 * dry[i];
      paint(st, i, 'badlands');
    }
    if (ctx.slope[i] < 0.07 && dry[i] > 0.6 && !st.tag[i]) paint(st, i, 'desert-pavement');
  }
  // ---- playas: the lowest flat floors of the dry zone (flattened after hydrology so no river crosses them) --------------------------------------------------
  const cands: number[] = [];
  for (let i = 0; i < total; i++) if (!sea[i] && dry[i] > 0.55 && ctx.slope[i] < 0.035 && signed[i] > 70 * scale && !st.tag[i]) cands.push(i);
  cands.sort((a, b) => h[a] - h[b]);
  const made: { x: number; z: number }[] = [];
  for (const i of cands) {
    if (made.length >= 2) break;
    const x = cellX(st, i), z = cellZ(st, i);
    if (made.some(p => Math.hypot(p.x - x, p.z - z) < 160)) continue;
    made.push({ x, z });
    const rx = (30 + rng() * 26) * scale + 8, rz = rx * (0.55 + 0.35 * rng()), ang = rng() * Math.PI;
    st.playas = st.playas ?? [];
    st.playas.push({ x, z, rx, rz, ang });
    st.landmarks.push({ tag: 'playa', x, z, radius: rx });
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------
function humidKarst(ctx: Ctx) {
  const { st, t, c, scale } = ctx, { n, cell, h, sea, signed } = t, half = t.size / 2, rng = st.rng;
  if (st.spec.mix.limestone < 0.25) return;
  const cands: number[] = [];
  for (let i = 0; i < n * n; i++) if (!sea[i] && st.prov[i] === PROV.limestone && c.temp[i] > 13 && c.rain[i] > 0.52 && signed[i] > 18 && ctx.slope[i] < 0.2 && h[i] < 40) cands.push(i);
  if (cands.length < 40) return;
  const clusters = st.presetId === 'archipelago' ? 3 : 1 + (rng() < 0.5 ? 1 : 0), centers: { x: number; z: number }[] = [];
  for (let k = 0; k < clusters; k++) {
    const i = cands[Math.floor(rng() * cands.length)], cx = cellX(st, i), cz = cellZ(st, i);
    if (centers.some(p => Math.hypot(p.x - cx, p.z - cz) < 140)) continue;
    centers.push({ x: cx, z: cz });
    const towers = 5 + Math.floor(rng() * 6);
    for (let q = 0; q < towers; q++) {
      const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * 62 * scale, x = cx + Math.cos(a) * d, z = cz + Math.sin(a) * d, ti = idxOf(st, x, z);
      if (sea[ti] || st.prov[ti] !== PROV.limestone) continue;
      const r = (5.5 + rng() * 4) * (0.8 + 0.2 * scale), Ht = 12 + rng() * 14;
      for (let zz = Math.max(1, Math.floor((z - r * 1.3 + half) / cell)); zz <= Math.min(n - 2, Math.ceil((z + r * 1.3 + half) / cell)); zz++) for (let xx = Math.max(1, Math.floor((x - r * 1.3 + half) / cell)); xx <= Math.min(n - 2, Math.ceil((x + r * 1.3 + half) / cell)); xx++) {
        const j = zz * n + xx;
        if (sea[j]) continue;
        const dd = Math.hypot(xx * cell - half - x, zz * cell - half - z) / r;
        if (dd < 1) { h[j] += Ht * Math.pow(1 - dd * dd, 0.42) * (0.9 + 0.1 * st.noise.at(xx * 0.5, zz * 0.5)); paint(st, j, 'karst-tower'); }
      }
    }
    st.landmarks.push({ tag: 'karst-tower', x: cx, z: cz, radius: 70 });
  }
}

// ---------------------------------------------------------------------------------------------------------------------------------
function coasts(ctx: Ctx) {
  const { st, t, c, scale, accRain } = ctx, { n, cell, h, sea, signed } = t, half = t.size / 2, rng = st.rng, total = n * n;
  const E = st.spec.coast;
  const sg = (x: number, z: number) => { const X = Math.max(1, Math.min(n - 2, Math.round((x + half) / cell))), Z = Math.max(1, Math.min(n - 2, Math.round((z + half) / cell))); return signed[Z * n + X]; };
  const normal = (x: number, z: number) => { const gx = sg(x + cell, z) - sg(x - cell, z), gz = sg(x, z + cell) - sg(x, z - cell), l = Math.hypot(gx, gz) || 1; return { x: -gx / l, z: -gz / l }; }; // seaward unit normal
  const wl = Math.hypot(c.wind.x, c.wind.z) || 1;
  const exposure = (x: number, z: number, nx: number, nz: number) => {
    let open = 0, cnt = 0;
    for (let k = -3; k <= 3; k++) {
      const a = Math.atan2(nz, nx) + k * 0.3, ux = Math.cos(a), uz = Math.sin(a);
      let dist = 0;
      for (let d = 8; d <= 320; d += 8) { if (sg(x + ux * d, z + uz * d) > 0) break; dist = d; }
      open += dist / 320; cnt++;
    }
    const wind = 0.55 + 0.45 * Math.max(0, -(nx * c.wind.x + nz * c.wind.z) / wl);
    return clamp(open / cnt * wind * (0.4 + 0.8 * E) * 1.5);
  };
  // shoreline cells: land cells with a sea neighbour
  const shore: { i: number; x: number; z: number; nx: number; nz: number; e: number; hard: number; landFrac: number }[] = [];
  for (let z = 2; z < n - 2; z += 2) for (let x = 2; x < n - 2; x += 2) {
    const i = z * n + x;
    if (sea[i] || signed[i] > cell * 1.6) continue;
    const px = cellX(st, i), pz = cellZ(st, i), nm = normal(px, pz), e = exposure(px, pz, nm.x, nm.z);
    let land = 0, cnt = 0;
    for (let dz = -6; dz <= 6; dz += 2) for (let dx = -6; dx <= 6; dx += 2) { const X = x + dx, Z = z + dz; if (X >= 0 && Z >= 0 && X < n && Z < n) { cnt++; if (!sea[Z * n + X]) land++; } }
    shore.push({ i, x: px, z: pz, nx: nm.x, nz: nm.z, e, hard: ROCKS[rockAt(st, i, h[i])].hardness, landFrac: land / cnt });
  }
  if (!shore.length) return;
  const hAt = (x: number, z: number) => h[Math.max(0, Math.min(n - 1, Math.round((z + half) / cell))) * n + Math.max(0, Math.min(n - 1, Math.round((x + half) / cell)))];
  // ---- cliffs where hard rock meets energetic water, beaches where it is soft or sheltered ---------------------------------------------------------------------------
  const cliffCells = new Set<number>();
  for (const s of shore) {
    const inland = hAt(s.x - s.nx * 34, s.z - s.nz * 34);
    if (s.e > 0.4 && s.hard >= HARD && inland > 6) {
      const top = Math.min(inland, 5 + 15 * s.e * s.hard);
      for (let d = 6; d <= 18; d += cell * 0.8) {
        const px = s.x - s.nx * d, pz = s.z - s.nz * d, k = idxOf(st, px, pz);
        if (sea[k]) continue;
        const rise = top * Math.pow(smoothstep(6, 16, d), 0.55);
        if (rise > h[k] && ROCKS[rockAt(st, k, h[k])].hardness >= 0.5) { h[k] = h[k] * 0.35 + rise * 0.65; paint(st, k, 'sea-cliff'); cliffCells.add(k); }
      }
      paint(st, s.i, 'sea-cliff');
    } else if ((s.hard < 0.45 || s.e < 0.38 || (s.landFrac > 0.62 && s.e < 0.7)) && h[s.i] < 3) {
      for (let d = 0; d <= 14; d += cell) { const k = idxOf(st, s.x - s.nx * d, s.z - s.nz * d); if (!sea[k] && h[k] < 2.4) paint(st, k, 'beach'); }
    }
  }
  // ---- sea stacks (and arch markers) off exposed hard headlands ----------------------------------------------------------------------------------------------------
  const heads = shore.filter(s => s.landFrac < 0.42 && s.e > 0.45 && s.hard >= HARD).sort((a, b) => b.e * b.hard - a.e * a.hard);
  const stacked: { x: number; z: number }[] = [];
  for (const hd of heads) {
    if (stacked.length >= 5) break;
    if (stacked.some(p => Math.hypot(p.x - hd.x, p.z - hd.z) < 70)) continue;
    stacked.push({ x: hd.x, z: hd.z });
    const count = 1 + Math.floor(rng() * 3);
    for (let q = 0; q < count; q++) {
      const off = 13 + q * 14 + rng() * 9, lat = (rng() - 0.5) * 16, x = hd.x + hd.nx * off - hd.nz * lat, z = hd.z + hd.nz * off + hd.nx * lat, i = idxOf(st, x, z);
      if (!sea[i] || h[i] < -5) continue;
      const r = 3.6 + rng() * 3.6, Hs = 6 + rng() * 9;
      for (let zz = Math.floor((z - r * 1.6 + half) / cell); zz <= Math.ceil((z + r * 1.6 + half) / cell); zz++) for (let xx = Math.floor((x - r * 1.6 + half) / cell); xx <= Math.ceil((x + r * 1.6 + half) / cell); xx++) {
        if (xx < 1 || zz < 1 || xx >= n - 1 || zz >= n - 1) continue;
        const j = zz * n + xx, d = Math.hypot(xx * cell - half - x, zz * cell - half - z) / r;
        if (d < 1) { h[j] = Math.max(h[j], Hs * Math.pow(1 - d * d, 0.45) + 0.1); st.prov[j] = st.prov[hd.i] || PROV.sediment; paint(st, j, 'sea-stack'); }
        else if (d < 1.6 && h[j] < -0.5) h[j] = Math.max(h[j], -0.5 - (d - 1) * 3); // wave-cut shelf around the stack
      }
      if (q === 0) st.landmarks.push({ tag: 'sea-stack', x, z, radius: 14 });
    }
    if (stacked.length <= 2 && hd.hard >= 0.85 && hd.e > 0.6) { st.landmarks.push({ tag: 'sea-arch', x: hd.x + hd.nx * 8, z: hd.z + hd.nz * 8, radius: 12 }); paint(st, hd.i, 'sea-arch'); }
  }
  // ---- spits and barrier bars on soft, moderately exposed coasts; lagoon behind -----------------------------------------------------------------------------------------
  const soft = shore.filter(s => (s.hard < 0.5 || st.prov[s.i] === PROV.sediment) && s.e > 0.12 && s.e < 0.85 && h[s.i] < 4).sort(() => rng() - 0.5);
  const drift = (nx: number, nz: number) => { const tx = -nz, tz = nx, sign = tx * c.wind.x + tz * c.wind.z >= 0 ? 1 : -1; return { x: tx * sign, z: tz * sign }; };
  let spits = 0, bars = 0;
  const used: { x: number; z: number }[] = [];
  for (const s of soft) {
    if (spits >= 2 && bars >= 2) break;
    if (used.some(p => Math.hypot(p.x - s.x, p.z - s.z) < 150)) continue;
    const d0 = drift(s.nx, s.nz);
    if (s.landFrac < 0.5 && spits < 2) {
      // spit from a convex corner: leaves the shore, then hooks back toward land
      const L = 80 + rng() * 70, pts: { x: number; z: number }[] = [];
      let x = s.x, z = s.z, dx = d0.x * 0.94 + s.nx * 0.34, dz = d0.z * 0.94 + s.nz * 0.34;
      for (let k = 0; k * 3 < L; k++) {
        const f = k * 3 / L, hook = f > 0.6 ? (f - 0.6) * 1.9 : 0;
        dx = dx * 0.9 + (d0.x - s.nx * hook * 0.9) * 0.1; dz = dz * 0.9 + (d0.z - s.nz * hook * 0.9) * 0.1;
        const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
        x += dx * 3; z += dz * 3;
        if (sg(x, z) < -45 || hAt(x, z) < -3.5) break;
        pts.push({ x, z });
      }
      if (pts.length > 16) {
        for (const p of pts) { const i = idxOf(st, p.x, p.z); if (sea[i] && st.prov[i] === 0) st.prov[i] = PROV.sediment; }
        ridge(st, h, null, pts, 3.2, 1.15, 'spit', true);
        lagoon(st, h, sea, pts, s, 26);
        st.landmarks.push({ tag: 'spit', x: pts[Math.floor(pts.length / 2)].x, z: pts[Math.floor(pts.length / 2)].z, radius: 40 });
        used.push({ x: s.x, z: s.z }); spits++;
      }
    } else if (bars < 2) {
      // barrier bar parallel to the shore at fixed offshore distance
      const off = 34 + rng() * 22, L = 120 + rng() * 90, pts: { x: number; z: number }[] = [];
      let x = s.x + s.nx * off, z = s.z + s.nz * off;
      for (let k = 0; k * 3 < L; k++) {
        const nm = normal(x, z), tx = -nm.z * (d0.x * -nm.z + d0.z * nm.x >= 0 ? 1 : -1), tz = nm.x * (d0.x * -nm.z + d0.z * nm.x >= 0 ? 1 : -1);
        x += tx * 3; z += tz * 3;
        const e = sg(x, z) + off; // want signed == -off
        x += nm.x * -e * 0.5; z += nm.z * -e * 0.5;
        if (hAt(x, z) < -3 || sg(x, z) > -10) { if (pts.length > 6) break; else continue; }
        pts.push({ x, z });
      }
      if (pts.length > 24) {
        ridge(st, h, null, pts, 3.4, 1.1, 'barrier-bar', true, k => smoothstep(0, 5, k) * smoothstep(0, 5, pts.length - k) * (0.75 + 0.25 * st.noise.at(k * 0.4, 9)));
        lagoonBetween(st, h, sea, pts, s);
        st.landmarks.push({ tag: 'barrier-bar', x: pts[Math.floor(pts.length / 2)].x, z: pts[Math.floor(pts.length / 2)].z, radius: 60 });
        used.push({ x: s.x, z: s.z }); bars++;
      }
    }
  }
  // ---- estuaries and tidal flats at the mouths of large drainage lines on sheltered shores ---------------------------------------------------------------------------------
  const mouthThr = ctx.landQuantile(accRain, 0.985);
  const mouths = shore.filter(s => accRain[s.i] >= mouthThr && s.e < 0.55 && h[s.i] < 3.5).slice(0, 4);
  let flats = 0;
  for (const m of mouths) {
    if (flats >= 2 || used.some(p => Math.hypot(p.x - m.x, p.z - m.z) < 120)) continue;
    flats++;
    used.push({ x: m.x, z: m.z });
    const R0 = 36 * scale + 14;
    for (let zz = Math.floor((m.z - R0 + half) / cell); zz <= Math.ceil((m.z + R0 + half) / cell); zz++) for (let xx = Math.floor((m.x - R0 + half) / cell); xx <= Math.ceil((m.x + R0 + half) / cell); xx++) {
      if (xx < 1 || zz < 1 || xx >= n - 1 || zz >= n - 1) continue;
      const j = zz * n + xx, d = Math.hypot(xx * cell - half - m.x, zz * cell - half - m.z), sgn = signed[j];
      if (d > R0 || sgn < -30 || sgn > 18) continue;
      const w = (1 - smoothstep(0.5 * R0, R0, d)) * (1 - smoothstep(10, 18, sgn)), flat = -0.28 + 0.62 * smoothstep(-30, 16, sgn);
      h[j] = h[j] + (flat - h[j]) * w * 0.85;
      if (w > 0.35) paint(st, j, Math.abs(h[j]) < 0.45 ? 'tidal-flat' : 'estuary');
    }
    st.landmarks.push({ tag: 'estuary', x: m.x, z: m.z, radius: R0 });
  }
  void total;
}
/** Shallow water between a ridge and the shore: flatten the sea floor to about -0.5 m and tag it lagoon. */
function lagoon(st: GeoState, h: Float32Array, sea: Uint8Array, pts: { x: number; z: number }[], s: { nx: number; nz: number }, width: number) {
  const { n, cell, half } = st;
  for (const p of pts) {
    for (let dz = -Math.ceil(width / cell); dz <= Math.ceil(width / cell); dz++) for (let dx = -Math.ceil(width / cell); dx <= Math.ceil(width / cell); dx++) {
      const X = Math.round((p.x + half) / cell) + dx, Z = Math.round((p.z + half) / cell) + dz;
      if (X < 1 || Z < 1 || X >= n - 1 || Z >= n - 1) continue;
      const j = Z * n + X, ox = X * cell - half - p.x, oz = Z * cell - half - p.z, d = Math.hypot(ox, oz);
      if (d > width || !sea[j] || h[j] > -0.2 || ox * s.nx + oz * s.nz > 0.5) continue; // landward side only
      h[j] = Math.max(h[j], -0.55 - 0.02 * d);
      paint(st, j, 'lagoon');
    }
  }
}
function lagoonBetween(st: GeoState, h: Float32Array, sea: Uint8Array, bar: { x: number; z: number }[], s: { x: number; z: number; nx: number; nz: number }) {
  lagoon(st, h, sea, bar, s, 40);
}

/** After all edits, re-derive the land mask, distance to coast and land fraction from the height field. */
export function refreshShore(t: Terrain, st: GeoState) {
  const { n, cell, h, sea, signed } = t, total = n * n;
  let landCells = 0;
  for (let i = 0; i < total; i++) { sea[i] = h[i] > 0.02 ? 0 : 1; if (!sea[i]) { landCells++; if (!st.prov[i]) st.prov[i] = PROV.sediment; } }
  const toSea = distanceTransform(sea, n), land = new Uint8Array(total);
  for (let i = 0; i < total; i++) land[i] = sea[i] ? 0 : 1;
  const toLand = distanceTransform(land, n);
  for (let i = 0; i < total; i++) signed[i] = sea[i] ? -(toLand[i] - 0.5) * cell : (toSea[i] - 0.5) * cell;
  t.landFraction = landCells / total;
}

/** Final-height features that must not feed hydrology: sinkholes, tors, playa floors. `dry(x,z)` is true well above any water. */
export function finalFeatures(st: GeoState, heightsAt: (ix: number, iz: number) => number, setHeight: (ix: number, iz: number, v: number) => void, n: number, size: number, dry: (x: number, z: number) => boolean, waterY: number) {
  const sg = size / (n - 1), half = size / 2, rng = st.rng, scale = size / 1040;
  const px = (ix: number) => ix * sg - half;
  const to = (x: number) => Math.round((x + half) / sg);
  const stamp = (x: number, z: number, r: number, fn: (d: number, ix: number, iz: number) => void) => {
    for (let iz = Math.max(1, to(z - r)); iz <= Math.min(n - 2, to(z + r)); iz++) for (let ix = Math.max(1, to(x - r)); ix <= Math.min(n - 2, to(x + r)); ix++) { const d = Math.hypot(px(ix) - x, px(iz) - z) / r; if (d < 1) fn(d, ix, iz); }
  };
  const addTag = (ix: number, iz: number, name: string) => { const i = idxOf(st, px(ix), px(iz)); paint(st, i, name); };
  // sinkholes in limestone
  const lime: number[] = [];
  for (let i = 0; i < st.prov.length; i++) if (st.prov[i] === PROV.limestone && !st.tag[i]) lime.push(i);
  if (lime.length > 200) {
    const want = Math.min(26, Math.round(lime.length / 600)), done: { x: number; z: number }[] = [];
    for (let tries = 0; tries < 600 && done.length < want; tries++) {
      const i = lime[Math.floor(rng() * lime.length)], x = cellX(st, i), z = cellZ(st, i);
      if (!dry(x, z) || done.some(p => Math.hypot(p.x - x, p.z - z) < 28 * scale)) continue;
      const ix = to(x), iz = to(z), r = (7 + rng() * 8) * (0.85 + 0.15 * scale), depth = 3 + rng() * 5;
      if (Math.abs(heightsAt(ix + 3, iz) - heightsAt(ix - 3, iz)) > 3.2) continue;
      done.push({ x, z });
      stamp(x, z, r * 1.25, (d, jx, jz) => {
        const rr = d * 1.25; if (rr >= 1.25) return;
        setHeight(jx, jz, heightsAt(jx, jz) - depth * (1 - smoothstep(0.15, 1.25, rr)) + 0.35 * gauss(rr - 1.05, 0.2));
        if (rr < 0.95) addTag(jx, jz, 'sinkhole');
      });
      st.landmarks.push({ tag: 'sinkhole', x, z, radius: r });
    }
  }
  // tors: clustered joint-bounded granite blocks on gentle granite ground
  const gran: number[] = [];
  for (let i = 0; i < st.prov.length; i++) if (st.prov[i] === PROV.granite && !st.tag[i]) gran.push(i);
  if (gran.length > 150 && st.spec.granite >= 0.3) {
    const want = Math.min(18, 3 + Math.round(st.spec.granite * 10)), done: { x: number; z: number }[] = [];
    for (let tries = 0; tries < 600 && done.length < want; tries++) {
      const i = gran[Math.floor(rng() * gran.length)], x = cellX(st, i), z = cellZ(st, i);
      if (!dry(x, z) || done.some(p => Math.hypot(p.x - x, p.z - z) < 40)) continue;
      const ix = to(x), iz = to(z);
      if (Math.abs(heightsAt(ix + 3, iz) - heightsAt(ix - 3, iz)) > 4.5) continue;
      done.push({ x, z });
      const blocks = 3 + Math.floor(rng() * 4);
      for (let b = 0; b < blocks; b++) {
        const a = rng() * 6.28, d = rng() * 9, bx = x + Math.cos(a) * d, bz = z + Math.sin(a) * d, r = 2.8 + rng() * 3.2, Hb = 2.2 + rng() * 5.5;
        stamp(bx, bz, r, (dd, jx, jz) => { setHeight(jx, jz, heightsAt(jx, jz) + Hb * Math.pow(1 - dd * dd, 0.35) * (0.88 + 0.12 * st.noise.at(jx * 0.9, jz * 0.9))); addTag(jx, jz, 'tor'); });
      }
      st.landmarks.push({ tag: 'tor', x, z, radius: 12 });
    }
  }
  // playas: flat salt floors
  for (const p of st.playas ?? []) {
    const ix = to(p.x), iz = to(p.z), floor = heightsAt(ix, iz) - 0.15, c = Math.cos(p.ang), s = Math.sin(p.ang), reach = Math.max(p.rx, p.rz) * 1.3;
    if (!dry(p.x, p.z)) continue;
    stamp(p.x, p.z, reach, (_d, jx, jz) => {
      const dx = px(jx) - p.x, dz = px(jz) - p.z, rr = Math.hypot((dx * c + dz * s) / p.rx, (-dx * s + dz * c) / p.rz) * (1 + 0.12 * st.noise.at(jx * 0.13, jz * 0.13));
      if (rr > 1.3) return;
      const w = 1 - smoothstep(0.85, 1.3, rr), cur = heightsAt(jx, jz);
      setHeight(jx, jz, cur + (floor - cur) * w);
      if (rr < 1) addTag(jx, jz, 'playa');
    });
  }
  void waterY;
}
