/** The one missing thing for a build-menu entry, read from the same checks
 * the menu already applies (housing adoption issue, then stock vs cost).
 * Returns null when the entry can be placed now. No new gating. */
const NAMES:[key:string,label:string][]=[['seeds','seeds'],['wood','logs'],['stone','stone'],['food','food'],['copper','copper'],['iron','iron']];
export function buildLockReason(cost:Record<string,number|undefined>,have:Record<string,number|undefined>,homeIssue?:string|null):string|null{
 if(homeIssue)return homeIssue;
 for(const [k,label] of NAMES){const need=(cost[k]||0)-(have[k]||0);if(need>0)return `Needs ${Math.ceil(need)} more ${label}`;}
 return null;
}
