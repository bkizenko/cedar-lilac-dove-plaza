import type {Unit} from './types';
/** New reserved activities register here so other schedulers cannot steal their owner. */
export const COMMITTED_TASKS=['packPastureOrder','sitePreparationId','siegeRamId','housingWorkId','housingUse','buildingRepairId','campTrip','practicalHelper','fibreWork','productionApprentice','clayWork','exploreAfterDelivery','productionProjectId','campMoveId','contactDemand','contactAttackTargetId','societyMissionId','coastalVoyageId','coastalCommissionId','seaExplorationId','tradeNeedsId','cargoRecoveryId','farmToolCargoId','armorCargoId','weaponCargo','prisoner','captureTargetId','waterWork','hullRecovery','boat','plantingWork','weaponWork','haulageWork','farmToolWork','tamingWork','husbandryWork','copperStudy','studyCrop'] as const;
export type CommittedTask=typeof COMMITTED_TASKS[number];
export function hasTaskCommitment(u:Unit,except?:CommittedTask){
 for(const key of COMMITTED_TASKS){if(key==='packPastureOrder'&&u.packPastureOrder?.phase==='queued')continue;if(key==='housingUse'&&u.housingUse?.paused)continue;if(key==='practicalHelper'&&u.practicalHelper?.phase==='paused')continue;if(key==='productionApprentice'&&u.productionApprentice&&['paused','waiting'].includes(u.productionApprentice.phase))continue;if(key!==except&&u[key])return true;}
 return false;
}
