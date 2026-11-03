import{informationOwner,validInformationCustody}from'./informationCustody';
import type {Game} from './sim';
import type {GameState,ResKind,Unit} from './types';
import type {PartnerNeed,TradeIntelState} from './tradeIntel';
import {rivalTradeReserve} from './rivalTrade';
import {tradeIntelHomeReached} from './tradeIntelHome';
export const VISITOR_REFUSAL_RULES=Object.freeze({version:1,baseCooldownSeconds:600,repeatMultiplier:2,maximumCooldownSeconds:2400,repeatResetSeconds:3600,maximumRepeats:4,stopAfterDeclines:3,maximumMemories:128,maximumTerms:4,maximumQuote:256,changedUnitPriceFraction:.15,changedBundleFraction:.25,needReportFreshSeconds:600});
export type VisitorQuotedTerm={payment:ResKind;price:number};
export type VisitorRefusalCargo=import("./informationCustody").InformationCustody&{version:1;seller:number;buyer:0;carrierId:number;offered:ResKind;amount:number;at:number;need:PartnerNeed;terms:VisitorQuotedTerm[]};
export type VisitorRefusalMemory=import("./informationCustody").InformationCustody&{carrierId?:number;version:1;seller:number;buyer:0;offered:ResKind;payment:ResKind;amount:number;price:number;at:number;receivedAt:number;until:number;declines:number;need:PartnerNeed};
const goods:readonly ResKind[]=['food','wood','stone','copper','iron'];
const same=(r:VisitorRefusalMemory,seller:number,buyer:number,offered:ResKind,payment:ResKind)=>r.seller===seller&&r.buyer===buyer&&r.offered===offered&&r.payment===payment;
function changed(r:VisitorRefusalMemory,amount:number,price:number){const rules=VISITOR_REFUSAL_RULES;const unit=price/amount,old=r.price/r.amount;return unit<=old*(1-rules.changedUnitPriceFraction)||Math.abs(amount-r.amount)/r.amount>=rules.changedBundleFraction&&unit<=old+1e-9;}
/** Only called at an actual visible waiting visit, with the same quotes shown
 * locally. It creates a report on that person, not remote society knowledge. */
export function carryVisitorRefusal(g:Game,u:Unit,terms:VisitorQuotedTerm[]){
 if(u.hp<=0||u.team===0||u.team===3||u.boat||u.prisoner||u.visit?.phase!=='waiting'||u.visit.team!==undefined||!u.carryType||u.carry<=0||u.carry>VISITOR_REFUSAL_RULES.maximumQuote||!g.visibleAt(u.x,u.z))return false;
 const hall=g.state.buildings.find(b=>b.team===0&&b.type==='townhall'&&g.finished(b)&&Math.hypot(u.x-b.x,u.z-b.z)<=Math.max(b.w,b.d)*.55+3);if(!hall)return false;
 const valid=terms.filter(t=>goods.includes(t.payment)&&t.payment!==u.carryType&&Number.isFinite(t.price)&&t.price>0&&t.price<=VISITOR_REFUSAL_RULES.maximumQuote);if(!valid.length||valid.length>VISITOR_REFUSAL_RULES.maximumTerms||new Set(valid.map(t=>t.payment)).size!==valid.length)return false;
 const buyer=g.tribe(0),usable=u.carryType!=='copper'&&u.carryType!=='iron'||buyer.age>=(u.carryType==='copper'?1:2),reserve=rivalTradeReserve(g,0,u.carryType),stock=buyer[u.carryType];
 u.visitorRefusalCargo={version:1,seller:u.team,buyer:0,carrierId:u.id,offered:u.carryType,amount:u.carry,at:g.state.time,need:!usable?'unavailable':stock<reserve?'needs':stock>reserve*3?'glut':'balanced',terms:valid.map(t=>({...t}))};return true;
}
/** Rechecked physical homecoming; interruption/capture never broadcasts it. */
export function deliverVisitorRefusal(g:Game,u:Unit,s:TradeIntelState){
 const cargo=u.visitorRefusalCargo;if(!cargo||informationOwner(cargo,cargo.seller)!==u.team||!tradeIntelHomeReached(g,u))return 0;
 const memories=s.visitorRefusals??=[],rules=VISITOR_REFUSAL_RULES;
 for(const term of cargo.terms){const old=memories.find(r=>same(r,cargo.seller,cargo.buyer,cargo.offered,term.payment));
  if(old&&old.at>=cargo.at)continue;
  const repeats=old&&cargo.at-old.at<=rules.repeatResetSeconds&&!changed(old,cargo.amount,term.price)?Math.min(rules.maximumRepeats,old.declines+1):1;
  const record:VisitorRefusalMemory={...(cargo.holderTeam!==undefined?{holderTeam:cargo.holderTeam,handoverId:cargo.handoverId,carrierId:cargo.carrierId}:{}),version:1,seller:cargo.seller,buyer:0,offered:cargo.offered,payment:term.payment,amount:cargo.amount,price:term.price,at:cargo.at,receivedAt:g.state.time,until:g.state.time+Math.min(rules.maximumCooldownSeconds,rules.baseCooldownSeconds*rules.repeatMultiplier**(repeats-1)),declines:repeats,need:cargo.need};
  const index=old?memories.indexOf(old):-1;if(index>=0)memories.splice(index,1);memories.push(record);
 }
 memories.sort((a,b)=>a.receivedAt-b.receivedAt);while(memories.length>rules.maximumMemories)memories.shift();s.visitorRefusals=memories;u.visitorRefusalCargo=undefined;return 1;
}
/** Pure native-side decision: current seller quote + physically returned reports.
 * Never reads the remote buyer's present inventory to guess a changed need. */
export function visitorOfferOnCooldown(g:Game,seller:number,offered:ResKind,amount:number,terms:VisitorQuotedTerm[]){
 const memories=g.state.tradeIntel?.visitorRefusals;if(!memories?.length||!terms.length)return false;
 const report=g.state.tradeIntel?.reports.find(r=>r.observer===seller&&r.partner===0),need=report?.goods.find(x=>x.kind===offered)?.need;
 return terms.every(term=>{const old=memories.find(r=>same(r,seller,0,offered,term.payment));if(!old||changed(old,amount,term.price))return false;
  if(report&&report.observedAt>old.at&&g.state.time-report.observedAt<=VISITOR_REFUSAL_RULES.needReportFreshSeconds&&need!==old.need&&(need==='needs'||need==='balanced'&&(old.need==='glut'||old.need==='unavailable')))return false;return old.declines>=VISITOR_REFUSAL_RULES.stopAfterDeclines||old.until>g.state.time;});
}
export function visitorRefusalDiagnostics(g:Game){const records=g.state.tradeIntel?.visitorRefusals||[];return {knownRecords:records.length,pendingCarriers:g.state.units.filter(u=>u.visitorRefusalCargo).length,coolingRecords:records.filter(r=>r.declines<VISITOR_REFUSAL_RULES.stopAfterDeclines&&r.until>g.state.time).length,pausedRecords:records.filter(r=>r.declines>=VISITOR_REFUSAL_RULES.stopAfterDeclines).length,rules:VISITOR_REFUSAL_RULES};}
export function validVisitorRefusals(s:GameState){
 if(!s||typeof s!=='object'||!Array.isArray(s.units)||!Array.isArray(s.tribes))return false;
 const rules=VISITOR_REFUSAL_RULES,num=(n:unknown,max=1e12)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max,id=(n:unknown)=>Number.isSafeInteger(n)&&Number(n)>0&&Number(n)<s.nextId,seller=(n:unknown)=>Number.isInteger(n)&&Number(n)>0&&Number(n)!==3&&!!s.tribes[Number(n)],need=(n:unknown)=>typeof n==='string'&&['needs','balanced','glut','unavailable'].includes(n),keys=(o:object,names:string[])=>Object.keys(o).every(k=>names.includes(k));
 const memories=s.tradeIntel?.visitorRefusals;if(memories!==undefined){if(!Array.isArray(memories)||memories.length>rules.maximumMemories)return false;const seen=new Set();for(const r of memories){if(!r||typeof r!=='object'||Array.isArray(r)||!keys(r,['version','seller','buyer','offered','payment','amount','price','at','receivedAt','until','declines','need','holderTeam','handoverId','carrierId'])||!validInformationCustody(s,r,r.seller,r.carrierId)||r.version!==1||!seller(r.seller)||r.buyer!==0||!goods.includes(r.offered)||!goods.includes(r.payment)||r.offered===r.payment||!num(r.amount,rules.maximumQuote)||r.amount<=0||!num(r.price,rules.maximumQuote)||r.price<=0||!num(r.at,s.time)||!num(r.receivedAt,s.time)||r.receivedAt<r.at||!num(r.until,r.receivedAt+rules.maximumCooldownSeconds)||r.until<r.receivedAt||!Number.isSafeInteger(r.declines)||r.declines<1||r.declines>rules.maximumRepeats||!need(r.need))return false;const key=`${r.seller}:${r.offered}:${r.payment}`;if(seen.has(key))return false;seen.add(key);}}
 for(const u of s.units){const c=u.visitorRefusalCargo;if(c===undefined)continue;if(!c||typeof c!=='object'||Array.isArray(c)||!keys(c,['version','seller','buyer','carrierId','offered','amount','at','need','terms','holderTeam','handoverId'])||!validInformationCustody(s,c,c.seller,c.carrierId)||c.version!==1||!seller(c.seller)||c.buyer!==0||!id(c.carrierId)||c.carrierId!==u.id||!goods.includes(c.offered)||!num(c.amount,rules.maximumQuote)||c.amount<=0||!num(c.at,s.time)||!need(c.need)||!Array.isArray(c.terms)||c.terms.length<1||c.terms.length>rules.maximumTerms||c.terms.some(t=>!t||typeof t!=='object'||Array.isArray(t))||new Set(c.terms.map(t=>t.payment)).size!==c.terms.length||c.terms.some(t=>!t||typeof t!=='object'||Array.isArray(t)||!keys(t,['payment','price'])||!goods.includes(t.payment)||t.payment===c.offered||!num(t.price,rules.maximumQuote)||t.price<=0))return false;}
 return true;
}
