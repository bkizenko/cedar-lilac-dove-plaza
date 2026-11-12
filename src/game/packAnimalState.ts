import type {Critter,Livestock,Unit} from './types';

export const PACK_ANIMAL_RULES={hungerPerSecond:.055,feedPerSecond:.012,waterPerSecond:.004,
 hungerCapacityStarts:40,thirstGraceSeconds:180,thirstCapacityRangeSeconds:600,minimumCapacityMultiplier:1.25} as const;
export type PackAnimal={id:number;hp:number;maxHp:number;scale:number;species?:'goat';
 sex?:'female'|'male';born?:number;tamedAt?:number;hunger?:number;thirstSeconds?:number;
 foodConsumed?:number;waterConsumedLiters?:number};
/** Keep the existing individual; fitting a harness is not a new animal. */
export function packAnimalFrom(a:Critter&Partial<Pick<Livestock,'sex'|'born'|'tamedAt'|'hunger'|'thirstSeconds'>>):PackAnimal {
 const prior=a as typeof a&Partial<PackAnimal>;
 return {id:a.id,hp:a.hp,maxHp:a.maxHp,scale:a.scale,species:'goat',
 ...(a.sex!==undefined?{sex:a.sex}:{}),...(a.born!==undefined?{born:a.born}:{}),...(a.tamedAt!==undefined?{tamedAt:a.tamedAt}:{}),
 hunger:a.hunger??0,thirstSeconds:a.thirstSeconds??0,foodConsumed:prior.foodConsumed??0,waterConsumedLiters:prior.waterConsumedLiters??0};
}
/** Existing cargo stays owned even if the animal becomes less able to carry it. */
export function packCapacityMultiplier(u:Pick<Unit,'packAnimal'>){
 const a=u.packAnimal;if(!a||a.hp<=0||a.maxHp<=0)return 1;
 const hunger=Math.max(0,Math.min(1,((a.hunger??0)-PACK_ANIMAL_RULES.hungerCapacityStarts)/(100-PACK_ANIMAL_RULES.hungerCapacityStarts)));
 const thirst=Math.max(0,Math.min(1,((a.thirstSeconds??0)-PACK_ANIMAL_RULES.thirstGraceSeconds)/PACK_ANIMAL_RULES.thirstCapacityRangeSeconds));
 const condition=Math.max(0,Math.min(1,a.hp/a.maxHp));
 return PACK_ANIMAL_RULES.minimumCapacityMultiplier+(2-PACK_ANIMAL_RULES.minimumCapacityMultiplier)*Math.min(condition,1-hunger,1-thirst);
}
export function validPackAnimal(a:unknown):a is PackAnimal {
 if(!a||typeof a!=='object'||Array.isArray(a))return false;const p=a as PackAnimal;
 const finite=(x:unknown)=>typeof x==='number'&&Number.isFinite(x);
 if(!Number.isSafeInteger(p.id)||p.id<1||!finite(p.hp)||!finite(p.maxHp)||p.hp<=0||p.hp>p.maxHp||p.maxHp>1000||!finite(p.scale)||p.scale<.1||p.scale>5)return false;
 if(p.species!==undefined&&p.species!=='goat'||p.sex!==undefined&&!['female','male'].includes(p.sex))return false;
 for(const key of ['born','tamedAt'] as const)if(p[key]!==undefined&&!finite(p[key]))return false;
 for(const key of ['hunger','thirstSeconds','foodConsumed','waterConsumedLiters'] as const)if(p[key]!==undefined&&(!finite(p[key])||p[key]!<0||p[key]!>(key==='hunger'?100:1e12)))return false;
 return true;
}
