import test from 'node:test';import assert from 'node:assert/strict';import {Game} from '../src/game/sim.ts';
test('actual V20 player entry retains its generated known camp and physical band, without an unsolicited scenic relocation',()=>{
 const prior=process.env.NODE_TEST_CONTEXT;delete process.env.NODE_TEST_CONTEXT;
 try{const g=new Game();g.reset(613118618,20,{preset:'river-valley',size:1040});const home={...g.campOf(0)},people=g.state.units.filter(u=>u.team===0).map(u=>({id:u.id,x:u.x,z:u.z}));g.enterIsland();assert.deepEqual(g.campOf(0),home);assert.equal(g.exploredAt(home.x,home.z),true);assert.ok(g.height(home.x,home.z)>g.waterAt(home.x,home.z)+.5);for(const p of people){const u=g.state.units.find(u=>u.id===p.id);assert.equal(u.x,p.x);assert.equal(u.z,p.z);assert.ok(Math.hypot(u.x-home.x,u.z-home.z)<10);assert.notEqual(u.order,'move');}}finally{if(prior===undefined)delete process.env.NODE_TEST_CONTEXT;else process.env.NODE_TEST_CONTEXT=prior;}
});
