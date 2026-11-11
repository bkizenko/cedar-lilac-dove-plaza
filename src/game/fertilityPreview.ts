import type {Game} from './sim.ts';
import type {Building} from './types.ts';
import {soilQuality,habitatAt,riverDistance,HABITATS} from './ecology.ts';
import {fieldTerrain} from './fieldTerrain.ts';
import {BUILDINGS} from './constants.ts';

/** GW-10 fertility preview for the field-placement highlight. Pure read; no
 * save state. The summary is the same fieldTerrain() the harvest uses, so the
 * preview number is the yield number. Cells are only reported on explored
 * ground: unexplored cells return null so the highlight never leaks terrain. */
export const FERTILITY_PREVIEW_RULES={version:1,cellMetres:2,maximumCellsPerAxis:16} as const;
/** Best possible yield factor: best habitat crops × (0.65 + 0.5 × soil 1). */
const BEST_YIELD=Math.max(...Object.values(HABITATS).map(h=>h.crops))*1.15;

export interface FertilityCell{soil:number;crops:number;freshwaterMetres:number;greenness:number}
export interface FertilityPreview{
 version:1;columns:number;rows:number;
 /** Row-major, north (−z) first; null where the team has not explored. */
 cells:(FertilityCell|null)[];
 /** Same values as fieldTerrain(): soil 0..1 and the grain yield factor. */
 summary:{soil:number;grainYieldFactor:number;tuberYieldFactor:number;greenness:number};
 exploredFraction:number;
}

/** 0 = poor, 1 = best; what the renderer maps to "more green". Combines the
 * site potential with crop habitat exactly as fieldTerrain's yield factor. */
export function fertilityGreenness(soil:number,crops:number){return Math.max(0,Math.min(1,crops*(.65+soil*.5)/BEST_YIELD));}

export function fertilityPreview(g:Game,plot:{x:number;z:number;w?:number;d?:number}):FertilityPreview{
 const w=plot.w??BUILDINGS.farm.w,d=plot.d??BUILDINGS.farm.d,R=FERTILITY_PREVIEW_RULES;
 const columns=Math.max(1,Math.min(R.maximumCellsPerAxis,Math.round(w/R.cellMetres))),rows=Math.max(1,Math.min(R.maximumCellsPerAxis,Math.round(d/R.cellMetres)));
 const cells:(FertilityCell|null)[]=[];let explored=0;
 for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){
  const x=plot.x+((i+.5)/columns-.5)*w,z=plot.z+((j+.5)/rows-.5)*d;
  if(!g.exploredAt(x,z)){cells.push(null);continue;}
  explored++;const soil=soilQuality(g,x,z),crops=habitatAt(g,x,z).crops;
  cells.push({soil,crops,freshwaterMetres:riverDistance(g,x,z),greenness:fertilityGreenness(soil,crops)});
 }
 const t=fieldTerrain(g,{type:'farm',x:plot.x,z:plot.z,w,d} as Building);
 return{version:1,columns,rows,cells,summary:{soil:t.soil,grainYieldFactor:t.grain,tuberYieldFactor:t.tubers,greenness:Math.max(0,Math.min(1,t.grain/BEST_YIELD))},exploredFraction:explored/cells.length};
}
