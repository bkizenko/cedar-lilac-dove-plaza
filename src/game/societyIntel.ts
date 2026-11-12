/** What one society knows about another (M2-07, M2-10). Pure records and rules; the runtime fills them ONLY from dated structure reports a
 * society's own people carried home, and from real contact. An unknown action by a neighbour (a settlement, a raid on a third party, a
 * stockpile) changes nothing here until a witness sees it and the report arrives: records go stale, they are never refreshed from the world.
 * Wealth is learned from visible signs (stores, halls, fields), never from a remote treasury; defence from seen defenders and forts. */
import {clamp01} from './rulerCore';
import {DECISION_RULES,type TargetView} from './societyDecisions';

export type IntelVia='observation'|'envoy'|'route';
export type IntelRecord={observer:number;subject:number;observedAt:number;contactAt:number;via:IntelVia;structures:number;storage:number;halls:number;fields:number;defenders:number;defensePower:number;x:number;z:number};
export type Sighting={id:number;observedAt:number;type:string;defenders:number;defensePower:number;x:number;z:number};
const STORAGE=['warehouse','granary','storehouse'],FIELDS=['farm','grove'];

/** Fold the dated sightings a society holds of one subject into a record: the newest sighting of each structure stands, nothing is added from
 * the world. `prior` is kept (stale, with its old date) when there are no sightings, and a contact-only record has no picture of wealth. */
export function recordFromSightings(observer:number,subject:number,sightings:Sighting[],contactAt:number,prior?:IntelRecord,via:IntelVia='observation'):IntelRecord|null{
 if(!sightings.length){
  if(prior)return contactAt>prior.contactAt?{...prior,contactAt}:prior;
  return contactAt>0?{observer,subject,observedAt:0,contactAt,via:'envoy',structures:0,storage:0,halls:0,fields:0,defenders:0,defensePower:0,x:0,z:0}:null;
 }
 const latest=new Map<number,Sighting>();
 for(const s of sightings){const o=latest.get(s.id);if(!o||s.observedAt>o.observedAt)latest.set(s.id,s);}
 const list=[...latest.values()],at=Math.max(...list.map(s=>s.observedAt)),types=list.map(s=>s.type);
 return {observer,subject,observedAt:at,contactAt:Math.max(contactAt,prior?.contactAt??0),via,structures:list.length,
  storage:types.filter(t=>STORAGE.includes(t)).length,halls:types.filter(t=>t==='townhall').length,fields:types.filter(t=>FIELDS.includes(t)).length,
  defenders:Math.max(...list.map(s=>s.defenders)),defensePower:Math.max(...list.map(s=>s.defensePower)),x:list.reduce((t,s)=>t+s.x,0)/list.length,z:list.reduce((t,s)=>t+s.z,0)/list.length};
}
/** Visible signs of wealth 0..1 (stores weigh most). A contact-only record shows nothing: you cannot covet what you never saw. */
export const wealthSigns=(r:IntelRecord)=>clamp01(.2*r.storage+.12*r.halls+.06*r.fields+.015*Math.max(0,r.structures-r.storage-r.halls-r.fields));
export const defenceSigns=(r:IntelRecord)=>clamp01(r.defensePower/DECISION_RULES.defenceScalePower);
/** Report confidence falls with age (half-life) and has a floor; a contact-only record has none. */
export const confidenceAt=(r:IntelRecord,time:number)=>r.observedAt<=0?0:Math.max(.15,Math.pow(.5,Math.max(0,time-r.observedAt)/DECISION_RULES.intelHalfLifeSeconds));
export function targetView(r:IntelRecord,time:number,me:{x:number;z:number},rel:{hostile:boolean;trust:number;grievance:number},allied:boolean):TargetView{
 return {id:r.subject,observedAt:r.observedAt,ageSeconds:Math.max(0,time-r.observedAt),confidence:confidenceAt(r,time),defence:defenceSigns(r),wealth:wealthSigns(r),
  distance:r.observedAt>0?Math.hypot(r.x-me.x,r.z-me.z):600,hostile:rel.hostile,allied,trust:rel.trust,grievance:rel.grievance,contactAge:r.contactAt>0?Math.max(0,time-r.contactAt):99999};
}
/** Learned risk: how exposed my wealth is. I know who has met me (contact is mutual), not what they saw; recent contacts weigh more. */
export function exposure(ownWealth:number,contacts:{lastContact:number;hostile:boolean}[],time:number):number{
 let seen=0;for(const c of contacts)seen+=(c.hostile?1.4:1)*Math.pow(.5,Math.max(0,time-c.lastContact)/(2*DECISION_RULES.intelHalfLifeSeconds));
 return clamp01(ownWealth*clamp01(seen/2));
}
export function validIntel(r:unknown):r is IntelRecord{
 const x=r as IntelRecord;if(!x||typeof x!=='object')return false;
 return Number.isInteger(x.observer)&&Number.isInteger(x.subject)&&x.observer!==x.subject&&['observation','envoy','route'].includes(x.via)&&
  [x.observedAt,x.contactAt,x.structures,x.storage,x.halls,x.fields,x.defenders,x.defensePower].every(n=>Number.isFinite(n)&&n>=0)&&Number.isFinite(x.x)&&Number.isFinite(x.z);
}
