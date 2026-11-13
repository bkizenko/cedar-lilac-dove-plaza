/** Map generation v2 (worldgenVersion 20). One deterministic pipeline per seed and preset:
 * layout -> ranges/plateaus -> stream-power erosion -> climate -> lakes and drainage -> rivers ->
 * continuous height field -> game grid -> biomes -> ecology-driven resources -> fair starts. */
import { mulberry32 } from '../rng';
import { WATER_Y } from '../constants';
import { buildBankTerrain } from '../bankTerrain';
import { buildLocalWaterIndex, indexedWaterAt } from '../indexedLocalWater';
import { lakeContains, type LocalWaterBody } from '../localWater';
import type { WorldData } from '../worldgen';
import { bankHeightAt } from '../bankTerrain';
import type { WorldRequest, WorldOptions } from '../worldOptions';
import type { LandFeature } from '../geography';
import { PRESETS, randomPreset, isMapPreset, type MapPreset } from './presets';
import { buildTerrain } from './terrain';
import { buildClimate } from './climate';
import { buildHydrology, type Hydrology } from './hydro';
import { HeightField, carveLakes, riverBodies } from './heightfield';
import { buildBiomes } from './biomes';
import { placeWorld } from './placement';
import { checkFords, type FordReport } from './fords';
import { planWildlife, assignHabitatAnchors } from './wildlife';
import { buildGeologyGrid } from './geology/read';
import { LANDFORMS } from './geology/rocks';
import { surfaceProcesses, finalFeatures } from './geology/surface';
import { shapeRivers, fluvialRaster } from './geology/fluvial';
export const MAPGEN_VERSION = 1;
/** Same diagonal split as the published terrain mesh (a copy of worldgen's sampler, to avoid an import cycle). */
function sampleTriangleHeight(heights: Float32Array, x: number, z: number, size: number) {
  const segs = Math.round(Math.sqrt(heights.length)) - 1, n = segs + 1;
  const gx = Math.max(0, Math.min(segs, (x / size + 0.5) * segs)), gz = Math.max(0, Math.min(segs, (z / size + 0.5) * segs));
  const ix = Math.min(segs - 1, Math.floor(gx)), iz = Math.min(segs - 1, Math.floor(gz)), fx = gx - ix, fz = gz - iz, i = iz * n + ix;
  const a = heights[i], b = heights[i + 1], c = heights[i + n], d = heights[i + n + 1];
  return fx + fz <= 1 ? a + (b - a) * fx + (c - a) * fz : d + (c - d) * (1 - fx) + (b - d) * (1 - fz);
}
export const WORKING_CELLS = 256;
export function resolvePreset(seed: number, request: WorldRequest): { preset: MapPreset; random: boolean } {
  if (isMapPreset(request.preset)) return { preset: request.preset, random: false };
  const layout = request.layout;
  if (layout === 'pangaea' || layout === 'continents' || layout === 'archipelago') return { preset: layout, random: false };
  return { preset: randomPreset(seed), random: true };
}
/** Number of 16 m bank tiles a river set would need (mirrors buildBankTerrain's budget). */
function bankTileKeys(chains: Hydrology['chains'], lakes: { poly: { x: number; z: number }[] }[], size: number) {
  const tile = size / Math.round(size / 1040 * 256) * 4, width = Math.ceil(size / tile), half = size / 2, keys = new Set<number>(), margin = 20;
  for (const ch of chains) for (let i = 1; i < ch.pts.length; i++) {
    const a = ch.pts[i - 1], c = ch.pts[i], w = Math.max(a.w, c.w) * 0.85;
    for (let z = Math.max(0, Math.floor((Math.min(a.z, c.z) - w - margin + half) / tile)); z <= Math.min(width - 1, Math.floor((Math.max(a.z, c.z) + w + margin + half) / tile)); z++)
      for (let x = Math.max(0, Math.floor((Math.min(a.x, c.x) - w - margin + half) / tile)); x <= Math.min(width - 1, Math.floor((Math.max(a.x, c.x) + w + margin + half) / tile)); x++) keys.add(z * width + x);
  }
  for (const lake of lakes) for (let i = 0; i < lake.poly.length; i++) {
    const a = lake.poly[i], c = lake.poly[(i + 1) % lake.poly.length];
    for (let z = Math.max(0, Math.floor((Math.min(a.z, c.z) - margin + half) / tile)); z <= Math.min(width - 1, Math.floor((Math.max(a.z, c.z) + margin + half) / tile)); z++)
      for (let x = Math.max(0, Math.floor((Math.min(a.x, c.x) - margin + half) / tile)); x <= Math.min(width - 1, Math.floor((Math.max(a.x, c.x) + margin + half) / tile)); x++) keys.add(z * width + x);
  }
  return keys.size;
}
export function generateMapWorld(seed: number, request: WorldRequest = {}): WorldData {
  const size = request.size ?? 1040, segs = Math.round(size / 1040 * 256), n = segs + 1, half = size / 2;
  const { preset: presetId, random } = resolvePreset(seed, request);
  const spec = PRESETS[presetId];
  const rejected: string[] = [];
  // six measured candidates for the requested preset; a gentler preset is the deterministic last resort,
  // so a hard seed can never leave the player without a world
  for (let attempt = 0; attempt < 9; attempt++) {
    const terrainSeed = attempt === 0 ? seed : (Math.imul(seed ^ 0x9e3779b1, attempt * 0x85ebca6b + 1) >>> 0);
    try {
      const world = buildOnce(terrainSeed, seed, size, segs, n, half, attempt < 6 ? spec : PRESETS['river-valley'], random, request);
      world.generation = { requestedSeed: seed, terrainSeed, attempt, rejectedReasons: rejected };
      return world;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/^V20 /.test(message)) throw error;
      rejected.push(message);
    }
  }
  throw new Error(`V20 exhausted measured candidates: ${rejected.join('; ')}`);
}
function buildOnce(seed: number, requestedSeed: number, size: number, segs: number, n: number, half: number, spec: typeof PRESETS[MapPreset], random: boolean, request: WorldRequest): WorldData {
  const rand = mulberry32(seed ^ 0x20a1c4e5);
  const geology = request.geologyVersion === 1;
  const terrain = buildTerrain(seed, size, WORKING_CELLS + 1, spec, rand, { geology });
  if (terrain.landFraction < spec.land[0] * 0.55) throw new Error(`V20 land fraction ${terrain.landFraction.toFixed(3)} too small for ${spec.id}`);
  const climate = buildClimate(seed, terrain, spec, rand);
  if (terrain.geo) surfaceProcesses(terrain, climate);
  const hydro = buildHydrology(seed, terrain, climate, spec, rand);
  // lakes come from the base relief only, so they can be traced before the river set is final
  const probe = new HeightField(terrain, { ...hydro, chains: [] }, seed);
  carveLakes(probe);
  // keep the river budget within the shared bank-tile budget by pruning the weakest tributaries
  while (hydro.chains.length > 1 && bankTileKeys(hydro.chains, probe.lakes, size) > 1850) {
    const referenced = new Set(hydro.chains.map(c => c.into));
    const leaves = hydro.chains.filter(c => !referenced.has(c.id) && c.source !== 'delta').sort((a, b) => a.flow - b.flow);
    if (!leaves.length) break;
    hydro.chains.splice(hydro.chains.indexOf(leaves[0]), 1);
  }
  if (terrain.geo) { hydro.fluvial = shapeRivers(terrain.geo, hydro, climate.seaTemp); probe.lakes.push(...hydro.fluvial.oxbows); }
  let hf = new HeightField(terrain, hydro, seed);
  hf.lakes = probe.lakes;
  // a ford that is not truly wadable (shallow, gentle, with walkable banks) is turned back into a normal channel
  let fordCheck = checkFords(hf, hydro);
  if (fordCheck.dropped) {
    hf = new HeightField(terrain, hydro, seed);
    hf.lakes = probe.lakes;
    fordCheck = checkFords(hf, hydro);
  }
  return finish(seed, requestedSeed, size, segs, n, half, spec, random, request, terrain, climate, hydro, hf, fordCheck.fords);
}
function finish(seed: number, requestedSeed: number, size: number, segs: number, n: number, half: number, spec: typeof PRESETS[MapPreset], random: boolean, request: WorldRequest, terrain: ReturnType<typeof buildTerrain>, climate: ReturnType<typeof buildClimate>, hydro: Hydrology, hf: HeightField, fords: FordReport[]): WorldData {
  const waterY = WATER_Y;
  const heights = new Float32Array(n * n);
  for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) heights[iz * n + ix] = Math.min(144, hf.at((ix / segs) * size - half, (iz / segs) * size - half));
  // ---- water bodies -------------------------------------------------------------------------------------
  const bodies: LocalWaterBody[] = [];
  for (const lake of hf.lakes) bodies.push({ kind: 'lake', id: lake.id, x: lake.x, z: lake.z, rx: Math.max(4, lake.rx), rz: Math.max(4, lake.rz), surfaceY: lake.level + WATER_Y, shoreline: lake.poly });
  const rivers = riverBodies(hydro);
  bodies.push(...rivers);
  if (bodies.length > 120) throw new Error('V20 too many water bodies');
  const waterHeights = new Float32Array(n * n);
  const falls = hydro.fluvial?.falls ?? [];
  const index = buildLocalWaterIndex(bodies, size, falls);
  const level = (x: number, z: number) => Math.max(waterY, indexedWaterAt(index, x, z, lakeContains) ?? waterY);
  for (let iz = 0; iz < n; iz++) for (let ix = 0; ix < n; ix++) waterHeights[iz * n + ix] = level((ix / segs) * size - half, (iz / segs) * size - half);
  if (terrain.geo) {
    const wetNear = (x: number, z: number) => { for (let k = 0; k < 9; k++) { const a = k * Math.PI / 4, xx = x + (k ? Math.cos(a) * 16 : 0), zz = z + (k ? Math.sin(a) * 16 : 0); if (sampleTriangleHeight(heights, xx, zz, size) < level(xx, zz) + 2.2) return false; } return true; };
    finalFeatures(terrain.geo, (ix, iz) => heights[iz * n + ix], (ix, iz, v) => { heights[iz * n + ix] = v; }, n, size, wetNear, waterY);
  }
  const bankTerrain = buildBankTerrain({ size, segs, heights, waterY, waterBodies: bodies, waterfalls: falls }, (x, z) => sampleTriangleHeight(heights, x, z, size), (x, z) => Math.min(144, hf.at(x, z)));
  const sample = (x: number, z: number) => bankHeightAt(bankTerrain, x, z, size, sampleTriangleHeight(heights, x, z, size));
  // ---- geology read: rock, strata, soil and landform tag per cell, from the final heights ------------------------------
  const fluv = terrain.geo && hydro.fluvial ? fluvialRaster(terrain.geo, hydro, hydro.fluvial, n, size) : undefined;
  const geology = terrain.geo ? buildGeologyGrid({
    st: terrain.geo, heights, n, size, waterY, wet: (x, z) => sample(x, z) < level(x, z) + 0.15,
    ...(fluv ? { fluvialTag: (_x: number, _z: number, ix: number, iz: number) => { const t = fluv.tags[iz * n + ix]; return t ? LANDFORMS[t].name : ''; }, fluvialSoil: (x: number, z: number) => fluv.alluvium[Math.round((z / size + 0.5) * (n - 1)) * n + Math.round((x / size + 0.5) * (n - 1))] } : {}),
  }) : undefined;
  if (geology) {
    geology.lakes = hf.lakes.map(l => { const hl = hydro.lakes.find(k => k.id === l.id), o = terrain.geo!.lakeOrigins.filter(q => Math.hypot(q.x - l.x, q.z - l.z) < q.radius + 70 + Math.max(l.rx, l.rz)).sort((a, b) => Math.hypot(a.x - l.x, a.z - l.z) - Math.hypot(b.x - l.x, b.z - l.z))[0];
      return { id: l.id, origin: l.id.startsWith('oxbow') ? 'oxbow-cutoff' : o?.origin ?? (hl?.kind === 'tarn' ? 'glacial-scour' : hl?.kind === 'basin' ? 'closed-basin' : 'river-valley'), x: l.x, z: l.z, areaM2: Math.round(Math.PI * l.rx * l.rz) }; });
  }
  // ---- biomes ---------------------------------------------------------------------------------------------
  const ecology = buildBiomes({ seed, size, terrain, climate, hydro, lakes: hf.lakes, height: sample, water: level, waterY });
  // ---- features for the renderer and old survey code -------------------------------------------------------
  const features: LandFeature[] = [];
  for (const l of hf.lakes) features.push({ kind: 'lake', x: l.x, z: l.z, radius: Math.max(l.rx, l.rz) });
  for (const r of terrain.ranges) { const mid = r.spine[Math.floor(r.spine.length / 2)]; features.push({ kind: 'mountain-range', x: mid.x, z: mid.z, radius: r.length / 2, shape: { rx: r.length / 2, rz: r.width * 1.4, rotation: Math.atan2(r.spine[r.spine.length - 1].z - r.spine[0].z, r.spine[r.spine.length - 1].x - r.spine[0].x) } }); }
  const main = hydro.chains.filter(c => c.mouth === 'sea').sort((a, b) => b.flow - a.flow)[0];
  if (main) { const m = main.pts[Math.floor(main.pts.length * 0.45)]; features.push({ kind: 'valley', x: m.x, z: m.z, radius: 90 }); }
  const arid = ecology.metrics.regions.find(r => r.kind === 'arid');
  if (arid && arid.largestConnectedAreaSquareMeters > 20000) features.push({ kind: 'dunes', x: arid.center.x, z: arid.center.z, radius: Math.sqrt(arid.largestConnectedAreaSquareMeters / Math.PI) * 0.8 });
  const wet = ecology.metrics.regions.find(r => r.kind === 'wetland');
  if (wet && wet.areaSquareMeters > 6000) features.push({ kind: 'wetland', x: wet.center.x, z: wet.center.z, radius: Math.sqrt(wet.areaSquareMeters / Math.PI) });
  const riverList = (rivers as Extract<LocalWaterBody, { kind: "river" }>[]).map(r => ({ pts: r.pts.map(p => ({ x: p.x, z: p.z })), w: r.width }));
  // ---- resources and starts ------------------------------------------------------------------------------------
  const placed = placeWorld({ seed, size, waterY, preset: spec, terrain, hydro, ecology, waterBodies: bodies, sample, level, rivers: riverList, features, ...(geology ? { geology } : {}) });
  // legacy three-habitat anchors: the spawner sends each wild group to the camp whose anchor matches, so the
  // anchors tag the camps whose surroundings really suit grazers, woodland game and upland goats
  const habitats = assignHabitatAnchors(ecology, placed.camps, size);
  const biomes: WorldData['biomes'] = placed.camps.map((c, i) => ({ kind: habitats[i], x: c.x, z: c.z }));
  const wildlife = planWildlife(ecology, hf.lakes.length, size);
  const mainRange = terrain.ranges[0], axis = terrain.axis;
  const nx = Math.cos(axis), nzr = Math.sin(axis);
  void mainRange;
  const options: WorldOptions = {
    size: size as WorldOptions['size'],
    layout: spec.layout,
    ...(random ? { randomLayout: true as const } : {}),
    openingSiteVersion: 2,
    preset: spec.id,
    mapgenVersion: MAPGEN_VERSION,
    ...(geology ? { geologyVersion: 1 as const } : {}),
    ...(request.chunkTerrainVersion === 1 ? { chunkTerrainVersion: 1 as const, ...(request.chunkTerrainScale && request.chunkTerrainScale > 1 ? { chunkTerrainScale: request.chunkTerrainScale } : {}) } : {}),
    ...(request.riverProfileVersion === 2 ? { riverProfileVersion: 2 as const } : {}),
    ...(request.tideVersion === 1 || request.tideVersion === 2 ? { tideVersion: request.tideVersion } : {}),
    ...(request.landformLabelVersion === 2 ? { landformLabelVersion: 2 as const } : {}),
  };
  const landFraction = terrain.landFraction;
  const world: WorldData = {
    bankTerrain,
    ...(placed.openingWater ? { openingWater: placed.openingWater } : {}),
    ecology,
    localWaterVersion: 17,
    waterHeights,
    waterBodies: bodies,
    waterfalls: falls,
    size,
    options,
    features,
    segs,
    heights,
    waterY,
    baseWaterY: waterY,
    islandR: size * 0.42,
    trees: placed.trees,
    stones: placed.stones,
    forage: placed.forage,
    fish: placed.fish,
    copper: placed.copper,
    iron: placed.iron,
    camps: placed.camps,
    megaliths: placed.megaliths,
    dockSites: placed.dockSites,
    rivers: riverList,
    biomes,
    ridgeNx: nx,
    ridgeNz: nzr,
    mapgen: {
      version: MAPGEN_VERSION,
      preset: spec.id,
      name: spec.name,
      landFraction,
      rivers: hydro.chains.length,
      lakes: hf.lakes.length,
      starts: placed.starts,
      wildlife,
      fords,
      deltas: hydro.deltas.length,
      fairness: placed.fairness,
      wind: climate.wind,
      seaTemperatureC: climate.seaTemp,
      ...(geology ? { geology } : {}),
    },
  } as WorldData;
  void requestedSeed;
  return world;
}
