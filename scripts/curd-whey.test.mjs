import test from 'node:test';
import assert from 'node:assert/strict';
import {CURD_RULES,newCurdBatch,advanceCurdDrain,spoilCurdFoods,curdNourishment,validCurdBatch} from '../src/game/curds.ts';
const origin={version:1,team:0,site:4,style:'plain'};
test('curd material rule splits finite cultured milk into curd and captured whey without multiplying nourishment or held tools',()=>{
 const b=newCurdBatch([origin,null]);assert.equal(b.vesselCount,2);assert.equal(b.clothUnits,1);assert.notEqual(b.vesselOrigins[0],origin);assert.equal(b.foodLots,undefined);
 const result=advanceCurdDrain(b,90,90,20,false);assert.equal(result.ready,true);assert.deepEqual(b.foodLots,{freshCurd:1,whey:1});assert.equal(curdNourishment(b.foodLots),3);assert.equal(curdNourishment(b.foodLots),CURD_RULES.fermentedMilk);assert.equal(validCurdBatch(b,90,0,()=>true),true);
 advanceCurdDrain(b,1,91,20,false);assert.deepEqual(b.foodLots,{freshCurd:1,whey:1},'passive readiness cannot create a second food batch');
});
test('curd and whey lose their own finite nourishment; the faster-spoiling whey cannot be silently added to curds',()=>{
 const b=newCurdBatch([null,null]);advanceCurdDrain(b,90,90,20,false);const before=curdNourishment(b.foodLots),loss=spoilCurdFoods(b,60,1);assert.ok(loss.whey/CURD_RULES.whey>loss.freshCurd);assert.ok(curdNourishment(b.foodLots)<before);assert.ok(Math.abs(curdNourishment(b.foodLots)+curdNourishment(loss)-before)<1e-10);assert.equal(validCurdBatch(b,150,0,()=>true),true);
});
test('rain, freezing and overheating act on the loaded batch rather than inventing acid, rennet, salt or a completed cheese',()=>{
 const frozen=newCurdBatch([null,null]);assert.equal(advanceCurdDrain(frozen,90,90,-1,false).ready,false);assert.equal(frozen.drainSeconds,0);
 const wet=newCurdBatch([null,null]);assert.equal(advanceCurdDrain(wet,120,120,20,true).lost,true);assert.equal(wet.foodLots,undefined);
 const hot=newCurdBatch([null,null]);assert.equal(advanceCurdDrain(hot,45,45,40,false).lost,true);assert.equal(hot.foodLots,undefined);
});
test('strict curd payload rejects fabricated tool counts, food-before-drain and impossible cleaning proof',()=>{
 for(const mutate of [b=>b.vesselCount=1,b=>b.clothUnits=0,b=>b.vesselOrigins=[],b=>b.foodLots={freshCurd:1,whey:1},b=>b.washSeconds=10]){const b=newCurdBatch([null,null]);mutate(b);assert.equal(validCurdBatch(b,10,0,()=>true),false);}
 const ready=newCurdBatch([null,null]);advanceCurdDrain(ready,90,90,20,false);ready.foodLots.whey=3;assert.equal(validCurdBatch(ready,90,0,()=>true),false);ready.foodLots.whey=1;ready.foodLots.provisions=999;assert.equal(validCurdBatch(ready,90,0,()=>true),false,'unknown output kinds cannot smuggle extra food through the shared lot-map delivery');
});

// Native integration cases are prepared for the coordinator's next resource grant.
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {beginProduction,productionIssue,productionFoodOutputs,productionRecovery,pauseProductionProject,resumeProduction,queueDairyVesselCleaning,tickProduction} from '../src/game/production.ts';
import {FOOD_NOURISHMENT,foodInventory,readyNourishment,receiveFood,takeFoodLot} from '../src/game/pantry.ts';
import {productionKnowledgeTopics} from '../src/game/practiceKnowledge.ts';
import {workerActivity} from '../src/game/workerActivity.ts';
import {loadScoutProvisions,returnScoutPackAtCache} from '../src/game/scoutProvisions.ts';
function nativeFixture(){const f=nativeDairyVillage(),g=decodeGame(f.save);g.enterIsland();g.raidT=g.seaT=g.calamityT=10000;Object.assign(g.tribe(0),{food:303,foodLots:{provisions:300,fermentedMilk:3},items:{pottery:2,cloth:1},potteryOrigins:[{origin:f.origin,count:2}]});return {g,hearth:g.state.buildings.find(b=>b.id===f.hearth),origin:f.origin};}
function drive(g,seconds,until){const end=g.state.time+seconds;while(g.state.time<end&&!until()){g.state.paused=false;const before=g.state.time;g.step(.2);assert.ok(!g.state.ended&&g.state.time>before);assert.deepEqual(g.simulationErrors,[]);}assert.ok(until(),JSON.stringify({time:g.state.time,projects:g.state.production?.projects}));}
function begin(f){assert.equal(beginProduction(f.g,'strainCulturedCurd',f.hearth.id),true,productionIssue(f.g,'strainCulturedCurd',f.hearth.id));return f.g.state.production.projects.at(-1);}
const energy=lots=>(lots?.freshCurd||0)*FOOD_NOURISHMENT.freshCurd+(lots?.whey||0)*FOOD_NOURISHMENT.whey;
test('an imported usable cultured-milk sample supports a paid native curding experiment, both food lots and the same sanitized tool set return through strict reload',()=>{
 let f=nativeFixture(),g=f.g;assert.equal(g.tribe(0).productionPractice?.fermentMilk,undefined);assert.equal(productionKnowledgeTopics(g).find(t=>t.id==='production:curds').stage,'observation');const p=begin(f),id=p.id,hearthId=f.hearth.id;
 assert.equal(g.tribe(0).food,300);assert.equal(foodInventory(g.tribe(0)).fermentedMilk,0);assert.equal(g.tribe(0).items.pottery,0);assert.equal(g.tribe(0).items.cloth,0);assert.equal(g.tribe(0).potteryOrigins[0].count,0);assert.equal(p.curds.vesselCount,2);assert.equal(p.curds.clothUnits,1);assert.equal(g.state.production.metrics.waterUsedLiters,4);
 drive(g,100,()=>p.phase==='curing');assert.equal(p.actorId,null);assert.equal(pauseProductionProject(g,id),true);drive(g,120,()=>p.resumePhase==='ready');assert.deepEqual(productionFoodOutputs(p),{freshCurd:1,whey:1});const readySave=encodeGame(g);
 for(const mutate of [
  (save,batch)=>{batch.phase=batch.resumePhase='carrying';const u=save.state.units.find(u=>u.team===0&&u.hp>0);batch.actorId=u.id;u.productionProjectId=batch.id;},
  (_save,batch)=>{batch.resumePhase='working';batch.progress=0;delete batch.practiceWorkers;},
  (_save,batch)=>{batch.resumePhase='working';batch.curds.washSeconds=10;},
  ...['foodInputsUsed','foodInputsLost','foodOutputsProduced','foodOutputsLost'].map(name=>(save)=>{save.state.production.metrics[name]=[];})
 ]){const corrupt=structuredClone(readySave);mutate(corrupt,corrupt.state.production.projects.find(p=>p.id===id));assert.throws(()=>decodeGame(corrupt),'strict reload rejects impossible curd chronology or array-shaped food ledgers');}
 g=decodeGame(readySave);g.enterIsland();g.raidT=g.seaT=g.calamityT=10000;const restored=g.state.production.projects.find(p=>p.id===id);assert.equal(resumeProduction(g,id),true);drive(g,100,()=>restored.phase==='returning');assert.equal(restored.curds.washSeconds,10);
 const actor=g.state.units.find(u=>u.id===restored.actorId),activity=workerActivity(g.state,actor);assert.ok(activity.batchCargo.some(x=>x.includes('freshCurd')));assert.ok(activity.batchCargo.some(x=>x.includes('whey')));assert.ok(activity.batchCargo.includes('2 fired pottery vessels'));assert.ok(activity.batchCargo.includes('1 woven bast cloth'));
 drive(g,100,()=>restored.phase==='complete');const t=g.tribe(0),m=g.state.production.metrics;assert.equal(t.items.pottery,2);assert.equal(t.items.cloth,1);assert.equal(t.potteryOrigins[0].count,2);assert.deepEqual(t.potteryOrigins[0].origin,f.origin);assert.equal(m.foodInputsUsed.fermentedMilk,3);assert.ok(Math.abs(energy(m.foodOutputsProduced)+energy(m.foodOutputsLost)-3)<1e-8);assert.ok(energy(m.foodOutputsProduced)<=3);assert.equal(t.productionPractice.strainCulturedCurd.batches,1);assert.equal(t.productionPractice.fermentMilk,undefined);/* Existing scalar packs may lose food identity/concentration; they must never create nourishment. */const beforePack=readyNourishment(t,0);assert.equal(loadScoutProvisions(g,actor,{budgetSeconds:1,homeMealSeconds:1,homeWaterSeconds:1}),true);assert.ok(readyNourishment(t,0)+actor.scoutProvisions.food<=beforePack+1e-8);assert.equal(returnScoutPackAtCache(g,actor),true);assert.ok(readyNourishment(t,0)<=beforePack+1e-8);assert.equal(actor.scoutProvisions,undefined);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));assert.equal(g.state.buildings.find(b=>b.id===hearthId).type,'hearth');
});
test('weighted curd and whey remain finite food even when no bread exists; missing cloth or a second vessel cannot be replaced with an abstract ingredient',()=>{
 const f=nativeFixture(),t=f.g.tribe(0);t.items.pottery=1;assert.match(productionIssue(f.g,'strainCulturedCurd',f.hearth.id),/pottery/);t.items.pottery=2;t.items.cloth=0;assert.match(productionIssue(f.g,'strainCulturedCurd',f.hearth.id),/cloth/);t.items.cloth=1;t.food=3;t.foodLots={milk:3};assert.match(productionIssue(f.g,'strainCulturedCurd',f.hearth.id),/fermentedMilk/);
 t.food=0;t.foodLots={};receiveFood(f.g,0,1,'freshCurd');receiveFood(f.g,0,1,'whey');assert.equal(t.food,2);assert.equal(readyNourishment(t,0),3);assert.equal(takeFoodLot(f.g,0,'whey',1),true);assert.equal(t.food,1);assert.equal(readyNourishment(t,0),2,'concentrated curd uses its actual coefficient without the old bread-only shortcut');
});
test('spoiled loaded curd leaves the same two vessels and cloth for paid physical recovery, with no fermented-food refund or false curding history',()=>{
 const f=nativeFixture(),p=begin(f);drive(f.g,100,()=>p.phase==='curing');f.g.state.time=p.started+CURD_RULES.rawLifetimeSeconds+1;tickProduction(f.g,0);assert.ok(productionRecovery(p));assert.deepEqual(productionFoodOutputs(p),{});assert.equal(f.g.state.production.metrics.foodInputsLost.fermentedMilk,3);assert.equal(f.g.tribe(0).items.pottery,0);assert.equal(f.g.tribe(0).items.cloth,0);assert.equal(queueDairyVesselCleaning(f.g,p.id),true);drive(f.g,160,()=>p.phase==='complete');assert.equal(f.g.tribe(0).items.pottery,2);assert.equal(f.g.tribe(0).items.cloth,1);assert.equal(f.g.tribe(0).potteryOrigins[0].count,2);assert.equal(f.g.state.production.metrics.edibleFoodProduced,0);assert.equal(f.g.tribe(0).productionPractice?.strainCulturedCurd,undefined);assert.equal(f.g.state.production.metrics.foodInputsLost.fermentedMilk,3);assert.doesNotThrow(()=>decodeGame(encodeGame(f.g)));
});
