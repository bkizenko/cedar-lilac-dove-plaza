import{PRACTICAL_HELPER_RULES}from'./practicalHelpers';
import{CROP_TRIAL_RULES}from'./cultivation';
import{FIBRE_RULES}from'./fibre';
import {productionPracticeRate,observationRequired} from './productionPractice';
import {penPastureReport} from './penPasture';
import {PEN_RULES} from './penGeometry';
import {POTTERY_RULES,waterVesselCapacity} from './pottery';
import {PRODUCTION_RECIPES,productionSlots,itemCapacity} from './production';
import type {Game} from './sim';
import type {Unit,Building,ResourceNode,ResKind} from './types';
import type {HaulageProject} from './haulage';
import {BUILDINGS,BUILD_TIME,GATHER,GATHER_WORK_RATE} from './constants';
import {calendar,isDependent,foodDemand,farmHarvestEstimate} from './settlement';
import {predisposition} from './people';
import {farmToolRate} from './farmTools';
import {craftingBenches,craftingWorkplaceRate} from './crafting';
import {carryingCapacity,loadedHaulSpeed} from './haulage';
import {plotArea,expansionCost} from './plots';
import {planMissing} from './construction';
import {supplyDrops} from './campAnchor';
import {survivalStatus,SURVIVAL_RULES} from './survivalNeeds';
import {subsistenceLaborMultiplier} from './subsistenceBalance';
import {preservationTimberReserve} from './pantry';
import {CARCASS_MEAT} from './hunting';
import {rivalKnows} from './rivalDevelopment';
export const WORKLOAD_RULES=Object.freeze({version:1,horizonSeconds:180,minimumHorizonSeconds:30,maximumHorizonSeconds:900,
 reserveTargetSeconds:120,fallbackWalkingMetersPerSecond:3,fieldSowWorkSeconds:180,fieldTendWorkSeconds:220,
 fieldHarvestSecondsPerTwoFood:.8,fieldRowWorkSeconds:8,preservationWorkSeconds:8,preservationCarePerBatch:.2,preservationCareDecaySeconds:900,
 desiredStoreCare:.8,plantingSeconds:12,tamingSeconds:60,husbandryActionSeconds:30,careDecayPerSecond:.001,careGainPerWorkSecond:.012,
 fatigueRestThreshold:.85,fatigueRecoveryTarget:.12,fatigueWorkSeconds:240,fatigueRecoverySeconds:20});
export type WorkloadTask={id:string;label:string;category:string;personSeconds:number;status:'active'|'queued'|'blocked'|'paused'|'upcoming';actorIds:number[];priority:number;blocker:string|null;deadlineSeconds?:number;units?:number};
export type WorkloadPerson={id:number;name:string;role:string;capacitySeconds:number;restSeconds:number;fatigue:number;carrying:number;activeTask:string|null;freeNow:boolean;reason:string|null};
type WorkState=Game['state']&{haulageProjects?:HaulageProject[]};
const positive=(v:number)=>Math.max(0,Number.isFinite(v)?v:0);
function dutySeconds(u:Unit,horizon:number){const r=WORKLOAD_RULES;let fatigue=Math.max(0,Math.min(1,u.fatigue||0)),remaining=horizon,work=0,rest=0;
 while(remaining>1e-8){if(u.resting&&work===0&&rest===0||fatigue>=r.fatigueRestThreshold){const recovery=Math.min(remaining,Math.max(0,fatigue-r.fatigueRecoveryTarget)*r.fatigueRecoverySeconds);rest+=recovery;remaining-=recovery;fatigue=Math.max(r.fatigueRecoveryTarget,fatigue-recovery/r.fatigueRecoverySeconds);if(remaining<=0)break;}
  const untilRest=Math.max(0,(r.fatigueRestThreshold-fatigue)*r.fatigueWorkSeconds),use=Math.min(remaining,untilRest);if(use<=1e-8)break;work+=use;remaining-=use;fatigue+=use/r.fatigueWorkSeconds;
 }return{work,rest};}
function outsideRole(g:Game,u:Unit){return isDependent(g,u)?'Growing up':u.prisoner?'In custody':(u.militia||!['worker','leader'].includes(u.type))&&!(u.militia&&u.huntOnly&&u.order==='gather'&&u.node&&'species'in u.node)?'Guard / military':u.type==='leader'?'Leader':u.emergency?'Emergency response':u.shelterId!==undefined&&g.state.weather==='storm'?'Sheltering from storm':('societyMissionId' in u&&u.societyMissionId)||('coastalVoyageId' in u&&u.coastalVoyageId)||u.envoy||u.scout||u.expedition||u.visit||u.tributeJourney||u.foundingJourney||u.boat||u.order==='trade'||u.order==='explore'?'Away / transport mission':u.drill!==undefined?'Military practice':null;}
/** Snapshot only: never calls the mutating crop(), work board, project sync,
 * route searches, reservations, assignment commands or inventory initializers. */
export function measureVillageWorkload(g:Game,team=0,options:{horizonSeconds?:number}={}){
 const r=WORKLOAD_RULES,H=Math.max(r.minimumHorizonSeconds,Math.min(r.maximumHorizonSeconds,Number.isFinite(options.horizonSeconds)?options.horizonSeconds!:r.horizonSeconds)),cal=calendar(g),residents=g.state.units.filter(u=>u.team===team&&u.hp>0),adults=residents.filter(u=>!isDependent(g,u));
 const liveProduction=[...new Map((g.state.production?.projects||[]).filter(p=>p.team===team&&p.phase!=='complete'&&p.phase!=='lost').map(p=>[p.id,p])).values()],productionOwners=new Set(liveProduction.filter(p=>p.actorId!==null).map(p=>p.actorId!));
 const itemLoad=(u:Unit)=>Object.values(u.itemCargo||{}).reduce((n,v)=>n+(v||0),0);
 const people:WorkloadPerson[]=residents.map(u=>{const outside=outsideRole(g,u),duty=outside?{work:0,rest:0}:dutySeconds(u,H);return{id:u.id,name:u.name||`Resident ${u.id}`,role:outside||(u.militia&&u.huntOnly?'Armed hunter':'Civilian'),capacitySeconds:duty.work,restSeconds:duty.rest,fatigue:u.fatigue||0,carrying:u.carry+itemLoad(u),activeTask:null,freeNow:!outside&&!u.resting&&!productionOwners.has(u.id)&&u.carry===0&&itemLoad(u)===0&&(!u.waterWork||u.waterWork.paused===true)&&(!u.fibreWork||u.fibreWork.paused===true)&&(!u.clayWork||u.clayWork.paused===true)&&(!u.productionApprentice||['paused','waiting'].includes(u.productionApprentice.phase))&&(!u.practicalHelper||u.practicalHelper.phase==='paused')&&['idle','hold'].includes(u.order),reason:outside||u.resting?'Rest or existing duty limits civilian time':u.sickUntil&&u.sickUntil>g.state.time?'Illness recorded; no invented extra work penalty':null};});
 const eligible=adults.filter(u=>!outsideRole(g,u)),byId=new Map(people.map(p=>[p.id,p])),home=g.campOf(team),stock=g.tribe(team),tasks:WorkloadTask[]=[],keys=new Set<string>(),claimed=new Map<number,string>();
 const speed=(u?:Unit)=>u?Math.max(.5,u.speed*predisposition(u).speed*(1-(u.fatigue||0)*.12)*loadedHaulSpeed(u)):r.fallbackWalkingMetersPerSecond;
 const supply=supplyDrops(g,team);
 const nearestDrop=(x:number,z:number)=>{return supply.reduce((best,d)=>Math.min(best,Math.hypot(d.x-x,d.z-z)),Infinity);};
 const trip=(x:number,z:number,u?:Unit)=>{const distance=nearestDrop(x,z);return Number.isFinite(distance)?distance/speed(u):Math.hypot(home.x-x,home.z-z)/speed(u);};
 const travel=(u:Unit,x:number,z:number)=>Math.hypot(u.x-x,u.z-z)/speed(u);
 const add=(task:WorkloadTask,keepZero=false)=>{if(keys.has(task.id)||task.personSeconds<=1e-8&&!keepZero)return;keys.add(task.id);task.actorIds=[...new Set(task.actorIds)];if(task.status==='active'&&task.actorIds.length&&task.actorIds.every(id=>claimed.has(id))){task.status='queued';task.blocker??='Assigned residents finish their current commitment first';}tasks.push(task);
  if(task.status!=='paused')for(const id of task.actorIds)if(!claimed.has(id)&&byId.get(id)?.capacitySeconds){claimed.set(id,task.id);byId.get(id)!.activeTask=task.label;byId.get(id)!.freeNow=false;}
 };
 const workersAt=(id:number)=>eligible.filter(u=>u.node?.id===id&&['build','gather'].includes(u.order)||u.buildOrder===id);
 const ratePeople=eligible.length?eligible:adults.filter(u=>u.type==='worker'),meanStrength=ratePeople.length?ratePeople.reduce((n,u)=>n+predisposition(u).strength,0)/ratePeople.length:1;
 const resourcePeriod=(kind:ResKind,node?:{x:number;z:number;kind?:string},u?:Unit)=>{const person=u??ratePeople[0],x=node?.x??home.x,z=node?.z??home.z,probe=person?{...person,x,z,node:kind==='food'?{id:-1,kind:node?.kind==='fish'?'fish' as const:'forage' as const,x,z,y:0,amount:0,maxAmt:0,regenT:0,scale:1,rich:1}:person.node}:undefined;
  const bonus=probe?g.campBonus(probe,kind):1,winter=cal.phase===3&&kind==='food'?(node?.kind==='fish'?1.65:2.2):1,urgency=kind==='food'&&foodDemand(g,team)>0&&stock.food/foodDemand(g,team)<240?1.25:1;
  return GATHER[kind].period*bonus*winter*subsistenceLaborMultiplier(g,kind,x,z)/(GATHER_WORK_RATE*urgency);};
 const carry=(kind:ResKind,u?:Unit)=>u?carryingCapacity(u,kind):GATHER[kind].carry;
 let incomingFood=0,incomingWood=0,incomingWater=0;
 // Paid production owns one actor and one physical batch, even while generic
 // unit cargo or the compatibility work references point at the same person.
 const productionTravellers=new Set<number>(),productionIds=new Set<number>(),productionCapacity=liveProduction.length?itemCapacity(g,team):0,storedItems=Object.values(stock.items||{}).reduce((n,v)=>n+(v||0),0);
 const heldSlots=new Map<number,number>();for(const p of liveProduction)if(!['returning','unloading','stored'].includes(p.phase==='paused'?p.resumePhase:p.phase))heldSlots.set(p.workplace,(heldSlots.get(p.workplace)||0)+1);
 const productionSpeed=(u?:Unit)=>u?Math.max(.5,g.travelSpeed(u)):r.fallbackWalkingMetersPerSecond;
 const productionTrip=(x:number,z:number,u?:Unit)=>{const d=nearestDrop(x,z);return(Number.isFinite(d)?d:Math.hypot(home.x-x,home.z-z))/productionSpeed(u);};
 const cachedWalk=(u:Unit,near:(x:number,z:number)=>boolean,fallback:number)=>{const path=g.peekMovementRoute(u.id);if(!path||path.failed||path.revision!==g.navigationRevision()||!near(path.tx,path.tz)||!path.points.length)return fallback;let distance=0,x=u.x,z=u.z;for(const p of path.points){distance+=Math.hypot(p.x-x,p.z-z);x=p.x;z=p.z;}return distance/productionSpeed(u);};
 for(const p of liveProduction){
  if(productionIds.has(p.id))continue;productionIds.add(p.id);
  const recipe=PRODUCTION_RECIPES[p.recipe],u=residents.find(u=>u.id===p.actorId&&u.productionProjectId===p.id),b=g.state.buildings.find(b=>b.id===p.workplace&&b.team===team&&g.finished(b)),phase=p.phase==='paused'?p.resumePhase:p.phase;
  const practice=u?(1+Math.min(.3,(u.craftingXP||0)/1200))*productionPracticeRate(u,p.recipe):1;
  const passive=phase==='curing'||phase==='ready',parked=phase==='stored',unloading=phase==='unloading',hands=phase==='returning'||unloading||passive?0:Math.max(0,recipe.workSeconds-p.progress)/practice;
  const walkOut=u&&b&&!['returning','unloading','stored','curing'].includes(phase)?cachedWalk(u,(x,z)=>Math.abs(x-b.x)<=b.w*.5+6&&Math.abs(z-b.z)<=b.d*.5+6,Math.hypot(u.x-b.x,u.z-b.z)/productionSpeed(u)):0;
  const drops=supply,hasDrop=drops.length>0,walkBack=u&&['returning','unloading'].includes(phase)?cachedWalk(u,(x,z)=>drops.some(d=>Math.hypot(x-d.x,z-d.z)<(d.kind==='camp'?d.radius:Math.max(d.w,d.d)) +6),productionTrip(u.x,u.z,u)):b?productionTrip(b.x,b.z,u)*(!u&&passive?2:1):0;
  const fullCache=phase==='returning'&&storedItems+Object.values(recipe.outputs).reduce((n,v)=>n+v,0)>productionCapacity;
  const missing=!b&&!['returning','unloading'].includes(phase),away=u?outsideRole(g,u):null;
  let blocker=p.blockedReason||null;
  if(p.phase==='paused'){blocker=blocker||'Paid batch paused';if(b&&!['returning','unloading','stored'].includes(phase))blocker+=` · keeps a production slot (${heldSlots.get(b.id)||0}/${productionSlots(b)} committed)`;}
  else if(parked)blocker='Paid inputs parked at cache; resume to send a collector';else if(missing)blocker='Compatible workplace missing';else if(!hasDrop)blocker='No friendly cache for the finished batch';else if(fullCache)blocker='Material storage is full; the carrier retains the finished batch';else if(!u&&!passive)blocker='No living maker assigned';else if(!u&&phase==='ready')blocker='Ready batch needs a pickup adult';else if(phase==='curing')blocker=p.blockedReason||'Weather exposure releases the adult; later pickup still needs hauling';else if(away)blocker='Assigned resident has an away or military duty';
  const blocked=parked||missing||!hasDrop||fullCache||!u&&!passive||phase==='ready'&&!u||!!away||(!passive&&!!p.blockedReason)||phase==='curing'&&p.drying?.lastRate===0;
  add({id:`production:${p.id}`,label:recipe.name,category:'Production',personSeconds:hands+walkOut+walkBack,status:p.phase==='paused'||parked?'paused':blocked?'blocked':phase==='curing'?'upcoming':'active',actorIds:u?[u.id]:[],priority:450,blocker},blocked||passive||p.phase==='paused'||parked);
  if(p.phase!=='paused'&&u)productionTravellers.add(u.id);
 }
 for(const u of eligible){const w=u.productionApprentice;if(!w||w.phase==='waiting')continue;const b=g.state.buildings.find(b=>b.id===w.workplace&&g.finished(b));add({id:`learning:${u.id}`,label:'Learn alongside a working maker',category:'Practical learning',personSeconds:Math.max(0,observationRequired(w.recipe)-w.observedSeconds)+(b?travel(u,b.x,b.z):0),status:w.phase==='paused'?'paused':b?'active':'blocked',actorIds:w.phase==='paused'?[]:[u.id],priority:350,blocker:w.phase==='paused'?'Observation paused':b?null:'Original workplace unavailable'},true);}
 for(const u of eligible){const w=u.fibreWork;if(!w||w.phase==='returning')continue;const patch=g.state.fibre?.patches.find(p=>p.id===w.patchId),source=patch&&g.state.trees.find(n=>n.id===patch.treeId&&n.amount>=FIBRE_RULES.standingWoodPerBatch),missing=!patch||!source||patch.remaining+1e-9<FIBRE_RULES.batch;const batches=Math.ceil(Math.max(0,w.target-w.loaded)/FIBRE_RULES.batch);
  add({id:`fibre:${u.id}`,label:'Harvest and deliver finite plant fibre',category:'Materials',personSeconds:Math.max(0,batches*FIBRE_RULES.harvestSeconds-w.progress)+(patch?travel(u,patch.x,patch.z)+trip(patch.x,patch.z,u):0),status:w.paused?'paused':missing?'blocked':'active',actorIds:w.paused?[]:[u.id],priority:500,blocker:w.paused?'Fibre harvesting paused':missing?'Observed living source is exhausted or missing':null,units:w.target-w.loaded},true);
 }
 for(const u of eligible){const w=u.clayWork;if(!w||w.phase==='returning')continue;const bank=g.state.clay?.deposits.find(d=>d.id===w.depositId),missing=!bank||bank.remaining<POTTERY_RULES.clayBatch;
  add({id:`clay:${u.id}`,label:'Dig and deliver surveyed clay',category:'Materials',personSeconds:Math.max(0,POTTERY_RULES.digSeconds-w.progress)+(bank?travel(u,bank.x,bank.z)+trip(bank.x,bank.z,u):0),status:w.paused?'paused':missing?'blocked':'active',actorIds:w.paused?[]:[u.id],priority:500,blocker:w.paused?'Clay collection paused':missing?'Surveyed bank is exhausted or missing':null,units:POTTERY_RULES.clayBatch},true);
 }
 // A loaded ordinary, production item and water cargo share one actual return trip.
 for(const u of eligible){const w=u.waterWork,loadedWater=w?.liters??0;if(u.carry>0||loadedWater>0||itemLoad(u)>0){if(u.carryType==='food'&&!u.rawHuntMeat)incomingFood+=u.carry;if(u.carryType==='wood')incomingWood+=u.carry;incomingWater+=loadedWater;
  if(!productionTravellers.has(u.id)&&(!u.fibreWork||u.fibreWork.phase==='returning'))add({id:`delivery:${u.id}`,label:'Deliver carried supplies',category:'Hauling',personSeconds:trip(u.x,u.z,u),status:'active',actorIds:[u.id],priority:1000,blocker:/unreachable|no reachable|blocked/i.test(u.workReason||'')?u.workReason!:null});}
  if(w&&w.phase!=='returning'&&w.liters===0){add({id:`water:${u.id}`,label:'Collect drinking water',category:'Water',personSeconds:Math.max(0,SURVIVAL_RULES.collectSeconds*waterVesselCapacity(u,SURVIVAL_RULES.waterTripLiters)/SURVIVAL_RULES.waterTripLiters-w.progressSeconds)+travel(u,w.bankX,w.bankZ)+trip(w.bankX,w.bankZ,u),status:w.paused?'paused':claimed.has(u.id)?'queued':'active',actorIds:w.paused?[]:[u.id],priority:1000,blocker:w.paused?'Water assignment paused':null});if(!w.paused)incomingWater+=waterVesselCapacity(u,SURVIVAL_RULES.waterTripLiters);}
 }
 // Construction belongs to the site once, regardless of two builders, a direct
 // buildOrder and the same unit.node compatibility reference.
 const planned:Partial<Record<ResKind,number>>={};
 for(const b of g.state.buildings.filter(b=>b.team===team&&b.hp>0)){
  const assigned=workersAt(b.id).map(u=>u.id),missing=b.plannedCost?planMissing(g,b):[];
  if(b.build<1){const need=(b as Building&{excavationWorkSeconds?:number}).excavationWorkSeconds??(BUILD_TIME[b.type]||16)*plotArea(b);
   add({id:`build:${b.id}`,label:`Build ${BUILDINGS[b.type].name}`,category:'Construction',personSeconds:(1-b.build)*need/meanStrength,status:b.planPaused?'paused':missing.length?'blocked':assigned.length?'active':'queued',actorIds:assigned,priority:400,blocker:b.planPaused?'Plan paused':missing.length?'Materials missing: '+missing.map(n=>`${n.amount} ${n.kind}`).join(', '):null});
   if(b.plannedCost&&!b.planPaused)for(const kind of['food','wood','stone','copper','iron'] as const)planned[kind]=(planned[kind]||0)+(b.plannedCost[kind]||0);
  }
  if(b.expansion){const e=b.expansion;if(!e.paid){const cost=expansionCost(b,e);planned.wood=(planned.wood||0)+(cost.wood||0);}const area=plotArea({...b,...e})-plotArea(b);add({id:`expand:${b.id}`,label:`Extend ${BUILDINGS[b.type].name}`,category:'Construction',personSeconds:(1-e.progress)*(BUILD_TIME[b.type]||16)*area,status:e.paid?assigned.length?'active':'queued':'blocked',actorIds:assigned,priority:380,blocker:e.paid?null:'Extension materials not yet paid'});}
  if(!g.finished(b)||b.plannedCost)continue;
  if(b.type==='farm'&&b.fallowYear!==cal.year){const c=b.crop?.year===cal.year?b.crop:undefined,area=plotArea(b),crew=workersAt(b.id),pool=crew.length?crew:ratePeople,phase=cal.phase;
   const tools=pool.map(u=>farmToolRate(u,phase)).sort((a,b)=>b-a).slice(0,Math.min(12,Math.ceil(3*area))),toolRate=tools.length?tools.reduce((n,v)=>n+v,0)/tools.length:1,econ=team===0&&g.state.agePicks[3]==='econ'?1.4:1;
   const harvest=phase===2?(c?.ripened?c.remaining:farmHarvestEstimate(g,b,c?.planted??0,c?.tended??0,c?.water??1)):0;
   const base=phase===0?(1-(c?.planted??0))*r.fieldSowWorkSeconds*area:phase===1&&(c?.planted??0)>0?(1-(c?.tended??0))*r.fieldTendWorkSeconds*area:phase===2?harvest*r.fieldHarvestSecondsPerTwoFood/2:0;
   const work=base/(GATHER_WORK_RATE*econ*toolRate),person=pool[0],slots=Math.min(12,Math.ceil(3*area)),cols=Math.min(slots,Math.max(1,Math.floor((b.w-2.4)/1.8))),rows=Math.ceil(slots/cols),rowTravel=Math.max(0,(b.d-2.4)/rows*.32-1)/speed(person)*Math.floor(work/r.fieldRowWorkSeconds),haul=harvest?Math.ceil(harvest/carry('food',person))*trip(b.x,b.z,person)*2:0;
   add({id:`field:${b.id}:${cal.year}:${phase}`,label:phase===0?'Sow field':phase===1?'Tend field':'Harvest field',category:'Farming',personSeconds:work+rowTravel+haul,status:crew.length?'active':'queued',actorIds:crew.map(u=>u.id),priority:phase===2?950:650,blocker:null,deadlineSeconds:cal.remaining,units:harvest});
  }
  if(b.type==='warehouse'&&stock.food>0){const care=Math.max(0,r.desiredStoreCare-(b.storeCare||0)+H/r.preservationCareDecaySeconds),work=Math.ceil(care/r.preservationCarePerBatch)*r.preservationWorkSeconds;
   const reserve=preservationTimberReserve(g,team),blocked=stock.wood<reserve+1?`Preservation keeps ${reserve} logs in reserve`:foodDemand(g,team)>0&&stock.food/foodDemand(g,team)<240?'Preservation waits for a safer food reserve':null;add({id:`store:${b.id}`,label:'Tend stored food',category:'Food preservation',personSeconds:work,status:blocked?'blocked':workersAt(b.id).length?'active':'queued',actorIds:workersAt(b.id).map(u=>u.id),priority:350,blocker:blocked});}
  if(b.type==='pen'){const herd=(g.state.livestock??[]).filter(a=>a.pen===b.id&&a.hp>0),keepers=eligible.filter(u=>u.husbandryWork?.pen===b.id&&u.husbandryWork.action==='care'&&!u.husbandryWork.paused);
   if(herd.length){const pasture=penPastureReport(g,b),care=Math.max(0,.8-(b.pasture?.care||0)+H*PEN_RULES.careDecayPerAnimalSecond*herd.length)/r.careGainPerWorkSecond,grass=pasture.winter?0:pasture.biomassFood+pasture.regrowthPerSecond*H,feed=Math.max(0,pasture.demandPerSecond*H-grass-(b.pasture?.feed||0)),person=keepers[0]??ratePeople[0],load=Math.min(carry('food',person),Math.max(8,Math.ceil(pasture.demandPerSecond*90))),haul=Math.ceil(feed/Math.max(1,load))*trip(b.x,b.z,person)*2;
    add({id:`herd:${b.id}`,label:keepers.length?'Assigned herd keepers':'Maintain herd care and plant feed',category:'Husbandry',personSeconds:keepers.length?H*keepers.length:care+haul,status:keepers.length?'active':'queued',actorIds:keepers.map(u=>u.id),priority:700,blocker:!keepers.length?`Keeper not assigned · ${pasture.keepersNeeded} keeper slots for this herd${feed>0?` · ${Math.ceil(feed)} plant feed needs hauling`:''}`:null,units:feed});}}
 }
 const craft=(id:string,label:string,u:Unit|undefined,job:{progress:number;duration:number;workplace:number;paused?:boolean},blocker?:string,strengthWork=true)=>{
  const b=g.state.buildings.find(b=>b.id===job.workplace&&b.team===team&&g.finished(b)),experience=u?1+Math.min(.3,(u.craftingXP||0)/1200):1,effort=(strengthWork?(u?predisposition(u).strength:meanStrength):1)*experience*craftingWorkplaceRate(b);
  const row:WorkloadTask={id,label,category:'Crafting',personSeconds:Math.max(0,job.duration-job.progress)/effort+(u&&b?travel(u,b.x,b.z):0),status:job.paused?'paused':!b?'blocked':u&&!outsideRole(g,u)&&!claimed.has(u.id)?'active':'queued',actorIds:u?[u.id]:[],priority:450,blocker:job.paused?blocker||'Paid project paused':!b?'Compatible workplace missing':blocker||null};add(row);
 };
 const projects=(g.state as WorkState).haulageProjects??[],projectIds=new Set<number>();
 for(const p of projects)if(p.team===team){projectIds.add(p.id);craft(`haulage:${p.id}`,p.work.vessel?'Build riverboat':`Make ${p.work.kind}`,eligible.find(u=>u.id===p.actorId),p.work,p.blockedReason);}
 for(const u of adults){
  if(u.weaponWork)craft(`weapon:${u.id}`,`Make ${u.weaponWork.kind}`,u,u.weaponWork);
  if(u.haulageWork&&!projectIds.has(u.haulageWork.projectId??-1))craft(`haulage:legacy:${u.id}`,`Make ${u.haulageWork.kind}`,u,u.haulageWork);
  if(u.farmToolWork)craft(`tool:${u.id}`,`Make ${u.farmToolWork.kind}`,u,u.farmToolWork);
  if(u.copperStudy){const w=u.copperStudy,b=g.state.buildings.find(b=>b.id===w.workplace&&g.finished(b)),helpers=eligible.filter(p=>p.practicalHelper?.leaderId===u.id&&p.practicalHelper.phase!=='paused').sort((a,b)=>a.id-b.id),crew=[u,...helpers],rate=crew.reduce((sum,p,i)=>sum+(1+Math.min(.3,(p.craftingXP||0)/1200))*craftingWorkplaceRate(b)*(i===0?1:PRACTICAL_HELPER_RULES.workFractions[i-1]||0),0);
   add({id:`copper:${u.id}`,label:'Test copper prototype',category:'Crafting',personSeconds:Math.max(0,90-w.progress)/Math.max(.1,rate)*crew.length+crew.reduce((sum,p)=>sum+(b?travel(p,b.x,b.z):0),0),status:w.paused?'paused':b?'active':'blocked',actorIds:crew.map(p=>p.id),priority:450,blocker:w.paused?'Prototype paused':b?null:'Original shelter unavailable'});}
  if(u.practicalHelper?.phase==='paused')add({id:`copper-helper:${u.id}`,label:'Assist copper prototype',category:'Practical learning',personSeconds:0,status:'paused',actorIds:[],priority:450,blocker:'Assistance paused'},true);
  if(u.plantingWork)add({id:`plant:${u.id}`,label:'Plant sapling',category:'Woodland',personSeconds:Math.max(0,r.plantingSeconds-u.plantingWork.progress),status:claimed.has(u.id)?'queued':'active',actorIds:[u.id],priority:300,blocker:null});
  if(u.tamingWork)add({id:`tame:${u.id}`,label:'Tame and lead animal',category:'Husbandry',personSeconds:Math.max(0,r.tamingSeconds-u.tamingWork.progress),status:u.tamingWork.paused?'paused':claimed.has(u.id)?'queued':'active',actorIds:[u.id],priority:450,blocker:u.tamingWork.paused?'Taming paused':null});
  const h=u.husbandryWork;if(h&&h.action!=='care')add({id:`herd-action:${u.id}`,label:h.action==='pack'?'Fit pack harness':'Prepare herd meat',category:'Husbandry',personSeconds:Math.max(0,r.husbandryActionSeconds-h.progress),status:h.paused?'paused':claimed.has(u.id)?'queued':'active',actorIds:[u.id],priority:450,blocker:h.paused?'Herd project paused':null});
 }
 if(stock.cropTrial){const trial=stock.cropTrial,crew=eligible.filter(u=>u.studyCrop===trial.kind).sort((a,b)=>a.id-b.id),rate=crew.reduce((n,_,i)=>n+(CROP_TRIAL_RULES.workFractions[i]||0),0);add({id:`crop-trial:${team}:${trial.kind}`,label:`Test ${trial.kind} cultivation`,category:'Practical knowledge',personSeconds:Math.max(0,trial.duration-trial.progress)*(crew.length||1)/Math.max(1,rate),status:crew.length?'active':'queued',actorIds:crew.map(u=>u.id),priority:500,blocker:crew.length?null:'No trial lead assigned'});}
 // Real bench limits explain waiting even below 100% total village workload.
 for(const b of g.state.buildings.filter(b=>b.team===team&&g.finished(b))){const jobs=tasks.filter(t=>t.category==='Crafting'&&t.status!=='paused'&&t.actorIds.some(id=>{const u=eligible.find(u=>u.id===id);return[u?.weaponWork,u?.farmToolWork,u?.haulageWork,u?.copperStudy].some(w=>w?.workplace===b.id);}));
  const slots=craftingBenches(b);for(const t of jobs.slice(slots)){t.status='queued';t.blocker=`All ${slots} crafting benches at ${BUILDINGS[b.type].name} are occupied`;}}
 const resourceNodes=new Map<ResKind,Map<number,ResourceNode>>(),resourceActors=new Map<ResKind,Unit[]>();
 for(const u of eligible)if(u.order==='gather'&&u.node&&'amount'in u.node&&!claimed.has(u.id)){const kind=u.node.kind==='tree'?'wood':u.node.kind==='forage'||u.node.kind==='fish'?'food':u.node.kind==='stone'?'stone':u.node.kind==='copper'?'copper':'iron',nodes=resourceNodes.get(kind)??new Map();nodes.set(u.node.id,u.node);resourceNodes.set(kind,nodes);const crew=resourceActors.get(kind)??[];crew.push(u);resourceActors.set(kind,crew);}

 const hunts=new Map<number,{node:NonNullable<Unit['node']>;crew:Unit[]}>();for(const u of eligible)if(u.order==='gather'&&u.node&&'species'in u.node&&!claimed.has(u.id)){const row=hunts.get(u.node.id)??{node:u.node,crew:[]};row.crew.push(u);hunts.set(u.node.id,row);}
 for(const [id,{node,crew}]of hunts)if('species'in node){const meat=node.hp>0?CARCASS_MEAT[node.species]:node.carcass?.meat??0,person=crew[0],attack=node.hp>0?node.hp*(person.type==='worker'?1.1:.9)/(person.type==='worker'?1:1.5):0,processing=meat/3*1.8*subsistenceLaborMultiplier(g,'food',node.x,node.z)/GATHER_WORK_RATE;
  add({id:`hunt:${id}`,label:node.hp>0?`Hunt and butcher ${node.species}`:'Butcher hunting catch',category:'Hunting',personSeconds:attack+processing+Math.ceil(meat/carry('food',person))*trip(node.x,node.z,person)*2,status:'active',actorIds:crew.map(u=>u.id),priority:850,blocker:null,units:meat});}
 for(const u of eligible)if(u.order==='gather'&&u.node&&'type'in u.node&&u.node.type==='dock'&&!claimed.has(u.id)){const nodes=resourceNodes.get('food')??new Map<number,ResourceNode>();for(const n of g.state.fish)if(n.amount>0&&Math.hypot(n.x-u.node.x,n.z-u.node.z)<=20)nodes.set(n.id,n);resourceNodes.set('food',nodes);const crew=resourceActors.get('food')??[];crew.push(u);resourceActors.set('food',crew);}
 if(team===0)for(const n of g.state.trees)if(g.chopMarks.has(n.id)&&n.amount>0&&g.exploredAt(n.x,n.z)){const nodes=resourceNodes.get('wood')??new Map();nodes.set(n.id,n);resourceNodes.set('wood',nodes);}
 const fieldFood=tasks.filter(t=>t.category==='Farming'||t.category==='Hunting').reduce((n,t)=>n+(t.units||0),0),needs=survivalStatus(g,team),required:Record<ResKind,number>={food:Math.max(0,foodDemand(g,team)*(H+r.reserveTargetSeconds)+(planned.food||0)-stock.food-incomingFood-fieldFood),wood:Math.max(0,needs.fuelDemandWoodPerSecond*H+(planned.wood||0)-stock.wood-incomingWood),stone:Math.max(0,(planned.stone||0)-stock.stone),copper:Math.max(0,(planned.copper||0)-stock.copper),iron:Math.max(0,(planned.iron||0)-stock.iron)};
 for(const kind of['food','wood','stone','copper','iron'] as const){const nodes=[...(resourceNodes.get(kind)?.values()??[])],crew=resourceActors.get(kind)??[],person=crew[0]??ratePeople[0],period=resourcePeriod(kind,nodes[0],person),finite=nodes.reduce((n,p)=>n+positive(p.amount)*resourcePeriod(kind,p,person)+Math.ceil(positive(p.amount)/carry(kind,person))*trip(p.x,p.z,person)*2,0),units=nodes.reduce((n,p)=>n+positive(p.amount),0);
  let known=units;if(crew.some(u=>u.jobLock)){const list=kind==='wood'?g.state.trees:kind==='food'?[...g.state.forage,...g.state.fish]:kind==='stone'?g.state.stones:kind==='copper'?g.state.copper:g.state.iron;known=list.reduce((n,p)=>n+((team===0?g.exploredAt(p.x,p.z):rivalKnows(g,team,p.x,p.z))?positive(p.amount):0),0);}
  const requested=Math.max(units,required[kind]),recurring=crew.some(u=>u.jobLock)?Math.min(H*crew.length,known*period):0,work=Math.max(finite,recurring,required[kind]*period+Math.ceil(required[kind]/carry(kind,person))*trip(nodes[0]?.x??home.x,nodes[0]?.z??home.z,person)*2);
  if(work>0)add({id:`gather:${kind}`,label:kind==='wood'?'Gather timber':kind==='food'?'Collect food and reserves':`Gather ${kind}`,category:kind==='food'?'Food supply':kind==='wood'?'Timber supply':'Materials',personSeconds:work,status:crew.length?'active':'queued',actorIds:crew.map(u=>u.id),priority:kind==='food'?850:500,blocker:crew.length?crew.find(u=>/unreachable|blocked|waiting/i.test(u.workReason||''))?.workReason||null:'No gatherers assigned',units:requested});
 }
 const extraWater=needs.enabled?Math.max(0,needs.waterDemandLitersPerSecond*(H+r.reserveTargetSeconds)-needs.water-incomingWater):0;
 if(extraWater>1e-6){const trips=Math.ceil(extraWater/SURVIVAL_RULES.waterTripLiters),bank=eligible.find(u=>u.waterWork)?.waterWork;add({id:'needs:water',label:'Maintain drinking-water reserve',category:'Water',personSeconds:trips*(SURVIVAL_RULES.collectSeconds+(bank?trip(bank.bankX,bank.bankZ)*2:0)),status:'queued',actorIds:[],priority:1100,blocker:bank?'Another water trip needs an available adult':'Assign a discovered reachable freshwater bank; travel time not yet measured',units:extraWater});}
 // Do not invent finite work for scouting, combat, or an unbuilt research label.
 const liveWaiting=residents.filter(u=>u.workReason&&/waiting|queued|blocked|unreachable|no (reachable|free|available)|occupied/i.test(u.workReason)).map(u=>({actorId:u.id,name:u.name||`Resident ${u.id}`,reason:u.workReason!}));
 const constructionPlans=g.state.buildings.filter(b=>b.team===team&&b.hp>0&&b.build<1&&!!b.plannedCost),planIds=new Set(constructionPlans.map(b=>`build:${b.id}`));
 const plannedConstruction={count:constructionPlans.length,paused:constructionPlans.filter(b=>b.planPaused).length,personSeconds:tasks.filter(t=>planIds.has(t.id)&&t.status!=='paused').reduce((n,t)=>n+t.personSeconds,0)};
 const total=tasks.filter(t=>t.status!=='paused').reduce((n,t)=>n+t.personSeconds,0),blocked=tasks.filter(t=>t.status==='blocked').reduce((n,t)=>n+t.personSeconds,0),paused=tasks.filter(t=>t.status==='paused').reduce((n,t)=>n+t.personSeconds,0),capacity=people.reduce((n,p)=>n+p.capacitySeconds,0),percent=capacity>0?total/capacity*100:null;
 const warnings:string[]=[];if(percent!==null&&percent>100)warnings.push(`Queued and recurring work exceeds the next ${Math.round(H/60)} minutes of adult capacity. Prioritize needs and time-sensitive harvests, or pause lower-priority work.`);
 if(!capacity&&total>0)warnings.push('No civilian adult capacity is currently available. Guards, dependents and distant missions are not spare labor.');if(blocked)warnings.push('Some work is blocked by real inputs or a missing workplace; more people alone will not resolve every delay.');
 if(liveWaiting.length||tasks.some(t=>t.blocker))warnings.push('Waiting reasons below come from current assignments, materials and bench limits. The percentage adds no random failure or new speed penalty.');
 const timedQueues=g.state.buildings.filter(b=>b.team===team&&g.finished(b)&&b.queue.length).map(b=>({buildingId:b.id,label:BUILDINGS[b.type].name,entries:b.queue.length,remainingSeconds:b.queue.reduce((n,q)=>n+Math.max(0,q.max-q.t),0),reason:'Existing training timers do not reserve hands-on labor; an available adult is required at completion'}));
 return{version:r.version,timedQueues,plannedConstruction,team,horizonSeconds:H,workloadPercent:percent,demandPersonSeconds:total,capacityPersonSeconds:capacity,runnablePersonSeconds:total-blocked,blockedPersonSeconds:blocked,pausedPersonSeconds:paused,adultResidents:adults.length,dependents:residents.length-adults.length,civilianAdults:eligible.length,effectiveAdults:capacity/H,assignedAdults:claimed.size,freeNow:people.filter(p=>p.freeNow).length,people,tasks:tasks.sort((a,b)=>b.priority-a.priority),waiting:liveWaiting,warnings,manual:team===0&&g.state.autoWorkEnabled===false,
  estimate:'Remaining hands-on work uses current executor rates, tools and practice. Hauling is straight-line travel; rows, routing, interruptions, future weather and serial work can take longer. Paused projects are excluded. Existing blockers are reported without running the scheduler.',rules:r};
}
