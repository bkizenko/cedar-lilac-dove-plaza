import{writeFileSync}from'node:fs';import test from 'node:test';import assert from 'node:assert/strict';import{createHash}from'node:crypto';
import{nativeDairyVillage}from'./helpers/native-dairy-village.mjs';import{encodeGame,decodeGame}from'../src/game/persistence.ts';import{beginProduction,productionIssue}from'../src/game/production.ts';import{teachingOffers,beginTradedTeaching,tradedTeachingAI,cancelTradedTeaching,validTradedTeaching,tradedRecipeSources,tickTradedTeaching}from'../src/game/tradedTeaching.ts';import{supplyDrops,supplyApproach,supplyReached}from'../src/game/campAnchor.ts';
import{isEngineDispatchCommand,applyEngineCommand}from'../src/game/engineDispatch.ts';import{isEngineReadQuery,applyEngineReadQuery}from'../src/game/engineReadModels.ts';
const METHOD='twistCordageHand';let returningSave;
const hash=g=>createHash('sha256').update(JSON.stringify({h:Array.from(g.world.heights),r:g.world.rivers,f:g.world.features})).digest('hex');
const atCache=(g,u)=>supplyDrops(g,u.team).some(d=>{const p=supplyApproach(g,u,d);return p&&supplyReached(g,u,d,p)});
function drive(g,seconds,done){const end=g.state.time+seconds;while(!done()&&g.state.time<end){g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.ok(!g.state.ended);assert.ok(!g.state.encounter);}assert.ok(done(),JSON.stringify({time:g.state.time,offers:g.state.teachingOffers,people:g.state.units.filter(u=>u.selected||u.tradedTeaching||u.productionProjectId).map(u=>({id:u.id,x:u.x,z:u.z,order:u.order,reason:u.workReason,production:u.productionProjectId,carry:u.carry}))}));}
function fixture(){
 const f=nativeDairyVillage(),g=decodeGame(f.save);for(const u of g.state.units){u.selected=false;u.jobLock=true;u.order='hold';}for(const t of g.state.tribes){t.hostile=false;t.thinkT=10000;t.food=5000;t.foodLots={provisions:5000};t.items={...t.items,plantFibre:16};t.wood=200;if(t.survival)t.survival.waterLiters=3000;}g.state.contacts=[1,2];g.state.nightWork=true;g.state.autoWorkEnabled=false;g.state.visitorTimer=900;g.raidT=g.seaT=g.calamityT=g.state.raidT=g.state.birthT=10000;
 const learner=g.state.units.find(u=>u.id===f.worker),teacher=g.state.units.find(u=>u.id===6232);assert.ok(learner&&teacher);teacher.productionSkills={[METHOD]:{successfulBatches:3,taughtBatches:0,observedSeconds:0}};
 let point;const camp=g.campOf(teacher.team);for(let r=10;r<=46&&!point;r+=4)for(let i=0;i<24&&!point;i++){const x=camp.x+Math.cos(i*Math.PI/12)*r,z=camp.z+Math.sin(i*Math.PI/12)*r;if(g.placementIssue('hearth',x,z,teacher.team)===null&&g.workBoard.connected(g,teacher.x,teacher.z,x,z))point={x,z};}assert.ok(point);const site=g.makeBld('hearth',point.x,point.z,teacher.team);g.state.buildings.push(site);g.rebuildWalk();
 learner.carry=1;learner.carryType='stone';g.tribe(0).stone-=1;learner.jobLock=false;learner.selected=true;
 return{g,learner,teacher,site,terrain:hash(g)};
}
let contactSnapshot;
function localContact(f){if(contactSnapshot){const g=decodeGame(contactSnapshot.save);return{g,learner:g.state.units.find(u=>u.id===contactSnapshot.learner),teacher:g.state.units.find(u=>u.id===contactSnapshot.teacher),site:g.state.buildings.find(b=>b.id===contactSnapshot.site),terrain:contactSnapshot.terrain};}const{g,learner,teacher,site}=f||fixture();f??={g,learner,teacher,site,terrain:hash(g)};
 // Every position change below is ordinary movement on the original native map.
 const drop=supplyDrops(g,teacher.team).find(d=>supplyApproach(g,teacher,d)),spot=supplyApproach(g,teacher,drop);teacher.order='move';teacher.tx=spot.x;teacher.tz=spot.z;drive(g,60,()=>atCache(g,teacher));teacher.order='hold';teacher.jobLock=false;
 assert.equal(beginProduction(g,METHOD,site.id,teacher.id),true,productionIssue(g,METHOD,site.id,teacher.id));
 const approach=g.interactionSpot(learner,site);assert.ok(approach);g.issueMove(approach.x,approach.z);drive(g,1000,()=>Math.hypot(learner.x-site.x,learner.z-site.z)<12);
 // The demonstration may finish during the journey. Ask the artisan to make
 // another real paid batch; no synthetic progress or free outputs are granted.
 drive(g,180,()=>!teacher.productionProjectId);teacher.order='hold';teacher.jobLock=false;assert.equal(beginProduction(g,METHOD,site.id,teacher.id),true,productionIssue(g,METHOD,site.id,teacher.id));
 drive(g,70,()=>teachingOffers(g,teacher.id).length>0);learner.order='hold';contactSnapshot={save:encodeGame(g),learner:learner.id,teacher:teacher.id,site:site.id,terrain:f.terrain};return f;
}
test('native paid foreign lesson delivers cargo, observes own-team useful work, returns home and survives reload/pruned batch',()=>{
 let f=localContact(),{g,learner,teacher,site}=f;const id=learner.id,teacherId=teacher.id,before=g.tribe(teacher.team).stone,start={x:learner.x,z:learner.z};
 if(process.env.TEACHING_NATIVE_SAVE){const exported=encodeGame(g);exported.state.paused=true;writeFileSync(process.env.TEACHING_NATIVE_SAVE,JSON.stringify({save:exported,teacherId,learnerId:id,siteId:site.id,methodId:METHOD}));}
 assert.equal(beginTradedTeaching(g,{learnerId:id,teacherId,siteId:site.id,methodId:METHOD,good:'stone',qty:1}).accepted,true);assert.equal(learner.productionSkills?.[METHOD],undefined);assert.equal(g.tribe(teacher.team).stone,before);
 g=decodeGame(encodeGame(g));learner=g.state.units.find(u=>u.id===id);teacher=g.state.units.find(u=>u.id===teacherId);let offer=g.state.teachingOffers[0];drive(g,40,()=>offer.paidAt!==undefined);assert.equal(learner.carry,0);assert.equal(g.tribe(teacher.team).stone,before+1);assert.equal(learner.productionSkills?.[METHOD],undefined);
 drive(g,220,()=>offer.phase==='returning');assert.ok(offer.observedSeconds>=30);assert.ok(offer.delivery.usefulOutputs>0);assert.equal(teacher.team,1);assert.equal(learner.team,0);assert.equal(learner.productionSkills?.[METHOD],undefined);assert.equal(tradedRecipeSources(g.state,0,[METHOD]).length,0);
 returningSave=encodeGame(g);g=decodeGame(returningSave);learner=g.state.units.find(u=>u.id===id);offer=g.state.teachingOffers[0];drive(g,1000,()=>offer.phase==='reported');assert.ok(atCache(g,learner));assert.ok(Math.hypot(learner.x-start.x,learner.z-start.z)>100);assert.equal(learner.productionSkills[METHOD].taughtBatches,1);assert.equal(tradedRecipeSources(g.state,0,[METHOD]).length,1);assert.equal(hash(g),f.terrain);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
 g.state.production.projects=g.state.production.projects.filter(p=>p.id!==offer.projectId);assert.doesNotThrow(()=>decodeGame(encodeGame(g)),'historical evidence outlives ordinary finished-project pruning');
});
test('no remote/private offer, no shortfall debit, cancellation/hostility preserve undelivered cargo',()=>{
 const{g,learner,teacher,site}=fixture(),request={learnerId:learner.id,teacherId:teacher.id,siteId:site.id,methodId:METHOD,good:'stone',qty:1},before=JSON.stringify(encodeGame(g));assert.deepEqual(teachingOffers(g,teacher.id),[]);assert.equal(beginTradedTeaching(g,request).accepted,false);assert.equal(JSON.stringify(encodeGame(g)),before);
 const f=localContact(),r={...request,learnerId:f.learner.id,teacherId:f.teacher.id,siteId:f.site.id};r.qty=2;assert.equal(beginTradedTeaching(f.g,r).accepted,false);assert.equal(f.learner.carry,1);r.qty=1;assert.equal(beginTradedTeaching(f.g,r).accepted,true);assert.equal(cancelTradedTeaching(f.g,f.learner.id),true);assert.equal(f.learner.carry,1);assert.equal(f.learner.productionSkills?.[METHOD],undefined);assert.doesNotThrow(()=>decodeGame(encodeGame(f.g)));
});
test('strict in-flight records reject fake delivered knowledge, invalid food kinds and overlapping paid jobs',()=>{
 const f=localContact(),{g,learner,teacher,site}=f;assert.equal(beginTradedTeaching(g,{learnerId:learner.id,teacherId:teacher.id,siteId:site.id,methodId:METHOD,good:'stone',qty:1}).accepted,true);
 const save=encodeGame(g);for(const change of [o=>o.qualifiedBatches=0,o=>{o.phase='reported';o.paidAt=o.usefulAt=o.reportedAt=g.state.time;o.observedSeconds=30;},o=>{o.consideration[0].good='food';o.consideration[0].foodKind='madeUp';},o=>o.observedSeconds=1000]){const bad=structuredClone(save);change(bad.state.teachingOffers[0]);assert.equal(validTradedTeaching(bad.state),false);assert.throws(()=>decodeGame(bad));}
 const bad=structuredClone(save);bad.state.units.find(u=>u.id===learner.id).productionProjectId=1;assert.equal(validTradedTeaching(bad.state),false);
});

test('learned personal result is lost on death before home; paid output remains with its actual maker society',()=>{
 const g=decodeGame(returningSave),o=g.state.teachingOffers[0],u=g.state.units.find(u=>u.id===o.learner.id);assert.equal(u.productionSkills?.[METHOD],undefined);assert.ok((g.tribe(o.teacher.team).items.cordage||0)>0);assert.equal(g.tribe(0).items.cordage||0,0);u.hp=0;tickTradedTeaching(g);tickTradedTeaching(g);assert.equal(o.phase,'lost');assert.equal(tradedRecipeSources(g.state,0,[METHOD]).length,0);assert.equal(u.productionSkills?.[METHOD],undefined);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('native command/read model are bounded and pure; hostility and lapse never withdraw unarrived consideration',()=>{
 const f=localContact(),{g,learner,teacher,site}=f,q={kind:'traded-teaching-offers',teacherId:teacher.id,learnerIds:[learner.id]},command={kind:'begin-traded-teaching',learnerId:learner.id,teacherId:teacher.id,siteId:site.id,methodId:METHOD,good:'stone',qty:1};
 assert.equal(isEngineReadQuery(q),true);assert.equal(isEngineDispatchCommand(command),true);assert.equal(isEngineDispatchCommand({...command,qty:-1}),false);const before=JSON.stringify(encodeGame(g));const model=applyEngineReadQuery(g,q);assert.equal(model.learner.id,learner.id);assert.equal(model.offers[0].methodId,METHOD);assert.equal(JSON.stringify(encodeGame(g)),before);assert.equal(applyEngineCommand(g,command).accepted,true);g.tribe(teacher.team).hostile=true;tradedTeachingAI(g,learner,.2);assert.equal(g.state.teachingOffers[0].phase,'cancelled');assert.equal(learner.carry,1);assert.equal(learner.productionSkills?.[METHOD],undefined);
 const a=localContact();assert.equal(beginTradedTeaching(a.g,{...command,learnerId:a.learner.id}).accepted,true);a.g.state.time=a.g.state.teachingOffers[0].validUntil+.1;tradedTeachingAI(a.g,a.learner,.2);assert.equal(a.g.state.teachingOffers[0].phase,'cancelled');assert.equal(a.learner.carry,1);
});
