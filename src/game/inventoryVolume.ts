import {IRON_METALLURGY_RULES as IRON} from './ironMetallurgyRules';
import {COPPER_METALLURGY_RULES} from './copperMetallurgy';
import type {ItemKind,ItemStock} from './production';
import type {FoodKind} from './types';
/** Tunable packed-volume estimates per GAME inventory unit, not archaeological measurements.
 * Counts, recipes and nutrition never change when these packing coefficients change. */
export const INVENTORY_VOLUME_RULES={version:1,litersPerStorageUnit:10,comparisonEpsilonUnits:1e-9,seedReserveLitersPerUnit:.001,parkedLogLiters:12}as const;
export const ITEM_PACKED_LITERS:Record<ItemKind,number>={plantFibre:10,cordage:1,basket:20,clay:5,greenware:20,dryWare:20,pottery:20,potsherds:2,flour:2,rawMeat:2,rawHide:12,bone:3,cleanHide:10,driedSkin:8,tannin:2,leather:6,skinClothes:15,leatherClothes:20,hideCoat:25,yarn:2,cloth:4,lightClothes:12,grainSheaves:20,roughGrain:3,straw:20,chaff:10,paddedArmor:20,rawWool:30,cleanWool:25,woolYarn:3,woolCloth:6,felt:8,woolCoat:25,greenMalt:3,charcoal:5,copperOre:COPPER_METALLURGY_RULES.orePackedLiters,copperMetal:COPPER_METALLURGY_RULES.metalPackedLiters,ironOre:IRON.orePackedLiters,ironBloom:IRON.bloomPackedLiters,ironMetal:IRON.metalPackedLiters};
export const FOOD_PACKED_LITERS:Record<FoodKind,number>={provisions:2,berries:3,fish:3,meat:2,grain:2,pulses:2,tubers:3,milk:2,bread:4,driedMeat:1,driedFish:1,smokedMeat:2,smokedFish:2,cookedFish:3,porridge:4,fermentedMilk:2,freshCurd:2,whey:2,smallBeer:2,beer:2,driedBerries:1,jam:2,tallow:1};
const quantity=(n:number|undefined)=>Number.isFinite(n)&&Number(n)>0?Number(n):0;
export const itemPackedLiters=(kind:ItemKind,count=1)=>ITEM_PACKED_LITERS[kind]*quantity(count);
export const packedItemLiters=(stock:ItemStock)=>Object.entries(stock).reduce((total,[kind,count])=>total+itemPackedLiters(kind as ItemKind,count),0);
export const packedItemStorageUnits=(stock:ItemStock)=>packedItemLiters(stock)/INVENTORY_VOLUME_RULES.litersPerStorageUnit;
export const packedFoodLiters=(stock:Partial<Record<FoodKind,number>>)=>Object.entries(stock).reduce((total,[kind,count])=>total+FOOD_PACKED_LITERS[kind as FoodKind]*quantity(count),0);
export const seedReserveLiters=(count:number)=>quantity(count)*INVENTORY_VOLUME_RULES.seedReserveLitersPerUnit;
