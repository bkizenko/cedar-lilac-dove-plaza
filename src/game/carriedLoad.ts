import {IRON_METALLURGY_RULES as IRON} from './ironRules';
import type {ProductionProject} from './production';
import {CHARCOAL_RULES} from './charcoal';
import {COPPER_METALLURGY_RULES} from './copperMetallurgy';
import {copperStudyHeld} from './materialStudy';
import {EQUIPMENT_LOAD_RULES} from './equipmentLoadRules';
export {EQUIPMENT_LOAD_RULES} from './equipmentLoadRules';
import{TEXTILE_RULES}from'./textiles';
import type{Unit}from'./types';
import{GATHER}from'./constants';
const charcoalLoads=new WeakMap<Unit,ProductionProject>();
const copperSmeltLoads=new WeakMap<Unit,ProductionProject>();
/** A view of the original project, never copied itemCargo or another packet. */
export function bindCopperSmeltLoad(u:Unit,p:ProductionProject){if(p.recipe==='smeltCopper')copperSmeltLoads.set(u,p);}
function copperSmeltLoad(u:Unit){const p=copperSmeltLoads.get(u);if(!p||p.recipe!=='smeltCopper'||p.actorId!==u.id||p.team!==u.team)return 0;const phase=p.phase==='paused'?p.resumePhase:p.phase;return phase==='carrying'||phase==='unloading'?(COPPER_METALLURGY_RULES.orePerBatch+COPPER_METALLURGY_RULES.charcoalPerBatch)/CARRIED_LOAD_RULES.itemBatchUnits:phase==='returning'?COPPER_METALLURGY_RULES.metalPerBatch/CARRIED_LOAD_RULES.itemBatchUnits:0;}
const ironSmeltLoads=new WeakMap<Unit,ProductionProject>();
/** Reference the existing paid batch, including manual pause/load restoration. */
export function bindIronSmeltLoad(u:Unit,p:ProductionProject){if(p.recipe==='smeltIron'||p.recipe==='consolidateIron')ironSmeltLoads.set(u,p);}
function ironSmeltLoad(u:Unit){const p=ironSmeltLoads.get(u);if(!p||p.actorId!==u.id||p.team!==u.team||!['smeltIron','consolidateIron'].includes(p.recipe))return 0;const phase=p.phase==='paused'?p.resumePhase:p.phase;const inputs=p.recipe==='smeltIron'?IRON.orePerBatch+IRON.smeltingCharcoalPerBatch:IRON.bloomPerBatch+IRON.forgingCharcoalPerBatch,output=p.recipe==='smeltIron'?IRON.bloomPerBatch:IRON.metalPerBatch;return phase==='carrying'||phase==='unloading'?inputs/CARRIED_LOAD_RULES.itemBatchUnits:phase==='returning'?output/CARRIED_LOAD_RULES.itemBatchUnits:0;}
/** Derived from the authoritative paid project; never a second inventory. */
export function bindCharcoalLoad(u:Unit,p:ProductionProject){if(p.charcoal)charcoalLoads.set(u,p);}
function charcoalLoad(u:Unit){const p=charcoalLoads.get(u);if(!p?.charcoal||p.actorId!==u.id||p.team!==u.team)return 0;const phase=p.phase==='paused'?p.resumePhase:p.phase;return phase==='carrying'||phase==='unloading'?p.charcoal.woodLogs/GATHER.wood.carry:phase==='returning'?CHARCOAL_RULES.outputUnits/CARRIED_LOAD_RULES.itemBatchUnits:0;}
/** Abstract personal-load units, not kilograms. All sources are real cargo;
 * gear capacity changes the burden fraction rather than creating inventory. */
export const CARRIED_LOAD_RULES={itemBatchUnits:40,waterLiters:24,provisionFood:24,personMaximumPenalty:.32,maximumBurdenFraction:1.5,minimumPersonPace:.52,boatPassengerUnits:1.5,boatCargoUnitsPerSeat:5,boatMaximumPenalty:.38,minimumBoatPace:.5}as const;
/** Tunable abstract item-volume units; carried equipment is not worn protection. */
export function equipmentLoadUnits(u:Unit){return (u.armorCargoId===undefined?0:EQUIPMENT_LOAD_RULES.armor)+(u.farmToolCargoId===undefined?0:EQUIPMENT_LOAD_RULES.farmTool)+Object.entries(u.weaponCargo||{}).reduce((n,[kind,amount])=>n+(amount||0)*(EQUIPMENT_LOAD_RULES.weapons[kind as keyof typeof EQUIPMENT_LOAD_RULES.weapons]||0),0);}
export function carriedLoadUnits(u:Unit){
 const copper=copperStudyHeld(u),prototype=copper.copper/GATHER.copper.carry+copper.wood/GATHER.wood.carry+copper.charcoal/CARRIED_LOAD_RULES.itemBatchUnits;
 const house=u.housingCargo?.materials;const housing=house?house.wood/GATHER.wood.carry+house.stone/GATHER.stone.carry+house.plantFibre/CARRIED_LOAD_RULES.itemBatchUnits:0;
 const items=Object.values(u.itemCargo||{}).reduce((sum,n)=>sum+(n||0),0),water=(u.waterWork?.liters||0)+(u.husbandryWork?.waterLiters||0);
 return (u.armorRepair?(u.armorRepair.paid.cloth+u.armorRepair.paid.cordage)/CARRIED_LOAD_RULES.itemBatchUnits:0)+charcoalLoad(u)+copperSmeltLoad(u)+ironSmeltLoad(u)+prototype+equipmentLoadUnits(u)/CARRIED_LOAD_RULES.itemBatchUnits+housing+Math.max(0,u.carry)/(GATHER[u.carryType||'wood']?.carry||GATHER.wood.carry)+items/CARRIED_LOAD_RULES.itemBatchUnits+water/CARRIED_LOAD_RULES.waterLiters+(u.expedition?.food||0)/CARRIED_LOAD_RULES.provisionFood+(u.spareGarment?TEXTILE_RULES.spareLoadUnits[u.spareGarment.item]:0)+(u.garmentRepair?TEXTILE_RULES.spareLoadUnits[u.garmentRepair.garment.item]+Object.values(u.garmentRepair.paid).reduce((n,v)=>n+(v||0),0)/CARRIED_LOAD_RULES.itemBatchUnits:0);
}
export function carriedLoadFraction(u:Unit,capacityMultiplier=1){return Math.min(CARRIED_LOAD_RULES.maximumBurdenFraction,carriedLoadUnits(u)/Math.max(1,capacityMultiplier));}
export function burdenPace(fraction:number){return Math.max(CARRIED_LOAD_RULES.minimumPersonPace,1-CARRIED_LOAD_RULES.personMaximumPenalty*Math.max(0,fraction));}
export function vesselLoad(boat:{capacity:number},crew:Unit[]){
 const r=CARRIED_LOAD_RULES,load=crew.length*r.boatPassengerUnits+crew.reduce((sum,u)=>sum+carriedLoadUnits(u),0),capacity=boat.capacity*(r.boatPassengerUnits+r.boatCargoUnitsPerSeat),fraction=load/capacity;
 return{load,capacity,fraction,pace:Math.max(r.minimumBoatPace,1-r.boatMaximumPenalty*fraction)};
}
