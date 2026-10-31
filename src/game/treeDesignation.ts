import type {Game} from './sim';
import {hasTaskCommitment} from './workCommitments';
import {isDependent} from './settlement';
/** Explicit tree designations remain usable with automation off. Existing paid,
 * military, carrying and emergency work always keeps its owner. */
export function assignMarkedTrees(g:Game,ids:number[]):number {
 if(g.state.autoWorkEnabled!==false)return 0;
 const selected=g.state.units.filter(u=>u.selected),candidates=(selected.length?selected:g.state.units).filter(u=>u.team===0&&u.hp>0&&u.type==='worker'&&!u.militia&&!u.prisoner&&!isDependent(g,u)&&!hasTaskCommitment(u)&&!u.emergency&&!u.recalled&&!u.boat&&!u.expedition&&!u.scout&&!u.visit&&!u.envoy&&!u.foundingJourney&&u.carry===0&&['hold','idle'].includes(u.order));
 const trees=g.state.trees.filter(n=>ids.includes(n.id)&&g.chopMarks.has(n.id)&&n.amount>0);let assigned=0;
 for(const u of candidates.slice(0,4)){
  const tree=trees.filter(n=>g.state.units.filter(p=>p.hp>0&&p.node===n&&p.order==='gather').length<2&&g.workBoard.connected(g,u.x,u.z,n.x,n.z)).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
  if(!tree)continue;
  for(const p of g.state.units)p.selected=p===u;
  g.issueGather(tree);if(u.node===tree&&u.order==='gather')assigned++;
 }
 for(const p of g.state.units)p.selected=selected.includes(p);
 return assigned;
}
export function projectedTreeInBox(project:(x:number,y:number,z:number)=>{x:number;y:number;behind:boolean},tree:{x:number;y:number;z:number;scale:number},box:{minx:number;maxx:number;miny:number;maxy:number}):boolean {
 const points=[project(tree.x,tree.y+.5,tree.z),project(tree.x,tree.y+Math.max(2,tree.scale*5),tree.z)].filter(p=>!p.behind);
 if(!points.length)return false;
 const x=points[0].x,miny=Math.min(...points.map(p=>p.y)),maxy=Math.max(...points.map(p=>p.y));
 return x>=box.minx&&x<=box.maxx&&maxy>=box.miny&&miny<=box.maxy;
}
