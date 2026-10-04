import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {planBridge} from '../src/game/transport.ts';
import {decodeGame,encodeGame} from '../src/game/persistence.ts';
import {HALF,MAP,SEGS} from '../src/game/constants.ts';
function river(g){for(let iz=0;iz<=SEGS;iz++)for(let ix=0;ix<=SEGS;ix++){const z=iz/SEGS*MAP-HALF;g.world.heights[iz*(SEGS+1)+ix]=Math.abs(z)<6?g.world.waterY-.6:4;}g.rebuildWalk();}
function fixture(){const g=new Game();g.reset(123456);g.enterIsland();g.state.units=[];g.state.buildings=[];g.state.trees=[];g.state.stones=[];g.state.forage=[];g.state.weather='clear';g.vision.fill(2);g.clockState=()=>({period:'Afternoon'});river(g);const u=g.spawnUnit('worker',0,-18,0);return {g,u};}
function drive(g,u,seconds,fn){for(let i=0;i<seconds*10;i++){g.state.time+=.1;g.navBudget=10;fn();}}
test('a bridge requires two explored gentle shallow banks, not dry land or deep water',()=>{
 const {g}=fixture();assert.ok(planBridge(g,0,0));assert.equal(planBridge(g,0,40),null);g.vision.fill(0);assert.match(g.placementIssue('bridge',0,0),/Explore both banks/);
 g.height=()=>g.world.waterY-10;assert.equal(planBridge(g,0,0),null);
});
test('bank construction opens a real crossing only after labor; carriers walk across and deliver',()=>{
 const {g,u}=fixture();const hall=g.makeBld('townhall',12,-25,0);g.state.buildings=[hall];g.rebuildWalk();Object.assign(g.tribe(0),{wood:100,stone:30});
 assert.equal(g.workBoard.connected(g,0,-18,0,18),false);assert.equal(g.placeBuilding('bridge',0,0),true);const bridge=g.state.buildings.find(b=>b.type==='bridge');assert.equal(g.tribe(0).wood,68);assert.equal(g.tribe(0).stone,26);assert.equal(g.walkable(0,0),false);
 drive(g,u,70,()=>g.buildAI(u,.1));assert.equal(bridge.build,1);g.rebuildWalk();assert.equal(g.workBoard.connected(g,0,-18,0,18),true);
 u.selected=true;g.issueMove(0,18);let seenOnDeck=false;drive(g,u,40,()=>{g.workerAI(u,.1);if(Math.abs(u.z)<3){seenOnDeck=true;assert.ok(u.y>g.world.waterY+.28);}});assert.ok(seenOnDeck,JSON.stringify({bridge:bridge.bridge,u:{x:u.x,z:u.z,y:u.y,tx:u.tx,tz:u.tz,order:u.order,reason:u.workReason,stuck:u.stuckT},route:g.paths.get(u.id)}));assert.ok(u.z>15);
 Object.assign(u,{carry:8,carryType:'wood',order:'return'});const before=g.tribe(0).wood;drive(g,u,50,()=>g.workerAI(u,.1));assert.equal(u.carry,0);assert.equal(g.tribe(0).wood,before+8);assert.ok(u.z<0);
});
test('either reachable bank can supply builders and a bridge in use cannot be reclaimed',()=>{
 const {g,u}=fixture();const bridge=g.makeBld('bridge',0,0,0);bridge.build=0;g.state.buildings=[bridge];g.rebuildWalk();Object.assign(u,{x:0,z:18,y:4,order:'idle'});g.workBoard.reset();g.workBoard.assign(g,u);assert.equal(u.node,bridge);assert.equal(u.order,'build');
 drive(g,u,70,()=>g.buildAI(u,.1));assert.equal(bridge.build,1);g.rebuildWalk();Object.assign(u,{x:0,z:0,y:g.travelHeight(0,0)});g.state.selBld=bridge;g.recycleSelected();assert.ok(bridge.hp>0);
 Object.assign(u,{x:0,z:18,y:4});g.recycleSelected();assert.equal(bridge.hp,0);g.rebuildWalk();assert.equal(g.walkable(0,0),false);assert.equal(g.workBoard.connected(g,0,-18,0,18),false);
});
test('bridge span and construction survive saves; forged wide spans are rejected',()=>{
 const {g}=fixture();const b=g.makeBld('bridge',0,0,0);b.build=.4;g.state.buildings=[b];let raw=encodeGame(g);const loaded=decodeGame(raw);assert.deepEqual(loaded.state.buildings[0].bridge,b.bridge);assert.equal(loaded.state.buildings[0].build,.4);
 raw=encodeGame(g);raw.state.buildings[0].bridge.bz+=100;assert.throws(()=>decodeGame(raw));raw=encodeGame(g);delete raw.state.buildings[0].bridge;assert.throws(()=>decodeGame(raw));
});

test('a command aimed at blocked water follows its fallback route rather than replanning each frame',()=>{
 const {g,u}=fixture(),b=g.makeBld('bridge',0,0,0);g.state.buildings=[b];g.rebuildWalk();u.selected=true;u.carry=8;u.carryType='wood';g.issueMove(4,0);
 drive(g,u,40,()=>g.workerAI(u,.1));assert.equal(u.order,'hold');assert.ok(u.z>4&&u.z<6);assert.equal(u.carry,8);assert.ok(g.walkable(u.x,u.z));
});
