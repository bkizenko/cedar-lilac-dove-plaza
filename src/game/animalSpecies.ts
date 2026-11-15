/** Gameplay coefficients: seconds and enclosure places, not historical units. */
export type HerdRules={places:number;maturity:number;gestation:number;tamingFood:number;tamingSeconds:number;careMultiplier:number;radius:number;speed:number;packMultiplier:number;harnessSeconds:number;harnessWood:number;milkCapacity:number;milkPerSecond:number};
const SMALL_HERD_RULES:Readonly<HerdRules>=Object.freeze({places:1,maturity:300,gestation:240,tamingFood:6,tamingSeconds:60,careMultiplier:1,radius:.35,speed:2.8,packMultiplier:2,harnessSeconds:30,harnessWood:2,milkCapacity:6,milkPerSecond:.025});
const SHEEP_HERD_RULES:Readonly<HerdRules>=Object.freeze({...SMALL_HERD_RULES,milkCapacity:0,milkPerSecond:0});
const HORSE_HERD_RULES:Readonly<HerdRules>=Object.freeze({places:3,maturity:600,gestation:600,tamingFood:12,tamingSeconds:120,careMultiplier:3,radius:.55,speed:3.4,packMultiplier:3.5,harnessSeconds:60,harnessWood:6,milkCapacity:0,milkPerSecond:0});
const CATTLE_HERD_RULES:Readonly<HerdRules>=Object.freeze({places:4,maturity:900,gestation:900,tamingFood:18,tamingSeconds:150,careMultiplier:4,radius:.65,speed:2.4,packMultiplier:3,harnessSeconds:90,harnessWood:8,milkCapacity:12,milkPerSecond:.06});
const DONKEY_HERD_RULES:Readonly<HerdRules>=Object.freeze({places:2,maturity:450,gestation:450,tamingFood:9,tamingSeconds:90,careMultiplier:2,radius:.45,speed:2.9,packMultiplier:3,harnessSeconds:45,harnessWood:4,milkCapacity:0,milkPerSecond:0});
const OX_HERD_RULES:Readonly<HerdRules>=Object.freeze({places:4,maturity:900,gestation:900,tamingFood:20,tamingSeconds:160,careMultiplier:4,radius:.68,speed:2.2,packMultiplier:3.6,harnessSeconds:100,harnessWood:8,milkCapacity:0,milkPerSecond:0});
/** Species coefficients keep goat/sheep behavior; larger working stock costs more space and care. */
export function herdRules(species:string|undefined):Readonly<HerdRules>{return species==='ox'?OX_HERD_RULES:species==='donkey'?DONKEY_HERD_RULES:species==='cattle'?CATTLE_HERD_RULES:species==='horse'?HORSE_HERD_RULES:species==='sheep'?SHEEP_HERD_RULES:SMALL_HERD_RULES;}

/** Every species a village can capture and pen. */
export const HERD_SPECIES=['goat','sheep','horse','cattle','donkey','ox'] as const;
export type HerdSpecies=typeof HERD_SPECIES[number];
/** Species that can be harnessed for pack work (goats get a pack harness, the rest are trained at a stable). */
export const PACK_SPECIES=['goat','horse','cattle','donkey','ox'] as const;
export type PackSpecies=typeof PACK_SPECIES[number];
/** Bovine and equine families share meshes, sounds and pace rules with their base species. */
export const isBovine=(species:string|undefined):boolean=>species==='cattle'||species==='ox';
export const isEquine=(species:string|undefined):boolean=>species==='horse'||species==='donkey';
/** Species with an actual trained draft/pack role. */
export function isDraftSpecies(species:string|undefined):species is 'horse'|'cattle'|'donkey'|'ox'{return isEquine(species)||isBovine(species);}

/** Breeding clocks are quoted against the Classic 1800 s year and stretch with state.yearLength, so a herd still produces the same number of generations per game year. */
import {yearScaleOf} from './calendarPacing';
export const herdMaturity=(species:string|undefined,state:{yearLength?:number})=>herdRules(species).maturity*yearScaleOf(state);
export const herdGestation=(species:string|undefined,state:{yearLength?:number})=>herdRules(species).gestation*yearScaleOf(state);
