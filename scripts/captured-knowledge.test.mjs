import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {decodeGame,encodeGame,validateGameSave} from '../src/game/persistence.ts';
import {acceptPrisonerSurrender,provisionPrisoner,assignPrisonerGuard} from '../src/game/captivity.ts';
import {integrateCaptive,custodySeconds,CAPTIVE_DEALINGS_RULES} from '../src/game/captiveDealings.ts';
import {capturedMethodSourcesForPerson,capturedRecipeSources} from '../src/game/capturedKnowledge.ts';
import {beginProduction,productionIssue,PRODUCTION_RECIPES} from '../src/game/production.ts';
import {beginProductionLesson,productionLessonIssue,productionApprenticeAI,observationRequired} from '../src/game/productionPractice.ts';
import {supplyApproach,supplyReached,supplyDrops} from '../src/game/campAnchor.ts';
import {isDependent} from '../src/game/settlement.ts';
import {mulberry32} from '../src/game/rng.ts';
import {findPath} from '../src/game/navigation.ts';
import {UNITS,AGE_STAT} from '../src/game/constants.ts';
const METHOD='fireClayHand',LATER_METHOD='formClayHand';
let watchedIds=[];
const personState=u=>({id:u.id,team:u.team,type:u.type,hp:u.hp,maxHp:u.maxHp,dmg:u.dmg,range:u.range,x:u.x,y:u.y,z:u.z,tx:u.tx,tz:u.tz,stuckT:u.stuckT,order:u.order,reason:u.workReason,hunger:u.hunger,thirst:u.thirstSeconds,emergency:u.emergency,shelterId:u.shelterId,carry:u.carry,carryType:u.carryType,guardId:u.prisoner?.guardId,prisoner:u.prisoner,lesson:u.productionApprentice});
const terrainHash=g=>createHash('sha256').update(JSON.stringify({heights:Array.from(g.world.heights),rivers:g.world.rivers,features:g.world.features})).digest('hex');
const atCache=(g,u)=>supplyDrops(g,u.team).some(d=>{const spot=supplyApproach(g,u,d);return spot&&supplyReached(g,u,d,spot);});
function drive(g,seconds,done,inspect=()=>{}){
 const end=g.state.time+seconds;
 while(!done()&&g.state.time<end){
  assert.ok(!g.state.encounter,'Unexpected encounter needs an explicit scenario response');
  g.state.paused=false;const before=g.state.time;g.step(.2);assert.ok(g.state.time>before,'Ordinary native simulation must advance');assert.ok(!g.state.ended,JSON.stringify({ended:g.state.ended,reason:g.state.endReason}));assert.deepEqual(g.simulationErrors,[]);inspect();
 }
 assert.ok(done(),JSON.stringify({time:g.state.time,units:g.state.units.filter(u=>watchedIds.includes(u.id)||u.selected||u.prisoner||u.productionApprentice||u.productionProjectId||u.productionSkills?.[METHOD]).map(personState),projects:g.state.production?.projects}));
}
function opening({surveyOnly=false}={}){
 // Finite authored opening on native V18 terrain: original generated people and
 // their positions are retained. The helper supplies a legal existing hearth.
 // Declare housing, provisions/water/logs/dryware, up to four original armed residents,
 // prior contacts and one foreign artisan's THREE prior exact-method successes.
 // These are setup endowments, not earned crafting, combat or discovery claims.
 const f=nativeDairyVillage(),g=decodeGame(f.save),home=g.campOf(0);
 for(const u of g.state.units){u.selected=false;u.jobLock=true;u.order='hold';}
 for(const t of g.state.tribes){t.hostile=false;t.thinkT=10000;t.food=2000;t.foodLots={provisions:2000};if(t.survival)t.survival.waterLiters=1200;}
 Object.assign(g.tribe(0),{wood:150,items:{...(g.tribe(0).items||{}),dryWare:8,clay:4}});g.state.contacts=[1,2];g.state.autoWorkEnabled=false;g.state.nightWork=true;g.state.conflict='quiet';g.state.weather='clear';g.state.weatherT=10000;g.raidT=g.calamityT=g.seaT=10000;g.state.raidT=g.state.birthT=10000;g.state.visitorTimer=900;
 const locals=g.state.units.filter(u=>u.team===0&&u.type==='worker'&&!isDependent(g,u)),guard=locals.find(u=>u.id===f.worker),learner=locals.find(u=>u!==guard);assert.ok(guard&&learner);
 const party=[guard,...locals.filter(u=>u!==guard&&u!==learner)].slice(0,4),stats=UNITS.spearman,mul=AGE_STAT[g.tribe(0).age];assert.ok(party.length>=2,'Finite original escort party leaves an original learner at home');
 // Declared opening gear and class conditioning, before any wounds: no new
 // people, healing after capture, invented class stats or unlimited supplies.
 for(const u of party){Object.assign(u,{type:'spearman',hp:Math.round(stats.hp*mul),maxHp:Math.round(stats.hp*mul),speed:stats.speed,range:stats.range,dmg:stats.dmg*mul,rof:stats.rof,r:stats.r,militia:false,jobLock:false,carry:12,carryType:'food',carryFood:'provisions'});g.tribe(0).wood-=stats.wood;g.tribe(0).food-=12;g.tribe(0).foodLots.provisions-=12;}
 let point;for(let r=12;r<=60&&!point;r+=4)for(let i=0;i<24&&!point;i++){const x=home.x+Math.cos(i*Math.PI/12)*r,z=home.z+Math.sin(i*Math.PI/12)*r;if(g.placementIssue('hut',x,z,0)===null&&g.workBoard.connected(g,guard.x,guard.z,x,z))point={x,z};}
 assert.ok(point,'Native legal housing without terrain clearing/flattening');const house=g.makeBld('hut',point.x,point.z,0);g.state.buildings.push(house);g.rebuildWalk();assert.ok(g.popCap(0)>g.popNow(0)+1,'Housing must accommodate the incoming free person');
 // Admit an actual body-sized dry surrender approach, rather than ordering
 // the guard through an artisan or a settlement building at its centre point.
 const candidates=g.state.units.filter(u=>u.team!==0&&u.team!==3&&u.type==='worker'&&u.hp>0&&!u.militia&&!isDependent(g,u)&&u.carry===0&&!u.prisoner&&!u.shelterId&&g.canStep(u,u.x,u.z)&&!g.state.units.some(d=>d.team===u.team&&d.hp>0&&(d.militia||!['worker','leader'].includes(d.type))&&Math.hypot(d.x-u.x,d.z-u.z)<12)).sort((a,b)=>Math.hypot(a.x-guard.x,a.z-guard.z)-Math.hypot(b.x-guard.x,b.z-guard.z));
 const width=Math.round(Math.sqrt(g.walk.length)),cell=g.world.size/width,half=g.world.size/2,index=(x,z)=>Math.max(0,Math.min(width-1,Math.floor((z+half)/cell)))*width+Math.max(0,Math.min(width-1,Math.floor((x+half)/cell))),start=index(guard.x,guard.z),routeGoals=new Map(),routeSurvey=[];
 const actualRoute=(x,z)=>{const goal=index(x,z);if(!routeGoals.has(goal))routeGoals.set(goal,findPath(g.walk,width,start,goal,96000));return routeGoals.get(goal);};
 let teacher,approach;
 for(const u of candidates){
  const points=[];for(const radius of [1.4,2,2.6])for(let i=0;i<24;i++){
   const x=u.x+Math.cos(i*Math.PI/12)*radius,z=u.z+Math.sin(i*Math.PI/12)*radius,y=g.height(x,z),body={...guard,x,y,z};
   if(y>g.waterAt(x,z)+.35&&g.walkable(x,z)&&g.canStep(body,x,z)&&g.workBoard.connected(g,guard.x,guard.z,x,z))points.push({x,z});
  }
  points.sort((a,b)=>Math.hypot(a.x-guard.x,a.z-guard.z)-Math.hypot(b.x-guard.x,b.z-guard.z));
  const admitted=points.find(p=>actualRoute(p.x,p.z)!==null);
  routeSurvey.push({unitId:u.id,team:u.team,x:u.x,z:u.z,dryApproaches:points.length,routePositive:!!admitted,routeWaypoints:admitted?actualRoute(admitted.x,admitted.z).length:null});
  if(admitted){teacher=u;approach=admitted;break;}
 }
 if(!teacher&&surveyOnly)return{g,guard,party,learner,routeSurvey};
 assert.ok(teacher&&approach,`Original foreign artisan needs an actual dry approach with a constrained 96000-node native path: ${JSON.stringify(routeSurvey)}`);
 assert.equal(terrainHash(g),f.terrain,'Legal authored buildings preserve the original native terrain');
 teacher.productionSkills={[METHOD]:{successfulBatches:3,taughtBatches:0,observedSeconds:0}};teacher.jobLock=true;teacher.order='hold';g.state.paused=false;
 validateGameSave(encodeGame(g));
 return {g,teacher,guard,party,learner,approach,routeSurvey,site:g.state.buildings.find(b=>b.id===f.hearth)};
}
function visibleSurrenderApproach(g,guard,teacher){
 if(!g.visibleAt(teacher.x,teacher.z))return null;
 const width=Math.round(Math.sqrt(g.walk.length)),cell=g.world.size/width,half=g.world.size/2,index=(x,z)=>Math.max(0,Math.min(width-1,Math.floor((z+half)/cell)))*width+Math.max(0,Math.min(width-1,Math.floor((x+half)/cell))),points=[];
 for(const radius of [1.4,2,2.6])for(let i=0;i<24;i++){const x=teacher.x+Math.cos(i*Math.PI/12)*radius,z=teacher.z+Math.sin(i*Math.PI/12)*radius,y=g.height(x,z);if(y>g.waterAt(x,z)+.35&&g.walkable(x,z)&&g.canStep({...guard,x,y,z},x,z))points.push({x,z});}
 points.sort((a,b)=>Math.hypot(a.x-guard.x,a.z-guard.z)-Math.hypot(b.x-guard.x,b.z-guard.z));
 return points.find(p=>findPath(g.walk,width,index(guard.x,guard.z),index(p.x,p.z),96000)!==null)||null;
}
function noGrant(g,learner){assert.equal(learner.productionSkills?.[METHOD],undefined);assert.equal(learner.productionSkills?.[LATER_METHOD],undefined);assert.equal(g.tribe(0).productionPractice?.[METHOD],undefined);}
function rejectRestrictedTeaching(raw,teacherId,learnerId,projectId,custody){
 // Isolated admission/dependency probes on copies of the actual paid working
 // lesson. Status transitions are not credited as native captures or journeys;
 // no movement, productive progress, output or skill is manufactured here.
 for(const status of ['prisoner','slave']){
  let c=decodeGame(structuredClone(raw)),t=c.state.units.find(u=>u.id===teacherId),student=c.state.units.find(u=>u.id===learnerId);
  if(status==='prisoner')t.prisoner=structuredClone(custody);else t.enslavedFrom=custody.originTeam;
  assert.match(productionLessonIssue(c,projectId),/working teacher/i);assert.equal(beginProductionLesson(c,projectId).accepted,false);assert.equal(student.productionSkills?.[METHOD],undefined);
  c=decodeGame(structuredClone(raw));t=c.state.units.find(u=>u.id===teacherId);student=c.state.units.find(u=>u.id===learnerId);
  for(const u of c.state.units)if(u.team===0&&u.id!==teacherId)u.order='move';student.order='hold';
  if(status==='prisoner')student.prisoner=structuredClone(custody);else student.enslavedFrom=custody.originTeam;
  assert.match(productionLessonIssue(c,projectId),/another available adult/i);assert.equal(beginProductionLesson(c,projectId).accepted,false);assert.equal(student.productionSkills?.[METHOD],undefined);
 }
}

test('native capture, physical 600s custody and free integration grant no skills; original artisan teaches a paid exact firing method only after observed work and useful delivery',()=>{
 const random=Math.random;Math.random=mulberry32(42);
 try{
  let {g,teacher,guard,party,learner,approach,site}=opening();const terrain=terrainHash(g),ids={teacher:teacher.id,guard:guard.id,learner:learner.id,site:site.id},origin=teacher.team,startGuard={x:guard.x,z:guard.z},startTeacher={x:teacher.x,z:teacher.z};
  watchedIds=[...Object.values(ids),...party.map(u=>u.id)];noGrant(g,learner);assert.deepEqual(capturedRecipeSources(g.state,0,[METHOD]),[]);
  const moveOwn=(people,p,attack=false)=>{g.clearSelect();for(const u of people)if(u.hp>0)g.selectEntity(u,true);g.issueMove(p.x,p.z,attack);};
  const partyStart=new Map(party.map(u=>[u.id,{x:u.x,z:u.z}]));moveOwn(party,approach);
  let visibleRedirects=0,lastObserved={x:teacher.x,z:teacher.z};
  drive(g,600,()=>party.some(u=>u.hp>0&&Math.hypot(u.x-teacher.x,u.z-teacher.z)<=3)&&party.filter(u=>u.hp>0).every(u=>Math.hypot(u.x-teacher.x,u.z-teacher.z)<=10),()=>{
   assert.equal(teacher.team,origin);assert.equal(teacher.prisoner,undefined);
   // The original person remains free to move. Update ordinary player orders
   // only after the guard reaches the last seen area and sees that person again.
   if(visibleRedirects<8&&Math.hypot(guard.x-approach.x,guard.z-approach.z)<28&&Math.hypot(teacher.x-lastObserved.x,teacher.z-lastObserved.z)>2&&g.visibleAt(teacher.x,teacher.z)){
    const next=visibleSurrenderApproach(g,guard,teacher);if(next){approach=next;lastObserved={x:teacher.x,z:teacher.z};moveOwn(party,approach);visibleRedirects++;}
   }
  });
  assert.ok(Math.hypot(guard.x-startGuard.x,guard.z-startGuard.z)>10,'Original guard actually walked to the foreign artisan');
  for(const u of party){const p=partyStart.get(u.id);assert.ok(Math.hypot(u.x-p.x,u.z-p.z)>10,'Every original escort party member must physically walk');}
  g.interruptMission(guard);guard.order='hold';const surrender=acceptPrisonerSurrender(g,teacher,0);assert.equal(surrender.accepted,true,surrender.reason);assert.equal(teacher.id,ids.teacher);assert.equal(teacher.team,0);assert.equal(teacher.enslavedFrom,undefined);
  const captured=structuredClone(teacher.prisoner.methods),capturedAt=g.state.time;assert.deepEqual(captured,{version:1,sourceTeam:origin,capturedAt,recipes:[{recipe:METHOD,successfulBatches:3,taughtBatches:0}]});noGrant(g,learner);assert.deepEqual(capturedMethodSourcesForPerson(g.state,teacher,METHOD),[]);assert.deepEqual(capturedRecipeSources(g.state,0,[METHOD]),[]);
  guard=party.find(u=>u.id===teacher.prisoner.guardId);assert.ok(guard,'Custody must be assigned to an actual original party member');
  const captureDefense={time:g.state.time,guard:personState(guard),enemies:g.state.units.filter(u=>u.team===origin&&u.hp>0&&Math.hypot(u.x-guard.x,u.z-guard.z)<=24).map(u=>({...personState(u),cd:u.cd,targetId:u.target?.id,distance:Math.hypot(u.x-guard.x,u.z-guard.z)}))};
  const carrier=party.find(u=>u.hp>0&&u.carry>0&&Math.hypot(u.x-teacher.x,u.z-teacher.z)<=3);assert.ok(carrier);assert.equal(provisionPrisoner(g,teacher.id,carrier.id),true,'Only actual nearby carried food supplies the escort');
  // The actual assigned guard now uses built-in prisonerAI exclusively; the
  // other original party members finish their arrival orders and defend normally.assert.ok(teacher.prisoner.food>0);assert.equal(integrateCaptive(g,teacher.id).accepted,false);
  // Later live-person counts and foreign stocks do not rewrite capture evidence.
  const personalAtCapture=structuredClone(teacher.productionSkills),foreignWood=g.tribe(origin).wood;
  teacher.productionSkills[METHOD].successfulBatches=9;teacher.productionSkills[LATER_METHOD]={successfulBatches:3,taughtBatches:0,observedSeconds:0};g.tribe(origin).wood+=17;assert.deepEqual(teacher.prisoner.methods,captured);
  // Keep adversarial metadata probes out of the productive native run.
  teacher.productionSkills=personalAtCapture;g.tribe(origin).wood=foreignWood;
  const escortHistory=[],lastHp=new Map(party.map(u=>[u.id,u.hp]));let lastGuard=guard.id;
  const keepActualEscort=()=>{
   const held=teacher.prisoner,current=g.state.units.find(u=>u.id===held?.guardId);
   if(held&&held.phase!=='released'&&(!current||current.hp<=0||current.emergency)){
    const replacement=party.filter(u=>u.hp>0&&!u.emergency&&['idle','hold','move'].includes(u.order)&&Math.hypot(u.x-teacher.x,u.z-teacher.z)<=18).sort((a,b)=>Math.hypot(a.x-teacher.x,a.z-teacher.z)-Math.hypot(b.x-teacher.x,b.z-teacher.z))[0];
    if(replacement){const r=assignPrisonerGuard(g,teacher.id,replacement.id);assert.equal(r.accepted,true,r.reason);guard=replacement;}
   }else if(current)guard=current;
   if(party.some(u=>u.hp!==lastHp.get(u.id))||guard.id!==lastGuard){escortHistory.push({time:g.state.time,party:party.map(personState),enemies:g.state.units.filter(u=>u.hp>0&&u.team===origin&&Math.hypot(u.x-teacher.x,u.z-teacher.z)<=24).map(u=>({...personState(u),cd:u.cd,targetId:u.target?.id})),nav:g.paths.get(guard.id),diplomacy:g.state.diplomaticReports});if(escortHistory.length>12)escortHistory.shift();for(const u of party)lastHp.set(u.id,u.hp);lastGuard=guard.id;}
   assert.ok(held&&held.phase!=='released'&&teacher.team===0,`Escort lost original custody: ${JSON.stringify({time:g.state.time,captureDefense,teacher:personState(teacher),guard:personState(guard),escortHistory})}`);
   noGrant(g,learner);
  };
  drive(g,360,()=>teacher.prisoner?.phase==='custody',()=>{assert.equal(teacher.id,ids.teacher);keepActualEscort();});assert.ok(Math.hypot(teacher.x-startTeacher.x,teacher.z-startTeacher.z)>10,'Same person physically walked to actual custody');assert.ok(atCache(g,teacher));const custody=structuredClone(teacher.prisoner);
  assert.equal(integrateCaptive(g,teacher.id).accepted,false,'Physical arrival alone does not satisfy 600 seconds');
  const custodyStart=g.state.time;drive(g,CAPTIVE_DEALINGS_RULES.integrateAfterSeconds+2,()=>custodySeconds(g,teacher.id)>=CAPTIVE_DEALINGS_RULES.integrateAfterSeconds,()=>{assert.equal(teacher.prisoner?.phase,'custody');assert.deepEqual(teacher.prisoner.methods,captured);keepActualEscort();assert.ok(party.some(u=>u.hp>0),'At least one original party guard must survive actual custody');});assert.ok(g.state.time-custodyStart>=599.8);
  const integration=integrateCaptive(g,teacher.id);assert.equal(integration.accepted,true,integration.reason);assert.equal(teacher.prisoner,undefined);assert.equal(teacher.enslavedFrom,undefined);assert.equal(teacher.team,0);const entry=g.state.captiveDealings.integrations.find(i=>i.unitId===teacher.id);assert.deepEqual(entry.methods,captured);noGrant(g,learner);assert.equal(teacher.productionSkills[METHOD].successfulBatches,3,'Integration does not award another batch');
  const laterState=structuredClone(g.state),laterTeacher=laterState.units.find(u=>u.id===teacher.id);laterTeacher.productionSkills[LATER_METHOD]={successfulBatches:3,taughtBatches:0,observedSeconds:0};assert.deepEqual(capturedMethodSourcesForPerson(laterState,laterTeacher,LATER_METHOD),[],'A later locally acquired method is not retroactively captured');
  const sources=capturedMethodSourcesForPerson(g.state,teacher,METHOD);assert.equal(sources.length,1);assert.equal(sources[0].successfulBatchesAtCapture,3);assert.equal(sources[0].taughtBatchesAtCapture,0);assert.equal(sources[0].integratedAt,entry.at);assert.deepEqual(capturedMethodSourcesForPerson(g.state,teacher,LATER_METHOD),[],'A method acquired only after capture is not a captured source');assert.deepEqual(capturedRecipeSources(g.state,0,[LATER_METHOD]),[]);
  // A failed firing consumes its real inputs and grants no lesson; the second paid attempt uses the finite opening reserve.
  let completed=false;for(let attempt=0;attempt<2;attempt++){
  g.clearSelect();g.selectEntity(teacher);teacher.jobLock=false;learner.jobLock=false;const logs=g.tribe(0).wood,dryWare=g.tribe(0).items.dryWare;assert.equal(PRODUCTION_RECIPES[METHOD].workSeconds,90);assert.equal(productionIssue(g,METHOD,site.id,teacher.id),null);assert.equal(beginProduction(g,METHOD,site.id,teacher.id),true);let p=g.state.production.projects.at(-1);assert.equal(p.actorId,teacher.id);assert.equal(g.tribe(0).wood,logs-4);assert.equal(g.tribe(0).items.dryWare,dryWare-4);
  drive(g,120,()=>p.phase==='working'&&p.progress>0);if(attempt===0)rejectRestrictedTeaching(encodeGame(g),teacher.id,learner.id,p.id,custody);
  g.clearSelect();g.selectEntity(learner);assert.equal(productionLessonIssue(g,p.id),null);const lesson=beginProductionLesson(g,p.id);assert.equal(lesson.accepted,true,lesson.reason);assert.equal(learner.productionApprentice?.teacherId,teacher.id);assert.equal(learner.productionApprentice?.projectId,p.id);assert.equal(observationRequired(METHOD),30);const lessonStarted=learner.productionApprentice.started,projectId=p.id;let learnerWalk=0,previous={x:learner.x,z:learner.z};
  drive(g,120,()=>learner.productionApprentice?.phase==='waiting',()=>{learnerWalk+=Math.hypot(learner.x-previous.x,learner.z-previous.z);previous={x:learner.x,z:learner.z};assert.equal(learner.productionSkills?.[METHOD],undefined,'Observation never grants a skill before useful delivery');});assert.ok(attempt>0||learnerWalk>2,'Original learner walked to the actual working site');assert.ok(learner.productionApprentice.observedSeconds+1e-8>=30);assert.notEqual(p.phase,'complete');assert.deepEqual(learner.productionSkills?.[METHOD]?.methodSources??[],[]);
  const mid=encodeGame(g),observed=learner.productionApprentice.observedSeconds;g=decodeGame(mid);teacher=g.state.units.find(u=>u.id===ids.teacher);guard=g.state.units.find(u=>u.id===ids.guard);learner=g.state.units.find(u=>u.id===ids.learner);site=g.state.buildings.find(b=>b.id===ids.site);p=g.state.production.projects.find(b=>b.id===projectId);assert.equal(learner.productionApprentice.observedSeconds,observed);assert.deepEqual(g.state.captiveDealings.integrations.find(i=>i.unitId===teacher.id).methods,captured);assert.equal(learner.productionSkills?.[METHOD],undefined);assert.equal(terrainHash(g),terrain);
  // Restrict a genuinely admitted learner on copies before further observation.
  for(const status of attempt===0?['prisoner','slave']:[]){const c=decodeGame(structuredClone(mid)),u=c.state.units.find(u=>u.id===ids.learner),before=u.productionApprentice.observedSeconds;u.productionApprentice.phase='watching';if(status==='prisoner')u.prisoner=structuredClone(custody);else u.enslavedFrom=origin;productionApprenticeAI(c,u,.2);assert.equal(u.productionApprentice.observedSeconds,before);assert.equal(u.productionApprentice.phase,'paused');assert.equal(u.productionSkills?.[METHOD],undefined);}
  drive(g,200,()=>p.phase==='complete');if(!(g.tribe(0).productionPractice?.[METHOD]?.usefulOutputs>0)){assert.equal(attempt,0,'At most one failed firing is supported by finite opening inputs');assert.equal(learner.productionSkills?.[METHOD],undefined,'A failed firing cannot teach a successful method');assert.equal(g.tribe(0).productionPractice[METHOD].failedBatches,1);assert.equal(g.tribe(0).items.potsherds,4);continue;}const skill=learner.productionSkills[METHOD];assert.equal(skill.taughtBatches,1);assert.equal(skill.successfulBatches,0);assert.ok(skill.observedSeconds+1e-8>=30);assert.equal(skill.lastTeacherId,teacher.id);assert.equal(skill.methodSources.length,1);const receipt=skill.methodSources[0];assert.deepEqual(receipt,{version:1,kind:'captured',originMakerId:teacher.id,sourceTeam:origin,capturedAt,integratedAt:entry.at,learnedAt:skill.lastTaughtAt,successfulBatchesAtCapture:3,taughtBatchesAtCapture:0});assert.ok(receipt.learnedAt>lessonStarted);assert.equal(learner.productionSkills?.[LATER_METHOD],undefined);assert.deepEqual(capturedMethodSourcesForPerson(g.state,learner,LATER_METHOD),[]);assert.equal(terrainHash(g),terrain);
  const restored=decodeGame(encodeGame(g)),copy=restored.state.units.find(u=>u.id===learner.id);assert.deepEqual(copy.productionSkills[METHOD],skill);assert.deepEqual(restored.state.captiveDealings.integrations.find(i=>i.unitId===teacher.id).methods,captured);assert.equal(terrainHash(restored),terrain);assert.deepEqual(restored.simulationErrors,[]);
  if(process.env.CAPTURED_KNOWLEDGE_SAVE){assert.ok(isAbsolute(process.env.CAPTURED_KNOWLEDGE_SAVE));const fixture=encodeGame(restored);fixture.state.paused=true;writeFileSync(process.env.CAPTURED_KNOWLEDGE_SAVE,JSON.stringify(fixture));}
   completed=true;break;
  }assert.ok(completed,'A useful paid firing must eventually teach the observed method');
 }finally{Math.random=random;}
});
