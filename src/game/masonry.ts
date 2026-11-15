import type {Game} from './sim';
/** Iron Age masonry. Game units, not mortar chemistry. Stone from the stores is burned with timber into lime at a kiln and
 * cut into dressed blocks at a quarry; both are paid production batches with a carrier, labour and delivery. Facing a
 * stone building spends dressed stone and lime from the stores for a one-time hardening of that building. */
export const MASONRY_RULES={version:1,minimumAge:2,
 limeStone:6,limeWood:3,limeOut:3,limeSeconds:70,
 dressStone:8,dressOut:6,dressSeconds:90,
 faceDressed:6,faceLime:2,faceHpFraction:.25,
 faceable:['stonewall','watchtower','barracks','keep','temple','market'] as readonly string[]} as const;
export const MASONRY_RECIPES=['burnLime','dressStone'] as const;
export const isMasonryRecipe=(r:string)=>(MASONRY_RECIPES as readonly string[]).includes(r);
export function masonryAgeIssue(g:Game,team:number):string|null{
 const t=g.tribe(team);if(!t)return 'No such society';
 return t.age<MASONRY_RULES.minimumAge?'Burning lime and dressing stone needs the Iron Age':null;
}
export type FacingResult={accepted:boolean;reason:string};
export function facingIssue(g:Game,team:number,buildingId:number):string|null{
 const t=g.tribe(team),b=g.state.buildings.find(b=>b.id===buildingId);
 if(!t||!b||b.team!==team||b.hp<=0||!g.finished(b))return 'Choose one of your finished buildings';
 if(!MASONRY_RULES.faceable.includes(b.type))return 'Only stonework can be faced with dressed stone';
 if(b.faced)return 'This building is already faced with dressed stone';
 if(t.age<MASONRY_RULES.minimumAge)return 'Facing needs the Iron Age';
 const items=t.items||{};
 if((items.dressedStone||0)<MASONRY_RULES.faceDressed)return `Need ${MASONRY_RULES.faceDressed} dressed stone in the stores`;
 if((items.lime||0)<MASONRY_RULES.faceLime)return `Need ${MASONRY_RULES.faceLime} lime for mortar`;
 return null;
}
export function faceBuilding(g:Game,team:number,buildingId:number):FacingResult{
 const issue=facingIssue(g,team,buildingId);if(issue)return{accepted:false,reason:issue};
 const t=g.tribe(team),b=g.state.buildings.find(b=>b.id===buildingId)!,items=t.items!;
 items.dressedStone=(items.dressedStone||0)-MASONRY_RULES.faceDressed;items.lime=(items.lime||0)-MASONRY_RULES.faceLime;
 const before=b.maxHp;b.maxHp=Math.round(b.maxHp*(1+MASONRY_RULES.faceHpFraction));b.hp=Math.min(b.maxHp,b.hp+(b.maxHp-before));b.faced=true;
 return{accepted:true,reason:`Faced in dressed stone: ${before} to ${b.maxHp} hit points`};
}
