import type {Game} from './sim';
import {penPlacesOccupied} from './husbandry';
import {penPastureReport} from './penPasture';
/** Hook for illness risk: how crowded the team's domesticated animals are. 0 = ample pasture, 1 = exactly full, above 1 = overcrowded.
 * Pure read of existing state; nothing is stored or saved. */
export function livestockCrowding(g:Game,team=0){
 let used=0,capacity=0;
 for(const pen of g.state.buildings)if(pen.team===team&&pen.type==='pen'&&g.finished(pen)){
  used+=penPlacesOccupied(g,pen.id);capacity+=penPastureReport(g,pen)?.eligibleCapacity??0;
 }
 return capacity>0?used/capacity:used>0?2:0;
}
/** Illness chance multiplier from crowding (1 below 0.8 full, rising to 1.5 at 1.3 and beyond). */
export function livestockIllnessMultiplier(crowding:number){return 1+.5*Math.max(0,Math.min(1,(crowding-.8)/.5));}
