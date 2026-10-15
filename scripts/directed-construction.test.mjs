import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {preserveFood,preservationAvailable} from '../src/game/pantry.ts';import {AGE_COST} from '../src/game/constants.ts';
function fixture(){const g=new Game();g.reset(345);g.enterIsland();g.world.heights.fill(4);g.state.buildings=[g.makeBld('townhall',0,0,0)];g.state.units=[];g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();const u=g.spawnUnit('worker',14,0,0);u.selected=true;Object.assign(g.tribe(0),{wood:0,stone:30,food:500});return {g,u};}
function drive(g,u,b,seconds=150){for(let i=0;i<seconds*10&&b.build<1;i++){g.state.time+=.1;g.navBudget=10;g.workerAI(u,.1);}}
test('direct construction overrides a locked food job and finishes a physically reachable storehouse',()=>{
 const {g,u}=fixture();g.tribe(0).wood=100;g.placeBuilding('warehouse',30,0);const b=g.state.buildings.at(-1);Object.assign(u,{job:'food',jobLock:true,order:'gather',node:null});
 assert.equal(g.orderConstruction(b),true);assert.equal(u.jobLock,false);drive(g,u,b);assert.equal(b.build,1);assert.equal(g.tribe(0).wood,40);
});
test('a loaded builder delivers first, retains the instruction in a save, then funds and builds once',()=>{
 const {g,u}=fixture();g.placeBuilding('warehouse',30,0);const b=g.state.buildings.at(-1);g.tribe(0).wood=52;Object.assign(u,{carry:8,carryType:'wood'});g.orderConstruction(b);
 let r=decodeGame(encodeGame(g));r.world.heights.fill(4);r.rebuildWalk();const v=r.state.units.find(p=>p.id===u.id),project=r.state.buildings.find(p=>p.id===b.id);assert.equal(v.buildOrder,b.id);drive(r,v,project);assert.equal(project.build,1);assert.equal(v.carry,0);assert.equal(r.tribe(0).wood,0);
});
test('the chosen builder walks out of an unpaid footprint before it becomes solid',()=>{
 const {g,u}=fixture();g.placeBuilding('warehouse',30,0);const b=g.state.buildings.at(-1);Object.assign(u,{x:30,z:0,y:4});g.tribe(0).wood=60;g.orderConstruction(b);drive(g,u,b);assert.equal(b.build,1);assert.equal(g.tribe(0).wood,0);assert.ok(Math.abs(u.x-b.x)>b.w*.4||Math.abs(u.z-b.z)>b.d*.4);
});
test('missing materials remain explicit and direct orders never provide free buildings',()=>{
 const {g,u}=fixture();g.placeBuilding('warehouse',30,0);const b=g.state.buildings.at(-1);g.orderConstruction(b);drive(g,u,b,20);assert.equal(b.build,0);assert.ok(b.plannedCost);assert.match(u.workReason,/Waiting for 60 logs/);g.interruptMission(u);assert.equal(u.buildOrder,undefined);
});
test('food preservation keeps the next age timber reserve rather than silently burning it',()=>{
 const {g,u}=fixture(),b=g.makeBld('warehouse',30,0,0),reserve=AGE_COST[1].wood;g.state.buildings.push(b);g.tribe(0).wood=reserve;assert.equal(preservationAvailable(g,b),false);preserveFood(g,u,b,80);assert.equal(g.tribe(0).wood,reserve);g.tribe(0).wood=reserve+1;preserveFood(g,u,b,8);assert.equal(g.tribe(0).wood,reserve);assert.equal(b.storeCare,.2);
});
