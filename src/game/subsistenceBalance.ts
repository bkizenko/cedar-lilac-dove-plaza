import type {Game} from './sim';
import type {ResKind} from './types';
import {GATHER,GATHER_WORK_RATE} from './constants';
import {ecologicalConditionsAt} from './ecologicalProvinces';
import {foodDemand} from './settlement';
import {difficulty} from './difficulty';
/** Labor-time factors, not resource-density or food-need changes. One unit of
 * output still leaves a real patch/tree/carcass and must be carried home. */
export const SUBSISTENCE_RULES=Object.freeze({version:1,foodLaborMultiplier:4.5,timberLaborMultiplier:4,
 comfortableMinimumCelsius:8,comfortableMaximumCelsius:28,coldLaborPerCelsius:.04,heatLaborPerCelsius:.025,
 maximumColdLaborAddition:.75,maximumHeatLaborAddition:.45,maximumExposureMultiplier:2.5,
 elevationCoolingCelsiusPerMeter:.18,temperatureCacheSeconds:1,
 wetWeatherMultipliers:{clear:1,mist:1.04,rain:1.12,storm:1.35,frost:1.05,golden:1,flood:1.22,drought:1.02}} as const);
const temperatures=new WeakMap<Game,{world:Game['world'];bucket:number;weather:string;temperature:number}>();
function displayedTemperature(g:Game){
 const bucket=Math.floor(g.state.time/SUBSISTENCE_RULES.temperatureCacheSeconds),old=temperatures.get(g);
 if(old?.world===g.world&&old.bucket===bucket&&old.weather===g.state.weather)return old.temperature;
 const match=g.clockState().weather?.match(/(-?\d+(?:\.\d+)?)°C/),temperature=match?Number(match[1]):12;
 temperatures.set(g,{world:g.world,bucket,weather:g.state.weather,temperature});return temperature;
}
export function outdoorWorkConditions(g:Game,x:number,z:number){
 const r=SUBSISTENCE_RULES,ambient=displayedTemperature(g),provinceOffset=g.world.ecology?ecologicalConditionsAt(g.world.ecology,x,z).temperatureOffsetCelsius:0;
 const temperature=ambient+provinceOffset-Math.max(0,g.height(x,z)-4)*r.elevationCoolingCelsiusPerMeter;
 const cold=Math.min(r.maximumColdLaborAddition,Math.max(0,r.comfortableMinimumCelsius-temperature)*r.coldLaborPerCelsius);
 const heat=Math.min(r.maximumHeatLaborAddition,Math.max(0,temperature-r.comfortableMaximumCelsius)*r.heatLaborPerCelsius);
 const wet=r.wetWeatherMultipliers[g.state.weather]??1,exposureMultiplier=Math.min(r.maximumExposureMultiplier,(1+cold+heat)*wet);
 return{ambientTemperatureCelsius:ambient,localTemperatureCelsius:temperature,coldLaborAddition:cold,heatLaborAddition:heat,wetWeatherMultiplier:wet,exposureMultiplier,
  minimumProductivityFraction:1/r.maximumExposureMultiplier};
}
export function subsistenceLaborMultiplier(g:Game,kind:ResKind,x:number,z:number):number{
 if(kind!=='food'&&kind!=='wood')return 1;
 return(kind==='food'?SUBSISTENCE_RULES.foodLaborMultiplier:SUBSISTENCE_RULES.timberLaborMultiplier)*outdoorWorkConditions(g,x,z).exposureMultiplier;
}
/** This hook is for carcass processing only. Hunting attack/combat cadence,
 * weapon damage, animal density and finite carcass yields remain separate. */
export function butcheryLaborMultiplier(g:Game,x:number,z:number){return subsistenceLaborMultiplier(g,'food',x,z);}
export function subsistenceWorkReport(g:Game,kind:ResKind,x:number,z:number){
 const laborMultiplier=subsistenceLaborMultiplier(g,kind,x,z),period=GATHER[kind].period/GATHER_WORK_RATE*laborMultiplier;
 return{resource:kind,difficulty:difficulty(g).name,foodDemandPerMinute:foodDemand(g)*60,laborMultiplier,
  baseWorkSecondsPerUnitBeforeTravel:period,theoreticalUnitsPerMinuteBeforeTravel:60/period,
  conditions:outdoorWorkConditions(g,x,z),rules:SUBSISTENCE_RULES,
  limitations:'Actual delivery also depends on patch maturity, finite stock, habitat, workplace bonuses, urgency, carrying capacity, interruptions and travel. Farms and livestock have separate work rules.'};
}
