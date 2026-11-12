import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {supplyApproach} from '../src/game/campAnchor.ts';
import {moveArmorAsset,armorCarriedUnits,wornArmor,equipArmor,armorCombatDamage,armorMovementMultiplier,reconcileArmorHolders,validArmorState,settleArmorHandover,ARMOR_RULES} from '../src/game/armor.ts';
/** Controlled finite holder fixture (like armor-production tests), not native travel evidence.
 * One existing authored armor asset is input; crafting itself is covered separately. */
function fixture(){
 const g=new Game();g.reset(42);g.enterIsland();g.state.units=[];g.state.buildings=[];g.state.trees=[];g.state.stones=[];g.state.forage=[];g.world.heights.fill(4);g.state.autoWorkEnabled=false;
 const own=g.makeBld('warehouse',0,0,0),foreign=g.makeBld('warehouse',30,0,1);g.state.buildings.push(own,foreign);g.rebuildWalk();
 const u=g.spawnUnit('worker',-8,0,0),at=supplyApproach(g,u,own);assert.ok(at);u.x=at.x;u.z=at.z;u.y=g.height(u.x,u.z);
 const projectId=g.id(),asset={id:g.id(),team:0,kind:'paddedTorso',condition:.43,projectId,createdAt:g.state.time,holder:{kind:'cache',buildingId:own.id,x:own.x,z:own.z}};
 g.state.armor={version:1,assets:[asset],metrics:{crafted:1,damagePrevented:0}};return{g,u,own,foreign,a:asset};
}
const body=(u,kind='carried')=>({kind,id:u.id,x:u.x,z:u.z});
const depot=b=>({kind:'cache',buildingId:b.id,x:b.x,z:b.z});

test('same existing armor moves worn to nonprotective cargo and invalidates the warmed wearer index',()=>{
 const{g,u,a}=fixture();assert.equal(equipArmor(g,u.id,a.id).accepted,true);assert.equal(wornArmor(g,u),a);
 const before={id:a.id,projectId:a.projectId,condition:a.condition,createdAt:a.createdAt};
 assert.equal(moveArmorAsset(g,a.id,body(u)).accepted,true);assert.equal(wornArmor(g,u),undefined);assert.equal(u.armorCargoId,a.id);assert.equal(armorMovementMultiplier(g,u),1);assert.equal(armorCombatDamage(g,u,10),10);assert.equal(armorCarriedUnits(g,u.id),ARMOR_RULES.loadUnits);assert.equal(equipArmor(g,u.id,a.id).accepted,false);
 for(const[key,value]of Object.entries(before))assert.equal(a[key],value);assert.equal(g.state.armor.assets.length,1);assert.equal(g.state.armor.metrics.crafted,1);assert.equal(validArmorState(g.state),true);
});

test('cache transfer requires actual carrier reach and foreign cache ownership survives a strict save',()=>{
 const{g,u,a,foreign}=fixture();assert.equal(moveArmorAsset(g,a.id,body(u)).accepted,true);const before=JSON.stringify(a);
 assert.equal(moveArmorAsset(g,a.id,depot(foreign),1).accepted,false);assert.equal(JSON.stringify(a),before,'distant delivery neither changes holder nor resets condition');
 // Arrange the arrived guard case at the real cache approach. This is not a journey test.
 const at=supplyApproach(g,u,foreign);assert.ok(at);u.x=at.x;u.z=at.z;u.y=g.height(u.x,u.z);
 assert.equal(moveArmorAsset(g,a.id,depot(foreign),1).accepted,true);assert.equal(a.team,1);assert.equal(a.holder.buildingId,foreign.id);assert.equal(a.condition,.43);assert.equal(armorCarriedUnits(g,u.id),0);assert.equal(u.armorCargoId,undefined);assert.equal(validArmorState(g.state),true);
 const saved=encodeGame(g);validateGameSave(saved);const copy=decodeGame(saved),restored=copy.state.armor.assets.find(x=>x.id===a.id);assert.equal(restored.projectId,a.projectId);assert.equal(restored.condition,.43);assert.equal(restored.team,1);assert.deepEqual(restored.holder,a.holder);assert.equal(copy.state.tribes[1].items?.paddedArmor||0,0,'no duplicate bulk armor stock');
});

test('carried custody follows real capture, death and scoped handover without becoming worn',()=>{
 const{g,u,a}=fixture();assert.equal(moveArmorAsset(g,a.id,body(u)).accepted,true);u.team=1;reconcileArmorHolders(g);assert.equal(a.team,1);assert.equal(wornArmor(g,u),undefined);
 u.x+=3;u.z+=2;reconcileArmorHolders(g);assert.equal(a.holder.x,u.x);assert.equal(a.holder.z,u.z);
 settleArmorHandover(g.state,{fromTeam:1,toTeam:0,scope:'community',residentIds:[u.id],siteIds:[]});u.team=0;assert.equal(a.team,0);assert.equal(a.holder.kind,'carried');assert.equal(validArmorState(g.state),true);
 u.hp=0;reconcileArmorHolders(g);assert.deepEqual(a.holder,{kind:'ground',x:u.x,z:u.z});assert.equal(a.id,g.state.armor.assets[0].id);assert.equal(a.condition,.43);assert.equal(armorCarriedUnits(g,u.id),0);assert.equal(u.armorCargoId,undefined);assert.equal(validArmorState(g.state),true);
});

test('malformed carried holders and remote body transfers are refused without losing the original asset',()=>{
 const{g,u,a}=fixture();assert.equal(moveArmorAsset(g,a.id,body(u)).accepted,true);const other=g.spawnUnit('worker',18,12,0),before=JSON.stringify(a);
 assert.equal(moveArmorAsset(g,a.id,body(other)).accepted,false);assert.equal(moveArmorAsset(g,a.id,{kind:'ground',x:u.x+40,z:u.z}).accepted,false);assert.equal(JSON.stringify(a),before);
 const saved=encodeGame(g);for(const alter of [x=>x.holder.id=9999999,x=>x.holder.x=Infinity,x=>x.team=1,x=>x.holder.kind='invented']){const bad=structuredClone(saved);alter(bad.state.armor.assets[0]);assert.throws(()=>validateGameSave(bad));}
 assert.equal(validArmorState(g.state),true);
});


test('single armor marker and carried holder must agree in both directions',()=>{
 const{g,u,a}=fixture();assert.equal(moveArmorAsset(g,a.id,body(u)).accepted,true);assert.equal(u.armorCargoId,a.id);
 const bad=structuredClone(g.state);delete bad.units.find(p=>p.id===u.id).armorCargoId;assert.equal(validArmorState(bad),false,'missing reciprocal marker');
 const orphan=structuredClone(g.state);orphan.armor.assets[0].holder={kind:'ground',x:u.x,z:u.z};assert.equal(validArmorState(orphan),false,'orphan body marker');
 const second={...a,id:g.id(),projectId:g.id(),holder:{kind:'ground',x:u.x,z:u.z}};g.state.armor.assets.push(second);g.state.armor.metrics.crafted++;
 assert.equal(moveArmorAsset(g,second.id,body(u)).accepted,false);assert.equal(u.armorCargoId,a.id);assert.equal(second.holder.kind,'ground');
 assert.equal(moveArmorAsset(g,a.id,{kind:'ground',x:u.x,z:u.z}).accepted,true);assert.equal(u.armorCargoId,undefined);assert.equal(validArmorState(g.state),true);
});
