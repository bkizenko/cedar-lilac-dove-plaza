import type {Game} from './sim';
import type {Critter} from './types';
/** Hunters closing on one animal corner it: each extra hunter within reach of the chase slows the flight, down to a floor.
 * Fast prey (horse, deer) therefore needs several hunters, while slow boar and cattle can be taken by one. */
export const HUNT_PARTY_RULES={reachMeters:16,perHunter:.14,floor:.55} as const;
const FLEE_SPEED:Record<string,number>={horse:4.6,deer:4,cattle:3.3,boar:2.8};
/** Multiplier 0.55..1 on flee speed from hunters currently ordered onto this animal. */
export function huntPressure(g:Game,c:Critter){
 let n=0;const R=HUNT_PARTY_RULES.reachMeters;
 for(const u of g.state.units)if(u.hp>0&&u.order==='gather'&&u.node===(c as unknown)&&Math.hypot(u.x-c.x,u.z-c.z)<=R)n++;
 return n<=1?1:Math.max(HUNT_PARTY_RULES.floor,1-HUNT_PARTY_RULES.perHunter*(n-1));
}
/** Suggested number of hunters for a species: how many it takes to bring flee speed under ~3. */
export function recommendedHunters(species:string){
 const f=FLEE_SPEED[species]??2.5;return f<=3?1:Math.min(5,1+Math.ceil((1-3/f)/HUNT_PARTY_RULES.perHunter));
}
/** Living, visible members of the same herd as the given animals (herd = beh.grp, else same species within 22 m), nearest first, capped. */
export function herdMembers(g:Game,ids:number[],visible:(x:number,z:number)=>boolean,cap=12){
 const wild=g.state.wildlife,seeds=wild.filter(c=>ids.includes(c.id)&&c.hp>0),out=new Map<number,Critter>();
 for(const s of seeds){out.set(s.id,s);
  for(const m of wild){if(m.hp<=0||m.species==='bird'||m.species!==s.species||out.has(m.id)||!visible(m.x,m.z))continue;
   if(s.beh&&m.beh?s.beh.grp===m.beh.grp:Math.hypot(m.x-s.x,m.z-s.z)<22)out.set(m.id,m);}}
 return [...out.values()].slice(0,Math.max(cap,seeds.length));
}
