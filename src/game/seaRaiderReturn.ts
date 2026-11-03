import{finishRaidPlan,markRaidStranded}from'./raidIntent';
import{PRISONER_RULES}from'./captivity';
import type {Game} from './sim';
import type {Unit,Building} from './types';
import {boatCrew,boardRiverboat,commandRiverboat,landRiverboat,riverboatDestination,type Riverboat} from './boats';
import {receiveFood} from './pantry';
import {requestWaterNavigation} from './waterNavigation';

export const SEA_RAIDER_RETURN_RULES=Object.freeze({version:1,boardingMeters:24,landingMeters:9,arrivalMeters:2.5,retrySeconds:10,sharedLandingMeters:3});
export type SeaRaiderReturn={version:1;phase:'boarding'|'sailing'|'landing'|'walking';homeCampId:number;boatId?:number;crewIds:number[];waterX?:number;waterZ?:number;landX?:number;landZ?:number};
const camps=(g:Game)=>g.state.buildings.filter(b=>b.team===3&&b.raiderCamp&&g.finished(b));
function reachableCamp(g:Game,u:Unit){return camps(g).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z)).find(b=>!!g.interactionSpot(u,b));}
function nativeLanding(g:Game,u:Unit,boat:Riverboat,dock:Building){
 const water=riverboatDestination(g,boat,dock.x,dock.z);if(!water)return null;
 const homes=camps(g).sort((a,b)=>Math.hypot(a.x-dock.x,a.z-dock.z)-Math.hypot(b.x-dock.x,b.z-dock.z));
 for(let r=2;r<=SEA_RAIDER_RETURN_RULES.landingMeters;r++)for(let i=0;i<24;i++){
  const angle=i*Math.PI/12,x=water.x+Math.cos(angle)*r,z=water.z+Math.sin(angle)*r;
  if(!g.walkable(x,z)||g.height(x,z)<=g.waterAt(x,z)+.3||![[-1,0],[1,0],[0,-1],[0,1]].every(([dx,dz])=>g.walkable(x+dx,z+dz)))continue;
  // Probe only route geometry; the actual person remains at the raid landing.
  const probe={...u,x,z,y:g.height(x,z),boat:undefined,haulage:undefined};
  const home=homes.find(b=>!!g.interactionSpot(probe,b));if(home)return {home,water,land:{x,z}};
 }return null;
}
/** Legacy shore-spawned parties have no fabricated vessel or original overseas
 * home. Use a real local camp, or retain the visible stranded body and cargo. */
export function beginSeaRaiderReturn(g:Game,u:Unit){
 if(!u.seaRaid||u.team!==3||u.hp<=0)return false;
 const candidates=(g.state.boats||[]).filter(b=>!(u.seaRaid?.plan?.intent==='capture'&&u.escortId)&&b.team===3&&b.hp>0&&Math.hypot(b.x-u.x,b.z-u.z)<=SEA_RAIDER_RETURN_RULES.boardingMeters&&boatCrew(g,b.id).length===0).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z));
 if(candidates.length&&requestWaterNavigation(g,true).status==='pending'){u.order='hold';u.target=null;u.workReason='Preparing the owned-vessel return route — keeping the survivor and cargo at the landing';return false;}
 for(const boat of candidates){
  const dock=g.state.buildings.find(b=>b.id===boat.dock&&b.team===3&&b.type==='dock'&&g.finished(b));if(!dock)continue;
  const destination=nativeLanding(g,u,boat,dock);if(!destination)continue;
  const origin=u.seaRaid,crew=g.state.units.filter(p=>p.hp>0&&p.team===3&&!p.prisoner&&!p.boat&&!p.haulage&&!p.seaRaidReturn&&p.seaRaid?.phase==='retreat'&&Math.hypot(p.seaRaid.x-origin.x,p.seaRaid.z-origin.z)<=SEA_RAIDER_RETURN_RULES.sharedLandingMeters&&Math.hypot(p.x-boat.x,p.z-boat.z)<=SEA_RAIDER_RETURN_RULES.boardingMeters).sort((a,b)=>Number(b===u)-Number(a===u)||a.id-b.id).slice(0,boat.capacity);
  const manifest=crew.map(p=>p.id);if(!manifest.length)continue;
  if(!boardRiverboat(g,boat.id,crew,3,true))continue;
  for(const p of crew)if(p.boat?.id===boat.id){if(p.seaRaid?.plan)delete p.seaRaid.plan.strandedAt;p.seaRaidReturn={version:1,phase:'boarding',homeCampId:destination.home.id,boatId:boat.id,crewIds:[...manifest],waterX:destination.water.x,waterZ:destination.water.z,landX:destination.land.x,landZ:destination.land.z};p.target=null;p.node=null;p.workReason='Boarding an owned vessel with remaining raid cargo';}
  return !!u.seaRaidReturn;
 }
 const home=reachableCamp(g,u);if(home){if(u.seaRaid?.plan)delete u.seaRaid.plan.strandedAt;u.seaRaidReturn={version:1,phase:'walking',homeCampId:home.id,crewIds:[u.id]};u.order='return';u.node=null;u.target=null;u.workReason='No raid vessel — returning overland to a reachable camp';return true;}
 u.order='hold';u.target=null;u.node=null;u.workReason='Stranded at the landing — no owned vessel or reachable camp; belongings remain here';markRaidStranded(g,u);return false;
}
function completeReturn(g:Game,u:Unit,home:Building){
 finishRaidPlan(g,u,'returned');
 if(u.carryType&&u.carry>0){if(u.carryType==='food')receiveFood(g,3,u.carry,u.carryFood);else g.tribe(3)[u.carryType]+=u.carry;}
 u.carry=0;u.carryType=null;u.carryFood=undefined;u.homeCamp=home.id;u.seaRaid=undefined;u.seaRaidReturn=undefined;u.order='hold';u.node=null;u.target=null;u.wanderT=5;u.workReason='Back at camp — the same survivor and remaining cargo have returned';
}
/** Runs immediately before the existing riverboat actor hook. It sets orders
 * without moving an aboard body; riverboatAI and syncRiverboats retain motion. */
export function finishRaidEscortAtCamp(g:Game,u:Unit){
 if(u.hp>0&&u.seaRaid?.plan?.intent==='capture'&&u.escortId){const captive=g.state.units.find(p=>p.id===u.escortId&&p.prisoner?.guardId===u.id&&p.prisoner.phase==='custody'&&p.prisoner.captorTeam===3),home=captive&&camps(g).find(b=>g.buildingWorkReached(u,b)&&g.buildingWorkReached(captive,b));if(home){completeReturn(g,u,home);return true;}}
 return false;
}
export function seaRaiderReturnAI(g:Game,u:Unit,dt:number){
 if(finishRaidEscortAtCamp(g,u))return true;
 const r=u.seaRaidReturn;if(!r||u.hp<=0)return false;
 const home=g.state.buildings.find(b=>b.id===r.homeCampId&&b.team===3&&b.raiderCamp&&g.finished(b));
 if(!home){if(u.boat){u.order='hold';u.workReason='Home camp lost — holding the real vessel and cargo';return true;}u.order='hold';u.workReason='Home camp lost — survivor and cargo await a real refuge';return true;}
 if(r.phase==='walking'){
  const captive=u.seaRaid?.plan?.intent==='capture'&&u.escortId?g.state.units.find(p=>p.id===u.escortId&&p.prisoner?.guardId===u.id&&p.prisoner.phase==='escorting'):undefined;if(captive&&Math.hypot(captive.x-u.x,captive.z-u.z)>PRISONER_RULES.escortSeparationMeters*.75){u.order='hold';u.workReason='Waiting for the captive';return true;}
  if(u.boat)return false;
  const spot=g.interactionSpot(u,home);if(!spot){u.order='hold';u.workReason='Camp return blocked — cargo remains with this survivor';return true;}
  if(g.buildingWorkReached(u,home)){completeReturn(g,u,home);return true;}
  u.tx=spot.x;u.tz=spot.z;u.order='return';u.node=null;u.target=null;u.workReason='Walking the remaining cargo into the raider camp';g.steer(u,dt);return true;
 }
 const boat=(g.state.boats||[]).find(b=>b.id===r.boatId&&b.team===3&&b.hp>0);
 if(!boat){if(u.boat)return false;u.order='hold';u.workReason='Return vessel lost — survivor and cargo remain stranded';return true;}
 if(r.phase==='boarding'){
  const manifest=r.crewIds.map(id=>g.state.units.find(p=>p.id===id&&p.hp>0&&!p.prisoner&&p.seaRaidReturn?.boatId===boat.id)).filter((p):p is Unit=>!!p);
  if(!u.boat){u.order='hold';u.workReason='Boarding interrupted — cargo remains ashore';return true;}
  if(manifest.some(p=>p.boat?.id!==boat.id||p.boat.phase!=='aboard')){if(boat.captain===u.id){u.order='hold';u.workReason='Waiting for the actual returning crew to finish boarding';return true;}return false;}
  for(const p of manifest)p.seaRaidReturn!.phase='sailing';
 }
 if(r.phase==='sailing'){
  if(!u.boat){u.order='hold';u.workReason='Separated from the return vessel — cargo remains here';return true;}
  if(boat.captain!==u.id)return false;
  if(requestWaterNavigation(g,true).status==='pending'){u.order='hold';u.workReason='Preparing the current water route — holding crew and cargo aboard';return true;}
  if(Math.hypot(boat.x-r.waterX!,boat.z-r.waterZ!)>SEA_RAIDER_RETURN_RULES.arrivalMeters){
   if(u.order!=='move'&&!commandRiverboat(g,boat.id,r.waterX!,r.waterZ!,true)){u.order='hold';u.workReason='Native shore route blocked — keeping vessel, crew and cargo';return true;}return false;
  }
  if(landRiverboat(g,boat.id,{x:r.landX!,z:r.landZ!})){for(const p of boatCrew(g,boat.id))if(p.seaRaidReturn?.boatId===boat.id)p.seaRaidReturn.phase='landing';return false;}u.order='hold';u.workReason='No safe native landing — keeping the crew and cargo aboard';return true;
 }
 if(r.phase==='landing'){
  if(u.boat)return false;r.phase='walking';u.order='return';u.workReason='Ashore at the native landing — taking cargo to camp';return true;
 }
 return false;
}
export function validSeaRaiderReturns(value:unknown){
 if(!value||typeof value!=='object')return false;const s=value as Game['state'];if(!Array.isArray(s.units))return false;
 const half=(s.worldOptions?.size??1040)/2;const id=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>0&&Number(v)<s.nextId;
 for(const u of s.units){const r=u.seaRaidReturn;if(r===undefined)continue;if(!r||typeof r!=='object'||Array.isArray(r)||r.version!==1||u.team!==3||!u.seaRaid||!['boarding','sailing','landing','walking'].includes(r.phase)||!id(r.homeCampId)||!Array.isArray(r.crewIds)||r.crewIds.length<1||r.crewIds.length>5||new Set(r.crewIds).size!==r.crewIds.length||!r.crewIds.every(id)||!r.crewIds.includes(u.id))return false;
  const home=s.buildings?.find(b=>b.id===r.homeCampId),boat=s.boats?.find(b=>b.id===r.boatId);if(home&&(home.team!==3||!home.raiderCamp)||boat&&boat.team!==3)return false;if(r.phase==='walking'&&u.boat)return false;if(r.crewIds.some(member=>s.units.some(p=>p.id===member&&p.team!==3)))return false;if(r.boatId!==undefined&&!id(r.boatId))return false;if(r.phase!=='walking'&&r.boatId===undefined)return false;
  for(const key of ['waterX','waterZ','landX','landZ'] as const){const v=r[key];if(v!==undefined&&(!Number.isFinite(v)||Math.abs(v)>half))return false;if(r.phase!=='walking'&&v===undefined)return false;}
 }return true;
}
