import test from 'node:test';import assert from 'node:assert/strict';import {Game} from '../src/game/sim.ts';
function fixture(spears=2){const g=new Game();g.reset(42,10);g.enterIsland();g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.world.ecology=undefined;g.state.units=[];g.state.buildings=[];g.state.campSites=[{team:0,x:0,z:30}];g.state.autoWorkEnabled=false;g.state.conflict='quiet';
 const hall=g.makeBld('townhall',0,30,0);hall.y=4;g.state.buildings=[hall];g.rebuildWalk();
 const u=g.spawnUnit('worker',120,120,0);u.y=4;u.selected=true;Object.assign(g.tribe(0),{spears,bows:0,blades:0,items:{cloth:100}});return {g,u,hall};}
test('arming far from the stores walks the adult to the hall instead of failing silently, then arms on arrival',()=>{
 const {g,u}=fixture();
 assert.equal(g.callToArms(0),0);assert.equal(u.order,'move');assert.ok(Math.hypot(u.tx-0,u.tz-30)<12,'headed for the stores');assert.equal(g.tribe(0).spears,2,'no weapon spent while walking');
 u.x=0;u.z=36;u.order='hold';assert.equal(g.callToArms(0),1);assert.equal(u.militia,true);assert.equal(g.tribe(0).spears,1);
});
test('with no weapons nothing is sent walking',()=>{const {g,u}=fixture(0);const tx=u.tx;assert.equal(g.callToArms(0),0);assert.equal(u.tx,tx);assert.notEqual(u.workReason,'Walking to the stores to take up arms');});
