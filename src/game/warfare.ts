import type {Game} from './sim';
import type {Unit,ResKind} from './types';
import {isDependent} from './settlement';
import {predisposition} from './people';
export const WEAPONS={
  spear:{name:'Stone spear',wood:4,stone:1,copper:0,iron:0,age:0,seconds:24},
  bow:{name:'Hunting bow',wood:6,stone:1,copper:0,iron:0,age:0,seconds:36},
  blade:{name:'Metal blade',wood:4,stone:0,copper:6,iron:0,age:1,seconds:48},
} as const;
export type WeaponKind=keyof typeof WEAPONS;
export function beginWeaponWork(g:Game,kind:WeaponKind,team=0){
  const spec=WEAPONS[kind],t=g.tribe(team);
  if(!spec||!t)return false;
  const reject=(reason:string)=>{if(team===0){g.banner(reason,3);g.onSfx('invalid');}return false;};
  if(t.age<spec.age)return reject('Metalworking needs the Bronze Age; stone spears and bows are available now');
  const work=g.state.buildings.filter(b=>b.team===team&&g.finished(b)&&
    (kind==='blade'?b.type==='forge':['townhall','barracks'].includes(b.type)));
  if(!work.length)return reject(kind==='blade'?'Build a forge for metal blades':'Finish a hall or barracks for weapon making');
  const u=g.state.units.find(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)&&u.carry===0&&!u.weaponWork&&!u.studyCrop&&!u.drill&&!u.expedition&&!u.envoy&&!u.scout&&!u.visit&&!u.emergency&&!u.foundingJourney&&['idle','gather','hold'].includes(u.order)&&work.some(b=>!!g.interactionSpot(u,b)));
  if(!u)return reject('An available adult with empty hands and a reachable workplace is needed');
  if(t.wood<spec.wood||t.stone<spec.stone||t.copper<spec.copper)return reject(`Need ${spec.wood} logs${spec.stone?' and '+spec.stone+' stone':''}${spec.copper?' and '+spec.copper+' copper':''}`);
  const workplace=work.sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
  t.wood-=spec.wood;t.stone-=spec.stone;t.copper-=spec.copper;
  u.weaponWork={kind,progress:0,duration:spec.seconds,workplace:workplace.id};
  u.order='hold';u.node=null;u.target=null;u.workReason=`Making ${spec.name.toLowerCase()} — walking to the workplace`;
  if(team===0)g.banner(`${spec.name}: materials reserved; one adult leaves other work to craft it`,3);
  return true;
}
export function weaponWorkAI(g:Game,u:Unit,dt:number){
  const job=u.weaponWork;
  if(!job||u.type!=='worker'||u.order!=='hold')return false;
  const b=g.state.buildings.find(b=>b.id===job.workplace&&b.team===u.team&&g.finished(b));
  const spot=b&&g.interactionSpot(u,b);
  if(!b||!spot){u.workReason='Weapon work paused — workplace lost or inaccessible';return true;}
  if(g.state.weather==='storm'||g.clockState().period==='Night'&&!g.state.nightWork)return false;
  if(!g.buildingWorkReached(u,b)){u.tx=spot.x;u.tz=spot.z;g.steer(u,dt);return true;}
  job.progress=Math.min(job.duration,job.progress+dt*predisposition(u).strength);
  u.stride+=dt*5;u.facing=Math.atan2(b.x-u.x,b.z-u.z);
  u.workReason=`Making ${WEAPONS[job.kind].name.toLowerCase()} · ${Math.floor(100*job.progress/job.duration)}%`;
  if(job.progress>=job.duration){
    const key=job.kind==='spear'?'spears':job.kind==='bow'?'bows':'blades';g.tribe(u.team)[key]++;
    u.weaponWork=undefined;u.order='idle';u.workReason='Weapon ready in village stores';g.workBoard.reset();
    if(u.team===0){g.banner(`${WEAPONS[job.kind].name} ready — select adults and arm them`,3);g.onSfx('place');}
  }
  return true;
}
/** Skills come from actual fighting; no population or healing is awarded. */
export function combatPractice(u:Unit){return 1+Math.min(5,Math.floor(Math.sqrt((u.combatXP||0)/6)))*.05;}
/** Ruins contain finite goods. Loading interrupts a raid for a physical return trip. */
export function raidLootAI(g:Game,u:Unit,dt:number){
  if(u.team===3||u.pillage<0||u.carry>0||!['attack','attackmove','idle'].includes(u.order))return false;
  const ruin=g.state.buildings.filter(b=>b.hp<=0&&b.team===u.pillage&&b.lootTeam===u.team&&b.raidLoot&&Object.values(b.raidLoot).some(n=>(n||0)>0)&&Math.hypot(u.x-b.x,u.z-b.z)<18)
    .sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];
  if(!ruin)return false;
  // An engaged defender must be dealt with before anyone stops to load supplies.
  if(g.state.units.some(e=>e.hp>0&&g.isFoe(u.team,e.team)&&Math.hypot(e.x-u.x,e.z-u.z)<7))return false;
  if(g.attackDistance(u,ruin)>u.r+1.8){const spot=g.nearestWalk(u,ruin.x,ruin.z);if(!spot)return false;u.tx=spot.x;u.tz=spot.z;g.steer(u,dt);u.workReason='Collecting supplies from the ruined store';return true;}
  const kind=(['food','wood','stone','copper','iron'] as ResKind[]).find(k=>(ruin.raidLoot![k]||0)>0);
  if(!kind)return false;
  const count=Math.min(12,ruin.raidLoot![kind]!);ruin.raidLoot![kind]!-=count;
  u.carry=count;u.carryType=kind;u.carryFood=kind==='food'?'provisions':undefined;
  u.order='return';u.pillage=-1;u.target=null;u.attackDestination=null;u.node=null;
  u.workReason='Carrying pillaged supplies home';
  if(u.team===0)g.banner(`Raider carrying ${count} ${kind} home — stores increase on delivery`,3);
  return true;
}
