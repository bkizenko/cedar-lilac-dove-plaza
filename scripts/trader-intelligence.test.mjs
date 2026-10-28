import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {recordTradeMeeting} from '../src/game/barter.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(345);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('townhall',80,38,1)];g.state.time=100;g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();const u=g.spawnUnit('worker',80,45,0);const entrance=g.interactionSpot(u,g.state.buildings[1]);assert.ok(entrance);u.x=entrance.x;u.z=entrance.z;Object.assign(g.tribe(1),{hostile:false,alive:true,trust:0,ally:false,food:500,wood:500});for(let i=0;i<10;i++)g.spawnUnit('worker',85+i%3,48+Math.floor(i/3),1);return {g,u};}
test('trade intelligence requires a living player representative at the actual meeting',()=>{
 const {g,u}=fixture(),startX=u.x;u.x=0;assert.equal(recordTradeMeeting(g,1,u),undefined);assert.equal(g.state.tradeReports?.length||0,0);
 u.x=startX;u.hp=0;assert.equal(recordTradeMeeting(g,1,u),undefined);u.hp=40;
 assert.ok(recordTradeMeeting(g,1,u)?.observation);assert.equal(recordTradeMeeting(g,0,u),undefined);
});
test('reports estimate local residents and buildings without exposing distant settlements or private stocks',()=>{
 const {g,u}=fixture();g.spawnUnit('worker',300,300,1);g.state.buildings.push(g.makeBld('hut',300,300,1));
 const report=recordTradeMeeting(g,1,u),o=report.observation;
 assert.ok(o.populationLow<10&&o.populationHigh>10);assert.equal(o.buildings,1);assert.deepEqual(o.stocks,{});
 const original=JSON.stringify(report);g.tribe(1).food=0;g.spawnUnit('worker',85,48,1);g.state.time+=100;
 assert.equal(JSON.stringify(g.state.tradeReports[0]),original,'reports never update with unseen live state');
});
test('trusted partners volunteer broad stock conditions; refreshed reports replace old accounts',()=>{
 const {g,u}=fixture();g.tribe(1).trust=.7;g.tribe(1).food=0;
 const o=recordTradeMeeting(g,1,u).observation;assert.equal(o.stocks.food,'scarce');assert.equal(o.stocks.wood,'plentiful');assert.equal(o.stocks.copper,undefined);
 g.state.time+=30;g.tribe(1).trust=0;recordTradeMeeting(g,1,u);
 assert.equal(g.state.tradeReports.length,1);assert.deepEqual(g.state.tradeReports[0].observation.stocks,{});
});
test('dated intelligence survives saves; old reports remain valid and malformed estimates are rejected',()=>{
 const {g,u}=fixture();recordTradeMeeting(g,1,u);const raw=encodeGame(g);
 assert.deepEqual(decodeGame(raw).state.tradeReports,g.state.tradeReports);
 const legacy=structuredClone(raw);delete legacy.state.tradeReports[0].observation;assert.ok(decodeGame(legacy));
 raw.state.tradeReports[0].observation.populationLow=-1;assert.throws(()=>decodeGame(raw));
 const bad=encodeGame(g);bad.state.tradeReports[0].observation.stocks.food='exactly 500';assert.throws(()=>decodeGame(bad));
});
