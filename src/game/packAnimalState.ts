import {herdRules} from './animalSpecies';
import type {Critter,Livestock,Unit} from './types';

export const PACK_ANIMAL_RULES={hungerPerSecond:.055,feedPerSecond:.012,waterPerSecond:.004,
 hungerCapacityStarts:40,thirstGraceSeconds:180,thirstCapacityRangeSeconds:600,minimumCapacityMultiplier:1.25} as const;
export type PackAnimal={id:number;hp:number;maxHp:number;scale:number;species?:'goat'|'horse'|'cattle';
 sex?:'female'|'male';born?:number;tamedAt?:number;hunger?:number;thirstSeconds?:number;
 foodConsumed?:number;waterConsumedLiters?:number;
 milk?:number;pregnancy?:number;lactatingUntil?:number;adultScale?:number};
/** Keep the existing individual and reproductive reserves. Working animals do
 * not make road milk or accrue pen breeding progress; harnessing must not erase
 * the state already earned while they lived in pasture. */
export function packAnimalFrom(a:Critter&Partial<Pick<Livestock,'sex'|'born'|'tamedAt'|'hunger'|'thirstSeconds'|'milk'|'pregnancy'|'lactatingUntil'|'adultScale'>>):PackAnimal {
 const prior=a as typeof a&Partial<PackAnimal>;
 return {...Object.fromEntries((['milk','pregnancy','lactatingUntil','adultScale'] as const).filter(k=>a[k]!==undefined).map(k=>[k,a[k]])),id:a.id,hp:a.hp,maxHp:a.maxHp,scale:a.scale,species:a.species==='horse'||a.species==='cattle'?a.species:'goat',
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
export function validPackAnimal(a:unknown):a is PackAnimal {
 if(!a||typeof a!=='object'||Array.isArray(a))return false;const p=a as PackAnimal;
 const finite=(x:unknown)=>typeof x==='number'&&Number.isFinite(x);
 if(!Number.isSafeInteger(p.id)||p.id<1||!finite(p.hp)||!finite(p.maxHp)||p.hp<=0||p.hp>p.maxHp||p.maxHp>1000||!finite(p.scale)||p.scale<.1||p.scale>5)return false;
 if(p.species!==undefined&&!['goat','horse','cattle'].includes(p.species)||p.sex!==undefined&&!['female','male'].includes(p.sex))return false;
 if(p.milk!==undefined&&(!finite(p.milk)||p.milk<0||p.milk>herdRules(p.species).milkCapacity)||p.pregnancy!==undefined&&(!finite(p.pregnancy)||p.pregnancy<0||p.pregnancy>herdRules(p.species).gestation)||p.lactatingUntil!==undefined&&(!finite(p.lactatingUntil)||p.lactatingUntil<0||p.lactatingUntil>1e12)||p.adultScale!==undefined&&(!finite(p.adultScale)||p.adultScale<.3||p.adultScale>3))return false;
 for(const key of ['born','tamedAt'] as const)if(p[key]!==undefined&&!finite(p[key]))return false;
 for(const key of ['hunger','thirstSeconds','foodConsumed','waterConsumedLiters'] as const)if(p[key]!==undefined&&(!finite(p[key])||p[key]!<0||p[key]!>(key==='hunger'?100:1e12)))return false;
 return true;
}
