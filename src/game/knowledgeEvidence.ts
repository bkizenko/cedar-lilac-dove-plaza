import type {Game} from './sim';
import type {CropKind} from './types';
import {SIM_CALENDAR_RULES} from './calendarPacing';
import type {KnowledgeTopic} from './knowledge';
import {inheritedKnowledgeProofs} from './inheritedKnowledge';
export type KnowledgeState='unknown'|'partly'|'known';
export type KnowledgeProvenance={kind:'observed'|'experimented'|'demonstrated'|'taught'|'inherited'|'traded'|'captured'|'unrecorded';summary:string;at?:number;sourceTeam?:number;sourceName?:string;sourcePersonId?:number;contributorIds?:number[];method?:string};
export const KNOWLEDGE_STATE_LABELS:Record<KnowledgeState,string>={unknown:'Unknown',partly:'Partly known',known:'Known'};
export const KNOWLEDGE_SOURCE_LABELS:Record<KnowledgeProvenance['kind'],string>={observed:'Observed',experimented:'Experiment',demonstrated:'Demonstrated',taught:'Taught',inherited:'Inherited',traded:'Traded',captured:'Captured',unrecorded:'Earlier practice'};
/** Read models carry no authority: a badge cannot establish a technique or create a receipt. */
export function annotateKnowledge(g:Game,topics:KnowledgeTopic[]):KnowledgeTopic[]{
 const proofs=inheritedKnowledgeProofs(g.state,0),tribe=g.tribe(0);
 return topics.map(topic=>{
  if(topic.knowledgeState!==undefined&&topic.provenance)return topic;
  const provenance:KnowledgeProvenance[]=[];
  let state:KnowledgeState=topic.stage==='need'?'unknown':['proven','adoption'].includes(topic.stage)?'known':'partly';
  if(topic.id.startsWith('crop:')){const kind=topic.id.slice(5),receipt=tribe.cultivationEvidence?.[kind as CropKind];if(receipt)provenance.push({kind:'demonstrated',at:receipt.demonstratedAt,contributorIds:[...receipt.actorIds],summary:`Seed trial completed with ${receipt.actorIds.length} recorded hands-on contributors`});for(const p of proofs)if(p.cultivated.some(k=>k===kind))provenance.push({kind:'inherited',sourceTeam:p.sourceTeam,sourceName:p.sourceName,at:p.observedAt,summary:`Cultivation shared by ${p.sourceName}`});if(receipt?.inheritedSourceTeam!==undefined&&!provenance.some(p=>p.kind==='inherited'&&p.sourceTeam===receipt.inheritedSourceTeam))provenance.push({kind:'inherited',sourceTeam:receipt.inheritedSourceTeam,summary:'An inherited paid trial was completed at its original site'});}
  if(topic.id==='copper')for(const p of proofs)if(p.copperPrototype)provenance.push({kind:'inherited',sourceTeam:p.sourceTeam,sourceName:p.sourceName,at:p.observedAt,summary:`Workable copper prototype shared by ${p.sourceName}`});
  if(topic.id==='community:inherited-methods')for(const p of proofs)provenance.push({kind:'inherited',sourceTeam:p.sourceTeam,sourceName:p.sourceName,at:p.observedAt,summary:`${p.recipes.length} methods and ${p.cultivated.length} cultivation practices shared by ${p.sourceName}`});
  if(topic.id.startsWith('hull:')){const kind=topic.id.slice(5)as 'scoutCanoe'|'freightPunt',p=tribe.boatPractice;
   if(p?.proven[kind])provenance.push({kind:'demonstrated',at:p.demonstratedAt?.[kind],summary:'Useful cargo returned on this hull'});
   for(const q of proofs)if(q.boat?.proven[kind])provenance.push({kind:'inherited',sourceTeam:q.sourceTeam,sourceName:q.sourceName,at:q.observedAt,summary:`Demonstrated hull method shared by ${q.sourceName}`});
   if(!provenance.length&&(p?.waterMeters??0)>0)provenance.push({kind:'observed',at:p?.firstObservedAt,summary:'Actual waterborne travel; a useful hull return is still needed'});
  }
  if(topic.id==='sailing:square'&&tribe.boatPractice?.sailing?.demonstratedAt!==undefined)provenance.push({kind:'demonstrated',at:tribe.boatPractice.sailing.demonstratedAt,summary:'Wind-assisted cargo physically delivered'});
  if(topic.id==='transport'){
   for(const p of proofs)if(p.cartMethod)provenance.push({kind:'inherited',sourceTeam:p.sourceTeam,sourceName:p.sourceName,at:p.observedAt,summary:`Cart method shared by ${p.sourceName}`});
   // Owning or buying a cart does not document who learned to make it.
   if(!provenance.length&&topic.stage==='adoption'){state='partly';provenance.push({kind:'observed',summary:'A cart is in use; its construction method has no retained result receipt'});}
  }
  if(provenance.some(p=>p.kind==='inherited')&&topic.id!=='community:inherited-methods')state='known';
  if(topic.stage==='experiment')provenance.push({kind:'experimented',summary:'Paid practical work is underway; a useful completed result is still required'});
  if(!provenance.length&&state==='known')provenance.push({kind:'unrecorded',summary:'Established practice is retained, but its original learning source was not recorded'});
  if(!provenance.length&&state==='partly')provenance.push({kind:'observed',summary:'Observed materials or use; no completed method receipt'});
  return {...topic,knowledgeState:state,provenance};
 });
}

export function knowledgeDateLabel(at:number){const year=Math.floor(at/SIM_CALENDAR_RULES.yearSeconds)+1,season=Math.floor((at%SIM_CALENDAR_RULES.yearSeconds)/(SIM_CALENDAR_RULES.yearSeconds/4));return `Year ${year} · ${['Spring','Summer','Autumn','Winter'][season]}`;}
