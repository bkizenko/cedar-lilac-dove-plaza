import type {Game} from './sim';
import type {Building,GameState,Livestock,Unit} from './types';
import {herdRules} from './animalSpecies';
import {insidePen,penInterior,PEN_RULES} from './penGeometry';
import {surveyPenPasture} from './penPasture';
import {penPlacesOccupied,penPlacesReserved} from './husbandry';
import {hasTaskCommitment} from './workCommitments';
import {workRuntime} from './workRuntime';
import {packAnimalPosition,PACK_ANIMAL_RULES} from './packAnimalState';

const jobId=(u:Unit)=>`pack:pasture:${u.id}`;
const loaded=(u:Unit)=>u.carry>0||Object.values(u.itemCargo||{}).some(n=>(n||0)>0);
const penFor=(g:Game,u:Unit)=>g.state.buildings.find(b=>b.id===u.packPastureOrder?.pen&&b.type==='pen'&&b.team===u.team&&b.hp>0);
/** Queuing a return never interrupts a real journey, paid project or its cargo. */
function occupied(u:Unit){return hasTaskCommitment(u,'packPastureOrder')||u.buildOrder!==undefined||!!u.expedition||!!u.scout||!!u.visit||!!u.envoy||!!u.foundingJourney||!!u.tributeJourney||!!u.trade||!!u.recalled||u.drill!=null||u.escortId!==undefined||!!u.emergency||!!u.resting||!!u.shelterId||!!u.militia;}
function own(g:Game,u:Unit){
 const jobs=workRuntime(g),id=jobId(u),existing=jobs.activeJob(u.id);
 if(existing&&existing.id!==id)return false;
 const prior=jobs.job(id);if(prior&&['completed','canceled'].includes(prior.phase))jobs.forget(id);
 if(!jobs.job(id))jobs.propose({id,kind:'pack:pasture',owner:u.team,actors:[u.id],target:u.packPastureOrder!.pen});
 const job=jobs.job(id);return existing?.id===id|| (job?.phase==='suspended'?jobs.resume(id,[u.id]):jobs.reserve(id));
}
export function cancelPackPasture(g:Game,u:Unit){
 const order=u.packPastureOrder;if(!order)return;
 const jobs=workRuntime(g),id=jobId(u);if(jobs.job(id)){jobs.finish(id,true);jobs.forget(id);}
 delete u.packPastureOrder;
 if(order.phase==='returning'&&u.order==='hold')u.order='idle';
 g.workBoard.reset();
}
export function requestPackPasture(g:Game,penId:number,unitId?:number){
 const pen=g.state.buildings.find(b=>b.id===penId&&b.team===0&&b.type==='pen'&&b.hp>0&&g.finished(b));
 if(!pen)return {accepted:false,reason:'Choose a completed pasture pen owned by your village'};
 const people=g.state.units.filter(u=>u.hp>0&&u.team===pen.team&&u.type==='worker'&&!u.prisoner&&u.haulage==='pack'&&u.packAnimal&&u.packAnimal.hp>0&&(unitId===undefined||u.id===unitId))
  .sort((a,b)=>Number(b.selected)-Number(a.selected)||Math.hypot(a.x-pen.x,a.z-pen.z)-Math.hypot(b.x-pen.x,b.z-pen.z));
 const u=people[0];if(!u)return {accepted:false,reason:'Choose a living worker with their actual working animal'};
 if(u.draftCart)return {accepted:false,reason:'Unhitch the actual cart before returning this animal to pasture'};
 if(u.packPastureOrder?.pen===penId&&u.packPastureOrder.animal===u.packAnimal!.id)return {accepted:true,reason:'This animal already has a pasture return queued'};
 if((g.state.livestock?.length||0)>=PEN_RULES.maximumAnimalsTotal)return {accepted:false,reason:'The existing herds have no room for another pasture animal'};
 if(penPlacesOccupied(g,pen.id)+penPlacesReserved(g,pen.id,u.id)+herdRules(u.packAnimal!.species).places>surveyPenPasture(g,pen).eligibleCapacity)return {accepted:false,reason:'This pen needs enough unreserved dry pasture places for the working animal'};
 if(u.packPastureOrder)cancelPackPasture(g,u);
 u.packPastureOrder={version:1,pen:penId,animal:u.packAnimal!.id,requestedAt:g.state.time,phase:'queued'};
 g.workBoard.reset();return {accepted:true,reason:'Pasture return queued; existing work and carried goods will finish first'};
}
function dry(g:Game,p:{x:number;z:number}){const y=g.height(p.x,p.z),water=g.waterAt(p.x,p.z);return Number.isFinite(y)&&Number.isFinite(water)&&y>water+.3&&g.walkable(p.x,p.z);}
/** A candidate must fit both bodies at their real trailing separation. Steering
 * moves only the handler; the animal remains the existing rendered pack body. */
function destination(g:Game,u:Unit,pen:Building){
 const {halfWidth,halfDepth}=penInterior(pen),points=[{x:pen.x,z:pen.z}];
 for(let z=-2;z<=2;z++)for(let x=-2;x<=2;x++)points.push({x:pen.x+x*Math.max(0,halfWidth-.35)/2,z:pen.z+z*Math.max(0,halfDepth-.35)/2});
 return points.filter(p=>{
  const distance=Math.hypot(p.x-u.x,p.z-u.z);if(distance<.55)return false;
  const body={x:p.x-(p.x-u.x)/distance*PACK_ANIMAL_RULES.followMeters,z:p.z-(p.z-u.z)/distance*PACK_ANIMAL_RULES.followMeters};
  return insidePen(pen,p.x,p.z,.25)&&insidePen(pen,body.x,body.z,.25)&&dry(g,p)&&dry(g,body);
 }).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
}
/** dt=0 is a dependency-only sweep, including dead or captured handlers that
 * urgent needs otherwise prevent from reaching ordinary worker dispatch. */
export function packPastureAI(g:Game,u:Unit,dt:number){
 const w=u.packPastureOrder;if(!w)return false;
 const a=u.packAnimal,pen=penFor(g,u);
 if(u.hp<=0||u.team!==0||u.type!=='worker'||u.prisoner||!a||a.id!==w.animal||a.hp<=0||u.haulage!=='pack'||!pen){cancelPackPasture(g,u);return false;}
 if(!(dt>0)||!Number.isFinite(dt))return false;
 const wait=(reason:string)=>{w.reason=reason;if(w.phase!=='queued')u.workReason=reason;return w.phase!=='queued';};
 if(occupied(u))return wait('Pasture return waits for existing work, journey or urgent needs');
 // Ordinary logging is preemptible: activation releases its tree reservation
 // through interruptMission. Paid jobs and independent journeys retain ownership.
 const jobs=workRuntime(g),existing=jobs.activeJob(u.id);if(existing&&existing.id!==jobId(u)&&existing.kind!=='gather:wood')return wait('Pasture return waits for the current reserved job');
 if(w.phase==='queued'){
  // Explicit interruption normally cancels this request. Our own activation
  // restores exactly the same intent after releasing ordinary gathering work.
  g.interruptMission(u);u.packPastureOrder=w;w.phase=loaded(u)?'unloading':'returning';u.node=null;u.target=null;
 }
 if(!own(g,u))return wait('Pasture return waits for this handler’s reserved work');
 if(loaded(u)){w.phase='unloading';w.reason='Delivering existing cargo before returning the working animal';u.workReason=w.reason;u.order='return';jobs.transition(jobId(u),'returning');return false;}
 w.phase='returning';u.order='hold';jobs.transition(jobId(u),'traveling');
 if(!g.finished(pen))return wait('Finish the pasture pen before bringing the animal home');
 if((g.state.livestock?.length||0)>=PEN_RULES.maximumAnimalsTotal)return wait('Pasture return waits for room in the existing herds');
 if(penPlacesOccupied(g,pen.id)+penPlacesReserved(g,pen.id,u.id)+herdRules(a.species).places>surveyPenPasture(g,pen).eligibleCapacity)return wait('Pasture return waits for enough unreserved dry pasture places');
 const body=packAnimalPosition(u);
 if(insidePen(pen,u.x,u.z,.25)&&insidePen(pen,body.x,body.z,.25)&&dry(g,{x:u.x,z:u.z})&&dry(g,body)){
  if(g.state.wildlife.some(c=>c.id===a.id)||g.state.livestock?.some(c=>c.id===a.id))return wait('The animal identity is already held elsewhere; pasture return waits');
  const species=a.species??'goat',rules=herdRules(species);
  const animal:Livestock={...a,id:a.id,species,x:body.x,y:g.height(body.x,body.z),z:body.z,facing:u.facing,vx:0,vz:0,wanderT:0,fly:0,
   team:u.team,pen:pen.id,sex:a.sex??(a.id%2?'female':'male'),born:a.born??Math.max(-rules.maturity,g.state.time-rules.maturity),tamedAt:a.tamedAt??g.state.time,
   hunger:a.hunger??0,milk:a.milk??0,pregnancy:a.pregnancy??0,packHarness:a.packHarness??{version:1},grazing:{x:body.x,z:body.z}};
  (g.state.livestock??=[]).push(animal);delete u.packAnimal;delete u.haulage;
  jobs.finish(jobId(u));jobs.forget(jobId(u));delete u.packPastureOrder;u.order='idle';u.node=null;u.target=null;u.workReason='The same working animal is home in pasture with its existing harness';g.workBoard.reset();return true;
 }
 const target=destination(g,u,pen);
 if(!target||!g.workBoard.connected(g,u.x,u.z,target.x,target.z))return wait('Pasture return needs a clear dry route for the handler and animal');
 w.reason='Leading the working animal into pasture';u.workReason=w.reason;u.tx=target.x;u.tz=target.z;g.steer(u,dt);
 if(u.stuckT>8){w.reason='Pasture return is blocked; clear the route for the handler and animal';u.workReason=w.reason;}return true;
}
/** Removed dependencies remain saveable until the next cleanup sweep. A known
 * different animal or an unallocated ID is never an acceptable return intent. */
export function validPackPastureOrders(s:GameState){
 if(!s||!Array.isArray(s.units)||!Array.isArray(s.buildings)||!Array.isArray(s.wildlife)||s.livestock!==undefined&&!Array.isArray(s.livestock)||!Number.isSafeInteger(s.nextId)||!Number.isFinite(s.time))return false;
 const allocated=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0&&Number(n)<s.nextId;
 return s.units.every(u=>{
  if(!u||typeof u!=='object')return false;const w=u.packPastureOrder;if(w===undefined)return true;
  if(!w||typeof w!=='object'||Array.isArray(w)||w.version!==1||!allocated(w.pen)||!allocated(w.animal)||w.pen===w.animal||!Number.isFinite(w.requestedAt)||w.requestedAt<0||w.requestedAt>s.time||!['queued','unloading','returning'].includes(w.phase)||w.reason!==undefined&&(typeof w.reason!=='string'||w.reason.length>240))return false;
  const pen=s.buildings.find(b=>b&&b.id===w.pen);if(pen&&pen.type!=='pen')return false;
  if(u.packAnimal&&u.packAnimal.id!==w.animal||s.buildings.some(b=>b&&b.id===w.animal)||s.units.some(p=>p?.id===w.animal)||s.units.some(p=>p&&p!==u&&p.packAnimal?.id===w.animal))return false;
  return true;
 });
}
