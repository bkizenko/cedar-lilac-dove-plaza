import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {cameraOwnsWheel} from '../src/game/cameraInput.ts';
import {musicDuck,musicRestSeconds,normaliseSettings,DEFAULT_AUDIO_SETTINGS,loadSettings,saveSettings} from '../src/scene/audioMix.ts';
const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8');
const el=(tag,parent=null)=>({tagName:tag,parent,closest(sel){for(let n=this;n;n=n.parent)if(sel.includes(n.tagName.toLowerCase()))return n;return null;}});

test('wheel: only the bare canvas or empty page zooms; any other element (even an unknown HUD class) scrolls itself',()=>{
 const canvas=el('CANVAS'),body=el('BODY'),mystery=el('DIV',body);
 assert.equal(cameraOwnsWheel(canvas,canvas),true);
 assert.equal(cameraOwnsWheel(body,canvas),true);
 assert.equal(cameraOwnsWheel(mystery,canvas),false);
 assert.equal(cameraOwnsWheel(el('INPUT'),canvas),false);
 assert.equal(cameraOwnsWheel(null,canvas),false);
 assert.match(read('src/game/engine.ts'),/cameraOwnsWheel\(e\.target, this\.canvas\)/);
});

test('music ducks under nature ambience and rests are sparse',()=>{
 assert.equal(musicDuck(0),1);
 assert.ok(musicDuck(1)<.5&&musicDuck(1)>0.3);
 assert.ok(musicDuck(.3)>musicDuck(.9));
 assert.ok(musicRestSeconds(0)>=90&&musicRestSeconds(1)<=210);
 assert.ok(DEFAULT_AUDIO_SETTINGS.music<DEFAULT_AUDIO_SETTINGS.ambience);
});

test('musicPaused persists through localStorage and survives broken storage',()=>{
 const mem=new Map(),st={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)};
 saveSettings(st,{...DEFAULT_AUDIO_SETTINGS,musicPaused:true,music:.2,ambience:.9});
 const s=loadSettings(st);assert.equal(s.musicPaused,true);assert.equal(s.music,.2);assert.equal(s.ambience,.9);
 assert.equal(normaliseSettings({musicPaused:'x'}).musicPaused,false);
 assert.doesNotThrow(()=>saveSettings({setItem(){throw new Error('blocked');}},DEFAULT_AUDIO_SETTINGS));
 assert.deepEqual(loadSettings({getItem(){throw new Error('blocked');}}),DEFAULT_AUDIO_SETTINGS);
});

test('AcousticScore: user pause silences music without muting, ambience duck lowers volume, resume plays',async()=>{
 const made=[];
 globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}};
 globalThis.Audio=class{constructor(f){this.f=f;this.volume=0;this.paused=true;this.currentTime=0;made.push(this);}addEventListener(){}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}removeAttribute(){}load(){}};
 const {AcousticScore}=await import('../src/game/music.ts');
 const sc=new AcousticScore();sc.unlock();sc.update('village',1,false,1);
 const cur=made.find(a=>!a.paused);assert.ok(cur,'a piece is playing');
 const loud=cur.volume;assert.ok(loud>0);
 sc.setAmbience(1);assert.ok(cur.volume<loud*.6,'ducked under ambience');
 sc.setAmbience(0);
 sc.setUserPaused(true);assert.ok(made.every(a=>a.paused));assert.equal(cur.volume,0);assert.equal(sc.muted,false);assert.equal(sc.status,'Paused');
 sc.update('village',5,false,1);assert.ok(made.every(a=>a.paused),'update does not restart while paused');
 sc.setUserPaused(false);assert.ok(!cur.paused);
 sc.dispose();
});

test('placement UI: explicit left/right buttons at tap 52 and text 16; Q E R rotate; gate and building share them',()=>{
 const btn=read('src/ui/hearth/RotateButtons.tsx'),css=read('src/ui/hearth/hearth.css'),eng=read('src/game/engine.ts');
 assert.match(btn,/Rotate left \(Q\)/);assert.match(btn,/Rotate right \(E or R\)/);
 assert.match(css,/\.hw-rotate-btn\{[^}]*min-height:52px[^}]*font-size:16px/);
 assert.match(eng,/KeyQ'\?-1:e\.code==='KeyE'\?1/);
 assert.match(eng,/rotatePlacementBy\(dir:1\|-1\)/);
 assert.match(read('src/ui/hearth/HudHearth.tsx'),/<RotateButtons/);
 assert.match(read('src/ui/Hud.tsx'),/<RotateButtons/);
 assert.doesNotMatch(read('src/ui/GateRotationControl.tsx'),/Rotate ↻/);
});

test('restored controls: music chip in HUD and Menu, restart behind a confirm',()=>{
 assert.match(read('src/ui/hearth/parts.tsx'),/<MusicChip engine=\{engine\}\/>/);
 assert.match(read('src/ui/hearth/screens.tsx'),/<MusicPanel engine=\{engine\}\/>/);
 const rc=read('src/ui/hearth/RestartControl.tsx');assert.match(rc,/Confirm restart/);
 const scr=read('src/ui/hearth/screens.tsx');assert.doesNotMatch(scr,/>Restart<\/button>/);
 assert.ok((scr.match(/<RestartControl/g)||[]).length>=2);
});
