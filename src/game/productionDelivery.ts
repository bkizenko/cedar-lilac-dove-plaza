import type {Game} from './sim';
import type {FoodKind} from './types';
import type {ItemKind,ProductionProject,ProductionRecipe} from './production';
/** Ephemeral presentation receipt. Emitted after real delivery, never persisted or replayed. */
export type ProductionDelivery={projectId:number;recipe:ProductionRecipe;team:number;carrierId:number;workplaceId:number;deliveredAt:number;kind:'meal'|'brew'|'material';items:Readonly<Partial<Record<ItemKind,number>>>;foods:Readonly<Partial<Record<FoodKind,number>>>;readyFood:Readonly<Partial<Record<FoodKind,number>>>};
export class ProductionDeliveryChannel {
 private listeners=new Set<(delivery:ProductionDelivery)=>void>();
 subscribe(listener:(delivery:ProductionDelivery)=>void){this.listeners.add(listener);return()=>{this.listeners.delete(listener);};}
 emit(delivery:ProductionDelivery){for(const listener of [...this.listeners])try{listener(delivery);}catch(error){console.warn('Production delivery listener failed',error);}}
 clear(){this.listeners.clear();}
}
/** Called once after the paid project has completed and inventory has received actual outputs. */
export function emitProductionDelivery(g:Game,p:ProductionProject,carrierId:number,items:Partial<Record<ItemKind,number>>,foods:Partial<Record<FoodKind,number>>){
 const finite=<T extends string>(o:Partial<Record<T,number>>)=>Object.fromEntries(Object.entries(o).filter(([,n])=>typeof n==='number'&&Number.isFinite(n)&&n>0))as Partial<Record<T,number>>;
 const deliveredItems=finite(items),deliveredFoods=finite(foods),readyFood={...deliveredFoods};delete readyFood.grain;delete readyFood.fish;
 if(p.phase!=='complete'||!Object.keys(deliveredItems).length&&!Object.keys(deliveredFoods).length)return;
 const kind=deliveredFoods.smallBeer||deliveredFoods.beer?'brew':Object.keys(readyFood).length?'meal':'material';
 const delivery:ProductionDelivery=Object.freeze({projectId:p.id,recipe:p.recipe,team:p.team,carrierId,workplaceId:p.workplace,deliveredAt:g.state.time,kind,items:Object.freeze(deliveredItems),foods:Object.freeze(deliveredFoods),readyFood:Object.freeze(readyFood)});
 try{g.onProductionDelivery(delivery);}catch(error){console.warn('Production delivery callback failed',error);}
}
