import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {foodInventory} from '../src/game/pantry.ts';
import {planFoodWithdrawal,commitFoodWithdrawal,setCarriedFood,carriedFoodLots,withdrawCarriedFood,receiveCarriedFood} from '../src/game/tradeFood.ts';
import {reserveTradeGoods,releaseTradeReservation} from '../src/game/tradeReservations.ts';
import {markStolenLoad,tickStolenCargo,droppedParcels} from '../src/game/stolenCargo.ts';
// Declared finite initial lots on unchanged generated terrain: conservation tests,
// not earned acquisition or a public cross-society journey qualification.
function fixture(){const g=new Game();g.reset(42);g.enterIsland();const u=g.state.units.find(u=>u.team===0&&u.type==='worker');u.carry=0;u.carryType=null;u.order='hold';delete u.carryFood;Object.assign(g.tribe(0),{food:6,foodLots:{bread:4,fish:2}});return{g,u};}
test('exact loaded food survives strict reload, partial use and return without relabelling or a second debit',()=>{
 const {g,u}=fixture(),lots=planFoodWithdrawal(g,0,6);assert.deepEqual(lots,{fish:2,bread:4});assert.equal(commitFoodWithdrawal(g,0,lots),true);setCarriedFood(u,lots);assert.equal(g.tribe(0).food,0);
 const copy=decodeGame(encodeGame(g)),v=copy.state.units.find(x=>x.id===u.id);assert.deepEqual(carriedFoodLots(v),lots);
 assert.deepEqual(withdrawCarriedFood(v,1,'bread'),{bread:1});assert.deepEqual(carriedFoodLots(v),{fish:2,bread:3});
 receiveCarriedFood(copy,0,v);v.carry=0;v.carryType=null;delete v.carryFood;
 assert.equal(foodInventory(copy.tribe(0)).bread,3);assert.equal(foodInventory(copy.tribe(0)).fish,2);assert.equal(foodInventory(copy.tribe(0)).provisions,0);assert.equal(copy.tribe(0).food,5);assert.doesNotThrow(()=>decodeGame(encodeGame(copy)));
});
test('food escrow returns the same seller lots exactly once and failed withdrawal changes nothing',()=>{
 const {g,u}=fixture();Object.assign(g.tribe(1),{food:6,foodLots:{grain:2,bread:4}});const before=JSON.stringify(g.tribe(1));assert.equal(planFoodWithdrawal(g,1,7),null);assert.equal(JSON.stringify(g.tribe(1)),before);
 assert.equal(reserveTradeGoods(g,u,1,{give:'wood',giveAmt:1,get:'food',getAmt:6}),true);assert.deepEqual(u.tradeReservation.foodLots,{grain:2,bread:4});assert.equal(g.tribe(1).food,0);releaseTradeReservation(g,u);releaseTradeReservation(g,u);assert.equal(g.tribe(1).food,6);assert.equal(foodInventory(g.tribe(1)).bread,4);assert.equal(foodInventory(g.tribe(1)).grain,2);assert.equal(foodInventory(g.tribe(1)).provisions,0);
});
test('dead mixed-food carrier drops exact kinds with original owner and raid provenance only once',()=>{
 const{g,u}=fixture();setCarriedFood(u,{bread:4,fish:2});assert.equal(markStolenLoad(g,u,0,42),true);u.hp=0;tickStolenCargo(g,.1);tickStolenCargo(g,.1);const p=droppedParcels(g).filter(p=>p.originalOwnerTeam===0&&p.raidBandId===42);assert.equal(p.reduce((n,p)=>n+p.amount,0),6);assert.equal(p.find(p=>p.food==='bread').amount,4);assert.equal(p.find(p=>p.food==='fish').amount,2);assert.equal(u.carry,0);assert.equal(u.carryFoodLots,undefined);
});
test('strict saves reject forged mixed cargo totals and unknown food kinds; legacy single food remains valid',()=>{
 const {g,u}=fixture();setCarriedFood(u,{bread:4,fish:2});const raw=encodeGame(g);for(const lots of [{bread:600},{bread:4,fish:2,fake:1},{bread:4,fish:-2}]){const bad=structuredClone(raw);bad.state.units.find(v=>v.id===u.id).carryFoodLots=lots;assert.throws(()=>decodeGame(bad));}delete u.carryFoodLots;u.carryFood='bread';assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
