import type {Game} from './sim';
import {residueFuelAvailable,RESIDUE_FUEL_RULES} from './residueFuel';
/** Household meal heat only. Smoking needs its original wood; kiln firing,
 * charcoal feedstock, metallurgy and brewing retain their own fuel contracts. */
export const RESIDUE_MEAL_RECIPES=['cookFish','cookMeat','cookPorridge','bakeBread','bakeBreadOven','bakeBreadDouble','bakeBreadBulk'] as const;
export const acceptsMealResidues=(recipe:string)=>RESIDUE_MEAL_RECIPES.some(id=>id===recipe);
export function productionFuelAvailable(g:Game,team:number,recipe:string,wood:number){
 const t=g.tribe(team);return !!t&&t.wood+(t.survival&&acceptsMealResidues(recipe)?residueFuelAvailable(g,team).availableWoodEquivalent:0)>=wood;
}
export function productionFuelLabel(recipe:string,wood:number,detail=false){return acceptsMealResidues(recipe)?detail?`${wood} fuel (${wood} logs / ${wood*RESIDUE_FUEL_RULES.chaffPerWoodEquivalent} chaff / ${wood*RESIDUE_FUEL_RULES.strawPerWoodEquivalent} surplus straw)`:`${wood} fuel`:`${wood} logs`;}
