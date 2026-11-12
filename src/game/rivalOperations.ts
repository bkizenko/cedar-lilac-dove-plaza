import {planRivalPairRaid,dispatchPairRaid,isSocietyPeaceMessengerFor} from './rivalActivity';
import {AGE_STAT,UNITS} from './constants';
import {beginWeaponWork} from './warfare';
import type {Game} from './sim';
import type {Building,Unit} from './types';
import {rivalKnows} from './rivalDevelopment';
import {hasTaskCommitment} from './workCommitments';

const distance=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const adult=(g:Game,u:Unit)=>u.maturesAt===undefined||u.maturesAt<=g.state.time;
const armed=(u:Unit)=>u.militia||!['worker','leader'].includes(u.type);
const strength=(u:Unit)=>Math.max(.2,u.dmg/10)*Math.min(1,u.hp/Math.max(1,u.maxHp));
export function rivalMilitaryTarget(g:Game,team:number){
 const t=g.tribe(team),pop=g.state.units.filter(u=>u.team===team&&u.hp>0&&adult(g,u)).length;
 // Equipment and training still cost real goods and take an existing adult out of work.
 return Math.min(Math.max(0,pop-4),Math.max(3+t.age*2,Math.ceil(pop*(.12+.14*t.aggro+.06*t.tension))));
}
export const OPERATION_RULES={militaryReadinessHealthRatio:.6,minFoodSeconds:180,guardFraction:.06,raidFraction:.3,localDefenseRadius:55,maxTargets:8,minUtility:1,travelCostPerMeter:.01,defenseWeight:7,nightBonus:.4};
export type RaidMetrics={reward:number;grievance:number;travelCost:number;defenseCost:number;structureCost:number;nightBonus:number;observedDefenders:number;power:number;guards:number};
export type RivalRaidPlan={target:Building;fighters:Unit[];utility:number;reason:string;metrics:RaidMetrics};
function freeWorker(g:Game,u:Unit){return u.hp>=u.maxHp*OPERATION_RULES.militaryReadinessHealthRatio&&u.type==='worker'&&!u.militia&&adult(g,u)&&!hasTaskCommitment(u)&&u.carry===0&&!u.jobLock&&!u.buildOrder&&!u.trade&&!u.tributeJourney&&!u.expedition&&!u.scout&&!u.visit&&!u.foundingJourney&&!u.envoy&&!u.emergency&&!u.recalled&&u.drill==null&&['idle','gather'].includes(u.order);}
/** Make finite weapons, then equip existing adults; never spawn a soldier. */
export function prepareRivalDefense(g:Game,team:number,reserve:number){
 const t=g.tribe(team);
 if(reserve<450)return false;
 const armedCount=g.state.units.filter(u=>u.team===team&&u.hp>0&&armed(u)&&u.type!=='leader').length;
 if(armedCount>=rivalMilitaryTarget(g,team))return false;
 const stores=g.state.buildings.filter(b=>b.team===team&&g.finished(b)&&['townhall','warehouse','barracks'].includes(b.type));
 const u=g.state.units.find(u=>u.team===team&&freeWorker(g,u)&&stores.some(b=>distance(b,u)<20));
 if(u&&(t.spears>0||t.bows>0||(t.blades||0)>0)){
  const kind=t.spears>0?'spearman':t.bows>0?'archer':'swordsman';
  if(kind==='spearman')t.spears--;else if(kind==='archer')t.bows--;else t.blades!--;
  const d=UNITS[kind];u.militia=true;u.range=d.range;u.dmg=d.dmg*AGE_STAT[t.age];u.rof=d.rof;
  u.workReason='Equipped resident — working and ready to defend';return true;
 }
 if(t.spears+t.bows+(t.blades||0)>=rivalMilitaryTarget(g,team)-armedCount)return false;
 if(t.wood<26||t.stone<5||g.state.units.some(u=>u.team===team&&u.hp>0&&u.weaponWork&&!u.weaponWork.paused))return false;
 return beginWeaponWork(g,t.aggro>.65?'spear':'bow',team);
}
/** Value known, reachable opportunities against local observed opposition.
 * No remote inventory inspection, global defender count, new troops or free cargo. */
export function planRivalRaid(g:Game,team:number,reserve:number):RivalRaidPlan|null{return planRivalPairRaid(g,team,reserve);}
export function rivalOperationIntent(g:Game,team:number,reserve:number):'recover'|'trade'|'defend'|'raid'{
 const t=g.tribe(team);
 if(g.state.time<(t.recoveryUntil||0))return 'recover';
 const home=g.campOf(team);
 if(g.state.units.some(u=>u.hp>0&&!isSocietyPeaceMessengerFor(g,u,team)&&g.isFoe(team,u.team)&&distance(u,home)<55))return 'defend';
 if(reserve<OPERATION_RULES.minFoodSeconds)return 'trade';
 if(planRivalRaid(g,team,reserve))return 'raid';
 if(t.ally||g.state.time<(t.compactUntil||0))return 'trade';
 return reserve<450?'trade':'defend';
}
/** Commit only actual available adults. Guards and productive residents stay home. */
export function dispatchRivalOperation(g:Game,team:number,reserve:number){
 const t=g.tribe(team);
 if(t.lastRaid>0||rivalOperationIntent(g,team,reserve)!=='raid')return false;
 const plan=planRivalRaid(g,team,reserve);if(!plan)return false;
 const result=dispatchPairRaid(g,team,reserve,plan.target.team);if(!result.accepted)return false;
 // Relations change only when the actual force reaches hostile territory/contact.
 t.lastRaid=360+Math.random()*180;t.recoveryUntil=g.state.time+t.lastRaid;
 // Dispatch is not contact with the player. The force may raid another
 // society, turn back, or never reach the village; movement alone emits no alarm.
 return true;
}
