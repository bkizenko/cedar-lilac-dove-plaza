export const WORLD_LAYOUTS=['pangaea','continents','archipelago'] as const;
export type WorldLayout=typeof WORLD_LAYOUTS[number];
export const WORLD_SIZES=[1040,1560,2080] as const;
export type WorldOptions={size:typeof WORLD_SIZES[number];layout:WorldLayout};
export type WorldRequest={size?:typeof WORLD_SIZES[number];layout?:WorldLayout|'random'};
