import type {Game} from './sim';
import {TRADE_GOODS,TRADE_SELECTABLE_KINDS,TRADE_NEEDS_RULES,proposePlayerTrade,answerTradeOffer,tradeStock,type GoodKind,type TradeOffer,type TradeOfferPhase} from './tradeNeeds';
export type PlayerTradeCommand={kind:'propose-needs-trade';team:number;give:GoodKind;get:GoodKind;amount:number}|{kind:'answer-needs-trade';offerId:number;accept:boolean};
export const PLAYER_TRADE_RULES={maximumOffers:12,maximumPartners:64} as const;
export const PLAYER_TRADE_NAMES:Record<GoodKind,string>={food:'Food',wood:'Timber',stone:'Stone',copper:'Copper',iron:'Iron',spears:'Spears',bows:'Bows',blades:'Blades',paddedArmor:'Padded armour',cordage:'Cordage',basket:'Baskets',pottery:'Pottery',cloth:'Cloth',leather:'Leather',skinClothes:'Skin clothing',hideCoat:'Hide coats',woolCloth:'Wool cloth',woolCoat:'Wool coats',goat:'Goats'};
export const playerTradeGood=(v:unknown):v is GoodKind=>typeof v==='string'&&TRADE_SELECTABLE_KINDS.includes(v as GoodKind);
export type PlayerTradeOfferView={id:number;from:number;to:number;partner:number;partnerName:string;give:{kind:GoodKind;amount:number};get:{kind:GoodKind;amount:number};phase:TradeOfferPhase;status:string;canAnswer:boolean;answerIssue:string|null;answerBy:number|null;ownCarriers:number|null;/** seconds of game time left to answer (incoming, still open) */answerLeft?:number|null;};
export type PlayerTradeModel={kind:'needs-trade';/** game clock when read, so the sheet can age offers without a second source */now?:number;team:number|null;partnerKnown:boolean;partners:{id:number;name:string}[];goods:{kind:GoodKind;label:string;held:number;maxOffer:number}[];offers:PlayerTradeOfferView[]};
/** Saved facts only. A display query never observes distant halls or creates knowledge. */
function knownPartners(g:Game){
 const ids=new Set((g.state.observedSettlements||[]).filter(f=>f.observer===0&&f.active).map(f=>f.owner));
 // A saved owned journey is an explicit legacy endpoint, not an unknown global hall.
 for(const u of g.state.units)if(u.team===0&&u.hp>0&&u.settlementJourney&&(u.trade||u.visit||u.envoy))ids.add(u.settlementJourney.owner);
 return [...ids].filter(id=>id>0&&id!==3&&!!g.state.tribes[id]).sort((a,b)=>a-b).slice(0,PLAYER_TRADE_RULES.maximumPartners).map(id=>({id,name:g.tribe(id).name}));
}
function answerIssue(g:Game,o:TradeOffer){
 if(o.to!==0||o.from===0||o.from===3||o.phase!=='proposed')return 'This offer is not awaiting your answer';
 if(g.state.time<o.answerAt)return 'The offer has not arrived';
 if(g.state.time>=o.answerAt+TRADE_NEEDS_RULES.playerAnswerSeconds)return 'The offer has expired';
 return tradeStock(g,0,o.get.kind)<o.get.amount?`Need ${o.get.amount} ${PLAYER_TRADE_NAMES[o.get.kind].toLowerCase()} to accept`:null;
}
const phaseText:Record<TradeOfferPhase,string>={proposed:'Proposal sent',loading:'Gathering caravan',outbound:'On the road',returning:'Bringing goods home',aborting:'Returning remaining goods',complete:'Delivered',declined:'Not agreed',failed:'Journey ended'};
/** Own terms and own receipts, never another society's stock, plans, crew or route. */
export function playerTradeModel(g:Game,team?:number):PlayerTradeModel{
 const partners=knownPartners(g),now=g.state.time;
 const offers=(g.state.tradeNeeds?.offers||[]).filter(o=>(o.from===0||o.to===0&&now>=o.answerAt)&&(team===undefined||o.from===team||o.to===team)).slice().sort((a,b)=>b.createdAt-a.createdAt||b.id-a.id).slice(0,PLAYER_TRADE_RULES.maximumOffers).map(o=>{
  const partner=o.from===0?o.to:o.from,incoming=o.to===0,expired=o.phase==='proposed'&&now>=o.answerAt+TRADE_NEEDS_RULES.playerAnswerSeconds;
  let phase=o.phase,status=phaseText[phase];
  if(incoming){
   if(expired){phase='declined';status='Offer expired';}
   else if(phase==='proposed')status='Offer received';
   else if(phase==='declined')status=o.reason==='refused'?'Declined':'Could not arrange caravan';
   else if((g.state.tradeNeeds?.receipts||[]).some(r=>r.offerId===o.id&&r.team===0&&r.stage==='paid')){phase='complete';status='Goods received';}
   else if(now>o.answerAt+TRADE_NEEDS_RULES.playerAnswerSeconds+TRADE_NEEDS_RULES.journeySeconds*2){phase='failed';status='Caravan overdue';}
   else{phase='loading';status='Awaiting caravan';}
  }
  const issue=incoming?answerIssue(g,o):null;
  return{id:o.id,from:o.from,to:o.to,partner,partnerName:g.tribe(partner)?.name||'Another village',give:{kind:o.give.kind,amount:o.quoted?.giveAmount??(Number.isFinite(o.volume)?Math.round(o.volume/TRADE_GOODS[o.give.kind].worth):o.give.amount||o.giveDelivered||0)},get:{kind:o.get.kind,amount:o.quoted?.getAmount??Math.min(TRADE_GOODS[o.get.kind].maxLot,Math.floor(o.fairGet*(1-o.spread)+1e-9))},phase,status,canAnswer:incoming&&o.phase==='proposed'&&!expired,answerIssue:issue,answerBy:incoming&&o.phase==='proposed'?o.answerAt+TRADE_NEEDS_RULES.playerAnswerSeconds:null,ownCarriers:o.from===0?o.carriers.length:null,answerLeft:incoming&&o.phase==='proposed'?Math.max(0,o.answerAt+TRADE_NEEDS_RULES.playerAnswerSeconds-now):null};
 });
 return{kind:'needs-trade',now,team:team??null,partnerKnown:team!==undefined&&partners.some(p=>p.id===team),partners,goods:TRADE_SELECTABLE_KINDS.map(kind=>({kind,label:PLAYER_TRADE_NAMES[kind],held:tradeStock(g,0,kind),maxOffer:TRADE_GOODS[kind].maxLot})),offers};
}
export function applyPlayerTradeCommand(g:Game,c:PlayerTradeCommand){
 const no=(reason:string)=>({accepted:false,reason});
 if(c.kind==='propose-needs-trade'){
  if(!Number.isSafeInteger(c.team)||c.team<=0||c.team===3||!g.state.tribes[c.team])return no('Choose another village');
  if(!playerTradeGood(c.give)||!playerTradeGood(c.get)||c.give===c.get||!Number.isSafeInteger(c.amount)||c.amount<1||c.amount>TRADE_GOODS[c.give].maxLot)return no('Choose two supported goods and a valid amount');
  if(!knownPartners(g).some(p=>p.id===c.team))return no('Find their settlement first');
  const r=proposePlayerTrade(g,c.team,c.give,c.get,c.amount);
  return r.ok?{accepted:true,reason:'Proposal sent; goods stay in stores until agreement',projectId:r.offer.id}:no(({cooldown:'Let this offer rest before trying again','already-trading':'A caravan is already being arranged','no-land-route':'No land route; use a boat trader','no-surplus':'You do not hold that amount','low-value':'Offer more goods'} as Record<string,string>)[r.reason]||'This exchange cannot be proposed now');
 }
 const o=g.state.tradeNeeds?.offers.find(o=>o.id===c.offerId);
 if(!o||o.to!==0||o.from===0||o.from===3||o.phase!=='proposed')return no('No incoming offer awaits your answer');
 if(g.state.time<o.answerAt||g.state.time>=o.answerAt+TRADE_NEEDS_RULES.playerAnswerSeconds)return no('This offer is not available to answer');
 const issue=c.accept?answerIssue(g,o):null;if(issue)return no(issue);
 if(!answerTradeOffer(g,o.id,c.accept,true))return no('The offer is no longer available');
 const loading=(g.state.tradeNeeds?.offers.find(v=>v.id===o.id)?.phase)==='loading';
 return{accepted:!c.accept||loading,reason:!c.accept?'Offer declined':loading?'Agreed; goods reserved for a real caravan':'The caravan could not be arranged',projectId:o.id};
}
