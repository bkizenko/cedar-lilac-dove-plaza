import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {planCaravan,tickCaravanRoutes,waitForCaravan} from '../src/game/caravanRoutes.ts';
import {recoverCaravanEquipment,escortAI} from '../src/game/caravans.ts';import {eligibleTradeCarrier} from '../src/game/barter.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){
 const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);g.state.units=[];
 for(const k of ['trees','stones','forage','fish','wildlife','copper','iron'])g.state[k]=[];
 g.state.buildings=[g.makeBld('townhall',0,0,0),g.makeBld('townhall',70,0,1)];g.vision.fill(2);g.state.weather='clear';g.clockState=()=>({period:'Afternoon'});
 Object.assign(g.tribe(0),{food:5000,wood:500,stone:50,spears:10});Object.assign(g.tribe(1),{alive:true,hostile:false,food:5000,wood:2000,stone:500,trust:.8,tension:0,age:0});
 for(let i=0;i<16;i++)g.spawnUnit('worker',8+i%4,8+Math.floor(i/4),0);g.rebuildWalk();return g;
}
function trip(g,r,seconds=600){for(let i=0;i<seconds*10&&r.caravan.trips===0;i++){
 g.state.time+=.1;g.navBudget=40;
 for(const u of g.state.units){recoverCaravanEquipment(g,u);if(u.escortId!==undefined)escortAI(g,u,.1);else if(u.caravanRoute&&!waitForCaravan(g,u))g.workerAI(u,.1);}
 tickCaravanRoutes(g,.1);
}}
test('a planned convoy spends no goods until actual carriers depart and guards join',()=>{
 const g=fixture(),guard=g.spawnUnit('spearman',10,12,0);guard.militia=true;guard.order='hold';
 assert.equal(planCaravan(g,1,'food','wood',60,9,3,1),true);const r=g.state.routes[0];assert.equal(g.tribe(0).food,5000);
 tickCaravanRoutes(g,2);assert.equal(r.caravan.workerIds.length,3);assert.equal(g.tribe(0).food,4940);
 assert.equal(g.state.units.filter(u=>u.caravanRoute===r.id).reduce((sum,u)=>sum+u.carry,0),60);assert.ok(guard.escortId);
 assert.equal(g.tribe(1).wood,2000,'no remote incoming stock reservation or credit');
});
test('a multi-carrier route negotiates locally and records only cargo physically delivered home',()=>{
 const g=fixture();planCaravan(g,1,'food','wood',60,9,3);const r=g.state.routes[0],wood=g.tribe(0).wood;
 tickCaravanRoutes(g,2);assert.equal(r.caravan.received.wood,undefined);trip(g,r);
 assert.equal(r.caravan.trips,1,JSON.stringify({r,units:g.state.units.filter(u=>u.caravanRoute).map(u=>({x:u.x,z:u.z,order:u.order,carry:u.carry,reason:u.workReason}))}));
 assert.ok(r.caravan.received.wood>0);assert.equal(g.tribe(0).wood,wood+r.caravan.received.wood);assert.equal(r.caravan.losses,0);
});
test('capacity and promised guard requirements wait without spending; a cart unlocks the heavy shipment',()=>{
 const g=fixture();planCaravan(g,1,'wood','food',80,10,1);const r=g.state.routes[0],wood=g.tribe(0).wood;
 tickCaravanRoutes(g,2);assert.match(r.status,/too heavy/);assert.equal(g.tribe(0).wood,wood);
 g.state.units[0].haulage='cart';tickCaravanRoutes(g,11);assert.equal(r.caravan.workerIds.length,1);assert.equal(g.tribe(0).wood,wood-80);
 const h=fixture();planCaravan(h,1,'food','wood',20,3,1,2);tickCaravanRoutes(h,2);assert.match(h.state.routes[0].status,/guards/);assert.equal(h.tribe(0).food,5000);
});
test('pausing stops new departures while existing cargo returns and the route survives saves',()=>{
 const g=fixture();planCaravan(g,1,'food','wood',40,6,2);const r=g.state.routes[0];tickCaravanRoutes(g,2);r.paused=true;
 const copy=decodeGame(encodeGame(g));assert.equal(copy.state.routes[0].caravan.workerIds.length,2);assert.equal(copy.state.units.filter(u=>u.caravanRoute).length,2);
 trip(g,r);assert.equal(r.caravan.trips,1);const food=g.tribe(0).food;tickCaravanRoutes(g,300);assert.equal(g.tribe(0).food,food);assert.equal(r.caravan.workerIds.length,0);
 const raw=encodeGame(g);raw.state.routes[0].caravan.size=30;assert.throws(()=>decodeGame(raw));
});
test('reserved crafts and boat crews are unavailable to the trade scheduler',()=>{
 const g=fixture(),u=g.state.units[0];
 for(const key of ['copperStudy','plantingWork','tamingWork','boat']){u[key]={id:123,phase:'aboard'};assert.equal(eligibleTradeCarrier(g,u,true),false,key);delete u[key];}
});

test('armed trading carriers still count toward the shared away-from-home workforce limit',()=>{
 const g=fixture();planCaravan(g,1,'food','wood',60,9,3);tickCaravanRoutes(g,2);
 assert.equal(g.state.routes[0].caravan.workerIds.length,3);const food=g.tribe(0).food;
 planCaravan(g,1,'food','stone',20,4,2);tickCaravanRoutes(g,2);
 assert.equal(g.state.routes[1].caravan.workerIds.length,0);assert.match(g.state.routes[1].status,/spare adults/);assert.equal(g.tribe(0).food,food);
});
