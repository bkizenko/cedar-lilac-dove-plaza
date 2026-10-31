import type {Unit,ResKind} from './types';
import {captureTarget} from './conflictIntent';
import {releasePrisoner,PRISONER_RULES} from './captivity';
import {isDependent} from './settlement';
import {hasTaskCommitment} from './workCommitments';
import {supplyDrops,supplyApproach,supplyReached} from './campAnchor';
import {carryingCapacity} from './haulage';
import {visitorPrice,tradeWithVisitor} from './visitors';
import {personName} from './people';
import {lifeEvent} from './communities';
import type {Game} from './sim';
/** Contact requires people actually meeting in sight; remembered maps are insufficient. */
export function tickEncounters(g:Game){
 if(!g.started||g.awaitingStart||g.state.encounter)return;
 const contacts=(g.state.contacts??=[]);
 for(const stranger of g.state.units){
  if(stranger.hp<=0||stranger.team===0||contacts.includes(stranger.team)||!g.visibleAt(stranger.x,stranger.z))continue;
  const person=g.state.units.find(u=>u.team===0&&u.hp>0&&Math.hypot(u.x-stranger.x,u.z-stranger.z)<=12);
  if(!person)continue;
  contacts.push(stranger.team);
  if(g.isFoe(0,stranger.team)){
   g.banner(`Hostile party sighted — armed villagers defend nearby homes and workplaces`,5);
   continue;
  }
  g.state.encounter={team:stranger.team,person:person.id,stranger:stranger.id,resume:!g.state.paused};
  g.state.paused=true;g.banner(`Your people encounter ${g.tribe(stranger.team).name}`,5);return;
 }
}
export function answerEncounter(g:Game,reaction:'greet'|'withdraw'|'observe'){
 const encounter=g.state.encounter;if(!encounter)return;
 const t=g.tribe(encounter.team),u=g.state.units.find(u=>u.id===encounter.person&&u.hp>0);
 if(reaction==='greet'&&!g.isFoe(0,t.id)){t.trust=Math.min(1,(t.trust||0)+.05);t.tension=Math.max(0,t.tension-.03);g.banner('Greetings exchanged. A trader must carry offers and bring back their report.',5);}
 if(reaction==='withdraw'&&u){g.interruptMission(u);u.recalled=true;u.order='move';u.node=null;u.target=null;u.pillage=-1;u.attackDestination=null;u.jobLock=false;u.huntOnly=false;}
 g.state.encounter=undefined;g.state.paused=!encounter.resume;
}

export const CONTACT_RULES={version:1,talkMeters:12,exchangeMeters:3,capturePartyMeters:50,questionCooldownSeconds:60,visitorCampMeters:35,minimumBundleValueRatio:.65,maximumBundleValueRatio:1.55} as const;
export type ContactAction='capture'|'question'|'trade'|'send-scout-home'|'ask-visitor-leave'|'release-prisoner';
export type ContactOutcome={accepted:boolean;reason:string;report?:string};
export type ContactTrade={id:string;label:string;kind:'bundle'|'visitor';give?:ResKind;buyerId:number;strangerId:number};
const worth:Record<ResKind,number>={food:1,wood:1.2,stone:2.2,copper:4.5,iron:6.5};
const goods:ResKind[]=['food','wood','stone','copper','iron'];
const origin=(u:Unit)=>u.prisoner?.originTeam??u.team;
const target=(g:Game,id:number)=>g.state.units.find(u=>u.id===id&&u.hp>0);
function speaker(g:Game,u:Unit,personId?:number){const people=g.state.units.filter(p=>p.team===0&&p.id!==u.id&&p.hp>0&&!p.prisoner&&!isDependent(g,p)&&Math.hypot(p.x-u.x,p.z-u.z)<=CONTACT_RULES.talkMeters);if(personId!==undefined)return people.find(p=>p.id===personId);return people.sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];}
function contactIssue(g:Game,u:Unit|undefined,personId?:number){return !u?'This person is no longer present':!g.visibleAt(u.x,u.z)?'Reach and see this person first':!speaker(g,u,personId)?'Bring one of your adults within 12 metres to speak':null;}
function armedAdult(g:Game,u:Unit){return u.team===0&&u.hp>0&&!u.prisoner&&!isDependent(g,u)&&(u.militia||!['worker','leader'].includes(u.type));}
function captureParty(g:Game,u:Unit){return g.state.units.filter(p=>armedAdult(g,p)&&!p.boat&&!p.emergency&&!p.envoy&&!p.expedition&&!p.visit&&!p.trade&&!p.recalled&&p.escortId===undefined&&!hasTaskCommitment(p)&&p.conflictIntent!=='occupy'&&p.conflictIntent!=='capture'&&(!p.carry||p.carryType==='food')&&Math.hypot(p.x-u.x,p.z-u.z)<=CONTACT_RULES.capturePartyMeters&&g.workBoard.connected(g,p.x,p.z,u.x,u.z));}
export function captureContactIssue(g:Game,id:number){
 const u=target(g,id);if(!u)return 'This person is no longer present';if(u.prisoner)return 'This person is already in custody or returning from release';if(u.team===0)return 'Choose someone outside your community';if(isDependent(g,u))return 'Children cannot be captured';if(u.type!=='worker'||u.militia)return 'An armed adult must be defeated or surrender before custody';if(!g.visibleAt(u.x,u.z))return 'Reach and see this person first';
 const party=captureParty(g,u);if(!party.length)return 'Bring an available armed adult within 50 metres with a reachable route';
 const defenders=g.state.units.filter(p=>p.team===u.team&&p.hp>0&&!p.prisoner&&!isDependent(g,p)&&(p.militia||!['worker','leader'].includes(p.type))&&g.visibleAt(p.x,p.z)&&Math.hypot(p.x-u.x,p.z-u.z)<=PRISONER_RULES.defenderRadiusMeters);
 if(party.length<defenders.length*PRISONER_RULES.superiorityRatio)return 'Their nearby armed companions prevent surrender; bring more local force';
 if(party.every(p=>g.state.units.filter(c=>c.hp>0&&c.prisoner?.phase!=='released'&&c.prisoner?.guardId===p.id).length>=PRISONER_RULES.guardCapacity))return 'The nearby guards are already escorting their full capacity';return null;
}
function beginContactCapture(g:Game,u:Unit):ContactOutcome{
 const issue=captureContactIssue(g,u.id);if(issue)return {accepted:false,reason:issue};const party=captureParty(g,u),selection=g.state.units.map(p=>({u:p,selected:p.selected})),selectedBuilding=g.state.selBld;
 // The contextual order chooses actual nearby free guards; it does not require
 // an initial mode picker or silently convert the encountered person's team.
 g.clearSelect();for(const p of party)p.selected=true;const result=captureTarget(g,u.id);for(const p of selection)p.u.selected=p.selected;g.state.selBld=selectedBuilding;return result;
}
export function lastContactReport(g:Game,id:number){const prefix=`[Contact ${id}] `;return [...g.state.lifeHistory||[]].reverse().find(row=>row.team===0&&row.text.startsWith(prefix))?.text.slice(prefix.length);}
function questionIssue(g:Game,u:Unit|undefined,personId?:number){const issue=contactIssue(g,u,personId);if(issue||!u)return issue;if(g.isFoe(0,u.team)&&!(u.prisoner?.captorTeam===0&&u.prisoner.phase!=='released'))return 'An uncontrolled hostile person refuses questioning; obtain surrender first';const prefix=`[Contact ${u.id}] `;if(g.state.lifeHistory?.some(row=>row.team===0&&row.text.startsWith(prefix)&&g.state.time-row.time<CONTACT_RULES.questionCooldownSeconds))return 'Their recent account is already recorded below';return null;}
function questionPerson(g:Game,u:Unit,personId?:number):ContactOutcome{
 const issue=questionIssue(g,u,personId);if(issue)return {accepted:false,reason:issue};
 const homeId=u.prisoner?.originHomeHall??u.homeHall,home=g.state.buildings.find(b=>b.id===homeId&&b.team===origin(u));
 const parts=[`${personName(u)} describes their own experience.`];
 if(home){const dx=home.x-u.x,dz=home.z-u.z,angle=Math.atan2(dx,dz),directions=['north','northeast','east','southeast','south','southwest','west','northwest'],direction=directions[(Math.round(angle/(Math.PI/4))+8)%8],distance=Math.hypot(dx,dz);parts.push(distance<20?'Their home is nearby.':`Their last home lies ${direction}, ${distance<100?'a short walk':'a long walk'} away.`);}
 else parts.push('They cannot describe a recorded home from this meeting.');
 if(u.job)parts.push(`They have been gathering ${u.job}.`);if(u.carry>0&&u.carryType)parts.push(`They carry ${Math.floor(u.carry)} ${u.carryType}.`);
 const report=parts.join(' ').slice(0,270);lifeEvent(g,0,`[Contact ${u.id}] ${report}`);return {accepted:true,reason:'Their account is recorded in village history',report};
}
function atOwnCache(g:Game,u:Unit){return supplyDrops(g,0).some(drop=>{const spot=supplyApproach(g,u,drop);return !!spot&&supplyReached(g,u,drop,spot);});}
export function contactTradeOptions(g:Game,id:number,personId?:number):{reason:string|null;options:ContactTrade[]}{
 const u=target(g,id),issue=contactIssue(g,u,personId);if(issue||!u)return {reason:issue,options:[]};if(u.prisoner)return {reason:'Prisoner exchange and ransom are not available yet',options:[]};if(g.isFoe(0,u.team))return {reason:'An uncontrolled hostile party will not exchange goods',options:[]};
 if(!u.carryType||u.carry<=0)return {reason:'This person has no carried goods to offer',options:[]};
 if(u.trade||u.tributeJourney||u.envoy||u.visit?.team!==undefined&&u.visit.team!==0||hasTaskCommitment(u))return {reason:'These goods belong to an ongoing journey or protected duty',options:[]};
 const buyer=speaker(g,u,personId)!;if(Math.hypot(buyer.x-u.x,buyer.z-u.z)>CONTACT_RULES.exchangeMeters)return {reason:'Bring your carrier within 3 metres for a physical exchange',options:[]};
 if(buyer.escortId!==undefined||buyer.conflictIntent==='occupy'||buyer.conflictIntent==='capture'||hasTaskCommitment(buyer))return {reason:'Choose a carrier who is free of guard, custody or paid work',options:[]};
 const options:ContactTrade[]=[];
 if(u.visit?.phase==='waiting'&&atOwnCache(g,u))for(const give of goods){const price=visitorPrice(g,u,give);if(price&&g.tribe(0)[give]>=price&&!(give==='copper'&&g.tribe(0).age<1)&&!(give==='iron'&&g.tribe(0).age<2))options.push({id:`visitor:${give}`,kind:'visitor',give,buyerId:buyer.id,strangerId:u.id,label:`Pay ${price} ${give} from this cache for ${u.carry} ${u.carryType}`});}
 if(buyer.carryType&&buyer.carry>0&&buyer.carryType!==u.carryType){const ratio=buyer.carry*worth[buyer.carryType]/(u.carry*worth[u.carryType]);if(ratio>=CONTACT_RULES.minimumBundleValueRatio&&ratio<=CONTACT_RULES.maximumBundleValueRatio&&buyer.carry<=carryingCapacity(u,buyer.carryType)&&u.carry<=carryingCapacity(buyer,u.carryType))options.push({id:'bundle',kind:'bundle',buyerId:buyer.id,strangerId:u.id,label:`Exchange your ${buyer.carry} ${buyer.carryType} for their ${u.carry} ${u.carryType}`});}
 return {options,reason:options.length?null:buyer.carry>0?'Neither complete carried bundle is a fair, usable exchange; bring a different offer':'Bring a carrier with an offer, or meet an offering trader at your cache'};
}
function returnPerson(g:Game,u:Unit,reason:string){g.interruptMission(u);u.recalled=true;u.stationOnArrival=false;u.order='return';u.target=null;u.node=null;u.job=null;u.jobLock=false;u.huntOnly=false;u.pillage=-1;u.attackDestination=null;u.workReason=reason;}
function exchangeContact(g:Game,u:Unit,optionId:string|undefined,personId?:number):ContactOutcome{
 const proposal=contactTradeOptions(g,u.id,personId),option=optionId?proposal.options.find(o=>o.id===optionId):proposal.options[0];if(!option)return {accepted:false,reason:proposal.reason||'This offer is no longer available'};
 if(option.kind==='visitor'){const accepted=tradeWithVisitor(g,u.id,option.give!);return {accepted,reason:accepted?'Existing goods exchanged at the cache; the trader carries payment home':'The trader or goods are no longer available'};}
 const buyer=target(g,option.buyerId)!;const payment={amount:buyer.carry,kind:buyer.carryType!,food:buyer.carryFood},purchase={amount:u.carry,kind:u.carryType!,food:u.carryFood};
 returnPerson(g,buyer,'Carrying the exchanged goods home');returnPerson(g,u,'Exchange complete — taking payment home');
 buyer.carry=purchase.amount;buyer.carryType=purchase.kind;buyer.carryFood=purchase.kind==='food'?purchase.food:undefined;u.carry=payment.amount;u.carryType=payment.kind;u.carryFood=payment.kind==='food'?payment.food:undefined;
 return {accepted:true,reason:'The two carried bundles were exchanged; both people must bring their goods home'};
}
function visitorLeaveIssue(g:Game,u:Unit|undefined,personId?:number){const issue=contactIssue(g,u,personId);if(issue||!u)return issue;if(u.prisoner)return 'Use Release prisoner to return home for someone in your custody';if(g.isFoe(0,u.team))return 'You cannot send an uncontrolled hostile party home';if((u.type!=='worker'||u.militia)&&!u.caravanArmed)return 'This armed party is not under your control';if(!u.visit&&Math.hypot(u.x-g.campOf(0).x,u.z-g.campOf(0).z)>CONTACT_RULES.visitorCampMeters)return 'They are not visiting your camp; you can send your own explorer home';if(u.trade||u.tributeJourney||u.envoy||u.escortId!==undefined||hasTaskCommitment(u))return 'This person has a protected journey or duty and cannot be dismissed as a visitor';if(!supplyDrops(g,u.team).some(home=>!!supplyApproach(g,u,home)))return 'This person has no reachable home camp; clear a route before asking them to return';return null;}
export function contactActions(g:Game,id:number,personId?:number){const u=target(g,id);return {capture:{reason:captureContactIssue(g,id)},question:{reason:questionIssue(g,u,personId),report:lastContactReport(g,id)},trade:contactTradeOptions(g,id,personId),leave:{reason:visitorLeaveIssue(g,u,personId)},scout:u?speaker(g,u,personId):undefined,prisoner:!!u?.prisoner&&u.prisoner.captorTeam===0&&u.prisoner.phase!=='released'};}
function finishEncounterAction(g:Game,id:number){if(g.state.encounter?.stranger===id){const resume=g.state.encounter.resume;g.state.encounter=undefined;g.state.paused=!resume;}}
/** Shared UI controller: blocked actions do not interrupt a mission or close
 * the contact; accepted travel commands resume the same physical simulation. */
export function performContactAction(g:Game,action:ContactAction,id:number,personId?:number,optionId?:string):ContactOutcome{
 const u=target(g,id);if(!u)return {accepted:false,reason:'This person is no longer present'};let result:ContactOutcome;
 if(action==='capture')result=beginContactCapture(g,u);
 else if(action==='question')result=questionPerson(g,u,personId);
 else if(action==='trade')result=exchangeContact(g,u,optionId,personId);
 else if(action==='release-prisoner'){const accepted=!!u.prisoner&&u.prisoner.captorTeam===0&&releasePrisoner(g,id);result={accepted,reason:accepted?'Released to walk home with their belongings and remaining provisions':'This person is not in your custody'};}
 else if(action==='ask-visitor-leave'){const issue=visitorLeaveIssue(g,u,personId);if(issue)result={accepted:false,reason:issue};else{returnPerson(g,u,'Leaving by request — taking belongings home');result={accepted:true,reason:'The visitor is walking home with the same belongings'};}}
 else {const own=speaker(g,u,personId);if(!own)result={accepted:false,reason:'Your explorer is no longer present at this meeting'};else if(!supplyDrops(g,0).some(home=>!!supplyApproach(g,own,home)))result={accepted:false,reason:'Your explorer has no reachable home cache; clear a route or crossing first'};else{returnPerson(g,own,'Returning home from first contact with existing provisions');own.order='move';result={accepted:true,reason:`${personName(own)} is returning to your camp; the foreign person remains independent`};}}
 if(result.accepted&&['capture','release-prisoner','ask-visitor-leave','send-scout-home'].includes(action))finishEncounterAction(g,id);g.banner(result.reason,5);return result;
}
