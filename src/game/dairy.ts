import type {Game} from './sim';
import type {Building} from './types';
import {climateAt} from './ecology';
import type {PotteryOrigin} from './pottery';
/** Explicit gameplay food units and simulation seconds, not historical yields or a real food-preparation guide. */
export const DAIRY_RULES={milkPerBatch:4,foodPerBatch:3,preparationSeconds:30,fermentSeconds:90,rawBatchLifetimeSeconds:480,finishedBatchLifetimeSeconds:1200,minimumCelsius:8,maximumCelsius:38,hotLossSeconds:45,spoilPerSecond:.0002,cleaningSeconds:20,cleaningWaterLiters:2,recoveryReviewSeconds:3} as const;
export type DairyBatch={version:1;fermentSeconds:number;elapsedSeconds:number;hotSeconds:number;temperatureCelsius:number;recovery?:{version:1;failedAt:number;reason:string;queued:boolean;waterPaid:boolean;waterDelivered:boolean;waterCollected:boolean;waterCache?:{x:number;z:number};cleanedSeconds:number};vesselOrigin?:PotteryOrigin};
export const newDairyBatch=():DairyBatch=>({version:1,fermentSeconds:0,elapsedSeconds:0,hotSeconds:0,temperatureCelsius:0});
export function advanceDairy(g:Game,b:Building,d:DairyBatch,dt:number){
 const temperature=climateAt(g,b.x,b.z).temperature,seconds=Math.max(0,dt);d.temperatureCelsius=temperature;d.elapsedSeconds+=seconds;
 const hot=temperature>DAIRY_RULES.maximumCelsius,cold=temperature<DAIRY_RULES.minimumCelsius;
 if(hot)d.hotSeconds+=seconds;
 if(!hot&&!cold)d.fermentSeconds=Math.min(DAIRY_RULES.fermentSeconds,d.fermentSeconds+seconds*Math.max(.5,Math.min(1.5,temperature/20)));
 return {ready:d.fermentSeconds>=DAIRY_RULES.fermentSeconds,lost:d.hotSeconds>=DAIRY_RULES.hotLossSeconds,reason:hot?'Milk batch overheating; prolonged heat spoils it':cold?'Too cold to ferment; the committed milk still ages':`Fermenting milk · ${Math.floor(d.fermentSeconds/DAIRY_RULES.fermentSeconds*100)}% · vessel and slot reserved`};
}
export function validDairyBatch(d:DairyBatch,age:number){if(d?.recovery!==undefined){const r=d.recovery;if(!r||typeof r!=='object'||r.version!==1||!Number.isFinite(r.failedAt)||r.failedAt<0||typeof r.reason!=='string'||r.reason.length>300||typeof r.queued!=='boolean'||typeof r.waterPaid!=='boolean'||typeof r.waterDelivered!=='boolean'||typeof r.waterCollected!=='boolean'||r.waterCollected&&!r.waterPaid||r.waterDelivered&&!r.waterCollected||r.waterPaid&&!r.waterCache||r.waterCache!==undefined&&(!r.waterCache||typeof r.waterCache!=='object'||!Number.isFinite(r.waterCache.x)||!Number.isFinite(r.waterCache.z)||Math.abs(r.waterCache.x)>1200||Math.abs(r.waterCache.z)>1200)||r.waterDelivered&&!r.waterPaid||!Number.isFinite(r.cleanedSeconds)||r.cleanedSeconds<0||r.cleanedSeconds>DAIRY_RULES.cleaningSeconds||!r.waterDelivered&&r.cleanedSeconds>0)return false;}return !!d&&d.version===1&&[d.fermentSeconds,d.elapsedSeconds,d.hotSeconds].every(n=>Number.isFinite(n)&&n>=0)&&d.fermentSeconds<=DAIRY_RULES.fermentSeconds&&d.elapsedSeconds<=age+1e-5&&d.hotSeconds<=d.elapsedSeconds+1e-5&&d.fermentSeconds<=d.elapsedSeconds*1.5+1e-5&&Number.isFinite(d.temperatureCelsius)&&d.temperatureCelsius>=-200&&d.temperatureCelsius<=100;}
