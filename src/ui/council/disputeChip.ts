import type {InboxItem} from './attentionInbox';
/** The one compact chip on the Hearth top strip: shown only while a house is at odds with us, a claim of strength 50+ is held against us, unrest crosses its threshold, or a succession is contested.
 * Pure and derived from the attention inbox, which is derived from the council read model: no new state, no new data. Dismissal is per event key, so a new event brings the chip back. */
export type DisputeChip={count:number;tone:'danger'|'warn';glyph:string;label:string;text:string;keys:string[];tab:'neighbours'|'ruler';team?:number};
const isDispute=(i:InboxItem)=>i.key.startsWith('war-')||i.key==='unrest'||(i.key.startsWith('cb-them-')&&i.tone==='danger')||(i.key==='mourning'&&/contested/.test(i.text));
export function disputeChip(items:readonly InboxItem[],dismissed:ReadonlySet<string>=new Set()):DisputeChip|null{
 const live=items.filter(i=>isDispute(i)&&!dismissed.has(i.key));if(!live.length)return null;
 const worst=live.find(i=>i.tone==='danger')??live[0];
 const tone=live.some(i=>i.tone==='danger')?'danger':'warn';
 return {count:live.length,tone,glyph:worst.glyph,label:live.length>1?`${live.length} disputes`:worst.label,text:worst.text,keys:live.map(i=>i.key),tab:worst.key==='unrest'||worst.key==='mourning'?'ruler':'neighbours',team:worst.team};
}
