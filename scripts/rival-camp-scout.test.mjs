import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {tickScouts,scoutAI} from '../src/game/scouting.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(42,10,{size:1040,layout:'pangaea'});g.enterIsland();g.state.scoutTimer=0;return g;}
function advance(g,u,fn,done,max=12000){for(let i=0;i<max&&!done();i++){g.state.time+=.1;g.navBudget=8;fn(g,u,.1);}assert.ok(done(),`physical executor reached its goal: ${u.workReason}, stuck ${u.stuckT}`);}
test('a rival dispatches from its unbuilt camp and physically returns through save/load without a completed hall',()=>{
 let g=fixture();assert.equal(g.state.buildings.filter(b=>b.team===1&&b.hp>0&&b.type==='townhall').length,0);
 tickScouts(g,0);let u=g.state.units.find(u=>u.team===1&&u.scout);assert.ok(u,'finite normal camp qualifies for real scout dispatch');
 const id=u.id,home=g.campOf(1),start={x:u.x,z:u.z},wood=g.tribe(1).wood;
 advance(g,u,scoutAI,()=>Math.hypot(u.x-home.x,u.z-home.z)>25);assert.ok(Math.hypot(u.x-start.x,u.z-start.z)>15,'resident walked out instead of revealing a static remote target');
 u.scout.returning=true;scoutAI(g,u,.1);assert.ok(u.scout,'camp is a valid return destination, not an immediate fallback recall');
 g=decodeGame(encodeGame(g));u=g.state.units.find(p=>p.id===id);assert.ok(u.scout?.returning);
 advance(g,u,scoutAI,()=>!u.scout);
 assert.equal(u.recalled,undefined);assert.equal(u.order,'idle');assert.ok(Math.hypot(u.x-home.x,u.z-home.z)<=4.5);assert.equal(g.tribe(1).wood,wood);
 assert.equal(g.state.buildings.filter(b=>b.team===1&&b.hp>0&&b.type==='townhall').length,0);assert.equal(scoutAI(g,u,.1),false);
});
test('scouting return preserves loaded existing supplies for one normal camp delivery',()=>{
 const g=fixture();tickScouts(g,0);const u=g.state.units.find(u=>u.team===1&&u.scout);assert.ok(u);const home=g.campOf(1),stock=g.tribe(1).wood;
 advance(g,u,scoutAI,()=>Math.hypot(u.x-home.x,u.z-home.z)>25);
 // Focused compatibility fixture: move five EXISTING communal logs into cargo,
 // rather than granting goods or pretending scouting itself produced timber.
 g.tribe(1).wood-=5;u.carry=5;u.carryType='wood';u.scout.returning=true;
 advance(g,u,scoutAI,()=>!u.scout);assert.equal(u.carry,5);assert.equal(g.tribe(1).wood,stock-5);assert.equal(u.order,'return');
 advance(g,u,(g,u,dt)=>g.workerAI(u,dt),()=>u.carry===0);assert.equal(g.tribe(1).wood,stock);
 assert.equal(scoutAI(g,u,.1),false);assert.equal(g.tribe(1).wood,stock,'scout completion never credits the same load again');
});
