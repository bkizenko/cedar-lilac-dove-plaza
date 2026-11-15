import test from 'node:test';
import assert from 'node:assert/strict';
import {huntPressure,recommendedHunters,herdMembers,HUNT_PARTY_RULES} from '../src/game/huntParty.ts';
const horse={id:1,species:'horse',x:0,z:0,hp:4,beh:{grp:5}};
const g=n=>({state:{units:Array.from({length:n},(_,i)=>({hp:1,order:'gather',node:horse,x:i,z:2})),wildlife:[horse,{id:2,species:'horse',x:5,z:5,hp:4,beh:{grp:5}},{id:3,species:'horse',x:6,z:5,hp:4,beh:{grp:9}},{id:4,species:'deer',x:3,z:3,hp:3},{id:5,species:'horse',x:7,z:7,hp:0,beh:{grp:5}}]}});
test('more hunters on one animal slow its flight down to a floor',()=>{
 assert.equal(huntPressure(g(1),horse),1);
 assert.ok(huntPressure(g(3),horse)<huntPressure(g(2),horse));
 assert.equal(huntPressure(g(40),horse),HUNT_PARTY_RULES.floor);
});
test('fast prey recommends a party, slow prey one hunter',()=>{
 assert.ok(recommendedHunters('horse')>recommendedHunters('deer'));assert.equal(recommendedHunters('boar'),1);
});
test('selecting one animal selects its living visible herd mates only',()=>{
 const ids=herdMembers(g(0),[1],()=>true).map(c=>c.id);assert.deepEqual(ids.sort(),[1,2]);
 assert.deepEqual(herdMembers(g(0),[1],x=>x<4).map(c=>c.id),[1]);
});
test('livestock crowding multiplier rises only when pens are nearly full',async()=>{
 const {livestockIllnessMultiplier}=await import('../src/game/livestockCrowding.ts');
 assert.equal(livestockIllnessMultiplier(.5),1);assert.ok(livestockIllnessMultiplier(1)>1);assert.equal(livestockIllnessMultiplier(5),1.5);
});
