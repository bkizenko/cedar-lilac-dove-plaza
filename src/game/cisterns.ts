import type {Game} from './sim';
import type {Building} from './types';
import {cisternCatchment} from './waterWorks';

/** Finite fresh-water storage. A finished cistern holds `cisternLiters` (never more than its capacity).
 * Rain on its catchment fills it, carried water that overflows the household jars tops it up, residents
 * (and bread, curds ... via the household stock) draw it down, and in drought it slowly evaporates. */
export const CISTERN_RULES=Object.freeze({
 capacityLiters:8000,
 /** The seasonal runoff of the catchment arrives over this many seconds of rain. */
 rainSeasonSeconds:3600,
 /** The inlet and silt tank can only pass so much water. */
 intakeLitersPerSecond:8,
 stormFactor:1.5,
 evaporationPerSecond:1e-5,droughtEvaporationFactor:4,
 /** Household jars hold this many seconds of demand; cisterns refill them and take their surplus. */
 jarSeconds:600,surplusFactor:1.5,
});
const RAIN=new Set(['rain','storm','flood']);
/** Second tier: a larger lined tank. Same catchment rules; more room, built from three times the stone. */
export const GREAT_CISTERN_LITERS=24000;
export const isCistern=(b:Pick<Building,'type'>)=>b.type==='cistern'||b.type==='greatCistern';
export const cisternCapacity=(b:Pick<Building,'type'>)=>b.type==='greatCistern'?GREAT_CISTERN_LITERS:CISTERN_RULES.capacityLiters;
export function cisternsOf(g:Game,team:number){return g.state.buildings.filter(b=>isCistern(b)&&b.team===team&&b.hp>0&&g.finished(b));}
export const cisternStored=(b:Building)=>Math.max(0,Math.min(cisternCapacity(b),b.cisternLiters??0));
export function cisternTotals(g:Game,team:number){const cs=cisternsOf(g,team);return{count:cs.length,stored:cs.reduce((n,b)=>n+cisternStored(b),0),capacity:cs.reduce((n,b)=>n+cisternCapacity(b),0)};}
/** A water carrier fills its vessels at a cistern: takes up to `litres` from that one tank and returns what it got. */
export function drawFromCistern(b:Building,litres:number){const take=Math.max(0,Math.min(litres,cisternStored(b)));b.cisternLiters=cisternStored(b)-take;return take;}
/** The finished cistern of this society standing at a carrier's source point, if any. */
export function cisternAt(g:Game,team:number,x:number,z:number){return cisternsOf(g,team).find(b=>Math.hypot(b.x-x,b.z-z)<.6)??null;}
const catchCache=new WeakMap<Game,Map<string,number>>();
/** Seasonal runoff litres for this cistern's site (computed once, then remembered). */
export function cisternSeasonalLiters(g:Game,b:Building){
 let m=catchCache.get(g);if(!m)catchCache.set(g,m=new Map());const key=`${b.id}:${b.x}:${b.z}`;let v=m.get(key);
 if(v===undefined){v=cisternCatchment(g,b.x,b.z).seasonalLitres;m.set(key,v);}return v;
}
/** Litres per second currently entering one cistern. */
export function cisternInflow(g:Game,b:Building){
 if(!RAIN.has(g.state.weather))return 0;
 return Math.min(CISTERN_RULES.intakeLitersPerSecond,cisternSeasonalLiters(g,b)/CISTERN_RULES.rainSeasonSeconds)*(g.state.weather==='storm'?CISTERN_RULES.stormFactor:1);
}
/** Draw up to `litres` out of a society's cisterns (fullest first). Returns what was drawn. */
export function drawFromCisterns(g:Game,team:number,litres:number){
 let left=litres;for(const b of cisternsOf(g,team).sort((a,c)=>cisternStored(c)-cisternStored(a))){if(left<=0)break;const take=Math.min(left,cisternStored(b));b.cisternLiters=cisternStored(b)-take;left-=take;}
 return litres-left;
}
/** Pour carried water into cisterns (emptiest first). Returns what was stored. */
export function pourIntoCisterns(g:Game,team:number,litres:number){
 let left=litres;for(const b of cisternsOf(g,team).sort((a,c)=>cisternStored(a)-cisternStored(c))){if(left<=0)break;const put=Math.min(left,cisternCapacity(b)-cisternStored(b));b.cisternLiters=cisternStored(b)+put;left-=put;}
 return litres-left;
}
/** One second-step: rain in, evaporation out, then balance the household jars against the cisterns. */
export function tickCisterns(g:Game,team:number,stock:{waterLiters:number},demandPerSecond:number,dt:number){
 const cs=cisternsOf(g,team);if(!cs.length)return;const R=CISTERN_RULES,raining=RAIN.has(g.state.weather),evap=R.evaporationPerSecond*(g.state.weather==='drought'?R.droughtEvaporationFactor:1);
 for(const b of cs){const s=cisternStored(b);b.cisternLiters=Math.max(0,Math.min(cisternCapacity(b),s+(raining?cisternInflow(g,b)*dt:-s*evap*dt)));}
 const target=Math.max(1,demandPerSecond*R.jarSeconds);
 if(stock.waterLiters<target)stock.waterLiters+=drawFromCisterns(g,team,target-stock.waterLiters);
 else if(stock.waterLiters>target*R.surplusFactor)stock.waterLiters-=pourIntoCisterns(g,team,stock.waterLiters-target*R.surplusFactor);
}
export function validCisternState(s:{buildings:Building[]}):boolean{
 for(const b of s.buildings)if(b.cisternLiters!==undefined&&(!isCistern(b)||typeof b.cisternLiters!=='number'||!Number.isFinite(b.cisternLiters)||b.cisternLiters<0||b.cisternLiters>cisternCapacity(b)+1e-6))return false;
 return true;
}
