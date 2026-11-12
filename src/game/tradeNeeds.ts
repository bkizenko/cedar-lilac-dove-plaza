import {packCapacityMultiplier} from './packAnimalState';
import type {Game} from './sim';
import type {GameState,Livestock,ResKind,Unit} from './types';
import {knownSettlementSite,localSettlementHall} from './barter';
import {tradeIntelAdvice} from './tradeIntel';
import {TRADE_PRICING} from './tradePricing';
import {rivalTradeReserve} from './rivalTrade';
import {carryingCapacity} from './haulage';
import {equipCaravan} from './caravans';
import {isRivalTeam} from './factions';
import {isDependent} from './settlement';
import {hasTaskCommitment} from './workCommitments';
import {receiveFood} from './pantry';
import {supplyDrops,supplyApproach,supplyReached} from './campAnchor';
import {penHousingCapacity} from './penGeometry';
import type {ItemKind} from './production';
import {villagePersonality} from './villagePersonality';

/**
 * TRADE-NEEDS / G15. Societies propose trades from what they actually lack and actually hold.
 * Nothing is created: an accepted offer moves both sides' goods into escrow (a reservation),
 * living carriers load them at a real cache, walk (with escorts scaled to observed risk and trust),
 * meet at the partner's real hall, are paid from the partner's escrow and carry the payment home.
 * Receipts record load / payment / delivery / loss. Declined offers cool down and change.
 */
export type GoodCategory='resource'|'weapon'|'armor'|'tool'|'artifact'|'clothing'|'animal';
export type GoodKind=ResKind|'spears'|'bows'|'blades'|'paddedArmor'|'cordage'|'basket'|'pottery'|'cloth'|'leather'|'skinClothes'|'hideCoat'|'woolCloth'|'woolCoat'|'goat';
type Good={cat:GoodCategory;worth:number;lot:number;maxLot:number;perCarrier:number};
export const TRADE_GOODS:Record<GoodKind,Good>={
 food:{cat:'resource',worth:TRADE_PRICING.worth.food,lot:8,maxLot:36,perCarrier:0},wood:{cat:'resource',worth:TRADE_PRICING.worth.wood,lot:8,maxLot:36,perCarrier:0},stone:{cat:'resource',worth:TRADE_PRICING.worth.stone,lot:8,maxLot:36,perCarrier:0},
 copper:{cat:'resource',worth:TRADE_PRICING.worth.copper,lot:2,maxLot:24,perCarrier:0},iron:{cat:'resource',worth:TRADE_PRICING.worth.iron,lot:2,maxLot:24,perCarrier:0},
 spears:{cat:'weapon',worth:3,lot:2,maxLot:8,perCarrier:8},bows:{cat:'weapon',worth:4,lot:2,maxLot:6,perCarrier:6},blades:{cat:'weapon',worth:7,lot:1,maxLot:4,perCarrier:4},
 paddedArmor:{cat:'armor',worth:5,lot:1,maxLot:4,perCarrier:4},cordage:{cat:'tool',worth:1.5,lot:4,maxLot:16,perCarrier:16},basket:{cat:'tool',worth:1.5,lot:2,maxLot:8,perCarrier:8},
 pottery:{cat:'artifact',worth:2.5,lot:2,maxLot:8,perCarrier:8},cloth:{cat:'artifact',worth:3,lot:2,maxLot:8,perCarrier:8},
 leather:{cat:'tool',worth:3,lot:2,maxLot:8,perCarrier:8},skinClothes:{cat:'clothing',worth:4,lot:1,maxLot:6,perCarrier:6},hideCoat:{cat:'clothing',worth:6,lot:1,maxLot:4,perCarrier:4},woolCloth:{cat:'artifact',worth:4,lot:2,maxLot:8,perCarrier:8},woolCoat:{cat:'clothing',worth:7,lot:1,maxLot:4,perCarrier:4},goat:{cat:'animal',worth:14,lot:1,maxLot:2,perCarrier:1},
};
export const TRADE_KINDS=Object.keys(TRADE_GOODS) as GoodKind[];
/** Bulk goods with an existing body holder: the carrier's own itemCargo (the same holder production uses). */
export const TRADE_BULK_ITEMS:GoodKind[]=['cordage','basket','pottery','cloth','leather','skinClothes','hideCoat','woolCloth','woolCoat'];
/** Goods that currently have a physical holder for the whole journey (carried resource loads, dropped as
 * parcels on death) and bulk items carried in the body's itemCargo (dropped as item parcels on death).
 * Armor assets, weapons, farm tools and animals stay in saves/observations but are not offered until
 * Codex-owned holder adapters exist (board request; review trade-cargo-5d9051c P1). */
export const TRADE_SELECTABLE_KINDS=TRADE_KINDS.filter(k=>TRADE_GOODS[k].cat==='resource'||TRADE_BULK_ITEMS.includes(k));
const WEAPONS=['spears','bows','blades'],ITEMS=['paddedArmor','cordage','basket','pottery','cloth','leather','skinClothes','hideCoat','woolCloth','woolCoat'];
export const TRADE_NEEDS_RULES={version:1,reviewSeconds:240,firstReviewSeconds:60,maximumMarketsCounted:3,marketFrequencyGain:.6,baseSpread:.3,spreadPerMarket:.07,minimumSpread:.04,answerDelayBase:15,answerDelayPerMeter:.04,playerAnswerSeconds:600,cooldownSeconds:600,maximumCooldownSeconds:3600,declineScale:.6,loadingSeconds:240,journeySeconds:900,hallMeters:26,maximumOffers:96,maximumObservations:64,maximumCooldowns:128,maximumReceipts:256,minimumHomeAdults:3,maximumCarriers:3,maximumEscorts:3,penHallMeters:40} as const;

export type TradeOfferPhase='proposed'|'loading'|'outbound'|'returning'|'aborting'|'complete'|'declined'|'failed';
export type TradeReceiptStage='loaded'|'paid'|'delivered'|'refunded'|'lost';
export type TradeLine={unitId:number;kind:GoodKind;amount:number;animals?:Livestock[]};
export type TradeSide={kind:GoodKind;amount:number;animals?:Livestock[];penId?:number};
export type TradeOffer={id:number;from:number;to:number;give:TradeSide;get:TradeSide;fairGet:number;spread:number;phase:TradeOfferPhase;createdAt:number;answerAt:number;startedAt?:number;hall:{x:number;z:number};
 reserved:boolean;carriers:number[];escorts:number[];ready:number[];lines:TradeLine[];risk:number;trust:number;escortsWanted:number;escortsArmed:number;escortsLost:number;carriersLost:number;paid:boolean;reason:string;lostAmount:number;lostToParcel:number;
 giveDelivered?:number;getDelivered?:number;needAmount:number;volume:number};
export type TradeCooldown={team:number;partner:number;give:GoodKind;get:GoodKind;until:number;declines:number;reason:string};
export type TradeReceipt={id:number;offerId:number;time:number;stage:TradeReceiptStage;team:number;kind:GoodKind;amount:number;unitId?:number;fairAmount?:number};
export type TradeTeamRow={team:number;nextReviewAt:number;proposed:number;accepted:number;declined:number;completed:number;failed:number;mix:Partial<Record<GoodKind,number>>;categories:Partial<Record<GoodCategory,number>>;reasons:Record<string,number>};
/** What a viewer's own people saw at a partner hall. Optional save field (default absent = never observed). */
export type TradeStockObservation={viewer:number;partner:number;observedAt:number;observerId:number;stock:Partial<Record<GoodKind,number>>};
export type TradeNeedsState={version:1;teams:TradeTeamRow[];offers:TradeOffer[];cooldowns:TradeCooldown[];receipts:TradeReceipt[];observations?:TradeStockObservation[]};
const OPEN:TradeOfferPhase[]=['proposed','loading','outbound','returning','aborting'];
const ACTIVE:TradeOfferPhase[]=['loading','outbound','returning','aborting'];
const dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
function root(g:Game){return g.state.tradeNeeds??={version:1,teams:[],offers:[],cooldowns:[],receipts:[]};}
function row(g:Game,team:number){const s=root(g);let r=s.teams.find(t=>t.team===team);if(!r){r={team,nextReviewAt:TRADE_NEEDS_RULES.firstReviewSeconds+team*17,proposed:0,accepted:0,declined:0,completed:0,failed:0,mix:{},categories:{},reasons:{}};s.teams.push(r);}return r;}
function note(g:Game,team:number,reason:string){const r=row(g,team);r.reasons[reason]=(r.reasons[reason]||0)+1;}
function receipt(g:Game,o:TradeOffer,stage:TradeReceiptStage,team:number,kind:GoodKind,amount:number,unitId?:number,fairAmount?:number){const s=root(g);s.receipts.push({id:g.id(),offerId:o.id,time:g.state.time,stage,team,kind,amount,unitId,fairAmount});if(s.receipts.length>TRADE_NEEDS_RULES.maximumReceipts)s.receipts.splice(0,s.receipts.length-TRADE_NEEDS_RULES.maximumReceipts);}

// ---- Stocks: every kind reads real state held by the society.
export function tradeStock(g:Game,team:number,k:GoodKind):number{const t=g.tribe(team);if(!t)return 0;
 if(k==='goat')return(g.state.livestock||[]).filter(a=>a.team===team&&a.hp>0&&a.species==='goat'&&!a.pregnancy&&a.sex!==undefined).length;
 if(WEAPONS.includes(k))return Math.floor((t as unknown as Record<string,number>)[k]||0);if(ITEMS.includes(k))return Math.floor(t.items?.[k as ItemKind]||0);return Math.floor(t[k as ResKind]||0);}
/** Adults actually near home and not already committed elsewhere — the ones who would stay behind. */
function homeAdultCount(g:Game,team:number){const home=g.campOf(team);return g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)&&!u.prisoner&&u.tradeNeedsId===undefined&&!hasTaskCommitment(u)&&!u.societyMissionId&&!u.expedition&&!u.boat&&dist(u,home)<=TRADE_NEEDS_RULES.hallMeters*3).length;}
function adults(g:Game,team:number){return g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)).length;}
function pop(g:Game,team:number){return g.state.units.filter(u=>u.team===team&&u.hp>0).length;}
export function tradeReserve(g:Game,team:number,k:GoodKind):number{
 if(TRADE_GOODS[k].cat==='resource')return team===0?0:rivalTradeReserve(g,team,k as ResKind);
 const a=adults(g,team);if(k==='spears'||k==='bows')return Math.max(1,Math.floor(a/4));if(k==='blades')return Math.max(0,Math.floor(a/6));if(k==='paddedArmor')return Math.max(0,Math.floor(a/6));
 if(k==='goat')return 2;return Math.ceil(pop(g,team)/6)+1;}
const usable=(g:Game,team:number,k:GoodKind)=>k==='copper'?g.tribe(team).age>=1:k==='iron'||k==='blades'?g.tribe(team).age>=2:true;
export function tradeNeed(g:Game,team:number,k:GoodKind){if(!usable(g,team,k))return 0;if(k==='goat'&&!penRoom(g,team))return 0;return Math.max(0,tradeReserve(g,team,k)-tradeStock(g,team,k));}
export function tradeSurplus(g:Game,team:number,k:GoodKind){return Math.max(0,tradeStock(g,team,k)-tradeReserve(g,team,k));}
function penRoom(g:Game,team:number,hall?:{x:number;z:number},exclude:number[]=[]){
 for(const b of g.state.buildings){if(b.team!==team||b.type!=='pen'||!g.finished(b)||b.hp<=0)continue;if(hall&&dist(b,hall)>TRADE_NEEDS_RULES.penHallMeters)continue;
  const held=(g.state.livestock||[]).filter(a=>a.pen===b.id&&a.hp>0).length+(g.state.tradeNeeds?.offers||[]).filter(o=>OPEN.includes(o.phase)&&o.reserved).reduce((n,o)=>n+[o.give,o.get].filter(s=>s.penId===b.id).reduce((m,s)=>m+s.amount,0),0);
  if(held<penHousingCapacity(b)&&!exclude.includes(b.id))return b;}
 return undefined;}
function addStock(g:Game,team:number,k:GoodKind,n:number,animals?:Livestock[],penId?:number){const t=g.tribe(team);if(!t||n<=0)return;
 if(k==='goat'){const pen=g.state.buildings.find(b=>b.id===penId&&b.team===team&&b.type==='pen'&&b.hp>0)||penRoom(g,team);
  for(const a of animals||[]){a.team=team;if(pen){a.pen=pen.id;a.x=pen.x;a.z=pen.z;}(g.state.livestock??=[]).push(a);}return;}
 if(k==='food'){receiveFood(g,team,n,'provisions');return;}
 if(WEAPONS.includes(k)){(t as unknown as Record<string,number>)[k]=((t as unknown as Record<string,number>)[k]||0)+n;return;}
 if(ITEMS.includes(k)){const items=t.items??={};items[k as ItemKind]=(items[k as ItemKind]||0)+n;return;}
 (t as unknown as Record<string,number>)[k]+=n;}
function removeStock(g:Game,team:number,k:GoodKind,n:number):{ok:boolean;animals?:Livestock[]}{const t=g.tribe(team);if(!t||tradeStock(g,team,k)<n)return{ok:false};
 if(k==='goat'){const list=(g.state.livestock||[]).filter(a=>a.team===team&&a.hp>0&&a.species==='goat'&&!a.pregnancy).sort((a,b)=>a.id-b.id).slice(0,n);g.state.livestock=(g.state.livestock||[]).filter(a=>!list.includes(a));return{ok:true,animals:list};}
 if(k==='food'){g.spend(team,{food:n});return{ok:true};}
 if(WEAPONS.includes(k)){(t as unknown as Record<string,number>)[k]-=n;return{ok:true};}
 if(ITEMS.includes(k)){t.items![k as ItemKind]=(t.items![k as ItemKind]||0)-n;return{ok:true};}
 (t as unknown as Record<string,number>)[k]-=n;return{ok:true};}

// ---- Markets (read from building state; no economy file is edited).
export function marketCount(g:Game,team:number){return Math.min(TRADE_NEEDS_RULES.maximumMarketsCounted,g.state.buildings.filter(b=>b.team===team&&b.type==='market'&&b.hp>0&&g.finished(b)).length);}
export function tradeReviewSeconds(g:Game,team:number){return TRADE_NEEDS_RULES.reviewSeconds/(1+TRADE_NEEDS_RULES.marketFrequencyGain*marketCount(g,team))/villagePersonality(g,team).sociability;}
export function tradeSpread(g:Game,a:number,b:number){return Math.max(TRADE_NEEDS_RULES.minimumSpread,TRADE_NEEDS_RULES.baseSpread-TRADE_NEEDS_RULES.spreadPerMarket*Math.min(TRADE_NEEDS_RULES.maximumMarketsCounted,marketCount(g,a)+marketCount(g,b)));}

// ---- Observed trust and risk.
function pairHistory(g:Game,a:number,b:number){const offers=(g.state.tradeNeeds?.offers||[]).filter(o=>(o.from===a&&o.to===b)||(o.from===b&&o.to===a));return{done:offers.filter(o=>o.phase==='complete').length,lost:offers.filter(o=>o.carriersLost+o.escortsLost>0).reduce((n,o)=>n+o.carriersLost+o.escortsLost,0)};}
export function tradeTrust(g:Game,a:number,b:number){const h=pairHistory(g,a,b);return Math.max(0,Math.min(1,.5+.12*h.done-.3*h.lost));}
export function observedRisk(g:Game,from:number,to:number,hall:{x:number;z:number},value:number){
 const trust=tradeTrust(g,from,to),home=g.campOf(from),mine=g.state.units.filter(u=>u.team===from&&u.hp>0);
 const raiders=g.state.units.filter(u=>u.team===3&&u.hp>0&&mine.some(m=>dist(m,u)<60)).length;
 const hostile=g.isFoe(from,to)?1:0,distanceTerm=Math.min(1,dist(home,hall)/500),cargo=Math.min(1,value/60);
 return{trust,risk:Math.max(0,Math.min(1,.05+.35*(1-trust)+.12*Math.min(3,raiders)+.1*distanceTerm+.1*cargo+.3*hostile))};}
export function escortsForRisk(risk:number){return risk<.4?0:risk<.6?1:risk<.8?2:3;}

// ---- Proposal.
const free=(g:Game,u:Unit,team:number)=>u.team===team&&u.hp>=u.maxHp*.6&&!u.prisoner&&!isDependent(g,u)&&u.carry===0&&!Object.values(u.itemCargo||{}).some(n=>(n||0)>0)&&!hasTaskCommitment(u)&&!u.societyMissionId&&!u.coastalVoyageId&&!u.coastalCommissionId&&!u.jobLock&&!u.buildOrder&&!u.tamingWork&&!u.husbandryWork&&!u.tributeJourney&&!u.visit&&!u.scout&&!u.expedition&&!u.envoy&&!u.emergency&&!u.recalled&&!u.foundingJourney&&!u.weaponWork&&!u.haulageWork&&!u.farmToolWork&&!u.studyCrop&&u.drill==null&&u.tradeNeedsId===undefined&&['idle','gather','hold'].includes(u.order);
function capacity(u:Unit,k:GoodKind){const good=TRADE_GOODS[k];return good.cat==='resource'?Math.floor(carryingCapacity(u,k as ResKind)):Math.floor(good.perCarrier*(u.haulage==='pack'?packCapacityMultiplier(u):1));}
function cooling(g:Game,from:number,to:number,give:GoodKind,get:GoodKind){return g.state.tradeNeeds?.cooldowns.find(c=>c.team===from&&c.partner===to&&c.give===give&&c.get===get&&c.until>g.state.time);}
function declineRow(g:Game,from:number,to:number,give:GoodKind,get:GoodKind){return g.state.tradeNeeds?.cooldowns.find(c=>c.team===from&&c.partner===to&&c.give===give&&c.get===get);}
export type TradeProposal={ok:true;offer:TradeOffer}|{ok:false;reason:string};
/** A proposal moves nothing: stocks are checked and reserved only on acceptance. */
export function proposeTradeOffer(g:Game,from:number,to:number,give:GoodKind,get:GoodKind,wantAmount?:number,playerGiveAmount?:number):TradeProposal{
 const no=(reason:string)=>{note(g,from,reason);return{ok:false as const,reason};};
 const player=from===0&&playerGiveAmount!==undefined;
 if(from===0&&!player||from===3||!g.tribe(from)?.alive||!g.tribe(to)?.alive||from===to||to===3||give===get)return no('invalid');
 if(!TRADE_GOODS[give]||!TRADE_GOODS[get]||g.isFoe(from,to))return no('foe');
 if(!TRADE_SELECTABLE_KINDS.includes(give)||!TRADE_SELECTABLE_KINDS.includes(get))return no('no-physical-holder');
 const site=knownSettlementSite(g,to,from);if(!site)return no('partner-unknown');
 // Walking caravans need a land route; overseas partners are served by the boat path (coastalTrade).
 {const home=g.campOf(from);if(!g.workBoard.connected(g,home.x,home.z,site.x,site.z))return no('no-land-route');}
 if(cooling(g,from,to,give,get))return no('cooldown');
 if(root(g).offers.some(o=>OPEN.includes(o.phase)&&o.from===from))return no('already-trading');
 const spread=tradeSpread(g,from,to),wg=TRADE_GOODS[give].worth,wt=TRADE_GOODS[get].worth,declines=declineRow(g,from,to,give,get)?.declines??0,scale=Math.pow(TRADE_NEEDS_RULES.declineScale,declines);
 const need=Math.max(1,Math.ceil(Math.min(wantAmount??tradeNeed(g,from,get),TRADE_GOODS[get].maxLot)*scale));
 let giveAmt=Math.ceil(need*wt/wg/(1-spread));const surplus=player?tradeStock(g,from,give):tradeSurplus(g,from,give);
 // The player names the amount it offers from what it actually holds; NPCs offer only beyond reserve.
 if(player){if(!Number.isFinite(playerGiveAmount)||playerGiveAmount!<1)return no('invalid');giveAmt=Math.floor(playerGiveAmount!);if(giveAmt>surplus)return no('no-surplus');if(giveAmt>TRADE_GOODS[give].maxLot)return no('too-large');}
 else giveAmt=Math.min(giveAmt,surplus,TRADE_GOODS[give].maxLot);if(giveAmt<TRADE_GOODS[give].lot)return no('no-surplus');
 const getAmt=Math.min(TRADE_GOODS[get].maxLot,Math.floor(giveAmt*wg/wt*(1-spread)+1e-9));if(getAmt<TRADE_GOODS[get].lot)return no('low-value');
 const fair=giveAmt*wg/wt,{trust,risk}=observedRisk(g,from,to,site,giveAmt*wg);
 const o:TradeOffer={id:g.id(),from,to,give:{kind:give,amount:giveAmt},get:{kind:get,amount:getAmt},fairGet:fair,spread,phase:'proposed',createdAt:g.state.time,answerAt:g.state.time+TRADE_NEEDS_RULES.answerDelayBase+dist(g.campOf(from),site)*TRADE_NEEDS_RULES.answerDelayPerMeter,hall:{x:site.x,z:site.z},reserved:false,carriers:[],escorts:[],ready:[],lines:[],risk,trust,escortsWanted:escortsForRisk(risk/villagePersonality(g,from).boldness),escortsArmed:0,escortsLost:0,carriersLost:0,paid:false,reason:'Proposed from observed need',lostAmount:0,lostToParcel:0,needAmount:need,volume:giveAmt*wg};
 const s=root(g);while(s.offers.length>=TRADE_NEEDS_RULES.maximumOffers){const i=s.offers.findIndex(x=>!OPEN.includes(x.phase));if(i<0)return no('slots');s.offers.splice(i,1);}
 s.offers.push(o);const r=row(g,from);r.proposed++;for(const k of [give,get]){r.mix[k]=(r.mix[k]||0)+1;const c=TRADE_GOODS[k].cat;r.categories[c]=(r.categories[c]||0)+1;}
 return{ok:true,offer:o};}

/** Player-originated needs trade with any village it has located: the player names what it gives and how much;
 * the partner answers from its own need and surplus after the message travels; goods and people then move on the
 * same escrow/carrier/receipt path as NPC trades (player carriers are its own free adults). */
export function proposePlayerTrade(g:Game,to:number,give:GoodKind,get:GoodKind,giveAmount:number){return proposeTradeOffer(g,0,to,give,get,undefined,giveAmount);}
/** What this partner's refusals taught: it did not need the offered good, or could not spare the requested one. */
function learnedBlock(g:Game,from:number,to:number,give:GoodKind,get:GoodKind){return !!g.state.tradeNeeds?.cooldowns.some(c=>c.team===from&&c.partner===to&&c.until>g.state.time&&(c.reason==='no-need'&&c.give===give||c.reason==='no-surplus'&&c.get===get));}
/** Ranks an NPC's needs against its surplus; recently proposed kinds are penalized so offers stay varied. */
export function chooseTradeOffer(g:Game,team:number,partner:number){
 const mix=row(g,team).mix,wants=TRADE_SELECTABLE_KINDS.filter(k=>tradeNeed(g,team,k)>0),gives=TRADE_SELECTABLE_KINDS.filter(k=>tradeSurplus(g,team,k)>=TRADE_GOODS[k].lot);
 const out:{give:GoodKind;get:GoodKind;score:number}[]=[];
 for(const get of wants)for(const give of gives){if(give===get||cooling(g,team,partner,give,get))continue;
  if(learnedBlock(g,team,partner,give,get))continue;
  if(TRADE_GOODS[give].cat==='resource'&&TRADE_GOODS[get].cat==='resource'){const advice=tradeIntelAdvice(g,team,partner,give as ResKind,get as ResKind);if(advice.status==='discouraged')continue;}
  const shortage=tradeNeed(g,team,get)/Math.max(1,tradeReserve(g,team,get)),glut=tradeSurplus(g,team,give)/Math.max(1,tradeReserve(g,team,give)+1);
  out.push({give,get,score:shortage*2+Math.min(2,glut)-.35*((mix[give]||0)+(mix[get]||0))-(declineRow(g,team,partner,give,get)?.declines||0)*.4});}
 return out.sort((a,b)=>b.score-a.score||TRADE_KINDS.indexOf(a.give)-TRADE_KINDS.indexOf(b.give)||TRADE_KINDS.indexOf(a.get)-TRADE_KINDS.indexOf(b.get));}

export function reviewTradeNeeds(g:Game){
 const s=g.state.tradeNeeds;if(!s&&g.state.time<TRADE_NEEDS_RULES.firstReviewSeconds)return;
 for(const t of g.state.tribes){if(!isRivalTeam(t.id)||!t.alive)continue;const r=row(g,t.id);if(g.state.time<r.nextReviewAt)continue;
  r.nextReviewAt=g.state.time+tradeReviewSeconds(g,t.id);
  const partners=g.state.tribes.filter(p=>p.id!==t.id&&p.id!==3&&p.alive&&!g.isFoe(t.id,p.id)&&!!knownSettlementSite(g,p.id,t.id)).sort((a,b)=>tradeTrust(g,t.id,b.id)-tradeTrust(g,t.id,a.id)||a.id-b.id);
  if(!partners.length){note(g,t.id,'no-partner');continue;}
  let done=false;for(const p of partners){for(const c of chooseTradeOffer(g,t.id,p.id).slice(0,6)){if(proposeTradeOffer(g,t.id,p.id,c.give,c.get).ok){done=true;break;}}if(done)break;}
  if(!done)note(g,t.id,'no-match');}}

// ---- Answer, reserve and launch.
function decline(g:Game,o:TradeOffer,reason:string,coolFrom=true){o.phase='declined';o.reason=reason;row(g,o.from).declined++;note(g,o.from,'declined-'+reason);
 if(coolFrom){const s=root(g);let c=declineRow(g,o.from,o.to,o.give.kind,o.get.kind);if(!c){c={team:o.from,partner:o.to,give:o.give.kind,get:o.get.kind,until:0,declines:0,reason};s.cooldowns.push(c);}c.declines++;c.reason=reason;c.until=g.state.time+Math.min(TRADE_NEEDS_RULES.maximumCooldownSeconds,TRADE_NEEDS_RULES.cooldownSeconds*Math.pow(2,c.declines-1));while(s.cooldowns.length>TRADE_NEEDS_RULES.maximumCooldowns)s.cooldowns.shift();}}
function qualifies(g:Game,o:TradeOffer){const t=g.tribe(o.to);
 if(!t?.alive||g.isFoe(o.from,o.to))return'foe';
 if(o.to!==0){if(tradeStock(g,o.to,o.give.kind)>=tradeReserve(g,o.to,o.give.kind)*(1+.25*villagePersonality(g,o.to).sociability)+1&&tradeNeed(g,o.to,o.give.kind)<=0)return'no-need';
  if(tradeSurplus(g,o.to,o.get.kind)<o.get.amount)return'no-surplus';}
 else if(tradeStock(g,0,o.get.kind)<o.get.amount)return'no-surplus';
 return'';}
/** Both sides' goods move into escrow only if both still hold them, the proposer has living carriers, and animals have pen room. */
type CommitReady={blocker:'';home:{x:number;z:number};pool:Unit[];carriers:Unit[];pg?:number;pt?:number};
type CommitPlan={blocker:string}|CommitReady;
/** Pure: every admission check of the accept path, without moving goods or people. */
function commitPlan(g:Game,o:TradeOffer):CommitPlan{
 if(o.from!==0&&tradeStock(g,o.from,o.give.kind)-tradeReserve(g,o.from,o.give.kind)<o.give.amount&&o.give.kind!=='food')return{blocker:'proposer-short'};if(tradeStock(g,o.from,o.give.kind)<o.give.amount)return{blocker:'proposer-short'};
 if(tradeStock(g,o.to,o.get.kind)<o.get.amount)return{blocker:'partner-short'};
 const home=g.campOf(o.from),pool=g.state.units.filter(u=>u.type==='worker'&&free(g,u,o.from)&&!u.militia&&supplyDrops(g,o.from).length>0).sort((a,b)=>(b.haulage==='pack'?packCapacityMultiplier(b):1)-(a.haulage==='pack'?packCapacityMultiplier(a):1)||dist(a,home)-dist(b,home)||a.id-b.id);
 if(!pool.length)return{blocker:'no-carriers'};
 const carriers:Unit[]=[];let capGive=0,capGet=0;for(const u of pool){if(capGive>=o.give.amount&&capGet>=o.get.amount||carriers.length>=TRADE_NEEDS_RULES.maximumCarriers)break;carriers.push(u);capGive+=capacity(u,o.give.kind);capGet+=capacity(u,o.get.kind);}
 if(capGive<o.give.amount||capGet<o.get.amount)return{blocker:'too-heavy'};
 const homeAdults=homeAdultCount(g,o.from)-carriers.length;if(homeAdults<TRADE_NEEDS_RULES.minimumHomeAdults)return{blocker:'home-short'};
 let pg:number|undefined,pt:number|undefined;
 if(o.get.kind==='goat'){const pen=penRoom(g,o.from,home);if(!pen)return{blocker:'no-pen'};pg=pen.id;}
 if(o.give.kind==='goat'){const hall=g.state.buildings.find(b=>b.team===o.to&&b.type==='townhall'&&g.finished(b));const pen=hall?penRoom(g,o.to,hall):undefined;if(!pen)return{blocker:'partner-no-pen'};pt=pen.id;}
 return{blocker:'',home,pool,carriers,pg,pt};}
/** Dry run for UI: the exact reason the accept path would decline this offer now, or '' if it would launch.
 * Shares qualifies()/commitPlan() with answerTradeOffer, so the dialog never duplicates the checks. */
export function tradeAnswerBlocker(g:Game,offer:TradeOffer|number):string{
 const id=typeof offer==='number'?offer:offer.id,o=g.state.tradeNeeds?.offers.find(x=>x.id===id);// never a detached caller object
 if(!o||o.phase!=='proposed')return'not-open';
 return qualifies(g,o)||commitPlan(g,o).blocker;}
function commit(g:Game,o:TradeOffer){
 const t=g.tribe(o.from),plan=commitPlan(g,o);if(plan.blocker!=='')return plan.blocker;
 const {home,pool,carriers,pg,pt}=plan as CommitReady;
 const gs=removeStock(g,o.from,o.give.kind,o.give.amount);if(!gs.ok)return'proposer-short';
 const ts=removeStock(g,o.to,o.get.kind,o.get.amount);if(!ts.ok){addStock(g,o.from,o.give.kind,o.give.amount,gs.animals);return'partner-short';}
 o.give.animals=gs.animals;o.get.animals=ts.animals;o.give.penId=pt;o.get.penId=pg;o.reserved=true;
 // The proposer's escorts: existing free militia first; otherwise a worker is armed from real stock at the cache.
 const escorts=g.state.units.filter(u=>u.team===o.from&&u.hp>0&&u.militia&&!u.caravanArmed&&free(g,u,o.from)&&!carriers.includes(u)).sort((x,y)=>dist(x,home)-dist(y,home)||x.id-y.id).slice(0,o.escortsWanted);
 const spare=pool.filter(u=>!carriers.includes(u)&&!escorts.includes(u));while(escorts.length<o.escortsWanted&&spare.length&&(t.spears>0||t.bows>0||(t.blades||0)>0)&&homeAdultCount(g,o.from)-carriers.length-escorts.length-1>=TRADE_NEEDS_RULES.minimumHomeAdults)escorts.push(spare.shift()!);
 for(const u of [...carriers,...escorts]){g.interruptMission(u);u.tradeNeedsId=o.id;u.order='hold';u.node=null;u.target=null;u.job=null;u.stuckT=0;u.workReason='Gathering goods for a needs-based trade';}
 o.carriers=carriers.map(u=>u.id);o.escorts=escorts.map(u=>u.id);o.ready=[];o.phase='loading';o.startedAt=g.state.time;o.reason='Carriers gathering the reserved goods at the home cache';row(g,o.from).accepted++;return'';}
export function answerTradeOffer(g:Game,id:number,accept:boolean,asPlayer=true){
 const o=g.state.tradeNeeds?.offers.find(o=>o.id===id&&o.phase==='proposed');if(!o||(o.to===0&&!asPlayer))return false;
 if(!accept){decline(g,o,'refused');return true;}
 const q=qualifies(g,o);if(q){decline(g,o,q);return true;}
 const c=commit(g,o);if(c){decline(g,o,c);return true;}return true;}
function evaluate(g:Game,o:TradeOffer){if(o.to===0){if(g.state.time>=o.answerAt+TRADE_NEEDS_RULES.playerAnswerSeconds)decline(g,o,'expired');return;}
 const q=qualifies(g,o);if(q){decline(g,o,q);return;}const c=commit(g,o);if(c)decline(g,o,c);}

// ---- Physical lifecycle.
const unitOf=(g:Game,id:number)=>g.state.units.find(u=>u.id===id);
const alive=(g:Game,o:TradeOffer,id:number)=>{const u=unitOf(g,id);return!!u&&u.hp>0&&u.team===o.from&&!u.prisoner&&u.tradeNeedsId===o.id;};
function release(g:Game,u:Unit){u.tradeNeedsId=undefined;if(u.carry>0&&!u.carryType)u.carry=0;u.order=u.militia&&!u.caravanArmed?'hold':'idle';u.target=null;u.node=null;u.workReason='Home from trading';}
function setCarry(u:Unit,lines:TradeLine[]){const l=lines.find(l=>l.unitId===u.id&&TRADE_GOODS[l.kind].cat==='resource');if(l){u.carry=l.amount;u.carryType=l.kind as ResKind;u.carryFood=l.kind==='food'?'provisions':undefined;}else{u.carry=0;u.carryType=null;u.carryFood=undefined;}
 const items=lines.filter(l=>l.unitId===u.id&&TRADE_BULK_ITEMS.includes(l.kind));if(items.length){const cargo:Partial<Record<ItemKind,number>>={};for(const x of items)cargo[x.kind as ItemKind]=(cargo[x.kind as ItemKind]||0)+x.amount;u.itemCargo=cargo;}else if(u.tradeNeedsId!==undefined)u.itemCargo=undefined;}
function finishOffer(g:Game,o:TradeOffer,phase:'complete'|'failed',reason:string){o.phase=phase;o.reason=reason;for(const id of [...o.carriers,...o.escorts]){const u=unitOf(g,id);if(u&&u.tradeNeedsId===o.id)release(g,u);}o.carriers=[];o.escorts=[];o.ready=[];if(phase==='complete')row(g,o.from).completed++;else{row(g,o.from).failed++;note(g,o.from,'failed-'+reason);}}
function refundEscrow(g:Game,o:TradeOffer,side:'give'|'get'){const s=o[side],team=side==='give'?o.from:o.to;if(s.amount>0)addStock(g,team,s.kind,s.amount,s.animals);if(s.amount>0)receipt(g,o,'refunded',team,s.kind,s.amount);s.amount=0;s.animals=undefined;}
function abort(g:Game,o:TradeOffer,reason:string){
 o.reason=reason;note(g,o.from,'abort-'+reason);
 if(!o.paid&&o.get.amount>0)refundEscrow(g,o,'get');
 if(o.phase==='loading'||!o.lines.length){if(o.phase==='loading'&&o.give.amount>0)refundEscrow(g,o,'give');finishOffer(g,o,'failed',reason);return;}
 o.phase='aborting';}
function unload(g:Game,o:TradeOffer,u:Unit){for(const l of o.lines.filter(l=>l.unitId===u.id)){addStock(g,o.from,l.kind,l.amount,l.animals,o.get.penId);receipt(g,o,l.kind===o.get.kind&&o.paid?'delivered':'refunded',o.from,l.kind,l.amount,u.id,l.kind===o.get.kind&&o.paid?o.fairGet:undefined);if(o.paid)o.getDelivered=(o.getDelivered||0)+l.amount;}
 o.lines=o.lines.filter(l=>l.unitId!==u.id);setCarry(u,o.lines);}
function reconcile(g:Game,o:TradeOffer){
 const before=o.carriersLost;
 for(const id of [...o.carriers]){if(alive(g,o,id))continue;const u=unitOf(g,id);o.carriers=o.carriers.filter(x=>x!==id);o.carriersLost++;
  for(const l of o.lines.filter(l=>l.unitId===id)){o.lostAmount+=l.amount;if(TRADE_GOODS[l.kind].cat==='resource'||TRADE_BULK_ITEMS.includes(l.kind))o.lostToParcel+=l.amount;receipt(g,o,'lost',o.from,l.kind,l.amount,id);}
  o.lines=o.lines.filter(l=>l.unitId!==id);o.ready=o.ready.filter(x=>x!==id);if(u&&u.tradeNeedsId===o.id){u.tradeNeedsId=undefined;}}
 for(const id of [...o.escorts]){if(alive(g,o,id))continue;o.escorts=o.escorts.filter(x=>x!==id);o.escortsLost++;const u=unitOf(g,id);if(u&&u.tradeNeedsId===o.id)u.tradeNeedsId=undefined;}
 const lost=o.carriersLost>before;if(lost&&!o.paid&&(o.phase==='loading'||o.phase==='outbound')&&o.carriers.length){abort(g,o,'carrier-lost');return;}
 if(!o.carriers.length&&ACTIVE.includes(o.phase)){if(o.phase==='loading'){abort(g,o,'carrier-lost');}else{if(!o.paid&&o.get.amount>0)refundEscrow(g,o,'get');finishOffer(g,o,'failed','carrier-lost');}}}
export function tickTradeNeeds(g:Game,_dt:number){
 const s=g.state.tradeNeeds;if(!s)return;
 for(const o of s.offers){if(!OPEN.includes(o.phase))continue;
  if(o.phase==='proposed'){if(g.state.time>=o.answerAt)evaluate(g,o);continue;}
  reconcile(g,o);if(!OPEN.includes(o.phase))continue;
  const age=g.state.time-(o.startedAt??o.createdAt);
  if(o.phase==='loading'){if(age>TRADE_NEEDS_RULES.loadingSeconds){abort(g,o,'loading-timeout');continue;}
   // Readiness is re-checked at the handoff: every carrier must be standing at a cache right now.
   if(o.carriers.every(id=>o.ready.includes(id))&&o.escorts.every(id=>o.ready.includes(id)||!alive(g,o,id))&&!o.carriers.every(id=>atCacheNow(g,unitOf(g,id)!,o.from))){o.ready=o.ready.filter(id=>atCacheNow(g,unitOf(g,id)!,o.from));continue;}
   if(o.carriers.every(id=>o.ready.includes(id))&&o.escorts.every(id=>o.ready.includes(id)||!alive(g,o,id))){
    const lines:TradeLine[]=[];let left=o.give.amount,animals=o.give.animals?[...o.give.animals]:undefined;
    for(const id of o.carriers){const u=unitOf(g,id)!;const take=Math.min(left,capacity(u,o.give.kind));if(take<=0)continue;lines.push({unitId:id,kind:o.give.kind,amount:take,animals:animals?animals.splice(0,take):undefined});left-=take;}
    o.lines=lines;for(const l of lines)receipt(g,o,'loaded',o.from,l.kind,l.amount,l.unitId);o.give.amount=0;o.give.animals=undefined;for(const id of o.carriers)setCarry(unitOf(g,id)!,o.lines);
    o.escortsArmed=o.escorts.filter(id=>unitOf(g,id)?.militia).length;o.phase='outbound';o.startedAt=g.state.time;o.ready=[];o.reason='Walking to the partner hall with the reserved goods';}
   continue;}
  if(age>TRADE_NEEDS_RULES.journeySeconds&&(o.phase==='outbound'||o.phase==='returning')){if(o.phase==='outbound')abort(g,o,'journey-timeout');else{abort(g,o,'journey-timeout');}continue;}
  if(o.phase==='outbound'&&g.isFoe(o.from,o.to)){abort(g,o,'became-foe');continue;}
  if(o.phase==='outbound'){const us=o.carriers.map(id=>unitOf(g,id)!);
   if(us.every(u=>localSettlementHall(g,u,o.to))){
    observePartnerStock(g,o.from,o.to,us[0]);
    // Meeting: partner receives the offered goods and pays from its reserved escrow.
    for(const l of o.lines){addStock(g,o.to,l.kind,l.amount,l.animals,o.give.penId);receipt(g,o,'paid',o.to,l.kind,l.amount,l.unitId);o.giveDelivered=(o.giveDelivered||0)+l.amount;}
    o.lines=[];let left=o.get.amount,animals=o.get.animals?[...o.get.animals]:undefined;
    for(const u of us){const take=Math.min(left,capacity(u,o.get.kind));if(take<=0)continue;o.lines.push({unitId:u.id,kind:o.get.kind,amount:take,animals:animals?animals.splice(0,take):undefined});left-=take;receipt(g,o,'loaded',o.to,o.get.kind,take,u.id,o.fairGet);}
    o.get.amount=0;o.get.animals=undefined;o.paid=true;for(const u of us)setCarry(u,o.lines);o.phase='returning';o.ready=[];o.reason='Carrying the partner’s payment home';o.startedAt=g.state.time;}
   continue;}
  if(o.phase==='returning'||o.phase==='aborting'){
   if(!o.lines.length){finishOffer(g,o,o.phase==='returning'?'complete':'failed',o.phase==='returning'?'Delivered':o.reason);continue;}}
 }
}
/** Drives one carrier or escort; returns true when the person is committed to an offer. */
export function tradeNeedsAI(g:Game,u:Unit,dt:number){
 if(u.tradeNeedsId===undefined)return false;
 const o=g.state.tradeNeeds?.offers.find(o=>o.id===u.tradeNeedsId&&ACTIVE.includes(o.phase));
 if(!o||(!o.carriers.includes(u.id)&&!o.escorts.includes(u.id))){u.tradeNeedsId=undefined;return false;}
 const walk=(p:{x:number;z:number},text:string)=>{u.order='hold';u.workReason=text;u.tx=p.x;u.tz=p.z;g.steer(u,dt);};
 const atCache=()=>{for(const d of supplyDrops(g,o.from)){const p=supplyApproach(g,u,d);if(!p)continue;if(supplyReached(g,u,d,p))return true;walk(p,'Walking to the home cache');return false;}return false;};
 const carrier=o.carriers.includes(u.id);
 if(!carrier){const lead=o.carriers.map(id=>unitOf(g,id)).find(x=>x&&x.hp>0);if(!lead)return true;
  if(o.phase==='loading'){if(!u.militia&&!u.caravanArmed){if(atCache()){if(!equipCaravan(g,u)){o.escorts=o.escorts.filter(x=>x!==u.id);release(g,u);o.reason='An escort could not be armed from real stock';return false;}if(!o.ready.includes(u.id))o.ready.push(u.id);}return true;}
   if(atCache()&&!o.ready.includes(u.id))o.ready.push(u.id);return true;}
  if(dist(u,lead)>5)walk(lead,'Escorting the trading party');else{u.order='hold';u.workReason='Guarding the trading party';}return true;}
 if(o.phase==='loading'){if(atCache()&&!o.ready.includes(u.id))o.ready.push(u.id);return true;}
 if(o.phase==='outbound'){if(!localSettlementHall(g,u,o.to))walk(o.hall,'Carrying reserved goods to the partner hall');else{u.order='hold';u.workReason='Waiting at the partner hall for the party';}return true;}
 if(o.phase==='returning'||o.phase==='aborting'){if(atCache())unload(g,o,u);return true;}
 return true;}

/** Carriers standing at the partner hall see that partner's stores; nothing is learned remotely. */
export function observePartnerStock(g:Game,viewer:number,partner:number,observer:Unit){
 if(!localSettlementHall(g,observer,partner)||observer.team!==viewer)return false;
 const s=root(g),list=s.observations??=[],stock:Partial<Record<GoodKind,number>>={};for(const k of TRADE_KINDS)stock[k]=tradeStock(g,partner,k);
 const i=list.findIndex(r=>r.viewer===viewer&&r.partner===partner);const rec={viewer,partner,observedAt:g.state.time,observerId:observer.id,stock};
 if(i>=0)list[i]=rec;else list.push(rec);while(list.length>TRADE_NEEDS_RULES.maximumObservations)list.shift();return true;}
/** Last-observed knowledge only: a copy of what the viewer's own people saw and when; never live partner stock. */
export function observedPartnerStock(g:Game,viewer:number,partner:number){
 const r=g.state.tradeNeeds?.observations?.find(r=>r.viewer===viewer&&r.partner===partner);
 if(!r)return null;return{partner,observedAt:r.observedAt,ageSeconds:Math.max(0,g.state.time-r.observedAt),stock:{...r.stock},source:'carriers at partner hall' as const};}
function atCacheNow(g:Game,u:Unit|undefined,team:number){if(!u)return false;for(const d of supplyDrops(g,team)){const p=supplyApproach(g,u,d);if(p&&supplyReached(g,u,d,p))return true;}return false;}
/** Interruption seam (via pauseCoastalTrade ← interruptMission): a direct order or emergency releases this
 * person from the offer without overwriting the new command. A carried resource load stays physically on the
 * body (it already belongs to the carrier's own society before and after payment); escrow is reconciled by
 * the normal lifecycle (unpaid partner escrow refunded, offer fails if no carrier remains). */
export function pauseTradeNeeds(g:Game,u:Unit){
 const id=u.tradeNeedsId;if(id===undefined)return false;u.tradeNeedsId=undefined;
 const o=g.state.tradeNeeds?.offers.find(o=>o.id===id);if(!o)return true;
 for(const l of o.lines.filter(l=>l.unitId===u.id)){if(TRADE_GOODS[l.kind].cat==='resource'&&u.carryType===l.kind&&u.carry>=l.amount||TRADE_BULK_ITEMS.includes(l.kind)&&(u.itemCargo?.[l.kind as ItemKind]||0)>=l.amount)receipt(g,o,'refunded',u.team,l.kind,l.amount,u.id);else{o.lostAmount+=l.amount;receipt(g,o,'lost',o.from,l.kind,l.amount,u.id);}}
 o.lines=o.lines.filter(l=>l.unitId!==u.id);
 if(o.carriers.includes(u.id)){o.carriers=o.carriers.filter(x=>x!==u.id);o.carriersLost++;}
 o.escorts=o.escorts.filter(x=>x!==u.id);o.ready=o.ready.filter(x=>x!==u.id);note(g,o.from,'interrupted');
 if(!o.carriers.length&&ACTIVE.includes(o.phase)){if(o.phase==='loading'){abort(g,o,'carrier-interrupted');}else{if(!o.paid&&o.get.amount>0)refundEscrow(g,o,'get');finishOffer(g,o,'failed','carrier-interrupted');}}
 return true;}
export function tradeNeedsDiagnostics(g:Game){const s=g.state.tradeNeeds;return{rules:TRADE_NEEDS_RULES,teams:s?.teams??[],open:(s?.offers||[]).filter(o=>OPEN.includes(o.phase)).length,offers:s?.offers.length??0,receipts:s?.receipts.length??0};}

export function validTradeNeedsState(s:GameState){
 const t=s.tradeNeeds;const refs=s.units.filter(u=>u.tradeNeedsId!==undefined);
 if(t===undefined)return refs.length===0;
 const fin=(n:unknown,max=1e9)=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=max;
 if(!t||t.version!==1||!Array.isArray(t.teams)||!Array.isArray(t.offers)||!Array.isArray(t.cooldowns)||!Array.isArray(t.receipts)||t.offers.length>TRADE_NEEDS_RULES.maximumOffers||t.cooldowns.length>TRADE_NEEDS_RULES.maximumCooldowns||t.receipts.length>TRADE_NEEDS_RULES.maximumReceipts)return false;
 const phases=['proposed','loading','outbound','returning','aborting','complete','declined','failed'],teams=s.tribes.length,ids=new Set<number>();
 for(const r of t.teams)if(!Number.isInteger(r.team)||r.team<0||r.team>=teams||!fin(r.nextReviewAt)||!fin(r.proposed)||!fin(r.declined)||!fin(r.completed)||!fin(r.failed)||!r.mix||!r.reasons)return false;
 for(const c of t.cooldowns)if(!TRADE_GOODS[c.give]||!TRADE_GOODS[c.get]||!Number.isInteger(c.team)||!Number.isInteger(c.partner)||!fin(c.until)||!fin(c.declines))return false;
 for(const r of t.receipts)if(!['loaded','paid','delivered','refunded','lost'].includes(r.stage)||!TRADE_GOODS[r.kind]||!fin(r.amount))return false;
 const half=(s.worldOptions?.size||1040)/2;
 for(const o of t.offers){if(ids.has(o.id)||!Number.isInteger(o.id)||o.id<1||o.id>=s.nextId)return false;ids.add(o.id);
  if(Math.abs(o.hall?.x)>half||Math.abs(o.hall?.z)>half)return false;if(o.phase==='proposed'&&o.reserved)return false;
  const members=[...(o.carriers||[]),...(o.escorts||[])];if(new Set(members).size!==members.length||new Set(o.ready||[]).size!==(o.ready||[]).length||(o.ready||[]).some((id:number)=>!members.includes(id)))return false;
  if(['outbound','returning','aborting'].includes(o.phase))for(const id of o.carriers||[]){const res=(o.lines||[]).filter((l:TradeLine)=>l.unitId===id&&TRADE_GOODS[l.kind]?.cat==='resource');const its=(o.lines||[]).filter((l:TradeLine)=>l.unitId===id&&TRADE_BULK_ITEMS.includes(l.kind));const u=s.units.find(u=>u.id===id);for(const l of its){const want=its.filter((x:TradeLine)=>x.kind===l.kind).reduce((n:number,x:TradeLine)=>n+x.amount,0);if(!u||Math.abs(((u.itemCargo as Record<string,number>|undefined)?.[l.kind]||0)-want)>1e-6)return false;}if(!res.length)continue;if(!u||res.length>1||u.carryType!==res[0].kind||Math.abs(u.carry-res[0].amount)>1e-6)return false;}
  if(!phases.includes(o.phase)||!Number.isInteger(o.from)||!Number.isInteger(o.to)||o.from<0||o.from>=teams||o.to<0||o.to>=teams||o.from===o.to||!TRADE_GOODS[o.give.kind]||!TRADE_GOODS[o.get.kind]||!fin(o.give.amount)||!fin(o.get.amount)||!fin(o.fairGet)||!fin(o.spread,1)||!fin(o.risk,1)||!fin(o.trust,1)||!fin(o.createdAt)||!fin(o.answerAt)||!o.hall||!Number.isFinite(o.hall.x)||!Number.isFinite(o.hall.z)||Math.abs(o.hall.x)>1e5||Math.abs(o.hall.z)>1e5)return false;
  if(!Array.isArray(o.carriers)||!Array.isArray(o.escorts)||!Array.isArray(o.lines)||!Array.isArray(o.ready)||o.carriers.length>TRADE_NEEDS_RULES.maximumCarriers||o.escorts.length>TRADE_NEEDS_RULES.maximumEscorts)return false;
  const open=ACTIVE.includes(o.phase);if(!open&&(o.carriers.length||o.escorts.length||o.lines.length))return false;if(open&&!o.reserved)return false;
  for(const l of o.lines)if(!o.carriers.includes(l.unitId)||!TRADE_GOODS[l.kind]||!fin(l.amount))return false;
  for(const id of [...o.carriers,...o.escorts]){const u=s.units.find(u=>u.id===id);if(!u||u.tradeNeedsId!==o.id)return false;}}
 if(t.observations!==undefined){if(!Array.isArray(t.observations)||t.observations.length>TRADE_NEEDS_RULES.maximumObservations)return false;const pairs=new Set<string>();
  for(const r of t.observations){if(!r||!Number.isInteger(r.viewer)||!Number.isInteger(r.partner)||r.viewer<0||r.partner<0||r.viewer>=teams||r.partner>=teams||r.viewer===r.partner||!fin(r.observedAt)||r.observedAt>s.time+1e-6||!Number.isSafeInteger(r.observerId)||r.observerId<1||r.observerId>=s.nextId||!r.stock||typeof r.stock!=='object'||Array.isArray(r.stock))return false;
   const key=r.viewer+':'+r.partner;if(pairs.has(key))return false;pairs.add(key);for(const [k,n]of Object.entries(r.stock))if(!TRADE_GOODS[k as GoodKind]||!fin(n))return false;}}
 for(const u of refs){const o=t.offers.find(o=>o.id===u.tradeNeedsId&&ACTIVE.includes(o.phase));if(!o||(!o.carriers.includes(u.id)&&!o.escorts.includes(u.id)))return false;}
 return true;}
