import type{Game}from'./sim';
import{hasDeliveredMethod}from'./inheritedKnowledge';
import type{Unit}from'./types';
/** Game tuning: material units are the existing finite bast-fibre inventory,
 * not a claim that goats yield wool or that flax cultivation exists. */
export const TEXTILE_RULES={handSpinSeconds:90,shelterSpinSeconds:35,weaveSeconds:70,sewSeconds:45,lightWarmthCelsius:.75,hideCoatWarmthCelsius:8,hideCoatSewSeconds:85,heatThresholdCelsius:22,heatRangeCelsius:8,fatigueSeconds:600,spareLoadUnits:{lightClothes:.08,skinClothes:.12,leatherClothes:.16,hideCoat:.26}}as const;
export type Garment={item:GarmentKind;condition:number;heatExposureSeconds?:number};
export type GarmentKind='skinClothes'|'leatherClothes'|'lightClothes'|'hideCoat';
export const GARMENT_KINDS:readonly GarmentKind[]=['skinClothes','leatherClothes','lightClothes','hideCoat'];
const GARMENT_HEAT_BURDEN:Readonly<Record<GarmentKind,number>>={lightClothes:.1,skinClothes:.65,leatherClothes:1,hideCoat:1.35};
export function textileRecipeIssue(g:Game,team:number,recipe:string){

 if(recipe==='weaveCloth'&&!(hasDeliveredMethod(g,team,'spinYarn')||hasDeliveredMethod(g,team,'spinYarnHand')))return 'Deliver a hand-spun or shelter-spun yarn batch to learn weaving from actual practice';
 if(recipe==='sewLightClothes'&&!hasDeliveredMethod(g,team,'weaveCloth'))return 'Deliver an actual woven cloth batch before trying light garments';
 return null;
}
export function garmentHeatBurden(u:Unit,temperatureCelsius:number){
 const worn=u.garment;if(!worn||worn.condition<=0)return 0;
 const heat=Math.max(0,Math.min(1,(temperatureCelsius-TEXTILE_RULES.heatThresholdCelsius)/TEXTILE_RULES.heatRangeCelsius));
 return heat*Math.max(0,Math.min(1,worn.condition))*GARMENT_HEAT_BURDEN[worn.item];
}
/** Measurable warm-weather exertion; resting/held residents do not pay a work
 * penalty. Actual condition and identity remain on the equipped garment. */
export function tickGarmentHeat(u:Unit,temperatureCelsius:number,dt:number){
 if(!u.garment||u.garment.condition<=0||u.hp<=0||u.resting||!['gather','build','move','explore','attack','attackmove'].includes(u.order)||!(dt>0))return;
 const burden=garmentHeatBurden(u,temperatureCelsius);if(!burden)return;
 u.garment!.heatExposureSeconds=(u.garment!.heatExposureSeconds||0)+dt*burden;
 u.fatigue=Math.max(0,Math.min(1,(u.fatigue||0)+dt*burden/TEXTILE_RULES.fatigueSeconds));
}
