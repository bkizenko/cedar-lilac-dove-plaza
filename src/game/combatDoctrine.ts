import type {Game} from './sim';
import type {Unit} from './types';
import {wornArmor} from './armor';
import {combinedMatchup,roleOfType,type CombatFacts,type Matchup} from './combatCounters';
import {FORMATION_PROFILES,FORMATION_RULES,formationSlots,rotateSlot,validFormationKind,type FormationKind,type Slot} from './formations';
/** Combat doctrine switch plus formation groups. Absent state means the legacy combat rules, so old saves are unchanged. */
export type CombatDoctrine={version:1;counters:boolean;formations:boolean;guardDuty:boolean;raidReports:boolean;transit:boolean;preferred:FormationKind;/** reason -> hits, bounded, so the interface can say why fights went as they did */tally:Record<string,number>};
export type FormationGroup={id:number;team:number;kind:FormationKind;memberIds:number[];commanderId?:number;facing:number;cohesion:number;morale:number;casualties:number;createdAt:number};
type DoctrineState={combatDoctrine?:CombatDoctrine;formations?:FormationGroup[]};
const st=(g:Game)=>g.state as Game['state']&DoctrineState;
export const DOCTRINE_RULES={version:1,tallyKeys:48,maximumGroups:FORMATION_RULES.maximumGroups} as const;
export const doctrineOf=(g:Game)=>st(g).combatDoctrine;
export function enableCombatDoctrine(g:Game,flags:Partial<Omit<CombatDoctrine,'version'|'tally'>>={}){
 const s=st(g),d=s.combatDoctrine??={version:1,counters:true,formations:true,guardDuty:true,raidReports:true,transit:true,preferred:'line',tally:{}};
 Object.assign(d,flags);return d;
}
export function setPreferredFormation(g:Game,kind:FormationKind){const d=doctrineOf(g);if(!d||!validFormationKind(kind))return false;d.preferred=kind;return true;}
const groups=(g:Game)=>st(g).formations??=[];
const indexes=new WeakMap<FormationGroup[],{n:number;byUnit:Map<number,FormationGroup>}>();
function index(g:Game){
 const list=groups(g);let ix=indexes.get(list);
 if(!ix||ix.n!==list.length){ix={n:list.length,byUnit:new Map()};for(const gr of list)for(const id of gr.memberIds)ix.byUnit.set(id,gr);indexes.set(list,ix);}
 return ix;
}
const reindex=(g:Game)=>indexes.delete(groups(g));
export function formationOf(g:Game,u:Unit):FormationGroup|undefined{const s=st(g);if(!s.combatDoctrine?.formations||!s.formations?.length)return undefined;return index(g).byUnit.get(u.id);}
const dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const PRIORITY:Record<string,number>={blade:0,warden:0,spear:1,mounted:2,skirmisher:3,archer:4,civilian:5,commander:6};
const isCommander=(u:Unit)=>u.type==='leader'||u.type==='warden';
/** Called by issueMove/issueAttack/marchMilitary through slotOffsets. Returns world offsets aligned with `units`, or undefined to keep legacy spacing. */
export function assignFormation(g:Game,units:Unit[],x:number,z:number):Slot[]|undefined{
 const s=st(g),d=s.combatDoctrine;
 if(!d?.formations||units.length<FORMATION_RULES.minimumMembers||units.length>FORMATION_RULES.maximumMembers)return undefined;
 const team=units[0].team;if(units.some(u=>u.team!==team||u.hp<=0))return undefined;
 let cx=0,cz=0;for(const u of units){cx+=u.x;cz+=u.z;}cx/=units.length;cz/=units.length;
 const facing=Math.atan2(x-cx,z-cz),kind=d.preferred;
 // Front rank first: heavy foot, spears, riders, then shooters and the commander at the back.
 const order=units.map((u,i)=>({u,i})).sort((a,b)=>(isCommander(a.u)?6:PRIORITY[roleOfType(a.u.type)]??5)-(isCommander(b.u)?6:PRIORITY[roleOfType(b.u.type)]??5)||a.u.id-b.u.id);
 const id=g.id(),slots=formationSlots(kind,order.length,id),out:Slot[]=new Array(units.length);
 order.forEach((o,k)=>{out[o.i]=rotateSlot(slots[k],facing);});
 const taken=new Set(units.map(u=>u.id)),list=groups(g);
 for(const gr of list)gr.memberIds=gr.memberIds.filter(m=>!taken.has(m));
 st(g).formations=list.filter(gr=>gr.memberIds.length>=2);
 const next=st(g).formations!;
 if(next.length>=DOCTRINE_RULES.maximumGroups)next.shift();
 const commander=order.find(o=>isCommander(o.u))?.u;
 next.push({id,team,kind,memberIds:order.map(o=>o.u.id),...(commander?{commanderId:commander.id}:{}),facing,cohesion:.55,morale:FORMATION_RULES.startMorale,casualties:0,createdAt:g.state.time});
 reindex(g);return out;
}
export function disbandFormation(g:Game,id:number){const s=st(g);const n=s.formations?.length||0;s.formations=s.formations?.filter(f=>f.id!==id);reindex(g);return (s.formations?.length||0)<n;}
const accumulators=new WeakMap<Game,number>();
function commanderFor(g:Game,gr:FormationGroup,members:Unit[],cx:number,cz:number){
 const member=members.find(isCommander);if(member)return member;
 let best:Unit|undefined,bd:number=FORMATION_RULES.commanderRadiusMeters;
 for(const u of g.state.units)if(u.team===gr.team&&u.hp>0&&isCommander(u)&&!u.prisoner){const d=Math.hypot(u.x-cx,u.z-cz);if(d<=bd){bd=d;best=u;}}
 if(best)return best;
 return members.filter(u=>(u.combatXP||0)>=FORMATION_RULES.veteranXp).sort((a,b)=>(b.combatXP||0)-(a.combatXP||0)||a.id-b.id)[0];
}
/** Cohesion follows who is actually near their slot; morale follows casualties, cohesion and a commander. */
export function tickFormations(g:Game,dt:number){
 const s=st(g);if(!s.combatDoctrine?.formations||!s.formations?.length||!(dt>0))return;
 const acc=(accumulators.get(g)||0)+dt;if(acc<FORMATION_RULES.tickSeconds){accumulators.set(g,acc);return;}accumulators.set(g,0);
 const byId=new Map(g.state.units.map(u=>[u.id,u]));let changed=false;
 for(const gr of s.formations){
  const alive:Unit[]=[];for(const id of gr.memberIds){const u=byId.get(id);if(u&&u.hp>0&&u.team===gr.team&&!u.prisoner&&!u.boat)alive.push(u);}
  const lost=gr.memberIds.length-alive.length;
  if(lost>0){
   gr.casualties+=lost;gr.memberIds=alive.map(u=>u.id);changed=true;
   gr.morale=Math.max(0,gr.morale-lost*FORMATION_RULES.casualtyMorale*(1-.4*gr.cohesion));
   if(gr.commanderId!==undefined&&!byId.get(gr.commanderId)?.hp){gr.commanderId=undefined;gr.morale=Math.max(0,gr.morale-.15);}
  }
  if(alive.length<2)continue;
  let cx=0,cz=0;for(const u of alive){cx+=u.x;cz+=u.z;}cx/=alive.length;cz/=alive.length;
  const p=FORMATION_PROFILES[gr.kind],slots=formationSlots(gr.kind,alive.length+lost,gr.id);
  // Stable slot index: a member keeps its place; slots that fell away collapse toward the rear.
  let sum=0;
  alive.forEach((u,i)=>{const w=rotateSlot(slots[Math.min(i,slots.length-1)],gr.facing);sum+=Math.min(1,Math.hypot(u.x-(cx+w.ox),u.z-(cz+w.oz))/(p.spacing*3));});
  const raw=1-sum/alive.length,commander=commanderFor(g,gr,alive,cx,cz);
  if(commander)gr.commanderId=commander.id;
  const bonus=commander?(isCommander(commander)?FORMATION_RULES.commanderCohesion:FORMATION_RULES.veteranCohesion):0;
  const target=Math.max(p.floor,Math.min(1,raw+bonus));
  gr.cohesion=Math.max(0,Math.min(1,gr.cohesion+(target-gr.cohesion)*Math.min(1,.35)));
  gr.morale=Math.max(0,Math.min(1,gr.morale+(.01+.03*gr.cohesion+(commander?.02:0))*FORMATION_RULES.tickSeconds));
  // Facing follows the group's actual march so the wedge points where it goes.
  const lead=alive[0],mover=alive.find(u=>u.order==='move'||u.order==='attackmove'||u.order==='attack');
  if(mover&&Math.hypot(mover.tx-cx,mover.tz-cz)>3)gr.facing=Math.atan2(mover.tx-cx,mover.tz-cz);else if(lead&&Math.hypot(lead.vx,lead.vz)>.2)gr.facing=Math.atan2(lead.vx,lead.vz);
 }
 s.formations=s.formations.filter(gr=>gr.memberIds.length>=2);if(changed||s.formations.length)reindex(g);
}
/** Travel pace for a member of a formed group; 1 for everyone else. Collision radii are never changed. */
export function formationPace(g:Game,u:Unit){
 const gr=formationOf(g,u);if(!gr)return 1;const p=FORMATION_PROFILES[gr.kind];
 return 1+(p.pace-1)*Math.max(.35,gr.cohesion);
}
export function factsFor(g:Game,u:Unit,ranged:boolean):CombatFacts{
 const gr=formationOf(g,u),a=wornArmor(g,u);
 return {role:roleOfType(u.type),speed:u.speed,armoured:!!a&&a.condition>0,ranged,formation:gr?.kind,cohesion:gr?.cohesion??0,morale:gr?.morale??1,advancing:u.order==='attackmove'||u.order==='attack'};
}
/** One call per hit. Returns 1 with no reasons when the doctrine switch is off or either side is not a person. */
export function combatMatchup(g:Game,attacker:Unit|{kind:string},target:Unit|{kind:string}):Matchup{
 const d=st(g).combatDoctrine;
 if(!d?.counters&&!d?.formations||attacker.kind!=='unit'||target.kind!=='unit')return {multiplier:1,reasons:[]};
 const a=attacker as Unit,t=target as Unit,ranged=a.range>=8;
 return combinedMatchup(factsFor(g,a,ranged),factsFor(g,t,false),{counters:d.counters,formations:d.formations});
}
/** Tally the reasons behind applied hits; bounded so the save stays small. */
export function noteMatchup(g:Game,m:Matchup){
 const d=st(g).combatDoctrine;if(!d||!m.reasons.length)return;
 for(const r of m.reasons){const key=r.replace(/ ×[\d.]+$/,'').replace(/ \(\d+% cohesion\)/,'').slice(0,80);
  if(d.tally[key]===undefined&&Object.keys(d.tally).length>=DOCTRINE_RULES.tallyKeys)continue;d.tally[key]=Math.min(1e9,(d.tally[key]||0)+1);}
}
/** Readable explanation of a matchup for tooltips: "Spears against cavalry ×1.30; ... = ×1.17". */
export function explainMatchup(g:Game,attacker:Unit,target:Unit){const m=combatMatchup(g,attacker,target);return m.reasons.length?`${m.reasons.join('; ')} = ×${m.multiplier.toFixed(2)}`:'No tactical edge either way';}
export function validCombatDoctrine(s:any){
 const d=s.combatDoctrine,f=s.formations;
 if(d===undefined&&f===undefined)return true;
 if(f!==undefined&&d===undefined)return false;
 if(!d||typeof d!=='object'||Array.isArray(d)||d.version!==1||!['counters','formations','guardDuty','raidReports','transit'].every(k=>typeof d[k]==='boolean')||!validFormationKind(d.preferred))return false;
 if(!d.tally||typeof d.tally!=='object'||Array.isArray(d.tally)||Object.keys(d.tally).length>DOCTRINE_RULES.tallyKeys||Object.values(d.tally).some((n:any)=>!Number.isFinite(n)||n<0))return false;
 if(f===undefined)return true;
 if(!Array.isArray(f)||f.length>DOCTRINE_RULES.maximumGroups)return false;
 const ids=new Set<number>(),members=new Set<number>(),unit=(id:any)=>Number.isInteger(id)&&id>=0&&id<s.nextId;
 for(const g of f){
  if(!g||!unit(g.id)||ids.has(g.id)||!validFormationKind(g.kind)||!Number.isInteger(g.team)||g.team<0||g.team>=s.tribes.length||!Array.isArray(g.memberIds)||g.memberIds.length>FORMATION_RULES.maximumMembers)return false;
  ids.add(g.id);
  for(const m of g.memberIds){if(!unit(m)||members.has(m))return false;members.add(m);}
  if(g.commanderId!==undefined&&!unit(g.commanderId))return false;
  if(![g.facing,g.createdAt].every(n=>Number.isFinite(n))||![g.cohesion,g.morale].every(n=>Number.isFinite(n)&&n>=0&&n<=1)||!Number.isInteger(g.casualties)||g.casualties<0)return false;
 }
 return true;
}
