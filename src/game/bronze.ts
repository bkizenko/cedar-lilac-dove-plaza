import type {Game} from './sim';
import {planFoodWithdrawal,commitFoodWithdrawal} from './tradeFood';
/** Bronze Age metals. Game units, not assays: tin is the scarce part of the alloy, so bronze rides on tin supply.
 * Tin ore only exists where a lode does (a seeded subset of societies work one) and reaches other societies by trade or
 * capture. Nothing is minted: smelting turns ore + charcoal into ingots, casting turns ingots + copper + charcoal into
 * bronze, and bronze blades are cast from bronze. Every step is a paid production batch at a real workplace. */
export const BRONZE_RULES={version:1,minimumAge:1,
 smeltOre:6,smeltCharcoal:1,smeltTin:3,smeltSeconds:75,
 alloyTin:1,alloyCopper:4,alloyCharcoal:1,alloyBronze:5,alloySeconds:80,
 bladeBronze:10,bladeCharcoal:1,bladeCount:2,bladeSeconds:100,
 /** Chance a society sits on a workable lode, per 1000, by seed and team. */
 lodePerMille:350,lodeFoodPerOre:3,lodeStockCap:24,lodeReviewSeconds:300,
 /** Measured against the existing weapon-grade table: bronze edges beat copper. */
 bladeDamage:1.08,bladePierce:.06} as const;
export const BRONZE_RECIPES=['smeltTin','castBronze','castBronzeBlades'] as const;
export const isBronzeRecipe=(r:string)=>(BRONZE_RECIPES as readonly string[]).includes(r);
/** Deterministic: does this society's land hold a workable tin lode? The player never starts on one by default. */
export function holdsTinLode(g:Game,team:number){
 if(team===0||team===3)return false;
 const h=(Math.imul((g.state.seed^0x5bd1e995)>>>0,2654435761)^Math.imul(team+17,40503))>>>0;
 return h%1000<BRONZE_RULES.lodePerMille;
}
export function bronzeAgeIssue(g:Game,team:number):string|null{
 const t=g.tribe(team);if(!t)return 'No such society';
 return t.age<BRONZE_RULES.minimumAge?'Smelting tin and casting bronze needs the Bronze Age':null;
}
const reviewed=new WeakMap<object,number>();
/** Societies on a lode cut and wash tin ore with their own food-fed labour, up to a small stock they can trade away. */
export function tickTinLodes(g:Game){
 const at=Math.floor(g.state.time/BRONZE_RULES.lodeReviewSeconds);
 if(reviewed.get(g)===at)return;reviewed.set(g,at);
 for(const t of g.state.tribes){
  if(!t.alive||!holdsTinLode(g,t.id)||t.age<BRONZE_RULES.minimumAge)continue;
  const items=t.items??={},have=items.tinOre||0;
  if(have>=BRONZE_RULES.lodeStockCap||(t.food||0)<BRONZE_RULES.lodeFoodPerOre*40)continue;
  const take=BRONZE_RULES.lodeFoodPerOre*BRONZE_RULES.smeltOre;
  const lots=planFoodWithdrawal(g,t.id,take);if(!lots||!commitFoodWithdrawal(g,t.id,lots))continue;
  items.tinOre=have+BRONZE_RULES.smeltOre;
 }
}
