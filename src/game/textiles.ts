import type{Game}from'./sim';
import{hasDeliveredMethod}from'./inheritedKnowledge';
import type{Unit}from'./types';
/** Game tuning: material units are the existing finite bast-fibre inventory,
 * not a claim that goats yield wool or that flax cultivation exists. Sheep wool has a separate finite material chain. */
export const TEXTILE_RULES={handSpinSeconds:90,shelterSpinSeconds:35,weaveSeconds:70,sewSeconds:45,lightWarmthCelsius:.75,hideCoatWarmthCelsius:8,hideCoatSewSeconds:85,heatThresholdCelsius:22,heatRangeCelsius:8,fatigueSeconds:600,spareLoadUnits:{lightClothes:.08,skinClothes:.12,leatherClothes:.16,hideCoat:.26,woolCoat:.20}}as const;
export type Garment={item:GarmentKind;condition:number;heatExposureSeconds?:number;wetness?:number};
export type GarmentKind='skinClothes'|'leatherClothes'|'lightClothes'|'hideCoat'|'woolCoat';
export const GARMENT_KINDS:readonly GarmentKind[]=['skinClothes','leatherClothes','lightClothes','hideCoat','woolCoat'];
/** Tunable garment-weather behavior, not claims of measured textile physics.
 * Water carried in cloth is metadata on that same garment, never a new item. */
export const GARMENT_WEATHER_RULES={
 version:1,immersionWetPerSecond:.25,spareRainFactor:.25,spareDryFactor:.6,fireDryPerSecond:.012,roofInsetMetres:.35,immersionDepthMetres:.15,
 kinds:{
  lightClothes:{rainWetPerSecond:.012,dryPerSecond:.004,wetWarmthRetention:.25},
  skinClothes:{rainWetPerSecond:.008,dryPerSecond:.002,wetWarmthRetention:.45},
  leatherClothes:{rainWetPerSecond:.004,dryPerSecond:.0025,wetWarmthRetention:.65},
  hideCoat:{rainWetPerSecond:.006,dryPerSecond:.0015,wetWarmthRetention:.6},
  woolCoat:{rainWetPerSecond:.009,dryPerSecond:.002,wetWarmthRetention:.8},
 },
} as const;
export type GarmentWeather={raining:boolean;immersed:boolean;covered:boolean;fireFraction:number};
const wetFraction=(garment:Garment)=>Number.isFinite(garment.wetness)?Math.max(0,Math.min(1,garment.wetness??0)):0;
export function garmentWetWarmthFactor(garment:Garment){return 1-(1-GARMENT_WEATHER_RULES.kinds[garment.item].wetWarmthRetention)*wetFraction(garment);}
/** The caller supplies physical exposure and the already paid local fire share.
 * A carried spare has reduced rain exposure, not an invented waterproof bag.
 * Immersion wets both garments; repair escrow is not worn or carried here. */
export function tickGarmentWetness(u:Pick<Unit,'hp'|'garment'|'spareGarment'>,dt:number,weather:GarmentWeather){
 if(u.hp<=0||!(dt>0)||!Number.isFinite(dt))return;
 const r=GARMENT_WEATHER_RULES,fire=Number.isFinite(weather.fireFraction)?Math.max(0,Math.min(1,weather.fireFraction)):0;
 for(const [garment,spare]of [[u.garment,false],[u.spareGarment,true]] as const){
  if(!garment)continue;const spec=r.kinds[garment.item],before=wetFraction(garment);
  const wet=weather.immersed?r.immersionWetPerSecond:weather.raining&&!weather.covered?spec.rainWetPerSecond*(spare?r.spareRainFactor:1):0;
  const dry=weather.immersed?0:((!weather.raining||weather.covered?spec.dryPerSecond:0)+r.fireDryPerSecond*fire)*(spare?r.spareDryFactor:1);
  const after=Math.max(0,Math.min(1,before+dt*(wet-dry)));
  if(after!==before)garment.wetness=after;
 }
}
const GARMENT_HEAT_BURDEN:Readonly<Record<GarmentKind,number>>={lightClothes:.1,skinClothes:.65,leatherClothes:1,hideCoat:1.35,woolCoat:1.05};
export function textileRecipeIssue(g:Game,team:number,recipe:string){

 if(recipe==='spinWool'&&!hasDeliveredMethod(g,team,'washWool'))return 'Wash and deliver real fleece before spinning wool';
 if(recipe==='weaveWool'&&!hasDeliveredMethod(g,team,'spinWool'))return 'Deliver real spun wool before weaving it';
 if(recipe==='feltWool'&&!hasDeliveredMethod(g,team,'washWool'))return 'Wash and deliver actual wool before felting it';
 if(recipe==='sewWoolCoat'&&!hasDeliveredMethod(g,team,'weaveWool'))return 'Deliver actual woven wool before sewing this coat';
 if(recipe==='sewFeltCoat'&&!hasDeliveredMethod(g,team,'feltWool'))return 'Deliver actual wool felt before sewing this coat';
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
