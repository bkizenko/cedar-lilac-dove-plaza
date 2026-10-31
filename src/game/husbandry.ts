import {supplyApproach,supplyReached,type SupplyDrop} from './campAnchor';
import type {Game} from './sim';
import type {Building,Livestock,Unit} from './types';
import {hasTaskCommitment} from './workCommitments';
import {isDependent,calendar} from './settlement';
import {carryingCapacity} from './haulage';
import {foodInventory,receiveFood} from './pantry';
import {carcassAvailable} from './hunting';
export const HERD={capacity:8,tamingFood:6,tamingSeconds:60,maturity:300,gestation:240,lactation:900};
export const penAnimals=(g:Game,pen:number)=> (g.state.livestock||[]).filter(a=>a.pen===pen&&a.hp>0);
const penAt=(g:Game,id:number,team=0)=>g.state.buildings.find(b=>b.id===id&&b.team===team&&b.type==='pen'&&g.finished(b));
function available(g:Game,u:Unit,except?:'husbandryWork'|'tamingWork') {
 return u.team===0&&u.hp>0&&u.type==='worker'&&!u.militia&&!isDependent(g,u)&&u.enslavedFrom===undefined&&
  !u.emergency&&!u.recalled&&!u.expedition&&!u.scout&&!u.visit&&!u.envoy&&!u.foundingJourney&&!u.tributeJourney&&
  !u.buildOrder&&u.drill==null&&!u.haulage&&u.carry===0&&!hasTaskCommitment(u,except)&&['idle','hold','gather','return'].includes(u.order);
}
function keeper(g:Game,pen:number){return g.state.units.find(u=>u.hp>0&&u.husbandryWork?.pen===pen&&u.husbandryWork.action==='care'&&!u.husbandryWork.paused);}
export function beginHerdTaming(g:Game,penId:number) {
 const pen=penAt(g,penId);if(!pen)return false;
 if((g.state.livestock?.length||0)>=96){g.banner('Care for the existing herds before capturing more animals',4);return false;}
 const paused=g.state.units.find(u=>u.tamingWork?.pen===penId&&u.tamingWork.paused&&available(g,u,'tamingWork'));
 if(paused){paused.tamingWork!.paused=false;paused.order='hold';return true;}
 const reserved=g.state.units.filter(u=>u.hp>0&&u.tamingWork?.pen===penId).length;
 if(penAnimals(g,penId).length+reserved>=HERD.capacity){g.banner('This pen already has eight animals or reserved places',4);return false;}
 for(const u of [...g.state.units].sort((a,b)=>Number(b.selected)-Number(a.selected))){
  if(!available(g,u,'tamingWork'))continue;
  if(u.tamingWork?.pen===penId&&u.tamingWork.paused){u.tamingWork.paused=false;u.order='hold';return true;}
  if(u.tamingWork)continue;
  const animal=g.state.wildlife.filter(a=>a.hp>0&&a.species==='goat'&&g.visibleAt(a.x,a.z)&&
   Math.hypot(a.x-pen.x,a.z-pen.z)<220&&!g.state.units.some(p=>p.hp>0&&p.tamingWork?.animal===a.id)&&
   g.workBoard.connected(g,u.x,u.z,a.x,a.z)&&g.workBoard.connected(g,a.x,a.z,pen.x,pen.z))
   .sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
  if(!animal)continue;
  if(g.tribe(0).food<HERD.tamingFood){g.banner('Bring six food for taming',4);return false;}
  g.interruptMission(u);g.tribe(0).food-=HERD.tamingFood;
  u.tamingWork={animal:animal.id,pen:penId,progress:0};u.order='hold';u.node=null;u.target=null;g.workBoard.reset();
  g.banner('A handler is approaching a wild goat, then will lead it to the pen',4);return true;
 }
 g.banner('Find a living wild goat and a free adult with a clear route to this pen',5);return false;
}
export function assignHusbandry(g:Game,penId:number,action:'care'|'slaughter'|'pack'='care') {
 const pen=penAt(g,penId);if(!pen)return false;
 if(action==='care'&&keeper(g,penId)){g.banner('This pen already has a keeper',3);return false;}
 const animal=action==='care'?undefined:penAnimals(g,penId).filter(a=>Math.hypot(a.x-pen.x,a.z-pen.z)<7&&g.state.time-a.born>=HERD.maturity&&
  !g.state.units.some(u=>u.hp>0&&u.husbandryWork?.animal===a.id)).sort((a,b)=>Number(a.sex==='female')-Number(b.sex==='female'))[0];
 if(action!=='care'&&!animal){g.banner('No unreserved adult goat in this pen',4);return false;}
 const u=[...g.state.units].sort((a,b)=>Number(b.selected)-Number(a.selected)).find(u=>available(g,u,'husbandryWork')&&
  (!u.husbandryWork||u.husbandryWork.paused)&&g.workBoard.connected(g,u.x,u.z,pen.x,pen.z));
 if(!u){g.banner('Choose a free empty-handed adult for this pen',4);return false;}
 g.interruptMission(u);u.husbandryWork={pen:penId,action,animal:animal?.id,phase:'pen',progress:0};u.order='hold';u.node=null;u.target=null;g.workBoard.reset();return true;
}
function atBuilding(g:Game,u:Unit,b:SupplyDrop,dt:number) {
 const spot=supplyApproach(g,u,b);if(!spot){u.workReason='No clear approach to the pen or store';return false;}
 u.tx=spot.x;u.tz=spot.z;if(!supplyReached(g,u,b,spot)){g.steer(u,dt);return false;}return true;
}
function animalStep(g:Game,a:Livestock,handler:Unit,x:number,z:number,dt:number) {
 const actor:Unit={...handler,id:a.id,x:a.x,y:a.y,z:a.z,vx:a.vx,vz:a.vz,facing:a.facing,r:.35,speed:2.8,
  tx:x,tz:z,hp:a.hp,maxHp:a.maxHp,carry:0,haulage:undefined,boat:undefined,packAnimal:undefined,stuckT:a.stuckT||0};
 g.steer(actor,dt);
 a.x=actor.x;a.y=actor.y;a.z=actor.z;a.vx=actor.vx;a.vz=actor.vz;a.facing=actor.facing;a.stuckT=actor.stuckT;
}
function finish(g:Game,u:Unit) {u.tamingWork=undefined;u.husbandryWork=undefined;u.order='idle';u.node=null;g.invalidateRoute(u);g.workBoard.reset();}
function takeFeed(g:Game,limit:number) {
 const t=g.tribe(0),lots=foodInventory(t);let taken=0;
 for(const kind of ['grain','pulses','tubers','berries','provisions'] as const){const n=Math.min(lots[kind],limit-taken);lots[kind]-=n;taken+=n;}
 t.food=Math.max(0,t.food-taken);t.foodLots=lots;return taken;
}
export function husbandryAI(g:Game,u:Unit,dt:number) {
 const tame=u.tamingWork;
 if(tame?.pen!==undefined&&!tame.paused&&u.order==='hold'&&!u.emergency){
  const pen=penAt(g,tame.pen,u.team);if(!pen){finish(g,u);return true;}
  let a=g.state.livestock?.find(a=>a.id===tame.animal&&a.hp>0);
  if(!a){
   const wild=g.state.wildlife.find(a=>a.id===tame.animal&&a.hp>0&&a.species==='goat');
   if(!wild){finish(g,u);u.workReason='The goat is gone';return true;}
   u.workReason='Approaching a goat with feed';
   if(Math.hypot(u.x-wild.x,u.z-wild.z)>2.4){u.tx=wild.x;u.tz=wild.z;g.steer(u,dt);return true;}
   wild.vx=wild.vz=0;tame.progress=Math.min(60,tame.progress+dt);u.workReason=`Taming a herd goat · ${Math.floor(tame.progress/60*100)}%`;
   if(tame.progress<60)return true;
   if(penAnimals(g,pen.id).length>=HERD.capacity){tame.paused=true;u.order='idle';u.workReason='Pen full — taming paused';return true;}
   a={...wild,team:u.team,pen:pen.id,sex:wild.id%2?'female':'male',born:g.state.time-HERD.maturity,tamedAt:g.state.time,hunger:5,milk:0,pregnancy:0};
   (g.state.livestock??=[]).push(a);
   // Existing hunters may still hold a reference to the former wild object.
   // Retire it without a carcass so capture cannot also create a second meal.
   wild.hp=0;wild.carcass=undefined;
   for(const hunter of g.state.units)if(hunter.node===wild){hunter.node=null;if(hunter.order==='gather')hunter.order='idle';}
   g.state.wildlife=g.state.wildlife.filter(c=>c.id!==a!.id);
  }
  u.workReason='Leading a goat back to its pen';
  if(Math.hypot(a.x-u.x,a.z-u.z)>4){animalStep(g,a,u,u.x,u.z,dt);return true;}
  u.tx=pen.x;u.tz=pen.z;g.steer(u,dt);animalStep(g,a,u,u.x,u.z,dt);
  if(Math.hypot(a.x-pen.x,a.z-pen.z)<3.5){
   finish(g,u);if(!keeper(g,pen.id)){u.husbandryWork={pen:pen.id,action:'care',phase:'pen',progress:0};u.order='hold';}
   g.banner('Goat brought home. A fed breeding pair can raise kids; mothers provide milk.',5);
  }
  return true;
 }
 const w=u.husbandryWork;if(!w||w.paused||u.order!=='hold'||u.emergency)return false;
 const pen=penAt(g,w.pen,u.team);if(!pen){finish(g,u);return true;}
 const pasture=pen.pasture??={condition:1,feed:0,care:0};
 const stray=w.action==='care'&&penAnimals(g,pen.id).find(a=>Math.hypot(a.x-pen.x,a.z-pen.z)>8&&!g.state.units.some(p=>p.hp>0&&p.tamingWork?.animal===a.id&&!p.tamingWork.paused));
 if(stray&&u.carry===0){u.tamingWork={animal:stray.id,pen:pen.id,progress:60};u.husbandryWork=undefined;return true;}
 if(w.phase==='deliver'||w.phase==='fetch') {
  const drop=g.nearestDrop(u.x,u.z,u.team);
  u.workReason=w.phase==='deliver'?'Carrying herd produce to stores':'Collecting plant food for the herd';
  if(!drop||!atBuilding(g,u,drop,dt))return true;
  if(w.phase==='deliver'){
   if(u.carryType==='food'&&u.carry>0)receiveFood(g,u.team,u.carry,u.carryFood);
   u.carry=0;u.carryType=null;u.carryFood=undefined;w.phase='pen';
   if(w.action==='slaughter'){finish(g,u);return true;}
  }else{
   const feed=takeFeed(g,Math.min(8,carryingCapacity(u,'food')));
   if(!feed){u.workReason='Herd feed needs grain, roots, berries or provisions';return true;}
   u.carry=feed;u.carryType='food';u.carryFood='provisions';w.phase='feed';
  }
  return true;
 }
 u.workReason=w.action==='care'?'Tending the herd':w.action==='pack'?'Fitting a pack harness':'Preparing a goat for meat';
 if(!atBuilding(g,u,pen,dt))return true;
 if(w.phase==='feed'){
  if(u.carryType==='food'&&u.carry>0)pasture.feed=Math.min(100,pasture.feed+u.carry);
  u.carry=0;u.carryType=null;u.carryFood=undefined;w.phase='pen';return true;
 }
 if(w.action!=='care') {
  const a=g.state.livestock?.find(a=>a.id===w.animal&&a.hp>0&&a.pen===pen.id);
  if(!a){finish(g,u);return true;}
  w.progress+=dt;if(w.progress<30)return true;
  if(w.action==='pack'){
   if(g.tribe(u.team).wood<2){u.workReason='Harness needs two logs';return true;}
   g.tribe(u.team).wood-=2;u.packAnimal={id:a.id,hp:a.hp,maxHp:a.maxHp,scale:a.scale};u.haulage='pack';
   g.state.livestock=g.state.livestock!.filter(c=>c.id!==a.id);finish(g,u);u.order='return';g.banner('A herd goat is now carrying packs for its handler',4);
  }else{
   a.hp=0;a.carcass={meat:16,diedAt:g.state.time};
   const amount=Math.min(carryingCapacity(u,'food'),a.carcass.meat);a.carcass.meat-=amount;
   u.carry=amount;u.carryType='food';u.carryFood='meat';w.phase='deliver';
  }
  return true;
 }
 pasture.care=Math.min(1,pasture.care+dt*.012);w.progress+=dt;
 if((calendar(g).phase===3||pasture.condition<.2)&&pasture.feed<1&&penAnimals(g,pen.id).length){w.phase='fetch';return true;}
 if(w.progress>=30){
  w.progress=0;
  const carcass=g.state.livestock?.find(a=>a.pen===pen.id&&carcassAvailable(g,a));
  if(carcass?.carcass){const n=Math.min(carryingCapacity(u,'food'),carcass.carcass.meat);carcass.carcass.meat-=n;u.carry=n;u.carryType='food';u.carryFood='meat';w.phase='deliver';return true;}
  const animals=penAnimals(g,pen.id);let milk=0,room=carryingCapacity(u,'food');
  if(animals.reduce((n,a)=>n+a.milk,0)<1)return true;
  for(const a of animals){const n=Math.min(a.milk,room-milk);milk+=n;a.milk-=n;}
  if(milk>=1){u.carry=milk;u.carryType='food';u.carryFood='milk';w.phase='deliver';}
 }
 return true;
}
export function tickHusbandry(g:Game,dt:number) {
 if(!g.state.livestock?.length)return;
 const winter=calendar(g).phase===3;
 for(const pen of g.state.buildings.filter(b=>b.type==='pen'&&g.finished(b))){
  const herd=penAnimals(g,pen.id),p=pen.pasture??={condition:1,feed:0,care:0};
  const incoming=g.state.units.filter(u=>u.hp>0&&u.tamingWork?.pen===pen.id&&!g.state.livestock!.some(a=>a.id===u.tamingWork!.animal)).length;
  p.care=Math.max(0,p.care-dt*.001);p.condition=Math.max(0,Math.min(1,p.condition+dt*((winter?.000005:.00015)-herd.length*.000065)));
  for(const a of herd){
   const arrived=Math.hypot(a.x-pen.x,a.z-pen.z)<7;
   const grazing=arrived&&!winter&&p.condition>.18,feedNeed=.012*dt;
   const fed=grazing||(arrived&&p.feed>=feedNeed);if(!grazing&&fed)p.feed-=feedNeed;
   a.hunger=Math.max(0,Math.min(100,a.hunger+dt*(fed?-.3:.055)));
   if(a.hunger>80)a.hp=Math.max(0,a.hp-dt*.08);else if(fed&&p.care>.2)a.hp=Math.min(a.maxHp,a.hp+dt*.015);
   const adult=g.state.time-a.born>=HERD.maturity;
   if(a.hp<=0){a.carcass={meat:8,diedAt:g.state.time};continue;}
   const handler=g.state.units.find(u=>u.hp>0&&u.tamingWork?.animal===a.id&&u.tamingWork.pen===pen.id&&!u.tamingWork.paused);
   if(!handler&&Math.hypot(a.x-pen.x,a.z-pen.z)<12){
    a.wanderT-=dt;if(a.wanderT<=0){a.wanderT=3+(a.id%5);a.facing+=1.4;}
    const x=a.x+Math.sin(a.facing)*dt*.35,z=a.z+Math.cos(a.facing)*dt*.35;
    if(Math.abs(x-pen.x)<pen.w*.32&&Math.abs(z-pen.z)<pen.d*.32&&g.walkable(x,z)){a.x=x;a.z=z;a.y=g.height(x,z);}else a.facing+=Math.PI;
   }
   if(arrived&&a.sex==='female'&&adult&&a.hunger<30&&p.care>.2){
    if(herd.some(m=>m.sex==='male'&&m.hp>0&&Math.hypot(m.x-pen.x,m.z-pen.z)<7&&g.state.time-m.born>=HERD.maturity)&&herd.length+incoming<HERD.capacity)a.pregnancy=Math.min(HERD.gestation,a.pregnancy+dt);
    if(a.pregnancy>=HERD.gestation&&penAnimals(g,pen.id).length+incoming<HERD.capacity&&(g.state.livestock?.length||0)<96){
     a.pregnancy=0;a.lactatingUntil=g.state.time+HERD.lactation;
     const id=g.id();g.state.livestock!.push({...a,id,sex:id%2?'female':'male',born:g.state.time,tamedAt:g.state.time,milk:0,pregnancy:0,lactatingUntil:0,hp:a.maxHp,hunger:5,scale:.6});
     if(a.team===0)g.banner('A kid was born in the animal pen',4);
    }
    if((a.lactatingUntil||0)>g.state.time)a.milk=Math.min(6,a.milk+dt*.025);
   }
   a.scale=.6+.4*Math.min(1,(g.state.time-a.born)/HERD.maturity);
  }
 }
 // A destroyed/abandoned pen releases actual surviving animals, with identity intact.
 for(const a of g.state.livestock){
  if(a.hp>0&&!penAt(g,a.pen,a.team)){
   if(!g.state.wildlife.some(c=>c.id===a.id))g.state.wildlife.push({id:a.id,species:'goat',x:a.x,y:a.y,z:a.z,facing:a.facing,vx:0,vz:0,wanderT:0,hp:a.hp,maxHp:a.maxHp,fly:0,scale:a.scale,grazing:{x:a.x,z:a.z}});
   a.hp=0;a.carcass=undefined;
  }
 }
 g.state.livestock=g.state.livestock.filter(a=>a.hp>0||carcassAvailable(g,a));
}
