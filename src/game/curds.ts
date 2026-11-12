import type {PotteryOrigin} from './pottery';
import type {DairyRecovery} from './dairy';
/** Gameplay nourishment units, held-tool counts and simulation seconds.
 * Cloth drainage of cultured milk is a practical analogy, not a dated recipe:
 * https://www.fao.org/4/t0251e/T0251E14.htm
 * No rennet, salt, refrigeration or extra food value is implied. */
export const CURD_RULES={version:1,fermentedMilk:3,vessels:2,cloth:1,preparationSeconds:20,drainSeconds:90,washSeconds:10,waterLiters:4,freshCurd:1,whey:1,curdNourishment:2,wheyNourishment:1,rawLifetimeSeconds:480,finishedLifetimeSeconds:1200,curdSpoilPerSecond:.0003,wheySpoilPerSecond:.0008,maximumCelsius:38,hotLossSeconds:45,wetLossSeconds:120} as const;
export type CurdFoodLots={freshCurd:number;whey:number};
export type CurdBatch={version:1;recovery?:DairyRecovery;vesselCount:2;clothUnits:1;vesselOrigins:[PotteryOrigin|null,PotteryOrigin|null];drainSeconds:number;elapsedSeconds:number;wetSeconds:number;hotSeconds:number;washSeconds:number;temperatureCelsius:number;foodReadyAt?:number;foodLots?:CurdFoodLots};
export function newCurdBatch(origins:readonly(PotteryOrigin|null)[]):CurdBatch{
 if(origins.length!==CURD_RULES.vessels)throw Error('A curd batch must reserve its two actual vessel records');
 return {version:1,vesselCount:2,clothUnits:1,vesselOrigins:origins.map(o=>o?{...o}:null) as CurdBatch['vesselOrigins'],drainSeconds:0,elapsedSeconds:0,wetSeconds:0,hotSeconds:0,washSeconds:0,temperatureCelsius:0};
}
/** Caller supplies actual workplace climate. Only a loaded physical batch drains. */
export function advanceCurdDrain(b:CurdBatch,dt:number,now:number,temperatureCelsius:number,wet:boolean){
 const seconds=Math.max(0,dt);b.elapsedSeconds+=seconds;b.temperatureCelsius=temperatureCelsius;
 if(wet)b.wetSeconds+=seconds;if(temperatureCelsius>CURD_RULES.maximumCelsius)b.hotSeconds+=seconds;
 const frozen=temperatureCelsius<=0,overheated=temperatureCelsius>CURD_RULES.maximumCelsius;
 if(!wet&&!frozen&&!overheated)b.drainSeconds=Math.min(CURD_RULES.drainSeconds,b.drainSeconds+seconds);
 const lost=b.wetSeconds>=CURD_RULES.wetLossSeconds||b.hotSeconds>=CURD_RULES.hotLossSeconds;
 if(!lost&&b.drainSeconds>=CURD_RULES.drainSeconds&&b.foodReadyAt===undefined){b.foodReadyAt=now;b.foodLots={freshCurd:CURD_RULES.freshCurd,whey:CURD_RULES.whey};}
 return {ready:b.foodReadyAt!==undefined,lost,reason:wet?'Rain holds the loaded cloth strainer; prolonged wet exposure spoils the batch':frozen?'Frozen: physical drainage waits while the paid milk still ages':overheated?'Cultured milk is overheating; prolonged heat spoils the batch':`Draining cultured curd · ${Math.floor(b.drainSeconds/CURD_RULES.drainSeconds*100)}% · two vessels and one cloth held`};
}
export function curdNourishment(lots:CurdFoodLots){return lots.freshCurd*CURD_RULES.curdNourishment+lots.whey*CURD_RULES.wheyNourishment;}
/** Separate finite lots keep separate losses; discarded whey cannot feed the curd lot. */
export function spoilCurdFoods(b:CurdBatch,dt:number,climateMultiplier:number):CurdFoodLots{
 const lost={freshCurd:0,whey:0};if(!b.foodLots)return lost;
 const seconds=Math.max(0,dt),climate=Math.max(0,climateMultiplier);
 for(const [kind,rate] of [['freshCurd',CURD_RULES.curdSpoilPerSecond],['whey',CURD_RULES.wheySpoilPerSecond]] as const){lost[kind]=b.foodLots[kind]*Math.min(1,seconds*rate*climate);b.foodLots[kind]=Math.max(0,b.foodLots[kind]-lost[kind]);}
 return lost;
}
export function validCurdBatch(b:CurdBatch,now:number,started:number,validOrigin:(o:PotteryOrigin)=>boolean,validRecovery:(r:DairyRecovery)=>boolean=()=>false){
 if(b?.recovery!==undefined&&(!validRecovery(b.recovery)||b.recovery.failedAt<started||b.recovery.failedAt>now))return false;
 const num=(n:unknown,max=1e9)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
 if(!b||b.version!==1||b.vesselCount!==2||b.clothUnits!==1||!Array.isArray(b.vesselOrigins)||b.vesselOrigins.length!==2||b.vesselOrigins.some(o=>o!==null&&!validOrigin(o)))return false;
 if(!num(b.drainSeconds,CURD_RULES.drainSeconds)||!num(b.elapsedSeconds,Math.max(0,now-started)+1e-5)||!num(b.wetSeconds,b.elapsedSeconds)||!num(b.hotSeconds,b.elapsedSeconds)||b.drainSeconds>b.elapsedSeconds+1e-5||!num(b.washSeconds,CURD_RULES.washSeconds)||!Number.isFinite(b.temperatureCelsius)||b.temperatureCelsius< -200||b.temperatureCelsius>100)return false;
 if(b.foodReadyAt===undefined)return b.foodLots===undefined&&b.washSeconds===0;
 return num(b.foodReadyAt,now)&&b.foodReadyAt>=started&&b.drainSeconds===CURD_RULES.drainSeconds&&!!b.foodLots&&typeof b.foodLots==='object'&&!Array.isArray(b.foodLots)&&Object.keys(b.foodLots).every(k=>k==='freshCurd'||k==='whey')&&num(b.foodLots.freshCurd,CURD_RULES.freshCurd)&&num(b.foodLots.whey,CURD_RULES.whey)&&curdNourishment(b.foodLots)<=CURD_RULES.fermentedMilk+1e-9;
}
