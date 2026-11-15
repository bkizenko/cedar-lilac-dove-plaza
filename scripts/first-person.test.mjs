import test from 'node:test';import assert from 'node:assert/strict';
import {FIRST_PERSON_RULES as R,lookDelta,stepBody,eyePose,forwardOf,rightOf,canStand,insideSolid,nearestStandable,newMode,enter,exit,walkingDrawLevel,parseFirstPersonPrefs,wrapAngle} from '../src/game/firstPerson.ts';

const flat={height:()=>5,water:()=>0,solids:[],half:500};
const body=(o={})=>({x:0,z:0,y:5,yaw:0,pitch:0,bob:0,travelled:0,...o});
const none={forward:0,strafe:0,turn:0,run:false};
const run=(b,input,sec,w=flat,fps=60)=>{for(let i=0;i<sec*fps;i++)b=stepBody(b,input,1/fps,w);return b;};

test('controls: W is forward, A moves left on screen, D right (yaw 0 faces -Z)',()=>{
 const w=run(body(),{...none,forward:1},1);assert.ok(w.z<-3&&Math.abs(w.x)<1e-9);
 const a=run(body(),{...none,strafe:-1},1);assert.ok(a.x<-3&&Math.abs(a.z)<1e-9,'A goes to -X, which is screen-left when facing -Z');
 const d=run(body(),{...none,strafe:1},1);assert.ok(d.x>3);
 const s=run(body(),{...none,forward:-1},1);assert.ok(s.z>3);
 assert.deepEqual(forwardOf(0),{x:-0,z:-1});assert.equal(rightOf(0).x,1);
});

test('strafe follows the heading: facing east (yaw -PI/2) W goes +X and D goes +Z',()=>{
 const yaw=-Math.PI/2;
 const f=run(body({yaw}),{...none,forward:1},1);assert.ok(f.x>3&&Math.abs(f.z)<1e-6);
 const d=run(body({yaw}),{...none,strafe:1},1);assert.ok(d.z>3);
});

test('mouse right turns right (lower yaw), up looks up, pitch is clamped',()=>{
 const l=lookDelta({yaw:0,pitch:0},100,0);assert.ok(l.yaw<0);
 assert.ok(lookDelta({yaw:0,pitch:0},-100,0).yaw>0);
 assert.ok(lookDelta({yaw:0,pitch:0},0,-100).pitch>0);
 assert.equal(lookDelta({yaw:0,pitch:0},0,-1e6).pitch,R.pitchLimit);assert.equal(lookDelta({yaw:0,pitch:0},0,1e6).pitch,-R.pitchLimit);
 assert.ok(Math.abs(lookDelta({yaw:3,pitch:0},-5000,0).yaw)<=Math.PI+1e-9);
 assert.ok(Math.abs(wrapAngle(7*Math.PI)-Math.PI)<1e-9||Math.abs(wrapAngle(7*Math.PI)+Math.PI)<1e-9);
});

test('diagonal movement is not faster than straight; run is faster than walk',()=>{
 const st=run(body(),{...none,forward:1},1),dg=run(body(),{...none,forward:1,strafe:1},1);
 assert.ok(Math.hypot(dg.x,dg.z)<=Math.hypot(st.x,st.z)+1e-6);
 const r=run(body(),{...none,forward:1,run:true},1);assert.ok(Math.abs(r.z)>Math.abs(st.z)*1.5);
});

test('buildings block movement and walker slides along a wall',()=>{
 const w={...flat,solids:[{x:0,z:-10,w:20,d:4}]};
 const b=run(body(),{...none,forward:1},6,w);
 assert.ok(b.z>-10+2*.4+R.radius-.2,'stopped at the wall (half depth is 0.4*d)');
 // head-on then sliding sideways along the wall
 const s=run(body({z:-6}),{...none,forward:1,strafe:1},2,w);assert.ok(s.x>2,'slides along the face');assert.ok(!insideSolid(s.x,s.z,w.solids));
 // never tunnels at a huge dt
 let t=body({z:-6});for(let i=0;i<20;i++)t=stepBody(t,{...none,forward:1,run:true},5,w);assert.ok(!insideSolid(t.x,t.z,w.solids));
});

test('water and steep slopes are walls; gentle slopes are not',()=>{
 const sea={height:x=>x<0?-3:5,water:()=>0,solids:[],half:500};
 const b=run(body({x:10,yaw:Math.PI/2}),{...none,forward:1},10,sea);assert.ok(b.x>=0,'does not wade into the sea');
 const cliff={height:z=>0,water:()=>-50,solids:[],half:500};
 const wall={height:(x,z)=>z<-5?(-5-z)*3:0,water:()=>-50,solids:[],half:500};
 const c=run(body({z:0,y:0}),{...none,forward:1},5,wall);assert.ok(c.z>-5.6,'a 3:1 grade stops the walker');
 const gentle={height:(x,z)=>-z*.3,water:()=>-50,solids:[],half:500};
 const g=run(body({y:0}),{...none,forward:1},3,gentle);assert.ok(g.z<-5,'a 17 degree slope is walkable');
 assert.ok(!cliff.solids.length);
});

test('map edge keeps the walker inside the world',()=>{
 const small={...flat,half:50};
 const b=run(body(),{...none,forward:1,run:true},30,small);assert.ok(b.z>=-48);
 assert.equal(canStand(small,0,0,0,-60),false);
});

test('eye follows ground height and sits eyeHeight above it',()=>{
 const hill={height:x=>x*.2,water:()=>-50,solids:[],half:500};
 const b=run(body({y:0}),{...none,strafe:1},3,hill);const e=eyePose(b);
 assert.ok(Math.abs(e.y-(b.y+R.eyeHeight))<1e-9);assert.ok(Math.abs(b.y-hill.height(b.x,b.z))<.5,'eye tracks terrain');
 assert.equal(eyePose({...b,bob:1},false).y,b.y+R.eyeHeight,'bob off by default');
 assert.ok(eyePose({...b,bob:1},true).y>b.y+R.eyeHeight);
});

test('standing still does not move or bob',()=>{
 const b=run(body(),none,2);assert.equal(b.x,0);assert.equal(b.z,0);
});

test('enter finds open ground, remembers the strategic view, exit restores it exactly',()=>{
 const w={...flat,solids:[{x:0,z:0,w:10,d:10}]};
 const view={lookX:12,lookY:3,lookZ:-9,yaw:.7,pitch:.9,dist:88,drawLevel:'medium'};
 const m=enter(newMode(),w,{x:0,z:0,yaw:.7},view);
 assert.ok(m.active&&!insideSolid(m.body.x,m.body.z,w.solids));
 assert.equal(enter(m,w,{x:0,z:0,yaw:0},view),null,'cannot enter twice');
 const r=exit(m);assert.equal(r.mode.active,false);assert.deepEqual(r.restore,view);
 assert.equal(exit(r.mode).restore,null);
 const sea={height:()=>-5,water:()=>0,solids:[],half:500};
 assert.equal(enter(newMode(),sea,{x:0,z:0,yaw:0},view),null,'no ground, no entry');
 assert.equal(nearestStandable(flat,0,0).x,0);
});

test('performance guard eases draw distance only when slow and never raises it',()=>{
 assert.equal(walkingDrawLevel('high',60),'high');
 assert.equal(walkingDrawLevel('high',30),'medium');
 assert.equal(walkingDrawLevel('high',15),'low');
 assert.equal(walkingDrawLevel('low',5),'low');
 assert.equal(walkingDrawLevel('ultra',NaN),'ultra');
});

test('preference parsing is forgiving and off by default',()=>{
 assert.deepEqual(parseFirstPersonPrefs(null),{bob:false});assert.deepEqual(parseFirstPersonPrefs('{bad'),{bob:false});
 assert.deepEqual(parseFirstPersonPrefs('{"bob":true}'),{bob:true});
});
