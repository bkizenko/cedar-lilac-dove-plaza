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
export const OPERATION_RULES={minFoodSeconds:180,guardFraction:.06,raidFraction:.3,localDefenseRadius:55,maxTargets:8,minUtility:1,travelCostPerMeter:.01,defenseWeight:7,nightBonus:.4};
export type RaidMetrics={reward:number;grievance:number;travelCost:number;defenseCost:number;structureCost:number;nightBonus:number;observedDefenders:number;power:number;guards:number};
export type RivalRaidPlan={target:Building;fighters:Unit[];utility:number;reason:string;metrics:RaidMetrics};
function freeWorker(g:Game,u:Unit){return u.hp>0&&u.type==='worker'&&!u.militia&&adult(g,u)&&!hasTaskCommitment(u)&&u.carry===0&&!u.jobLock&&!u.buildOrder&&!u.trade&&!u.tributeJourney&&!u.expedition&&!u.scout&&!u.visit&&!u.foundingJourney&&!u.envoy&&!u.emergency&&!u.recalled&&u.drill==null&&['idle','gather'].includes(u.order);}
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
export function planRivalRaid(g:Game,team:number,reserve:number):RivalRaidPlan|null{
 const t=g.tribe(team),home=g.state.buildings.find(b=>b.team===team&&b.type==='townhall'&&g.finished(b));
 if(!home||reserve<OPERATION_RULES.minFoodSeconds)return null;
 const residents=g.state.units.filter(u=>u.team===team&&u.hp>0&&adult(g,u));
 const ready=residents.filter(u=>armed(u)&&u.type!=='leader'&&u.hp>=u.maxHp*.6&&u.carry===0&&!u.jobLock&&!u.buildOrder&&!hasTaskCommitment(u)&&
  !u.trade&&!u.tributeJourney&&!u.expedition&&!u.scout&&!u.visit&&!u.foundingJourney&&!u.envoy&&!u.emergency&&!u.recalled&&!u.shelterId&&u.drill==null&&['idle','hold','gather'].includes(u.order));
 const guards=Math.max(1,Math.ceil(residents.length*OPERATION_RULES.guardFraction));
 const homeGuards=ready.filter(u=>distance(u,home)<OPERATION_RULES.localDefenseRadius).sort((a,b)=>distance(a,home)-distance(b,home)).slice(0,guards);
 if(homeGuards.length<guards)return null;
 const available=ready.filter(u=>!homeGuards.includes(u));
 const count=Math.min(12+t.age*3,Math.max(2,Math.floor(residents.length*OPERATION_RULES.raidFraction)),available.length);
 if(count<2)return null;
 const fighters=available.sort((a,b)=>strength(b)-strength(a)||a.id-b.id).slice(0,count);
 const power=fighters.reduce((n,u)=>n+strength(u),0);
 const range=Math.min(700,Math.max(180,g.world.size*.4));
 const values:Partial<Record<Building['type'],number>>={warehouse:7,farm:5,lumber:5,quarry:4,market:6,cornerstone:3,hut:2,dock:4};
 const candidates=g.state.buildings.filter(b=>b.team===0&&g.finished(b)&&b.type!=='townhall'&&rivalKnows(g,team,b.x,b.z)&&distance(home,b)<range)
  .sort((a,b)=>(values[b.type]??1)-(values[a.type]??1)||distance(home,a)-distance(home,b)).slice(0,OPERATION_RULES.maxTargets);
 let best:RivalRaidPlan|null=null;
 for(const target of candidates){
  const spot=g.interactionSpot(fighters[0],target);
  if(!spot||!fighters.every(u=>g.workBoard.connected(g,u.x,u.z,spot.x,spot.z)))continue;
  const local=g.state.units.filter(u=>u.team===0&&u.hp>0&&adult(g,u)&&distance(u,target)<OPERATION_RULES.localDefenseRadius&&rivalKnows(g,team,u.x,u.z));
  let resistance=local.reduce((n,u)=>n+strength(u)*(armed(u)?1:.3),0);
  resistance+=g.state.buildings.filter(b=>b.team===0&&g.finished(b)&&['watchtower','keep','barracks'].includes(b.type)&&distance(b,target)<35&&rivalKnows(g,team,b.x,b.z)).length*2;
  const grievance=t.tension*(target.type==='cornerstone'?6:3);
  const reward=(values[target.type]??1)*(.6+t.aggro*.7+(reserve<450?.3:0));
  const metrics={reward,grievance,travelCost:distance(home,target)*OPERATION_RULES.travelCostPerMeter,defenseCost:resistance/Math.max(1,power)*OPERATION_RULES.defenseWeight,structureCost:Math.min(2,target.hp/500),nightBonus:g.isNight()?OPERATION_RULES.nightBonus:0,observedDefenders:local.length,power,guards};
  const utility=reward+grievance-metrics.travelCost-metrics.defenseCost-metrics.structureCost+metrics.nightBonus;
  if(utility>OPERATION_RULES.minUtility&&(!best||utility>best.utility))best={target,fighters,utility,metrics,reason:target.type==='cornerstone'&&t.tension>.28?'Disputed frontier':'Known exposed supplies'};
 }
 return best;
}
export function rivalOperationIntent(g:Game,team:number,reserve:number):'recover'|'trade'|'defend'|'raid'{
 const t=g.tribe(team);
 if(g.state.time<(t.recoveryUntil||0))return 'recover';
 if(t.ally||g.state.time<(t.compactUntil||0))return 'trade';
 if((g.state.conflict==='quiet'&&!t.hostile)||g.state.time<(g.state.conflict==='dangerous'?300:600))return 'trade';
 const home=g.campOf(team);
 if(g.state.units.some(u=>u.hp>0&&g.isFoe(team,u.team)&&distance(u,home)<55))return 'defend';
 if(reserve<OPERATION_RULES.minFoodSeconds)return 'trade';
 const grievance=t.tension>.52;
 const opportunist=t.aggro>.65&&(t.trust||0)<.35;
 if((t.hostile||grievance||opportunist)&&planRivalRaid(g,team,reserve))return 'raid';
 return reserve<450?'trade':'defend';
}
/** Commit only actual available adults. Guards and productive residents stay home. */
export function dispatchRivalOperation(g:Game,team:number,reserve:number){
 const t=g.tribe(team);
 if(t.lastRaid>0||rivalOperationIntent(g,team,reserve)!=='raid')return false;
 const plan=planRivalRaid(g,team,reserve);if(!plan)return false;
 for(const u of plan.fighters){
  u.tx=plan.target.x;u.tz=plan.target.z;u.order='attackmove';u.node=null;g.invalidateRoute(u);u.target=plan.target;
  u.attackDestination={x:plan.target.x,z:plan.target.z};u.pillage=0;u.workReason=`${plan.reason} — raiding with ${plan.fighters.length} residents`;
 }
 // Relations change only when the actual force reaches hostile territory/contact.
 t.lastRaid=360+Math.random()*180;t.recoveryUntil=g.state.time+t.lastRaid;
 if(g.started&&plan.fighters.some(u=>g.visibleAt(u.x,u.z)))g.banner(`${t.name} is sending an armed raiding party`,3);
 return true;
}
