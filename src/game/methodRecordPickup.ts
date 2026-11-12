import type {Game} from './sim';
import type {GameState,Unit} from './types';
import type {JobCoordinator} from './jobCoordinator';
import {workRuntime} from './workRuntime';
import {hasTaskCommitment} from './workCommitments';
import {isDependent} from './settlement';
import {methodRecords,pickupMethodRecord,type MethodRecord} from './methodRecords';
import {clearCargoApproach,sameCargoCache} from './farmToolCargo';
import {supplyDrops,supplyApproach,supplyReached,type SupplyDrop} from './campAnchor';
const key=(u:Unit)=>`method-record-pickup:${u.id}`;
const assetKey=(id:number)=>`method-record:${id}:pickup`;
const record=(g:Game,id:number)=>methodRecords(g).find(r=>r.id===id);
function approach(g:Game,u:Unit,r:MethodRecord){
 if(r.holder.kind==='carrier')return null;
 if(r.holder.kind==='cache'){const drop=supplyDrops(g,u.team).find(d=>sameCargoCache(r.holder as Extract<MethodRecord['holder'],{kind:'cache'}>,d)),point=drop&&supplyApproach(g,u,drop);return point&&drop?{point,drop}:null;}
 for(const radius of [0,.8,1.4])for(let i=0;i<(radius?12:1);i++){const a=i*Math.PI/6,x=r.holder.x+Math.cos(a)*radius,z=r.holder.z+Math.sin(a)*radius;if(g.walkable(x,z)&&g.workBoard.connected(g,u.x,u.z,x,z))return{point:{x,z},drop:undefined as SupplyDrop|undefined};}return null;
}
function own(g:Game,u:Unit,id:number,provided?:JobCoordinator){const jobs=provided??workRuntime(g),job=key(u),active=jobs.activeJob(u.id);if(active&&active.id!==job)return false;if(active?.id===job)return true;const old=jobs.job(job);if(old&&['completed','canceled'].includes(old.phase))jobs.forget(job);if(!jobs.job(job))jobs.propose({id:job,kind:'method-record-pickup',owner:u.team,actors:[u.id],target:id});return !!jobs.reserve(job,[{key:assetKey(id),amount:1,capacity:1}]);}
/** Ordinary interruption releases the actor/target claim, never the real asset. */
export function cancelMethodRecordPickup(g:Game,u:Unit,reason?:string,completed=false){if(u.methodRecordPickupId===undefined)return false;delete u.methodRecordPickupId;const jobs=workRuntime(g);jobs.finish(key(u),!completed);jobs.forget(key(u));if(u.order==='hold'||u.order==='move')u.order='hold';u.node=null;u.target=null;if(reason)u.workReason=reason;return true;}
export function beginMethodRecordPickup(g:Game,unitId:number,recordId:number){
 const no=(reason:string)=>({accepted:false,reason}),u=g.state.units.find(u=>u.id===unitId&&u.team===0&&u.hp>0),r=record(g,recordId);
 if(!u||u.type!=='worker'||u.militia||u.prisoner||isDependent(g,u))return no('Choose one of your living civilian adults');
 if(!r||r.team!==0||r.holder.kind==='carrier')return no('No owned record is available on the ground or at a cache');
 if(!g.visibleAt(r.holder.x,r.holder.z))return no('The actual record must be visible before ordering pickup');
 if(u.boat||u.expedition||u.visit||u.envoy||u.recalled||u.emergency||u.escortId||u.foundingJourney||u.tributeJourney||['occupy','capture'].includes(u.conflictIntent||''))return no('Finish this resident’s guarded or away duty before picking up a record');
 if(u.carry>0||Object.values(u.itemCargo||{}).some(n=>(n||0)>0)||u.methodRecordCargoId!==undefined)return no('Deliver the current carried goods to a cache before picking up a record');
 const p=g.state.production?.projects.find(p=>p.id===u.productionProjectId),phase=p?.phase==='paused'?p.resumePhase:p?.phase;
 const releasable=!!p&&['working','curing','ready'].includes(phase||'')&&!hasTaskCommitment(u,'productionProjectId');
 if(hasTaskCommitment(u,'methodRecordPickupId')&&!releasable)return no('Finish retained paid work or use its physical unload action before picking up a record');
 if(!approach(g,u,r))return no('No reachable dry approach to this actual record or its cache');
 g.interruptMission(u);
 if(hasTaskCommitment(u))return no('The original paid commitment remains with this resident; finish or unload it first');
 if(!own(g,u,r.id)){const jobs=workRuntime(g);jobs.finish(key(u),true);jobs.forget(key(u));return no('Another resident already reserves this record or this person');}
 u.methodRecordPickupId=r.id;u.jobLock=false;u.job=null;u.order='hold';u.node=null;u.target=null;u.workReason='Walking to collect the same physical method record';g.invalidateRoute(u);g.workBoard.reset();return{accepted:true,reason:'Walking to the actual record; pickup happens only after physical contact'};
}
export function methodRecordPickupAI(g:Game,u:Unit,dt:number){
 const id=u.methodRecordPickupId;if(id===undefined)return false;const r=record(g,id);
 if(u.hp<=0||u.prisoner||u.emergency||u.boat||!r||r.team!==u.team||r.holder.kind==='carrier'){cancelMethodRecordPickup(g,u,'Record pickup stopped — its custody or this resident changed');return false;}
 if(!own(g,u,id)){cancelMethodRecordPickup(g,u,'Record pickup stopped — its person or asset is reserved');return false;}
 const destination=approach(g,u,r);if(!destination){cancelMethodRecordPickup(g,u,'Record pickup blocked — no reachable dry approach');return false;}
 const reached=destination.drop?supplyReached(g,u,destination.drop,destination.point):clearCargoApproach(g,u,r.holder);
 if(reached){cancelMethodRecordPickup(g,u,undefined,true);const accepted=pickupMethodRecord(g,u,id);u.workReason=accepted?'Carrying the same cordage method record':'Record pickup stopped — the physical item or resident is no longer available';return true;}
 u.order='hold';u.tx=destination.point.x;u.tz=destination.point.z;u.workReason=r.holder.kind==='cache'?'Walking to the method record’s actual cache':'Walking to the dropped method record';g.steer(u,dt);return true;
}
export function rebuildMethodRecordPickupOwnership(g:Game,jobs:JobCoordinator){for(const u of g.state.units)if(u.methodRecordPickupId!==undefined){const r=record(g,u.methodRecordPickupId);if(u.hp<=0||u.prisoner||u.emergency||u.boat||!r||r.team!==u.team||r.holder.kind==='carrier'||!own(g,u,u.methodRecordPickupId,jobs)){delete u.methodRecordPickupId;jobs.finish(key(u),true);jobs.forget(key(u));u.workReason='Record pickup stopped — its custody or resident changed';}}}
export function validMethodRecordPickups(s:GameState){const targets=new Set<number>();for(const u of s.units){const id=u.methodRecordPickupId;if(id===undefined)continue;const r=s.methodRecords?.records.find(r=>r.id===id);if(!Number.isSafeInteger(id)||id<1||id>=s.nextId||targets.has(id)||!r||u.team!==0||hasTaskCommitment(u,'methodRecordPickupId'))return false;targets.add(id);}return true;}
