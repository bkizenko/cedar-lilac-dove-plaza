import {SAILING_RULES} from './sailingRules';
import {sailForce,sailRigProject} from './boatSailing';
import{BOAT_CLASSES,BOAT_PRACTICE_RULES,boatClass,boatClassIssue,boatServiceProject,type NewBoatClass,type HullOrder}from'./boatClasses';
import{recordHullBuilt}from'./boatPractice';
import{workRuntime}from'./workRuntime';
import{hasTaskCommitment}from'./workCommitments';
import{boatExplorationAI,type BoatExploration}from'./boatExploration';
import{vesselLoad}from'./carriedLoad';
import{isDependent}from'./settlement';
import type {Game} from './sim';
import type {Unit,Building} from './types';
import {HAULAGE,beginHaulageWork,resumeHaulageProject} from './haulage';
import {waterNavigation} from './waterTravel';
export type Riverboat={id:number;team:number;dock:number;x:number;y:number;z:number;facing:number;captain?:number;hp:number;capacity:number;hullClass?:NewBoatClass;exploration?:BoatExploration;sailRig?:import('./sailingRules').SailRig};
export const BOAT_COST={wood:BOAT_CLASSES.riverboat.wood,stone:BOAT_CLASSES.riverboat.stone,seconds:BOAT_CLASSES.riverboat.seconds,seats:BOAT_CLASSES.riverboat.seats};
// Gameplay tuning for more thrust with diminishing gains as resistance rises.
export const ROWING_CREW_EXPONENT = 0.12;
export function canRowRiverboat(g:Game,u:Unit){return u.hp>0&&(!u.prisoner||u.prisoner.phase==='released')&&!isDependent(g,u);}
export function riverboatRowers(g: Game, crew: Unit[]) {
 return crew.filter(u => u.boat?.phase === 'aboard' && canRowRiverboat(g,u)).length;
}
export function riverboatLoadSpeed(g: Game, id: number) {
 const boat = g.state.boats?.find(b => b.id === id && b.hp > 0);
 if (!boat) return 1;
 const crew = boatCrew(g,id).filter(u => u.boat?.phase === 'aboard');
 const rowing = Math.pow(riverboatRowers(g,crew.filter(u=>u.team===boat.team)),ROWING_CREW_EXPONENT);
 const hull = boatClass(boat);
 const hullPace = boat.hullClass
  ? hull.speed * (BOAT_PRACTICE_RULES.minimumConditionSpeed +
    (1-BOAT_PRACTICE_RULES.minimumConditionSpeed)*Math.min(1,boat.hp/hull.maxHp))
  : 1;
 const force=sailForce(g,boat,g.state.units.find(u=>u.id===boat.captain)?.facing??boat.facing);
 return vesselLoad(boat,crew).pace * Math.max(rowing*SAILING_RULES.minimumRaisedRowingFraction,rowing+force.bonus-force.drag) * hullPace;
}
const crewCache=new WeakMap<Game,{time:number;units:Unit[];count:number;boats:Map<number,Unit[]>}>();
export function boatCrew(g:Game,id:number){
 let cache=crewCache.get(g);if(!cache||cache.time!==g.state.time||cache.units!==g.state.units||cache.count!==g.state.units.length){cache={time:g.state.time,units:g.state.units,count:g.state.units.length,boats:new Map()};crewCache.set(g,cache);}
 let crew=cache.boats.get(id);if(!crew){crew=g.state.units.filter(u=>u.boat?.id===id);cache.boats.set(id,crew);}return crew.filter(u=>u.hp>0&&u.boat?.id===id);
}
export function beginRiverboat(g:Game,dock:number,team=0,unitId?:number,hullClass?:NewBoatClass){
 if(hullClass){if((g.state.boats??[]).filter(b=>b.team===team&&b.hp>0).length>=12)return false;const pending=g.state.haulageProjects?.find(p=>p.team===team&&p.work.hullOrder?.class===hullClass&&p.work.hullOrder.mode==='build');if(pending)return pending.work.paused?resumeHaulageProject(g,pending.id,unitId,dock):false;const issue=boatClassIssue(g,hullClass,team);if(issue){if(team===0)g.banner(issue,4);return false;}const s=BOAT_CLASSES[hullClass];return beginHaulageWork(g,'canoe',team,dock,unitId,{version:1,class:hullClass,mode:'build',paid:{wood:s.wood,stone:s.stone,cordage:s.cordage}});}
 const t=g.tribe(team);if(t.wood<BOAT_COST.wood||t.stone<BOAT_COST.stone){if(team===0)g.banner('Riverboat needs 40 logs and 4 stone',4);return false;}
 if((g.state.boats||[]).filter(b=>b.team===team&&b.hp>0).length>=12){if(team===0)g.banner('Twelve vessels already need crews',4);return false;}
 const existing=new Set(g.state.units.filter(u=>u.haulageWork).map(u=>u.id));
 if(!beginHaulageWork(g,'canoe',team,dock,unitId))return false;
 const u=g.state.units.find(u=>u.team===team&&!existing.has(u.id)&&u.haulageWork)!;
 t.wood-=BOAT_COST.wood-HAULAGE.canoe.wood;t.stone-=BOAT_COST.stone-HAULAGE.canoe.stone;u.haulageWork!.vessel=true;u.haulageWork!.duration=BOAT_COST.seconds;
 if(team===0)g.banner('Building a five-seat riverboat at the dock',4);return true;
}
export function riverboatWaterPoint(g:Game,x:number,z:number,radius=18){
 for(let r=0;r<=radius;r+=2)for(let i=0;i<24;i++){
  const a=i*Math.PI/12,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r;
  if(Math.abs(px)>(g.world.size/2)-5||Math.abs(pz)>(g.world.size/2)-5)continue;
  if([[-1.5,0],[1.5,0],[0,-3],[0,3]].every(([dx,dz])=>g.height(px+dx,pz+dz)<g.waterAt(px+dx,pz+dz)+.1))return {x:px,z:pz};
 }
 return null;
}
export function launchRiverboat(g:Game,b:Building,hullClass?:NewBoatClass){
 if(hullClass&&(g.state.boats??[]).filter(p=>p.team===b.team&&p.hp>0).length>=12)return false;
 const p=riverboatWaterPoint(g,b.x,b.z);if(!p)return false;
 const spec=BOAT_CLASSES[hullClass??'riverboat'];const boat:Riverboat={id:g.id(),team:b.team,dock:b.id,...p,y:g.waterAt(p.x,p.z)+.16,facing:0,hp:spec.maxHp,capacity:spec.seats,...(hullClass?{hullClass}:{})};
 (g.state.boats??=[]).push(boat);if(hullClass)recordHullBuilt(g,b.team,hullClass);return true;
}
export function boardRiverboat(g:Game,id:number,people=g.selectedUnits(),team=0,preserveMission=false){
 const b=g.state.boats?.find(b=>b.id===id&&b.team===team&&b.hp>0);if(!b)return 0;if(boatServiceProject(g,id)||sailRigProject(g,id)){if(team===0)g.banner('Finish or abandon this boat’s paid dock service before boarding',4);return 0;}
 let n=0;
 for(const u of people){
  if(boatCrew(g,id).length>=b.capacity)break;
  if(u.hp<=0||u.team!==b.team||u.boat||u.haulage||Math.hypot(u.x-b.x,u.z-b.z)>24)continue;
  if(!preserveMission)g.interruptMission(u);u.boat={id,phase:'boarding'};crewCache.delete(g);u.haulage='canoe';u.order='hold';u.node=null;u.target=null;g.invalidateRoute(u);n++;
 }
 if(!n)g.banner('Select nearby residents without carts, sleds or personal canoes to board',4);
 else g.banner(`${n} residents boarding · first aboard takes the helm`,4);
 g.workBoard.reset();return n;
}
export function riverboatDestination(g:Game,b:Pick<Riverboat,'x'|'z'>,x:number,z:number,closestWhenUnexplored=false){
 const nav=waterNavigation(g,true),cell=g.world.size/nav.width;
 const idx=(px:number,pz:number)=>Math.floor((pz+(g.world.size/2))/cell)*nav.width+Math.floor((px+(g.world.size/2))/cell);
 const label=nav.labels[idx(b.x,b.z)];if(!label)return null;
 let best:{x:number;z:number}|null=null,score=Infinity;
 for(let dz=-8;dz<=8;dz++)for(let dx=-8;dx<=8;dx++){
  const px=x+dx*cell,pz=z+dz*cell;if(Math.abs(px)>(g.world.size/2)-5||Math.abs(pz)>(g.world.size/2)-5)continue;
  if(nav.labels[idx(px,pz)]!==label||g.height(px,pz)>=g.waterAt(px,pz)+.3)continue;
  const d=dx*dx+dz*dz;if(d<score){score=d;best={x:px,z:pz};}
 }
 // An order into unexplored ground sails as close as this water allows; a
 // refusal would reveal that hidden ground is not connected water (GW-07).
 if(!best&&closestWhenUnexplored&&!g.exploredAt(x,z))for(let i=0;i<nav.labels.length;i++){
  if(nav.labels[i]!==label)continue;
  const px=-(g.world.size/2)+(i%nav.width+.5)*cell,pz=-(g.world.size/2)+(Math.floor(i/nav.width)+.5)*cell;
  if(Math.abs(px)>(g.world.size/2)-5||Math.abs(pz)>(g.world.size/2)-5||g.height(px,pz)>=g.waterAt(px,pz)+.3)continue;
  const d=(px-x)**2+(pz-z)**2;if(d<score){score=d;best={x:px,z:pz};}
 }
 return best;
}
export function commandRiverboat(g:Game,id:number,x:number,z:number,preserveMission=false){
 const b=g.state.boats?.find(b=>b.id===id&&b.hp>0),u=b&&g.state.units.find(u=>u.id===b.captain&&u.hp>0);if(!b||!u||u.team!==b.team||u.boat?.id!==id||u.boat.phase!=='aboard'||!canRowRiverboat(g,u))return false;if(boatServiceProject(g,id)||sailRigProject(g,id)){g.banner('This hull is reserved for paid dock service',4);return false;}
 const p=riverboatDestination(g,b,x,z,b.team===0&&!preserveMission);if(!p){g.banner('No connected navigable water near that destination',4);return false;}
 if(!preserveMission){delete b.exploration;g.interruptMission(u);}u.order='move';u.tx=p.x;u.tz=p.z;u.target=null;u.node=null;g.invalidateRoute(u);return true;
}
/** Recall sails the same hull to a surviving friendly dock and then lands;
 * cargo stays on its original people until ordinary physical delivery. */
export function recallRiverboat(g:Game,id:number){
 const b=g.state.boats?.find(b=>b.id===id&&b.hp>0),captain=b&&g.state.units.find(u=>u.id===b.captain&&u.hp>0);if(!b||!captain)return false;if(boatServiceProject(g,id)||sailRigProject(g,id))return landRiverboat(g,id);
 const docks=g.state.buildings.filter(d=>d.team===b.team&&d.type==='dock'&&g.finished(d)).sort((a,c)=>Number(c.id===b.dock)-Number(a.id===b.dock)||Math.hypot(a.x-b.x,a.z-b.z)-Math.hypot(c.x-b.x,c.z-b.z));
 for(const dock of docks){const p=riverboatWaterPoint(g,dock.x,dock.z),dest=p&&riverboatDestination(g,b,p.x,p.z);if(!p||!dest||Math.hypot(dest.x-p.x,dest.z-p.z)>8)continue;
  b.exploration={originX:dest.x,originZ:dest.z,nextReviewAt:g.state.time,returning:true,reason:'recall',landOnReturn:true};captain.order='move';captain.tx=dest.x;captain.tz=dest.z;g.invalidateRoute(captain);return true;
 }
 delete b.exploration;captain.order='hold';captain.workReason='Recall needs a friendly dock on this connected water · crew and cargo retained';g.invalidateRoute(captain);return false;
}
export function landRiverboat(g:Game,id:number,preferred?:{x:number;z:number}){
 const b=g.state.boats?.find(b=>b.id===id&&b.hp>0);if(!b)return false;
 delete b.exploration;const crew=boatCrew(g,id);let n=0;
 for(const u of crew){
  let point:{x:number;z:number}|null=preferred&&Math.hypot(preferred.x-b.x,preferred.z-b.z)<=10&&g.walkable(preferred.x,preferred.z)&&g.height(preferred.x,preferred.z)>g.waterAt(preferred.x,preferred.z)+.3?preferred:null;
  if(preferred&&!point)continue;
  for(let r=2;r<=10&&!point;r+=1)for(let i=0;i<24;i++){
   const a=i*Math.PI/12,x=b.x+Math.cos(a)*r,z=b.z+Math.sin(a)*r;
   if(g.walkable(x,z)&&g.height(x,z)>g.waterAt(x,z)+.3&&[[-1,0],[1,0],[0,-1],[0,1]].every(([dx,dz])=>g.walkable(x+dx,z+dz))){point={x,z};break;}
  }
  if(!point)continue;
  u.boat={id,phase:'landing',...point};u.order='hold';g.invalidateRoute(u);n++;
 }
 if(n){b.captain=undefined;g.banner('Landing party disembarking; the boat stays moored here',4);}
 else g.banner('Bring the boat within 10 m of a gentle landing shore',4);
 return n>0;
}
export function riverboatAI(g:Game,u:Unit,dt:number){
 const ride=u.boat;if(!ride)return false;
 const b=g.state.boats?.find(b=>b.id===ride.id&&b.hp>0);
 if(!b){u.boat=undefined;u.haulage=undefined;u.order='idle';return false;}
 if(ride.phase==='boarding'){
  u.tx=b.x;u.tz=b.z;u.workReason='Boarding riverboat';
  if(Math.hypot(u.x-b.x,u.z-b.z)>1.5){g.steer(u,dt);return true;}
  ride.phase='aboard';u.order='hold';if(u.team===b.team&&canRowRiverboat(g,u))b.captain??=u.id;g.invalidateRoute(u);
 }
 if(ride.phase==='landing'){
  u.tx=ride.x!;u.tz=ride.z!;u.workReason='Disembarking';
  if(Math.hypot(u.x-u.tx,u.z-u.tz)>1||!g.walkable(u.x,u.z)||g.height(u.x,u.z)<=g.waterAt(u.x,u.z)+.3){g.steer(u,dt);return true;}
  u.boat=undefined;u.haulage=undefined;u.order='idle';u.node=null;g.invalidateRoute(u);g.workBoard.reset();return true;
 }
 if(boatServiceProject(g,b.id)||sailRigProject(g,b.id)){if(b.captain===u.id)u.order='hold';u.workReason='Moored for paid hull service · crew and cargo retained';return true;}
 if(b.captain===u.id&&(u.team!==b.team||!canRowRiverboat(g,u))){delete b.captain;u.order='hold';}
 if(b.captain===u.id){
  const exploring=boatExplorationAI(g,b,u);
  if(!exploring)u.workReason=u.order==='move'?(b.sailRig?.raised?'Sailing and rowing':'Rowing riverboat'):'At the helm · click a water destination';
  if(u.order==='move'&&g.steer(u,dt)){u.order='hold';}
 }else u.workReason='Aboard riverboat';
 return true;
}
export function syncRiverboats(g:Game){
 for(const b of g.state.boats||[]){
  const aboard=boatCrew(g,b.id).filter(u=>u.boat?.phase==='aboard');
  let captain=aboard.find(u=>u.id===b.captain&&u.team===b.team&&canRowRiverboat(g,u));
  if(!captain){captain=aboard.find(u=>u.team===b.team&&canRowRiverboat(g,u));if(captain){b.captain=captain.id;captain.order='hold';}}
  if(captain){b.x=captain.x;b.z=captain.z;b.facing=captain.facing;}
  else {delete b.captain;if(!boatCrew(g,b.id).some(u=>u.boat?.phase==='boarding'))delete b.exploration;}
  b.y=g.waterAt(b.x,b.z)+.16;
  let seat=0;for(let i=0;i<aboard.length;i++){
   const u=aboard[i];if(u===captain)continue;
   const offset=(i-2)*.8;if(b.hullClass){const k=seat++,side=b.hullClass==='scoutCanoe'?0:(k%2?1:-1)*.8,z=b.hullClass==='scoutCanoe'?-1.2:(Math.floor(k/2)-1.5)*1.2;u.x=b.x+Math.cos(b.facing)*side+Math.sin(b.facing)*z;u.z=b.z-Math.sin(b.facing)*side+Math.cos(b.facing)*z;}else{u.x=b.x+Math.sin(b.facing)*offset;u.z=b.z+Math.cos(b.facing)*offset;}u.y=b.y;u.facing=b.facing;u.vx=0;u.vz=0;
  }
 }
}

/** Service works on the same owned hull at this actual shore workplace. */
export function hullServicePhysicalIssue(g:Game,id:number,dock:Building,team:number){const b=g.state.boats?.find(b=>b.id===id&&b.team===team&&b.hp>0&&b.hullClass);if(!b)return'The original owned hull is unavailable';if(sailRigProject(g,id))return'Finish the paid sail fitting first';if(dock.team!==team||dock.type!=='dock'||!g.finished(dock))return'Finish an owned service dock';if(Math.hypot(b.x-dock.x,b.z-dock.z)>BOAT_PRACTICE_RULES.serviceMooringMeters)return'Moor the actual boat at this dock';if(g.state.coastalVoyages?.some(v=>v.boatId===id&&!['complete','lost'].includes(v.phase)))return'Finish or recall the paid voyage before reserving this hull for service';if(b.exploration||boatCrew(g,id).some(u=>u.boat?.phase==='aboard'&&u.order==='move'||hasTaskCommitment(u,'boat')||u.visit||u.trade))return'Finish the crew’s voyage and stop the hull at the dock first';return null;}
export function beginBoatService(g:Game,id:number,dockId:number,team=0,unitId?:number){const b=g.state.boats?.find(b=>b.id===id&&b.team===team&&b.hullClass&&b.hp>0),dock=g.state.buildings.find(d=>d.id===dockId);if(!b||!dock)return false;const pending=boatServiceProject(g,id);if(pending)return pending.work.paused?resumeHaulageProject(g,pending.id,unitId,dockId):false;const issue=hullServicePhysicalIssue(g,id,dock,team);if(issue){if(team===0)g.banner(issue,4);return false;}const s=boatClass(b);if(b.hp>=s.maxHp-1e-8)return false;const missing=1-b.hp/s.maxHp,order:HullOrder={version:1,class:b.hullClass!,mode:'service',boatId:id,startHp:b.hp,paid:{wood:Math.max(1,Math.ceil(s.wood*missing*BOAT_PRACTICE_RULES.serviceCostFraction)),stone:0,cordage:Math.max(1,Math.ceil(s.cordage*missing*BOAT_PRACTICE_RULES.serviceCostFraction))}};return beginHaulageWork(g,'canoe',team,dockId,unitId,order);}
export function completeHullService(g:Game,dock:Building,order:HullOrder){if(order.mode!=='service'||hullServicePhysicalIssue(g,order.boatId!,dock,dock.team))return false;const b=g.state.boats!.find(b=>b.id===order.boatId&&b.team===dock.team&&b.hullClass===order.class)!;if(!b)return false;const maximum=boatClass(b).maxHp;b.hp=Math.min(maximum,b.hp+(maximum-order.startHp!));if(b.hp>=maximum-1e-8)b.hp=maximum;return true;}
export function abandonBoatService(g:Game,id:number,team=0){const p=boatServiceProject(g,id);if(!p||p.team!==team)return false;const u=g.state.units.find(u=>u.id===p.actorId);if(u?.haulageWork?.projectId===p.id){u.haulageWork=undefined;if(u.order==='hold')u.order='idle';}const j=workRuntime(g);j.finish(`haulage:${p.id}`,true);j.forget(`haulage:${p.id}`);g.state.haulageProjects=g.state.haulageProjects!.filter(q=>q!==p);g.workBoard.reset();return true;}

export function boatConstructionIssue(g:Game,kind:keyof typeof BOAT_CLASSES,dockId?:number,team=0){const t=g.tribe(team),s=BOAT_CLASSES[kind];if(!t)return'No living boat owner';const pending=g.state.haulageProjects?.find(p=>p.team===team&&p.work.vessel&&!p.work.sailRigOrder&&(p.work.hullOrder?.class??'riverboat')===kind&&p.work.hullOrder?.mode!=='service');if(pending)return pending.work.paused?null:'The paid hull already has an active builder';const issue=boatClassIssue(g,kind,team);if(issue)return issue;const docks=g.state.buildings.filter(b=>b.team===team&&b.type==='dock'&&g.finished(b)&&(dockId===undefined||b.id===dockId));if(!docks.length)return'Finish an actual dock for hull work';if(t.wood<s.wood||t.stone<s.stone||(t.items?.cordage??0)<s.cordage)return`Need ${s.wood} logs, ${s.stone} stone${s.cordage?` and ${s.cordage} delivered cordage`:''}`;if(!g.state.units.some(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!u.militia&&!u.prisoner&&!u.haulage&&!u.buildOrder&&!u.resting&&!u.shelterId&&!hasTaskCommitment(u)&&!u.jobLock&&u.carry===0&&['idle','hold','gather'].includes(u.order)&&docks.some(b=>g.interactionSpot(u,b))))return'Need an empty-handed available adult and a reachable dock bench';return null;}
export function boatServiceQuote(b:Riverboat){if(!b.hullClass)return null;const s=boatClass(b),missing=Math.max(0,1-b.hp/s.maxHp);return{wood:Math.max(1,Math.ceil(s.wood*missing*BOAT_PRACTICE_RULES.serviceCostFraction)),stone:0,cordage:Math.max(1,Math.ceil(s.cordage*missing*BOAT_PRACTICE_RULES.serviceCostFraction)),seconds:BOAT_PRACTICE_RULES.serviceWorkSeconds};}
