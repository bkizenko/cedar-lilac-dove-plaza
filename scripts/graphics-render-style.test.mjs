import test from 'node:test';
import assert from 'node:assert/strict';
import {GRAPHICS_RULES,GRAPHICS_PREFERENCE_KEY,RENDER_STYLE_PREFERENCE_KEY,isRenderStyle,loadRenderStyle,rememberRenderStyle,loadGraphicsQuality,rememberGraphicsQuality} from '../src/game/graphics.ts';

function withStorage(storage,run){const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');try{Object.defineProperty(globalThis,'localStorage',{value:storage,writable:true,configurable:true});run();}finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}}
function memoryStorage(){const values=new Map(),writes=[];return {values,writes,getItem:key=>values.get(key)??null,setItem:(key,value)=>{writes.push([key,value]);values.set(key,value);}};}

test('render style accepts only exact known values and defaults to the new village look without writing',()=>{
 const storage=memoryStorage();withStorage(storage,()=>{
  assert.equal(GRAPHICS_RULES.defaultRenderStyle,'village');assert.equal(loadRenderStyle(),'village');
  for(const value of ['village','current','optionH']){assert.equal(isRenderStyle(value),true);storage.values.set(RENDER_STYLE_PREFERENCE_KEY,value);assert.equal(loadRenderStyle(),value);}
  for(const value of ['', 'optionh','Current','high','null','{"renderStyle":"optionH"}']){storage.values.set(RENDER_STYLE_PREFERENCE_KEY,value);assert.equal(loadRenderStyle(),'village');}
  for(const value of [undefined,null,0,true,{},['optionH']])assert.equal(isRenderStyle(value),false);
  assert.deepEqual(storage.writes,[],'reading corrupt/old settings never rewrites storage');
 });
});
test('both styles persist under one stable key and invalid writes preserve the last valid choice',()=>{
 const storage=memoryStorage();withStorage(storage,()=>{
  assert.equal(RENDER_STYLE_PREFERENCE_KEY,'hearthwild:render-style-v2');
  rememberRenderStyle('optionH');assert.equal(loadRenderStyle(),'optionH');
  for(const value of ['bad',undefined,null,{},['current']])rememberRenderStyle(value);
  assert.equal(loadRenderStyle(),'optionH');assert.deepEqual(storage.writes,[[RENDER_STYLE_PREFERENCE_KEY,'optionH']]);
  rememberRenderStyle('current');assert.equal(loadRenderStyle(),'current');
 });
});
test('style and existing quality preferences remain independent in both directions',()=>{
 const storage=memoryStorage();withStorage(storage,()=>{
  rememberGraphicsQuality('low');rememberRenderStyle('optionH');assert.equal(loadGraphicsQuality(),'low');
  rememberGraphicsQuality('high');assert.equal(loadRenderStyle(),'optionH');
  rememberRenderStyle('current');assert.equal(loadGraphicsQuality(),'high');
  assert.equal(storage.values.get(GRAPHICS_PREFERENCE_KEY),'high');assert.equal(storage.values.get(RENDER_STYLE_PREFERENCE_KEY),'current');
  assert.equal(storage.values.size,2);
 });
});
test('blocked or full browser storage preserves safe read defaults and nonthrowing writes',()=>{
 withStorage({getItem(){throw Error('blocked');},setItem(){throw Error('full');}},()=>{assert.equal(loadRenderStyle(),'village');assert.doesNotThrow(()=>rememberRenderStyle('optionH'));assert.equal(loadGraphicsQuality(),'med');});
 const storage=memoryStorage();storage.values.set(RENDER_STYLE_PREFERENCE_KEY,'optionH');storage.setItem=()=>{throw Error('full');};
 withStorage(storage,()=>{assert.doesNotThrow(()=>rememberRenderStyle('current'));assert.equal(loadRenderStyle(),'optionH','failed write does not claim persisted success');});
});
test('imported preferences remain safe when localStorage is absent outside a browser',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');try{delete globalThis.localStorage;assert.equal(loadRenderStyle(),'village');assert.doesNotThrow(()=>rememberRenderStyle('optionH'));}finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);}
});
