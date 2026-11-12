import test from 'node:test';import assert from 'node:assert/strict';
import {activityFor,newAnimState,stepAnimator,DeathTracker,CORPSE_RULES,weaponOf} from '../src/scene/characterAnim.ts';
import {CLIPS,clipForActivity,DEATH_CLIPS,DEATH_SECONDS,sampleDeath,deathClipFor,samplePose,stancePose,PARTS,NEUTRAL_POSE} from '../src/scene/animationClips.ts';
import {PRODUCTION_RECIPES} from '../src/game/production.ts';
const U=(o={})=>({id:7,type:'worker',team:0,x:0,y:0,z:0,vx:0,vz:0,facing:0,hp:10,order:'idle',...o});
const C=(o={})=>({time:0,load:0,...o});
const deg=Math.PI/180;

test('job clips are selected from real state: node kind, crop stage, fishing, building, hauling, carrying, production phase',()=>{
 const clip=(u,c)=>clipForActivity(activityFor(u,C(c))).clip;
 assert.equal(clip(U({order:'gather',node:{kind:'tree'}})),'chop');assert.equal(clip(U({order:'gather',node:{kind:'stone'}})),'quarry');assert.equal(clip(U({order:'gather',node:{kind:'copper'}})),'quarry');
 assert.equal(clip(U({order:'gather',node:{kind:'forage'}})),'harvest');assert.equal(clip(U({order:'gather',node:{kind:'fish'}})),'fish');
 assert.equal(clip(U({order:'gather',node:{type:'farm'}}),{farm:{planted:0}}),'till','bare field: dig');
 assert.equal(clip(U({order:'gather',node:{type:'farm'}}),{farm:{planted:4,tended:4}}),'plant','planted and tended: sow');
 assert.equal(clip(U({order:'gather',node:{type:'farm'}}),{farm:{planted:4,tended:1}}),'till','planted but untended: weed');
 assert.equal(clip(U({order:'gather',node:{type:'farm'}}),{farm:{ripened:true,planted:4}}),'harvest','ripe crop: reap');
 assert.equal(clip(U({order:'gather',plantingWork:{treeId:1,progress:0}})),'plant');
 assert.equal(clip(U({order:'build'})),'build');
 assert.equal(clip(U({order:'move',vx:2,vz:0,haulage:'sled'})),'haul');assert.equal(clip(U({order:'move',vx:2,vz:0,haulage:'canoe'})),'walk','a canoe is not hauled');
 assert.equal(clip(U({order:'move',vx:2,vz:0}),{load:.6}),'carry');assert.equal(clip(U({order:'move',vx:2,vz:0})),'walk');
 assert.equal(clip(U({order:'idle'}),{project:{phase:'working',recipe:'threshCereal',progress:3}}),'thresh');assert.equal(clip(U({order:'idle'}),{project:{phase:'curing',recipe:'threshCereal',progress:3}}),'idle');
 assert.equal(clip(U({order:'idle'}),{project:{phase:'working',recipe:'threshCereal',progress:3,blockedReason:'no grain'}}),'idle','a blocked project never animates work');
 assert.equal(clip(U({order:'hold',workReason:'Warming up by the lit hearth'})),'tend');
 assert.equal(clip(U({boat:{phase:'aboard'},vx:1,vz:1})),'row');
});
test('no scripted fakes: an idle person never works, a gatherer who is still walking walks, and only real tasks give a tool',()=>{
 for(const o of ['idle','hold']){const a=activityFor(U({order:o}),C());assert.equal(clipForActivity(a).clip,'idle');}
 assert.equal(clipForActivity(activityFor(U({order:'gather',node:{kind:'tree'},vx:2,vz:0}),C())).clip,'walk','still walking to the tree');
 assert.equal(clipForActivity(activityFor(U({order:'build',vx:2,vz:0}),C())).clip,'walk');
 const st=newAnimState(U(),0),f=stepAnimator(st,U(),C());assert.equal(f.itemR,undefined);
 const chop=stepAnimator(newAnimState(U(),0),U({order:'gather',node:{kind:'tree'}}),C());assert.equal(chop.itemR,'axe');
 for(const recipe of Object.keys(PRODUCTION_RECIPES)){const a=clipForActivity(activityFor(U(),C({project:{phase:'working',recipe,progress:1}})));assert.ok(CLIPS[a.clip],recipe);}
});
test('fight clips follow the weapon the unit really has, in reach only',()=>{
 const t={x:0,z:1.2,r:.4};
 for(const [type,clip] of [['spearman','thrust'],['archer','shoot'],['ranger','shoot'],['swordsman','slash'],['worker','fight'],['warden','fight']])assert.equal(clipForActivity(activityFor(U({type,order:'attack',target:t,range:1.8}),C())).clip,clip,type);
 assert.equal(clipForActivity(activityFor(U({type:'spearman',order:'attack',target:{x:0,z:30},range:1.8,vx:0,vz:3}),C())).clip,'walk','closing on a far target');
 assert.equal(weaponOf('cavalry'),undefined);assert.equal(weaponOf('spearman'),'spear');
});
test('phase comes from real progress: walking by metres moved, production by its own progress, swings by cooldown, pause freezes',()=>{
 const phaseOf=(st,u,c)=>stepAnimator(st,u,c).phase;
 // standing still while time passes never advances a walk
 const u=U({order:'move',vx:2,vz:0}),st=newAnimState(u,0),p0=phaseOf(st,u,C({time:0}));let p=p0;for(let t=.1;t<3;t+=.1)p=phaseOf(st,u,C({time:t}));assert.ok(Math.abs(p-p0)<1e-9,'no metres, no stride');
 // metres moved advance it, one stride is one cycle
 const w=CLIPS.walk,s2=newAnimState(u,0);phaseOf(s2,u,C({time:0}));const a=phaseOf(s2,{...u,x:w.strideMetres/2},C({time:.5}));const b=phaseOf(s2,{...u,x:w.strideMetres},C({time:1}));assert.ok(Math.abs(((b-a)%1+1)%1-.5)<1e-6);
 // production phase = the project's own progress
 const idle=U(),s3=newAnimState(idle,0),pj=x=>({phase:'working',recipe:'grindGrain',progress:x});
 const q1=phaseOf(s3,idle,C({time:1,project:pj(10)})),q2=phaseOf(s3,idle,C({time:2,project:pj(10)})),q3=phaseOf(s3,idle,C({time:3,project:pj(10.4)}));assert.equal(q1,q2,'a paused project (no progress) freezes the pose');assert.notEqual(q2,q3);
 // gathering without a project advances with sim time only while gathering, and freezes when sim time stops (game paused)
 const g=U({order:'gather',node:{kind:'tree'}}),s4=newAnimState(g,0);phaseOf(s4,g,C({time:0}));const t1=phaseOf(s4,g,C({time:.4})),t2=phaseOf(s4,g,C({time:.4}));assert.equal(t1,t2,'same sim time, same pose');assert.notEqual(phaseOf(s4,g,C({time:.8})),t2);
 // a swing follows the weapon cooldown: full cooldown = start of the swing, nearly ready = end
 const sp=U({type:'spearman',order:'attack',target:{x:0,z:1,r:.4},range:1.8,rof:1,cd:1}),s5=newAnimState(sp,0),f1=stepAnimator(s5,sp,C({time:0})),f2=stepAnimator(s5,{...sp,cd:.5},C({time:.1}));assert.ok(f2.phase!==f1.phase);
 const early=stepAnimator(newAnimState(sp,0),{...sp,cd:.95},C({time:0})).phase,late=stepAnimator(newAnimState(sp,0),{...sp,cd:.05},C({time:0})).phase;assert.ok(early!==late);
});
test('teleports do not slide feet: a huge jump advances at most a few metres of stride',()=>{
 const u=U({order:'move',vx:2,vz:0}),st=newAnimState(u,0);stepAnimator(st,u,C({time:0}));stepAnimator(st,{...u,x:500},C({time:.1}));assert.ok(st.dist<=3.0001);
});
test('death clips: four falls, one-shot, end lying on the ground, momentum picks the fall',()=>{
 assert.deepEqual(Object.keys(DEATH_CLIPS).sort(),['fallBack','fallForward','fallLeft','fallRight']);
 for(const [id,clip] of Object.entries(DEATH_CLIPS)){
  assert.equal(clip.keys[0].t,0);assert.equal(clip.keys.at(-1).t,1);for(let i=1;i<clip.keys.length;i++)assert.ok(clip.keys[i].t>clip.keys[i-1].t,id);
  const start=sampleDeath(id,0),end=sampleDeath(id,DEATH_SECONDS),late=sampleDeath(id,99);
  assert.deepEqual(start.rootRot,[0,0,0],id+' starts upright');assert.ok(Math.max(...end.rootRot.map(Math.abs))>80*deg&&Math.max(...end.rootRot.map(Math.abs))<95*deg,id+' ends lying');
  assert.deepEqual(late,end,id+' holds the lying pose');assert.ok(end.root[1]>.1&&end.root[1]<.3,id+' body is lifted to rest on the ground, not inside it');
  for(const p of PARTS)for(const v of end.parts[p])assert.ok(Math.abs(v)<=Math.PI*.99);
  let prev=0;for(let t=0;t<=DEATH_SECONDS;t+=.05){const m=Math.max(...sampleDeath(id,t).rootRot.map(Math.abs));assert.ok(m>=prev-12*deg,id+' falls, it does not stand back up at '+t);prev=Math.max(prev,m);}}
 const fwd=Math.sin(.7),fz=Math.cos(.7);
 assert.equal(deathClipFor(.7,fwd*3,fz*3,1),'fallForward','running forward falls forward');assert.equal(deathClipFor(.7,-fwd*3,-fz*3,1),'fallBack','driven back falls back');
 const still=new Set(Array.from({length:60},(_,i)=>deathClipFor(0,0,0,i)));assert.ok(still.has('fallBack')&&still.has('fallLeft')&&still.has('fallRight'));assert.equal(deathClipFor(0,0,0,5),deathClipFor(0,0,0,5),'deterministic');
});
test('DeathTracker: a drawn unit that leaves the simulation leaves a body; units that merely left view do not; loads and rewinds clear it',()=>{
 const T=new DeathTracker(),a=U({id:1,x:3,z:4,facing:1,vx:0,vz:0}),b=U({id:2,x:9,z:9});
 T.see(a,10,1.65,'k','adult');T.see(b,10,1.65,'k','adult');
 assert.deepEqual(T.sweep(new Set([1,2]),10.1),[],'both alive: nothing dies');
 T.see(a,10.2,1.65,'k','adult');T.see(b,10.2,1.65,'k','adult');
 assert.deepEqual(T.sweep(new Set([2]),10.3),[1],'unit 1 left the simulation');assert.equal(T.corpses.length,1);const c=T.corpses[0];assert.equal(c.x,3);assert.equal(c.z,4);assert.equal(c.diedAt,10.3);
 assert.deepEqual(T.sweep(new Set([2]),10.4),[],'no second corpse for the same death');
 // pose: falling, lying, then sinking, then removed
 assert.equal(T.pose(c,10.3).lying,false);assert.equal(T.pose(c,10.3+DEATH_SECONDS+1).lying,true);assert.equal(T.pose(c,10.3+DEATH_SECONDS+1).sink,0);
 assert.ok(T.pose(c,10.3+DEATH_SECONDS+CORPSE_RULES.seconds+.8).sink>0);
 T.sweep(new Set([2]),10.3+DEATH_SECONDS+CORPSE_RULES.seconds+CORPSE_RULES.sinkSeconds+1);assert.equal(T.corpses.length,0,'bodies are removed after they sink');
 // units never seen recently (hidden, fog) leave no corpse
 const H=new DeathTracker();H.see(U({id:5}),0,1,'k','adult');assert.deepEqual(H.sweep(new Set(),100),[],'a unit not seen for a long time is not a fresh death');
 // mass vanish = load/reset
 const M=new DeathTracker();for(let i=0;i<40;i++)M.see(U({id:i}),1,1,'k','adult');assert.deepEqual(M.sweep(new Set(),1.1),[]);assert.equal(M.corpses.length,0);
 // rewind (load) clears
 const R=new DeathTracker();R.see(U({id:1}),50,1,'k','adult');R.sweep(new Set(),50.1);assert.equal(R.corpses.length,1);R.sweep(new Set([1]),3);assert.equal(R.corpses.length,0);
 // bounded
 const B=new DeathTracker();for(let round=0;round<10;round++){for(let i=0;i<10;i++)B.see(U({id:round*10+i}),round,1,'k','adult');B.sweep(new Set(),round+.5);}assert.ok(B.corpses.length<=CORPSE_RULES.max);
});
test('stance: armed people carry their weapon properly while standing and walking; work and fight clips are untouched',()=>{
 const idle=samplePose(CLIPS.idle,.2);
 assert.ok(stancePose(idle,'idle','spear').parts.armR[0]<-.3,'spear arm raised');assert.deepEqual(stancePose(idle,'idle','bow').itemL,[0,0,0]);assert.ok(stancePose(idle,'idle','bow').parts.armL[0]<-.4);
 assert.equal(stancePose(idle,'idle',undefined),idle);const chop=samplePose(CLIPS.chop,.1);assert.equal(stancePose(chop,'chop','spear'),chop);
 assert.deepEqual(stancePose(NEUTRAL_POSE,'walk','blade').itemR.map(v=>+v.toFixed(3)),[+(38*deg).toFixed(3),0,0]);
});
test('new job clips exist, loop and carry item angles that stay bounded',()=>{
 for(const id of ['build','haul','fish','till','thrust','shoot','slash']){const c=CLIPS[id];assert.ok(c,id);for(let t=0;t<=1;t+=.1){const q=samplePose(c,t);for(const v of [...q.itemR,...q.itemL])assert.ok(Math.abs(v)<=Math.PI*.99,id);}}
 assert.ok(samplePose(CLIPS.thrust,.45).itemR[0]>80*deg,'thrust points the spear forward');assert.ok(samplePose(CLIPS.chop,.4).itemR[0]>100*deg&&samplePose(CLIPS.chop,0).itemR[0]<0,'axe up then down');
});
