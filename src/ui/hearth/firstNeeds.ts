/**
 * First five minutes: the four needs a new village meets first (water, fire, shelter, food) as one soft-priority list.
 * Read-only: nothing here mutates the sim or sends a command. Each need names why it is short and where to look; a need that is met drops out.
 */
import type {Game} from '@/game/sim';
import {foodDays,waterDays} from './glanceReads';

export type FirstNeedKind='water'|'fire'|'shelter'|'food';
export type FirstNeed={kind:FirstNeedKind;label:string;hint:string;at:{x:number;y:number;z:number}|null;met:boolean};
/** Days of stock below which a supply counts as not yet secured. */
export const FIRST_NEED_RULES={waterDays:2,foodDays:3,waterLitersWhenUnrated:20};

const done=(b:{build:number;hp:number;team:number})=>b.team===0&&b.hp>0&&b.build>=1;
/** All four needs in fixed order, met ones included (callers filter). Old saves with no survival fields read water by litres. */
export function firstNeeds(g:Game):FirstNeed[]{
 const mine=g.state.buildings.filter(b=>b.team===0&&b.hp>0);
 const home=g.campOf(0),homeAt={x:home.x,y:g.height(home.x,home.z),z:home.z};
 const placeAt=(b:{x:number;y?:number;z:number})=>({x:b.x,y:b.y??g.height(b.x,b.z),z:b.z});
 const wd=waterDays(g),litres=g.tribe(0).survival?.waterLiters??0;
 const hasWell=mine.some(b=>(b.type==='well'||b.type==='cistern')&&done(b));
 const waterOk=wd!==null?wd>=FIRST_NEED_RULES.waterDays:(hasWell||litres>=FIRST_NEED_RULES.waterLitersWhenUnrated);
 const unfinishedWell=mine.find(b=>(b.type==='well'||b.type==='cistern')&&!done(b));
 const fireBuilt=mine.find(b=>b.type==='hearth'&&done(b)),fireSite=mine.find(b=>b.type==='hearth');
 const roofs=mine.filter(b=>(b.type==='hut'||b.type==='house'||b.type==='townhall')&&done(b));
 const shelterSite=mine.find(b=>(b.type==='hut'||b.type==='house')&&!done(b));
 const fd=foodDays(g),foodOk=fd===null?g.tribe(0).food>0:fd>=FIRST_NEED_RULES.foodDays;
 return [
  {kind:'water',label:'Water',met:waterOk,at:unfinishedWell?placeAt(unfinishedWell):homeAt,
   hint:waterOk?'Water is secured.':unfinishedWell?'The well is still being dug; water is collected until it is done.':'Collected water is running short. Dig a well or send people to carry water.'},
  {kind:'fire',label:'Fire',met:!!fireBuilt,at:placeAt(fireBuilt??fireSite??home),
   hint:fireBuilt?'A hearth burns.':fireSite?'The hearth is not finished yet; fire keeps people warm and cooks food.':'No hearth yet. A fire keeps people warm and cooks food.'},
  {kind:'shelter',label:'Shelter',met:roofs.length>0&&g.state.units.filter(u=>u.team===0&&u.hp>0).length<=Math.max(1,roofs.length*4+4),at:placeAt(shelterSite??roofs[0]??home),
   hint:roofs.length===0?'Nobody has a roof yet. Build a hut or house.':shelterSite?'A house is going up; people sleep rough until it is done.':'There are more people than beds. Build another house.'},
  {kind:'food',label:'Food',met:foodOk,at:homeAt,
   hint:foodOk?'Food is secured.':fd!==null?`Food lasts about ${Math.max(0,Math.round(fd*10)/10)} days. Gather, hunt or fish.`:'The pantry is empty. Gather, hunt or fish.'},
 ];
}
/**
 * Which needs the strip still shows. Needs that have been met once stay retired for the session (`retired` is the caller's latch),
 * and the whole strip hides when none are left. Pure: returns the new retired set rather than mutating it.
 */
export function firstNeedsVisible(needs:readonly FirstNeed[],retired:ReadonlySet<FirstNeedKind>):{show:FirstNeed[];retired:Set<FirstNeedKind>}{
 const next=new Set(retired);for(const n of needs)if(n.met)next.add(n.kind);
 return {show:needs.filter(n=>!n.met&&!next.has(n.kind)),retired:next};
}
