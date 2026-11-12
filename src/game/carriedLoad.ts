import {EQUIPMENT_LOAD_RULES} from './equipmentLoadRules';
export {EQUIPMENT_LOAD_RULES} from './equipmentLoadRules';
import{TEXTILE_RULES}from'./textiles';
import type{Unit}from'./types';
import{GATHER}from'./constants';
/** Abstract personal-load units, not kilograms. All sources are real cargo;
 * gear capacity changes the burden fraction rather than creating inventory. */
export const CARRIED_LOAD_RULES={itemBatchUnits:40,waterLiters:24,provisionFood:24,personMaximumPenalty:.32,maximumBurdenFraction:1.5,minimumPersonPace:.52,boatPassengerUnits:1.5,boatCargoUnitsPerSeat:5,boatMaximumPenalty:.38,minimumBoatPace:.5}as const;
/** Tunable abstract item-volume units; carried equipment is not worn protection. */
export function equipmentLoadUnits(u:Unit){return (u.armorCargoId===undefined?0:EQUIPMENT_LOAD_RULES.armor)+(u.farmToolCargoId===undefined?0:EQUIPMENT_LOAD_RULES.farmTool)+Object.entries(u.weaponCargo||{}).reduce((n,[kind,amount])=>n+(amount||0)*(EQUIPMENT_LOAD_RULES.weapons[kind as keyof typeof EQUIPMENT_LOAD_RULES.weapons]||0),0);}
export function carriedLoadUnits(u:Unit){
 const house=u.housingCargo?.materials;const housing=house?house.wood/GATHER.wood.carry+house.stone/GATHER.stone.carry+house.plantFibre/CARRIED_LOAD_RULES.itemBatchUnits:0;
 const items=Object.values(u.itemCargo||{}).reduce((sum,n)=>sum+(n||0),0),water=(u.waterWork?.liters||0)+(u.husbandryWork?.waterLiters||0);
 return equipmentLoadUnits(u)/CARRIED_LOAD_RULES.itemBatchUnits+housing+Math.max(0,u.carry)/(GATHER[u.carryType||'wood']?.carry||GATHER.wood.carry)+items/CARRIED_LOAD_RULES.itemBatchUnits+water/CARRIED_LOAD_RULES.waterLiters+(u.expedition?.food||0)/CARRIED_LOAD_RULES.provisionFood+(u.spareGarment?TEXTILE_RULES.spareLoadUnits[u.spareGarment.item]:0);
}
export function carriedLoadFraction(u:Unit,capacityMultiplier=1){return Math.min(CARRIED_LOAD_RULES.maximumBurdenFraction,carriedLoadUnits(u)/Math.max(1,capacityMultiplier));}
export function burdenPace(fraction:number){return Math.max(CARRIED_LOAD_RULES.minimumPersonPace,1-CARRIED_LOAD_RULES.personMaximumPenalty*Math.max(0,fraction));}
export function vesselLoad(boat:{capacity:number},crew:Unit[]){
 const r=CARRIED_LOAD_RULES,load=crew.length*r.boatPassengerUnits+crew.reduce((sum,u)=>sum+carriedLoadUnits(u),0),capacity=boat.capacity*(r.boatPassengerUnits+r.boatCargoUnitsPerSeat),fraction=load/capacity;
 return{load,capacity,fraction,pace:Math.max(r.minimumBoatPace,1-r.boatMaximumPenalty*fraction)};
}
