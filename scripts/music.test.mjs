import test from 'node:test';import assert from 'node:assert/strict';
import {AcousticScore} from '../src/game/music.ts';import {GameAudio} from '../src/game/audio.ts';
function fixture(){
  const oldAudio=globalThis.Audio,oldDocument=globalThis.document,tracks=[],events=new Map();
  globalThis.document={hidden:false,addEventListener:(k,f)=>events.set(k,f),removeEventListener:k=>events.delete(k)};
  globalThis.Audio=class {paused=true;volume=0;currentTime=0;plays=0;listeners=new Map();constructor(file){this.file=file;tracks.push(this);}addEventListener(k,f){this.listeners.set(k,f);}play(){this.paused=false;this.plays++;return Promise.resolve();}pause(){this.paused=true;}removeAttribute(){}load(){}};
  return {score:new AcousticScore(),tracks,events,restore(){globalThis.Audio=oldAudio;globalThis.document=oldDocument;}};
}
test('music plays while simulation is paused and idle tracks do not decode silently',()=>{
  const f=fixture();try{assert.equal(f.score.status,'Ready — enable music');f.score.unlock();f.score.update('village',6,true,.7);assert.equal(f.tracks[0].paused,false);assert.ok(f.tracks[0].volume>.1);assert.equal(f.tracks[1].plays,0);assert.equal(f.tracks[2].plays,0);assert.equal(f.score.status,'Playing');}finally{f.restore();}
});
test('mute/unmute and background visibility pause and resume the active piece',()=>{
  const f=fixture();try{f.score.unlock();f.score.update('village',6,false);f.score.setMuted(true);assert.equal(f.tracks[0].volume,0);assert.equal(f.tracks[0].paused,true);f.score.setMuted(false);assert.equal(f.tracks[0].paused,false);globalThis.document.hidden=true;f.events.get('visibilitychange')();assert.equal(f.tracks[0].paused,true);globalThis.document.hidden=false;f.events.get('visibilitychange')();assert.equal(f.tracks[0].paused,false);}finally{f.restore();}
});
test('seasonal transitions start the new track, fade the old one and restart after quiet gaps',()=>{
  const f=fixture();try{f.score.unlock();f.score.update('village',20,false);f.score.update('adventure',6,true);assert.equal(f.score.stage,'adventure');assert.equal(f.tracks[1].paused,false);assert.equal(f.tracks[0].paused,true);assert.ok(f.tracks[1].volume>0);f.tracks[1].paused=true;f.tracks[1].listeners.get('ended')();assert.match(f.score.status,/Quiet/);const count=f.tracks[1].plays;f.score.update('adventure',41,false);assert.equal(f.tracks[1].plays,count+1);assert.equal(f.tracks[1].currentTime,0);}finally{f.restore();}
});
test('failed autoplay is visible and another gesture retries it without rebuilding audio',async()=>{
  const f=fixture();try{f.score.unlock();f.tracks[0].play=()=>Promise.reject({name:'NotAllowedError'});f.score.unlock();await Promise.resolve();await Promise.resolve();assert.match(f.score.error,/Enable music/);f.tracks[0].play=function(){this.paused=false;return Promise.resolve();};f.score.unlock();await Promise.resolve();assert.equal(f.score.error,'');}finally{f.restore();}
});
test('an already unlocked effects context still retries music on a user gesture',()=>{
  let retries=0;GameAudio.prototype.unlock.call({unlocked:true,ctx:{state:'running'},score:{unlock(){retries++;}}});assert.equal(retries,1);
});
