import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {craftContainer,liquidStoreCapacity,grainStoreCapacity,containerCarryBonus,CONTAINER_RULES} from '../src/game/containers.ts';
import {pressRegional,regionalSuitability} from '../src/game/regionalGoods.ts';
import {applyPlayerTradeCommand} from '../src/game/playerTrade.ts';
import {isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(123456,3);g.enterIsland();for(const t of g.state.tribes)t.age=1;const t=g.tribe(0);t.food=200;t.wood=20;t.items={pottery:6};
 g.state.buildings.push(g.makeBld('potter',4,4,0),g.makeBld('warehouse',8,4,0));for(const b of g.state.buildings)b.build=1;return g;}
test('amphora is made from pottery at a potter; clay is conserved',()=>{
 const g=fixture(),t=g.tribe(0);const r=craftContainer(g,0,'amphora',2);assert.equal(r.accepted,true,r.reason);
 assert.equal(t.items.amphora,2);assert.equal(t.items.pottery,6-2*CONTAINER_RULES.potteryPerAmphora);
 assert.equal(craftContainer(g,0,'storageJar',1).accepted,true);assert.equal(t.items.storageJar,1);assert.equal(t.items.pottery,6-4-1);
});
test('refusals: no workshop, not enough pottery, bad kind or count; stores unchanged',()=>{
 let g=fixture();g.state.buildings=g.state.buildings.filter(b=>b.team!==0||b.type!=='potter');assert.equal(craftContainer(g,0,'amphora',1).accepted,false);assert.equal(g.tribe(0).items.pottery,6);
 g=fixture();g.tribe(0).items.pottery=1;assert.equal(craftContainer(g,0,'amphora',1).accepted,false);assert.equal(g.tribe(0).items.amphora,undefined);
 g=fixture();assert.equal(craftContainer(g,0,'gold',1).accepted,false);assert.equal(craftContainer(g,0,'amphora',99).accepted,false);
});
test('amphorae raise liquid storage and carry; storage jars raise grain storage and grain carry',()=>{
 const g=fixture();const base=liquidStoreCapacity(g,0),gb=grainStoreCapacity(g,0);assert.equal(containerCarryBonus(g,0,'wine'),1);
 g.tribe(0).items.amphora=2;g.tribe(0).items.storageJar=3;
 assert.equal(liquidStoreCapacity(g,0),base+2*CONTAINER_RULES.jarsPerAmphora);assert.equal(grainStoreCapacity(g,0),gb+3*CONTAINER_RULES.grainPerStorageJar);
 assert.ok(containerCarryBonus(g,0,'wine')>1&&containerCarryBonus(g,0,'wine')<=1.5);assert.equal(containerCarryBonus(g,0,'roughGrain')>1,true);assert.equal(containerCarryBonus(g,0,'stone'),1);
 g.tribe(0).items.amphora=999;assert.equal(containerCarryBonus(g,0,'oliveOil'),1.5,'bounded');
});
test('pressing spends an amphora first, and refuses when the jar store is full',()=>{
 const g=fixture(),t=g.tribe(0);let ok=false;for(let s=0;s<1800;s+=15){g.state.time=s;if(regionalSuitability(g,0,'wine').ok){ok=true;break;}}
 if(ok){t.items.amphora=1;const pot=t.items.pottery;const r=pressRegional(g,0,'wine',1);assert.equal(r.accepted,true,r.reason);assert.equal(t.items.amphora,0);assert.equal(t.items.pottery,pot);
  t.items.wine=liquidCap(g);assert.equal(pressRegional(g,0,'wine',1).accepted,false,'store full');}
});
function liquidCap(g){return liquidStoreCapacity(g,0);}
test('dispatch schema, command and save round-trip',()=>{
 assert.equal(isEngineDispatchCommand({kind:'craft-container',container:'amphora',count:1}),true);assert.equal(isEngineDispatchCommand({kind:'craft-container',container:'urn',count:1}),false);
 const g=fixture();assert.equal(applyPlayerTradeCommand(g,{kind:'craft-container',container:'amphora',count:1}).accepted,true);
 const copy=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.equal(copy.tribe(0).items.amphora,1);
});
import {shareHealing,consumeRegional} from '../src/game/regionalGoods.ts';
test('wine and oil heal the wounded a little, bounded, never over max',()=>{
 const g=fixture(),w=g.state.units.filter(u=>u.team===0&&u.hp>0).slice(0,2);for(const u of w)u.hp=u.maxHp*.5;
 const hp=w.map(u=>u.hp);const h=shareHealing(g,0,1);assert.ok(h>0);for(const[i,u]of w.entries()){assert.ok(u.hp>hp[i]);assert.ok(u.hp<=u.maxHp);assert.ok(u.hp-hp[i]<=u.maxHp*.12+1e-9);}
 for(const u of g.state.units)u.hp=u.maxHp;assert.equal(shareHealing(g,0,12),0);
 g.tribe(0).items.wine=3;assert.equal(consumeRegional(g,0,'wine',1).accepted,true);
});
