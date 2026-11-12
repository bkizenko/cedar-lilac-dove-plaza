import type {FoodKind,Tribe} from './types';

/** Tunable game preferences, not a universal historical ranking or calories.
 * One hedon is enjoyment per nourishment unit actually eaten. Raw grain is an
 * emergency ration; eating it never grants the pleasure of a prepared dish. */
export const FOOD_TASTE:Record<FoodKind,number>={provisions:5,berries:6,fish:2,meat:9,grain:0,pulses:5,tubers:5,milk:5,bread:6,driedMeat:7,driedFish:3,smokedMeat:8,smokedFish:4,cookedFish:7,porridge:3,fermentedMilk:6,freshCurd:7,whey:2,smallBeer:5,beer:7,driedBerries:7,jam:8,tallow:4};
export const RAW_ITEM_TASTE={rawMeat:1,roughGrain:0,grainSheaves:0} as const;
export const FOOD_EXPERIENCE_RULES={version:1,memorySeconds:180,neutralTaste:5,maximumTaste:10,appealWeight:.04,maximumTotal:1e12} as const;
export type FoodExperience={version:1;lastAt:number;nourishmentEaten:number;hedons:number;rawUnits:number;recentSatiety:number;recentPleasure:number};

/** Called only by consumption, after spoilage and the actual meal debit.
 * Purchasing, cooking, storing or dropping food creates no enjoyment. */
export function recordFoodExperience(t:Tribe,at:number,dt:number,required:number,nourishment:number,hedons:number,rawUnits:number){
 if(!(dt>0)||!(required>0))return;
 const r=FOOD_EXPERIENCE_RULES,e=t.foodExperience??={version:1,lastAt:at,nourishmentEaten:0,hedons:0,rawUnits:0,recentSatiety:0,recentPleasure:0};
 // A long gap (e.g. an inactive society) must not preserve an old feast.
 const gap=Math.max(0,at-e.lastAt-dt),decay=Math.exp(-gap/r.memorySeconds),blend=-Math.expm1(-dt/r.memorySeconds);
 e.recentSatiety=e.recentSatiety*decay*(1-blend)+Math.min(1,nourishment/required)*blend;
 e.recentPleasure=e.recentPleasure*decay*(1-blend)+Math.min(r.maximumTaste,hedons/required)*blend;
 e.nourishmentEaten=Math.min(r.maximumTotal,e.nourishmentEaten+nourishment);
 e.hedons=Math.min(r.maximumTotal,e.hedons+hedons);
 e.rawUnits=Math.min(r.maximumTotal,e.rawUnits+rawUnits);e.lastAt=at;
}
/** Read-only, bounded; taste cannot compensate for hunger in the reserves term. */
export function foodExperienceReport(t:Tribe,at:number){
 const e=t.foodExperience,r=FOOD_EXPERIENCE_RULES;
 if(!e)return {tasted:false,taste:0,mood:0,appeal:0,nourishment:0,hedons:0,rawUnits:0};
 const decay=Math.exp(-Math.max(0,at-e.lastAt)/r.memorySeconds),satiety=e.recentSatiety*decay,pleasure=e.recentPleasure*decay;
 const mood=Math.max(-1,Math.min(1,pleasure/r.neutralTaste-satiety));
 return {tasted:satiety>1e-5,taste:satiety>1e-5?pleasure/satiety:0,mood,appeal:mood*r.appealWeight,nourishment:e.nourishmentEaten,hedons:e.hedons,rawUnits:e.rawUnits};
}
export function validFoodExperience(v:unknown,now:number){
 if(v===undefined)return true;
 if(!v||typeof v!=='object'||Array.isArray(v))return false;
 const e=v as FoodExperience,r=FOOD_EXPERIENCE_RULES;
 return e.version===1&&Number.isFinite(e.lastAt)&&e.lastAt>=0&&e.lastAt<=now+1e-6&&
  [e.nourishmentEaten,e.hedons,e.rawUnits].every(n=>Number.isFinite(n)&&n>=0&&n<=r.maximumTotal)&&
  (e.hedons<=r.maximumTaste*e.nourishmentEaten+1e-6)&&
  (e.nourishmentEaten>0||e.recentSatiety===0&&e.recentPleasure===0&&e.rawUnits===0)&&
  (e.hedons>0||e.recentPleasure===0)&&
  Number.isFinite(e.recentSatiety)&&e.recentSatiety>=0&&e.recentSatiety<=1&&
  Number.isFinite(e.recentPleasure)&&e.recentPleasure>=0&&e.recentPleasure<=r.maximumTaste*e.recentSatiety+1e-6;
}
