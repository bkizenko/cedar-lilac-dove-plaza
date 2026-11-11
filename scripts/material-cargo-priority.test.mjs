import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';

function fixture(){
 const g=new Game();g.reset(42,10);g.enterIsland();g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];
 g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,30,0)];
 for(const k of ['trees','stones','forage','fish','copper','iron','wildlife'])g.state[k]=[];
 g.state.autoWorkEnabled=true;g.state.conflict='quiet';g.state.time=950;
 Object.assign(g.tribe(0),{food:1000,foodLots:{provisions:1000},items:{},wood:100});
 for(const b of g.state.buildings)b.y=4;g.rebuildWalk();g.vision.fill(2);
 const u=g.spawnUnit('worker',18,40,0);Object.assign(u,{order:'gather',job:'food',jobLock:false,carry:0,itemCargo:{grainSheaves:40}});
 return {g,u};
}
function deliver(g,u){
 for(let i=0;i<1000&&u.itemCargo;i++){g.state.time+=.1;g.navBudget=4;g.workerAI(u,.1);}
 assert.equal(u.itemCargo,undefined,'the resident physically unloads the whole material load');
 assert.equal(g.tribe(0).items.grainSheaves,40,'the original sheaves reach storage once');
 assert.ok(Math.hypot(u.x-18,u.z-40)>1,'delivery requires walking from the original position');
}

test('turning Auto work off still sends harvested sheaves to storage',()=>{
 const {g,u}=fixture();g.setAutoWork(false);
 assert.equal(u.order,'return');assert.equal(u.itemCargo.grainSheaves,40);deliver(g,u);
});
test('work assignment delivers material cargo before selecting another task, including manual mode',()=>{
 for(const automatic of [true,false]){
  const {g,u}=fixture();g.state.autoWorkEnabled=automatic;u.order='idle';u.workCheckAt=99999;
  g.workBoard.assign(g,u);assert.equal(u.order,'return');assert.equal(u.node,null);deliver(g,u);
 }
});
test('Secure food focus preserves and delivers the already harvested sheaf load',()=>{
 const {g,u}=fixture();u.order='return';g.setLaborPriority('food');
 assert.equal(u.order,'return');assert.equal(g.state.laborPolicy,'food');deliver(g,u);
});
