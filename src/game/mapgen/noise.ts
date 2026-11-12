/** Map generation v2 (Claude, mapgen lane): seeded gradient noise and small grid helpers.
 * Everything here is pure and deterministic per seed; no global state. */
export function hash2i(a: number, b: number, s: number) {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(s | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}
const GRAD = (() => {
  const g = new Float32Array(512);
  for (let i = 0; i < 256; i++) {
    const a = (i / 256) * Math.PI * 2;
    g[i * 2] = Math.cos(a);
    g[i * 2 + 1] = Math.sin(a);
  }
  return g;
})();
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

/** Perlin-style gradient noise in about [-1, 1]. */
export class Noise {
  readonly seed: number;
  constructor(seed: number) {
    this.seed = seed | 0;
  }
  at(x: number, z: number) {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    const s = this.seed;
    const u = fade(xf), v = fade(zf);
    const xj = xi + 1, zj = zi + 1;
    const ka = (hash2i(xi, zi, s) & 255) * 2, kb = (hash2i(xj, zi, s) & 255) * 2, kc = (hash2i(xi, zj, s) & 255) * 2, kd = (hash2i(xj, zj, s) & 255) * 2;
    const a = GRAD[ka] * xf + GRAD[ka + 1] * zf, b = GRAD[kb] * (xf - 1) + GRAD[kb + 1] * zf;
    const c = GRAD[kc] * xf + GRAD[kc + 1] * (zf - 1), d = GRAD[kd] * (xf - 1) + GRAD[kd + 1] * (zf - 1);
    const ab = a + (b - a) * u;
    return (ab + (c + (d - c) * u - ab) * v) * 1.41;
  }
  fbm(x: number, z: number, octaves = 4, lacunarity = 2.02, gain = 0.5) {
    let amp = 1, freq = 1, sum = 0, norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amp * this.at(x * freq + i * 17.31, z * freq - i * 9.77);
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / norm;
  }
  /** Ridged multifractal (sharp crests), roughly [0, 1]. */
  ridged(x: number, z: number, octaves = 4, lacunarity = 2.1, gain = 0.5) {
    let amp = 0.5, freq = 1, sum = 0, weight = 1, norm = 0;
    for (let i = 0; i < octaves; i++) {
      let n = 1 - Math.abs(this.at(x * freq + i * 5.13, z * freq + i * 3.71));
      n *= n;
      n *= weight;
      weight = Math.max(0, Math.min(1, n * 2));
      sum += n * amp;
      norm += amp;
      amp *= gain;
      freq *= lacunarity;
    }
    return sum / norm;
  }
}
export const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a || 1));
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Bilinear sample of a vertex-aligned square grid of `n` vertices per side spanning [-size/2, size/2]. */
export function sampleGrid(field: Float32Array | Float64Array, n: number, size: number, x: number, z: number) {
  const segs = n - 1;
  const gx = clamp((x / size + 0.5) * segs, 0, segs), gz = clamp((z / size + 0.5) * segs, 0, segs);
  const ix = Math.min(segs - 1, Math.floor(gx)), iz = Math.min(segs - 1, Math.floor(gz));
  const fx = gx - ix, fz = gz - iz, i = iz * n + ix;
  return field[i] * (1 - fx) * (1 - fz) + field[i + 1] * fx * (1 - fz) + field[i + n] * (1 - fx) * fz + field[i + n + 1] * fx * fz;
}
/** Catmull-Rom bicubic sample of the same grid layout; smoother than bilinear for height fields. */
export function sampleGridCubic(field: Float32Array | Float64Array, n: number, size: number, x: number, z: number) {
  const segs = n - 1;
  const gx = clamp((x / size + 0.5) * segs, 0, segs), gz = clamp((z / size + 0.5) * segs, 0, segs);
  const ix = Math.min(segs - 1, Math.floor(gx)), iz = Math.min(segs - 1, Math.floor(gz));
  const fx = gx - ix, fz = gz - iz;
  const cr = (p0: number, p1: number, p2: number, p3: number, t: number) =>
    p1 + 0.5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
  const row = (z0: number) => {
    const zr = Math.max(0, Math.min(segs, z0)) * n;
    const a = field[zr + Math.max(0, ix - 1)], b = field[zr + ix], c = field[zr + ix + 1], d = field[zr + Math.min(segs, ix + 2)];
    return cr(a, b, c, d, fx);
  };
  return cr(row(iz - 1), row(iz), row(iz + 1), row(iz + 2), fz);
}
/** Exact Euclidean distance transform (Felzenszwalb), in cells; `source` cells have distance 0. */
export function distanceTransform(source: Uint8Array, n: number): Float32Array {
  const INF = 1e20, f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  const grid = new Float32Array(n * n);
  for (let i = 0; i < n * n; i++) grid[i] = source[i] ? 0 : INF;
  const pass = (read: (i: number) => number, write: (i: number, value: number) => void) => {
    for (let i = 0; i < n; i++) f[i] = read(i);
    let k = 0;
    v[0] = 0;
    z[0] = -INF;
    z[1] = INF;
    for (let q = 1; q < n; q++) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) {
        k--;
        s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      }
      k++;
      v[k] = q;
      z[k] = s;
      z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
    }
    for (let i = 0; i < n; i++) write(i, d[i]);
  };
  for (let x = 0; x < n; x++) pass(i => grid[i * n + x], (i, value) => { grid[i * n + x] = value; });
  for (let zz = 0; zz < n; zz++) pass(i => grid[zz * n + i], (i, value) => { grid[zz * n + i] = value; });
  for (let i = 0; i < n * n; i++) grid[i] = Math.sqrt(grid[i]);
  return grid;
}
/** Seeded Fisher-Yates helpers over a mulberry-style generator. */
export function pick<T>(rand: () => number, list: readonly T[]): T {
  return list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
}
export const range = (rand: () => number, lo: number, hi: number) => lo + (hi - lo) * rand();
