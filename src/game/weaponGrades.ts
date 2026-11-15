import {AGE_STAT,UNITS} from './constants';
/** One table: which material a weapon is made of at each age, and how much that adds to damage and armour pierce.
 * The multiplier sits on top of the existing per-age strength, so stone-age weapons are unchanged (x1).
 * Arming always uses the best grade the current age allows; stock stays a plain count of finished weapons. */
export type WeaponClass='spear'|'bow'|'blade';
export type WeaponGrade={material:string;age:number;damage:number;pierce:number};
export const WEAPON_GRADES:Record<WeaponClass,readonly WeaponGrade[]>={
 spear:[{material:'stone-tipped',age:0,damage:1,pierce:0},{material:'copper-tipped',age:1,damage:1.05,pierce:.04},{material:'bronze-tipped',age:2,damage:1.1,pierce:.08},{material:'iron-tipped',age:3,damage:1.15,pierce:.12},{material:'steel-tipped',age:4,damage:1.2,pierce:.15}],
 bow:[{material:'self bow',age:0,damage:1,pierce:0},{material:'bronze-headed bow',age:1,damage:1.05,pierce:.04},{material:'iron-headed bow',age:2,damage:1.1,pierce:.08},{material:'composite bow',age:3,damage:1.15,pierce:.1},{material:'steel-headed bow',age:4,damage:1.2,pierce:.12}],
 blade:[{material:'copper',age:1,damage:1,pierce:.02},{material:'bronze',age:2,damage:1.08,pierce:.06},{material:'iron',age:3,damage:1.16,pierce:.1},{material:'steel',age:4,damage:1.24,pierce:.14}],
};
export const unitClass=(type:string):WeaponClass|null=>type==='spearman'?'spear':type==='archer'?'bow':type==='swordsman'?'blade':null;
/** Best grade whose age gate the tribe has reached. */
export function bestGrade(kind:WeaponClass,age:number):WeaponGrade{const list=WEAPON_GRADES[kind];let best=list[0];for(const g of list)if(g.age<=age)best=g;return best;}
/** Damage for a soldier of `type` equipped at `age` (replaces the bare per-age scaling). */
export function weaponDamage(type:'spearman'|'archer'|'swordsman',age:number){const c=unitClass(type)!;return UNITS[type].dmg*AGE_STAT[age]*bestGrade(c,age).damage;}
export const weaponPierce=(type:string,age:number)=>{const c=unitClass(type);return c?bestGrade(c,age).pierce:0;};
export const gradeName=(kind:WeaponClass,age:number)=>bestGrade(kind,age).material;
