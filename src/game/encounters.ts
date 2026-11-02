import {raiseAttackAlarm} from './defense';
import {queueStandDown} from './demobilization';
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
 if(!g.started||g.awaitingStart)return;
 tickContactOrders(g);
 if(g.state.encounter)return;
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

export const CONTACT_RULES={version:1,talkMeters:12,exchangeMeters:3,capturePartyMeters:50,villageResponseMeters:150,riskMeters:80,maximumDemandGuards:4,trustingThreshold:.6,questionCooldownSeconds:60,visitorCampMeters:35,minimumBundleValueRatio:.65,maximumBundleValueRatio:1.55,yieldSeconds:30,experiencedCraftingSeconds:60,hungrySeconds:30,tiredFraction:.5,woundedFraction:.5} as const;
export type ContactAction='attack'|'demand'|'capture'|'question'|'trade'|'send-scout-home'|'ask-visitor-leave'|'release-prisoner'|'approach-trade';
export type ContactOutcome={accepted:boolean;reason:string;report?:string};
export type ContactTrade={id:string;label:string;kind:'bundle'|'visitor';give?:ResKind;buyerId:number;strangerId:number};
const worth:Record<ResKind,number>={food:1,wood:1.2,stone:2.2,copper:4.5,iron:6.5};
const goods:ResKind[]=['food','wood','stone','copper','iron'];
const origin=(u:Unit)=>u.prisoner?.originTeam??u.team;
const target=(g:Game,id:number)=>g.state.units.find(u=>u.id===id&&u.hp>0);
function speaker(g:Game,u:Unit,personId?:number){const people=g.state.units.filter(p=>p.team===0&&p.id!==u.id&&p.hp>0&&!p.prisoner&&!isDependent(g,p)&&Math.hypot(p.x-u.x,p.z-u.z)<=CONTACT_RULES.talkMeters);if(personId!==undefined)return people.find(p=>p.id===personId);return people.sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];}
function contactIssue(g:Game,u:Unit|undefined,personId?:number){return !u?'This person is no longer present':!g.visibleAt(u.x,u.z)?'Reach and see this person first':!speaker(g,u,personId)?'Bring one of your adults within 12 metres to speak':null;}
function armedAdult(g:Game,u:Unit){return u.team===0&&u.hp>0&&!u.prisoner&&!isDependent(g,u)&&(u.militia||!['worker','leader'].includes(u.type));}
function otherCommitment(p:Unit,targetId:number){return hasTaskCommitment(p.contactAttackTargetId===targetId||p.contactDemand?.targetId===targetId?{...p,contactAttackTargetId:undefined,contactDemand:undefined}:p);}
function captureParty(g:Game,u:Unit){const radius=supplyDrops(g,0).some(home=>Math.hypot(home.x-u.x,home.z-u.z)<=CONTACT_RULES.visitorCampMeters)?CONTACT_RULES.villageResponseMeters:CONTACT_RULES.capturePartyMeters;return g.state.units.filter(p=>armedAdult(g,p)&&!p.boat&&!p.emergency&&!p.envoy&&!p.expedition&&!p.visit&&!p.trade&&!p.recalled&&p.escortId===undefined&&!otherCommitment(p,u.id)&&p.conflictIntent!=='occupy'&&p.conflictIntent!=='capture'&&(!p.carry||p.carryType==='food')&&Math.hypot(p.x-u.x,p.z-u.z)<=radius&&g.workBoard.connected(g,p.x,p.z,u.x,u.z));}
export function captureContactIssue(g:Game,id:number){
 const u=target(g,id);if(!u)return 'This person is no longer present';if(u.prisoner)return 'This person is already in custody or returning from release';if(u.team===0)return 'Choose someone outside your community';if(isDependent(g,u))return 'Children cannot be captured';if(u.type!=='worker'||u.militia)return 'An armed adult must be defeated or surrender before custody';if(!g.visibleAt(u.x,u.z))return 'Reach and see this person first';
 const party=captureParty(g,u);if(!party.length)return 'No free armed adult can reach this meeting';
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
function questionIssue(g:Game,u:Unit|undefined,personId?:number,topic='overview'){const issue=contactIssue(g,u,personId);if(issue||!u)return issue;if(g.isFoe(0,u.team)&&!(u.prisoner?.captorTeam===0&&u.prisoner.phase!=='released'))return 'An uncontrolled hostile person refuses questioning; obtain surrender first';const prefix=`[Contact ${u.id}] `;if(g.state.lifeHistory?.some(row=>row.team===0&&row.text.startsWith(prefix+(topic==='overview'?'':topicLabels[topic]+': '))&&g.state.time-row.time<CONTACT_RULES.questionCooldownSeconds))return 'Their recent account is already recorded below';return null;}
const topicLabels:Record<string,string>={home:'On home',work:'On work',needs:'On wellbeing',cargo:'On carried goods'};
export const CONTACT_TOPICS=[{id:'home',label:'Where is your home?'},{id:'work',label:'What have you been doing?'},{id:'needs',label:'How are you holding up?'},{id:'cargo',label:'What are you carrying?'}] as const;
function questionPerson(g:Game,u:Unit,personId?:number,topic='overview'):ContactOutcome{
 if(topic!=='overview'&&!topicLabels[topic])return {accepted:false,reason:'Choose one of the available conversation topics'};
 const issue=questionIssue(g,u,personId,topic);if(issue)return {accepted:false,reason:issue};
 const homeId=u.prisoner?.originHomeHall??u.homeHall,home=g.state.buildings.find(b=>b.id===homeId&&b.team===origin(u));
 const parts:string[]=[],labels:Record<ResKind,string>={food:'food',wood:'logs',stone:'stone',copper:'copper',iron:'iron'};
 if(topic==='overview'||topic==='home'){if(home){const dx=home.x-u.x,dz=home.z-u.z,angle=Math.atan2(dx,dz),directions=['north','northeast','east','southeast','south','southwest','west','northwest'],direction=directions[(Math.round(angle/(Math.PI/4))+8)%8],distance=Math.hypot(dx,dz);parts.push(distance<20?'My home is close by.':`My home is ${direction}. It’s ${distance<100?'a short walk':'a long walk'} from here.`);}
 else parts.push('I can’t give you directions to a home from here.');}
 if(topic==='overview'||topic==='work')parts.push(u.job?`I’ve been gathering ${labels[u.job]}.`:(u.craftingXP||0)>CONTACT_RULES.experiencedCraftingSeconds?'I’ve done some crafting. It takes practice to get it right.':u.carry>0?'No regular task just now. I’ve got this bundle to look after.':'I’m between jobs just now. What would you like to know?');
 if(topic==='needs')parts.push(u.hp/u.maxHp<CONTACT_RULES.woundedFraction?'I’m hurt. I’d rather not make a long journey like this.':(u.hunger||0)>CONTACT_RULES.hungrySeconds?'I’ve missed meals. Something to eat would be welcome.':(u.fatigue||0)>CONTACT_RULES.tiredFraction?'I’m worn out. A little rest would do me good.':'I’m holding up well enough, thank you.');
 if(topic==='overview'||topic==='cargo')parts.push(u.carry>0&&u.carryType?`I’m carrying ${Math.floor(u.carry)} ${labels[u.carryType]}.`:'My hands are empty. I’ve no bundle to offer.');
 const report=`${topic==='overview'?'':topicLabels[topic]+': '}“${parts.join(' ').slice(0,240)}”`;lifeEvent(g,0,`[Contact ${u.id}] ${report}`);return {accepted:true,reason:'Their reply is recorded in village history',report};
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
/** A normal saved move order approaches the meeting; goods remain on their
 * original bodies until the player confirms a revalidated local exchange. */
export function approachContactTradeIssue(g:Game,id:number,personId?:number){
 const u=target(g,id),issue=contactIssue(g,u,personId);if(issue||!u)return issue;
 if(u.prisoner||g.isFoe(0,u.team))return 'They will not agree to a peaceful exchange';
 if(!u.carryType||u.carry<=0)return 'They have no carried goods to offer';
 const p=speaker(g,u,personId)!;
 if(p.escortId!==undefined||p.conflictIntent==='occupy'||p.conflictIntent==='capture'||hasTaskCommitment(p)||p.boat||p.envoy||p.visit||p.trade||p.recalled)return 'No free carrier is present; finish their current duty first';
 if(Math.hypot(p.x-u.x,p.z-u.z)<=CONTACT_RULES.exchangeMeters)return 'You are already close enough to exchange';
 const spot=g.nearestWalk(p,u.x,u.z);if(!spot||!g.canStep(p,spot.x,spot.z)||!g.workBoard.connected(g,p.x,p.z,spot.x,spot.z))return 'No walkable approach to this meeting';return null;
}
function approachContactTrade(g:Game,u:Unit,personId?:number):ContactOutcome{
 const issue=approachContactTradeIssue(g,u.id,personId);if(issue)return {accepted:false,reason:issue};
 const p=speaker(g,u,personId)!,spot=g.nearestWalk(p,u.x,u.z);g.interruptMission(p);p.order='move';p.stationOnArrival=true;p.node=null;p.target=null;p.job=null;p.jobLock=true;p.pillage=-1;p.huntOnly=false;p.tx=spot.x;p.tz=spot.z;p.workReason='Approaching this meeting with existing carried goods';
 if(g.state.encounter?.stranger===u.id)g.state.paused=false;
 return {accepted:true,reason:`${personName(p)} is walking closer. Confirm the exchange when they arrive; both bundles remain with their owners.`};
}
/** Visible local conditions only: no hidden foreign stock or off-screen force. */
export function contactSafety(g:Game,id:number){const u=target(g,id);if(!u)return 'The person has left this meeting';const relation=g.isFoe(0,u.team)?'Relations are hostile. ':(g.tribe(u.team).trust||0)>=CONTACT_RULES.trustingThreshold?'Relations are trusting. ':'Trust is still limited. ';let hostile=0,armed=0;for(const p of g.state.units){if(p.hp<=0||!g.visibleAt(p.x,p.z)||Math.hypot(p.x-u.x,p.z-u.z)>CONTACT_RULES.riskMeters)continue;if(p.team===0&&armedAdult(g,p))armed++;else if(g.isFoe(0,p.team))hostile++;}return relation+(hostile?`${hostile} hostile ${hostile===1?'person is':'people are'} visible nearby; ${armed} armed villagers nearby.`:armed?`${armed} armed ${armed===1?'villager is':'villagers are'} nearby. No hostile party is currently visible here.`:'No armed villager or hostile party is currently visible nearby.');}
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
export function contactActions(g:Game,id:number,personId?:number){const u=target(g,id);return {attack:{reason:attackContactIssue(g,id,personId)},demand:{reason:demandContactIssue(g,id)},conversation:CONTACT_TOPICS.map(topic=>({...topic,reason:questionIssue(g,u,personId,topic.id)})),capture:{reason:captureContactIssue(g,id)},question:{reason:questionIssue(g,u,personId),report:lastContactReport(g,id)},trade:contactTradeOptions(g,id,personId),approach:{reason:approachContactTradeIssue(g,id,personId)},safety:contactSafety(g,id),leave:{reason:visitorLeaveIssue(g,u,personId)},scout:u?speaker(g,u,personId):undefined,prisoner:!!u?.prisoner&&u.prisoner.captorTeam===0&&u.prisoner.phase!=='released'};}
function finishEncounterAction(g:Game,id:number){if(g.state.encounter?.stranger===id){const resume=g.state.encounter.resume;g.state.encounter=undefined;g.state.paused=!resume;}}
/** Shared UI controller: blocked actions do not interrupt a mission or close
 * the contact; accepted travel commands resume the same physical simulation. */
export function performContactAction(g:Game,action:ContactAction,id:number,personId?:number,optionId?:string):ContactOutcome{
 const u=target(g,id);if(!u)return {accepted:false,reason:'This person is no longer present'};let result:ContactOutcome;
 if(action==='attack')result=beginContactAttack(g,u,personId);
 else if(action==='demand')result=beginContactDemand(g,u);
 else if(action==='capture')result=beginContactCapture(g,u);
 else if(action==='question')result=questionPerson(g,u,personId,optionId||'overview');
 else if(action==='trade')result=exchangeContact(g,u,optionId,personId);
 else if(action==='approach-trade')result=approachContactTrade(g,u,personId);
 else if(action==='release-prisoner'){const accepted=!!u.prisoner&&u.prisoner.captorTeam===0&&releasePrisoner(g,id);result={accepted,reason:accepted?'Released to walk home with their belongings and remaining provisions':'This person is not in your custody'};}
 else if(action==='ask-visitor-leave'){const issue=visitorLeaveIssue(g,u,personId);if(issue)result={accepted:false,reason:issue};else{returnPerson(g,u,'Leaving by request — taking belongings home');result={accepted:true,reason:'The visitor is walking home with the same belongings'};}}
 else {const own=speaker(g,u,personId);if(!own)result={accepted:false,reason:'Your explorer is no longer present at this meeting'};else if(!supplyDrops(g,0).some(home=>!!supplyApproach(g,own,home)))result={accepted:false,reason:'Your explorer has no reachable home cache; clear a route or crossing first'};else{returnPerson(g,own,'Returning home from first contact with existing provisions');own.order='move';result={accepted:true,reason:`${personName(own)} is returning to your camp; the foreign person remains independent`};}}
 if(result.accepted&&action==='trade')finishEncounterAction(g,id);
 if(result.accepted&&['attack','demand','capture','release-prisoner','ask-visitor-leave','send-scout-home'].includes(action))finishEncounterAction(g,id);g.banner(result.reason,5);return result;
}

function attackParty(g:Game,u:Unit,personId?:number){const armed=captureParty(g,u);if(armed.length)return armed;const own=speaker(g,u,personId);return own&&!hasTaskCommitment(own)&&own.escortId===undefined&&own.conflictIntent!=='occupy'?[own]:[];}
export function attackContactIssue(g:Game,id:number,personId?:number){const u=target(g,id);if(!u)return 'This person is no longer present';if(u.team===0||u.prisoner)return 'Use custody and release actions for a person under your control';if(isDependent(g,u))return 'Children are protected from this contact attack order';if(!g.visibleAt(u.x,u.z))return 'Reach and see this person first';if(!attackParty(g,u,personId).length)return 'Bring an available adult to give a physical attack order';return null;}
function beginContactAttack(g:Game,u:Unit,personId?:number):ContactOutcome{const issue=attackContactIssue(g,u.id,personId);if(issue)return {accepted:false,reason:issue};const party=attackParty(g,u,personId),selected=g.state.units.map(p=>({u:p,selected:p.selected})),building=g.state.selBld;g.clearSelect();for(const p of party)p.selected=true;g.issueAttack(u);for(const p of party){p.pillage=-1;p.attackDestination=null;p.returnAfterCombat=undefined;p.contactAttackTargetId=u.id;p.workReason='Approaching to attack this person';}for(const p of selected)p.u.selected=p.selected;g.state.selBld=building;return {accepted:true,reason:'A real attack is ordered; the person may resist, escape or be killed'};}
export function demandContactIssue(g:Game,id:number){const u=target(g,id);if(!u)return 'This person is no longer present';if(u.team===0||u.prisoner)return 'Use custody actions for someone under your control';if(isDependent(g,u))return 'Children cannot be threatened for supplies';if(!u.carryType||u.carry<=0)return 'This person has no carried goods to demand';if(!g.visibleAt(u.x,u.z))return 'Reach and see this person first';if(!captureParty(g,u).some(p=>p.carry===0))return 'No free armed adult with carrying capacity can reach this meeting';return null;}
function beginContactDemand(g:Game,u:Unit):ContactOutcome{
 const issue=demandContactIssue(g,u.id);if(issue)return {accepted:false,reason:issue};
 const defenders=g.state.units.filter(p=>p.team===u.team&&p.hp>0&&!p.prisoner&&!isDependent(g,p)&&(p.militia||!['worker','leader'].includes(p.type))&&g.visibleAt(p.x,p.z)&&Math.hypot(p.x-u.x,p.z-u.z)<=PRISONER_RULES.defenderRadiusMeters).length;
 const party=captureParty(g,u).filter(p=>p.carry===0).sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z)).slice(0,Math.min(CONTACT_RULES.maximumDemandGuards,Math.max(1,Math.ceil(defenders*PRISONER_RULES.superiorityRatio))));
 for(const p of party){g.interruptMission(p);p.contactDemand={targetId:u.id,lastTimeSeconds:g.state.time};p.order='hold';p.pillage=-1;p.node=null;p.target=null;p.huntOnly=false;p.workReason='Approaching to demand the actual carried goods';}
 return {accepted:true,reason:`${party.length} armed ${party.length===1?'adult is':'adults are'} approaching; the person may refuse or yield their carried goods`};
}
export function contactYieldingTo(g:Game,u:Unit,team:number){return u.contactSurrender?.team===team&&u.contactSurrender.until>g.state.time&&!(u.order==='attack'&&u.target?.team===team);}
/** Called by the existing per-step encounter hook, including already-known
 * contacts. Jobs remain on real actors and survive interruption/save/load. */
function tickContactOrders(g:Game){
 for(const p of g.state.units){
  if(p.contactSurrender&&p.contactSurrender.until<=g.state.time)p.contactSurrender=undefined;
  if(p.contactAttackTargetId!==undefined){const person=target(g,p.contactAttackTargetId);if(!person||person.team===p.team||person.prisoner){p.contactAttackTargetId=undefined;if(p.hp>0){if(p.militia)queueStandDown(g,p);else returnPerson(g,p,'Contact attack ended — returning with existing belongings');}}else if(!g.visibleAt(person.x,person.z)){p.order='hold';p.target=null;p.workReason='Lost sight of the person — search or withdraw';}else if(person.shelterId!==undefined){p.order='hold';p.target=null;p.workReason='The person reached shelter — choose another order or withdraw';}}
  const work=p.contactDemand;if(!work||p.hp<=0)continue;const dt=Math.max(0,Math.min(.34,g.state.time-work.lastTimeSeconds));work.lastTimeSeconds=g.state.time;if(!dt)continue;
  const person=target(g,work.targetId);if(!person||person.team===p.team||person.prisoner||!person.carryType||person.carry<=0){p.contactDemand=undefined;p.workReason='The person or carried goods are no longer available';continue;}
  if(p.emergency||p.order==='attack'&&p.target){p.contactDemand=undefined;p.workReason='The demand was interrupted by actual combat';continue;}
  if(Math.hypot(p.x-person.x,p.z-person.z)>CONTACT_RULES.exchangeMeters){const spot=g.nearestWalk(p,person.x,person.z);if(!spot||!g.workBoard.connected(g,p.x,p.z,spot.x,spot.z)){p.workReason='Demand approach blocked — clear a reachable route';continue;}p.tx=spot.x;p.tz=spot.z;p.order='hold';g.steer(p,dt);continue;}
  const force=g.state.units.filter(a=>armedAdult(g,a)&&Math.hypot(a.x-person.x,a.z-person.z)<=PRISONER_RULES.surrenderRadiusMeters).length;
  const defenders=g.state.units.filter(a=>a.team===person.team&&a.hp>0&&!a.prisoner&&!isDependent(g,a)&&(a.militia||!['worker','leader'].includes(a.type))&&Math.hypot(a.x-person.x,a.z-person.z)<=PRISONER_RULES.defenderRadiusMeters).length;
  if(force<Math.max(1,defenders*PRISONER_RULES.superiorityRatio)&&g.state.units.some(a=>a!==p&&a.hp>0&&armedAdult(g,a)&&a.contactDemand?.targetId===person.id&&Math.hypot(a.x-person.x,a.z-person.z)>PRISONER_RULES.surrenderRadiusMeters)){p.workReason='Waiting for the approaching guards before making the demand';continue;}
  g.makeHostile(person.team);
  if(force<Math.max(1,defenders*PRISONER_RULES.superiorityRatio)){p.contactDemand=undefined;p.order='hold';p.workReason='They refused the demand; armed companions resist';raiseAttackAlarm(g,person,p.team);lifeEvent(g,0,`${personName(person)} refused a demand for carried goods; nearby defenders resisted.`);continue;}
  const kind=person.carryType,amount=Math.min(person.carry,carryingCapacity(p,kind));p.carry=amount;p.carryType=kind;p.carryFood=kind==='food'?person.carryFood:undefined;person.carry-=amount;
  if(person.carry===0){person.carryType=null;person.carryFood=undefined;if(person.seedSamples){p.seedSamples={...p.seedSamples};for(const [crop,count]of Object.entries(person.seedSamples))p.seedSamples[crop as keyof typeof p.seedSamples]=(p.seedSamples[crop as keyof typeof p.seedSamples]||0)+(count||0);person.seedSamples=undefined;}}
  p.contactDemand=undefined;returnPerson(g,p,'Carrying demanded goods home');returnPerson(g,person,'Yielded carried goods — withdrawing with remaining belongings');person.contactSurrender={team:p.team,until:g.state.time+CONTACT_RULES.yieldSeconds};lifeEvent(g,0,`${personName(person)} yielded ${amount} ${kind}; a real carrier is bringing the goods home.`);
 }
}
export function validContactState(value:unknown){if(!value||typeof value!=='object')return false;const s=value as {units?:Unit[];nextId?:number;time?:number;tribes?:unknown[]};if(!Array.isArray(s.units))return false;for(const u of s.units){if(!u||typeof u!=='object'||Array.isArray(u))return false;if(u.contactDemand!==undefined&&(!u.contactDemand||typeof u.contactDemand!=='object'||Array.isArray(u.contactDemand)))return false;if(u.contactSurrender!==undefined&&(!u.contactSurrender||typeof u.contactSurrender!=='object'||Array.isArray(u.contactSurrender)))return false;for(const id of [u.contactDemand?.targetId,u.contactAttackTargetId])if(id!==undefined&&(!Number.isSafeInteger(id)||id<1||id>=Number(s.nextId)||id===u.id||u.team!==0))return false;if(u.contactDemand&&(!Number.isFinite(u.contactDemand.lastTimeSeconds)||u.contactDemand.lastTimeSeconds<0||u.contactDemand.lastTimeSeconds>Number(s.time)))return false;if(u.contactSurrender&&(!Number.isInteger(u.contactSurrender.team)||u.contactSurrender.team<0||u.contactSurrender.team>=Number(s.tribes?.length)||u.contactSurrender.team===u.team||!Number.isFinite(u.contactSurrender.until)||u.contactSurrender.until<0||u.contactSurrender.until>Number(s.time)+CONTACT_RULES.yieldSeconds+.001))return false;}return true;}
