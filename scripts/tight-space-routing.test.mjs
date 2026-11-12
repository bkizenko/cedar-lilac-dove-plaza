import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {routeStallSeconds,clearRouteProgress,preciseSegmentClear,ROUTE_PROGRESS_RULES as R} from '../src/game/routeProgress.ts';
let base;
// Two long solid stores leave a gap that a 0.9 m-radius body can physically
// pass (1.9 m > 1.8 m) while every coarse 2 m navigation cell in it is blocked.
function fixture({gap=1.9,radius=.9,far=3}={}){
 if(!base){base=new Game();base.reset(345,2);base.enterIsland();base.world.heights.fill(4);base.vision.fill(2);}
 const g=base;g.state.units=[];g.state.buildings=[];g.paths.clear();g.state.time=0;
 const u=g.spawnUnit('worker',0,-6,0);u.r=radius;
 const a=g.makeBld('warehouse',0,0,0),b=g.makeBld('warehouse',0,0,0);a.d*=3;b.d*=3;
 a.x=-(a.w*.4+gap/2);b.x=b.w*.4+gap/2;g.state.buildings=[a,b];g.rebuildWalk();
 u.x=0;u.z=-(a.d*.4+far);u.y=4;u.tx=0;u.tz=a.d*.4+far;u.order='move';u.stationOnArrival=true;u.stuckT=0;clearRouteProgress(u);
 return {g,u,a,b};
}
function drive(g,u,frames){
 const trace={done:false,frames:0,maxStuck:0,precise:false,stalled:false};
 for(let i=0;i<frames;i++){
  const old={...u},speed=g.travelSpeed(u);g.state.time+=.05;g.navBudget=4;const done=g.steer(u,.05);
  const r=g.peekMovementRoute(u.id);trace.precise||=g.paths.get(u.id)?.precise===true;trace.stalled||=g.paths.get(u.id)?.stalled===true;
  const moved=Math.hypot(u.x-old.x,u.z-old.z);
  assert.ok(moved<=speed*.05+1e-8,`no teleport: ${moved}`);
  if(moved>0)assert.ok(g.canStep(old,u.x,u.z),`step at frame ${i} violates body clearance`);
  trace.maxStuck=Math.max(trace.maxStuck,u.stuckT);trace.frames=i;void r;
  if(done){trace.done=true;break;}
 }
 return trace;
}
for(const far of [3,10])test(`a body-sized gap with coarse-blocked cells is followed without a recovery tug-of-war (${far} m approach)`,()=>{
 const {g,u,a}=fixture({far});
 assert.equal(g.walkable(0,0),false,'fixture: the gap is closed on the coarse grid');
 assert.ok(preciseSegmentClear(g,u,u.tx,u.tz),'fixture: the gap is physically clear for this body');
 const t=drive(g,u,800);
 assert.ok(t.done,`actor stalled at ${u.x.toFixed(2)},${u.z.toFixed(2)}`);
 assert.ok(t.precise,'a short fine-validated straight route is retained as precise');
 assert.ok(Math.hypot(u.x-u.tx,u.z-u.tz)<.6);
 assert.ok(u.z>a.d*.4,'went through the gap rather than around');
});
test('a too-narrow gap never shrinks collision: the larger body detours around',()=>{
 const {g,u,a}=fixture({gap:1.7});
 assert.equal(preciseSegmentClear(g,u,u.tx,u.tz),false);
 const t=drive(g,u,3000);
 assert.ok(t.done,`actor stalled at ${u.x.toFixed(2)},${u.z.toFixed(2)}`);
 assert.ok(Math.hypot(u.x-u.tx,u.z-u.tz)<.6);void a;
});
test('a long move whose coarse line is clear but enters blocked cells stalls, escalates and still arrives',()=>{
 // Beyond the precise-direct bound the straight route is only coarse-checked.
 const {g,u}=fixture({far:40});
 const t=drive(g,u,6000);assert.ok(t.stalled,"the watchdog detected the oscillation");
 assert.ok(t.done,`actor looped at ${u.x.toFixed(2)},${u.z.toFixed(2)} stuck=${u.stuckT}`);
 assert.ok(Math.hypot(u.x-u.tx,u.z-u.tz)<.6);
});
test('stall watchdog: motion without progress accumulates; replans of the same target keep the clock',()=>{
 const u={x:0,z:0},route={tx:10,tz:0,points:[{x:10,z:0}]};
 assert.equal(routeStallSeconds(u,route,0),0);
 for(let t=.1;t<=4;t+=.1){u.z=Math.sin(t*9)*.4;routeStallSeconds(u,route,t);} // sidestep oscillation
 assert.ok(routeStallSeconds(u,route,4)>=R.stallSeconds);
 const replanned={tx:10.5,tz:0,points:[{x:5,z:3},{x:10,z:0}]};
 assert.ok(routeStallSeconds(u,replanned,4.1)>=R.stallSeconds,'an identical-destination replan cannot reset the stall');
 u.x=1;assert.equal(routeStallSeconds(u,replanned,4.2),0,'real progress clears it');
 replanned.points.shift();assert.equal(routeStallSeconds(u,replanned,9),0,'reaching a waypoint is progress');
 assert.equal(routeStallSeconds(u,{tx:-20,tz:0,points:[{x:-20,z:0}]},20),0,'a new destination starts fresh');
 clearRouteProgress(u);assert.equal(routeStallSeconds(u,route,30),0);
});
test('normal open-ground travel never reports a stall',()=>{
 const {g,u}=fixture({gap:30});u.tz=40;
 const t=drive(g,u,4000);assert.ok(t.done);assert.equal(t.maxStuck,0);assert.equal(t.stalled,false);
});
