import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {rivalSiteClearance,buildingBlocksTreeRegrowth} from '../src/game/rivalConstruction.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

function fixture(){
 const g=new Game();g.reset(123456,2);g.enterIsland();g.world.heights.fill(4);
 g.state.buildings=[g.makeBld('townhall',0,38,1)];g.state.units=[];
 g.state.trees=[];g.state.stones=[];g.state.forage=[];g.state.fish=[];g.state.wildlife=[];
 g.state.time=200;g.state.weather='clear';
 Object.assign(g.tribe(1),{food:800,seeds:20,wood:90,stone:10,age:0});
 const u=g.spawnUnit('worker',14,38,1);u.job=null;u.order='build';
 const b=g.makeBld('lumber',22,38,1);b.build=0;g.state.buildings.push(b);u.node=b;
 const tree={id:g.id(),kind:'tree',x:22,y:4,z:38,amount:5,maxAmt:5,regenT:0,scale:1,rich:1};g.state.trees=[tree];g.rebuildWalk();return {g,u,b,tree};
}

test('a rival builder physically clears the paid footprint, delivers logs and resumes the same project',()=>{
 const {g,u,b,tree}=fixture(),stock=g.tribe(1).wood,id=b.id;
 g.buildAI(u,.1);assert.equal(u.order,'gather','real build executor queues ordinary tree clearance');assert.equal(u.node,tree);
 assert.equal(tree.amount,5,'dispatch cannot erase a tree');assert.equal(b.build,0);assert.equal(g.tribe(1).wood,stock);
 let carried=0,moved=false;
 for(let i=0;i<5000&&g.tribe(1).wood===stock;i++){
  g.state.time+=.1;g.navBudget=10;g.workerAI(u,.1);carried=Math.max(carried,u.carry);moved ||= Math.abs(u.x-14)>.5;
  assert.equal(b.build,0,'cutting/return trips do not count as construction');
 }
 assert.ok(moved);assert.ok(carried>0);assert.equal(tree.amount,0);assert.ok(g.tribe(1).wood>stock);assert.equal(u.carry,0);
 assert.equal(g.state.buildings.find(v=>v.id===id),b);
 u.order='build';u.node=b;
 for(let i=0;i<2000&&b.build<1;i++){g.state.time+=.1;g.navBudget=10;g.buildAI(u,.1);}
 assert.equal(b.build,1);assert.equal(g.state.buildings.filter(v=>v.id===id).length,1);
 const restored=decodeGame(encodeGame(g));assert.equal(restored.state.buildings.find(v=>v.id===id).build,1);
});

test('standing footprint trees block build progress while unavailable, preserving unrelated goods and woodland',()=>{
 const {g,u,b,tree}=fixture();const outside={...tree,id:g.id(),x:40};g.state.trees.push(outside);
 u.carry=3;u.carryType='stone';assert.equal(rivalSiteClearance(g,u,b),true);assert.equal(u.order,'return');assert.equal(u.carry,3);assert.equal(u.carryType,'stone');
 u.carry=0;u.carryType=null;u.order='build';u.node=b;const nearest=g.nearestWalk;g.nearestWalk=()=>null;
 assert.equal(rivalSiteClearance(g,u,b),true);assert.equal(tree.amount,5);assert.equal(outside.amount,5);assert.equal(b.build,0);assert.match(u.workReason,/waiting/);
 g.nearestWalk=nearest;tree.amount=0;assert.equal(rivalSiteClearance(g,u,b),false);assert.equal(outside.amount,5);
 b.team=0;tree.amount=5;assert.equal(rivalSiteClearance(g,u,b),false,'player orders unchanged');
});

test('occupied plots pause stump regrowth without deleting nodes and release it after demolition',()=>{
 const {g,b,tree}=fixture();tree.amount=0;tree.regenT=2;b.build=1;
 const outside={...tree,id:g.id(),x:40};g.state.trees.push(outside);
 assert.equal(buildingBlocksTreeRegrowth(g,tree),true);assert.equal(buildingBlocksTreeRegrowth(g,outside),false);
 const before=tree.regenT;g.tickRegen(10);
 assert.equal(tree.amount,0);assert.equal(tree.regenT,before);assert.ok(outside.amount>0);assert.ok(g.state.trees.includes(tree));
 b.hp=0;assert.equal(buildingBlocksTreeRegrowth(g,tree),false);g.tickRegen(10);assert.ok(tree.amount>0);
});
