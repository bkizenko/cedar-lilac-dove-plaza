import test from 'node:test';import assert from 'node:assert/strict';
import {CLIPS,PARTS,clipForActivity,phaseFor,samplePose,unitVariation,gaitFor,animationTier,poseAtTier,EffectPool,EFFECT_CAPS,eventsBetween,NEUTRAL_POSE} from '../src/scene/animationClips.ts';
import {PRODUCTION_RECIPES} from '../src/game/production.ts';
const V={phaseOffset:0,speed:1,amplitude:1};
test('every clip is a closed, ordered keyframe table with bounded joint angles',()=>{
 for(const c of Object.values(CLIPS)){const ks=c.keys;assert.equal(ks[0].t,0,c.id);assert.equal(ks.at(-1).t,1,c.id);for(let i=1;i<ks.length;i++)assert.ok(ks[i].t>ks[i-1].t,c.id+' ordered');
  const s=samplePose(c,0),e=samplePose(c,1);for(const p of PARTS)for(let a=0;a<3;a++)assert.ok(Math.abs(s.parts[p][a]-e.parts[p][a])<1e-9,c.id+' loops seamlessly at '+p);
  for(let t=0;t<=1;t+=.05){const q=samplePose(c,t);for(const p of PARTS)for(const v of q.parts[p])assert.ok(Math.abs(v)<=Math.PI*.99,c.id+' angle');assert.ok(Math.abs(q.root[1])<.2&&Math.abs(q.root[2])<.3);}
  for(const ev of c.events)assert.ok(ev.at>=0&&ev.at<=1&&ev.count>=1&&ev.count<=8);}
});
test('every real production recipe maps to a clip: working phases animate the right task, other phases never pretend to work',()=>{
 const ids=Object.keys(PRODUCTION_RECIPES);assert.ok(ids.length>50);
 for(const recipe of ids){const w=clipForActivity({productionPhase:'working',recipe});assert.ok(CLIPS[w.clip],recipe);
  if(/^thresh/.test(recipe))assert.equal(w.clip,'thresh',recipe);if(/^winnow/.test(recipe))assert.equal(w.clip,'winnow',recipe);if(/^grind/.test(recipe))assert.equal(w.clip,'grind',recipe);if(/^bake/.test(recipe))assert.equal(w.clip,'bake',recipe);
  for(const phase of['curing','paused'])assert.equal(clipForActivity({productionPhase:phase,recipe}).clip,'idle',recipe+' '+phase);
  for(const phase of['carrying','collecting','returning','unloading'])assert.ok(['walk','carry','idle'].includes(clipForActivity({productionPhase:phase,recipe,moving:true,load:.5}).clip));}
 assert.equal(clipForActivity({order:'gather',moving:false,nodeKind:'tree'}).clip,'chop');assert.equal(clipForActivity({order:'gather',moving:false,nodeKind:'rock'}).clip,'quarry');assert.equal(clipForActivity({order:'gather',moving:false,fieldAction:'plant'}).clip,'plant');assert.equal(clipForActivity({order:'gather',moving:false,fieldAction:'harvest'}).clip,'harvest');
 assert.equal(clipForActivity({order:'attack',inRange:true}).clip,'fight');assert.equal(clipForActivity({order:'attack',inRange:false,moving:true}).clip,'walk');assert.equal(clipForActivity({rowing:true,order:'move'}).clip,'row');
 assert.equal(clipForActivity({order:'idle'}).clip,'idle');assert.equal(clipForActivity({order:'move',moving:true,load:.7}).clip,'carry');assert.equal(clipForActivity({order:'move',moving:true,load:0}).clip,'walk');assert.equal(clipForActivity({order:'move',moving:true,load:NaN}).clip,'walk');
});
test('phase follows real progress: more work or distance moves it, a paused task freezes, cycles per unit of progress are fixed',()=>{
 const th=CLIPS.thresh,a=phaseFor(th,{workSeconds:10},V),b=phaseFor(th,{workSeconds:10},V);assert.equal(a,b,'same progress, same phase');assert.notEqual(phaseFor(th,{workSeconds:10.4},V),a);
 const walk=CLIPS.walk,p1=phaseFor(walk,{distanceMetres:0},V),p2=phaseFor(walk,{distanceMetres:walk.strideMetres},V);assert.ok(Math.abs(p1-p2)<1e-9,'one stride is one cycle');
 assert.ok(Math.abs(phaseFor(CLIPS.row,{distanceMetres:CLIPS.row.strideMetres*2.5},V)-.5)<1e-9,'row strokes follow metres rowed');
 assert.equal(phaseFor(walk,{distanceMetres:0},V),phaseFor(walk,{distanceMetres:0,timeSeconds:999},V),'wall-clock time never drives a walk');
 for(let x=0;x<50;x+=.7){const p=phaseFor(th,{workSeconds:x},V);assert.ok(p>=0&&p<1);}
});
test('load changes the gait: shorter stride, higher bob, forward lean; an empty walker is unchanged',()=>{
 const g0=gaitFor(0),g1=gaitFor(1);assert.ok(g1.strideScale<g0.strideScale&&g1.bobScale>g0.bobScale&&g1.leanDeg>g0.leanDeg&&g1.speedHint<g0.speedHint);
 const dist=10;assert.ok(phaseFor(CLIPS.carry,{distanceMetres:dist},V,1)!==phaseFor(CLIPS.carry,{distanceMetres:dist},V,0),'a loaded walker steps more often per metre');
 const light=samplePose(CLIPS.carry,.25,V,0),heavy=samplePose(CLIPS.carry,.25,V,1);assert.ok(heavy.parts.spine[0]>light.parts.spine[0]&&heavy.root[1]>light.root[1]);
 assert.deepEqual(samplePose(CLIPS.walk,.3,V,1),samplePose(CLIPS.walk,.3,V,0),'walk clip itself ignores load');
});
test('individual variation is small, deterministic and needs no new mesh',()=>{
 const vs=Array.from({length:300},(_,i)=>unitVariation(i+1));assert.deepEqual(unitVariation(5),unitVariation(5));
 assert.ok(vs.every(v=>v.phaseOffset>=0&&v.phaseOffset<1&&v.speed>=.92&&v.speed<=1.08&&v.amplitude>=.95&&v.amplitude<=1.05));assert.ok(new Set(vs.map(v=>v.phaseOffset.toFixed(4))).size>280,'workers are out of step');
 const a=samplePose(CLIPS.thresh,.45,unitVariation(1)),b=samplePose(CLIPS.thresh,.45,unitVariation(2));assert.notDeepEqual(a,b);assert.ok(Math.abs(a.parts.spine[0]-b.parts.spine[0])<.1*Math.abs(a.parts.spine[0])+1e-9);
});
test('LOD: near full, mid reduced, far no animation and no effects',()=>{
 assert.equal(animationTier(10),0);assert.equal(animationTier(50),1);assert.equal(animationTier(120),2);
 const p=samplePose(CLIPS.chop,.4,V),mid=poseAtTier(p,1),far=poseAtTier(p,2);assert.deepEqual(far,NEUTRAL_POSE);assert.deepEqual(mid.parts.armL,[0,0,0]);assert.deepEqual(mid.parts.spine,p.parts.spine);assert.deepEqual(poseAtTier(p,0),p);
 assert.deepEqual(eventsBetween(CLIPS.thresh,.3,.5,{tier:2,dry:true}),[]);assert.equal(eventsBetween(CLIPS.thresh,.3,.5,{tier:0,dry:true}).length,2);assert.equal(eventsBetween(CLIPS.thresh,.3,.5,{tier:1,dry:true}).length,1,'no dust at mid');
});
test('effects only come from real conditions: smoke and steam need a lit fire, dust needs dry ground; wraparound is handled',()=>{
 assert.deepEqual(eventsBetween(CLIPS.tend,0,.5,{fireLit:false}),[]);assert.equal(eventsBetween(CLIPS.tend,0,.5,{fireLit:true}).length,1);assert.deepEqual(eventsBetween(CLIPS.bake,0,.9,{fireLit:false}),[]);assert.equal(eventsBetween(CLIPS.bake,0,.9,{fireLit:true})[0].kind,'steam');
 assert.deepEqual(eventsBetween(CLIPS.walk,.1,.4,{dry:false}),[]);assert.equal(eventsBetween(CLIPS.walk,.1,.6,{dry:true}).length,1);
 assert.equal(eventsBetween(CLIPS.tend,.9,.4,{fireLit:true}).length,1,'phase wrapped past 1 to .4 crosses the .3 smoke event');
});
test('effect pool: hard caps, per-source limit, spawn-rate limit, no growth, deterministic',()=>{
 const pool=new EffectPool(),cap=pool.capacity;assert.equal(cap,Object.values(EFFECT_CAPS).reduce((a,b)=>a+b,0));
 for(let i=0;i<100000;i++){const kind=['dust','chaff','smoke','steam'][i%4];pool.spawn(kind,0,0,0,i%400,i);if(i%50===0)pool.step(.016);for(const k of Object.keys(EFFECT_CAPS))assert.ok(pool.count(k)<=EFFECT_CAPS[k],k+' over cap');}
 assert.ok(pool.count()<=cap&&pool.dropped>90000,'almost all attempts were refused '+pool.dropped);
 const one=new EffectPool();let ok=0;for(let i=0;i<50;i++)if(one.spawn('chaff',0,0,0,7,i))ok++;assert.equal(ok,6,'one source may have 6 alive');
 const t=new EffectPool();for(let i=0;i<60;i++)t.spawn('dust',0,0,0,i,i);assert.ok(t.count('dust')<=60,'spawn rate is limited per second');for(let s=0;s<20;s++)t.step(.5);assert.equal(t.count(),0,'everything expires');
 const a=new EffectPool(),b=new EffectPool();for(const p of[a,b]){p.spawn('smoke',1,2,3,1,9);p.step(.1);}assert.deepEqual(a.alive(),b.alive());
});
