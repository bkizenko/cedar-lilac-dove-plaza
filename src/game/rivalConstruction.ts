import type {Game} from './sim';
import type {Building,ResourceNode,Unit} from './types';
import {isRivalTeam} from './factions';
import {releaseConstructionWorker} from './constructionOwnership';
import {reserveTreeWorker} from './workAllocation';

/** The actual occupied rectangle, including a paid/queued extension. Nearby
 * woodland remains woodland; a construction yard is not a forest-clear radius. */
export function treeInsideBuilding(n:ResourceNode,b:Building){
 return b.hp>0&&Math.abs(n.x-b.x)<(b.expansion?.w??b.w)/2+.25&&Math.abs(n.z-b.z)<(b.expansion?.d??b.d)/2+.25;
}
/** Retain depleted nodes and their regeneration timers rather than deleting
 * timber, or letting a stump regrow through an occupied building/field. */
const regrowthCells=new WeakMap<Game,{state:Game['state'];time:number;buildings:Building[];count:number;cells:Map<string,Building[]>}>();
const CELL=32;
export function buildingBlocksTreeRegrowth(g:Game,n:ResourceNode){
 if(n.kind!=='tree')return false;
 let index=regrowthCells.get(g);
 if(!index||index.state!==g.state||index.time!==g.state.time||index.buildings!==g.state.buildings||index.count!==g.state.buildings.length){
  const cells=new Map<string,Building[]>();
  for(const b of g.state.buildings){if(b.hp<=0)continue;
   const w=(b.expansion?.w??b.w)/2+.25,d=(b.expansion?.d??b.d)/2+.25;
   for(let z=Math.floor((b.z-d)/CELL);z<=Math.floor((b.z+d)/CELL);z++)for(let x=Math.floor((b.x-w)/CELL);x<=Math.floor((b.x+w)/CELL);x++){
    const key=`${x},${z}`,bucket=cells.get(key)||[];bucket.push(b);cells.set(key,bucket);
   }
  }
  index={state:g.state,time:g.state.time,buildings:g.state.buildings,count:g.state.buildings.length,cells};regrowthCells.set(g,index);
 }
 return index.cells.get(`${Math.floor(n.x/CELL)},${Math.floor(n.z/CELL)}`)?.some(b=>treeInsideBuilding(n,b))??false;
}
/** A paid unfinished rival project is still the queued construction intent.
 * Hand it temporarily to ordinary cutters: real chopping time, tree slots,
 * carrying limits and physical cache delivery all use the existing executor.
 * Automatic construction resumes from that same project after unloading.
 * This does not make tree-blocked ordinary placement legal or repair completed
 * legacy buildings. No direct build-order actors are silently reassigned. */
export function rivalSiteClearance(g:Game,u:Unit,b:Building){
 if(!isRivalTeam(u.team)||b.team!==u.team||b.hp<=0||b.build>=1||b.plannedCost)return false;
 const trees=g.state.trees.filter(n=>n.amount>0&&treeInsideBuilding(n,b));
 if(!trees.length)return false;
 // Never advance a roof through standing timber, even if its cutters cannot
 // currently reach the plot. Their carried goods stay with the owner.
 releaseConstructionWorker(g,u);
 if(u.carry>0||Object.values(u.itemCargo||{}).some(n=>(n||0)>0)){
  u.order='return';u.node=null;u.workReason='Delivering cargo before clearing this building plot';return true;
 }
 if(u.buildOrder!==undefined){u.workReason='Building plot needs ordinary cutters before construction';return true;}
 trees.sort((a,c)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(c.x-u.x,c.z-u.z));
 for(const tree of trees){
  const spot=g.nearestWalk(u,tree.x,tree.z);
  if(!spot||Math.hypot(spot.x-tree.x,spot.z-tree.z)>3.2||!g.workBoard.connected(g,u.x,u.z,spot.x,spot.z))continue;
  if(!reserveTreeWorker(g,tree,u))continue;
  u.order='gather';u.node=tree;u.job=null;u.jobLock=false;u.huntOnly=false;
  u.tx=spot.x;u.tz=spot.z;u.workReason='Felling trees before raising this building';return true;
 }
 u.workReason='Construction waiting for reachable tree cutters';return true;
}
