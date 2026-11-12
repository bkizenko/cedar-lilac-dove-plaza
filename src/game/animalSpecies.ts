/** Gameplay coefficients: seconds and enclosure places, not historical units. */
export type HerdRules={places:number;maturity:number;gestation:number;tamingFood:number;tamingSeconds:number;careMultiplier:number;radius:number;speed:number;packMultiplier:number;harnessSeconds:number;harnessWood:number};
const SMALL_HERD_RULES:Readonly<HerdRules>=Object.freeze({places:1,maturity:300,gestation:240,tamingFood:6,tamingSeconds:60,careMultiplier:1,radius:.35,speed:2.8,packMultiplier:2,harnessSeconds:30,harnessWood:2});
const HORSE_HERD_RULES:Readonly<HerdRules>=Object.freeze({places:3,maturity:600,gestation:600,tamingFood:12,tamingSeconds:120,careMultiplier:3,radius:.55,speed:3.4,packMultiplier:3.5,harnessSeconds:60,harnessWood:6});
/** Sheep and goats retain their existing coefficients; horses need more room and care. */
export function herdRules(species:string|undefined):Readonly<HerdRules>{return species==='horse'?HORSE_HERD_RULES:SMALL_HERD_RULES;}
