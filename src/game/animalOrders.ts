import type { Game } from './sim';
import type { Building, Unit } from './types';
import { hasTaskCommitment } from './workCommitments';
import { isDependent } from './settlement';
import { orderExploration } from './explorationOrders';
import { beginHerdTaming, HERD } from './husbandry';

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
  return goat ? { x: goat.x, z: goat.z } : g.findExploreTarget(u, pen);
}

/** The discovering scout can keep their real provisions and become the handler. */
export function captureGoatFromSearch(g: Game, u: Unit, pen: Building) {
  if (beginHerdTaming(g, pen.id, u.id)) return true;
  finishGoatSearch(g, u, 'Wild goats spotted — capture needs feed, usable pen space and a clear route. Returning to camp.');
  return false;
}

export function finishGoatSearch(g: Game, u: Unit, message: string) {
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

export function searchForWildGoats(g: Game, penId?: number) {
  const pen = penId === undefined ? undefined : goatSearchPen(g, penId);
  const report = (accepted: boolean, reason: string) => {
    g.banner(reason, 5);
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
