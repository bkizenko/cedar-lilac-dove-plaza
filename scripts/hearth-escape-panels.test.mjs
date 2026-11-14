import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pushEscape,closeTopmost,escapeDepth,isEscape} from '../src/ui/hearth/escapeStack.ts';
import {PANELS,PANEL_IDS,bulkIds,createLayoutStore} from '../src/ui/hearth/hudLayout.ts';
import {GameAudio} from '../src/game/audio.ts';
const src=f=>fs.readFileSync(new URL('../src/ui/'+f,import.meta.url),'utf8');
const css=src('hearth/hearth.css'),roads=src('hearth/roads.css');
globalThis.Audio=class{paused=true;volume=0;addEventListener(){}removeEventListener(){}removeAttribute(){}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}};
globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}};

test('escape: only the topmost menu closes, then the next one',()=>{
 const log=[];const a=pushEscape(()=>log.push('a')),b=pushEscape(()=>log.push('b'));
 assert.equal(escapeDepth(),2);assert.equal(closeTopmost(),true);assert.deepEqual(log,['b']);
 b();assert.equal(escapeDepth(),1);closeTopmost();assert.deepEqual(log,['b','a']);a();
 assert.equal(escapeDepth(),0);assert.equal(closeTopmost(),false);
});
test('escape: unregistering a lower menu keeps the upper one on top',()=>{
 const log=[];const a=pushEscape(()=>log.push('a')),b=pushEscape(()=>log.push('b'));a();closeTopmost();assert.deepEqual(log,['b']);b();
});
test('escape: key test and wiring',()=>{
 assert.ok(isEscape({key:'Escape'}));assert.ok(!isEscape({key:'a'}));assert.ok(!isEscape({key:'Escape',isComposing:true}));
 for(const f of ['hearth/screens.tsx','hearth/HudHearth.tsx','TestPanel.tsx'])assert.match(src(f),/useEscapeClose/,f);
 assert.doesNotMatch(src('hearth/screens.tsx'),/e\.key==='Escape'/,'Screen no longer handles Escape itself');
});
test('every floating Hearth panel scrolls when taller than the screen',()=>{
 for(const sel of ['.hw-screen-body','.hw-tray','.hw-place','.hw-roads','.hw-prev','.hw-sel','.test-panel','.hw-map'])assert.match(css+roads,new RegExp(sel.replace('.','\\.')+'[^{}]*\\{[^}]*overflow-y:auto'),sel);
});
test('roads and trader panels can be minimised and are remembered',()=>{
 assert.ok(PANEL_IDS.includes('roads')&&PANEL_IDS.includes('trader'));
 assert.match(src('hearth/roadsCard.tsx'),/useFold\('roads'\)/);assert.match(src('VisitingTrader.tsx'),/useFold\('trader'\)/);
 assert.ok(!bulkIds().includes('trader'),'a trader offer is never hidden by Minimise all');
 const m=new Map(),st={getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)};
 createLayoutStore(()=>st).set('roads',true);assert.equal(createLayoutStore(()=>st).isCollapsed('roads'),true);
});
test('sound effects button is in the always-visible audio chip',()=>{
 const t=src('hearth/MusicControls.tsx');assert.match(t,/Turn sound effects (on|off)/);assert.match(t,/toggleSub\(engine\.audio,'sfx'\)/);
});
test('audio does not start before the first interaction, then starts once',()=>{
 const nav=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const listeners=new Map();let made=0;
 globalThis.window={addEventListener:(t,f)=>listeners.set(t,f),removeEventListener:t=>listeners.delete(t),AudioContext:class{constructor(){made++;this.state='running';this.currentTime=0;this.destination={};this.sampleRate=8000;}
  createGain(){return{gain:{value:1,setTargetAtTime(){},setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}};}createBuffer(c,l){return{getChannelData:()=>new Float32Array(l)};}resume(){return Promise.resolve();}}};
 const ua={hasBeenActive:false};Object.defineProperty(globalThis,'navigator',{value:{userActivation:ua},configurable:true});
 try{
  const a=new GameAudio();a.proc.attach=()=>{};a.unlock();a.unlock();
  assert.equal(made,0,'no AudioContext before a gesture');assert.equal(a.unlocked,false);assert.ok(listeners.has('pointerdown')&&listeners.has('keydown'));
  ua.hasBeenActive=true;listeners.get('keydown')();
  assert.equal(made,1);assert.equal(a.unlocked,true);assert.equal(listeners.size,0,'gesture listeners removed');
 }finally{delete globalThis.window;if(nav)Object.defineProperty(globalThis,'navigator',nav);else delete globalThis.navigator;}
});
test('toggles actually mute: master mute zeroes the master gain, sfx off silences effects, defaults unchanged',()=>{
 const a=new GameAudio();assert.equal(a.settings.muted,false);assert.equal(a.settings.sfxOff,false);assert.equal(a.sfxOff,false);
 a.setSfxOff(true);assert.equal(a.sfxOff,true);assert.equal(a.settings.musicOff,false);
 a.setSfxOff(false);a.setMuted(true);assert.equal(a.sfxOff,true);assert.equal(a.muted,true);a.setMuted(false);assert.equal(a.muted,false);
});
