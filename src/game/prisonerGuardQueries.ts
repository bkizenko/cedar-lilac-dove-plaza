import type {Game} from './sim';
import type {Unit} from './types';
const active=new WeakSet<Game>();
const indexes=new WeakMap<Game,{units:Unit[];length:number;guards:Set<number>}>();
/** A guard-free village needs one sparse custody scan per actor pass, rather
 * than one complete resident scan per resident. Positive matches still use
 * the original live custody-selection logic. Nothing is serialized. */
export function beginPrisonerGuardQueries(g:Game){indexes.delete(g);active.add(g);}
export function endPrisonerGuardQueries(g:Game){active.delete(g);indexes.delete(g);}
export function invalidatePrisonerGuardQueries(g:Game){indexes.delete(g);}
export function mayGuardPrisoner(g:Game,id:number){
 if(!active.has(g))return true;
 let index=indexes.get(g);
 if(!index||index.units!==g.state.units||index.length!==g.state.units.length){
  const guards=new Set<number>();
  // Retain markers even for dead/released people: this can only cause an extra
  // live scan, never conceal a later phase/health transition from its guard.
  for(const person of g.state.units){const guard=person.prisoner?.guardId;if(guard!==undefined)guards.add(guard);}
  index={units:g.state.units,length:g.state.units.length,guards};indexes.set(g,index);
 }
 return index.guards.has(id);
}
