import type {Game} from './sim';
import type {FoodKind,GameState,Unit} from './types';
import type {PackedFoodOrigin} from './packedFoodCustody';
import {herdRules} from './animalSpecies';
import {PACK_ANIMAL_RULES} from './packAnimalState';
import {CARRIED_LOAD_RULES} from './carriedLoad';
import {FOOD_PER_PERSON_SECOND,foodDemand} from './settlement';
import {predisposition} from './people';
import {foodInventory,readyFoodStock,FOOD_NOURISHMENT,takeFoodLot} from './pantry';
import {supplyDrops,supplyApproach,supplyReached} from './campAnchor';
import {dropFoodUnits} from './stolenCargo';

export const PACK_JOURNEY_CARE_RULES={maximumFoodUnits:100,maximumWaterLiters:20,homeMealSeconds:90,homeWaterSeconds:180,homeWaterRate:.008,tolerance:1e-6} as const;
export const PACK_JOURNEY_FEED_KINDS=['grain','pulses','tubers','berries','provisions'] as const;
export type PackJourneySupplies={version:1;animalId:number;origin:PackedFoodOrigin;feed:Partial<Record<FoodKind,number>>;feedLoaded:number;feedUsed:number;feedDropped?:number;waterLiters:number;waterLoaded:number;waterUsed:number;waterLost?:number};
export type PackJourneyCareQuote={reservedUnits:number;maximumHumanUnits:number;stockAfterCare:Record<FoodKind,number>;packet?:PackJourneySupplies;existing?:true};
const feedHeld=(p:PackJourneySupplies)=>PACK_JOURNEY_FEED_KINDS.reduce((n,k)=>n+(p.feed[k]||0),0);
function cache(g:Game,u:Unit){return supplyDrops(g,u.team).find(d=>{const p=supplyApproach(g,u,d);return p&&supplyReached(g,u,d,p);});}
function origin(g:Game,u:Unit):PackedFoodOrigin|null{const d=cache(g,u);return d?{team:u.team,anchorKind:d.kind==='camp'?'camp':'building',...(d.kind==='camp'?{}:{buildingId:d.id}),x:d.x,z:d.z,loadedAt:g.state.time}:null;}
const weight=(food:number,water:number)=>food+water*CARRIED_LOAD_RULES.provisionFood/CARRIED_LOAD_RULES.waterLiters;

/** Quote the SAME animal's finite road supplies, reserving space before human
 * provisions. No remote pantry access, new animal, or extra carrying bonus. */
export function quotePackJourneyCare(g:Game,u:Unit,totalFoodUnitBudget:number):PackJourneyCareQuote|null{
 const stock=foodInventory(g.tribe(u.team)),a=u.packAnimal,prior=u.packJourneySupplies;
 if(!Number.isFinite(totalFoodUnitBudget)||totalFoodUnitBudget<0||totalFoodUnitBudget>100)return null;
 if(prior){
  if(u.haulage!=='pack'||!a||a.hp<=0||prior.animalId!==a.id)return null;
  const reservedUnits=weight(feedHeld(prior),prior.waterLiters);
  return {reservedUnits,maximumHumanUnits:Math.max(0,totalFoodUnitBudget-reservedUnits),stockAfterCare:stock,packet:prior,existing:true};
 }
 if(u.haulage!=='pack'||!a||a.hp<=0)return {reservedUnits:0,maximumHumanUnits:totalFoodUnitBudget,stockAfterCare:stock};
 const at=origin(g,u);if(!at)return null;
 const rules=herdRules(a.species),humanRate=FOOD_PER_PERSON_SECOND*predisposition(u).appetite,feedRate=PACK_ANIMAL_RULES.feedPerSecond*rules.careMultiplier;
 const waterRate=g.state.survivalVersion===1?PACK_ANIMAL_RULES.waterPerSecond*rules.careMultiplier:0;
 const homeWater=g.state.units.filter(v=>v.team===u.team&&v.hp>0&&v.id!==u.id&&!v.prisoner&&!v.expedition&&!v.scoutProvisions).length*PACK_JOURNEY_CARE_RULES.homeWaterRate*PACK_JOURNEY_CARE_RULES.homeWaterSeconds;
 const availableWater=Math.max(0,(g.tribe(u.team).survival?.waterLiters||0)-homeWater);
 // Preserve home meals even when there is no grain and an animal must use
 // the same delivered plant provisions as people.
 let readyBudget=Math.max(0,readyFoodStock(g.tribe(u.team)).nourishment-foodDemand(g,u.team)*PACK_JOURNEY_CARE_RULES.homeMealSeconds);
 const available:Partial<Record<FoodKind,number>>={};
 for(const kind of PACK_JOURNEY_FEED_KINDS){const factor=FOOD_NOURISHMENT[kind]??1,n=kind==='grain'?stock[kind]:Math.min(stock[kind],readyBudget/factor);available[kind]=n;if(kind!=='grain')readyBudget-=n*factor;}
 const feedAvailable=PACK_JOURNEY_FEED_KINDS.reduce((n,k)=>n+(available[k]||0),0);
 const seconds=Math.min(totalFoodUnitBudget/(humanRate+feedRate+weight(0,waterRate)),feedAvailable/feedRate,waterRate?Math.min(availableWater,PACK_JOURNEY_CARE_RULES.maximumWaterLiters)/waterRate:Infinity);
 if(!Number.isFinite(seconds)||seconds*humanRate<6)return null;
 const feed:Partial<Record<FoodKind,number>>={},stockAfterCare={...stock};let need=seconds*feedRate;
 for(const kind of PACK_JOURNEY_FEED_KINDS){const n=Math.min(available[kind]||0,need);if(n>0){feed[kind]=n;stockAfterCare[kind]-=n;need-=n;}}
 const feedLoaded=seconds*feedRate,waterLoaded=seconds*waterRate;
 return {reservedUnits:weight(feedLoaded,waterLoaded),maximumHumanUnits:seconds*humanRate,stockAfterCare,packet:{version:1,animalId:a.id,origin:at,feed,feedLoaded,feedUsed:0,waterLiters:waterLoaded,waterLoaded,waterUsed:0}};
}

/** Called synchronously after the parent has preflighted its human lots too. */
export function commitPackJourneyCare(g:Game,u:Unit,q:PackJourneyCareQuote){
 if(!q.packet)return true;if(q.existing)return u.packJourneySupplies===q.packet;
 const p=q.packet,at=origin(g,u),a=u.packAnimal,stock=foodInventory(g.tribe(u.team));
 if(u.packJourneySupplies||u.haulage!=='pack'||!a||a.hp<=0||a.id!==p.animalId||!at||JSON.stringify(at)!==JSON.stringify(p.origin)||p.origin.loadedAt!==g.state.time)return false;
 if(PACK_JOURNEY_FEED_KINDS.some(k=>(stock[k]||0)+1e-8<(p.feed[k]||0))||(g.tribe(u.team).survival?.waterLiters||0)+1e-8<p.waterLiters)return false;
 for(const kind of PACK_JOURNEY_FEED_KINDS)if((p.feed[kind]||0)>0)takeFoodLot(g,u.team,kind,p.feed[kind]!);
 if(g.tribe(u.team).survival)g.tribe(u.team).survival!.waterLiters-=p.waterLiters;
 u.packJourneySupplies={...p,origin:{...p.origin},feed:{...p.feed}};return true;
}

/** The handler owns these goods on the road; communal stores are never read. */
export function consumePackJourneyCare(g:Game,u:Unit,dt:number){
 const p=u.packJourneySupplies,a=u.packAnimal;if(!p||!a||a.hp<=0||u.haulage!=='pack'||p.animalId!==a.id||u.hp<=0||u.prisoner||!(dt>0))return false;
 const rules=herdRules(a.species),need=PACK_ANIMAL_RULES.feedPerSecond*dt*rules.careMultiplier;let fed=0;
 if((a.hunger||0)>0)for(const kind of PACK_JOURNEY_FEED_KINDS){const n=Math.min(p.feed[kind]||0,need-fed);if(n>0){p.feed[kind]=Math.max(0,p.feed[kind]!-n);fed+=n;}if(fed>=need-1e-10)break;}
 p.feedUsed+=fed;a.foodConsumed=(a.foodConsumed||0)+fed;
 if(fed>0)a.hunger=Math.max(0,(a.hunger||0)-(PACK_ANIMAL_RULES.hungerPerSecond+.3)*dt*Math.min(1,fed/need));
 if(g.state.survivalVersion===1){const demand=PACK_ANIMAL_RULES.waterPerSecond*dt*rules.careMultiplier,n=Math.min(p.waterLiters,demand);p.waterLiters=Math.max(0,p.waterLiters-n);p.waterUsed+=n;a.waterConsumedLiters=(a.waterConsumedLiters||0)+n;a.thirstSeconds=Math.max(0,(a.thirstSeconds||0)-2*dt*n/demand);const s=g.tribe(u.team).survival;if(s)s.waterConsumedLiters+=n;}
 return true;
}

/** Turn back with enough remaining animal food/water for the real trip home. */
export function packJourneyReturnBudgetLow(g:Game,u:Unit,secondsHome:number){
 const p=u.packJourneySupplies,a=u.packAnimal;if(!p||!a||a.id!==p.animalId||a.hp<=0)return false;
 const seconds=Math.max(0,secondsHome)+90,care=herdRules(a.species).careMultiplier;
 return feedHeld(p)+1e-8<PACK_ANIMAL_RULES.feedPerSecond*care*seconds||g.state.survivalVersion===1&&p.waterLiters+1e-8<PACK_ANIMAL_RULES.waterPerSecond*care*seconds;
}

export function returnPackJourneyCare(g:Game,u:Unit){
 const p=u.packJourneySupplies;if(!p)return true;if(u.hp<=0||u.prisoner||!cache(g,u)||p.waterLiters>0&&!g.tribe(u.team).survival)return false;
 const t=g.tribe(u.team),lots=foodInventory(t);let returned=0;
 for(const kind of PACK_JOURNEY_FEED_KINDS){const n=p.feed[kind]||0;lots[kind]+=n;returned+=n;}t.food+=returned;t.foodLots=lots;
 const s=g.tribe(u.team).survival;if(s)s.waterLiters+=p.waterLiters;
 delete u.packJourneySupplies;return true;
}

/** Parcel caps retain the exact remaining food on the dead body for retry.
 * Water has the same explicit wilderness-loss accounting as scouting packs. */
export function reconcilePackJourneyCare(g:Game,u:Unit){
 const p=u.packJourneySupplies;if(!p)return;
 if(u.hp<=0){for(const kind of PACK_JOURNEY_FEED_KINDS){const n=p.feed[kind]||0;if(n<=0)continue;const moved=dropFoodUnits(g,u,kind,n,p.origin.team);p.feed[kind]=Math.max(0,n-moved);p.feedDropped=(p.feedDropped||0)+moved;}if(p.waterLiters>0){const s=g.tribe(u.team).survival;if(s)s.waterLostLiters+=p.waterLiters;p.waterLost=(p.waterLost||0)+p.waterLiters;p.waterLiters=0;}if(feedHeld(p)<1e-10)delete u.packJourneySupplies;return;}
 if(!u.expedition&&!u.scout&&!u.visit&&!u.trade&&!u.envoy&&!u.boat)returnPackJourneyCare(g,u);
}

export function validPackJourneySupplies(s:GameState){
 const finite=(v:unknown,max:number):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;
 for(const u of s.units){const p=u.packJourneySupplies;if(p===undefined)continue;
  if(!p||typeof p!=='object'||Array.isArray(p)||Object.keys(p).some(k=>!['version','animalId','origin','feed','feedLoaded','feedUsed','feedDropped','waterLiters','waterLoaded','waterUsed','waterLost'].includes(k))||p.version!==1||!Number.isSafeInteger(p.animalId)||p.animalId<1||p.animalId>=s.nextId||!p.feed||typeof p.feed!=='object'||Array.isArray(p.feed)||Object.keys(p.feed).some(k=>!PACK_JOURNEY_FEED_KINDS.includes(k as typeof PACK_JOURNEY_FEED_KINDS[number])))return false;
  if(weight(p.feedLoaded,p.waterLoaded)>100+PACK_JOURNEY_CARE_RULES.tolerance)return false;
  if(Object.values(p.feed).some(n=>!finite(n,100))||![p.feedLoaded,p.feedUsed,p.feedDropped??0].every(n=>finite(n,100))||![p.waterLiters,p.waterLoaded,p.waterUsed,p.waterLost??0].every(n=>finite(n,20)))return false;
  if(Math.abs(feedHeld(p)+p.feedUsed+(p.feedDropped||0)-p.feedLoaded)>PACK_JOURNEY_CARE_RULES.tolerance||Math.abs(p.waterLiters+p.waterUsed+(p.waterLost||0)-p.waterLoaded)>PACK_JOURNEY_CARE_RULES.tolerance)return false;
  const o=p.origin,half=(s.worldOptions?.size||1040)/2;if(!o||Object.keys(o).some(k=>!['team','anchorKind','buildingId','x','z','loadedAt'].includes(k))||!s.tribes.some(t=>t.id===o.team)||!['camp','building'].includes(o.anchorKind)||![o.x,o.z].every(n=>Number.isFinite(n)&&Math.abs(n)<=half)||!finite(o.loadedAt,s.time)||(o.anchorKind==='building'?(!Number.isSafeInteger(o.buildingId)||o.buildingId!<1||o.buildingId!>=s.nextId):o.buildingId!==undefined))return false;
 }
 return true;
}
