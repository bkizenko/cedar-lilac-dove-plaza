import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {localCorridor,localCorridorDiagnostics,LOCAL_CORRIDOR_RULES as R} from '../src/game/localCorridor.ts';
let base;
function fixture(gap=1.2,radius=.55){if(!base){base=new Game();base.reset(345,2);base.enterIsland();base.world.heights.fill(4);base.vision.fill(2);}const g=base;g.state.units=[];g.state.buildings=[];const u=g.spawnUnit('worker',0,-3,0);u.r=radius;const a=g.makeBld('warehouse',0,0,0),b=g.makeBld('warehouse',0,0,0);a.d*=3;b.d*=3;a.x=-(a.w*.4+gap/2);b.x=b.w*.4+gap/2;g.state.buildings=[a,b];g.rebuildWalk();u.tx=4;u.tz=a.d*.4+radius+1.2;u.order='move';return {g,u,a,b};}
test('fine actor-sized path finds a real1.2m corridor and validates every whole segment',()=>{
 const {g,u}=fixture();assert.equal(g.walkable(u.x,u.z),false);assert.equal(g.canStep(u,u.x,u.z+.1),true);assert.equal(g.canStep(u,2,0),false);const route=localCorridor(g,u,u.tx,u.tz);assert.ok(route?.length);assert.ok(route.some(p=>Math.abs(p.x)<.05&&p.z>2));
 let actor={...u};for(const p of route){const n=Math.max(1,Math.ceil(Math.hypot(p.x-actor.x,p.z-actor.z)/.1)),start={...actor};for(let i=1;i<=n;i++){const x=start.x+(p.x-start.x)*i/n,z=start.z+(p.z-start.z)*i/n;assert.ok(g.canStep(actor,x,z));actor={...actor,x,z,y:g.travelHeight(x,z)};}}
 assert.ok(Math.hypot(actor.x-u.tx,actor.z-u.tz)<1e-8);assert.equal(u.x,0,'planning never teleports the actual actor');
});
test('a too-narrow passage and a larger body never inherit a smaller actor path',()=>{
 for(const [gap,radius]of[[1,.55],[1.2,.8]]){const {g,u}=fixture(gap,radius),before=localCorridorDiagnostics(g);assert.equal(localCorridor(g,u,u.tx,u.tz),null);const after=localCorridorDiagnostics(g);assert.ok(after.expandedNodes-before.expandedNodes<=R.maximumExpandedNodes);const calls=after.collisionQueries;for(let i=0;i<20;i++)assert.equal(localCorridor(g,u,u.tx,u.tz),null);assert.equal(localCorridorDiagnostics(g).collisionQueries,calls,'failed route cooldown performs no repeated collision search');}
});
test('search budgets and distance bound work; cache expires and navigation changes invalidate it',()=>{
 const {g,u}=fixture(1,.55),initial=localCorridorDiagnostics(g);assert.equal(localCorridor(g,u,u.x+R.maximumDestinationMetres+1,u.z),null);assert.equal(localCorridorDiagnostics(g).searches,initial.searches);assert.equal(localCorridor(g,u,u.tx,u.tz),null);const searched=localCorridorDiagnostics(g).searches;g.state.time+=R.retrySeconds+.01;localCorridor(g,u,u.tx,u.tz);assert.equal(localCorridorDiagnostics(g).searches,searched+1);g.rebuildWalk();localCorridor(g,u,u.tx,u.tz);assert.equal(localCorridorDiagnostics(g).searches,searched+2);u.haulage='canoe';const n=localCorridorDiagnostics(g).searches;assert.equal(localCorridor(g,u,u.tx,u.tz),null);assert.equal(localCorridorDiagnostics(g).searches,n);
});

test('integrated actual steering enters the coarse-blocked corridor and reaches the exact physical destination',()=>{
 const {g,u,a}=fixture();u.x=4;u.z=a.d*.4+u.r+1.2;u.y=g.height(u.x,u.z);u.tx=0;u.tz=-3;u.order='move';u.stationOnArrival=true;assert.equal(g.walkable(u.x,u.z),true);assert.equal(g.walkable(u.tx,u.tz),false);const target={x:u.tx,z:u.tz},before=localCorridorDiagnostics(g);let moved=0,preciseSeen=false;
 for(let i=0;i<500;i++){const old={...u},speed=g.travelSpeed(u);g.state.time+=.05;g.navBudget=4;const done=g.steer(u,.05);preciseSeen ||= g.paths.get(u.id)?.precise===true;const distance=Math.hypot(u.x-old.x,u.z-old.z);assert.ok(distance<=speed*.05+1e-8,`no teleport: ${distance} > ${speed*.05}`);if(distance>0){moved++;assert.ok(g.canStep(old,u.x,u.z),'actual step violates body clearance');}if(done)break;}
 assert.ok(Math.hypot(u.x-target.x,u.z-target.z)<.6,`actor stayed at ${u.x},${u.z}`);assert.ok(moved>20);assert.ok(preciseSeen,'actual steering never installed the fine route');assert.equal(localCorridorDiagnostics(g).searches-before.searches,1,'retained fine route must not replan each frame');
});

test('arbitrary offset corridor edges remain physically passable without lattice alignment',()=>{
 const {g,u,a,b}=fixture();a.x+=.173;b.x+=.173;u.x=4.137;u.z=a.d*.4+u.r+1.2;u.y=4;g.rebuildWalk();const target={x:.173,z:-2.731},route=localCorridor(g,u,target.x,target.z);assert.ok(route?.length,'clearance edge coordinates must recover a gap missed by a uniform grid');let actor={...u};for(const p of route){assert.ok(g.canStep(actor,(p.x+actor.x)/2,(p.z+actor.z)/2));assert.ok(g.canStep(actor,p.x,p.z));actor={...actor,...p,y:g.travelHeight(p.x,p.z)};}
});
test('multiple dense-camp actors share the existing per-step navigation budget',()=>{
 const {g,u,a}=fixture();u.x=4;u.z=a.d*.4+u.r+1.2;u.y=4;const crew=[u,g.spawnUnit('worker',4.1,u.z,0),g.spawnUnit('worker',4.2,u.z,0)];for(const p of crew){p.tx=0;p.tz=-3;p.order='move';p.stationOnArrival=true;p.stuckT=0;}const before=localCorridorDiagnostics(g).searches;g.navBudget=4;for(const p of crew)g.steer(p,.05);assert.equal(localCorridorDiagnostics(g).searches-before,2);assert.equal(g.navBudget,0);assert.equal(crew[2].stuckT,0,'budget deferral is not false stuck/unreachable');assert.equal(g.paths.has(crew[2].id),false);
});
