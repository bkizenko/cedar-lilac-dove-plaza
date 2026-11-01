import{rebuildFibreOwnership}from'./fibre';
import{rebuildProductionOwnership}from'./productionOwnership';
import type {Game} from './sim';
import {JobCoordinator} from './jobCoordinator';
const runtimes=new WeakMap<Game,{state:Game['state'];coordinator:JobCoordinator}>();
/** Runtime ownership is reconstructed from serialized projects and legacy orders. */
export function workRuntime(g:Game){
 let entry=runtimes.get(g);
 if(!entry||entry.state!==g.state){entry={state:g.state,coordinator:new JobCoordinator()};runtimes.set(g,entry);rebuildProductionOwnership(g,entry.coordinator);rebuildFibreOwnership(g,entry.coordinator);}
 return entry.coordinator;
}
