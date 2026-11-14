import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {decodeGame,encodeGame} from '../src/game/persistence.ts';
import {equipWaterVessel,POTTERY_RULES,tickClay,validClayState,wearWaterVessel} from '../src/game/pottery.ts';
import {beginWaterCollection} from '../src/game/survivalNeeds.ts';
import {prepareOwnedHandover} from '../src/game/communityHandover.ts';

let opening;
function fixture(){
 opening??=nativeDairyVillage();
 const g=decodeGame(structuredClone(opening.save));
 return {g,u:g.state.units.find(u=>u.id===opening.worker),origin:opening.origin};
}
const terrain=g=>createHash('sha256').update(JSON.stringify({heights:Array.from(g.world.heights),rivers:g.world.rivers,features:g.world.features})).digest('hex');
function equip(){const f=fixture();assert.equal(equipWaterVessel(f.g,f.u.id),true,f.g.state.banner);return f;}

test('the actual pottery handoff consumes one vessel and allocates one stable equipped identity',()=>{
 const{g,u,origin}=fixture(),next=g.state.nextId;
 assert.equal(g.tribe(0).items.pottery,1);assert.equal(g.tribe(0).potteryOrigins[0].count,1);
 assert.equal(equipWaterVessel(g,u.id),true,g.state.banner);
 assert.equal(u.waterVessel.id,next);assert.equal(g.state.nextId,next+1);
 assert.equal(g.tribe(0).items.pottery,0);assert.equal(g.tribe(0).potteryOrigins[0].count,0);
 assert.deepEqual(u.waterVessel.origin,origin);assert.equal(u.waterVessel.tripsRemaining,POTTERY_RULES.jarTrips);
 const jar=structuredClone(u.waterVessel);
 assert.equal(equipWaterVessel(g,u.id),false);assert.equal(g.state.nextId,next+1);
 assert.deepEqual(u.waterVessel,jar);assert.equal(g.state.clay.metrics.vesselsEquipped,1);
 const copy=decodeGame(structuredClone(encodeGame(g))),owner=copy.state.units.find(p=>p.id===u.id);
 assert.deepEqual(owner.waterVessel,jar);assert.equal(copy.tribe(0).items.pottery,0);
});

test('one identified jar physically collects and delivers 32 L on unchanged native terrain, retaining identity through reload',()=>{
 let{g,u}=equip();const uid=u.id,id=u.waterVessel.id,initialTerrain=terrain(g),initialPosition={x:u.x,z:u.z};
 assert.ok(Number.isSafeInteger(id));
 g.clearSelect();g.selectEntity(u);
 const started=beginWaterCollection(g);assert.equal(started.accepted,true,started.reason);
 assert.equal(started.actorId,uid);
 const deadline=g.state.time+240;
 while(u.waterWork?.phase!=='returning'&&g.state.time<deadline){g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);}
 assert.equal(u.waterWork?.phase,'returning',u.workReason);assert.equal(u.waterWork.liters,32);
 assert.ok(Math.hypot(u.x-initialPosition.x,u.z-initialPosition.z)>1,'the real carrier walks to freshwater');
 assert.equal(u.waterVessel.id,id);assert.equal(u.waterVessel.tripsRemaining,10);
 g=decodeGame(structuredClone(encodeGame(g)));u=g.state.units.find(v=>v.id===uid);
 assert.equal(u.waterVessel.id,id);assert.equal(u.waterWork.liters,32);
 const delivered=g.tribe(0).survival.waterDeliveredLiters;
 while(u.waterWork&&g.state.time<deadline){g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);}
 assert.equal(u.waterWork,undefined,u.workReason);assert.equal(g.tribe(0).survival.waterDeliveredLiters-delivered,32);
 assert.equal(u.waterVessel.id,id);assert.equal(u.waterVessel.tripsRemaining,9);
 assert.equal(terrain(g),initialTerrain);assert.equal(g.tribe(0).items.pottery,0);
 const restored=decodeGame(structuredClone(encodeGame(g)));
 assert.equal(restored.state.units.find(v=>v.id===uid).waterVessel.id,id);
 assert.equal(restored.state.units.filter(v=>v.waterVessel?.id===id).length,1);
});

test('optional identity leaves legacy jars intact and rejects malformed, duplicate and cross-asset aliases',()=>{
 const{g,u}=equip(),save=structuredClone(encodeGame(g));
 const old=structuredClone(save);delete old.state.units.find(v=>v.id===u.id).waterVessel.id;
 const legacy=decodeGame(old).state.units.find(v=>v.id===u.id).waterVessel;
 assert.equal(legacy.id,undefined);assert.equal(legacy.tripsRemaining,10);assert.deepEqual(legacy.origin,u.waterVessel.origin);
 for(const id of [0,-1,.5,Number.MAX_SAFE_INTEGER+1,g.state.nextId,u.id,g.state.buildings[0].id,g.state.trees[0].id]){
  const bad=structuredClone(save);bad.state.units.find(v=>v.id===u.id).waterVessel.id=id;
  assert.equal(validClayState(bad.state),false,`invalid or occupied ID ${id}`);
  assert.throws(()=>decodeGame(bad));
 }
 const duplicate=structuredClone(save),other=duplicate.state.units.find(v=>v.id!==u.id);
 other.waterVessel=structuredClone(u.waterVessel);
 assert.equal(validClayState(duplicate.state),false);assert.throws(()=>decodeGame(duplicate));
 // An independently valid finite armor fixture must not share the jar identity.
 const armor=structuredClone(save),assetId=armor.state.nextId++,projectId=armor.state.nextId++;
 armor.state.armor={version:1,assets:[{id:assetId,team:u.team,kind:'paddedTorso',condition:.6,projectId,createdAt:g.state.time,holder:{kind:'ground',x:u.x,z:u.z}}],metrics:{crafted:1,damagePrevented:0}};
 assert.doesNotThrow(()=>decodeGame(structuredClone(armor)));
 armor.state.units.find(v=>v.id===u.id).waterVessel.id=assetId;
 assert.equal(validClayState(armor.state),false);assert.throws(()=>decodeGame(armor));
});

test('actual resident handover carries the same jar; break and death retire it once without a pottery refund',()=>{
 const{g,u}=equip(),jar=structuredClone(u.waterVessel);
 const transfer=prepareOwnedHandover(g,0,1,{siteIds:[],residentIds:[u.id],boatIds:[],occupationId:0});
 assert.equal(transfer.accepted,true,transfer.reason);g.commitCommunityState(transfer.state);
 let copy=decodeGame(structuredClone(encodeGame(g))),owner=copy.state.units.find(v=>v.id===u.id);
 assert.equal(owner.team,1);assert.deepEqual(owner.waterVessel,jar);
 const stock=copy.state.tribes.map(t=>t.items?.pottery||0),broken=copy.state.clay.metrics.vesselsBroken;
 for(let i=0;i<POTTERY_RULES.jarTrips-1;i++){wearWaterVessel(copy,owner);assert.equal(owner.waterVessel.id,jar.id);}
 wearWaterVessel(copy,owner);wearWaterVessel(copy,owner);
 assert.equal(owner.waterVessel,undefined);assert.equal(copy.state.clay.metrics.vesselsBroken,broken+1);
 assert.deepEqual(copy.state.tribes.map(t=>t.items?.pottery||0),stock);
 assert.doesNotThrow(()=>decodeGame(structuredClone(encodeGame(copy))));
 const dead=equip(),deadId=dead.u.waterVessel.id;dead.u.hp=0;
 tickClay(dead.g);tickClay(dead.g);
 assert.equal(dead.u.waterVessel,undefined);assert.equal(dead.g.state.clay.metrics.vesselsBroken,1);
 assert.equal(dead.g.state.units.some(v=>v.waterVessel?.id===deadId),false);
 assert.equal(dead.g.tribe(0).items.pottery,0);
 assert.doesNotThrow(()=>decodeGame(structuredClone(encodeGame(dead.g))));
});
