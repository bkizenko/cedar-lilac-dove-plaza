import {sailRigProject} from './boatSailing';
import {SEA_EXPLORATION_ACTIVE_HULL_PHASES,seaExplorationOwnsBoat} from './seaExplorationReservations';
export {seaExplorationOwnsBoat} from './seaExplorationReservations';
import type {Game} from './sim';
import type {GameState,Unit} from './types';
import {BOAT_CLASSES,boatServiceProject,chooseBoatClass} from './boatClasses';
import {beginRiverboat,boardRiverboat,boatCrew,commandRiverboat,landRiverboat,riverboatWaterPoint,BOAT_COST,type Riverboat} from './boats';
import {requestWaterNavigation} from './waterTravel';
import {knownSettlementSite} from './barter';
import {developRivalCoast,rivalKnows} from './rivalDevelopment';
import {knownCoastalLaunchSites,recordCoastalReview} from './coastalStrategy';
import {loadScoutProvisions,returnScoutPackAtCache} from './scoutProvisions';
import {supplyDrops,supplyApproach,supplyReached} from './campAnchor';
import {isDependent,reserveSeconds,foodDemand,FOOD_PER_PERSON_SECOND} from './settlement';
import {predisposition} from './people';
import {hasTaskCommitment} from './workCommitments';
import {resumeHaulageProject} from './haulage';
import {buildingCost} from './construction';
import {isRivalTeam} from './factions';
import {SETTLEMENT_OBSERVATION_RULES} from './settlementKnowledge';

/** Rival docked-hull sea exploration. Orchestration only: hulls, docks, packs,
 * boarding, rowing and landing all use the existing paid/physical executors.
 * Decisions read the society's own knowledge grid; observed cells reach that
 * society's memory only when a crew member physically brings them home. */
export const SEA_EXPLORATION_RULES={version:1,firstReviewSeconds:150,reviewSeconds:120,retrySeconds:600,minimumCrew:2,maximumCrew:3,retainedAdults:3,departureHealthFraction:.6,
 provisionSeconds:420,homeMealSeconds:450,homeWaterSeconds:180,returnReserveSeconds:60,sightMeters:40,minimumTargetMeters:12,arrivalMeters:3,homeArrivalMeters:2.5,blockedSeconds:10,
 maximumLegs:6,maximumVoyageSeconds:420,musterSeconds:360,landingSeconds:120,boardingMeters:24,dangerMeters:24,hullReserveWood:12,maximumRecords:64,maximumLandings:16,maximumHalls:16,maximumProbed:64,gridWidth:32} as const;
export const SEA_EXPLORATION_REASONS=['partner-known','water-preparing','no-frontier','no-reachable-water','no-hull-materials','no-builder','hull-pending','no-crew','no-provisions','home-meals','hull-lost','crew-lost','route-blocked','hull-reassigned','cancelled'] as const;
export type SeaExplorationReason=typeof SEA_EXPLORATION_REASONS[number];
export const SEA_RETURN_REASONS=['surveyed','legs','time','provisions','blocked','danger','recall','crew'] as const;
export type SeaReturnReason=typeof SEA_RETURN_REASONS[number];
export const SEA_PHASES=['commission','ready','mustering','outbound','returning','landing','unloading','complete','failed','lost'] as const;
export type SeaExplorationPhase=typeof SEA_PHASES[number];
type Point={x:number;z:number};
export type SeaExplorationMetrics={dockPayments:number;hullPayments:number;hullReused:number;foodLoaded:number;waterLoaded:number;foodReturned:number;waterReturned:number;foodLost:number;waterLost:number;foodUsed:number;waterUsed:number;foodWithPeople:number;waterWithPeople:number;foodTransferred:number;sailMeters:number;legs:number;crewLost:number;crewReleased:number;cellsCommitted:number};
export type SeaExploration={version:1;id:number;team:number;phase:SeaExplorationPhase;createdAt:number;dockId?:number;projectId?:number;builderId?:number;boatId?:number;
 crew:number[];home:number[];left:number[];homeSea?:Point;homeLand?:Point;target?:Point;targetCell?:number;musterAt?:number;departedAt?:number;landingAt?:number;returnReason?:SeaReturnReason;reason:string;failure?:SeaExplorationReason;reportCommitted:boolean;
 report:{cells:number[];coastCells:number[];landings:Point[];halls:number[];probed:number[]};metrics:SeaExplorationMetrics;lastBoat?:Point};
export type SeaExplorationTeam={team:number;nextReviewAt:number;reviews:number;lastReason:string;reasons:Partial<Record<SeaExplorationReason,number>>};
export type SeaExplorationState={version:1;teams:SeaExplorationTeam[];voyages:SeaExploration[]};
type CrewUnit=Unit&{seaExplorationId?:number};

const R=SEA_EXPLORATION_RULES;
const ACTIVE:readonly SeaExplorationPhase[]=SEA_EXPLORATION_ACTIVE_HULL_PHASES;
const OPEN:SeaExplorationPhase[]=['commission','ready',...ACTIVE];
const distance=(a:Point,b:Point)=>Math.hypot(a.x-b.x,a.z-b.z);
const rate=(u:Unit)=>FOOD_PER_PERSON_SECOND*predisposition(u).appetite;
const emptyMetrics=():SeaExplorationMetrics=>({dockPayments:0,hullPayments:0,hullReused:0,foodLoaded:0,waterLoaded:0,foodReturned:0,waterReturned:0,foodLost:0,waterLost:0,foodUsed:0,waterUsed:0,foodWithPeople:0,waterWithPeople:0,foodTransferred:0,sailMeters:0,legs:0,crewLost:0,crewReleased:0,cellsCommitted:0});
function root(g:Game){return g.state.seaExploration??={version:1,teams:[],voyages:[]};}
function teamRow(g:Game,team:number){const s=root(g);let row=s.teams.find(t=>t.team===team);if(!row){row={team,nextReviewAt:R.firstReviewSeconds,reviews:0,lastReason:'',reasons:{}};s.teams.push(row);}return row;}
function reject(g:Game,team:number,reason:SeaExplorationReason,detail=''){const row=teamRow(g,team);row.lastReason=reason;row.reasons[reason]=(row.reasons[reason]||0)+1;recordCoastalReview(g,team,'sea-explore',detail||reason);return false;}
const openVoyage=(g:Game,team:number)=>g.state.seaExploration?.voyages.find(v=>v.team===team&&OPEN.includes(v.phase));
const activeCrew=(v:SeaExploration)=>v.crew.filter(id=>!v.home.includes(id)&&!v.left.includes(id));
const unitVoyage=(g:Game,u:CrewUnit)=>u.seaExplorationId===undefined?undefined:g.state.seaExploration?.voyages.find(v=>v.id===u.seaExplorationId&&ACTIVE.includes(v.phase));
/** A hull owned by a committed crew is unavailable to trade dispatch. */
/** Trade commissioning waits while this society is already paying for a hull. */
export function seaExplorationCommissioning(g:Game,team:number){return !!g.state.seaExploration?.voyages.some(v=>v.team===team&&v.phase==='commission');}
export function seaExplorationIndependentNeeds(g:Game,u:Unit){return !!unitVoyage(g,u as CrewUnit);}

// ---- Knowledge: the society's own 32×32 memory grid plus live witnessed cells.
function cellOf(g:Game,x:number,z:number){const half=g.world.size/2,c=g.world.size/R.gridWidth,cx=Math.floor((x+half)/c),cz=Math.floor((z+half)/c);return cx>=0&&cz>=0&&cx<R.gridWidth&&cz<R.gridWidth?cz*R.gridWidth+cx:-1;}
function cellCenter(g:Game,i:number):Point{const c=g.world.size/R.gridWidth,half=g.world.size/2;return{x:(i%R.gridWidth+.5)*c-half,z:(Math.floor(i/R.gridWidth)+.5)*c-half};}
export function societyKnownCells(g:Game,team:number,v?:SeaExploration){
 const known=new Set<number>(g.state.rivalKnowledge?.find(m=>m.team===team)?.cells||[]);for(const i of v?.report.cells||[])known.add(i);
 for(const u of g.state.units)if(u.team===team&&u.hp>0){const i=cellOf(g,u.x,u.z);if(i>=0)known.add(i);}
 for(const b of g.state.buildings)if(b.team===team&&['townhall','cornerstone','lumber','quarry','dock'].includes(b.type)&&g.finished(b)){const i=cellOf(g,b.x,b.z);if(i>=0)known.add(i);}
 // A moored hull can occupy a water cell just across the dock's dry cell edge.
 // Seed that actual witnessed water point; ownership alone never reveals a
 // remote hull/coast. Unknown frontier destinations are still not inspected.
 for(const b of g.state.boats||[]){
  if(b.team!==team||b.hp<=0)continue;
  const witnessed=g.state.units.some(u=>u.team===team&&u.hp>0&&distance(u,b)<=R.sightMeters)||
   g.state.buildings.some(d=>d.team===team&&d.type==='dock'&&d.hp>0&&g.finished(d)&&distance(d,b)<=R.sightMeters);
  if(!witnessed||g.height(b.x,b.z)>=g.waterAt(b.x,b.z)+.1)continue;
  const i=cellOf(g,b.x,b.z);if(i>=0)known.add(i);
 }
 return known;
}
type Nav={labels:Int32Array;width:number};
function navLabel(g:Game,nav:Nav,x:number,z:number){const c=g.world.size/nav.width,half=g.world.size/2,ix=Math.floor((x+half)/c),iz=Math.floor((z+half)/c);if(ix<0||iz<0||ix>=nav.width||iz>=nav.width)return 0;return nav.labels[iz*nav.width+ix];}
/** Unknown cells adjoining KNOWN water on the same connected water body. The
 * unknown side's terrain is never inspected for choice; a boat only discovers
 * whether it continues by physically rowing there. */
function frontierCells(g:Game,nav:Nav,label:number,from:Point,known:Set<number>,probed:Set<number>){
 const c=g.world.size/R.gridWidth,half=g.world.size/2,out:{cell:number;d:number}[]=[],seen=new Set<number>();
 for(const k of known){const kx=k%R.gridWidth,kz=Math.floor(k/R.gridWidth);let wet=false;
  for(let sz=0;sz<4&&!wet;sz++)for(let sx=0;sx<4;sx++){const x=(kx+(sx+.5)/4)*c-half,z=(kz+(sz+.5)/4)*c-half;if(navLabel(g,nav,x,z)===label&&g.height(x,z)<g.waterAt(x,z)+.1){wet=true;break;}}
  if(!wet)continue;
  for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=kx+dx,nz=kz+dz;if(nx<0||nz<0||nx>=R.gridWidth||nz>=R.gridWidth)continue;const n=nz*R.gridWidth+nx;if(known.has(n)||probed.has(n)||seen.has(n))continue;seen.add(n);const p=cellCenter(g,n),d=distance(p,from);if(d>=R.minimumTargetMeters)out.push({cell:n,d});}
 }
 return out.sort((a,b)=>a.d-b.d||a.cell-b.cell);
}
/** undefined = water routes still preparing; null = no known frontier. */
function frontierFrom(g:Game,team:number,from:Point,v?:SeaExploration):{cell:number;d:number}[]|undefined{
 const request=requestWaterNavigation(g,true);if(request.status!=='ready')return undefined;
 const label=navLabel(g,request.navigation,from.x,from.z);if(!label)return [];
 return frontierCells(g,request.navigation,label,from,societyKnownCells(g,team,v),new Set(v?.report.probed||[]));
}

// ---- Eligibility.
function healthyFree(g:Game,u:CrewUnit,team:number){return u.team===team&&u.hp>0&&u.type==='worker'&&u.hp>=u.maxHp*R.departureHealthFraction&&(u.thirstSeconds||0)<60&&!isDependent(g,u)&&!u.prisoner&&!u.militia&&!u.haulage&&!u.boat&&!u.scoutProvisions&&u.seaExplorationId===undefined&&!hasTaskCommitment(u)&&!u.jobLock&&!u.buildOrder&&!u.expedition&&!u.scout&&!u.visit&&!u.envoy&&!u.trade&&!u.emergency&&!u.recalled&&!u.resting&&!u.foundingJourney&&!u.tributeJourney&&u.escortId===undefined&&u.drill==null&&u.carry===0&&['idle','hold','gather'].includes(u.order);}
function homeAdults(g:Game,team:number){const home=g.campOf(team);return g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)&&!u.prisoner&&!u.militia&&!u.boat&&!(u as CrewUnit).seaExplorationId&&!u.coastalVoyageId&&!u.societyMissionId&&!u.expedition&&!u.scout&&!u.visit&&!u.envoy&&Math.hypot(u.x-home.x,u.z-home.z)<=70);}
function idleHull(g:Game,team:number){return(g.state.boats||[]).filter(b=>b.team===team&&b.hp>0&&!boatServiceProject(g,b.id)&&!sailRigProject(g,b.id)&&!boatCrew(g,b.id).length&&!g.state.coastalVoyages?.some(v=>v.boatId===b.id&&v.phase!=='complete'&&v.phase!=='lost')&&!seaExplorationOwnsBoat(g,b.id)).map(b=>({b,dock:g.state.buildings.find(d=>d.id===b.dock&&d.team===team&&d.type==='dock'&&g.finished(d))})).filter(r=>r.dock&&distance(r.b,r.dock)<=R.boardingMeters+8).sort((a,c)=>a.b.id-c.b.id)[0];}
function knowsPartner(g:Game,team:number){return g.state.tribes.some(t=>t.id!==team&&t.id!==3&&t.alive&&!g.isFoe(team,t.id)&&!!knownSettlementSite(g,t.id,team));}
function dryLanding(g:Game,near:Point,team:number){const drop=supplyDrops(g,team)[0];if(!drop)return null;for(let r=0;r<=16;r+=2)for(let i=0;i<24;i++){const a=i*Math.PI/12,p={x:near.x+Math.cos(a)*r,z:near.z+Math.sin(a)*r};if(!g.walkable(p.x,p.z)||g.height(p.x,p.z)<=g.waterAt(p.x,p.z)+.3||!g.workBoard.connected(g,p.x,p.z,drop.x,drop.z))continue;if([[-1,0],[1,0],[0,-1],[0,1]].every(([x,z])=>g.walkable(p.x+x,p.z+z)))return p;}return null;}

// ---- Review: decide from own knowledge, then hull → crew.
export function reviewSeaExploration(g:Game){
 const s=g.state.seaExploration;
 for(const t of g.state.tribes){if(!isRivalTeam(t.id)||!t.alive)continue;
  const row=s?.teams.find(r=>r.team===t.id);if(g.state.time<(row?.nextReviewAt??R.firstReviewSeconds))continue;
  const due=teamRow(g,t.id);due.nextReviewAt=g.state.time+R.reviewSeconds;due.reviews++;reviewTeam(g,t.id);
 }
}
function reviewTeam(g:Game,team:number){
 const open=openVoyage(g,team);if(open&&ACTIVE.includes(open.phase))return true;
 if(knowsPartner(g,team)){if(open?.phase==='ready'){open.phase='complete';open.reason='A partner hall is known; the idle hull is left for trade';}return reject(g,team,'partner-known');}
 if(open?.phase==='commission')return advanceCommission(g,open);
 if(open?.phase==='ready'&&open.boatId!==undefined&&sailRigProject(g,open.boatId)){open.reason='The paid hull waits for its existing sail fitting';return reject(g,team,'hull-pending',open.reason);}
 const hull=open?.boatId!==undefined?(()=>{const b=g.state.boats?.find(b=>b.id===open.boatId&&b.team===team&&b.hp>0);const dock=b&&g.state.buildings.find(d=>d.id===b.dock&&d.team===team&&g.finished(d));return b&&dock&&!sailRigProject(g,b.id)&&!boatCrew(g,b.id).length&&!g.state.coastalVoyages?.some(v=>v.boatId===b.id&&v.phase!=='complete'&&v.phase!=='lost')?{b,dock}:undefined;})():idleHull(g,team);
 if(open?.phase==='ready'&&!hull){open.phase='failed';open.failure='hull-reassigned';open.reason='The commissioned hull is no longer idle at its dock';}
 if(hull){const launch=riverboatWaterPoint(g,hull.b.x,hull.b.z)||hull.b;const frontier=frontierFrom(g,team,launch,open?.phase==='ready'?open:undefined);if(frontier===undefined){teamRow(g,team).nextReviewAt=g.state.time+1;return reject(g,team,'water-preparing');}if(!frontier.length)return reject(g,team,'no-frontier','No unknown water adjoins this society’s known coast');return muster(g,team,hull.b,hull.dock!.id,open?.phase==='ready'?open:undefined);}
 if(g.state.haulageProjects?.some(p=>p.team===team&&p.work.vessel&&p.work.hullOrder?.mode!=='service')||g.state.coastalCommissions?.some(c=>c.team===team&&(c.phase==='dock'||c.phase==='hull')))return reject(g,team,'hull-pending','Another paid hull is already being made');
 return commission(g,team);
}
function hullSpec(g:Game,team:number){const kind=chooseBoatClass(g,team,R.minimumCrew);return{kind,spec:BOAT_CLASSES[kind??'riverboat']};}
function commission(g:Game,team:number){
 const t=g.tribe(team),docks=g.state.buildings.filter(b=>b.team===team&&b.type==='dock'&&b.hp>0);
 const launchable=docks.filter(d=>g.finished(d)).map(d=>({d,p:riverboatWaterPoint(g,d.x,d.z)})).filter(r=>r.p);
 let dock=launchable.map(r=>({...r,f:frontierFrom(g,team,r.p!)})).find(r=>r.f===undefined||r.f.length)?.d,unfinished=docks.find(d=>!g.finished(d));
 if(launchable.length&&!dock&&!unfinished)return reject(g,team,'no-frontier','Known water from every own dock is already surveyed');
 const {spec}=hullSpec(g,team);
 if(!dock&&!unfinished){
  const site=knownCoastalLaunchSites(g,team,(x,z)=>rivalKnows(g,team,x,z))[0];if(!site)return reject(g,team,'no-reachable-water','No observed reachable launch shore');
  const frontier=frontierFrom(g,team,site.launch);if(frontier===undefined){teamRow(g,team).nextReviewAt=g.state.time+1;return reject(g,team,'water-preparing');}if(!frontier.length)return reject(g,team,'no-frontier');
  const cost=buildingCost('dock',g,team);if(t.wood<(cost.wood||0)+spec.wood+R.hullReserveWood||t.stone<(cost.stone||0)+spec.stone||(t.items?.cordage??0)<spec.cordage)return reject(g,team,'no-hull-materials','Collect dock and hull materials from actual stores');
  if(reserveSeconds(g,team)<R.homeMealSeconds)return reject(g,team,'home-meals');
  if(!g.state.units.some(u=>healthyFree(g,u,team)))return reject(g,team,'no-builder');
  const before=new Set(docks.map(d=>d.id));if(!developRivalCoast(g,team))return reject(g,team,'no-reachable-water','The paid dock command found no valid known shore');
  unfinished=g.state.buildings.find(b=>b.team===team&&b.type==='dock'&&b.hp>0&&!before.has(b.id));if(!unfinished)return reject(g,team,'no-reachable-water');
  const v=create(g,team,'commission');v.dockId=unfinished.id;v.metrics.dockPayments++;v.reason='Paid dock foundation; a builder must finish the actual labor';return advanceCommission(g,v);
 }
 const v=create(g,team,'commission');v.dockId=(dock||unfinished)!.id;return advanceCommission(g,v);
}
function create(g:Game,team:number,phase:SeaExplorationPhase){const s=root(g);while(s.voyages.length>=R.maximumRecords){const i=s.voyages.findIndex(v=>!OPEN.includes(v.phase));if(i<0)break;s.voyages.splice(i,1);}const v:SeaExploration={version:1,id:g.id(),team,phase,createdAt:g.state.time,crew:[],home:[],left:[],reason:'',reportCommitted:false,report:{cells:[],coastCells:[],landings:[],halls:[],probed:[]},metrics:emptyMetrics()};s.voyages.push(v);return v;}
function fail(g:Game,v:SeaExploration,reason:SeaExplorationReason,detail:string){v.failure=reason;v.reason=detail;reject(g,v.team,reason,detail);}
/** Builds an actual dock, then pays one hull into the haulage executor. */
function advanceCommission(g:Game,v:SeaExploration){
 const t=g.tribe(v.team),dock=g.state.buildings.find(b=>b.id===v.dockId&&b.team===v.team&&b.type==='dock'&&b.hp>0);
 if(!dock){v.phase='failed';fail(g,v,'no-reachable-water','The paid dock site was lost');return false;}
 if(!g.finished(dock)){const assigned=g.state.units.find(u=>u.team===v.team&&u.hp>0&&(u.buildOrder===dock.id||u.order==='build'&&u.node?.id===dock.id));if(assigned){v.builderId=assigned.id;v.reason='Paid dock: builder working at the foundation';return true;}
  const builder=g.state.units.find(u=>healthyFree(g,u,v.team)&&!!g.interactionSpot(u,dock));if(!builder){fail(g,v,'no-builder','Paid dock waits for an available adult with a route');return false;}
  g.interruptMission(builder);builder.order='build';builder.node=dock;builder.tx=dock.x;builder.tz=dock.z;builder.workReason='Building the paid exploration dock';v.builderId=builder.id;v.reason=builder.workReason;return true;}
 const launched=g.state.boats?.find(b=>b.team===v.team&&b.dock===dock.id&&b.hp>0&&!sailRigProject(g,b.id)&&!seaExplorationOwnsBoat(g,b.id)&&!g.state.coastalVoyages?.some(c=>c.boatId===b.id&&c.phase!=='complete'&&c.phase!=='lost'));
 const project=g.state.haulageProjects?.find(p=>p.team===v.team&&p.work.vessel&&!p.work.sailRigOrder&&p.work.hullOrder?.mode!=='service'&&(p.id===v.projectId||p.work.workplace===dock.id));
 if(project){v.projectId=project.id;if(project.actorId!==null&&!project.work.paused){v.builderId=project.actorId;v.reason='Paid hull: an adult is shaping it at the dock';return true;}const next=g.state.units.find(u=>healthyFree(g,u,v.team));if(next&&resumeHaulageProject(g,project.id,next.id,dock.id)){v.builderId=next.id;v.reason='A replacement adult resumes the same paid hull';return true;}fail(g,v,'no-builder',project.blockedReason||'Paid hull waits for an adult');return false;}
 if(launched&&(v.projectId!==undefined||!boatCrew(g,launched.id).length)){v.boatId=launched.id;v.phase='ready';v.reason='Paid hull launched; awaiting a healthy crew and provisions';teamRow(g,v.team).nextReviewAt=g.state.time;return true;}
 if(g.state.boats?.some(b=>b.team===v.team&&b.dock===dock.id&&b.hp>0&&sailRigProject(g,b.id))){fail(g,v,'hull-pending','The dock hull waits for its existing paid sail fitting');return false;}
 const {kind,spec}=hullSpec(g,v.team);
 if(t.wood<spec.wood+R.hullReserveWood||t.stone<spec.stone||(t.items?.cordage??0)<spec.cordage){fail(g,v,'no-hull-materials',`Need ${spec.wood} logs and ${spec.stone} stone in actual stores for a hull`);return false;}
 const builder=g.state.units.find(u=>healthyFree(g,u,v.team)&&!!g.interactionSpot(u,dock));if(!builder){fail(g,v,'no-builder','Need a free adult with a route to the dock bench');return false;}
 const before=new Set((g.state.haulageProjects||[]).map(p=>p.id));if(!beginRiverboat(g,dock.id,v.team,builder.id,kind)){fail(g,v,'no-builder','The dock bench refused the paid hull');return false;}
 v.projectId=builder.haulageWork?.projectId??g.state.haulageProjects?.find(p=>!before.has(p.id))?.id;v.builderId=builder.id;v.metrics.hullPayments++;v.reason=`Hull inputs paid once (${kind?spec.wood:BOAT_COST.wood} logs); bench labor follows`;return true;
}
function muster(g:Game,team:number,b:Riverboat,dockId:number,existing?:SeaExploration){
 const adults=homeAdults(g,team),cap=Math.min(R.maximumCrew,b.capacity,adults.length-R.retainedAdults);
 const drops=supplyDrops(g,team);if(!drops.length)return reject(g,team,'no-provisions','No reachable home cache');
 const home=g.campOf(team),eligible=adults.filter(u=>healthyFree(g,u,team)).sort((a,c)=>distance(a,home)-distance(c,home)||a.id-c.id).slice(0,Math.max(0,cap));
 if(eligible.length<R.minimumCrew)return reject(g,team,'no-crew',`Need ${R.minimumCrew} healthy free adults while ${R.retainedAdults} stay home`);
 const food=eligible.reduce((n,u)=>n+rate(u)*R.provisionSeconds,0),water=g.state.survivalVersion===1?eligible.length*.008*R.provisionSeconds:0,t=g.tribe(team);
 if(t.food-food<foodDemand(g,team)*R.homeMealSeconds||(g.state.survivalVersion===1&&(t.survival?.waterLiters||0)<water))return reject(g,team,'no-provisions','Collect real food and water for the crew while keeping home meals');
 const homeLand=dryLanding(g,b,team);if(!homeLand)return reject(g,team,'no-reachable-water','No dry boarding shore connected to the home cache');
 const v=existing||create(g,team,'mustering');if(!existing)v.metrics.hullReused++;
 v.phase='mustering';v.boatId=b.id;v.dockId=dockId;v.homeSea={x:b.x,z:b.z};v.homeLand=homeLand;v.lastBoat={x:b.x,z:b.z};v.musterAt=g.state.time;v.crew=eligible.map(u=>u.id);v.home=[];v.left=[];v.failure=undefined;v.reason='Crew walking to the home cache to load finite provisions';
 for(const u of eligible){g.interruptMission(u);(u as CrewUnit).seaExplorationId=v.id;u.order='hold';u.node=null;u.target=null;u.job=null;u.stuckT=0;u.workReason='Sea exploration: loading provisions';}
 const row=teamRow(g,team);row.lastReason='';recordCoastalReview(g,team,'sea-explore-mustered');return true;
}

// ---- Per-step lifecycle.
const observed=new WeakMap<SeaExploration,{x:number;z:number;t:number}>();
function observe(g:Game,v:SeaExploration,b:Riverboat){
 const last=observed.get(v);if(last&&g.state.time-last.t<1&&Math.hypot(b.x-last.x,b.z-last.z)<6)return;observed.set(v,{x:b.x,z:b.z,t:g.state.time});
 const cells=new Set(v.report.cells),coasts=new Set(v.report.coastCells);let probes=0;
 for(let r=0;r<=R.sightMeters;r+=10)for(let i=0;i<(r?16:1);i++){const a=i*Math.PI/8,x=b.x+Math.cos(a)*r,z=b.z+Math.sin(a)*r,cell=cellOf(g,x,z);if(cell<0)continue;cells.add(cell);
  const h=g.height(x,z),w=g.waterAt(x,z);if(h<w+.3)continue;
  if([[3,0],[-3,0],[0,3],[0,-3]].some(([dx,dz])=>g.height(x+dx,z+dz)<g.waterAt(x+dx,z+dz)+.1))coasts.add(cell);
  if(probes<4&&v.report.landings.length<R.maximumLandings&&h<=w+1.8&&g.walkable(x,z)&&[[-1,0],[1,0],[0,-1],[0,1]].every(([dx,dz])=>g.walkable(x+dx,z+dz))&&!v.report.landings.some(p=>distance(p,{x,z})<12)){probes++;if(riverboatWaterPoint(g,x,z,8))v.report.landings.push({x:Math.round(x*10)/10,z:Math.round(z*10)/10});}
 }
 v.report.cells=[...cells].sort((a,c)=>a-c);v.report.coastCells=[...coasts].sort((a,c)=>a-c);
 for(const h of g.state.buildings)if(h.type==='townhall'&&h.team!==v.team&&g.finished(h)&&distance(h,b)<=SETTLEMENT_OBSERVATION_RULES.witnessRadiusMeters&&!v.report.halls.includes(h.id)&&v.report.halls.length<R.maximumHalls)v.report.halls.push(h.id);
}
function nextLeg(g:Game,v:SeaExploration,b:Riverboat){
 const frontier=frontierFrom(g,v.team,b,v);if(frontier===undefined)return undefined;
 for(const f of frontier.slice(0,8)){const p=cellCenter(g,f.cell);if(commandRiverboat(g,b.id,p.x,p.z,true)){const captain=g.state.units.find(u=>u.id===b.captain);v.target=captain?{x:captain.tx,z:captain.tz}:p;v.targetCell=f.cell;return true;}if(v.report.probed.length<R.maximumProbed)v.report.probed.push(f.cell);}
 return false;
}
function beginReturn(g:Game,v:SeaExploration,reason:SeaReturnReason){if(v.phase!=='outbound')return;v.phase='returning';v.returnReason=reason;v.target=undefined;v.targetCell=undefined;v.reason=`Returning to the home dock · ${reason}`;const b=g.state.boats?.find(b=>b.id===v.boatId&&b.hp>0);if(b&&v.homeSea)commandRiverboat(g,b.id,v.homeSea.x,v.homeSea.z,true);}
function provisionsLow(g:Game,v:SeaExploration,b:Riverboat){const captain=g.state.units.find(u=>u.id===b.captain);const seconds=distance(b,v.homeSea!)/Math.max(.5,(captain?.speed||1)*.5)+R.returnReserveSeconds;return activeCrew(v).some(id=>{const u=g.state.units.find(u=>u.id===id&&u.hp>0);const p=u?.scoutProvisions;return !p||p.food/rate(u!)<=seconds||g.state.survivalVersion===1&&p.water/.008<=seconds;});}
/** The pack of a dead crewmate stays aboard and feeds the living crew when it
 * fits their existing carried pack limits; any remainder is recorded lost. */
function reconcileCrew(g:Game,v:SeaExploration){
 for(const id of activeCrew(v)){const u=g.state.units.find(u=>u.id===id) as CrewUnit|undefined;
  if(u&&u.hp>0&&!u.prisoner&&u.team===v.team&&u.seaExplorationId===v.id)continue;
  if(u&&u.hp<=0&&u.scoutProvisions){const p=u.scoutProvisions,mate=activeCrew(v).map(i=>g.state.units.find(m=>m.id===i&&m.hp>0&&!m.prisoner&&m.team===v.team)).find(m=>m&&m.scoutProvisions&&(!!m.boat===!!u.boat)&&distance(m,u)<=8);
   if(mate?.scoutProvisions){const q=mate.scoutProvisions,food=Math.max(0,Math.min(p.food,100-q.food-q.foodUsed)),water=Math.max(0,Math.min(p.water,20-q.water-q.waterUsed));q.food+=food;q.water+=water;p.food-=food;p.water-=water;v.metrics.foodTransferred+=food;}
   v.metrics.foodUsed+=p.foodUsed;v.metrics.waterUsed+=p.waterUsed;v.metrics.foodLost+=p.food;v.metrics.waterLost+=p.water;const stock=g.tribe(v.team).survival;if(stock)stock.waterLostLiters+=p.water;u.scoutProvisions=undefined;}
  if(u&&u.hp>0&&u.scoutProvisions)handOverPack(v,u);if(u&&u.seaExplorationId===v.id)u.seaExplorationId=undefined;v.left.push(id);if(u&&u.hp>0&&!u.prisoner&&u.team===v.team)v.metrics.crewReleased++;else v.metrics.crewLost++;
 }
}
function finish(g:Game,v:SeaExploration){v.phase=v.home.length?'complete':v.boatId!==undefined&&v.departedAt!==undefined?'lost':'failed';if(v.phase==='complete')v.reason=v.failure==='hull-lost'?'Survivors walked home with their report after losing the hull':'Crew, hull and report physically home';else if(!v.failure)fail(g,v,'crew-lost','No crew member brought the report home');teamRow(g,v.team).nextReviewAt=g.state.time+R.retrySeconds;}
export function tickSeaExploration(g:Game,_dt:number){
 const s=g.state.seaExploration;if(!s)return;
 for(const v of s.voyages){if(!ACTIVE.includes(v.phase))continue;
  reconcileCrew(g,v);const crew=activeCrew(v).map(id=>g.state.units.find(u=>u.id===id)!) as CrewUnit[];
  const b=g.state.boats?.find(b=>b.id===v.boatId&&b.team===v.team&&b.hp>0);
  if(b&&v.lastBoat){v.metrics.sailMeters+=distance(b,v.lastBoat);v.lastBoat={x:b.x,z:b.z};}
  if(!crew.length){finish(g,v);continue;}
  if(!b&&v.phase!=='unloading'){fail(g,v,'hull-lost','The hull was lost; survivors carry their packs and report home');v.phase='unloading';v.landingAt=g.state.time;continue;}
  if(v.phase==='mustering'){const aboard=crew.filter(u=>u.boat?.phase==='aboard');
   if(crew.length<R.minimumCrew||g.state.time-(v.musterAt??v.createdAt)>R.musterSeconds){fail(g,v,crew.length<R.minimumCrew?'no-crew':'route-blocked','Departure cancelled; crew return packs to the cache');v.returnReason='crew';if(aboard.length&&landRiverboat(g,b!.id,v.homeLand)){v.phase='landing';v.landingAt=g.state.time;}else v.phase='unloading';continue;}
   if(aboard.length===crew.length&&crew.some(u=>u.id===b!.captain)){v.departedAt=g.state.time;v.homeSea={x:b!.x,z:b!.z};v.lastBoat={x:b!.x,z:b!.z};observe(g,v,b!);v.phase='outbound';v.reason='Sailing toward unobserved water';if(nextLeg(g,v,b!)===false)beginReturn(g,v,'surveyed');}
   continue;}
  if(v.phase==='outbound'||v.phase==='returning'){observe(g,v,b!);const captain=g.state.units.find(u=>u.id===b!.captain&&u.hp>0);
   if(v.phase==='outbound'){
    if(provisionsLow(g,v,b!))beginReturn(g,v,'provisions');
    else if(g.state.time-(v.departedAt??0)>R.maximumVoyageSeconds)beginReturn(g,v,'time');
    else if(g.state.units.some(p=>p.hp>0&&g.isFoe(v.team,p.team)&&distance(p,b!)<R.dangerMeters))beginReturn(g,v,'danger');
    else if(!captain)v.reason='Waiting for an able crew member to take the helm';
    else if(captain.stuckT>R.blockedSeconds){if(v.targetCell!==undefined&&v.report.probed.length<R.maximumProbed)v.report.probed.push(v.targetCell);captain.stuckT=0;const leg=nextLeg(g,v,b!);if(leg===false)beginReturn(g,v,'blocked');}
    else if(!v.target){const leg=nextLeg(g,v,b!);if(leg===false)beginReturn(g,v,'surveyed');}
    else if(captain.order==='hold'||distance(b!,v.target)<=R.arrivalMeters){v.metrics.legs++;if(v.targetCell!==undefined&&!v.report.cells.includes(v.targetCell)&&v.report.probed.length<R.maximumProbed)v.report.probed.push(v.targetCell);v.target=undefined;v.targetCell=undefined;if(v.metrics.legs>=R.maximumLegs)beginReturn(g,v,'legs');else{const leg=nextLeg(g,v,b!);if(leg===false)beginReturn(g,v,'surveyed');else if(leg===undefined)captain.order='hold';}}
   }
   if(v.phase==='returning'&&captain){if(distance(b!,v.homeSea!)<=R.homeArrivalMeters){if(landRiverboat(g,b!.id,v.homeLand)||landRiverboat(g,b!.id)){v.phase='landing';v.landingAt=g.state.time;v.reason='Crew landing at the home dock';}}
    else if(captain.stuckT>R.blockedSeconds*3){captain.stuckT=0;if(landRiverboat(g,b!.id)){v.phase='landing';v.landingAt=g.state.time;fail(g,v,'route-blocked','Return water blocked; landed at the nearest shore');}}
    else if(captain.order!=='move')commandRiverboat(g,b!.id,v.homeSea!.x,v.homeSea!.z,true);}
   continue;}
  if(v.phase==='landing'){if(crew.every(u=>!u.boat)){v.phase='unloading';v.reason='Crew carrying leftover provisions and the report to the cache';}else if(g.state.time-(v.landingAt??0)>R.landingSeconds&&b&&crew.some(u=>u.boat?.phase==='aboard')){v.landingAt=g.state.time;landRiverboat(g,b.id);}continue;}
 }
}
/** Ashore crew actions: load packs, walk to the boat, unload at the cache. */
export function seaExplorationAI(g:Game,u:Unit,dt:number){
 const c=u as CrewUnit;if(c.seaExplorationId===undefined)return false;const v=unitVoyage(g,c);if(!v){c.seaExplorationId=undefined;return false;}
 if(u.boat||u.hp<=0||u.prisoner)return false;
 if(v.phase==='mustering'){
  if(!u.scoutProvisions){const home=nearestCache(g,u);if(!home){reject(g,v.team,'no-provisions','No reachable home cache to load provisions');release(g,v,c);return true;}u.order='hold';u.tx=home.p.x;u.tz=home.p.z;u.workReason='Sea exploration: walking to load provisions';if(!supplyReached(g,u,home.d,home.p)){g.steer(u,dt);return true;}
   if(!loadScoutProvisions(g,u,{budgetSeconds:R.provisionSeconds,homeMealSeconds:R.homeMealSeconds,homeWaterSeconds:R.homeWaterSeconds})){reject(g,v.team,'no-provisions','Home stores cannot spare this crew member’s pack');release(g,v,c);return true;}
   v.metrics.foodLoaded+=u.scoutProvisions!.food;v.metrics.waterLoaded+=u.scoutProvisions!.water;return true;}
  const b=g.state.boats?.find(b=>b.id===v.boatId&&b.hp>0);if(!b)return true;u.order='hold';u.workReason='Sea exploration: carrying provisions to the boat';
  if(distance(u,b)>R.boardingMeters){u.tx=v.homeLand!.x;u.tz=v.homeLand!.z;g.steer(u,dt);return true;}
  if(!boardRiverboat(g,b.id,[u],v.team,true))v.reason='Waiting for a clear boarding approach';return true;}
 if(v.phase==='unloading'||v.phase==='landing'){if(v.phase==='landing')return true;if(!g.walkable(u.x,u.z)||g.height(u.x,u.z)<=g.waterAt(u.x,u.z)+.3){const shore=dryLanding(g,u,v.team);if(!shore||g.state.time-(v.landingAt??g.state.time)>R.landingSeconds){v.reason='A survivor could not reach a connected shore; released with the pack, report unconfirmed';release(g,v,c,true);return true;}u.order='hold';u.tx=shore.x;u.tz=shore.z;u.workReason='Sea exploration: wading ashore after losing the hull';g.steer(u,dt);return true;}
  const home=nearestCache(g,u);if(!home){release(g,v,c,true);return true;}u.order='hold';u.tx=home.p.x;u.tz=home.p.z;u.workReason='Sea exploration: bringing the report and leftover provisions home';if(!supplyReached(g,u,home.d,home.p)){g.steer(u,dt);return true;}
  commitReport(g,v);const pack=u.scoutProvisions;if(pack&&returnScoutPackAtCache(g,u)){v.metrics.foodUsed+=pack.foodUsed;v.metrics.waterUsed+=pack.waterUsed;v.metrics.foodReturned+=pack.food;v.metrics.waterReturned+=pack.water;}else if(u.scoutProvisions)handOverPack(v,u);
  c.seaExplorationId=undefined;v.home.push(u.id);u.order='idle';u.node=null;u.workReason='Home from sea exploration';if(!activeCrew(v).length)finish(g,v);return true;}
 return true;
}
function nearestCache(g:Game,u:Unit){return supplyDrops(g,u.team).map(d=>({d,p:supplyApproach(g,u,d)})).filter(r=>r.p).sort((a,b)=>distance(u,a.p!)-distance(u,b.p!))[0] as {d:ReturnType<typeof supplyDrops>[number];p:Point}|undefined;}
/** The released person keeps any pack; the existing scout-pack executor refunds
 * it only at an actual owned cache. */
function handOverPack(v:SeaExploration,u:Unit){const p=u.scoutProvisions;if(!p)return;v.metrics.foodUsed+=p.foodUsed;v.metrics.waterUsed+=p.waterUsed;v.metrics.foodWithPeople+=p.food;v.metrics.waterWithPeople+=p.water;p.foodUsed=0;p.waterUsed=0;}
function release(g:Game,v:SeaExploration,u:CrewUnit,stranded=false){handOverPack(v,u);u.seaExplorationId=undefined;if(!v.left.includes(u.id))v.left.push(u.id);v.metrics.crewReleased++;if(stranded){u.recalled=true;u.stationOnArrival=false;u.order='return';u.workReason='Sea exploration crew needs a reachable cache';}else u.order='idle';if(!activeCrew(v).length)finish(g,v);}
function commitReport(g:Game,v:SeaExploration){if(v.reportCommitted)return;v.reportCommitted=true;const list=g.state.rivalKnowledge??=[];let m=list.find(m=>m.team===v.team);if(!m){m={team:v.team,cells:[]};list.push(m);}const known=new Set(m.cells);for(const c of v.report.cells)if(!known.has(c)){m.cells.push(c);known.add(c);v.metrics.cellsCommitted++;}recordCoastalReview(g,v.team,'sea-explore-report');}
/** Direct interruption releases an ashore member before departure; people
 * already aboard cannot step off at sea and stay with the hull. */
export function pauseSeaExploration(g:Game,u:Unit){const c=u as CrewUnit,v=unitVoyage(g,c);if(!v||u.boat)return false;if(v.phase==='unloading')return false;release(g,v,c);return true;}
/** Owner cancel: before departure crew unload; at sea the hull sails home. */
export function cancelSeaExploration(g:Game,id:number){const v=g.state.seaExploration?.voyages.find(v=>v.id===id&&OPEN.includes(v.phase));if(!v)return false;if(v.phase==='commission'||v.phase==='ready'){v.phase='failed';fail(g,v,'cancelled','Cancelled; paid docks and hulls remain owned');return true;}if(v.phase==='mustering'){fail(g,v,'cancelled','Cancelled before departure; packs return to the cache');const b=g.state.boats?.find(b=>b.id===v.boatId&&b.hp>0);if(b&&boatCrew(g,b.id).some(u=>u.boat?.phase==='aboard')&&landRiverboat(g,b.id,v.homeLand)){v.phase='landing';v.landingAt=g.state.time;}else v.phase='unloading';return true;}if(v.phase==='outbound'){beginReturn(g,v,'recall');return true;}return false;}
export function seaExplorationDiagnostics(g:Game){const s=g.state.seaExploration;return{rules:R,teams:(s?.teams||[]).map(t=>({...t,reasons:{...t.reasons}})),voyages:(s?.voyages||[]).map(v=>({id:v.id,team:v.team,phase:v.phase,boatId:v.boatId,crew:v.crew.length,home:v.home.length,left:v.left.length,returnReason:v.returnReason,failure:v.failure,reason:v.reason,cells:v.report.cells.length,coasts:v.report.coastCells.length,landings:v.report.landings.length,halls:v.report.halls.length,metrics:{...v.metrics}}))};}

// ---- Save validation (old saves: missing field = no voyages).
export function validSeaExplorationState(s:GameState){
 const units=s.units as CrewUnit[],root=s.seaExploration;if(root===undefined)return units.every(u=>u.seaExplorationId===undefined);
 const half=(s.worldOptions?.size??1040)/2,fin=(n:unknown,max=1e9)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max,id=(n:unknown)=>Number.isSafeInteger(n)&&(n as number)>0&&(n as number)<s.nextId,point=(p:any)=>!!p&&typeof p==='object'&&Number.isFinite(p.x)&&Number.isFinite(p.z)&&Math.abs(p.x)<=half&&Math.abs(p.z)<=half,cells=(a:unknown,max:number)=>Array.isArray(a)&&a.length<=max&&a.every(c=>Number.isSafeInteger(c)&&c>=0&&c<R.gridWidth*R.gridWidth)&&new Set(a).size===a.length;
 if(!root||typeof root!=='object'||root.version!==1||!Array.isArray(root.teams)||!Array.isArray(root.voyages)||root.teams.length>s.tribes.length||root.voyages.length>R.maximumRecords)return false;
 const teams=new Set<number>();for(const t of root.teams){if(!t||!s.tribes[t.team]||t.team===0||t.team===3||teams.has(t.team)||!fin(t.nextReviewAt)||!Number.isSafeInteger(t.reviews)||t.reviews<0||typeof t.lastReason!=='string'||t.lastReason.length>64||!t.reasons||typeof t.reasons!=='object'||Object.entries(t.reasons).some(([k,n])=>!(SEA_EXPLORATION_REASONS as readonly string[]).includes(k)||!Number.isSafeInteger(n)||(n as number)<0))return false;teams.add(t.team);}
 const ids=new Set<number>(),open=new Set<number>(),crewed=new Map<number,number>();
 for(const v of root.voyages){if(!v||v.version!==1||!id(v.id)||ids.has(v.id)||!s.tribes[v.team]||v.team===0||v.team===3||!SEA_PHASES.includes(v.phase)||!fin(v.createdAt,s.time+1e-6)||typeof v.reason!=='string'||v.reason.length>400||typeof v.reportCommitted!=='boolean'||
   ![v.dockId,v.projectId,v.builderId,v.boatId].every(n=>n===undefined||id(n))||v.targetCell!==undefined&&!cells([v.targetCell],1)||![v.musterAt,v.departedAt,v.landingAt].every(n=>n===undefined||fin(n,s.time+1e-6))||
   v.returnReason!==undefined&&!SEA_RETURN_REASONS.includes(v.returnReason)||v.failure!==undefined&&!SEA_EXPLORATION_REASONS.includes(v.failure)||![v.homeSea,v.homeLand,v.target,v.lastBoat].every(p=>p===undefined||point(p))||
   ![v.crew,v.home,v.left].every(a=>Array.isArray(a)&&a.length<=8&&a.every(id)&&new Set(a).size===a.length)||!v.home.every((n:number)=>v.crew.includes(n)&&!v.left.includes(n))||!v.left.every((n:number)=>v.crew.includes(n))||
   !v.report||!cells(v.report.cells,R.gridWidth*R.gridWidth)||!cells(v.report.coastCells,R.gridWidth*R.gridWidth)||!cells(v.report.probed,R.maximumProbed)||!Array.isArray(v.report.landings)||v.report.landings.length>R.maximumLandings||!v.report.landings.every(point)||!Array.isArray(v.report.halls)||v.report.halls.length>R.maximumHalls||!v.report.halls.every(id)||
   !v.metrics||Object.keys(emptyMetrics()).some(k=>!fin(v.metrics[k as keyof SeaExplorationMetrics])))return false;
  ids.add(v.id);if(OPEN.includes(v.phase)){if(open.has(v.team))return false;open.add(v.team);}
  if(ACTIVE.includes(v.phase)){if(v.boatId===undefined||!v.homeSea||!v.homeLand)return false;if(['outbound','returning'].includes(v.phase)&&(v.departedAt===undefined||!s.boats?.some(b=>b.id===v.boatId&&b.team===v.team)))return false;
   for(const n of v.crew)if(!v.home.includes(n)&&!v.left.includes(n)){if(crewed.has(n))return false;crewed.set(n,v.id);if(!units.some(u=>u.id===n&&u.seaExplorationId===v.id))return false;}}
 }
 return units.every(u=>u.seaExplorationId===undefined||crewed.get(u.id)===u.seaExplorationId);
}
