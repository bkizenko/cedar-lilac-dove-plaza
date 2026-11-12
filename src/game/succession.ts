/** Leadership succession keeps what a house owes and is owed (M2-13). Agreements, grievances and histories belong to the society, not the ruler:
 * a new ruler inherits them, loosened or strained where the oath was personal and the heir is distant kin or contested, and the history records why.
 * Pure and seeded; the runtime calls it when a society's ruler changes (the dynasty record is the source). Nothing is reset to zero. */
import {clamp01,hash32,makeRng} from './rulerCore';

export type AgreementKind='pact'|'truce'|'marriage'|'tribute'|'fosterage';
export type AgreementStatus='standing'|'inherited'|'strained'|'lapsed';
export type Agreement={id:number;a:number;b:number;kind:AgreementKind;since:number;bound:'house'|'person';signer:string;status:AgreementStatus;note:string};
export type HistoryKind='succession'|'war'|'peace'|'pact'|'marriage'|'raid'|'settle'|'breakaway'|'reintegration'|'plan'|'famine';
export type HistoryEntry={year:number;kind:HistoryKind;with?:number;text:string};
export const HISTORY_CAP=40;
/** Pacts and truces bind the house; marriages and fosterage bind persons; tribute binds the house. A personal oath is the one that can lapse. */
export const boundTo=(k:AgreementKind):'house'|'person'=>k==='marriage'||k==='fosterage'?'person':'house';
export type HeirContext={kin:number;legitimacy:number;contested:boolean};
/** Closeness of an heir to the predecessor: child .9, sibling .6, other kin .35, unrelated .1. */
export const kinCloseness=(relation:'child'|'sibling'|'kin'|'none')=>relation==='child'?.9:relation==='sibling'?.6:relation==='kin'?.35:.1;
export function inherit(ag:Agreement,c:HeirContext,seed:number,year:number):{agreement:Agreement;why:string}{
 if(ag.status==='lapsed')return {agreement:ag,why:'already lapsed'};
 if(ag.bound==='house'){
  const strained=c.contested||c.legitimacy<40;
  return {agreement:{...ag,status:strained?'strained':'inherited'},why:strained?'the heir inherits the pact but a contested succession strains it':'the house honours what the house signed'};
 }
 const odds=clamp01(.4+.4*c.kin+.2*c.legitimacy/100-.3*(c.contested?1:0)),roll=makeRng(hash32('inherit',seed,ag.id,year))();
 if(roll<odds)return {agreement:{...ag,status:c.kin>=.5&&!c.contested?'inherited':'strained'},why:c.kin>=.5?'close kin carry the personal bond forward':'a personal bond survives, thinly'};
 return {agreement:{...ag,status:'lapsed'},why:'the personal oath died with its maker and the heir is too distant to renew it'};
}
/** A house remembers: grievances pass to the heir, eased only a little by kinship (at most 8%). Never reset and never raised by succession alone. */
export const inheritGrievance=(g:number,kin:number)=>Math.max(0,Math.min(1,g*(1-.08*clamp01(kin))));
export function addHistory(list:HistoryEntry[]|undefined,e:HistoryEntry,cap=HISTORY_CAP):HistoryEntry[]{
 const next=[...(list??[]),e];return next.length>cap?next.slice(next.length-cap):next;
}
export function validAgreement(a:unknown):a is Agreement{
 const x=a as Agreement;return !!x&&Number.isInteger(x.id)&&Number.isInteger(x.a)&&Number.isInteger(x.b)&&x.a!==x.b&&['pact','truce','marriage','tribute','fosterage'].includes(x.kind)&&Number.isFinite(x.since)&&['house','person'].includes(x.bound)&&typeof x.signer==='string'&&['standing','inherited','strained','lapsed'].includes(x.status)&&typeof x.note==='string';
}
export const validHistory=(h:unknown):h is HistoryEntry=>{const x=h as HistoryEntry;return !!x&&Number.isFinite(x.year)&&typeof x.kind==='string'&&typeof x.text==='string'&&(x.with===undefined||Number.isInteger(x.with));};
