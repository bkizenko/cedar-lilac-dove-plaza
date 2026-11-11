import {hearthHeating} from '../game/survivalNeeds';
import type {Game} from '../game/sim';
import {PRODUCTION_RECIPES,type ProductionRecipeSpec} from '../game/production';
/** Small stable craftsmanship variation, applied above the foundation only. */
export function buildingCharacter(seed:number,id:number){let n=Math.imul(seed^id,0x45d9f3b);n=(n^(n>>>16))>>>0;return{roofHeight:.98+(n%1001)/1000*.04,tint:.97+((n>>>10)%1001)/1000*.06};}
/** Flames show active heating fuel or a paid cooking batch in progress. */
export function workingHearths(g:Game){
 const ids=new Set(g.state.buildings.filter(b=>b.type==='hearth'&&hearthHeating(g,b.id)).map(b=>b.id));
 for(const p of g.state.production?.projects||[]){const r=PRODUCTION_RECIPES[p.recipe] as ProductionRecipeSpec|undefined;if(p.phase!=='working'||!r||r.wood<=0)continue;const actor=g.state.units.find(u=>u.id===p.actorId&&u.hp>0&&u.productionProjectId===p.id);if(!actor)continue;
 const b=g.state.buildings.find(b=>b.id===p.workplace&&b.type==='hearth'&&g.finished(b));if(b&&Math.hypot(actor.x-b.x,actor.z-b.z)<=5)ids.add(b.id);
 }
 return ids;
}
