import type {Game} from './sim';
import type {Unit, ResourceNode} from './types';
import type {JobCoordinator} from './jobCoordinator';
import {workRuntime} from './workRuntime';

export const WORK_ALLOCATION_RULES={treeSlots:2,auditIntervalSeconds:1} as const;
type TreeOwnership={state:Game['state'];jobs:JobCoordinator;claims:Map<number,{id:string;node:ResourceNode}>;nextAudit:number};
const ownership=new WeakMap<Game,TreeOwnership>();
function context(g:Game){
 let c=ownership.get(g);
 if(!c||c.state!==g.state){c={state:g.state,jobs:workRuntime(g),claims:new Map(),nextAudit:-1};ownership.set(g,c);}
 return c;
}
function release(c:TreeOwnership,actor:number){const claim=c.claims.get(actor);if(!claim)return;c.jobs.finish(claim.id,true);c.jobs.forget(claim.id);c.claims.delete(actor);}
function prune(g:Game,c:TreeOwnership){
 const units=new Map(g.state.units.map(u=>[u.id,u]));
 for(const [actor,claim] of c.claims){const u=units.get(actor);if(!u||u.hp<=0||u.emergency||u.order!=='gather'||u.node!==claim.node)release(c,actor);}
}
function claimTree(g:Game,c:TreeOwnership,node:ResourceNode,worker:Unit){
 const previous=c.claims.get(worker.id);
 if(previous?.node===node){c.jobs.transition(previous.id,Math.hypot(worker.x-node.x,worker.z-node.z)<4?'working':'traveling');return true;}
 if(previous?.node!==node)release(c,worker.id);
 const id=`tree:${node.id}:worker:${worker.id}`;
 c.jobs.propose({id,kind:'gather:wood',owner:worker.team,actors:[worker.id],target:node.id});
 const accepted=c.jobs.reserve(id,[{key:`tree:${node.id}:slots`,amount:1,capacity:WORK_ALLOCATION_RULES.treeSlots}]);
 if(!accepted){c.jobs.finish(id,true);c.jobs.forget(id);return false;}
 c.jobs.transition(id,Math.hypot(worker.x-node.x,worker.z-node.z)<4?'working':'traveling');
 c.claims.set(worker.id,{id,node});return true;
}
/** Adapter diagnostics cover migrated tree jobs, not every legacy executor. */
export function workAllocationDiagnostics(g:Game){const c=context(g);return {domain:'shared migrated work',activeTreeJobs:c.claims.size,activeJobs:c.claims.size,...c.jobs.metrics,reservations:{...c.jobs.reservations.metrics}};}
export function treeHasRoom(g:Game,node:ResourceNode,worker:Unit){
 // Candidate scanning must never reserve a worker or a tree slot.
 return g.state.units.filter(u=>u!==worker&&u.hp>0&&!u.emergency&&u.order==='gather'&&u.node===node).length<WORK_ALLOCATION_RULES.treeSlots;
}
/** Direct overrides can release migrated ownership immediately. */
export function releaseTreeWorker(g:Game,worker:Unit){release(context(g),worker.id);}
/** Commit only after choosing a tree, never while scoring candidates. */
export function reserveTreeWorker(g:Game,node:ResourceNode,worker:Unit){
 const c=context(g);prune(g,c);
 if(!treeHasRoom(g,node,worker))return false;
 for(const other of g.state.units)if(other!==worker&&other.hp>0&&!other.emergency&&other.order==='gather'&&other.node===node)if(!claimTree(g,c,node,other))return false;
 return claimTree(g,c,node,worker);
}
/** Repair crowded legacy orders too. Keep the closest pair, including people
 * already walking to the tree; everyone else finds another site or unloads. */
export function reconcileTreeWorkers(g:Game){
 const c=context(g);
 if(c.nextAudit>g.state.time&&c.nextAudit<=g.state.time+WORK_ALLOCATION_RULES.auditIntervalSeconds)return;
 c.nextAudit=g.state.time+WORK_ALLOCATION_RULES.auditIntervalSeconds;prune(g,c);
 const groups=new Map<ResourceNode,Unit[]>();
 for(const u of g.state.units){
  if(u.hp<=0||u.emergency||u.order!=='gather'||!u.node||!('kind' in u.node)||u.node.kind!=='tree')continue;
  const node=u.node as ResourceNode,list=groups.get(node)||[];list.push(u);groups.set(node,list);
 }
 let changed=false;
 for(const [node,workers] of groups){
  workers.sort((a,b)=>Math.hypot(a.x-node.x,a.z-node.z)-Math.hypot(b.x-node.x,b.z-node.z)||a.id-b.id);
  // Reconcile legacy capacity deterministically before admitting adapter claims.
  for(const u of workers.slice(WORK_ALLOCATION_RULES.treeSlots)){
   release(c,u.id);u.node=null;u.order=u.carry>0?'return':'idle';u.workCheckAt=0;u.stuckT=0;
   u.workReason=u.carry>0?'Taking timber home':'Two cutters per tree — finding another work site';changed=true;
  }
  for(const u of workers.slice(0,WORK_ALLOCATION_RULES.treeSlots))claimTree(g,c,node,u);
 }
 if(changed)g.workBoard.reset();
}
