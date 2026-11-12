import type {Game} from './sim';
import {personName} from './people';
import {wildCraftEnabled,wildCraftFeedback,type WildFeedbackRow} from './wildCraft';
/** Read-only owner view of hunting, trapping, tanning and rot. Plain rows only; no rules or state change. Absent on saves without wild-craft. */
export type WildCraftSection='working'|'afield'|'stores';
export type WildCraftRow=WildFeedbackRow&{who?:string;section:WildCraftSection;urgent:boolean};
export type WildCraftModel={enabled:boolean;rows:WildCraftRow[]};
const SECTION:Record<WildFeedbackRow['kind'],WildCraftSection>={work:'working',trap:'afield',wound:'afield',stock:'stores',rot:'stores'};
const PHASE:Record<string,string>={fetch:'fetching supplies',go:'walking out',work:'working',dry:'drying',ready:'ready to collect',collect:'collecting',back:'carrying home'};
export function wildCraftModel(g:Game):WildCraftModel{
 if(!wildCraftEnabled(g))return{enabled:false,rows:[]};
 const rows=wildCraftFeedback(g,0).map(r=>{
  const who=r.unitId!==undefined?(()=>{const u=g.state.units.find(u=>u.id===r.unitId);return u?personName(u):undefined;})():undefined;
  const phase=r.kind==='work'?r.text.replace(/^(\w+)/,(m)=>PHASE[m]??m):r.text;
  return{...r,text:phase,...(who?{who}:{}),section:SECTION[r.kind],urgent:r.kind==='wound'||r.kind==='rot'};
 });
 return{enabled:true,rows};
}
