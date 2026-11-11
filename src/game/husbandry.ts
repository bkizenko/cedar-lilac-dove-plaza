import {SHEEP_RULES,growFleece,newFleece} from './sheep';
import{penWaterWorkAI,penNeedsWater,reconcilePenWater,drinkPenWater,releaseHusbandryKeeper}from'./penWater';
import {PEN_RULES,insidePen,penFeedCapacity} from './penGeometry';
import {surveyPenPasture,penPastureState,penPastureReport} from './penPasture';
import {supplyApproach,supplyReached,type SupplyDrop} from './campAnchor';
import type {Game} from './sim';
import type {Building,Livestock,Unit} from './types';
import {hasTaskCommitment} from './workCommitments';
import {isDependent,calendar} from './settlement';
import {carryingCapacity} from './haulage';
import {foodInventory,receiveFood} from './pantry';
import {carcassAvailable} from './hunting';
import {animalProcessingEnabled,deliverProductionCargo,harvestAnimalMaterials} from './production';
export const HERD={capacity:8,tamingFood:6,tamingSeconds:60,searchRadiusMeters:220,maturity:300,gestation:240,lactation:900};
export const penAnimals=(g:Game,pen:number)=> (g.state.livestock||[]).filter(a=>a.pen===pen&&a.hp>0);
const penAt=(g:Game,id:number,team=0)=>g.state.buildings.find(b=>b.id===id&&b.team===team&&b.type==='pen'&&g.finished(b));
function available(g:Game,u:Unit,except?:'husbandryWork'|'tamingWork',searchPen?:number) {
 const searching=searchPen!==undefined&&u.goatSearchPen===searchPen&&u.order==='explore';
 const ownTamingPack=except==='tamingWork'&&!!u.tamingWork&&!!u.expedition;
 return u.team===0&&u.hp>0&&u.type==='worker'&&!u.militia&&!isDependent(g,u)&&u.enslavedFrom===undefined&&
  !u.emergency&&!u.recalled&&(!u.expedition||searching||ownTamingPack)&&!u.scout&&!u.visit&&!u.envoy&&!u.foundingJourney&&!u.tributeJourney&&
  !u.buildOrder&&u.drill==null&&(!u.haulage||(searching||ownTamingPack)&&['sled','cart','pack'].includes(u.haulage))&&u.carry===0&&
  (except!=='tamingWork'||!Object.values(u.itemCargo||{}).some(n=>n>0)&&(!u.jobLock||u.foodRole===true))&&!hasTaskCommitment(u,except)&&(searching||['idle','hold','gather','return'].includes(u.order));
}
function keeper(g:Game,pen:number){return g.state.units.find(u=>u.hp>0&&u.husbandryWork?.pen===pen&&u.husbandryWork.action==='care'&&!u.husbandryWork.paused);}
export function beginHerdTaming(g:Game,penId:number,unitId?:number,species:'goat'|'sheep'='goat') {
 const pen=penAt(g,penId);if(!pen)return false;
 const speciesOf=(id:number)=>g.state.wildlife.find(a=>a.id===id)?.species||g.state.livestock?.find(a=>a.id===id)?.species;
 const paused=g.state.units.find(u=>(unitId===undefined||u.id===unitId)&&u.tamingWork?.pen===penId&&speciesOf(u.tamingWork.animal)===species&&u.tamingWork.paused&&available(g,u,'tamingWork'));
 const returningOwned=paused&&(g.state.livestock||[]).some(a=>a.id===paused.tamingWork!.animal&&a.hp>0);
 if(!returningOwned&&(g.state.livestock?.length||0)>=PEN_RULES.maximumAnimalsTotal){g.banner('Care for the existing herds before capturing more animals',4);return false;}
 if(paused){paused.tamingWork!.paused=false;paused.order='hold';return true;}
 const owned=new Set((g.state.livestock||[]).filter(a=>a.hp>0).map(a=>a.id));
 const reserved=g.state.units.filter(u=>u.hp>0&&u.tamingWork?.pen===penId&&!owned.has(u.tamingWork.animal)).length;
 if(penAnimals(g,penId).length+reserved>=surveyPenPasture(g,pen).eligibleCapacity){g.banner('This enclosure has no unreserved usable places — enlarge it or restore dry pasture',4);return false;}
 for(const u of [...g.state.units].sort((a,b)=>Number(b.selected)-Number(a.selected))){
  if(unitId!==undefined&&u.id!==unitId||!available(g,u,'tamingWork',penId))continue;
  if(u.tamingWork?.pen===penId&&speciesOf(u.tamingWork.animal)===species&&u.tamingWork.paused){u.tamingWork.paused=false;u.order='hold';return true;}
  if(u.tamingWork)continue;
  const animal=g.state.wildlife.filter(a=>a.hp>0&&a.species===species&&g.visibleAt(a.x,a.z)&&
   Math.hypot(a.x-pen.x,a.z-pen.z)<HERD.searchRadiusMeters&&!g.state.units.some(p=>p.hp>0&&p.tamingWork?.animal===a.id)&&
   g.workBoard.connected(g,u.x,u.z,a.x,a.z)&&g.workBoard.connected(g,a.x,a.z,pen.x,pen.z))
   .sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
  if(!animal)continue;
  const searchPack=u.goatSearchPen===penId&&u.expedition?u.expedition:undefined;
  if((searchPack?searchPack.food:g.tribe(0).food)<HERD.tamingFood){g.banner('Bring six food for taming',4);return false;}
  g.interruptMission(u);if(searchPack)searchPack.food-=HERD.tamingFood;else g.tribe(0).food-=HERD.tamingFood;
  u.tamingWork={animal:animal.id,pen:penId,progress:0};u.order='hold';u.node=null;u.target=null;g.workBoard.reset();
  g.banner(`A handler is approaching a wild ${species}, then will lead it to the pen`,4);return true;
 }
 g.banner(`Find a living wild ${species} and a free adult with a clear route to this pen`,5);return false;
}
export function assignHusbandry(g:Game,penId:number,action:'care'|'slaughter'|'pack'|'shear'='care') {
 const pen=penAt(g,penId);if(!pen)return false;
 const paused=g.state.units.find(u=>u.husbandryWork?.pen===penId&&u.husbandryWork.action===action&&u.husbandryWork.paused&&available(g,u,'husbandryWork'));if(paused){paused.husbandryWork!.paused=false;paused.order='hold';return true;}
 if(action==='care'){const r=penPastureReport(g,pen);if(r.keepers>=r.keepersNeeded){g.banner('This herd already has enough keepers assigned',3);return false;}}
 const animal=action==='care'?undefined:penAnimals(g,penId).filter(a=>(action!=='pack'||a.species==='goat')&&(action!=='shear'||a.species==='sheep'&&(a.fleece?.units||0)>=1)&&insidePen(pen,a.x,a.z)&&g.state.time-a.born>=HERD.maturity&&
  !g.state.units.some(u=>u.hp>0&&u.husbandryWork?.animal===a.id)).sort((a,b)=>Number(a.sex==='female')-Number(b.sex==='female'))[0];
 if(action!=='care'&&!animal){g.banner(action==='shear'?'No unreserved adult sheep with fleece in this pen':'No unreserved eligible adult in this pen',4);return false;}
 const u=[...g.state.units].sort((a,b)=>Number(b.selected)-Number(a.selected)).find(u=>available(g,u,'husbandryWork')&&
  (!u.husbandryWork||u.husbandryWork.paused&&!(u.husbandryWork.waterLiters??0))&&
  (!['slaughter','shear'].includes(action)||!Object.values(u.itemCargo||{}).some(n=>n>0))&&g.workBoard.connected(g,u.x,u.z,pen.x,pen.z));
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
function finish(g:Game,u:Unit) {if((u.husbandryWork?.waterLiters??0)>0){releaseHusbandryKeeper(g,u);return;}u.tamingWork=undefined;u.husbandryWork=undefined;u.order=u.expedition?'return':'idle';if(u.expedition){u.recalled=true;u.stationOnArrival=false;}u.node=null;g.invalidateRoute(u);g.workBoard.reset();}
function takeFeed(g:Game,limit:number) {
 const t=g.tribe(0),lots=foodInventory(t);
 // A load keeps its actual plant-food identity. Overflow can return to stores
 // without turning raw grain/roots into free preserved provisions.
 for(const kind of ['grain','pulses','tubers','berries','provisions'] as const){const amount=Math.min(lots[kind],limit);if(amount>0){lots[kind]-=amount;t.food=Math.max(0,t.food-amount);t.foodLots=lots;return{amount,kind};}}
 return null;
}
export function husbandryAI(g:Game,u:Unit,dt:number) {
 if(penWaterWorkAI(g,u,dt))return true;
 const tame=u.tamingWork;
 if(tame?.pen!==undefined&&!tame.paused&&u.order==='hold'&&!u.emergency){
  const pen=penAt(g,tame.pen,u.team);if(!pen){finish(g,u);return true;}
  let a=g.state.livestock?.find(a=>a.id===tame.animal&&a.hp>0);
  if(!a){
   const wild=g.state.wildlife.find(a=>a.id===tame.animal&&a.hp>0&&['goat','sheep'].includes(a.species));
   if(!wild){finish(g,u);u.workReason='The goat is gone';return true;}
   u.workReason=`Approaching a ${wild.species} with feed`;
   if(Math.hypot(u.x-wild.x,u.z-wild.z)>2.4){u.tx=wild.x;u.tz=wild.z;g.steer(u,dt);return true;}
   wild.vx=wild.vz=0;tame.progress=Math.min(HERD.tamingSeconds,tame.progress+dt);u.workReason=`Taming a herd ${wild.species} · ${Math.floor(tame.progress/HERD.tamingSeconds*100)}%`;
   if(tame.progress<HERD.tamingSeconds)return true;
   if(penAnimals(g,pen.id).length>=surveyPenPasture(g,pen).eligibleCapacity){tame.paused=true;u.order='idle';u.workReason='Pen full — taming paused';return true;}
   a={...wild,team:u.team,pen:pen.id,sex:wild.id%2?'female':'male',born:g.state.time-HERD.maturity,tamedAt:g.state.time,hunger:5,milk:0,pregnancy:0};
   (g.state.livestock??=[]).push(a);
   // Existing hunters may still hold a reference to the former wild object.
   // Retire it without a carcass so capture cannot also create a second meal.
   wild.hp=0;wild.carcass=undefined;
   for(const hunter of g.state.units)if(hunter.node===wild){hunter.node=null;if(hunter.order==='gather')hunter.order='idle';}
   g.state.wildlife=g.state.wildlife.filter(c=>c.id!==a!.id);
  }
  u.workReason=`Leading a ${a.species} back to its pen`;
  if(Math.hypot(a.x-u.x,a.z-u.z)>4){animalStep(g,a,u,u.x,u.z,dt);return true;}
  const gate={x:pen.x,z:pen.z+pen.d/2+1.2};
  if(!tame.penGateReached&&!insidePen(pen,a.x,a.z)&&Math.hypot(u.x-gate.x,u.z-gate.z)<1.3)tame.penGateReached=true;
  const target=tame.penGateReached||insidePen(pen,a.x,a.z)?pen:gate;
  u.tx=target.x;u.tz=target.z;g.steer(u,dt);animalStep(g,a,u,u.x,u.z,dt);
  if(insidePen(pen,a.x,a.z,.25)){
   finish(g,u);if(!u.expedition&&!keeper(g,pen.id)){u.husbandryWork={pen:pen.id,action:'care',phase:'pen',progress:0};u.order='hold';}
   g.banner(a.species==='sheep'?'Sheep brought home. Keep it fed, watered and tended to grow fleece.':'Goat brought home. A fed breeding pair can raise kids; mothers provide milk.',5);
  }
  return true;
 }
 const w=u.husbandryWork;if(!w||w.paused||u.order!=='hold'||u.emergency)return false;
 const pen=penAt(g,w.pen,u.team);if(!pen){finish(g,u);return true;}
 const pasture=penPastureState(pen);
 const stray=w.action==='care'&&penAnimals(g,pen.id).find(a=>!insidePen(pen,a.x,a.z)&&!g.state.units.some(p=>p.hp>0&&p.tamingWork?.animal===a.id&&!p.tamingWork.paused));
 if(stray&&u.carry===0){u.tamingWork={animal:stray.id,pen:pen.id,progress:60};u.husbandryWork=undefined;return true;}
 if(w.phase==='deliver'||w.phase==='fetch') {
  const drop=g.nearestDrop(u.x,u.z,u.team);
  u.workReason=w.phase==='deliver'?'Carrying herd produce to stores':'Collecting plant food for the herd';
  if(!drop||!atBuilding(g,u,drop,dt))return true;
  if(w.phase==='deliver'){
   if(['slaughter','shear'].includes(w.action)&&u.itemCargo&&!deliverProductionCargo(g,u))return true;
   if(u.carryType==='food'&&u.carry>0)receiveFood(g,u.team,u.carry,u.carryFood);
   u.carry=0;u.carryType=null;u.carryFood=undefined;w.phase='pen';
   if(['slaughter','shear'].includes(w.action)){finish(g,u);return true;}
  }else{
   const demand=penAnimals(g,pen.id).length*PEN_RULES.feedPerAnimalSecond;
   const feed=takeFeed(g,Math.min(Math.max(8,Math.ceil(demand*90)),carryingCapacity(u,'food')));
   if(!feed){u.workReason='Herd feed needs grain, roots, berries or provisions';return true;}
   u.carry=feed.amount;u.carryType='food';u.carryFood=feed.kind;w.phase='feed';
  }
  return true;
 }
 u.workReason=w.action==='care'?'Tending the herd':w.action==='pack'?'Fitting a pack harness':w.action==='shear'?'Clipping sheep fleece':'Preparing an animal for meat';
 if(!atBuilding(g,u,pen,dt))return true;
 if(w.phase==='feed'){
  if(u.carryType==='food'&&u.carry>0){const delivered=Math.min(u.carry,Math.max(0,penFeedCapacity(pen)-pasture.feed));pasture.feed+=delivered;pasture.feedDelivered!+=delivered;u.carry-=delivered;}
  if(u.carry>1e-8){w.phase='deliver';u.workReason='Feed store full — returning the remaining plant food';return true;}
  u.carry=0;u.carryType=null;u.carryFood=undefined;w.phase='pen';return true;
 }
 if(w.action!=='care') {
  const a=g.state.livestock?.find(a=>a.id===w.animal&&a.hp>0&&a.pen===pen.id);
  if(!a){finish(g,u);return true;}
  if(w.action==='shear'&&Math.hypot(u.x-a.x,u.z-a.z)>2.4){u.tx=a.x;u.tz=a.z;g.steer(u,dt);u.workReason='Reaching the sheep to remove its fleece';return true;}
  w.progress+=dt;if(w.progress<(w.action==='shear'?SHEEP_RULES.shearSeconds:30))return true;
  if(w.action==='shear'){if(a.species!=='sheep'||!a.fleece){finish(g,u);return true;}const n=Math.floor(a.fleece.units);if(n<1){finish(g,u);return true;}a.fleece.units-=n;a.fleece.shearedUnits+=n;a.fleece.lastShearedAt=g.state.time;(u.itemCargo??={}).rawWool=(u.itemCargo?.rawWool||0)+n;w.phase='deliver';w.progress=0;u.workReason='Carrying the actual clipped wool to storage';return true;}
  if(w.action==='pack'){
   if(a.species!=='goat'){finish(g,u);return true;}
   if(g.tribe(u.team).wood<2){u.workReason='Harness needs two logs';return true;}
   g.tribe(u.team).wood-=2;u.packAnimal={id:a.id,hp:a.hp,maxHp:a.maxHp,scale:a.scale};u.haulage='pack';
   g.state.livestock=g.state.livestock!.filter(c=>c.id!==a.id);finish(g,u);u.order='return';g.banner('A herd goat is now carrying packs for its handler',4);
  }else{
   a.hp=0;
   a.carcass={meat:16,diedAt:g.state.time,...(animalProcessingEnabled(g,u.team)?{hides:1,bones:2}:{})};
   const capacity=carryingCapacity(u,'food');
   const loaded=Object.values(u.itemCargo||{}).reduce((sum,amount)=>sum+amount,0);
   harvestAnimalMaterials(g,u,a.carcass,Math.max(0,capacity-loaded));
   const materials=Object.values(u.itemCargo||{}).reduce((sum,amount)=>sum+amount,0);
   const amount=Math.min(Math.max(0,capacity-materials),a.carcass.meat);
   a.carcass.meat-=amount;
   u.carry=amount;u.carryType='food';u.carryFood='meat';w.phase='deliver';
  }
  return true;
 }
 if(penNeedsWater(g,pen)){w.phase='waterFetch';return true;}
 pasture.care=Math.min(1,pasture.care+dt*.012);w.progress+=dt;
 if((calendar(g).phase===3||pasture.condition<.2)&&pasture.feed<Math.max(1,penAnimals(g,pen.id).length*PEN_RULES.feedPerAnimalSecond*60)&&penAnimals(g,pen.id).length){w.phase='fetch';return true;}
 if(w.progress>=30){
  w.progress=0;
  const carcass=g.state.livestock?.find(a=>a.pen===pen.id&&carcassAvailable(g,a));
  if(carcass?.carcass){const n=Math.min(carryingCapacity(u,'food'),carcass.carcass.meat);carcass.carcass.meat-=n;u.carry=n;u.carryType='food';u.carryFood='meat';w.phase='deliver';return true;}
  const animals=penAnimals(g,pen.id);let milk=0,room=carryingCapacity(u,'food');
  if(animals.reduce((n,a)=>n+a.milk,0)<1)return true;
  for(const a of animals){const n=a.species==='goat'?Math.min(a.milk,room-milk):0;milk+=n;a.milk-=n;}
  if(milk>=1){u.carry=milk;u.carryType='food';u.carryFood='milk';w.phase='deliver';}
 }
 return true;
}
export function tickHusbandry(g:Game,dt:number) {
 reconcilePenWater(g);
 if(dt<=0)return;
 const livestock=g.state.livestock??[],activePens=new Set(livestock.filter(a=>a.hp>0).map(a=>a.pen));
 if(!livestock.length&&!g.state.buildings.some(b=>b.type==='pen'&&b.pasture&&(b.pasture.condition<1||b.pasture.care>0)))return;
 const handlers=new Set(g.state.units.filter(u=>u.hp>0&&u.tamingWork&&!u.tamingWork.paused).map(u=>u.tamingWork!.animal));
 const owned=new Set(livestock.filter(a=>a.hp>0).map(a=>a.id)),incoming=new Map<number,number>();
 for(const u of g.state.units)if(u.hp>0&&u.tamingWork?.pen!==undefined&&!owned.has(u.tamingWork.animal))incoming.set(u.tamingWork.pen,(incoming.get(u.tamingWork.pen)||0)+1);
 for(const pen of g.state.buildings.filter(b=>b.type==='pen'&&g.finished(b)&&(activePens.has(b.id)||b.pasture&&(b.pasture.condition<1||b.pasture.care>0)))){
  const herd=penAnimals(g,pen.id),p=penPastureState(pen),reserved=incoming.get(pen.id)||0;let occupied=herd.length;
  p.care=Math.max(0,p.care-dt*PEN_RULES.careDecayPerAnimalSecond*Math.max(1,herd.length));
  if(!herd.length&&p.condition>=1)continue;
  const r=penPastureReport(g,pen);
  // A finite edible biomass pool, regenerated from usable land and climate.
  let biomass=Math.min(r.biomassCapacity,p.condition*r.biomassCapacity+r.regrowthPerSecond*dt);

  for(const a of herd){
   const arrived=insidePen(pen,a.x,a.z),need=PEN_RULES.feedPerAnimalSecond*dt;
   const grazed=arrived&&!r.winter?Math.min(need,biomass):0;biomass-=grazed;p.grazedFood!+=grazed;
   const stored=arrived?Math.min(Math.max(0,need-grazed),p.feed):0;p.feed-=stored;p.feedConsumed!+=stored;
   const fedFraction=Math.min(1,(grazed+stored)/Math.max(1e-12,need)),fed=fedFraction>=1-1e-8;
   const hydrated=drinkPenWater(g,pen,a,dt);
   a.hunger=Math.max(0,Math.min(100,a.hunger+dt*(fed?-.3:.055*(1-fedFraction))));
   if(a.hunger>80)a.hp=Math.max(0,a.hp-dt*.08);else if(fed&&hydrated&&p.care>.2)a.hp=Math.min(a.maxHp,a.hp+dt*.015);
   const adult=g.state.time-a.born>=HERD.maturity;
   if(a.hp<=0){a.carcass={meat:8,diedAt:g.state.time};occupied--;continue;}
   if(!handlers.has(a.id)&&arrived){
    a.wanderT-=dt;if(a.wanderT<=0){a.wanderT=3+(a.id%5);a.facing+=1.4;}
    const x=a.x+Math.sin(a.facing)*dt*.35,z=a.z+Math.cos(a.facing)*dt*.35;
    if(insidePen(pen,x,z,.15)&&g.walkable(x,z)){a.x=x;a.z=z;a.y=g.height(x,z);}else a.facing+=Math.PI;
   }
   growFleece(a,dt,arrived&&adult&&fed&&hydrated&&p.care>.2&&a.hunger<30);
   if(arrived&&a.sex==='female'&&adult&&a.hunger<30&&fed&&hydrated&&p.care>.2){
    const male=herd.some(m=>m.species===a.species&&m.sex==='male'&&insidePen(pen,m.x,m.z)&&g.state.time-m.born>=HERD.maturity);
    if(male&&occupied+reserved<r.eligibleCapacity)a.pregnancy=Math.min(HERD.gestation,a.pregnancy+dt);
    if(a.pregnancy>=HERD.gestation&&occupied+reserved<r.eligibleCapacity&&livestock.length<PEN_RULES.maximumAnimalsTotal){
     a.pregnancy=0;a.lactatingUntil=g.state.time+HERD.lactation;
     const id=g.id();livestock.push({...a,id,sex:id%2?'female':'male',born:g.state.time,tamedAt:g.state.time,milk:0,pregnancy:0,lactatingUntil:0,hp:a.maxHp,hunger:5,thirstSeconds:0,scale:.6,...(a.species==='sheep'?{fleece:newFleece()}: {})});occupied++;
     if(a.team===0)g.banner('A kid was born in the animal pen',4);
    }
    if(a.species==='goat'&&(a.lactatingUntil||0)>g.state.time)a.milk=Math.min(6,a.milk+dt*.025);
   }
   a.scale=.6+.4*Math.min(1,(g.state.time-a.born)/HERD.maturity);
  }
  p.condition=r.biomassCapacity?Math.max(0,Math.min(1,biomass/r.biomassCapacity)):0;
 }
 // A destroyed/abandoned pen releases actual surviving animals, with identity intact.
 for(const a of livestock){
  if(a.hp>0&&!penAt(g,a.pen,a.team)){
   if(!g.state.wildlife.some(c=>c.id===a.id))g.state.wildlife.push({id:a.id,species:a.species,...(a.fleece?{fleece:{...a.fleece}}:{}),x:a.x,y:a.y,z:a.z,facing:a.facing,vx:0,vz:0,wanderT:0,hp:a.hp,maxHp:a.maxHp,fly:0,scale:a.scale,grazing:{x:a.x,z:a.z}});
   a.hp=0;a.carcass=undefined;
  }
 }
 if(g.state.livestock)g.state.livestock=livestock.filter(a=>a.hp>0||carcassAvailable(g,a));
}
