import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {renewFish,fishRecoveryEstimateSeconds,FISHERY_RULES} from '../src/game/fishing.ts';import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function stock(){return {id:3,kind:'fish',x:0,z:0,y:0,amount:0,maxAmt:8,regenT:240,pressure:1,scale:1,rich:1};}
test('a fully exhausted stressed fish stock recovers through two real seasonal years of rest without crediting village food',()=>{
 const g=new Game();g.reset(123456,2);const n=stock();g.state.fish=[n];g.state.weather='clear';g.state.time=0;const food=g.tribe(0).food;let first=null;for(let i=0;i<3600;i++){g.state.time++;renewFish(g,n,1);if(first===null&&n.amount>=1)first=g.state.time;assert.ok(n.amount>=0&&n.amount<=n.maxAmt);}assert.ok(first!==null&&first<300);assert.equal(n.amount,n.maxAmt);assert.equal(n.pressure,0);assert.equal(g.tribe(0).food,food);const loaded=decodeGame(encodeGame(g));assert.equal(loaded.state.fish[0].amount,n.maxAmt);
});
test('winter drought resting estimate is slower and remains a conservative finite first-catch bound',()=>{
 const g={state:{time:0,weather:'clear'}},warm=stock(),cold=stock();const warmEstimate=fishRecoveryEstimateSeconds(g,warm);g.state.time=FISHERY_RULES.seasonSeconds*3;g.state.weather='drought';const coldEstimate=fishRecoveryEstimateSeconds(g,cold);assert.ok(coldEstimate>warmEstimate);let elapsed=0;while(cold.amount<1&&elapsed<coldEstimate){renewFish(g,cold,1);elapsed++;}assert.ok(cold.amount>=1);assert.ok(elapsed<=coldEstimate);assert.ok(cold.amount<cold.maxAmt);assert.equal(fishRecoveryEstimateSeconds(g,cold),0);
});
