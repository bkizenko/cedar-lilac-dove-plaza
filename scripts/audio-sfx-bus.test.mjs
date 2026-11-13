import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {GameAudio} from '../src/game/audio.ts';
import {ProceduralAudio} from '../src/game/proceduralAudio.ts';
import {busGain,busOff,normaliseSettings,AUDIO_SETTINGS_KEY,DEFAULT_AUDIO_SETTINGS} from '../src/scene/audioMix.ts';
globalThis.Audio=class{paused=true;volume=0;addEventListener(){}removeEventListener(){}removeAttribute(){}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}};
globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}};
// fake graph: every node records what it connects to, so we can prove where a one-shot ends up
class N{constructor(k){this.k=k;this.out=[];this.gain={value:1,setTargetAtTime(v){this.value=v;},setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};this.frequency={value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}};this.detune={value:0};this.Q={value:0};this.delayTime={value:0};this.pan={value:0};}
 connect(n){this.out.push(n);return n;}disconnect(){}start(){}stop(){}}
const ctx=()=>({currentTime:1,state:'running',sampleRate:8000,destination:new N('dest'),createGain:()=>new N('gain'),createOscillator:()=>new N('osc'),createBiquadFilter:()=>new N('filter'),createDelay:()=>new N('delay'),createStereoPanner:()=>new N('pan'),
 createBuffer:(c,l)=>({getChannelData:()=>new Float32Array(l)}),createBufferSource:()=>new N('src')});
const reach=(from,to,seen=new Set())=>{if(from===to)return true;if(seen.has(from))return false;seen.add(from);return (from.out??[]).some(n=>reach(n,to,seen));};
function rig(){const a=new GameAudio();const c=ctx();a.ctx=c;a.unlocked=true;a.master=new N('master');a.sfx=new N('sfx');a.music=new N('music');a.sfx.connect(a.master);a.music.connect(a.master);a.master.connect(c.destination);
 a.proc.attach(c,a.master,1);return a;}
const buses=a=>a.proc.buses;

test('settings: separate on/off per bus, defaults on, malformed values fall back',()=>{
 const d=DEFAULT_AUDIO_SETTINGS;assert.equal(d.sfxOff,false);assert.equal(d.musicOff,false);assert.equal(d.ambienceOff,false);
 const n=normaliseSettings({sfxOff:'yes',musicOff:true});assert.equal(n.sfxOff,false);assert.equal(n.musicOff,true);
 const s={...d,sfxOff:true};assert.equal(busGain(s,'sfx'),0);assert.ok(busGain(s,'music')>0);assert.ok(busGain(s,'ambience')>0);assert.ok(busGain(s,'master')>0);
 assert.equal(busOff({...d,muted:true},'music'),true);assert.equal(busOff(s,'master'),false);
});
test('sound effects switch silences only the sfx buses, in the legacy and procedural paths',()=>{
 const a=rig();a.setVolume('master',1);a.setVolume('sfx',1);a.setVolume('music',1);a.setVolume('ambience',1);
 const g=n=>n.gain.value;const on=g(a.sfx),pOn=g(buses(a).sfx);assert.ok(on>0&&pOn>0);
 a.setSfxOff(true);
 assert.equal(g(a.sfx),0);assert.equal(g(buses(a).sfx),0);
 assert.ok(g(buses(a).music)>0,'music bus untouched');assert.ok(g(buses(a).amb)>0,'nature bus untouched');assert.ok(g(a.music)>0);assert.equal(a.score.muted,false);
 a.setSfxOff(false);assert.equal(g(a.sfx),on);assert.equal(g(buses(a).sfx),pOn);
 a.toggleSfxOff();assert.equal(a.settings.sfxOff,true);a.toggleBusOff('sfx');assert.equal(a.settings.sfxOff,false);
});
test('music and nature switches are independent of effects',()=>{
 const a=rig();a.setBusOff('music',true);assert.equal(a.score.muted,true);assert.ok(a.sfx.gain.value>0);assert.equal(buses(a).music.gain.value,0);
 a.setBusOff('music',false);a.setBusOff('ambience',true);assert.equal(buses(a).amb.gain.value,0);assert.ok(buses(a).sfx.gain.value>0);assert.equal(a.score.muted,false);
});
test('every one-shot (legacy tones and noise, procedural cues) ends on the sfx bus and never on music or nature',()=>{
 const a=rig();a.setVolume('master',1);
 const made=[];const origG=a.ctx.createGain;a.ctx.createGain=()=>{const n=origG();made.push(n);return n;};
 const names=['click','place','move','chop','hit','death','train','age','win','lose','invalid','horn','bow','drop','rustle','fish','splash','hammer','pillage','fire','birth','trade','thunder'];
 // legacy path (procedural inactive)
 a.proc.active=false;a.noise=a.noise??{};
 for(const n of names){a.lastSfx={};a.voices=0;made.length=0;a.play(n);for(const g of made)assert.ok(reach(g,a.sfx),`legacy ${n} reaches sfx`),assert.ok(!reach(g,a.music),`legacy ${n} avoids music`);}
 // procedural path
 a.proc.active=true;const b=buses(a);
 for(const k of ['click','horn','thunder','splash','bell','axe','hammer','clash']){made.length=0;a.proc.playSfx(k);const mine=made.filter(g=>g!==b.sfx);assert.ok(mine.some(g=>reach(g,b.sfx)),`proc ${k} reaches sfx bus`);for(const g of mine)assert.ok(!reach(g,b.music)&&!reach(g,b.amb),`proc ${k} avoids music/nature`);}
 a.proc.rulerEvent('rise');a.proc.diplomacyCue('treaty');
});
test('when effects are off nothing is synthesised',()=>{
 const a=rig();a.setSfxOff(true);let made=0;a.ctx.createOscillator=()=>{made++;return new N('osc');};a.ctx.createBufferSource=()=>{made++;return new N('src');};
 for(const n of ['click','chop','horn','hit'])a.play(n);a.proc.playSfx('click');a.proc.playSfx('horn',3,4);assert.equal(made,0);
 a.setSfxOff(false);a.proc.playSfx('click');assert.ok(made>0);
});
test('persistence: switches reload; broken storage never throws and keeps the session value',()=>{
 const saved=globalThis.localStorage,vals=new Map();globalThis.localStorage={getItem:k=>vals.get(k)??null,setItem:(k,v)=>vals.set(k,v)};
 try{const a=new GameAudio();a.setSfxOff(true);a.setBusOff('ambience',true);assert.ok(vals.has(AUDIO_SETTINGS_KEY));const b=new GameAudio();assert.equal(b.settings.sfxOff,true);assert.equal(b.settings.ambienceOff,true);assert.equal(b.settings.musicOff,false);
  globalThis.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('full');}};
  const c=new GameAudio();assert.equal(c.settings.sfxOff,false);assert.doesNotThrow(()=>c.setSfxOff(true));assert.equal(c.settings.sfxOff,true);}
 finally{if(saved===undefined)delete globalThis.localStorage;else globalThis.localStorage=saved;}
});
test('audit: no audio output exists outside GameAudio, ProceduralAudio and AcousticScore',()=>{
 const hits=[];const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=d+'/'+e.name;if(e.isDirectory())walk(f);else if(/\.(ts|tsx)$/.test(e.name)&&/AudioContext|createOscillator|new Audio\(|\.play\(\)/.test(fs.readFileSync(f,'utf8')))hits.push(f.replace(/.*\/src\//,'src/'));}};
 walk(new URL('../src',import.meta.url).pathname);
 assert.deepEqual(hits.sort(),['src/game/audio.ts','src/game/music.ts','src/game/proceduralAudio.ts']);
});
