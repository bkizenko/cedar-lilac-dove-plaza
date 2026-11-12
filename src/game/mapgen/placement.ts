/** Ecology-driven placement: trees follow biome and canopy noise, stone and ore follow rock and
 * mountains, forage follows grass and wet ground, fish follow shallow water. Then fair starts. */
import { Noise, clamp, smoothstep } from './noise';
import { mulberry32 } from '../rng';
import { PROVINCE_KINDS, PROVINCE_PROFILES, type EcologicalProvinceGrid, type ProvinceKind } from '../ecologicalProvinces';
import { shallowFishSite, SHALLOW_FISH_SITE_RULES } from '../shallowFishSites';
import { openingWaterSurvey, openingCampSurvey, OPENING_WATER_RULES } from '../openingWater';
import { scenicBeautyAt, SCENERY_RULES } from '../scenery';
import { dryTreeRootLocal } from '../hydrology';
import { rivalCountForArea } from '../factions';
import type { ResourceNode } from '../types';
import type { LocalWaterBody } from '../localWater';
import type { Terrain } from './terrain';
import type { Hydrology } from './hydro';
import type { PresetSpec } from './presets';
export type Camp = { x: number; z: number; team: number };
export type StartCharacter = 'river-farmland' | 'lakeshore' | 'coastal' | 'upland-quarry' | 'woodland' | 'steppe-pasture' | 'wetland-delta' | 'valley';
export type StartReport = { team: number; x: number; z: number; character: StartCharacter; quality: number; landmass: number; features: Record<string, number> };
export type PlacementCtx = {
  seed: number;
  size: number;
  waterY: number;
  preset: PresetSpec;
  terrain: Terrain;
  hydro: Hydrology;
  ecology: EcologicalProvinceGrid & { coastDistanceMeters: Float32Array; wetness: Float32Array; slope: Float32Array };
  waterBodies: LocalWaterBody[];
  sample: (x: number, z: number) => number;
  level: (x: number, z: number) => number;
  /** raw ridged ore potential noise */
  rivers: { pts: { x: number; z: number }[] }[];
  features: { kind: string; x: number; z: number }[];
};
export type Placed = {
  trees: ResourceNode[]; stones: ResourceNode[]; forage: ResourceNode[]; fish: ResourceNode[]; copper: ResourceNode[]; iron: ResourceNode[];
  camps: Camp[]; dockSites: { x: number; z: number }[]; megaliths: { x: number; z: number; ry: number; cache: 'food' | 'wood' | 'stone'; amt: number }[];
  starts: StartReport[]; nextId: number; openingWater: ReturnType<ReturnType<typeof openingWaterSurvey>['at']>; fairness: { spread: number; minimum: number };
  landmassOf: (x: number, z: number) => number;
};
const cellIndex = (g: EcologicalProvinceGrid, x: number, z: number) => Math.max(0, Math.min(g.width - 1, Math.floor((z / g.size + 0.5) * g.width))) * g.width + Math.max(0, Math.min(g.width - 1, Math.floor((x / g.size + 0.5) * g.width)));
export const kindAt = (g: EcologicalProvinceGrid, x: number, z: number): ProvinceKind => PROVINCE_KINDS[g.kinds[cellIndex(g, x, z)]] ?? 'meadow';
class Buckets {
  private map = new Map<number, ResourceNode[]>();
  private cell: number;
  private w: number;
  private half: number;
  constructor(cell: number, w: number, half: number) { this.cell = cell; this.w = w; this.half = half; }
  private key(x: number, z: number) { return Math.floor((z + this.half) / this.cell) * this.w + Math.floor((x + this.half) / this.cell); }
  add(n: ResourceNode) { const k = this.key(n.x, n.z), l = this.map.get(k); if (l) l.push(n); else this.map.set(k, [n]); }
  near(x: number, z: number, r: number, fn: (n: ResourceNode, d: number) => void) {
    const c = this.cell, x0 = Math.floor((x - r + this.half) / c), x1 = Math.floor((x + r + this.half) / c), z0 = Math.floor((z - r + this.half) / c), z1 = Math.floor((z + r + this.half) / c);
    for (let zz = z0; zz <= z1; zz++) for (let xx = x0; xx <= x1; xx++) { const l = this.map.get(zz * this.w + xx); if (l) for (const n of l) { const d = Math.hypot(n.x - x, n.z - z); if (d <= r) fn(n, d); } }
  }
  count(x: number, z: number, r: number) { let k = 0; this.near(x, z, r, () => k++); return k; }
  any(x: number, z: number, r: number) { let hit = false; this.near(x, z, r, () => { hit = true; }); return hit; }
  remove(pred: (n: ResourceNode) => boolean) { for (const [k, l] of this.map) this.map.set(k, l.filter(n => !pred(n))); }
}
export function placeWorld(ctx: PlacementCtx): Placed {
  const { size, waterY, terrain, hydro, ecology, sample, level, preset } = ctx, half = size / 2;
  const rand = mulberry32(ctx.seed ^ 0x7e57ab1e), R = (a: number, b: number) => a + (b - a) * rand();
  const nz = new Noise(ctx.seed ^ 0x2545f491), nOre = new Noise(ctx.seed ^ 0x5851f42d), nCanopy = new Noise(ctx.seed ^ 0x4cf5ad43);
  let nid = 1;
  const inside = (x: number, z: number, pad = 2) => Math.abs(x) < half - pad && Math.abs(z) < half - pad;
  const dry = (x: number, z: number, m = 0.6) => sample(x, z) >= level(x, z) + m;
  const grade = (x: number, z: number, d = 2) => Math.max(Math.abs(sample(x + d, z) - sample(x - d, z)), Math.abs(sample(x, z + d) - sample(x, z - d))) / (2 * d);
  const prov = (x: number, z: number) => PROVINCE_PROFILES[kindAt(ecology, x, z)];
  const mk = (kind: ResourceNode['kind'], x: number, z: number, amount: number, scale: number, rich: number): ResourceNode => {
    if (kind === 'forage') amount *= 2;
    const y = kind === 'fish' ? Math.max(sample(x, z), level(x, z)) + 0.1 : sample(x, z);
    return { id: nid++, kind, x, z, y, amount, maxAmt: amount, regenT: 0, scale, rich };
  };
  const bTree = new Buckets(8, Math.ceil(size / 8) + 1, half), bAll = new Buckets(24, Math.ceil(size / 24) + 1, half);
  const trees: ResourceNode[] = [], stones: ResourceNode[] = [], forage: ResourceNode[] = [], fish: ResourceNode[] = [], copper: ResourceNode[] = [], iron: ResourceNode[] = [];
  const register = (n: ResourceNode) => { bAll.add(n); if (n.kind === 'tree') bTree.add(n); };
  // landmass labelling on the working grid
  const wn = terrain.n, wCell = terrain.cell;
  const landLabels = (() => {
    const labels = new Int32Array(wn * wn).fill(-1), areas: number[] = [], stack: number[] = [];
    for (let s = 0; s < wn * wn; s++) {
      if (labels[s] >= 0 || terrain.sea[s]) continue;
      const id = areas.length;
      let area = 0;
      stack.length = 0; stack.push(s); labels[s] = id;
      while (stack.length) {
        const c = stack.pop()!, x = c % wn, z = (c / wn) | 0;
        area++;
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, nz2 = z + dz; if (nx < 0 || nz2 < 0 || nx >= wn || nz2 >= wn) continue; const j = nz2 * wn + nx; if (labels[j] < 0 && !terrain.sea[j]) { labels[j] = id; stack.push(j); } }
      }
      areas.push(area * wCell * wCell);
    }
    return { labels, areas };
  })();
  const landmassOf = (x: number, z: number) => landLabels.labels[Math.max(0, Math.min(wn - 1, Math.round((z + half) / wCell))) * wn + Math.max(0, Math.min(wn - 1, Math.round((x + half) / wCell)))];
  // ---- trees: biome density x canopy noise, never on wet or very steep ground ------------------------
  const treeCap = Math.floor(4300 * Math.pow(size / 1040, 1.28));
  const treeStep = 4.6, tCandidates: { x: number; z: number; p: number }[] = [];
  for (let z = -half + 8; z < half - 8; z += treeStep) {
    for (let x = -half + 8; x < half - 8; x += treeStep) {
      const jx = x + (rand() - 0.5) * treeStep * 0.9, jz = z + (rand() - 0.5) * treeStep * 0.9;
      const h = sample(jx, jz), w = level(jx, jz);
      if (h < w + 0.8 || h - waterY > 110) continue;
      const profile = prov(jx, jz), kind = kindAt(ecology, jx, jz);
      const canopy = nCanopy.fbm(jx * 0.0075, jz * 0.0075, 4) * 0.5 + 0.5, grove = nCanopy.fbm(jx * 0.02 + 9, jz * 0.02, 3) * 0.5 + 0.5;
      let density = profile.treeDensityPerHectare / 130;
      // woodland and meadow share an edge mosaic: canopy noise decides groves versus glades
      if (kind === 'meadow' || kind === 'dry-scrub' || kind === 'arid') density *= smoothstep(0.52, 0.8, canopy * 0.6 + grove * 0.4) * 1.5;
      else if (kind === 'mixed-woodland' || kind === 'warm-coast' || kind === 'conifer-forest') density *= 0.45 + 0.75 * smoothstep(0.28, 0.65, canopy * 0.7 + grove * 0.3);
      // trees follow water in dry country (galleries along streams) and thin out on steep scree
      const fresh = ecology.freshwaterDistanceMeters[cellIndex(ecology, jx, jz)];
      if (kind === 'dry-scrub' || kind === 'arid' || (kind === 'meadow' && ecology.moisture[cellIndex(ecology, jx, jz)] < 0.5)) density += Math.exp(-fresh / 26) * 0.5;
      const g = grade(jx, jz, 3);
      density *= 1 - smoothstep(0.35, 0.8, g);
      if (density <= 0.01) continue;
      tCandidates.push({ x: jx, z: jz, p: density * 0.32 });
    }
  }
  const treeSpacing = 3.3;
  for (const c of tCandidates) {
    if (trees.length >= treeCap) break;
    if (rand() > c.p) continue;
    if (!dryTreeRootLocal(sample, level, c.x, c.z)) continue;
    if (bTree.any(c.x, c.z, treeSpacing)) continue;
    const n = mk('tree', c.x, c.z, (14 + Math.floor(rand() * 14)) * 2, 0.8 + rand() * 0.65, 0.85 + rand() * 0.3);
    if (kindAt(ecology, c.x, c.z) === 'alpine' || kindAt(ecology, c.x, c.z) === 'arid') n.scale *= 0.8;
    trees.push(n);
    register(n);
  }
  // ---- stone: outcrop clusters where ground is steep, high, dry or rocky -------------------------------
  const rockiness = (x: number, z: number) => {
    const g = grade(x, z, 3), h = sample(x, z) - waterY, p = prov(x, z).resourceWeights.stone;
    return clamp(g * 1.7 + h / 110 + (nz.fbm(x * 0.012, z * 0.012, 3) * 0.5 + 0.5) * 0.35) * (0.5 + 0.5 * p);
  };
  const landHa = ecology.metrics.landAreaSquareMeters / 10000;
  const stoneClusters = Math.round(landHa / 2.4 * (0.9 + 0.2 * rand()));
  const clusterSeeds: { x: number; z: number; s: number }[] = [];
  for (let i = 0; i < 4000 && clusterSeeds.length < stoneClusters * 3; i++) {
    const x = (rand() - 0.5) * (size - 40), z = (rand() - 0.5) * (size - 40);
    if (!dry(x, z, 0.8)) continue;
    const s = rockiness(x, z);
    if (s < 0.18) continue;
    clusterSeeds.push({ x, z, s: s + rand() * 0.15 });
  }
  clusterSeeds.sort((a, b) => b.s - a.s);
  const stoneAt: { x: number; z: number }[] = [];
  for (const c of clusterSeeds) {
    if (stoneAt.length >= stoneClusters) break;
    if (stoneAt.some(o => Math.hypot(o.x - c.x, o.z - c.z) < 34)) continue;
    stoneAt.push(c);
    const count = 3 + Math.floor(rand() * 5 + c.s * 4);
    for (let k = 0, tries = 0; k < count && tries < count * 14; tries++) {
      const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * R(6, 14), x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
      if (!inside(x, z, 4) || !dry(x, z, 0.9) || bAll.any(x, z, 4.2)) continue;
      const n = mk('stone', x, z, 10 + Math.floor(rand() * 9), 0.8 + rand() * 0.45, 0.8);
      stones.push(n); register(n); k++;
    }
  }
  // ---- ore: persistent grade fields along mountain flanks -----------------------------------------------
  const orePotential = (x: number, z: number) => nOre.ridged(x * 0.0042, z * 0.0042, 3) * 0.7 + nOre.fbm(x * 0.011, z * 0.011, 2) * 0.15 + 0.15;
  const mountain = (x: number, z: number) => {
    const u = terrain.uplift, i = Math.max(0, Math.min(wn - 1, Math.round((z + half) / wCell))) * wn + Math.max(0, Math.min(wn - 1, Math.round((x + half) / wCell)));
    return u[i];
  };
  const oreClusters = (kind: 'copper' | 'iron', want: number, lo: number, hi: number, spacing: number) => {
    const seeds: { x: number; z: number; s: number }[] = [];
    for (let i = 0; i < 6000; i++) {
      const x = (rand() - 0.5) * (size - 60), z = (rand() - 0.5) * (size - 60), h = sample(x, z) - waterY;
      if (h < lo || !dry(x, z, 1) || grade(x, z, 3) > 0.5) continue;
      const band = 1 - Math.abs((h - (lo + hi) / 2) / ((hi - lo) / 2 + 12));
      const s = orePotential(x, z) * 0.8 + mountain(x, z) * 0.55 + clamp(band) * 0.4 + (kind === 'iron' ? mountain(x, z) * 0.3 : 0) + rand() * 0.12;
      seeds.push({ x, z, s });
    }
    seeds.sort((a, b) => b.s - a.s);
    const chosen: typeof seeds = [], list = kind === 'copper' ? copper : iron;
    for (const c of seeds) {
      if (chosen.length >= want) break;
      if (chosen.some(o => Math.hypot(o.x - c.x, o.z - c.z) < spacing)) continue;
      chosen.push(c);
      const count = 4 + Math.floor(rand() * 3);
      for (let k = 0, tries = 0; k < count && tries < 60; tries++) {
        const a = rand() * Math.PI * 2, d = Math.sqrt(rand()) * R(4, 10), x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
        if (!inside(x, z, 4) || !dry(x, z, 0.9) || bAll.any(x, z, kind === 'copper' ? 3.4 : 3.6)) continue;
        const grade0 = clamp(0.62 + c.s * 0.35 + (rand() - 0.5) * 0.12, 0.62, 1.18);
        const n = mk(kind, x, z, kind === 'copper' ? 6 + Math.floor(rand() * 6) : 5 + Math.floor(rand() * 5), 0.75 + rand() * 0.3, grade0);
        list.push(n); register(n); k++;
      }
    }
    return chosen;
  };
  const copperSeeds = oreClusters('copper', Math.max(2, Math.round(landHa / 20)), 6, 55, 95);
  const ironSeeds = oreClusters('iron', Math.max(2, Math.round(landHa / 36)), 18, 95, 120);
  // ---- forage: grass seeds, berries at woodland edges, tubers by wet ground ---------------------------------
  const forageStep = 6.2;
  for (let z = -half + 10; z < half - 10; z += forageStep) {
    for (let x = -half + 10; x < half - 10; x += forageStep) {
      const jx = x + (rand() - 0.5) * forageStep, jz = z + (rand() - 0.5) * forageStep;
      if (!dry(jx, jz, 0.7)) continue;
      const i = cellIndex(ecology, jx, jz), profile = prov(jx, jz), wet = ecology.wetness[i], g = grade(jx, jz, 3);
      const edge = Math.abs(nCanopy.fbm(jx * 0.0075, jz * 0.0075, 4) * 0.5 + 0.5 - 0.5) < 0.12 ? 0.45 : 0;
      const p = clamp(0.0165 * profile.forage * (0.55 + 2.2 * wet + edge) * (1 - smoothstep(0.3, 0.7, g)) * (kindAt(ecology, jx, jz) === 'arid' ? 0.4 : 1), 0, 0.3);
      if (rand() > p || bAll.any(jx, jz, 4.4)) continue;
      const n = mk('forage', jx, jz, 16 + Math.floor(rand() * 8), 0.85 + rand() * 0.3, 0.75);
      forage.push(n); register(n);
    }
  }
  // ---- camps: fair, distinct starts -------------------------------------------------------------------------
  const terrainApi = { size, height: sample, water: level, rivers: ctx.rivers, features: ctx.features, waterBodies: ctx.waterBodies };
  const survey = openingWaterSurvey(terrainApi as Parameters<typeof openingWaterSurvey>[0], true);
  const usableArea = (() => { let a = 0; for (let i = 0; i < wn * wn; i++) if (!terrain.sea[i]) a += wCell * wCell; return a; })();
  const teamIds = [0, 1, 2, 4, 5].slice(0, 1 + rivalCountForArea(usableArea));
  type Cand = { x: number; z: number; q: number; f: Record<string, number>; character: StartCharacter; landmass: number; beauty: number };
  const evalSite = (x: number, z: number): Cand | null => {
    const h = sample(x, z), w = level(x, z);
    if (h < w + 0.9 || h - waterY > 40 + preset.plateau * 80 || !inside(x, z, 72)) return null;
    if (grade(x, z, 6) > 0.16 + preset.plateau * 0.06) return null;
    const i = cellIndex(ecology, x, z), kind = kindAt(ecology, x, z);
    if (kind === 'wetland' || kind === 'alpine') return null;
    const fresh = ecology.freshwaterDistanceMeters[i], coast = ecology.coastDistanceMeters[i];
    let woodN = 0, stoneN = 0, forageN = 0, oreC = 0, oreI = 0, fishN = 0;
    bAll.near(x, z, 150, (n, d) => {
      if (n.kind === 'tree' && d <= 110) woodN++; else if (n.kind === 'stone') stoneN++; else if (n.kind === 'forage' && d <= 100) forageN++;
    });
    bAll.near(x, z, 320, n => { if (n.kind === 'copper') oreC++; else if (n.kind === 'iron') oreI++; });
    // farmland: dry, flat, deep soil within 110 m (12 m cells)
    let farm = 0, grass = 0, cells = 0, wetland = 0, hill = 0;
    for (let dz = -108; dz <= 108; dz += 12) for (let dx = -108; dx <= 108; dx += 12) {
      if (dx * dx + dz * dz > 108 * 108) continue;
      const px = x + dx, pz = z + dz;
      if (!inside(px, pz, 2)) continue;
      const j = cellIndex(ecology, px, pz), hh = sample(px, pz), ww = level(px, pz);
      cells++;
      if (hh < ww + 0.5) continue;
      const k2 = PROVINCE_KINDS[ecology.kinds[j]];
      if (ecology.slope[j] < 0.1 && ecology.soil[j] > 0.62 && k2 !== 'wetland') farm += 144;
      if (k2 === 'meadow' || k2 === 'dry-scrub') grass++;
      if (k2 === 'wetland') wetland++;
      if (hh - waterY > 18) hill++;
    }
    const f = { wood: woodN, stone: stoneN, forage: forageN, copper: oreC, iron: oreI, farmM2: farm, fresh, coast, grass: grass / Math.max(1, cells), wetland: wetland / Math.max(1, cells), hill: hill / Math.max(1, cells), elevation: h - waterY };
    const q = clamp(
      0.22 * Math.min(1, woodN / 40) + 0.18 * Math.min(1, stoneN / 6) + 0.15 * Math.min(1, forageN / 12) + 0.2 * Math.min(1, farm / 6000) +
      0.15 * (fresh <= 48 || coast <= 55 ? 1 : fresh <= 90 ? 0.5 : 0) + 0.1 * ((oreC ? 0.5 : 0) + (oreI ? 0.5 : 0)), 0, 1.2);
    let character: StartCharacter = 'valley';
    if (f.wetland > 0.22) character = 'wetland-delta';
    else if (coast < 70) character = 'coastal';
    else if (ctx.hydro.lakes.some(l => Math.hypot(l.x - x, l.z - z) < 140) && fresh < 70) character = 'lakeshore';
    else if (f.hill > 0.35 || (stoneN >= 8 && h - waterY > 14)) character = 'upland-quarry';
    else if (woodN >= 55) character = 'woodland';
    else if (f.grass > 0.55 && woodN < 45) character = 'steppe-pasture';
    else if (fresh < 55 && farm > 7000) character = 'river-farmland';
    return { x, z, q, f, character, landmass: landmassOf(x, z), beauty: 0 };
  };
  const lattice: Cand[] = [];
  for (let z = -half + 72; z < half - 72; z += 20) for (let x = -half + 72; x < half - 72; x += 20) {
    const c = evalSite(x, z);
    if (c && c.f.wood >= 14 && c.f.stone >= 2 && c.f.forage >= 5 - Math.round(preset.plateau * 6) && (c.f.fresh <= 90 || c.f.coast <= 60)) lattice.push(c);
  }
  const unlocked = new Set<number>();
  const verify = (c: Cand, strictWater: boolean) => {
    if (!openingCampSurvey({ height: sample, water: level }, c).valid) return false;
    const routes = survey.approachesAt(c);
    if (routes.near < OPENING_WATER_RULES.nearDryApproaches || routes.outer < OPENING_WATER_RULES.outerDryApproaches) return false;
    if (strictWater && !survey.at(c)) return false;
    return true;
  };
  // landmass capacities
  const capacity = new Map<number, number>();
  for (const c of lattice) capacity.set(c.landmass, (capacity.get(c.landmass) || 0) + 1);
  const landmasses = [...capacity.entries()].filter(([, n]) => n >= 6).sort((a, b) => b[1] - a[1]);
  const camps: Camp[] = [], reports: StartReport[] = [], used: StartCharacter[] = [];
  let spacingMin = 130; const spacingWant = 0.2 * size;
  let qRelax = 0;
  const pickFor = (team: number, preferLandmass: number | undefined, qTarget: number | undefined) => {
    let best: Cand | undefined, bestScore = -Infinity;
    const qMin = 0.78 - preset.plateau * 0.3 - qRelax;
    const pool = lattice.filter(c => c.q >= qMin && (preferLandmass === undefined || c.landmass === preferLandmass) && camps.every(k => Math.hypot(k.x - c.x, k.z - c.z) >= spacingMin));
    // scenic scoring is the dearest call here: only the player pays for it, once per candidate, and only for viable sites
    const withBeauty = team === 0 ? pool.map(c => { if (c.beauty === 0) c.beauty = scenicBeautyAt(sample, waterY, c.x, c.z, level, SCENERY_RULES.backdropRadiusMeters).score || 1e-6; return c; }) : pool;
    const beauties = team === 0 ? withBeauty.map(c => c.beauty).sort((a, b) => a - b) : [];
    const floor = team === 0 ? beauties[Math.floor((beauties.length - 1) * 0.55)] ?? 0 : 0;
    for (const c of withBeauty) {
      if (team === 0 && c.beauty < floor) continue;
      const nearest = camps.length ? Math.min(...camps.map(k => Math.hypot(k.x - c.x, k.z - c.z))) : spacingWant;
      const distinct = used.includes(c.character) ? 0 : 0.55;
      const fair = qTarget === undefined ? c.q : -Math.abs(c.q - qTarget) * 1.2 + c.q * 0.3;
      const spread = Math.min(nearest, spacingWant * 1.4) / spacingWant;
      const score = fair + distinct + spread * 0.5 + rand() * 0.18 + (team === 0 ? c.beauty / 140 : 0);
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return best;
  };
  const tryTeam = (team: number, preferLandmass: number | undefined, qTarget: number | undefined) => {
    const rejected = new Set<Cand>();
    for (let attempt = 0; attempt < 40; attempt++) {
      const cand = pickFor(team, preferLandmass, qTarget);
      if (!cand) return false;
      if (rejected.has(cand)) { const i = lattice.indexOf(cand); if (i >= 0) lattice.splice(i, 1); continue; }
      if (verify(cand, team === 0)) {
        camps.push({ x: cand.x, z: cand.z, team });
        used.push(cand.character);
        reports.push({ team, x: cand.x, z: cand.z, character: cand.character, quality: cand.q, landmass: cand.landmass, features: cand.f });
        return true;
      }
      rejected.add(cand);
      const i = lattice.indexOf(cand);
      if (i >= 0) lattice.splice(i, 1);
    }
    return false;
  };
  // the player's landmass is the largest viable one; societies spread over landmasses by area
  const primary = landmasses[0]?.[0];
  if (!tryTeam(0, primary, undefined)) {
    // the lattice is 20 m wide, so it can step over the narrow strip where a surveyed bank is reachable;
    // snap candidates onto real banks and re-run the same measured checks instead of rejecting the whole map
    const near = landmasses.length ? [{ x: 0, z: 0 }, { x: -half / 2, z: -half / 2 }, { x: half / 2, z: -half / 2 }, { x: -half / 2, z: half / 2 }, { x: half / 2, z: half / 2 }] : [];
    const seenSnap = new Set<string>(), snapped: Cand[] = [];
    for (const o of near) for (const p of survey.candidates(o)) {
      const key = `${p.x},${p.z}`;
      if (seenSnap.has(key)) continue;
      seenSnap.add(key);
      if (primary !== undefined && landmassOf(p.x, p.z) !== primary) continue;
      const c = evalSite(p.x, p.z);
      if (c && c.q >= 0.78 - preset.plateau * 0.3 && c.f.wood >= 8 && c.f.stone >= 1) snapped.push(c);
    }
    snapped.sort((a, b) => b.q - a.q);
    let ok = false;
    for (const c of snapped.slice(0, 60)) if (verify(c, true)) { lattice.push(c); ok = tryTeam(0, primary, undefined); if (ok) break; }
    if (!ok) throw new Error('V20 no viable start for the player');
  }
  const qPlayer = reports[0].quality;
  const share = new Map<number, number>();
  const planLand = (k: number) => {
    // distribute remaining teams: fill the player's landmass to its capacity, then next landmasses
    const order = landmasses.map(([id, n]) => ({ id, cap: Math.max(1, Math.min(3, Math.floor(n / 16))) }));
    let left = k;
    for (const o of order) { if (preset.landmasses[1] <= 1) { share.set(o.id, 99); break; } const take = Math.min(left, o.cap - (o.id === primary ? 1 : 0)); if (take > 0) { share.set(o.id, take); left -= take; } if (left <= 0) break; }
  };
  planLand(teamIds.length - 1);
  for (const team of teamIds.slice(1)) {
    let placed = false;
    for (const [id, take] of share) {
      if (take <= 0) continue;
      if (tryTeam(team, id, qPlayer)) { share.set(id, take - 1); placed = true; break; }
      share.set(id, 0);
    }
    if (!placed && tryTeam(team, undefined, qPlayer)) placed = true;
    if (!placed) break;
  }
  // thin lattices (highland, narrow isthmuses): fill the missing societies from the best remaining sites
  // within a fairness band of the player rather than rejecting the whole map
  if (camps.length < 3) for (const team of teamIds.slice(1)) {
    qRelax = 0.12; spacingMin = 100;
    if (camps.some(c => c.team === team)) continue;
    if (!tryTeam(team, primary, qPlayer) && !tryTeam(team, undefined, undefined)) break;
    if (camps.length >= 3) break;
  }
  if (camps.length < 3) throw new Error('V20 lacks three physically spaced fair starts');
  // ---- clear and dress around the starts (ecologically bounded top-ups) ---------------------------------------
  const homeR = 11;
  const dropNear = (list: ResourceNode[], x: number, z: number, r: number) => { for (let i = list.length - 1; i >= 0; i--) if (Math.hypot(list[i].x - x, list[i].z - z) < r) list.splice(i, 1); };
  for (const c of camps) { dropNear(trees, c.x, c.z, homeR + 8); dropNear(stones, c.x, c.z, homeR); dropNear(forage, c.x, c.z, homeR); dropNear(copper, c.x, c.z, homeR); dropNear(iron, c.x, c.z, homeR); }
  bAll.remove(n => camps.some(c => Math.hypot(n.x - c.x, n.z - c.z) < homeR + 8));
  bTree.remove(n => camps.some(c => Math.hypot(n.x - c.x, n.z - c.z) < homeR + 8));
  const topUp = (c: Camp, kind: 'tree' | 'stone' | 'forage', want: number, near: number, minD: number, maxD: number, spacing: number) => {
    const list = kind === 'tree' ? trees : kind === 'stone' ? stones : forage;
    let have = 0;
    bAll.near(c.x, c.z, near, n => { if (n.kind === kind) have++; });
    for (let tries = 0; have < want && tries < want * 80; tries++) {
      const a = rand() * Math.PI * 2, d = R(minD, maxD), x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
      if (!inside(x, z, 4) || !dry(x, z, kind === 'tree' ? 0.9 : 0.7) || bAll.any(x, z, spacing)) continue;
      const g = grade(x, z, 2);
      if (kind === 'tree' && (g > 0.5 || !dryTreeRootLocal(sample, level, x, z))) continue;
      if (kind === 'stone' && g < 0.04 && rand() < 0.7) continue; // outcrops sit on slopes and knolls
      if (kind === 'forage' && g > 0.45) continue;
      const n = kind === 'tree' ? mk('tree', x, z, (12 + Math.floor(rand() * 10)) * 2, 0.7 + rand() * 0.5, 0.85 + rand() * 0.25)
        : kind === 'stone' ? mk('stone', x, z, 10 + Math.floor(rand() * 8), 0.8 + rand() * 0.4, 0.8)
        : mk('forage', x, z, 16 + Math.floor(rand() * 8), 0.85 + rand() * 0.3, 0.75);
      list.push(n); register(n); have++;
    }
  };
  for (const c of camps) { topUp(c, 'forage', 12, 100, 16, 70, 4.4); topUp(c, 'tree', 36, 110, 18, 95, 3.3); topUp(c, 'stone', 4, 150, 24, 120, 4.4); }
  // ---- fish: shallow water that people can actually stand beside --------------------------------------------------
  const fishTerrain = { size, height: sample, water: level };
  const tryFish = (x: number, z: number) => {
    if (!inside(x, z, 3) || fish.length >= SHALLOW_FISH_SITE_RULES.maximumSites) return;
    if (fish.some(f => Math.hypot(f.x - x, f.z - z) < 5.4)) return;
    if (!shallowFishSite(fishTerrain, x, z)) return;
    const n = mk('fish', x, z, 36 + Math.floor(rand() * 24), 0.9 + rand() * 0.4, 0.8 + rand() * 0.5);
    fish.push(n);
  };
  for (const body of ctx.waterBodies) {
    if (body.kind === 'river') for (let i = 0; i < body.pts.length; i += 1) { const p = body.pts[i]; tryFish(p.x + (rand() - 0.5) * 3, p.z + (rand() - 0.5) * 3); }
    else {
      const shore = body.shoreline ?? [];
      for (let i = 0; i < shore.length; i++) {
        const a = shore[i], b = shore[(i + 1) % shore.length], n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / SHALLOW_FISH_SITE_RULES.lakeShoreSpacingMetres));
        for (let j = 0; j < n; j++) {
          const x = a.x + ((b.x - a.x) * j) / n, z = a.z + ((b.z - a.z) * j) / n, dx = body.x - x, dz = body.z - z, len = Math.hypot(dx, dz) || 1;
          for (const inset of SHALLOW_FISH_SITE_RULES.lakeInsetsMetres) { const before = fish.length; tryFish(x + (dx / len) * inset, z + (dz / len) * inset); if (fish.length > before) break; }
        }
      }
    }
  }
  // sea fish along the coast: sample the coast ring of the working grid
  const coastPts: { x: number; z: number }[] = [];
  for (let zi = 1; zi < wn - 1; zi += 2) for (let xi = 1; xi < wn - 1; xi += 2) {
    const i = zi * wn + xi;
    if (!terrain.sea[i] && (terrain.sea[i - 1] || terrain.sea[i + 1] || terrain.sea[i - wn] || terrain.sea[i + wn])) coastPts.push({ x: xi * wCell - half, z: zi * wCell - half });
  }
  for (let a = 0; a < 3000 && fish.length < 300 && coastPts.length; a++) {
    const c = coastPts[Math.floor(rand() * coastPts.length)], r = R(-9, 9), t = rand() * Math.PI * 2;
    tryFish(c.x + Math.cos(t) * Math.abs(r), c.z + Math.sin(t) * Math.abs(r));
  }
  // ---- docks near the player's hall -------------------------------------------------------------------------
  const home = camps[0], dockSites: { x: number; z: number }[] = [];
  {
    const cand: { x: number; z: number; d: number }[] = [];
    for (let i = 0; i < 90; i++) {
      const a = (i / 90) * Math.PI * 2;
      for (let d = 14; d < 62; d += 2.2) {
        const x = home.x + Math.cos(a) * d, z = home.z + Math.sin(a) * d, h = sample(x, z), w = level(x, z);
        if (h < w + 0.28 || h > w + 1.7) continue;
        let wet = false;
        for (let k = 0; k < 8; k++) { const aa = (k / 8) * Math.PI * 2; if (sample(x + Math.cos(aa) * 5.5, z + Math.sin(aa) * 5.5) < level(x + Math.cos(aa) * 5.5, z + Math.sin(aa) * 5.5) + 0.32) { wet = true; break; } }
        if (!wet) continue;
        cand.push({ x, z, d });
        break;
      }
    }
    cand.sort((a, b) => a.d - b.d);
    for (const c of cand) { if (dockSites.some(s => Math.hypot(s.x - c.x, s.z - c.z) < 14)) continue; dockSites.push({ x: c.x, z: c.z }); if (dockSites.length >= 3) break; }
    for (const list of [trees, forage, stones]) dropNear(list, 0, 0, 0);
    for (const s of dockSites) { dropNear(trees, s.x, s.z, 6.5); dropNear(forage, s.x, s.z, 6); dropNear(stones, s.x, s.z, 6); }
  }
  // ---- megaliths: hilltop cairns away from starts ----------------------------------------------------------------
  const megaliths: Placed['megaliths'] = [], kinds = ['food', 'wood', 'stone'] as const;
  for (let tries = 0; tries < 400 && megaliths.length < 5 + Math.floor(rand() * 4); tries++) {
    const x = (rand() - 0.5) * (size - 80), z = (rand() - 0.5) * (size - 80);
    if (!dry(x, z, 0.8) || camps.some(c => Math.hypot(c.x - x, c.z - z) < 90) || megaliths.some(m => Math.hypot(m.x - x, m.z - z) < 70)) continue;
    if (grade(x, z, 4) > 0.3 || sample(x, z) - waterY < 4) continue;
    // prefer local summits
    let higher = 0;
    for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; if (sample(x + Math.cos(a) * 18, z + Math.sin(a) * 18) > sample(x, z) + 0.3) higher++; }
    if (higher > 1) continue;
    megaliths.push({ x, z, ry: rand() * Math.PI, cache: kinds[Math.floor(rand() * 3)], amt: 18 + Math.floor(rand() * 22) });
  }
  const openingWater = survey.at(home);
  const qs = reports.map(r => r.quality), spread = qs.length ? Math.max(...qs) / Math.max(1e-6, Math.min(...qs)) : 1;
  void unlocked; void copperSeeds; void ironSeeds; void (PROVINCE_PROFILES as unknown);
  return { trees, stones, forage, fish, copper, iron, camps, dockSites, megaliths, starts: reports, nextId: nid, openingWater, fairness: { spread, minimum: Math.min(...qs) }, landmassOf };
}
