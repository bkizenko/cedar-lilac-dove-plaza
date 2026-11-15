import type {Game} from './sim';
import type {Building,Unit} from './types';
import {calendar} from './settlement';
import {carryingCapacity} from './haulage';
import {regionalSuitability} from './regionalGoods';
/** Vineyard: a field-like plot of vines, Bronze Age and up, only where the measured climate suits wine (regionalSuitability).
 * Vines take a full year to establish, then ripen once each autumn if the climate still suits; the crop waits to be picked and is lost
 * with the winter turn. Pickers carry grapes as food to the stores, where the existing pressing turns fruit into jars of wine. */
export const VINEYARD_RULES={version:1,capacityFood:14,establishYears:1} as const;
export type VineState={plantedYear:number;ripenedYear:number;grapes:number};
export const vineyardReady=(g:Game,b:Building)=>b.type==='vineyard'&&b.hp>0&&g.finished(b);
export function vineyardIssue(g:Game,team:number):string|null{const s=regionalSuitability(g,team,'wine');return s.ok?null:s.reason;}
export function vineyardGrapes(g:Game,b:Building){return vineyardReady(g,b)?b.vine?.grapes??0:0;}
export function tickVineyards(g:Game){
 const cal=calendar(g);
 for(const b of g.state.buildings){
  if(!vineyardReady(g,b))continue;const v=b.vine??={plantedYear:cal.year,ripenedYear:-1,grapes:0};
  if(cal.phase===3&&v.grapes>0)v.grapes=0; // unpicked fruit does not keep through winter
  if(cal.phase===2&&v.ripenedYear<cal.year&&cal.year>=v.plantedYear+VINEYARD_RULES.establishYears&&regionalSuitability(g,b.team,'wine').ok){
   v.grapes=VINEYARD_RULES.capacityFood;v.ripenedYear=cal.year;}
 }
}
export function pickVineyard(g:Game,u:Unit,b:Building){
 const have=vineyardGrapes(g,b),room=Math.max(0,carryingCapacity(u,'food')-u.carry),take=Math.min(have,room);
 if(have<=0){u.node=null;u.order=u.carry>0?'return':'idle';u.workReason='Nothing ripe on the vines';return 0;}
 if(take<=0){u.order='return';return 0;}
 b.vine!.grapes=have-take;u.carry+=take;u.carryType='food';u.carryFood='berries';u.workReason='Picking grapes — carrying the harvest home';
 if(u.team===0)g.onSfx('rustle');
 if(b.vine!.grapes<=0||u.carry>=carryingCapacity(u,'food')){u.order='return';u.node=null;}
 return take;
}
/** Years are bounded loosely: the calendar length may change between versions, so a saved year is only checked for sanity. */
export function validVineState(v:unknown,type:string,year=1e6):boolean{
 if(v===undefined)return true;if(type!=='vineyard'||!v||typeof v!=='object'||Array.isArray(v))return false;
 const s=v as VineState;
 return Number.isSafeInteger(s.plantedYear)&&s.plantedYear>=0&&s.plantedYear<=year&&Number.isSafeInteger(s.ripenedYear)&&s.ripenedYear>=-1&&s.ripenedYear<=year&&
  Number.isFinite(s.grapes)&&s.grapes>=0&&s.grapes<=VINEYARD_RULES.capacityFood&&(s.grapes===0||s.ripenedYear>=0);
}
/** A finished press building gives the existing pressing a better yield and a proper place to work. */
export function pressHouseFor(g:Game,team:number){return g.state.buildings.some(b=>b.team===team&&b.type==='press'&&b.hp>0&&g.finished(b));}
export const PRESS_BONUS_JARS=1;
