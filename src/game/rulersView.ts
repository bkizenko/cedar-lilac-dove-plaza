import {regencyOf} from './dynasty';
import {knownDiplomaticRelation} from './diplomaticKnowledge';
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
import {mourningOf} from './societyRuntime';
import {orphanCare} from './orphans';
import {pendingRefugees,REFUGEE_RULES} from './refugees';

export type CouncilModel={
 enabled:boolean;stage:string;showSuccession:boolean;showFactions:boolean;
 ruler?:{name:string;age:number;headline:string;contradiction:string|null;wants:string[];fears:string;competences:Record<string,string>;values:string[]};
 house?:{name:string;generation:number;family:{name:string;age:number;role:string;adult:boolean;care?:string;id?:string;parent?:string;spouse?:string}[]};
 polity?:{form:string;law:string;tier:string};
 factions:{kind:FactionKind;power:number;loyalty:number;demand:string}[];coalitionLoss:number;
 glory:{stream:string;value:number}[];gloryScore:number;
 expansion?:{mode:string;drive:number;why:string[]};
 parties?:PartyLine[];
 neighbours:{team:number;name:string;bond:string;trust:number;canMarry:boolean;means:string[];grievance?:number;hostile?:boolean;atPeace?:boolean;identity?:import('./societyIdentity').SocietyIdentity;voice?:DiplomaticVoice;court?:RivalCourt;wards?:WardLine[];casus?:CasusLine[];memory?:MemoryLine[];report?:{ageSec:number;via:string;stale:boolean}}[];
 log:string[];
 /** Agreements the player is party to (marriages, pacts, fosterage), newest first; optional so old callers and empty models stay valid. */
 news?:{time:number;kind:string;with:number;text:string}[];
 /** Hungry families waiting at our hall to be taken in (real people, src/game/refugees.ts); absent when none. */
 refugees?:{team:number;name:string;count:number;yearsLeft:number}[];
 mourning?:{from:string;to:string;relation:string;contested:boolean;kind:string;secondsLeft:number;carried:number;strained:number;lapsed:number};
 handover?:{law:string;heir?:{name:string;age:number;role:string;adult:boolean;legit:boolean;claim:number;headline:string};regent?:string;regency?:{yearsLeft:number;limits:string[]};rulerAge:number;yearlyRisk:number;extinct:boolean;others:{name:string;age:number;role:string}[];rivals?:{name:string;age:number;role:string;claim:number;legit:boolean}[];pressure?:{unrest:number;stage:string;claimsAgainst:number;why:string[]}};
};
/** What a known neighbour's court shows the outside world: who rules, who would follow, who stands in as regent. Read-only; unknown societies get none. */
export type RivalCourt={ruler:string;rulerAge:number;house:string;law:string;heir?:{name:string;age:number;adult:boolean;legit:boolean};regent?:string;extinct:boolean;lastEvent?:string};
export function rivalCourt(r:NonNullable<ReturnType<typeof rulersOf>>,other:number):RivalCourt|undefined{
 const o=r.societies[String(other)];if(!o)return undefined;const d=o.dynasty,head=d.people[d.rulerId];if(!head)return undefined;
 const hp=heir(d,o.civ.polity.succession,makeRng(hash32('court-preview',d.generation,d.rulerId)));
 return {ruler:head.name,rulerAge:head.age,house:d.house,law:o.civ.polity.succession,heir:hp?{name:hp.name,age:hp.age,adult:hp.age>=16,legit:hp.legit}:undefined,regent:d.regent?d.people[d.regent]?.name:undefined,extinct:!hp&&!d.regent,lastEvent:d.log.length?d.log[d.log.length-1]:undefined};
}
/** A standing grievance between two houses, in plain words: who holds it, the cause, how strong, when it lapses and what citing it costs the holder. */
export type CasusLine={byUs:boolean;kind:string;strength:number;endsIn:number;cost:number;reason:string;demand?:string;ultimatumYear?:number};
/** What a house holding this cause against us would ask, in plain words. Terms ask only for things the player can really hand over or refuse; nothing is taken without a war the player can see coming. */
const DEMAND_WORDS:Record<string,string>={succession:'a say in who sits our throne, shown as a marriage or a fostered heir',claim:'recognition of their claim: a ward sent to their hall or lands ceded by treaty',tribute:'the tribute we owe, paid from our own stores',raid:'redress for the raids: goods returned from our own stores',holy:'a sign of respect to their faith',reconquest:'the return of lands they once held',liberation:'release of their kin held in our hall'};
const CB_WORDS:Record<string,string>={claim:'a claim on their lands',tribute:'unpaid tribute',holy:'a sacred grievance',reconquest:'lands once held',defence:'a wrong done in defence',raid:'raids and cattle-lifting',succession:'a disputed succession',liberation:'kin held under their rule'};
export function casusLines(r:NonNullable<ReturnType<typeof rulersOf>>,team:number,other:number):CasusLine[]{
 return liveClaims(r.claims??[],r.year).filter(c=>(Number(c.holder)===team&&Number(c.target)===other)||(Number(c.holder)===other&&Number(c.target)===team)).map(c=>{
  const byUs=Number(c.holder)===team;
  return {byUs,kind:c.kind,strength:Math.round(c.strength),endsIn:Math.max(0,c.expiresTick-r.year),cost:cbLegitimacyCost(c.kind),reason:(byUs?'We hold ':'They hold ')+(CB_WORDS[c.kind]??c.kind)+'; citing it costs the holder '+cbLegitimacyCost(c.kind)+' legitimacy.',...(byUs?{}:{demand:DEMAND_WORDS[c.kind]??'their cause answered',ultimatumYear:c.expiresTick})};});
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
 for(const gr of r.grudges??[]){ // remembered wrongs, kept by the house and already faded/weakened by succession in rulersRuntime
  const mine=Number(gr.holder)===team&&Number(gr.target)===other,theirs=Number(gr.holder)===other&&Number(gr.target)===team;if(!mine&&!theirs)continue;
  const weight=Math.round(gr.w*100);if(weight<MEMORY_FLOOR)continue;
  out.push({kind:'grudge',text:mine?(gr.cause==='custody'?'Our house has not forgotten a kinsman who died in their hall':'Our house remembers the claim they pressed on us'):(gr.cause==='custody'?'Their house holds a grudge for a kinsman who died with us':'Their house remembers the claim we pressed on them'),year:gr.since,weight});
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
 const exp=expansionOf(g,team),ocs=orphanCare(d);
 const neighbours=g.state.tribes.map((t,i)=>i).filter(i=>i!==team&&i!==3&&societyRelation(g,team,i).known).map(i=>{
  const o=r.societies[String(i)],ties=tiesBetween(g,team,i),im=implications(ties),rel=societyRelation(g,team,i);
  return {team:i,name:g.tribe(i).name,bond:relationWord(ties),trust:Math.round(rel.trust*100),grievance:Math.round(rel.grievance*100),hostile:rel.hostile,atPeace:rel.peaceUntil>g.state.time,report:(k=>k.report?{ageSec:Math.max(0,Math.round(g.state.time-k.report.observedAt)),via:k.report.via,stale:k.stale}:undefined)(knownDiplomaticRelation(g,i)),identity:societyIdentity(g,i),voice:diplomaticVoice(o?.dynasty.people[o.dynasty.rulerId]?.ruler?.traits??o?.civ.ruler.traits,g.tribe(i).name),court:rivalCourt(r,i),wards:wardLines(r,team,i),casus:casusLines(r,team,i),memory:neighbourMemory(g,team,i),
   canMarry:!!o&&familyFeatures(o.civ.polity.tier,livingPeople(g,i)).marriageExchange&&f.marriageExchange,
   means:[im.willJoinDefensiveWar&&'would join a defensive war',im.willDemandSeatInSuccession&&'may claim a seat in the line',im.vendettaRisk&&'a vendetta is brewing',im.cbAvailable&&`grounds for a ${im.cbAvailable} claim`].filter(Boolean) as string[]};
 });
 const hp=f.showSuccessionUI&&head?heir(d,me.civ.polity.succession,makeRng(hash32('handover-preview',d.generation,d.rulerId))):undefined;
 const handover:CouncilModel['handover']=f.showSuccessionUI&&head?{law:me.civ.polity.succession,rulerAge:head.age,yearlyRisk:Math.round(yearlyDeathChance(head.age)*100),extinct:!hp&&!d.regent,regent:d.regent?d.people[d.regent]?.name:undefined,regency:regencyOf(d)?{yearsLeft:regencyOf(d)!.yearsLeft,limits:regencyOf(d)!.limits}:undefined,
  heir:hp?{name:hp.name,age:hp.age,role:role(hp.id),adult:hp.age>=16,legit:hp.legit,claim:hp.claimStrength,headline:hp.ruler?dossier(hp.ruler).headline:'untested'}:undefined,
  others:Object.values(d.people).filter(p=>p.alive&&p.id!==d.rulerId&&p.id!==hp?.id&&p.parent===d.rulerId).map(p=>({name:p.name,age:p.age,role:role(p.id)})),
  rivals:Object.values(d.people).filter(p=>p.alive&&p.id!==d.rulerId&&p.id!==hp?.id&&p.age>=16&&p.claimStrength>0).sort((x,y)=>y.claimStrength-x.claimStrength).slice(0,3).map(p=>({name:p.name,age:p.age,role:role(p.id),claim:p.claimStrength,legit:p.legit})),
  pressure:(u=>u?{unrest:Math.round(u.value),stage:u.stage,claimsAgainst:claimsOf(g,team).filter(c=>Number(c.target)===team).length,why:u.why}:undefined)(unrestOf(g,team))}:undefined;
 return {
  handover,mourning:(m=>m?{from:m.from,to:m.to,relation:m.relation,contested:m.contested,kind:m.kind,secondsLeft:Math.max(0,Math.round(m.mourningUntil-g.state.time)),carried:m.carried,strained:m.strained,lapsed:m.lapsed}:undefined)(mourningOf(g,team)),enabled:true,stage:f.stage,showSuccession:f.showSuccessionUI,showFactions:f.factions,
  ruler:person?{...(({name,age,headline,contradiction,wants,fears,competences,values})=>({name,age,headline,contradiction,wants:wants.map(String),fears:String(fears),competences,values:values as string[]}))(dossier(person))}:undefined,
  house:{name:d.house,generation:d.generation,family:Object.values(d.people).filter(p=>p.alive).map(p=>{const oc=ocs.find(o=>o.child===p.id);return {name:p.name,age:p.age,role:role(p.id),adult:p.age>=16,id:p.id,...(p.parent?{parent:p.parent}:{}),...(p.spouse?{spouse:p.spouse}:{}),...(oc?{care:`raised by ${d.people[oc.guardian]?.name??'the hall'} (${oc.relation})`}:{})};})},
  polity:{form:me.civ.polity.form,law:me.civ.polity.succession,tier:me.civ.polity.tier},
  factions:factions.map(x=>({kind:x.kind,power:Math.round(x.power*100),loyalty:x.loyalty,demand:x.demand})),coalitionLoss:coalitionLoss(factions),
  glory:STREAMS.map(s=>({stream:s,value:Math.round(me.ledger[s])})),gloryScore:Math.round(score(me.ledger)),
  expansion:exp?{mode:exp.mode,drive:exp.drive,why:exp.why}:undefined,parties:expansionParties(g,team),neighbours,log:d.log.slice(-6),refugees:refugeesWaiting(g),news:neighbourNews(g,0,6).map(n=>({time:n.time,kind:n.kind,with:n.a===0?n.b:n.a,text:n.text})),
 };
}
void traitWord;void dominantTraits;

/** Parties waiting at the hall, grouped by the society they left; patience counts down in dynastic years. */
function refugeesWaiting(g:Game):CouncilModel['refugees']{
 const year=(g.state as unknown as {rulers?:{year:number}}).rulers?.year??0,by=new Map<number,{count:number;since:number}>();
 for(const u of pendingRefugees(g)){if(u.refugee!.phase!=='waiting')continue;const e=by.get(u.refugee!.home)??{count:0,since:u.refugee!.year};e.count++;e.since=Math.min(e.since,u.refugee!.year);by.set(u.refugee!.home,e);}
 const out=[...by].map(([team,e])=>({team,name:g.tribe(team).name,count:e.count,yearsLeft:Math.max(0,REFUGEE_RULES.patienceYears-(year-e.since))}));
 return out.length?out:undefined;
}
