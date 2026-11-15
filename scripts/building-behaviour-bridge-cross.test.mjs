import test from'node:test';import assert from'node:assert/strict';import{Game}from'../src/game/sim.ts';
function setup(){const g=new Game();g.reset(345,2);g.enterIsland();g.state.units=[];g.state.buildings=[];g.vision.fill(2);g.waterAt=()=>0;g.height=(x,z)=>Math.abs(x)<4.4?-1:4;g.world.heights=g.world.heights.slice();g.world.waterHeights=new Float32Array(g.world.heights.length);
 const span={ax:-4.5,az:0,bx:4.5,bz:0};const b=g.makeBld('bridge',0,0,0,undefined,span);b.build=1;b.hp=b.maxHp;g.state.buildings=[b];g.state.walkDirty=true;g.rebuildWalk();return{g,b,span};}
test('banks are connected for planning only once the bridge is finished',()=>{
 const{g,b}=setup();assert.equal(g.workBoard.connected(g,9,0,-9,0),true,'finished deck joins the banks');
 b.build=0;b.hp=1;g.state.walkDirty=true;g.rebuildWalk();g.workBoard.reset();assert.equal(g.workBoard.connected(g,9,0,-9,0),false,'unfinished deck does not');
});
test('a walker really crosses a finished bridge from one bank to the other',()=>{
 const{g}=setup();const u=g.spawnUnit('worker',9,0,0);u.order='move';u.tx=-9;u.tz=0;let crossedDeck=false;
 for(let i=0;i<900&&Math.hypot(u.x+9,u.z)>1.2;i++){g.state.time+=.1;g.navBudget=4;g.steer(u,.1);if(Math.abs(u.x)<3)crossedDeck=true;}
 assert.ok(crossedDeck,'walked over the deck');assert.ok(Math.hypot(u.x+9,u.z)<=1.5,'arrived on the far bank at '+u.x.toFixed(1));
});
