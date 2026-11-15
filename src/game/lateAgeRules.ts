import type {Game} from './sim';
/** Medieval and Renaissance production gates and batch sizes (game units, tuning values, not assays).
 * Steel: bloom plus extra charcoal at the forge, with loss, so steel is dearer than iron per kilogram of metal.
 * Paper: worn bast or wool cloth pulped with water and pressed; needs a Renaissance workshop. */
export const LATE_AGE_RULES={version:1,steelMinAge:4,paperMinAge:5,steelBloomPerBatch:4,steelCharcoalPerBatch:6,steelPerBatch:3,steelWorkSeconds:150,steelPackedLiters:1,
 paperClothPerBatch:3,paperWaterLiters:4,paperPerBatch:4,paperWorkSeconds:90,paperPackedLiters:1} as const;
const GATES:Record<string,{age:number;words:string}>={carburizeSteel:{age:LATE_AGE_RULES.steelMinAge,words:'steel (Medieval Age)'},pressPaper:{age:LATE_AGE_RULES.paperMinAge,words:'paper (Renaissance Age)'}};
/** Null when the recipe has no late-age gate or the society has reached it. */
export function lateRecipeIssue(g:Game,team:number,recipe:string){
 const gate=Object.hasOwn(GATES,recipe)?GATES[recipe]:undefined;if(!gate)return null;
 return (g.tribe(team)?.age??0)<gate.age?`Making ${gate.words} needs a more advanced age`:null;
}
