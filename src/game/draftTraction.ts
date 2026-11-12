import type {Unit} from './types';
import {draftTractionReady,farmToolRate} from './farmTools';
/** Caller supplies only the capped productive field-work time, never travel or idle time. */
export function recordDraftTractionWork(u:Unit,phase:number,productiveSeconds:number){
 if(phase!==0||u.farmTool!=='woodenArd'||!draftTractionReady(u)||farmToolRate(u,phase)<=1||!(productiveSeconds>0)||!Number.isFinite(productiveSeconds))return 0;
 const before=u.draftPracticeSeconds??0;u.draftPracticeSeconds=Math.min(1e12,before+productiveSeconds);return u.draftPracticeSeconds-before;
}
