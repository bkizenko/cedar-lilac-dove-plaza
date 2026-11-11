import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {updateSeasonReports, recordSeasonWeapon, currentSeasonReport, validSeasonReports, SEASON_REPORT_LIMIT} from '../src/game/seasonReports.ts';
import {recordSimulationEvent} from '../src/game/simulationEvents.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

test('season boundaries record actual receipts, deliveries, weapons and end stocks without inventing history',()=>{
 const g=new Game();g.reset(42,10);g.enterIsland();
 g.state.time=30;
 recordSimulationEvent(g,'food_received',0,'food',80);
 updateSeasonReports(g);
 recordSimulationEvent(g,'food_received',0,'food',18);
 recordSimulationEvent(g,'cargo_delivered',0,'food',18);
 recordSimulationEvent(g,'cargo_delivered',0,'wood',12);
 recordSeasonWeapon(g,0);
 recordSeasonWeapon(g,1);
 g.tribe(0).wood=75;
 g.state.time=450;updateSeasonReports(g);
 const [row]=g.state.seasonReports.history;
 assert.equal(row.partial,true);
 assert.equal(row.totals.food,18);
 assert.equal(row.totals.wood,12);
 assert.equal(row.totals.weapons,1);
 assert.equal(row.stock.wood,75);
 updateSeasonReports(g);assert.equal(g.state.seasonReports.history.length,1);
 const decoded=decodeGame(encodeGame(g));
 assert.deepEqual(decoded.state.seasonReports,g.state.seasonReports);
 const bad=structuredClone(g.state.seasonReports);
 bad.history[0].totals.food=-1;
 assert.equal(validSeasonReports(bad,g.state.time),false);
 for(let i=2;i<=SEASON_REPORT_LIMIT+3;i++){g.state.time=i*450;updateSeasonReports(g);}
 assert.equal(g.state.seasonReports.history.length,SEASON_REPORT_LIMIT);
});

test('food use and pantry spoilage have their own season baselines across legacy saves',()=>{
 let g=new Game();g.reset(42,10);g.enterIsland();
 g.state.time=450;
 recordSimulationEvent(g,'food_consumed',0,'food',19);
 recordSimulationEvent(g,'food_spoiled',0,'food',5);
 updateSeasonReports(g);
 assert.deepEqual(currentSeasonReport(g).foodFlow,{eaten:0,spoiled:0,partial:false});
 recordSimulationEvent(g,'food_consumed',0,'food',8);
 recordSimulationEvent(g,'food_spoiled',0,'food',2);
 recordSimulationEvent(g,'food_spoiled',1,'food',13);
 g.state.time=900;updateSeasonReports(g);
 assert.deepEqual(g.state.seasonReports.history[0].foodFlow,{eaten:8,spoiled:2,partial:false});
 delete g.state.seasonReports.history[0].foodFlow;
 delete g.state.seasonReports.active.foodFlow;
 g.state.time=930;
 g=decodeGame(encodeGame(g));
 assert.equal(currentSeasonReport(g).foodFlow,undefined);
 updateSeasonReports(g);
 recordSimulationEvent(g,'food_consumed',0,'food',3);
 assert.deepEqual(currentSeasonReport(g).foodFlow,{eaten:3,spoiled:0,partial:true});
 assert.equal(g.state.seasonReports.history[0].foodFlow,undefined);
 const bad=structuredClone(g.state.seasonReports);
 bad.active.foodFlow.spoiled=-1;
 assert.equal(validSeasonReports(bad,g.state.time),false);
});

test('ready-food history excludes raw grain and fish, records finished meals once, and distinguishes bread nourishment',async()=>{
 const {receiveFood,takeFoodLot,readyFoodStock}=await import('../src/game/pantry.ts');
 const g=new Game();g.reset(42,10);g.enterIsland();const t=g.tribe(0);t.food=0;t.foodLots={};g.state.time=450;updateSeasonReports(g);
 receiveFood(g,0,8,'grain');receiveFood(g,0,6,'fish');let row=currentSeasonReport(g);
 assert.equal(row.totals.food,14);assert.deepEqual(row.readyFood,{produced:0,nourishmentProduced:0,received:0,nourishmentReceived:0,stock:0,nourishment:0,partial:false});
 assert.equal(takeFoodLot(g,0,'grain',4),true);receiveFood(g,0,4,'bread');assert.equal(takeFoodLot(g,0,'fish',4),true);receiveFood(g,0,4,'cookedFish');
 row=currentSeasonReport(g);assert.equal(row.totals.food,22,'gross receipts deliberately retain intermediate grain and fish');assert.equal(row.readyFood.received,8);assert.equal(row.readyFood.nourishmentReceived,8.8);assert.equal(row.readyFood.stock,8);assert.equal(row.readyFood.nourishment,8.8);assert.deepEqual(readyFoodStock(t),{units:8,nourishment:8.8});
 assert.equal(takeFoodLot(g,0,'bread',2),true);row=currentSeasonReport(g);assert.equal(row.readyFood.received,8);assert.equal(row.readyFood.stock,6);assert.equal(row.readyFood.nourishment,6.4);
 g.state.time=900;updateSeasonReports(g);assert.equal(g.state.seasonReports.history[0].readyFood.received,8);assert.equal(g.state.seasonReports.history[0].readyFood.stock,6);assert.equal(currentSeasonReport(g).readyFood.received,0);assert.equal(currentSeasonReport(g).readyFood.stock,6);
 assert.doesNotThrow(()=>decodeGame(encodeGame(g)));const bad=structuredClone(g.state.seasonReports);bad.history[0].readyFood.nourishmentReceived=-1;assert.equal(validSeasonReports(bad,g.state.time),false);
});

test('legacy ready-food history remains unrecorded and new partial measurement never invents old meal production',async()=>{
 const {receiveFood}=await import('../src/game/pantry.ts');let g=new Game();g.reset(42,10);g.enterIsland();g.state.time=450;updateSeasonReports(g);receiveFood(g,0,10,'bread');g.state.time=900;updateSeasonReports(g);
 delete g.state.seasonReports.history[0].readyFood;delete g.state.seasonReports.active.readyFood;
 g.state.time=930;g=decodeGame(encodeGame(g));const prior=structuredClone(g.state.seasonReports.history);assert.equal(currentSeasonReport(g).readyFood,undefined);updateSeasonReports(g);receiveFood(g,0,3,'berries');
 let row=currentSeasonReport(g);assert.equal(row.readyFood.received,3);assert.equal(row.readyFood.nourishmentReceived,3);assert.equal(row.readyFood.partial,true);assert.deepEqual(g.state.seasonReports.history,prior);
 g.state.time=1350;updateSeasonReports(g);row=g.state.seasonReports.history.at(-1);assert.equal(row.readyFood.received,3);assert.equal(row.readyFood.partial,true);assert.equal(g.state.seasonReports.history[0].readyFood,undefined);assert.equal(currentSeasonReport(g).readyFood.partial,false);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});

test('only a physically finished and delivered kitchen batch increases meals-made history',async()=>{
 const {receiveFood}=await import('../src/game/pantry.ts');const {beginProduction,productionIssue}=await import('../src/game/production.ts');
 const g=new Game();g.reset(42,10);g.enterIsland();g.state.units=[];g.state.buildings=[];for(const k of['trees','stones','forage','fish','copper','iron','wildlife'])g.state[k]=[];
 g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.state.time=450;g.state.autoWorkEnabled=false;g.state.conflict='quiet';g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.visitorTimer=900;g.state.encounter=undefined;for(const t of g.state.tribes)t.thinkT=10000;
 const t=g.tribe(0);Object.assign(t,{wood:20,food:100,foodLots:{provisions:100},items:{rawMeat:4}});t.survival.waterLiters=100;g.state.campSites=[{team:0,x:0,z:30}];const hall=g.makeBld('townhall',0,30,0),hearth=g.makeBld('hearth',12,30,0);g.state.buildings.push(hall,hearth);for(const b of g.state.buildings)b.y=4;g.rebuildWalk();g.vision.fill(2);const u=g.spawnUnit('worker',0,36,0);u.y=4;u.order='hold';u.jobLock=false;
 updateSeasonReports(g);receiveFood(g,0,5,'berries');receiveFood(g,0,3,'bread');assert.equal(currentSeasonReport(g).readyFood.produced,0,'trade/gathered food is a receipt, not village kitchen production');
 assert.equal(beginProduction(g,'cookMeat',hearth.id,u.id),true,productionIssue(g,'cookMeat',hearth.id,u.id));const p=g.state.production.projects.at(-1);assert.equal(currentSeasonReport(g).readyFood.produced,0,'committing raw inputs is not a meal');
 for(let i=0;i<1400&&p.phase!=='complete';i++){g.state.paused=false;g.step(.1);}assert.equal(p.phase,'complete',JSON.stringify(p));const row=currentSeasonReport(g);assert.equal(row.readyFood.produced,4);assert.equal(row.readyFood.nourishmentProduced,4);assert.equal(row.readyFood.received,12);assert.equal(g.state.production.metrics.consumed.rawMeat,4);assert.deepEqual(g.simulationErrors,[]);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
