import type {Game} from './sim';
import type {Unit} from './types';
import {doctrineOf} from './combatDoctrine';
import {mulberry32} from './rng';
/** Guards, patrols and escorts are not gatherers (CAT-106). A person on duty never occupies a gathering slot,
 * and a gatherer never has to give a slot up to a person standing watch beside the same tree, field or shore. */
export type GuardDutyKind='post'|'patrol'|'escort'|'tower';
export type GuardDuty={id:number;team:number;unitId:number;kind:GuardDutyKind;x:number;z:number;radius:number;leg:number;escortOf?:number;/** watchtower this person mans (kind 'tower') */buildingId?:number;since:number};
type DutyState={guardDuties?:GuardDuty[]};
const st=(g:Game)=>g.state as Game['state']&DutyState;
export const GUARD_DUTY_RULES={version:1,maximumDuties:96,postRadius:10,patrolRadius:14,leashFactor:2,arriveMeters:2.5,patrolWaypoints:4,towerCrew:3,towerRateGain:.3,towerRangeGainMeters:2,towerManMeters:6} as const;
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
const towerOf=(g:Game,id:number)=>g.state.buildings.find(b=>b.id===id);
/** Armed people standing at this tower's post, capped by crew size. Unmanned towers keep their base statistics. */
export function towerCrew(g:Game,b:{id:number;x:number;z:number}){
 const list=st(g).guardDuties;if(!list?.length)return 0;let n=0;
 for(const d of list){if(d.kind!=='tower'||d.buildingId!==b.id)continue;const u=g.state.units.find(p=>p.id===d.unitId);if(u&&u.hp>0&&Math.hypot(u.x-b.x,u.z-b.z)<=GUARD_DUTY_RULES.towerManMeters)n++;}
 return Math.min(n,GUARD_DUTY_RULES.towerCrew);
}
export const towerRateMultiplier=(crew:number)=>1+GUARD_DUTY_RULES.towerRateGain*crew;
export const towerRangeBonus=(crew:number)=>GUARD_DUTY_RULES.towerRangeGainMeters*crew;
export function towerGuardIssue(g:Game,u:Unit|undefined,buildingId:number){
 const b=towerOf(g,buildingId);if(!b||b.type!=='watchtower'||!g.finished(b)||b.hp<=0)return 'That tower is not ready to be manned';
 if(u&&b.team!==u.team)return 'That is not your tower';
 const crew=duties(g).filter(d=>d.kind==='tower'&&d.buildingId===buildingId&&d.unitId!==u?.id).length;
 return crew>=GUARD_DUTY_RULES.towerCrew?'This tower already has a full crew':null;
}
/** Man a watchtower: the guard walks to its foot and stays; crew raise its rate of fire and reach. */
export function assignTowerGuard(g:Game,unitId:number,buildingId:number){
 const u=g.state.units.find(p=>p.id===unitId),issue=guardDutyIssue(g,u,'tower')||towerGuardIssue(g,u,buildingId);if(issue||!u)return {accepted:false,reason:issue||'No available person'};
 const b=towerOf(g,buildingId)!,spot=g.nearestWalk(u,b.x,b.z+b.d*.5+1)||{x:b.x,z:b.z+b.d*.5+1};
 const r=assignGuardDuty(g,unitId,'post',spot.x,spot.z);if(!r.accepted)return r;
 const d=duties(g).find(p=>p.unitId===unitId)!;d.kind='tower';d.buildingId=buildingId;u.workReason='Manning a watchtower';return {accepted:true,reason:''};
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
export function guardDutyAI(g:Game,u:Unit,dt:number):boolean{
 const d=dutyOf(g,u);if(!d||!doctrineOf(g)?.guardDuty)return false;
 if(u.emergency||u.prisoner)return false;
 const R=GUARD_DUTY_RULES;
 // Engaged inside the leash: let combat finish; beyond it, break off and return.
 if(u.order==='attack'&&u.target&&u.target.hp>0&&Math.hypot(u.x-d.x,u.z-d.z)<=d.radius*R.leashFactor)return false;
 u.node=null;u.job=null;
 // Anything hostile inside the post's reach is met, never chased past the leash (checked above).
 if(u.order!=='attack'){
  const reach=Math.min(d.radius,GUARD_DUTY_RULES.postRadius);let foe:Unit|undefined,best=reach*reach;
  for(const o of g.state.units){
   if(o.hp<=0||o.team===u.team||o.prisoner||o.shelterId||o.boat?.phase==='aboard'||!g.isFoe(u.team,o.team)||u.team===0&&!g.visibleAt(o.x,o.z))continue;
   const q=(o.x-u.x)**2+(o.z-u.z)**2;if(q<best){best=q;foe=o;}
  }
  if(foe){u.target=foe;u.order='attack';u.attackDestination=null;u.workReason='Meeting an intruder';return false;}
 }
 let tx=d.x,tz=d.z;
 if(d.kind==='patrol'){
  const w=patrolWaypoint(d,d.leg);tx=w.x;tz=w.z;
  if(Math.hypot(u.x-tx,u.z-tz)<=R.arriveMeters)d.leg=(d.leg+1)%R.patrolWaypoints;
  const spot=g.nearestWalk(u,tx,tz);if(spot){tx=spot.x;tz=spot.z;}
  u.stationOnArrival=false;u.order='move';u.workReason='On patrol';
 }else if(Math.hypot(u.x-tx,u.z-tz)>R.arriveMeters){u.stationOnArrival=true;u.order='move';u.workReason=d.kind==='tower'?'Climbing to the watchtower':'Returning to the post';}
 else{u.order='hold';u.workReason=d.kind==='tower'?'Manning a watchtower':'Standing watch';}
 u.tx=tx;u.tz=tz;u.attackDestination=null;
 return false;
}
export function tickGuardDuties(g:Game){
 const s=st(g);if(!s.guardDuties?.length)return;
 const live=new Map(g.state.units.map(u=>[u.id,u]));
 const keep=s.guardDuties.filter(d=>{const u=live.get(d.unitId);if(d.kind==='tower'){const b=g.state.buildings.find(p=>p.id===d.buildingId);if(!b||b.hp<=0)return false;}return !!u&&u.hp>0&&u.team===d.team&&!u.prisoner&&u.militia&&(d.kind!=='escort'||u.escortId!==undefined);});
 if(keep.length!==s.guardDuties.length)s.guardDuties=keep;
}
export function validGuardDuties(s:any){
 const v=s.guardDuties;if(v===undefined)return true;
 if(!Array.isArray(v)||v.length>GUARD_DUTY_RULES.maximumDuties||!s.combatDoctrine)return false;
 const ids=new Set<number>(),units=new Set<number>();
 for(const d of v){
  if(!d||!Number.isInteger(d.id)||d.id<0||d.id>=s.nextId||ids.has(d.id)||!Number.isInteger(d.unitId)||d.unitId<0||d.unitId>=s.nextId||units.has(d.unitId)||!['post','patrol','escort','tower'].includes(d.kind))return false;
  ids.add(d.id);units.add(d.unitId);
  if(!Number.isInteger(d.team)||d.team<0||d.team>=s.tribes.length||![d.x,d.z,d.since].every(Number.isFinite)||!Number.isFinite(d.radius)||d.radius<=0||d.radius>64||!Number.isInteger(d.leg)||d.leg<0||d.leg>=GUARD_DUTY_RULES.patrolWaypoints)return false;
  if(d.kind==='tower'&&(!Number.isInteger(d.buildingId)||d.buildingId<0||d.buildingId>=s.nextId))return false;
  if(d.escortOf!==undefined&&(!Number.isInteger(d.escortOf)||d.escortOf<0||d.escortOf>=s.nextId))return false;
 }
 return true;
}
