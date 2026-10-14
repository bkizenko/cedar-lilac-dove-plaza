import type {Game} from './sim';
import type {Unit, ResourceNode} from './types';

export function treeHasRoom(g:Game,node:ResourceNode,worker:Unit){
  return g.state.units.filter(u=>u!==worker&&u.hp>0&&!u.emergency&&u.order==='gather'&&u.node===node).length<2;
}
const audits=new WeakMap<Game,number>();
/** Repair crowded legacy orders too. Keep the closest pair, including people
 * already walking to the tree; everyone else finds another site or unloads. */
export function reconcileTreeWorkers(g:Game){
  const due=audits.get(g)??-1;
  if(due>g.state.time&&due<=g.state.time+1)return;
  audits.set(g,g.state.time+1);
  const groups=new Map<ResourceNode,Unit[]>();
  for(const u of g.state.units){
    if(u.hp<=0||u.emergency||u.order!=='gather'||!u.node||!('kind' in u.node)||u.node.kind!=='tree')continue;
    const node=u.node as ResourceNode,list=groups.get(node)||[];
    list.push(u);groups.set(node,list);
  }
  let changed=false;
  for(const [node,workers] of groups){
    if(workers.length<=2)continue;
    workers.sort((a,b)=>Math.hypot(a.x-node.x,a.z-node.z)-Math.hypot(b.x-node.x,b.z-node.z)||a.id-b.id);
    for(const u of workers.slice(2)){
      u.node=null;u.order=u.carry>0?'return':'idle';u.workCheckAt=0;u.stuckT=0;
      u.workReason=u.carry>0?'Taking timber home':'Two cutters per tree — finding another work site';
      changed=true;
    }
  }
  if(changed)g.workBoard.reset();
}
