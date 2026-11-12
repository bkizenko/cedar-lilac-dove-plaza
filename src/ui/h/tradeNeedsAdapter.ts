/** Pure adapter from Societies' need-based trade (src/game/tradeNeeds.ts on
 * agents/claude-societies, TRADE_NEEDS_RULES.version 1) to the H trade dialog
 * view model. Structural types mirror TradeOffer so a real offer passes
 * unchanged; the caller reads stock with the engine's own `tradeStock`.
 *
 * Engine facts honoured here:
 *  - only the PLAYER answers offers addressed to team 0 (to===0), accept or decline; there is NO counter API;
 *  - an offer's `give` is what the PROPOSER sends, so for the player it is what they RECEIVE; the player pays `get`;
 *  - acceptance fails on 'foe' (war) or 'no-surplus' (player stock < get.amount); the proposer's carriers move the goods;
 *  - the proposer's own shortages ('proposer-short','no-carriers','too-heavy','home-short','no-pen','partner-no-pen') only appear AFTER acceptance as a decline, so they are never predicted. */
import {tradeDialogView,type Stack,type TradeDialogInput,type TradeDialogView} from './tradeModel';

export type OfferSide={kind:string;amount:number;animals?:unknown[]};
export type OfferLike={id:number;from:number;to:number;give:OfferSide;get:OfferSide;fairGet:number;spread:number;
 phase:'proposed'|'loading'|'outbound'|'returning'|'aborting'|'complete'|'declined'|'failed';answerAt:number;risk:number;trust:number;escortsWanted:number;reason:string};
export const PLAYER_TEAM=0;
export const TRADE_REASON_TEXT:Record<string,string>={foe:'Your peoples are at war',refused:'You declined',expired:'The offer lapsed before you answered','no-need':'They no longer need what you offered','no-surplus':'You no longer hold enough to pay',
 'proposer-short':'They could not gather the goods','partner-short':'You could not supply the goods','no-carriers':'They had no free carriers','too-heavy':'The load was too heavy for their carriers','home-short':'They could not spare enough people from home',
 'no-pen':'They had no pen space for the animals','partner-no-pen':'You have no pen space for the animals','carrier-lost':'A carrier was lost on the road','loading-timeout':'Loading took too long','journey-timeout':'The journey took too long','became-foe':'War broke out during the journey',invalid:'The offer was not valid',cooldown:'They recently tried this trade',Delivered:'Delivered'};
export const reasonText=(code:string)=>TRADE_REASON_TEXT[code]??code;
const stack=(s:OfferSide):Stack=>({kind:s.kind,amount:s.amount});

export type AdapterInput={offer:OfferLike;/** engine tradeStock(g,0,kind) for every kind either side names, plus what the player holds to show */playerHeld:readonly Stack[];
 names:{player:string;partner:string;society:string;leader:string};/** real relation value or undefined when not known */relation?:number;now:number;playerAnswerSeconds?:number;
 /** at war per g.isFoe(from,to); the engine declines 'foe' on accept */atWar?:boolean};
/** What the player pays and receives, from the player's point of view. */
export function offerSides(o:OfferLike){const toPlayer=o.to===PLAYER_TEAM;return toPlayer?{give:[stack(o.get)],get:[stack(o.give)]}:{give:[stack(o.give)],get:[stack(o.get)]};}
export function tradeNeedsInput(a:AdapterInput):TradeDialogInput{
 const {offer:o}=a,sides=offerSides(o),open=o.phase==='proposed',expired=open&&a.now>=o.answerAt+(a.playerAnswerSeconds??600);
 return {player:{name:a.names.player,held:a.playerHeld,offers:sides.give,wants:sides.get,knowledge:'exact'},
  // The engine exposes no partner stock to the player: show only the single good on offer, as observed (it is escrowed on acceptance).
  partner:{name:a.names.partner,held:[],offers:sides.get,wants:sides.give,knowledge:'unknown'},
  leader:{name:a.names.leader,society:a.names.society,relation:a.relation,trust:o.trust},
  proposal:sides,limits:{atWar:a.atWar,counterAllowed:false,relationBlocks:false,
   hardBlock:!open?(o.phase==='declined'||o.phase==='failed'?reasonText(o.reason):o.phase==='complete'?'This trade is finished':'This trade is already under way'):expired?reasonText('expired'):undefined}};
}
export type NeedsTradeView=TradeDialogView&{fairness:{fairGet:number;/** what the engine says the proposer's `get` would be at exact worth (units of o.get.kind) */paysRatio:number;ratioText:string};journey:{riskText:string;escorts:number};
 /** the only actions the engine supports */actions:{accept:boolean;decline:boolean;counter:false}};
/** Engine pricing: the proposer asks `get.amount = fairGet*(1-spread)`, so for an offer to the player paysRatio is about 1-spread (player pays slightly under worth). */
export function tradeNeedsView(a:AdapterInput):NeedsTradeView{
 const v=tradeDialogView(tradeNeedsInput(a)),o=a.offer,toPlayer=o.to===PLAYER_TEAM,paysRatio=o.fairGet>0?(toPlayer?o.get.amount/o.fairGet:o.give.amount/Math.max(1e-9,o.fairGet)):1;
 const ratioText=toPlayer?(paysRatio<=.9?'In your favour':paysRatio<=1.02?'Fair':'In their favour'):'Fair';
 const risk=o.risk<.2?'Safe road':o.risk<.4?'Some risk on the road':o.risk<.6?'Risky road':'Dangerous road';
 return {...v,counter:{enabled:false,reason:'They do not haggle'},fairness:{fairGet:o.fairGet,paysRatio:Math.round(paysRatio*100)/100,ratioText},journey:{riskText:risk,escorts:o.escortsWanted},actions:{accept:v.accept.enabled,decline:v.decline.enabled,counter:false}};
}
