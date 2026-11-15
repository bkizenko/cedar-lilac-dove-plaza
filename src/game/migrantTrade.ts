import type {Game} from './sim';
import type {Unit} from './types';
import {isDependent} from './settlement';
import {isRivalTeam} from './factions';
import {hasTaskCommitment} from './workCommitments';
import {receiveFood} from './pantry';
import {planFoodWithdrawal,commitFoodWithdrawal} from './tradeFood';
import {villageAppeal} from './migration';
import {coinPrice} from './tradeNeeds';
import {invalidatePrisonerGuardQueries} from './prisonerGuardQueries';
/** Willing migrants as a traded good. Only free adults who consent move; the unit itself changes society (never copied), a payment
 * moves in the opposite direction from real stores or a real trader's load, children and their parents are never moved, and each
 * society keeps a minimum number of adults. Consent comes from measured village appeal: a person goes only where life looks
 * clearly better (appeal gap) or is no worse and the deal is generous. Effects: the receiving society gains a little trust.
 * Ledger (optional `state.migrantTrades`) enforces a per-pair rate limit. Nothing here creates or deletes a person or a good. */
export type MigrantDeal={at:number;from:number;to:number;count:number};
export type MigrantLedger={version:1;deals:MigrantDeal[]};
export const MIGRANT_RULES={version:1,maxPerDeal:3,talkMeters:12,minimumAdultsLeft:4,pairCooldownSeconds:900,maxPerPairPerYear:4,yearSeconds:1800,
 personWorth:12,consentThreshold:.5,appealWeight:1.5,generosityWeight:.04,trustGain:.04,maximumLedger:64} as const;
export type MigrantPayKind='food'|'wood'|'stone'|'copper'|'iron'|'coins';
const WORTH:Record<string,number>={food:1,wood:1.2,stone:2.2,copper:4.5,iron:6.5};
export const migrantPrice=(kind:MigrantPayKind,persons=1)=>kind==='coins'?coinPrice('copper',MIGRANT_RULES.personWorth/4.5*persons):Math.max(1,Math.ceil(MIGRANT_RULES.personWorth*persons/WORTH[kind]));
const dist=(a:{x:number;z:number},b:{x:number;z:number})=>Math.hypot(a.x-b.x,a.z-b.z);
const ledger=(g:Game)=>g.state.migrantTrades??={version:1,deals:[]};
const adultsOf=(g:Game,team:number)=>g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)&&!u.prisoner);
/** Reason a person cannot be moved at all, regardless of consent, or null. */
export function migrantBlocker(g:Game,u:Unit):string|null{
 if(u.hp<=0)return 'Not with us';if(u.type!=='worker')return 'Only civilian adults move as migrants';if(isDependent(g,u))return 'Children are never moved';
 if(u.prisoner)return 'A captive is not a migrant';if(u.militia)return 'Fighters stay with their company';
 if(g.state.units.some(c=>c.hp>0&&c.team===u.team&&isDependent(g,c)&&(c.parents||[]).includes(u.id)))return 'A parent will not leave their children';
 if(u.expedition||u.trade||u.visit||u.envoy||u.scout||u.tradeNeedsId!==undefined||u.societyMissionId||u.foundingJourney||u.tributeJourney||u.escortId||u.boat||u.emergency||hasTaskCommitment(u))return 'Busy with another task';
 if(u.carry>0||Object.values(u.itemCargo||{}).some(Boolean))return 'Unload what they carry first';
 if(g.state.time<(u.pregnantUntil??0))return 'Not while expecting';
 return null;
}
/** Consent 0..1: how willing this person is to move from their society to `toTeam`, from measured appeal of both. */
export function migrantConsent(g:Game,u:Unit,toTeam:number,generosity=0):number{
 const gap=villageAppeal(g,toTeam)-villageAppeal(g,u.team);
 return Math.max(0,Math.min(1,.5+gap*MIGRANT_RULES.appealWeight+generosity*MIGRANT_RULES.generosityWeight));
}
export function migrantCandidates(g:Game,team:number,toTeam:number,generosity=0){
 return g.state.units.filter(u=>u.team===team&&u.hp>0&&u.type==='worker'&&!isDependent(g,u)).slice(0,64).map(u=>{
  const blocker=migrantBlocker(g,u),consent=migrantConsent(g,u,toTeam,generosity);
  return{id:u.id,name:u.name||`Resident ${u.id}`,consent,issue:blocker||(consent<MIGRANT_RULES.consentThreshold?'Not willing to leave':null)};});
}
function pairLimitIssue(g:Game,a:number,b:number,count:number):string|null{
 const now=g.state.time,deals=ledger(g).deals.filter(d=>(d.from===a&&d.to===b)||(d.from===b&&d.to===a));
 const last=deals.reduce((m,d)=>Math.max(m,d.at),-Infinity);if(now-last<MIGRANT_RULES.pairCooldownSeconds)return `Let people settle first (${Math.ceil(MIGRANT_RULES.pairCooldownSeconds-(now-last))}s)`;
 const year=deals.filter(d=>now-d.at<MIGRANT_RULES.yearSeconds).reduce((n,d)=>n+d.count,0);
 return year+count>MIGRANT_RULES.maxPerPairPerYear?'Too many people have moved between you this year':null;
}
export type MigrantTradeCommand={kind:'transfer-migrants';direction:'send'|'receive';unitIds:number[];counterpartId:number;payKind:MigrantPayKind};
/** send: player people go to another society, the counterpart's society pays (a trader's load, or its coins). receive: their people
 * join the player, who pays from stores. The counterpart must be a free adult of that society within talking distance of the group. */
export function transferMigrants(g:Game,c:Omit<MigrantTradeCommand,'kind'>,actor=0):{accepted:boolean;reason:string}{
 const no=(reason:string)=>({accepted:false,reason});
 const ids=[...new Set(c.unitIds)];if(!ids.length)return no('Choose who goes');if(ids.length>MIGRANT_RULES.maxPerDeal)return no(`At most ${MIGRANT_RULES.maxPerDeal} people at a time`);
 if(!['food','wood','stone','copper','iron','coins'].includes(c.payKind))return no('Choose a payment');
 const cp=g.state.units.find(u=>u.id===c.counterpartId&&u.hp>0);
 if(!cp||cp.team===actor||!isRivalTeam(cp.team)||!g.tribe(cp.team)?.alive)return no('Choose an adult of another society');
 if(g.isFoe(actor,cp.team))return no('They will not deal while you are at odds');if(cp.type!=='worker'||cp.prisoner)return no('Choose an adult');
 if(isDependent(g,cp))return no('Choose an adult');
 const from=c.direction==='send'?actor:cp.team,to=c.direction==='send'?cp.team:actor;
 const people:Unit[]=[];for(const id of ids){const u=g.state.units.find(u=>u.id===id&&u.hp>0&&u.team===from);if(!u)return no('Someone is not with the society that gives them');people.push(u);}
 for(const u of people){const b=migrantBlocker(g,u);if(b)return no(`${u.name||'Someone'}: ${b}`);if(dist(u,cp)>MIGRANT_RULES.talkMeters)return no(`Bring ${u.name||'them'} within ${MIGRANT_RULES.talkMeters} metres of the other society's adult`);}
 const price=migrantPrice(c.payKind,people.length),giver=g.tribe(from),taker=g.tribe(to);
 for(const u of people){if(migrantConsent(g,u,to,price/people.length)<MIGRANT_RULES.consentThreshold)return no(`${u.name||'Someone'} does not want to go`);}
 if(adultsOf(g,from).length-people.length<MIGRANT_RULES.minimumAdultsLeft)return no(`${giver.name||'That society'} must keep at least ${MIGRANT_RULES.minimumAdultsLeft} adults`);
 if(g.popNow(to)+people.length>g.popCap(to))return no('Housing is needed for the newcomers');
 const limit=pairLimitIssue(g,from,to,people.length);if(limit)return no(limit);
 // Payment: pays from the receiving side toward the giving side. Check first, move after.
 if(c.direction==='send'){
  if(c.payKind==='coins'){if((taker.items?.coins||0)<price)return no(`They can pay only ${taker.items?.coins||0} of ${price} coins`);}
  else{if(cp.carryType!==c.payKind||!(cp.carry>=price)||cp.carryFoodLots)return no(`The trader carries too little ${c.payKind}; they would owe ${price}`);}
 }else{
  if(c.payKind==='coins'){if((taker.items?.coins||0)<price)return no(`Need ${price} coins in stores`);}
  else if(c.payKind==='food'?Math.floor(taker.food||0)<price:Math.floor((taker as unknown as Record<string,number>)[c.payKind]||0)<price)return no(`Need ${price} ${c.payKind} in stores`);
 }
 // --- commit (all checks passed)
 if(c.direction==='send'){
  if(c.payKind==='coins'){taker.items!.coins=(taker.items!.coins||0)-price;(giver.items??={}).coins=(giver.items.coins||0)+price;}
  else{cp.carry-=price;if(cp.carry<1e-9){cp.carry=0;cp.carryType=null;cp.carryFood=undefined;}
   if(c.payKind==='food')receiveFood(g,from,price,'provisions');else (giver as unknown as Record<string,number>)[c.payKind]+=price;}
 }else{
  if(c.payKind==='coins'){taker.items!.coins=(taker.items!.coins||0)-price;(giver.items??={}).coins=(giver.items.coins||0)+price;}
  else if(c.payKind==='food'){const lots=planFoodWithdrawal(g,to,price);if(!lots||!commitFoodWithdrawal(g,to,lots))return no('Could not draw the food');receiveFood(g,from,price,'provisions');}
  else{(taker as unknown as Record<string,number>)[c.payKind]-=price;(giver as unknown as Record<string,number>)[c.payKind]+=price;}
 }
 for(const u of people){g.interruptMission(u);u.job=null;u.jobLock=false;u.node=null;u.target=null;u.selected=false;u.team=to;u.order='return';u.recalled=true;u.workReason='Moved to a new society by agreement';}
 invalidatePrisonerGuardQueries(g);
 const L=ledger(g);L.deals.push({at:g.state.time,from,to,count:people.length});if(L.deals.length>MIGRANT_RULES.maximumLedger)L.deals.splice(0,L.deals.length-MIGRANT_RULES.maximumLedger);
 const rival=g.tribe(isRivalTeam(to)?to:from);rival.trust=Math.min(1,(rival.trust||0)+MIGRANT_RULES.trustGain*people.length);
 g.workBoard.reset();
 return{accepted:true,reason:`${people.length} ${people.length===1?'person moves':'people move'} by agreement for ${price} ${c.payKind}`};
}
