/** Read-only combat doctrine view for the owner UI: formations, guard duty, the latest raid and route transit terms. Plain data only; nothing here mutates the world. */
import type {Game} from './sim';
import {doctrineOf,combatMatchup} from './combatDoctrine';
import {FORMATION_KINDS,FORMATION_PROFILES,type FormationKind} from './formations';
import {latestRaidReport,raidReportText,type RaidRecord,type Loot} from './raidReports';
import {transitStatus,routeAbandoned} from './transit';
import {societyRelation} from './societyRelations';
import type {GuardDutyKind} from './guardDuty';

export type RaidCard={id:number;attacker:string;defender:string;ours:'attacker'|'defender';outcome:string;phase:RaidRecord['phase'];lostOurs:number;lostTheirs:number;civiliansLost:number;burned:number;carried:Loot;leftBehind:Loot;text:string};
export type CombatModel={
 enabled:boolean;preferred:FormationKind;
 formations:{kind:FormationKind;name:string;offense:number;pace:number;melee:number;ranged:number}[];
 groups:{id:number;kind:FormationKind;members:number;cohesion:number;morale:number;casualties:number;commander:boolean}[];
 duties:{unitId:number;kind:GuardDutyKind}[];
 raid?:RaidCard;
 routes:{team:number;name:string;mode:'open'|'agreement'|'escort'|'blocked';guards:number;expiresIn?:number;passages?:number;abandoned:boolean;reason:string}[];
 flags:{counters:boolean;formations:boolean;guardDuty:boolean;raidReports:boolean;transit:boolean};
};
const OFF:CombatModel={enabled:false,preferred:'line',formations:[],groups:[],duties:[],routes:[],flags:{counters:false,formations:false,guardDuty:false,raidReports:false,transit:false}};
export function combatModel(g:Game):CombatModel{
 const d=doctrineOf(g);if(!d)return OFF;
 const s=g.state as unknown as {formations?:{id:number;team:number;kind:FormationKind;memberIds:number[];commanderId?:number;cohesion:number;morale:number;casualties:number}[];guardDuties?:{team:number;unitId:number;kind:GuardDutyKind}[]};
 const rec=d.raidReports?latestRaidReport(g,0):undefined;
 const routes=d.transit?g.state.tribes.flatMap((t,i)=>{
  if(i===0||i===3||!t.alive||!societyRelation(g,0,i).known)return [];
  const st=transitStatus(g,0,i);
  return [{team:i,name:t.name,mode:st.mode,guards:st.guardsNeeded,...(st.agreement?{expiresIn:Math.max(0,Math.round(st.agreement.expiresAt-g.state.time)),passages:st.agreement.passages}:{}),abandoned:routeAbandoned(g,i),reason:st.reason}];
 }):[];
 return{enabled:true,preferred:d.preferred,
  formations:FORMATION_KINDS.map(k=>({kind:k,name:FORMATION_PROFILES[k].name,offense:FORMATION_PROFILES[k].offense,pace:FORMATION_PROFILES[k].pace,melee:FORMATION_PROFILES[k].takenMelee,ranged:FORMATION_PROFILES[k].takenRanged})),
  groups:(s.formations??[]).filter(f=>f.team===0).map(f=>({id:f.id,kind:f.kind,members:f.memberIds.length,cohesion:Math.round(f.cohesion*100),morale:Math.round(f.morale*100),casualties:f.casualties,commander:f.commanderId!==undefined})),
  duties:(s.guardDuties??[]).filter(x=>x.team===0).map(x=>({unitId:x.unitId,kind:x.kind})),
  ...(rec?{raid:{id:rec.id,attacker:g.tribe(rec.attacker)?.name??'?',defender:g.tribe(rec.defender)?.name??'?',ours:rec.attacker===0?'attacker' as const:'defender' as const,outcome:rec.outcome??'standoff',phase:rec.phase,
   lostOurs:rec.attacker===0?rec.attackerLost:rec.defenderLost,lostTheirs:rec.attacker===0?rec.defenderLost:rec.attackerLost,civiliansLost:rec.defenderCivilianLost,burned:rec.buildingsLost,carried:rec.carried,leftBehind:rec.leftBehind??{},text:raidReportText(g,rec)}}:{}),
  routes,flags:{counters:d.counters,formations:d.formations,guardDuty:d.guardDuty,raidReports:d.raidReports,transit:d.transit}};
}
/** Why one of our people would hit (or be hit by) another harder or softer: short reasons plus the net multiplier. */
export function matchupModel(g:Game,attackerId:number,targetId:number):{multiplier:number;reasons:string[]}{
 const a=g.state.units.find(u=>u.id===attackerId&&u.hp>0),t=g.state.units.find(u=>u.id===targetId&&u.hp>0);
 if(!a||!t)return{multiplier:1,reasons:[]};
 const m=combatMatchup(g,a,t);return{multiplier:Math.round(m.multiplier*100)/100,reasons:m.reasons};
}
