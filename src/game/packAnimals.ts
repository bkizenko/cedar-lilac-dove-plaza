import type {Game} from './sim';
import type {Unit} from './types';
import {isDependent} from './settlement';
import {rivalKnows} from './rivalDevelopment';
export const PACK_TAMING_SECONDS=60;
export function beginPackTaming(g:Game,buildingId:number,team=0,unitId?:number){
 const home=g.state.buildings.find(b=>b.id===buildingId&&b.team===team&&g.finished(b)&&['townhall','workshop'].includes(b.type));
 if(!home)return false;
 const people=g.state.units.filter(u=>u.team===team&&(unitId===undefined||u.id===unitId)&&(team===0||!u.buildOrder&&!u.jobLock)&&u.hp>0&&u.type==='worker'&&!u.militia&&!isDependent(g,u)&&!u.haulage&&u.carry===0&&!u.emergency&&!u.recalled&&!u.expedition&&!u.scout&&!u.visit&&!u.envoy&&!u.foundingJourney&&!u.tributeJourney&&!u.weaponWork&&!u.farmToolWork&&!u.haulageWork&&!u.studyCrop&&u.drill==null&&['idle','hold','gather'].includes(u.order))
  .sort((a,b)=>Number(b.selected)-Number(a.selected));
 for(const u of people){
  if(u.tamingWork?.paused){u.tamingWork.paused=false;u.order='hold';return true;}
  const animal=g.state.wildlife.filter(c=>c.species==='goat'&&c.hp>0&&(team===0?g.visibleAt(c.x,c.z):rivalKnows(g,team,c.x,c.z))&&Math.hypot(c.x-home.x,c.z-home.z)<220&&!g.state.units.some(p=>p.hp>0&&p.tamingWork?.animal===c.id)&&g.workBoard.connected(g,u.x,u.z,c.x,c.z))
   .sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
  if(!animal)continue;
  if(g.tribe(team).food<10||g.tribe(team).wood<2){if(team===0)g.banner('Taming needs 10 food and 2 logs for feed and a carrying harness',4);return false;}
  g.interruptMission(u);g.tribe(team).food-=10;g.tribe(team).wood-=2;
  u.tamingWork={animal:animal.id,progress:0};u.order='hold';u.node=null;u.target=null;
  if(team===0)g.banner('One adult is approaching a wild goat with feed. Taming and fitting its pack takes a minute.',5);return true;
 }
 if(team===0)g.banner('Explore to find a living wild goat and an available empty-handed adult with a clear route',5);return false;
}
export function packTamingAI(g:Game,u:Unit,dt:number){
 const work=u.tamingWork;if(!work||work.paused||u.order!=='hold'||u.type!=='worker'||u.militia||u.emergency)return false;
 const animal=g.state.wildlife.find(c=>c.id===work.animal&&c.hp>0&&c.species==='goat');
 if(!animal){u.tamingWork=undefined;u.order='idle';u.workReason='The goat is gone; taming stopped';return true;}
 if(g.state.weather==='storm')return false;
 if(Math.hypot(u.x-animal.x,u.z-animal.z)>2.4){
  u.tx=animal.x;u.tz=animal.z;g.steer(u,dt);u.workReason='Approaching a goat with feed';
  if(u.stuckT>8){work.paused=true;u.order='idle';u.workReason='Taming paused — goat is unreachable';}
  return true;
 }
 animal.vx=0;animal.vz=0;work.progress=Math.min(PACK_TAMING_SECONDS,work.progress+dt);
 u.facing=Math.atan2(animal.x-u.x,animal.z-u.z);u.workReason=`Taming a pack goat · ${Math.floor(work.progress/PACK_TAMING_SECONDS*100)}%`;
 if(work.progress>=PACK_TAMING_SECONDS){
  // Transfer this existing animal out of the wild population, without a carcass or respawn slot.
  g.state.wildlife=g.state.wildlife.filter(c=>c.id!==animal.id);
  u.haulage='pack';u.tamingWork=undefined;u.order='return';u.workReason='Pack goat ready — carrying capacity doubled';
  g.workBoard.reset();if(u.team===0)g.banner('Pack goat tamed. Its handler carries twice as much without a sled’s hauling penalty.',5);
 }
 return true;
}


/** A handler's death releases the animal once, rather than duplicating or erasing it. */
export function releasePackAnimal(g:Game,u:Unit){
 if(u.hp>0||u.haulage!=='pack')return;
 u.haulage=undefined;
 g.state.wildlife.push({id:g.id(),species:'goat',x:u.x,y:g.height(u.x,u.z),z:u.z,facing:u.facing,vx:0,vz:0,wanderT:0,hp:24,maxHp:24,fly:0,scale:1,grazing:{x:u.x,z:u.z}});
}
