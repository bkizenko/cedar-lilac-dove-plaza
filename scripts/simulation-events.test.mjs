import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {receiveFood,consumeAndSpoilFood} from '../src/game/pantry.ts';
import {recordSimulationEvent,supplyAccounting,validSimulationEvents,SIMULATION_EVENT_RULES} from '../src/game/simulationEvents.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
test('actual receipt, consumption and spoilage balance food stock with independent bounded events',()=>{
 const g=new Game();g.reset(42,9);const start=g.tribe(0).food;g.state.simulationEvents=undefined;
 receiveFood(g,0,30,'berries');consumeAndSpoilFood(g,0,.5,10);const a=supplyAccounting(g);
 assert.equal(a.foodReceived,30);assert.ok(a.foodSpoiled>0);assert.equal(a.foodConsumed,5);assert.ok(Math.abs(start+a.foodReceived-a.foodConsumed-a.foodSpoiled-g.tribe(0).food)<1e-9);
 for(let i=0;i<300;i++)recordSimulationEvent(g,'cargo_delivered',0,'wood',2,1);
 assert.equal(g.state.simulationEvents.recent.length,SIMULATION_EVENT_RULES.recentLimit);assert.equal(supplyAccounting(g).cargoDelivered.wood,600);assert.equal(validSimulationEvents(g.state.simulationEvents),true);
 const restored=decodeGame(encodeGame(g));assert.deepEqual(supplyAccounting(restored),supplyAccounting(g));
 const corrupt=encodeGame(g);corrupt.state.simulationEvents.recent[0].amount=-1;assert.throws(()=>decodeGame(corrupt));
});
test('physical camp unloading records cargo once, including after recall and reload',()=>{
 const g=new Game();g.reset(42,10);g.enterIsland();const u=g.state.units.find(u=>u.team===0&&u.type==='worker'),c=g.campOf(0);Object.assign(u,{x:c.x,z:c.z,y:g.height(c.x,c.z),carry:7,carryType:'wood',order:'return'});
 g.workerAI(u,.1);g.workerAI(u,.1);assert.equal(supplyAccounting(g).cargoDelivered.wood,7);
 const r=decodeGame(encodeGame(g));const v=r.state.units.find(p=>p.id===u.id);Object.assign(v,{x:c.x,z:c.z,carry:3,carryType:'stone',recalled:true});r.workerAI(v,.1);assert.equal(supplyAccounting(r).cargoDelivered.stone,3);assert.equal(supplyAccounting(r).cargoDelivered.wood,7);
});
