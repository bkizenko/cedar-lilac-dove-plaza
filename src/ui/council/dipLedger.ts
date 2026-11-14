import type {CouncilModel} from '../../game/rulersView';
/** One house's standing account with us, derived only from the council read model (no new state, nothing invented). */
export type LedgerHouse={team:number;name:string;pledges:string[];owed:string[];grudges:string[]};
const PLEDGE_BOND=/marri|allied|pact|sworn|oath|kin/i;
/** Pledges (bond words that imply an oath, wards in each other's halls), claims owed either way, and grudges (held grievance, fresh unfavourable memories). Houses with nothing on the books are omitted; most-owing first. */
export function diplomacyLedger(c:CouncilModel|undefined):LedgerHouse[]{
 if(!c||!c.enabled)return [];const out:LedgerHouse[]=[];
 for(const n of c.neighbours){
  const pledges:string[]=[],owed:string[]=[],grudges:string[]=[];
  if(PLEDGE_BOND.test(n.bond))pledges.push(`Bond: ${n.bond}`);
  for(const w of n.wards??[])pledges.push(`${w.name} ${w.kind==='foster'?'fostered':'held as hostage'} ${w.heldByUs?'with us':`in ${n.name}`}`);
  for(const k of n.casus??[])owed.push(`${k.byUs?'We hold':'They hold'} ${k.reason.replace(/^(We|They) hold /,'').replace(/;.*$/,'')}`);
  if((n.grievance??0)>=25)grudges.push(`${n.name} bear a grudge (${n.grievance}/100)`);
  for(const m of n.memory??[])if(m.weight>=40&&/raid|slay|kill|insult|refus|broke|breach|betray|steal|burn|captur/i.test(m.text))grudges.push(m.text);
  if(pledges.length||owed.length||grudges.length)out.push({team:n.team,name:n.name,pledges,owed,grudges});
 }
 return out.sort((a,b)=>(b.owed.length+b.grudges.length)-(a.owed.length+a.grudges.length)||a.name.localeCompare(b.name));
}
