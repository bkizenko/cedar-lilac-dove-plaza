import test from'node:test';import assert from'node:assert/strict';
import{SKILL_DECAY_RULES as D,SKILL_SPECS,newRecord,trainEntry,forgetEntry}from'../src/game/skills.ts';
test('unused skills decay toward the tuneable floor and practice raises them again',()=>{
 const r=newRecord(12345);trainEntry(r,'smithing',9000,30,0);const peak=r.x.smithing[2],start=r.x.smithing[0];
 forgetEntry(r,'smithing',30,40);const mid=r.x.smithing[0];assert.ok(mid<start,'idle skill decays');
 forgetEntry(r,'smithing',1e7,1e7);const floor=peak*(D.floorBase+D.floorDepth*SKILL_SPECS.smithing.depth);
 assert.ok(r.x.smithing[0]>=floor-1e-6&&r.x.smithing[0]<=floor+1e-3,'decay settles on the floor, never to zero');
 const low=r.x.smithing[0];trainEntry(r,'smithing',900,30,1e7+1);assert.ok(r.x.smithing[0]>low,'use raises it');
 assert.ok(D.floorMax<1&&D.floorBase>0,'floor stays between nothing and the peak');
});
