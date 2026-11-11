import type{Game}from'./sim';import type{BldType,Building,Unit,GameState,Tribe}from'./types';
/** Material units are conserved processing portions, not kilograms. Existing
 * crop potential is clean-grain-equivalent; its stalk/husk mass travels too. */
export const CEREAL_RULES={version:1,sheavesPerPotentialGrain:2,rawBatch:8,roughBatch:6,strawPerBatch:2,chaffPerBatch:2,cleanGrainPerBatch:4,seedFraction:.08,handThreshSeconds:24,handWinnowSeconds:16,floorThreshSeconds:12,floorWinnowSeconds:8,reviewSeconds:5,foodTargetSeconds:600,maximumAutomaticWorkers:2,adultsPerAutomaticMealJob:3,maximumAutomaticMealJobs:12}as const;
export type CerealLedger={version:1;harvestedSheaves:number;deliveredSheaves:number;lostCarriedSheaves:number;cleanedGrain:number;seedsAllocated:number;seedsLost:number};
export const CEREAL_STORAGE_RULES={
 grainSheaves:{coveredGraceSeconds:900,coveredLossPerSecond:.000035},
 roughGrain:{coveredGraceSeconds:1800,coveredLossPerSecond:.000015},
 exposedDryLossPerSecond:.00008,
 exposedWetLossPerSecond:.00035,
 urgentReserveSeconds:240,
 spoilageWarningLeadSeconds:120,
} as const;
export const storedCerealKinds=['grainSheaves','roughGrain'] as const;
export type StoredCerealKind=typeof storedCerealKinds[number];
/** The timestamp represents the mean age of the bulk stock. New material
 * changes that age in proportion to its actual share of the combined stock. */
export function mixStoredCerealAge(tribe:Tribe,kind:StoredCerealKind,prior:number,incoming:number,time:number,incomingSince=time){
 if(incoming<=0)return;
 const age=tribe.itemFreshness??={};
 const previousSince=prior>0?age[kind]??time:incomingSince;
 age[kind]=Math.min(time,previousSince+(incomingSince-previousSince)*(incoming/(prior+incoming)));
}
export const cerealRecipes=['threshCerealHand','winnowCerealHand','threshCerealFloor','winnowCerealFloor']as const;
export const isCerealRecipe=(key:string)=>cerealRecipes.includes(key as typeof cerealRecipes[number]);
export function cerealLedger(g:Game){return g.state.cerealProcessing??={version:1,harvestedSheaves:0,deliveredSheaves:0,lostCarriedSheaves:0,cleanedGrain:0,seedsAllocated:0,seedsLost:0};}
export function rawCerealField(b:Building){return b.type==='farm'&&b.cerealProcessingVersion===1&&(b.crop?.kind||b.cropType||'grain')==='grain';}
export function collectCerealSheaves(g:Game,u:Unit,potential:number,capacity:number){
 if(u.carry>0){u.order='return';return 0;}const held=Object.values(u.itemCargo||{}).reduce((n,v)=>n+(v||0),0),n=Math.max(0,Math.min(potential,(capacity-held)/CEREAL_RULES.sheavesPerPotentialGrain));
 if(n>0){u.itemCargo??={};const raw=n*CEREAL_RULES.sheavesPerPotentialGrain;u.itemCargo.grainSheaves=(u.itemCargo.grainSheaves||0)+raw;cerealLedger(g).harvestedSheaves+=raw;}
 return n;
}
export function recordCerealDelivery(g:Game,u:Unit){const n=u.itemCargo?.grainSheaves||0;if(n>0)cerealLedger(g).deliveredSheaves+=n;}
export function recordCerealCargoLoss(g:Game,u:Unit){const n=u.itemCargo?.grainSheaves||0;if(n>0)cerealLedger(g).lostCarriedSheaves+=n;}
export function cerealSeedCapacityIssue(g:Game,team:number,recipe:string){return recipe.startsWith('winnowCereal')&&(g.tribe(team).seeds||0)+CEREAL_RULES.cleanGrainPerBatch*CEREAL_RULES.seedFraction>1e12?'Seed storage is full; keeping the same finished grain batch until space is available':null;}
export function finishCerealBatch(g:Game,team:number,recipe:string){if(!recipe.startsWith('winnowCereal'))return true;if(cerealSeedCapacityIssue(g,team,recipe))return false;const t=g.tribe(team),m=cerealLedger(g),seed=CEREAL_RULES.cleanGrainPerBatch*CEREAL_RULES.seedFraction;t.seeds=(t.seeds||0)+seed;m.cleanedGrain+=CEREAL_RULES.cleanGrainPerBatch;m.seedsAllocated+=seed;return true;}
export function compactGrainWorkplace(type: BldType) {
 return type === 'threshingFloor' || type === 'grindingStone' || type === 'oven';
}
export function cerealWeatherIssue(g:Game,recipe:string){return recipe.startsWith('winnowCereal')&&['rain','storm','flood'].includes(g.state.weather)?'Wet weather: keep the same paid grain and wait for dry winnowing conditions':null;}
export function validCerealState(s:GameState){const v=s.cerealProcessing;if(v===undefined&&Array.isArray(s.production?.projects)&&s.production!.projects.some(p=>p&&isCerealRecipe(p.recipe)))return false;if(v!==undefined&&(!v||v.version!==1||!['harvestedSheaves','deliveredSheaves','lostCarriedSheaves','cleanedGrain','seedsAllocated','seedsLost'].every(k=>typeof(v as any)[k]==='number'&&Number.isFinite((v as any)[k])&&(v as any)[k]>=0&&(v as any)[k]<=1e12)))return false;return s.buildings.every(b=>b.cerealProcessingVersion===undefined||b.type==='farm'&&b.cerealProcessingVersion===1);}
