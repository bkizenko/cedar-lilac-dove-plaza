/** Climate -> biome logic. Latitude/elevation temperature, onshore rainfall with rain shadows,
 * floodplain wetness and coast distance are combined into the game's ecological provinces with
 * noise-jittered thresholds so transitions are ragged ecotones rather than contour lines. */
import { Noise, clamp, smoothstep, distanceTransform, sampleGrid } from './noise';
import { PROVINCE_KINDS, PROVINCE_PROFILES, type EcologicalProvinceGrid, type ProvinceKind } from '../ecologicalProvinces';
import type { Climate } from './climate';
import type { Terrain } from './terrain';
import type { Hydrology } from './hydro';
import type { LakeShape } from './heightfield';
export type BiomeInputs = {
  seed: number;
  size: number;
  terrain: Terrain;
  climate: Climate;
  hydro: Hydrology;
  lakes: LakeShape[];
  /** World height and local water surface functions (metres, game coordinates). */
  height: (x: number, z: number) => number;
  water: (x: number, z: number) => number;
  waterY: number;
};
const K = (kind: ProvinceKind) => PROVINCE_KINDS.indexOf(kind);
export function buildBiomes(inp: BiomeInputs): EcologicalProvinceGrid & { treeline: number; coastDistanceMeters: Float32Array; temperatureC: Float32Array; rain: Float32Array; wetness: Float32Array; slope: Float32Array } {
  const { size, terrain: t, climate: c, hydro, height, water, waterY } = inp;
  const width = Math.ceil(size / 12), cell = size / width, total = width * width, half = size / 2;
  const noiseA = new Noise(inp.seed ^ 0x1f83d9ab), noiseB = new Noise(inp.seed ^ 0x5be0cd19), noiseC = new Noise(inp.seed ^ 0x9b05688c);
  const px = (id: number) => (id % width + 0.5) * cell - half, pz = (id: number) => (Math.floor(id / width) + 0.5) * cell - half;
  const elev = new Float32Array(total), wet = new Uint8Array(total), seaMask = new Uint8Array(total), slope = new Float32Array(total), aboveWater = new Float32Array(total);
  let landCells = 0;
  for (let id = 0; id < total; id++) {
    const x = px(id), z = pz(id), h = height(x, z), w = water(x, z);
    elev[id] = h - waterY;
    aboveWater[id] = h - w;
    seaMask[id] = h < waterY + 0.05 ? 1 : 0;
    wet[id] = h < w + 0.25 ? 1 : 0;
    if (!wet[id]) landCells++;
    slope[id] = Math.max(Math.abs(height(x + 3, z) - height(x - 3, z)), Math.abs(height(x, z + 3) - height(x, z - 3))) / 6;
  }
  // distance to fresh water (rivers and lakes) and to the open sea
  const fresh = new Uint8Array(total);
  for (const ch of hydro.chains) {
    for (let i = 1; i < ch.pts.length; i++) {
      const a = ch.pts[i - 1], b = ch.pts[i], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / (cell * 0.5)));
      for (let s = 0; s <= steps; s++) {
        const x = a.x + ((b.x - a.x) * s) / steps, z = a.z + ((b.z - a.z) * s) / steps, ix = Math.floor((x + half) / cell), iz = Math.floor((z + half) / cell);
        if (ix >= 0 && iz >= 0 && ix < width && iz < width) fresh[iz * width + ix] = 1;
      }
    }
  }
  for (let id = 0; id < total; id++) {
    const x = px(id), z = pz(id);
    if (wet[id] && !seaMask[id]) fresh[id] = 1;
  }
  const freshDist = distanceTransform(fresh, width), coastDist = distanceTransform(seaMask, width);
  const coastM = new Float32Array(total);
  for (let id = 0; id < total; id++) coastM[id] = Math.max(0, (coastDist[id] - 0.5) * cell);
  const freshM = new Float32Array(total), temperatureC = new Float32Array(total), rain = new Float32Array(total), wetness = new Float32Array(total);
  const land: number[] = [];
  for (let id = 0; id < total; id++) {
    freshM[id] = Math.max(0, (freshDist[id] - 0.5) * cell);
    const x = px(id), z = pz(id);
    temperatureC[id] = sampleGrid(c.temp, t.n, size, x, z) - (elev[id] > 0 ? 0.058 * 0 : 0);
    rain[id] = sampleGrid(c.rain, t.n, size, x, z);
    if (!seaMask[id]) land.push(temperatureC[id]);
  }
  land.sort((a, b) => a - b);
  const medianT = land[Math.floor(land.length / 2)] ?? 12;
  // wetness: low, flat ground close to fresh water, in wetter climates
  for (let id = 0; id < total; id++) {
    const near = Math.exp(-freshM[id] / 55), flat = 1 - clamp(slope[id] / 0.16), low = 1 - clamp((aboveWater[id] - 0.5) / 4.5);
    wetness[id] = near * flat * low;
  }
  const kinds = new Uint8Array(total).fill(255);
  for (let id = 0; id < total; id++) {
    if (seaMask[id]) continue;
    const x = px(id), z = pz(id), u = x / size, v = z / size;
    const jitT = noiseA.fbm(u * 5 + 1, v * 5, 3) * 2.4, jitR = noiseB.fbm(u * 6 - 3, v * 6 + 2, 3) * 0.16, mosaic = noiseC.fbm(u * 9, v * 9 + 5, 3);
    const T = temperatureC[id] + jitT, P = rain[id] + jitR, h = elev[id], g = slope[id], fd = freshM[id], cd = coastDist[id] * cell;
    let kind: ProvinceKind;
    const swamp = wetness[id] > 0.22 + (mosaic - 0.05) * 0.25 && P > 0.3 + 0.1 * (g > 0.1 ? 1 : 0) && (aboveWater[id] < 3.2);
    let inDelta = false;
    for (const d of hydro.deltas) if (Math.hypot(x - d.x, z - d.z) < d.radius && h < 3.2 && g < 0.1 && mosaic > -0.12) inDelta = true;
    const coastalMarsh = inDelta || cd < 90 && h < 3.4 && g < 0.08 && fd < 70 && P > 0.35 && mosaic > 0.04;
    if (swamp || coastalMarsh) kind = 'wetland';
    else if (T < 2.8 || h > 72 || (g > 0.78 && h > 38)) kind = 'alpine';
    else if (P < 0.2) kind = T > 11 ? 'arid' : 'dry-scrub';
    else if (P < 0.36) kind = mosaic > 0.0 ? 'meadow' : 'dry-scrub';
    else if (T < 6.8) kind = P > 0.4 ? 'conifer-forest' : 'meadow';
    else if (T > 17.5 && cd < 140 && P > 0.4) kind = 'warm-coast';
    else if (P > 0.66 || (P > 0.5 && mosaic > 0.04 + (g > 0.12 ? -0.1 : 0.08))) kind = 'mixed-woodland';
    else kind = g > 0.2 && h > 20 ? 'dry-scrub' : 'meadow';
    kinds[id] = K(kind);
  }
  // one majority pass removes single-cell speckle without erasing ragged ecotones
  const copy = kinds.slice();
  for (let z = 1; z < width - 1; z++) {
    for (let x = 1; x < width - 1; x++) {
      const id = z * width + x;
      if (copy[id] === 255) continue;
      const counts = new Map<number, number>();
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const k = copy[id + dz * width + dx];
        if (k !== 255) counts.set(k, (counts.get(k) || 0) + 1);
      }
      let top = copy[id], best = counts.get(top) || 0;
      for (const [k, cnt] of counts) if (cnt > best + 2) { best = cnt; top = k; }
      kinds[id] = top;
    }
  }
  // province borders come out of a 12 m grid as staircases and rectangles; two Gaussian-weighted votes turn
  // them into smooth curves (wetland strips along water are kept as they are, they are meant to be thin)
  const wetlandK = K('wetland'), kernel: number[] = [];
  for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) kernel.push(Math.exp(-(dx * dx + dz * dz) / (2 * 1.25 * 1.25)));
  for (let pass = 0; pass < 2; pass++) {
    const src = kinds.slice(), votes = new Float32Array(8);
    for (let z = 0; z < width; z++) {
      for (let x = 0; x < width; x++) {
        const id = z * width + x;
        if (src[id] === 255 || src[id] === wetlandK) continue;
        votes.fill(0);
        let k = 0;
        for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++, k++) {
          const X = x + dx, Z = z + dz;
          if (X < 0 || Z < 0 || X >= width || Z >= width) continue;
          const kind = src[Z * width + X];
          if (kind !== 255) votes[kind] += kernel[k];
        }
        let top = src[id], best = votes[top] * 1.08;
        for (let q = 0; q < 8; q++) if (q !== wetlandK && votes[q] > best) { best = votes[q]; top = q; }
        kinds[id] = top;
      }
    }
  }
  for (let id = 0; id < total; id++) if (kinds[id] === 255) kinds[id] = seaMask[id] ? K('warm-coast') : K('meadow');
  // soil / moisture / temperature fields (smooth), province-profile based with terrain modifiers
  let soil = new Float32Array(total), moisture = new Float32Array(total), tempOffset = new Float32Array(total);
  for (let id = 0; id < total; id++) {
    const profile = PROVINCE_PROFILES[PROVINCE_KINDS[kinds[id]]], local = noiseA.fbm(px(id) * 0.004, pz(id) * 0.004, 3) * 0.5;
    const alluvium = Math.exp(-freshM[id] / 70) * (1 - clamp(slope[id] / 0.1)) * 0.2;
    soil[id] = clamp(profile.soil + local * 0.12 + alluvium - Math.min(0.2, slope[id] * 0.2));
    moisture[id] = clamp(profile.moisture * 0.5 + rain[id] * 0.5 + local * 0.08 + Math.max(0, 1 - freshM[id] / 35) * 0.1);
    tempOffset[id] = clamp((temperatureC[id] - medianT) * 0.7, -10, 7) + local * 1.5;
  }
  const neighbors = (id: number) => [id % width ? id - 1 : -1, id % width < width - 1 ? id + 1 : -1, id >= width ? id - width : -1, id < total - width ? id + width : -1].filter(n => n >= 0);
  const blur = (source: Float32Array) => {
    const out = new Float32Array(total);
    for (let id = 0; id < total; id++) {
      let sum = source[id] * 4, n = 4;
      for (const j of neighbors(id)) { sum += source[j]; n++; }
      out[id] = sum / n;
    }
    return out;
  };
  for (let pass = 0; pass < 2; pass++) { soil = blur(soil); moisture = blur(moisture); tempOffset = blur(tempOffset); }
  // region metrics
  const largest = new Int32Array(8), seen = new Uint8Array(total), counts = new Int32Array(8);
  for (let id = 0; id < total; id++) if (!seaMask[id]) counts[kinds[id]]++;
  for (let id = 0; id < total; id++) {
    if (seaMask[id] || seen[id]) continue;
    const kind = kinds[id], queue = [id];
    seen[id] = 1;
    for (let q = 0; q < queue.length; q++) for (const n of neighbors(queue[q])) if (!seen[n] && !seaMask[n] && kinds[n] === kind) { seen[n] = 1; queue.push(n); }
    largest[kind] = Math.max(largest[kind], queue.length);
  }
  const area = cell * cell;
  const regions = PROVINCE_KINDS.map((kind, owner) => {
    let count = 0, h = 0, water = 0, s = 0, m = 0, x = 0, z = 0;
    for (let id = 0; id < total; id++) if (!seaMask[id] && kinds[id] === owner) { count++; h += elev[id]; water += freshM[id]; s += soil[id]; m += moisture[id]; x += px(id); z += pz(id); }
    const k = Math.max(1, count);
    return { kind, areaSquareMeters: count * area, largestConnectedAreaSquareMeters: largest[owner] * area, meanElevationMeters: h / k, meanFreshwaterDistanceMeters: water / k, meanSoil: s / k, meanMoisture: m / k, center: { x: x / k, z: z / k } };
  });
  return {
    version: 2,
    size,
    width,
    cellMeters: cell,
    kinds,
    freshwaterDistanceMeters: freshM,
    soil,
    moisture,
    temperatureOffsetCelsius: tempOffset,
    metrics: { landAreaSquareMeters: landCells * area, minimumRegionAreaSquareMeters: 0, regions },
    treeline: 0,
    coastDistanceMeters: coastM,
    temperatureC,
    rain,
    wetness,
    slope,
  };
}
