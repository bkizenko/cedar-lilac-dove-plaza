import{boatServiceProject}from'./boatClasses';
import type{Game}from'./sim';
import type{Unit}from'./types';
import{landRiverboat,type Riverboat}from'./boats';
import{requestWaterNavigation}from'./waterTravel';
import{hasTaskCommitment}from'./workCommitments';
export const BOAT_EXPLORE_RULES={reviewSeconds:2,minimumTargetMeters:12,arrivalMeters:3,blockedSeconds:8,hungrySeconds:120,threatMeters:24,searchCellsPerReview:2048,pendingReviewSeconds:.2}as const;
export type BoatExploration={originX:number;originZ:number;nextReviewAt:number;returning:boolean;reason?:'surveyed'|'blocked'|'hungry'|'danger'|'recall';landOnReturn?:true};
type Point={x:number;z:number};
const diagnostics=new WeakMap<Game,{reviews:number;checkedCells:number;maximumCellsPerReview:number;pendingReviews:number}>();
export function boatExplorationDiagnostics(g:Game){return{...(diagnostics.get(g)||{reviews:0,checkedCells:0,maximumCellsPerReview:0,pendingReviews:0}),rules:BOAT_EXPLORE_RULES};}
const searches=new WeakMap<Riverboat,{navigation:object;x:number;z:number;iterator:Generator<void,Point|null>}>();
function target(g:Game,b:Riverboat):Point|null|undefined{
 let d=diagnostics.get(g);if(!d){d={reviews:0,checkedCells:0,maximumCellsPerReview:0,pendingReviews:0};diagnostics.set(g,d);}d.reviews++;
 if(g.vision.every(v=>v!==0))return null;
 const request=requestWaterNavigation(g,true);if(request.status!=='ready'){d.pendingReviews++;return undefined;}
 const nav=request.navigation,cell=g.world.size/nav.width,half=g.world.size/2,cx=Math.floor((b.x+half)/cell),cz=Math.floor((b.z+half)/cell),label=nav.labels[cz*nav.width+cx];if(!label)return null;
 let search=searches.get(b);
 if(!search||search.navigation!==nav||Math.hypot(search.x-b.x,search.z-b.z)>cell){
  const iterator=(function*():Generator<void,Point|null>{
   for(let radius=1;radius<nav.width;radius++)for(let side=0;side<4;side++)for(let offset=-radius;offset<radius;offset++){
    const dx=side===0?offset:side===1?radius:side===2?-offset:-radius,dz=side===0?-radius:side===1?offset:side===2?radius:-offset;
    yield;
    const ix=cx+dx,iz=cz+dz;if(ix<1||iz<1||ix>=nav.width-1||iz>=nav.width-1||nav.labels[iz*nav.width+ix]!==label)continue;
    const x=-half+(ix+.5)*cell,z=-half+(iz+.5)*cell;if(g.exploredAt(x,z)||Math.hypot(x-b.x,z-b.z)<BOAT_EXPLORE_RULES.minimumTargetMeters)continue;
    if(g.height(x,z)<g.waterAt(x,z)+.1)return{x,z};
   }
   return null;
  })();search={navigation:nav,x:b.x,z:b.z,iterator};searches.set(b,search);
 }
 for(let i=0;i<BOAT_EXPLORE_RULES.searchCellsPerReview;i++){d.checkedCells++;d.maximumCellsPerReview=Math.max(d.maximumCellsPerReview,i+1);const next=search.iterator.next();if(next.done){searches.delete(b);return next.value;}}
 d.pendingReviews++;return undefined;
}
export function beginBoatExploration(g:Game,id:number){
 const b=g.state.boats?.find(b=>b.id===id&&b.team===0&&b.hp>0),captain=b&&g.state.units.find(u=>u.id===b.captain&&u.hp>0&&u.boat?.phase==='aboard');
 if(b&&boatServiceProject(g,b.id))return 'Finish or abandon this hull’s paid dock service before exploring';
 if(!b||!captain)return 'Board residents and let someone take the helm first';
 const crew=g.state.units.filter(u=>u.hp>0&&u.boat?.id===id);
 if(crew.some(u=>hasTaskCommitment(u,'boat')||u.visit||u.trade||u.expedition||u.prisoner))return 'Finish or recall this crew’s existing shipment or duty before exploring';
 searches.delete(b);const destination=target(g,b);if(destination===null)return 'No unknown water connected to this boat remains';
 g.interruptMission(captain);b.exploration={originX:b.x,originZ:b.z,nextReviewAt:g.state.time+BOAT_EXPLORE_RULES.reviewSeconds,returning:false};captain.order=destination?'move':'hold';if(destination){captain.tx=destination.x;captain.tz=destination.z;}captain.target=null;captain.node=null;g.invalidateRoute(captain);captain.workReason='Exploring connected water';return null;
}
/** Called only for the actual helm. Fog is revealed by existing live vision;
 * no remote rewards, cargo transfers, enemy knowledge or new hulls occur. */
export function boatExplorationAI(g:Game,b:Riverboat,u:Unit){
 const e=b.exploration;if(!e)return false;
 if(g.state.time<e.nextReviewAt)return true;e.nextReviewAt=g.state.time+BOAT_EXPLORE_RULES.reviewSeconds;
 const crew=g.state.units.filter(p=>p.hp>0&&p.boat?.id===b.id),wasReturning=e.returning;
 if(!e.returning){
  if(crew.some(p=>(p.hunger||0)>BOAT_EXPLORE_RULES.hungrySeconds)){e.returning=true;e.reason='hungry';}
  else if(g.state.units.some(p=>p.hp>0&&g.isFoe(b.team,p.team)&&g.visibleAt(p.x,p.z)&&Math.hypot(p.x-b.x,p.z-b.z)<BOAT_EXPLORE_RULES.threatMeters)){e.returning=true;e.reason='danger';}
  else if(u.stuckT>BOAT_EXPLORE_RULES.blockedSeconds){e.returning=true;e.reason='blocked';}
 }
 if(e.returning&&!wasReturning)g.invalidateRoute(u);
 if(e.returning){
  if(Math.hypot(b.x-e.originX,b.z-e.originZ)<=BOAT_EXPLORE_RULES.arrivalMeters){delete b.exploration;u.order='hold';u.workReason='Survey boat back at departure mooring · ready to land';g.invalidateRoute(u);if(e.landOnReturn&&!landRiverboat(g,b.id))u.workReason='Back at the dock · choose a reachable landing shore';return false;}
  u.order='move';u.tx=e.originX;u.tz=e.originZ;u.workReason=`Returning to departure mooring · ${e.reason||'survey finished'}`;if(u.stuckT>BOAT_EXPLORE_RULES.blockedSeconds){delete b.exploration;u.order='hold';u.workReason='Return water route blocked · boat and crew awaiting orders';g.invalidateRoute(u);}return true;
 }
 if(u.order==='hold'||Math.hypot(u.x-u.tx,u.z-u.tz)<=BOAT_EXPLORE_RULES.arrivalMeters){const next=target(g,b);if(next===undefined){u.order='hold';u.workReason='Preparing the next water scouting route';e.nextReviewAt=g.state.time+BOAT_EXPLORE_RULES.pendingReviewSeconds;return true;}if(next){u.order='move';u.tx=next.x;u.tz=next.z;g.invalidateRoute(u);}else{e.returning=true;e.reason='surveyed';}}
 u.workReason=e.returning?'Connected water surveyed · returning to departure mooring':'Exploring connected water';return true;
}
