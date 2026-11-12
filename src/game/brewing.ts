import {DAIRY_RULES,validDairyRecovery,type DairyRecovery} from './dairy';
import type {PotteryOrigin} from './pottery';

/** Gameplay material/food units and simulation seconds, not historical yields,
 * alcohol percentages, food-safety claims or a drinking-water treatment model. */
export const BREWING_RULES={
 version:1,vessels:1,minimumCelsius:5,maximumCelsius:38,hotLossSeconds:45,maximumClockSeconds:1e12,
 maltLifetimeSeconds:600,spoilRates:{smallBeer:.0003,beer:.0002},
 cleaningSeconds:DAIRY_RULES.cleaningSeconds,cleaningWaterLiters:DAIRY_RULES.cleaningWaterLiters,recoveryReviewSeconds:DAIRY_RULES.recoveryReviewSeconds,
 stages:{
  malt:{grain:4,greenMalt:0,outputMalt:3,food:0,water:2,wood:0,preparationSeconds:20,exposureSeconds:60,rawLifetimeSeconds:480,finishedLifetimeSeconds:600},
  smallBeer:{grain:0,greenMalt:2,outputMalt:0,food:2,water:4,wood:1,preparationSeconds:30,exposureSeconds:90,rawLifetimeSeconds:480,finishedLifetimeSeconds:1200},
  beer:{grain:0,greenMalt:3,outputMalt:0,food:2,water:4,wood:1,preparationSeconds:30,exposureSeconds:120,rawLifetimeSeconds:480,finishedLifetimeSeconds:1200},
 },
} as const;
export type BrewStage=keyof typeof BREWING_RULES.stages;
export type BrewBatch={version:1;stage:BrewStage;exposureSeconds:number;elapsedSeconds:number;hotSeconds:number;tempCelsius:number;inputAgeSeconds?:number;vesselOrigin?:PotteryOrigin;recovery?:DairyRecovery};
const stageKnown=(v:unknown):v is BrewStage=>typeof v==='string'&&Object.hasOwn(BREWING_RULES.stages,v);
export function newBrewBatch(stage:BrewStage,vesselOrigin?:PotteryOrigin):BrewBatch{
 if(!stageKnown(stage))throw new Error('Unknown brewing stage');
 return {version:1,stage,exposureSeconds:0,elapsedSeconds:0,hotSeconds:0,tempCelsius:0,...(vesselOrigin?{vesselOrigin:{...vesselOrigin}}:{})};
}
/** Only actual warm-enough, non-overheated passive time advances a held batch.
 * The owner handles age/spoilage of paid inputs, outputs and the original vessel. */
export function advanceBrewBatch(batch:BrewBatch,dt:number,tempCelsius:number){
 const rules=BREWING_RULES,spec=rules.stages[batch.stage],malt=batch.stage==='malt';
 const result=(reason:string)=>{const lost=!!batch.recovery||batch.hotSeconds>=rules.hotLossSeconds;return{ready:!lost&&batch.exposureSeconds>=spec.exposureSeconds,lost,reason};};
 if(batch.recovery)return result('The spoiled batch is gone; clean and recover its held vessel');
 if(!(dt>0)||!Number.isFinite(dt)||!Number.isFinite(tempCelsius)||tempCelsius< -200||tempCelsius>100)return result('Passive brewing waits for a valid elapsed time and temperature');
 batch.tempCelsius=tempCelsius;
 batch.elapsedSeconds=Math.min(rules.maximumClockSeconds,batch.elapsedSeconds+dt);
 const hot=tempCelsius>rules.maximumCelsius,cold=tempCelsius<rules.minimumCelsius;
 if(hot)batch.hotSeconds=Math.min(batch.elapsedSeconds,batch.hotSeconds+dt);
 if(!hot&&!cold&&batch.hotSeconds<rules.hotLossSeconds)batch.exposureSeconds=Math.min(spec.exposureSeconds,batch.exposureSeconds+dt);
 if(batch.hotSeconds>=rules.hotLossSeconds)return result(malt?'The held sprouting grain spoiled from prolonged overheating':'The held beer batch spoiled from prolonged overheating');
 if(hot)return result(malt?'Sprouting grain is overheating; the vessel and slot remain held':'Fermentation is overheating; the vessel and slot remain held');
 if(cold)return result(malt?'Below 5°C: sprouting pauses while the paid grain still ages':'Below 5°C: fermentation pauses while the paid batch still ages');
 return result(`${malt?'Sprouting grain':'Fermenting '+(batch.stage==='smallBeer'?'small beer':'beer')} · ${Math.floor(batch.exposureSeconds/spec.exposureSeconds*100)}% · vessel and slot held`);
}
/** Age is time since project admission. Absolute recovery timestamps are checked
 * by the enclosing project validator against its actual start and world time. */
export function validBrewBatch(value:unknown,age:number,validOrigin:(origin:PotteryOrigin)=>boolean,validRecovery:(recovery:DairyRecovery)=>boolean=validDairyRecovery):value is BrewBatch{
 if(!value||typeof value!=='object'||Array.isArray(value)||!Number.isFinite(age)||age<0)return false;
 const b=value as BrewBatch,rules=BREWING_RULES;
 if(Object.keys(b).some(key=>!['version','stage','exposureSeconds','elapsedSeconds','hotSeconds','tempCelsius','inputAgeSeconds','vesselOrigin','recovery'].includes(key))||b.version!==1||!stageKnown(b.stage))return false;
 const finite=(n:unknown,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
 if(!finite(b.elapsedSeconds,Math.min(rules.maximumClockSeconds,age+1e-5))||!finite(b.hotSeconds,b.elapsedSeconds)||!finite(b.exposureSeconds,rules.stages[b.stage].exposureSeconds)||b.exposureSeconds>b.elapsedSeconds-b.hotSeconds+1e-5)return false;
 if(!Number.isFinite(b.tempCelsius)||b.tempCelsius< -200||b.tempCelsius>100||b.inputAgeSeconds!==undefined&&!finite(b.inputAgeSeconds,rules.maltLifetimeSeconds))return false;
 if(b.vesselOrigin!==undefined&&(!b.vesselOrigin||typeof b.vesselOrigin!=='object'||Array.isArray(b.vesselOrigin)||!validOrigin(b.vesselOrigin)))return false;
 if(b.recovery!==undefined&&(!b.recovery||typeof b.recovery!=='object'||Array.isArray(b.recovery)||!validRecovery(b.recovery)))return false;
 return true;
}
