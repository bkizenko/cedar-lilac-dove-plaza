import {fibreKnowledgeTopics,runFibreKnowledgeAction} from './fibreKnowledge';
import {productionKnowledgeTopics,runProductionKnowledgeAction} from './practiceKnowledge';
import type {Game} from './sim';
import type {Unit,CropKind,BldType,Building} from './types';
import {CROPS,CROP_NAMES,beginCropTrial,seekCropSamples} from './cultivation';
import {COPPER_STUDY_RULES,copperStudyIssue,beginCopperStudy} from './materialStudy';
import {hasTaskCommitment,type CommittedTask} from './workCommitments';
import {calendar,isDependent,reserveSeconds} from './settlement';
import {HAULAGE,WHEEL_PRACTICE,haulageRequirement,beginHaulageWork} from './haulage';
import {FARM_TOOLS,farmToolRequirement,beginFarmToolWork,resumeFarmToolWork} from './farmTools';
import {foodSpoilage,preservationAvailable,preservationTimberReserve} from './pantry';
import {supplyAccounting} from './simulationEvents';

export const KNOWLEDGE_RULES={version:1,cropSampleUnits:4,cropTrialFoodReserveSeconds:60,lowFoodReserveSeconds:600} as const;
export type KnowledgeStage='need'|'observation'|'experiment'|'proven'|'adoption';
export type KnowledgeAction={id:string;label:string;blockedReason:string|null};
export type KnowledgeTopic={id:string;title:string;need:string;stage:KnowledgeStage;observation:string;experiment:string;result:string;adoption:string;progress?:{completed:number;required:number;unit:string};metrics:Record<string,number>;actions:KnowledgeAction[];limitation?:string};
export type KnowledgeActionResult={accepted:boolean;reason:string;placement?:BldType};
type PracticalProposal={reason:string|null;u?:Unit;site?:Building;resume?:boolean};
/** Reports reflect only real saved evidence/current work. Reading grants nothing. */
function available(g:Game,u:Unit,except?:CommittedTask,allowLocked=false){return u.team===0&&u.hp>0&&u.type==='worker'&&!u.militia&&!isDependent(g,u)&&!(u as Unit&{prisoner?:unknown}).prisoner&&u.enslavedFrom===undefined&&!u.boat&&!u.emergency&&!u.recalled&&!u.expedition&&!u.envoy&&!u.visit&&!u.scout&&!u.foundingJourney&&!u.tributeJourney&&!u.buildOrder&&u.drill==null&&!u.resting&&!u.shelterId&&u.carry===0&&!hasTaskCommitment(u,except)&&(allowLocked||!u.jobLock)&&['idle','gather','hold'].includes(u.order);}
const action=(id:string,label:string,blockedReason:string|null):KnowledgeAction=>({id,label,blockedReason});
function actorAt(g:Game,sites:Building[],except?:CommittedTask,allowLocked=false){for(const u of g.state.units)if(available(g,u,except,allowLocked))for(const site of sites)if(g.interactionSpot(u,site))return {u,site};return undefined;}
const buildings=(g:Game,type:BldType)=>g.state.buildings.filter(b=>b.team===0&&b.type===type&&g.finished(b));
function cropProposal(g:Game,kind:CropKind):PracticalProposal{
 const t=g.tribe(0),halls=buildings(g,'townhall');
 if(t.cultivated?.includes(kind))return {reason:`${CROP_NAMES[kind]} cultivation is already established`};
 if(t.cropTrial&&t.cropTrial.kind!==kind)return {reason:`Finish the ${t.cropTrial.kind} trial before another crop`};
 if(g.state.units.some(u=>u.team===0&&u.hp>0&&u.studyCrop===kind))return {reason:'A resident is already working on this crop trial'};
 if(!halls.length)return {reason:'Finish a hearth where a resident can test seeds'};
 if(!t.cropTrial&&(t.cropSamples?.[kind]||0)<KNOWLEDGE_RULES.cropSampleUnits)return {reason:`Bring ${KNOWLEDGE_RULES.cropSampleUnits} ${kind} samples home (${(t.cropSamples?.[kind]||0).toFixed(1)} available)`};
 if(reserveSeconds(g)<KNOWLEDGE_RULES.cropTrialFoodReserveSeconds)return {reason:'Secure one minute of food before taking a resident into trials'};
 const candidate=actorAt(g,halls);if(!candidate)return {reason:'Need an available adult with empty hands and a route to a hearth'};
 return {...candidate,reason:null};
}
function copperProposal(g:Game):PracticalProposal{
 const sites=buildings(g,'workshop');if(!sites.length)return {reason:'Finish a crafting shelter for copper trials'};
 for(const site of sites){const reason=copperStudyIssue(g,site.id);if(!reason)return {site,reason:null};}
 return {reason:copperStudyIssue(g,sites[0].id)};
}
function copperToolsProposal(g:Game):PracticalProposal{
 const issue=farmToolRequirement(g,'copperTools');if(issue)return {reason:issue};
 const sites=g.state.buildings.filter(b=>b.team===0&&g.finished(b)&&['workshop','forge'].includes(b.type));
 const existing=g.state.units.find(u=>u.team===0&&u.hp>0&&u.farmToolWork?.kind==='copperTools');
 if(existing){if(!existing.farmToolWork!.paused)return {reason:'A resident is already making copper farming tools'};const site=sites.find(b=>available(g,existing,'farmToolWork',true)&&g.interactionSpot(existing,b));return site?{u:existing,site,resume:true,reason:null}:{reason:'The paid tool maker must finish their current order before resuming'};}
 const spec=FARM_TOOLS.copperTools,t=g.tribe(0);if(t.copper<spec.copper||t.wood<spec.wood)return {reason:`Need ${spec.copper} copper and ${spec.wood} logs for one tool set`};
 for(const u of g.state.units)if(available(g,u)&&(!u.farmTool||FARM_TOOLS[u.farmTool].cultivation<spec.cultivation)){const site=sites.find(b=>g.interactionSpot(u,b));if(site)return {u,site,resume:false,reason:null};}
 return {reason:'Need an available adult who can use better tools and reach a workbench'};
}
function transportProposal(g:Game,kind:'sled'|'cart'):PracticalProposal{
 const issue=haulageRequirement(g,kind);if(issue)return {reason:issue};
 const sites=g.state.buildings.filter(b=>b.team===0&&g.finished(b)&&(b.type==='workshop'||kind==='sled'&&b.type==='townhall'));
 if(!sites.length)return {reason:kind==='sled'?'Finish a hearth or crafting shelter':'Finish a crafting shelter for wheel trials'};
 const pending=g.state.haulageProjects?.find(p=>p.team===0&&p.work.kind===kind&&p.work.paused&&!p.work.vessel);
 for(const u of g.state.units)if(available(g,u)&&(pending?!u.haulage:kind==='cart'?u.haulage==='sled':!u.haulage)){const site=sites.find(b=>g.interactionSpot(u,b));if(site){if(!pending&&(g.tribe(0).wood<HAULAGE[kind].wood||g.tribe(0).stone<HAULAGE[kind].stone))return {reason:`Need ${HAULAGE[kind].wood} logs and ${HAULAGE[kind].stone} stone`};return {u,site,reason:null};}}
 return {reason:kind==='cart'&&!pending?'Need an available adult sled carrier with empty hands':'Need an available adult with empty hands and a reachable workplace'};
}
function preservationProposal(g:Game):PracticalProposal{
 const sites=buildings(g,'warehouse');if(!sites.length)return {reason:'Finish a storehouse before preserving food'};
 const t=g.tribe(0);if(sites.every(b=>(b.storeCare||0)>=.95))return {reason:'The existing stores are already fully tended'};
 if(t.wood<preservationTimberReserve(g,0)+1)return {reason:`Keep ${preservationTimberReserve(g,0)+1} logs available; preservation spends spare timber`};
 if(reserveSeconds(g)<240)return {reason:'Secure four minutes of food before preserving the surplus'};
 const candidate=actorAt(g,sites.filter(b=>preservationAvailable(g,b)));return candidate?{...candidate,reason:null}:{reason:'Need an available adult with empty hands and a route to the store'};
}
export function knowledgeReport(g:Game):{topics:KnowledgeTopic[];foodReserveSeconds:number;limitations:string[]}{
 const t=g.tribe(0);if(!t)return {topics:[],foodReserveSeconds:0,limitations:['Start a village before reviewing practical knowledge.']};const people=g.state.units.filter(u=>u.team===0&&u.hp>0),reserve=reserveSeconds(g),topics:KnowledgeTopic[]=[];
 const cropFields=buildings(g,'farm'),year=calendar(g).year;
 for(const kind of CROPS){
  const samples=t.cropSamples?.[kind]||0,inTransit=people.reduce((sum,u)=>sum+(u.seedSamples?.[kind]||0),0);
  const knownPatches=g.state.forage.filter(n=>n.amount>0&&n.cropCandidate===kind&&g.exploredAt(n.x,n.z)).length;
  const trial=t.cropTrial?.kind===kind?t.cropTrial:undefined,established=!!t.cultivated?.includes(kind),plots=cropFields.filter(b=>(b.cropType||'grain')===kind),planted=plots.filter(b=>b.crop?.year===year&&b.crop.planted>0).length;
  const person=people.find(u=>u.studyCrop===kind),proposal=cropProposal(g,kind);
  topics.push({id:`crop:${kind}`,title:`Cultivate ${kind}`,need:reserve<KNOWLEDGE_RULES.lowFoodReserveSeconds?'Repeatable harvests could reduce dependence on wild food.':'Surplus food makes it possible to spare one resident for seed trials.',stage:planted?'adoption':established?'proven':trial?'experiment':knownPatches||samples||inTransit?'observation':'need',observation:`${knownPatches} known wild patches · ${samples.toFixed(1)} samples home · ${inTransit.toFixed(1)} carried, not delivered`,experiment:trial?`${person?`Resident ${person.name||person.id}`:'No current experimenter'} · ${trial.progress.toFixed(1)}/${trial.duration} work seconds`:'Four delivered samples fund one physical trial at a hearth.',result:established?'A completed trial established this cultivation practice.':'No completed trial recorded; seeing a plant does not establish cultivation.',adoption:`${plots.length} configured fields · ${planted} actually sown this year`,...(trial?{progress:{completed:trial.progress,required:trial.duration,unit:'work seconds'}}:{}),metrics:{samplesHome:samples,samplesCarried:inTransit,knownPatches,trialWorkSeconds:trial?.progress||0,trialRequiredSeconds:trial?.duration||0,practiceEstablished:established?1:0,configuredFields:plots.length,sownFields:planted},actions:[action('samples','Find crop samples',people.some(u=>available(g,u))?null:'Need an available adult to gather or search'),...(!established?[action(`trial:${kind}`,trial?'Resume seed trial':'Test seeds',proposal.reason)]:[action('place:farm','Choose a field site',null)]),...(!buildings(g,'townhall').length?[action('place:townhall','Choose a hearth site',null)]:[])],limitation:'Established cultivation is saved practice. Field configuration alone is not a delivered harvest.'});
 }
 const copper=people.find(u=>u.copperStudy),copperWork=copper?.copperStudy,toolUsers=people.filter(u=>u.farmTool==='copperTools'),toolsWorking=toolUsers.filter(u=>u.order==='gather'&&u.node&&'kind' in u.node&&u.node.kind==='building'&&u.node.type==='farm').length;
 const copperReady=copperProposal(g),toolsReady=copperToolsProposal(g);
 topics.push({id:'copper',title:'Workable copper tools',need:cropFields.length?`${cropFields.length} fields could use improved tools; each set equips one resident and costs materials.`:'There are no fields using metal tools yet. A small camp can still specialize in a workable prototype.',stage:toolsWorking?'adoption':t.copperExperiment?'proven':copperWork?'experiment':t.copper>0||g.state.copper.some(n=>g.exploredAt(n.x,n.z))?'observation':'need',observation:`${t.copper.toFixed(1)} copper home · ${people.filter(u=>u.carryType==='copper'&&u.carry>0).length} carriers with copper · ${g.state.copper.filter(n=>n.amount>0&&g.exploredAt(n.x,n.z)).length} known deposits`,experiment:copperWork?`${copperWork.paused?'Paused':'Assigned'} to ${copper?.name||copper?.id} · ${copperWork.progress.toFixed(1)}/${COPPER_STUDY_RULES.workSeconds} work seconds`:`${COPPER_STUDY_RULES.copperUnits} copper + ${COPPER_STUDY_RULES.woodLogs} logs; one adult must reach a workshop and do ${COPPER_STUDY_RULES.workSeconds} bench-work seconds.`,result:t.copperExperiment?'One successful prototype established repeatable copper toolmaking.':'No workable prototype established; stored copper alone is not a technique.',adoption:`${toolUsers.length} residents equipped · ${toolsWorking} currently using copper tools on fields`,...(copperWork?{progress:{completed:copperWork.progress,required:COPPER_STUDY_RULES.workSeconds,unit:'work seconds'}}:{}),metrics:{copperHome:t.copper,prototypeWorkSeconds:copperWork?.progress||0,prototypeEstablished:t.copperExperiment?1:0,equippedResidents:toolUsers.length,currentFieldUsers:toolsWorking},actions:[...(!t.copperExperiment?[action('copper_trial',copperWork?.paused?'Resume copper trial':'Test copper prototype',copperReady.reason)]:[action('copper_tools',toolsReady.resume?'Resume paid tools':'Make another tool set',toolsReady.reason)]),...(!buildings(g,'workshop').length?[action('place:workshop','Choose a workshop site',null)]:[])],limitation:'The saved prototype result survives its maker. Equipment and field use counts describe living residents now; a teaching network is not implemented.'});
 const practice=t.haulagePractice||0,sleds=people.filter(u=>u.haulage==='sled').length,carts=people.filter(u=>u.haulage==='cart').length,paid=g.state.haulageProjects?.find(p=>p.team===0&&p.work.kind==='cart'),sledReady=transportProposal(g,'sled'),cartReady=transportProposal(g,'cart');
 topics.push({id:'transport',title:'Learn from hauling',need:`${people.filter(u=>u.carry>0).length} residents carry goods now; practical hauling experience can support wheel trials.`,stage:carts?'adoption':paid?'experiment':sleds||practice?'observation':'need',observation:`${sleds} working sleds owned · ${practice}/${WHEEL_PRACTICE} goods physically delivered by sled`,experiment:paid?`${paid.work.paused?'Paid project paused':'Handcart project active'} · ${paid.work.progress.toFixed(1)}/${paid.work.duration} work seconds`:'Deliver goods by sled, then spend materials and workshop labor on a handcart.',result:practice>=WHEEL_PRACTICE?'Enough recorded sled deliveries to attempt wheel-and-axle work.':'The delivery threshold is practical experience, not research points.',adoption:`${carts} handcarts owned by living residents`,progress:paid?{completed:paid.work.progress,required:paid.work.duration,unit:'work seconds'}:{completed:practice,required:WHEEL_PRACTICE,unit:'delivered goods'},metrics:{sledsOwned:sleds,sledGoodsDelivered:practice,requiredSledDeliveries:WHEEL_PRACTICE,cartWorkSeconds:paid?.work.progress||0,cartsOwned:carts},actions:[action('sled','Make or resume a sled',sledReady.reason),action('cart',paid?.work.paused?'Resume paid handcart':'Try a handcart',cartReady.reason)],limitation:'Delivery practice is capped at the wheel-trial threshold. Current equipment counts are not lifetime production totals.'});
 const stores=buildings(g,'warehouse'),preservers=people.filter(u=>u.order==='gather'&&u.node&&'kind' in u.node&&u.node.kind==='building'&&u.node.type==='warehouse').length,care=stores.length?stores.reduce((n,b)=>n+(b.storeCare||0),0)/stores.length:0,accounting=supplyAccounting(g),preserveReady=preservationProposal(g);
 topics.push({id:'storage',title:'Keep surplus edible',need:`Current spoilage forecast ${(foodSpoilage(g)*60).toFixed(2)} food/minute; protection competes for building timber and tending labor.`,stage:care>0&&stores.length?'adoption':stores.length?'proven':accounting.foodSpoiled>0?'observation':'need',observation:`${accounting.foodSpoiled.toFixed(1)} recorded food spoiled · ${stores.length} completed stores`,experiment:`${preservers} residents assigned to preservation · mean store care ${Math.round(care*100)}%`,result:stores.length?'Physical stores protect food; tending consumes real spare logs.':'No completed store protects the surplus yet.',adoption:`${stores.filter(b=>(b.storeCare||0)>.6).length} well-tended stores of ${stores.length}`,metrics:{recordedFoodSpoiled:accounting.foodSpoiled,currentSpoilagePerMinute:foodSpoilage(g)*60,completedStores:stores.length,preservationWorkers:preservers,meanStoreCare:care},actions:[action('place:warehouse','Choose a store site',null),action('preserve','Tend and preserve',preserveReady.reason)],limitation:'This is demonstrated storage practice, not a separate research unlock. Spoilage totals include only recorded history, not guessed legacy losses.'});
 topics.push(...fibreKnowledgeTopics(g),...productionKnowledgeTopics(g));
 if(g.state.ended)for(const topic of topics)for(const a of topic.actions)a.blockedReason='The chapter has ended';
 return {topics,foodReserveSeconds:reserve,limitations:['No generic science queue or research-point spending.','Working makers can teach exact demonstrated production methods; wider exchange and institutions remain future work.']};
}
export function runKnowledgeAction(g:Game,id:string):KnowledgeActionResult{
 if(g.state.ended)return {accepted:false,reason:'The chapter has ended'};
 if(id.startsWith('fibre:'))return runFibreKnowledgeAction(g,id);
 if(id.startsWith('practice:'))return runProductionKnowledgeAction(g,id);
 if(id.startsWith('place:')){const type=id.slice(6);if(['farm','warehouse','townhall','workshop'].includes(type))return {accepted:true,reason:'Choose a physical site; building still requires its materials and labor',placement:type as BldType};}
 if(id==='samples'){const sent=seekCropSamples(g);return {accepted:sent>0,reason:sent?`${sent} residents gathering or searching; samples count only after delivery`:'Need an available adult and a known plant or provisions for exploration'};}
 if(id.startsWith('trial:')){const kind=id.slice(6) as CropKind;if(!CROPS.includes(kind))return {accepted:false,reason:'Unknown crop trial'};const p=cropProposal(g,kind);if(p.reason||!p.u)return {accepted:false,reason:p.reason||'No experimenter available'};const accepted=beginCropTrial(g,kind,0,false,p.u.id);return {accepted,reason:accepted?'One resident assigned to a physical seed trial; resume play for travel and work':'The seed trial is no longer feasible'};}
 if(id==='copper_trial'){const p=copperProposal(g);if(p.reason||!p.site)return {accepted:false,reason:p.reason||'No crafting shelter available'};const accepted=beginCopperStudy(g,p.site.id);return {accepted,reason:accepted?'Copper prototype assigned; materials are committed once and work must occur at the bench':copperStudyIssue(g,p.site.id)||'The copper trial is no longer feasible'};}
 if(id==='copper_tools'){const p=copperToolsProposal(g);if(p.reason||!p.u||!p.site)return {accepted:false,reason:p.reason||'No maker available'};const accepted=p.resume?resumeFarmToolWork(g,p.u,p.site.id):beginFarmToolWork(g,'copperTools',0,p.site.id,p.u.id);return {accepted,reason:accepted?'One physical tool set assigned; other residents remain unequipped':'The tool project is no longer feasible'};}
 if(id==='sled'||id==='cart'){const p=transportProposal(g,id);if(p.reason||!p.u||!p.site)return {accepted:false,reason:p.reason||'No carrier or workplace available'};const accepted=beginHaulageWork(g,id,0,p.site.id,p.u.id);return {accepted,reason:accepted?'Transport work assigned; equipment appears only after physical completion':'The transport project is no longer feasible'};}
 if(id==='preserve'){const p=preservationProposal(g);if(p.reason||!p.u||!p.site)return {accepted:false,reason:p.reason||'No preservation worker available'};g.clearSelect();p.u.selected=true;g.issueGather(p.site);return {accepted:p.u.node===p.site,reason:p.u.node===p.site?'A resident is walking to tend the store; preservation consumes real spare logs':'The preservation assignment is no longer feasible'};}
 return {accepted:false,reason:'Unknown practical-knowledge action'};
}
