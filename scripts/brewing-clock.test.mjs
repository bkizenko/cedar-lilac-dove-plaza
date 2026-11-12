import test from 'node:test';
import assert from 'node:assert/strict';
import {BREWING_RULES as R,newBrewBatch,advanceBrewBatch,validBrewBatch} from '../src/game/brewing.ts';
import {DAIRY_RULES,validDairyRecovery} from '../src/game/dairy.ts';
const origin={version:1,team:0,site:7,style:'Declared fired vessel'};
const validOrigin=o=>o.version===1&&o.team===0&&o.site===7&&o.style===origin.style;

test('real passive stage clocks respect temperature, exact required time and retained vessel metadata',()=>{
 for(const stage of['malt','smallBeer','beer']){
  const b=newBrewBatch(stage,origin);assert.notEqual(b.vesselOrigin,origin);assert.deepEqual(b.vesselOrigin,origin);const required=R.stages[stage].exposureSeconds;
  assert.equal(advanceBrewBatch(b,10,4).ready,false);assert.equal(b.exposureSeconds,0);assert.equal(b.elapsedSeconds,10);
  assert.equal(advanceBrewBatch(b,required-1,20).ready,false);assert.equal(advanceBrewBatch(b,1,20).ready,true);assert.equal(b.exposureSeconds,required);assert.equal(b.elapsedSeconds,required+10);assert.equal(validBrewBatch(b,b.elapsedSeconds,validOrigin),true);
  advanceBrewBatch(b,5,20);assert.equal(b.exposureSeconds,required);assert.deepEqual(b.vesselOrigin,origin);
 }
 assert.equal(R.cleaningSeconds,DAIRY_RULES.cleaningSeconds);assert.equal(R.cleaningWaterLiters,DAIRY_RULES.cleaningWaterLiters);
});

test('overheating is cumulative, cannot earn progress, and never reports a spoiled batch ready',()=>{
 const b=newBrewBatch('beer');advanceBrewBatch(b,30,39);advanceBrewBatch(b,10,20);assert.equal(b.hotSeconds,30);assert.equal(b.exposureSeconds,10);const result=advanceBrewBatch(b,15,39);assert.equal(result.lost,true);assert.equal(result.ready,false);assert.equal(b.hotSeconds,R.hotLossSeconds);advanceBrewBatch(b,200,20);assert.equal(b.exposureSeconds,10);assert.equal(validBrewBatch(b,b.elapsedSeconds,validOrigin),true);
 const boundary=newBrewBatch('malt');advanceBrewBatch(boundary,1,5);advanceBrewBatch(boundary,1,38);assert.equal(boundary.exposureSeconds,2);assert.equal(boundary.hotSeconds,0);
});

test('invalid elapsed time or temperature cannot poison or advance a paid passive batch',()=>{
 for(const[dt,temp]of[[NaN,20],[Infinity,20],[-1,20],[0,20],[10,NaN],[10,Infinity],[10,101]]){const b=newBrewBatch('malt'),before=structuredClone(b);advanceBrewBatch(b,dt,temp);assert.deepEqual(b,before);}
 assert.throws(()=>newBrewBatch('unknown'));
});

test('strict batch validation binds stage, age, heat clock, old malt age, original vessel and recovery',()=>{
 const b=newBrewBatch('smallBeer',origin);b.inputAgeSeconds=R.maltLifetimeSeconds-1;advanceBrewBatch(b,20,20);assert.equal(validBrewBatch(b,20,validOrigin),true);
 for(const edit of[a=>a.version=2,a=>a.stage='wort',a=>a.elapsedSeconds=21,a=>a.hotSeconds=21,a=>a.exposureSeconds=21,a=>a.tempCelsius=NaN,a=>a.inputAgeSeconds=-1,a=>a.inputAgeSeconds=R.maltLifetimeSeconds+1,a=>a.vesselOrigin.site=8,a=>a.freeBeer=2]){const bad=structuredClone(b);edit(bad);assert.equal(validBrewBatch(bad,20,validOrigin),false);}
 const dirty=structuredClone(b);dirty.recovery={version:1,failedAt:10,reason:'Declared spoiled batch',queued:false,waterPaid:false,waterDelivered:false,waterCollected:false,cleanedSeconds:0};assert.equal(validBrewBatch(dirty,20,validOrigin,validDairyRecovery),true);const before=structuredClone(dirty),result=advanceBrewBatch(dirty,100,20);assert.equal(result.ready,false);assert.equal(result.lost,true);assert.deepEqual(dirty,before);dirty.recovery.cleanedSeconds=1;assert.equal(validBrewBatch(dirty,20,validOrigin,validDairyRecovery),false);
});
