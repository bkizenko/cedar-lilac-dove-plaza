import type {Game} from '../game/sim';
import type {Unit} from '../game/types';
import {personName} from '../game/people';
/** A real first harvest: who carried it home from which field, how much, and how many days of food that is at today's appetite. */
export type FirstHarvest={unitId:number;name:string;fieldId:number;x:number;z:number;amount:number;sheaves:boolean;days:number|null;line:string};
type Carrier={fieldId:number;x:number;z:number;amount:number;sheaves:boolean};
export type HarvestWatch={carriers:Map<number,Carrier>;fired:boolean};
export const newHarvestWatch=():HarvestWatch=>({carriers:new Map(),fired:false});
const cargoOf=(u:Unit)=>{const sheaves=u.itemCargo?.grainSheaves||0;return sheaves>0?{amount:sheaves,sheaves:true}:u.carry>0&&u.carryFood==='grain'?{amount:u.carry,sheaves:false}:null;};
/** Watches real field carriers; fires once when a carrier from a field has set the harvest down at home. */
export function watchFirstHarvest(g:Game,w:HarvestWatch,daysPerUnit:number|null):FirstHarvest|null{
 if(w.fired)return null;
 for(const u of g.state.units){
  if(u.team!==0||u.hp<=0)continue;
  const cargo=cargoOf(u),node=u.node as {id?:number;type?:string;team?:number;x:number;z:number}|null;
  const field=node&&node.type==='farm'&&node.team===0?node:null;
  const tracked=w.carriers.get(u.id);
  if(cargo&&(field||tracked)){w.carriers.set(u.id,{fieldId:field?.id??tracked!.fieldId,x:field?.x??tracked!.x,z:field?.z??tracked!.z,amount:Math.max(cargo.amount,tracked?.amount??0),sheaves:cargo.sheaves});continue;}
  if(!cargo&&tracked){
   w.carriers.delete(u.id);if(u.order==='gather'&&u.node&&(u.node as {type?:string}).type==='farm'&&Math.hypot(u.x-tracked.x,u.z-tracked.z)<8)continue; // set down in the field, not brought home
   w.fired=true;
   const days=daysPerUnit&&daysPerUnit>0?tracked.amount*daysPerUnit:null,name=personName(u),what=tracked.sheaves?`${Math.round(tracked.amount)} sheaves`:`${Math.round(tracked.amount)} grain`;
   const line=`First harvest! ${name} brought in ${what} from the field${days!==null?` — about ${days<1?'less than a day':`${Math.round(days)} day${Math.round(days)===1?'':'s'}`} of food${tracked.sheaves?' once threshed':''}`:''}`;
   return {unitId:u.id,name,fieldId:tracked.fieldId,x:tracked.x,z:tracked.z,amount:tracked.amount,sheaves:tracked.sheaves,days,line};
  }
 }
 for(const id of [...w.carriers.keys()])if(!g.state.units.some(u=>u.id===id&&u.hp>0))w.carriers.delete(id);
 return null;
}
