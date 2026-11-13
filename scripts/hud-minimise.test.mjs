import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createLayoutStore,parseLayout,PANELS,PANEL_IDS,LAYOUT_KEY,HANDLE_FLOOR,hudKeyAction,HUD_KEYS} from '../src/ui/hearth/hudLayout.ts';
import {MINIMAP_KEY} from '../src/ui/hearth/minimapPrefs.ts';
import {eventInsideUi} from '../src/game/cameraInput.ts';
const mem=()=>{const m=new Map();return {m,getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)};};
const css=fs.readFileSync(new URL('../src/ui/hearth/hearth.css',import.meta.url),'utf8');
const src=f=>fs.readFileSync(new URL('../src/ui/hearth/'+f,import.meta.url),'utf8');

test('layout: collapse, persist, reload, show all, reset',()=>{
 const s=mem(),L=createLayoutStore(()=>s);
 for(const id of ['resources','dock','alerts'])L.set(id,true);
 assert.deepEqual(L.collapsedIds(),['resources','dock','alerts']);
 const L2=createLayoutStore(()=>s);assert.deepEqual(L2.collapsedIds(),['resources','dock','alerts']);
 L2.setAll(false);assert.deepEqual(L2.collapsedIds(),[]);assert.equal(createLayoutStore(()=>s).collapsedIds().length,0);
 L2.setAll(true);assert.equal(L2.collapsedIds().length,PANEL_IDS.length);
 L2.reset();assert.deepEqual(L2.collapsedIds(),[]);assert.equal(s.getItem(LAYOUT_KEY),null);assert.equal(s.getItem(MINIMAP_KEY),'0');
});
test('layout: the minimap keeps its own key and old choice',()=>{
 const s=mem();s.setItem(MINIMAP_KEY,'1');const L=createLayoutStore(()=>s);assert.equal(L.isCollapsed('map'),true);
 L.set('map',false);assert.equal(s.getItem(MINIMAP_KEY),'0');L.set('map',true);assert.equal(s.getItem(MINIMAP_KEY),'1');assert.ok(!JSON.parse(s.getItem(LAYOUT_KEY)).map);
});
test('layout: broken storage (throws on read and write, or absent) never throws and still works in memory',()=>{
 const bad={getItem(){throw Error('x');},setItem(){throw Error('x');},removeItem(){throw Error('x');}};
 for(const get of [()=>bad,()=>null,()=>{throw Error('no storage');}]){const L=createLayoutStore(get);
  assert.doesNotThrow(()=>{L.set('rail',true);L.toggle('dock');L.setAll(true);L.reset();L.set('time',true);});assert.equal(L.isCollapsed('time'),true);assert.equal(L.isCollapsed('rail'),false);}
});
test('layout: malformed saved data is ignored',()=>{
 for(const raw of ['{','null','[]','"x"','{"resources":"yes","bogus":true,"map":true}'])assert.deepEqual(parseLayout(raw),{});
 assert.deepEqual(parseLayout('{"rail":true,"zzz":true}'),{rail:true});
});
test('layout: subscribers hear changes and version moves',()=>{
 const L=createLayoutStore(()=>mem());let n=0;const off=L.subscribe(()=>n++);const v=L.version();L.set('rail',true);L.set('rail',true);assert.equal(n,1);assert.ok(L.version()>v);off();L.set('rail',false);assert.equal(n,1);
});
test('every panel the owner named has an entry, a label and a handle position',()=>{
 for(const id of ['resources','rail','dock','time','audio','map','selection','alerts','notes','tips','testlab','wonders','skills'])assert.ok(PANELS.find(p=>p.id===id),id);
 for(const p of PANELS){assert.ok(p.label.length>1);assert.ok(p.where);}
});
test('size floors: handle and minimise button are at least 52 px, 16 px text, 24 px icons',()=>{
 assert.deepEqual(HANDLE_FLOOR,{tap:52,text:16,icon:24});
 const block=css.slice(css.indexOf('.hw-fold-min,.hw-fold-handle{'));const rule=block.slice(0,block.indexOf('}'));
 assert.match(rule,/min-width:52px/);assert.match(rule,/min-height:52px/);assert.match(rule,/font:650 16px/);
 assert.match(block,/\.hw-fold-min svg,\.hw-fold-handle svg\{width:24px;height:24px/);
 const f=src('fold.tsx');assert.match(f,/size=\{24\}/);assert.ok(!/size=\{(?:1\d|2[0-3])\}/.test(f),'no icon under 24');
 for(const m of css.slice(css.indexOf('Minimise: every HUD')).matchAll(/font(?:-size)?:\s*(?:[0-9]{3}\s+)?(\d+)px/g))assert.ok(+m[1]>=16,m[0]);
});
test('collapsed state renders a handle and no panel (nothing left to block clicks)',()=>{
 const f=src('fold.tsx');
 assert.match(f,/showPanel:phase!=='closed'/);assert.match(f,/showHandle:phase==='closed'/);
 assert.match(f,/aria-label=\{`Show \$\{f\.label\}`\}/);assert.match(f,/aria-expanded=\{false\}/);
 // each HUD panel builds on useFold and returns a FoldHandle when folded
 for(const [file,id] of [['glance.tsx','resources'],['glance.tsx','alerts'],['glance.tsx','notes'],['parts.tsx','time'],['parts.tsx','rail'],['parts.tsx','dock'],['parts.tsx','selection'],['StartupHint.tsx','tips'],['MusicControls.tsx','audio']]){
  const t=src(file);assert.ok(t.includes(`useFold('${id}')`),`${file} ${id}`);assert.ok(/FoldHandle/.test(t),`${file} handle`);assert.ok(/FoldMin/.test(t),`${file} min`);}
 assert.match(src('minimapToggle.tsx'),/layout\.isCollapsed\('map'\)/);
 assert.match(css,/\.hw \.is-folding\{[^}]*pointer-events:none!important/);
 assert.match(css,/\.hw \.is-folding \*\{pointer-events:none!important/);
});
test('wheel gate: handles live under .hw so the camera never takes a wheel over them',()=>{
 const hw={cls:['hw'],parent:null},h={cls:['hw-fold-handle'],parent:hw,tag:'button'};
 const mk=n=>({...n,closest(sel){for(let x=this;x;x=x.parent){for(const p of sel.split(','))if(p.startsWith('.')&&x.cls?.includes(p.slice(1)))return x;if(x.tag&&/^[a-z]+$/.test(sel)&&x.tag===sel)return x;}return null;}});
 const root=mk(hw);const handle=mk({...h,parent:root});assert.equal(eventInsideUi(handle),true);assert.equal(eventInsideUi(mk({cls:[],parent:null,tag:'canvas'})),false);
});
test('keys: O, U, Shift+U added; M and Shift+M untouched; typing and modifiers ignored',()=>{
 const k=(code,o={})=>hudKeyAction({code,shiftKey:false,ctrlKey:false,metaKey:false,altKey:false,...o});
 assert.equal(k('KeyO'),'sfx');assert.equal(k('KeyU'),'hide');assert.equal(k('KeyU',{shiftKey:true}),'allPanels');
 assert.equal(k('KeyM'),null);assert.equal(k('KeyM',{shiftKey:true}),null);assert.equal(k('KeyO',{ctrlKey:true}),null);assert.equal(k('KeyO',{repeat:true}),null);
 assert.equal(k('KeyO',{target:{closest:()=>({})}}),null);
 const game=fs.readFileSync(new URL('../src/game/keyboard.ts',import.meta.url),'utf8');
 for(const c of ['KeyO','KeyU'])assert.ok(!game.includes(`"${c}"`),`${c} is free in the game keymap`);
});
test('Help lists the HUD keys',()=>{
 const h=src('help.tsx');
 for(const key of ['M','O','Shift+M','U','Shift+U'])assert.ok(h.includes(`keys:['${key}']`),key);assert.equal(HUD_KEYS.length,5);
});
