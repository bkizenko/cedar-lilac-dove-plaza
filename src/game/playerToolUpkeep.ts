import type {Game} from './sim';
import {beginFarmToolRepair,farmToolRepairIssue,farmToolCondition,resumeFarmToolWork} from './farmTools';
import {directedBlocker} from './directedWork';
import {hasTaskCommitment} from './workCommitments';
/** A worker whose farming tool has worn to (almost) nothing walks to a crafting
 * shelter and repairs it on their own, ahead of ordinary hauling and gathering,
 * however busy the village is. Uses the normal paid repair, so materials, bench
 * and walking rules are the player-order ones. Skipped while Auto work is off. */
export const PLAYER_TOOL_UPKEEP_RULES={reviewSeconds:5,repairAtCondition:.1} as const;
const next=new WeakMap<Game,{state:Game['state'];at:number}>();
export function reviewPlayerToolUpkeep(g:Game){
 if(g.state.autoWorkEnabled===false||g.state.ended)return false;
 let c=next.get(g);if(!c||c.state!==g.state){c={state:g.state,at:-Infinity};next.set(g,c);}
 if(g.state.time<c.at)return false;c.at=g.state.time+PLAYER_TOOL_UPKEEP_RULES.reviewSeconds;
 const people=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.farmTool&&u.type==='worker'&&!u.militia);
 // Already-paid repairs that were interrupted come first and cost nothing more.
 for(const u of people)if(u.farmToolWork?.mode==='repair'&&u.farmToolWork.paused&&!directedBlocker(g,u)&&u.buildOrder===undefined&&resumeFarmToolWork(g,u))return true;
 for(const u of people.filter(u=>!u.farmToolWork&&farmToolCondition(u)<=PLAYER_TOOL_UPKEEP_RULES.repairAtCondition&&u.buildOrder===undefined&&!hasTaskCommitment(u)&&!directedBlocker(g,u)).sort((a,b)=>farmToolCondition(a)-farmToolCondition(b)||a.id-b.id)){
  if(farmToolRepairIssue(g,u.id))continue;
  if(beginFarmToolRepair(g,u.id)){u.workReason='Tool worn out — walking to a crafting shelter to repair it';return true;}
 }
 return false;
}
