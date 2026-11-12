/** Rock types, stratigraphic recipes and the stable landform-tag table of the geology layer.
 * Ids are persisted nowhere (worlds regenerate from their seed) but are a *public read contract*: the renderer and
 * economy read them from `world.mapgen.geology`. Never renumber; append new ids at the end. See docs/GEOLOGY_MODEL.md. */
export const ROCK = { none: 0, granite: 1, basalt: 2, sandstone: 3, limestone: 4, shale: 5, volcanic: 6, sediment: 7 } as const;
export type RockName = keyof typeof ROCK;
export type RockInfo = {
  id: number; name: RockName; label: string;
  /** 0..1 resistance to erosion and weathering; >= HARD (0.6) rock stands in cliffs, < SOFT (0.45) rock is eroded back. */
  hardness: number;
  /** Relative stream-power erodibility (K multiplier). */
  erodibility: number;
  /** Unslope-limited residual soil depth in metres on gentle ground (weathering rate x time, before slope loss). */
  soil: number;
  /** Preview colour. */
  color: [number, number, number];
};
export const HARD = 0.6, SOFT = 0.45;
export const ROCKS: RockInfo[] = [
  { id: 0, name: 'none', label: 'water / none', hardness: 0, erodibility: 1, soil: 0, color: [40, 90, 140] },
  { id: 1, name: 'granite', label: 'Granite and gneiss', hardness: 0.95, erodibility: 0.3, soil: 0.55, color: [168, 150, 146] },
  { id: 2, name: 'basalt', label: 'Basalt (lava flows)', hardness: 0.9, erodibility: 0.34, soil: 0.9, color: [70, 72, 82] },
  { id: 3, name: 'sandstone', label: 'Sandstone', hardness: 0.7, erodibility: 0.6, soil: 0.5, color: [206, 140, 88] },
  { id: 4, name: 'limestone', label: 'Limestone', hardness: 0.65, erodibility: 0.55, soil: 0.35, color: [214, 208, 184] },
  { id: 5, name: 'shale', label: 'Shale and clay', hardness: 0.18, erodibility: 1.9, soil: 1.3, color: [122, 96, 100] },
  { id: 6, name: 'volcanic', label: 'Ash, tuff and scoria', hardness: 0.3, erodibility: 1.4, soil: 1.7, color: [150, 88, 74] },
  { id: 7, name: 'sediment', label: 'Alluvium, loess, till and sand', hardness: 0.06, erodibility: 2.3, soil: 2.8, color: [196, 178, 120] },
];
export const rockName = (id: number): RockName => ROCKS[id]?.name ?? 'none';
/** Landform tags. A cell carries at most one tag, the one of highest `priority` that applies. Ids are stable. */
export type TagInfo = { id: number; name: string; priority: number; group: 'fluvial' | 'structural' | 'igneous' | 'karst' | 'glacial' | 'coastal' | 'aeolian' | 'cover'; note: string };
const T = (id: number, name: string, priority: number, group: TagInfo['group'], note: string): TagInfo => ({ id, name, priority, group, note });
export const LANDFORMS: TagInfo[] = [
  T(0, 'none', 0, 'cover', 'ordinary ground'),
  T(1, 'floodplain', 20, 'fluvial', 'low valley floor flooded by the river in spate'),
  T(2, 'meander-belt', 36, 'fluvial', 'sinuous low-gradient reach with scroll bars'),
  T(3, 'oxbow', 60, 'fluvial', 'cut-off meander loop holding a crescent lake'),
  T(4, 'river-terrace', 34, 'fluvial', 'abandoned floodplain step above the channel'),
  T(5, 'alluvial-fan', 38, 'fluvial', 'sediment cone where a mountain stream meets the plain'),
  T(6, 'braided-reach', 44, 'fluvial', 'gravel channel split by bars below a range front'),
  T(7, 'gorge', 50, 'fluvial', 'narrow incised channel in hard rock'),
  T(8, 'waterfall', 66, 'fluvial', 'river drop over a hard-rock step'),
  T(9, 'knickpoint', 58, 'fluvial', 'steep river reach migrating upstream through a hard bed'),
  T(10, 'estuary', 36, 'coastal', 'drowned river mouth with tidal mud'),
  T(11, 'cliff', 52, 'structural', 'caprock face: hard bed over soft bed'),
  T(12, 'mesa', 54, 'structural', 'flat-topped residual hard-capped plateau'),
  T(13, 'butte', 56, 'structural', 'small steep-sided remnant of a mesa'),
  T(14, 'hogback', 48, 'structural', 'sharp ridge along steeply dipping hard strata'),
  T(15, 'cuesta', 28, 'structural', 'gently dipping hard-bed dip slope with a scarp on the other side'),
  T(16, 'canyon', 46, 'structural', 'river-cut gorge with stepped strata walls'),
  T(17, 'escarpment', 50, 'structural', 'long steep edge of a hard province or fault block'),
  T(18, 'fault-scarp', 49, 'structural', 'step in the ground along a normal fault'),
  T(19, 'rift-valley', 30, 'structural', 'down-dropped graben floor between two faults'),
  T(20, 'badlands', 26, 'structural', 'dissected soft shale and clay with little soil'),
  T(21, 'volcanic-cone', 53, 'igneous', 'young cone of ash and scoria'),
  T(22, 'caldera', 62, 'igneous', 'collapsed summit basin and rim'),
  T(23, 'lava-field', 45, 'igneous', 'rough young basalt flow'),
  T(24, 'basalt-columns', 47, 'igneous', 'columnar-jointed basalt face'),
  T(25, 'tor', 40, 'igneous', 'stack of joint-bounded granite blocks'),
  T(26, 'inselberg', 51, 'igneous', 'isolated granite dome standing above a plain'),
  T(27, 'crag', 42, 'igneous', 'steep bare granite face'),
  T(28, 'sinkhole', 57, 'karst', 'dissolution pit in limestone'),
  T(29, 'karst-tower', 55, 'karst', 'steep limestone tower in humid country'),
  T(30, 'limestone-pavement', 27, 'karst', 'bare fissured limestone surface'),
  T(31, 'cirque', 59, 'glacial', 'armchair hollow cut by a small glacier'),
  T(32, 'u-valley', 41, 'glacial', 'glacier-widened valley with a flat floor'),
  T(33, 'moraine', 43, 'glacial', 'ridge of dumped glacial debris'),
  T(34, 'kettle', 61, 'glacial', 'hole left by a melted ice block'),
  T(35, 'fjord', 63, 'glacial', 'glacial trough drowned by the sea'),
  T(36, 'drumlin', 32, 'glacial', 'streamlined till hill aligned with ice flow'),
  T(37, 'sea-cliff', 53, 'coastal', 'wave-cut cliff on hard rock facing open water'),
  T(38, 'sea-stack', 64, 'coastal', 'rock pillar left offshore of a retreating cliff'),
  T(39, 'sea-arch', 65, 'coastal', 'marker for a headland where a natural arch is expected (not representable in a height field)'),
  T(40, 'beach', 22, 'coastal', 'sand or shingle on a sheltered or soft shore'),
  T(41, 'spit', 46, 'coastal', 'sand ridge built by longshore drift'),
  T(42, 'barrier-bar', 45, 'coastal', 'offshore sand ridge enclosing a lagoon'),
  T(43, 'lagoon', 35, 'coastal', 'shallow water behind a bar or spit'),
  T(44, 'tidal-flat', 33, 'coastal', 'mud and sand flat around river mouths'),
  T(45, 'dune', 31, 'aeolian', 'wind-built sand ridge oriented by the prevailing wind'),
  T(46, 'playa', 48, 'aeolian', 'dry salt-crusted lake bed'),
  T(47, 'wadi', 37, 'aeolian', 'dry flash-flood channel'),
  T(48, 'yardang', 39, 'aeolian', 'wind-streamlined ridge of soft rock'),
  T(49, 'desert-pavement', 21, 'aeolian', 'stone lag left where wind removed the fines'),
  T(50, 'scree', 25, 'cover', 'talus apron below a cliff'),
  T(51, 'boulder-field', 23, 'cover', 'felsenmeer or glacial erratic litter'),
  T(52, 'exposed-strata', 29, 'cover', 'bare layered rock with no soil'),
  T(53, 'vista', 70, 'cover', 'rare exceptional viewpoint: large relief beside water'),
];
export const TAG: Record<string, number> = Object.fromEntries(LANDFORMS.map(t => [t.name, t.id]));
export const tagName = (id: number) => LANDFORMS[id]?.name ?? 'none';
export const TAG_PRIORITY = Uint8Array.from(LANDFORMS.map(t => t.priority));
/** Tags that only exist on a hard bed lying on a soft bed (asserted by tests). */
export const CAPROCK_TAGS = ['cliff', 'mesa', 'butte', 'hogback'] as const;

export type Bed = { rock: number; thick: number };
/** Layered sequences (bottom to top, repeating cyclothems). Every hard bed sits on a soft bed. */
export const RECIPES = {
  'sandstone-series': [[5, 9], [3, 8], [5, 7], [4, 12], [5, 12], [3, 20], [5, 10], [3, 6], [5, 8]],
  'limestone-series': [[5, 6], [4, 14], [5, 5], [4, 9], [5, 8], [3, 6], [5, 5], [4, 22]],
  'shale-series': [[5, 18], [3, 4], [5, 16], [3, 3], [5, 14], [4, 5], [5, 20]],
  'basalt-flows': [[5, 3], [2, 10], [6, 2], [2, 12], [6, 3], [2, 8], [6, 2], [2, 14]],
  'volcanic-pile': [[6, 10], [2, 5], [6, 8], [2, 4]],
} as const satisfies Record<string, readonly (readonly [number, number])[]>;
export type RecipeName = keyof typeof RECIPES;
export const recipeBeds = (name: RecipeName): Bed[] => RECIPES[name].map(([rock, thick]) => ({ rock, thick }));
