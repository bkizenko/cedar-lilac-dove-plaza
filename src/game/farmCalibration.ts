/** Research-only, read-only calculators. No runtime system imports this module.
 * Game portions, rendered metres and worker-seconds are never silently converted
 * into historical kilograms, cultivated hectares or hours. */
import{BUILDINGS,GATHER_WORK_RATE}from'./constants';
import{CEREAL_RULES}from'./cerealRules';
import{PRODUCTION_RECIPES}from'./production';
import{FOOD_NOURISHMENT}from'./pantry';
import{YEAR_SECONDS,FOOD_PER_PERSON_SECOND}from'./settlement';
const positive=(name:string,n:number)=>{if(!Number.isFinite(n)||n<=0)throw new RangeError(`${name} must be finite and positive`);return n;};
const fraction=(name:string,n:number,allowZero=true)=>{if(!Number.isFinite(n)||n<0||n>1||!allowZero&&n===0)throw new RangeError(`${name} must be a valid fraction`);return n;};

/** Neutral full-care baseline only: no soil/weather/tool/practice modifiers,
 * hauling, queue waits, spoilage, hunger, rounding losses or rest deductions.
 * Processing is a fractional-batch throughput equivalent, not instant work. */
export function currentGameCerealBudget(potential=260,method:'hearth'|'dedicated'='dedicated'){
 positive('potential',potential);if(!['hearth','dedicated'].includes(method))throw new RangeError('Unknown method');
 const sheaves=potential*CEREAL_RULES.sheavesPerPotentialGrain,rawBatches=sheaves/CEREAL_RULES.rawBatch,grossCleanGrain=rawBatches*CEREAL_RULES.cleanGrainPerBatch,seeds=grossCleanGrain*CEREAL_RULES.seedFraction,mealGrain=grossCleanGrain-seeds;
 const thresh=PRODUCTION_RECIPES[method==='hearth'?'threshCerealHand':'threshCerealFloor'],winnow=PRODUCTION_RECIPES[method==='hearth'?'winnowCerealHand':'winnowCerealFloor'],grind=PRODUCTION_RECIPES[method==='hearth'?'grindGrain':'grindGrainStation'],bake=PRODUCTION_RECIPES[method==='hearth'?'bakeBread':'bakeBreadOven'];
 const stages={thresh:rawBatches*thresh.workSeconds,winnow:rawBatches*winnow.workSeconds,grind:mealGrain/grind.grain*grind.workSeconds,bake:mealGrain/(bake.inputs.flour||1)*bake.workSeconds},postHarvestWorkerSeconds=Object.values(stages).reduce((a,b)=>a+b,0),adultAnnualNourishment=FOOD_PER_PERSON_SECOND*YEAR_SECONDS,breadNourishment=mealGrain*(FOOD_NOURISHMENT.bread??1);
 return{renderedSquareMetres:BUILDINGS.farm.w*BUILDINGS.farm.d,yearSimulationSeconds:YEAR_SECONDS,potential,sheaves,grossCleanGrain,seeds,mealGrain,breadNourishment,adultAnnualNourishment,idealBreadAdultYears:breadNourishment/adultAnnualNourishment,stages,postHarvestWorkerSeconds,baseFieldWorkerSeconds:(180+220+Math.ceil(potential/2)*.8)/GATHER_WORK_RATE,unmilledGrainRemainder:mealGrain%grind.grain,annualSeedDebitImplemented:false as const,historicalHectares:null,historicalKilograms:null};
}
export type HistoricalCerealScenario={cultivatedHectares:number;grossCleanKgPerHectare:number;sowingKgPerHectare:number;seedViabilityFraction:number;postSeedLossFraction:number;grainKcalPerKg:number;adultKcalPerDay:number;cerealCalorieShare:number;croppedFractionOfArable:number};
/** All quantities are explicit analyst assumptions. Gross yield is CLEAN grain,
 * not straw/ears. The result excludes all other foods, pasture, tax and fodder. */
export function historicalCerealBudget(p:HistoricalCerealScenario){
 for(const k of['cultivatedHectares','grossCleanKgPerHectare','sowingKgPerHectare','grainKcalPerKg','adultKcalPerDay']as const)positive(k,p[k]);fraction('seedViabilityFraction',p.seedViabilityFraction,false);fraction('postSeedLossFraction',p.postSeedLossFraction);fraction('cerealCalorieShare',p.cerealCalorieShare,false);fraction('croppedFractionOfArable',p.croppedFractionOfArable,false);
 const grossKg=p.cultivatedHectares*p.grossCleanKgPerHectare,seedTargetKg=p.cultivatedHectares*p.sowingKgPerHectare/p.seedViabilityFraction,seedAllocatedKg=Math.min(grossKg,seedTargetKg),foodKg=(grossKg-seedAllocatedKg)*(1-p.postSeedLossFraction),grainKgPerAdultYear=p.adultKcalPerDay*365*p.cerealCalorieShare/p.grainKcalPerKg;
 return{grossKg,seedTargetKg,seedAllocatedKg,seedShortfallKg:Math.max(0,seedTargetKg-grossKg),foodKg,grainKgPerAdultYear,cerealDietAdultYears:foodKg/grainKgPerAdultYear,arableHectaresIncludingFallow:p.cultivatedHectares/p.croppedFractionOfArable};
}
export function activeGrindingPersonHours(cleanGrainKg:number,kgPerPersonHour:number){return positive('cleanGrainKg',cleanGrainKg)/positive('kgPerPersonHour',kgPerPersonHour);}
export function reapingAndBindingPersonDays(hectares:number,bandWorkers:number,acresPerBandDay:number){return positive('hectares',hectares)*10000/4046.8564224*positive('bandWorkers',bandWorkers)/positive('acresPerBandDay',acresPerBandDay);}
