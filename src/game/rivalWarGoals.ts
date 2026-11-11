import type {Game} from './sim';
import type {Building,Unit} from './types';
import {isRivalTeam} from './factions';
import {isDependent,reserveSeconds} from './settlement';
import {villagePersonality} from './villagePersonality';
import {recordConflict} from './conflictMetrics';
import {CONFLICT_RULES,type ConflictUnit,type OccupationControl} from './conflictIntent';
import type {CapitulationFront,CapitulationState,CapitulationOutcome} from './capitulation';
import type {PrisonerUnit} from './captivity';

/**
 * NPC war goals decided IN THE FIELD from what the attacking party measures at the community, never at
 * departure: once a party clearly dominates locally it either moves to HOLD the village intact (occupation,
 * which then feeds capitulation's occupied term and ends in an occupy outcome) or keeps pressing for
 * TRIBUTE; a hungry society just wants LOOT. Inputs are the attacker's own personality, food reserve and
 * crowding, plus the present local force ratio already measured on the capitulation front.
 */
export type WarGoal='hold'|'tribute'|'loot';
export const WAR_GOAL_RULES={version:1,reviewSeconds:15,minimumRatio:2,minimumParty:3,holdBoldness:1.1,hungrySeconds:200,crowdingRoom:1} as const;
const R=WAR_GOAL_RULES;
const dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const fronts=(g:Game)=>(g.state as Game['state']&{capitulation?:CapitulationState}).capitulation?.fronts||[];
const armed=(u:Unit)=>!!u.militia||!['worker','leader'].includes(u.type);
export function chooseWarGoal(g:Game,attacker:number):WarGoal{
 if(reserveSeconds(g,attacker)<R.hungrySeconds)return'loot';
 const crowded=g.popCap(attacker)-g.popNow(attacker)<=R.crowdingRoom;
 return villagePersonality(g,attacker).boldness>=R.holdBoldness||crowded?'hold':'tribute';
}
/** Capitulation consults the field goal first. */
export function warGoalOutcome(f:CapitulationFront):CapitulationOutcome|undefined{const goal=(f as CapitulationFront&{goal?:WarGoal}).goal;return goal==='hold'?'occupy':goal==='tribute'?'tribute':goal==='loot'?'loot':undefined;}
const nextReview=new WeakMap<object,number>();
export function tickRivalWarGoals(g:Game){
 const due=nextReview.get(g.state)??0;if(g.state.time<due)return;nextReview.set(g.state,g.state.time+R.reviewSeconds);
 for(const f of fronts(g) as (CapitulationFront&{goal?:WarGoal})[]){
  if(f.phase!=='pressed'||!isRivalTeam(f.attackerTeam)||f.goal)continue;
  const hall=g.state.buildings.find(b=>b.id===f.hallId&&b.hp>0&&b.team===f.defenderTeam);if(!hall)continue;
  const party=g.state.units.filter(u=>u.team===f.attackerTeam&&u.hp>0&&armed(u)&&!isDependent(g,u)&&!(u as PrisonerUnit).prisoner&&!u.boat&&dist(u,hall)<=55);
  if(party.length<R.minimumParty||f.ratio<R.minimumRatio)continue;
  f.goal=chooseWarGoal(g,f.attackerTeam);recordConflict(g,'context_order',f.attackerTeam,1,{targetId:hall.id,reason:'war-goal-'+f.goal});
  if(f.goal==='hold')beginHold(g,f,hall,party);
 }
}
/** Team-general counterpart of the player's secure-village order: the present party moves to hold the hall. */
function beginHold(g:Game,f:CapitulationFront,hall:Building,party:Unit[]){
 const st=g.state as Game['state']&{occupations?:OccupationControl[]},list=st.occupations??=(st.occupations=[]);
 if(list.some(c=>c.hallId===hall.id&&c.controllerTeam===f.attackerTeam&&!['withdrawn','integrated','dominated'].includes(c.phase)))return;
 for(const u of party){const c=u as ConflictUnit;g.interruptMission(u);c.conflictIntent='occupy';u.pillage=-1;u.target=null;u.returnAfterCombat=undefined;u.attackDestination=null;u.workReason='Holding this village intact instead of plundering it';}
 const buildingIds=g.connectedCamp(hall).filter(b=>b.team===hall.team&&b.hp>0&&dist(b,hall)<=CONFLICT_RULES.settlementScopeMeters).map(b=>b.id).slice(0,256);if(!buildingIds.includes(hall.id))buildingIds.unshift(hall.id);
 list.push({id:g.id(),hallId:hall.id,formerTeam:hall.team,controllerTeam:f.attackerTeam,buildingIds,residentIds:f.residentIds.filter(id=>g.state.units.some(u=>u.id===id&&u.hp>0&&u.team===hall.team)),guardIds:party.map(u=>u.id).slice(0,512),phase:'approaching',holdSeconds:0,createdAt:g.state.time});
}
