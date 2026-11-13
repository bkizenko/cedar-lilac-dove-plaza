import {societyIdentity} from './societyIdentity';
import {diplomaticVoice,type DiplomaticVoice} from './diplomaticVoice';
/** Plain-JSON council view of a society's ruling house for the UI. Pure read of game state; safe to post across the worker. */
import type {Game} from './sim';
import {rulersOf} from './rulersState';
import {liveClaims,cbLegitimacyCost} from './unrest';
import {expansionParties,type PartyLine,ensureRulers,rulersEnabled,livingPeople,expansionOf,tiesBetween,unrestOf,claimsOf,neighbourNews,RULERS_YEAR_SECONDS} from './rulersRuntime';
import {familyFeatures} from './familyScale';
import {dossier,relationWord,traitWord} from './kinshipBridge';
import {generateFactions,stepFactions,coalitionLoss,type FactionKind} from './houses';
import {STREAMS,score} from './glory';
import {implications} from './ties';
import {societyRelation} from './societyRelations';
import {dominantTraits} from './rulerGenome';
import {heir,yearlyDeathChance} from './dynasty';
import {hash32,makeRng} from './rulerCore';

export type CouncilModel={
 enabled:boolean;stage:string;showSuccession:boolean;showFactions:boolean;
 ruler?:{name:string;age:number;headline:string;contradiction:string|null;wants:string[];fears:string;competences:Record<string,string>;values:string[]};
 house?:{name:string;generation:number;family:{name:string;age:number;role:string;adult:boolean}[]};
 polity?:{form:string;law:string;tier:string};
 factions:{kind:FactionKind;power:number;loyalty:number;demand:string}[];coalitionLoss:number;
 glory:{stream:string;value:number}[];gloryScore:number;
 expansion?:{mode:string;drive:number;why:string[]};
 parties?:PartyLine[];
 neighbours:{team:number;name:string;bond:string;trust:number;canMarry:boolean;means:string[];grievance?:number;hostile?:boolean;atPeace?:boolean;identity?:import('./societyIdentity').SocietyIdentity;voice?:DiplomaticVoice;court?:RivalCourt;wards?:WardLine[];casus?:CasusLine[];memory?:MemoryLine[]}[];
 log:string[];
 /** Agreements the player is party to (marriages, pacts, fosterage), newest first; optional so old callers and empty models stay valid. */
 news?:{time:number;kind:string;with:number;text:string}[];
 handover?:{law:string;heir?:{name:string;age:number;role:string;adult:boolean;legit:boolean;claim:number;headline:string};regent?:string;rulerAge:number;yearlyRisk:number;extinct:boolean;others:{name:string;age:number;role:string}[];rivals?:{name:string;age:number;role:string;claim:number;legit:boolean}[];pressure?:{unrest:number;stage:string;claimsAgainst:number;why:string[]}};
};
/** What a known neighbour's court shows the outside world: who rules, who would follow, who stands in as regent. Read-only; unknown societies get none. */
export type RivalCourt={ruler:string;rulerAge:number;house:string;law:string;heir?:{name:string;age:number;adult:boolean;legit:boolean};regent?:string;extinct:boolean;lastEvent?:string};
export function rivalCourt(r:NonNullable<ReturnType<typeof rulersOf>>,other:number):RivalCourt|undefined{
 const o=r.societies[String(other)];if(!o)return undefined;const d=o.dynasty,head=d.people[d.rulerId];if(!head)return undefined;
 const hp=heir(d,o.civ.polity.succession,makeRng(hash32('court-preview',d.generation,d.rulerId)));
 return {ruler:head.name,rulerAge:head.age,house:d.house,law:o.civ.polity.succession,heir:hp?{name:hp.name,age:hp.age,adult:hp.age>=16,legit:hp.legit}:undefined,regent:d.regent?d.people[d.regent]?.name:undefined,extinct:!hp&&!d.regent,lastEvent:d.log.length?d.log[d.log.length-1]:undefined};
}
/** A standing grievance between two houses, in plain words: who holds it, the cause, how strong, when it lapses and what citing it costs the holder. */
export type CasusLine={byUs:boolean;kind:string;strength:number;endsIn:number;cost:number;reason:string};
const CB_WORDS:Record<string,string>={claim:'a claim on their lands',tribute:'unpaid tribute',holy:'a sacred grievance',reconquest:'lands once held',defence:'a wrong done in defence',raid:'raids and cattle-lifting',succession:'a disputed succession',liberation:'kin held under their rule'};
export function casusLines(r:NonNullable<ReturnType<typeof rulersOf>>,team:number,other:number):CasusLine[]{
 return liveClaims(r.claims??[],r.year).filter(c=>(Number(c.holder)===team&&Number(c.target)===other)||(Number(c.holder)===other&&Number(c.target)===team)).map(c=>{
  const byUs=Number(c.holder)===team;
  return {byUs,kind:c.kind,strength:Math.round(c.strength),endsIn:Math.max(0,c.expiresTick-r.year),cost:cbLegitimacyCost(c.kind),reason:(byUs?'We hold ':'They hold ')+(CB_WORDS[c.kind]??c.kind)+'; citing it costs the holder '+cbLegitimacyCost(c.kind)+' legitimacy.'};});
}
/** One kinsman living in another house: who, which way, why, and when they go home. */
export type WardLine={name:string;age:number;kind:'foster'|'hostage';heldByUs:boolean;sinceYear:number;endsIn:number;effect:string};
export function wardLines(r:NonNullable<ReturnType<typeof rulersOf>>,team:number,other:number):WardLine[]{
 return (r.wards??[]).filter(w=>(Number(w.from)===team&&Number(w.to)===other)||(Number(w.from)===other&&Number(w.to)===team)).flatMap(w=>{
  const p=r.societies[w.from]?.dynasty.people[w.person];if(!p||!p.alive)return [];
  const endsIn=Math.max(0,w.kind==='foster'?16-p.age:w.since+8-r.year);
  return [{name:p.name,age:p.age,kind:w.kind,heldByUs:Number(w.to)===team,sinceYear:w.since,endsIn,effect:w.kind==='foster'?'Goes home at sixteen and the bond rises; war between the houses breaks the fostering and leaves a grudge.':'Held for eight years as a pledge; war between the houses breaks it and leaves a grudge.'}];});
}
/** What a neighbour remembers of specific acts between the two houses, newest first, each fading with a ten-year half-life. Derived only from records
 * that already exist (agreements the viewer is party to, and wards; live claims already show as casus lines): no new state, no hidden receipts, old saves give []. Weight 100 = fresh. */
export type MemoryLine={kind:string;text:string;year:number;weight:number};
export const MEMORY_HALF_LIFE_YEARS=10,MEMORY_FLOOR=15;
export function neighbourMemory(g:Game,team:number,other:number):MemoryLine[]{
 const r=rulersOf(g.state);if(!r)return [];const now=r.year,fade=(year:number)=>Math.round(100*Math.pow(0.5,Math.max(0,now-year)/MEMORY_HALF_LIFE_YEARS));
 const out:MemoryLine[]=[],push=(kind:string,text:string,year:number)=>{const weight=fade(year);if(weight>=MEMORY_FLOOR)out.push({kind,text,year,weight});};
 const ags=(r.decisions as unknown as {agreements?:{kind:string;a:number;b:number;since:number;note:string}[]}|undefined)?.agreements??[];
 for(const ag of ags){if(!((ag.a===team&&ag.b===other)||(ag.a===other&&ag.b===team)))continue;push(ag.kind,ag.note,Math.floor(ag.since/RULERS_YEAR_SECONDS));}
 for(const w of r.wards??[]){
  const mine=Number(w.from)===team&&Number(w.to)===other,theirs=Number(w.from)===other&&Number(w.to)===team;if(!mine&&!theirs)continue;
  const who=r.societies[w.from]?.dynasty.people[w.person]?.name??'a kinsman';
  push(w.kind,theirs?`They sent ${who} to us as ${w.kind==='foster'?'a foster child':'a hostage'}`:`We sent ${who} to them as ${w.kind==='foster'?'a foster child':'a hostage'}`,w.since);
 }
 return out.sort((a,b)=>b.year-a.year||b.weight-a.weight).slice(0,8);
}
export function councilModel(g:Game,team=0):CouncilModel{
 const empty:CouncilModel={enabled:false,stage:'household',showSuccession:false,showFactions:false,factions:[],coalitionLoss:0,glory:[],gloryScore:0,neighbours:[],log:[]};
 if(!rulersEnabled(g))return empty;ensureRulers(g);const r=rulersOf(g.state);const me=r?.societies[String(team)];if(!r||!me)return empty;
 const pop=livingPeople(g,team),f=familyFeatures(me.civ.polity.tier,pop),d=me.dynasty,head=d.people[d.rulerId];
 const person=head?.ruler;
 const factions=f.factions?stepFactions(generateFactions(me.civ.ruler.seed,me.civ.polity),person?.traits??me.civ.ruler.traits):[];
 const role=(id:string)=>id===d.rulerId?'ruler':d.people[id]?.spouse===d.rulerId?'consort':d.people[id]?.parent===d.rulerId?'child':'kin';
 const exp=expansionOf(g,team);
 const neighbours=g.state.tribes.map((t,i)=>i).filter(i=>i!==team&&i!==3&&societyRelation(g,team,i).known).map(i=>{
  const o=r.societies[String(i)],ties=tiesBetween(g,team,i),im=implications(ties),rel=societyRelation(g,team,i);
  return {team:i,name:g.tribe(i).name,bond:relationWord(ties),trust:Math.round(rel.trust*100),grievance:Math.round(rel.grievance*100),hostile:rel.hostile,atPeace:rel.peaceUntil>g.state.time,identity:societyIdentity(g,i),voice:diplomaticVoice(o?.dynasty.people[o.dynasty.rulerId]?.ruler?.traits??o?.civ.ruler.traits,g.tribe(i).name),court:rivalCourt(r,i),wards:wardLines(r,team,i),casus:casusLines(r,team,i),memory:neighbourMemory(g,team,i),
   canMarry:!!o&&familyFeatures(o.civ.polity.tier,livingPeople(g,i)).marriageExchange&&f.marriageExchange,
   means:[im.willJoinDefensiveWar&&'would join a defensive war',im.willDemandSeatInSuccession&&'may claim a seat in the line',im.vendettaRisk&&'a vendetta is brewing',im.cbAvailable&&`grounds for a ${im.cbAvailable} claim`].filter(Boolean) as string[]};
 });
 const hp=f.showSuccessionUI&&head?heir(d,me.civ.polity.succession,makeRng(hash32('handover-preview',d.generation,d.rulerId))):undefined;
 const handover:CouncilModel['handover']=f.showSuccessionUI&&head?{law:me.civ.polity.succession,rulerAge:head.age,yearlyRisk:Math.round(yearlyDeathChance(head.age)*100),extinct:!hp&&!d.regent,regent:d.regent?d.people[d.regent]?.name:undefined,
  heir:hp?{name:hp.name,age:hp.age,role:role(hp.id),adult:hp.age>=16,legit:hp.legit,claim:hp.claimStrength,headline:hp.ruler?dossier(hp.ruler).headline:'untested'}:undefined,
  others:Object.values(d.people).filter(p=>p.alive&&p.id!==d.rulerId&&p.id!==hp?.id&&p.parent===d.rulerId).map(p=>({name:p.name,age:p.age,role:role(p.id)})),
  rivals:Object.values(d.people).filter(p=>p.alive&&p.id!==d.rulerId&&p.id!==hp?.id&&p.age>=16&&p.claimStrength>0).sort((x,y)=>y.claimStrength-x.claimStrength).slice(0,3).map(p=>({name:p.name,age:p.age,role:role(p.id),claim:p.claimStrength,legit:p.legit})),
  pressure:(u=>u?{unrest:Math.round(u.value),stage:u.stage,claimsAgainst:claimsOf(g,team).filter(c=>Number(c.target)===team).length,why:u.why}:undefined)(unrestOf(g,team))}:undefined;
 return {
  handover,enabled:true,stage:f.stage,showSuccession:f.showSuccessionUI,showFactions:f.factions,
  ruler:person?{...(({name,age,headline,contradiction,wants,fears,competences,values})=>({name,age,headline,contradiction,wants:wants.map(String),fears:String(fears),competences,values:values as string[]}))(dossier(person))}:undefined,
  house:{name:d.house,generation:d.generation,family:Object.values(d.people).filter(p=>p.alive).map(p=>({name:p.name,age:p.age,role:role(p.id),adult:p.age>=16}))},
  polity:{form:me.civ.polity.form,law:me.civ.polity.succession,tier:me.civ.polity.tier},
  factions:factions.map(x=>({kind:x.kind,power:Math.round(x.power*100),loyalty:x.loyalty,demand:x.demand})),coalitionLoss:coalitionLoss(factions),
  glory:STREAMS.map(s=>({stream:s,value:Math.round(me.ledger[s])})),gloryScore:Math.round(score(me.ledger)),
  expansion:exp?{mode:exp.mode,drive:exp.drive,why:exp.why}:undefined,parties:expansionParties(g,team),neighbours,log:d.log.slice(-6),news:neighbourNews(g,0,6).map(n=>({time:n.time,kind:n.kind,with:n.a===0?n.b:n.a,text:n.text})),
 };
}
void traitWord;void dominantTraits;
