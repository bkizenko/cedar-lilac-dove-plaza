import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {decodeGame,encodeGame} from '../src/game/persistence.ts';
import {tickProduction} from '../src/game/production.ts';
import {tickStolenCargo,claimParcel,cancelCargoTrip,validDroppedCargoState,markStolenLoad,STOLEN_CARGO_RULES} from '../src/game/stolenCargo.ts';
import {hasTaskCommitment} from '../src/game/workCommitments.ts';

// Finite authored custody cases on unchanged native terrain, not a trade/campaign gate.
test('production-first death preserves trade items in real parcels, including a full-table retry through ordinary corpse cleanup and reload',()=>{
 const f=nativeDairyVillage(),g=decodeGame(f.save),u=g.state.units.find(u=>u.id===f.worker);
 u.hp=0;u.itemCargo={cordage:3};u.tradeNeedsId=g.id();
 tickStolenCargo(g,0); // Creates the parcel ledger, moving these exact three goods.
 assert.equal(u.itemCargo,undefined);assert.equal(g.state.droppedCargo.parcels[0].amount,3);
 g.state.droppedCargo.parcels=[];g.state.droppedCargo.ledger.dropped=0;
 u.itemCargo={cordage:3};markStolenLoad(g,u,1);
 // Reserve a finite outside pile from existing settlement stone, away from the body.
 const reserve=STOLEN_CARGO_RULES.maximumParcels;assert.ok(g.tribe(0).stone>=reserve||g.tribe(0).wood>=reserve);
 const kind=g.tribe(0).stone>=reserve?'stone':'wood';g.tribe(0)[kind]-=reserve;
 for(let i=0;i<reserve;i++)g.state.droppedCargo.parcels.push({id:g.id(),kind,amount:1,x:u.x+20,z:u.z,originalOwnerTeam:0,fromTeam:0,droppedAt:g.state.time});
 tickProduction(g,0);
 assert.equal(u.itemCargo.cordage,3);assert.equal(u.tradeCargoPending,true);assert.equal(g.state.production.metrics.lost.cordage||0,0);
 delete u.tradeNeedsId; // The trade reconciler may release its offer before a parcel slot opens.
 g.state.paused=false;g.step(.1);
 assert.ok(g.state.units.includes(u),'full parcel table retains the actual corpse and load');assert.equal(u.itemCargo.cordage,3);
 assert.deepEqual(g.simulationErrors,[]);
 const saved=encodeGame(g);assert.doesNotThrow(()=>decodeGame(saved));
 const removed=g.state.droppedCargo.parcels.pop();g.tribe(0)[removed.kind]+=removed.amount;
 tickProduction(g,0);tickStolenCargo(g,0);
 assert.equal(u.itemCargo,undefined);assert.equal(u.tradeCargoPending,undefined);
 assert.equal(g.state.droppedCargo.parcels.filter(p=>p.kind==='cordage').reduce((n,p)=>n+p.amount,0),3);assert.equal(g.state.droppedCargo.parcels.find(p=>p.kind==='cordage').originalOwnerTeam,1,'capacity retry preserves the original owner mark');
 tickProduction(g,0);tickStolenCargo(g,0);
 assert.equal(g.state.droppedCargo.ledger.dropped,3,'repeated ticks cannot duplicate the parcel');
 g.state.paused=false;g.step(.1);assert.ok(!g.state.units.includes(u),'empty corpse may now be removed');assert.deepEqual(g.simulationErrors,[]);
});

test('real parcel recovery reserves its worker without self-interruption, direct orders release it, and legacy saves migrate only existing trips',()=>{
 const f=nativeDairyVillage(),g=decodeGame(f.save),u=g.state.units.find(u=>u.id===f.worker),dead=g.state.units.find(v=>v.team===0&&v.id!==u.id);
 dead.hp=0;dead.carry=1;dead.carryType='wood';tickStolenCargo(g,0);
 const parcel=g.state.droppedCargo.parcels[0];
 // The living opening adult is physically near this actual dead starting resident.
 u.jobLock=false;u.selected=false;u.order='idle';assert.equal(claimParcel(g,u,parcel.id),true);
 assert.equal(u.cargoRecoveryId,u.id);assert.equal(hasTaskCommitment(u),true);
 tickStolenCargo(g,0);assert.equal(g.state.droppedCargo.trips.length,1,'its own reservation does not preempt recovery');
 const saved=encodeGame(g);assert.equal(validDroppedCargoState(saved.state),true);
 const invalid=structuredClone(saved);invalid.state.units.find(v=>v.id===u.id).cargoRecoveryId=u.id+1;assert.equal(validDroppedCargoState(invalid.state),false);
 const legacy=structuredClone(saved);delete legacy.state.units.find(v=>v.id===u.id).cargoRecoveryId;
 const restored=decodeGame(legacy),runner=restored.state.units.find(v=>v.id===u.id);assert.equal(runner.cargoRecoveryId,runner.id);
 runner.order='move';assert.equal(cancelCargoTrip(restored,runner),true);assert.equal(runner.cargoRecoveryId,undefined);assert.equal(runner.order,'move');assert.equal(restored.state.droppedCargo.trips.length,0);
 assert.equal(validDroppedCargoState(restored.state),true);
});
