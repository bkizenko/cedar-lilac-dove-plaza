import type {Game} from './sim';
import type {Building} from './types';
import {watermillSite,windmillSite} from './waterWorks';
import {currentAt,currentPowerKw,RIVER_CURRENT_RULES} from './riverCurrents';

/** Grok World T4 / CURRENT-POWER-HOOK: a finished watermill or windmill grinds grain at a
 * rate set by its real power. Watermill: the larger of the undershot current power
 * (`currentPowerKw` at the wheel) and the head power of the millrace (ρ·g·Q·H·η, Q from the
 * wheel's immersed width and the measured current, never below a slow millrace flow).
 * Windmill: the measured site exposure (`windmillSite.powerIndex`) times the weather.
 * Work rate = power / referenceKw, capped; below minKw the mill stands idle. */
export const MILL_RULES={version:1,referenceKw:1.5,maxRate:3,minKw:.15,millraceSpeed:.5,overshotEfficiency:.6,breastshotEfficiency:.45,
 windKwPerExposureMetre:.6,maxWindKw:5,
 waterWeather:{drought:.4,flood:1.2} as Partial<Record<string,number>>,
 windWeather:{storm:1.4,rain:1.1,mist:.5,golden:.8,frost:.9} as Partial<Record<string,number>>} as const;
export type MillType='watermill'|'windmill';
export function isMill(t:string):t is MillType{return t==='watermill'||t==='windmill';}
type B=Pick<Building,'type'|'x'|'z'>;
const cache=new WeakMap<object,{key:string;kw:number}>();
/** Live mechanical power at a mill (kW); 0 for any other building. */
export function millPowerKw(g:Game,b:B):number{
 if(!isMill(b.type))return 0;const weather=g.state.weather as string,key=`${b.type}:${b.x}:${b.z}:${weather}:${g.world.waterY}`;
 const hit=cache.get(b as object);if(hit?.key===key)return hit.kw;let kw=0;
 if(b.type==='watermill'){
  const site=watermillSite(g,b.x,b.z);
  if(site.wheel){const C=RIVER_CURRENT_RULES,kinetic=currentPowerKw(g,site.wheel.x,site.wheel.z),c=currentAt(g,site.wheel.x,site.wheel.z);
   const q=C.wheelWidthMetres*C.wheelImmersionMetres*Math.max(MILL_RULES.millraceSpeed,c?.speed??0),eff=site.wheelType==='overshot'?MILL_RULES.overshotEfficiency:site.wheelType==='breastshot'?MILL_RULES.breastshotEfficiency:0;
   const head=1000*9.81*q*site.headMetres*eff/1000;kw=Math.max(kinetic,head)*(MILL_RULES.waterWeather[weather]??1);}
 }else{
  const site=windmillSite(g,b.x,b.z);kw=Math.min(MILL_RULES.maxWindKw,site.powerIndex*MILL_RULES.windKwPerExposureMetre)*(MILL_RULES.windWeather[weather]??1);
 }
 kw=+kw.toFixed(3);cache.set(b as object,{key,kw});return kw;
}
/** Multiplier on ordinary work at this building (1 for every non-mill). */
export function millWorkRate(g:Game,b?:B|null):number{
 if(!b||!isMill(b.type))return 1;const kw=millPowerKw(g,b);if(kw<MILL_RULES.minKw)return 0;
 return Math.min(MILL_RULES.maxRate,kw/MILL_RULES.referenceKw);
}
export function millIssue(g:Game,b:B):string|null{
 if(!isMill(b.type))return null;if(millPowerKw(g,b)>=MILL_RULES.minKw)return null;
 return b.type==='watermill'?'The wheel has too little current or fall to grind':'There is too little wind at the sails to grind';
}
export function millSummary(g:Game,b:B){if(!isMill(b.type))return '';const kw=millPowerKw(g,b),r=millWorkRate(g,b);return r?`${kw.toFixed(1)} kW · grinds ${r.toFixed(1)}× a hand stone`:millIssue(g,b)!;}
