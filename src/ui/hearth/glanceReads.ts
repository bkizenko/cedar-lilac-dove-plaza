/**
 * Game-reading half of the glanceable layer. Read-only: nothing here mutates the sim, sends a command or rolls a number.
 * Supply days come from the same food and water rules the sim runs; alerts come from the same fields the old notification stack read.
 */
import type {Game} from '@/game/sim';
import {reserveSeconds} from '@/game/settlement';
import {simulationDaySeconds} from '@/game/calendarPacing';
import {SURVIVAL_RULES,collectedWaterDemand} from '@/game/survivalNeeds';
import {exposedHarvestUnits} from '@/game/production';
import {harvestBacklogAlert} from '@/game/cerealProcessing';
import {measureVillageWorkload} from '@/game/villageWorkload';
import type {Unit} from '@/game/types';
import type {Alert} from './glanceModel';
import {wildAlert} from '@/game/wildCraftControl';

export const RAIDER_SIGHT_METERS=140;
const residents=(g:Game)=>g.state.units.filter(u=>u.team===0&&u.hp>0&&!u.expedition&&!u.visit);

/** Days of food at the current appetite, from the sim's own reserve rule. Null when nobody eats. */
export function foodDays(g:Game):number|null{
 const s=reserveSeconds(g,0);return Number.isFinite(s)?s/simulationDaySeconds:null;
}
/** Days of collected water at the survival rule's per-person draw. Null before survival rules apply or with no current draw. */
export function waterDays(g:Game):number|null{
 if(g.state.survivalVersion!==1)return null;const stock=g.tribe(0).survival?.waterLiters;if(stock===undefined)return null;
 const use=collectedWaterDemand(g,0)*simulationDaySeconds;
 return use>0?stock/use:null;
}

/** Foes the player can currently see within raider range of the hall or any own resident, nearest to home first. */
export function visibleRaiders(g:Game){
 const home=g.campOf(0),mine=residents(g);
 return g.state.units.filter(u=>u.hp>0&&u.team!==0&&g.isFoe(0,u.team)&&g.visibleAt(u.x,u.z)&&(Math.hypot(u.x-home.x,u.z-home.z)<=RAIDER_SIGHT_METERS||mine.some(m=>Math.hypot(u.x-m.x,u.z-m.z)<=RAIDER_SIGHT_METERS/2)))
  .sort((a,b)=>Math.hypot(a.x-home.x,a.z-home.z)-Math.hypot(b.x-home.x,b.z-home.z));
}

/**
 * Every current problem, each with the place it is happening when it has one. Per-person alerts point at the worst-off person.
 * `workloadPercent` is passed in (it is expensive and the caller already throttles it).
 */
export function detectAlerts(g:Game,workloadPercent:number|null=null):Alert[]{
 const out:Alert[]=[];
 const at=(u:{x:number;z:number;y?:number})=>({x:u.x,y:u.y??g.height(u.x,u.z),z:u.z});
 let starving=0,thirsty=0,freezing=0,full=0;
 type Worst={u:Unit;v:number}|null;
 let worstHunger=null as Worst,worstThirst=null as Worst,worstCold=null as Worst,firstFull=null as Unit|null;
 for(const u of g.state.units){
  if(u.team!==0||u.hp<=0)continue;
  if(u.workReason?.includes('cache full')){full++;firstFull??=u;}
  const h=u.hunger??0;if(h>=60){starving++;if(!worstHunger||h>worstHunger.v)worstHunger={u,v:h};}
  const th=u.thirstSeconds??0;if(th>=SURVIVAL_RULES.thirstGraceSeconds){thirsty++;if(!worstThirst||th>worstThirst.v)worstThirst={u,v:th};}
  const c=u.coldSeconds??0;if(c>=SURVIVAL_RULES.coldGraceSeconds){freezing++;if(!worstCold||c>worstCold.v)worstCold={u,v:c};}
 }
 const raiders=visibleRaiders(g);
 if(raiders.length)out.push({kind:'raiders',severity:'critical',count:raiders.length,tip:`${raiders.length} raider${raiders.length===1?'':'s'} in sight`,at:at(raiders[0])});
 if(thirsty)out.push({kind:'thirsty',severity:'critical',count:thirsty,tip:`${thirsty} dangerously thirsty`,at:worstThirst?at(worstThirst.u):undefined});
 if(starving)out.push({kind:'starving',severity:'critical',count:starving,tip:`${starving} starving`,at:worstHunger?at(worstHunger.u):undefined});
 if(freezing)out.push({kind:'freezing',severity:'critical',count:freezing,tip:`${freezing} freezing`,at:worstCold?at(worstCold.u):undefined});
 if(full)out.push({kind:'full',severity:'warning',count:full,tip:`${full} blocked by full material stores`,at:firstFull?at(firstFull):undefined});
 const harvest=harvestBacklogAlert(g),exposed=harvest?0:exposedHarvestUnits(g,0);
 if(exposed>=8)out.push({kind:'exposed',severity:'warning',count:Math.floor(exposed),tip:`${Math.floor(exposed)} harvest units exposed to spoilage`});
 if(harvest)out.push({kind:'harvest',severity:'warning',count:1,tip:harvest});
 if(workloadPercent!==null&&workloadPercent>100)out.push({kind:'backlog',severity:'warning',count:Math.ceil(workloadPercent),tip:`Work backlog, ${Math.ceil(workloadPercent)}% of capacity`});
 const wild=wildAlert(g);if(wild)out.push({kind:'wild',severity:'warning',count:wild.count,tip:wild.tip,at:{x:wild.x,y:g.height(wild.x,wild.z),z:wild.z}});
 return out;
}
export const workloadOf=(g:Game)=>measureVillageWorkload(g).workloadPercent;
