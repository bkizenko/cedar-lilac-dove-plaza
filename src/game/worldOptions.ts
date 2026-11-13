import type {Difficulty} from './difficulty';
import type {MapPreset} from './mapgen/presets';
export const WORLD_LAYOUTS=['pangaea','continents','archipelago'] as const;
export type WorldLayout=typeof WORLD_LAYOUTS[number];
export const WORLD_SIZES=[1040,1560,2080] as const;
/** Only new V14 openings carry hint2. Absent in old saves means legacy1;
 * request1 is internal reconstruction metadata and is never serialized. */
export type WorldOptions={size:typeof WORLD_SIZES[number];layout:WorldLayout;randomLayout?:true;openingSiteVersion?:2;riverProfileVersion?:2;tideVersion?:1|2;landformLabelVersion?:2;rulersVersion?:1|2;preset?:MapPreset;mapgenVersion?:1;geologyVersion?:1;flowFieldVersion?:1;/** forestEcologyVersion 1: ecological tree stands (src/game/forestEcology.ts) in placement and rendering; absent = the original per-tree species choice and salt-and-pepper density */forestEcologyVersion?:1};
export type WorldRequest={difficulty?:Difficulty;size?:typeof WORLD_SIZES[number];layout?:WorldLayout|'random';randomLayout?:true;openingSiteVersion?:1|2;riverProfileVersion?:2;tideVersion?:1|2;landformLabelVersion?:2;flowFieldVersion?:1;rulersVersion?:0|1|2;preset?:MapPreset|'random';/** geologyVersion 1: rock provinces, strata, tectonic/fluvial/glacial/coastal/aeolian landforms (mapgen/geology); absent = the pre-geology v21 terrain, byte for byte */forestEcologyVersion?:1;geologyVersion?:1;/** player's village skin (skinState.ts); a sim/scene-lane choice like rulersVersion, never a worldgen input */skin?:import('./skinState').SkinRequest};
/** riverProfileVersion 2 (Grok GW-12): opt-in, saved with the world; absent = historic rivers.
 * tideVersion 1 (Grok W5): opt-in tides on the shared water channel; 2 (W6): sea-only tides (tides.ts); absent = no tides.
 * landformLabelVersion 2 (Grok W5): hills/plains read from relief (landformLabels.ts); absent = historic labels. */
