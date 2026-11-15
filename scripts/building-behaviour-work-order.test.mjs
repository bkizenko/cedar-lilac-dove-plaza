import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {orderWorkAtBuilding,isWorkplaceTarget,recipesAt} from '../src/game/workAtBuilding.ts';
function setup(){const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);g.state.weather='clear';g.state.units=[];
 const hall=g.makeBld('townhall',0,38,0),hearth=g.makeBld('hearth',24,38,0);hearth.build=1;hearth.hp=hearth.maxHp;g.state.buildings=[hall,hearth];
 g.vision.fill(2);g.rebuildWalk();const u=g.spawnUnit('worker',10,60,0);return {g,hall,hearth,u};}
test('a hearth is a work target, the town hall and an unfinished building are not',()=>{
 const {g,hall,hearth}=setup();assert.ok(recipesAt('hearth').length>0);assert.equal(isWorkplaceTarget(g,hearth),true);
 assert.equal(isWorkplaceTarget(g,hall),false);hearth.build=.4;hearth.hp=5;assert.equal(isWorkplaceTarget(g,hearth),false);
});
test('clicking a person then a workplace walks them to its door and waits for a job choice, spending nothing',()=>{
 const {g,hearth,u}=setup();const wood=g.tribe(0).wood,food=g.tribe(0).food;u.order='gather';u.node={id:999,kind:'forage',x:u.x+3,z:u.z,y:0,amount:5,maxAmt:5,regenT:0,scale:1,rich:1};
 const r=orderWorkAtBuilding(g,hearth,[u]);assert.equal(r.accepted,true);assert.equal(r.standingBy,1);assert.equal(r.started,0);
 assert.equal(u.order,'move');assert.equal(u.node,null,'player order released the soft gather commitment');
 const spot=g.interactionSpot(u,hearth);assert.ok(Math.hypot(u.tx-spot.x,u.tz-spot.z)<1e-6,'target is the workplace door');
 assert.equal(g.tribe(0).wood,wood);assert.equal(g.tribe(0).food,food);assert.match(u.workReason,/hearth/i);
});
test('a person carrying goods keeps them: the order is refused with a reason',()=>{
 const {g,hearth,u}=setup();u.carry=4;u.carryType='wood';u.order='return';
 const r=orderWorkAtBuilding(g,hearth,[u]);assert.equal(r.accepted,false);assert.match(r.reason,/carrying/);assert.equal(u.carry,4);assert.equal(u.order,'return');
});
test('foreign or unfinished sites and empty selections are refused',()=>{
 const {g,hearth,u}=setup();assert.equal(orderWorkAtBuilding(g,hearth,[]).accepted,false);
 hearth.team=1;assert.equal(orderWorkAtBuilding(g,hearth,[u]).accepted,false);
});
