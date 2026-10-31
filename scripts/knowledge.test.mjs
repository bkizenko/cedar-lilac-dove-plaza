import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {knowledgeReport,runKnowledgeAction} from '../src/game/knowledge.ts';
import {copperStudyAI,COPPER_STUDY_RULES} from '../src/game/materialStudy.ts';
import {cropStudyAI,beginCropTrial} from '../src/game/cultivation.ts';
import {farmToolWorkAI} from '../src/game/farmTools.ts';
import {haulageWorkAI} from '../src/game/haulage.ts';
import {consumeAndSpoilFood} from '../src/game/pantry.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {AGE_COST} from '../src/game/constants.ts';
function fixture(){const g=new Game();g.reset(123456,10);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('workshop',35,38,0)];g.state.weather='clear';g.clockState=()=>({period:'Afternoon'});for(let i=0;i<5;i++)g.spawnUnit('worker',i*3,60,0);g.vision.fill(2);g.rebuildWalk();return g;}
const topic=(g,id)=>knowledgeReport(g).topics.find(t=>t.id===id);
function work(g,u,fn,seconds){for(let i=0;i<seconds*10;i++){g.state.time+=.1;g.navBudget=20;fn(g,u,.1);}}
test('viewing practical knowledge cannot grant samples, prototype success, equipment or an age',()=>{
 const g=fixture(),t=g.tribe(0);const before={food:t.food,wood:t.wood,copper:t.copper,seeds:t.seeds,samples:JSON.stringify(t.cropSamples),cultivated:JSON.stringify(t.cultivated),age:t.age};
 for(let i=0;i<5;i++)knowledgeReport(g);
 assert.deepEqual({food:t.food,wood:t.wood,copper:t.copper,seeds:t.seeds,samples:JSON.stringify(t.cropSamples),cultivated:JSON.stringify(t.cultivated),age:t.age},before);
 assert.equal(t.copperExperiment,undefined);assert.equal(g.state.units.some(u=>u.farmTool||u.haulage),false);assert.equal(topic(g,'copper').metrics.prototypeEstablished,0);
 assert.equal(runKnowledgeAction(g,'unknown').accepted,false);assert.deepEqual(AGE_COST.slice(1,4).map(c=>c.pop),[50,75,100]);
});
test('real crop collection, seed trial and field work appear as distinct observable steps',()=>{
 const g=fixture(),t=g.tribe(0),u=g.state.units[0];g.state.forage=[{id:g.id(),kind:'forage',x:8,z:65,y:4,amount:80,maxAmt:80,regenT:0,scale:1,rich:1,cropCandidate:'grain'}];
 assert.equal(topic(g,'crop:grain').stage,'observation');u.selected=true;g.issueGather(g.state.forage[0]);
 for(let i=0;i<3000&&(t.cropSamples?.grain||0)<4;i++){g.state.time+=.1;g.navBudget=20;g.workerAI(u,.1);}
 assert.ok(t.cropSamples.grain>=4);assert.equal(t.cultivated.includes('grain'),false);assert.equal(topic(g,'crop:grain').metrics.practiceEstablished,0);
 assert.equal(runKnowledgeAction(g,'trial:grain').accepted,true);const maker=g.state.units.find(p=>p.studyCrop==='grain');assert.equal(topic(g,'crop:grain').stage,'experiment');
 work(g,maker,cropStudyAI,150);assert.equal(t.cultivated.includes('grain'),true);assert.equal(topic(g,'crop:grain').stage,'proven');
 const field=g.makeBld('farm',20,38,0);g.state.buildings.push(field);g.rebuildWalk();assert.equal(topic(g,'crop:grain').metrics.sownFields,0,'configured field is not evidence of sowing');
 const farmer=g.state.units[3];g.clearSelect();farmer.selected=true;g.issueGather(field);
 for(let i=0;i<1000&&!(field.crop?.planted>0);i++){g.state.time+=.1;g.navBudget=20;g.workerAI(farmer,.1);}
 assert.ok(field.crop.planted>0);assert.equal(topic(g,'crop:grain').stage,'adoption');
});
test('seed trial priority uses a free second adult rather than stealing the first water carrier',()=>{
 const g=fixture(),t=g.tribe(0),carrier=g.state.units[0];t.cropSamples={grain:4};
 carrier.waterWork={sourceX:0,sourceZ:0,bankX:0,bankZ:0,phase:'returning',progressSeconds:0,liters:12};carrier.order='hold';
 assert.equal(runKnowledgeAction(g,'trial:grain').accepted,true);assert.equal(carrier.studyCrop,undefined);assert.equal(carrier.waterWork.liters,12);
 assert.equal(g.state.units.some(u=>u!==carrier&&u.studyCrop==='grain'),true);
});
test('a five-person camp must pay, walk and test a copper prototype before producing additional real tool sets',()=>{
 const g=fixture(),t=g.tribe(0);Object.assign(t,{copper:16,wood:20});
 assert.equal(runKnowledgeAction(g,'copper_trial').accepted,true);let maker=g.state.units.find(u=>u.copperStudy);assert.equal(t.copper,8);assert.equal(t.wood,16);assert.equal(t.copperExperiment,undefined);
 const progress=maker.copperStudy.progress;work(g,maker,copperStudyAI,.1);assert.equal(maker.copperStudy.progress,progress,'walking is not experimental output');
 work(g,maker,copperStudyAI,180);assert.equal(t.copperExperiment,true);assert.equal(topic(g,'copper').metrics.prototypeEstablished,1);assert.equal(topic(g,'copper').metrics.equippedResidents,1);assert.equal(t.age,0);
 assert.equal(runKnowledgeAction(g,'copper_tools').accepted,true);const second=g.state.units.find(u=>u.farmToolWork?.kind==='copperTools');assert.notEqual(second.id,maker.id);assert.equal(topic(g,'copper').metrics.equippedResidents,1);assert.equal(t.copper,4);assert.equal(t.wood,13);
 work(g,second,farmToolWorkAI,150);assert.equal(topic(g,'copper').metrics.equippedResidents,2);assert.equal(t.age,0);
 const restored=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.equal(topic(restored,'copper').metrics.prototypeEstablished,1);assert.equal(topic(restored,'copper').metrics.equippedResidents,2);assert.equal(COPPER_STUDY_RULES.workSeconds,90);
});
test('sled-delivered goods, rather than carried cargo or elapsed time, unlock a real paid handcart project',()=>{
 const g=fixture(),u=g.state.units[0],t=g.tribe(0);u.haulage='sled';g.state.trees=[{id:g.id(),kind:'tree',x:12,z:65,y:4,amount:80,maxAmt:80,regenT:0,scale:1,rich:1}];u.selected=true;g.issueGather(g.state.trees[0]);
 assert.equal(topic(g,'transport').metrics.sledGoodsDelivered,0);assert.equal(runKnowledgeAction(g,'cart').accepted,false);
 for(let i=0;i<7000&&(t.haulagePractice||0)<60;i++){g.state.time+=.1;g.navBudget=20;g.workerAI(u,.1);}
 assert.equal(t.haulagePractice,60);assert.equal(topic(g,'transport').metrics.cartsOwned,0);g.clearSelect();u.selected=true;g.assignJob('auto');
 if(u.carry>0)work(g,u,(game,p,dt)=>game.workerAI(p,dt),100);
 assert.equal(runKnowledgeAction(g,'cart').accepted,true);assert.equal(topic(g,'transport').metrics.cartsOwned,0);
 work(g,u,haulageWorkAI,180);assert.equal(topic(g,'transport').metrics.cartsOwned,1);assert.equal(topic(g,'transport').stage,'adoption');
});
test('storage knowledge reports measured spoilage and actual care rather than granting a preservation unlock',()=>{
 const g=fixture(),t=g.tribe(0);t.food=500;t.wood=120;const store=g.makeBld('warehouse',20,38,0);g.state.buildings.push(store);g.rebuildWalk();consumeAndSpoilFood(g,0,1,20);
 assert.ok(topic(g,'storage').metrics.recordedFoodSpoiled>0);assert.equal(topic(g,'storage').metrics.meanStoreCare,0);
 const wood=t.wood;assert.equal(runKnowledgeAction(g,'preserve').accepted,true);const person=g.state.units.find(u=>u.node===store);
 work(g,person,(game,u,dt)=>game.workerAI(u,dt),80);assert.ok((store.storeCare||0)>0);assert.ok(t.wood<wood);assert.ok(topic(g,'storage').metrics.meanStoreCare>0);
 const buildingsBefore=g.state.buildings.length,food=t.food;const plan=runKnowledgeAction(g,'place:warehouse');assert.equal(plan.placement,'warehouse');assert.equal(g.state.buildings.length,buildingsBefore);assert.equal(t.food,food,'choosing a construction mode grants no structure or food');
});
