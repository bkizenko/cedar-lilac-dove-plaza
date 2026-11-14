import test from 'node:test';
import assert from 'node:assert/strict';
import {FELL_LOG_RULES,logsLeft,logPose,visibleLogs,isFallen} from '../src/game/fellLogs.ts';
import {sfxDuck,sfxDuckLoad,DuckFollower,SFX_DUCK_FLOOR} from '../src/scene/audioMix.ts';
import {ANIMAL_SFX} from '../src/game/audioProbe.ts';

const tree=(o={})=>({id:7,x:10,y:1,z:20,amount:28,felledAt:5,...o});

test('standing trees hold no logs; fallen ones hold one per woodPerLog and lose them as wood is cut',()=>{
 assert.equal(logsLeft(tree({felledAt:undefined})),0);
 assert.equal(isFallen(tree({amount:0})),false);
 assert.equal(logsLeft(tree({amount:0})),0);
 const W=FELL_LOG_RULES.woodPerLog;
 assert.equal(logsLeft(tree({amount:W})),1);assert.equal(logsLeft(tree({amount:W+1})),2);
 assert.equal(logsLeft(tree({amount:9999})),FELL_LOG_RULES.maxLogs);
 let prev=Infinity;for(let a=40;a>=0;a--){const n=logsLeft(tree({amount:a}));assert.ok(n<=prev);prev=n;}
});
test('log poses are deterministic, near the trunk, on the ground and distinct',()=>{
 const a=logPose(tree(),0),b=logPose(tree(),0);assert.deepEqual(a,b);
 const seen=new Set();
 for(let i=0;i<FELL_LOG_RULES.maxLogs;i++){const p=logPose(tree(),i);assert.ok(Math.hypot(p.x-10,p.z-20)<2,'beside the tree');assert.ok(p.y>=1&&p.y<2);seen.add(p.x.toFixed(3)+p.z.toFixed(3)+p.y.toFixed(3));}
 assert.equal(seen.size,FELL_LOG_RULES.maxLogs);
 assert.notDeepEqual(logPose(tree({id:8}),0).yaw,a.yaw);
});
test('visibleLogs respects distance and the instance cap',()=>{
 const trees=[tree({id:1}),tree({id:2,x:5000}),tree({id:3,felledAt:undefined})];
 const v=visibleLogs(trees,{x:10,z:20});assert.equal(v.length,logsLeft(trees[0]));
 const many=Array.from({length:200},(_,i)=>tree({id:i+10}));
 assert.equal(visibleLogs(many,{x:10,z:20},50).length,50);
});
test('sfx ducking is bounded, monotonic and ignores footsteps and distant effects',()=>{
 assert.equal(sfxDuck(0),1);assert.equal(sfxDuck(1),SFX_DUCK_FLOOR);assert.equal(sfxDuck(5),SFX_DUCK_FLOOR);assert.equal(sfxDuck(NaN),1);
 assert.ok(sfxDuck(.3)>sfxDuck(.6));
 assert.equal(sfxDuckLoad('step_grass',1),0);assert.equal(sfxDuckLoad('axe',.05),0);assert.ok(sfxDuckLoad('clash',1)>sfxDuckLoad('axe',.8));
});
test('duck follower dips fast under a burst and recovers slowly, deterministically',()=>{
 const f=new DuckFollower();assert.equal(f.step(0,1),1);
 const hit=f.step(.8,.016);assert.ok(hit<.8);
 const later=f.step(0,1);assert.ok(later>hit&&later<1,'releases gradually');
 let v=later;for(let i=0;i<20;i++)v=f.step(0,1);assert.equal(v,1);
 const g=new DuckFollower();assert.equal(g.step(.8,.016),hit);
});
test('animal calls map species to positional sounds; predators stay silent',()=>{
 assert.equal(ANIMAL_SFX.sheep,'sheep');assert.equal(ANIMAL_SFX.cattle,'cow');assert.equal(ANIMAL_SFX.horse,'horse');assert.equal(ANIMAL_SFX.wolf,undefined);
});
