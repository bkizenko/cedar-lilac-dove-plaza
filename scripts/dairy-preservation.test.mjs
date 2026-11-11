import {reviewAutomaticFoodProcessing} from '../src/game/cerealProcessing.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {beginProduction,productionIssue,pauseProductionProject,resumeProduction,tickProduction,discardDairyProject,PRODUCTION_RECIPES,occupiedProductionSlots} from '../src/game/production.ts';
import {foodInventory,receiveFood,consumeAndSpoilFood} from '../src/game/pantry.ts';
import {assignHusbandry,HERD} from '../src/game/husbandry.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {potteryOrigin} from '../src/game/pottery.ts';
import {productionKnowledgeTopics} from '../src/game/practiceKnowledge.ts';
import {craftSiteReport} from '../src/game/craftSiteReport.ts';
import {DAIRY_RULES} from '../src/game/dairy.ts';
import {mulberry32} from '../src/game/rng.ts';
function fixture(milk=4){
 const random=Math.random;Math.random=mulberry32(42);let g;try{g=new Game();g.reset(42,10);}finally{Math.random=random;}
 g.enterIsland();g.state.units=g.state.units.filter(u=>u.team===0);g.state.buildings=[];g.state.livestock=[];g.state.wildlife=[];g.state.autoWorkEnabled=false;g.state.nightWork=true;g.state.time=100;g.state.weather='clear';g.state.weatherT=10000;g.state.conflict='quiet';g.state.visitorTimer=900;g.state.raidT=g.state.birthT=10000;g.raidT=g.seaT=g.calamityT=10000;g.state.encounter=undefined;g.state.contacts=[];
 // Controlled workshop fixture, not a native-map acceptance claim.
 g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.state.campSites=[{team:0,x:0,z:30}];Object.assign(g.world.camps.find(c=>c.team===0),{x:0,z:30});for(const k of ['trees','stones','copper','iron','forage','fish'])g.state[k]=[];for(const t of g.state.tribes)t.thinkT=10000;
 for(const u of g.state.units){u.x=0;u.y=4;u.z=30;u.order='hold';u.jobLock=true;}
 const hall=g.makeBld('townhall',0,30,0),hearth=g.makeBld('hearth',-12,30,0),pen=g.makeBld('pen',20,30,0);g.state.buildings.push(hall,hearth,pen);g.rebuildWalk();g.vision.fill(2);
 const origin=potteryOrigin(g,0,hearth.id);Object.assign(g.tribe(0),{food:2000+milk,foodLots:{provisions:2000,milk},wood:200,stone:200,items:{pottery:1},potteryOrigins:[{origin,count:1}]});g.tribe(0).survival.waterLiters=1000;
 return {g,hearth,pen,origin};
}
function drive(g,limit,until){for(let i=0;i<limit*5&&!until();i++){g.state.paused=false;const t=g.state.time;g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.ok(!g.state.ended&&g.state.time>t);}assert.ok(until(),JSON.stringify({time:g.state.time,projects:g.state.production?.projects,workers:g.state.units.map(u=>({id:u.id,order:u.order,reason:u.workReason}))}));}
function begin(f){assert.equal(beginProduction(f.g,'fermentMilk',f.hearth.id),true,productionIssue(f.g,'fermentMilk',f.hearth.id));return f.g.state.production.projects.at(-1);}
test('paid vessel and exact milk batch ferment passively, pause/reload and physically return once with three food units',()=>{
 let f=fixture(),g=f.g;const food=g.tribe(0).food,water=g.tribe(0).survival.waterLiters,wood=g.tribe(0).wood,p=begin(f),id=p.id;
 assert.equal(foodInventory(g.tribe(0)).milk,0);assert.equal(g.tribe(0).food,food-4);assert.equal(g.tribe(0).items.pottery,0);assert.equal(g.tribe(0).potteryOrigins[0].count,0);assert.equal(g.tribe(0).wood,wood-1);assert.equal(g.tribe(0).survival.waterLiters,water-1);
 drive(g,100,()=>p.phase==='curing');assert.equal(p.actorId,null);assert.equal(g.state.units.some(u=>u.productionProjectId===id),false);assert.equal(occupiedProductionSlots(g,f.hearth),1);assert.match(productionIssue(g,'cookMeat',f.hearth.id),/slot|busy|capacity|occupied/i);
 assert.equal(pauseProductionProject(g,id),true);const before=p.dairy.fermentSeconds;drive(g,160,()=>p.resumePhase==='ready');assert.ok(p.dairy.fermentSeconds>before);assert.equal(g.tribe(0).items.pottery,0);assert.equal(foodInventory(g.tribe(0)).fermentedMilk,0);
 const report=craftSiteReport(g,f.hearth);assert.equal(report.slotsReserved,1);assert.equal(report.jobs[0].progressUnit,'effective fermentation seconds');
 g=decodeGame(encodeGame(g));g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.rebuildWalk();const saved=g.state.production.projects.find(p=>p.id===id);assert.deepEqual(saved.dairy,p.dairy);assert.equal(resumeProduction(g,id),true);
 drive(g,90,()=>saved.phase==='complete');const t=g.tribe(0),m=g.state.production.metrics;assert.equal(t.items.pottery,1);assert.equal(t.potteryOrigins[0].count,1);assert.deepEqual(t.potteryOrigins[0].origin,f.origin);assert.equal(m.foodInputsUsed.milk,4);assert.equal(m.edibleFoodProduced,3);assert.equal(m.waterUsedLiters,1);assert.equal(m.logsUsed,1);assert.ok(foodInventory(t).fermentedMilk>2.9);assert.equal(t.productionPractice.fermentMilk.batches,1);assert.equal(productionKnowledgeTopics(g).find(t=>t.id==='production:dairy').stage,'proven');
 for(let i=0;i<10;i++)g.step(.2);assert.equal(t.items.pottery,1);assert.equal(m.edibleFoodProduced,3);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('provisions cannot substitute for milk; discard, aging and workplace loss consume held goods once without rewards',()=>{
 const empty=fixture(0);assert.match(productionIssue(empty.g,'fermentMilk',empty.hearth.id),/milk/i);assert.equal(beginProduction(empty.g,'fermentMilk',empty.hearth.id),false);assert.equal(empty.g.tribe(0).items.pottery,1);
 for(const cause of ['discard','age','workplace']){const f=fixture(),p=begin(f);if(cause==='discard'){assert.equal(discardDairyProject(f.g,p.id),true);assert.equal(discardDairyProject(f.g,p.id),false);}else if(cause==='age'){f.g.state.time+=DAIRY_RULES.rawBatchLifetimeSeconds+1;tickProduction(f.g,0);}else{drive(f.g,100,()=>p.phase==='curing');f.hearth.hp=0;tickProduction(f.g,0);}assert.equal(p.phase,'lost');assert.equal(f.g.tribe(0).items.pottery,0);assert.equal(f.g.state.production.metrics.foodInputsLost.milk,4);assert.equal(f.g.state.production.metrics.lost.pottery,1);assert.equal(f.g.state.production.metrics.edibleFoodProduced,0);assert.equal(f.g.tribe(0).productionPractice?.fermentMilk,undefined);tickProduction(f.g,0);assert.equal(f.g.state.production.metrics.lost.pottery,1);assert.doesNotThrow(()=>decodeGame(encodeGame(f.g)));}
});
test('fermented milk remains finite edible food that spoils more slowly than the same fresh milk, with strict incubation saves',()=>{
 const {g,hearth}=fixture(0);receiveFood(g,0,10,'milk');receiveFood(g,0,10,'fermentedMilk');consumeAndSpoilFood(g,0,0,60);const lots=foodInventory(g.tribe(0));assert.ok(lots.fermentedMilk>lots.milk);assert.ok(lots.fermentedMilk<10);assert.ok(lots.milk<10);g.tribe(0).items.pottery=1;const p=begin({g,hearth});const raw=encodeGame(g);
 for(const mutate of [p=>delete p.dairy,p=>p.dairy.fermentSeconds=91,p=>p.dairy.elapsedSeconds=100,p=>p.phase='ready']){const copy=structuredClone(raw);mutate(copy.state.production.projects.find(x=>x.id===p.id));assert.throws(()=>decodeGame(copy));}
 assert.equal(PRODUCTION_RECIPES.fermentMilk.food,3);
});
test('real goat lactation and keeper delivery provide identified milk for the paid dairy batch; sheep provide none',()=>{
 const f=fixture(0),{g,pen}=f;pen.pasture={condition:1,feed:50,care:1};
 for(const [species,sex] of [['goat','female'],['goat','male'],['sheep','female']]){const id=g.id();g.state.livestock.push({id,species,team:0,pen:pen.id,sex,x:pen.x,y:4,z:pen.z,facing:0,vx:0,vz:0,wanderT:100,hp:24,maxHp:24,fly:0,scale:1,born:g.state.time-HERD.maturity,tamedAt:g.state.time,hunger:0,milk:0,pregnancy:species==='goat'&&sex==='female'?HERD.gestation-1:0,...(species==='sheep'?{fleece:{version:1,units:0,grownUnits:0,shearedUnits:0}}:{})});}
 assert.equal(assignHusbandry(g,pen.id),true);drive(g,300,()=>foodInventory(g.tribe(0)).milk>=4);assert.ok(g.state.livestock.some(a=>a.species==='goat'&&a.born>100),'actual goat birth establishes lactation');assert.equal(g.state.livestock.find(a=>a.species==='sheep').milk,0);
 const delivered=foodInventory(g.tribe(0)).milk,p=begin(f);assert.ok(Math.abs(foodInventory(g.tribe(0)).milk-(delivered-4))<1e-8);assert.equal(g.state.production.metrics.foodInputsUsed.milk,4);assert.equal(p.recipe,'fermentMilk');assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});

test('ready dairy discard is terminal and automatic meals never create an unrequested milk fermentation loop',()=>{
 const f=fixture();f.g.state.autoWorkEnabled=true;reviewAutomaticFoodProcessing(f.g,0);assert.equal(f.g.state.production?.projects.some(p=>p.recipe==='fermentMilk')||false,false);f.g.state.autoWorkEnabled=false;
 const p=begin(f);drive(f.g,100,()=>p.phase==='curing');assert.equal(pauseProductionProject(f.g,p.id),true);drive(f.g,160,()=>p.resumePhase==='ready');
 assert.equal(discardDairyProject(f.g,p.id),true);assert.ok(p.dairy.recovery,'spoiled food leaves the same dirty vessel at the intact hearth');assert.equal(f.g.tribe(0).items.pottery,0);assert.equal(discardDairyProject(f.g,p.id),true,'permanent vessel discard is a separate explicit action');assert.equal(discardDairyProject(f.g,p.id),false);assert.equal(f.g.state.production.metrics.edibleFoodLost,3);assert.equal(f.g.state.production.metrics.lost.pottery,1);assert.equal(f.g.tribe(0).items.pottery,0);assert.equal(f.g.tribe(0).potteryOrigins[0].count,0);assert.equal(foodInventory(f.g.tribe(0)).fermentedMilk,0);assert.doesNotThrow(()=>decodeGame(encodeGame(f.g)));
});
