import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {decodeGame,encodeGame} from '../src/game/persistence.ts';
import {beginProduction,productionIssue,productionOutputs,productionFoodOutputs,occupiedProductionSlots,discardDairyProject,productionRecovery,queueDairyVesselCleaning,itemCapacity,storedItemUnits} from '../src/game/production.ts';
import {foodInventory,FOOD_NOURISHMENT} from '../src/game/pantry.ts';
import {BREWING_RULES as R} from '../src/game/brewing.ts';
import {craftSiteReport} from '../src/game/craftSiteReport.ts';
import {prepareSocietyHandover} from '../src/game/communityHandover.ts';
let opening;
const hash=g=>createHash('sha256').update(JSON.stringify({heights:Array.from(g.world.heights),rivers:g.world.rivers,features:g.world.features})).digest('hex');
function fixture(){opening??=nativeDairyVillage();const g=decodeGame(opening.save),t=g.tribe(0);t.food=310;t.foodLots={provisions:300,grain:10};t.items={pottery:1};delete t.foodExperience;return{g,hearth:opening.hearth,origin:opening.origin,worker:opening.worker};}
function drive(g,seconds,done){const end=g.state.time+seconds;while(g.state.time<end&&!done()){g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.ok(!g.state.ended,g.state.endReason);}assert.ok(done(),JSON.stringify({time:g.state.time,projects:g.state.production?.projects,workers:g.state.units.filter(u=>u.team===0).map(u=>({id:u.id,order:u.order,lock:u.jobLock,reason:u.workReason,project:u.productionProjectId,emergency:u.emergency,x:u.x,z:u.z}))}));}
function begin(g,recipe,hearth){assert.equal(beginProduction(g,recipe,hearth),true,productionIssue(g,recipe,hearth));return g.state.production.projects.at(-1);}
test('native grain to malt to both beers pays finite ingredients, frees the passive maker, retains its vessel and survives reload',()=>{
 let{g,hearth,origin}=fixture();const terrain=hash(g),t=()=>g.tribe(0);let totalPaidGrain=0;
 for(const recipe of ['sproutGrain','sproutGrain','brewSmallBeer','brewBeer']){
  const beforeGrain=foodInventory(t()).grain,beforeMalt=t().items.greenMalt||0;let p=begin(g,recipe,hearth);assert.equal(t().items.pottery,0,'one real vessel is held, never duplicated');assert.deepEqual(p.brewing.vesselOrigin,origin);assert.equal(occupiedProductionSlots(g,g.state.buildings.find(b=>b.id===hearth)),1);
  if(recipe==='sproutGrain'){totalPaidGrain+=4;assert.ok(Math.abs(foodInventory(t()).grain-(beforeGrain-4))<1e-7);}else assert.equal(t().items.greenMalt,beforeMalt-R.stages[p.brewing.stage].greenMalt);
  drive(g,100,()=>p.phase==='curing');assert.equal(p.actorId,null);assert.equal(p.brewing.exposureSeconds,0);assert.equal(t().items.pottery,0);assert.equal(g.state.units.some(u=>u.productionProjectId===p.id),false);assert.ok(craftSiteReport(g,g.state.buildings.find(b=>b.id===hearth)).jobs.some(j=>/vessel|sprout|ferment/i.test(JSON.stringify(j))));
  const id=p.id;g=decodeGame(encodeGame(g));p=g.state.production.projects.find(q=>q.id===id);assert.equal(p.phase,'curing');assert.deepEqual(p.brewing.vesselOrigin,origin);
  drive(g,260,()=>p.phase==='complete');assert.equal(t().items.pottery,1);assert.ok(t().potteryOrigins.some(o=>o.count===1&&o.origin.site===origin.site));assert.equal(g.state.production.metrics.consumed.pottery,g.state.production.metrics.produced.pottery);
  assert.equal(occupiedProductionSlots(g,g.state.buildings.find(b=>b.id===hearth)),0);assert.ok(t().productionPractice[recipe].batches>=1,'only actual useful delivery demonstrates a method');assert.equal(hash(g),terrain);
 }
 const m=g.state.production.metrics;assert.equal(totalPaidGrain,8);assert.equal(m.grainUsed,8);assert.equal(m.consumed.greenMalt,5);assert.equal(m.produced.greenMalt,6);assert.equal(m.logsUsed,2);assert.equal(m.waterUsedLiters,12);assert.equal(m.foodOutputsProduced.smallBeer,2);assert.equal(m.foodOutputsProduced.beer,2);
 assert.ok(2*FOOD_NOURISHMENT.smallBeer+2*FOOD_NOURISHMENT.beer<=8,'brewing never manufactures nourishment from collected water');assert.equal(t().items.greenMalt,1);assert.equal(hash(g),terrain);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
 const spoiled=structuredClone(encodeGame(g)),old=spoiled.state.production.projects.find(q=>q.recipe==='sproutGrain');old.brewing.hotSeconds=R.hotLossSeconds;old.brewing.elapsedSeconds=old.brewing.exposureSeconds+R.hotLossSeconds;assert.throws(()=>decodeGame(spoiled),'a known overheated historical batch cannot be loaded as completed useful malt');
 if(process.env.BREWING_NATIVE_SAVE){g.state.paused=true;writeFileSync(process.env.BREWING_NATIVE_SAVE,JSON.stringify(encodeGame(g)));}
});
test('deliberate spoiled malt keeps its dirty vessel, paid cleanup returns only the same vessel and never earns method credit',()=>{
 const{g,hearth}=fixture();const p=begin(g,'sproutGrain',hearth);drive(g,100,()=>p.phase==='curing');assert.equal(discardDairyProject(g,p.id),true);assert.ok(productionRecovery(p));assert.deepEqual(productionOutputs(p),{pottery:1});assert.deepEqual(productionFoodOutputs(p),{});assert.equal(g.state.production.metrics.grainLost,4);assert.equal(g.tribe(0).items.pottery,0);assert.equal(g.tribe(0).items.greenMalt||0,0);assert.equal(g.tribe(0).productionPractice?.sproutGrain,undefined);
 assert.doesNotThrow(()=>decodeGame(encodeGame(g)));assert.equal(queueDairyVesselCleaning(g,p.id),true);drive(g,140,()=>p.phase==='complete');assert.equal(g.tribe(0).items.pottery,1);assert.equal(g.tribe(0).items.greenMalt||0,0);assert.equal(g.state.production.metrics.waterUsedLiters,4);assert.equal(g.tribe(0).productionPractice?.sproutGrain,undefined);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('missing grain, vessel, fuel or water rejects atomically and strict saves reject fabricated brewing progress',()=>{
 for(const missing of ['grain','pottery','water','storage']){const{g,hearth}=fixture(),t=g.tribe(0);if(missing==='grain'){t.food=300;t.foodLots={provisions:300};}if(missing==='pottery')t.items={};if(missing==='water')t.survival.waterLiters=0;if(missing==='storage'){t.items.bone=0;while(storedItemUnits(g,0)<=itemCapacity(g,0))t.items.bone+=10;}const before=JSON.stringify(t);assert.equal(beginProduction(g,'sproutGrain',hearth),false);assert.equal(JSON.stringify(t),before);assert.equal(g.state.production?.projects?.length||0,0);}
 const{g,hearth}=fixture();g.tribe(0).items.greenMalt=3;g.tribe(0).wood=0;const before=JSON.stringify(g.tribe(0));assert.equal(beginProduction(g,'brewBeer',hearth),false);assert.equal(JSON.stringify(g.tribe(0)),before);
 g.tribe(0).wood=10;const p=begin(g,'sproutGrain',hearth);for(const mutate of [b=>b.stage='beer',b=>b.exposureSeconds=100,b=>b.elapsedSeconds=100,b=>b.inputAgeSeconds=601,b=>b.recovery={version:1,failedAt:g.state.time+10}]){const save=structuredClone(encodeGame(g));mutate(save.state.production.projects.find(q=>q.id===p.id).brewing);assert.throws(()=>decodeGame(save));}
});

test('discarding a carried batch frees its surviving maker and old malt keeps its original age until heating',()=>{
 const a=fixture(),p=begin(a.g,'sproutGrain',a.hearth),actor=a.g.state.units.find(u=>u.id===p.actorId);assert.equal(actor.jobLock,true);assert.equal(discardDairyProject(a.g,p.id),true);assert.equal(p.phase,'lost');assert.equal(actor.productionProjectId,undefined);assert.equal(actor.jobLock,false,'lost work must not strand an otherwise available adult');assert.doesNotThrow(()=>decodeGame(encodeGame(a.g)));
 const b=fixture(),t=b.g.tribe(0);b.g.state.time=580;t.items.greenMalt=3;t.itemFreshness={greenMalt:0};const q=begin(b.g,'brewBeer',b.hearth);assert.equal(q.brewing.inputAgeSeconds,580);drive(b.g,30,()=>q.phase==='lost'||!!productionRecovery(q));assert.equal(b.g.state.production.metrics.foodOutputsProduced?.beer||0,0);assert.equal(b.g.state.production.metrics.lost.greenMalt,3);assert.doesNotThrow(()=>decodeGame(encodeGame(b.g)));
});

test('whole-community transfer retains the oldest real malt freshness without refreshing either stock',()=>{
 const{g}=fixture();g.state.time=100;const from=g.tribe(1),to=g.tribe(0);from.items={greenMalt:2};from.itemFreshness={greenMalt:10};to.items.greenMalt=1;to.itemFreshness={greenMalt:80};const before=JSON.stringify(encodeGame(g)),plan=prepareSocietyHandover(g,1,0);assert.equal(plan.accepted,true,plan.reason);assert.equal(JSON.stringify(encodeGame(g)),before,'handover preflight stays pure');g.commitCommunityState(plan.state);assert.equal(g.tribe(0).items.greenMalt,3);assert.equal(g.tribe(0).itemFreshness.greenMalt,10);assert.equal(g.tribe(1).items.greenMalt||0,0);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
