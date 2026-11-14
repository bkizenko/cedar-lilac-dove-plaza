import type {Game} from './sim';
import type {GameState} from './types';
import {PRODUCTION_RECIPES,type ProductionRecipe} from './production';
/** Watching skilled work is the weakest way to learn: it makes a method "partly
 * known" with a named source. It never grants a recipe, a receipt or a unit skill;
 * only an actual delivered batch, lesson, trade or capture does that. */
export type ObservedMethod={seconds:number;firstAt:number;lastAt:number;sourceTeam:number;sourceName:string;sourcePersonId?:number};
export const OBSERVATION_RULES={radius:10,interval:2,maximumSeconds:1e6} as const;
const lastScan=new WeakMap<GameState,number>();
export function tickObservedMethods(g:Game){
 const s=g.state,projects=s.production?.projects;if(!projects?.length)return;
 const now=s.time,prev=lastScan.get(s);if(prev!==undefined&&now-prev<OBSERVATION_RULES.interval&&now>=prev)return;lastScan.set(s,now);
 const dt=prev===undefined||now<prev?OBSERVATION_RULES.interval:Math.min(now-prev,10),r2=OBSERVATION_RULES.radius**2;
 for(const p of projects){
  if(p.phase!=='working'||p.actorId==null)continue;
  const maker=s.units.find(u=>u.id===p.actorId&&u.hp>0);if(!maker)continue;
  for(const u of s.units){
   if(u.id===maker.id||u.hp<=0||u.prisoner||(u.x-maker.x)**2+(u.z-maker.z)**2>r2)continue;
   const t=g.tribe(u.team);if(!t||(t.productionPractice?.[p.recipe]?.batches||0)>0)continue;
   const book=t.observedMethods??={},old=book[p.recipe];
   if(old&&old.sourceTeam===maker.team&&old.sourcePersonId===maker.id||!old)book[p.recipe]=old?{...old,seconds:Math.min(OBSERVATION_RULES.maximumSeconds,old.seconds+dt),lastAt:now}:{seconds:dt,firstAt:now,lastAt:now,sourceTeam:maker.team,sourceName:maker.team===u.team?'a skilled resident':g.tribe(maker.team)?.name||'another society',sourcePersonId:maker.id};
  }
 }
}
export function observedMethod(g:Game,team:number,recipe:ProductionRecipe){return g.tribe(team)?.observedMethods?.[recipe];}
export function validObservedMethods(s:GameState){
 const n=(v:unknown,hi=1e12)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=hi;
 for(const t of s.tribes){const b=t.observedMethods;if(b===undefined)continue;if(!b||typeof b!=='object'||Array.isArray(b))return false;
  for(const[k,v]of Object.entries(b)){if(!Object.hasOwn(PRODUCTION_RECIPES,k)||!v||typeof v!=='object')return false;
   if(!n(v.seconds,OBSERVATION_RULES.maximumSeconds)||!n(v.firstAt)||!n(v.lastAt)||v.lastAt<v.firstAt||v.lastAt>s.time+1||!s.tribes.some(x=>x.id===v.sourceTeam)||typeof v.sourceName!=='string'||v.sourceName.length>80||v.sourcePersonId!==undefined&&!n(v.sourcePersonId))return false;}}
 return true;
}
