import type {Game} from './sim';
import type {Unit} from './types';
import {acceptCapitulation,measureFront,CAPITULATION_RULES,type CapitulationFront,type CapitulationOutcome} from './capitulation';
import {isDependent} from './settlement';
import {personName} from './people';
import {mulberry32} from './rng';
import type {PrisonerUnit} from './captivity';
import {foodInventory} from './pantry';

/**
 * Conquest on top of natural capitulation (capitulation.ts). The defenders offer terms only when their will is broken
 * against the player's local superiority; this module adds the player's choice about the people and what follows:
 *  - Annex: buildings, stores and people join the player's tribe (existing community handover).
 *  - Puppet: the town keeps its people and buildings and pays tribute while the garrison holds.
 *  - Pillage: goods are carried off, nothing is taken over.
 * People policy after an annexation: integrate everyone, execute the armed adults and integrate the rest, or spare all
 * with a chance of later rebellion. Captured people carry their tribe's name after their own for one more generation.
 */
export type ConquestChoice='annex'|'puppet'|'pillage';
export type ConquestPeople='integrate'|'execute'|'spare';
export const CONQUEST_RULES={version:1,rebellionPerSecond:1/1500,rebelMinimum:2,tickSeconds:1} as const;
const OUTCOME:Record<ConquestChoice,CapitulationOutcome>={annex:'annex',puppet:'puppet',pillage:'loot'};
const armedAdult=(g:Game,u:Unit)=>!isDependent(g,u)&&(!!u.militia||!['worker','leader'].includes(u.type));
const fronts=(g:Game)=>(g.state as unknown as {capitulation?:{fronts:CapitulationFront[]}}).capitulation?.fronts??[];

/** What the player can see about one beaten-or-not community: strength against theirs, the will left in them, and an open offer if any. */
export function conquestAssessment(g:Game,team:number){
 const f=[...fronts(g)].reverse().find(x=>x.attackerTeam===0&&x.defenderTeam===team&&(x.phase==='pressed'||x.phase==='capitulated'));
 if(!f)return undefined;
 const m=measureFront(g,f),will=Math.max(0,Math.min(1,1-f.score/Math.max(.01,f.threshold)));
 return{frontId:f.id,phase:f.phase as 'pressed'|'capitulated',offer:f.phase==='capitulated',
  ratio:Math.round(f.ratio*100)/100,needRatio:CAPITULATION_RULES.minimumRatio,
  /** 0..100: how much fight is left in them (0 = ready to yield). */
  willLeft:Math.round(will*100),
  factors:{armedPresent:m.attackers.length,armedDefending:m.armedNow,fallen:f.casualties,buildingsLost:Math.round(f.buildingLoss*100),starving:m.starving,unrelieved:f.unrelievedSeconds>=CAPITULATION_RULES.unrelievedFullSeconds/2},
  reason:f.reason,expiresIn:f.phase==='capitulated'?Math.max(0,Math.ceil((f.expiresAt??0)-g.state.time)):0};
}
/** A local annexation moves the town's own people and buildings; the society-wide stores follow in proportion to the people who joined (all of them if no other town of that society remains). */
function transferShareOfStores(g:Game,from:number,share:number){
 const a=g.tribe(from),b=g.tribe(0);if(!a||!(share>0))return;
 const moved:Record<string,number>={};
 for(const k of['wood','stone','copper','iron','spears','bows','blades'] as const){const n=Math.floor((a[k]||0)*share);if(n>0){a[k]-=n;b[k]+=n;moved[k]=n;}}
 const lotsA=foodInventory(a),lotsB=foodInventory(b);let food=0;
 for(const k of Object.keys(lotsA) as (keyof typeof lotsA)[]){const n=(lotsA[k]||0)*share;if(n>0){lotsA[k]-=n;lotsB[k]+=n;food+=n;}}
 a.food=Math.max(0,a.food-food);b.food+=food;a.foodLots=lotsA;b.foodLots=lotsB;moved.food=Math.floor(food);
 return moved;
}
export function acceptConquest(g:Game,frontId:number,choice:ConquestChoice,people:ConquestPeople='integrate'){
 const f=fronts(g).find(x=>x.id===frontId);
 if(!f||f.attackerTeam!==0)return{accepted:false,reason:'No surrender offered to you here'};
 if(!OUTCOME[choice])return{accepted:false,reason:'Choose annex, puppet or pillage'};
 const name=g.tribe(f.defenderTeam)?.name??'A community',ids=new Set(f.residentIds);
 const remainingBefore=g.state.units.filter(u=>u.team===f.defenderTeam&&u.hp>0&&!ids.has(u.id)&&!(u as PrisonerUnit).prisoner).length;
 const r=acceptCapitulation(g,frontId,OUTCOME[choice],0);
 if(!r.accepted||choice!=='annex')return r;
 const joined=g.state.units.filter(u=>ids.has(u.id)&&u.team===0&&u.hp>0&&!(u as PrisonerUnit).prisoner);
 let executed=0,spared=0;
 for(const u of joined){
  u.originTribe={name,gen:0};
  if(people==='execute'&&armedAdult(g,u)){g.applyCombatDamage(f.attackerTeam,u,u.maxHp*100);executed++;continue;}
  if(armedAdult(g,u)){u.militia=false;}
  if(people==='spare'&&!isDependent(g,u)){u.originTribe.rebel=true;spared++;}
 }
 const moved=transferShareOfStores(g,f.defenderTeam,joined.length/Math.max(1,joined.length+remainingBefore));
 const reason=people==='execute'?`${name} annexed; ${executed} warriors were put to death and the rest joined you`:people==='spare'?`${name} annexed; everyone was spared, but some may rise again`:`${name} annexed; its people joined you`;
 g.banner(reason,10);
 return{...r,reason,people,executed,spared,joined:joined.length-executed,stores:moved};
}
/** Spared adults can rebel together: a deterministic roll per second, then every rebel from the same tribe takes up arms against us. */
export function tickConquestRebellion(g:Game){
 const rebels=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.originTribe?.rebel);
 if(rebels.length<1)return 0;
 const roll=mulberry32((Math.floor(g.state.time)*2654435761)>>>0)();
 const chance=1-Math.pow(1-CONQUEST_RULES.rebellionPerSecond,rebels.length*CONQUEST_RULES.tickSeconds);
 if(roll>=chance)return 0;
 const tribe=rebels[Math.floor(roll/chance*rebels.length)%rebels.length].originTribe!.name,band=rebels.filter(u=>u.originTribe!.name===tribe);
 for(const u of band){
  g.interruptMission(u);u.team=3;u.originTribe={name:tribe,gen:0};u.homeHall=undefined;u.homeCamp=undefined;u.militia=true;u.selected=false;u.job=null;u.jobLock=false;
  u.target=null;u.node=null;u.pillage=-1;u.emergency=undefined;u.order='attack';u.workReason='Rebelling against the conquerors';
 }
 g.banner(`${tribe} rebels: ${band.length} people you spared take up arms`,10);
 return band.length;
}
