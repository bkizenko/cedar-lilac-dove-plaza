/** World-size-derived grid resolution (bigger-maps lane).
 * Every size up to 2080 m keeps the historic 520 x 520 nav grid and 192 x 192 fog/territory grid, so existing worlds and saves
 * are unchanged. Above 2080 m the fog grid keeps its 10.83 m cell (proportional to size) and the nav grid keeps its 4 m cell
 * until the cell count would pass WALK_MAX_CELLS, beyond which the nav cell coarsens (a memory and A* budget, see
 * docs/BIGGER_MAPS_BUDGETS.md). Pure functions of world size: nothing here is saved. */
export const GRID_BASE_SIZE=2080,WALK_BASE_CELLS=520,FOW_BASE_CELLS=192,WALK_MAX_CELLS=1300,FOW_MAX_CELLS=1024;
export function walkCells(size:number):number{return size<=GRID_BASE_SIZE?WALK_BASE_CELLS:Math.min(WALK_MAX_CELLS,Math.round(size/4));}
export function fowCells(size:number):number{return size<=GRID_BASE_SIZE?FOW_BASE_CELLS:Math.min(FOW_MAX_CELLS,Math.round(FOW_BASE_CELLS*size/GRID_BASE_SIZE));}
