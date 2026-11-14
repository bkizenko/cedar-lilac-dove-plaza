import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {supplyApproach,supplyReached} from '../src/game/campAnchor.ts';
import {armorEquipIssue,equipArmor,unequipArmor,wornArmor} from '../src/game/armor.ts';

// Controlled flat-ground reach/holder regression, not native journey evidence.
// Both depots and the existing finite asset are explicit fixture inputs.
function fixture(){
 const g=new Game();g.reset(42);g.enterIsland();g.state.units=[];g.state.buildings=[];
 g.state.trees=[];g.state.stones=[];g.state.forage=[];g.world.heights.fill(4);
 const first=g.makeBld('warehouse',0,0,0),actual=g.makeBld('warehouse',8,0,0);
 g.state.buildings.push(first,actual);g.rebuildWalk();
 const u=g.spawnUnit('worker',4,0,0);u.y=g.height(u.x,u.z);
 const a={id:g.id(),team:0,kind:'paddedTorso',condition:.43,projectId:g.id(),createdAt:g.state.time,
  holder:{kind:'cache',buildingId:actual.id,x:actual.x,z:actual.z}};
 g.state.armor={version:1,assets:[a],metrics:{crafted:1,damagePrevented:0}};
 return{g,u,first,actual,a};
}

test('armor in either of two reachable depots can be equipped regardless of depot iteration order',()=>{
 const{g,u,first,actual,a}=fixture();
 for(const b of [first,actual]){const p=supplyApproach(g,u,b);assert.ok(p);assert.equal(supplyReached(g,u,b,p),true);}
 const identity={id:a.id,projectId:a.projectId,condition:a.condition,createdAt:a.createdAt};
 assert.equal(armorEquipIssue(g,u.id,a.id),null,'another reachable cache must not hide the actual armor cache');
 assert.equal(equipArmor(g,u.id,a.id).accepted,true);assert.equal(wornArmor(g,u),a);
 assert.equal(unequipArmor(g,u.id).accepted,true);
 assert.equal(a.holder.buildingId,first.id,'put-away can still choose any physically reached cache');
 g.state.buildings.reverse();
 assert.equal(equipArmor(g,u.id,a.id).accepted,true,'equipping must follow the asset after a real put-away');
 const restored=decodeGame(structuredClone(encodeGame(g))),piece=restored.state.armor.assets[0];
 assert.deepEqual({id:piece.id,projectId:piece.projectId,condition:piece.condition,createdAt:piece.createdAt},identity);
 assert.equal(restored.state.armor.assets.length,1);assert.equal(piece.holder.id,u.id);
});

test('being at a different depot still cannot equip armor from a remote actual cache',()=>{
 const{g,u,first,actual,a}=fixture();
 actual.x=30;a.holder.x=30;g.rebuildWalk();
 const p=supplyApproach(g,u,first);assert.ok(p);assert.equal(supplyReached(g,u,first,p),true);
 const before=JSON.stringify(a);
 assert.match(armorEquipIssue(g,u.id,a.id),/actual cache/);
 assert.equal(equipArmor(g,u.id,a.id).accepted,false);assert.equal(JSON.stringify(a),before);
 assert.equal(wornArmor(g,u),undefined);
});
