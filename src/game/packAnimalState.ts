import {herdRules} from './animalSpecies';
import type {Critter,Livestock,Unit} from './types';

export const PACK_ANIMAL_RULES={followMeters:2.1,hungerPerSecond:.055,feedPerSecond:.012,waterPerSecond:.004,
 hungerCapacityStarts:40,thirstGraceSeconds:180,thirstCapacityRangeSeconds:600,minimumCapacityMultiplier:1.25} as const;
export const PACK_HARNESS_RULES={refitSeconds:10} as const;
/** Missing receipt fields mean already observed legacy gear, never invented payment history. */
export type PackHarness={version:1;preparedAt?:number;wood?:number;workSeconds?:number};
export function validPackHarness(h:unknown,now=Infinity):h is PackHarness|undefined {
 if(h===undefined)return true;if(!h||typeof h!=='object'||Array.isArray(h))return false;const v=h as PackHarness;
 if(v.version!==1)return false;
 for(const key of ['preparedAt','wood','workSeconds'] as const)if(v[key]!==undefined&&(typeof v[key]!=='number'||!Number.isFinite(v[key])||v[key]!<0||v[key]!>(key==='preparedAt'?now:1e9)))return false;
 return true;
}
/** The same physical follow point used by the working-animal renderer. */
export function packAnimalPosition(u:Pick<Unit,'x'|'z'|'facing'|'boat'>){const offset=u.boat?.phase==='aboard'?0:PACK_ANIMAL_RULES.followMeters;return{x:u.x-Math.sin(u.facing)*offset,z:u.z-Math.cos(u.facing)*offset};}
export type PackAnimal={id:number;hp:number;maxHp:number;scale:number;species?:'goat'|'horse'|'cattle';
 sex?:'female'|'male';born?:number;tamedAt?:number;hunger?:number;thirstSeconds?:number;
 foodConsumed?:number;waterConsumedLiters?:number;
 packHarness?:PackHarness;milk?:number;pregnancy?:number;lactatingUntil?:number;adultScale?:number};
/** Keep the existing individual and reproductive reserves. Working animals do
 * not make road milk or accrue pen breeding progress; harnessing must not erase
 * the state already earned while they lived in pasture. */
export function packAnimalFrom(a:Critter&Partial<Pick<Livestock,'sex'|'born'|'tamedAt'|'hunger'|'thirstSeconds'|'milk'|'pregnancy'|'lactatingUntil'|'adultScale'|'packHarness'>>):PackAnimal {
 const prior=a as typeof a&Partial<PackAnimal>;
 return {...(a.packHarness?{packHarness:{...a.packHarness}}:{}),...Object.fromEntries((['milk','pregnancy','lactatingUntil','adultScale'] as const).filter(k=>a[k]!==undefined).map(k=>[k,a[k]])),id:a.id,hp:a.hp,maxHp:a.maxHp,scale:a.scale,species:a.species==='horse'||a.species==='cattle'?a.species:'goat',
 ...(a.sex!==undefined?{sex:a.sex}:{}),...(a.born!==undefined?{born:a.born}:{}),...(a.tamedAt!==undefined?{tamedAt:a.tamedAt}:{}),
 hunger:a.hunger??0,thirstSeconds:a.thirstSeconds??0,foodConsumed:prior.foodConsumed??0,waterConsumedLiters:prior.waterConsumedLiters??0};
}
/** Existing cargo stays owned even if the animal becomes less able to carry it. */
export function packCapacityMultiplier(u:Pick<Unit,'packAnimal'>){
 const a=u.packAnimal;if(!a||a.hp<=0||a.maxHp<=0)return 1;
 const hunger=Math.max(0,Math.min(1,((a.hunger??0)-PACK_ANIMAL_RULES.hungerCapacityStarts)/(100-PACK_ANIMAL_RULES.hungerCapacityStarts)));
 const thirst=Math.max(0,Math.min(1,((a.thirstSeconds??0)-PACK_ANIMAL_RULES.thirstGraceSeconds)/PACK_ANIMAL_RULES.thirstCapacityRangeSeconds));
 const condition=Math.max(0,Math.min(1,a.hp/a.maxHp));
 return PACK_ANIMAL_RULES.minimumCapacityMultiplier+(herdRules(a.species??'goat').packMultiplier-PACK_ANIMAL_RULES.minimumCapacityMultiplier)*Math.min(condition,1-hunger,1-thirst);
}
export function validPackAnimal(a:unknown,now=Infinity):a is PackAnimal {
 if(!a||typeof a!=='object'||Array.isArray(a))return false;const p=a as PackAnimal;
 if(!validPackHarness(p.packHarness,now))return false;
 const finite=(x:unknown)=>typeof x==='number'&&Number.isFinite(x);
 if(!Number.isSafeInteger(p.id)||p.id<1||!finite(p.hp)||!finite(p.maxHp)||p.hp<=0||p.hp>p.maxHp||p.maxHp>1000||!finite(p.scale)||p.scale<.1||p.scale>5)return false;
 if(p.species!==undefined&&!['goat','horse','cattle'].includes(p.species)||p.sex!==undefined&&!['female','male'].includes(p.sex))return false;
 if(p.milk!==undefined&&(!finite(p.milk)||p.milk<0||p.milk>herdRules(p.species).milkCapacity)||p.pregnancy!==undefined&&(!finite(p.pregnancy)||p.pregnancy<0||p.pregnancy>herdRules(p.species).gestation)||p.lactatingUntil!==undefined&&(!finite(p.lactatingUntil)||p.lactatingUntil<0||p.lactatingUntil>1e12)||p.adultScale!==undefined&&(!finite(p.adultScale)||p.adultScale<.3||p.adultScale>3))return false;
 for(const key of ['born','tamedAt'] as const)if(p[key]!==undefined&&!finite(p[key]))return false;
 for(const key of ['hunger','thirstSeconds','foodConsumed','waterConsumedLiters'] as const)if(p[key]!==undefined&&(!finite(p[key])||p[key]!<0||p[key]!>(key==='hunger'?100:1e12)))return false;
 return true;
}
