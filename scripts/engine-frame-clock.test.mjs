import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/'))return next(new URL(`../src/${specifier.slice(2)}.ts`,import.meta.url).href,context);return next(specifier,context);}});
const {frameDeltaSeconds}=await import('../src/game/engine.ts');
test('a stale queued frame after slow world setup cannot delay the simulation for seconds',()=>{
 // Browser trace: begin sets last after synchronous setup, then an already
 // queued animation callback carries a timestamp from before setup began.
 let last=5991.8,accumulator=0,steps=0;const timestamps=[835.3,10001.6,10018.2,10051.6,10068.2];
 for(const timestamp of timestamps){accumulator+=frameDeltaSeconds(timestamp,last);last=timestamp;while(accumulator>=1/30){steps++;accumulator-=1/30;}}
 assert.ok(accumulator>=0);assert.ok(steps>=4,'real subsequent frames immediately drive actual fixed simulation steps');
});
test('ordinary frame time is retained while long suspension and invalid samples stay bounded',()=>{
 assert.equal(frameDeltaSeconds(1016,1000),.016);assert.equal(frameDeltaSeconds(9000,1000),.1);
 assert.equal(frameDeltaSeconds(900,1000),0);assert.equal(frameDeltaSeconds(1000,0),.016);
 assert.equal(frameDeltaSeconds(Number.NaN,1000),0);assert.equal(frameDeltaSeconds(1000,Number.NaN),0);
});
