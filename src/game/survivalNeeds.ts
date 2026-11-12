import {herdRules} from './animalSpecies';
import {PACK_ANIMAL_RULES} from './packAnimalState';
import {presentationHearthHeating,presentationSurvivalFireActive} from './presentationSurvivalView';
import{HOUSING_RULES}from'./housingRules';
import{tickGarmentHeat}from'./textiles';
import{ecologicalTemperatureOffsetAt}from'./ecologicalProvinces';
import{herdWaterDemand}from'./penWater';
import {scoutIndependentNeeds} from './scoutProvisions';
import{waterVesselCapacity,wearWaterVessel}from'./pottery';
import {coastalIndependentNeeds} from './coastalTrade';
import {clothingWarmth,PRODUCTION_RECIPES} from './production';
import {campMoveIndependentNeeds} from './nomadicCamp';
import {societyMissionIndependentNeeds} from './rivalActivity';
import {prisonerIndependentNeeds} from './captivity';
import type {Game} from './sim';
import type {Building,GameState,Unit} from './types';
import {hasTaskCommitment} from './workCommitments';
import {isDependent} from './settlement';
import {supplyApproach,supplyReached} from './campAnchor';
export const SURVIVAL_RULES={version:1,waterLitersPerPersonSecond:.008,startingWaterSeconds:600,
 waterWarningSeconds:180,autoCollectBelowSeconds:240,waterTripLiters:24,collectSeconds:12,
 sourceSearchMeters:900,thirstGraceSeconds:180,thirstFatalExposureSeconds:1800,
 coldThresholdCelsius:6,fireWarmthCelsius:9,shelterWarmthCelsius:5,fireRadiusMeters:48,hearthSearchMeters:240,maximumHearthCandidates:4,
 woodPerPersonColdSecond:.003,coldGraceSeconds:180,coldFatalExposureSeconds:2400,
 recoverySecondsPerSecond:3} as const;
export type SurvivalStock={waterHerdTransferredInLiters?:number;waterHerdTransferredOutLiters?:number;waterHerdWithdrawnLiters?:number;waterHerdReturnedLiters?:number;waterHerdConsumedLiters?:number;waterHerdLostLiters?:number;waterLiters:number;waterConsumedLiters:number;waterDeliveredLiters:number;waterLostLiters:number;fuelBurnedWood:number;waterShortageSeconds:number;coldExposurePersonSeconds:number};
export type WaterWork={sourceX:number;sourceZ:number;bankX:number;bankZ:number;phase:'outbound'|'collecting'|'returning';progressSeconds:number;liters:number;paused?:boolean};
const emptyStock=(waterLiters=0):SurvivalStock=>({waterLiters,waterConsumedLiters:0,waterDeliveredLiters:0,waterLostLiters:0,fuelBurnedWood:0,waterShortageSeconds:0,coldExposurePersonSeconds:0});
const residents=(g:Game,team:number)=>g.state.units.filter(u=>u.team===team&&u.hp>0&&!u.expedition&&!u.visit);
const burningFires=new WeakMap<Game,Set<number>>();
const heatingHearths=new WeakMap<Game,Set<number>>();
export const hearthHeating=(g:Game,id:number)=>presentationHearthHeating(g,id)??heatingHearths.get(g)?.has(id)??false;
const huddles=new WeakMap<Unit,{state:GameState;fire:Building;spot:{x:number;z:number};productionId?:number}>();
const warmingReason='Warming up by the lit hearth';

/** Read the real transient warmth visit without creating, advancing or clearing it. */
export function fireWarmingVisit(state:GameState,u:Unit){
 const visit=huddles.get(u);
 if(!visit||visit.state!==state||u.hp<=0||u.order!=='hold'||u.workReason!==warmingReason||u.emergency||u.stuckT>=5||(u.coldSeconds??0)<=0||visit.fire.hp<=0||visit.fire.build<1||!state.buildings.includes(visit.fire))return undefined;
 if(visit.productionId!==undefined){
  const p=state.production?.projects.find(p=>p.id===visit.productionId&&p.id===u.productionProjectId&&p.actorId===u.id&&p.team===u.team);
  if(!p||p.pauseCause||!['collecting','carrying','working','ready','returning'].includes(p.phase)||hasTaskCommitment(u,'productionProjectId'))return undefined;
 }else if(hasTaskCommitment(u))return undefined;
 return {fireId:visit.fire.id,x:visit.fire.x,z:visit.fire.z,atFire:Math.hypot(u.x-visit.spot.x,u.z-visit.spot.z)<=1};
}

function warmingProduction(g:Game,u:Unit){
 const p=g.state.production?.projects.find(p=>p.id===u.productionProjectId&&p.actorId===u.id&&p.team===u.team);
 return p&&!p.pauseCause&&['collecting','carrying','working','ready','returning'].includes(p.phase)&&!hasTaskCommitment(u,'productionProjectId')?p:undefined;
}
export function fireWarmingAI(g:Game,u:Unit,dt:number){
 const visit=huddles.get(u);
 if(!visit)return false;
 if(visit.state!==g.state||u.order!=='hold'||u.workReason!==warmingReason||u.emergency||
    (visit.productionId!==undefined?warmingProduction(g,u)?.id!==visit.productionId:hasTaskCommitment(u))||u.stuckT>=5||!g.finished(visit.fire)||!hearthHeating(g,visit.fire.id)||(u.coldSeconds??0)<=0){
  huddles.delete(u);
  if(u.order==='hold'&&u.workReason===warmingReason){
   u.order=g.state.autoWorkEnabled===false?'hold':'idle';
   u.workReason='Warmed up at the hearth';
  }
  return false;
 }
 u.tx=visit.spot.x;u.tz=visit.spot.z;
 if(Math.hypot(u.x-u.tx,u.z-u.tz)>1&&u.stuckT<5)g.steer(u,dt);
 return true;
}

function sendColdResidentsToFire(g:Game,people:Unit[],fires:Building[]){
 for(const u of people){
  if(u.team!==0||(u.coldSeconds??0)<12||huddles.has(u))continue;
  const paid=(u.coldSeconds??0)>=SURVIVAL_RULES.coldGraceSeconds?warmingProduction(g,u):undefined;
  const ordinary=!u.jobLock&&free(g,u)&&['hold','idle'].includes(u.order);
  if(!ordinary&&(!paid||u.hp<=0||u.militia||u.emergency||u.recalled||u.resting||u.shelterId||u.buildOrder||u.drill!=null||!['hold','idle'].includes(u.order)))continue;
  if(fires.some(b=>Math.hypot(b.x-u.x,b.z-u.z)<6))continue;
  const nearby=fires.filter(b=>Math.hypot(b.x-u.x,b.z-u.z)<SURVIVAL_RULES.hearthSearchMeters)
   .sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z)).slice(0,SURVIVAL_RULES.maximumHearthCandidates);
  for(const fire of nearby){
   const spot=g.interactionSpot(u,fire);
   if(!spot)continue;
   u.order='hold';u.node=null;u.target=null;u.workReason=warmingReason;u.stuckT=0;
   huddles.set(u,{state:g.state,fire,spot,...(paid?{productionId:paid.id}:{})});g.invalidateRoute(u);
   break;
  }
 }
}
export const survivalFireActive=(g:Game,team=0)=>g.state.survivalVersion===1&&(presentationSurvivalFireActive(g,team)??burningFires.get(g)?.has(team)??false);
export function initializeSurvival(g:Game){
 burningFires.delete(g);heatingHearths.delete(g);
 g.state.survivalVersion=1;autoCheck.delete(g);
 for(const t of g.state.tribes)t.survival=emptyStock(residents(g,t.id).length*SURVIVAL_RULES.waterLitersPerPersonSecond*SURVIVAL_RULES.startingWaterSeconds);
}
export function ambientTemperature(g:Game){
 // Match the game's displayed rounded ambient temperature, including night.
 const display=g.clockState().weather.match(/(-?\d+)°C/);return display?Number(display[1]):10;
}
export function localAirTemperature(g:Game,x:number,z:number,ambient=ambientTemperature(g)){
 const grid=g.world.ecology;
 return ambient+(grid?ecologicalTemperatureOffsetAt(grid,x,z):0);
}
function sheltered(g:Game,u:Unit){
 const requested=u.housingUse?.buildingId??u.shelterId;let best:import('./types').Building|undefined,distance=Infinity;
 for(const b of g.state.buildings){if(b.team!==u.team||!['hut','house','townhall','keep'].includes(b.type)||!g.finished(b))continue;const d=Math.hypot(u.x-b.x,u.z-b.z);if(u.shelterId!==b.id&&d>=Math.max(b.w,b.d)*.5+4)continue;if(b.id===requested)return b;if(d<distance){best=b;distance=d;}}return best;
}

function shelterWarmth(g:Game,u:Unit){const b=sheltered(g,u);return b?SURVIVAL_RULES.shelterWarmthCelsius+(b.type==='house'?HOUSING_RULES.shelterWarmthCelsius:0):0;}
function fireDemand(g:Game,team:number,ambient:number){
 // Heating follows actual exposed residents, not only weather at the camp.
 const cold=residents(g,team).filter(u=>localAirTemperature(g,u.x,u.z,ambient)+clothingWarmth(u)+shelterWarmth(g,u)<SURVIVAL_RULES.coldThresholdCelsius);
 return cold.length*SURVIVAL_RULES.woodPerPersonColdSecond;
}
export function survivalStatus(g:Game,team=0){
 const t=g.tribe(team),stock=t?.survival,enabled=g.state.survivalVersion===1&&!!stock,people=residents(g,team),home=g.campOf(team),homeTemp=localAirTemperature(g,home.x,home.z),temp=Math.round(homeTemp);
 const demand=people.filter(u=>!scoutIndependentNeeds(u)&&!prisonerIndependentNeeds(u)&&!societyMissionIndependentNeeds(g,u)&&!coastalIndependentNeeds(g,u)&&!campMoveIndependentNeeds(g,u)).length*SURVIVAL_RULES.waterLitersPerPersonSecond+herdWaterDemand(g,team)+g.state.units.filter(u=>u.team===team&&u.hp>0&&u.haulage==='pack'&&u.packAnimal&&u.packAnimal.hp>0).reduce((n,u)=>n+herdRules(u.packAnimal?.species??'goat').careMultiplier,0)*PACK_ANIMAL_RULES.waterPerSecond,fuelDemand=fireDemand(g,team,ambientTemperature(g));
 const water=stock?.waterLiters??0,fuel=t?.wood??0,waterSeconds=demand?water/demand:Infinity,fuelSeconds=fuelDemand?fuel/fuelDemand:Infinity;
 const coldResidents=people.filter(u=>(u.coldSeconds??0)>0).length,waterWorkers=people.filter(u=>u.waterWork&&!u.waterWork.paused).length;
 const warnings:string[]=[];
 if(enabled){
  if(waterSeconds<SURVIVAL_RULES.waterWarningSeconds)warnings.push(water<=0?'Drinking water empty — send a water carrier':'Drinking water low — collect from freshwater');
  if(fuelDemand>0&&fuelSeconds<180)warnings.push(fuel<=0?'No firewood — gather timber before exposure worsens':'Firewood low — gather timber for warmth');
  if(coldResidents)warnings.push(`${coldResidents} residents recovering from cold exposure — shelter and firewood help`);
 }
 return {enabled,water,waterSeconds,fuel,fuelSeconds,coldResidents,warnings,waterWorkers,
  fuelWorkers:people.filter(u=>u.order==='gather'&&u.job==='wood').length,temp,waterDemandLitersPerSecond:demand,
  fuelDemandWoodPerSecond:fuelDemand,sheltered:people.filter(u=>sheltered(g,u)).length,metrics:stock};
}
function free(g:Game,u:Unit,automatic=false){
 return u.hp>0&&u.type==='worker'&&!isDependent(g,u)&&!u.militia&&!u.emergency&&!u.boat&&!u.recalled&&!u.expedition&&!u.scout&&!u.visit&&!u.envoy&&!u.foundingJourney&&!u.tributeJourney&&!u.resting&&
 !u.buildOrder&&u.drill==null&&!u.haulage&&u.carry===0&&!hasTaskCommitment(u,'waterWork')&&(!u.waterWork||u.waterWork.paused)&&
 (automatic?(!u.jobLock&&['idle','gather',...(g.state.autoWorkEnabled===false?['hold']:[])].includes(u.order)):['idle','hold','gather','return','move'].includes(u.order));
}
type Source={sourceX:number;sourceZ:number;bankX:number;bankZ:number};
/** Matches steer's physical destination collision test, including the actor's
 * radius. A coarse walk-grid cell can be free while the exact point is indoors. */
function bankClear(g:Game,u:Unit,x:number,z:number){
 return g.walkable(x,z)&&!g.state.buildings.some(b=>g.solidBuilding(b)&&Math.abs(x-b.x)<=b.w*.4+u.r&&Math.abs(z-b.z)<=b.d*.4+u.r);
}
function sourceWet(g:Game,source:Source){return g.height(source.sourceX,source.sourceZ)<=g.waterAt(source.sourceX,source.sourceZ)+.25;}
function sourceFor(g:Game,u:Unit,avoid?:{x:number;z:number}):Source|null{
 const sources:{x:number;z:number}[]=[];
 for(const river of g.world.rivers)for(let i=1;i<river.pts.length-2;i++){
  const a=river.pts[i-1],b=river.pts[i],steps=Math.max(1,Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/8));
  for(let j=0;j<steps;j++)sources.push({x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps});
 }
 for(const lake of g.world.features??[])if(lake.kind==='lake')sources.push(lake);
 // Elevated lakes can be wider than the bank search radius. Inspect their
 // actual irregular shoreline rather than treating the lake centre as a bank.
 for(const body of g.world.waterBodies??[])if(body.kind==='lake'&&body.shoreline){
  const stride=Math.max(1,Math.floor(body.shoreline.length/16));
  for(let i=0;i<body.shoreline.length;i+=stride){const p=body.shoreline[i];sources.push({x:body.x+(p.x-body.x)*.94,z:body.z+(p.z-body.z)*.94});}
 }
 const candidates:Source[]=[];
 for(const p of sources){
  if(Math.hypot(p.x-u.x,p.z-u.z)>SURVIVAL_RULES.sourceSearchMeters)continue;

  if(g.height(p.x,p.z)>g.waterAt(p.x,p.z)+.25)continue;
  for(const d of [8,16,24,32])for(let i=0;i<12;i++){
   const a=i*Math.PI/6,x=p.x+Math.cos(a)*d,z=p.z+Math.sin(a)*d;
   if(u.team===0&&!g.exploredAt(x,z))continue;
   if(avoid&&Math.hypot(x-avoid.x,z-avoid.z)<4)continue;
   if(!bankClear(g,u,x,z)||!g.workBoard.connected(g,u.x,u.z,x,z))continue;
   // Collection is physically beside fresh water, rather than from a distant
   // dry waypoint that happens to be close to a river's metadata.
   const reach=Array.from({length:8},(_,j)=>{const a=j*Math.PI/4;return g.height(x+Math.cos(a)*5,z+Math.sin(a)*5)<g.waterAt(x+Math.cos(a)*5,z+Math.sin(a)*5)+.2;}).some(Boolean);
   if(reach)candidates.push({sourceX:p.x,sourceZ:p.z,bankX:x,bankZ:z});
  }
 }
 candidates.sort((a,b)=>Math.hypot(a.bankX-u.x,a.bankZ-u.z)-Math.hypot(b.bankX-u.x,b.bankZ-u.z));return candidates[0]??null;
}
type WaterProposal={reason:string|null;u?:Unit;source?:Source|null};
function proposal(g:Game,team:number,automatic=false):WaterProposal{
 if(g.state.survivalVersion!==1||!g.tribe(team)?.survival)return {reason:'This saved village uses the previous survival rules'};
 const adults=[...g.state.units].filter(u=>u.team===team&&free(g,u,automatic)).sort((a,b)=>Number(b.selected)-Number(a.selected));
 if(!adults.length)return {reason:'Choose an empty-handed adult without a reserved project'};
 for(const u of adults){
  const paused=u.waterWork;
  if(paused?.paused){
   // Loaded water always returns through its real delivery executor. Empty
   // paused jobs only resume their old bank while it remains physically valid.
   if(paused.phase==='returning'||bankClear(g,u,paused.bankX,paused.bankZ)&&sourceWet(g,paused))return {u,source:null,reason:null};
   const source=sourceFor(g,u,{x:paused.bankX,z:paused.bankZ});if(source)return {u,source,reason:null};continue;
  }
  const source=sourceFor(g,u);if(source)return {u,source,reason:null};
 }
 return {reason:'Explore a freshwater bank reachable by land before collecting water'};
}
const issueCache=new WeakMap<Game,Map<number,{time:number;reason:string|null}>>();
export function waterCollectionIssue(g:Game,team=0){
 let cache=issueCache.get(g);if(!cache){cache=new Map();issueCache.set(g,cache);}
 const prior=cache.get(team);if(prior&&g.state.time>=prior.time&&g.state.time-prior.time<1)return prior.reason;
 const reason=proposal(g,team).reason??null;cache.set(team,{time:g.state.time,reason});return reason;
}
export function pauseWaterCollection(u:Unit){if(u.waterWork)u.waterWork.paused=true;}
export function validSurvivalState(state:GameState):boolean{
 if(state.survivalVersion!==undefined&&state.survivalVersion!==1)return false;
 const finite=(n:unknown,max=1e12)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
 for(const tr of state.tribes){
  if(tr.survival!==undefined){if(!tr.survival||typeof tr.survival!=='object')return false;
   for(const key of ['waterLiters','waterConsumedLiters','waterDeliveredLiters','waterLostLiters','fuelBurnedWood','waterShortageSeconds','coldExposurePersonSeconds'] as const)if(!finite(tr.survival[key]))return false;}
  if(state.survivalVersion===1&&!tr.survival)return false;
 }
 for(const u of state.units){
  if(u.thirstSeconds!==undefined&&!finite(u.thirstSeconds))return false;if(u.coldSeconds!==undefined&&!finite(u.coldSeconds))return false;
  const w=u.waterWork;if(w!==undefined){if(!w||typeof w!=='object'||!['outbound','collecting','returning'].includes(w.phase))return false;
   for(const key of ['sourceX','sourceZ','bankX','bankZ'] as const)if(typeof w[key]!=='number'||!Number.isFinite(w[key])||Math.abs(w[key])>(state.worldOptions?.size??1040)/2+32)return false;
   if(!finite(w.liters,waterVesselCapacity(u,SURVIVAL_RULES.waterTripLiters))||!finite(w.progressSeconds,SURVIVAL_RULES.collectSeconds*waterVesselCapacity(u,SURVIVAL_RULES.waterTripLiters)/SURVIVAL_RULES.waterTripLiters)||w.paused!==undefined&&typeof w.paused!=='boolean')return false;
   if(w.phase!=='returning'&&w.liters!==0)return false;
  }
 }
 return true;
}
export function beginWaterCollection(g:Game,team=0,automatic=false){
 issueCache.delete(g);const p=proposal(g,team,automatic);if(p.reason||!p.u)return {accepted:false,reason:p.reason??'No water carrier available'};
 const u=p.u,previous=u.waterWork;g.interruptMission(u);
 if(!previous)u.waterWork={...p.source!,phase:'outbound',progressSeconds:0,liters:0};
 else {u.waterWork=previous;if(p.source){Object.assign(previous,p.source);previous.phase='outbound';}previous.paused=false;}
 u.order='hold';u.node=null;u.target=null;g.invalidateRoute(u);g.workBoard.reset();
 u.workReason='Collecting drinking water from a freshwater bank';return {accepted:true,reason:'Water carrier dispatched',actorId:u.id};
}
/** Credits only cargo that physically reached a real supply entrance. */
export function deliverWaterCargo(g:Game,u:Unit):number{
 const work=u.waterWork,stock=g.tribe(u.team)?.survival;if(!work||work.liters<=0||!stock)return 0;
 const drop=g.nearestDrop(u.x,u.z,u.team),spot=drop?supplyApproach(g,u,drop):null;
 if(!drop||!spot||!supplyReached(g,u,drop,spot))return 0;
 const liters=work.liters;stock.waterLiters+=liters;stock.waterDeliveredLiters+=liters;u.waterWork=undefined;wearWaterVessel(g,u);return liters;
}
export function waterCollectionAI(g:Game,u:Unit,dt:number){
 const w=u.waterWork;
 if(!w||w.paused||u.order!=='hold'||u.emergency||g.state.survivalVersion!==1)return false;
 if(w.phase==='returning'){
  const drop=g.nearestDrop(u.x,u.z,u.team),spot=drop?supplyApproach(g,u,drop):null;
  if(!drop||!spot){u.workReason='Water cargo waiting for a reachable camp or store';return true;}
  u.tx=spot.x;u.tz=spot.z;if(!supplyReached(g,u,drop,spot)){g.steer(u,dt);u.workReason=`Returning ${w.liters.toFixed(0)} L of drinking water`;return true;}
  deliverWaterCargo(g,u);u.order='idle';u.workReason='Drinking water delivered';g.invalidateRoute(u);g.workBoard.reset();return true;
 }
 const replan=()=>{
  const alternate=sourceFor(g,u,{x:w.bankX,z:w.bankZ});
  if(alternate){Object.assign(w,alternate);w.phase='outbound';w.paused=false;u.stuckT=0;g.invalidateRoute(u);u.workReason='Water bank obstructed — approaching another freshwater bank';}
  else {w.paused=true;u.order='idle';g.invalidateRoute(u);g.workBoard.reset();u.workReason='No known clear freshwater bank — collection paused; explore or clear an approach';}
 };
 if(!bankClear(g,u,w.bankX,w.bankZ)||(u.stuckT??0)>30||!sourceWet(g,w)){replan();return true;}
 u.tx=w.bankX;u.tz=w.bankZ;
 if(Math.hypot(u.x-w.bankX,u.z-w.bankZ)>1.5){const arrived=g.steer(u,dt);if(arrived&&Math.hypot(u.x-w.bankX,u.z-w.bankZ)>1.5)replan();else u.workReason='Walking to a freshwater bank';return true;}
 const capacity=waterVesselCapacity(u,SURVIVAL_RULES.waterTripLiters),required=SURVIVAL_RULES.collectSeconds*capacity/SURVIVAL_RULES.waterTripLiters;
 w.phase='collecting';w.progressSeconds=Math.min(required,w.progressSeconds+dt);u.workReason=`Filling water vessels · ${Math.min(100,Math.floor(w.progressSeconds/required*100))}%`;
 if(w.progressSeconds>=required){w.liters=capacity;w.phase='returning';g.invalidateRoute(u);}
 return true;
}
const autoCheck=new WeakMap<Game,number>();
export function tickSurvival(g:Game,dt:number){
 if(g.state.survivalVersion!==1||dt<=0)return;
 const temp=ambientTemperature(g),rules=SURVIVAL_RULES;
 const activeFires=new Set<number>();burningFires.set(g,activeFires);
 const litHearths=new Set<number>();heatingHearths.set(g,litHearths);
 const review=g.state.time>=(autoCheck.get(g)??0);
 const cooking=new Set((g.state.production?.projects||[]).filter(p=>p.phase==='working'&&PRODUCTION_RECIPES[p.recipe].wood>0).map(p=>p.workplace));
 const hearths=g.state.buildings.filter(b=>b.type==='hearth'&&g.finished(b));
 const reconcileLost=()=>{for(const u of g.state.units)if(u.hp<=0&&u.waterWork){
  const stock=g.tribe(u.team)?.survival;if(stock)stock.waterLostLiters+=u.waterWork.liters;
  u.waterWork=undefined;
 }};reconcileLost();
 for(const tr of g.state.tribes){
  const stock=tr.survival;if(!stock)continue;
  const people=residents(g,tr.id);if(!people.length)continue;
  const demand=people.filter(u=>!scoutIndependentNeeds(u)&&!prisonerIndependentNeeds(u)&&!societyMissionIndependentNeeds(g,u)&&!coastalIndependentNeeds(g,u)&&!campMoveIndependentNeeds(g,u)).length*rules.waterLitersPerPersonSecond*dt,used=Math.min(stock.waterLiters,demand),shortfall=demand>0?1-used/demand:0;
  stock.waterLiters=Math.max(0,stock.waterLiters-used);stock.waterConsumedLiters+=used;stock.waterShortageSeconds+=dt*shortfall;
  const home=g.campOf(tr.id),homeTemp=localAirTemperature(g,home.x,home.z,temp);
  const fuelNeeded=fireDemand(g,tr.id,temp)*dt,fuel=Math.min(tr.wood,fuelNeeded),fireFraction=fuelNeeded?fuel/fuelNeeded:0;
  if(fuel>0)activeFires.add(tr.id);
  const fires=hearths.filter(b=>b.team===tr.id&&(fireFraction>0||cooking.has(b.id)));
  for(const hearth of fires)litHearths.add(hearth.id);
  if(review&&fires.length)sendColdResidentsToFire(g,people,fires);
  tr.wood=Math.max(0,tr.wood-fuel);stock.fuelBurnedWood+=fuel;
  for(const u of people){
   if(!scoutIndependentNeeds(u)&&!prisonerIndependentNeeds(u)&&!societyMissionIndependentNeeds(g,u)&&!coastalIndependentNeeds(g,u)&&!campMoveIndependentNeeds(g,u)){
   const beforeThirst=u.thirstSeconds??0;u.thirstSeconds=Math.max(0,beforeThirst+dt*(shortfall>0?shortfall:-rules.recoverySecondsPerSecond));
   const thirstDamage=Math.max(0,u.thirstSeconds-rules.thirstGraceSeconds)-Math.max(0,beforeThirst-rules.thirstGraceSeconds);
   if(thirstDamage>0)u.hp-=thirstDamage*u.maxHp/rules.thirstFatalExposureSeconds;
   }
   let fire=Math.hypot(u.x-home.x,u.z-home.z)<=rules.fireRadiusMeters?fireFraction:0;
   for(const hearth of fires)if(Math.hypot(u.x-hearth.x,u.z-hearth.z)<=8)fire=Math.max(fire,cooking.has(hearth.id)?1:fireFraction);
   const localTemp=localAirTemperature(g,u.x,u.z,temp);
   if(u.garment)tickGarmentHeat(u,localTemp,dt);
   const effective=localTemp+clothingWarmth(u)+fire*rules.fireWarmthCelsius+shelterWarmth(g,u);
   const exposure=Math.max(0,Math.min(2,(rules.coldThresholdCelsius-effective)/6)),before=u.coldSeconds??0;
   u.coldSeconds=Math.max(0,before+dt*(exposure>0?exposure:-rules.recoverySecondsPerSecond));stock.coldExposurePersonSeconds+=dt*exposure;
   const coldDamage=Math.max(0,u.coldSeconds-rules.coldGraceSeconds)-Math.max(0,before-rules.coldGraceSeconds);
   if(coldDamage>0)u.hp-=coldDamage*u.maxHp/rules.coldFatalExposureSeconds;
  }
 }
 reconcileLost();
 // At most one ordinary carrier per society; automatic survival execution never
 // overrides a direct order or takes an actor from paid/reserved work.
 if(review){
  autoCheck.set(g,g.state.time+5);
  for(const tr of g.state.tribes){const status=survivalStatus(g,tr.id);if(status.enabled&&status.waterSeconds<rules.autoCollectBelowSeconds&&!status.waterWorkers)beginWaterCollection(g,tr.id,true);}
 }
}
