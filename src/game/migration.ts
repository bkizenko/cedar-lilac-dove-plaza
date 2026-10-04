import type {Game} from './sim';
import {reserveSeconds} from './settlement';
/** Attraction follows lived conditions and neighbours' experience, not an earned currency. */
export function villageAppeal(g:Game,team=0){
 const people=g.state.units.filter(u=>u.team===team&&u.hp>0);
 if(!people.length)return 0;
 const avg=(f:(u:typeof people[number])=>number)=>people.reduce((n,u)=>n+f(u),0)/people.length;
 const meals=Math.min(1,reserveSeconds(g,team)/480);
 const health=avg(u=>u.hp/u.maxHp),rest=1-avg(u=>u.fatigue||0);
 const housing=Math.max(0,Math.min(1,(g.popCap(team)-people.length)/4));
 const neighbours=g.state.tribes.filter(t=>t.id!==team&&t.id!==3&&t.alive);
 const reputation=neighbours.length?neighbours.reduce((n,t)=>n+((t.trust||0)+1)/2,0)/neighbours.length:.5;
 const danger=people.some(u=>g.state.units.some(v=>v.hp>0&&g.isFoe(team,v.team)&&Math.hypot(u.x-v.x,u.z-v.z)<30));
 return Math.max(0,Math.min(1,meals*.3+health*.2+rest*.15+housing*.15+reputation*.1+(danger?0:.1)));
}
