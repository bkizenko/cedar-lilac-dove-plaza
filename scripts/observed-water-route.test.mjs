import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {testAction} from '../src/game/testing.ts';
import {waterNavigation} from '../src/game/waterNavigation.ts';
import {rivalKnows} from '../src/game/rivalDevelopment.ts';
import {planObservedWaterRoute,teamKnowledge} from '../src/game/observedWaterRoute.ts';

// Claude request 1: bounded water routes from observation only.
function harbour(){const g=new Game();g.reset(0,undefined,{size:1040,layout:'continents'});g.state.conflict='quiet';g.enterIsland();g.testMode=true;
 assert.ok(testAction(g,'ferry'));g.revealMap=false;g.updateVision(0);const dock=g.state.buildings.find(b=>b.team===0&&b.type==='dock'&&g.finished(b));assert.ok(dock);
 const nav=waterNavigation(g,true);return{g,dock,nav};}
const idx=(g,nav,x,z)=>{const c=g.world.size/nav.width,h=g.world.size/2;return Math.floor((z+h)/c)*nav.width+Math.floor((x+h)/c);};
/** A grid that fails the test if the planner reads any unobserved cell. */
function guarded(g,nav,knows){const c=g.world.size/nav.width,h=g.world.size/2,reads={unknown:0};
 const grid=new Proxy(nav.grid,{get(t,p){if(typeof p==='string'&&/^\d+$/.test(p)){const i=+p,x=-h+(i%nav.width+.5)*c,z=-h+(Math.floor(i/nav.width)+.5)*c;if(!knows(x,z)){reads.unknown++;throw new Error(`read unobserved cell ${i}`);}return t[i];}const v=Reflect.get(t,p);return typeof v==='function'?v.bind(t):v;}});
 return{navigation:{grid,width:nav.width},reads};}
function knownWaterCells(g,nav,knows,from,minD,maxD){const out=[],c=g.world.size/nav.width,h=g.world.size/2;for(let i=0;i<nav.grid.length;i+=7){const x=-h+(i%nav.width+.5)*c,z=-h+(Math.floor(i/nav.width)+.5)*c,d=Math.hypot(x-from.x,z-from.z);if(d>=minD&&d<=maxD&&knows(x,z)&&nav.grid[i])out.push({x,z});}return out;}

test('a route to observed water reaches it over observed water only, never reading hidden cells',()=>{
 const {g,dock,nav}=harbour(),knows=teamKnowledge(g,0);const targets=knownWaterCells(g,nav,knows,dock,15,80);assert.ok(targets.length,'observed water near the dock');
 const target=targets[targets.length>>1],{navigation,reads}=guarded(g,nav,knows);
 const r=planObservedWaterRoute(g,0,dock.id,target,{navigation});assert.ok(r.waypoints,JSON.stringify(r));assert.equal(r.reachesTarget,true);assert.equal(reads.unknown,0);
 for(const p of r.waypoints){assert.ok(knows(p.x,p.z));assert.ok(nav.grid[idx(g,nav,p.x,p.z)]);}
 for(let k=1;k<r.waypoints.length;k++){const a=r.waypoints[k-1],b=r.waypoints[k],n=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));for(let s=0;s<=n;s++){const x=a.x+(b.x-a.x)*s/n,z=a.z+(b.z-a.z)*s/n;assert.ok(nav.grid[idx(g,nav,x,z)],'every segment stays on navigable water');}}
});

test('an unobserved target routes to the observed frontier, and hidden water cannot change the plan',()=>{
 const {g,dock,nav}=harbour(),knows=teamKnowledge(g,0);
 let target=null;for(let r=200;r<450&&!target;r+=25)for(let a=0;a<24;a++){const x=dock.x+Math.cos(a/24*6.283)*r,z=dock.z+Math.sin(a/24*6.283)*r;if(Math.abs(x)<500&&Math.abs(z)<500&&!knows(x,z)&&g.height(x,z)<g.waterAt(x,z)){target={x,z};break;}}
 assert.ok(target,'hidden water far from the dock');
 const a=planObservedWaterRoute(g,0,dock.id,target,{navigation:guarded(g,nav,knows).navigation});
 assert.ok('waypoints' in a||a.rejected==='unobserved',JSON.stringify(a));
 // Randomise every hidden cell: the plan is byte-identical.
 const scrambled=nav.grid.slice(),c=g.world.size/nav.width,h=g.world.size/2;for(let i=0;i<scrambled.length;i++){const x=-h+(i%nav.width+.5)*c,z=-h+(Math.floor(i/nav.width)+.5)*c;if(!knows(x,z))scrambled[i]=(i*2654435761>>>7)&1;}
 const b=planObservedWaterRoute(g,0,dock.id,target,{navigation:{grid:scrambled,width:nav.width}});assert.deepEqual(b,a);
 if(a.waypoints){assert.equal(a.endsAtFrontier,true);assert.equal(a.reachesTarget,false);const end=a.waypoints.at(-1),start=a.waypoints[0];assert.ok(Math.hypot(end.x-target.x,end.z-target.z)<Math.hypot(start.x-target.x,start.z-target.z));
  let adjacentUnknown=false;for(const [dx,dz] of [[c,0],[-c,0],[0,c],[0,-c],[c,c],[c,-c],[-c,c],[-c,-c]])if(!knows(end.x+dx,end.z+dz))adjacentUnknown=true;assert.ok(adjacentUnknown,'ends on the observation frontier');}
 console.log(JSON.stringify({unobservedTarget:target,plan:'waypoints' in a?{waypoints:a.waypoints.length,expandedNodes:a.expandedNodes}:a}));
});

test('budget, missing dock and observed-but-disconnected targets are explicit rejections',()=>{
 const {g,dock,nav}=harbour(),knows=teamKnowledge(g,0);const target=knownWaterCells(g,nav,knows,dock,8,80).at(-1);assert.ok(target);
 assert.deepEqual(planObservedWaterRoute(g,0,dock.id,target,{navigation:nav,maxNodes:3}).rejected,'budget');
 assert.equal(planObservedWaterRoute(g,0,987654,target,{navigation:nav}).rejected,'no-dock');
 assert.equal(planObservedWaterRoute(g,1,dock.id,target,{navigation:nav}).rejected,'no-dock','another team cannot sail from this dock');
 // Observed dry land with no observed water connection.
 const home=g.campOf(0);const land={x:home.x,z:home.z};assert.ok(knows(land.x,land.z));
 assert.equal(planObservedWaterRoute(g,0,dock.id,land,{navigation:nav}).rejected,'no-water-connection');
});

test('NPC knowledge mirrors rivalKnows away from the team’s own docks',()=>{
 const g=new Game();g.reset(0,undefined,{size:1040,layout:'continents'});g.enterIsland();
 for(const team of [1,2,3]){if(!g.state.units.some(u=>u.team===team))continue;const knows=teamKnowledge(g,team),docks=g.state.buildings.filter(b=>b.team===team&&b.type==='dock');let checked=0;
  for(let i=0;i<600;i++){const x=((i*37)%1000)-500,z=((i*91)%1000)-500;if(docks.some(d=>Math.hypot(d.x-x,d.z-z)<30))continue;assert.equal(knows(x,z),rivalKnows(g,team,x,z),`team ${team} at ${x},${z}`);checked++;}assert.ok(checked>500);}
});

test('a long route across fully observed water is found within the default node budget',()=>{
 const {g,dock,nav}=harbour();g.revealMap=true;g.updateVision(0);const knows=teamKnowledge(g,0);
 const labels=nav.labels,near=knownWaterCells(g,nav,knows,dock,0,18);assert.ok(near.length);const L=labels[idx(g,nav,near[0].x,near[0].z)];
 const far=knownWaterCells(g,nav,knows,dock,40,900).filter(p=>labels[idx(g,nav,p.x,p.z)]===L).sort((a,b)=>Math.hypot(b.x-dock.x,b.z-dock.z)-Math.hypot(a.x-dock.x,a.z-dock.z))[0];assert.ok(far,'connected water away from the dock');
 const t0=performance.now(),r=planObservedWaterRoute(g,0,dock.id,far,{navigation:nav}),ms=performance.now()-t0;
 assert.equal(r.reachesTarget,true,JSON.stringify(r));console.log(JSON.stringify({longRoute:{metres:Math.round(Math.hypot(far.x-dock.x,far.z-dock.z)),waypoints:r.waypoints.length,expandedNodes:r.expandedNodes,ms:+ms.toFixed(1)}}));
});
