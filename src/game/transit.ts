import type {Game} from './sim';
import type {Unit,Building} from './types';
import {doctrineOf} from './combatDoctrine';
import {recordSocietyContact,societiesAreFoes,societyRelation} from './societyRelations';
/** M3-07: contested routes are crossed under a physical agreement, with armed escorts, or not at all.
 * An agreement exists only after two residents actually met; escorts are real people walking with the carrier. */
export type TransitAgreement={id:number;a:number;b:number;status:'active'|'lapsed'|'broken';signedAt:number;expiresAt:number;passages:number;escortedPassages:number;unescortedPassages:number;lastPassageAt:number;reason?:string};
export type RouteWatch={team:number;strikes:number;abandoned:boolean;since:number;reason:string};
export type TransitState={version:1;agreements:TransitAgreement[];watch:RouteWatch[]};
type TState={transit?:TransitState};
const st=(g:Game)=>g.state as Game['state']&TState;
export const TRANSIT_RULES={version:1,contestedGrievance:.45,minimumTrust:.3,agreementSeconds:1200,maximumAgreements:24,maximumWatch:16,abandonAfterStrikes:3,escortsWithoutAgreement:2,escortRadiusMeters:12,arrivalMeters:45,passageCooldownSeconds:120,tickSeconds:2} as const;
const state=(g:Game)=>st(g).transit??={version:1,agreements:[],watch:[]};
const enabled=(g:Game)=>!!doctrineOf(g)?.transit;
const pair=(a:number,b:number)=>a<b?[a,b] as const:[b,a] as const;
export const findAgreement=(g:Game,a:number,b:number)=>{const [x,y]=pair(a,b);return st(g).transit?.agreements.find(t=>t.a===x&&t.b===y&&t.status==='active'&&t.expiresAt>g.state.time);};
/** At war, or a grievance either way that has not been settled by an agreement. */
export function transitContested(g:Game,a:number,b:number){
 if(a===b||!g.state.tribes[a]||!g.state.tribes[b])return false;
 return societiesAreFoes(g,a,b)||societiesAreFoes(g,b,a)||Math.max(societyRelation(g,a,b).grievance,societyRelation(g,b,a).grievance)>=TRANSIT_RULES.contestedGrievance;
}
export type TransitStatus={mode:'open'|'agreement'|'escort'|'blocked';guardsNeeded:number;agreement?:TransitAgreement;reason:string};
export function transitStatus(g:Game,a:number,b:number):TransitStatus{
 if(!enabled(g)||!transitContested(g,a,b))return {mode:'open',guardsNeeded:0,reason:'Route is not contested'};
 if(societiesAreFoes(g,a,b)||societiesAreFoes(g,b,a))return {mode:'blocked',guardsNeeded:0,reason:'At war: no carrier can cross without a truce'};
 const ag=findAgreement(g,a,b);
 if(ag)return {mode:'agreement',guardsNeeded:Math.max(societyRelation(g,a,b).grievance,societyRelation(g,b,a).grievance)>=.7?1:0,agreement:ag,reason:'Passage agreed in person'};
 return {mode:'escort',guardsNeeded:TRANSIT_RULES.escortsWithoutAgreement,reason:`Contested route: carry an agreement or send ${TRANSIT_RULES.escortsWithoutAgreement} armed escorts`};
}
/** Two residents must physically meet (recordSocietyContact checks distance, life and membership) and the other side must not be at war with us. */
export function agreeTransit(g:Game,messenger:Unit,receiver:Unit|Building){
 const no=(reason:string)=>({accepted:false,reason});
 if(!enabled(g))return no('Transit agreements are not enabled for this save');
 const a=messenger.team,b=receiver.team;
 if(!g.state.tribes[a]||!g.state.tribes[b]||a===b||a===3||b===3)return no('No society to agree with');
 if(societiesAreFoes(g,a,b)||societiesAreFoes(g,b,a))return no('Agree a truce before talking about the road');
 if(!recordSocietyContact(g,messenger,receiver))return no('The two parties have not met face to face');
 if(Math.max(societyRelation(g,a,b).trust,societyRelation(g,b,a).trust)<TRANSIT_RULES.minimumTrust)return no('They do not trust travellers enough yet');
 const [x,y]=pair(a,b),s=state(g),now=g.state.time;
 let ag=s.agreements.find(t=>t.a===x&&t.b===y);
 if(!ag){
  if(s.agreements.length>=TRANSIT_RULES.maximumAgreements){const old=s.agreements.findIndex(t=>t.status!=='active');if(old<0)return no('Too many standing agreements');s.agreements.splice(old,1);}
  ag={id:g.id(),a:x,b:y,status:'active',signedAt:now,expiresAt:now+TRANSIT_RULES.agreementSeconds,passages:0,escortedPassages:0,unescortedPassages:0,lastPassageAt:0};s.agreements.push(ag);
 }else{ag.status='active';ag.signedAt=now;ag.expiresAt=now+TRANSIT_RULES.agreementSeconds;ag.reason=undefined;}
 const w=s.watch.find(r=>r.team===(a===0?b:a));if(w){w.strikes=0;w.abandoned=false;}
 return {accepted:true,reason:`Passage agreed until ${Math.round(ag.expiresAt)}s`};
}
/** Used by the departing caravan: may it leave, given the guards it has actually been assigned? Repeated refusals abandon the route until it clears. */
export function transitDeparture(g:Game,team:number,guardsAssigned:number,home=0):{go:boolean;reason:string}{
 if(!enabled(g))return {go:true,reason:'Transit rules are off'};
 const t=transitStatus(g,home,team),s=state(g);
 let w=s.watch.find(r=>r.team===team);
 const ok=t.mode==='open'||t.mode==='agreement'&&guardsAssigned>=t.guardsNeeded||t.mode==='escort'&&guardsAssigned>=t.guardsNeeded;
 if(ok){if(w){w.strikes=0;w.abandoned=false;}return {go:true,reason:t.reason};}
 if(!w){if(s.watch.length>=TRANSIT_RULES.maximumWatch)s.watch.shift();w={team,strikes:0,abandoned:false,since:g.state.time,reason:''};s.watch.push(w);}
 w.strikes=Math.min(99,w.strikes+1);w.reason=t.mode==='escort'&&guardsAssigned<t.guardsNeeded?`Needs ${t.guardsNeeded} escorts, route has ${guardsAssigned}`:t.mode==='agreement'?'Agreed road still needs a guard':t.reason;
 if(w.strikes>=TRANSIT_RULES.abandonAfterStrikes&&!w.abandoned){w.abandoned=true;w.since=g.state.time;}
 return {go:false,reason:w.abandoned?`Route abandoned: ${w.reason}`:`${w.reason} (attempt ${w.strikes}/${TRANSIT_RULES.abandonAfterStrikes})`};
}
export const routeAbandoned=(g:Game,team:number)=>!!st(g).transit?.watch.find(r=>r.team===team&&r.abandoned);
const clocks=new WeakMap<Game,number>(),seen=new WeakMap<Game,Map<number,number>>();
/** Expire or break agreements, and record each real arrival: escorted only if a real escort is walking beside the carrier. */
export function tickTransit(g:Game,dt:number){
 const s=st(g).transit;if(!s||!enabled(g)||!(dt>0))return;
 const acc=(clocks.get(g)||0)+dt;if(acc<TRANSIT_RULES.tickSeconds){clocks.set(g,acc);return;}clocks.set(g,0);
 const now=g.state.time;
 for(const ag of s.agreements){
  if(ag.status!=='active')continue;
  if(societiesAreFoes(g,ag.a,ag.b)||societiesAreFoes(g,ag.b,ag.a)){ag.status='broken';ag.reason='Fighting broke the agreement';}
  else if(ag.expiresAt<=now){ag.status='lapsed';ag.reason='The agreement ran out';}
 }
 let marks=seen.get(g);if(!marks){marks=new Map();seen.set(g,marks);}
 for(const u of g.state.units){
  if(u.hp<=0||u.team!==0||!(u.tradeTeam>0)||!(u.trade||u.visit||u.caravanRoute!==undefined))continue;
  const camp=g.campOf(u.tradeTeam);if(!camp||Math.hypot(u.x-camp.x,u.z-camp.z)>TRANSIT_RULES.arrivalMeters)continue;
  if(!transitContested(g,0,u.tradeTeam)&&!findAgreement(g,0,u.tradeTeam))continue;
  if(now-(marks.get(u.id)??-1e9)<TRANSIT_RULES.passageCooldownSeconds)continue;marks.set(u.id,now);
  const escorted=g.state.units.some(e=>e.hp>0&&e.escortId===u.id&&Math.hypot(e.x-u.x,e.z-u.z)<=TRANSIT_RULES.escortRadiusMeters);
  const ag=findAgreement(g,0,u.tradeTeam);
  if(ag){ag.passages++;ag.lastPassageAt=now;if(escorted)ag.escortedPassages++;else ag.unescortedPassages++;}
  else if(!escorted){const w=s.watch.find(r=>r.team===u.tradeTeam)||(s.watch.length<TRANSIT_RULES.maximumWatch?(s.watch.push({team:u.tradeTeam,strikes:0,abandoned:false,since:now,reason:'Unescorted carrier reached a contested society'}),s.watch[s.watch.length-1]):undefined);if(w)w.reason='Unescorted carrier reached a contested society';}
 }
 if(marks.size>256)marks.clear();
}
export function validTransit(s:any){
 const v=s.transit;if(v===undefined)return true;
 if(!v||typeof v!=='object'||v.version!==1||!Array.isArray(v.agreements)||!Array.isArray(v.watch)||v.agreements.length>TRANSIT_RULES.maximumAgreements||v.watch.length>TRANSIT_RULES.maximumWatch||!s.combatDoctrine)return false;
 const team=(t:any)=>Number.isInteger(t)&&t>=0&&t<s.tribes.length,keys=new Set<string>(),ids=new Set<number>();
 for(const t of v.agreements){
  if(!t||!Number.isInteger(t.id)||t.id<0||t.id>=s.nextId||ids.has(t.id)||!team(t.a)||!team(t.b)||t.a>=t.b||t.a===3||t.b===3||!['active','lapsed','broken'].includes(t.status))return false;
  ids.add(t.id);const key=`${t.a}:${t.b}`;if(keys.has(key))return false;keys.add(key);
  if(![t.signedAt,t.expiresAt,t.lastPassageAt].every(n=>Number.isFinite(n)&&n>=0)||t.expiresAt<t.signedAt||![t.passages,t.escortedPassages,t.unescortedPassages].every(n=>Number.isInteger(n)&&n>=0)||t.escortedPassages>t.passages)return false;
  if(t.reason!==undefined&&typeof t.reason!=='string')return false;
 }
 const seenTeams=new Set<number>();
 for(const w of v.watch){if(!w||!team(w.team)||seenTeams.has(w.team)||!Number.isInteger(w.strikes)||w.strikes<0||typeof w.abandoned!=='boolean'||!Number.isFinite(w.since)||typeof w.reason!=='string'||w.reason.length>160)return false;seenTeams.add(w.team);}
 return true;
}
