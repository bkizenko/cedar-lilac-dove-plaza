import test from 'node:test';
import assert from 'node:assert/strict';
import {readWonderPresets,saveWonderPreset,removeWonderPreset,WONDER_PRESET_STORAGE_KEY as KEY,WONDER_PRESET_STORE_RULES as RULES} from '../src/scene/wonderPresetStore.ts';
import {serializePreset} from '../src/scene/wonderKit.ts';
const preset={v:1,seed:7,civ:'hanrei',family:'cistern',options:{footprint:{w:36,d:36},era:3,water:true}};
function memory(){const slots=new Map([['hearthwild:render-style','optionH'],['hearthwild:save','village']]);return {slots,getItem:k=>slots.get(k)??null,setItem:(k,v)=>slots.set(k,v)};}
const entry=(id='one')=>({id,label:'Courtyard cistern',preset:structuredClone(preset)});
test('authoring library persists codec presets and same-id changes without touching village/styles',()=>{
 const storage=memory();assert.deepEqual(readWonderPresets(storage),{ok:true,entries:[]});
 assert.equal(saveWonderPreset(storage,entry()).ok,true);assert.deepEqual(readWonderPresets(storage).entries,[entry()]);
 assert.equal(saveWonderPreset(storage,{...entry(),label:'Revised'}).ok,true);assert.equal(readWonderPresets(storage).entries.length,1);
 assert.equal(saveWonderPreset(storage,entry('two')).ok,true);assert.equal(removeWonderPreset(storage,'one').ok,true);assert.equal(readWonderPresets(storage).entries[0].id,'two');
 assert.equal(storage.slots.get('hearthwild:render-style'),'optionH');assert.equal(storage.slots.get('hearthwild:save'),'village');
});
test('bounded library never evicts retained presets when full; explicit replacement still works',()=>{
 const storage=memory();for(let i=0;i<RULES.maximumEntries;i++)assert.equal(saveWonderPreset(storage,entry('p'+i)).ok,true);
 const before=storage.slots.get(KEY);assert.equal(saveWonderPreset(storage,entry('overflow')).ok,false);assert.equal(storage.slots.get(KEY),before);
 assert.equal(saveWonderPreset(storage,{...entry('p0'),label:'Changed'}).ok,true);assert.equal(readWonderPresets(storage).entries.length,24);
});
test('invalid keys/presets/versions/duplicates/oversized libraries cannot overwrite or delete old data',()=>{
 const storage=memory();assert.equal(saveWonderPreset(storage,entry()).ok,true);const before=storage.slots.get(KEY);
 for(const bad of [{...entry(),id:'../bad'},{...entry(),label:'x'.repeat(65)},{...entry(),preset:{...preset,seed:NaN}},{...entry(),preset:{...preset,seed:Number.MAX_SAFE_INTEGER+1}}]){assert.equal(saveWonderPreset(storage,bad).ok,false);assert.equal(storage.slots.get(KEY),before);}
 const rawEntry={id:'x',label:'X',preset:serializePreset(preset)};
 for(const raw of ['x',JSON.stringify({v:2,entries:[]}),JSON.stringify({v:1,entries:[rawEntry,rawEntry]}),JSON.stringify({v:1,entries:[{...rawEntry,id:'bad space'}]}),JSON.stringify({v:1,entries:[{...rawEntry,preset:'{"v":2}'}]}),' '.repeat(RULES.maximumBytes/2+1)]){
  storage.slots.set(KEY,raw);assert.equal(readWonderPresets(storage).ok,false);assert.equal(saveWonderPreset(storage,entry()).ok,false);assert.equal(removeWonderPreset(storage,'x').ok,false);assert.equal(storage.slots.get(KEY),raw);
 }
});
test('unavailable reads and quota errors return failures while retaining prior persisted library',()=>{
 const storage=memory();saveWonderPreset(storage,entry());const before=storage.slots.get(KEY);
 const quota={getItem:storage.getItem,setItem(){throw Error('quota');}};
 assert.equal(saveWonderPreset(quota,entry('two')).ok,false);assert.equal(removeWonderPreset(quota,'one').ok,false);assert.equal(storage.slots.get(KEY),before);
 const blocked={getItem(){throw Error('blocked');},setItem(){assert.fail('must not overwrite unreadable data');}};
 assert.equal(readWonderPresets(blocked).ok,false);assert.equal(saveWonderPreset(blocked,entry()).ok,false);assert.equal(removeWonderPreset(blocked,'one').ok,false);
});
