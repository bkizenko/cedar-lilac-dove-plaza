import type {Game} from './sim';
import type {Unit} from './types';
import {hash32} from './rulerCore';
import {isDependent} from './settlement';
import {hasTaskCommitment} from './workCommitments';
import {connectedForUnit} from './waterTravel';
import type {WonderRecord} from './wonderRecords';
import {wonderDef,stageGoods,type Good,type WonderCost,type WonderId} from './wonderDefs';

/** Founding wonders: a society that is old enough, big enough and rich enough raises one great work.
 *
 * Nothing is free and nothing appears. A wonder needs
 *  - era: the society has reached the wonder's `minAge` and holds a finished town hall,
 *  - labour: at least `minPeople` living working-age residents and the wonder's `crew.min` idle workers to walk out and build,
 *  - goods: real wood, stone, food (and copper or iron where the wonder asks) come out of the society's own stock STAGE BY STAGE: the first stage when
 *    work starts, each later stage when a crew member stands at the site and the stock holds it; a reserve is always kept,
 *  - ground: the wonder's own site requirement (wonderDefs.SiteReq / wonderSites.siteIssues) passes on dry, unbuilt, explored land.
 * The crew walks to the site and adds real seconds of labour (`need`); progress follows the labour paid and the layer draws the stage reached. Rivals choose
 * from the same registry through suggest mode (seeded, no random numbers); the player's own wonders start only by command.
 * Switch: `state.wonderFounding.enabled`. It is created on the first tick of a new game; saves without it keep the legacy behaviour (no wonders). */
export const WONDER_RULES={
 version:2,minPeople:30,minCrew:3,
 /** keep this much after paying */
 reserve:{wood:40,stone:20,food:150},
 footprint:{w:32,d:32},
 maxPerTeam:4,maxTotal:16,cooldownSeconds:540,
 planEvery:10,workEvery:2,
 ringsMetres:[45,70,95,130,170,210,260,300],anglesPerRing:16,retrySeconds:600,spacingFromWonder:90,spacingFromStation:40,clearOfBuildings:10,
 workRadius:7,suggestTtlSeconds:45,
} as const;
export type WonderFoundingState={version:1;enabled:boolean;nextId:number;lastStart:Record<string,number>;/** fame tiers already told to the player, by `${society}:${wonderId}` */notices?:Record<string,string>};
export type WState={wonders?:WonderRecord[];wonderFounding?:WonderFoundingState};
export const st=(g:Pick<Game,'state'>)=>g.state as Game['state']&WState;
export const wondersOf=(g:Pick<Game,'state'>):readonly WonderRecord[]=>st(g).wonders??[];
export const wonderFoundingEnabled=(g:Pick<Game,'state'>)=>st(g).wonderFounding?.enabled===true;
export function setWonderFoundingEnabled(g:Game,on:boolean){const s=st(g);const w=s.wonderFounding??(s.wonderFounding={version:1,enabled:false,nextId:1+Math.max(0,...(s.wonders??[]).map(r=>r.id)),lastStart:{}});w.enabled=!!on;}
export {wonderLabel} from './wonderDefs';
/** Total goods and labour of a wonder (copper and iron only where it asks). */
export function wonderCost(f:WonderId):WonderCost{const d=wonderDef(f);if(!d)return{wood:0,stone:0,food:0,labour:0};return{...d.cost};}
export const livingWorkers=(g:Game,team:number)=>g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u));
export const tribeOk=(g:Game,team:number)=>team>=0&&team!==3&&!!g.tribe(team)&&g.tribe(team).alive!==false;
export function eligibleCrew(g:Game,u:Unit,team:number,x:number,z:number){
 return u.team===team&&u.hp>0&&u.type==='worker'&&!u.militia&&!isDependent(g,u)&&!u.boat&&!hasTaskCommitment(u)&&!u.envoy&&!u.visit&&!u.trade&&!u.scout&&!u.expedition&&!u.emergency&&
  (u.order==='idle'||u.order==='hold'||u.order==='gather')&&(u.carry||0)===0&&Math.hypot(u.x-x,u.z-z)<600&&connectedForUnit(g,u,x,z);
}
/** Raising or standing; a fallen wonder (its society gone) no longer counts. */
export const liveWonders=(g:Pick<Game,'state'>)=>wondersOf(g).filter(r=>r.fallen===undefined);
export const activeWonder=(g:Pick<Game,'state'>,team:number)=>liveWonders(g).find(r=>r.team===team&&r.project);
export const townHall=(g:Game,team:number)=>g.state.buildings.find(b=>b.team===team&&b.type==='townhall'&&b.hp>0&&g.finished(b));
type Stock={wood:number;stone:number;food:number;copper:number;iron:number};
/** Which good is short for a delivery of `need` (null = the stock holds it with the reserve kept). */
export function goodsShort(t:Stock,need:Partial<Record<Good,number>>):string|null{
 const r=WONDER_RULES.reserve;
 if((need.wood??0)>0&&t.wood<(need.wood??0)+r.wood)return `Needs ${need.wood} wood (and ${r.wood} kept in reserve)`;
 if((need.stone??0)>0&&t.stone<(need.stone??0)+r.stone)return `Needs ${need.stone} stone (and ${r.stone} kept in reserve)`;
 if((need.food??0)>0&&t.food<(need.food??0)+r.food)return `Needs ${need.food} food (and ${r.food} kept in reserve)`;
 if((need.copper??0)>0&&(t.copper||0)<(need.copper??0))return `Needs ${need.copper} copper`;
 if((need.iron??0)>0&&(t.iron||0)<(need.iron??0))return `Needs ${need.iron} iron`;
 return null;
}
export const goodsMissing=(t:Stock,family:string,stage=0)=>goodsShort(t,stageGoods(family,stage));

/** Why this society cannot found a wonder now (null = it can start). Shared by the rival planner, suggest mode and the player's command. */
export function wonderFoundingIssue(g:Game,team:number,family?:WonderId):string|null{
 const R=WONDER_RULES;
 if(!wonderFoundingEnabled(g))return 'Wonders are not enabled for this save';
 if(!tribeOk(g,team))return 'No society to build it';
 const t=g.tribe(team),mine=liveWonders(g).filter(r=>r.team===team),def=family?wonderDef(family):undefined;
 if(family&&!def)return 'Unknown wonder';
 if(t.age<(def?.minAge??2))return 'The society has not reached the age of great works';
 if(!townHall(g,team))return 'A wonder needs a finished town hall';
 if(activeWonder(g,team))return 'A wonder is already rising';
 if(mine.length>=R.maxPerTeam||liveWonders(g).length>=R.maxTotal)return 'No more wonders can stand here';
 if(def&&mine.some(r=>r.family===family))return `You already hold a ${def.label}`;
 if(def?.earthworks)return `A ${def.label} needs earthworks that are not yet commissioned`;
 const last=st(g).wonderFounding?.lastStart[String(team)];if(last!==undefined&&g.state.time-last<R.cooldownSeconds)return 'The people need time to recover from the last great work';
 if(livingWorkers(g,team).length<R.minPeople)return `A wonder needs at least ${R.minPeople} working hands`;
 const hall=townHall(g,team)!,crew=def?.crew.min??R.minCrew;
 if(g.state.units.filter(u=>eligibleCrew(g,u,team,hall.x,hall.z)).length<crew)return `A wonder needs ${crew} free hands to raise it`;
 if(family){const miss=goodsMissing(t as never,family,0);if(miss)return miss;}
 return null;
}
export const wonderSeedFor=(g:Game,id:number)=>hash32('wonder-seed',g.state.seed,id)>>>0;
