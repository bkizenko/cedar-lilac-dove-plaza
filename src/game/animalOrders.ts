import type { Game } from './sim';
import type { Building, Unit } from './types';
import { hasTaskCommitment } from './workCommitments';
import { isDependent } from './settlement';
import { orderExploration } from './explorationOrders';
import { beginHerdTaming, HERD, penPlacesOccupied, penPlacesReserved } from './husbandry';
import {surveyPenPasture} from './penPasture';
import {insidePen} from './penGeometry';
import {FOW} from './constants';
import {habitatKindAt} from './ecology';
import {connectedForUnit} from './waterTravel';

export function goatSearchPen(g: Game, id: number) {
  return g.state.buildings.find(b => b.id === id && b.team === 0 && b.type === 'pen' && g.finished(b));
}

export function visibleGoatsForPen(g: Game, pen: Building) {
  return g.state.wildlife.filter(a => a.species === 'goat' && a.hp > 0 &&
    !g.state.units.some(u => u.hp > 0 && u.tamingWork?.animal === a.id) &&
    g.visibleAt(a.x, a.z) && Math.hypot(a.x - pen.x, a.z - pen.z) < HERD.searchRadiusMeters &&
    g.workBoard.connected(g, a.x, a.z, pen.x, pen.z));
}

/** Only observed animals or genuinely unknown reachable ground guide a search. */
export function goatSearchTarget(g: Game, u: Unit, pen: Building) {
  const goat = visibleGoatsForPen(g, pen).find(a => g.workBoard.connected(g, u.x, u.z, a.x, a.z));
  return goat ? { x: goat.x, z: goat.z } : pen.goatSearch?goatSurveyTarget(g,u,pen):g.findExploreTarget(u, pen);
}

/** Revisit remembered habitat as well as new fog. Targets depend on survey
 * visibility and known terrain, never on an unseen animal's coordinates. */
function goatSurveyTarget(g:Game,u:Unit,pen:Building){
 const q=pen.goatSearch!;if((q.searchedCells?.length||0)>=2048)return null;
 const visited=new Set(q.searchedCells||[]),cell=g.world.size/FOW;
 const stride=Math.max(4,Math.ceil(HERD.searchRadiusMeters*2/(cell*20)));
 const centerX=(pen.x+g.world.size/2)/cell,centerZ=(pen.z+g.world.size/2)/cell;
 const radius=HERD.searchRadiusMeters/cell;
 const loX=Math.max(stride,Math.floor((centerX-radius)/stride)*stride),hiX=Math.min(FOW-stride,centerX+radius);
 const loZ=Math.max(stride,Math.floor((centerZ-radius)/stride)*stride),hiZ=Math.min(FOW-stride,centerZ+radius);
 const candidates:{x:number;z:number;score:number}[]=[];let samples=0;
 for(let iz=loZ;iz<=hiZ&&samples<512;iz+=stride)for(let ix=loX;ix<=hiX&&samples<512;ix+=stride){
  samples++;const index=iz*FOW+ix,x=-g.world.size/2+(ix+.5)*cell,z=-g.world.size/2+(iz+.5)*cell;
  if(Math.hypot(x-pen.x,z-pen.z)>=HERD.searchRadiusMeters||visited.has(index))continue;
  if(g.vision[index]===2){visited.add(index);continue;}
  const d=Math.hypot(x-u.x,z-u.z);if(d<12)continue;
  const habitat=g.vision[index]>0?habitatKindAt(g,x,z):undefined;
  candidates.push({x,z,score:d*(habitat==='hills'?.6:habitat==='forest'?.8:1)});
 }
 q.searchedCells=[...visited].slice(0,2048);
 // Connectivity is queried for at most32 nearest samples, not for every cell.
 for(const p of candidates.sort((a,b)=>a.score-b.score).slice(0,32))if(g.walkable(p.x,p.z)&&connectedForUnit(g,u,p.x,p.z))return{x:p.x,z:p.z};
 return null;
}

/** The discovering scout can keep their real provisions and become the handler. */
export function captureGoatFromSearch(g: Game, u: Unit, pen: Building) {
  if (beginHerdTaming(g, pen.id, u.id)) return true;
  finishGoatSearch(g, u, 'Wild goats spotted — capture needs feed, usable pen space and a clear route. Returning to camp.');
  return false;
}

export function finishGoatSearch(g: Game, u: Unit, message: string) {
  const pen=u.goatSearchPen===undefined?undefined:goatSearchPen(g,u.goatSearchPen);
  if(pen?.goatSearch){const q=pen.goatSearch;q.nextAttemptAt=g.state.time+GOAT_QUEUE_RULES.retrySeconds;q.state=/No goats found|route is blocked/.test(message)?'exhausted':'waiting';q.reason=message.includes('route is blocked')?'route':undefined;}
  delete u.goatSearchPen;
  delete u.exploreAfterDelivery;
  u.recalled = true;
  u.stationOnArrival = false;
  u.order = 'return';
  u.node = null;
  u.target = null;
  u.workReason = message;
  g.banner(message, 5);
}

function attemptGoatSearch(g: Game, penId?: number, quiet=false) {
  const pen = penId === undefined ? undefined : goatSearchPen(g, penId);
  const report = (accepted: boolean, reason: string) => {
    if(!quiet)g.banner(reason, 5);
    return { accepted, reason };
  };
  if (penId !== undefined && !pen) return report(false, 'Finish the pen before sending a scout');
  if (pen && visibleGoatsForPen(g, pen).length) {
    const accepted = beginHerdTaming(g, pen.id);
    if (accepted) return { accepted, reason: 'A handler is approaching a wild goat' };
  }
  if (pen && g.state.units.some(u => u.hp > 0 && (u.order === 'explore' || u.exploreAfterDelivery) && u.goatSearchPen === pen.id)) {
    return report(true, 'A scout is already searching hills and woodland for this pen');
  }
  const selected = g.selectedUnits();
  const pool = [...g.state.units].sort((a, b) => Number(selected.includes(b)) - Number(selected.includes(a)));
  let reason = 'No adult can leave now. Let a worker unload or finish their current order, then try again.';
  for (const u of pool) {
    if (u.team !== 0 || u.hp <= 0 || u.type !== 'worker' || u.militia || isDependent(g, u) ||
        hasTaskCommitment(u) || (u.jobLock && !u.foodRole) || u.emergency || u.recalled || u.expedition || u.visit ||
        u.envoy || u.scout || u.buildOrder || u.escortId !== undefined ||
        !['hold', 'idle', 'gather', 'return'].includes(u.order)) continue;
    const target = pen ? goatSearchTarget(g, u, pen) : undefined;
    if (pen && !target) {
      reason = 'No unexplored ground reachable within 220 m of this pen. Scout another area or place a pen near goat habitat.';
      continue;
    }
    const issue = orderExploration(g, u, target ?? undefined);
    if (issue) { reason = issue; continue; }
    if (pen) u.goatSearchPen = pen.id;
    u.workReason = u.exploreAfterDelivery ? 'Goat search queued — unloading existing supplies first' : 'Searching hills and woodland for wild goats';
    return report(true, u.workReason);
  }
  return report(false, reason);
}

export const GOAT_QUEUE_RULES={retrySeconds:5} as const;
export type GoatSearchOrder={requestedAt:number;nextAttemptAt:number;state:'waiting'|'searching'|'capturing'|'complete'|'exhausted';reason?:'adult'|'food'|'space'|'paused'|'route';animal?:number;searchedCells?:number[]};
export function goatSearchOrderLabel(b:Building){const q=b.goatSearch;if(!q)return null;return q.state==='waiting'?q.reason==='food'?'Waiting for journey food':q.reason==='space'?'Waiting for pen space':'Waiting for an available adult':q.state==='searching'?'Searching for wild goats':q.state==='capturing'?q.reason==='paused'?'Capture paused':'Capturing and leading goat home':q.state==='complete'?'Goat brought home':q.reason==='route'?'Search route blocked':'Nearby search exhausted';}
/** A pen owns one explicit search request. Nothing is paid until real dispatch. */
export function searchForWildGoats(g:Game,penId?:number){
 if(penId===undefined)return attemptGoatSearch(g);
 const pen=goatSearchPen(g,penId);if(!pen){g.banner('Finish the pen before sending a scout',4);return{accepted:false,reason:'Finish the pen before sending a scout'};}
 if(!pen.goatSearch||['complete','exhausted'].includes(pen.goatSearch.state))pen.goatSearch={requestedAt:g.state.time,nextAttemptAt:g.state.time,state:'waiting'};
 tickGoatSearchOrder(g,pen);
 const reason=goatSearchOrderLabel(pen)!;g.banner(reason,4);return{accepted:pen.goatSearch.state!=='exhausted',reason};
}
export function cancelGoatSearch(g:Game,penId:number){
 const pen=goatSearchPen(g,penId);if(!pen?.goatSearch)return false;
 for(const u of g.state.units)if(u.hp>0&&(u.goatSearchPen===penId||u.tamingWork?.pen===penId&&u.tamingWork.animal===pen.goatSearch.animal)){
  g.interruptMission(u);u.recalled=true;u.stationOnArrival=false;u.order='return';u.node=null;u.target=null;u.workReason='Goat search cancelled — returning with carried supplies';
 }
 delete pen.goatSearch;return true;
}
function tickGoatSearchOrder(g:Game,pen:Building){
 const q=pen.goatSearch;if(!q||q.state==='complete'||q.state==='exhausted')return;
 const handler=g.state.units.find(u=>u.hp>0&&u.tamingWork?.pen===pen.id&&(g.state.wildlife.find(a=>a.id===u.tamingWork!.animal)?.species??g.state.livestock?.find(a=>a.id===u.tamingWork!.animal)?.species)==='goat');
 if(handler){q.state='capturing';q.animal=handler.tamingWork!.animal;q.reason=handler.tamingWork!.paused?'paused':undefined;return;}
 if(q.animal!==undefined){const a=g.state.livestock?.find(a=>a.id===q.animal&&a.hp>0&&a.pen===pen.id);if(a){if(insidePen(pen,a.x,a.z,.25)){q.state='complete';delete q.reason;}else{q.state='capturing';q.reason='paused';}return;}}
 const scout=g.state.units.find(u=>u.hp>0&&u.goatSearchPen===pen.id&&(u.order==='explore'||u.exploreAfterDelivery));
 if(scout){q.state='searching';delete q.reason;return;}
 if(g.state.time<q.nextAttemptAt)return;
 q.nextAttemptAt=g.state.time+GOAT_QUEUE_RULES.retrySeconds;q.state='waiting';delete q.reason;
 const reserved=penPlacesReserved(g,pen.id);
 if(penPlacesOccupied(g,pen.id)+reserved>=surveyPenPasture(g,pen).eligibleCapacity){q.reason='space';return;}
 if(g.tribe(0).food<HERD.tamingFood){q.reason='food';return;}
 const result=attemptGoatSearch(g,pen.id,true);
 if(result.accepted){const actor=g.state.units.find(u=>u.hp>0&&u.tamingWork?.pen===pen.id);if(actor){q.state='capturing';q.animal=actor.tamingWork!.animal;}else q.state='searching';}
 else if(result.reason.startsWith('No unexplored ground'))q.state='exhausted';
 else q.reason=/food|journey/i.test(result.reason)?'food':'adult';
}
export function tickGoatSearchOrders(g:Game){for(const pen of g.state.buildings)if(pen.team===0&&pen.type==='pen'&&g.finished(pen)&&pen.goatSearch)tickGoatSearchOrder(g,pen);}
export function validGoatSearchOrder(value:unknown,time:number,nextId:number){
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const q=value as Record<string,unknown>;if(Object.keys(q).some(k=>!['requestedAt','nextAttemptAt','state','reason','animal','searchedCells'].includes(k)))return false;
 return typeof q.requestedAt==='number'&&Number.isFinite(q.requestedAt)&&q.requestedAt>=0&&q.requestedAt<=time&&typeof q.nextAttemptAt==='number'&&Number.isFinite(q.nextAttemptAt)&&q.nextAttemptAt>=q.requestedAt&&q.nextAttemptAt<=time+GOAT_QUEUE_RULES.retrySeconds+1e-6&&['waiting','searching','capturing','complete','exhausted'].includes(q.state as string)&&(q.reason===undefined||['adult','food','space','paused','route'].includes(q.reason as string))&&(q.searchedCells===undefined||Array.isArray(q.searchedCells)&&q.searchedCells.length<=2048&&new Set(q.searchedCells).size===q.searchedCells.length&&q.searchedCells.every(i=>Number.isSafeInteger(i)&&i>=0&&i<FOW*FOW))&&(q.animal===undefined||Number.isSafeInteger(q.animal)&&Number(q.animal)>0&&Number(q.animal)<nextId);
}
