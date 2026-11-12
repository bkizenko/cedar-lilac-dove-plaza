import type {Game} from './sim';
/**
 * G11 village personalities: three seeded multipliers per society, a pure function of (world seed, team).
 * Consumers scale their own rates by them; nothing is stored, so old saves are unchanged.
 * sociability: how often the society reviews and proposes trades, and how readily it accepts one.
 * boldness: willingness to accept risk (fewer escorts wanted) and, for the raid owner to consume, raid propensity.
 * caution: stock held back (reserve scale).
 */
export type VillagePersonality={sociability:number;boldness:number;caution:number};
function unit(seed:number,a:number,b:number){let h=(seed^Math.imul(a+1,0x9e3779b1)^Math.imul(b+31,0x85ebca6b))>>>0;h=Math.imul(h^(h>>>15),0x2c1b3c6d)>>>0;h=Math.imul(h^(h>>>12),0x297a2d39)>>>0;return((h^(h>>>15))>>>0)/4294967296;}
export function villagePersonality(g:Game,team:number):VillagePersonality{const s=g.state.seed|0;return{sociability:.6+.8*unit(s,team,1),boldness:.6+.8*unit(s,team,2),caution:.8+.4*unit(s,team,3)};}
/** Raid owners should multiply their raid launch rate by this; it is exported here so no raid file is edited by this lane. */
export const raidPropensity=(g:Game,team:number)=>villagePersonality(g,team).boldness;
