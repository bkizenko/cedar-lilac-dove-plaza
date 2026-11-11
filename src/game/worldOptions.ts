import type {Difficulty} from './difficulty';
export const WORLD_LAYOUTS=['pangaea','continents','archipelago'] as const;
export type WorldLayout=typeof WORLD_LAYOUTS[number];
export const WORLD_SIZES=[1040,1560,2080] as const;
/** Only new V14 openings carry hint2. Absent in old saves means legacy1;
 * request1 is internal reconstruction metadata and is never serialized. */
export type WorldOptions={size:typeof WORLD_SIZES[number];layout:WorldLayout;randomLayout?:true;openingSiteVersion?:2;riverProfileVersion?:2};
export type WorldRequest={difficulty?:Difficulty;size?:typeof WORLD_SIZES[number];layout?:WorldLayout|'random';randomLayout?:true;openingSiteVersion?:1|2;riverProfileVersion?:2};
/** riverProfileVersion 2 (Grok GW-12): opt-in, saved with the world; absent = historic rivers. */
