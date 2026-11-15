import type {Game} from './sim';
import type {Unit} from './types';
import {assignGuardDuty,releaseGuardDuty,dutyOf} from './guardDuty';
import {commanderByUnit} from './commanders';
/** Standing squads of 5, 10, 25, 50 or 100 armed adults with a leader, an optional post or patrol, and a watch/drill rotation.
 * Squads only organise people who already carry weapons; they never create weapons or people. */
export type SquadSize=5|10|25|50|100;
export const SQUAD_SIZES:readonly SquadSize[]=[5,10,25,50,100];
export type SquadOrder='none'|'post'|'patrol';
export type Squad={id:number;team:number;name:string;size:SquadSize;memberIds:number[];leaderId?:number;order:SquadOrder;x:number;z:number;
 /** two or more squads on the same order alternate watch and drill */rotate:boolean;shift:'watch'|'rest';shiftUntil:number};
export type SquadsState={version:1;list:Squad[]};
export const SQUAD_RULES={version:1,maximumSquads:40,maximumMembers:200,watchSeconds:150,restSeconds:150,reviewSeconds:1} as const;
type S=Game['state']&{squads?:SquadsState};
const st=(g:Game)=>g.state as S;
const lastReview=new WeakMap<Game,number>();
export const squadsOf=(g:Game,team=0)=>(st(g).squads?.list??[]).filter(s=>s.team===team);
export const squadOfUnit=(g:Game,unitId:number)=>st(g).squads?.list.find(s=>s.memberIds.includes(unitId));
const xp=(u:Unit)=>u.combatXP||0;
const eligible=(g:Game,u:Unit,team:number)=>u.team===team&&u.hp>0&&u.militia&&!u.prisoner&&!u.expedition&&!u.envoy&&!u.scout&&!u.visit&&!u.boat&&u.escortId===undefined&&u.carry===0&&!squadOfUnit(g,u.id);
function leaderOf(g:Game,members:Unit[]){return members.find(u=>commanderByUnit(g,u.id))??[...members].sort((a,b)=>xp(b)-xp(a)||a.id-b.id)[0];}
/** Split every armed adult who is not yet in a squad into squads of `size` (the last squad may be smaller). */
export function formSquads(g:Game,size:SquadSize,team=0){
 if(!SQUAD_SIZES.includes(size))return {accepted:false,reason:'Squads hold 5, 10, 25, 50 or 100',formed:0};
 const s=st(g).squads??={version:1,list:[]};
 const pool=g.state.units.filter(u=>eligible(g,u,team)).sort((a,b)=>xp(b)-xp(a)||a.id-b.id);
 if(!pool.length)return {accepted:false,reason:'No armed adults are free to organise; arm adults first',formed:0};
 let formed=0;const taken=s.list.reduce((n,q)=>n+q.memberIds.length,0);
 if(taken+pool.length>SQUAD_RULES.maximumMembers)pool.splice(Math.max(0,SQUAD_RULES.maximumMembers-taken));
 for(let i=0;i<pool.length&&s.list.length<SQUAD_RULES.maximumSquads;i+=size){
  const members=pool.slice(i,i+size),lead=leaderOf(g,members),n=s.list.filter(q=>q.team===team).length+1;
  s.list.push({id:g.id(),team,name:`Squad ${n} (${size})`,size,memberIds:members.map(u=>u.id),leaderId:lead?.id,order:'none',x:lead?.x??0,z:lead?.z??0,rotate:false,shift:'watch',shiftUntil:0});formed++;
 }
 if(team===0)g.banner(`${formed} ${formed===1?'squad':'squads'} formed from ${pool.length} armed adults`,3);
 return {accepted:formed>0,reason:'',formed};
}
export function disbandSquads(g:Game,team=0){
 const s=st(g).squads;if(!s)return 0;const mine=s.list.filter(q=>q.team===team);
 for(const q of mine)for(const id of q.memberIds)releaseGuardDuty(g,id);
 s.list=s.list.filter(q=>q.team!==team);return mine.length;
}
function applyShift(g:Game,q:Squad){
 const members=q.memberIds.map(id=>g.state.units.find(u=>u.id===id)).filter((u):u is Unit=>!!u&&u.hp>0);
 for(const u of members){
  if(q.shift==='watch'||!q.rotate){
   if(q.order!=='none'&&!dutyOf(g,u)){u.drill=undefined;u.jobLock=false;}
   if(q.order!=='none'&&!dutyOf(g,u))assignGuardDuty(g,u.id,q.order,q.x,q.z);
  }else{
   releaseGuardDuty(g,u.id);
   const tr=g.tribe(q.team);
   if(tr&&tr.age>=1&&g.state.buildings.some(b=>b.team===q.team&&b.type==='barracks'&&g.finished(b))){u.drill=0;u.job=null;u.jobLock=true;u.huntOnly=false;u.node=null;u.target=null;u.order='hold';u.workReason='Drilling';}
   else{u.order='hold';u.workReason='Resting between watches';}
  }
 }
}
/** Give a squad a post or a patrol around (x,z); every member walks there, spread over the patrol loop by their own duty id. */
export function setSquadOrder(g:Game,squadId:number,order:SquadOrder,x:number,z:number,rotate=false){
 const q=st(g).squads?.list.find(p=>p.id===squadId);if(!q)return {accepted:false,reason:'No such squad'};
 if(!Number.isFinite(x)||!Number.isFinite(z))return {accepted:false,reason:'Invalid position'};
 if(order==='none'){for(const id of q.memberIds)releaseGuardDuty(g,id);Object.assign(q,{order,rotate:false,shift:'watch',shiftUntil:0});return {accepted:true,reason:'Squad released'};}
 for(const id of q.memberIds)releaseGuardDuty(g,id);
 Object.assign(q,{order,x,z,rotate,shift:'watch',shiftUntil:g.state.time+SQUAD_RULES.watchSeconds});
 let ok=0;for(const id of q.memberIds)if(assignGuardDuty(g,id,order,x,z).accepted)ok++;
 return ok?{accepted:true,reason:`${ok} on ${order==='patrol'?'patrol':'watch'}`}:{accepted:false,reason:'Nobody in the squad can take duty now'};
}
export function tickSquads(g:Game){
 const s=st(g).squads;if(!s?.list.length)return;
 if(g.state.time<(lastReview.get(g)??0))return;lastReview.set(g,g.state.time+SQUAD_RULES.reviewSeconds);
 const live=new Set(g.state.units.filter(u=>u.hp>0&&u.militia&&!u.prisoner).map(u=>u.id));
 for(const q of s.list){
  q.memberIds=q.memberIds.filter(id=>live.has(id));
  if(q.leaderId!==undefined&&!q.memberIds.includes(q.leaderId))q.leaderId=undefined;
  if(q.leaderId===undefined&&q.memberIds.length){const l=leaderOf(g,q.memberIds.map(id=>g.state.units.find(u=>u.id===id)!).filter(Boolean));q.leaderId=l?.id;}
  if(q.rotate&&q.order!=='none'&&g.state.time>=q.shiftUntil){
   const squadsOnPost=s.list.filter(p=>p.team===q.team&&p.order!=='none'&&p.rotate).length;
   if(squadsOnPost>=1){q.shift=q.shift==='watch'?'rest':'watch';q.shiftUntil=g.state.time+(q.shift==='watch'?SQUAD_RULES.watchSeconds:SQUAD_RULES.restSeconds);applyShift(g,q);}
  }
 }
 s.list=s.list.filter(q=>q.memberIds.length>0);
}
export function squadViews(g:Game,team=0){
 return squadsOf(g,team).map(q=>({id:q.id,name:q.name,size:q.size,members:q.memberIds.length,order:q.order,shift:q.shift,rotate:q.rotate,leaderId:q.leaderId}));
}
export function validSquads(s:any){
 const v=s.squads;if(v===undefined)return true;
 if(!v||v.version!==1||!Array.isArray(v.list)||v.list.length>SQUAD_RULES.maximumSquads)return false;
 const ids=new Set<number>(),units=new Set<number>();
 for(const q of v.list){
  if(!q||!Number.isInteger(q.id)||q.id<0||q.id>=s.nextId||ids.has(q.id)||!SQUAD_SIZES.includes(q.size)||!Number.isInteger(q.team)||q.team<0||q.team>=s.tribes.length)return false;
  ids.add(q.id);
  if(typeof q.name!=='string'||q.name.length>40||!['none','post','patrol'].includes(q.order)||!['watch','rest'].includes(q.shift)||typeof q.rotate!=='boolean'||![q.x,q.z,q.shiftUntil].every(Number.isFinite))return false;
  if(!Array.isArray(q.memberIds)||q.memberIds.length>q.size)return false;
  for(const m of q.memberIds){if(!Number.isInteger(m)||m<0||m>=s.nextId||units.has(m))return false;units.add(m);}
  if(q.leaderId!==undefined&&!Number.isInteger(q.leaderId))return false;
 }
 return true;
}
