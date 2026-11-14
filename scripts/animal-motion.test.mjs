import test from 'node:test';import assert from 'node:assert/strict';
import {advancePhase,turnToward,slopePitch,easeTo,turnLean,angleDiff,idleOffset} from '../src/scene/animalMotion.ts';
test('phase advance equals distance / stride length and wraps; teleports do not advance',()=>{
 assert.ok(Math.abs(advancePhase(.2,.75,1.5)-.7)<1e-12);
 assert.ok(Math.abs(advancePhase(.9,.3,1.5)-.1)<1e-12);
 assert.ok(Math.abs(advancePhase(.4,10,1.5)-.4)<1e-12);assert.ok(Math.abs(advancePhase(.4,0,1.5)-.4)<1e-12);
 // foot sliding: one full cycle covers exactly one stride, whatever the step size
 let p=0;for(let i=0;i<300;i++)p=advancePhase(p,.01,3);assert.ok(Math.abs(p-1%1)<1e-9||Math.abs(p-1)<1e-9);
});
test('turning is capped by max angular velocity, takes the short way, never overshoots',()=>{
 let h=0;const dt=1/60,max=2;
 for(let i=0;i<30;i++){const n=turnToward(h,Math.PI*.9,dt,max);assert.ok(n-h<=max*dt+1e-12);h=n;}
 const n=turnToward(3.0,-3.0,.1,10);assert.ok(n>3.0,'wraps through PI, short way');
 let a=0;for(let i=0;i<600;i++)a=turnToward(a,1,dt,5);assert.ok(Math.abs(a-1)<1e-3&&a<=1+1e-12);
 assert.equal(turnToward(1,2,0,5),1);
 assert.ok(Math.abs(angleDiff(3.5,-3.5)-(7-2*Math.PI))<1e-9);
});
test('slope pitch follows terrain, is clamped and zero when still; easing and lean are bounded',()=>{
 assert.ok(slopePitch(1,4)>0&&slopePitch(-1,4)<0&&slopePitch(5,0)===0);
 assert.ok(Math.abs(slopePitch(100,1))<=.35+1e-12);
 assert.ok(Math.abs(turnLean(50,10))<=.12+1e-12&&turnLean(0,5)===0);
 assert.ok(Math.abs(easeTo(0,1,100,6)-1)<1e-6&&easeTo(0,1,0)===0);
});
test('idle offsets are deterministic per seed and differ between animals',()=>{
 assert.equal(idleOffset(5),idleOffset(5));
 assert.ok(new Set([1,2,3,4,5,6,7,8].map(s=>idleOffset(s).toFixed(4))).size>=7);
 for(let s=0;s<50;s++){const o=idleOffset(s);assert.ok(o>=0&&o<17);}
});
