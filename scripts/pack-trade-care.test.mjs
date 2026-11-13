import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {decodeGame,encodeGame} from '../src/game/persistence.ts';
import {quotePackTradeCare,commitPackJourneyCare,returnPackJourneyCare,validPackJourneySupplies} from '../src/game/packJourneyCare.ts';
import {tradeCargoCapacity} from '../src/game/tradeCargo.ts';
import {carryingCapacity} from '../src/game/haulage.ts';
import {equipCaravan,recoverCaravanEquipment} from '../src/game/caravans.ts';
import {foodInventory} from '../src/game/pantry.ts';
import {CARRIED_LOAD_RULES} from '../src/game/carriedLoad.ts';
import {GATHER} from '../src/game/constants.ts';
const ready=!!process.env.PACK_TRADE_EARNED_SAVE;
const check=(name,fn)=>test(name,{skip:ready?false:'Requires the genuine captured/trained/home-returned horse checkpoint'},fn);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} versus ${b}`);
function fixture(){const g=decodeGame(JSON.parse(readFileSync(process.env.PACK_TRADE_EARNED_SAVE,'utf8'))),u=g.state.units.find(u=>u.team===0&&u.packAnimal?.id===6354);assert.ok(u&&u.id===6223&&!u.expedition&&!u.packJourneySupplies);return {g,u,t:g.tribe(u.team)};}
check('actual earned horse care quotes are pure and finite, and merchandise shares the same capacity',()=>{
 const{g,u}=fixture(),before=JSON.stringify(encodeGame(g)),q=quotePackTradeCare(g,u,500);assert.ok(q?.packet);assert.equal(q.packet.animalId,6354);assert.equal(q.maximumHumanUnits,0);assert.equal(JSON.stringify(encodeGame(g)),before);
 for(const kind of ['wood','stone','food']){const cap=tradeCargoCapacity(u,kind,q.packet),load=q.packet.feedLoaded/CARRIED_LOAD_RULES.provisionFood+q.packet.waterLoaded/CARRIED_LOAD_RULES.waterLiters;assert.ok(cap<carryingCapacity(u,kind));assert.ok(cap/GATHER[kind].carry+load<=carryingCapacity(u,kind)/GATHER[kind].carry+1e-8);assert.ok((cap+1)/GATHER[kind].carry+load>carryingCapacity(u,kind)/GATHER[kind].carry);}
 assert.equal(quotePackTradeCare(g,u,Infinity),null);assert.equal(quotePackTradeCare(g,u,-1),null);assert.equal(quotePackTradeCare(g,u,1e9),null);assert.equal(JSON.stringify(encodeGame(g)),before);
});
check('same actual cache commits care once and returns exact plant lots/water without new income',()=>{
 const{g,u,t}=fixture(),before={food:t.food,water:t.survival.waterLiters,lots:foodInventory(t),events:JSON.stringify(g.state.simulationEvents)},q=quotePackTradeCare(g,u,500);assert.ok(q?.packet);assert.equal(commitPackJourneyCare(g,u,q),true);near(t.food,before.food-q.packet.feedLoaded);near(t.survival.waterLiters,before.water-q.packet.waterLoaded);for(const k of Object.keys(before.lots))near(foodInventory(t)[k],before.lots[k]-(q.packet.feed[k]||0));assert.equal(commitPackJourneyCare(g,u,q),false);assert.ok(validPackJourneySupplies(g.state));assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
 assert.equal(returnPackJourneyCare(g,u),true);near(t.food,before.food);near(t.survival.waterLiters,before.water);for(const k of Object.keys(before.lots))near(foodInventory(t)[k],before.lots[k]);assert.equal(JSON.stringify(g.state.simulationEvents),before.events);assert.equal(u.packJourneySupplies,undefined);const once=JSON.stringify(encodeGame(g));assert.equal(returnPackJourneyCare(g,u),true);assert.equal(JSON.stringify(encodeGame(g)),once);
});
check('real borrowed weapon reduces the same horse cargo budget and returning it restores its exact asset',()=>{
 const{g,u,t}=fixture(),before={spears:t.spears,bows:t.bows,blades:t.blades},cap=tradeCargoCapacity(u,'wood'),animal=u.packAnimal.id;assert.equal(equipCaravan(g,u),true);assert.equal(u.packAnimal.id,animal);assert.ok(tradeCargoCapacity(u,'wood')<cap);assert.equal(t.spears+t.bows+(t.blades||0),before.spears+before.bows+(before.blades||0)-1);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));recoverCaravanEquipment(g,u);assert.equal(tradeCargoCapacity(u,'wood'),cap);assert.deepEqual({spears:t.spears,bows:t.bows,blades:t.blades},before);assert.equal(u.packAnimal.id,animal);
});
