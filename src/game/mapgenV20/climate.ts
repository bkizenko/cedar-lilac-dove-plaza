/** Climate on the working grid: temperature from latitude, elevation and noise; rainfall from
 * moist onshore wind that rains out on windward slopes and leaves rain shadows behind ranges. */
import { Noise, clamp, smoothstep } from './noise';
import type { Terrain } from './terrain';
import type { PresetSpec } from './presets';
export type Climate = {
  /** Degrees Celsius at ground level. */
  temp: Float32Array;
  /** Normalised rainfall 0..1 (1 = wettest 10% of land). */
  rain: Float32Array;
  /** Unit wind vector (direction the air moves). */
  wind: { x: number; z: number };
  /** Unit vector pointing "polewards" (cold side) and the sea-level temperature at its origin. */
  pole: { x: number; z: number };
  seaTemp: number;
  span: number;
};
function bilinear(f: Float32Array, n: number, x: number, z: number) {
  const gx = clamp(x, 0, n - 1.001), gz = clamp(z, 0, n - 1.001), ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz, i = iz * n + ix;
  return f[i] * (1 - fx) * (1 - fz) + f[i + 1] * fx * (1 - fz) + f[i + n] * (1 - fx) * fz + f[i + n + 1] * fx * fz;
}
export function buildClimate(seed: number, t: Terrain, preset: PresetSpec, rand: () => number): Climate {
  const { n, cell, size, h, sea } = t, total = n * n;
  const noise = new Noise(seed ^ 0x4c11db7);
  const R = (a: number, b: number) => a + (b - a) * rand();
  // wind blows across the main ranges so one flank is wet and the lee is dry
  const windAngle = t.axis + Math.PI / 2 + (rand() < 0.5 ? 0 : Math.PI) + R(-0.35, 0.35);
  const wind = { x: Math.cos(windAngle), z: Math.sin(windAngle) };
  const poleAngle = rand() * Math.PI * 2, pole = { x: Math.cos(poleAngle), z: Math.sin(poleAngle) };
  const seaTemp = R(preset.temp.base[0], preset.temp.base[1]), span = R(preset.temp.span[0], preset.temp.span[1]);
  const temp = new Float32Array(total);
  for (let z = 0; z < n; z++) {
    for (let x = 0; x < n; x++) {
      const i = z * n + x, u = x / (n - 1) - 0.5, v = z / (n - 1) - 0.5;
      const lat = u * pole.x + v * pole.z; // -0.5 .. 0.5, positive = cold side
      const elev = Math.max(0, h[i]);
      const maritime = sea[i] ? 0 : smoothstep(0, 0.2 * size, t.signed[i]) * 0.6;
      temp[i] = seaTemp - span * lat * 2 - 0.058 * elev + noise.fbm(u * 2.6, v * 2.6, 3) * 1.6 + maritime * noise.fbm(u * 1.2 + 4, v * 1.2, 2) * 0.8;
    }
  }
  // moist air: semi-Lagrangian advection over the grid, losing water on windward slopes
  const step = 3, passes = Math.ceil((n * 1.15) / step);
  let m = new Float32Array(total), next = new Float32Array(total);
  for (let i = 0; i < total; i++) m[i] = sea[i] ? 1 : 0.35;
  const kBase = 0.022, kOro = 0.55, recharge = 0.012;
  const loss = new Float32Array(total);
  for (let pass = 0; pass <= passes; pass++) {
    const final = pass === passes;
    for (let z = 0; z < n; z++) {
      for (let x = 0; x < n; x++) {
        const i = z * n + x;
        if (sea[i]) {
          next[i] = 1;
          continue;
        }
        const ux = x - wind.x * step, uz = z - wind.z * step;
        let mu = ux < 0 || uz < 0 || ux > n - 1 || uz > n - 1 ? 0.9 : bilinear(m, n, ux, uz);
        const hu = bilinear(h, n, clamp(ux, 0, n - 1), clamp(uz, 0, n - 1));
        const rise = Math.max(0, h[i] - hu) / (step * cell);
        const f = Math.min(0.6, kBase + kOro * rise);
        const lost = mu * f;
        mu = mu - lost + recharge * (1 - mu);
        next[i] = mu;
        if (final) loss[i] = lost;
      }
    }
    const swap = m;
    m = next;
    next = swap;
  }
  const rainRaw = new Float32Array(total), land: number[] = [];
  for (let i = 0; i < total; i++) {
    if (sea[i]) continue;
    const u = (i % n) / (n - 1) - 0.5, v = ((i / n) | 0) / (n - 1) - 0.5;
    rainRaw[i] = loss[i] * (1 + 0.25 * noise.fbm(u * 3.1 + 7, v * 3.1, 3));
    land.push(rainRaw[i]);
  }
  land.sort((a, b) => a - b);
  const pct = (v: number) => { let lo = 0, hi = land.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (land[mid] < v) lo = mid + 1; else hi = mid; } return land.length ? lo / land.length : 0.5; };
  const rain = new Float32Array(total), wet = R(preset.wet[0], preset.wet[1]);
  for (let i = 0; i < total; i++) rain[i] = sea[i] ? 1 : clamp(Math.pow(pct(rainRaw[i]), 0.8) * 0.9 + 0.1 + wet, 0, 1);
  return { temp, rain, wind, pole, seaTemp, span };
}
