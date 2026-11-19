import type { GameState, Unit } from '../game/types';
import { hasTaskCommitment } from '../game/workCommitments';

/** One plain line explaining why a resident stands idle, read only from saved
 * sim state (rest flag, cold exposure, illness, a parked paid batch, and the
 * sim's own work reason). Returns undefined when the resident is busy. */
export function idleWhy(state:GameState,u:Unit):string|undefined{
 if(u.hp<=0||!['idle','hold'].includes(u.order))return undefined;
 const p=u.productionProjectId!==undefined?state.production?.projects.find(p=>p.id===u.productionProjectId&&!['complete','lost'].includes(p.phase)):undefined;
 if(p&&!['paused','stored'].includes(p.phase))return undefined;
 if(u.resting)return `Resting — worn out (tiredness ${Math.round((u.fatigue??0)*100)}%), back to work once recovered`;
 if((u.coldSeconds??0)>0)return 'Too cold to work — needs a lit fire or warmer clothes first';
 if(u.sickUntil!==undefined&&u.sickUntil>state.time)return 'Sick — resting until well again';
 if(p)return `Waiting on a hauler — ${p.blockedReason||'the paid batch is parked until someone carries it on'}`;
 if(hasTaskCommitment(u,'productionProjectId'))return undefined;
 const reason=u.workReason?.trim();
 if(reason&&/\btools?\b/i.test(reason))return `No tool — ${reason}`;
 if(reason&&/carrier|hauler|transport|supplies|deliver/i.test(reason))return `Waiting on a hauler — ${reason}`;
 if(reason&&/auto work is off|waiting for (your )?orders?|awaiting orders/i.test(reason))return `Waiting for your orders — ${reason}`;
 if(reason)return `Idle — ${reason}`;
 return 'No job open — every task that needs a hand is already staffed';
}
