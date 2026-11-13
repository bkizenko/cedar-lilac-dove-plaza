import type {Game} from './sim';
import type {PeaceTerm, Unit} from './types';
import {personName} from './people';
import {isDependent} from './settlement';
import {CONTACT_RULES, contactTradeOptions, performContactAction} from './encounters';
import {knownDiplomaticRelation} from './diplomaticKnowledge';
import {partnerTradeIntel} from './tradeIntel';
import {PEACE_TERMS, peaceIssue, settlePeace} from './peace';
import {voiceFor,type Voice} from './vocab';
import {cultureLabel} from './cultureNaming';

/** Ephemeral conversation view: opening or changing a topic never changes the
 * world, publishes information, buys goods or signs a treaty. UI owns transcript. */
export type LeaderTopic='welcome'|'needs'|'trade'|'relations'|'treaties';
export type LeaderChoice={id:string;label:string;kind:'topic'|'exchange'|'peace';topic?:LeaderTopic;optionId?:string;term?:PeaceTerm};
export type LeaderDialogue={speakerId:number;playerId:number;name:string;society:string;role:'leader'|'representative';topic:LeaderTopic;reply:string;choices:LeaderChoice[];issue:string|null};
const topicsFor=(v:Voice):LeaderChoice[]=>[
 {id:'topic:needs',label:v.prompts.needs,kind:'topic',topic:'needs'},
 {id:'topic:trade',label:v.prompts.trade,kind:'topic',topic:'trade'},
 {id:'topic:relations',label:v.prompts.relations,kind:'topic',topic:'relations'},
 {id:'topic:treaties',label:v.prompts.pact,kind:'topic',topic:'treaties'},
];
/** The voice a person speaks in: their own society's age and culture, one stable line per person. */
export function voiceOf(g:Game,speaker:Unit|undefined,team?:number):Voice{
 const t=speaker?speaker.team:team??1;return voiceFor({age:g.tribe(t)?.age,culture:cultureLabel(g.state.seed,t),seed:g.state.seed,speaker:speaker?.id});
}
const goodsName={food:'food',wood:'timber',stone:'stone',copper:'copper',iron:'iron'};
function meeting(g:Game,playerId:number,speakerId:number){
 const player=g.state.units.find(u=>u.id===playerId&&u.hp>0),speaker=g.state.units.find(u=>u.id===speakerId&&u.hp>0),v=voiceOf(g,speaker,speaker?.team);
 const issue=!player||player.team!==0||player.prisoner||isDependent(g,player)?v.issues.bringAdult:!speaker||speaker.team===0||speaker.team===3||speaker.prisoner||isDependent(g,speaker)?v.issues.noOneHere:player.boat||speaker.boat?v.issues.ashore:!g.visibleAt(speaker.x,speaker.z)?v.issues.reach:Math.hypot(player.x-speaker.x,player.z-speaker.z)>CONTACT_RULES.talkMeters?v.issues.closer:null;
 return {player,speaker,issue};
}
function offer(g:Game,speaker:Unit){return g.state.diplomaticMessages?.find(m=>m.team===speaker.team&&m.carrierId===speaker.id&&m.kind==='peaceOffer'&&m.phase==='delivered'&&m.term&&g.tribe(speaker.team)?.peaceOffer?.term===m.term&&g.tribe(speaker.team).peaceOffer!.expires>g.state.time);}
function exchangeKey(optionId:string,player:Unit,speaker:Unit){return `exchange:${optionId}:${player.carryType||'-'}:${player.carry}:${speaker.carryType||'-'}:${speaker.carry}`;}
export function leaderDialogue(g:Game,playerId:number,speakerId:number,topic:LeaderTopic='welcome'):LeaderDialogue{
 const {player,speaker,issue}=meeting(g,playerId,speakerId),v=voiceOf(g,speaker,speaker?.team),
  view:LeaderDialogue={speakerId,playerId,name:speaker?personName(speaker):'Stranger',society:speaker?g.tribe(speaker.team)?.name||'an unknown people':'an unknown people',role:speaker?.type==='leader'?'leader':'representative',topic,reply:'',choices:[],issue};
 if(issue||!speaker||!player)return view;
 view.choices=topicsFor(v).filter(c=>c.topic!==topic).map(c=>({...c}));
 const hostile=g.isFoe(0,speaker.team),peace=offer(g,speaker);
 if(hostile&&!peace){view.reply=v.war;view.choices=[];return view;}
 if(topic==='welcome')view.reply=v.greeting(view.name,view.society,speaker.type==='leader');
 else if(topic==='needs'){
  const intel=partnerTradeIntel(g,0,speaker.team);
  if((speaker.hunger||0)>CONTACT_RULES.hungrySeconds)view.reply=v.needs.hungry;
  else if(intel&&intel.status!=='expired'){
   const needs=intel.report.goods.filter(x=>x.need==='needs').map(x=>goodsName[x.kind]);
   view.reply=v.needs.known(Math.floor(intel.ageSeconds),intel.status==='stale',needs);
  }else view.reply=v.needs.none;
 }else if(topic==='trade'){
  const trade=contactTradeOptions(g,speakerId,playerId);
  view.reply=trade.options.length?v.trade.offer:trade.reason||v.trade.none;
  view.choices.unshift(...trade.options.map(o=>({id:exchangeKey(o.id,player,speaker),label:o.label,kind:'exchange' as const,optionId:o.id})));
 }else if(topic==='relations'){
  const relation=knownDiplomaticRelation(g,speaker.team);
  view.reply=!relation.known?v.relations.unknown:v.relations.known(!!relation.stale,relation.hostile?'hostile':relation.ally?'ally':'peace',relation.compactUntil>g.state.time);
 }else if(topic==='treaties'){
  if(peace?.term){const blocked=peaceIssue(g,speaker.team,peace.term),label=v.term[peace.term]??PEACE_TERMS[peace.term];view.reply=blocked||v.pact.offer(label);if(!blocked)view.choices.unshift({id:`peace:${peace.id}:${peace.term}`,label:v.pact.accept(label),kind:'peace',term:peace.term});}
  else view.reply=speaker.type==='leader'?v.pact.noneLeader:v.pact.noneHand;
 }
 return view;
}
/** Rebuild choices at action time. Old offers cannot exchange changed bundles,
 * remote goods or expired terms. No textual reply grants goods or standing. */
export function chooseLeaderDialogue(g:Game,playerId:number,speakerId:number,topic:LeaderTopic,choiceId:string){
 const view=leaderDialogue(g,playerId,speakerId,topic),choice=view.choices.find(c=>c.id===choiceId),speaker=g.state.units.find(u=>u.id===speakerId),v=voiceOf(g,speaker,speaker?.team);
 if(view.issue||!choice)return {accepted:false,reply:view.issue||v.trade.stale,view};
 if(choice.kind==='topic'){const next=leaderDialogue(g,playerId,speakerId,choice.topic);return {accepted:!next.issue,reply:next.reply,view:next};}
 if(choice.kind==='exchange'){const result=performContactAction(g,'trade',speakerId,playerId,choice.optionId);return {accepted:result.accepted,reply:result.accepted?v.trade.done:result.reason,view:leaderDialogue(g,playerId,speakerId,'trade')};}
 const accepted=!!choice.term&&settlePeace(g,g.state.units.find(u=>u.id===speakerId)!.team,choice.term);
 return {accepted,reply:accepted?v.pact.sworn:v.pact.failed,view:leaderDialogue(g,playerId,speakerId,'relations')};
}
