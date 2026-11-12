import type {Game} from './sim';
import type {FoodKind,Unit} from './types';
import {FOOD_KINDS,FOOD_NOURISHMENT,foodInventory,takeFoodLot} from './pantry';
import {foodDemand} from './settlement';
import {packCapacityMultiplier} from './packAnimalState';
import {supplyDrops,supplyApproach,supplyReached} from './campAnchor';
import {PACKED_FOOD_RULES,packedFoodNourishment,consumePackedFood,withdrawPackedFood,validPackedFoodCustody} from './packedFoodCustody';
import type {PackedFoodCustody,PackedFoodValidation} from './packedFoodCustody';

export const EXPEDITION_PROVISION_RULES={personUnits:24,minimumNourishment:6,villageReserveSeconds:90,maximumUnits:100} as const;
export const EXPEDITION_FOOD_CATALOGUE={kinds:FOOD_KINDS,nourishment:FOOD_NOURISHMENT,edible:(kind:FoodKind)=>kind!=='grain'&&kind!=='fish'};
type Expedition=NonNullable<Unit['expedition']>;
const view=(e:Expedition)=>({food:e.food,foodUsed:e.foodUsed??0,foodCustody:e.foodCustody});
export function expeditionProvisionCapacity(u:Unit){return Math.min(EXPEDITION_PROVISION_RULES.maximumUnits,EXPEDITION_PROVISION_RULES.personUnits*(u.haulage==='pack'&&u.packAnimal?packCapacityMultiplier(u):1));}
/** Actual interaction contact, not distance to a village marker or a stock treasury. */
export function expeditionAtOwnCache(g:Game,u:Unit){for(const drop of supplyDrops(g,u.team)){const spot=supplyApproach(g,u,drop);if(spot&&supplyReached(g,u,drop,spot))return {drop,spot};}return null;}
export function expeditionHome(g:Game,u:Unit){return supplyDrops(g,u.team).map(drop=>({drop,spot:supplyApproach(g,u,drop)})).filter((p):p is {drop:typeof p.drop;spot:{x:number;z:number}}=>p.spot!==null).sort((a,b)=>Math.hypot(a.spot.x-u.x,a.spot.z-u.z)-Math.hypot(b.spot.x-u.x,b.spot.z-u.z))[0]??null;}
export function expeditionProvisionNourishment(u:Unit){return u.expedition?packedFoodNourishment(view(u.expedition),EXPEDITION_FOOD_CATALOGUE):0;}
/** All proposals are read-only. The caller can reserve part of the same physical
 * animal budget for road feed/water before committing both packets at this cache. */
export function planExpeditionProvisions(g:Game,u:Unit,reservedUnits=0,availableStock?:Record<FoodKind,number>,maximumHumanUnits=Infinity){
 if(u.expedition||!Number.isFinite(reservedUnits)||reservedUnits<0)return null;
 const at=expeditionAtOwnCache(g,u);if(!at)return null;
 const t=g.tribe(u.team),stock=availableStock??foodInventory(t),ready={units:FOOD_KINDS.reduce((n,k)=>n+(EXPEDITION_FOOD_CATALOGUE.edible(k)?stock[k]:0),0),nourishment:FOOD_KINDS.reduce((n,k)=>n+(EXPEDITION_FOOD_CATALOGUE.edible(k)?stock[k]*(FOOD_NOURISHMENT[k]??1):0),0)},budget=Math.max(0,Math.min(maximumHumanUnits,expeditionProvisionCapacity(u)-reservedUnits)),available=Math.max(0,ready.nourishment-foodDemand(g,u.team)*EXPEDITION_PROVISION_RULES.villageReserveSeconds);
 const readyUnits=ready.units,units=Math.min(budget,readyUnits,ready.nourishment>0?readyUnits*available/ready.nourishment:0);
 if(units<=0||readyUnits<=0)return null;
 const share=units/readyUnits,origin={team:u.team,anchorKind:at.drop.kind==='camp'?'camp' as const:'building' as const,...(at.drop.kind==='camp'?{}:{buildingId:at.drop.id}),x:at.drop.x,z:at.drop.z,loadedAt:g.state.time};
 const custody:PackedFoodCustody={version:1,legacyUnits:0,lots:FOOD_KINDS.filter(kind=>EXPEDITION_FOOD_CATALOGUE.edible(kind)&&stock[kind]>0).map(kind=>({kind,units:stock[kind]*share,origin:{...origin}}))};
 const food=custody.lots.reduce((n,l)=>n+l.units,0),e={food,foodUsed:0,foodCustody:custody,returning:false,forage:0};
 return packedFoodNourishment(e,EXPEDITION_FOOD_CATALOGUE)>=EXPEDITION_PROVISION_RULES.minimumNourishment?e:null;
}
/** Exact lot debits, once. No stock normalisation/read invents loaded provisions. */
export function commitExpeditionProvisions(g:Game,u:Unit,plan:NonNullable<ReturnType<typeof planExpeditionProvisions>>){
 if(u.expedition||!expeditionAtOwnCache(g,u))return false;
 const stock=foodInventory(g.tribe(u.team));if(plan.foodCustody.lots.some(l=>stock[l.kind]+1e-9<l.units))return false;
 for(const l of plan.foodCustody.lots)takeFoodLot(g,u.team,l.kind,l.units);
 u.expedition=plan;return true;
}
export function loadExpeditionProvisions(g:Game,u:Unit,reservedUnits=0){const plan=planExpeditionProvisions(g,u,reservedUnits);return !!plan&&commitExpeditionProvisions(g,u,plan);}
export function consumeExpeditionProvisions(u:Unit,demand:number){const e=u.expedition;if(!e)return 0;const p=view(e),taken=consumePackedFood(p,demand,EXPEDITION_FOOD_CATALOGUE);e.food=p.food;if(e.foodCustody)e.foodUsed=p.foodUsed;return taken.nourishment;}
/** Returns are storage movement, not new harvest/production/received-food income. */
export function returnExpeditionProvisions(g:Game,u:Unit){
 const e=u.expedition;if(!e||!expeditionAtOwnCache(g,u))return false;
 const p=view(e),taken=withdrawPackedFood(p,p.food,EXPEDITION_FOOD_CATALOGUE),t=g.tribe(u.team),stock=foodInventory(t);
 stock.provisions+=taken.legacyUnits;for(const l of taken.lots)stock[l.kind]+=l.units;
 t.food+=taken.units;t.foodLots=stock;delete u.expedition;return true;
}
export function validExpeditionProvisions(e:unknown,bounds:PackedFoodValidation):e is Expedition{
 if(!e||typeof e!=='object'||Array.isArray(e))return false;const p=e as Expedition;
 if(!Number.isFinite(p.food)||p.food<0||typeof p.returning!=='boolean'||!Number.isFinite(p.forage)||p.forage<0||p.forage>8.5)return false;
 if(p.foodCustody===undefined)return p.food<=24&&p.foodUsed===undefined;
 return Number.isFinite(p.foodUsed)&&p.foodUsed!>=0&&p.food+p.foodUsed!<=PACKED_FOOD_RULES.maximumUnits+PACKED_FOOD_RULES.tolerance&&validPackedFoodCustody(p.foodCustody,p.food,EXPEDITION_FOOD_CATALOGUE,bounds)&&p.foodCustody.lots.every(l=>EXPEDITION_FOOD_CATALOGUE.edible(l.kind));
}

/** Only the quantity actually removed from this nearby standing plant is added. */
export function addExpeditionForage(g:Game,u:Unit,units:number,x:number,z:number){
 const e=u.expedition;if(!e||units<=0)return;
 if(!e.foodCustody){e.food+=units;return;}
 const origin={team:u.team,anchorKind:'forage' as const,x,z,loadedAt:g.state.time};
 e.foodCustody.lots.push({kind:'berries',units,origin});e.food+=units;
}
export function expeditionForageRoom(u:Unit){const e=u.expedition;return !e?0:e.foodCustody?e.foodCustody.lots.length>=PACKED_FOOD_RULES.maximumLots?0:Math.max(0,Math.min(expeditionProvisionCapacity(u)-e.food,PACKED_FOOD_RULES.maximumUnits-e.food-(e.foodUsed??0))):Math.max(0,24-e.food);}
