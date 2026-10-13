import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {AGE_COST,BUILDINGS} from '../src/game/constants.ts';
import {missingAgeBuildings,ageFoodReserve,AGE_BUILDING_VARIETY} from '../src/game/advancement.ts';
import {developRivalInstitutions} from '../src/game/rivalDevelopment.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

function fixture(team=0){
 const g=new Game();g.reset(123456,2);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[];
 for(const [i,type] of ['townhall','hut','farm','warehouse','workshop'].entries())g.state.buildings.push(g.makeBld(type,i*14,38,team));
 for(let i=0;i<12;i++)g.spawnUnit('worker',i%4,50+Math.floor(i/4),team);
 Object.assign(g.tribe(team),{food:2000,wood:2000,stone:2000,copper:2000,iron:2000,age:0});
 g.state.time=200;g.state.weather='clear';g.rebuildWalk();return g;
}

test('Bronze demands settlement scale and a completed crafting institution, not only a stockpile',()=>{
 const g=fixture();g.state.units.pop();assert.match(g.ageUpIssue(0),/12 residents/);
 g.spawnUnit('worker',0,50,0);const workshop=g.state.buildings.find(b=>b.type==='workshop');workshop.build=.9;
 assert.match(g.ageUpIssue(0),/Crafting shelter/);workshop.build=1;assert.equal(g.ageUpIssue(0),null);
 const cost=AGE_COST[1];assert.equal(cost.wood,300);assert.equal(cost.stone,120);
 const before={...g.tribe(0)};g.commitAge(0,'econ');
 assert.equal(g.tribe(0).age,1);assert.equal(g.tribe(0).food,before.food-cost.food);assert.equal(g.tribe(0).wood,before.wood-cost.wood);
});

test('a transition cannot empty the pantry and gives useful storage guidance',()=>{
 const g=fixture(),t=g.tribe(0),cost=AGE_COST[1];t.food=cost.food;
 assert.match(g.ageUpIssue(),/Keep .* food.*Expand food storage/);
 g.commitAge(0,'econ');assert.equal(t.age,0);assert.equal(t.food,cost.food);
 t.food=cost.food+ageFoodReserve(g,0);assert.equal(g.ageUpIssue(),null);
 g.commitAge(0,'econ');assert.equal(t.age,1);assert.ok(t.food>=ageFoodReserve(g,0));
});

test('all era infrastructure and material prerequisites are obtainable before entering that era',()=>{
 const g=fixture();g.state.buildings=[];
 for(let age=0;age<5;age++){
  g.tribe(0).age=age;
  for(const kind of missingAgeBuildings(g,0))assert.ok(BUILDINGS[kind].age<=age,`${kind} is available before the destination age`);
  if(age===0)assert.equal(AGE_COST[age+1].copper||0,0);
  if(age<2)assert.equal(AGE_COST[age+1].iron||0,0);
  assert.ok(AGE_BUILDING_VARIETY[age+1]<=Object.values(BUILDINGS).filter(b=>b.age<=age).length);
  if(age>0)assert.ok(AGE_COST[age+1].pop>AGE_COST[age].pop);
 }
});

test('saved advanced societies retain their age and a stale choice rechecks completed infrastructure',()=>{
 const g=fixture();g.tryAgeUp();assert.equal(g.state.pendingAge,true);
 const before=g.tribe(0).food;g.state.buildings.find(b=>b.type==='workshop').hp=0;
 g.commitAge(0,'econ');assert.equal(g.tribe(0).age,0);assert.equal(g.tribe(0).food,before);
 g.tribe(0).age=4;g.state.age=4;g.state.agePicks=['econ','econ','army','econ'];
 const restored=decodeGame(encodeGame(g));assert.equal(restored.tribe(0).age,4);assert.equal(restored.state.age,4);
});

test('rivals pay for required current-era institutions and builders still have to finish them',()=>{
 const g=fixture(1);g.state.buildings=g.state.buildings.filter(b=>b.type!=='workshop');g.rebuildWalk();
 const before=g.tribe(1).wood;assert.equal(developRivalInstitutions(g,1),true);
 const workshop=g.state.buildings.find(b=>b.type==='workshop');assert.ok(workshop);assert.equal(workshop.build,0);
 assert.equal(g.tribe(1).wood,before-BUILDINGS.workshop.wood);
 assert.match(g.ageUpIssue(1),/Crafting shelter/);assert.equal(developRivalInstitutions(g,1),false,'one pending plan is enough');
 assert.ok(g.state.units.some(u=>u.order==='build'&&u.node===workshop));
 workshop.build=1;assert.equal(g.ageUpIssue(1),null);
});
