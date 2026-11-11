import type {Game} from './sim.ts';
import type {Building} from './types.ts';
import {soilQuality,habitatAt,habitatKindAt,riverDistance,HABITATS} from './ecology.ts';
import {fieldTerrain} from './fieldTerrain.ts';
import {plotSurveyPoints} from './plotTopography.ts';
import {BUILDINGS} from './constants.ts';

/** GW-10 fertility preview for the field-placement highlight. Pure read; no
 * save state. A fully explored plot's summary is the same fieldTerrain() the
 * harvest uses; a partly explored plot summarises explored cells only. Cells are only reported on explored
 * ground: unexplored cells return null so the highlight never leaks terrain. */
export const FERTILITY_PREVIEW_RULES={version:1,cellMetres:2,maximumCellsPerAxis:16} as const;
/** Best possible yield factor: best habitat crops × (0.65 + 0.5 × soil 1). */
const BEST_YIELD=Math.max(...Object.values(HABITATS).map(h=>h.crops))*1.15;

export interface FertilityCell{soil:number;crops:number;freshwaterMetres:number;greenness:number;/** fieldTerrain's tuber habitat multiplier. */tuberFactor:number}
export interface FertilityPreview{
 version:1;columns:number;rows:number;
 /** Row-major, north (−z) first; null where the team has not explored. */
 cells:(FertilityCell|null)[];
 /** 'complete': every cell explored, values are the harvest's fieldTerrain().
  * 'partial': mean of explored cells only (an estimate; hidden ground never
  * contributes). 'unknown': nothing explored, summary is null. */
 state:'complete'|'partial'|'unknown';
 summary:{soil:number;grainYieldFactor:number;tuberYieldFactor:number;greenness:number}|null;
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
  cells.push({soil,crops,freshwaterMetres:riverDistance(g,x,z),greenness:fertilityGreenness(soil,crops),tuberFactor:habitatKindAt(g,x,z)==='forest'?1.15:.9});
 }
 const known=cells.filter((c):c is FertilityCell=>c!==null),exploredFraction=explored/cells.length;
 if(!known.length)return{version:1,columns,rows,cells,state:'unknown',summary:null,exploredFraction};
 // The harvest summary is shown only when its whole footprint is known: the
 // same survey points field placement requires to be explored.
 if(known.length===cells.length&&plotSurveyPoints({x:plot.x,z:plot.z,w,d}).every(p=>g.exploredAt(p.x,p.z))){
  const t=fieldTerrain(g,{type:'farm',x:plot.x,z:plot.z,w,d} as Building);
  return{version:1,columns,rows,cells,state:'complete',summary:{soil:t.soil,grainYieldFactor:t.grain,tuberYieldFactor:t.tubers,greenness:Math.max(0,Math.min(1,t.grain/BEST_YIELD))},exploredFraction};
 }
 const mean=(f:(c:FertilityCell)=>number)=>known.reduce((a,c)=>a+f(c),0)/known.length;
 const grain=mean(c=>c.crops*(.65+c.soil*.5)),tubers=mean(c=>c.crops*(.65+c.soil*.5)*c.tuberFactor);
 return{version:1,columns,rows,cells,state:'partial',summary:{soil:mean(c=>c.soil),grainYieldFactor:grain,tuberYieldFactor:tubers,greenness:Math.max(0,Math.min(1,grain/BEST_YIELD))},exploredFraction};
}
