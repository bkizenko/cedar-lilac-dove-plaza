import test from 'node:test';import assert from 'node:assert/strict';import {writeFileSync} from 'node:fs';import {isAbsolute} from 'node:path';import {createHash} from 'node:crypto';
import {earnNativePackHorse,nativeDrive} from './helpers/native-pack-horse.mjs';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {orderExploration} from '../src/game/explorationOrders.ts';
import {beginExpedition} from '../src/game/journeys.ts';
import {expeditionAtOwnCache,expeditionHome,expeditionProvisionCapacity,expeditionProvisionNourishment,returnExpeditionProvisions,consumeExpeditionProvisions} from '../src/game/expeditionProvisions.ts';
import {returnPackJourneyCare} from '../src/game/packJourneyCare.ts';
import {foodInventory} from '../src/game/pantry.ts';
import {tickStolenCargo} from '../src/game/stolenCargo.ts';
let earned;
const shape=g=>createHash('sha256').update(JSON.stringify({heights:Array.from(g.world.heights),rivers:g.world.rivers,features:g.world.features})).digest('hex');
const save=(name,g)=>{const p=process.env[name];if(p){assert.ok(isAbsolute(p));writeFileSync(p,JSON.stringify(encodeGame(g)));}};
const select=(g,u)=>{g.clearSelect();g.selectEntity(u);};
const moveHome=(g,u)=>{select(g,u);const h=expeditionHome(g,u);assert.ok(h);g.issueMove(h.spot.x,h.spot.z);assert.ok(nativeDrive(g,180,()=>!!expeditionAtOwnCache(g,u)),u.workReason);};
test('actual captured and trained horse physically provisions an expedition, retains typed meals across reload and returns leftovers at a warehouse',()=>{
 let {g,workerId,peerId,animalId,warehouseId}=earnNativePackHorse(),u=g.state.units.find(u=>u.id===workerId),peer=g.state.units.find(u=>u.id===peerId);const terrain=shape(g);
 assert.equal(u.packAnimal.id,animalId);moveHome(g,u);moveHome(g,peer);
 const peerBefore=foodInventory(g.tribe(0));assert.equal(beginExpedition(g,peer),true);assert.ok(peer.expedition.food<=24+1e-7);const unassisted=peer.expedition.food;assert.ok(peer.expedition.foodCustody);assert.equal(returnExpeditionProvisions(g,peer),true);for(const [kind,n] of Object.entries(peerBefore))assert.ok(Math.abs(foodInventory(g.tribe(0))[kind]-n)<1e-7);
 // A real movement order to connected unknown ground; remote Explore must pack
 // only after a physical cache return, even though this person has empty hands.
 select(g,u);const target=g.findExploreTarget(u);assert.ok(target);g.issueMove(target.x,target.z);assert.ok(nativeDrive(g,8,()=>!expeditionAtOwnCache(g,u)));assert.equal(u.carry,0);
 const before=foodInventory(g.tribe(0));assert.equal(orderExploration(g,u),null);assert.equal(u.exploreAfterDelivery,true);assert.equal(u.expedition,undefined);assert.deepEqual(foodInventory(g.tribe(0)),before);
 assert.ok(nativeDrive(g,180,()=>!!u.expedition),u.workReason);assert.ok(expeditionAtOwnCache(g,u),'food was debited only at cache contact');
 assert.ok(u.expedition.food>unassisted,'real horse increases human supplies after its own finite care packet is reserved');assert.ok(u.expedition.food+u.packJourneySupplies.feedLoaded+u.packJourneySupplies.waterLoaded<=expeditionProvisionCapacity(u)+1e-7);
 assert.ok(u.expedition.foodCustody.lots.every(l=>['bread','pulses'].includes(l.kind)));assert.ok(u.packJourneySupplies);assert.equal(u.packJourneySupplies.animalId,animalId);save('PACK_EXPEDITION_PAID_SAVE',g);
 const loaded=u.expedition.food,nourishment=expeditionProvisionNourishment(u),position={x:u.x,z:u.z};nativeDrive(g,5);assert.ok(Math.hypot(u.x-position.x,u.z-position.z)>1);assert.ok(u.expedition.food<loaded);assert.ok(expeditionProvisionNourishment(u)<nourishment);
 const raw=encodeGame(g);g=decodeGame(raw);u=g.state.units.find(p=>p.id===workerId);assert.equal(u.packAnimal.id,animalId);assert.deepEqual(u.expedition,raw.state.units.find(p=>p.id===workerId).expedition);save('PACK_EXPEDITION_MID_SAVE',g);
 select(g,u);g.soundRecall();assert.ok(nativeDrive(g,240,()=>!u.expedition&&!u.recalled),u.workReason);assert.equal(u.packJourneySupplies,undefined);assert.equal(shape(g),terrain);assert.ok(g.state.buildings.some(b=>b.id===warehouseId));assert.doesNotThrow(()=>decodeGame(encodeGame(g)));earned=encodeGame(g);save('PACK_EXPEDITION_EARNED_SAVE',g);
});
test('legacy expedition reload does not create supplies and finite typed packets survive rejected remote load and death parcel caps',()=>{
 assert.ok(earned,'actual earned opening required');let g=decodeGame(structuredClone(earned)),u=g.state.units.find(u=>u.team===0&&u.packAnimal);moveHome(g,u);assert.equal(beginExpedition(g,u),true);const paid=encodeGame(g),id=u.id;
 for(const mutate of [p=>p.food=101,p=>p.foodCustody.lots[0].units+=1,p=>p.foodCustody.lots[0].kind='grain',p=>p.foodUsed=-1]){const bad=structuredClone(paid);mutate(bad.state.units.find(p=>p.id===id).expedition);assert.throws(()=>decodeGame(bad));}
 const legacy=structuredClone(paid),lu=legacy.state.units.find(p=>p.id===id);lu.expedition={food:12,returning:false,forage:0};delete lu.packJourneySupplies;const restored=decodeGame(legacy),le=restored.state.units.find(p=>p.id===id).expedition;assert.deepEqual(le,{food:12,returning:false,forage:0});
 const packet=structuredClone(u.expedition),units=packet.food;u.hp=0;tickStolenCargo(g,0);assert.equal(u.expedition,undefined);const parcels=g.state.droppedCargo.parcels.filter(p=>p.fromTeam===0&&p.kind==='food');assert.ok(Math.abs(parcels.reduce((n,p)=>n+p.amount,0)-units-(u.packJourneySupplies?.feedLoaded??0))<1e-6||Math.abs(parcels.reduce((n,p)=>n+p.amount,0)-units)<1e-6);assert.ok(parcels.some(p=>p.food==='bread'));assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
