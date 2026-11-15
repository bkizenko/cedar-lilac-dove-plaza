import type {Game} from './sim';
import {planFoodWithdrawal,commitFoodWithdrawal} from './tradeFood';
/** Medieval and Renaissance production gates and batch sizes (game units, tuning values, not assays).
 * Steel: bloom plus extra charcoal at the forge, with loss, so steel is dearer than iron per kilogram of metal.
 * Paper: worn bast or wool cloth pulped with water and pressed; needs a Renaissance workshop. */
export const LATE_AGE_RULES={version:1,steelMinAge:4,paperMinAge:5,steelBloomPerBatch:4,steelCharcoalPerBatch:6,steelPerBatch:3,steelWorkSeconds:150,steelPackedLiters:1,powderCharcoal:3,powderStraw:2,powderBone:2,powderPerBatch:4,powderSeconds:120,powderPerSoldier:2,rivalReviewSeconds:300,rivalSteelIron:4,rivalSteelFood:24,rivalSteelCap:12,rivalBladeFood:12,rivalBladeCap:6,bookPaper:2,bookWood:1,bookSeconds:120,bookBonus:.015,bookCap:.12,academyFactor:2,steelBladeSteel:6,steelBladeCharcoal:1,steelBladeCount:2,steelBladeSeconds:110,bladeDamage:1.12,bladePierce:.08,
 paperClothPerBatch:3,paperWaterLiters:4,paperPerBatch:4,paperWorkSeconds:90,paperPackedLiters:1} as const;
const GATES:Record<string,{age:number;words:string}>={carburizeSteel:{age:LATE_AGE_RULES.steelMinAge,words:'steel (Medieval Age)'},forgeSteelBlades:{age:LATE_AGE_RULES.steelMinAge,words:'steel blades (Medieval Age)'},bindBook:{age:LATE_AGE_RULES.paperMinAge,words:'books (Renaissance Age)'},grindGunpowder:{age:LATE_AGE_RULES.paperMinAge,words:'gunpowder (Renaissance Age)'},pressPaper:{age:LATE_AGE_RULES.paperMinAge,words:'paper (Renaissance Age)'}};
/** Null when the recipe has no late-age gate or the society has reached it. */
export function lateRecipeIssue(g:Game,team:number,recipe:string){
 const gate=Object.hasOwn(GATES,recipe)?GATES[recipe]:undefined;if(!gate)return null;
 return (g.tribe(team)?.age??0)<gate.age?`Making ${gate.words} needs a more advanced age`:null;
}
/** Books in the stores make every batch of practised work go a little faster (taught practice is transferable); a finished academy doubles the gain. Derived from stock, nothing is stored. */
export function bookPracticeBonus(g:Game,team:number){
 const books=g.tribe(team)?.items?.book||0;if(!(books>0))return 0;
 const academy=g.state.buildings.some(b=>b.team===team&&b.type==='university'&&b.hp>0&&g.finished(b));
 return Math.min(LATE_AGE_RULES.bookCap*(academy?LATE_AGE_RULES.academyFactor:1),books*LATE_AGE_RULES.bookBonus*(academy?LATE_AGE_RULES.academyFactor:1));
}
/** Item cost of training a soldier, on top of food, wood and metal. Gunpowder is a stand-in chain (charcoal, straw and bone-earth for saltpetre and sulphur, which the world has no sources of yet). */
export const UNIT_ITEM_COSTS:Readonly<Record<string,Readonly<Record<string,number>>>>={arquebusier:{gunpowder:LATE_AGE_RULES.powderPerSoldier}};
export function unitItemShortfall(g:Game,team:number,unit:string):string|null{
 const c=UNIT_ITEM_COSTS[unit];if(!c)return null;const items=g.tribe(team)?.items||{};
 for(const[k,n]of Object.entries(c))if(((items as Record<string,number|undefined>)[k]||0)<n)return `Need ${n} ${k} in the stores`;return null;
}
export function spendUnitItems(g:Game,team:number,unit:string){
 const c=UNIT_ITEM_COSTS[unit];if(!c)return;const items=g.tribe(team).items as Record<string,number>;for(const[k,n]of Object.entries(c))items[k]=(items[k]||0)-n;
}

const rivalReviewed=new WeakMap<object,number>();
/** Rival smiths at the Medieval Age turn their own usable iron into steel (iron is spent, 25% is lost) and steel into steel-edged blades,
 * paid in food-fed labour and bounded by small caps. They need a finished forge; nothing appears without iron. Their arming reads the same stock as the player's. */
export function tickRivalSteel(g:Game){
 const at=Math.floor(g.state.time/LATE_AGE_RULES.rivalReviewSeconds);
 if(rivalReviewed.get(g)===at)return;rivalReviewed.set(g,at);
 const R=LATE_AGE_RULES;
 for(const t of g.state.tribes){
  if(t.id===0||!t.alive||t.age<R.steelMinAge)continue;
  if(!g.state.buildings.some(b=>b.team===t.id&&b.type==='forge'&&b.hp>0&&g.finished(b)))continue;
  const items=t.items??={};
  const pay=(food:number)=>{const lots=planFoodWithdrawal(g,t.id,food);return !!lots&&commitFoodWithdrawal(g,t.id,lots);};
  if((items.steelBlade||0)<R.rivalBladeCap&&(items.steel||0)>=R.steelBladeSteel&&pay(R.rivalBladeFood)){items.steel!-=R.steelBladeSteel;items.steelBlade=(items.steelBlade||0)+R.steelBladeCount;continue;}
  if((items.steel||0)<R.rivalSteelCap&&t.iron>=R.rivalSteelIron&&pay(R.rivalSteelFood)){t.iron-=R.rivalSteelIron;items.steel=(items.steel||0)+R.steelPerBatch;}
 }
}
