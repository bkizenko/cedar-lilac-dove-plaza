import type {Game} from './sim';
import type {Unit,Building} from './types';
import {isDependent} from './settlement';
import {queueStandDown} from './demobilization';

function dispatch(u:Unit,b:Building){
 u.massRaidTarget=undefined;u.returnAfterCombat=true;u.recalled=undefined;u.demobilizing=undefined;
 u.order='attackmove';u.pillage=b.team;u.target=null;u.node=null;u.stationOnArrival=false;
 u.tx=b.x;u.tz=b.z;u.attackDestination={x:b.x,z:b.z};u.workReason='Mass raid — marching to the rival town hall';
}
export function massRaid(g:Game,buildingId:number){
 const b=g.state.buildings.find(b=>b.id===buildingId&&b.team!==0&&b.type==='townhall'&&b.hp>0&&!b.plannedCost);
 if(!b||!g.exploredAt(b.x,b.z)){g.banner('Discover a living rival town hall first.',4);return 0;}
 const people=g.state.units.filter(u=>u.team===0&&u.hp>0&&!isDependent(g,u)&&(u.militia||!['worker','leader'].includes(u.type)));
 for(const u of people){
  g.interruptMission(u);u.huntOnly=false;u.jobLock=false;u.pillage=-1;u.target=null;u.node=null;
  u.massRaidTarget=b.id;
  if(u.carry>0||u.expedition){u.recalled=true;u.stationOnArrival=false;u.order='return';u.workReason='Unloading supplies before joining the mass raid';}
  else dispatch(u,b);
 }
 g.banner(people.length?`${people.length} armed residents ordered to raid ${g.tribe(b.team).name}. Loaded carriers unload first; civilians return to work afterward.`:'No armed adults are available. Equip villagers first.',6);
 return people.length;
}
export function massRaidAI(g:Game,u:Unit,dt:number){
 if(u.massRaidTarget===undefined)return false;
 const b=g.state.buildings.find(b=>b.id===u.massRaidTarget&&b.team!==u.team&&b.hp>0);
 if(!b){queueStandDown(g,u);return false;}
 if(u.carry>0||u.expedition){u.recalled=true;u.stationOnArrival=false;g.workerAI(u,dt);return true;}
 dispatch(u,b);return false;
}
