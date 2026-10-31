import {ReservationLedger,type ReservationRequest} from './reservationLedger';
export type JobPhase='proposed'|'reserved'|'traveling'|'working'|'returning'|'suspended'|'completed'|'canceled';
export type CoordinatedJob={id:string;kind:string;owner:number;actors:number[];target:number|null;phase:JobPhase;progress:number;blockedReason:string|null};
const terminal=(phase:JobPhase)=>phase==='completed'||phase==='canceled';
/** Authoritative ownership for migrated jobs. Legacy executors join through adapters. */
export class JobCoordinator {
 readonly reservations=new ReservationLedger();
 readonly metrics={proposed:0,accepted:0,ownershipConflicts:0,suspended:0,resumed:0,completed:0,canceled:0};
 private jobs=new Map<string,CoordinatedJob>();
 private actors=new Map<number,string>();
 job(id:string){const job=this.jobs.get(id);return job?{...job,actors:[...job.actors]}:undefined;}
 activeJob(actor:number){const id=this.actors.get(actor);return id?this.job(id):undefined;}
 propose(input:Omit<CoordinatedJob,'phase'|'progress'|'blockedReason'>){
  if(this.jobs.has(input.id))return false;
  this.jobs.set(input.id,{...input,actors:[...new Set(input.actors)],phase:'proposed',progress:0,blockedReason:null});this.metrics.proposed++;return true;
 }
 reserve(id:string,requests:ReservationRequest[]=[]){
  const job=this.jobs.get(id);if(!job||terminal(job.phase))return false;
  for(const actor of job.actors)if(this.actors.has(actor)&&this.actors.get(actor)!==id){job.blockedReason=`Resident ${actor} already owns active work`;this.metrics.ownershipConflicts++;return false;}
  const result=this.reservations.reserve(id,requests);
  if(!result.accepted){job.blockedReason=result.reason;return false;}
  for(const actor of job.actors)this.actors.set(actor,id);
  job.phase='reserved';job.blockedReason=null;this.metrics.accepted++;return true;
 }
 transition(id:string,phase:'traveling'|'working'|'returning',progress?:number){
  const job=this.jobs.get(id);if(!job||!['reserved','traveling','working','returning'].includes(job.phase))return false;
  if(progress!==undefined&&(!Number.isFinite(progress)||progress<job.progress))return false;
  job.phase=phase;if(progress!==undefined)job.progress=progress;return true;
 }
 private release(job:CoordinatedJob){for(const actor of job.actors)if(this.actors.get(actor)===job.id)this.actors.delete(actor);this.reservations.release(job.id);}
 suspend(id:string,reason:string){const job=this.jobs.get(id);if(!job||terminal(job.phase)||job.phase==='suspended')return false;this.release(job);job.phase='suspended';job.blockedReason=reason;this.metrics.suspended++;return true;}
 resume(id:string,actors:number[],requests:ReservationRequest[]=[]){
  const job=this.jobs.get(id);if(!job||job.phase!=='suspended')return false;
  const previous=job.actors;job.actors=[...new Set(actors)];
  if(!this.reserve(id,requests)){job.actors=previous;return false;}
  this.metrics.resumed++;return true;
 }
 finish(id:string,canceled=false){const job=this.jobs.get(id);if(!job||terminal(job.phase))return false;this.release(job);job.phase=canceled?'canceled':'completed';this.metrics[canceled?'canceled':'completed']++;return true;}
 /** Drop terminal adapter records once counted; runtime memory stays bounded. */
 forget(id:string){const job=this.jobs.get(id);if(job&&terminal(job.phase))this.jobs.delete(id);}
}
