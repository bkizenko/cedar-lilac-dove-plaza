/** Click a person, then a building: that person works there.
 *  A direct player order wins over automation (directedWork.freeForDirectedWork releases soft commitments only).
 *  At a production workplace the person resumes a paused or stored batch here; with none, they walk to the door and wait for
 *  the player's job choice in the building panel. No recipe is auto-started, so no stock is spent without a deliberate choice. */
import type {Game} from './sim';
import type {Building,Unit} from './types';
import {PRODUCTION_RECIPES,resumeProduction,type ProductionRecipe} from './production';
import {directedBlocker,freeForDirectedWork} from './directedWork';
import {BUILDINGS} from './constants';

export type WorkAtResult={accepted:boolean;reason:string;started:number;standingBy:number};
export const recipesAt=(type:string):ProductionRecipe[]=>(Object.keys(PRODUCTION_RECIPES) as ProductionRecipe[]).filter(k=>PRODUCTION_RECIPES[k].workplace===type);
/** True when a right-click on this own building should mean "work here" for selected residents. */
export function isWorkplaceTarget(g:Game,b:Building){return b.team===0&&b.hp>0&&g.finished(b)&&recipesAt(b.type).length>0&&g.resKind(b)===null;}

export function orderWorkAtBuilding(g:Game,b:Building,units:Unit[]):WorkAtResult{
 const fail=(reason:string):WorkAtResult=>{g.banner(reason,4);g.onSfx('invalid');return{accepted:false,reason,started:0,standingBy:0};};
 if(b.team!==0||b.hp<=0||!g.finished(b))return fail('Only a finished workplace of your own can take work');
 const recipes=recipesAt(b.type);if(!recipes.length)return fail(`${BUILDINGS[b.type].name} has no job to give directly`);
 const people=units.filter(u=>u.team===0&&u.hp>0);if(!people.length)return fail('Select a resident first, then choose the workplace');
 let started=0,standingBy=0,lastIssue='';const name=BUILDINGS[b.type].name.toLowerCase();
 for(const u of people){
  const blocker=directedBlocker(g,u);if(blocker){lastIssue=blocker;continue;}
  if(!freeForDirectedWork(g,u)){lastIssue='That person cannot take this work now';continue;}
  const paused=(g.state.production?.projects||[]).find(p=>p.team===0&&p.workplace===b.id&&(p.phase==='paused'||p.phase==='stored')&&!p.actorId);
  if(paused&&resumeProduction(g,paused.id,u.id)){started++;continue;}
  lastIssue=`Choose a job in the ${name} panel; ${u.name||'this resident'} waits at the door`;
  const spot=g.interactionSpot(u,b);if(spot){u.order='move';u.tx=spot.x;u.tz=spot.z;u.workReason=`Standing by at the ${name} · ${lastIssue}`;standingBy++;}
 }
 if(started){const reason=`${started} resumed paid work at the ${name}`;g.banner(reason,2);return{accepted:true,reason,started,standingBy};}
 if(standingBy){const reason=lastIssue;g.banner(reason,4);return{accepted:true,reason,started,standingBy};}
 return fail(lastIssue||`Nobody selected can work at the ${name}`);
}
