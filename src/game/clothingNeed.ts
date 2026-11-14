/** Clothing as a village need: how many residents lack a serviceable garment, what the season and era call for, and which existing recipes make it.
 *  Pure read over existing state (garments, temperature, stock); it creates no goods and needs no new assets. Hide in the earliest era, wool once
 *  sheep and spinning are known, linen (light cloth) for hot weather. */
import type {Game} from './sim';
import type {GarmentKind} from './textiles';
import {TEXTILE_RULES} from './textiles';
import {SURVIVAL_RULES,ambientTemperature} from './survivalNeeds';
export type ClothingSeason='cold'|'mild'|'hot';
export type ClothingMaterial='hide'|'wool'|'linen';
export type ClothingNeed={residents:number;without:number;worn:number;season:ClothingSeason;material:ClothingMaterial;kind:GarmentKind;recipe:string;chain:string[];inStock:number;sewn:boolean;summary:string};
export const CLOTHING_RULES={/** Degrees above the cold threshold still counted as a cold season. */coldMargin:6,/** Era (tribe age) from which wool is the cold-weather cloth. */woolAge:1} as const;
const CHAINS:Record<ClothingMaterial,{kind:GarmentKind;recipe:string;chain:string[]}>={
 hide:{kind:'hideCoat',recipe:'sewHideCoat',chain:['fleshHide','tanHide','sewHideCoat']},
 wool:{kind:'woolCoat',recipe:'sewWoolCoat',chain:['washWool','spinWool','weaveWool','sewWoolCoat']},
 linen:{kind:'lightClothes',recipe:'sewLightClothes',chain:['spinYarn','weaveCloth','sewLightClothes']},
};
export const clothingSeasonAt=(celsius:number):ClothingSeason=>celsius<SURVIVAL_RULES.coldThresholdCelsius+CLOTHING_RULES.coldMargin?'cold':celsius>TEXTILE_RULES.heatThresholdCelsius?'hot':'mild';
export function clothingMaterialFor(season:ClothingSeason,age:number):ClothingMaterial{return season==='hot'||(season==='mild'&&age>=CLOTHING_RULES.woolAge+1)?'linen':age>=CLOTHING_RULES.woolAge?'wool':'hide';}
export function clothingNeed(g:Game,team:number,celsius=ambientTemperature(g)):ClothingNeed{
 const people=g.state.units.filter(u=>u.team===team&&u.hp>0&&!u.prisoner&&u.type==='worker'),worn=people.filter(u=>u.garment&&u.garment.condition>0).length;
 const season=clothingSeasonAt(celsius),material=clothingMaterialFor(season,g.tribe(team).age||0),c=CHAINS[material],inStock=g.tribe(team).items?.[c.kind]||0,without=people.length-worn;
 const word=material==='hide'?'hide clothing':material==='wool'?'wool clothing':'linen clothing';
 const summary=without<=0?'Everyone is clothed':`${without} of ${people.length} need ${word} for the ${season} weather`;
 return{residents:people.length,without,worn,season,material,kind:c.kind,recipe:c.recipe,chain:c.chain,inStock,sewn:inStock>0,summary};
}
