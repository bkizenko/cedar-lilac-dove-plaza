import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {encodeGame,decodeGame} from '../src/game/persistence.ts';import {supplyApproach} from '../src/game/campAnchor.ts';
import {loadWeaponCargo,deliverWeaponCargo,pickupWeaponCargo,reconcileWeaponCargo,validWeaponCargoState,weaponCargoLoad,WEAPON_CARGO_RULES,WEAPON_CARGO_KINDS} from '../src/game/weaponCargo.ts';
/** Controlled finite physical-cache fixture; not native journey or crafting evidence. */
function fixture(){const g=new Game();g.reset(42);g.enterIsland();g.state.units=[];g.state.buildings=[];g.state.trees=[];g.state.stones=[];g.state.forage=[];g.world.heights.fill(4);g.state.autoWorkEnabled=false;const own=g.makeBld('warehouse',0,0,0),foreign=g.makeBld('warehouse',30,0,1);g.state.buildings.push(own,foreign);g.rebuildWalk();const u=g.spawnUnit('worker',-8,0,0);arrive(g,u,own);Object.assign(g.tribe(0),{spears:8,bows:6,blades:4});return{g,u,own,foreign};}
function arrive(g,u,drop){const p=supplyApproach(g,u,drop);assert.ok(p);u.x=p.x;u.z=p.z;u.y=g.height(u.x,u.z);}
const totals=g=>Object.fromEntries(WEAPON_CARGO_KINDS.map(k=>[k,g.state.tribes.reduce((n,t)=>n+t[k],0)+g.state.units.reduce((n,u)=>n+(u.weaponCargo?.[k]||0),0)+(g.state.droppedWeaponCargo||[]).reduce((n,p)=>n+(p.stock[k]||0),0)]));

test('real stock loads once and foreign delivery requires physical cache reach without arming the carrier',()=>{
 const{g,u,foreign}=fixture(),before=totals(g),combat={type:u.type,dmg:u.dmg,militia:u.militia};
 assert.equal(loadWeaponCargo(g,u.id,'spears',3).accepted,true);assert.equal(weaponCargoLoad(u),9);assert.equal(g.tribe(0).spears,5);assert.equal(loadWeaponCargo(g,u.id,'spears',6).accepted,false);assert.deepEqual(totals(g),before);
 assert.equal(deliverWeaponCargo(g,u.id,'spears',3,1,foreign.id).accepted,false);assert.equal(u.weaponCargo.spears,3);
 arrive(g,u,foreign);assert.equal(deliverWeaponCargo(g,u.id,'spears',3,1,foreign.id).accepted,true);assert.equal(u.weaponCargo,undefined);assert.equal(deliverWeaponCargo(g,u.id,'spears',3,1,foreign.id).accepted,false);assert.deepEqual(totals(g),before);assert.deepEqual({type:u.type,dmg:u.dmg,militia:u.militia},combat);
});

test('existing body bundle follows capture and death becomes recoverable actual ground stock',()=>{
 const{g,u,foreign}=fixture(),before=totals(g);assert.equal(loadWeaponCargo(g,u.id,'bows',2).accepted,true);u.team=1;
 assert.equal(u.weaponCargo.bows,2);assert.deepEqual(totals(g),before);u.hp=0;const point={x:u.x,z:u.z};reconcileWeaponCargo(g);assert.equal(u.weaponCargo,undefined);assert.equal(g.state.droppedWeaponCargo.length,1);const p=g.state.droppedWeaponCargo[0];assert.equal(p.team,1);assert.equal(p.x,point.x);assert.equal(p.z,point.z);assert.deepEqual(totals(g),before);
 const receiver=g.spawnUnit('worker',point.x-1,point.z,1);assert.equal(pickupWeaponCargo(g,receiver.id,p.id,'bows',2).accepted,true);assert.equal(g.state.droppedWeaponCargo.length,0);arrive(g,receiver,foreign);assert.equal(deliverWeaponCargo(g,receiver.id,'bows',2).accepted,true);assert.deepEqual(totals(g),before);
});

test('strict bundle validation rejects fabricated kinds, counts, IDs and keeps carried/ground state through reload',()=>{
 const{g,u}=fixture();assert.equal(loadWeaponCargo(g,u.id,'blades',2).accepted,true);let raw=encodeGame(g);assert.equal(validWeaponCargoState(raw.state),true);let restored=decodeGame(raw);assert.equal(restored.state.units.find(p=>p.id===u.id).weaponCargo.blades,2);
 for(const value of [{blades:-1},{blades:.5},{imaginary:1},{spears:41},{}]){const bad=structuredClone(raw);bad.state.units.find(p=>p.id===u.id).weaponCargo=value;assert.equal(validWeaponCargoState(bad.state),false);}
 u.hp=0;reconcileWeaponCargo(g);raw=encodeGame(g);restored=decodeGame(raw);assert.equal(restored.state.droppedWeaponCargo[0].stock.blades,2);
 for(const change of [p=>p.id=u.id,p=>p.x=Infinity,p=>p.team=999,p=>p.stock={bows:NaN}]){const bad=structuredClone(raw);change(bad.state.droppedWeaponCargo[0]);assert.equal(validWeaponCargoState(bad.state),false);}
});

test('saturated ground custody retains the dead body bundle through actual cleanup instead of deleting weapons',()=>{
 const{g,u}=fixture();assert.equal(loadWeaponCargo(g,u.id,'spears',2).accepted,true);
 g.state.droppedWeaponCargo=Array.from({length:WEAPON_CARGO_RULES.maximumGroundBundles},(_,i)=>({id:g.id(),team:0,x:200+i*.1,z:200,droppedAt:g.state.time,stock:{bows:1}}));
 const before=totals(g);u.hp=0;g.step(1/30);assert.deepEqual(g.simulationErrors,[]);assert.ok(g.state.units.some(p=>p.id===u.id),'cleanup must retain the real saturated holder');assert.equal(u.weaponCargo.spears,2);assert.deepEqual(totals(g),before);assert.equal(validWeaponCargoState(g.state),true);
});
