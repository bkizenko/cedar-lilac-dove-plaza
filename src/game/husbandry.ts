import {penStep} from './animalBehaviour';
import {domesticationReady,beginDomesticationTrial,practiceDomestication,finishDomesticationTrial,noteDomesticationArrival,reconcileDomestication,DOMESTICATION_RULES} from './domestication';
import {withdrawExpeditionFood} from './expeditionProvisions';
import{penBeddingWorkAI,penNeedsBedding,usePenBedding,reconcilePenBedding,returnPenBeddingLoad}from'./penBedding';
import {herdRules,isDraftSpecies} from './animalSpecies';
import {packAnimalFrom,PACK_HARNESS_RULES} from './packAnimalState';
import {SHEEP_RULES,growFleece,newFleece} from './sheep';
import{penWaterWorkAI,penNeedsWater,reconcilePenWater,drinkPenWater,releaseHusbandryKeeper,PEN_WATER_RULES}from'./penWater';
import {PEN_RULES,insidePen,penFeedCapacity,penCareDemand} from './penGeometry';
import {surveyPenPasture,penPastureState,penPastureReport} from './penPasture';
import {supplyApproach,supplyReached,type SupplyDrop} from './campAnchor';
import type {Game} from './sim';
import type {Building,Livestock,Unit} from './types';
import {hasTaskCommitment} from './workCommitments';
import {isDependent,calendar} from './settlement';
import {carryingCapacity} from './haulage';
import {FOOD_KINDS,foodInventory,receiveFood,takeFoodLot} from './pantry';
import {carcassAvailable,CARCASS_MEAT} from './hunting';
import {animalProcessingEnabled,deliverProductionCargo,harvestAnimalMaterials} from './production';
export const HERD={capacity:8,tamingFood:6,tamingSeconds:60,searchRadiusMeters:220,maturity:300,gestation:240,lactation:900};
export const penAnimals=(g:Game,pen:number)=> (g.state.livestock||[]).filter(a=>a.pen===pen&&a.hp>0&&a.ledBy===undefined);
// The home place stays reserved during escort, so a failed journey can return.
export const penPlacesOccupied=(g:Game,pen:number,except?:number)=>(g.state.livestock||[]).filter(a=>a.pen===pen&&a.hp>0&&a.id!==except).reduce((n,a)=>n+herdRules(a.species).places,0);
/** Paid inbound captures reserve eventual adult places, even while paused. */
export function penPlacesReserved(g:Game,pen:number,exceptUnit?:number){return g.state.units.filter(u=>u.hp>0&&u.id!==exceptUnit).reduce((n,u)=>{if(u.tamingWork?.pen===pen&&!g.state.livestock?.some(a=>a.hp>0&&a.id===u.tamingWork!.animal))n+=herdRules(g.state.wildlife.find(a=>a.id===u.tamingWork!.animal)?.species).places;if(u.packPastureOrder?.pen===pen&&u.packAnimal?.id===u.packPastureOrder.animal&&u.packAnimal.hp>0)n+=herdRules(u.packAnimal.species).places;return n;},0);}
const penAt=(g:Game,id:number,team=0)=>g.state.buildings.find(b=>b.id===id&&b.team===team&&b.type==='pen'&&g.finished(b));
/** Custody reserves the original live entity, never an escrow copy. */
export function beginLivestockEscort(g:Game,animalId:number,leaderId:number){
 const a=g.state.livestock?.find(a=>a.id===animalId&&a.hp>0),u=g.state.units.find(u=>u.id===leaderId&&u.hp>0&&!u.prisoner&&!u.boat);
 if(!a||!u||Math.hypot(a.x-u.x,a.z-u.z)>4||a.ledBy!==undefined||g.state.units.some(p=>p.hp>0&&(p.tamingWork?.animal===a.id||p.husbandryWork?.animal===a.id)))return false;
 a.ledBy=u.id;return true;
}
/** Delivery requires the same custodian, physical arrival and a real free pen place. */
export function finishLivestockEscort(g:Game,animalId:number,leaderId:number,penId:number){
 const a=g.state.livestock?.find(a=>a.id===animalId&&a.hp>0&&a.ledBy===leaderId),u=g.state.units.find(u=>u.id===leaderId&&u.hp>0&&!u.prisoner),pen=u&&penAt(g,penId,u.team);
 if(!a||!u||!pen||!insidePen(pen,a.x,a.z,.25)||Math.hypot(a.x-u.x,a.z-u.z)>4||penPlacesOccupied(g,pen.id,a.id)+penPlacesReserved(g,pen.id)+herdRules(a.species).places>surveyPenPasture(g,pen).eligibleCapacity)return false;
 a.team=u.team;a.pen=pen.id;delete a.ledBy;return true;
}
function available(g:Game,u:Unit,except?:'husbandryWork'|'tamingWork',searchPen?:number) {
 const searching=searchPen!==undefined&&u.goatSearchPen===searchPen&&u.order==='explore';
 const ownTamingPack=except==='tamingWork'&&!!u.tamingWork&&!!u.expedition;
 return u.team===0&&u.hp>0&&u.type==='worker'&&!u.militia&&!isDependent(g,u)&&u.enslavedFrom===undefined&&
  !u.emergency&&!u.recalled&&(!u.expedition||searching||ownTamingPack)&&!u.scout&&!u.visit&&!u.envoy&&!u.foundingJourney&&!u.tributeJourney&&
  !u.buildOrder&&u.drill==null&&(!u.haulage||(searching||ownTamingPack)&&['sled','cart','pack'].includes(u.haulage))&&u.carry===0&&
  (except!=='tamingWork'||!Object.values(u.itemCargo||{}).some(n=>n>0)&&(!u.jobLock||u.foodRole===true))&&!hasTaskCommitment(u,except)&&(searching||['idle','hold','gather','return'].includes(u.order));
}
function keeper(g:Game,pen:number){return g.state.units.find(u=>u.hp>0&&u.husbandryWork?.pen===pen&&u.husbandryWork.action==='care'&&!u.husbandryWork.paused);}
export function beginHerdTaming(g:Game,penId:number,unitId?:number,species:'goat'|'sheep'|'horse'|'cattle'='goat') {
 const pen=penAt(g,penId);if(!pen)return false;
 const speciesOf=(id:number)=>g.state.wildlife.find(a=>a.id===id)?.species||g.state.livestock?.find(a=>a.id===id)?.species;
 const paused=g.state.units.find(u=>(unitId===undefined||u.id===unitId)&&u.tamingWork?.pen===penId&&speciesOf(u.tamingWork.animal)===species&&u.tamingWork.paused&&available(g,u,'tamingWork'));
 const returningOwned=paused&&(g.state.livestock||[]).some(a=>a.id===paused.tamingWork!.animal&&a.hp>0);
 if(!returningOwned&&(g.state.livestock?.length||0)>=PEN_RULES.maximumAnimalsTotal){g.banner('Care for the existing herds before capturing more animals',4);return false;}
 if(paused){paused.tamingWork!.paused=false;paused.order='hold';return true;}
 const q=pen.goatSearch;if(species==='goat'&&q&&!['complete','exhausted'].includes(q.state)&&(q.paidTrials||0)>=DOMESTICATION_RULES.maximumSearchTrials){g.banner('Two paid taming attempts used — start a new search to try again',4);return false;}
 const reserved=penPlacesReserved(g,penId);
 if(penPlacesOccupied(g,penId)+reserved+herdRules(species).places>surveyPenPasture(g,pen).eligibleCapacity){g.banner('This enclosure has no unreserved usable places — enlarge it or restore dry pasture',4);return false;}
 for(const u of [...g.state.units].sort((a,b)=>Number(b.selected)-Number(a.selected))){
  if(unitId!==undefined&&u.id!==unitId||!available(g,u,'tamingWork',penId))continue;
  if(u.tamingWork?.pen===penId&&speciesOf(u.tamingWork.animal)===species&&u.tamingWork.paused){u.tamingWork.paused=false;u.order='hold';return true;}
  if(u.tamingWork)continue;
  const animal=g.state.wildlife.filter(a=>a.hp>0&&a.species===species&&domesticationReady(g,a)&&g.visibleAt(a.x,a.z)&&
   Math.hypot(a.x-pen.x,a.z-pen.z)<HERD.searchRadiusMeters&&!g.state.units.some(p=>p.hp>0&&p.tamingWork?.animal===a.id)&&
   g.workBoard.connected(g,u.x,u.z,a.x,a.z)&&g.workBoard.connected(g,a.x,a.z,pen.x,pen.z))
   .sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
  if(!animal)continue;
  const rules=herdRules(species);
  const searchPack=u.goatSearchPen===penId&&u.expedition?u.expedition:undefined;
  if((searchPack?searchPack.food:g.tribe(0).food)<rules.tamingFood){g.banner(`Bring ${rules.tamingFood} food for taming`,4);return false;}
  if(searchPack){if(!withdrawExpeditionFood(u,rules.tamingFood))return false;}
  else{const stock=foodInventory(g.tribe(0));let need=rules.tamingFood;for(const kind of FOOD_KINDS){const n=Math.min(stock[kind],need);if(n>0){takeFoodLot(g,0,kind,n);need-=n;}if(need<1e-8)break;}}
  g.interruptMission(u);
  u.tamingWork={animal:animal.id,pen:penId,progress:0,trial:beginDomesticationTrial(g,u,animal)};
  if(species==='goat'&&q&&!['complete','exhausted'].includes(q.state))q.paidTrials=(q.paidTrials||0)+1;u.order='hold';u.node=null;u.target=null;g.workBoard.reset();
  g.banner(`A handler is approaching a wild ${species}, then will lead it to the pen`,4);return true;
 }
 g.banner(`Find a living wild ${species} and a free adult with a clear route to this pen`,5);return false;
}
export function assignHusbandry(g:Game,penId:number,action:'care'|'slaughter'|'pack'|'shear'='care',species?:'goat'|'horse'|'cattle') {
 const pen=penAt(g,penId);if(!pen)return false;
 const paused=g.state.units.find(u=>u.husbandryWork?.pen===penId&&u.husbandryWork.action===action&&(!species||g.state.livestock?.some(a=>a.id===u.husbandryWork!.animal&&a.species===species))&&u.husbandryWork.paused&&available(g,u,'husbandryWork'));if(paused){paused.husbandryWork!.paused=false;paused.order='hold';return true;}
 if(action==='care'){const r=penPastureReport(g,pen);if(r.keepers>=r.keepersNeeded){g.banner('This herd already has enough keepers assigned',3);return false;}}
 const animal=action==='care'?undefined:penAnimals(g,penId).filter(a=>(action!=='pack'||['goat','horse','cattle'].includes(a.species)&&(!species||a.species===species))&&(action!=='shear'||a.species==='sheep'&&(a.fleece?.units||0)>=1)&&insidePen(pen,a.x,a.z)&&g.state.time-a.born>=herdRules(a.species).maturity&&
  !g.state.units.some(u=>u.hp>0&&u.husbandryWork?.animal===a.id)).sort((a,b)=>Number(a.sex==='female')-Number(b.sex==='female'))[0];
 if(action!=='care'&&!animal){g.banner(action==='shear'?'No unreserved adult sheep with fleece in this pen':'No unreserved eligible adult in this pen',4);return false;}
 const stable=isDraftSpecies(animal?.species)&&!animal?.packHarness&&action==='pack'?g.state.buildings.filter(b=>b.team===pen.team&&b.type==='stables'&&g.finished(b)&&g.workBoard.connected(g,pen.x,pen.z,b.x,b.z)).sort((a,b)=>Math.hypot(a.x-pen.x,a.z-pen.z)-Math.hypot(b.x-pen.x,b.z-pen.z))[0]:undefined;
 if(isDraftSpecies(animal?.species)&&!animal?.packHarness&&action==='pack'&&!stable){g.banner('Build a reachable stable to train this draft animal',4);return false;}
 const u=[...g.state.units].sort((a,b)=>Number(b.selected)-Number(a.selected)).find(u=>available(g,u,'husbandryWork')&&
  (!u.husbandryWork||u.husbandryWork.paused&&!(u.husbandryWork.waterLiters??0)&&!(u.husbandryWork.beddingUnits??0))&&
  (!['slaughter','shear'].includes(action)||!Object.values(u.itemCargo||{}).some(n=>n>0))&&g.workBoard.connected(g,u.x,u.z,pen.x,pen.z));
 if(!u){g.banner('Choose a free empty-handed adult for this pen',4);return false;}
 g.interruptMission(u);u.husbandryWork={pen:penId,action,animal:animal?.id,phase:'pen',progress:0,...(stable?{stable:stable.id}:{})};u.order='hold';u.node=null;u.target=null;g.workBoard.reset();return true;
}
function atBuilding(g:Game,u:Unit,b:SupplyDrop,dt:number) {
 const spot=supplyApproach(g,u,b);if(!spot){u.workReason='No clear approach to the pen or store';return false;}
 u.tx=spot.x;u.tz=spot.z;if(!supplyReached(g,u,b,spot)){g.steer(u,dt);return false;}return true;
}
function animalStep(g:Game,a:Livestock,handler:Unit,x:number,z:number,dt:number) {
 const actor:Unit={...handler,id:a.id,x:a.x,y:a.y,z:a.z,vx:a.vx,vz:a.vz,facing:a.facing,r:herdRules(a.species).radius,speed:herdRules(a.species).speed,
  tx:x,tz:z,hp:a.hp,maxHp:a.maxHp,carry:0,haulage:undefined,boat:undefined,packAnimal:undefined,stuckT:a.stuckT||0};
 g.steer(actor,dt);
 a.x=actor.x;a.y=actor.y;a.z=actor.z;a.vx=actor.vx;a.vz=actor.vz;a.facing=actor.facing;a.stuckT=actor.stuckT;
}
function finish(g:Game,u:Unit) {if(returnPenBeddingLoad(g,u))return;if((u.husbandryWork?.waterLiters??0)>0){releaseHusbandryKeeper(g,u);return;}u.tamingWork=undefined;u.husbandryWork=undefined;u.order=u.expedition?'return':'idle';if(u.expedition){u.recalled=true;u.stationOnArrival=false;}u.node=null;g.invalidateRoute(u);g.workBoard.reset();}
function takeFeed(g:Game,limit:number) {
 const t=g.tribe(0),lots=foodInventory(t);
 // A load keeps its actual plant-food identity. Overflow can return to stores
 // without turning raw grain/roots into free preserved provisions.
 for(const kind of ['grain','pulses','tubers','berries','provisions'] as const){const amount=Math.min(lots[kind],limit);if(amount>0){lots[kind]-=amount;t.food=Math.max(0,t.food-amount);t.foodLots=lots;return{amount,kind};}}
 return null;
}
export function husbandryAI(g:Game,u:Unit,dt:number) {
 if(penBeddingWorkAI(g,u,dt))return true;
 if(penWaterWorkAI(g,u,dt))return true;
 const tame=u.tamingWork;
 if(tame?.pen!==undefined&&!tame.paused&&u.order==='hold'&&!u.emergency){
  const pen=penAt(g,tame.pen,u.team);if(!pen){finish(g,u);return true;}
  let a=g.state.livestock?.find(a=>a.id===tame.animal&&a.hp>0);
  if(a?.ledBy!==undefined){finish(g,u);return true;}
  if(!a){
   const wild=g.state.wildlife.find(a=>a.id===tame.animal&&a.hp>0&&['goat','sheep','horse','cattle'].includes(a.species));
   if(!wild){finish(g,u);u.workReason='The animal is gone';return true;}
   u.workReason=`Approaching a ${wild.species} with feed`;
   if(Math.hypot(u.x-wild.x,u.z-wild.z)>2.4){u.tx=wild.x;u.tz=wild.z;g.steer(u,dt);return true;}
   const rules=herdRules(wild.species);
   wild.vx=wild.vz=0;const before=tame.progress;tame.progress=Math.min(rules.tamingSeconds,tame.progress+dt);
   if(tame.trial)practiceDomestication(u,tame.trial,tame.progress-before);u.workReason=`Taming a herd ${wild.species} · ${Math.floor(tame.progress/rules.tamingSeconds*100)}%`;
   if(tame.progress<rules.tamingSeconds)return true;
   if(penPlacesOccupied(g,pen.id)+penPlacesReserved(g,pen.id,u.id)+rules.places>surveyPenPasture(g,pen).eligibleCapacity){tame.paused=true;u.order='idle';u.workReason='Pen full — taming paused';return true;}
   if(tame.trial&&tame.trial.roll>=tame.trial.chance){
    finishDomesticationTrial(g,u,'refused');
    const q=pen.goatSearch;if(q){delete q.animal;q.returningHandlerId=u.id;q.state=(q.paidTrials||0)>=DOMESTICATION_RULES.maximumSearchTrials?'exhausted':'waiting';q.reason='refused';q.nextAttemptAt=g.state.time+5;q.retryAfter=wild.domestication!.cooldownUntil;q.retryTarget={x:wild.x,z:wild.z};}
    finish(g,u);delete u.goatSearchPen;u.recalled=true;u.order='return';
    u.workReason=`The ${wild.species} refused handling — bait spent; returning with remaining supplies`;
    g.banner(u.workReason,5);return true;
   }
   finishDomesticationTrial(g,u,'success');
   a={...wild,adultScale:wild.scale,team:u.team,pen:pen.id,sex:wild.id%2?'female':'male',born:g.state.time-rules.maturity,tamedAt:g.state.time,hunger:5,milk:0,pregnancy:0};
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
   noteDomesticationArrival(g,u);finish(g,u);if(!u.expedition&&!keeper(g,pen.id)){u.husbandryWork={pen:pen.id,action:'care',phase:'pen',progress:0};u.order='hold';}
   g.banner(a.species==='cattle'?'Cattle brought home. Mothers need birth, feed, water and keeper care for milk; train draft work at a stable.':a.species==='horse'?'Horse brought home. Keep pasture, feed and water available; train packs at a stable.':a.species==='sheep'?'Sheep brought home. Keep it fed, watered and tended to grow fleece.':'Goat brought home. A fed breeding pair can raise kids; mothers provide milk.',5);
  }
  return true;
 }
 const w=u.husbandryWork;if(!w||w.paused||u.order!=='hold'||u.emergency)return false;
 const pen=penAt(g,w.pen,u.team);if(!pen){finish(g,u);return true;}
 const pasture=penPastureState(pen);
 const stray=w.action==='care'&&penAnimals(g,pen.id).find(a=>!insidePen(pen,a.x,a.z)&&!g.state.units.some(p=>p.hp>0&&(p.tamingWork?.animal===a.id&&!p.tamingWork.paused||p.husbandryWork?.animal===a.id&&!p.husbandryWork.paused)));
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
   const demand=penCareDemand(penAnimals(g,pen.id))*PEN_RULES.feedPerAnimalSecond;
   const feed=takeFeed(g,Math.min(Math.max(8,Math.ceil(demand*90)),carryingCapacity(u,'food')));
   if(!feed){u.workReason='Herd feed needs grain, roots, berries or provisions';return true;}
   u.carry=feed.amount;u.carryType='food';u.carryFood=feed.kind;w.phase='feed';
  }
  return true;
 }
 u.workReason=w.action==='care'?'Tending the herd':w.action==='pack'?'Fitting a pack harness':w.action==='shear'?'Clipping sheep fleece':'Preparing an animal for meat';
 if(w.action==='pack'&&w.stable!==undefined){
  const a=g.state.livestock?.find(a=>a.id===w.animal&&a.hp>0&&a.pen===pen.id&&a.team===u.team&&a.ledBy===undefined),stable=g.state.buildings.find(b=>b.id===w.stable&&b.team===u.team&&b.type==='stables'&&b.hp>0);
  if(!a||!isDraftSpecies(a.species)||!stable){finish(g,u);u.workReason='Draft training lost its animal or stable';return true;}
  if(!g.finished(stable)){w.paused=true;u.order='idle';u.workReason='Finish the stable before resuming draft training';return true;}
  if(Math.hypot(a.x-u.x,a.z-u.z)>3){animalStep(g,a,u,u.x,u.z,dt);u.tx=a.x;u.tz=a.z;g.steer(u,dt);u.workReason='Collecting the pasture animal';return true;}
  const spot=g.interactionSpot(u,stable);if(!spot){u.workReason='Draft training needs a clear stable entrance';return true;}u.tx=spot.x;u.tz=spot.z;
  if(!g.buildingWorkReached(u,stable)){g.steer(u,dt);animalStep(g,a,u,u.x,u.z,dt);u.workReason='Leading the draft animal to the stable';return true;}
  animalStep(g,a,u,u.x,u.z,dt);w.progress=Math.min(herdRules(a.species).harnessSeconds,w.progress+dt);u.workReason=`Training ${a.species} for work · ${Math.floor(w.progress/herdRules(a.species).harnessSeconds*100)}%`;
  if(w.progress<herdRules(a.species).harnessSeconds)return true;
  if(g.tribe(u.team).wood<herdRules(a.species).harnessWood){u.workReason=`Harness needs ${herdRules(a.species).harnessWood} logs`;return true;}
  g.tribe(u.team).wood-=herdRules(a.species).harnessWood;u.packAnimal={...packAnimalFrom(a),packHarness:{version:1,preparedAt:g.state.time,wood:herdRules(a.species).harnessWood,workSeconds:herdRules(a.species).harnessSeconds}};u.haulage='pack';g.state.livestock=g.state.livestock!.filter(c=>c.id!==a.id);finish(g,u);u.order='return';g.banner(`${a.species==='cattle'?'Draft cattle':'Pack horse'} trained at the stable`,4);return true;
 }
 if(!atBuilding(g,u,pen,dt))return true;
 if(w.phase==='feed'){
  if(u.carryType==='food'&&u.carry>0){const delivered=Math.min(u.carry,Math.max(0,penFeedCapacity(pen)-pasture.feed));pasture.feed+=delivered;pasture.feedDelivered!+=delivered;u.carry-=delivered;}
  if(u.carry>1e-8){w.phase='deliver';u.workReason='Feed store full — returning the remaining plant food';return true;}
  u.carry=0;u.carryType=null;u.carryFood=undefined;w.phase='pen';return true;
 }
 if(w.action!=='care') {
  const a=g.state.livestock?.find(a=>a.id===w.animal&&a.hp>0&&a.pen===pen.id&&a.ledBy===undefined);
  if(!a){finish(g,u);return true;}
  if(w.action==='shear'&&Math.hypot(u.x-a.x,u.z-a.z)>2.4){u.tx=a.x;u.tz=a.z;g.steer(u,dt);u.workReason='Reaching the sheep to remove its fleece';return true;}
  w.progress+=dt;if(w.progress<(w.action==='shear'?SHEEP_RULES.shearSeconds:w.action==='pack'&&a.packHarness?PACK_HARNESS_RULES.refitSeconds:30))return true;
  if(w.action==='shear'){if(a.species!=='sheep'||!a.fleece){finish(g,u);return true;}const n=Math.floor(a.fleece.units);if(n<1){finish(g,u);return true;}a.fleece.units-=n;a.fleece.shearedUnits+=n;a.fleece.lastShearedAt=g.state.time;(u.itemCargo??={}).rawWool=(u.itemCargo?.rawWool||0)+n;w.phase='deliver';w.progress=0;u.workReason='Carrying the actual clipped wool to storage';return true;}
  if(w.action==='pack'){
   if(a.species!=='goat'&&!a.packHarness){finish(g,u);return true;}
   if(!a.packHarness&&g.tribe(u.team).wood<2){u.workReason='Harness needs two logs';return true;}
   if(!a.packHarness)g.tribe(u.team).wood-=2;u.packAnimal={...packAnimalFrom(a),packHarness:a.packHarness?{...a.packHarness}:{version:1,preparedAt:g.state.time,wood:2,workSeconds:30}};u.haulage='pack';
   g.state.livestock=g.state.livestock!.filter(c=>c.id!==a.id);finish(g,u);u.order='return';g.banner('The animal is carrying packs for its handler',4);
  }else{
   a.hp=0;
   a.carcass={meat:CARCASS_MEAT[a.species],diedAt:g.state.time,...(animalProcessingEnabled(g,u.team)?{hides:1,bones:2}:{})};
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
 if((calendar(g).phase===3||pasture.condition<.2)&&pasture.feed<Math.max(1,penCareDemand(penAnimals(g,pen.id))*PEN_RULES.feedPerAnimalSecond*60)&&penAnimals(g,pen.id).length){w.phase='fetch';return true;}
 if(w.progress>=30){
  w.progress=0;
  const carcass=g.state.livestock?.find(a=>a.pen===pen.id&&carcassAvailable(g,a));
  if(carcass?.carcass){const n=Math.min(carryingCapacity(u,'food'),carcass.carcass.meat);carcass.carcass.meat-=n;u.carry=n;u.carryType='food';u.carryFood='meat';w.phase='deliver';return true;}
  const animals=penAnimals(g,pen.id).filter(a=>insidePen(pen,a.x,a.z));let milk=0,room=carryingCapacity(u,'food');
  if(penNeedsBedding(g,pen)&&!Object.values(u.itemCargo||{}).some(n=>(n||0)>0)){w.phase='beddingFetch';w.progress=0;return true;}
  if(animals.reduce((n,a)=>n+a.milk,0)<1)return true;
  for(const a of animals){const n=herdRules(a.species).milkPerSecond>0?Math.min(a.milk,room-milk):0;milk+=n;a.milk-=n;}
  if(milk>=1){u.carry=milk;u.carryType='food';u.carryFood='milk';w.phase='deliver';}
 }
 return true;
}
export function tickHusbandry(g:Game,dt:number) {
 reconcileDomestication(g);
 reconcilePenBedding(g);
 reconcilePenWater(g);
 if(dt<=0)return;
 const livestock=g.state.livestock??[];
 // Transit is stepped once here, not by the home pen or its keepers. No remote
 // feed/water, breeding, milk or fleece accrues while an animal is on the road.
 for(const a of livestock)if(a.hp>0&&a.ledBy!==undefined){
  const leader=g.state.units.find(u=>u.id===a.ledBy&&u.hp>0&&!u.prisoner);
  if(!leader){delete a.ledBy;continue;}
  if(!leader.boat&&Math.hypot(a.x-leader.x,a.z-leader.z)>2)animalStep(g,a,leader,leader.x,leader.z,dt);
  a.hunger=Math.min(100,a.hunger+dt*.055);
  if(a.hunger>80)a.hp=Math.max(0,a.hp-dt*.08);
  if(g.state.survivalVersion===1){const before=a.thirstSeconds??0;a.thirstSeconds=before+dt;const exposure=Math.max(0,a.thirstSeconds-PEN_WATER_RULES.thirstGraceSeconds)-Math.max(0,before-PEN_WATER_RULES.thirstGraceSeconds);a.hp=Math.max(0,a.hp-exposure*a.maxHp/PEN_WATER_RULES.thirstFatalExposureSeconds);}
  if(a.hp<=0){delete a.ledBy;a.carcass={meat:CARCASS_MEAT[a.species]/2,diedAt:g.state.time};}
 }
 const activePens=new Set(livestock.filter(a=>a.hp>0).map(a=>a.pen));
 if(!livestock.length&&!g.state.buildings.some(b=>b.type==='pen'&&b.pasture&&(b.pasture.condition<1||b.pasture.care>0)))return;
 const handlers=new Set(g.state.units.filter(u=>u.hp>0).flatMap(u=>[...u.tamingWork&&!u.tamingWork.paused?[u.tamingWork.animal]:[],...u.husbandryWork?.animal!==undefined&&!u.husbandryWork.paused?[u.husbandryWork.animal]:[]]));
 for(const pen of g.state.buildings.filter(b=>b.type==='pen'&&g.finished(b)&&(activePens.has(b.id)||b.pasture&&(b.pasture.condition<1||b.pasture.care>0)))){
  const herd=penAnimals(g,pen.id),p=penPastureState(pen),reserved=penPlacesReserved(g,pen.id);let occupied=penPlacesOccupied(g,pen.id);
  p.care=Math.max(0,p.care-dt*PEN_RULES.careDecayPerAnimalSecond*Math.max(1,penCareDemand(herd))*usePenBedding(g,pen,dt));
  if(!herd.length&&p.condition>=1)continue;
  const r=penPastureReport(g,pen);
  // A finite edible biomass pool, regenerated from usable land and climate.
  let biomass=Math.min(r.biomassCapacity,p.condition*r.biomassCapacity+r.regrowthPerSecond*dt);

  for(const a of herd){
   const arrived=insidePen(pen,a.x,a.z),need=PEN_RULES.feedPerAnimalSecond*dt*herdRules(a.species).careMultiplier;
   const grazed=arrived&&!r.winter?Math.min(need,biomass):0;biomass-=grazed;p.grazedFood!+=grazed;
   const stored=arrived?Math.min(Math.max(0,need-grazed),p.feed):0;p.feed-=stored;p.feedConsumed!+=stored;
   const fedFraction=Math.min(1,(grazed+stored)/Math.max(1e-12,need)),fed=fedFraction>=1-1e-8;
   const hydrated=drinkPenWater(g,pen,a,dt);
   a.hunger=Math.max(0,Math.min(100,a.hunger+dt*(fed?-.3:.055*(1-fedFraction))));
   if(a.hunger>80)a.hp=Math.max(0,a.hp-dt*.08);else if(fed&&hydrated&&p.care>.2)a.hp=Math.min(a.maxHp,a.hp+dt*.015);
   const adult=g.state.time-a.born>=herdRules(a.species).maturity;
   if(a.hp<=0){a.carcass={meat:CARCASS_MEAT[a.species]/2,diedAt:g.state.time};occupied-=herdRules(a.species).places;continue;}
   if(!handlers.has(a.id)&&arrived&&g.state.animalBehaviourVersion===1)penStep(g,a,pen,dt,(x,z)=>insidePen(pen,x,z,.15),herd,false);
   else if(!handlers.has(a.id)&&arrived){
    a.wanderT-=dt;if(a.wanderT<=0){a.wanderT=3+(a.id%5);a.facing+=1.4;}
    const x=a.x+Math.sin(a.facing)*dt*.35,z=a.z+Math.cos(a.facing)*dt*.35;
    if(insidePen(pen,x,z,.15)&&g.walkable(x,z)){a.x=x;a.z=z;a.y=g.height(x,z);}else a.facing+=Math.PI;
   }
   growFleece(a,dt,arrived&&adult&&fed&&hydrated&&p.care>.2&&a.hunger<30);
   if(arrived&&a.sex==='female'&&adult&&a.hunger<30&&fed&&hydrated&&p.care>.2){
    const male=herd.some(m=>m.species===a.species&&m.sex==='male'&&insidePen(pen,m.x,m.z)&&g.state.time-m.born>=herdRules(m.species).maturity);
    if(male&&occupied+reserved+herdRules(a.species).places<=r.eligibleCapacity)a.pregnancy=Math.min(herdRules(a.species).gestation,a.pregnancy+dt);
    if(a.pregnancy>=herdRules(a.species).gestation&&occupied+reserved+herdRules(a.species).places<=r.eligibleCapacity&&livestock.length<PEN_RULES.maximumAnimalsTotal){
     a.pregnancy=0;a.lactatingUntil=g.state.time+HERD.lactation;
     // Birth inherits biology, not the dam's paid equipment, consumption or task state.
     const id=g.id();livestock.push({id,species:a.species,team:a.team,pen:pen.id,
      x:a.x,y:a.y,z:a.z,facing:a.facing,vx:0,vz:0,wanderT:0,fly:0,
      sex:id%2?'female':'male',born:g.state.time,tamedAt:g.state.time,
      milk:0,pregnancy:0,lactatingUntil:0,hp:a.maxHp,maxHp:a.maxHp,hunger:5,thirstSeconds:0,
      foodConsumed:0,waterConsumedLiters:0,adultScale:a.adultScale??1,scale:(a.adultScale??1)*.6,
      ...(a.species==='sheep'?{fleece:newFleece()}: {})});occupied+=herdRules(a.species).places;
     if(a.team===0)g.banner(a.species==='cattle'?'A calf was born':a.species==='horse'?'A foal was born':a.species==='sheep'?'A lamb was born':'A kid was born',4);
    }
    if(herdRules(a.species).milkPerSecond>0&&(a.lactatingUntil||0)>g.state.time)a.milk=Math.min(herdRules(a.species).milkCapacity,a.milk+dt*herdRules(a.species).milkPerSecond);
   }
   a.scale=(a.adultScale??1)*(.6+.4*Math.min(1,(g.state.time-a.born)/herdRules(a.species).maturity));
  }
  p.condition=r.biomassCapacity?Math.max(0,Math.min(1,biomass/r.biomassCapacity)):0;
 }
 // A destroyed/abandoned pen releases actual surviving animals, with identity intact.
 for(const a of livestock){
  if(a.hp>0&&a.ledBy===undefined&&!penAt(g,a.pen,a.team)){
   if(!g.state.wildlife.some(c=>c.id===a.id))g.state.wildlife.push({id:a.id,species:a.species,...(a.fleece?{fleece:{...a.fleece}}:{}),x:a.x,y:a.y,z:a.z,facing:a.facing,vx:0,vz:0,wanderT:0,hp:a.hp,maxHp:a.maxHp,fly:0,scale:a.scale,grazing:{x:a.x,z:a.z}});
   a.hp=0;a.carcass=undefined;
  }
 }
 if(g.state.livestock)g.state.livestock=livestock.filter(a=>a.hp>0||carcassAvailable(g,a));
}
