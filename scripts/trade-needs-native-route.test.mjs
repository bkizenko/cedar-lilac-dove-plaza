import test from 'node:test';import assert from 'node:assert/strict';
import {nativeTradeFixture} from './diagnostics/player-trade-fixture.mjs';
import {decodeGame,encodeGame} from '../src/game/persistence.ts';
import {applyPlayerTradeCommand} from '../src/game/playerTrade.ts';
test('needs caravan physically completes a long native land round trip without a route-budget deadlock',{timeout:60000},()=>{
 const f=nativeTradeFixture('outgoing'),g=decodeGame(f.save),home=g.state.units.find(u=>u.team===0),hall=g.state.buildings.find(b=>b.id===f.hallId);assert.ok(Math.hypot(home.x-hall.x,home.z-hall.z)>900);
 const initial={wood:g.tribe(0).wood,stone:g.tribe(0).stone,fuel:g.tribe(0).survival.fuelBurnedWood||0};
 const reply=applyPlayerTradeCommand(g,{kind:'propose-needs-trade',team:1,give:'stone',get:'wood',amount:30});assert.ok(reply.accepted);const offer=g.state.tradeNeeds.offers.find(o=>o.id===reply.projectId);let furthest=0;const starts=new Map();
 g.state.paused=false;for(let i=0;i<9000&&!['complete','failed','declined'].includes(offer.phase);i++){g.step(.2);for(const id of offer.carriers){const u=g.state.units.find(u=>u.id===id);if(!starts.has(id))starts.set(id,{x:u.x,z:u.z});const p=starts.get(id);furthest=Math.max(furthest,Math.hypot(u.x-p.x,u.z-p.z));}}
 assert.equal(offer.phase,'complete',offer.reason);assert.ok(furthest>800);assert.equal(g.tribe(0).stone,initial.stone-30);assert.ok(Math.abs(g.tribe(0).wood+(g.tribe(0).survival.fuelBurnedWood-initial.fuel)-initial.wood-offer.getDelivered)<1e-5);assert.deepEqual(g.simulationErrors,[]);assert.doesNotThrow(()=>decodeGame(structuredClone(encodeGame(g))));
});
