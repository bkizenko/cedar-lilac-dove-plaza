import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {tickEncounters,answerEncounter} from '../src/game/encounters.ts';import {tickVisitors} from '../src/game/visitors.ts';import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(123456);g.enterIsland();g.state.encounter=undefined;g.state.contacts=[];g.state.paused=false;return g;}
test('first contact requires actual proximity and sight; greeting does not reveal foreign stores',()=>{
 const g=fixture(),u=g.state.units.find(u=>u.team===0),stranger=g.state.units.find(u=>u.team===1);stranger.x=u.x+10;stranger.z=u.z;g.vision.fill(0);tickEncounters(g);assert.equal(g.state.encounter,undefined);g.updateVision(0);const knowledge=g.state.tradeReports;tickEncounters(g);assert.equal(g.state.encounter.team,1);assert.equal(g.state.paused,true);const trust=g.tribe(1).trust||0;answerEncounter(g,'greet');assert.ok(g.tribe(1).trust>trust);assert.equal(g.state.tradeReports,knowledge);assert.equal(g.state.paused,false);tickEncounters(g);assert.equal(g.state.encounter,undefined);
});
test('first contact and pending reaction survive saves; withdrawal cancels the explorer mission',()=>{
 const g=fixture(),u=g.state.units.find(u=>u.team===0),stranger=g.state.units.find(u=>u.team===2);stranger.x=u.x+5;stranger.z=u.z;u.order='explore';u.expedition={food:10,returning:false,forage:0};g.updateVision(0);tickEncounters(g);const loaded=decodeGame(encodeGame(g));assert.equal(loaded.state.encounter.team,2);assert.deepEqual(loaded.state.contacts,[2]);answerEncounter(g,'withdraw');assert.equal(u.recalled,true);assert.equal(u.expedition.food,10);assert.equal(u.order,'move');
});
test('visitors can carry a real available surplus when their preferred metal is not yet known',()=>{
 const g=fixture();g.state.visitorTimer=0;const rival=g.tribe(1);rival.spec='iron';rival.age=0;rival.food=500;rival.wood=80;rival.stone=30;const before=rival.wood;tickVisitors(g,1);const visitor=g.state.units.find(u=>u.visit);assert.ok(visitor);assert.notEqual(visitor.carryType,'iron');assert.ok(visitor.carry>=8);if(visitor.carryType==='wood')assert.equal(rival.wood+visitor.carry,before);assert.equal(visitor.team,1);
});

test('incoming trade does not commandeer recalled workers or direct building orders',()=>{
 const g=fixture();g.state.visitorTimer=0;
 for(const t of g.state.tribes){t.food=1000;t.wood=1000;t.hostile=false;}
 for(const u of g.state.units){if(u.team!==0){u.recalled=true;u.order='return';u.carry=0;}}
 tickVisitors(g,1);assert.equal(g.state.units.some(u=>u.visit),false);
});

test('incoming traders reserve no goods for an unreachable village and use a canoe when available',()=>{
 const g=fixture();g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,0,1),g.makeBld('townhall',70,0,0)];
 g.world.heights.fill(4);g.height=(x,z)=>Math.abs(x-35)<12?g.world.waterY-2:Math.abs(x-35)<24?g.world.waterY+(Math.abs(x-35)-12)/3:4;
 for(const t of g.state.tribes)t.alive=t.id===0||t.id===1;
 for(let i=0;i<6;i++)g.spawnUnit('worker',8+i,10,1);
 Object.assign(g.tribe(1),{food:1500,wood:200,stone:100,hostile:false});g.rebuildWalk();
 const before=g.tribe(1).wood;g.state.visitorTimer=0;tickVisitors(g,1);
 assert.equal(g.state.units.some(u=>u.visit),false);assert.equal(g.tribe(1).wood,before);
 const sailor=g.state.units.at(-1);sailor.haulage='canoe';assert.ok(g.interactionSpot(sailor,g.state.buildings[1]),'canoe can reach destination');g.state.visitorTimer=0;tickVisitors(g,1);
 assert.ok(sailor.visit);assert.equal(g.state.units.filter(u=>u.visit).length,1);
});
