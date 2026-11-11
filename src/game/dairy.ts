import type {Game} from './sim';
import type {Building} from './types';
import {climateAt} from './ecology';
import type {PotteryOrigin} from './pottery';
/** Explicit gameplay food units and simulation seconds, not historical yields or a real food-preparation guide. */
export const DAIRY_RULES={milkPerBatch:4,foodPerBatch:3,preparationSeconds:30,fermentSeconds:90,rawBatchLifetimeSeconds:480,finishedBatchLifetimeSeconds:1200,minimumCelsius:8,maximumCelsius:38,hotLossSeconds:45,spoilPerSecond:.0002} as const;
export type DairyBatch={version:1;fermentSeconds:number;elapsedSeconds:number;hotSeconds:number;temperatureCelsius:number;vesselOrigin?:PotteryOrigin};
export const newDairyBatch=():DairyBatch=>({version:1,fermentSeconds:0,elapsedSeconds:0,hotSeconds:0,temperatureCelsius:0});
export function advanceDairy(g:Game,b:Building,d:DairyBatch,dt:number){
 const temperature=climateAt(g,b.x,b.z).temperature,seconds=Math.max(0,dt);d.temperatureCelsius=temperature;d.elapsedSeconds+=seconds;
 const hot=temperature>DAIRY_RULES.maximumCelsius,cold=temperature<DAIRY_RULES.minimumCelsius;
 if(hot)d.hotSeconds+=seconds;
 if(!hot&&!cold)d.fermentSeconds=Math.min(DAIRY_RULES.fermentSeconds,d.fermentSeconds+seconds*Math.max(.5,Math.min(1.5,temperature/20)));
 return {ready:d.fermentSeconds>=DAIRY_RULES.fermentSeconds,lost:d.hotSeconds>=DAIRY_RULES.hotLossSeconds,reason:hot?'Milk batch overheating; prolonged heat spoils it':cold?'Too cold to ferment; the committed milk still ages':`Fermenting milk · ${Math.floor(d.fermentSeconds/DAIRY_RULES.fermentSeconds*100)}% · vessel and slot reserved`};
}
export function validDairyBatch(d:DairyBatch,age:number){return !!d&&d.version===1&&[d.fermentSeconds,d.elapsedSeconds,d.hotSeconds].every(n=>Number.isFinite(n)&&n>=0)&&d.fermentSeconds<=DAIRY_RULES.fermentSeconds&&d.elapsedSeconds<=age+1e-5&&d.hotSeconds<=d.elapsedSeconds+1e-5&&d.fermentSeconds<=d.elapsedSeconds*1.5+1e-5&&Number.isFinite(d.temperatureCelsius)&&d.temperatureCelsius>=-200&&d.temperatureCelsius<=100;}
