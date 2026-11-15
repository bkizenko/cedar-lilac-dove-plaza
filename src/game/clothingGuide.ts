/** Plain-language clothing help: what hides and fibre are in stock, what uses them, what is missing and where to get it,
 *  plus the rule that keeps scarce hides for simple clothes while people are unclothed in cold weather. Pure reads. */
import type {Game} from './sim';
import {clothingNeed} from './clothingNeed';
export const HIDE_RULES={hidesPerSimpleClothes:2,hidesPerHideCoat:3} as const;
export type HideStock={raw:number;clean:number;dried:number;leather:number;total:number};
export function hideStock(g:Game,team=0):HideStock{
 const i=g.tribe(team).items||{},raw=i.rawHide||0,clean=i.cleanHide||0,dried=i.driedSkin||0,leather=i.leather||0;
 return{raw,clean,dried,leather,total:raw+clean+dried+leather};
}
export const HIDE_USES:readonly string[]=['Simple clothes: 2 raw hides, sewn directly at the tailor (warm, light work)','Leather clothes: 2 leather, best insulation but heavy in heat','Lined hide coat: 2 dried skins + 1 leather, warmest, only worth it once everyone has simple clothes','Patches to repair worn clothes'];
export const LIGHT_VS_HEAVY='Light clothes (plant fibre or cloth) are for hot weather and barely keep you warm. Heavy clothes (hides, leather, wool) are for cold weather and tire people working in the heat.';
/** Heavy hide recipes wait while hides are too scarce to clothe everyone in a cold spell. */
export function hideReserveIssue(g:Game,team:number,recipe:string){
 if(team!==0||recipe!=='sewHideCoat'&&recipe!=='sewLeatherClothes')return null;
 const n=clothingNeed(g,team);if(n.season!=='cold'||n.without<=0)return null;
 const i=g.tribe(team).items||{},ready=(i.skinClothes||0)+(i.leatherClothes||0)+(i.hideCoat||0)+(i.woolCoat||0);
 const missing=n.without-ready;if(missing<=0)return null;
 const h=hideStock(g,team);
 return h.total<missing*HIDE_RULES.hidesPerSimpleClothes?`Hides are scarce and ${n.without} residents lack clothes in the cold: make simple clothes from hides first (${h.total} hides in stock)`:null;
}
export type ClothingGuide={hides:HideStock;fibre:number;hints:string[];explain:string};
export function clothingGuide(g:Game,team=0):ClothingGuide{
 const n=clothingNeed(g,team),h=hideStock(g,team),fibre=g.tribe(team).items?.plantFibre||0,hints:string[]=[];
 if(n.without>0){
  const ready=(g.tribe(team).items?.skinClothes||0)+(g.tribe(team).items?.lightClothes||0)+(g.tribe(team).items?.leatherClothes||0)+(g.tribe(team).items?.hideCoat||0)+(g.tribe(team).items?.woolCoat||0);
  if(ready>0)hints.push(`${ready} finished garments are in the stores: pick a resident and press Wear.`);
  if(n.season==='hot'||n.season==='mild'){
   if(fibre<4&&(g.tribe(team).items?.cloth||0)<2)hints.push('Light clothes need 4 plant fibre: send gatherers to fibre plants (reeds and flax-like grasses near water).');
   else hints.push('Sew light clothes at a tailor: 4 plant fibre makes one set.');
  }else{
   if(h.total<HIDE_RULES.hidesPerSimpleClothes)hints.push('No hides yet: hunt animals (deer, goats, boar); each kill returns hides. Bring the carcass to camp.');
   else hints.push(`Sew simple clothes at a tailor: ${HIDE_RULES.hidesPerSimpleClothes} raw hides make one set (${h.total} hides in stock).`);
   if(h.raw>0&&h.total>0)hints.push('Raw hides spoil in a few minutes; sew them soon.');
  }
 }
 return{hides:h,fibre,hints,explain:LIGHT_VS_HEAVY};
}
/** New worlds only (clothingVersion 1): the first villagers arrive in worn skin clothes that wear out and must be replaced.
 *  Condition is deterministic from the unit id; saves without the flag are never given garments on load. */
export function initializeStartingClothes(g:Game){
 if(g.state.clothingVersion===1)return;
 g.state.clothingVersion=1;
 for(const u of g.state.units)if(u.team===0&&u.hp>0&&u.type==='worker'&&!u.garment)u.garment={item:'skinClothes',condition:.35+((u.id*37)%41)/100};
}
