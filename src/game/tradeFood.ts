import type {Game} from './sim';
import type {Unit,FoodKind} from './types';
import {FOOD_KINDS,foodInventory,takeFoodLot,receiveFood} from './pantry';
/** Refines the existing carry facade, exactly like pantry foodLots. Never extra goods. */
export type CarriedFoodLots=Partial<Record<FoodKind,number>>;
export const TRADE_FOOD_RULES={maximumUnits:200,tolerance:1e-7} as const;
const sum=(v:CarriedFoodLots)=>FOOD_KINDS.reduce((n,k)=>n+(v[k]||0),0);
export function validFoodLots(v:unknown,amount:number){
 if(!v||typeof v!=='object'||Array.isArray(v)||!Number.isFinite(amount)||amount<0||amount>TRADE_FOOD_RULES.maximumUnits)return false;
 const lots=v as CarriedFoodLots;if(Object.keys(lots).some(k=>!FOOD_KINDS.includes(k as FoodKind)||typeof lots[k as FoodKind]!=='number'||!Number.isFinite(lots[k as FoodKind])||lots[k as FoodKind]!<=0))return false;
 return Math.abs(sum(lots)-amount)<=TRADE_FOOD_RULES.tolerance;
}
export function validCarriedFood(u:Unit){return u.carryFoodLots===undefined||u.carryType==='food'&&u.carry>0&&validFoodLots(u.carryFoodLots,u.carry)&&(u.carryFood===undefined||Object.keys(u.carryFoodLots).length===1&&(u.carryFoodLots[u.carryFood]||0)>0);}
export function planFoodWithdrawal(g:Game,team:number,amount:number):CarriedFoodLots|null{
 if(!Number.isFinite(amount)||amount<=0||amount>TRADE_FOOD_RULES.maximumUnits)return null;
 const stock=foodInventory(g.tribe(team)),lots:CarriedFoodLots={};let need=amount;
 for(const k of FOOD_KINDS){const n=Math.min(stock[k],need);if(n>0){lots[k]=n;need-=n;}if(need<1e-9)break;}
 return need<=1e-9?lots:null;
}
/** Preflight every kind before making one synchronous exact withdrawal. */
export function commitFoodWithdrawal(g:Game,team:number,lots:CarriedFoodLots){
 const amount=sum(lots);if(!validFoodLots(lots,amount))return false;const stock=foodInventory(g.tribe(team));
 if(FOOD_KINDS.some(k=>(lots[k]||0)>stock[k]+1e-9))return false;
 for(const k of FOOD_KINDS)if(lots[k])takeFoodLot(g,team,k,lots[k]!);return true;
}
export function receiveFoodLots(g:Game,team:number,lots:CarriedFoodLots){for(const k of FOOD_KINDS)if(lots[k])receiveFood(g,team,lots[k]!,k);}
export function setCarriedFood(u:Unit,lots:CarriedFoodLots){u.carryFoodLots={...lots};u.carry=sum(lots);u.carryType='food';const kinds=FOOD_KINDS.filter(k=>(lots[k]||0)>0);u.carryFood=kinds.length===1?kinds[0]:undefined;}
export function carriedFoodLots(u:Unit):CarriedFoodLots{return u.carryFoodLots?{...u.carryFoodLots}:u.carryType==='food'&&u.carry>0?{[u.carryFood||'provisions']:u.carry}:{};}
/** Existing absent metadata stays a legacy single-kind load. Partial consumers
 * preserve the exact remainder; no nourishment is converted into physical units. */
export function withdrawCarriedFood(u:Unit,amount:number,kind?:FoodKind):CarriedFoodLots|null{
 if(u.carryType!=='food'||!Number.isFinite(amount)||amount<0||amount>u.carry+1e-9||!validCarriedFood(u))return null;
 const remainder=carriedFoodLots(u),taken:CarriedFoodLots={};let need=amount;
 for(const k of FOOD_KINDS){if(kind!==undefined&&k!==kind)continue;const n=Math.min(remainder[k]||0,need);if(n>0){taken[k]=n;remainder[k]!-=n;if(remainder[k]!<1e-9)delete remainder[k];need-=n;}if(need<1e-9)break;}
 if(need>1e-8)return null;
 const typed=u.carryFoodLots!==undefined;u.carry=Math.max(0,u.carry-amount);
 if(u.carry<1e-9){u.carry=0;u.carryType=null;delete u.carryFood;delete u.carryFoodLots;}
 else if(typed)setCarriedFood(u,remainder);
 return taken;
}
/** Normal full delivery seam keeps the scalar until the caller records delivery/clears it. */
export function receiveCarriedFood(g:Game,team:number,u:Unit){receiveFoodLots(g,team,carriedFoodLots(u));delete u.carryFoodLots;}
