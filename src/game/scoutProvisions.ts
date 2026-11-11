import type {Game} from './sim';
import type {Unit} from './types';
import {FOOD_PER_PERSON_SECOND,foodDemand} from './settlement';
import {predisposition} from './people';
import {receiveFood} from './pantry';
import {supplyDrops,supplyApproach,supplyReached} from './campAnchor';
import {recordCoastalReview} from './coastalStrategy';
export const SCOUT_PROVISION_RULES={budgetSeconds:600,homeMealSeconds:450,homeWaterSeconds:180,returnReserveSeconds:90,minimumReturnSeconds:120,waterLitersPerSecond:.008,departureHealthFraction:.6,departureMaximumThirstSeconds:60} as const;
export type ScoutProvisions={version:1;food:number;water:number;foodUsed:number;waterUsed:number;started:number};
export const scoutIndependentNeeds=(u:Unit)=>!!u.scoutProvisions;
const rate=(u:Unit)=>FOOD_PER_PERSON_SECOND*predisposition(u).appetite;
export function loadScoutProvisions(g:Game,u:Unit,budget?:{budgetSeconds:number;homeMealSeconds:number;homeWaterSeconds:number}){
 if(budget&&(![budget.budgetSeconds,budget.homeMealSeconds,budget.homeWaterSeconds].every(n=>Number.isFinite(n)&&n>0&&n<=600)))return false;
 if(u.scoutProvisions)return true;
 if(!supplyDrops(g,u.team).some(d=>{const p=supplyApproach(g,u,d);return p&&supplyReached(g,u,d,p);} ))return false;
 const rules={...SCOUT_PROVISION_RULES,...budget},t=g.tribe(u.team),food=rate(u)*rules.budgetSeconds,water=g.state.survivalVersion===1?rules.waterLitersPerSecond*rules.budgetSeconds:0;
 const others=g.state.units.filter(p=>p.team===u.team&&p.hp>0&&p.id!==u.id&&!p.expedition&&!p.visit&&!scoutIndependentNeeds(p)).length;
 if(t.food-food<foodDemand(g,u.team)*rules.homeMealSeconds||g.state.survivalVersion===1&&(t.survival?.waterLiters||0)-water<others*rules.waterLitersPerSecond*rules.homeWaterSeconds){recordCoastalReview(g,u.team,'scout-loading','Collect actual scouting provisions while retaining home meals and water');return false;}
 g.spend(u.team,{food});if(t.survival)t.survival.waterLiters-=water;
 u.scoutProvisions={version:1,food,water,foodUsed:0,waterUsed:0,started:g.state.time};recordCoastalReview(g,u.team,'scout-pack-loaded');return true;
}
export function scoutReturnBudgetLow(g:Game,u:Unit){const p=u.scoutProvisions;if(!p)return false;const home=g.campOf(u.team),seconds=Math.max(SCOUT_PROVISION_RULES.minimumReturnSeconds,Math.hypot(u.x-home.x,u.z-home.z)/Math.max(1,u.speed*.6)+SCOUT_PROVISION_RULES.returnReserveSeconds);return p.food/rate(u)<=seconds||g.state.survivalVersion===1&&p.water/SCOUT_PROVISION_RULES.waterLitersPerSecond<=seconds||u.hp<u.maxHp*.6;}
/** A retained pack survives interruption. It is refunded only at an actual own
 * supply approach, or transferred/lost with the actual captured/dead body. */
export function tickScoutProvisions(g:Game,dt:number){for(const u of g.state.units){const p=u.scoutProvisions;if(!p)continue;const stock=g.tribe(u.team).survival;
 // A dead sea-exploration crewmate's pack is reconciled aboard by its voyage.
 if(u.seaExplorationId!==undefined&&u.hp<=0)continue;
 if(u.hp<=0||u.prisoner){if(u.prisoner){const food=Math.min(p.food,Math.max(0,12-u.prisoner.food)),water=Math.min(p.water,Math.max(0,4-u.prisoner.waterLiters));u.prisoner.food+=food;u.prisoner.waterLiters+=water;p.food-=food;p.water-=water;}if(stock)stock.waterLostLiters+=p.water;u.scoutProvisions=undefined;continue;}
 const need=rate(u)*dt,waterNeed=g.state.survivalVersion===1?SCOUT_PROVISION_RULES.waterLitersPerSecond*dt:0,food=Math.min(p.food,need),water=Math.min(p.water,waterNeed);p.food-=food;p.water-=water;p.foodUsed+=food;p.waterUsed+=water;if(u.campTrip){u.campTrip.foodUsed=p.foodUsed;u.campTrip.waterUsed=p.waterUsed;}if(stock)stock.waterConsumedLiters+=water;
 const hunger=u.hunger||0,thirst=u.thirstSeconds||0;u.hunger=Math.max(0,hunger+(food+1e-8<need?dt:-dt*3));u.thirstSeconds=Math.max(0,thirst+(water+1e-8<waterNeed?dt:-dt*3));u.hp=Math.max(0,u.hp-Math.max(0,Math.max(0,u.hunger-60)-Math.max(0,hunger-60))*u.maxHp*predisposition(u).appetite/160-Math.max(0,Math.max(0,u.thirstSeconds-180)-Math.max(0,thirst-180))*u.maxHp/1800);
 if(u.scout&&!u.scout.returning||u.campTrip||u.seaExplorationId!==undefined)continue;
 returnScoutPackAtCache(g,u);
}}
export function validScoutProvisions(p:unknown,time:number){if(!p||typeof p!=='object')return false;const row=p as ScoutProvisions;return row.version===1&&['food','water','foodUsed','waterUsed','started'].every(k=>typeof row[k as keyof ScoutProvisions]==='number'&&Number.isFinite(row[k as keyof ScoutProvisions])&&row[k as keyof ScoutProvisions]>=0)&&row.food+row.foodUsed<=100&&row.water+row.waterUsed<=20&&row.started<=time;}

/** Refund only a living carrier physically at an actually owned supply entrance. */
export function returnScoutPackAtCache(g:Game,u:Unit){const p=u.scoutProvisions;if(!p)return true;if(u.hp<=0||u.prisoner||!supplyDrops(g,u.team).some(d=>{const point=supplyApproach(g,u,d);return point&&supplyReached(g,u,d,point);}))return false;receiveFood(g,u.team,p.food);const stock=g.tribe(u.team).survival;if(stock)stock.waterLiters+=p.water;delete u.scoutProvisions;recordCoastalReview(g,u.team,'scout-pack-returned');return true;}
