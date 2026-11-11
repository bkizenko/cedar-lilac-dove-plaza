/** Pure view model for the trade dialog (Option H compact UI). It only
 * presents numbers the simulation passes in: goods actually held on each side,
 * what each side offers and wants, leader context from the REAL relation
 * value, one blocking reason and accept/counter/decline state. It never
 * invents stock, valuations or attitudes, and never decides whether a deal is
 * legal: the caller supplies hard limits (war, route, capacity).
 *
 * INPUT INTERFACE (until agents/claude-societies lands its trade slice, map
 * the real shapes onto this): a good is `{kind, amount}` using the sim's
 * ResKind/FoodKind/item names (src/game/types.ts TradeDeal.give/get map to
 * one Stack each). Partner `held` is only what the player has observed
 * (`knowledge:'observed'`) or nothing (`'unknown'`). */
import {compactNumber,quantityView,type QuantityView} from './compactModel';
import {stanceFor,type PortraitView} from './portraitModel';
import {goodIconId} from '../../scene/goodsVisuals';

export type Stack={kind:string;amount:number;label?:string};
export type SideInput={name:string;held:readonly Stack[];offers:readonly Stack[];wants:readonly Stack[];knowledge:'exact'|'observed'|'unknown'};
export type LimitsInput={/** the simulation's own reason trade cannot proceed right now */hardBlock?:string;atWar?:boolean;routeBlocked?:string;
 /** total units the carrier/caravan can move in one trip */carryCapacity?:number;counterAllowed?:boolean};
export type TradeDialogInput={player:SideInput;partner:SideInput;leader:{name:string;society:string;relation?:number};
 proposal:{give:readonly Stack[];get:readonly Stack[]}|null;limits?:LimitsInput};

export type ChipView=QuantityView&{kind:string;icon:string;amount:number};
export type ChipRow={chips:ChipView[];more:number};
export type ActionView={enabled:boolean;reason?:string};
export type TradeDialogView={
 leader:{name:string;society:string;stance:PortraitView['stance'];stanceText:string;relationText:string};
 player:{name:string;held:ChipRow;offers:ChipRow;wants:ChipRow};
 partner:{name:string;held:ChipRow;heldNote:string;offers:ChipRow;wants:ChipRow};
 proposal:{give:ChipRow;get:ChipRow}|null;
 blocker?:{reason:string;remedy?:string};
 accept:ActionView;counter:ActionView;decline:ActionView};

const MAX_CHIPS=6;
const label=(s:Stack)=>s.label??s.kind.replace(/([A-Z])/g,' $1').toLowerCase().replace(/^./,c=>c.toUpperCase());
const clean=(a:readonly Stack[])=>a.filter(s=>Number.isFinite(s.amount)&&s.amount>0);
/** Merge duplicate kinds so one good is one chip. */
function merge(a:readonly Stack[]){const m=new Map<string,Stack>();for(const s of clean(a)){const o=m.get(s.kind);m.set(s.kind,o?{...o,amount:o.amount+s.amount}:{...s});}return [...m.values()].sort((x,y)=>y.amount-x.amount||x.kind.localeCompare(y.kind));}
function chip(s:Stack,have?:number):ChipView{
 const v=quantityView(label(s),s.amount,undefined,have===undefined?undefined:undefined);
 const short=have!==undefined&&have<s.amount;
 return {...v,kind:s.kind,icon:goodIconId(s.kind),amount:s.amount,state:short?'short':v.state,title:short?`${label(s)}: ${compactNumber(s.amount)} (you hold ${compactNumber(have!)})`:v.title};
}
const row=(a:readonly Stack[],have?:(kind:string)=>number):ChipRow=>{const m=merge(a);return {chips:m.slice(0,MAX_CHIPS).map(s=>chip(s,have?have(s.kind):undefined)),more:Math.max(0,m.length-MAX_CHIPS)};};
const held=(side:SideInput)=>{const m=new Map(merge(side.held).map(s=>[s.kind,s.amount]));return (k:string)=>m.get(k)??0;};

export function tradeDialogView(input:TradeDialogInput):TradeDialogView{
 const {player,partner,leader,proposal,limits={}}=input,pHeld=held(player),qHeld=held(partner),stance=stanceFor(leader.relation);
 const stanceText={unknown:'You know little of their mind yet.',hostile:'Their people remember recent harm.',wary:'They are guarded with you.',neutral:'They will hear you out.',friendly:'They greet you as a known friend.'}[stance];
 const give=proposal?merge(proposal.give):[],get=proposal?merge(proposal.get):[];
 // Blockers in the simulation's terms, most severe first; exactly one is shown.
 const hard:{sev:number;reason:string;remedy?:string}[]=[],soft:{sev:number;reason:string;remedy?:string}[]=[];
 if(limits.hardBlock)hard.push({sev:100,reason:limits.hardBlock});
 if(limits.atWar)hard.push({sev:95,reason:`${leader.society} is at war with you`,remedy:'Make peace first'});
 else if(stance==='hostile')hard.push({sev:90,reason:`${leader.name} refuses to deal while relations are this bad`,remedy:'Send a gift or wait for tempers to cool'});
 if(limits.routeBlocked)hard.push({sev:80,reason:limits.routeBlocked});
 if(!proposal||(give.length===0&&get.length===0))soft.push({sev:75,reason:'Choose goods to offer or ask for'});
 else if(give.length===0)soft.push({sev:74,reason:'You are offering nothing',remedy:'Add goods you hold'});
 else if(get.length===0)soft.push({sev:74,reason:'You are asking for nothing',remedy:'Name what you want in return'});
 for(const g of give){const have=pHeld(g.kind);if(have<g.amount)soft.push({sev:70,reason:`You hold ${compactNumber(have)} of the ${compactNumber(g.amount)} ${label(g).toLowerCase()} offered`,remedy:`Offer at most ${compactNumber(have)} or gather more`});}
 if(partner.knowledge==='exact')for(const g of get){const have=qHeld(g.kind);if(have<g.amount)soft.push({sev:60,reason:`They hold only ${compactNumber(have)} ${label(g).toLowerCase()}`,remedy:`Ask for at most ${compactNumber(have)}`});}
 if(limits.carryCapacity!==undefined){const total=get.reduce((s,g)=>s+g.amount,0);if(total>limits.carryCapacity)soft.push({sev:50,reason:`Your carriers can move ${compactNumber(limits.carryCapacity)}, not ${compactNumber(total)}`,remedy:'Ask for less or send more carriers'});}
 if(give.some(g=>get.some(h=>h.kind===g.kind)))soft.push({sev:40,reason:'Both sides name the same good',remedy:'Trade different goods'});
 const all=[...hard,...soft].sort((a,b)=>b.sev-a.sev||a.reason.localeCompare(b.reason)),top=all[0];
 const counterBlock=hard[0]??((limits.counterAllowed===false)?{sev:0,reason:'They will not haggle over this'}:undefined);
 return {
  leader:{name:leader.name,society:leader.society,stance,stanceText,relationText:leader.relation===undefined||!Number.isFinite(leader.relation)?'Relation not yet known':`Relation ${Math.round(leader.relation)}`},
  player:{name:player.name,held:row(player.held),offers:row(player.offers),wants:row(player.wants)},
  partner:{name:partner.name,held:partner.knowledge==='unknown'?{chips:[],more:0}:row(partner.held),
   heldNote:partner.knowledge==='exact'?'Their stores':partner.knowledge==='observed'?'Last seen holding':'Their stores are unknown to you',
   offers:row(partner.offers),wants:row(partner.wants,pHeld)},
  proposal:proposal?{give:row(proposal.give,pHeld),get:row(proposal.get)}:null,
  ...(top?{blocker:{reason:top.reason,...(top.remedy?{remedy:top.remedy}:{})}}:{}),
  accept:top?{enabled:false,reason:top.reason}:{enabled:true},
  counter:counterBlock?{enabled:false,reason:counterBlock.reason}:{enabled:true},
  decline:{enabled:true}};
}
