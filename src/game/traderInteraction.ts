import type {Game} from './sim';
import type {GameState,Unit} from './types';
import {isDependent} from './settlement';
import {nudgeSocietyRelation,societyRelation} from './societyRelations';

/**
 * Hostile acts against foreign traders (attack, rob, capture, kill) resolve through the same physical sim as
 * every other contact; this module adds only what the player's verbs need around it:
 *  - who counts as a trader (a person on a trading errand: visiting offer, need-based caravan, envoy trade, coastal voyage),
 *  - the knowledge a trader carries when taken (routes, offer terms, prices, known sites, rumours) as a capture-time snapshot,
 *  - a bounded incident ledger: witnesses of the victim society walk the news home with their own legs, and only then
 *    does the victim (and its trading friends) change attitude. No witness, no instant diplomacy: an unreported loss
 *    is noticed late and weakly. Nothing here creates, moves or destroys goods.
 * Saved as optional `state.traderIncidents` (absent = enabled, nothing ever happened). `enabled:false` switches the
 * new consequences off (the older Demand/Capture/Attack contact actions keep working).
 */
export type TraderIncidentKind='robbed'|'captured'|'killed';
export type TraderIncident={id:number;at:number;victim:number;trader:number;kind:TraderIncidentKind;witnesses:number[];deliveredAt?:number;suspectedAt?:number};
export type TraderIncidentState={version:1;enabled:boolean;list:TraderIncident[];delivered:number;suspected:number};
export type TraderKnowledge={route?:{team:number;x:number;z:number};offer?:{give:string;giveAmount:number;get?:string;getAmount?:number};prices:{kind:string;need:string}[];sites:{team:number;x:number;z:number}[];rumours:{team:number;kind:'war'|'grievance'}[]};
export const TRADER_RULES={version:1,witnessMeters:45,maximumWitnesses:3,newsHallMeters:26,suspicionSeconds:900,expirySeconds:2400,maximumIncidents:64,maximumSites:4,maximumPrices:5,maximumRumours:3,
 grievance:{robbed:.12,captured:.14,killed:.18} as Record<TraderIncidentKind,number>,suspectedFraction:.5,friendTrust:.3,friendTrustLoss:.05,friendMinimumTrust:.3} as const;
const R=TRADER_RULES;
const st=(g:Game)=>g.state as Game['state']&{traderIncidents?:TraderIncidentState};
const root=(g:Game)=>st(g).traderIncidents??=({version:1,enabled:true,list:[],delivered:0,suspected:0});
export const traderConsequencesEnabled=(g:Game)=>st(g).traderIncidents?.enabled!==false;
export function setTraderConsequences(g:Game,enabled:boolean){root(g).enabled=enabled;}
type AnyUnit=Unit&{tradeIntelCargo?:{goods:{kind:string;need:string}[]}[]};
/** A foreign person on a trading errand. Armed escorts of a caravan count only while the trade errand is theirs. */
export function isTraderUnit(g:Game,u:Unit|undefined){
 if(!u||u.hp<=0||u.team===0||u.team===3||!g.tribe(u.team)||u.prisoner||isDependent(g,u))return false;
 return !!u.visit||!!u.trade||u.tradeNeedsId!==undefined||u.coastalVoyageId!==undefined||(!!u.caravanArmed&&(u.carry>0||heldItems(u)>0));
}
export const heldItems=(u:Unit)=>Object.values(u.itemCargo||{}).reduce((n,v)=>n+(v||0),0);
const r5=(n:number)=>Math.round(n/5)*5;
/** What one trader knew when taken. Never refreshed afterwards; only things the person physically carried or had seen. */
export function traderKnowledgeSnapshot(g:Game,u:Unit,origin:number):TraderKnowledge|undefined{
 const t=u as AnyUnit;if(!(u.visit||u.trade||u.tradeNeedsId!==undefined||u.coastalVoyageId!==undefined||u.caravanArmed))return undefined;
 const k:TraderKnowledge={prices:[],sites:[],rumours:[]};
 const offer=u.tradeNeedsId===undefined?undefined:g.state.tradeNeeds?.offers.find(o=>o.id===u.tradeNeedsId);
 if(offer){k.route={team:offer.from===origin?offer.to:offer.from,x:r5(offer.hall.x),z:r5(offer.hall.z)};k.offer={give:offer.give.kind,giveAmount:offer.give.amount,get:offer.get.kind,getAmount:offer.get.amount};}
 else if(u.carryType&&u.carry>0)k.offer={give:u.carryType,giveAmount:Math.floor(u.carry)};
 const voyage=u.coastalVoyageId===undefined?undefined:g.state.coastalVoyages?.find(v=>v.id===u.coastalVoyageId);
 if(voyage?.foreignHallSite)k.route={team:voyage.partner,x:r5(voyage.foreignHallSite.x),z:r5(voyage.foreignHallSite.z)};
 for(const r of t.tradeIntelCargo||[])for(const gd of r.goods){if(k.prices.length<R.maximumPrices&&!k.prices.some(p=>p.kind===gd.kind))k.prices.push({kind:gd.kind,need:gd.need});}
 k.sites=(g.state.observedSettlements||[]).filter(m=>m.observer===origin&&m.active&&m.owner!==origin).sort((a,b)=>b.observedAt-a.observedAt||a.siteId-b.siteId).slice(0,R.maximumSites).map(m=>({team:m.owner,x:r5(m.x),z:r5(m.z)}));
 for(let team=0;team<g.state.tribes.length&&k.rumours.length<R.maximumRumours;team++){if(team===origin||team===3)continue;const rel=societyRelation(g,origin,team);if(!rel.known)continue;if(rel.hostile)k.rumours.push({team,kind:'war'});else if(rel.grievance>=.45)k.rumours.push({team,kind:'grievance'});}
 return k;
}
export function validTraderKnowledge(v:unknown,teams=32){
 if(v===undefined)return true;if(!v||typeof v!=='object'||Array.isArray(v))return false;const k=v as TraderKnowledge;
 const fin=(n:unknown)=>typeof n==='number'&&Number.isFinite(n)&&Math.abs(n)<=1e5,tm=(n:unknown)=>Number.isInteger(n)&&Number(n)>=0&&Number(n)<teams;
 if(!Array.isArray(k.prices)||k.prices.length>R.maximumPrices||!Array.isArray(k.sites)||k.sites.length>R.maximumSites||!Array.isArray(k.rumours)||k.rumours.length>R.maximumRumours)return false;
 if(k.route!==undefined&&(!k.route||!tm(k.route.team)||!fin(k.route.x)||!fin(k.route.z)))return false;
 if(k.offer!==undefined&&(!k.offer||typeof k.offer.give!=='string'||!fin(k.offer.giveAmount)||k.offer.get!==undefined&&typeof k.offer.get!=='string'))return false;
 return k.prices.every(p=>p&&typeof p.kind==='string'&&typeof p.need==='string')&&k.sites.every(s=>s&&tm(s.team)&&fin(s.x)&&fin(s.z))&&k.rumours.every(r=>r&&tm(r.team)&&(r.kind==='war'||r.kind==='grievance'));
}
/** Readable lines for the interrogation report. */
export function traderKnowledgeLines(g:Game,k:TraderKnowledge|undefined,from:{x:number;z:number}):string[]{
 if(!k)return [];const name=(t:number)=>g.tribe(t)?.name||'another society',out:string[]=[];
 const bearing=(p:{x:number;z:number})=>{const a=Math.atan2(p.x-from.x,p.z-from.z),d=['north','northeast','east','southeast','south','southwest','west','northwest'][(Math.round(a/(Math.PI/4))+8)%8];return `${d}, ${Math.round(Math.hypot(p.x-from.x,p.z-from.z))} m`;};
 if(k.route)out.push(`Route to ${name(k.route.team)}: ${bearing(k.route)}`);
 if(k.offer)out.push(`Carrying terms: ${k.offer.giveAmount} ${k.offer.give}${k.offer.get?` for ${k.offer.getAmount} ${k.offer.get}`:''}`);
 for(const p of k.prices)out.push(`${p.kind}: ${p.need.replace(/-/g,' ')}`);
 for(const s of k.sites)out.push(`${name(s.team)} hall seen ${bearing(s)}`);
 for(const r of k.rumours)out.push(r.kind==='war'?`Rumour: war with ${name(r.team)}`:`Rumour: bad blood with ${name(r.team)}`);
 return out;
}
const finished=(g:Game,team:number)=>g.state.buildings.filter(b=>b.team===team&&b.type==='townhall'&&b.hp>0&&g.finished(b));
/** Record a hostile act against a trader. Witnesses are the victim society's own nearby adults; they carry the news home. */
export function noteTraderIncident(g:Game,trader:Unit,kind:TraderIncidentKind){
 if(!traderConsequencesEnabled(g)||!isTraderUnit(g,trader)&&!(trader.hp<=0&&trader.team!==0&&trader.team!==3&&(trader.visit||trader.trade||trader.tradeNeedsId!==undefined||trader.coastalVoyageId!==undefined||trader.caravanArmed)))return null;
 const s=root(g);if(s.list.some(i=>i.trader===trader.id&&i.kind===kind&&g.state.time-i.at<1))return null;
 const witnesses=g.state.units.filter(w=>w.hp>0&&w.id!==trader.id&&w.team===trader.team&&!w.prisoner&&!isDependent(g,w)&&Math.hypot(w.x-trader.x,w.z-trader.z)<=R.witnessMeters).sort((a,b)=>Math.hypot(a.x-trader.x,a.z-trader.z)-Math.hypot(b.x-trader.x,b.z-trader.z)||a.id-b.id).slice(0,R.maximumWitnesses).map(w=>w.id);
 const incident:TraderIncident={id:g.id(),at:g.state.time,victim:trader.team,trader:trader.id,kind,witnesses};
 s.list.push(incident);while(s.list.length>R.maximumIncidents){const i=s.list.findIndex(x=>x.deliveredAt!==undefined||x.suspectedAt!==undefined);s.list.splice(i<0?0:i,1);}
 for(const id of witnesses){const w=g.state.units.find(u=>u.id===id);if(w&&!w.militia&&!w.emergency){g.interruptMission(w);w.recalled=true;w.stationOnArrival=false;w.order='return';w.node=null;w.target=null;w.workReason='Carrying news of an attack on our trader home';}}
 return incident;
}
function apply(g:Game,i:TraderIncident,weight:number){
 const grievance=R.grievance[i.kind]*weight;nudgeSocietyRelation(g,i.victim,0,{grievance,trust:-.1*weight});
 // Trading friends of the victim hear it from the victim's people, a step later; modest and bounded.
 for(let t=1;t<g.state.tribes.length;t++){if(t===i.victim||t===3||!g.tribe(t)?.alive)continue;if(societyRelation(g,t,i.victim).trust<R.friendMinimumTrust||!societyRelation(g,t,0).known)continue;nudgeSocietyRelation(g,t,0,{trust:-R.friendTrustLoss*weight});}
}
/** Per-step: witnesses reaching a victim hall deliver the news; unreported incidents are suspected late and weakly; old ones expire. */
export function tickTraderIncidents(g:Game){
 const s=st(g).traderIncidents;if(!s||!s.list.length)return;
 for(const i of s.list){
  if(i.deliveredAt!==undefined||i.suspectedAt!==undefined)continue;
  const halls=finished(g,i.victim);
  const carrier=g.state.units.find(u=>i.witnesses.includes(u.id)&&u.hp>0&&u.team===i.victim&&halls.some(h=>Math.hypot(h.x-u.x,h.z-u.z)<=R.newsHallMeters));
  if(carrier){i.deliveredAt=g.state.time;s.delivered++;apply(g,i,1);g.banner(`${g.tribe(i.victim).name} has heard what was done to its ${i.kind==='killed'?'trader':'trading party'}`,5);continue;}
  // Witnesses carry the news on their own legs once the alarm is over; those who fall or are taken carry nothing.
  for(const id of i.witnesses){const w=g.state.units.find(u=>u.id===id);if(!w||w.hp<=0||w.team!==i.victim||w.prisoner||w.emergency||w.militia||w.recalled&&w.order==='return')continue;g.interruptMission(w);w.recalled=true;w.stationOnArrival=false;w.order='return';w.node=null;w.target=null;w.workReason='Carrying news of an attack on our trader home';}
  if(g.state.time-i.at>=R.suspicionSeconds){i.suspectedAt=g.state.time;s.suspected++;apply(g,i,R.suspectedFraction);}
 }
 s.list=s.list.filter(i=>g.state.time-i.at<=R.expirySeconds||(i.deliveredAt===undefined&&i.suspectedAt===undefined));
}
export function traderIncidentCounts(g:Game){const s=st(g).traderIncidents;return {pending:s?.list.filter(i=>i.deliveredAt===undefined&&i.suspectedAt===undefined).length??0,delivered:s?.delivered??0,suspected:s?.suspected??0};}
export function validTraderIncidentState(value:unknown){
 const s=value as GameState&{traderIncidents?:TraderIncidentState};if(!s||typeof s!=='object')return true;const d=s.traderIncidents;if(d===undefined)return true;
 if(!d||typeof d!=='object'||d.version!==1||typeof d.enabled!=='boolean'||!Array.isArray(d.list)||d.list.length>R.maximumIncidents||!Number.isSafeInteger(d.delivered)||d.delivered<0||!Number.isSafeInteger(d.suspected)||d.suspected<0)return false;
 const teams=Array.isArray(s.tribes)?s.tribes.length:32,ids=new Set<number>();
 for(const i of d.list){if(!i||!Number.isSafeInteger(i.id)||i.id<1||ids.has(i.id)||!Number.isInteger(i.victim)||i.victim<1||i.victim>=teams||!Number.isSafeInteger(i.trader)||i.trader<1||!['robbed','captured','killed'].includes(i.kind)||!Number.isFinite(i.at)||i.at<0||i.at>Number(s.time)+1e-6||!Array.isArray(i.witnesses)||i.witnesses.length>R.maximumWitnesses||i.witnesses.some(w=>!Number.isSafeInteger(w)||w<1)||i.deliveredAt!==undefined&&!Number.isFinite(i.deliveredAt)||i.suspectedAt!==undefined&&!Number.isFinite(i.suspectedAt))return false;ids.add(i.id);}
 return true;
}
/** Consequence tags shown as icons beside a verb. */
export type ConsequenceTag='war'|'grievance'|'witness'|'loot'|'custody'|'ransom';
