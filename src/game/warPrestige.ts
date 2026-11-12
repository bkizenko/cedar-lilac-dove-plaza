import type {GameState} from './types';
import {CAPITULATION_RULES,type CapitulationState,type CapitulationOutcome} from './capitulation';
import {DOMINATION_RULES,type DominationState} from './domination';

export const WAR_PRESTIGE_RULES={version:1,heldAim:1,weights:{raze:.5,loot:.5,captives:.6,tribute:.8,autonomy:.8,puppet:1,occupy:1,annex:1.2}} as const;
type WarState=Pick<GameState,'time'|'buildings'>&{capitulation?:CapitulationState;dominations?:DominationState};
export type SettledWarPrestige={value:number;achieved:number;held:number;frontIds:number[]};
const arrangementKey=(hall:number,attacker:number,defender:number,terms:string,at:number)=>`${hall}:${attacker}:${defender}:${terms}:${at}`;
/** Authoritative own-party settled outcomes only. Rival display must use separate
 * returned witness receipts; looking at a hall does not reveal its war history.
 * The retained bounded front ledger is recomputed, never incremented on reads. */
export function settledWarPrestige(state:WarState,team=0):SettledWarPrestige{
 const result:SettledWarPrestige={value:0,achieved:0,held:0,frontIds:[]};
 if(!Number.isSafeInteger(team)||team<0||!Number.isFinite(state.time)||!state.capitulation)return result;
 const fronts=state.capitulation.fronts;if(!fronts.length)return result;
 const settled=fronts.slice(0,CAPITULATION_RULES.maximumFronts).filter(f=>
  (f.attackerTeam===team||f.defenderTeam===team)&&f.attackerTeam!==3&&f.defenderTeam!==3&&Number.isSafeInteger(f.id)&&f.id>0&&f.attackerTeam!==f.defenderTeam&&
  Number.isFinite(f.openedAt)&&f.openedAt>=0&&f.resolvedAt!==undefined&&Number.isFinite(f.resolvedAt)&&f.resolvedAt>=f.openedAt&&f.resolvedAt<=state.time&&
  (f.phase==='accepted'||f.phase==='relieved'));
 if(!settled.length)return result;
 const halls=new Map(state.buildings.map(b=>[b.id,b])),arrangements=new Map<string,NonNullable<WarState['dominations']>['list']>();
 for(const d of (state.dominations?.list||[]).slice(0,DOMINATION_RULES.maximum)){
  if(d.origin!=='capitulation')continue;const key=arrangementKey(d.hallId,d.overlord,d.subject,d.terms,d.createdAt),list=arrangements.get(key)||[];list.push(d);arrangements.set(key,list);
 }
 const seen=new Set<number>();
 for(const f of settled){
  if(seen.has(f.id))continue;seen.add(f.id);const hall=halls.get(f.hallId);
  if(f.phase==='relieved'){
   // A refusal is not relief. The actual relief writer waits for 120 seconds of
   // absent pressure; a lost or destroyed hall cannot claim a retained objective.
   if(f.defenderTeam!==team||!hall||hall.hp<=0||hall.team!==f.defenderTeam)continue;
   result.held+=WAR_PRESTIGE_RULES.heldAim;result.frontIds.push(f.id);continue;
  }
  if(f.attackerTeam!==team||!f.outcome||!Object.hasOwn(WAR_PRESTIGE_RULES.weights,f.outcome))continue;
  if(['tribute','puppet','autonomy'].includes(f.outcome)){
   // createDomination and resolution are synchronous in acceptCapitulation.
   // A later arrangement must not revive an older failed or released claim.
   const matches=arrangements.get(arrangementKey(f.hallId,f.attackerTeam,f.defenderTeam,f.outcome,f.resolvedAt!));
   if(matches?.length!==1||matches[0].phase!=='active'||!hall||hall.hp<=0||hall.team!==f.defenderTeam)continue;
  }
  result.achieved+=WAR_PRESTIGE_RULES.weights[f.outcome as CapitulationOutcome];result.frontIds.push(f.id);
 }
 result.value=result.achieved+result.held;return result;
}
