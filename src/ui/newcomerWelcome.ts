import type {Game} from '../game/sim';
import type {Unit} from '../game/types';
/** One arrival at the village, read only from real people standing there. */
export type Arrival={key:string;line:string};
const label=(k:string|null|undefined)=>k==='wood'?'logs':k||'goods';
/** Traders waiting at the village, foreign envoys come to us, and refugee families waiting at the hall. Never invented. */
export function newcomerArrivals(g:Game):Arrival[]{
 const out:Arrival[]=[],seenRefugees=new Map<number,Unit[]>();
 const name=(t:number)=>g.tribe(t)?.name||'Strangers';
 for(const u of g.state.units){
  if(u.hp<=0||u.team===0||u.prisoner||!g.visibleAt(u.x,u.z))continue;
  if(u.visit?.phase==='waiting'&&u.visit.team===undefined&&u.carryType&&u.carry>0)out.push({key:`trader:${u.id}`,line:`A ${name(u.team)} trader has arrived carrying ${Math.round(u.carry)} ${label(u.carryType)}${u.visit.wanted?` and hopes for ${label(u.visit.wanted)}`:''}`});
  else if(u.envoy&&u.envoy.team===0&&u.envoy.phase==='outbound')out.push({key:`envoy:${u.id}`,line:`An envoy from ${name(u.team)} is here${u.envoy.kind==='peace'?' to talk peace':u.envoy.kind==='trade'?' to talk trade':u.envoy.kind==='gift'?` bearing a gift${u.carry>0?` of ${Math.round(u.carry)} ${label(u.carryType)}`:''}`:''}`});
  else if(u.refugee?.phase==='waiting'){const list=seenRefugees.get(u.refugee.home)??[];list.push(u);seenRefugees.set(u.refugee.home,list);}
 }
 for(const [home,list] of seenRefugees)out.push({key:`refugees:${home}:${list.map(u=>u.id).sort((a,b)=>a-b)[0]}`,line:`${list.length} hungry ${list.length===1?'person':'people'} from ${name(home)} wait at your hall, asking to be taken in`});
 return out;
}
/** The player is mid-command: placing a building, or has a live undo/aim in hand. Arrivals wait until they are done. */
export function playerBusy(g:Game){return !!g.state.placing;}
const greeted=new WeakMap<object,Set<string>>();
/** Next arrival not yet greeted in this village; marks it greeted. Returns null while the player is busy. */
export function nextWelcome(g:Game):Arrival|null{
 if(playerBusy(g))return null;
 const seen=greeted.get(g.state)??new Set<string>();greeted.set(g.state,seen);
 const next=newcomerArrivals(g).find(a=>!seen.has(a.key));
 if(next)seen.add(next.key);
 return next??null;
}
