import type {Game} from './sim';
import {FORTIFICATIONS} from './fortifications';
import type {BldType} from './types';
import {AGE_COST,BUILDINGS} from './constants';
import {foodDemand} from './settlement';

export const AGE_FOOD_BUFFER_SECONDS=300;
export const AGE_BUILDING_VARIETY=[0,4,5,6,7,8];

/** All prerequisites are available in the current era. These are working civic
 * institutions, not points, a timer, or ore locked behind the destination age. */
export function missingAgeBuildings(g:Game,team:number):BldType[]{
  const age=g.tribe(team).age;
  if(age>=5)return [];
  const built=new Set(g.state.buildings.filter(b=>b.team===team&&g.finished(b)&&!FORTIFICATIONS.includes(b.type)).map(b=>b.type));
  const needed:BldType[]=['warehouse','workshop'];
  if(age>=1)needed.push('forge');
  if(age===3&&!built.has('market')&&!built.has('temple'))needed.push('market');
  if(age>=4)needed.push('market','temple');
  return needed.filter(type=>!built.has(type));
}
export function ageInfrastructureIssue(g:Game,team:number):string|null{
  const missing=missingAgeBuildings(g,team);
  if(missing.length)return `Complete ${missing.map(type=>BUILDINGS[type].name).join(' and ')} before advancing`;
  const kinds=new Set(g.state.buildings.filter(b=>b.team===team&&g.finished(b)&&!FORTIFICATIONS.includes(b.type)).map(b=>b.type));
  const required=AGE_BUILDING_VARIETY[g.tribe(team).age+1]||0;
  return kinds.size<required?`Need ${required} different completed building types (${kinds.size} standing)`:null;
}
export function ageFoodReserve(g:Game,team:number){return Math.ceil(foodDemand(g,team)*AGE_FOOD_BUFFER_SECONDS);}
export function ageReserveIssue(g:Game,team:number):string|null{
  const t=g.tribe(team),cost=AGE_COST[t.age+1];
  if(!cost)return null;
  const buffer=ageFoodReserve(g,team),needed=(cost.food||0)+buffer;
  if(t.food>=needed)return null;
  const storage=g.stockCap(team)<needed?' Expand food storage to hold that reserve.':'';
  return `Keep ${buffer} food for your people after advancing — need ${needed} food in total.${storage}`;
}
