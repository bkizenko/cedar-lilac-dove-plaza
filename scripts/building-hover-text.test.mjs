import test from 'node:test';import assert from 'node:assert/strict';
const {buildingHoverText}=await import('../src/game/buildingHoverText.ts');
const base={hp:100,maxHp:100,build:1,team:0,type:'granary'};
test('hover text names era, condition and repair',()=>{
 assert.match(buildingHoverText({...base,fabric:{built:{era:1},upgrades:{length:1}}},'Granary'),/^Granary · built in the Bronze Age \(\+1 extension\) · sound$/);
 assert.match(buildingHoverText({...base,hp:50,repair:{phase:'working',progress:5,duration:10,blockedReason:''}}),/needs repair · repair 50% done/);
 assert.match(buildingHoverText({...base,hp:70,maintenance:{condition:.4,wearEnabled:true},repair:{phase:'paused',progress:0,duration:10,blockedReason:'no wood'}}),/needs repair · repair stalled: no wood/);
});
test('hover text handles sites, rivals and legacy buildings',()=>{
 assert.equal(buildingHoverText({...base,build:.42},'Hut'),'Hut · under construction 42%');
 assert.equal(buildingHoverText({...base,team:1},'Hut'),'Hut');
 assert.equal(buildingHoverText({...base,fabric:{built:{era:0,legacy:true},upgrades:{length:0}}},'Hut'),'Hut · sound');
});
