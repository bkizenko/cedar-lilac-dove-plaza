import {mulberry32} from './rng';
import {knownSettlementSite} from './barter';
import {isRivalTeam} from './factions';
import {receiveFood} from './pantry';
import {lifeEvent} from './communities';
import type {Game} from './sim';
import type {GameState,ResKind} from './types';

/** Abstract travelling trade parties. A party is never removed while away from
 * its origin: it walks (or sails) to the destination, trades, then retraces the
 * whole route home and is dropped only on reaching its origin point. */
export const TRADE_PARTY_RULES={landSpeed:3.2,seaSpeed:6.5,tradeSeconds:40,arrivalReviewSeconds:420,maxParties:24,spread:.9,maxAmount:60} as const;
const worth:Record<ResKind,number>={food:1,wood:1.2,stone:2.2,copper:4.5,iron:6.5};
const GOODS:ResKind[]=['food','wood','stone','copper','iron'];
export type TradePartyMode='land'|'sea';
export type TradePartyPhase='outbound'|'trading'|'returning'|'done';
export type TradeParty={version:1;id:number;kind:'foreign'|'expedition';mode:TradePartyMode;team:number;x0:number;z0:number;x1:number;z1:number;phase:TradePartyPhase;progress:number;travel:number;dwell:number;
  give?:ResKind;amount?:number;want?:ResKind;carryKind?:ResKind;carry?:number;leftover?:number;note?:string};
const list=(g:Game)=>(g.state.tradeParties??=[]);
export const tradeParties=(g:Game)=>g.state.tradeParties??[];
const dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);

function ownPort(g:Game,team:number){return g.state.buildings.find(b=>b.team===team&&b.type==='dock'&&b.hp>0&&g.finished(b));}
/** Current world position, derived from progress; never stored separately. */
export function tradePartyPosition(p:TradeParty){
 const f=p.phase==='outbound'?p.progress/p.travel:p.phase==='returning'?1-p.progress/p.travel:1;
 const k=Math.max(0,Math.min(1,f));return{x:p.x0+(p.x1-p.x0)*k,z:p.z0+(p.z1-p.z0)*k};
}
export function tradePartyStatus(g:Game,p:TradeParty){
 const name=g.tribe(p.team)?.name??'a village',left=Math.max(0,Math.ceil(p.travel-p.progress)),how=p.mode==='sea'?'ship':'party';
 if(p.phase==='outbound')return`Your ${how} is travelling to ${name} (${left}s)`;
 if(p.phase==='trading')return`Your ${how} is trading at ${name}`;
 if(p.phase==='returning')return`Your ${how} is returning from ${name} (${left}s)`;
 return`Your ${how} is home`;
}
export function expeditionIssue(g:Game,team:number,mode:TradePartyMode,give:ResKind,amount:number):string|null{
 if(!isRivalTeam(team)||!g.tribe(team)?.alive)return'Choose a known living village.';
 if(g.isFoe(0,team))return'That village will not receive your traders.';
 if(!knownSettlementSite(g,team))return'You have not found where that village lives.';
 if(!GOODS.includes(give))return'Choose goods to carry.';
 if(give==='copper'&&g.tribe(0).age<1||give==='iron'&&g.tribe(0).age<2)return'Your village has not adopted that metal as a trade good.';
 if(!Number.isSafeInteger(amount)||amount<1||amount>TRADE_PARTY_RULES.maxAmount)return`Carry between 1 and ${TRADE_PARTY_RULES.maxAmount}.`;
 if(g.tribe(0)[give]<amount)return`Not enough ${give} in stores.`;
 if(mode==='sea'&&!ownPort(g,0))return'A ship needs a finished dock.';
 if(list(g).filter(p=>p.kind==='expedition'&&p.phase!=='done').length>=4)return'Four expeditions are already out.';
 return null;
}
/** Dispatch: goods leave stores now; payment arrives only after the full round trip. */
export function dispatchTradeExpedition(g:Game,team:number,mode:TradePartyMode,give:ResKind,amount:number,want?:ResKind){
 const issue=expeditionIssue(g,team,mode,give,amount);if(issue)return{accepted:false,reason:issue};
 const site=knownSettlementSite(g,team)!,home=mode==='sea'?ownPort(g,0)!:g.campOf(0),speed=mode==='sea'?TRADE_PARTY_RULES.seaSpeed:TRADE_PARTY_RULES.landSpeed;
 const t=g.tribe(team),pick=want&&want!==give&&GOODS.includes(want)?want:(GOODS.filter(k=>k!==give).sort((a,b)=>t[b]*worth[b]-t[a]*worth[a])[0]);
 g.spend(0,{[give]:amount});
 const p:TradeParty={version:1,id:g.id(),kind:'expedition',mode,team,x0:home.x,z0:home.z,x1:site.x,z1:site.z,phase:'outbound',progress:0,travel:Math.max(10,Math.ceil(dist(home,site)/speed)),dwell:0,give,amount,want:pick};
 list(g).push(p);
 const reason=`${mode==='sea'?'Ship':'Trading party'} sent to ${t.name} with ${amount} ${give}. It will be back in about ${p.travel*2+TRADE_PARTY_RULES.tradeSeconds}s.`;
 lifeEvent(g,0,reason);return{accepted:true,reason,id:p.id};
}
function settle(g:Game,p:TradeParty){
 const t=g.tribe(p.team),give=p.give!,amount=p.amount!,want=p.want!;
 const spare=Math.max(0,t[want]-(want==='food'?30:10)),fair=Math.floor(amount*worth[give]/worth[want]*TRADE_PARTY_RULES.spread*(1+(t.trust||0)*.1)),got=Math.min(fair,Math.floor(spare));
 if(got<1){p.carryKind=give;p.carry=amount;p.note=`${t.name} had nothing to spare; your goods are coming home`;return;}
 const pay=Math.min(amount,Math.ceil(got*worth[want]/worth[give]/TRADE_PARTY_RULES.spread));
 t[want]-=got;if(give==='food')t.food+=pay;else t[give]+=pay;
 p.carryKind=want;p.carry=got;if(amount>pay)p.leftover=amount-pay;
 p.note=`${t.name} gave ${got} ${want} for ${pay} ${give}`;
 t.trust=Math.min(1,(t.trust||0)+.05);
}
function finish(g:Game,p:TradeParty){
 if(p.kind==='expedition'&&p.carryKind&&p.carry){
  if(p.carryKind==='food')receiveFood(g,0,p.carry,'provisions');else g.tribe(0)[p.carryKind]+=p.carry;
  if(p.give&&p.leftover)g.tribe(0)[p.give]+=p.leftover;
  lifeEvent(g,0,`Your ${p.mode==='sea'?'ship':'party'} is home: ${p.note}. ${p.carry} ${p.carryKind} delivered.`);
 }
 p.phase='done';
}
/** Deterministic arrival of foreign traders; sea arrivals are likelier with a player port. */
export function reviewForeignArrivals(g:Game){
 const slot=Math.floor(g.state.time/TRADE_PARTY_RULES.arrivalReviewSeconds),r=mulberry32((g.state.seed^0x7a4de5)+slot*2654435761>>>0);
 const teams=g.state.tribes.filter(t=>isRivalTeam(t.id)&&t.alive&&!t.hostile&&!g.isFoe(0,t.id)&&!!knownSettlementSite(g,t.id));
 if(!teams.length||r()>.5||list(g).filter(p=>p.kind==='foreign'&&p.phase!=='done').length>=2)return null;
 const t=teams[Math.floor(r()*teams.length)],port=ownPort(g,0),foreign=knownSettlementSite(g,t.id)!;
 const sea=r()<(port?.6:.12)&&!!(ownPort(g,t.id)||port);
 const dest=sea&&port?port:g.campOf(0),origin=sea?(ownPort(g,t.id)??foreign):foreign;
 const speed=sea?TRADE_PARTY_RULES.seaSpeed:TRADE_PARTY_RULES.landSpeed;
 const p:TradeParty={version:1,id:g.id(),kind:'foreign',mode:sea?'sea':'land',team:t.id,x0:origin.x,z0:origin.z,x1:dest.x,z1:dest.z,phase:'outbound',progress:0,travel:Math.max(10,Math.ceil(dist(origin,dest)/speed)),dwell:0};
 list(g).push(p);return p;
}
export function tickTradeParties(g:Game,dt:number){
 const parties=list(g);
 if(parties.length<TRADE_PARTY_RULES.maxParties&&g.state.tradeArrivalSlot!==Math.floor(g.state.time/TRADE_PARTY_RULES.arrivalReviewSeconds)){
  g.state.tradeArrivalSlot=Math.floor(g.state.time/TRADE_PARTY_RULES.arrivalReviewSeconds);reviewForeignArrivals(g);
 }
 for(const p of parties){
  if(p.phase==='outbound'){p.progress+=dt;if(p.progress>=p.travel){p.progress=0;p.phase='trading';p.dwell=0;
    if(p.kind==='foreign')lifeEvent(g,0,`Traders from ${g.tribe(p.team).name} arrived ${p.mode==='sea'?'by sea':'on foot'}.`);
    else settle(g,p);}}
  else if(p.phase==='trading'){p.dwell+=dt;if(p.dwell>=TRADE_PARTY_RULES.tradeSeconds){p.phase='returning';p.progress=0;}}
  else if(p.phase==='returning'){p.progress+=dt;if(p.progress>=p.travel)finish(g,p);}
 }
 // Removed only after physically reaching the origin point.
 if(parties.some(p=>p.phase==='done'))g.state.tradeParties=parties.filter(p=>p.phase!=='done');
}
export function validTradePartyState(s:GameState){
 const l=s.tradeParties;if(l===undefined)return true;if(!Array.isArray(l)||l.length>TRADE_PARTY_RULES.maxParties)return false;
 const fin=(...n:number[])=>n.every(Number.isFinite);
 return l.every(p=>!!p&&p.version===1&&Number.isSafeInteger(p.id)&&p.id>0&&p.id<s.nextId&&['foreign','expedition'].includes(p.kind)&&['land','sea'].includes(p.mode)&&!!s.tribes[p.team]&&
  ['outbound','trading','returning'].includes(p.phase)&&fin(p.x0,p.z0,p.x1,p.z1,p.progress,p.travel,p.dwell)&&p.travel>0&&p.progress>=0&&p.progress<=p.travel+1&&
  (p.give===undefined||GOODS.includes(p.give))&&(p.carryKind===undefined||GOODS.includes(p.carryKind))&&(p.carry===undefined||Number.isFinite(p.carry)&&p.carry>=0)&&(p.note===undefined||typeof p.note==='string'&&p.note.length<200));
}
