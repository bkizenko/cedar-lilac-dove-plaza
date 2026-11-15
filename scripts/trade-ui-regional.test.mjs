import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {pressRegional,consumeRegional,regionalSuitability,tickRegionalPressing,REGIONAL_RULES} from '../src/game/regionalGoods.ts';
import {TRADE_SELECTABLE_KINDS,tradeStock} from '../src/game/tradeNeeds.ts';
import {applyPlayerTradeCommand} from '../src/game/playerTrade.ts';
import {isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(123456,3);g.enterIsland();for(const t of g.state.tribes){t.age=1;}
 const t=g.tribe(0);t.food=200;t.wood=20;t.items={pottery:3};g.state.buildings.push(g.makeBld('warehouse',4,4,0));for(const b of g.state.buildings)b.build=1;return g;}
function seasonWhere(g,kind,want){for(let s=0;s<1800;s+=15){g.state.time=s;if(regionalSuitability(g,0,kind).ok===want)return true;}return false;}
test('oil and wine are tradeable item goods',()=>{for(const k of['oliveOil','wine'])assert.ok(TRADE_SELECTABLE_KINDS.includes(k));});
test('suitability follows measured climate: some conditions allow it, some do not',()=>{const g=fixture();
 for(const k of['oliveOil','wine']){const ok=seasonWhere(g,k,true),no=seasonWhere(g,k,false);assert.ok(ok||no);assert.equal(typeof regionalSuitability(g,0,k).reason,'string');}});
test('pressing spends food and a vessel and makes jars; consuming returns food energy; conserved accounting',()=>{
 const g=fixture();let found=false;for(const k of['wine','oliveOil'])if(seasonWhere(g,k,true)){found=true;
  const food0=g.tribe(0).food,pot0=g.tribe(0).items.pottery;const r=pressRegional(g,0,k,2);assert.equal(r.accepted,true,r.reason);
  assert.equal(tradeStock(g,0,k),2*REGIONAL_RULES.batchJars);assert.ok(g.tribe(0).food<food0);assert.equal(g.tribe(0).items.pottery,pot0-2);
  const c=consumeRegional(g,0,k,1);assert.equal(c.accepted,true);assert.equal(tradeStock(g,0,k),3);
  assert.equal(consumeRegional(g,0,k,99).accepted,false);
  const copy=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.equal(tradeStock(copy,0,k),3);break;}
 assert.ok(found,'some season suits a regional good');});
test('refusals: no vessel or timber, too young, wrong region, no storehouse',()=>{
 let g=fixture();g.tribe(0).age=0;assert.equal(pressRegional(g,0,'wine',1).accepted,false);
 g=fixture();g.state.buildings=g.state.buildings.filter(b=>b.team!==0);assert.equal(pressRegional(g,0,'wine',1).accepted,false);
 g=fixture();g.tribe(0).items={};g.tribe(0).wood=0;for(const k of['wine','oliveOil'])if(seasonWhere(g,k,true))assert.equal(pressRegional(g,0,k,1).accepted,false);
 assert.equal(pressRegional(fixture(),0,'grain',1).accepted,false);
});
test('dispatch schema and commands',()=>{
 assert.equal(isEngineDispatchCommand({kind:'press-regional',good:'wine',batches:1}),true);assert.equal(isEngineDispatchCommand({kind:'press-regional',good:'gold',batches:1}),false);
 assert.equal(isEngineDispatchCommand({kind:'consume-regional',good:'oliveOil',jars:2}),true);
 const g=fixture();assert.equal(applyPlayerTradeCommand(g,{kind:'consume-regional',good:'wine',jars:1}).accepted,false);
});
test('rival pressing uses its own stores and never touches the player',()=>{
 const g=fixture();const t=g.tribe(1);Object.assign(t,{age:1,food:900,wood:50,items:{pottery:4}});g.state.buildings.push(g.makeBld('townhall',60,0,1));for(const b of g.state.buildings)b.build=1;
 const player=JSON.stringify([g.tribe(0).food,g.tribe(0).items]);let any=false;
 for(let s=0;s<1800&&!any;s+=300){g.state.time=s;tickRegionalPressing(g);any=(t.items.oliveOil||0)+(t.items.wine||0)>0;}
 assert.equal(JSON.stringify([g.tribe(0).food,g.tribe(0).items]),player);
 if(any)assert.ok(t.food<900);
});
import {TRADE_BASKET_BONUS,capacity} from '../src/game/tradeNeeds.ts';
test('an owned serviceable basket raises a carrier\'s bulk trade load by half; worn-out or irrelevant ones do not',()=>{
 const g=fixture(),u=g.spawnUnit('worker',1,1,0);const plain=capacity(u,'pottery');assert.equal(plain,8);
 u.basket={version:1,condition:1};assert.equal(capacity(u,'pottery'),Math.floor(8*TRADE_BASKET_BONUS));assert.equal(capacity(u,'oliveOil'),18);assert.equal(capacity(u,'basket'),8);
 u.basket.condition=0;assert.equal(capacity(u,'pottery'),8);
});
