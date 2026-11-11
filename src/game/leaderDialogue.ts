import type {Game} from './sim';
import type {PeaceTerm, Unit} from './types';
import {personName} from './people';
import {isDependent} from './settlement';
import {CONTACT_RULES, contactTradeOptions, performContactAction} from './encounters';
import {knownDiplomaticRelation} from './diplomaticKnowledge';
import {partnerTradeIntel} from './tradeIntel';
import {PEACE_TERMS, peaceIssue, settlePeace} from './peace';

/** Ephemeral conversation view: opening or changing a topic never changes the
 * world, publishes information, buys goods or signs a treaty. UI owns transcript. */
export type LeaderTopic='welcome'|'needs'|'trade'|'relations'|'treaties';
export type LeaderChoice={id:string;label:string;kind:'topic'|'exchange'|'peace';topic?:LeaderTopic;optionId?:string;term?:PeaceTerm};
export type LeaderDialogue={speakerId:number;playerId:number;name:string;society:string;role:'leader'|'representative';topic:LeaderTopic;reply:string;choices:LeaderChoice[];issue:string|null};
const topics:LeaderChoice[]=[
 {id:'topic:needs',label:'What do your people need?',kind:'topic',topic:'needs'},
 {id:'topic:trade',label:'Let us exchange goods.',kind:'topic',topic:'trade'},
 {id:'topic:relations',label:'Where do we stand?',kind:'topic',topic:'relations'},
 {id:'topic:treaties',label:'Discuss an agreement.',kind:'topic',topic:'treaties'},
];
const goodsName={food:'food',wood:'timber',stone:'stone',copper:'copper',iron:'iron'};
function meeting(g:Game,playerId:number,speakerId:number){
 const player=g.state.units.find(u=>u.id===playerId&&u.hp>0),speaker=g.state.units.find(u=>u.id===speakerId&&u.hp>0);
 const issue=!player||player.team!==0||player.prisoner||isDependent(g,player)?'Bring an adult from your community.':!speaker||speaker.team===0||speaker.team===3||speaker.prisoner||isDependent(g,speaker)?'There is no independent representative here.':player.boat||speaker.boat?'Meet ashore to speak.':!g.visibleAt(speaker.x,speaker.z)?'Reach and see the representative first.':Math.hypot(player.x-speaker.x,player.z-speaker.z)>CONTACT_RULES.talkMeters?'Move within speaking distance.':null;
 return {player,speaker,issue};
}
function offer(g:Game,speaker:Unit){return g.state.diplomaticMessages?.find(m=>m.team===speaker.team&&m.carrierId===speaker.id&&m.kind==='peaceOffer'&&m.phase==='delivered'&&m.term&&g.tribe(speaker.team)?.peaceOffer?.term===m.term&&g.tribe(speaker.team).peaceOffer!.expires>g.state.time);}
function exchangeKey(optionId:string,player:Unit,speaker:Unit){return `exchange:${optionId}:${player.carryType||'-'}:${player.carry}:${speaker.carryType||'-'}:${speaker.carry}`;}
export function leaderDialogue(g:Game,playerId:number,speakerId:number,topic:LeaderTopic='welcome'):LeaderDialogue{
 const {player,speaker,issue}=meeting(g,playerId,speakerId),view:LeaderDialogue={speakerId,playerId,name:speaker?personName(speaker):'Representative',society:speaker?g.tribe(speaker.team)?.name||'Unknown community':'Unknown community',role:speaker?.type==='leader'?'leader':'representative',topic,reply:'',choices:[],issue};
 if(issue||!speaker||!player)return view;
 view.choices=topics.filter(c=>c.topic!==topic).map(c=>({...c}));
 const hostile=g.isFoe(0,speaker.team),peace=offer(g,speaker);
 if(hostile&&!peace){view.reply='We are at war. I have brought no authority to agree terms here.';view.choices=[];return view;}
 if(topic==='welcome')view.reply=speaker.type==='leader'?`You are speaking with ${view.name} of ${view.society}. Tell me what brings your people here.`:`I am ${view.name}, from ${view.society}. I can speak for my own journey and the goods I brought.`;
 else if(topic==='needs'){
  const intel=partnerTradeIntel(g,0,speaker.team);
  if((speaker.hunger||0)>CONTACT_RULES.hungrySeconds)view.reply='I have missed meals on this journey. Food would be welcome.';
  else if(intel&&intel.status!=='expired'){
   const needs=intel.report.goods.filter(x=>x.need==='needs').map(x=>goodsName[x.kind]);
   view.reply=`Your returned trading account is ${Math.floor(intel.ageSeconds)} seconds old${intel.status==='stale'?' and may be out of date':''}. ${needs.length?`It lists a need for ${needs.join(', ')}.`:'It lists no shortages among the goods discussed.'} I cannot promise our stores are unchanged.`;
  }else view.reply='I have no current account of our storehouses to give you. We can discuss what I actually brought, or meet our traders at home.';
 }else if(topic==='trade'){
  const trade=contactTradeOptions(g,speakerId,playerId);
  view.reply=trade.options.length?'Here is what we can exchange here, with the goods actually present.':trade.reason||'I have no exchange to offer here.';
  view.choices.unshift(...trade.options.map(o=>({id:exchangeKey(o.id,player,speaker),label:o.label,kind:'exchange' as const,optionId:o.id})));
 }else if(topic==='relations'){
  const relation=knownDiplomaticRelation(g,speaker.team);
  view.reply=!relation.known?'We have no shared diplomatic account yet. Let our actions give us something to judge.':`Our ${relation.stale?'older':'last delivered'} diplomatic account records ${relation.hostile?'hostility':relation.ally?'an alliance':'peace'}.${relation.compactUntil>g.state.time?' A grazing compact is still in force.':''}`;
 }else if(topic==='treaties'){
  if(peace?.term){const blocked=peaceIssue(g,speaker.team,peace.term);view.reply=blocked||`I carry a proposal for ${PEACE_TERMS[peace.term].toLowerCase()}. These are the terms my community sent.`;if(!blocked)view.choices.unshift({id:`peace:${peace.id}:${peace.term}`,label:`Accept ${PEACE_TERMS[peace.term].toLowerCase()}`,kind:'peace',term:peace.term});}
  else view.reply=speaker.type==='leader'?'No formal proposal is before us. Send a delegation to our known settlement to negotiate; speaking here does not sign an agreement.':'I have no treaty mandate. A greeting cannot bind either community. Send a delegation or speak with a messenger carrying agreed terms.';
 }
 return view;
}
/** Rebuild choices at action time. Old offers cannot exchange changed bundles,
 * remote goods or expired terms. No textual reply grants resources or authority. */
export function chooseLeaderDialogue(g:Game,playerId:number,speakerId:number,topic:LeaderTopic,choiceId:string){
 const view=leaderDialogue(g,playerId,speakerId,topic),choice=view.choices.find(c=>c.id===choiceId);
 if(view.issue||!choice)return {accepted:false,reply:view.issue||'That offer is no longer available. Ask again.',view};
 if(choice.kind==='topic'){const next=leaderDialogue(g,playerId,speakerId,choice.topic);return {accepted:!next.issue,reply:next.reply,view:next};}
 if(choice.kind==='exchange'){const result=performContactAction(g,'trade',speakerId,playerId,choice.optionId);return {accepted:result.accepted,reply:result.accepted?'Agreed. Those goods have changed hands.':result.reason,view:leaderDialogue(g,playerId,speakerId,'trade')};}
 const accepted=!!choice.term&&settlePeace(g,g.state.units.find(u=>u.id===speakerId)!.team,choice.term);
 return {accepted,reply:accepted?'The agreement is signed. Both communities are bound by those terms.':'We could not conclude those terms.',view:leaderDialogue(g,playerId,speakerId,'relations')};
}
