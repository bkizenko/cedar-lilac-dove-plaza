/** Gameplay coefficients: seconds and enclosure places, not historical units. */
export type HerdRules={places:number;maturity:number;gestation:number;tamingFood:number;tamingSeconds:number;careMultiplier:number;radius:number;speed:number;packMultiplier:number;harnessSeconds:number;harnessWood:number;milkCapacity:number;milkPerSecond:number};
const SMALL_HERD_RULES:Readonly<HerdRules>=Object.freeze({places:1,maturity:300,gestation:240,tamingFood:6,tamingSeconds:60,careMultiplier:1,radius:.35,speed:2.8,packMultiplier:2,harnessSeconds:30,harnessWood:2,milkCapacity:6,milkPerSecond:.025});
const SHEEP_HERD_RULES:Readonly<HerdRules>=Object.freeze({...SMALL_HERD_RULES,milkCapacity:0,milkPerSecond:0});
const HORSE_HERD_RULES:Readonly<HerdRules>=Object.freeze({places:3,maturity:600,gestation:600,tamingFood:12,tamingSeconds:120,careMultiplier:3,radius:.55,speed:3.4,packMultiplier:3.5,harnessSeconds:60,harnessWood:6,milkCapacity:0,milkPerSecond:0});
const CATTLE_HERD_RULES:Readonly<HerdRules>=Object.freeze({places:4,maturity:900,gestation:900,tamingFood:18,tamingSeconds:150,careMultiplier:4,radius:.65,speed:2.4,packMultiplier:3,harnessSeconds:90,harnessWood:8,milkCapacity:12,milkPerSecond:.06});
/** Species coefficients keep goat/sheep behavior; larger working stock costs more space and care. */
export function herdRules(species:string|undefined):Readonly<HerdRules>{return species==='cattle'?CATTLE_HERD_RULES:species==='horse'?HORSE_HERD_RULES:species==='sheep'?SHEEP_HERD_RULES:SMALL_HERD_RULES;}

/** Species with an actual trained draft/pack role. */
export function isDraftSpecies(species:string|undefined):species is 'horse'|'cattle'{return species==='horse'||species==='cattle';}
