import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {scoutAI,tickScouts} from '../src/game/scouting.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function setup(){const g=new Game();g.reset(345);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,40,1),g.makeBld('townhall',100,40,1)];g.rebuildWalk();const u=g.spawnUnit('worker',30,40,1);u.scout={legs:5,returning:true};return {g,u};}
test('returning scouts use a reachable actual hall entrance and rejoin work',()=>{
 const {g,u}=setup();g.campOf=()=>({x:300,z:300});scoutAI(g,u,.1);
 assert.ok(Math.hypot(u.tx,u.tz-40)<15);assert.ok(Math.hypot(u.tx,u.tz-40)>4);assert.equal(g.walkable(u.tx,u.tz),true);
 for(let i=0;i<600&&u.scout;i++){g.navBudget=10;g.state.time+=.1;scoutAI(g,u,.1);}
 assert.equal(u.scout,undefined);assert.equal(u.order,'idle');assert.ok(Math.hypot(u.x,u.z-40)<12);
});
test('an inaccessible nearest hall does not strand a scout when another hall is reachable',()=>{
 const {g,u}=setup(),original=g.interactionSpot.bind(g);g.interactionSpot=(person,b)=>b===g.state.buildings[0]?null:original(person,b);
 scoutAI(g,u,.1);assert.ok(u.tx>80);assert.equal(u.scout.returning,true);
});
test('no reachable hearth preserves a saved recall rather than falsely completing the journey',()=>{
 const {g,u}=setup();g.interactionSpot=()=>null;scoutAI(g,u,.1);assert.equal(u.recalled,true);assert.equal(u.order,'return');assert.equal(u.scout,undefined);
 const r=decodeGame(encodeGame(g));assert.equal(r.state.units.find(p=>p.id===u.id).recalled,true);
});
test('automatic rival scouting leaves recalled residents, envoys and trainees on their existing duties',()=>{
 const {g,u}=setup();u.scout=undefined;u.recalled=true;u.order='gather';
 for(let i=0;i<5;i++){const p=g.spawnUnit('worker',10+i,45,1);p.order='gather';p.drill=g.state.buildings[0].id;}
 g.tribe(1).food=5000;g.state.scoutTimer=0;tickScouts(g,1);assert.equal(g.state.units.some(p=>p.scout),false);
});
