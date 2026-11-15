// Stationary work: legs planted and still; leg swing follows real horizontal speed; no phase advance at rest.
import test from 'node:test';import assert from 'node:assert/strict';
import {CLIPS,samplePose,plantLegs,legSwingWeight,advanceGait,PLANTED_CLIPS,LEG_SPEED} from '../src/scene/animationClips.ts';
import {newAnimState,stepAnimator} from '../src/scene/characterAnim.ts';
const V={phaseOffset:0,speed:1,amplitude:1};
test('speed 0 gives zero leg rotation and no root drift in every work/idle pose, at every phase',()=>{
 for(const id of PLANTED_CLIPS)for(let i=0;i<48;i++){const raw=samplePose(CLIPS[id],i/48,V),p=plantLegs(raw,id,0);
  for(const l of ['legL','legR'])assert.deepEqual(p.parts[l].map(Math.abs),[0,0,0],id+' '+l);
  assert.equal(Math.abs(p.root[0]),0,id);assert.equal(Math.abs(p.root[2]),0,id);
  assert.ok(p.root[1]>=raw.root[1]-1e-9,id+' hips not dropped without bent legs');}
});
test('walking speed keeps full swing; ramp is smooth',()=>{
 assert.equal(legSwingWeight(0),0);assert.equal(legSwingWeight(1.4),1);
 let prev=0;for(let s=0;s<=.5;s+=.01){const w=legSwingWeight(s);assert.ok(w>=prev-1e-12);prev=w;}
 const walk=samplePose(CLIPS.walk,0,V);assert.ok(Math.abs(walk.parts.legL[0])>.3);
 assert.equal(plantLegs(walk,'walk',1.4),walk);
 const chop=samplePose(CLIPS.chop,0,V);assert.ok(Math.abs(plantLegs(chop,'chop',1.4).parts.legL[0])>.1);
});
test('gait phase does not advance at speed 0, advances when walking',()=>{
 assert.equal(advanceGait(.3,.5,0,1.6),.3);assert.equal(advanceGait(.3,.5,LEG_SPEED.still,1.6),.3);
 assert.ok(advanceGait(.3,.5,1.4,1.6)>.3);
});
test('stepAnimator: standing at a work spot leaves legs at exactly zero; walking swings',()=>{
 const u={id:7,type:'villager',team:0,x:0,y:0,z:0,vx:0,vz:0,facing:0,hp:10,order:'gather',node:{kind:'tree'}};
 const st=newAnimState(u,0);let f;
 for(let t=1;t<=60;t++)f=stepAnimator(st,u,{time:t/10,load:0});
 assert.equal(f.clip,'chop');for(const l of ['legL','legR'])assert.deepEqual(f.pose.parts[l].map(Math.abs),[0,0,0]);
 const g0=st.gait;for(let t=61;t<=80;t++)stepAnimator(st,u,{time:t/10,load:0});assert.equal(st.gait,g0);
 const w={...u,order:'move',node:undefined,vx:1.4,vz:0};const sw=newAnimState(w,0);let mx=0;
 for(let t=1;t<=60;t++){w.x+=.14;w.vx=1.4;f=stepAnimator(sw,w,{time:t/10,load:0});mx=Math.max(mx,Math.abs(f.pose.parts.legL[0]));}
 assert.equal(f.clip,'walk');assert.ok(mx>.3);
});
