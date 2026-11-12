import type {ProductionDelivery} from '../game/productionDelivery';
import {FOOD_NAMES} from '../game/pantry';
/** Pure text for the production-delivery cue (no React, testable under the game loader). */
export type CueTone='meal'|'brew'|'material';
const plural=(n:number,w:string)=>`${n} ${w}`;
/** Pure: fold a burst of receipts into one short line. Exported for tests. */
export function describeDeliveries(batch:readonly ProductionDelivery[]):{tone:CueTone;text:string}|null{
 if(!batch.length)return null;
 const foods:Record<string,number>={};let materials=0;
 for(const d of batch){
  const ready=Object.keys(d.readyFood).length?d.readyFood:null;
  if(ready){for(const [k,n] of Object.entries(ready))if(typeof n==='number'&&n>0)foods[k]=(foods[k]??0)+n;}
  else{for(const n of Object.values(d.items))if(typeof n==='number'&&n>0)materials+=n;}
 }
 const parts=Object.entries(foods).slice(0,3).map(([k,n])=>plural(Math.round(n*10)/10,(FOOD_NAMES as Record<string,string>)[k]??k));
 const tone:CueTone=batch.some(d=>d.kind==='brew')?'brew':batch.some(d=>d.kind==='meal')?'meal':'material';
 if(parts.length)return {tone,text:`${tone==='brew'?'Brew':'Meal'} ready: ${parts.join(', ')}`};
 if(materials>0)return {tone:'material',text:`Batch delivered: ${plural(Math.round(materials*10)/10,'items')}`};
 return null;
}
