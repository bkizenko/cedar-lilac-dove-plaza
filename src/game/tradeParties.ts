import {mulberry32} from './rng';
import {knownSettlementSite} from './barter';
import {isRivalTeam} from './factions';
import {receiveFood} from './pantry';
import {lifeEvent} from './communities';
import type {Game} from './sim';
import type {GameState,ResKind} from './types';
import {alongRoute,bestShipClass,harbourDealBonus,harbourFrequencyBonus,harbourSlots,landCargoLimit,shipClassForAge,provisionsFor,spendTradeCapacity,tradeCapacityLeft,waterRoute,TRADE_CAPACITY_RULES} from './tradeFleet';
import {waterNavigation} from './waterNavigation';

/** Abstract travelling trade parties. A party is never removed while away from
 * its origin: it walks (or sails) to the destination, trades, then retraces the
 * whole route home and is dropped only on reaching its origin point. */
export const TRADE_PARTY_RULES={landSpeed:3.2,seaSpeed:6.5,tradeSeconds:40,arrivalReviewSeconds:420,maxParties:24,spread:.9,maxAmount:60,offerSeconds:90,offerMax:20,margin:.1,repFair:.05,repAttack:.4} as const;
const worth:Record<ResKind,number>={food:1,wood:1.2,stone:2.2,copper:4.5,iron:6.5};
const GOODS:ResKind[]=['food','wood','stone','copper','iron'];
export type TradePartyMode='land'|'sea';
export type TradePartyPhase='outbound'|'trading'|'returning'|'done';
export type TradeParty={version:1;id:number;kind:'foreign'|'expedition';mode:TradePartyMode;team:number;x0:number;z0:number;x1:number;z1:number;phase:TradePartyPhase;progress:number;travel:number;dwell:number;
  give?:ResKind;amount?:number;want?:ResKind;carryKind?:ResKind;carry?:number;leftover?:number;note?:string;offer?:TradeOffer;
  /** Sea parties follow this water polyline (home..destination); absent = straight line (old saves, land parties). */route?:{x:number;z:number}[];
  /** Ship class id, crew, armed guards, weapons carried (returned home) and food packed for the round trip. */ship?:string;crew?:number;guards?:number;weapons?:{kind:WeaponKind;n:number};provisions?:number;checkedAt?:number};
export type WeaponKind='spears'|'bows'|'blades';
/** A visiting trader's proposal: they carry `sell` here and want `buy` back. Their stock was already deducted at arrival. */
export type TradeOffer={sell:ResKind;sellAmt:number;buy:ResKind;buyAmt:number;status:'open'|'accepted'|'declined'|'expired'};
const TARGET:Record<ResKind,number>={food:120,wood:40,stone:40,copper:25,iron:25};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
/** Scarcity multiplier for a society's own stock: scarce goods cost more, surplus goods less. */
export const scarcity=(stock:number,k:ResKind)=>clamp((TARGET[k]+10)/(Math.max(0,stock)+10),.5,2.5);
export function marketPrices(g:Game,team:number):Record<ResKind,number>{
 const t=g.tribe(team),o={} as Record<ResKind,number>;for(const k of GOODS)o[k]=Math.round(worth[k]*scarcity(t[k],k)*100)/100;return o;
}
export const tradeReputation=(g:Game,team:number)=>g.state.tradeRep?.[team]??0;
export function adjustTradeReputation(g:Game,team:number,d:number){
 const r=(g.state.tradeRep??={});r[team]=clamp((r[team]??0)+d,-1,1);return r[team];
}
export const reputationLabel=(r:number)=>r>=.5?'Trusted partner':r>=.15?'Fair dealer':r<=-.5?'Distrusted':r<=-.15?'Wary':'Unknown';
const list=(g:Game)=>(g.state.tradeParties??=[]);
export const tradeParties=(g:Game)=>g.state.tradeParties??[];
const dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);

function ownPort(g:Game,team:number){return g.state.buildings.find(b=>b.team===team&&b.type==='dock'&&b.hp>0&&g.finished(b));}
/** Current world position, derived from progress; never stored separately. */
export function tradePartyPosition(p:TradeParty){
 if(p.route&&p.route.length>1){const f=p.phase==='outbound'?p.progress/p.travel:p.phase==='returning'?1-p.progress/p.travel:1,a=alongRoute(p.route,f);return{x:a.x,z:a.z};}
 const f=p.phase==='outbound'?p.progress/p.travel:p.phase==='returning'?1-p.progress/p.travel:1;
 const k=Math.max(0,Math.min(1,f));return{x:p.x0+(p.x1-p.x0)*k,z:p.z0+(p.z1-p.z0)*k};
}
/** Heading of travel (dx,dz), following the water route when there is one. */
export function tradePartyHeading(p:TradeParty){
 const sign=p.phase==='returning'?-1:1;
 if(p.route&&p.route.length>1){const f=p.phase==='outbound'?p.progress/p.travel:p.phase==='returning'?1-p.progress/p.travel:p.phase==='trading'?1:0,a=alongRoute(p.route,Math.min(.999,Math.max(.001,f)));return{dx:a.dx*sign,dz:a.dz*sign};}
 return{dx:(p.x1-p.x0)*sign,dz:(p.z1-p.z0)*sign};
}
export function tradePartyStatus(g:Game,p:TradeParty){
 const name=g.tribe(p.team)?.name??'a village',left=Math.max(0,Math.ceil(p.travel-p.progress)),how=p.mode==='sea'?'ship':'party';
 if(p.phase==='outbound')return`Your ${how} is travelling to ${name} (${left}s)`;
 if(p.phase==='trading')return`Your ${how} is trading at ${name}`;
 if(p.phase==='returning')return`Your ${how} is returning from ${name} (${left}s)`;
 return`Your ${how} is home`;
}
export type ExpeditionPlan={mode:TradePartyMode;cargoLimit:number;crew:number;ship?:string;shipName?:string;speed:number;slots?:number;slotsFree?:number;route?:{x:number;z:number}[];capacityLeft:number;issue:string|null};
const weaponStock=(g:Game):{kind:WeaponKind;n:number}|undefined=>{const t=g.tribe(0) as unknown as Record<string,number>;for(const k of ['blades','bows','spears'] as const)if((t[k]||0)>=1)return{kind:k,n:Math.min(Math.floor(t[k]),3)};return undefined;};
/** Sea expeditions currently holding a boat slot. */
export const seaSlotsInUse=(g:Game)=>(g.state.tradeParties??[]).filter(p=>p.kind==='expedition'&&p.mode==='sea'&&p.phase!=='done').length;
const active=(g:Game,mode:TradePartyMode)=>list(g).filter(p=>p.kind==='expedition'&&p.mode===mode&&p.phase!=='done').length;
/** Everything the UI and the dispatch need to know about one planned trip. The sea route is exact water; no route, no ship. */
export function planExpedition(g:Game,team:number,mode:TradePartyMode,give:ResKind,amount:number):ExpeditionPlan{
 const plan:ExpeditionPlan={mode,cargoLimit:0,crew:2,speed:TRADE_PARTY_RULES.landSpeed,capacityLeft:0,issue:null};
 const bad=(m:string)=>{plan.issue??=m;return plan;};
 if(!isRivalTeam(team)||!g.tribe(team)?.alive)return bad('Choose a known living village.');
 plan.capacityLeft=Math.floor(tradeCapacityLeft(g,team));
 const site=knownSettlementSite(g,team);
 if(mode==='sea'){
  const port=ownPort(g,0);if(!port)return bad('A ship needs a finished dock.');
  const cls=bestShipClass(g,0);plan.ship=cls.id;plan.shipName=cls.name;plan.cargoLimit=cls.cargo;plan.crew=cls.crew;plan.speed=TRADE_PARTY_RULES.seaSpeed*cls.speed;
  plan.slots=harbourSlots(g,0);plan.slotsFree=Math.max(0,plan.slots-active(g,'sea'));
  if(!plan.slotsFree)bad(`Every boat slot at your harbour is in use (${plan.slots}). A larger harbour holds more.`);
  if(site){const dest=ownPort(g,team)??site;const r=waterRoute(g,port,dest);if(!r)bad('No water route connects your dock to that village; a ship cannot go.');else plan.route=r.points;}
 }else{plan.cargoLimit=landCargoLimit(g);plan.crew=2+Math.min(2,Math.floor(plan.cargoLimit/30));}
 if(!isRivalTeam(team)||g.isFoe(0,team))return bad('That village will not receive your traders.');
 if(!site)return bad('You have not found where that village lives.');
 if(!GOODS.includes(give))return bad('Choose goods to carry.');
 if(give==='copper'&&g.tribe(0).age<1||give==='iron'&&g.tribe(0).age<2)return bad('Your village has not adopted that metal as a trade good.');
 if(!Number.isSafeInteger(amount)||amount<1)return bad('Carry at least 1.');
 if(amount>Math.min(TRADE_PARTY_RULES.maxAmount,plan.cargoLimit))return bad(`${mode==='sea'?plan.shipName:'A land party'} carries at most ${Math.min(TRADE_PARTY_RULES.maxAmount,plan.cargoLimit)}.`);
 if(g.tribe(0)[give]<amount)return bad(`Not enough ${give} in stores.`);
 if(amount>plan.capacityLeft)return bad(plan.capacityLeft<1?`${g.tribe(team).name} has no trade capacity left; it recovers slowly.`:`${g.tribe(team).name} can only trade ${plan.capacityLeft} more for now.`);
 if(list(g).filter(p=>p.kind==='expedition'&&p.phase!=='done').length>=4)return bad('Four expeditions are already out.');
 const adults=g.state.units.filter(u=>u.team===0&&u.hp>0&&u.type==='worker').length;if(adults<plan.crew+3)return bad(`Need ${plan.crew} to travel and at least 3 adults left at home.`);
 const home=mode==='sea'?ownPort(g,0)!:g.campOf(0),trip=Math.max(10,Math.ceil((plan.route?routeLen(plan.route):dist(home,site))/plan.speed))*2+TRADE_PARTY_RULES.tradeSeconds;
 const need=provisionsFor(plan.crew,trip)+(give==='food'?amount:0);if(g.tribe(0).food<need)return bad(`Pack ${provisionsFor(plan.crew,trip)} food for the crew first.`);
 return plan;
}
const routeLen=(r:{x:number;z:number}[])=>r.slice(1).reduce((a,p,i)=>a+dist(p,r[i]),0);
export function expeditionIssue(g:Game,team:number,mode:TradePartyMode,give:ResKind,amount:number):string|null{return planExpedition(g,team,mode,give,amount).issue;}
/** Dispatch: goods leave stores now; payment arrives only after the full round trip. */
export function dispatchTradeExpedition(g:Game,team:number,mode:TradePartyMode,give:ResKind,amount:number,want?:ResKind){
 if(mode==='sea')waterNavigation(g,true);
 const plan=planExpedition(g,team,mode,give,amount);if(plan.issue)return{accepted:false,reason:plan.issue};
 const site=knownSettlementSite(g,team)!,home=mode==='sea'?ownPort(g,0)!:g.campOf(0);
 const t=g.tribe(team),pick=want&&want!==give&&GOODS.includes(want)?want:(GOODS.filter(k=>k!==give).sort((a,b)=>t[b]*worth[b]-t[a]*worth[a])[0]);
 const length=plan.route?routeLen(plan.route):dist(home,site),travel=Math.max(10,Math.ceil(length/plan.speed));
 const provisions=provisionsFor(plan.crew,travel*2+TRADE_PARTY_RULES.tradeSeconds);
 g.spend(0,{[give]:amount,food:provisions});
 const w=weaponStock(g),guards=w?Math.min(w.n,mode==='sea'?Math.max(1,Math.floor(plan.crew/2)):2):0;
 if(w&&guards>0)(g.tribe(0) as unknown as Record<string,number>)[w.kind]-=guards;
 spendTradeCapacity(g,team,amount);
 const p:TradeParty={version:1,id:g.id(),kind:'expedition',mode,team,x0:home.x,z0:home.z,x1:site.x,z1:site.z,phase:'outbound',progress:0,travel,dwell:0,give,amount,want:pick,crew:plan.crew,guards,provisions,...(w&&guards>0?{weapons:{kind:w.kind,n:guards}}:{}),...(plan.ship?{ship:plan.ship}:{}),...(plan.route?{route:plan.route}:{})};
 list(g).push(p);
 const reason=`${mode==='sea'?plan.shipName:'Trading party'} (${plan.crew} crew${guards?`, ${guards} armed`:', unarmed'}) sent to ${t.name} with ${amount} ${give}. It will be back in about ${p.travel*2+TRADE_PARTY_RULES.tradeSeconds}s.`;
 lifeEvent(g,0,reason);return{accepted:true,reason,id:p.id};
}
function settle(g:Game,p:TradeParty){
 const t=g.tribe(p.team),give=p.give!,amount=p.amount!,want=p.want!,pr=marketPrices(g,p.team);
 const spare=Math.max(0,t[want]-(want==='food'?30:10)),fair=Math.floor(amount*pr[give]/pr[want]*TRADE_PARTY_RULES.spread*(1+(t.trust||0)*.1+Math.max(0,tradeReputation(g,p.team))*.1+(p.mode==='sea'?harbourDealBonus(harbourSlots(g,0)):0))),got=Math.min(fair,Math.floor(spare));
 if(got<1){p.carryKind=give;p.carry=amount;p.note=`${t.name} had nothing to spare; your goods are coming home`;return;}
 const pay=Math.min(amount,Math.ceil(got*pr[want]/pr[give]/TRADE_PARTY_RULES.spread));
 t[want]-=got;if(give==='food')t.food+=pay;else t[give]+=pay;
 p.carryKind=want;p.carry=got;if(amount>pay)p.leftover=amount-pay;
 p.note=`${t.name} gave ${got} ${want} for ${pay} ${give}`;
 t.trust=Math.min(1,(t.trust||0)+.05);adjustTradeReputation(g,p.team,TRADE_PARTY_RULES.repFair);
}
function finish(g:Game,p:TradeParty){
 const o=p.offer;
 if(p.kind==='foreign'&&o){// the foreign party physically carries goods back to its own society
  const t=g.tribe(p.team);
  if(o.status==='accepted'){t[o.buy]+=o.buyAmt;t.trust=Math.min(1,(t.trust||0)+.04);}
  else t[o.sell]+=o.sellAmt;
 }
 if(p.kind==='expedition'&&p.weapons){(g.tribe(0) as unknown as Record<string,number>)[p.weapons.kind]+=p.weapons.n;}
 if(p.kind==='expedition'&&p.carryKind&&p.carry){
  if(p.carryKind==='food')receiveFood(g,0,p.carry,'provisions');else g.tribe(0)[p.carryKind]+=p.carry;
  if(p.give&&p.leftover)g.tribe(0)[p.give]+=p.leftover;
  lifeEvent(g,0,`Your ${p.mode==='sea'?'ship':'party'} is home: ${p.note}. ${p.carry} ${p.carryKind} delivered.`);
 }
 p.phase='done';
}
/** Chance per review slot: 0.5 base, up to +0.2 from neighbours' surplus, +0.12 with an owned port. */
export function arrivalChance(g:Game,ids:number[]){
 let sur=0;for(const id of ids){const t=g.tribe(id);for(const k of GOODS)sur=Math.max(sur,clamp((t[k]-TARGET[k])/TARGET[k],0,1));}
 return Math.min(.85,.5+sur*.2+(ownPort(g,0)?.12+harbourFrequencyBonus(harbourSlots(g,0)):0));
}
/** Deterministic arrival of foreign traders; sea arrivals are likelier with a player port. */
export function reviewForeignArrivals(g:Game){
 const slot=Math.floor(g.state.time/TRADE_PARTY_RULES.arrivalReviewSeconds),r=mulberry32((g.state.seed^0x7a4de5)+slot*2654435761>>>0);
 const teams=g.state.tribes.filter(t=>isRivalTeam(t.id)&&t.alive&&!t.hostile&&!g.isFoe(0,t.id)&&tradeReputation(g,t.id)>-.5&&!!knownSettlementSite(g,t.id));
 if(!teams.length||r()>arrivalChance(g,teams.map(t=>t.id))||list(g).filter(p=>p.kind==='foreign'&&p.phase!=='done').length>=2)return null;
 const t=teams[Math.floor(r()*teams.length)],port=ownPort(g,0),foreign=knownSettlementSite(g,t.id)!;
 const wantsSea=r()<(port?.6:.12)&&!!(ownPort(g,t.id)||port);
 // Ships only sail connected water: with no route the traders come on foot instead.
 const sea0=wantsSea&&port?waterRoute(g,ownPort(g,t.id)??foreign,port):null,sea=!!sea0;
 const dest=sea&&port?port:g.campOf(0),origin=sea?(ownPort(g,t.id)??foreign):foreign;
 const speed=sea?TRADE_PARTY_RULES.seaSpeed:TRADE_PARTY_RULES.landSpeed;
 const len=sea0?sea0.length:dist(origin,dest);
 const p:TradeParty={version:1,id:g.id(),kind:'foreign',mode:sea?'sea':'land',team:t.id,x0:origin.x,z0:origin.z,x1:dest.x,z1:dest.z,phase:'outbound',progress:0,travel:Math.max(10,Math.ceil(len/speed)),dwell:0,...(sea0?{route:sea0.points,ship:shipClassForAge(t.age).id}:{})};
 list(g).push(p);return p;
}
/** Build a visiting trader's offer from their own surplus and the goods they lack; deducts their stock (they carry it). */
function makeOffer(g:Game,p:TradeParty):TradeOffer|null{
 const t=g.tribe(p.team),me=g.tribe(0),pr=marketPrices(g,p.team),rep=tradeReputation(g,p.team);
 const sell=[...GOODS].map(k=>({k,s:t[k]-TARGET[k]*.8})).filter(x=>x.s>=4).sort((a,b)=>b.s-a.s)[0]?.k;if(!sell)return null;
 const buy=GOODS.filter(k=>k!==sell&&me[k]>=3&&!(k==='copper'&&me.age<1)&&!(k==='iron'&&me.age<2)).sort((a,b)=>scarcity(t[b],b)-scarcity(t[a],a))[0];if(!buy)return null;
 const cap=Math.floor(tradeCapacityLeft(g,p.team));if(cap<TRADE_CAPACITY_RULES.minimumVisitorOffer)return null;
 const sellAmt=Math.min(TRADE_PARTY_RULES.offerMax,cap,Math.floor(t[sell]-TARGET[sell]*.8));if(sellAmt<1)return null;
 const buyAmt=Math.max(1,Math.ceil(sellAmt*pr[sell]*(1+TRADE_PARTY_RULES.margin-.1*Math.max(0,rep))/pr[buy]));
 t[sell]-=sellAmt;spendTradeCapacity(g,p.team,sellAmt);return{sell,sellAmt,buy,buyAmt,status:'open'};
}
export const openTradeOffers=(g:Game)=>list(g).filter(p=>p.kind==='foreign'&&p.phase==='trading'&&p.offer?.status==='open');
export function tradeOfferIssue(g:Game,id:number):string|null{
 const p=openTradeOffers(g).find(x=>x.id===id);if(!p||!p.offer)return'That offer is gone.';
 if(g.tribe(0)[p.offer.buy]<p.offer.buyAmt)return`Not enough ${p.offer.buy} in stores.`;return null;
}
/** Accept: the player's goods are handed to the party now and ride home with it; the traders' goods are already here. */
export function acceptTradeOffer(g:Game,id:number){
 const issue=tradeOfferIssue(g,id);if(issue)return{accepted:false,reason:issue};
 const p=openTradeOffers(g).find(x=>x.id===id)!,o=p.offer!;
 g.spend(0,{[o.buy]:o.buyAmt});
 if(o.sell==='food')receiveFood(g,0,o.sellAmt,'provisions');else g.tribe(0)[o.sell]+=o.sellAmt;
 o.status='accepted';adjustTradeReputation(g,p.team,TRADE_PARTY_RULES.repFair);
 const reason=`Traded ${o.buyAmt} ${o.buy} for ${o.sellAmt} ${o.sell} with ${g.tribe(p.team).name}.`;lifeEvent(g,0,reason);return{accepted:true,reason};
}
export function declineTradeOffer(g:Game,id:number){
 const p=openTradeOffers(g).find(x=>x.id===id);if(!p||!p.offer)return false;p.offer.status='declined';return true;
}
/** Attacking or cheating a society that has traders on the road costs reputation; its parties retreat with their goods. */
export function recordTradeAttack(g:Game,team:number){
 adjustTradeReputation(g,team,-TRADE_PARTY_RULES.repAttack);
 for(const p of list(g)){if(p.team===team&&p.kind==='foreign'&&p.offer?.status==='open')p.offer.status='declined';}
}
function watchHostility(g:Game){
 const seen=(g.state.tradeFoes??=[]);
 for(const t of g.state.tribes){if(!isRivalTeam(t.id))continue;const foe=g.isFoe(0,t.id),i=seen.indexOf(t.id);
  if(foe&&i<0){seen.push(t.id);recordTradeAttack(g,t.id);}else if(!foe&&i>=0)seen.splice(i,1);}
}
/** Raiders (team 3) near a travelling expedition: an armed party turns back with its goods, an unarmed one loses half its cargo. */
function raidCheck(g:Game,p:TradeParty){
 if(p.kind!=='expedition'||p.mode!=='land'||(p.phase!=='outbound'&&p.phase!=='returning')||p.phase==='returning'&&!p.carry&&!p.leftover&&!p.amount)return;
 const slot=Math.floor(g.state.time/10);if(p.checkedAt===slot)return;p.checkedAt=slot;
 const pos=tradePartyPosition(p);if(!g.state.units.some(u=>u.team===3&&u.hp>0&&Math.hypot(u.x-pos.x,u.z-pos.z)<35))return;
 if(p.guards){if(p.phase==='outbound'){p.phase='returning';p.progress=Math.max(0,p.travel-p.progress);p.carryKind=p.give;p.carry=p.amount;p.note='Armed guards turned the party back from raiders; the goods are coming home';p.amount=0;lifeEvent(g,0,p.note);}return;}
 if(p.phase==='outbound'&&p.amount){const lost=Math.ceil(p.amount/2);p.amount-=lost;p.note=`Raiders took ${lost} ${p.give} from the unarmed party`;lifeEvent(g,0,p.note);}
 else if(p.carry){const lost=Math.ceil(p.carry/2);p.carry-=lost;p.note=`Raiders took ${lost} ${p.carryKind} from the unarmed party`;lifeEvent(g,0,p.note);}
}
export function tickTradeParties(g:Game,dt:number){
 const parties=list(g);watchHostility(g);
 if(parties.length<TRADE_PARTY_RULES.maxParties&&g.state.tradeArrivalSlot!==Math.floor(g.state.time/TRADE_PARTY_RULES.arrivalReviewSeconds)){
  g.state.tradeArrivalSlot=Math.floor(g.state.time/TRADE_PARTY_RULES.arrivalReviewSeconds);reviewForeignArrivals(g);
 }
 for(const p of parties){
  raidCheck(g,p);
  if(p.phase==='outbound'){p.progress+=dt;if(p.progress>=p.travel){p.progress=0;p.phase='trading';p.dwell=0;
    if(p.kind==='foreign'){const o=makeOffer(g,p);if(o)p.offer=o;
     lifeEvent(g,0,`Traders from ${g.tribe(p.team).name} arrived ${p.mode==='sea'?'by sea':'on foot'}${o?`, offering ${o.sellAmt} ${o.sell} for ${o.buyAmt} ${o.buy}`:''}.`);}
    else settle(g,p);}}
  else if(p.phase==='trading'){p.dwell+=dt;if(p.dwell>=(p.offer?.status==='open'?TRADE_PARTY_RULES.offerSeconds:TRADE_PARTY_RULES.tradeSeconds)){if(p.offer?.status==='open')p.offer.status='expired';p.phase='returning';p.progress=0;}}
  else if(p.phase==='returning'){p.progress+=dt;if(p.progress>=p.travel)finish(g,p);}
 }
 // Removed only after physically reaching the origin point.
 if(parties.some(p=>p.phase==='done'))g.state.tradeParties=parties.filter(p=>p.phase!=='done');
}
export function validTradePartyState(s:GameState){
 const l=s.tradeParties??[];if(!Array.isArray(l)||l.length>TRADE_PARTY_RULES.maxParties)return false;
 const fin=(...n:number[])=>n.every(Number.isFinite);
 return l.every(p=>!!p&&p.version===1&&Number.isSafeInteger(p.id)&&p.id>0&&p.id<s.nextId&&['foreign','expedition'].includes(p.kind)&&['land','sea'].includes(p.mode)&&!!s.tribes[p.team]&&
  ['outbound','trading','returning'].includes(p.phase)&&fin(p.x0,p.z0,p.x1,p.z1,p.progress,p.travel,p.dwell)&&p.travel>0&&p.progress>=0&&p.progress<=p.travel+1&&
  (p.give===undefined||GOODS.includes(p.give))&&(p.route===undefined||Array.isArray(p.route)&&p.route.length>=2&&p.route.length<=80&&p.route.every(q=>!!q&&fin(q.x,q.z)))&&(p.crew===undefined||Number.isSafeInteger(p.crew)&&p.crew>=0&&p.crew<=64)&&(p.guards===undefined||Number.isSafeInteger(p.guards)&&p.guards>=0&&p.guards<=64)&&(p.carryKind===undefined||GOODS.includes(p.carryKind))&&(p.carry===undefined||Number.isFinite(p.carry)&&p.carry>=0)&&(p.note===undefined||typeof p.note==='string'&&p.note.length<200)&&
  (p.offer===undefined||!!p.offer&&GOODS.includes(p.offer.sell)&&GOODS.includes(p.offer.buy)&&Number.isSafeInteger(p.offer.sellAmt)&&p.offer.sellAmt>=0&&p.offer.sellAmt<=1000&&Number.isSafeInteger(p.offer.buyAmt)&&p.offer.buyAmt>=0&&p.offer.buyAmt<=1000&&['open','accepted','declined','expired'].includes(p.offer.status)))
  &&(s.tradeRep===undefined||!!s.tradeRep&&typeof s.tradeRep==='object'&&Object.entries(s.tradeRep).every(([k,v])=>!!s.tribes[+k]&&Number.isFinite(v)&&v>=-1&&v<=1))
  &&(s.tradeCapacity===undefined||!!s.tradeCapacity&&typeof s.tradeCapacity==='object'&&Object.entries(s.tradeCapacity).every(([k,v])=>!!s.tribes[+k]&&!!v&&Number.isFinite(v.left)&&v.left>=0&&Number.isFinite(v.at)))
  &&(s.tradeFoes===undefined||Array.isArray(s.tradeFoes)&&s.tradeFoes.length<=64&&s.tradeFoes.every(i=>Number.isSafeInteger(i)&&!!s.tribes[i]));
}
