import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
// A second person sent to the exact spot another resident stands on arrives
// beside them instead of pushing at the occupied point forever.
function setup(){const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);g.state.weather='clear';g.state.units=[];
 const hall=g.makeBld('townhall',0,38,0);g.state.buildings=[hall];Object.assign(g.tribe(0),{wood:100,stone:50,age:1});g.vision.fill(2);g.rebuildWalk();return g;}
function run(g,secs){for(let i=0;i<secs*20;i++){g.state.time+=.05;g.navBudget=8;for(const u of g.state.units)g.workerAI?.(u,.05);g.separate(.05);}}
test('a second person sent onto an occupied spot stops beside the one standing there',()=>{
 const g=setup();const a=g.spawnUnit('worker',20,0,0),b=g.spawnUnit('worker',30,0,0);
 for(const u of [a,b])u.y=g.travelHeight(u.x,u.z);
 a.order='hold';a.stationOnArrival=true;a.tx=a.x;a.tz=a.z;
 b.order='move';b.tx=a.x;b.tz=a.z;b.stationOnArrival=true;b.workReason='Moving to your destination, then waiting for orders';
 run(g,20);
 assert.notEqual(b.order,'move','still trying to reach the occupied spot: '+b.workReason+' at '+Math.hypot(b.x-a.x,b.z-a.z).toFixed(2)+' m');
 assert.ok(Math.hypot(b.x-a.x,b.z-a.z)<2.5,'arrived next to the resident');
 assert.ok(Math.abs(a.x-20)<1.2&&Math.abs(a.z)<1.2,'the standing resident was not shoved away');
});
test('a free spot is still reached exactly',()=>{
 const g=setup();const b=g.spawnUnit('worker',30,0,0);b.y=g.travelHeight(b.x,b.z);
 b.order='move';b.tx=20;b.tz=0;b.stationOnArrival=true;run(g,15);
 assert.notEqual(b.order,'move');assert.ok(Math.hypot(b.x-20,b.z)<.6);
});
