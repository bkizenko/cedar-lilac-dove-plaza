import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {encodeGame,decodeGame} from '../src/game/persistence.ts';import {armingCallStatus} from '../src/game/armingCall.ts';
function fixture(){const g=new Game();g.reset(42,10,{size:1040,layout:'pangaea'});g.enterIsland();g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.state.campSites=[{team:0,x:0,z:30}];g.state.units=[];g.state.buildings=[g.makeBld('hut',0,40,0)];for(const k of ['trees','stones','copper','iron','forage','fish','wildlife'])g.state[k]=[];g.state.autoWorkEnabled=false;g.state.conflict='quiet';g.state.visitorTimer=900;g.state.weather='clear';g.state.weatherT=10000;Object.assign(g.tribe(0),{spears:2,bows:1,blades:0});g.rebuildWalk();g.vision.fill(2);return g;}
function resident(g,x,z=30){const u=g.spawnUnit('worker',x,z,0);u.y=4;u.order='hold';u.jobLock=true;return u;}
function drive(g,seconds,until=()=>false){const end=g.state.time+seconds;let n=0;while(g.state.time<end&&!until()&&n++<20000){g.state.paused=false;g.step(.1);}assert.deepEqual(g.simulationErrors,[]);}
test('one press arms those at the stores and sends the rest, who arm themselves on arrival',()=>{
 const g=fixture(),near=resident(g,4,30),far=[resident(g,60,30),resident(g,-60,30)];
 assert.equal(g.callToArms(),1,'only one person stands at the stores');assert.ok(near.militia);
 assert.equal(armingCallStatus(g).waiting,2);assert.ok(far.every(u=>u.workReason==='Walking to the stores to take up arms'));
 drive(g,60,()=>far.every(u=>u.militia));
 assert.ok(far.every(u=>u.militia),'walkers arm on arrival without a second press');
 assert.equal(g.tribe(0).spears+g.tribe(0).bows+g.tribe(0).blades,0,'stock moved to people exactly once');
 assert.equal(armingCallStatus(g).waiting,0);
});
test('pending call survives save and load, and stock is never created',()=>{
 const g=fixture();Object.assign(g.tribe(0),{spears:1,bows:0});const far=resident(g,70,30);g.callToArms();assert.equal(armingCallStatus(g).waiting,1);
 const r=decodeGame(encodeGame(g));r.world.heights.fill(4);r.world.rivers=[];r.world.features=[];for(const u of r.state.units)u.y=4;for(const b of r.state.buildings)b.y=4;r.rebuildWalk();assert.equal(armingCallStatus(r).waiting,1);
 drive(r,80,()=>r.state.units.find(u=>u.id===far.id).militia);assert.ok(r.state.units.find(u=>u.id===far.id).militia);assert.equal(r.tribe(0).spears,0);
});
test('old saves without a call load and an empty store arms nobody',()=>{
 const g=fixture();Object.assign(g.tribe(0),{spears:0,bows:0,blades:0});const u=resident(g,4,30);assert.equal(g.callToArms(),0);assert.equal(armingCallStatus(g).waiting,0);assert.ok(!u.militia);
 assert.ok(decodeGame(encodeGame(g)));
});
