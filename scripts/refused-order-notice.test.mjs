import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,n){if(s.startsWith('@/')){return n(new URL('../src/'+s.slice(2)+'.ts',import.meta.url).href,c);}return n(s,c);}});
import test from 'node:test';import assert from 'node:assert/strict';
const {Engine}=await import('../src/game/engine.ts');
/** Engine.dispatch wraps dispatchRaw: a refusal becomes one banner + cue unless the caller owns its feedback. */
const fake=(result)=>{const notes=[],cues=[];return{notes,cues,disposed:false,audio:{play:c=>cues.push(c)},presentationNotice:(m,s)=>notes.push([m,s]),dispatchRaw:async()=>result};};
test('refused order shows its reason once and plays the refusal cue',async()=>{
 const f=fake({accepted:false,reason:'No path to that place'});
 const r=await Engine.prototype.dispatch.call(f,{kind:'move'});assert.equal(r.accepted,false);assert.deepEqual(f.notes,[['No path to that place',4]]);assert.deepEqual(f.cues,['invalid']);
});
test('accepted orders and callers with their own feedback stay quiet',async()=>{
 const ok=fake({accepted:true,reason:'Move issued'});await Engine.prototype.dispatch.call(ok,{kind:'move'});assert.equal(ok.notes.length,0);
 const own=fake({accepted:false,reason:'No suitable match'});await Engine.prototype.dispatch.call(own,{kind:'marry-houses'},undefined,{notice:false});assert.equal(own.notes.length,0);
});
