import type {Game} from './sim';
import {searchForWildGoats,cancelGoatSearch} from './animalOrders';
import {beginHerdTaming,assignHusbandry} from './husbandry';
import {releaseHusbandryKeeper} from './penWater';
import {requestPackPasture,cancelPackPasture} from './packPasture';
export const HUSBANDRY_ACTIONS=['search','cancel-search','capture','care','shear','slaughter','pack','release-keeper','return-pack','cancel-return'] as const;
export type HusbandryCommand={kind:'husbandry-order';penId:number;action:typeof HUSBANDRY_ACTIONS[number];species?:'goat'|'sheep'|'horse'|'cattle';unitId?:number};
type Result={accepted:boolean;reason:string};
const no=(reason:string):Result=>({accepted:false,reason});
const positiveId=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0;
/** Command admission only. Actual animals, paid work and physical goods remain
 * exclusively in the existing husbandry/search/pasture executors. */
export function applyHusbandryCommand(g:Game,command:HusbandryCommand):Result{
 const c=command as unknown as Record<string,unknown>;
 if(!c||typeof c!=='object'||Array.isArray(c)||![Object.prototype,null].includes(Object.getPrototypeOf(c))||Object.keys(c).some(k=>!['kind','penId','action','species','unitId'].includes(k))||!Object.hasOwn(c,'kind')||!Object.hasOwn(c,'penId')||!Object.hasOwn(c,'action')||c.kind!=='husbandry-order'||!positiveId(c.penId)||!HUSBANDRY_ACTIONS.includes(c.action as HusbandryCommand['action']))return no('Choose a valid pen action');
 const action=c.action as HusbandryCommand['action'],penId=c.penId as number,species=c.species as HusbandryCommand['species'],unitId=c.unitId as number|undefined;
 if(species!==undefined&&(!['capture','pack'].includes(action)||!['goat','sheep','horse','cattle'].includes(species)||action==='pack'&&species==='sheep'))return no('Choose a supported animal species for capture or pack training');
 if(unitId!==undefined&&(!positiveId(unitId)||!['capture','return-pack','release-keeper','cancel-return'].includes(action)))return no('This action does not target that handler');
 if(['release-keeper','cancel-return'].includes(action)&&unitId===undefined)return no('Choose the actual assigned keeper or handler');
 const pen=g.state.buildings.find(b=>b.id===penId&&b.team===0&&b.type==='pen'&&g.finished(b));
 if(!pen)return no('Choose a completed pasture pen owned by your village');
 const u=unitId===undefined?undefined:g.state.units.find(u=>u.id===unitId&&u.team===0&&u.hp>0&&!u.prisoner);
 if(unitId!==undefined&&!u)return no('Choose one of your living handlers');
 if(action==='search')return searchForWildGoats(g,penId);
 if(action==='cancel-search')return cancelGoatSearch(g,penId)?{accepted:true,reason:'Search cancelled; the same people return with their carried supplies'}:no('This pen has no active search request');
 if(action==='return-pack')return requestPackPasture(g,penId,unitId);
 if(action==='cancel-return'){
  if(u!.packPastureOrder?.pen!==penId)return no('This handler has no return assigned to this pen');
  cancelPackPasture(g,u!);return{accepted:true,reason:'Pasture return cancelled; the same working animal and supplies stay with its handler'};
 }
 if(action==='release-keeper'){
  if(u!.husbandryWork?.pen!==penId||u!.husbandryWork.action!=='care')return no('This resident is not a keeper assigned to this pen');
  releaseHusbandryKeeper(g,u!);return{accepted:true,reason:'Keeper released; any actual carried herd supplies return before the task ends'};
 }
 if(action==='capture'){
  const kind=species??'goat',animalSpecies=(id:number)=>g.state.wildlife.find(a=>a.id===id)?.species||g.state.livestock?.find(a=>a.id===id)?.species;
  const retained=g.state.units.filter(p=>p.team===0&&p.hp>0&&p.tamingWork?.pen===penId&&p.tamingWork.paused&&animalSpecies(p.tamingWork.animal)===kind);
  if(retained.length&&unitId!==undefined&&!retained.some(p=>p.id===unitId))return no('Resume this paid capture with its original handler');
  const original=unitId??retained[0]?.id,before=g.state.banner,accepted=beginHerdTaming(g,penId,original,kind);
  return{accepted,reason:accepted?(retained.length?'The original handler resumes the same paid capture and progress':`A real handler is approaching a visible wild ${kind}`):(g.state.banner!==before?g.state.banner:'Capture needs its available original handler, actual animal, feed, pasture room and clear route')};
 }
 const before=g.state.banner,accepted=assignHusbandry(g,penId,action,species as 'goat'|'horse'|'cattle'|undefined);
 return{accepted,reason:accepted?'The existing pen task is assigned; travel, work and delivery remain physical':g.state.banner!==before?g.state.banner:'This pen task needs an available adult, eligible animal, real supplies and reachable workplace'};
}
