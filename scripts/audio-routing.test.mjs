import test from 'node:test';
import assert from 'node:assert/strict';
import {GameAudio} from '../src/game/audio.ts';
import {AUDIO_SETTINGS_KEY} from '../src/scene/audioMix.ts';
// Minimal browser media host. Routing uses the real GameAudio and AcousticScore;
// media decoding/gesture policy are checked separately in the built browser.
globalThis.Audio=class{paused=true;volume=0;addEventListener(){}removeEventListener(){}removeAttribute(){}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}};
globalThis.document={hidden:false,addEventListener(){},removeEventListener(){}};
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
function fallback(a){const node=()=>({gain:{value:0,setTargetAtTime(v){this.value=v;}}});a.ctx={currentTime:1};a.master=node();a.sfx=node();a.music=node();}

test('recorded soundtrack follows music and master sliders even when procedural music is off',()=>{
 const a=new GameAudio();assert.equal(a.proc.active,false);a.setVolume('master',.5);a.setVolume('music',.4);near(a.score.volume,.04);a.setVolume('master',0);assert.equal(a.score.volume,0);a.setVolume('master',1);near(a.score.volume,.16);a.setVolume('music',0);assert.equal(a.score.volume,0);
});
test('legacy effects respect master while the shared output never squares procedural master gain',()=>{
 const a=new GameAudio();fallback(a);a.setVolume('master',.5);a.setVolume('sfx',.8);near(a.sfx.gain.value,.072);near(a.master.gain.value,.5);assert.equal(a.proc.settings.master,.5);assert.equal(a.proc.settings.sfx,.8);a.setMuted(true);assert.equal(a.master.gain.value,0);assert.equal(a.score.muted,true);a.setMuted(false);near(a.master.gain.value,.5);near(a.sfx.gain.value,.072);
});
test('old setters use the shared routing and malformed volumes preserve the last finite setting',()=>{
 const a=new GameAudio();fallback(a);a.setVolume('master',0);a.setMusicVolume(.8);a.setSfxVolume(.9);assert.equal(a.score.volume,0);assert.equal(a.sfx.gain.value,0);const before=structuredClone(a.settings);for(const v of [NaN,Infinity,-Infinity])a.setVolume('music',v);assert.deepEqual(a.settings,before);a.setVolume('master',2);assert.equal(a.settings.master,1);a.setVolume('sfx',-1);assert.equal(a.sfx.gain.value,0);
});
test('saved independent buses and mute reload without changing settings when storage fails',()=>{
 const saved=globalThis.localStorage,values=new Map();globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};
 try{const a=new GameAudio();a.setVolume('master',.6);a.setVolume('music',.3);a.setVolume('sfx',.4);a.setVolume('ambience',.2);a.setMuted(true);assert.ok(values.has(AUDIO_SETTINGS_KEY));const b=new GameAudio();assert.deepEqual(b.settings,a.settings);b.setVolume('ambience',.7);assert.equal(b.score.volume,0);assert.equal(b.score.muted,true);b.setMuted(false);near(b.score.volume,.032);globalThis.localStorage.setItem=()=>{throw Error('Full');};b.setVolume('music',.1);near(b.score.volume,.004);}
 finally{if(saved===undefined)delete globalThis.localStorage;else globalThis.localStorage=saved;}
});
