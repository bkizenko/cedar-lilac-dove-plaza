import {recordSeasonWeapon} from './seasonReports';
import {climateAt} from './ecology';
import {craftBenchReady,craftingEffort,craftingQueue,craftingBenches} from './crafting';
import type {Game} from './sim';
import type {Unit,ResKind} from './types';
import {isDependent} from './settlement';
import {predisposition} from './people';
import {noteRaidCarried} from './raidReports';
import {directedBlocker,freeForDirectedWork,directedRank,directedFail} from './directedWork';
export const WEAPONS={
  spear:{name:'Stone spear',wood:2,stone:1,copper:0,iron:0,age:0,seconds:16},
  bow:{name:'Hunting bow',wood:3,stone:1,copper:0,iron:0,age:0,seconds:24},
  blade:{name:'Metal blade',wood:4,stone:0,copper:6,iron:0,age:1,seconds:48},
} as const;
/** Weapon bench speed: the barracks and forge are the dedicated benches; the town hall and hearth are slow fallbacks. */
export function weaponBenchFactor(kind:'spear'|'bow'|'blade',type:string):number{return type==='forge'&&kind==='blade'?.5:type==='barracks'?.75:['townhall','hearth'].includes(type)?2:1;}
export type WeaponKind=keyof typeof WEAPONS;
/** Paid work can move to a replacement bench without repurchasing its inputs. */
export function resumeWeaponWork(g:Game,u:Unit,workplaceId?:number){
 const job=u.weaponWork;
 if(!job)return false;
 const direct=u.team===0;
 if(direct){const why=directedBlocker(g,u,{militia:true})??(u.stuckT>8?'That weapon maker is stuck and cannot reach a workplace; clear the way first':null);if(why)return directedFail(g,0,why);}
 else if(u.hp<=0||u.societyMissionId||u.coastalVoyageId||u.coastalCommissionId||u.prisoner||u.type!=='worker'||u.militia||isDependent(g,u)||u.carry>0||u.stuckT>8||
   u.recalled||u.emergency||u.waterWork||u.buildOrder!==undefined||u.plantingWork||u.tamingWork||u.haulageWork||u.farmToolWork||u.copperStudy||u.studyCrop||
   u.drill!=null||u.expedition||u.envoy||u.scout||u.visit||u.foundingJourney||u.tributeJourney||
   !['idle','gather','hold'].includes(u.order))return false;
 const b=g.state.buildings.filter(b=>b.team===u.team&&g.finished(b)&&(workplaceId===undefined||b.id===workplaceId)&&
   (job.kind==='blade'?b.type==='forge':['townhall','barracks','workshop','hearth'].includes(b.type))&&g.interactionSpot(u,b))
   .sort((a,b)=>(craftingQueue(g,a).length/craftingBenches(a)-craftingQueue(g,b).length/craftingBenches(b))*100+Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
 if(!b)return direct?directedFail(g,0,'No reachable finished workplace for this weapon'):false;
 if(direct&&!freeForDirectedWork(g,u,{militia:true}))return false;
 const fraction=job.progress/job.duration;
 job.duration=WEAPONS[job.kind].seconds*weaponBenchFactor(job.kind,b.type);
 job.progress=fraction*job.duration;job.workplace=b.id;job.paused=false;
 u.order='hold';u.node=null;u.target=null;u.workReason=`Resuming ${WEAPONS[job.kind].name.toLowerCase()}`;
 g.workBoard.reset();return true;
}
export function beginWeaponWork(g:Game,kind:WeaponKind,team=0,workplaceId?:number,only?:(u:Unit)=>boolean){
  const spec=WEAPONS[kind],t=g.tribe(team);
  if(!spec||!t)return false;
  const reject=(reason:string)=>{if(team===0){g.banner(reason,3);g.onSfx('invalid');}return false;};
  if(t.age<spec.age)return reject('Metalworking needs the Bronze Age; stone spears and bows are available now');
  const work=g.state.buildings.filter(b=>b.team===team&&g.finished(b)&&
    (workplaceId===undefined||b.id===workplaceId)&&
    (kind==='blade'?b.type==='forge':['townhall','barracks','workshop','hearth'].includes(b.type)));
  if(!work.length)return reject(kind==='blade'?'Build a forge for metal blades':'Use a hearth or finish a crafting shelter for weapon making');
  for(const person of g.state.units)if(person.team===team&&person.weaponWork?.kind===kind&&person.weaponWork.paused&&resumeWeaponWork(g,person,workplaceId))return true;
  const free=(u:Unit)=>u.hp>0&&!u.weaponWork&&!u.haulageWork&&!u.farmToolWork&&!u.plantingWork&&!u.tamingWork&&!u.husbandryWork&&!u.copperStudy&&!u.studyCrop&&!u.drill&&!u.recalled&&!u.coastalCommissionId&&work.some(b=>!!g.interactionSpot(u,b));
  const u=team===0
   ?g.state.units.filter(u=>u.team===0&&(!only||only(u))&&!directedBlocker(g,u,{militia:true})&&free(u)).sort((a,b)=>Math.min(...work.map(w=>directedRank(a,w)))-Math.min(...work.map(w=>directedRank(b,w))))[0]
   :g.state.units.find(u=>u.team===team&&u.hp>0&&!u.prisoner&&!u.societyMissionId&&!u.coastalVoyageId&&!u.coastalCommissionId&&u.type==='worker'&&!isDependent(g,u)&&u.carry===0&&!u.plantingWork&&!u.tamingWork&&!u.husbandryWork&&!u.recalled&&!u.tributeJourney&&!u.waterWork&&!u.weaponWork&&!u.haulageWork&&!u.farmToolWork&&!u.copperStudy&&!u.studyCrop&&!u.drill&&!u.expedition&&!u.envoy&&!u.scout&&!u.visit&&!u.emergency&&!u.foundingJourney&&['idle','gather','hold'].includes(u.order)&&work.some(b=>!!g.interactionSpot(u,b)));
  if(!u)return reject(team===0?'Nobody who can reach a weapon workplace is free of carried goods or an away mission; deliver goods first or build a crafting shelter nearby':'An available adult with empty hands and a reachable workplace is needed');
  if(t.wood<spec.wood||t.stone<spec.stone||t.copper<spec.copper)return reject(`Need ${spec.wood} logs${spec.stone?' and '+spec.stone+' stone':''}${spec.copper?' and '+spec.copper+' copper':''}`);
  const workplace=work.filter(b=>!!g.interactionSpot(u,b)).sort((a,b)=>(craftingQueue(g,a).length/craftingBenches(a)-craftingQueue(g,b).length/craftingBenches(b))*100+Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
  if(team===0&&!freeForDirectedWork(g,u,{militia:true}))return reject('That person cannot leave their current duty');
  t.wood-=spec.wood;t.stone-=spec.stone;t.copper-=spec.copper;
  u.weaponWork={kind,progress:0,duration:spec.seconds*weaponBenchFactor(kind,workplace.type),workplace:workplace.id};
  u.order='hold';u.node=null;u.target=null;u.workReason=`Making ${spec.name.toLowerCase()} — walking to the workplace`;
  if(team===0)g.banner(`${spec.name}: materials reserved; one adult leaves other work to craft it`,3);
  return true;
}
export function weaponWorkAI(g:Game,u:Unit,dt:number){
  const job=u.weaponWork;
  if(!job||job.paused||u.type!=='worker'&&!u.militia||u.order!=='hold')return false;
  const b=g.state.buildings.find(b=>b.id===job.workplace&&b.team===u.team&&g.finished(b));
  const spot=b&&g.interactionSpot(u,b);
  if(!b||!spot||u.stuckT>8){job.paused=true;u.order='idle';u.node=null;u.workReason='Weapon work paused — workplace lost or inaccessible';g.workBoard.reset();return true;}
  if(g.state.weather==='storm'||g.clockState().period==='Night'&&!g.state.nightWork)return false;
  if(!craftBenchReady(g,u,b))return true;
  if(!g.buildingWorkReached(u,b)){u.tx=spot.x;u.tz=spot.z;g.steer(u,dt);return true;}
  job.progress=Math.min(job.duration,job.progress+craftingEffort(u,dt,b)*predisposition(u).strength);
  u.stride+=dt*5;u.facing=Math.atan2(b.x-u.x,b.z-u.z);
  u.workReason=`Making ${WEAPONS[job.kind].name.toLowerCase()} · ${Math.floor(100*job.progress/job.duration)}%`;
  if(job.progress>=job.duration){
    const key=job.kind==='spear'?'spears':job.kind==='bow'?'bows':'blades';g.tribe(u.team)[key]++;
    recordSeasonWeapon(g,u.team);
    u.weaponWork=undefined;u.order='idle';u.workReason='Weapon ready in village stores';g.workBoard.reset();
    if(u.team===0){g.banner(`${WEAPONS[job.kind].name} ready — select adults and arm them`,3);g.onSfx('place');}
  }
  return true;
}
/** Skills come from actual fighting; no population or healing is awarded. */
export function combatPractice(u:Unit){return 1+Math.min(5,Math.floor(Math.sqrt((u.combatXP||0)/6)))*.05;}
/** Practice level 0..5 from combat XP (use and drill both raise it). */
export const combatLevel=(u:Pick<Unit,'combatXP'>)=>Math.min(5,Math.floor(Math.sqrt((u.combatXP||0)/6)));
/** Blows land softer on seasoned fighters: at most 15% less damage taken at level 5. Bounded, never invulnerable. */
export const combatDefence=(u:Pick<Unit,'combatXP'>)=>1+combatLevel(u)*.03;
export const COMBAT_RANKS=['Green','Practised','Drilled','Seasoned','Veteran','Hardened'] as const;
export const combatRank=(u:Pick<Unit,'combatXP'>)=>COMBAT_RANKS[combatLevel(u)];
/** Ruins contain finite goods. Loading interrupts a raid for a physical return trip. */
export function raidLootAI(g:Game,u:Unit,dt:number){
  if(u.team===3||u.pillage<0||u.carry>0||!['attack','attackmove','idle'].includes(u.order))return false;
  const ruin=g.state.buildings.filter(b=>b.hp<=0&&b.team===u.pillage&&b.lootTeam===u.team&&b.raidLoot&&Object.values(b.raidLoot).some(n=>(n||0)>0)&&Math.hypot(u.x-b.x,u.z-b.z)<18)
    .sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
  if(!ruin)return false;
  // An engaged defender must be dealt with before anyone stops to load supplies.
  // Raiders do not leave halfway: nobody loads loot and walks home while anyone of the raided people still stands nearby.
  if(g.state.units.some(e=>e.hp>0&&g.isFoe(u.team,e.team)&&Math.hypot(e.x-u.x,e.z-u.z)<7)||u.team===0&&g.raidFoeNear(u,60))return false;
  if(g.attackDistance(u,ruin)>u.r+1.8){const spot=g.nearestWalk(u,ruin.x,ruin.z);if(!spot)return false;u.tx=spot.x;u.tz=spot.z;g.steer(u,dt);u.workReason='Collecting supplies from the ruined store';return true;}
  const kind=(['food','wood','stone','copper','iron'] as ResKind[]).find(k=>(ruin.raidLoot![k]||0)>0);
  if(!kind)return false;
  const count=Math.min(12,ruin.raidLoot![kind]!);ruin.raidLoot![kind]!-=count;
  u.carry=count;u.carryType=kind;u.carryFood=kind==='food'?'provisions':undefined;
  noteRaidCarried(g,u,ruin.team,kind,count);
  u.order='return';u.pillage=-1;u.target=null;u.attackDestination=null;u.node=null;
  u.workReason='Carrying pillaged supplies home';
  if(u.team===0)g.banner(`Raider carrying ${count} ${kind} home — stores increase on delivery`,3);
  return true;
}


/** Exposed food remains finite after a raid and spoils where it was left. */
export function spoilRuinSupplies(g:Game,dt:number){
 if(!Number.isFinite(dt)||dt<=0)return;
 for(const b of g.state.buildings){
  if(b.hp>0||!b.raidLoot?.food)continue;
  const {temperature,humidity}=climateAt(g,b.x,b.z);
  const climate=Math.max(.12,Math.min(2.8,Math.pow(2,(temperature-12)/12)*(.65+humidity*.7)));
  // Mixed abandoned provisions have neither a roof nor maintained preservation.
  const remaining=b.raidLoot.food*Math.exp(-.0005*climate*dt);
  b.raidLoot.food=remaining<.01?0:remaining;
 }
}
