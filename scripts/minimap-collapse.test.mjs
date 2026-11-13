import test from 'node:test';
import assert from 'node:assert/strict';
import {MINIMAP_KEY,readMinimapCollapsed,writeMinimapCollapsed,isMinimapShortcut} from '../src/ui/hearth/minimapPrefs.ts';
const store=()=>{const m=new Map();return {getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,v)};};
test('collapse choice round-trips and defaults to open',()=>{const s=store();assert.equal(readMinimapCollapsed(s),false);writeMinimapCollapsed(true,s);assert.equal(readMinimapCollapsed(s),true);writeMinimapCollapsed(false,s);assert.equal(readMinimapCollapsed(s),false);assert.equal(MINIMAP_KEY,'hearthwild.minimap.collapsed');});
test('blocked storage never throws',()=>{const bad={getItem(){throw new Error('x');},setItem(){throw new Error('x');}};assert.equal(readMinimapCollapsed(bad),false);assert.doesNotThrow(()=>writeMinimapCollapsed(true,bad));assert.equal(readMinimapCollapsed(null),false);});
test('Shift+M toggles; plain M (mute) and typing do not',()=>{
 const base={code:'KeyM',shiftKey:true,ctrlKey:false,metaKey:false,altKey:false};
 assert.equal(isMinimapShortcut(base),true);assert.equal(isMinimapShortcut({...base,shiftKey:false}),false);assert.equal(isMinimapShortcut({...base,ctrlKey:true}),false);
 assert.equal(isMinimapShortcut({...base,target:{closest:()=>({})}}),false);
});
