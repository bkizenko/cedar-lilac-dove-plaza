import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadedSlot} from '../src/ui/saveStatus.ts';
const {loadedSaveFacts}=await import('../src/ui/LoadedSaveCard.tsx');
const now=10_000_000;
const slot=(kind,label,savedAt,time)=>({kind,label,savedAt,seed:1,generation:21,year:1,people:3,time});
test('load card names the copy that matches the loaded village, its age and the rollback point',()=>{
 const slots=[slot('latest','Latest',now-120_000,500),slot('backup','Previous',now-600_000,400),slot('protected','Protected',now-7_200_000,200)];
 assert.equal(loadedSlot(slots,500.4).kind,'latest');
 assert.equal(loadedSlot([...slots,slot('latest','Latest',now,200)].slice(1),200).kind,'protected','a protected restore is named even after Latest is re-saved');
 assert.equal(loadedSlot(slots,999),null);
 const f=loadedSaveFacts(slots,500,{rulersVersion:2},now,false);
 assert.deepEqual(f,{copy:'Latest save',age:'2 min ago',rollback:'Rollback point: Protected copy, 2 h ago',repaired:[]});
 const old=loadedSaveFacts(slots,200,undefined,now,false);assert.equal(old.copy,'Protected save');assert.equal(old.rollback,null);assert.equal(old.repaired.length,1,'older save lists what started fresh, without the closing reassurance line');
 const imp=loadedSaveFacts(slots,500,{rulersVersion:2},now,true);assert.equal(imp.copy,'Imported village file');assert.equal(imp.age,'just imported');
});
test('load card is mounted in Hearth and Classic, folded details, dismissible',()=>{
 const c=readFileSync(new URL('../src/ui/LoadedSaveCard.tsx',import.meta.url),'utf8');assert.match(c,/\['restore','import'\]/);assert.match(c,/<details>/);assert.match(c,/Dismiss load note/);
 assert.match(readFileSync(new URL('../src/ui/hearth/HudHearth.tsx',import.meta.url),'utf8'),/<LoadedSaveCard engine=\{engine\}\/>/);
 assert.match(readFileSync(new URL('../src/ui/Hud.tsx',import.meta.url),'utf8'),/<LoadedSaveCard engine=\{engine\} classic\/>/);
});
