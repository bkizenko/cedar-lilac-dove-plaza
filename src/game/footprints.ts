import {BUILDINGS} from './constants';
import {expandablePlot} from './plots';
import {linearStructure} from './linearConstruction';
import type {BldType,Building} from './types';

/** GW-08 quarter-turn footprints. Collision, the walk grid, site preparation
 * and saves already use each building's own w/d, so a 90° turn is the swapped
 * footprint: no new saved field and no change to collision rules. Excluded:
 * drawn plots (already any rectangle), linear works, bridges, docks (aligned to
 * the bank), excavations, quarries, homes (their own planner) and square
 * footprints (a turn changes nothing physical). */
const FIXED:ReadonlySet<BldType>=new Set(['bridge','dock','quarry','trench','moat','gate','house'] as BldType[]);
export function turnableBuilding(type:BldType){const d=BUILDINGS[type];return !!d&&!FIXED.has(type)&&!expandablePlot(type)&&!linearStructure(type)&&Math.abs(d.w-d.d)>1e-6;}
export function turnedFootprint(type:BldType){const d=BUILDINGS[type];return{w:d.d,d:d.w};}
/** 0 or 1 quarter turns, derived from the saved footprint (for the renderer). */
export function buildingQuarterTurns(b:Pick<Building,'type'|'w'|'d'>){const d=BUILDINGS[b.type];return turnableBuilding(b.type)&&Math.abs(b.w-d.d)<1e-6&&Math.abs(b.d-d.w)<1e-6?1:0;}
