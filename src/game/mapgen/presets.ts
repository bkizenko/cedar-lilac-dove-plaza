/** Seeded map presets. A preset fixes the *kind* of world; the seed fixes every detail. */
export const MAP_PRESETS = ['archipelago', 'island', 'continents', 'pangaea', 'river-valley', 'highland', 'steppe', 'lakeland'] as const;
export type MapPreset = typeof MAP_PRESETS[number];
export type MapLayout = 'pangaea' | 'continents' | 'archipelago';
type Span = readonly [number, number];
export type PresetSpec = {
  id: MapPreset;
  name: string;
  blurb: string;
  /** Closest legacy layout label, kept so saves, validators and the old selector still agree. */
  layout: MapLayout;
  land: Span;
  /** Peak heights are scaled by this. */
  relief: number;
  /** Rolling hill amplitude multiplier. */
  hills: number;
  ranges: { count: Span; length: Span; width: Span; height: Span; inland: boolean };
  /** 0..1: how much of the interior is terraced into mesas and benches. */
  plateau: number;
  /** Sea-level temperature (Celsius) and its span along the latitude axis. */
  temp: { base: Span; span: Span };
  /** Added to normalised rainfall (-0.5..0.5). */
  wet: Span;
  riverDensity: number;
  lakes: Span;
  meander: number;
  /** Probability that a main river builds a delta. */
  delta: number;
  /** Minimum number of separate landmasses that must host societies (>=1). */
  landmasses: Span;
};
export const PRESETS: Record<MapPreset, PresetSpec> = {
  archipelago: {
    id: 'archipelago', name: 'Archipelago', layout: 'archipelago',
    blurb: 'Several large wooded islands and many islets; every society lives on its own shore and trades by boat.',
    land: [0.16, 0.26], relief: 0.8, hills: 1, ranges: { count: [1, 2], length: [0.1, 0.18], width: [0.035, 0.05], height: [32, 55], inland: true },
    plateau: 0.05, temp: { base: [12, 20], span: [3, 6] }, wet: [0.05, 0.2], riverDensity: 0.7, lakes: [0, 2], meander: 0.8, delta: 0.3, landmasses: [4, 14],
  },
  island: {
    id: 'island', name: 'Island', layout: 'archipelago',
    blurb: 'One large island with bays, a spine of hills and a few offshore islets.',
    land: [0.22, 0.32], relief: 0.95, hills: 1, ranges: { count: [1, 2], length: [0.18, 0.3], width: [0.04, 0.06], height: [45, 75], inland: true },
    plateau: 0.1, temp: { base: [11, 19], span: [3, 7] }, wet: [0, 0.2], riverDensity: 0.9, lakes: [1, 2], meander: 1, delta: 0.5, landmasses: [1, 2],
  },
  continents: {
    id: 'continents', name: 'Two continents', layout: 'continents',
    blurb: 'Two broad landmasses divided by a winding strait, each with its own ranges and great rivers.',
    land: [0.32, 0.42], relief: 1, hills: 1, ranges: { count: [2, 4], length: [0.16, 0.3], width: [0.04, 0.065], height: [55, 95], inland: true },
    plateau: 0.15, temp: { base: [9, 19], span: [5, 10] }, wet: [-0.05, 0.15], riverDensity: 1, lakes: [1, 3], meander: 1, delta: 0.6, landmasses: [2, 2],
  },
  pangaea: {
    id: 'pangaea', name: 'Pangaea', layout: 'pangaea',
    blurb: 'A single sprawling continent with long peninsulas, a great gulf and room for every society to meet by land.',
    land: [0.38, 0.5], relief: 1, hills: 1.05, ranges: { count: [2, 3], length: [0.2, 0.36], width: [0.045, 0.07], height: [60, 100], inland: true },
    plateau: 0.2, temp: { base: [8, 19], span: [6, 11] }, wet: [-0.1, 0.12], riverDensity: 1.1, lakes: [2, 3], meander: 1, delta: 0.6, landmasses: [1, 1],
  },
  'river-valley': {
    id: 'river-valley', name: 'River valley', layout: 'pangaea',
    blurb: 'A great trunk river fed by mountain tributaries runs across wide fertile floodplains to a delta on the coast.',
    land: [0.36, 0.48], relief: 1, hills: 0.8, ranges: { count: [1, 2], length: [0.3, 0.4], width: [0.05, 0.075], height: [65, 100], inland: true },
    plateau: 0.1, temp: { base: [10, 20], span: [3, 7] }, wet: [0.02, 0.16], riverDensity: 1.5, lakes: [1, 2], meander: 1.5, delta: 1, landmasses: [1, 1],
  },
  highland: {
    id: 'highland', name: 'Highland', layout: 'pangaea',
    blurb: 'A cool massif of ridges, high plateaus and mountain lakes, with a narrow lowland coast on one side.',
    land: [0.28, 0.38], relief: 1.35, hills: 1.2, ranges: { count: [3, 5], length: [0.18, 0.3], width: [0.05, 0.08], height: [80, 120], inland: false },
    plateau: 0.45, temp: { base: [5, 13], span: [4, 8] }, wet: [0.05, 0.22], riverDensity: 1.1, lakes: [2, 4], meander: 0.7, delta: 0.25, landmasses: [1, 1],
  },
  steppe: {
    id: 'steppe', name: 'Steppe', layout: 'pangaea',
    blurb: 'Wide, gently rolling grassland behind a coastal range; rain falls at the edges and the lee is dry.',
    land: [0.4, 0.5], relief: 0.7, hills: 0.7, ranges: { count: [1, 2], length: [0.3, 0.42], width: [0.045, 0.06], height: [50, 80], inland: false },
    plateau: 0.3, temp: { base: [12, 22], span: [4, 8] }, wet: [-0.42, -0.26], riverDensity: 0.7, lakes: [0, 2], meander: 1.6, delta: 0.3, landmasses: [1, 1],
  },
  lakeland: {
    id: 'lakeland', name: 'Lakeland', layout: 'pangaea',
    blurb: 'Low forested hills strung with lakes and slow rivers, with wetlands in every hollow.',
    land: [0.38, 0.48], relief: 0.65, hills: 1.15, ranges: { count: [1, 2], length: [0.14, 0.24], width: [0.04, 0.06], height: [38, 60], inland: true },
    plateau: 0.05, temp: { base: [7, 15], span: [3, 7] }, wet: [-0.04, 0.08], riverDensity: 1, lakes: [5, 8], meander: 1.3, delta: 0.3, landmasses: [1, 1],
  },
};
export function isMapPreset(value: unknown): value is MapPreset {
  return typeof value === 'string' && (MAP_PRESETS as readonly string[]).includes(value);
}
/** "Surprise me": a seeded pick that favours variety (all presets are reachable). */
export function randomPreset(seed: number): MapPreset {
  const h = Math.imul(seed ^ 0x6d2b79f5, 0x9e3779b1) >>> 0;
  return MAP_PRESETS[h % MAP_PRESETS.length];
}
