import {carryingCapacity} from "./haulage";
import type {Game} from './sim';
import type {Building,Unit} from './types';
import {isDependent} from "./settlement";
import {GATHER,QUARRY_R} from './constants';
/** A mountain quarry is a finite excavation, distinct from loose surface outcrops. */
export function mountainDeposit(g:Game,b:Building){
  if(b.type!=='quarry'||g.height(b.x,b.z)<10)return null;
  if(!b.excavation){
    const hash=Math.abs(Math.imul(Math.round(b.x)*73856093,Math.round(b.z)*19349663)^g.state.seed)>>>0;
    b.excavation={remaining:320+hash%881,dug:0,quality:.65+(hash%100)/100};
  }
  return b.excavation;
}
export function quarryAvailable(g:Game,b:Building){return (mountainDeposit(g,b)?.remaining||0)>0;}
export function quarryReport(g:Game,b:Building){
  const d=mountainDeposit(g,b);const active=g.state.units.filter(u=>u.team===b.team&&u.hp>0&&u.job==='stone'&&u.order==='gather'&&u.node&&Math.hypot(u.node.x-b.x,u.node.z-b.z)<=QUARRY_R).length;
  const loose=g.state.stones.filter(n=>n.amount>0&&Math.hypot(n.x-b.x,n.z-b.z)<=QUARRY_R).reduce((sum,n)=>sum+n.amount,0);
  return d?`Mountain seam: ${Math.floor(d.remaining)} stone · ${active}/2 miners · ${(d.dug/40).toFixed(1)} m dug · carried to stores`:`Surface outcrops: ${Math.floor(loose)} stone nearby · ${active} miners · assign miners to collect and carry it home`;
}
export function digStone(g:Game,u:Unit,b:Building){
  const d=mountainDeposit(g,b);
  if(!d||d.remaining<=0){u.node=null;u.order=u.carry>0?'return':'idle';u.workReason='This stone seam is exhausted — prospect another slope';g.workBoard.reset();return;}
  const count=Math.min(d.remaining,d.quality>1.2?2:1);d.remaining-=count;d.dug+=count;
  u.carry+=count;u.carryType='stone';u.workReason=`Excavating the mountainside · ${(d.dug/40).toFixed(1)} m into the seam`;
  if(u.carry>=carryingCapacity(u,"stone")||d.remaining<=0)u.order='return';
  if(u.team===0)g.onSfx('chop');
}

export function staffQuarry(g:Game,id:number){
  const b=g.state.buildings.find(b=>b.id===id&&b.team===0&&b.type==='quarry'&&g.finished(b));if(!b)return 0;
  let staffed=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.order==='gather'&&u.job==='stone'&&u.node&&Math.hypot(u.node.x-b.x,u.node.z-b.z)<=QUARRY_R).length,sent=0;
  const selected=g.selectedUnits(),pool=(selected.length?selected:g.state.units).filter(u=>u.team===0&&u.type==='worker'&&u.hp>0&&!isDependent(g,u)&&u.carry===0&&
    (selected.length||!u.emergency&&!u.scout&&!u.visit&&!u.expedition&&!u.envoy&&!u.foundingJourney&&!u.weaponWork&&!u.haulageWork&&!u.farmToolWork&&!u.studyCrop&&u.drill==null&&['idle','gather','hold'].includes(u.order)));
  for(const u of pool){
    if(staffed>=2)break;
    if(u.job==='stone'&&u.order==='gather'&&u.node&&Math.hypot(u.node.x-b.x,u.node.z-b.z)<=QUARRY_R)continue;
    const node=quarryAvailable(g,b)?b:g.state.stones.filter(n=>n.amount>0&&Math.hypot(n.x-b.x,n.z-b.z)<=QUARRY_R&&g.exploredAt(n.x,n.z)&&g.workBoard.connected(g,u.x,u.z,n.x,n.z)).sort((a,c)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(c.x-u.x,c.z-u.z))[0];
    if(!node||!g.workBoard.connected(g,u.x,u.z,node.x,node.z))continue;
    g.interruptMission(u);u.order='gather';u.job='stone';u.jobLock=true;u.huntOnly=false;u.node=node;u.gatherT=0;u.workReason='Mining stone for delivery to stores';staffed++;sent++;
  }
  g.workBoard.reset();g.banner(staffed?`${staffed}/2 miners assigned — stone reaches stores after hauling.`:'No reachable stone or available empty-handed adults. Surface quarries need outcrops; mountain quarries need a seam.',5);return sent;
}
