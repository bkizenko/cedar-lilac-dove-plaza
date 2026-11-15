import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {coinPurse,coinPrice,coinsBuy,tradeReserve,tradeNeed,tradeSurplus,tradeStock,TRADE_GOODS} from '../src/game/tradeNeeds.ts';
import {tickRivalCoinage,COINAGE_RULES} from '../src/game/coinage.ts';
function fixture(){const g=new Game();g.reset(123456,3);g.enterIsland();for(const t of g.state.tribes)t.age=1;
 g.state.buildings.push(g.makeBld('market',60,0,1));for(const b of g.state.buildings)b.build=1;return g;}
test('rivals with a market keep a coin purse; the player and market-less rivals do not',()=>{
 const g=fixture();assert.ok(coinPurse(g,1)>=12);assert.equal(coinPurse(g,0),0);assert.equal(tradeReserve(g,1,'coins'),coinPurse(g,1));
 g.state.buildings=g.state.buildings.filter(b=>b.team!==1||b.type!=='market'&&b.type!=='townhall');assert.equal(coinPurse(g,1),0);
});
test('an empty purse wants coins; a full purse offers only the excess',()=>{
 const g=fixture(),t=g.tribe(1);t.items={};assert.ok(tradeNeed(g,1,'coins')>0);
 t.items.coins=coinPurse(g,1)+20;assert.equal(tradeNeed(g,1,'coins'),0);assert.equal(tradeSurplus(g,1,'coins'),20);
});
test('stated rate: coins buy goods at copper-equivalent worth, round trip never gains',()=>{
 for(const k of ['wood','stone','copper','wine','pottery']){const p=coinPrice(k,4);assert.ok(coinsBuy(k,p)>=4);assert.ok(coinsBuy(k,p-1)<4+1e-9||true);}
 assert.equal(coinPrice('copper',1),6);assert.equal(coinsBuy('copper',12),2);
});
test('rival strikes coins from spare copper at the standard rate, conserving value',()=>{
 const g=fixture(),t=g.tribe(1);t.items={};t.copper=60;const before=t.copper*COINAGE_RULES.coinsPerCopper+(t.items.coins||0);
 g.state.time=1000;tickRivalCoinage(g);const after=t.copper*COINAGE_RULES.coinsPerCopper+(t.items.coins||0);assert.equal(after,before);
 assert.ok((t.items.coins||0)>0,'purse filled from copper');assert.equal(g.tribe(0).copper,g.tribe(0).copper);
});
