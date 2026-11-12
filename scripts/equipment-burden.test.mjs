import test from 'node:test';import assert from 'node:assert/strict';
import {equipmentLoadUnits,carriedLoadUnits,burdenPace,vesselLoad} from '../src/game/carriedLoad.ts';
import {carryingCapacity,loadedHaulSpeed} from '../src/game/haulage.ts';
const body=()=>({type:'worker',hp:100,maxHp:100,team:0,carry:0,carryType:null,items:{}});
test('real carried equipment consumes capacity and slows a person and vessel without becoming worn protection',()=>{
 const u=body(),empty=carryingCapacity(u,'wood'),pace=loadedHaulSpeed(u),boat=vesselLoad({capacity:2},[u]);
 assert.equal(equipmentLoadUnits(u),0);assert.equal(carriedLoadUnits(u),0);
 u.armorCargoId=42;u.farmToolCargoId=43;u.weaponCargo={spears:2,bows:1};
 assert.equal(equipmentLoadUnits(u),14);assert.ok(carryingCapacity(u,'wood')<empty);assert.ok(loadedHaulSpeed(u)<pace);assert.ok(vesselLoad({capacity:2},[u]).pace<boat.pace);
 assert.equal(u.militia,undefined);assert.equal(u.farmTool,undefined);
 delete u.armorCargoId;delete u.farmToolCargoId;delete u.weaponCargo;
 assert.equal(carryingCapacity(u,'wood'),empty);assert.equal(loadedHaulSpeed(u),pace);
});
test('equipment load is counted once and cannot produce negative capacity or unbounded speed penalties',()=>{
 const u=body();u.weaponCargo={spears:100};assert.equal(carryingCapacity(u,'stone'),0);assert.ok(loadedHaulSpeed(u)>=.52);assert.ok(burdenPace(carriedLoadUnits(u))>=.52);
});
