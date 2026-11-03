import type {Game} from './sim';
import type {Unit} from './types';
import {isDependent} from './settlement';

export const LOCAL_PEACE_PRESSURE_RULES={communityRadiusMeters:55,witnessRadiusMeters:26,civilianDefense:.25,minimumDefense:.5}as const;
const distance=(a:{x:number;y?:number;z:number},b:{x:number;y?:number;z:number})=>Math.hypot(a.x-b.x,(a.y||0)-(b.y||0),a.z-b.z);
const free=(u:Unit)=>u.hp>0&&(!u.prisoner||u.prisoner.phase==='released')&&!u.boat;
const armed=(u:Unit)=>!!u.militia||!['worker','leader'].includes(u.type);
const condition=(u:Unit)=>Math.max(0,Math.min(1,u.hp/Math.max(1,u.maxHp)));

/** Current coercion at an inhabited community, rather than a remote census.
 * This is not a report about the enemy's total or remembered military strength.
 * Withdrawal ends this immediate leverage; old intelligence is not erased. */
export function localPeacePressure(g:Game,team:number){
 const rules=LOCAL_PEACE_PRESSURE_RULES,home=g.campOf(team);
 const sites=[{x:home.x,y:g.height(home.x,home.z),z:home.z},...g.state.buildings.filter(b=>b.team===team&&b.type==='townhall'&&g.finished(b))];
 const defenders=g.state.units.filter(u=>u.team===team&&free(u)&&!isDependent(g,u)&&sites.some(s=>distance(u,s)<=rules.communityRadiusMeters));
 const attackers=g.state.units.filter(u=>u.team===0&&free(u)&&armed(u)&&!isDependent(g,u)&&sites.some(s=>distance(u,s)<=rules.communityRadiusMeters)&&defenders.some(w=>distance(u,w)<=rules.witnessRadiusMeters));
 const attackPower=attackers.reduce((sum,u)=>sum+condition(u),0),defensePower=defenders.reduce((sum,u)=>sum+condition(u)*(armed(u)?1:rules.civilianDefense),0);
 return{pressure:attackPower/Math.max(rules.minimumDefense,defensePower),attackPower,defensePower,observedAttackers:attackers.length,localDefenders:defenders.length,observedAt:g.state.time};
}
