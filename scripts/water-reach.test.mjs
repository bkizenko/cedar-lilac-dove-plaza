import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {fishWaterReach,surveyReachFish,waterReachAt,waterReachReport,workReachClay} from '../src/game/waterReach.ts';

function fixture(){
 const g=new Game();
 g.reset(42,10);g.enterIsland();
 g.world.rivers=[{pts:[{x:-60,z:0},{x:60,z:0}],w:8}];
 g.world.waterBodies=[];
 g.waterAt=()=>3;
 g.height=(x,z)=>Math.abs(z)<=3||z>=13&&z<=17?2:4;
 g.walkable=(x,z)=>g.height(x,z)>3;
 g.exploredAt=()=>true;
 g.workBoard.connected=()=>true;
 g.state.fish=[];
 g.state.units=[];
 return g;
}

test('an explored reach reports only connected fish, with a real dry-bank order',()=>{
 const g=fixture();
 const node=(z,amount)=>({id:g.id(),kind:'fish',x:0,z,y:3.1,amount,maxAmt:20,regenT:60,scale:1,rich:1});
 const connected=node(1,12),isolated=node(15,20);
 g.state.fish.push(connected,isolated);
 const u=g.spawnUnit('worker',0,8,0);
 u.order='hold';
 const reach=waterReachAt(g,{x:0,z:0});
 assert.equal(reach.kind,'river');
 assert.equal(waterReachAt(g,{x:0,z:8}),null);
 assert.equal(waterReachReport(g,reach).fishCount,12);
 assert.equal(fishWaterReach(g,reach),true);
 assert.equal(u.node,connected);
 assert.equal(u.order,'gather');
 connected.amount=0;
 const depleted=waterReachReport(g,reach);
 assert.equal(depleted.fishCapacity,20);
 assert.ok(depleted.fishRecovery>0);
 assert.equal(fishWaterReach(g,reach),false);
});

test('click surveys keep depleted nodes and clay work uses the selected reach only',()=>{
 const g=fixture(),reach=waterReachAt(g,{x:0,z:0});
 surveyReachFish(g,reach);
 assert.ok(g.state.fish.length>0);
 const oldNodes=[...g.state.fish];
 oldNodes[0].amount=0;
 surveyReachFish(g,reach);
 assert.deepEqual(g.state.fish,oldNodes);
 assert.equal(oldNodes[0].amount,0);
 const u=g.spawnUnit('worker',0,8,0);
 u.order='hold';
 assert.equal(workReachClay(g,reach,true),true);
 const surveyed=waterReachReport(g,reach);
 assert.ok(surveyed.clayCapacity>0);
 assert.equal(workReachClay(g,reach,false),true);
 assert.equal(u.clayWork.depositId,surveyed.digger.deposit.id);
 assert.equal(u.clayWork.loaded,0);
});
