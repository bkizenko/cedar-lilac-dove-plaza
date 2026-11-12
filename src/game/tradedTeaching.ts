import type {Game} from './sim';
import type {GameState,Unit,ResKind,FoodKind} from './types';
import {PRODUCTION_RECIPES,type ProductionRecipe,type ProductionProject} from './production';
import {observationRequired,PRODUCTION_PRACTICE_RULES} from './productionPractice';
import {hasTaskCommitment} from './workCommitments';
import {isDependent} from './settlement';
import {supplyDrops,supplyApproach,supplyReached} from './campAnchor';
import {receiveFood,FOOD_KINDS} from './pantry';
import {workRuntime} from './workRuntime';
import type {JobCoordinator} from './jobCoordinator';

export const TRADED_TEACHING_RULES={version:1,contactMeters:26,validSeconds:1800,maximumOffers:128,maximumPayment:100} as const;
export type TeachingHolder={kind:'resident'|'caravan';id:number;team:number};
export type TeachingTerm={good:ResKind;qty:number;from:TeachingHolder;to:{kind:'faction';team:number};foodKind?:FoodKind};
export type TeachingOffer={version:1;id:string;methodId:ProductionRecipe;teacher:{id:number;team:number;siteId:number};learner:{id:number;team:number};consideration:TeachingTerm[];validUntil:number;agreedAt:number;qualifiedBatches:number;delivery?:{projectId:number;teacherWork:number;usefulOutputs:number;at:number};phase:'traveling'|'armed'|'observing'|'returning'|'reported'|'cancelled'|'lost';paidAt?:number;projectId?:number;observedSeconds:number;lastProgress:number;usefulAt?:number;reportedAt?:number;reason?:string};
export type TradedTeachingOrder={offerId:string};
const free=(g:Game,u:Unit)=>u.hp>0&&u.type==='worker'&&!u.militia&&!u.prisoner&&u.enslavedFrom===undefined&&!isDependent(g,u);
const terminal=(o:TeachingOffer)=>['reported','cancelled','lost'].includes(o.phase);
const job=(o:TeachingOffer)=>`traded-teaching:${o.id}`;
const recipe=(v:string):v is ProductionRecipe=>Object.hasOwn(PRODUCTION_RECIPES,v);
const qualified=(g:Game,u:Unit,method:ProductionRecipe)=>free(g,u)&&(u.productionSkills?.[method]?.successfulBatches||0)>=PRODUCTION_PRACTICE_RULES.mentorSuccessfulBatches;
const getOffer=(g:Game,u:Unit)=>g.state.teachingOffers?.find(o=>o.id===u.tradedTeaching?.offerId&&!terminal(o));
const siteFor=(g:Game,o:TeachingOffer)=>g.state.buildings.find(b=>b.id===o.teacher.siteId&&b.team===o.teacher.team&&g.finished(b));
function reserve(jobs:JobCoordinator,o:TeachingOffer){const id=job(o);const existing=jobs.activeJob(o.learner.id),claims=jobs.reservations.reservations(id);if(existing?.id===id&&(o.projectId===undefined||o.phase!=='observing'?claims.length===0:claims.some(c=>c.key===`production:${o.projectId}:observer`&&c.amount===1)))return true;jobs.propose({id,kind:'traded-observation',owner:o.learner.team,actors:[o.learner.id],target:o.teacher.siteId});if(!jobs.reserve(id,o.projectId===undefined||o.phase!=='observing'?[]:[{key:`production:${o.projectId}:observer`,amount:1,capacity:1}])){jobs.finish(id,true);jobs.forget(id);return false;}return true;}
function release(g:Game,o:TeachingOffer){workRuntime(g).finish(job(o),true);workRuntime(g).forget(job(o));}
export function rebuildTradedTeachingOwnership(g:Game,jobs:JobCoordinator){for(const o of g.state.teachingOffers||[])if(!terminal(o)&&g.state.units.some(u=>u.id===o.learner.id&&u.team===o.learner.team&&u.hp>0&&u.tradedTeaching?.offerId===o.id))reserve(jobs,o);}
function finish(g:Game,o:TeachingOffer,phase:'cancelled'|'lost',reason:string){release(g,o);o.phase=phase;o.reason=reason;const u=g.state.units.find(u=>u.id===o.learner.id);if(u?.tradedTeaching?.offerId===o.id){delete u.tradedTeaching;if(u.order==='hold'||u.order==='return'){u.order='idle';u.workReason=reason;u.jobLock=false;}}}
/** Discovery is one voluntarily demonstrated, currently paid method, at real local contact. */
export function teachingOffers(g:Game,teacherId:number){
 const teacher=g.state.units.find(u=>u.id===teacherId&&u.team!==0&&free(g,u));if(!teacher||g.isFoe(0,teacher.team)||!g.state.units.some(u=>u.team===0&&free(g,u)&&Math.hypot(u.x-teacher.x,u.z-teacher.z)<=TRADED_TEACHING_RULES.contactMeters))return [];
 const p=g.state.production?.projects.find(p=>p.actorId===teacher.id&&p.team===teacher.team&&p.phase==='working');if(!p||!qualified(g,teacher,p.recipe))return [];
 const site=g.state.buildings.find(b=>b.id===p.workplace&&b.team===teacher.team&&g.finished(b));if(!site||!g.buildingWorkReached(teacher,site))return [];
 return [{methodId:p.recipe,name:PRODUCTION_RECIPES[p.recipe].name,teacherId,siteId:site.id,issue:null as string|null}];
}
export function beginTradedTeaching(g:Game,r:{learnerId:number;teacherId:number;siteId:number;methodId:ProductionRecipe;good:ResKind;qty:number}){
 const no=(reason:string)=>({accepted:false,reason});const u=g.state.units.find(u=>u.id===r.learnerId&&u.team===0),teacher=g.state.units.find(u=>u.id===r.teacherId);
 if(!u||!teacher||!free(g,u)||u.boat||u.emergency||u.recalled||hasTaskCommitment(u)||!['idle','hold','gather'].includes(u.order))return no('Choose an available adult carrying the agreed payment');
 if(!['food','wood','stone','copper','iron'].includes(r.good)||!Number.isSafeInteger(r.qty)||r.qty<1||r.qty>TRADED_TEACHING_RULES.maximumPayment||u.carryType!==r.good||u.carry<r.qty)return no('Payment must already be in this person’s carried inventory');
 if(Math.hypot(u.x-teacher.x,u.z-teacher.z)>TRADED_TEACHING_RULES.contactMeters)return no('The learner must meet this artisan in person');
 if(!teachingOffers(g,teacher.id).some(o=>o.methodId===r.methodId&&o.siteId===r.siteId))return no('Meet a qualified artisan demonstrating this exact paid method');
 const site=g.state.buildings.find(b=>b.id===r.siteId)!;if(!g.interactionSpot(u,site))return no('No physical route to the teacher’s workshop');
 const list=g.state.teachingOffers||[];if(list.length>=TRADED_TEACHING_RULES.maximumOffers)return no('The teaching ledger is full');
 g.interruptMission(u);const id=`lesson-${g.state.nextId++}`;const o:TeachingOffer={version:1,id,methodId:r.methodId,teacher:{id:teacher.id,team:teacher.team,siteId:site.id},learner:{id:u.id,team:u.team},consideration:[{good:r.good,qty:r.qty,from:{kind:'resident',id:u.id,team:u.team},to:{kind:'faction',team:teacher.team},...(r.good==='food'?{foodKind:u.carryFood||'provisions'}:{})}],agreedAt:g.state.time,qualifiedBatches:teacher.productionSkills![r.methodId]!.successfulBatches,validUntil:g.state.time+TRADED_TEACHING_RULES.validSeconds,phase:'traveling',observedSeconds:0,lastProgress:0};
 if(!reserve(workRuntime(g),o))return no('This learner is reserved for other work');(g.state.teachingOffers??=[]).push(o);u.tradedTeaching={offerId:id};u.order='hold';u.node=null;u.target=null;g.invalidateRoute(u);return{accepted:true,reason:'Carrying payment to the artisan; knowledge must be observed and brought home'};
}
export function cancelTradedTeaching(g:Game,learnerId:number){const u=g.state.units.find(u=>u.id===learnerId&&u.team===0),o=u&&getOffer(g,u);if(!o)return false;finish(g,o,'cancelled','Lesson cancelled; undelivered cargo stays with its carrier, delivered payment is not refunded');return true;}
/** Formal terms settlement happens here, at actual arrival, never at agreement. */
function deliverPayment(g:Game,u:Unit,o:TeachingOffer){const t=o.consideration[0];if(u.carryType!==t.good||u.carry<t.qty||(t.good==='food'&&(u.carryFood||'provisions')!==t.foodKind))return false;
 if(t.good==='food')receiveFood(g,o.teacher.team,t.qty,t.foodKind);else g.tribe(o.teacher.team)[t.good]+=t.qty;
 u.carry-=t.qty;if(u.carry<=1e-8){u.carry=0;u.carryType=null;delete u.carryFood;}o.paidAt=g.state.time;o.phase='armed';return true;
}
export function tradedTeachingAI(g:Game,u:Unit,dt:number){if(!u.tradedTeaching)return false;const o=getOffer(g,u);if(!o)return false;
 if(!free(g,u)||u.team!==o.learner.team){finish(g,o,'lost','The learner cannot report this lesson');return false;}
 if(!reserve(workRuntime(g),o)){u.workReason='Lesson waiting for its reserved worker and observation place';return true;}
 if(o.phase==='returning'){
  const home=supplyDrops(g,u.team).map(drop=>({drop,spot:supplyApproach(g,u,drop)})).filter(x=>x.spot).sort((a,b)=>Math.hypot(u.x-a.spot!.x,u.z-a.spot!.z)-Math.hypot(u.x-b.spot!.x,u.z-b.spot!.z))[0];
  if(!home){u.workReason='Bringing learned method home; no reachable home cache';return true;}u.tx=home.spot!.x;u.tz=home.spot!.z;u.order='return';
  if(!u.boat&&g.height(u.x,u.z)>=g.waterAt(u.x,u.z)+.05&&supplyReached(g,u,home.drop,home.spot!)){release(g,o);o.phase='reported';o.reportedAt=g.state.time;u.productionSkills??={};const s=u.productionSkills[o.methodId]??={successfulBatches:0,taughtBatches:0,observedSeconds:0};s.taughtBatches++;s.observedSeconds+=o.observedSeconds;s.lastTaughtAt=g.state.time;s.lastTeacherId=o.teacher.id;delete u.tradedTeaching;u.order='idle';u.workReason='Learned method reported home';u.jobLock=false;return true;}
  u.workReason='Returning home with an observed foreign method';g.steer(u,dt);return true;
 }
 const teacher=g.state.units.find(t=>t.id===o.teacher.id&&t.team===o.teacher.team),site=siteFor(g,o);
 if(g.state.time>o.validUntil||!teacher||!qualified(g,teacher,o.methodId)||!site||g.isFoe(u.team,o.teacher.team)){finish(g,o,'cancelled','Lesson lapsed or the teacher’s workshop is unavailable');return false;}
 const spot=g.interactionSpot(u,site);if(!spot){u.workReason='Waiting for a physical route to the teaching workshop';return true;}u.order='hold';u.tx=spot.x;u.tz=spot.z;
 if(!g.buildingWorkReached(u,site)){if(o.projectId!==undefined){const p=g.state.production?.projects.find(p=>p.id===o.projectId);o.lastProgress=p?.progress||0;}u.workReason='Walking to the teaching workshop';g.steer(u,dt);return true;}
 if(o.paidAt===undefined&&!deliverPayment(g,u,o)){finish(g,o,'cancelled','The original carried payment is no longer available');return false;}
 let p=g.state.production?.projects.find(p=>p.id===o.projectId);
 if(!p||['complete','lost'].includes(p.phase)){
  release(g,o);o.projectId=undefined;o.observedSeconds=0;o.lastProgress=0;o.phase='armed';
  p=g.state.production?.projects.find(p=>p.actorId===teacher.id&&p.team===teacher.team&&p.workplace===site.id&&p.recipe===o.methodId&&p.phase==='working');
  if(p){o.projectId=p.id;o.lastProgress=p.progress;if(!reserve(workRuntime(g),o)){o.projectId=undefined;reserve(workRuntime(g),o);u.workReason='Waiting for the workshop’s observation place';return true;}o.phase='observing';}
 }
 if(p&&p.id===o.projectId){if(p.phase==='working'&&p.actorId===teacher.id&&g.buildingWorkReached(teacher,site))o.observedSeconds+=Math.min(Math.max(0,dt),Math.max(0,p.progress-o.lastProgress));o.lastProgress=p.progress;}
 u.workReason=p?'Observing the artisan’s paid work':'Waiting for this artisan to make the agreed method';return true;
}
/** Called only at useful physical output delivery; payment alone never teaches. */
export function recordTradedTeachingDelivery(g:Game,p:ProductionProject,useful:number,makerIds:number[]){for(const o of g.state.teachingOffers||[]){if(o.phase!=='observing'||o.projectId!==p.id)continue;const u=g.state.units.find(u=>u.id===o.learner.id&&u.team===o.learner.team),teacher=g.state.units.find(u=>u.id===o.teacher.id&&u.team===o.teacher.team);
 if(!u||!free(g,u)||!teacher||!qualified(g,teacher,o.methodId)||g.isFoe(u.team,teacher.team)||p.recipe!==o.methodId||p.team!==teacher.team||!makerIds.includes(teacher.id)||!(useful>0)||o.observedSeconds+1e-8<observationRequired(o.methodId)){release(g,o);o.projectId=undefined;o.phase='armed';o.observedSeconds=0;reserve(workRuntime(g),o);continue;}
 release(g,o);o.delivery={projectId:p.id,teacherWork:(p.practiceWorkers||[]).find(w=>w.id===teacher.id)?.work||0,usefulOutputs:useful,at:g.state.time};o.usefulAt=g.state.time;o.phase='returning';reserve(workRuntime(g),o);g.invalidateRoute(u);
 }}
export function tickTradedTeaching(g:Game){for(const o of g.state.teachingOffers||[]){if(terminal(o))continue;const u=g.state.units.find(u=>u.id===o.learner.id);if(!u||u.hp<=0||u.team!==o.learner.team||u.prisoner||u.enslavedFrom!==undefined)finish(g,o,'lost','Learner lost before reporting home');}}
export function tradedRecipeSources(s:GameState,team:number,methods:readonly ProductionRecipe[]){return(s.teachingOffers||[]).filter(o=>o.phase==='reported'&&o.learner.team===team&&methods.includes(o.methodId));}
export function validTradedTeaching(s:GameState){
 if(s.teachingOffers===undefined)return !s.units.some(u=>u.tradedTeaching);if(!Array.isArray(s.teachingOffers)||s.teachingOffers.length>TRADED_TEACHING_RULES.maximumOffers)return false;
 const ids=new Set<string>(),learners=new Set<number>(),observers=new Set<number>();const at=(v:unknown,max=s.time)=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=max;const id=(v:unknown)=>Number.isSafeInteger(v)&&Number(v)>0&&Number(v)<s.nextId;
 for(const o of s.teachingOffers){if(!o||o.version!==1||typeof o.id!=='string'||o.id.length>80||ids.has(o.id)||!recipe(o.methodId)||!o.teacher||!o.learner||!id(o.teacher.id)||!id(o.teacher.siteId)||!id(o.learner.id)||o.teacher.id===o.learner.id||!s.tribes.some(t=>t.id===o.teacher.team)||!s.tribes.some(t=>t.id===o.learner.team)||o.teacher.team===o.learner.team||!at(o.agreedAt)||!Number.isSafeInteger(o.qualifiedBatches)||o.qualifiedBatches<PRODUCTION_PRACTICE_RULES.mentorSuccessfulBatches||!at(o.validUntil,1e12)||o.validUntil!==o.agreedAt+TRADED_TEACHING_RULES.validSeconds||!['traveling','armed','observing','returning','reported','cancelled','lost'].includes(o.phase)||!at(o.observedSeconds,PRODUCTION_RECIPES[o.methodId].workSeconds)||!at(o.lastProgress,PRODUCTION_RECIPES[o.methodId].workSeconds))return false;ids.add(o.id);
  const a=o.consideration;if(!Array.isArray(a)||a.length!==1)return false;const t=a[0];if(!t||!['food','wood','stone','copper','iron'].includes(t.good)||!Number.isSafeInteger(t.qty)||t.qty<1||t.qty>TRADED_TEACHING_RULES.maximumPayment||t.from?.kind!=='resident'||t.from.id!==o.learner.id||t.from.team!==o.learner.team||t.to?.kind!=='faction'||t.to.team!==o.teacher.team||(t.good==='food'?!FOOD_KINDS.includes(t.foodKind!):t.foodKind!==undefined))return false;
  if(o.paidAt!==undefined&&(!at(o.paidAt)||o.paidAt<o.agreedAt)||o.usefulAt!==undefined&&(!at(o.usefulAt)||o.paidAt===undefined||o.usefulAt<o.paidAt||o.observedSeconds+1e-8<observationRequired(o.methodId))||o.reportedAt!==undefined&&(!at(o.reportedAt)||o.usefulAt===undefined||o.reportedAt<o.usefulAt))return false;
  if(o.phase==='traveling'&&o.paidAt!==undefined)return false;
  if(['armed','observing','returning','reported'].includes(o.phase)&&o.paidAt===undefined||['returning','reported'].includes(o.phase)&&o.usefulAt===undefined||o.phase==='reported'&&o.reportedAt===undefined)return false;
  if(o.projectId!==undefined&&!id(o.projectId))return false;
  const project=s.production?.projects.find(p=>p.id===o.projectId);if(project&&(project.recipe!==o.methodId||project.team!==o.teacher.team||project.workplace!==o.teacher.siteId))return false;
  if(o.delivery!==undefined){const d=o.delivery;if(!id(d.projectId)||d.projectId!==o.projectId||!at(d.at)||d.at!==o.usefulAt||!at(d.teacherWork,PRODUCTION_RECIPES[o.methodId].workSeconds)||d.teacherWork+1e-8<PRODUCTION_RECIPES[o.methodId].workSeconds*PRODUCTION_PRACTICE_RULES.minimumContributionFraction||!at(d.usefulOutputs,1e12)||d.usefulOutputs<=0||o.paidAt===undefined)return false;if(project&&(project.phase!=='complete'||!project.practiceRecorded||!project.practiceWorkers?.some(w=>w.id===o.teacher.id&&Math.abs(w.work-d.teacherWork)<1e-6)))return false;}
  if(['returning','reported'].includes(o.phase)&&!o.delivery||o.phase==='observing'&&(!project||['complete','lost'].includes(project.phase)))return false;
  if(o.phase==='reported'){const owner=s.units.find(u=>u.id===o.learner.id&&u.team===o.learner.team),skill=owner?.productionSkills?.[o.methodId];if(owner&&(!skill||skill.taughtBatches<1||skill.lastTaughtAt===undefined||skill.lastTaughtAt<o.reportedAt!))return false;}
  if(!terminal(o)){const person=s.units.find(u=>u.id===o.learner.id);if(person&&(hasTaskCommitment(person,'tradedTeaching')||person.productionProjectId!==undefined))return false;if(learners.has(o.learner.id)||!s.units.some(u=>u.id===o.learner.id&&u.team===o.learner.team&&u.tradedTeaching?.offerId===o.id))return false;learners.add(o.learner.id);if(o.projectId!==undefined){if(observers.has(o.projectId)||s.units.some(u=>u.productionApprentice?.projectId===o.projectId&&!['paused','waiting'].includes(u.productionApprentice!.phase)))return false;observers.add(o.projectId);}}
 }
 return s.units.every(u=>!u.tradedTeaching||s.teachingOffers!.some(o=>o.id===u.tradedTeaching!.offerId&&!terminal(o)&&o.learner.id===u.id));
}
