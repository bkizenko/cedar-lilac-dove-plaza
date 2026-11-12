import type {Game} from './sim';
import type {Unit} from './types';
import {doctrineOf} from './combatDoctrine';
import {mulberry32} from './rng';
/** Guards, patrols and escorts are not gatherers (CAT-106). A person on duty never occupies a gathering slot,
 * and a gatherer never has to give a slot up to a person standing watch beside the same tree, field or shore. */
export type GuardDutyKind='post'|'patrol'|'escort';
export type GuardDuty={id:number;team:number;unitId:number;kind:GuardDutyKind;x:number;z:number;radius:number;leg:number;escortOf?:number;since:number};
type DutyState={guardDuties?:GuardDuty[]};
const st=(g:Game)=>g.state as Game['state']&DutyState;
export const GUARD_DUTY_RULES={version:1,maximumDuties:96,postRadius:10,patrolRadius:14,leashFactor:2,arriveMeters:2.5,patrolWaypoints:4} as const;
const duties=(g:Game)=>st(g).guardDuties??=[];
const byUnit=new WeakMap<GuardDuty[],{n:number;map:Map<number,GuardDuty>}>();
export function dutyOf(g:Game,u:Unit):GuardDuty|undefined{
 const list=st(g).guardDuties;if(!list?.length)return undefined;
 let ix=byUnit.get(list);if(!ix||ix.n!==list.length){ix={n:list.length,map:new Map(list.map(d=>[d.unitId,d]))};byUnit.set(list,ix);}
 return ix.map.get(u.id);
}
/** Existing trade/captive escorts count as duty even though they predate the duty table. */
export function onGuardDuty(g:Game,u:Unit){return u.escortId!==undefined||!!dutyOf(g,u);}
/** The only definition of "occupies a gatherer slot": actively gathering at that node and not on duty. */
export const occupiesGathererSlot=(g:Game,u:Unit,node:unknown)=>u.hp>0&&u.order==='gather'&&u.node===node&&!onGuardDuty(g,u);
export function gathererOccupants(g:Game,node:unknown,except?:readonly Unit[]){
 let n=0;for(const u of g.state.units)if(u.node===node&&occupiesGathererSlot(g,u,node)&&!except?.includes(u))n++;return n;
}
export function guardDutyIssue(g:Game,u:Unit|undefined,kind:GuardDutyKind){
 if(!doctrineOf(g)?.guardDuty)return 'Guard duty rules are not enabled for this save';
 if(!u||u.hp<=0||u.prisoner)return 'No available person';
 if(!u.militia||u.type==='worker')return 'Only armed adults stand watch; gatherers keep their work';
 if(u.carry>0||u.expedition||u.envoy||u.scout||u.visit)return 'This person is busy with another journey';
 if(kind==='escort'&&u.escortId===undefined)return 'Escorts are assigned to a travelling party';
 if(duties(g).length>=GUARD_DUTY_RULES.maximumDuties)return 'Too many standing duties';
 return null;
}
export function assignGuardDuty(g:Game,unitId:number,kind:GuardDutyKind,x:number,z:number,escortOf?:number){
 const u=g.state.units.find(p=>p.id===unitId),issue=guardDutyIssue(g,u,kind);
 if(issue||!u||!Number.isFinite(x)||!Number.isFinite(z))return {accepted:false,reason:issue||'Invalid post'};
 releaseGuardDuty(g,unitId);
 // A guard walks off any gathering claim; the slot returns to the gatherers immediately.
 u.job=null;u.jobLock=false;u.node=null;u.huntOnly=false;g.workBoard.reset();
 const radius=kind==='patrol'?GUARD_DUTY_RULES.patrolRadius:GUARD_DUTY_RULES.postRadius;
 duties(g).push({id:g.id(),team:u.team,unitId,kind,x,z,radius,leg:0,...(escortOf!==undefined?{escortOf}:{}),since:g.state.time});
 byUnit.delete(duties(g));
 u.workReason=kind==='patrol'?'On patrol':'Standing watch';return {accepted:true,reason:''};
}
export function releaseGuardDuty(g:Game,unitId:number){
 const s=st(g);if(!s.guardDuties?.length)return false;const n=s.guardDuties.length;
 s.guardDuties=s.guardDuties.filter(d=>d.unitId!==unitId);return s.guardDuties.length<n;
}
/** Seeded, deterministic loop around the patrol anchor. */
export function patrolWaypoint(d:Pick<GuardDuty,'id'|'x'|'z'|'radius'>,leg:number){
 const rand=mulberry32(d.id*2654435761>>>0),a0=rand()*Math.PI*2,n=GUARD_DUTY_RULES.patrolWaypoints,r=d.radius*.7;
 const a=a0+(leg%n)*Math.PI*2/n;return {x:d.x+Math.cos(a)*r,z:d.z+Math.sin(a)*r};
}
/** Return false so the normal combat order machinery still drives movement and fighting. */
export function guardDutyAI(g:Game,u:Unit,dt:number){
 const d=dutyOf(g,u);if(!d||!doctrineOf(g)?.guardDuty)return false;
 if(u.emergency||u.prisoner)return false;
 const R=GUARD_DUTY_RULES;
 // Engaged inside the leash: let combat finish; beyond it, break off and return.
 if(u.order==='attack'&&u.target&&u.target.hp>0&&Math.hypot(u.x-d.x,u.z-d.z)<=d.radius*R.leashFactor)return false;
 u.node=null;u.job=null;
 // Anything hostile inside the post's reach is met, never chased past the leash (checked above).
 if(u.order!=='attack'){const foe=g.acquireTarget(u,Math.min(d.radius,GUARD_DUTY_RULES.postRadius));if(foe&&foe.kind==='unit'){u.target=foe;u.order='attack';u.attackDestination=null;u.workReason='Meeting an intruder';return false;}}
 let tx=d.x,tz=d.z;
 if(d.kind==='patrol'){
  const w=patrolWaypoint(d,d.leg);tx=w.x;tz=w.z;
  if(Math.hypot(u.x-tx,u.z-tz)<=R.arriveMeters)d.leg=(d.leg+1)%R.patrolWaypoints;
  const spot=g.nearestWalk(u,tx,tz);if(spot){tx=spot.x;tz=spot.z;}
  u.stationOnArrival=false;u.order='move';u.workReason='On patrol';
 }else if(Math.hypot(u.x-tx,u.z-tz)>R.arriveMeters){u.stationOnArrival=true;u.order='move';u.workReason='Returning to the post';}
 else{u.order='hold';u.workReason='Standing watch';}
 u.tx=tx;u.tz=tz;u.attackDestination=null;
 return false;
}
export function tickGuardDuties(g:Game){
 const s=st(g);if(!s.guardDuties?.length)return;
 const live=new Map(g.state.units.map(u=>[u.id,u]));
 const keep=s.guardDuties.filter(d=>{const u=live.get(d.unitId);return !!u&&u.hp>0&&u.team===d.team&&!u.prisoner&&u.militia&&(d.kind!=='escort'||u.escortId!==undefined);});
 if(keep.length!==s.guardDuties.length)s.guardDuties=keep;
}
export function validGuardDuties(s:any){
 const v=s.guardDuties;if(v===undefined)return true;
 if(!Array.isArray(v)||v.length>GUARD_DUTY_RULES.maximumDuties||!s.combatDoctrine)return false;
 const ids=new Set<number>(),units=new Set<number>();
 for(const d of v){
  if(!d||!Number.isInteger(d.id)||d.id<0||d.id>=s.nextId||ids.has(d.id)||!Number.isInteger(d.unitId)||d.unitId<0||d.unitId>=s.nextId||units.has(d.unitId)||!['post','patrol','escort'].includes(d.kind))return false;
  ids.add(d.id);units.add(d.unitId);
  if(!Number.isInteger(d.team)||d.team<0||d.team>=s.tribes.length||![d.x,d.z,d.since].every(Number.isFinite)||!Number.isFinite(d.radius)||d.radius<=0||d.radius>64||!Number.isInteger(d.leg)||d.leg<0||d.leg>=GUARD_DUTY_RULES.patrolWaypoints)return false;
  if(d.escortOf!==undefined&&(!Number.isInteger(d.escortOf)||d.escortOf<0||d.escortOf>=s.nextId))return false;
 }
 return true;
}
