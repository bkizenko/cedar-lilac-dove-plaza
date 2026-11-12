import type {Game} from './sim';
import type {Unit} from './types';
import type {KnowledgeTopic,KnowledgeActionResult} from './knowledge';
import type {KnowledgeProvenance} from './knowledgeEvidence';
import {beginProduction,productionIssue,PRODUCTION_RECIPES,type ProductionRecipe} from './production';
import {methodRecords,methodRecordSource,methodRecordSources,pickupMethodRecord,depositMethodRecord,type MethodRecordWork} from './methodRecords';
import {METHOD_RECORD_RULES as R,METHOD_RECORD_METHODS,methodRecordTitle,type MethodRecipe} from './methodRecordRules';
import {BUILDINGS} from './constants';
import {hasTaskCommitment} from './workCommitments';
import {isDependent} from './settlement';
const free=(g:Game,u:Unit)=>u.team===0&&u.hp>0&&u.type==='worker'&&!u.prisoner&&!u.militia&&!isDependent(g,u)&&!u.emergency&&!u.recalled&&!u.jobLock&&!u.boat&&!hasTaskCommitment(u)&&u.carry===0&&!Object.values(u.itemCargo||{}).some(n=>(n||0)>0)&&['idle','hold','gather'].includes(u.order);
const supported=(recipe:string):recipe is MethodRecipe=>Object.hasOwn(METHOD_RECORD_METHODS,recipe);
function proposal(g:Game,kind:'author'|'study'|'replicate',recordId?:number,authorMethod:MethodRecipe='twistCordage'){
 const rec=methodRecords(g).find(r=>r.id===recordId&&r.team===0);
 if(kind!=='author'&&!rec)return{issue:'No owned physical record'};
 const method=kind==='author'?authorMethod:rec!.source.recipe,title=methodRecordTitle(method).toLowerCase();
 const recipe:ProductionRecipe=kind==='author'?'authorCordageRecord':kind==='study'?'studyCordageRecord':method;
 const workplace=kind==='author'?'kiln':kind==='study'?'hearth':PRODUCTION_RECIPES[method].workplace,name=BUILDINGS[workplace].name.toLowerCase();
 const sites=g.state.buildings.filter(b=>b.team===0&&g.finished(b)&&b.type===workplace);
 let issue=kind==='author'?`Need a maker with ${R.qualifiedBatches} actual delivered ${title} batches at a reachable cache`:kind==='study'?'Bring an available learner to the actual returned record cache':`Need a living learner who studied this record and can reach a ${name}`;
 if(!sites.length)return{issue:kind==='author'?'Finish a kiln to fire the physical record':kind==='study'?'Finish a hearth for paid study':`Finish a ${name} for actual ${title} replication`};
 for(const u of g.state.units.filter(u=>free(g,u))){
  const source=kind==='author'?methodRecordSource(g,u,method):null;if(kind==='author'&&!source)continue;
  const work:MethodRecordWork=kind==='author'?{kind,source:source!}:{kind,recordId:recordId!,learnerId:u.id};
  for(const b of sites){const why=productionIssue(g,recipe,b.id,u.id,false,work);if(!why)return{issue:null,u,b,recipe,work};issue=why;}
 }
 return{issue};
}
/** Acquisition is custody evidence, never a demonstrated-method receipt. No foreign location enters the read model. */
function acquisitionEvidence(r:ReturnType<typeof methodRecords>[number]):KnowledgeProvenance[]{
 return(r.acquisitions||[]).filter(a=>a.toTeam===0).map(a=>({kind:a.kind==='recovered'?'recorded':a.kind,sourceTeam:a.fromTeam,at:a.at,contributorIds:a.by===undefined?undefined:[a.by],summary:`${a.kind==='captured'?'Captured':a.kind==='inherited'?'Lawfully inherited':'Recovered'} this same physical record${a.returnedAt===undefined?'; return it to an owned cache before study':'; physically returned to an owned cache'}. Custody alone does not establish its method.`}));
}
export function methodRecordKnowledgeTopics(g:Game):KnowledgeTopic[]{
 const assets=methodRecords(g).filter(r=>r.team===0),topics:KnowledgeTopic[]=[],qualified=new Set<MethodRecipe>();
 for(const u of g.state.units)if(u.team===0&&u.hp>0)for(const source of methodRecordSources(g,u))qualified.add(source.recipe);
 // Only demonstrated makers need author cards. Owned records have their own
 // physical-asset cards below; an empty camp keeps the single legacy prompt.
 const methods=(Object.keys(METHOD_RECORD_METHODS) as MethodRecipe[]).filter(recipe=>qualified.has(recipe));
 if(!methods.length&&!assets.length)methods.push('twistCordage');
 for(const method of methods){
  const title=methodRecordTitle(method).toLowerCase(),records=assets.filter(r=>r.source.recipe===method),author=proposal(g,'author',undefined,method);
  topics.push({id:method==='twistCordage'?'records:cordage':`records:method:${method}`,title:`Record a demonstrated ${title} method`,need:'A physical example can preserve a practiced maker’s exact method beyond a live lesson.',stage:records.length?'proven':qualified.has(method)?'observation':'need',observation:`Only a maker with ${R.qualifiedBatches} genuinely delivered batches can author this exact method.`,experiment:`${R.clay} clay + ${R.wood} log; ${R.authorSeconds}s actual kiln work, then carry the record home.`,result:`${records.length} physical ${title} records in our custody`,adoption:`Studying gives a lead. Actual paid ${title} replication must succeed before a learned-method benefit.`,metrics:{records:records.length},actions:[{id:`records:author:${method}`,label:`Make ${title} method record`,blockedReason:author.issue}],limitation:'One bounded incised practical example; no writing institution, free technique or automatic age advancement.'});
 }
 for(const r of assets){
  const title=methodRecordTitle(r.source.recipe),lower=title.toLowerCase(),studied=r.studies.filter(s=>g.state.units.some(u=>u.id===s.personId&&u.team===0&&u.hp>0)),known=studied.filter(s=>s.replicatedAt!==undefined),study=proposal(g,'study',r.id),replicate=proposal(g,'replicate',r.id),holder=r.holder,held=holder.kind==='carrier'?g.state.units.find(u=>u.id===holder.unitId):undefined;
  topics.push({id:`records:asset:${r.id}`,title:`${title} method record · ${r.source.makerName}`,knowledgeState:known.length?'known':'partly',provenance:[...acquisitionEvidence(r),{kind:'recorded',sourceTeam:r.source.team,sourceName:r.source.teamName,sourcePersonId:r.source.makerId,at:r.authoredAt,summary:`${lower} record fired from ${r.source.makerName}’s ${r.source.successfulBatches} delivered batches; physical record ${r.id}`},...known.map(s=>({kind:'demonstrated' as const,at:s.replicatedAt,contributorIds:[s.personId],summary:`Studied this returned ${lower} record and delivered an actual paid replication`}))],need:'Keep the actual record safe and bring it home before studying.',stage:known.length?'adoption':studied.length?'experiment':r.deliveredAt!==undefined?'observation':'need',observation:`${r.holder.kind==='carrier'?`Carried by ${held?.name||held?.id}`:r.holder.kind==='cache'?'At its actual cache':'On the ground'} · ${studied.length} living readers`,experiment:`${R.studyWood} log and ${R.studySeconds}s hands-on study; then pay all normal ${lower} inputs and work.`,result:`${known.length} living readers delivered a successful ${lower} replication`,adoption:'Only successful replication adds one learned-method receipt; reload or repeated study grants nothing.',metrics:{recordId:r.id,readers:studied.length,successfulReplications:known.length},actions:[{id:`records:study:${r.id}`,label:'Study returned record',blockedReason:study.issue},{id:`records:replicate:${r.id}`,label:`Replicate recorded ${lower} method`,blockedReason:replicate.issue},...(r.holder.kind==='carrier'?[{id:`records:deposit:${r.id}`,label:'Put carried record at this cache',blockedReason:null}]:[{id:`records:pickup:${r.id}`,label:'Pick up this physical record',blockedReason:null}])],limitation:'Pickup and deposit require real contact with the original record/cache. No artifact is spawned by reading.'});
 }
 return topics;
}
export function runMethodRecordAction(g:Game,id:string):KnowledgeActionResult{
 const[,kind,arg]=id.split(':');
 if(kind==='author'||kind==='study'||kind==='replicate'){
  const method=kind==='author'?(arg??'twistCordage'):'twistCordage';
  if(!supported(method))return{accepted:false,reason:'That demonstrated method cannot be recorded'};
  const recordId=kind==='author'?undefined:Number(arg);
  const p=proposal(g,kind,recordId,method);
  if(p.issue||!p.u||!p.b||!p.work||!p.recipe)return{accepted:false,reason:p.issue||'Actual paid method work unavailable'};
  const accepted=beginProduction(g,p.recipe,p.b.id,p.u.id,false,p.work);
  return{accepted,reason:accepted?'Paid once; resume play for physical travel, work and delivery':'The original material/workplace admission changed'};
 }
 const record=methodRecords(g).find(r=>r.id===Number(arg)&&r.team===0);
 if(!record)return{accepted:false,reason:'No owned physical record'};
 if(kind==='pickup'){const u=g.selectedUnits().find(u=>free(g,u))||g.state.units.find(u=>free(g,u)&&Math.hypot(u.x-record.holder.x,u.z-record.holder.z)<1.8),accepted=!!u&&pickupMethodRecord(g,u,record.id);return{accepted,reason:accepted?'The same physical record is now carried':'Walk an available selected adult to the actual record or its cache'};}
 if(kind==='deposit'){const u=g.state.units.find(u=>u.team===0&&u.methodRecordCargoId===record.id),accepted=!!u&&depositMethodRecord(g,u);return{accepted,reason:accepted?'The same record reached this cache':'Physically carry the record to an owned cache; finish retained paid work first'};}
 return{accepted:false,reason:'Unknown record action'};
}
