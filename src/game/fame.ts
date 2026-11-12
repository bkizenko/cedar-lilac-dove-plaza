/** Fame and rumor: unknown societies only reach the player through real carriers (traders, envoys, refugees).
 * A pulse has a magnitude tier and decays with distance; the player learns a VAGUE tier, never exact numbers or positions.
 * Pure: the caller supplies carriers and distances; no teleporting knowledge. */
import {clamp} from './rulerCore';

export type FameKind='wonder'|'conquest'|'collapse'|'schism'|'greatRuler'|'plague';
export type Pulse={id:string;society:string;kind:FameKind;magnitude:number;tick:number};
export type Tier='whisper'|'rumor'|'report'|'renown';
export const TIER_ORDER:Tier[]=['whisper','rumor','report','renown'];
/** Gate: the minimum magnitude for an event to be worth spreading. Big deeds travel; small ones stay home. */
export const MIN_SPREAD:Record<FameKind,number>={wonder:40,conquest:35,collapse:30,schism:45,greatRuler:50,plague:25};
export type Carrier={society:string;hops:number;reliability:number};
/** Which vague tier does this listener perceive? `hops` = social distance via real carriers (0 = direct neighbour). */
export function perceive(p:Pulse,c:Carrier,tick:number):Tier|null{
 if(p.magnitude<MIN_SPREAD[p.kind])return null;
 const age=Math.max(0,tick-p.tick),decay=Math.exp(-age/600);
 const strength=p.magnitude*decay*clamp(c.reliability,0,1)/(1+c.hops*.8);
 return strength>=45?'renown':strength>=28?'report':strength>=14?'rumor':strength>=6?'whisper':null;
}
export const VAGUE:Record<Tier,(kind:FameKind)=>string>={
 whisper:k=>`Travellers mutter that something ${verb(k)} far away.`,
 rumor:k=>`There are rumours of ${noun(k)} among a distant people.`,
 report:k=>`Merchants report ${noun(k)}; the details disagree.`,
 renown:k=>`Word has spread widely: ${noun(k)} is spoken of everywhere.`,
};
const verb=(k:FameKind)=>({wonder:'is being raised',conquest:'has been conquered',collapse:'has fallen',schism:'has split',greatRuler:'is rising',plague:'is killing'}[k]);
const noun=(k:FameKind)=>({wonder:'a great monument',conquest:'a conquering host',collapse:'a fallen kingdom',schism:'a schism in the faith',greatRuler:'a remarkable ruler',plague:'a wasting sickness'}[k]);
/** Dedupe so the player gets one notification per (society,kind) per tier upgrade only. */
export function nextNotice(seen:Record<string,Tier>,p:Pulse,t:Tier|null):{key:string;tier:Tier}|null{
 if(!t)return null;const key=`${p.society}:${p.kind}`;
 const cur=seen[key];if(cur&&TIER_ORDER.indexOf(cur)>=TIER_ORDER.indexOf(t))return null;
 return {key,tier:t};
}
