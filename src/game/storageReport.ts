import {itemPackedLiters,seedReserveLiters,INVENTORY_VOLUME_RULES} from './inventoryVolume';
import{inheritedCacheCapacity}from'./communityCaches';
import{cachedProductionUnits}from'./productionOwnership';
import type {Game} from './sim';
import type {Building,FoodKind} from './types';
import {foodInventory,FOOD_KINDS} from './pantry';
import {ITEM_KINDS,ITEM_NAMES,PRODUCTION_RECIPES,PRODUCTION_RULES,productionOutputs,productionFoodOutput,productionFoodOutputs,productionRecovery,exposedMaterialByKind,itemCapacity,storedItemUnits,cerealReservedMaterials,type ItemKind,type ItemStock} from './production';
import {plotArea} from './plots';
const amount=(n:unknown)=>Math.max(0,Number(n)||0);
/** Read-only: these are communal stores, never invented per-building bins. */
export function villageStorageReport(g:Game,b:Building){
 if(b.type!=='warehouse'||b.team!==0||b.hp<=0)return null;
 const outside=exposedMaterialByKind(g,0);
 const t=g.tribe(0),food=foodInventory(t),items=t.items||{},people=g.state.units.filter(u=>u.team===0&&u.hp>0),complete=g.finished(b);
 const carriedFood=Object.fromEntries(FOOD_KINDS.map(k=>[k,0])) as Record<FoodKind,number>,carriedItems:ItemStock={},carriedResources={wood:0,stone:0,copper:0,iron:0},paidItems:ItemStock={},incomingItems:ItemStock={};let rawMeat=0,waterInTransit=0,paidGrain=0,incomingFood=0;const paidFoodInputs:Partial<Record<FoodKind,number>>={},incomingFoodLots:Partial<Record<FoodKind,number>>={};
 for(const u of people){if(u.carry>0&&u.carryType==='food'){if(u.rawHuntMeat)rawMeat+=u.carry;else carriedFood[u.carryFood||'provisions']+=u.carry;}else if(u.carryType&&u.carryType in carriedResources)carriedResources[u.carryType as keyof typeof carriedResources]+=amount(u.carry);
  for(const[k,n]of Object.entries(u.itemCargo||{}))carriedItems[k as ItemKind]=amount(carriedItems[k as ItemKind])+amount(n);waterInTransit+=amount(u.waterWork?.liters);
 }
 for(const p of g.state.production?.projects||[]){if(p.team!==0||p.phase==='complete'||p.phase==='lost')continue;const r=PRODUCTION_RECIPES[p.recipe],phase=p.phase==='paused'?p.resumePhase:p.phase;
  if(phase==='returning'||phase==='ready'){for(const[k,n]of Object.entries(productionOutputs(p)))incomingItems[k as ItemKind]=amount(incomingItems[k as ItemKind])+amount(n);incomingFood+=productionFoodOutput(p);for(const[k,n]of Object.entries(productionFoodOutputs(p)))incomingFoodLots[k as FoodKind]=amount(incomingFoodLots[k as FoodKind])+amount(n);}
  else{for(const[k,n]of Object.entries(productionRecovery(p)?{}:r.foodInputs))paidFoodInputs[k as FoodKind]=amount(paidFoodInputs[k as FoodKind])+amount(n);for(const[k,n]of Object.entries(productionRecovery(p)?productionOutputs(p):r.inputs))paidItems[k as ItemKind]=amount(paidItems[k as ItemKind])+amount(n);paidGrain+=productionRecovery(p)?0:amount(r.grain);}
 }
 return{complete,food:amount(t.food),foodThreshold:g.stockCap(0),foodContribution:complete?Math.floor(200*plotArea(b)):0,foodLots:FOOD_KINDS.map(kind=>({kind,amount:food[kind]})),resources:[{kind:'wood',name:'Logs',amount:amount(t.wood)},{kind:'stone',name:'Stone',amount:amount(t.stone)},{kind:'copper',name:'Copper',amount:amount(t.copper)},{kind:'iron',name:'Iron',amount:amount(t.iron)}],seeds:amount(t.seeds),water:amount(t.survival?.waterLiters),hasWater:!!t.survival,
  seedReserve:{count:amount(t.seeds),packedLiters:seedReserveLiters(amount(t.seeds))},materialUsedLiters:storedItemUnits(g,0)*INVENTORY_VOLUME_RULES.litersPerStorageUnit,materialCapacityLiters:itemCapacity(g,0)*INVENTORY_VOLUME_RULES.litersPerStorageUnit,materialReservedLiters:cerealReservedMaterials(g,0)*INVENTORY_VOLUME_RULES.litersPerStorageUnit,materialParkedLiters:cachedProductionUnits(g,0)*INVENTORY_VOLUME_RULES.litersPerStorageUnit,materialContributionLiters:(complete?PRODUCTION_RULES.warehouseCapacity:0)*INVENTORY_VOLUME_RULES.litersPerStorageUnit,materialOutsideLiters:Math.max(0,storedItemUnits(g,0)+cachedProductionUnits(g,0)-itemCapacity(g,0))*INVENTORY_VOLUME_RULES.litersPerStorageUnit,
  materials:ITEM_KINDS.map(kind=>({kind,name:ITEM_NAMES[kind],outsideAmount:amount(outside[kind]),outsideLiters:itemPackedLiters(kind,amount(outside[kind])),packedLiters:itemPackedLiters(kind,kind==='paddedArmor'?(g.state.armor?.assets||[]).filter(a=>a.team===0&&a.holder.kind==='cache').length:amount(items[kind])),amount:kind==='paddedArmor'?(g.state.armor?.assets||[]).filter(a=>a.team===0&&a.holder.kind==='cache').length:amount(items[kind])})),materialUsed:storedItemUnits(g,0),materialCapacity:itemCapacity(g,0),materialInheritedCapacity:inheritedCacheCapacity(g,0),materialReserved:cerealReservedMaterials(g,0),materialParked:cachedProductionUnits(g,0),materialContribution:complete?PRODUCTION_RULES.warehouseCapacity:0,care:Math.max(0,Math.min(1,b.storeCare||0)),wornGarments:people.filter(u=>u.garment&&u.garment.condition>0).length,
  carriedFood,carriedItems,carriedResources,rawMeat,waterInTransit,paidItems,paidGrain,paidFoodInputs,incomingItems,incomingFood,incomingFoodLots};
}
