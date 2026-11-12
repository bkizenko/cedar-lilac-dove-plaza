import {herdRules} from './animalSpecies';
import {packAnimalFrom,PACK_ANIMAL_RULES,packAnimalPosition} from './packAnimalState';
import {foodInventory,takeFoodLot} from './pantry';
import {supplyApproach,supplyReached} from './campAnchor';
import type {Game} from './sim';
import type {Unit} from './types';
import {isDependent} from './settlement';
import {rivalKnows} from './rivalDevelopment';
export const PACK_TAMING_SECONDS=60;
export function beginPackTaming(g:Game,buildingId:number,team=0,unitId?:number){
 const home=g.state.buildings.find(b=>b.id===buildingId&&b.team===team&&g.finished(b)&&['townhall','workshop'].includes(b.type));
 if(!home)return false;
 const people=g.state.units.filter(u=>u.team===team&&(unitId===undefined||u.id===unitId)&&(team===0||!u.buildOrder&&!u.jobLock)&&u.hp>0&&u.type==='worker'&&!u.militia&&!isDependent(g,u)&&!u.haulage&&u.carry===0&&!u.emergency&&!u.recalled&&!u.expedition&&!u.scout&&!u.visit&&!u.envoy&&!u.foundingJourney&&!u.tributeJourney&&!u.weaponWork&&!u.farmToolWork&&!u.haulageWork&&!u.copperStudy&&!u.studyCrop&&!u.husbandryWork&&u.drill==null&&['idle','hold','gather'].includes(u.order))
  .sort((a,b)=>Number(b.selected)-Number(a.selected));
 for(const u of people){
  if(u.tamingWork?.pen!==undefined)continue;
  if(u.tamingWork?.paused){u.tamingWork.paused=false;u.order='hold';return true;}
  if(u.tamingWork)continue; // Keep the animal, feed and progress already reserved by this handler.
  const animal=g.state.wildlife.filter(c=>c.species==='goat'&&c.hp>0&&(team===0?g.visibleAt(c.x,c.z):rivalKnows(g,team,c.x,c.z))&&Math.hypot(c.x-home.x,c.z-home.z)<220&&!g.state.units.some(p=>p.hp>0&&p.tamingWork?.animal===c.id)&&g.workBoard.connected(g,u.x,u.z,c.x,c.z))
   .sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
  if(!animal)continue;
  if(g.tribe(team).food<10||g.tribe(team).wood<2){if(team===0)g.banner('Taming needs 10 food and 2 logs for feed and a carrying harness',4);return false;}
  g.interruptMission(u);g.tribe(team).food-=10;g.tribe(team).wood-=2;
  u.tamingWork={animal:animal.id,progress:0};u.order='hold';u.node=null;u.target=null;g.workBoard.reset();
  if(team===0)g.banner('One adult is approaching a wild goat with feed. Taming and fitting its pack takes a minute.',5);return true;
 }
 if(team===0)g.banner('Explore to find a living wild goat and an available empty-handed adult with a clear route',5);return false;
}
export function packTamingAI(g:Game,u:Unit,dt:number){
 const work=u.tamingWork;if(!work||work.pen!==undefined||work.paused||u.order!=='hold'||u.type!=='worker'||u.militia||u.emergency)return false;
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
  u.packAnimal={...packAnimalFrom(animal),packHarness:{version:1,preparedAt:g.state.time,wood:2,workSeconds:PACK_TAMING_SECONDS}};
  u.haulage='pack';u.tamingWork=undefined;u.order='return';u.workReason='Pack goat ready — carrying capacity doubled';
  g.workBoard.reset();if(u.team===0)g.banner('Pack goat tamed. Its handler carries twice as much without a sled’s hauling penalty.',5);
 }
 return true;
}


/** A handler's death releases the animal once, rather than duplicating or erasing it. */
export function releasePackAnimal(g:Game,u:Unit){
 if(u.hp>0||u.haulage!=='pack')return;
 const animal=u.packAnimal;u.packAnimal=undefined;u.haulage=undefined;
 if(!animal||animal.hp<=0||g.state.wildlife.some(c=>c.id===animal.id)||g.state.livestock?.some(c=>c.id===animal.id))return;
 const position=packAnimalPosition(u);
 g.state.wildlife.push({...animal,id:animal.id,species:animal.species??'goat',x:position.x,y:g.height(position.x,position.z),z:position.z,facing:u.facing,vx:0,vz:0,wanderT:0,hp:animal.hp,maxHp:animal.maxHp,fly:0,scale:animal.scale,grazing:{x:u.x,z:u.z}});
}

/** Care is local to a real cache entrance. Remote stores cannot feed an expedition. */
export function tickPackAnimals(g:Game,dt:number){
 if(!(dt>0)||!Number.isFinite(dt))return;
 for(const u of g.state.units){
  const a=u.packAnimal;if(u.hp<=0||u.haulage!=='pack'||!a||a.hp<=0)continue;
  a.hunger=Math.min(100,(a.hunger??0)+PACK_ANIMAL_RULES.hungerPerSecond*dt);
  if(g.state.survivalVersion===1)a.thirstSeconds=(a.thirstSeconds??0)+dt;
  // Aboard hulls, prisoners and travelling bodies cannot draw remote communal supplies.
  if(u.boat||u.prisoner)continue;
  const drop=g.nearestDrop(u.x,u.z,u.team);if(!drop)continue;
  const reach=drop.kind==='camp'?drop.radius+1:Math.hypot(drop.w,drop.d)/2+4;
  if(Math.hypot(u.x-drop.x,u.z-drop.z)>reach)continue;
  const approach=supplyApproach(g,u,drop);if(!approach||!supplyReached(g,u,drop,approach))continue;
  const lots=foodInventory(g.tribe(u.team)),need=PACK_ANIMAL_RULES.feedPerSecond*dt*herdRules(a.species??'goat').careMultiplier;let fed=0;
  if(a.hunger>0)for(const kind of ['grain','pulses','tubers','berries','provisions'] as const){
   const n=Math.min(lots[kind],need-fed);if(n>0&&takeFoodLot(g,u.team,kind,n)){fed+=n;a.foodConsumed=(a.foodConsumed??0)+n;}if(fed>=need-1e-10)break;
  }
  if(fed>0)a.hunger=Math.max(0,a.hunger-(PACK_ANIMAL_RULES.hungerPerSecond+.3)*dt*Math.min(1,fed/need));
  const stock=g.tribe(u.team).survival;
  if(g.state.survivalVersion===1&&stock){const demand=PACK_ANIMAL_RULES.waterPerSecond*dt*herdRules(a.species??'goat').careMultiplier,n=Math.min(stock.waterLiters,demand);
   stock.waterLiters-=n;stock.waterConsumedLiters+=n;a.waterConsumedLiters=(a.waterConsumedLiters??0)+n;
   a.thirstSeconds=Math.max(0,(a.thirstSeconds??0)-2*dt*n/demand);
  }
 }
}
