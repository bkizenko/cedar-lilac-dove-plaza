import type {Game} from './sim';
import type {Unit} from './types';
import {AGE_STAT,UNITS} from './constants';
import {isDependent} from './settlement';

function atStores(g:Game,u:Unit){
  return g.state.buildings.some(b=>b.team===u.team&&g.finished(b)&&['townhall','warehouse','barracks'].includes(b.type)&&Math.hypot(b.x-u.x,b.z-u.z)<20);
}
/** A travelling resident borrows one real weapon at home, never from remote stock. */
export function equipCaravan(g:Game,u:Unit){
  if(u.hp<=0||u.type!=='worker'||u.militia||isDependent(g,u)||!atStores(g,u))return false;
  const t=g.tribe(u.team),choice=t.spears>0?'spearman':t.bows>0?'archer':(t.blades||0)>0?'swordsman':null;
  if(!choice)return false;
  if(choice==='spearman')t.spears--;else if(choice==='archer')t.bows--;else t.blades!--;
  const d=UNITS[choice];u.type=choice;u.militia=true;u.caravanArmed=true;
  u.range=d.range;u.dmg=d.dmg*AGE_STAT[t.age];u.rof=d.rof;return true;
}
/** Finish a loan only after both resident and goods physically return. Death loses it. */
export function recoverCaravanEquipment(g:Game,u:Unit){
  if(!u.caravanArmed||u.hp<=0)return;
  if(!u.militia){u.caravanArmed=undefined;return;}
  if(u.emergency||u.visit||u.trade||u.carry>0)return;
  if(!atStores(g,u)){
    u.recalled=true;u.stationOnArrival=false;u.order='return';return;
  }
  const t=g.tribe(u.team);
  if(u.type==='spearman')t.spears++;else if(u.type==='archer')t.bows++;else if(u.type==='swordsman')t.blades=(t.blades||0)+1;
  const d=UNITS.worker;u.type='worker';u.militia=false;u.caravanArmed=undefined;
  u.range=d.range;u.dmg=d.dmg;u.rof=d.rof;u.order='idle';u.target=null;u.node=null;
  u.workReason='Home from trading — equipment returned, joining village work';
}

export function tradeJourney(u:Unit){return !!u.visit||!!u.trade||(u.carry>0&&u.tradeTeam>0);}
/** Dispatch one existing spare guard; escorting costs that resident's working time. */
export function sendTradeEscort(g:Game,carrierId:number){
 const carrier=g.state.units.find(u=>u.id===carrierId&&u.team===0&&u.hp>0&&tradeJourney(u));
 if(!carrier)return false;
 if(g.state.units.filter(u=>u.hp>0&&u.escortId===carrierId).length>=2){g.banner('This shipment already has two guards.',3);return false;}
 const guard=g.state.units.filter(u=>u!==carrier&&u.team===0&&u.hp>0&&u.militia&&!isDependent(g,u)&&u.carry===0&&
   !u.escortId&&!u.emergency&&!u.recalled&&!u.visit&&!u.trade&&!u.scout&&!u.expedition&&!u.envoy&&!u.foundingJourney&&
   !u.weaponWork&&!u.haulageWork&&!u.farmToolWork&&!u.studyCrop&&u.drill==null&&['idle','hold'].includes(u.order)&&
   !g.state.buildings.some(b=>b.team===0&&b.type==='cornerstone'&&g.finished(b)&&Math.hypot(u.x-b.x,u.z-b.z)<32)&&
   g.workBoard.connected(g,u.x,u.z,carrier.x,carrier.z))
   .sort((a,b)=>Math.hypot(a.x-carrier.x,a.z-carrier.z)-Math.hypot(b.x-carrier.x,b.z-carrier.z))[0];
 if(!guard){g.banner('Equip an available adult first. Frontier guards stay at their posts.',4);return false;}
 g.interruptMission(guard);guard.escortId=carrier.id;guard.order='move';guard.stationOnArrival=false;
 guard.workReason='Joining the trading party as an armed escort';g.banner('An armed guard is joining the shipment.',3);return true;
}
export function escortAI(g:Game,u:Unit,dt:number){
 if(u.escortId===undefined)return false;
 const carrier=g.state.units.find(p=>p.id===u.escortId&&p.hp>0&&p.team===u.team&&tradeJourney(p));
 if(!carrier||u.stuckT>12){
   u.escortId=undefined;u.recalled=true;u.stationOnArrival=true;u.order='return';u.stuckT=0;
   u.workReason=carrier?'Escort route blocked — returning home':'Shipment finished — guard returning home';return true;
 }
 u.target=null;u.node=null;u.workReason='Guarding the travelling trader';
 if(Math.hypot(u.x-carrier.x,u.z-carrier.z)<=5){u.order='hold';return true;}
 u.order='move';u.tx=carrier.x;u.tz=carrier.z;g.steer(u,dt);return true;
}
