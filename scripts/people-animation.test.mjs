// People animation (owner playtest 11-12): no waist-bend work poses, bent-knee stances with the hips dropped, a real run cycle blended in by speed.
import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {CLIPS,samplePose,unitVariation,gaitBlend,gaitStride,GAIT_SPEEDS,blendPoses,PARTS} from '../src/scene/animationClips.ts';
import {newAnimState,stepAnimator} from '../src/scene/characterAnim.ts';
import {RIG_BONES,boneMatrices,newBoneMatrices,transformPoint,RIG_BUDGET} from '../src/scene/characterRig.ts';
const deg=180/Math.PI,V1={phaseOffset:0,speed:1,amplitude:1},VMAX={phaseOffset:0,speed:1,amplitude:1.05};
const IDS=Object.keys(CLIPS),N=48;
const each=(clip,f,v=V1,load=0)=>{for(let i=0;i<N;i++)f(samplePose(CLIPS[clip],i/N,v,load),i/N);};
const feet=(pose)=>{const m=boneMatrices(pose,'adult',newBoneMatrices());return [transformPoint(m.legL,[0,-.5,0])[1],transformPoint(m.legR,[0,-.5,0])[1]];};
const FORAGE=['plant','harvest','tend'],WORK=['chop','quarry','till','build','thresh','grind','fight','thrust','slash'];

test('no deep waist-bend in any clip: spine pitch <= 18 deg (20 with the largest amplitude jitter), head pitch keeps the gaze up',()=>{
 for(const id of IDS)for(const load of id==='carry'?[0,1]:[0])each(id,p=>{
  assert.ok(Math.abs(p.parts.spine[0]*deg)<=20,`${id} spine ${(p.parts.spine[0]*deg).toFixed(1)}`);
  assert.ok(Math.abs(p.parts.hips[0]*deg)<=1e-6,`${id} hips never pitch`);
  assert.ok((p.parts.spine[0]+p.parts.head[0])*deg<=27,`${id} head+spine ${((p.parts.spine[0]+p.parts.head[0])*deg).toFixed(1)}`);
 },VMAX,load);
 // the clips that used to fold 34-55 degrees
 for(const id of ['chop','quarry','till','build','plant','harvest','grind','tend','thresh']){let m=0;each(id,p=>{m=Math.max(m,p.parts.spine[0]*deg);},VMAX);assert.ok(m<=20,`${id} max ${m}`);}
});
test('hips drop and the knees-bent stance keeps both feet on the ground: lowest foot at 0, none below, only the forage clips squat deep',()=>{
 for(const id of IDS){const c=CLIPS[id];if(!c.lock)continue;let minRoot=0;
  each(id,p=>{const [a,b]=feet(p);assert.ok(Math.min(a,b)>=-.03,`${id} foot sinks ${Math.min(a,b)}`);if(id!=='run')assert.ok(Math.min(a,b)<=.03,`${id} foot floats ${Math.min(a,b)}`);minRoot=Math.min(minRoot,p.root[1]);});
  if(WORK.includes(id))assert.ok(minRoot<=-.03,`${id} work stance drops the hips (${minRoot.toFixed(3)})`);
  if(FORAGE.includes(id))assert.ok(minRoot<=-.04,`${id} bent stance (${minRoot.toFixed(3)})`);else assert.ok(minRoot>-.1,`${id} must not crouch deep (${minRoot.toFixed(3)})`);
 }
});
test('work poses are driven by shoulders and arms with weight transfer: the tool arc is large, the spine is not',()=>{
 for(const id of ['chop','quarry','till','build']){let aMin=9,aMax=-9,sMin=9,sMax=-9,zMin=9,zMax=-9;each(id,p=>{aMin=Math.min(aMin,p.parts.armR[0]);aMax=Math.max(aMax,p.parts.armR[0]);sMin=Math.min(sMin,p.parts.spine[0]);sMax=Math.max(sMax,p.parts.spine[0]);zMin=Math.min(zMin,p.root[2]);zMax=Math.max(zMax,p.root[2]);});
  assert.ok((aMax-aMin)*deg>=60,`${id} arm arc ${((aMax-aMin)*deg).toFixed(0)}`);assert.ok((sMax-sMin)*deg<=26,`${id} spine range`);assert.ok(zMax-zMin>=.05,`${id} weight moves forward over the stance`);}
});
test('run is a different cycle from walk: lean, stride, knee height, arm pump, flight phase, cadence per speed',()=>{
 const stat=(id)=>{const s={spine:[],legMin:0,armRange:0,flightTop:0,airborne:false,maxFoot:0};let aMin=9,aMax=-9;each(id,p=>{s.spine.push(p.parts.spine[0]*deg);s.legMin=Math.min(s.legMin,p.parts.legL[0]*deg,p.parts.legR[0]*deg);aMin=Math.min(aMin,p.parts.armR[0]);aMax=Math.max(aMax,p.parts.armR[0]);s.flightTop=Math.max(s.flightTop,p.root[1]);if(Math.min(...feet(p))>.05)s.airborne=true;});s.armRange=(aMax-aMin)*deg;s.lean=s.spine.reduce((a,b)=>a+b,0)/N;return s;};
 const w=stat('walk'),r=stat('run');
 assert.ok(r.lean>=w.lean+8,`forward lean ${r.lean} vs ${w.lean}`);assert.ok(r.legMin<=w.legMin-25,'higher knee drive');assert.ok(r.armRange>=w.armRange*2,'arm pump');
 assert.ok(r.airborne&&!w.airborne,'run has a flight phase, walk never leaves the ground');assert.ok(r.flightTop>=.08&&w.flightTop<=.01);
 assert.ok(CLIPS.run.strideMetres>=CLIPS.walk.strideMetres*1.5,'longer stride');
 const at=(speed,id)=>speed/CLIPS[id].strideMetres;assert.ok(at(5.4,'run')>at(3,'walk'),'running cadence is faster than walking cadence');
 const a=samplePose(CLIPS.walk,.1),b=samplePose(CLIPS.run,.1);assert.notDeepEqual(a.parts.legL,b.parts.legL);
});
test('walk to run blends by real speed and the phase stays continuous through the change',()=>{
 assert.equal(gaitBlend(0),0);assert.equal(gaitBlend(GAIT_SPEEDS.walkBelow),0);assert.equal(gaitBlend(GAIT_SPEEDS.runAbove),1);assert.equal(gaitBlend(99),1);
 let prev=-1;for(let s=0;s<=7;s+=.25){const g=gaitBlend(s);assert.ok(g>=prev);prev=g;}
 assert.ok(gaitStride(0)===CLIPS.walk.strideMetres&&gaitStride(1)===CLIPS.run.strideMetres);
 const U=(o={})=>({id:7,type:'worker',team:0,x:0,y:0,z:0,vx:0,vz:0,facing:0,hp:10,order:'move',...o});
 const run=(speeds,dt=.1)=>{const u=U(),st=newAnimState(u,0),out=[];let t=0;for(const sp of speeds){t+=dt;u.vx=sp;u.x+=sp*dt;const f=stepAnimator(st,{...u},{time:t,load:0});out.push({f,st:{...st}});}return out;};
 const slow=run(Array(30).fill(2)).at(-1),fast=run(Array(40).fill(6)).at(-1);
 assert.equal(slow.st.run,0);assert.ok(fast.st.run>.99);
 const lean=x=>x.f.pose.parts.spine[0]*deg;assert.ok(lean(fast)>10&&lean(slow)<5);
 const ramp=run([...Array(10).fill(2),...Array(30).fill(0).map((_,i)=>2+i*.15),...Array(20).fill(6.5)]);
 for(let i=1;i<ramp.length;i++){const d=Math.abs(ramp[i].f.phase-ramp[i-1].f.phase),wrap=Math.min(d,1-d);assert.ok(wrap<.45,`phase jump ${wrap} at ${i}`);}
 const mid=run(Array(40).fill(4.2)).at(-1);assert.ok(mid.st.run>.3&&mid.st.run<.8);assert.ok(lean(mid)>lean(slow)&&lean(mid)<lean(fast));
 assert.deepEqual(run(Array(25).fill(5)).map(x=>x.f.pose),run(Array(25).fill(5)).map(x=>x.f.pose),'deterministic');
 assert.equal(blendPoses(samplePose(CLIPS.walk,.3),samplePose(CLIPS.run,.3),0).parts.legL[0],samplePose(CLIPS.walk,.3).parts.legL[0]);
 // a loaded walker never runs (clip is carry, not walk)
 const u=U({vx:6}),st=newAnimState(u,0);let f;for(let i=1;i<20;i++){u.x+=.6;f=stepAnimator(st,{...u},{time:i*.1,load:.8});}assert.equal(f.clip,'carry');assert.equal(st.run,0);
});
test('deterministic and finite: no Math.random or Date.now in the animation sources, small per-person variation, every pose finite',()=>{
 for(const f of ['animationClips','characterAnim','peopleLife','characterRig']){const s=fs.readFileSync(new URL(`../src/scene/${f}.ts`,import.meta.url),'utf8').replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/.*$/gm,'');assert.ok(!/Math\.random|Date\.now|performance\.now/.test(s),f);}
 const a=unitVariation(11),b=unitVariation(12);assert.deepEqual(unitVariation(11),a);assert.notEqual(a.phaseOffset,b.phaseOffset);assert.ok(a.amplitude>=.95&&a.amplitude<=1.05&&a.speed>=.92&&a.speed<=1.08);
 for(const id of IDS)for(const v of [V1,a,b])each(id,p=>{for(const q of PARTS)for(const x of p.parts[q])assert.ok(Number.isFinite(x));for(const x of p.root)assert.ok(Number.isFinite(x));},v);
 assert.ok(RIG_BUDGET.near>0&&RIG_BONES.length===7,'the rig and its budget are unchanged');
});
