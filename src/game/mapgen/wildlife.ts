/** Ecology-driven wildlife planning through the hooks the simulation already has: each camp is tagged with
 * the habitat that fits its surroundings (the spawner sends grazers, woodland game and goats to the camp
 * whose habitat anchor matches), and per-species head counts follow the area of the matching biomes.
 * Nothing here creates a resource: it only decides where existing wild animals live and how many. */
import { PROVINCE_KINDS, type EcologicalProvinceGrid, type ProvinceKind } from '../ecologicalProvinces';
export type Habitat = 'plains' | 'forest' | 'hills';
/** Animals per hectare of each province (grazers want grass and steppe, game wants woods, goats want rock). */
const DENSITY: Record<'deer' | 'boar' | 'goat', Partial<Record<ProvinceKind, number>>> = {
  deer: { meadow: 0.55, 'dry-scrub': 0.3, wetland: 0.22, 'mixed-woodland': 0.22, 'warm-coast': 0.16, 'conifer-forest': 0.1, arid: 0.03, alpine: 0.02 },
  boar: { 'mixed-woodland': 0.42, 'conifer-forest': 0.26, 'warm-coast': 0.3, wetland: 0.16, meadow: 0.06, 'dry-scrub': 0.04 },
  goat: { alpine: 0.62, 'dry-scrub': 0.36, arid: 0.12, 'conifer-forest': 0.07, meadow: 0.03 },
};
const FIT: Record<Habitat, Partial<Record<ProvinceKind, number>>> = {
  plains: { meadow: 1, 'dry-scrub': 0.5, wetland: 0.45, 'warm-coast': 0.35, 'mixed-woodland': 0.2, arid: 0.1 },
  forest: { 'mixed-woodland': 1, 'conifer-forest': 0.9, 'warm-coast': 0.8, wetland: 0.3, meadow: 0.08 },
  hills: { alpine: 1, 'dry-scrub': 0.7, arid: 0.5, 'conifer-forest': 0.35, meadow: 0.05 },
};
export type WildlifePlan = {
  counts: { deer: number; boar: number; goat: number; bird: number };
  /** Hectares of each province (the basis of the counts). */
  basisHectares: Record<string, number>;
  waterBirdHabitatHectares: number;
};
export function planWildlife(ecology: EcologicalProvinceGrid, lakeCount: number, size: number): WildlifePlan {
  const ha = (kind: ProvinceKind) => (ecology.metrics.regions.find(r => r.kind === kind)?.areaSquareMeters ?? 0) / 10000;
  const scale = Math.pow(size / 1040, 1.6);
  const sum = (group: 'deer' | 'boar' | 'goat') => PROVINCE_KINDS.reduce((total, kind) => total + ha(kind) * (DENSITY[group][kind] ?? 0), 0);
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));
  const wetHa = ha('wetland');
  const basis: Record<string, number> = {};
  for (const kind of PROVINCE_KINDS) basis[kind] = ha(kind);
  return {
    counts: {
      deer: clamp(sum('deer') * 1.5, 6, 48 * scale),
      boar: clamp(sum('boar') * 1.5, 5, 40 * scale),
      goat: clamp(sum('goat') * 1.6, 6, 44 * scale),
      bird: clamp(5 + wetHa * 1.1 + lakeCount * 2.5 + ha('warm-coast') * 0.12, 6, 24 * scale),
    },
    basisHectares: basis,
    waterBirdHabitatHectares: wetHa,
  };
}
/** One habitat per camp, maximising how well each camp's neighbourhood suits it while every habitat stays represented. */
export function assignHabitatAnchors(ecology: EcologicalProvinceGrid, camps: { x: number; z: number }[], size: number): Habitat[] {
  const habitats: Habitat[] = ['plains', 'forest', 'hills'];
  const width = ecology.width, raw = camps.map(c => {
    const out: Record<Habitat, number> = { plains: 0, forest: 0, hills: 0 };
    for (let dz = -150; dz <= 150; dz += 15) for (let dx = -150; dx <= 150; dx += 15) {
      if (dx * dx + dz * dz > 150 * 150) continue;
      const ix = Math.max(0, Math.min(width - 1, Math.floor(((c.x + dx) / size + 0.5) * width))), iz = Math.max(0, Math.min(width - 1, Math.floor(((c.z + dz) / size + 0.5) * width)));
      const kind = PROVINCE_KINDS[ecology.kinds[iz * width + ix]] as ProvinceKind | undefined;
      if (!kind) continue;
      for (const h of habitats) out[h] += FIT[h][kind] ?? 0;
    }
    return out;
  });
  const top = Object.fromEntries(habitats.map(h => [h, Math.max(1e-6, ...raw.map(r => r[h]))])) as Record<Habitat, number>;
  const score = raw.map(r => habitats.map(h => r[h] / top[h]));
  let best: number[] = [], bestScore = -Infinity;
  const total = Math.pow(3, camps.length);
  for (let code = 0; code < total; code++) {
    const pick: number[] = [];
    let c = code, sc = 0;
    for (let i = 0; i < camps.length; i++) { const h = c % 3; c = (c - h) / 3; pick.push(h); sc += score[i][h]; }
    const covered = camps.length < 3 || [0, 1, 2].every(h => pick.includes(h));
    if (covered && sc > bestScore) { bestScore = sc; best = pick; }
  }
  return (best.length ? best : camps.map(() => 0)).map(h => habitats[h]);
}
