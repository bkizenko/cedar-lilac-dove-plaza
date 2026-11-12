import {recordTradedTeachingDelivery,tradedMethodSourcesForPerson,retainTradedMethodSources,type TradedMethodSource} from './tradedTeaching';
import type {Game} from './sim';
import {capturedMethodSourcesForPerson,type CapturedMethodSource} from './capturedKnowledge';
import{handedOver}from'./communityHandoverValidation';
import type {GameState,Unit} from './types';
import {PRODUCTION_RECIPES,productionFoodOutput,type ProductionRecipe,type ProductionProject,type ItemStock} from './production';
import {hasTaskCommitment} from './workCommitments';
import {isDependent} from './settlement';
import {workRuntime} from './workRuntime';

export const PRODUCTION_PRACTICE_RULES={mentorSuccessfulBatches:3,ownRatePerBatch:.025,taughtRatePerBatch:.0125,maximumRateBonus:.2,minimumContributionFraction:.25,observationFraction:.5,maximumObservationSeconds:30,maximumContributors:32} as const;
export type ProductionSkill={successfulBatches:number;taughtBatches:number;observedSeconds:number;lastTaughtAt?:number;lastTeacherId?:number;methodSources?:CapturedMethodSource[];tradedSources?:TradedMethodSource[]};
export type ProductionDemonstration={batches:number;failedBatches:number;usefulOutputs:number;firstAt:number;lastAt:number;lastSuccessfulAt?:number;lastFailedAt?:number;makers:number[]};
export type ProductionApprentice={version:1;projectId:number;teacherId:number;workplace:number;recipe:ProductionRecipe;phase:'traveling'|'watching'|'waiting'|'paused';observedSeconds:number;lastProgress:number;started:number};
const validRecipe=(r:string):r is ProductionRecipe=>Object.hasOwn(PRODUCTION_RECIPES,r);
const active=(p:ProductionProject)=>!['complete','lost'].includes(p.phase);
const freeWorker=(g:Game,u:Unit)=>u.hp>0&&u.type==='worker'&&!u.militia&&!u.prisoner&&u.enslavedFrom===undefined&&!isDependent(g,u);
const methodSourceKey=(source:CapturedMethodSource)=>`${source.originMakerId}:${source.sourceTeam}:${source.capturedAt}:${source.integratedAt}`;
/** A source follows an actually delivered lesson, never custody or ownership alone. */
function retainMethodSources(skill:ProductionSkill,sources:CapturedMethodSource[],at:number){
 if(!sources.length)return;const bySource=new Map((skill.methodSources||[]).map(source=>[methodSourceKey(source),{...source}]));
 for(const source of sources)bySource.set(methodSourceKey(source),{...source,learnedAt:at});
 skill.methodSources=[...bySource.values()].sort((a,b)=>b.learnedAt-a.learnedAt||a.originMakerId-b.originMakerId||a.sourceTeam-b.sourceTeam||a.capturedAt-b.capturedAt||a.integratedAt-b.integratedAt).slice(0,8);
}
export function productionPracticeRate(u:Unit,recipe:string){
 if(!validRecipe(recipe))return 1;const skill=u.productionSkills?.[recipe];
 return 1+Math.min(PRODUCTION_PRACTICE_RULES.maximumRateBonus,(skill?.successfulBatches||0)*PRODUCTION_PRACTICE_RULES.ownRatePerBatch+(skill?.taughtBatches||0)*PRODUCTION_PRACTICE_RULES.taughtRatePerBatch);
}
type TrackedProject=ProductionProject&{practiceRecorded?:true;practiceWorkers?:{id:number;work:number}[]};
/** Only actual staffed progress establishes who made the batch. A pickup adult
 * is not silently credited as the maker of food left drying by someone else. */
export function recordProductionPracticeWork(p:TrackedProject,u:Unit,delta:number){
 if(!(delta>0)||!Number.isFinite(delta))return;p.practiceWorkers??=[];const row=p.practiceWorkers.find(w=>w.id===u.id);
 if(row)row.work+=delta;else if(p.practiceWorkers.length<PRODUCTION_PRACTICE_RULES.maximumContributors)p.practiceWorkers.push({id:u.id,work:delta});
}
type LessonContext={state:GameState;claims:Map<number,string>};const contexts=new WeakMap<Game,LessonContext>();
function context(g:Game){let c=contexts.get(g);if(!c||c.state!==g.state){c={state:g.state,claims:new Map()};contexts.set(g,c);}return c;}
function release(g:Game,u:Unit,completed=false){const c=context(g),id=c.claims.get(u.id);if(id){workRuntime(g).finish(id,!completed);workRuntime(g).forget(id);c.claims.delete(u.id);}}
function claim(g:Game,u:Unit,w:ProductionApprentice){const c=context(g);if(c.claims.has(u.id))return true;const id=`apprentice:${u.id}:${w.projectId}`,jobs=workRuntime(g);jobs.propose({id,kind:'practical-observation',owner:u.team,actors:[u.id],target:w.workplace});if(!jobs.reserve(id,[{key:`production:${w.projectId}:observer`,amount:1,capacity:1}])){jobs.finish(id,true);jobs.forget(id);return false;}c.claims.set(u.id,id);return true;}
function finishLesson(g:Game,u:Unit,reason:string,completed=false){release(g,u,completed);u.productionApprentice=undefined;if(u.order==='hold')u.workReason=reason;}
export function recordProductionPractice(g:Game,project:ProductionProject,_carrier:Unit,outputs:ItemStock){
 const p=project as TrackedProject;if(p.practiceRecorded||p.phase==='complete'||!validRecipe(p.recipe))return;
 p.practiceRecorded=true;const r=PRODUCTION_RECIPES[p.recipe],useful=productionFoodOutput(project)+Object.entries(outputs).reduce((sum,[kind,n])=>sum+(kind==='potsherds'?0:n||0),0),t=g.tribe(p.team);
 t.productionPractice??={};let history=t.productionPractice[p.recipe];if(!history)history=t.productionPractice[p.recipe]={batches:0,failedBatches:0,usefulOutputs:0,firstAt:g.state.time,lastAt:g.state.time,makers:[]};
 history.lastAt=g.state.time;if(useful>0){history.batches++;history.usefulOutputs+=useful;history.lastSuccessfulAt=g.state.time;}else{history.failedBatches++;history.lastFailedAt=g.state.time;}
 const makers=(p.practiceWorkers||[]).filter(w=>w.work+1e-8>=r.workSeconds*PRODUCTION_PRACTICE_RULES.minimumContributionFraction);
 for(const maker of makers){if(!history.makers.includes(maker.id)&&history.makers.length<16)history.makers.push(maker.id);const u=g.state.units.find(u=>u.id===maker.id&&u.team===p.team&&freeWorker(g,u));if(!u||!useful)continue;u.productionSkills??={};const skill=u.productionSkills[p.recipe]??={successfulBatches:0,taughtBatches:0,observedSeconds:0};skill.successfulBatches++;}
 recordTradedTeachingDelivery(g,p,useful,makers.map(m=>m.id));
 for(const u of g.state.units){const w=u.productionApprentice;if(!w||w.projectId!==p.id)continue;const teacher=g.state.units.find(person=>person.id===w.teacherId&&person.team===p.team&&freeWorker(g,person)),qualified=useful>0&&freeWorker(g,u)&&u.team===p.team&&!!teacher&&w.phase!=='paused'&&makers.some(m=>m.id===w.teacherId)&&w.observedSeconds+1e-8>=observationRequired(p.recipe);
  if(qualified){u.productionSkills??={};const skill=u.productionSkills[p.recipe]??={successfulBatches:0,taughtBatches:0,observedSeconds:0};skill.taughtBatches++;skill.observedSeconds+=w.observedSeconds;skill.lastTaughtAt=g.state.time;skill.lastTeacherId=w.teacherId;retainMethodSources(skill,capturedMethodSourcesForPerson(g.state,teacher!,p.recipe).filter(source=>source.learnedAt<=w.started),g.state.time);retainTradedMethodSources(skill,tradedMethodSourcesForPerson(g.state,teacher!,p.recipe).filter(source=>source.learnedAt<=w.started),g.state.time,w.teacherId,p.id);}
  finishLesson(g,u,qualified?`Learned ${r.name.toLowerCase()} from actual observed work and delivered output`:'The batch did not complete a demonstrated lesson',qualified);
 }
}
export const observationRequired=(recipe:ProductionRecipe)=>Math.min(PRODUCTION_PRACTICE_RULES.maximumObservationSeconds,PRODUCTION_RECIPES[recipe].workSeconds*PRODUCTION_PRACTICE_RULES.observationFraction);
function learnerAvailable(g:Game,u:Unit){return u.team===0&&freeWorker(g,u)&&!u.emergency&&!u.recalled&&!u.resting&&!u.shelterId&&!u.buildOrder&&!u.boat&&!u.scout&&!u.envoy&&!u.visit&&!u.expedition&&!u.foundingJourney&&!u.tributeJourney&&u.carry===0&&!Object.values(u.itemCargo||{}).some(n=>(n||0)>0)&&!hasTaskCommitment(u)&&['idle','hold','gather'].includes(u.order);}
export function productionLessonIssue(g:Game,projectId:number){
 const p=g.state.production?.projects.find(p=>p.id===projectId&&p.team===0);if(!p||p.phase!=='working'||p.actorId===null)return 'Choose a batch with an adult currently doing hands-on work';
 const teacher=g.state.units.find(u=>u.id===p.actorId&&u.team===p.team&&freeWorker(g,u)),site=g.state.buildings.find(b=>b.id===p.workplace&&g.finished(b)&&b.team===0);
 if(!teacher||!site)return 'The working teacher and original workplace must remain available';
 if((teacher.productionSkills?.[p.recipe]?.successfulBatches||0)<PRODUCTION_PRACTICE_RULES.mentorSuccessfulBatches)return `This maker needs ${PRODUCTION_PRACTICE_RULES.mentorSuccessfulBatches} actually successful batches of this exact method before mentoring`;
 if(g.state.units.some(u=>u.hp>0&&u.productionApprentice?.projectId===p.id&&!['waiting','paused'].includes(u.productionApprentice.phase)))return 'One learner is already watching this batch';
 const people=g.state.units.filter(u=>u!==teacher&&!u.productionApprentice&&learnerAvailable(g,u)).sort((a,b)=>Number(b.selected)-Number(a.selected)||Math.hypot(a.x-site.x,a.z-site.z)-Math.hypot(b.x-site.x,b.z-site.z));
 if(!people.some(u=>g.interactionSpot(u,site)))return 'Need another available adult with empty cargo and a route to the working site';return null;
}
export function beginProductionLesson(g:Game,projectId:number){const issue=productionLessonIssue(g,projectId);if(issue)return{accepted:false,reason:issue};const p=g.state.production!.projects.find(p=>p.id===projectId)!,site=g.state.buildings.find(b=>b.id===p.workplace)!;
 const teacher=g.state.units.find(u=>u.id===p.actorId)!,u=g.state.units.filter(u=>u!==teacher&&!u.productionApprentice&&learnerAvailable(g,u)&&g.interactionSpot(u,site)).sort((a,b)=>Number(b.selected)-Number(a.selected)||Math.hypot(a.x-site.x,a.z-site.z)-Math.hypot(b.x-site.x,b.z-site.z))[0];
 g.interruptMission(u);const w:ProductionApprentice={version:1,projectId:p.id,teacherId:teacher.id,workplace:p.workplace,recipe:p.recipe,phase:'traveling',observedSeconds:0,lastProgress:p.progress,started:g.state.time};
 if(!claim(g,u,w))return{accepted:false,reason:'The learner already owns another reserved activity'};u.productionApprentice=w;u.order='hold';u.node=null;u.target=null;g.invalidateRoute(u);return{accepted:true,reason:`${u.name||'One resident'} is walking to learn alongside ${teacher.name||'the maker'}; useful output must actually be delivered`};
}
export function pauseProductionLesson(g:Game,u:Unit){const w=u.productionApprentice;if(!w||w.phase==='waiting')return false;release(g,u);w.phase='paused';return true;}
export function resumeProductionLesson(g:Game,unitId:number){const u=g.state.units.find(u=>u.id===unitId&&u.team===0),w=u?.productionApprentice;if(!u||!w||w.phase!=='paused')return{accepted:false,reason:'No paused lesson belongs to this resident'};const p=g.state.production?.projects.find(p=>p.id===w.projectId&&active(p));if(!p||p.team!==u.team||!g.state.units.some(teacher=>teacher.id===w.teacherId&&teacher.team===u.team&&freeWorker(g,teacher))||!g.state.buildings.some(site=>site.id===w.workplace&&site.team===u.team&&g.finished(site))||!learnerAvailable(g,u))return{accepted:false,reason:'Finish current work; the original paid batch must still be active'};if(!claim(g,u,w))return{accepted:false,reason:'The learner already owns active work'};w.phase='traveling';w.lastProgress=p.progress;u.order='hold';u.node=null;u.target=null;g.invalidateRoute(u);return{accepted:true,reason:'The same lesson resumed without granting knowledge or buying another batch'};}
export function productionApprenticeAI(g:Game,u:Unit,dt:number){const w=u.productionApprentice;if(!w||w.phase==='paused'||w.phase==='waiting')return false;const p=g.state.production?.projects.find(p=>p.id===w.projectId),teacher=g.state.units.find(actor=>actor.id===w.teacherId&&actor.team===u.team&&freeWorker(g,actor)),site=g.state.buildings.find(b=>b.id===w.workplace&&g.finished(b)&&b.team===u.team);
 if(!p||!active(p)){finishLesson(g,u,'The original batch is no longer available');return false;}if(p.team!==u.team||!freeWorker(g,u)||!teacher||!site){pauseProductionLesson(g,u);u.workReason='Lesson paused; teacher, paid batch and workplace must share ownership';return false;}
 if(!claim(g,u,w)){u.workReason='Lesson waiting for shared actor ownership';return true;}
 u.order='hold';const spot=g.interactionSpot(u,site);if(!spot){u.workReason='No reachable position to observe the working site';return true;}u.tx=spot.x;u.tz=spot.z;
 if(!g.buildingWorkReached(u,site)){w.phase='traveling';w.lastProgress=p.progress;u.workReason='Walking to observe the actual working maker';g.steer(u,dt);return true;}
 w.phase='watching';if(p.phase==='working'&&p.actorId===teacher.id&&g.buildingWorkReached(teacher,site)){w.observedSeconds+=Math.min(Math.max(0,dt),Math.max(0,p.progress-w.lastProgress));u.workReason=`Watching ${PRODUCTION_RECIPES[w.recipe].name.toLowerCase()} · ${w.observedSeconds.toFixed(1)}/${observationRequired(w.recipe)} seconds`;}
 w.lastProgress=p.progress;
 if(w.observedSeconds+1e-8>=observationRequired(w.recipe)||p.progress>=PRODUCTION_RECIPES[w.recipe].workSeconds||p.phase==='returning'||p.phase==='curing'||p.phase==='ready'){
  release(g,u);if(w.observedSeconds+1e-8>=observationRequired(w.recipe)){w.phase='waiting';u.workReason='Observed method; free for other work while the real batch is delivered';}else finishLesson(g,u,'Too little hands-on work was observed; choose a fresh batch with a practiced maker');
 }
 return true;
}
export function tickProductionLessons(g:Game){const c=context(g);if(!c.claims.size&&!g.state.production?.projects.length)return;for(const[actor,id]of c.claims){const u=g.state.units.find(u=>u.id===actor);if(!u||!u.productionApprentice||['waiting','paused'].includes(u.productionApprentice.phase)){workRuntime(g).finish(id,true);workRuntime(g).forget(id);c.claims.delete(actor);}}if(!g.state.production?.projects.length)return;for(const u of g.state.units){const w=u.productionApprentice;if(!w)continue;const p=g.state.production.projects.find(p=>p.id===w.projectId&&active(p));if(u.hp<=0||!p)finishLesson(g,u,'The original lesson ended without a new demonstrated result');else if(['paused','stored','unloading'].includes(p.phase)&&!['waiting','paused'].includes(w.phase)){pauseProductionLesson(g,u);if(u.order==='hold')u.workReason='Lesson paused while the original paid batch is paused or relocated';}}}
/** Strict optional evidence: legacy saves retain unknown history rather than
 * inventing makers or teaching from stock totals. Reading reports records nothing. */
export function validProductionPractice(s:GameState){const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v),num=(v:unknown,max=1e9)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max,int=(v:unknown)=>num(v)&&Number.isSafeInteger(v),id=(v:unknown)=>int(v)&&Number(v)>0&&Number(v)<s.nextId;
 for(const t of s.tribes){if(t.productionPractice===undefined)continue;if(!obj(t.productionPractice)||Object.keys(t.productionPractice).some(k=>!validRecipe(k)))return false;for(const h of Object.values(t.productionPractice)){if(!h||![h.batches,h.failedBatches].every(int)||!num(h.usefulOutputs)||!num(h.firstAt,s.time)||!num(h.lastAt,s.time)||h.lastAt<h.firstAt||h.lastSuccessfulAt!==undefined&&(!h.batches||!num(h.lastSuccessfulAt,h.lastAt)||h.lastSuccessfulAt<h.firstAt)||h.lastFailedAt!==undefined&&(!h.failedBatches||!num(h.lastFailedAt,h.lastAt)||h.lastFailedAt<h.firstAt)||!Array.isArray(h.makers)||h.makers.length>16||new Set(h.makers).size!==h.makers.length||!h.makers.every(id))return false;}}
 const observing=new Set<number>();for(const u of s.units){if(u.productionSkills!==undefined){if(!obj(u.productionSkills)||Object.keys(u.productionSkills).some(k=>!validRecipe(k)))return false;for(const skill of Object.values(u.productionSkills))if(!skill||!int(skill.successfulBatches)||!int(skill.taughtBatches)||!num(skill.observedSeconds)||skill.lastTaughtAt!==undefined&&(!skill.taughtBatches||!num(skill.lastTaughtAt,s.time))||skill.lastTeacherId!==undefined&&(!skill.taughtBatches||!id(skill.lastTeacherId)||skill.lastTeacherId===u.id))return false;}
  const w=u.productionApprentice;if(w){if(!['paused','waiting'].includes(w.phase)){if(observing.has(w.projectId))return false;observing.add(w.projectId);}if(w.version!==1||(u.team!==0&&!handedOver(s,u,'residentIds'))||!id(w.projectId)||!id(w.teacherId)||w.teacherId===u.id||!id(w.workplace)||!validRecipe(w.recipe)||!['traveling','watching','waiting','paused'].includes(w.phase)||!num(w.observedSeconds,PRODUCTION_RECIPES[w.recipe].workSeconds)||!num(w.lastProgress,PRODUCTION_RECIPES[w.recipe].workSeconds)||!num(w.started,s.time)||!s.production?.projects.some(p=>p.id===w.projectId&&p.recipe===w.recipe&&p.workplace===w.workplace)||!['paused','waiting'].includes(w.phase)&&(u.productionProjectId!==undefined||!s.production?.projects.some(p=>p.id===w.projectId&&p.team===u.team)||!s.units.some(teacher=>teacher.id===w.teacherId&&teacher.team===u.team&&teacher.hp>0)||!s.buildings.some(site=>site.id===w.workplace&&site.team===u.team)))return false;}
 }
 return true;
}
