/** Plain-JSON council view of a society's ruling house for the UI. Pure read of game state; safe to post across the worker. */
import type {Game} from './sim';
import {rulersOf} from './rulersState';
import {ensureRulers,rulersEnabled,livingPeople,expansionOf,tiesBetween} from './rulersRuntime';
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
 neighbours:{team:number;name:string;bond:string;trust:number;canMarry:boolean;means:string[]}[];
 log:string[];
 handover?:{law:string;heir?:{name:string;age:number;role:string;adult:boolean;legit:boolean;claim:number;headline:string};regent?:string;rulerAge:number;yearlyRisk:number;extinct:boolean;others:{name:string;age:number;role:string}[]};
};
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
  return {team:i,name:g.tribe(i).name,bond:relationWord(ties),trust:Math.round(rel.trust*100),
   canMarry:!!o&&familyFeatures(o.civ.polity.tier,livingPeople(g,i)).marriageExchange&&f.marriageExchange,
   means:[im.willJoinDefensiveWar&&'would join a defensive war',im.willDemandSeatInSuccession&&'may claim a seat in the line',im.vendettaRisk&&'a vendetta is brewing',im.cbAvailable&&`grounds for a ${im.cbAvailable} claim`].filter(Boolean) as string[]};
 });
 const hp=f.showSuccessionUI&&head?heir(d,me.civ.polity.succession,makeRng(hash32('handover-preview',d.generation,d.rulerId))):undefined;
 const handover:CouncilModel['handover']=f.showSuccessionUI&&head?{law:me.civ.polity.succession,rulerAge:head.age,yearlyRisk:Math.round(yearlyDeathChance(head.age)*100),extinct:!hp&&!d.regent,regent:d.regent?d.people[d.regent]?.name:undefined,
  heir:hp?{name:hp.name,age:hp.age,role:role(hp.id),adult:hp.age>=16,legit:hp.legit,claim:hp.claimStrength,headline:hp.ruler?dossier(hp.ruler).headline:'untested'}:undefined,
  others:Object.values(d.people).filter(p=>p.alive&&p.id!==d.rulerId&&p.id!==hp?.id&&p.parent===d.rulerId).map(p=>({name:p.name,age:p.age,role:role(p.id)}))}:undefined;
 return {
  handover,enabled:true,stage:f.stage,showSuccession:f.showSuccessionUI,showFactions:f.factions,
  ruler:person?{...(({name,age,headline,contradiction,wants,fears,competences,values})=>({name,age,headline,contradiction,wants:wants.map(String),fears:String(fears),competences,values:values as string[]}))(dossier(person))}:undefined,
  house:{name:d.house,generation:d.generation,family:Object.values(d.people).filter(p=>p.alive).map(p=>({name:p.name,age:p.age,role:role(p.id),adult:p.age>=16}))},
  polity:{form:me.civ.polity.form,law:me.civ.polity.succession,tier:me.civ.polity.tier},
  factions:factions.map(x=>({kind:x.kind,power:Math.round(x.power*100),loyalty:x.loyalty,demand:x.demand})),coalitionLoss:coalitionLoss(factions),
  glory:STREAMS.map(s=>({stream:s,value:Math.round(me.ledger[s])})),gloryScore:Math.round(score(me.ledger)),
  expansion:exp?{mode:exp.mode,drive:exp.drive,why:exp.why}:undefined,neighbours,log:d.log.slice(-6),
 };
}
void traitWord;void dominantTraits;
