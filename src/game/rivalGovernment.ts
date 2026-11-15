import type {Game} from './sim';
import {isRivalTeam} from './factions';
import {aiGovernmentFor,defaultTeamGovernance,govDef,governanceOf,policiesAvailable,GOVERNANCE_RULES,type GovernanceState,type PolicyId} from './governance';
/** Rival civs adopt the L2a government table through the same cost/age/population gates as the player (aiGovernmentFor + policiesAvailable),
 * paying real stock. The tribe's own age is used (governance.ts' player commands read the player's age, so rivals never call them).
 * Effects then reach rivals through governanceJobMul/governanceDmgMul. Governors are intentionally not appointed yet [hook for a later pass]. */
export const RIVAL_GOVERNMENT_RULES={reviewSeconds:240} as const;
const MARTIAL:PolicyId[]=['warBand','standingArmy','feudalLevy'],CIVIC:PolicyId[]=['harvestLevy','corvee','masonGuild','tradeCharter'];
const next=new WeakMap<object,Map<number,number>>();
export function reviewRivalGovernment(g:Game,team:number){
 if(!isRivalTeam(team))return;const tr=g.tribe(team);if(!tr?.alive)return;
 const due=next.get(g.state)??new Map<number,number>();next.set(g.state,due);
 if(g.state.time<(due.get(team)??0))return;due.set(team,g.state.time+RIVAL_GOVERNMENT_RULES.reviewSeconds);
 const s=g.state as unknown as {governance?:GovernanceState};
 const pop=g.popNow(team),age=tr.age,bias=tr.aggro>.6?'martial':tr.aggro<.3?'mercantile':'default';
 const want=aiGovernmentFor({age,pop,bias}),have=governanceOf(g,team);
 let gv=s.governance?.[String(team)];
 if(want.id!==have.gov&&g.state.time-have.changed>=GOVERNANCE_RULES.changeCooldownSeconds&&g.canAfford(team,want.cost)){
  g.spend(team,want.cost);s.governance??={};gv=s.governance[String(team)]??=defaultTeamGovernance();
  gv.gov=want.id;gv.changed=g.state.time;gv.since=g.state.time;gv.governors={};
  gv.policies=gv.policies.filter(p=>policiesAvailable(want.id,age,pop).some(x=>x.id===p)).slice(0,want.slots);
 }
 if(!gv)return;const def=govDef(gv.gov)!;
 for(const id of (bias==='martial'?[...MARTIAL,...CIVIC]:[...CIVIC,...MARTIAL])){
  if(gv.policies.length>=def.slots)break;if(gv.policies.includes(id))continue;
  const p=policiesAvailable(gv.gov,age,pop).find(x=>x.id===id);if(!p||!g.canAfford(team,p.cost))continue;
  g.spend(team,p.cost);gv.policies.push(id);
 }
}
