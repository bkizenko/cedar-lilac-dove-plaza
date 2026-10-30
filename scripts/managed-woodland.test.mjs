import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {tickManagedWoodland,plantingAI} from '../src/game/cultivation.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);g.state.buildings=[g.makeBld('lumber',0,0,0)];g.state.laborPolicy='wood';g.state.time=1;g.tribe(0).seeds=10;g.vision.fill(2);g.state.trees=Array.from({length:5},(_,i)=>({id:g.id(),kind:'tree',x:8+i*3,z:8,y:4,amount:0,maxAmt:20,regenT:6000,scale:1,rich:1}));g.state.units=[];for(let i=0;i<3;i++)g.spawnUnit('worker',i,0,0);g.rebuildWalk();return g;}
test('wood focus plants from spare seeds, retains farming reserve and keeps timber finite',()=>{
 const g=fixture();assert.equal(tickManagedWoodland(g,59),0);assert.equal(tickManagedWoodland(g,1),2);assert.equal(g.tribe(0).seeds,8);
 assert.equal(g.state.trees.filter(n=>n.planted).length,0);assert.equal(g.state.units.filter(u=>u.plantingWork).length,2);assert.ok(g.state.trees.every(n=>n.amount===0));
 const copy=decodeGame(encodeGame(g));assert.equal(copy.state.units.filter(u=>u.plantingWork).length,2);assert.equal(copy.tribe(0).seeds,8);
 for(let i=0;i<1500&&g.state.units.some(u=>u.plantingWork);i++){g.state.time+=.1;g.navBudget=10;for(const u of g.state.units)plantingAI(g,u,.1);}
 assert.equal(g.state.trees.filter(n=>n.planted).length,2);assert.ok(g.state.trees.every(n=>n.amount===0));
});
test('winter, other priorities and unfunded lumber plans do not auto plant',()=>{
 for(const mode of ['winter','priority','plan']){const g=fixture();if(mode==='winter')g.state.time=1400;if(mode==='priority')g.state.laborPolicy='food';if(mode==='plan')g.state.buildings[0].plannedCost={wood:16};assert.equal(tickManagedWoodland(g,60),0);assert.equal(g.tribe(0).seeds,10);}
});

test('direct orders cancel planting and return the unused seed only once',()=>{
 const g=fixture();tickManagedWoodland(g,60);const u=g.state.units.find(u=>u.plantingWork);
 const seeds=g.tribe(0).seeds;g.interruptMission(u);assert.equal(u.plantingWork,undefined);assert.equal(g.tribe(0).seeds,seeds+1);g.interruptMission(u);assert.equal(g.tribe(0).seeds,seeds+1);
 const raw=encodeGame(g);raw.state.units[0].plantingWork={treeId:1,progress:50};assert.throws(()=>decodeGame(raw));
});
