import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {dispatchTradeExpedition,tickTradeParties,tradeParties,tradePartyPosition,reviewForeignArrivals,TRADE_PARTY_RULES} from '../src/game/tradeParties.ts';
import {seasonSummaryLine} from '../src/game/seasonReports.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {endowSettlementSites} from './helpers/endowed-settlement-sites.mjs';
function fixture(){const g=new Game();g.reset(123456,3);g.enterIsland();g.state.units=[];g.state.buildings=[];
 for(const [team,z] of [[0,-60],[1,60]]){g.state.buildings.push(g.makeBld('townhall',0,z,team));g.spawnUnit('worker',4,z,team);}
 g.state.buildings.push(g.makeBld('dock',10,-50,0));for(const b of g.state.buildings)b.build=1;
 Object.assign(g.tribe(0),{wood:100,food:100});Object.assign(g.tribe(1),{food:300,stone:80,trust:.5,hostile:false});
 endowSettlementSites(g,0,1);return g;}
test('expedition: goods leave at dispatch, payment returns only after the round trip',()=>{
 const g=fixture(),wood=g.tribe(0).wood;let r=dispatchTradeExpedition(g,1,'land','wood',20,'stone');
 if(!r.accepted)return assert.fail(r.reason);
 assert.equal(g.tribe(0).wood,wood-20);const p=tradeParties(g)[0],stone=g.tribe(0).stone;
 assert.ok(p.travel>10,'travel time proportional to distance');
 for(let t=0;t<p.travel-2;t++)tickTradeParties(g,1);assert.equal(g.tribe(0).stone,stone);assert.equal(p.phase,'outbound');
 let moved=tradePartyPosition(p);assert.ok(moved.z>-60&&moved.z<60);
 for(let t=0;t<p.travel*2+TRADE_PARTY_RULES.tradeSeconds+5&&tradeParties(g).length;t++)tickTradeParties(g,1);
 assert.equal(tradeParties(g).length,0,'removed only after returning');assert.ok(g.tribe(0).stone>stone);
});
test('sea dispatch needs a dock and is faster per distance than land',()=>{
 const g=fixture();g.state.buildings=g.state.buildings.filter(b=>b.type!=='dock');assert.equal(dispatchTradeExpedition(g,1,'sea','wood',5).accepted,false);
 g.state.buildings.push(Object.assign(g.makeBld('dock',10,-50,0),{build:1}));
 const land=dispatchTradeExpedition(g,1,'land','wood',5),sea=dispatchTradeExpedition(g,1,'sea','wood',5);assert.ok(land.accepted&&sea.accepted);
 const [a,b]=tradeParties(g);assert.ok(b.travel<a.travel);
});
test('foreign arrivals are deterministic, walk back to origin before removal, survive save',()=>{
 const run=()=>{const g=fixture();const seen=[];for(let i=0;i<40;i++){g.state.time=i*TRADE_PARTY_RULES.arrivalReviewSeconds;const p=reviewForeignArrivals(g);if(p){seen.push([p.mode,p.team,p.travel]);p.phase='done';g.state.tradeParties=[];}}return seen;};
 const a=run(),b=run();assert.deepEqual(a,b);assert.ok(a.length>0);assert.ok(a.some(x=>x[0]==='sea'));
 const g=fixture();g.state.time=0;let p;for(let i=0;i<60&&!p;i++){g.state.time=i*TRADE_PARTY_RULES.arrivalReviewSeconds;p=reviewForeignArrivals(g);}assert.ok(p);
 g.state.tradeArrivalSlot=Math.floor(g.state.time/TRADE_PARTY_RULES.arrivalReviewSeconds);for(let t=0;t<p.travel+5;t++)tickTradeParties(g,1);assert.equal(p.phase,'trading');
 const g2=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.equal(g2.state.tradeParties.length,1);
 for(let t=0;t<TRADE_PARTY_RULES.tradeSeconds+p.travel/2;t++)tickTradeParties(g,1);assert.equal(p.phase,'returning');assert.equal(tradeParties(g).length,1,'still on the road');
 for(let t=0;t<p.travel+5;t++)tickTradeParties(g,1);assert.equal(tradeParties(g).length,0);
});
test('season summary is one short line of notable changes',()=>{
 const mk=(season,wood,spoiled)=>({season,partial:false,totals:{food:50,wood,stone:0,copper:0,iron:0,weapons:0},stock:{},foodFlow:{eaten:0,spoiled,partial:false}});
 assert.equal(seasonSummaryLine(mk(1,52,0),mk(0,50,0)),'Summer ended: no notable changes.');
 const line=seasonSummaryLine(mk(2,90,14),mk(1,50,0));assert.match(line,/^Autumn ended: logs hauled up to 90, 14 food spoiled\.$/);
});
