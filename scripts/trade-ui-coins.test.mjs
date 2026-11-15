import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {mintCoins,meltCoins,COINAGE_RULES} from '../src/game/coinage.ts';
import {TRADE_GOODS,TRADE_SELECTABLE_KINDS,tradeStock} from '../src/game/tradeNeeds.ts';
import {playerTradeModel,applyPlayerTradeCommand} from '../src/game/playerTrade.ts';
import {isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(123456,3);g.enterIsland();const t=g.tribe(0);t.age=1;t.copper=30;t.items={};
 g.state.buildings.push(g.makeBld('market',5,5,0));for(const b of g.state.buildings)b.build=1;return g;}
test('coins are a selectable trade good that is a bulk item',()=>{assert.ok(TRADE_SELECTABLE_KINDS.includes('coins'));assert.equal(TRADE_GOODS.coins.cat,'currency');});
test('striking and melting conserve copper value',()=>{
 const g=fixture();const r=mintCoins(g,0,5);assert.equal(r.accepted,true,r.reason);
 assert.equal(g.tribe(0).copper,25);assert.equal(tradeStock(g,0,'coins'),5*COINAGE_RULES.coinsPerCopper);
 const m=meltCoins(g,0,12);assert.equal(m.accepted,true,m.reason);assert.equal(g.tribe(0).copper,27);assert.equal(tradeStock(g,0,'coins'),18);
 assert.equal(meltCoins(g,0,7).accepted,false);assert.equal(meltCoins(g,0,600).accepted,false);assert.equal(mintCoins(g,0,99).accepted,false);
 assert.equal(g.tribe(0).copper*COINAGE_RULES.coinsPerCopper+tradeStock(g,0,'coins'),30*6);
});
test('refused without copper, workplace or age; stores never go negative',()=>{
 let g=fixture();g.tribe(0).copper=2;assert.equal(mintCoins(g,0,3).accepted,false);assert.equal(g.tribe(0).copper,2);
 g=fixture();g.tribe(0).age=0;assert.equal(mintCoins(g,0,1).accepted,false);
 g=fixture();g.state.buildings=g.state.buildings.filter(b=>b.team!==0);assert.equal(mintCoins(g,0,1).accepted,false);
});
test('dispatch schema accepts coin commands and the model lists coins; saves round-trip',()=>{
 assert.equal(isEngineDispatchCommand({kind:'mint-coins',copper:2}),true);assert.equal(isEngineDispatchCommand({kind:'mint-coins',copper:2.5}),false);
 assert.equal(isEngineDispatchCommand({kind:'melt-coins',coins:6}),true);
 const g=fixture();assert.equal(applyPlayerTradeCommand(g,{kind:'mint-coins',copper:4}).accepted,true);
 const m=playerTradeModel(g);assert.equal(m.goods.find(x=>x.kind==='coins').held,24);
 const copy=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.equal(tradeStock(copy,0,'coins'),24);assert.equal(copy.tribe(0).copper,26);
});
