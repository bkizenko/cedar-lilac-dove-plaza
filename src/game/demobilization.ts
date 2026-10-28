import type {Game} from './sim';
import type {Unit} from './types';
import {UNITS} from './constants';

function atStores(g:Game,u:Unit){
 return g.state.buildings.some(b=>b.team===u.team&&g.finished(b)&&['townhall','warehouse','barracks'].includes(b.type)&&Math.hypot(u.x-b.x,u.z-b.z)<20);
}
function threatened(g:Game,u:Unit){
 return !!u.emergency||g.state.units.some(e=>e.hp>0&&g.isFoe(u.team,e.team)&&Math.hypot(e.x-u.x,e.z-u.z)<25);
}
function finish(g:Game,u:Unit){
 if(!u.militia||u.carry>0||u.expedition||!atStores(g,u)||threatened(g,u))return false;
 const t=g.tribe(u.team);
 if(u.type==='swordsman')t.blades++;else if(u.type==='archer')t.bows++;else t.spears++;
 const d=UNITS.worker;
 Object.assign(u,{type:'worker',militia:false,range:d.range,dmg:d.dmg,rof:d.rof,order:'idle',huntOnly:false,target:null,node:null,pillage:-1});
 u.demobilizing=undefined;u.recalled=undefined;u.stationOnArrival=undefined;u.caravanArmed=undefined;u.escortId=undefined;u.attackDestination=null;
 u.workCheckAt=0;u.workReason='Stood down — returning to village work';g.workBoard.reset();
 return true;
}
export function standDownMilitia(g:Game,team=0){
 let ready=0,returning=0;
 for(const u of g.state.units){
  if(u.team!==team||!u.militia||u.hp<=0)continue;
  // Cancel explicit missions once, retaining carried cargo and paid projects.
  queueStandDown(g,u);
  if(finish(g,u))ready++;else returning++;
 }
 if(team===0)g.banner(ready+returning?`${ready} back at work; ${returning} returning to stand down. Weapons and carried supplies are kept.`:'No armed civilian militia to stand down.',5);
}
export function queueStandDown(g:Game,u:Unit,preserveWork=false){
 g.interruptMission(u);u.demobilizing=!!u.militia;u.recalled=true;u.stationOnArrival=!u.militia;
 u.target=null;u.node=null;u.pillage=-1;u.attackDestination=null;if(!preserveWork){u.job=null;u.jobLock=false;}u.huntOnly=false;u.order='move';
 u.workReason='Combat finished — returning with supplies to resume work';
}
/** Runs after emergency defense: retain weapons until immediate danger passes. */
export function demobilizationAI(g:Game,u:Unit,dt:number){
 if(u.returnAfterCombat&&!u.emergency&&(u.pillage<0||!g.nextPillage(u)))queueStandDown(g,u);
 if(!u.demobilizing)return false;
 if(!u.militia){u.demobilizing=undefined;u.stationOnArrival=false;return false;}
 if(finish(g,u))return false;
 u.recalled=true;u.stationOnArrival=false;g.workerAI(u,dt);
 if(finish(g,u))return true;
 if(!u.workReason?.includes('no reachable'))u.workReason='Standing down — bringing supplies and weapons home';
 return true;
}
