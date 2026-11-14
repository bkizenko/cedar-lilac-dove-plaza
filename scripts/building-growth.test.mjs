import test from'node:test';import assert from'node:assert/strict';
import{growthView,growthReadiness,GROWTH_RULES}from'../src/game/buildingGrowth.ts';
const up=mode=>({mode});
test('buildings without a fabric record are in their first stage and growth enlarges them step by step',()=>{
 assert.deepEqual(growthView({}),{stage:0,maxStage:3,scale:1,extraStoreys:0,word:'Newly raised',wing:false});
 let prev=1;for(let n=1;n<=3;n++){const v=growthView({fabric:{upgrades:Array(n).fill(up('rebuild'))}});assert.ok(v.scale>prev);prev=v.scale;}
 assert.equal(growthView({fabric:{upgrades:[up('rebuild'),up('extend')]}}).wing,true);
 assert.equal(growthView({fabric:{upgrades:Array(9).fill(up('extend'))}}).stage,3,'capped');
 for(const w of GROWTH_RULES.words)assert.doesNotMatch(w,/level/i);
});
test('the next stage is gated by population, era and resources',()=>{
 const b={},ok={population:30,wood:500,stone:500,era:3};
 assert.equal(growthReadiness(b,ok),null);
 assert.match(growthReadiness(b,{...ok,population:2}),/village of 6/);
 assert.match(growthReadiness({fabric:{upgrades:[up('rebuild')]}},{...ok,era:0}),/techniques/);
 assert.match(growthReadiness(b,{...ok,wood:1}),/wood/);
 assert.equal(growthReadiness({fabric:{upgrades:Array(3).fill(up('rebuild'))}},ok),'Fully grown');
});
test('growth guidance text avoids numbered levels',()=>{
 for(const s of[{},{fabric:{upgrades:[up('rebuild')]}}]){const r=growthReadiness(s,{population:0,wood:0,stone:0,era:0});assert.doesNotMatch(r,/level/i);}
});
