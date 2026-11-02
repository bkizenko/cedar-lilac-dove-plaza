import type {Game} from './sim';
import type {Unit} from './types';
import {isRivalTeam} from './factions';
import {isDependent,reserveSeconds} from './settlement';
import {hasTaskCommitment} from './workCommitments';
import {rivalMaterialReserves} from './rivalDevelopment';
import {beginFarmToolRepair,farmToolCondition,FARM_TOOL_MAINTENANCE,resumeFarmToolWork} from './farmTools';

export const RIVAL_TOOL_UPKEEP_RULES={reviewSeconds:20,repairAtCondition:.5,minimumMealSeconds:360,minimumOtherAdults:2} as const;
const reviews=new WeakMap<Game,{state:Game['state'];teams:Map<number,number>}>();
function eligible(g:Game,u:Unit){return u.hp>0&&u.type==='worker'&&!u.militia&&!isDependent(g,u)&&!u.jobLock&&u.buildOrder===undefined&&u.carry===0&&!u.resting&&!u.shelterId&&!u.recalled&&!u.emergency&&!u.expedition&&!u.envoy&&!u.visit&&!u.scout&&!u.foundingJourney&&!u.trade&&u.drill===undefined&&!hasTaskCommitment(u,'farmToolWork')&&['idle','gather','hold'].includes(u.order);}
/** One actual self-repair at a time; never reserves a future actor or refunds a
 * paused project. All material, ownership, bench and walking rules are shared. */
export function reviewRivalToolUpkeep(g:Game,team:number){
 if(!isRivalTeam(team)||!g.tribe(team)?.alive)return false;
 let c=reviews.get(g);if(!c||c.state!==g.state){c={state:g.state,teams:new Map()};reviews.set(g,c);}
 const next=c.teams.get(team)??-Infinity;if(next>g.state.time&&next<=g.state.time+RIVAL_TOOL_UPKEEP_RULES.reviewSeconds)return false;
 c.teams.set(team,g.state.time+RIVAL_TOOL_UPKEEP_RULES.reviewSeconds);
 const adults=g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!u.militia&&!isDependent(g,u)&&!u.prisoner);
 const homeAdults=adults.filter(u=>!u.boat&&!u.societyMissionId&&!u.coastalVoyageId&&!u.expedition&&!u.scout&&!u.visit&&!u.envoy&&!u.foundingJourney);
 if(homeAdults.length<=RIVAL_TOOL_UPKEEP_RULES.minimumOtherAdults||reserveSeconds(g,team)<RIVAL_TOOL_UPKEEP_RULES.minimumMealSeconds)return false;
 // Repair cannot add another artisan while someone is already making equipment.
 if(adults.some(u=>[u.farmToolWork,u.weaponWork,u.haulageWork,u.tamingWork,u.husbandryWork].some(w=>w&&!w.paused)))return false;
 const candidates=adults.filter(u=>eligible(g,u));
 // Existing paid work has precedence, with no second material admission/debit.
 for(const u of candidates)if(u.farmToolWork?.mode==='repair'&&u.farmToolWork.paused&&resumeFarmToolWork(g,u))return true;
 if(!g.state.buildings.some(b=>b.team===team&&b.type==='farm'&&g.finished(b)))return false;
 const reserves=rivalMaterialReserves(g,team),stock=g.tribe(team);
 for(const u of candidates.filter(u=>u.farmTool&&!u.farmToolWork&&farmToolCondition(u)<=RIVAL_TOOL_UPKEEP_RULES.repairAtCondition).sort((a,b)=>farmToolCondition(a)-farmToolCondition(b)||a.id-b.id)){
  const cost=FARM_TOOL_MAINTENANCE.repair[u.farmTool!];
  if(!(['wood','stone','copper','iron'] as const).every(k=>stock[k]-cost[k]>=reserves[k]))continue;
  if(beginFarmToolRepair(g,u.id,undefined,team))return true;
 }
 return false;
}
