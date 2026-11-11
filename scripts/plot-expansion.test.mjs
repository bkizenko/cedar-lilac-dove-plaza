import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {planExpansion,grainExpansionPracticeIssue} from '../src/game/plotExpansion.ts';
import {beginProduction,occupiedProductionSlots,productionIssue,productionSlots} from '../src/game/production.ts';
import {initializeSurvival} from '../src/game/survivalNeeds.ts';
import {supplyDrops,supplyApproach} from '../src/game/campAnchor.ts';
import {BUILDINGS} from '../src/game/constants.ts';import {fieldProductionReport} from '../src/game/productionReport.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(type='warehouse'){
 const g=new Game();g.reset(345,2);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,40,0)];
 for(const k of ['trees','stones','forage','copper','iron','fish','wildlife'])g.state[k]=[];
 g.state.weather='clear';g.vision.fill(2);Object.assign(g.tribe(0),{wood:500,seeds:100,food:1200,cultivated:['grain']});
 const b=g.makeBld(type,30,40,0);g.state.buildings.push(b);g.rebuildWalk();const u=g.spawnUnit('worker',18,40,0);u.selected=true;return {g,b,u};
}
function drive(g,u,b,seconds=240){for(let i=0;i<seconds*10&&b.expansion;i++){g.state.time+=.1;g.navBudget=10;g.workerAI(u,.1);}}
test('a finished store keeps its capacity until a real builder funds and finishes the extension',()=>{
 const {g,b,u}=fixture(),cap=g.stockCap();assert.equal(planExpansion(g,b,'w'),true);assert.equal(g.stockCap(),cap);assert.equal(g.tribe(0).wood,500);
 drive(g,u,b);assert.equal(b.expansion,undefined);assert.equal(b.w,BUILDINGS.warehouse.w*2);assert.equal(g.stockCap(),cap+200);assert.equal(g.tribe(0).wood,440);
 assert.ok(Math.abs(u.x-b.x)>=b.w/2+u.r||Math.abs(u.z-b.z)>=b.d/2+u.r,'builder finishes outside the newly solid store');
});
test('paid expansion survives a save without double payment',()=>{
 const {g,b,u}=fixture();planExpansion(g,b,'w');g.orderConstruction(b);
 for(let i=0;i<1000&&!b.expansion.paid;i++){g.navBudget=10;g.workerAI(u,.1);}
 assert.equal(b.expansion.paid,true);const r=decodeGame(encodeGame(g));r.world.heights.fill(4);r.rebuildWalk();const rb=r.state.buildings.find(n=>n.id===b.id),ru=r.state.units.find(n=>n.id===u.id);
 drive(r,ru,rb);assert.equal(rb.expansion,undefined);assert.equal(r.tribe(0).wood,440);
});
test('missing supplies never disable the old store or grant free area',()=>{
 const {g,b,u}=fixture();g.tribe(0).wood=0;const cap=g.stockCap();planExpansion(g,b,'d');g.orderConstruction(b);drive(g,u,b,30);
 assert.equal(b.expansion.paid,false);assert.equal(b.expansion.progress,0);assert.equal(g.stockCap(),cap);assert.equal(g.finished(b),true);
 g.tribe(0).wood=60;drive(g,u,b);assert.equal(b.expansion,undefined);assert.equal(g.tribe(0).wood,0);
});
test('field enlargement preserves planted area and an existing harvest, with correct workload forecasts',()=>{
 const {g,b,u}=fixture('farm');b.crop={year:1,planted:1,tended:1,remaining:130,ripened:true};planExpansion(g,b,'w');g.orderConstruction(b);drive(g,u,b);
 assert.equal(b.expansion,undefined);assert.equal(b.crop.remaining,130);assert.equal(b.crop.planted,.5);assert.equal(g.tribe(0).seeds,96);
 b.crop=undefined;const small={...b,w:BUILDINGS.farm.w};assert.equal(fieldProductionReport(g,b).workSeconds,fieldProductionReport(g,small).workSeconds*2);
});
test('extensions reserve their footprint against another plan and reject obstructed or malformed sizes',()=>{
 const {g,b}=fixture();assert.equal(planExpansion(g,b,'w'),true);assert.equal(planExpansion(g,b,'d'),false);
 assert.notEqual(g.placementIssue('hut',39,40),null);
 const raw=encodeGame(g);raw.state.buildings.find(n=>n.id===b.id).expansion.progress=.5;assert.throws(()=>decodeGame(raw));
 b.expansion=undefined;g.state.trees=[{id:999,x:35,z:40,amount:8}];assert.equal(planExpansion(g,b,'w'),false);
});

test('legacy direct-builder pause flags load without changing the finished store',()=>{const {g,b}=fixture();b.planPaused=false;const r=decodeGame(encodeGame(g));const restored=r.state.buildings.find(n=>n.id===b.id);assert.equal(restored.planPaused,undefined);assert.equal(restored.build,1);});

test('grain workshops require demonstrated practice and retain base slots until a paid extension finishes',()=>{
 for(const [type,recipe,baseSlots] of [
  ['threshingFloor','threshCerealFloor',2],
  ['grindingStone','grindGrainStation',1],
  ['oven','bakeBreadOven',2],
 ]){
  let {g,b,u}=fixture(type);
  const cost=BUILDINGS[type];
  g.tribe(0).stone=100;
  assert.equal(planExpansion(g,b,'w'),false);
  assert.match(grainExpansionPracticeIssue(g,b),/0\/3/);
  g.tribe(0).productionPractice={[recipe]:{batches:3,failedBatches:0,usefulOutputs:12,firstAt:g.state.time,lastAt:g.state.time,makers:[u.id]}};
  assert.equal(grainExpansionPracticeIssue(g,b),null);
  assert.equal(planExpansion(g,b,'w'),true,g.state.banner);
  assert.equal(productionSlots(b),baseSlots);
  assert.equal(g.tribe(0).wood,500);
  assert.equal(g.tribe(0).stone,100);
  g.orderConstruction(b);
  for(let i=0;i<1000&&!b.expansion.paid;i++){g.navBudget=10;g.workerAI(u,.1);}
  assert.equal(b.expansion.paid,true);
  assert.equal(productionSlots(b),baseSlots);
  const snapshot=encodeGame(g),buildingId=b.id,unitId=u.id;
  g=decodeGame(snapshot);
  g.world.heights.fill(4);g.rebuildWalk();
  b=g.state.buildings.find(n=>n.id===buildingId);u=g.state.units.find(n=>n.id===unitId);
  drive(g,u,b);
  assert.equal(b.expansion,undefined);
  assert.equal(b.w,cost.w*2);
  assert.equal(productionSlots(b),baseSlots+1);
  assert.equal(g.tribe(0).wood,500-cost.wood);
  assert.equal(g.tribe(0).stone,100-cost.stone);
  assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
 }
});

test('an extended oven accepts three concurrent funded batches and validates them after save',()=>{
 const {g,b,u}=fixture('oven'),t=g.tribe(0);
 t.stone=100;
 t.productionPractice={bakeBreadOven:{batches:3,failedBatches:0,usefulOutputs:12,firstAt:g.state.time,lastAt:g.state.time,makers:[u.id]}};
 assert.equal(planExpansion(g,b,'w'),true);
 drive(g,u,b);
 assert.equal(productionSlots(b),3);
 t.items={flour:24};
 initializeSurvival(g);
 t.survival.waterLiters=24;
 const crew=Array.from({length:4},()=>g.spawnUnit('worker',20,40,0));
 const logs=t.wood;
 for(const worker of crew.slice(0,3)){
  const cache=supplyDrops(g,0).map(drop=>supplyApproach(g,worker,drop)).find(Boolean);
  assert.ok(cache);
  Object.assign(worker,cache);
  assert.equal(beginProduction(g,'bakeBreadOven',b.id,worker.id,true),true,productionIssue(g,'bakeBreadOven',b.id,worker.id,true));
 }
 assert.equal(occupiedProductionSlots(g,b),3);
 assert.equal(t.items.flour,12);
 assert.equal(t.wood,logs-3);
 assert.match(productionIssue(g,'bakeBreadOven',b.id,crew[3].id,true),/slots/);
 const r=decodeGame(encodeGame(g));
 assert.equal(occupiedProductionSlots(r,r.state.buildings.find(n=>n.id===b.id)),3);
});
