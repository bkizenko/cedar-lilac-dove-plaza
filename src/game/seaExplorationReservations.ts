import type {Game} from './sim';
/** Shared read-only hull admission contract. The mission owns the records;
 * boat primitives consume this leaf without importing mission orchestration. */
export const SEA_EXPLORATION_ACTIVE_HULL_PHASES=['mustering','outbound','returning','landing','unloading'] as const;
export function seaExplorationOwnsBoat(g:Game,boatId:number){
 return !!g.state.seaExploration?.voyages.some(v=>v.boatId===boatId&&(SEA_EXPLORATION_ACTIVE_HULL_PHASES as readonly string[]).includes(v.phase));
}
