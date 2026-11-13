/** Village identity beyond hue. Two villages can share a team colour (or a civ), so each village also gets a seeded heraldry:
 * a roof finial shape, a mast banner cut, and a roof-rim trim pattern. Pure and deterministic: (world seed, village id) -> same marks forever.
 * It never changes the civ's grammar, palette or footprint; it only adds small marks and picks which of the civ's existing styles is used. */
import {hashSeed} from './buildingParts';
export type Heraldry={/** roof finial: 0 spire, 1 ball, 2 block, 3 drum, 4 twin horns */shape:number;/** rim trim: 0 solid band, 1 beads, 2 double line, 3 teeth */trim:number;/** index into the six banner cuts */banner:number};
export const FINIAL_SHAPES=5,TRIM_PATTERNS=4,BANNER_CUTS=6;
export const BANNER_ORDER=['flag','swallow','hanging','streamers','pennant','twin'] as const;
/** Village ids are small integers (team / settlement id). The first villages are dealt distinct combinations (a stride coprime to each cycle) so that
 * neighbouring same-colour villages never collide; later ones fall back to the hash. */
export function villageHeraldry(worldSeed:number,village:number):Heraldry{
 const h=hashSeed(worldSeed,'heraldry',village),v=Math.abs(Math.floor(village));
 return {shape:(v*2+(h&1))%FINIAL_SHAPES,trim:(v+(h>>>3&1)*2)%TRIM_PATTERNS,banner:(v*5+(h>>>5&1))%BANNER_CUTS};
}
export const heraldryKey=(h:Heraldry|undefined)=>h?`h${h.shape}${h.trim}${h.banner}`:'';
/** Two villages look different beyond hue when at least two of the three marks differ. */
export function heraldryDistance(a:Heraldry,b:Heraldry){return(+(a.shape!==b.shape))+(+(a.trim!==b.trim))+(+(a.banner!==b.banner));}
