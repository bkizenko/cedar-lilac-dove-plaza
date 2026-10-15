import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {staffQuarry,quarryReport} from '../src/game/mining.ts';import {knownSettlement} from '../src/game/barter.ts';import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(345);g.enterIsland();g.world.heights.fill(4);g.state.buildings=[g.makeBld('townhall',0,0,0)];g.state.units=[];g.state.trees=[];g.state.forage=[];g.state.stones=[];g.vision.fill(2);g.rebuildWalk();return g;}
test('quarry staffing sends two miners to actual outcrops and physically delivers finite stone',()=>{
 const g=fixture(),q=g.makeBld('quarry',24,25,0);g.state.buildings.push(q);g.state.stones=[{id:g.id(),kind:'stone',x:20,z:25,y:4,amount:40,maxAmt:40,regenT:0,scale:1,rich:1}];
 const u=g.spawnUnit('worker',22.8,25,0),v=g.spawnUnit('worker',23,28,0);g.spawnUnit('worker',24,30,0);g.rebuildWalk();const before=g.tribe(0).stone;
 assert.equal(staffQuarry(g,q.id),2);assert.match(quarryReport(g,q),/40 stone nearby/);assert.equal(g.state.units.filter(p=>p.job==='stone').length,2);
 for(let i=0;i<1800&&g.tribe(0).stone===before;i++){g.state.time+=.1;g.navBudget=10;g.workerAI(u,.1);g.workerAI(v,.1);}
 assert.ok(g.tribe(0).stone>before,'stone arrives only after carrying it to the hall');assert.ok(g.state.stones[0].amount<40);assert.ok(g.state.stones[0].amount>=0);
});
test('an exhausted surface quarry explains its shortage without creating stone',()=>{
 const g=fixture(),q=g.makeBld('quarry',24,25,0);g.state.buildings.push(q);g.spawnUnit('worker',22,25,0);const before=g.tribe(0).stone;assert.equal(staffQuarry(g,q.id),0);assert.match(quarryReport(g,q),/0 stone nearby/);assert.equal(g.tribe(0).stone,before);
});
test('visiting village outskirts records discovery and map markers follow the actual hall',()=>{
 const g=fixture();g.vision.fill(0);g.state.buildings.push(g.makeBld('townhall',150,150,1),g.makeBld('hut',174,150,1));
 assert.equal(knownSettlement(g,1),false);g.stampVision(174,150,7,1);assert.equal(g.exploredAt(150,150),false);assert.equal(knownSettlement(g,1),true);
 const mark=g.snapshot().camps.find(c=>c.team===1);assert.equal(mark.known,true);assert.equal(mark.x,174);assert.equal(mark.z,150);const loaded=decodeGame(encodeGame(g));assert.equal(knownSettlement(loaded,1),true);
});
test('meeting a distant person alone does not reveal the location of their settlement',()=>{
 const g=fixture();g.vision.fill(0);g.state.buildings.push(g.makeBld('townhall',150,150,1));g.state.contacts=[1];assert.equal(knownSettlement(g,1),false);
});
