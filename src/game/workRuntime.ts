import {rebuildCopperStudyOwnership} from './materialStudy';
import {rebuildTradedTeachingOwnership} from './tradedTeaching';
import {rebuildGarmentRepairOwnership} from './garmentRepair';
import{rebuildHousingOwnership}from'./housing';
import{rebuildBuildingRepairOwnership}from'./buildingMaintenance';
import{rebuildCampOwnership}from'./finiteCamp';
import{rebuildFarmToolOwnership}from'./farmToolOwnership';
import{rebuildPracticalHelpers}from'./practicalHelpers';
import{rebuildFibreOwnership}from'./fibre';
import{rebuildProductionOwnership}from'./productionOwnership';
import type {Game} from './sim';
import {JobCoordinator} from './jobCoordinator';
const runtimes=new WeakMap<Game,{state:Game['state'];coordinator:JobCoordinator}>();
/** Runtime ownership is reconstructed from serialized projects and legacy orders. */
export function workRuntime(g:Game){
 let entry=runtimes.get(g);
 if(!entry||entry.state!==g.state){entry={state:g.state,coordinator:new JobCoordinator()};runtimes.set(g,entry);rebuildBuildingRepairOwnership(g,entry.coordinator);rebuildHousingOwnership(g,entry.coordinator);rebuildProductionOwnership(g,entry.coordinator);rebuildGarmentRepairOwnership(g,entry.coordinator);rebuildTradedTeachingOwnership(g,entry.coordinator);rebuildFibreOwnership(g,entry.coordinator);rebuildPracticalHelpers(g,entry.coordinator);rebuildFarmToolOwnership(g,entry.coordinator);rebuildCopperStudyOwnership(g,entry.coordinator);rebuildCampOwnership(g,entry.coordinator);}
 return entry.coordinator;
}
