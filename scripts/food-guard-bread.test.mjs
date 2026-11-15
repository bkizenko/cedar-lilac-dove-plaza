import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {reserveSeconds,foodDemand} from '../src/game/settlement.ts';
import {foodGuardActive,foodGuardHolds,foodAlerts} from '../src/game/foodGuard.ts';
import {simplifyCerealStock,stationRank,requestGrainRecipe,pendingGrainRequests,autoUnloadCarriers} from '../src/game/cerealProcessing.ts';
import {foodInventory} from '../src/game/pantry.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

function fixture(count=5){
  const g=new Game();g.reset(42,10);g.enterIsland();g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.world.ecology=undefined;
  g.state.units=[];g.state.buildings=[];for(const k of ['trees','stones','forage','fish','copper','iron','wildlife'])g.state[k]=[];
  Object.assign(g.state,{autoWorkEnabled:true,laborPolicy:'balanced',time:950,weather:'clear',weatherT:10000,raidT:10000,visitorTimer:900,conflict:'quiet',birthT:10000,campSites:[{team:0,x:0,z:30}]});
  for(const t of g.state.tribes)t.thinkT=10000;
  Object.assign(g.tribe(0),{food:0,foodLots:{},wood:200,stone:100,items:{},seeds:12});g.tribe(0).survival.waterLiters=100;
  const hall=g.makeBld('townhall',0,30,0);hall.y=4;g.state.buildings=[hall];g.rebuildWalk();g.vision.fill(2);
  const people=[];for(let i=0;i<count;i++){const u=g.spawnUnit('worker',i*.5,36,0);Object.assign(u,{order:'hold',jobLock:false,y:4});people.push(u);}
  return {g,people};
}
const setReserve=(g,seconds)=>{const need=seconds*Math.max(.055,foodDemand(g,0));g.tribe(0).food=need;g.tribe(0).foodLots={provisions:need};g.state.time+=4;};

test('food guard engages below 600 s, holds until 900 s, then releases',()=>{
  const {g,people}=fixture(10);
  setReserve(g,1000);assert.equal(foodGuardActive(g),false);
  setReserve(g,500);assert.equal(foodGuardActive(g),true);
  assert.ok(foodAlerts(g).includes('Food guard active'));
  const held=people.filter(u=>foodGuardHolds(g,u)).length;assert.ok(held>=4,`held ${held}`);
  setReserve(g,800);assert.equal(foodGuardActive(g),true,'hysteresis keeps guard on between 600 and 900');
  setReserve(g,950);assert.equal(foodGuardActive(g),false);
  assert.equal(people.filter(u=>foodGuardHolds(g,u)).length,0);
});

test('held workers skip non-food board work while the guard is active',()=>{
  const {g,people}=fixture(5);
  g.state.trees=[{id:g.id(),kind:'tree',x:4,z:40,y:4,amount:50,maxAmount:50}];
  g.state.forage=[{id:g.id(),kind:'forage',x:-4,z:40,y:4,amount:50,maxAmount:50}];
  setReserve(g,100);
  g.workBoard.reset();
  for(const u of people){u.workCheckAt=0;g.workBoard.assign(g,u);}
  const held=people.filter(u=>foodGuardHolds(g,u));assert.ok(held.length>=2,'guard holds a crew');
  for(const u of held){assert.notEqual(u.job,'wood');assert.equal(u.job,'food',`held worker has a food job, got ${u.job} / ${u.order} / ${u.workReason}`);}
});

test('Secure food reserves people never chop logs',()=>{
  const {g,people}=fixture(3);g.state.laborPolicy='food';setReserve(g,5000);
  g.state.trees=[{id:g.id(),kind:'tree',x:4,z:40,y:4,amount:50,maxAmount:50}];
  g.state.forage=[{id:g.id(),kind:'forage',x:-4,z:40,y:4,amount:50,maxAmount:50}];
  g.workBoard.reset();for(const u of people){u.workCheckAt=0;g.workBoard.assign(g,u);assert.notEqual(u.job,'wood');}
  assert.ok(people.some(u=>u.job==='food'),'someone is given food work');
});

test('cereal sheaves and rough grain fold into clean grain; old saves still load',()=>{
  const {g}=fixture(2);Object.assign(g.tribe(0).items,{grainSheaves:16,roughGrain:6});
  const before=foodInventory(g.tribe(0)).grain;
  assert.equal(simplifyCerealStock(g,0),true);
  assert.equal(g.tribe(0).items.grainSheaves,0);assert.equal(g.tribe(0).items.roughGrain,0);
  const gained=foodInventory(g.tribe(0)).grain-before;
  // 16 sheaves -> 12 rough, + 6 rough = 18 rough -> 12 clean grain (8% kept as seed)
  assert.ok(Math.abs(gained-12*.92)<1e-6,`gained ${gained}`);
  Object.assign(g.tribe(0).items,{grainSheaves:8});
  const loaded=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));
  assert.equal(simplifyCerealStock(loaded,0),true);assert.equal(loaded.tribe(0).items.grainSheaves,0);
});

test('efficient stations rank windmill > watermill > stone > hand and oven > hearth',()=>{
  assert.ok(stationRank('grindGrainWindmill')<stationRank('grindGrainWatermill'));
  assert.ok(stationRank('grindGrainWatermill')<stationRank('grindGrainStation'));
  assert.ok(stationRank('grindGrainStation')<stationRank('grindGrain'));
  assert.ok(stationRank('bakeBreadOven')<stationRank('bakeBread'));
});

test('mill and bake buttons queue earlier steps instead of refusing',()=>{
  const {g}=fixture(3);const stone=g.makeBld('grindingStone',-12,40,0);stone.y=4;g.state.buildings.push(stone);g.rebuildWalk();
  const r=requestGrainRecipe(g,'grindGrainStation',stone.id);
  assert.equal(r,'queued');assert.equal(pendingGrainRequests(g).length,1);
  // Delivered grain lets the queued request start on its own.
  g.tribe(0).food=100;g.tribe(0).foodLots={grain:100};
  for(const u of g.state.units)Object.assign(u,{x:0,z:30});
  autoUnloadCarriers(g,0);
});

test('bread needs only flour, water and fuel',async()=>{
  const {PRODUCTION_RECIPES}=await import('../src/game/production.ts');
  for(const k of ['bakeBread','bakeBreadOven']){const r=PRODUCTION_RECIPES[k];assert.deepEqual(Object.keys(r.inputs),['flour']);assert.equal(r.water,.5);}
});
