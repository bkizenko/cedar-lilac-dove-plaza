/** Bridge: maps existing game actions/events onto the rulers lane without importing Game.
 * (1) diplomatic action -> TieAction effects; (2) game event -> glory event; (3) dossier/dialogue data for the UI.
 * The sim wiring is one call site per mapping, behind a switch; this file stays pure. */
import {effects,type TieAction,type Ctx} from './ties';
import {award,type Ledger} from './glory';
import {appetite,STREAMS,type Stream} from './glory';
import {dominantTraits,describe,type Ruler,type Trait} from './rulerGenome';
import {bandOf,BAND_LABELS} from './rulerCore';
import {bondLabel,type Ties} from './ties';

/** Existing action names (alliances, tribute, capitulation, truce ...) -> the kinship action they imply, if any. */
export const ACTION_TO_TIE:Record<string,TieAction|undefined>={
 allianceMarriage:'marriage',sendFoster:'fosterage',exchangeHostages:'hostageExchange',sendEnvoy:'envoy',giftBride:'giftBride',
 tributeMarriage:'tributeMarriage',divorce:'repudiate',breakAlliance:'breakPact',heirRules:'childOfUnionRules',
};
export const tieEffectsFor=(action:string,c:Ctx)=>{const t=ACTION_TO_TIE[action];return t?effects(t,c):[];};
/** Game event names the sim already emits -> glory event keys. Unknown events award nothing (safe default). */
export const EVENT_TO_GLORY:Record<string,string>={
 'building.complete':'buildingComplete','wonder.complete':'wonderComplete','alliance.formed':'allianceFormed','trade.route':'newTradeRoute',
 'battle.won':'battleWon','society.capitulation':'capitulation','society.tribute':'tributeImposed','society.annex':'annex','settlement.founded':'settleCity',
 'temple.founded':'templeFounded','faith.convert':'converted','festival':'festival',
};
export function onGameEvent(l:Ledger,event:string,mult=1):Ledger{const g=EVENT_TO_GLORY[event];return g?award(l,g,mult):l;}

const TRAIT_WORDS:Record<Trait,[string,string]>={
 ambition:['content with what they hold','hungry for more'],piety:['worldly','devout'],innovation:['wary of new ways','eager for new ways'],tradition:['impatient with custom','bound to custom'],
 boldness:['careful','daring'],prudence:['rash','prudent'],cruelty:['gentle','ruthless'],mercy:['unforgiving','merciful'],generosity:['tight-fisted','open-handed'],
 paranoia:['trusting','suspicious'],charisma:['dull in company','magnetic'],pride:['humble','proud'],honor:['flexible with oaths','scrupulous with oaths'],
};
export const traitWord=(t:Trait,v:number)=>TRAIT_WORDS[t][v>=50?1:0];
/** Dossier: plain-language summary the council panel renders. No raw numbers except bands. */
export function dossier(r:Ruler){
 const top=dominantTraits(r.traits,3);
 return {
  name:r.name,age:r.age,
  headline:top.map(t=>traitWord(t,r.traits[t])).join(', '),
  contradiction:r.contradiction?.note??null,
  wants:r.ambitions,
  fears:r.fear,
  competences:Object.fromEntries(Object.entries(r.comp).map(([k,v])=>[k,BAND_LABELS[bandOf(v as number)]])),
  values:STREAMS.filter(s=>appetite(r)[s]>=1.5) as Stream[],
  debug:describe(r),
 };
}
/** Dialogue openers keyed by speech style and relationship; tiny data table, extended by leaderDialogue.ts consumers. */
export const OPENER:Record<string,Record<'friendly'|'neutral'|'hostile',string>>={
 blunt:{friendly:'Speak. You are welcome here.',neutral:'Say what you came to say.',hostile:'You have a nerve.'},
 florid:{friendly:'The hearth is yours, and every flame upon it.',neutral:'Let words pass between us like honest coin.',hostile:'Even a viper hesitates at a threshold; you do not.'},
 laconic:{friendly:'Welcome.',neutral:'Well?',hostile:'Go.'},
 proverbial:{friendly:'A guest is a gift the road brings.',neutral:'Words are cheap; deeds are dear.',hostile:'He who sows wind...'},
 formal:{friendly:'You are received with honour.',neutral:'You are granted audience.',hostile:'Audience is withheld.'},
 warm:{friendly:'Come, sit. Eat first, talk after.',neutral:'Sit. What brings you?',hostile:'I wished it otherwise between us.'},
 sardonic:{friendly:'Ah, someone I do not mind.',neutral:'How thrilling. Go on.',hostile:'Your timing is almost admirable.'},
};
export function opener(r:Ruler,bond:Ties):string{
 const tone=bond.bond>=15?'friendly':bond.grievance>=25||bond.bond<=-15?'hostile':'neutral';
 return OPENER[r.speech][tone];
}
export const relationWord=(t:Ties)=>bondLabel(t.bond);
