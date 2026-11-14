/** Blood-price (AUD-SOC-BLOOD-PRICE). A known house that holds a grudge against the player (a kinsman dead in custody, a claim pressed) may be paid off.
 * The price is real food taken from the player's pantry (takeFoodLot) and carried on foot by one real free adult (u.bloodPrice, riding the founding-journey slot),
 * so nothing teleports. On arrival the receiving house either accepts (goods enter its pantry, the grudge is cleared) or, if it is at war with the player,
 * refuses: the carrier walks the goods home (returned to the pantry) and the grudge deepens. A carrier who dies on the road loses the goods.
 * Behind rulersVersion; old saves have no u.bloodPrice and no new state is added beyond the unit field. */
import type {Game} from './sim';
import type {Unit,FoodKind} from './types';
import {rulersEnabled,grudgeOf,addGrudge,clearGrudge} from './rulersRuntime';
import {FOOD_KINDS,foodInventory,takeFoodLot,receiveFood} from './pantry';

import {isDependent} from './settlement';
import {lifeEvent} from './communities';
import {hallOf} from './refugees';

export const BLOOD_PRICE_RULES={perGrudge:24,min:4,hallReach:14,refusedDeepens:.1};
const busy=(u:Unit)=>!!(u.foundingJourney||u.envoy||u.scout||u.visit||u.expedition||u.trade||u.tributeJourney||u.recalled||u.emergency||u.prisoner||u.buildOrder||u.escortId!==undefined||u.societyMissionId||u.refugee||u.bloodPrice);

export const bloodPriceFor=(g:Game,to:number):number=>{const w=grudgeOf(g,to,0);return w>0?Math.max(BLOOD_PRICE_RULES.min,Math.ceil(w*BLOOD_PRICE_RULES.perGrudge)):0;};
export const carriersOf=(g:Game,to?:number):Unit[]=>g.state.units.filter(u=>u.hp>0&&u.bloodPrice&&(to===undefined||u.bloodPrice.to===to));

/** Player command 'pay-blood-price': load the price from the pantry onto one free adult and send them to the house's hall. */
export function payBloodPrice(g:Game,to:number):{ok:boolean;reason:string}{
 if(!rulersEnabled(g))return {ok:false,reason:'Houses do not trade blood for goods yet'};
 const price=bloodPriceFor(g,to);if(!price)return {ok:false,reason:'That house holds no grudge against yours'};
 if(carriersOf(g,to).length)return {ok:false,reason:'A bearer is already on the road with the price'};
 const dest=hallOf(g,to),mine=hallOf(g,0);if(!dest||!mine)return {ok:false,reason:'There is no hall to carry it to'};
 const lots=foodInventory(g.tribe(0));let have=0;for(const k of FOOD_KINDS)have+=lots[k];
 if(have+1e-9<price)return {ok:false,reason:`The price is ${price} measures of food and your stores hold only ${Math.floor(have)}`};
 const bearer=g.state.units.find(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!u.militia&&!isDependent(g,u)&&!busy(u)&&u.carry===0&&['idle','gather','hold'].includes(u.order));
 if(!bearer)return {ok:false,reason:'No free adult can carry it right now'};
 const load:Partial<Record<FoodKind,number>>={};let left=price;
 for(const k of FOOD_KINDS){const n=Math.min(left,lots[k]);if(n>0&&takeFoodLot(g,0,k,n)){load[k]=n;left-=n;}if(left<1e-8)break;}
 g.interruptMission(bearer);
 bearer.bloodPrice={to,phase:'going',lots:load};bearer.foundingJourney={x:dest.x,z:dest.z,leader:true};
 bearer.order='move';bearer.tx=dest.x;bearer.tz=dest.z;bearer.stuckT=0;bearer.workReason='Carrying the blood-price';
 lifeEvent(g,0,`${bearer.name??'A bearer'} sets out with ${price} measures of food as blood-price for ${g.tribe(to).name}`,bearer.x,bearer.z);
 return {ok:true,reason:`A bearer walks to ${g.tribe(to).name} with ${price} measures of food`};
}

/** Per-unit step, called from foundingJourneyAI. Returns true when it handled the unit. */
export function bloodPriceAI(g:Game,u:Unit,dt:number):boolean{
 const b=u.bloodPrice;if(!b)return false;
 const give=(team:number)=>{for(const k of Object.keys(b.lots) as FoodKind[])if(b.lots[k]!>0)receiveFood(g,team,b.lots[k]!,k);b.lots={};};
 if(u.team!==0){u.bloodPrice=undefined;u.foundingJourney=undefined;return true;}
 const home=hallOf(g,0),dest=hallOf(g,b.to);
 if(b.phase==='going'){
  if(!dest||u.stuckT>16){b.phase='home';return true;}
  if(Math.hypot(u.x-dest.x,u.z-dest.z)>BLOOD_PRICE_RULES.hallReach){u.tx=dest.x;u.tz=dest.z;u.workReason='Carrying the blood-price';g.steer(u,dt);return true;}
  if(g.isFoe(0,b.to)){addGrudge(g,b.to,0,BLOOD_PRICE_RULES.refusedDeepens,'custody');b.phase='home';lifeEvent(g,0,`${g.tribe(b.to).name} refuses the blood-price at the hall; the bearer turns for home with it`,u.x,u.z);return true;}
  give(b.to);clearGrudge(g,b.to,0);b.phase='home';lifeEvent(g,0,`${g.tribe(b.to).name} takes the blood-price; their house lays the grudge down`,u.x,u.z);return true;
 }
 if(!home||Math.hypot(u.x-home.x,u.z-home.z)<=10){give(0);u.bloodPrice=undefined;u.foundingJourney=undefined;u.order='idle';u.workReason='Back from the blood-price road';return true;}
 u.tx=home.x;u.tz=home.z;u.workReason='Walking home';g.steer(u,dt);return true;
}
