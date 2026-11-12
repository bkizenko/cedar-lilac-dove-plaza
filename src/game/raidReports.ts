import type {Game} from './sim';
import type {Building,Unit} from './types';
import {doctrineOf} from './combatDoctrine';
/** M3-15: what a raid actually did. Every number is counted from a real death, a real exposed or carried load, or a real
 * resident's current task; nothing is estimated or created here. */
export type LootKind='food'|'wood'|'stone'|'copper'|'iron';
export type Loot=Partial<Record<LootKind,number>>;
export type RaidOutcome='sacked'|'destroyed'|'repelled'|'standoff';
export type RaidRecord={
 id:number;attacker:number;defender:number;kind:'raid'|'clash';startedAt:number;lastActivityAt:number;x:number;z:number;
 attackerIds:number[];defenderIds:number[];attackerLost:number;defenderLost:number;defenderCivilianLost:number;buildingsLost:number;
 exposed:Loot;carried:Loot;phase:'fighting'|'settling'|'closed';
 closedAt?:number;outcome?:RaidOutcome;attackerSurvivors?:number;retreated?:number;leftBehind?:Loot;resumed?:number;stillArmed?:number;sheltering?:number;finishedAt?:number;
};
export type RaidReports={version:1;active:RaidRecord[];done:RaidRecord[]};
type ReportState={raidReports?:RaidReports};
const st=(g:Game)=>g.state as Game['state']&ReportState;
export const RAID_REPORT_RULES={version:1,maximumActive:8,maximumDone:16,maximumIds:64,quietSeconds:40,settleSeconds:240,retreatMeters:25,tickSeconds:1} as const;
const KINDS:LootKind[]=['food','wood','stone','copper','iron'];
const enabled=(g:Game)=>!!doctrineOf(g)?.raidReports;
const reports=(g:Game)=>st(g).raidReports??={version:1,active:[],done:[]};
const addIds=(list:number[],id:number)=>{if(!list.includes(id)&&list.length<RAID_REPORT_RULES.maximumIds)list.push(id);};
const addLoot=(into:Loot,from:Loot)=>{for(const k of KINDS){const n=from[k]||0;if(n>0)into[k]=(into[k]||0)+n;}};
const total=(l:Loot)=>KINDS.reduce((n,k)=>n+(l[k]||0),0);
function recordFor(g:Game,attacker:number,defender:number,create:boolean){
 const r=reports(g);let rec=r.active.find(x=>x.phase!=='closed'&&(x.attacker===attacker&&x.defender===defender||x.attacker===defender&&x.defender===attacker));
 if(rec||!create)return rec;
 if(r.active.length>=RAID_REPORT_RULES.maximumActive)return undefined;
 rec={id:g.id(),attacker,defender,kind:'clash',startedAt:g.state.time,lastActivityAt:g.state.time,x:0,z:0,attackerIds:[],defenderIds:[],attackerLost:0,defenderLost:0,defenderCivilianLost:0,buildingsLost:0,exposed:{},carried:{},phase:'fighting'};
 r.active.push(rec);return rec;
}
/** Records are per pair of societies; "attacker" is whoever struck first. Called for every point of damage the combat code applies. A fight becomes a "raid" once its attackers are pillaging. */
export function noteRaidCombat(g:Game,attackerTeam:number,target:Unit|Building,source:Unit|undefined,died:boolean){
 if(!enabled(g)||!Number.isInteger(attackerTeam)||!g.state.tribes[attackerTeam]||!g.state.tribes[target.team]||attackerTeam===target.team)return;
 // Whoever is pillaging is the attacker, even when the first blow struck came from the defender.
 const raidingSide=(u:Unit|undefined,other:number)=>!!u&&(u.team===3||u.pillage===other||u.massRaidTarget!==undefined||!!u.returnAfterCombat);
 const flip=target.kind==='unit'&&raidingSide(target,attackerTeam)&&!raidingSide(source,target.team);
 const rec=flip?recordFor(g,target.team,attackerTeam,true):recordFor(g,attackerTeam,target.team,true);if(!rec)return;
 rec.lastActivityAt=g.state.time;rec.x=target.x;rec.z=target.z;if(rec.phase==='settling')rec.phase='fighting';
 if(attackerTeam===3||source&&(source.pillage===target.team||source.massRaidTarget!==undefined||source.returnAfterCombat))rec.kind='raid';
 const side=target.team===rec.defender?rec.defenderIds:rec.attackerIds;
 if(source)addIds(source.team===rec.attacker?rec.attackerIds:rec.defenderIds,source.id);
 if(target.kind==='unit'){
  addIds(side,target.id);
  if(died){if(target.team===rec.defender){rec.defenderLost++;if(target.type==='worker'&&!target.militia)rec.defenderCivilianLost++;}else rec.attackerLost++;}
 }else if(died&&target.team===rec.defender)rec.buildingsLost++;
}
export function noteRaidExposed(g:Game,attackerTeam:number,defender:number,loot:Loot){
 if(!enabled(g)||total(loot)<=0)return;const rec=recordFor(g,attackerTeam,defender,true);if(!rec)return;
 rec.kind='raid';addLoot(rec.exposed,loot);rec.lastActivityAt=g.state.time;
}
export function noteRaidCarried(g:Game,u:Unit,defender:number,kind:LootKind,amount:number){
 if(!enabled(g)||!(amount>0))return;const rec=recordFor(g,u.team,defender,false);if(!rec)return;
 rec.carried[kind]=(rec.carried[kind]||0)+amount;addIds(rec.attackerIds,u.id);rec.lastActivityAt=g.state.time;
}
const living=(g:Game,ids:number[])=>{const by=new Map(g.state.units.map(u=>[u.id,u]));return ids.map(i=>by.get(i)).filter((u):u is Unit=>!!u&&u.hp>0);};
const civilianReady=(u:Unit)=>u.type==='worker'&&!u.militia&&!u.emergency&&!u.shelterId&&!u.recalled&&!u.demobilizing;
function settle(g:Game,rec:RaidRecord){
 const attackers=living(g,rec.attackerIds);
 rec.attackerSurvivors=attackers.length;
 rec.retreated=attackers.filter(u=>Math.hypot(u.x-rec.x,u.z-rec.z)>RAID_REPORT_RULES.retreatMeters||u.order==='return'||u.seaRaid?.phase==='retreat').length;
 const left:Loot={};for(const b of g.state.buildings)if(b.hp<=0&&b.team===rec.defender&&b.lootTeam===rec.attacker&&b.raidLoot&&Math.hypot(b.x-rec.x,b.z-rec.z)<80)addLoot(left,b.raidLoot);
 rec.leftBehind=left;
 rec.outcome=rec.buildingsLost>0||total(rec.carried)>0||total(rec.exposed)>0?'sacked':rec.attackerIds.length>0&&attackers.length===0?'destroyed':rec.retreated>0||rec.attackerLost>0?'repelled':'standoff';
 rec.phase='settling';rec.closedAt=g.state.time;
}
function civilianStatus(g:Game,rec:RaidRecord){
 const people=living(g,rec.defenderIds);
 rec.resumed=people.filter(civilianReady).length;rec.stillArmed=people.filter(u=>u.militia).length;rec.sheltering=people.filter(u=>!!u.emergency||!!u.shelterId).length;
 return people.length;
}
/** Readable one-paragraph summary, for the notice and any report view. */
export function raidReportText(g:Game,rec:RaidRecord){
 const A=g.state.tribes[rec.attacker]?.name||`Society ${rec.attacker}`,D=g.state.tribes[rec.defender]?.name||`Society ${rec.defender}`;
 const loot=(l:Loot)=>KINDS.filter(k=>(l[k]||0)>0).map(k=>`${Math.round(l[k]!)} ${k}`).join(', ');
 const head=rec.outcome==='sacked'?`${A} sacked ${D}`:rec.outcome==='destroyed'?`${A}'s raiders were destroyed by ${D}`:rec.outcome==='repelled'?`${D} drove off ${A}`:`${A} and ${D} broke off`;
 const parts=[`${rec.defenderLost} defender${rec.defenderLost===1?'':'s'} lost${rec.defenderCivilianLost?` (${rec.defenderCivilianLost} civilian)`:''}`,`${rec.attackerLost} attacker${rec.attackerLost===1?'':'s'} lost`];
 if(rec.buildingsLost)parts.push(`${rec.buildingsLost} building${rec.buildingsLost===1?'':'s'} burned`);
 parts.push(total(rec.carried)>0?`${loot(rec.carried)} carried off`:'nothing carried off');
 if(rec.leftBehind&&total(rec.leftBehind)>0)parts.push(`${loot(rec.leftBehind)} left in the ruins`);
 if(rec.retreated)parts.push(`${rec.retreated} raider${rec.retreated===1?'':'s'} retreating`);
 const back=rec.resumed!==undefined?`${rec.resumed} resident${rec.resumed===1?'':'s'} back at civilian work${rec.stillArmed?`, ${rec.stillArmed} still armed`:''}${rec.sheltering?`, ${rec.sheltering} sheltering`:''}`:'';
 return `${head}: ${parts.join('; ')}${back?`. ${back}`:''}.`;
}
export const latestRaidReport=(g:Game,team?:number)=>{const r=st(g).raidReports;if(!r)return undefined;return [...r.done].reverse().find(x=>team===undefined||x.attacker===team||x.defender===team);};
const clocks=new WeakMap<Game,number>();
export function tickRaidReports(g:Game,dt:number){
 const r=st(g).raidReports;if(!r?.active.length||!enabled(g)||!(dt>0))return;
 const acc=(clocks.get(g)||0)+dt;if(acc<RAID_REPORT_RULES.tickSeconds){clocks.set(g,acc);return;}clocks.set(g,0);
 const now=g.state.time,R=RAID_REPORT_RULES;
 for(const rec of r.active){
  if(rec.phase==='fighting'&&now-rec.lastActivityAt>=R.quietSeconds){settle(g,rec);if(rec.attacker===0||rec.defender===0)g.banner(raidReportText(g,rec),9);}
  if(rec.phase==='settling'){
   const alive=civilianStatus(g,rec),done=rec.resumed!==undefined&&(alive===0||rec.resumed+(rec.stillArmed||0)>=alive&&!rec.sheltering&&!rec.stillArmed);
   if(done||now-(rec.closedAt||now)>=R.settleSeconds){rec.phase='closed';rec.finishedAt=now;}
  }
 }
 const finished=r.active.filter(x=>x.phase==='closed');
 if(finished.length){r.active=r.active.filter(x=>x.phase!=='closed');r.done.push(...finished);if(r.done.length>R.maximumDone)r.done.splice(0,r.done.length-R.maximumDone);}
}
const loot=(l:any)=>!!l&&typeof l==='object'&&!Array.isArray(l)&&Object.entries(l).every(([k,n]:any)=>KINDS.includes(k)&&Number.isFinite(n)&&n>=0);
export function validRaidReports(s:any){
 const v=s.raidReports;if(v===undefined)return true;
 if(!v||typeof v!=='object'||v.version!==1||!Array.isArray(v.active)||!Array.isArray(v.done)||v.active.length>RAID_REPORT_RULES.maximumActive||v.done.length>RAID_REPORT_RULES.maximumDone||!s.combatDoctrine)return false;
 const ids=new Set<number>(),team=(t:any)=>Number.isInteger(t)&&t>=0&&t<s.tribes.length;
 for(const rec of [...v.active,...v.done]){
  if(!rec||!Number.isInteger(rec.id)||rec.id<0||rec.id>=s.nextId||ids.has(rec.id)||!team(rec.attacker)||!team(rec.defender)||rec.attacker===rec.defender||!['raid','clash'].includes(rec.kind)||!['fighting','settling','closed'].includes(rec.phase))return false;
  ids.add(rec.id);
  if(![rec.startedAt,rec.lastActivityAt,rec.x,rec.z].every(Number.isFinite)||![rec.attackerLost,rec.defenderLost,rec.defenderCivilianLost,rec.buildingsLost].every(n=>Number.isInteger(n)&&n>=0))return false;
  for(const list of [rec.attackerIds,rec.defenderIds])if(!Array.isArray(list)||list.length>RAID_REPORT_RULES.maximumIds||list.some((i:any)=>!Number.isInteger(i)||i<0))return false;
  if(!loot(rec.exposed)||!loot(rec.carried)||rec.leftBehind!==undefined&&!loot(rec.leftBehind))return false;
  if(rec.outcome!==undefined&&!['sacked','destroyed','repelled','standoff'].includes(rec.outcome))return false;
  for(const k of ['closedAt','finishedAt','attackerSurvivors','retreated','resumed','stillArmed','sheltering'])if(rec[k]!==undefined&&!(Number.isFinite(rec[k])&&rec[k]>=0))return false;
 }
 for(const rec of v.done)if(rec.phase!=='closed')return false;
 return true;
}
