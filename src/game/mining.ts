import type {Game} from './sim';
import type {Building,Unit} from './types';
import {GATHER} from './constants';
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
  const d=mountainDeposit(g,b);return d?`Excavation depth ${(d.dug/40).toFixed(1)} m · ${Math.floor(d.remaining)} stone in this seam · 2 miners maximum`:'Surface quarry improves nearby outcrop extraction';
}
export function digStone(g:Game,u:Unit,b:Building){
  const d=mountainDeposit(g,b);
  if(!d||d.remaining<=0){u.node=null;u.order=u.carry>0?'return':'idle';u.workReason='This stone seam is exhausted — prospect another slope';g.workBoard.reset();return;}
  const count=Math.min(d.remaining,d.quality>1.2?2:1);d.remaining-=count;d.dug+=count;
  u.carry+=count;u.carryType='stone';u.workReason=`Excavating the mountainside · ${(d.dug/40).toFixed(1)} m into the seam`;
  if(u.carry>=GATHER.stone.carry||d.remaining<=0)u.order='return';
  if(u.team===0)g.onSfx('chop');
}
