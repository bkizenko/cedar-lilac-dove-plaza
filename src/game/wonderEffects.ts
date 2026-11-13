import type {GameState} from './types';
import {wonderDef,type EffectId} from './wonderDefs';
import type {WonderRecord} from './wonderRecords';

/** Effect library: each effect is implemented once, parameterised by the registry rows, and read through the system it plugs into.
 * Nothing here is saved: every number is derived from the finished records in `state.wonders`, so old saves and new saves agree.
 *   prestige      pantry of renown: civicPrestige.ts counts finished wonders (condition-free, duplicates cannot exist: one per family per society)
 *   knowledge     villageWorkload production time (practice multiplier): residents learn and make faster
 *   storage       pantry.ts food loss rates (spoilage)
 *   concord       rulersRuntime.unrestOf: standing of the ruling house (legitimacy points)
 *   defence       sim.applyCombatDamage: damage to buildings and people near a finished wonder
 *   portCapacity  navalPorts.stowCapacity: food stowed per hull
 * Not-yet-possible effects are the registry `hooks` (docs/WONDERS_REGISTRY.md). */
type S=Pick<GameState,'wonders'>;
export const EFFECT_CAPS:Record<EffectId,number>={prestige:Infinity,knowledge:.3,storage:.4,concord:20,defence:.45,portCapacity:.5};
const standing=(s:S,team:number)=>(s.wonders??[]).filter((r:WonderRecord)=>r.team===team&&r.done!==undefined&&!r.project&&r.fallen===undefined);
export const standingWonders=(s:S,team:number)=>standing(s,team);
/** Combined strength of one effect for a society: fractions combine as 1-prod(1-a) (no stacking past the cap); standing and prestige add. */
export function wonderEffect(s:S,team:number,id:EffectId):number{
 const list=s.wonders;if(!list||list.length===0)return 0;
 let sum=0,keep=1;
 for(const r of standing(s,team))for(const e of wonderDef(r.family)?.effects??[])if(e.id===id){sum+=e.amount;keep*=1-e.amount;}
 if(id==='concord'||id==='prestige')return Math.min(EFFECT_CAPS[id],sum);
 if(id==='defence')return 0;
 return Math.min(EFFECT_CAPS[id],1-keep);
}
/** Prestige points a society's finished wonders add to civic works (era-scaled so a late wonder counts a little more). */
export function wonderPrestige(s:S,team:number):{total:number;rows:{id:string;points:number}[]}{
 const rows=standing(s,team).map(r=>({id:r.family,points:Math.round((wonderDef(r.family)?.effects.find(e=>e.id==='prestige')?.amount??0)*(1+.08*Math.min(5,r.era??0)))})).filter(r=>r.points>0);
 return{total:rows.reduce((n,r)=>n+r.points,0),rows};
}
/** Damage multiplier (<=1) for a building or person at (x,z) of `team` near that society's finished defence wonders. */
export function wonderDefenceFactor(s:S,team:number,x:number,z:number):number{
 const list=s.wonders;if(!list||list.length===0)return 1;
 let keep=1;
 for(const r of standing(s,team))for(const e of wonderDef(r.family)?.effects??[])if(e.id==='defence'&&Math.hypot(r.x-x,r.z-z)<=(e.radius??0))keep*=1-e.amount;
 return Math.max(1-EFFECT_CAPS.defence,keep);
}
/** What a society's wonders do now, in words (read model and Wonders panel). */
export function wonderEffectRows(s:S,team:number):{id:string;label:string;words:string[]}[]{
 return standing(s,team).map(r=>{const d=wonderDef(r.family);return{id:r.family,label:d?.label??r.family,words:(d?.effects??[]).filter(e=>e.id!=='prestige').map(e=>e.words)};});
}
