import type {Game} from './sim';
import type {Unit} from './types';
import {isDependent} from './settlement';

/** Stationed guards have finite capacity; the same guard cannot cover every camp. */
export function captiveGuardCoverage(g:Game){
 const coverage=new Set<number>();
 const captives=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.enslavedFrom!==undefined)
  .sort((a,b)=>(b.captivityUnrest||0)-(a.captivityUnrest||0)||a.id-b.id);
 const guards=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.enslavedFrom===undefined&&!isDependent(g,u)&&
  (u.militia||u.type==='spearman'||u.type==='archer')&&['idle','hold'].includes(u.order)&&u.carry===0&&
  !u.resting&&!u.shelterId&&!u.emergency&&!u.envoy&&!u.visit&&!u.scout&&!u.expedition&&!u.trade&&!u.tributeJourney);
 const assigned=new Map<number,number>();
 for(const u of captives){
  const guard=guards.filter(p=>(assigned.get(p.id)||0)<3&&Math.hypot(p.x-u.x,p.z-u.z)<18&&g.workBoard.connected(g,p.x,p.z,u.x,u.z))
   .sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
  if(guard){assigned.set(guard.id,(assigned.get(guard.id)||0)+1);coverage.add(u.id);}
 }
 return coverage;
}
export function captivityDescription(u:Unit,guarded:boolean){
 return `Resistance ${Math.round(u.captivityUnrest||0)}% · ${guarded?'guarded':'unguarded'} · hunger and forced work increase resistance`;
}
/** Resistance develops from actual conditions. Escapes move existing people and cargo. */
export function tickCaptivity(g:Game,dt:number){
 if(!Number.isFinite(dt)||dt<=0||!g.state.units.some(u=>u.team===0&&u.hp>0&&u.enslavedFrom!==undefined))return;
 const covered=captiveGuardCoverage(g);
 for(const u of g.state.units){
  if(u.team!==0||u.hp<=0||u.enslavedFrom===undefined)continue;
  const working=['gather','build'].includes(u.order);
  const hardship=(u.hunger||0)>30?.12:0;
  const rate=covered.has(u.id)?-.06+hardship:.05+(working?.1:0)+hardship+((u.fatigue||0)>.6?.05:0);
  u.captivityUnrest=Math.max(0,Math.min(100,(u.captivityUnrest||0)+rate*dt));
  if(u.captivityUnrest<100)continue;
  const origin=u.enslavedFrom,home=g.state.buildings.find(b=>b.team===origin&&b.type==='townhall'&&g.finished(b));
  if(!g.tribe(origin)?.alive||!home){
   u.enslavedFrom=undefined;u.captivityUnrest=undefined;
   g.banner('An enslaved resident refuses further forced service and joins as a free villager.',6);continue;
  }
  g.interruptMission(u);u.team=origin;u.enslavedFrom=undefined;u.captivityUnrest=undefined;u.selected=false;
  u.target=null;u.node=null;u.pillage=-1;u.attackDestination=null;u.job=null;u.jobLock=false;
  u.recalled=true;u.stationOnArrival=false;u.order='return';u.workReason='Escaping captivity — returning to the home settlement';
  g.workBoard.reset();g.banner(`An enslaved resident has escaped toward ${g.tribe(origin).name}, carrying what was in their hands.`,7);
 }
}
