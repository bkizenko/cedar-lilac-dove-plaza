import test from'node:test';import assert from'node:assert/strict';import{Game}from'../src/game/sim.ts';import{bridgeApproach,validBridgeSpan}from'../src/game/transport.ts';
function setup(){const g=new Game();g.reset(345,2);g.enterIsland();g.state.units=[];g.state.buildings=[];g.vision.fill(2);g.waterAt=()=>0;g.height=(x,z)=>Math.abs(x)<4.4?-1:4;g.world.heights=g.world.heights.slice();g.world.waterHeights=new Float32Array(g.world.heights.length);const span={ax:-4.5,az:0,bx:4.5,bz:0};assert.ok(validBridgeSpan(g,span));const b=g.makeBld('bridge',0,0,0,undefined,span);b.build=0;g.state.buildings=[b];const u=g.spawnUnit('worker',8,0,0);u.order='idle';g.rebuildWalk();return{g,b,u,span};}
test('ordinary assigned builder advances a valid bridge from dry frontage despite coarse-blocked exact bank endpoints',()=>{
 const{g,b,u,span}=setup(),heights=g.world.heights.slice();assert.equal(g.walkable(span.ax,span.az),false);assert.equal(g.walkable(span.bx,span.bz),false);assert.equal(g.walkable(0,0),false);assert.equal(g.travelHeight(0,0),-1,'unfinished bridge has no walkable deck');const p=bridgeApproach(g,u,b);assert.ok(p&&p.x>=span.bx);assert.equal(g.walkable(p.x,p.z),true);assert.ok(g.orderConstruction(b,[u]));for(let i=0;i<50&&b.build===0;i++){g.state.time+=.1;g.navBudget=4;g.workerAI(u,.1);}assert.ok(b.build>0&&b.build<1);assert.equal(u.buildOrder,b.id);assert.deepEqual(b.bridge,span);assert.deepEqual(g.world.heights,heights);assert.equal(g.walkable(0,0),false);
});
test('builders on opposite banks each use their own reachable dry frontage',()=>{
 const{g,b,u}=setup(),other=g.spawnUnit('worker',-8,0,0);other.order='idle';const a=bridgeApproach(g,u,b),c=bridgeApproach(g,other,b);assert.ok(a.x>0);assert.ok(c.x<0);assert.equal(g.workBoard.connected(g,a.x,a.z,c.x,c.z),false);assert.equal(g.walkable(0,0),false);
});
test('blocked frontage does not fabricate a construction approach',()=>{
 const{g,b,u}=setup();const wall=g.makeBld('warehouse',7,0,0);g.state.buildings.push(wall);g.rebuildWalk();assert.equal(bridgeApproach(g,u,b),null);const progress=b.build;g.buildAI(u,.1);assert.equal(b.build,progress);assert.deepEqual(b.bridge,{ax:-4.5,az:0,bx:4.5,bz:0});
});
