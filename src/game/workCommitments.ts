import type {Unit} from './types';
/** New reserved activities register here so other schedulers cannot steal their owner. */
export const COMMITTED_TASKS=['boat','plantingWork','weaponWork','haulageWork','farmToolWork','tamingWork','husbandryWork','copperStudy','studyCrop'] as const;
export type CommittedTask=typeof COMMITTED_TASKS[number];
export function hasTaskCommitment(u:Unit,except?:CommittedTask){
 for(const key of COMMITTED_TASKS)if(key!==except&&u[key])return true;
 return false;
}
