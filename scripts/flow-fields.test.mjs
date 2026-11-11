import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {findPath} from '../src/game/navigation.ts';
import {flowPath,flowFieldStats,resetFlowFields,setFlowFieldsEnabled,FLOW_FIELD_RULES} from '../src/game/flowFields.ts';
const on=(o)=>{setFlowFieldsEnabled(o,true);return o;};
import {mulberry32} from '../src/game/rng.ts';

const W=520;
function fixture(){const g=new Game();g.reset(4,18,{size:1040,layout:'pangaea'});g.enterIsland();g.rebuildWalk();return g;}
const cost=(path,start)=>{let c=0,p=start;for(const n of path){const dx=Math.abs(n%W-p%W),dz=Math.abs(((n/W)|0)-((p/W)|0));c+=dx&&dz?Math.SQRT2:1;p=n;}return c;};
function legal(grid,start,path,goal){let p=start;for(const n of path){const dx=n%W-p%W,dz=((n/W)|0)-((p/W)|0);if(Math.max(Math.abs(dx),Math.abs(dz))!==1||!grid[n])return false;if(dx&&dz&&(!grid[p+dx]||!grid[p+dz*W]))return false;p=n;}return p===goal;}
function walkableCells(grid,rng,count,near,radius){const out=[];let guard=0;while(out.length<count&&guard++<1e6){const x=near%W+Math.round((rng()*2-1)*radius),z=((near/W)|0)+Math.round((rng()*2-1)*radius);if(x<0||z<0||x>=W||z>=W)continue;const i=z*W+x;if(grid[i])out.push(i);}return out;}

test('flow-field paths are legal and exactly as short as A* for many starts to one busy goal',()=>{
  const g=fixture(),grid=g.walk,owner=on({}),rng=mulberry32(11);const home=g.campOf(0);
  const goal=Math.floor((home.z+520)/2)*W+Math.floor((home.x+520)/2);assert.ok(grid[goal]);
  const starts=walkableCells(grid,rng,150,goal,90);let compared=0;
  for(let i=0;i<FLOW_FIELD_RULES.hotRequests-1;i++)assert.equal(flowPath(owner,grid,W,starts[i],goal,1),null,'not hot yet');
  // Contract: the field finds every route the game's first A* (default budget) finds, at
  // equal cost; when it returns null the caller's existing findPath fallbacks still run.
  for(const s of starts){const first=findPath(grid,W,s,goal),full=findPath(grid,W,s,goal,400000),f=flowPath(owner,grid,W,s,goal,1);
    if(first)assert.ok(f,'field finds every first-attempt A* route');
    if(!f)continue;assert.ok(full);assert.ok(legal(grid,s,f,goal));
    assert.ok(Math.abs(cost(f,s)-cost(full,s))<1e-3,`${cost(f,s)} vs ${cost(full,s)}`);compared++;}
  assert.ok(compared>100,String(compared));assert.equal(flowFieldStats(owner).built,1);
});

test('fields are discarded on a navigation revision change and keyed by grid object',()=>{
  const g=fixture(),grid=g.walk,owner=on({}),home=g.campOf(0),goal=Math.floor((home.z+520)/2)*W+Math.floor((home.x+520)/2),[s]=walkableCells(grid,mulberry32(2),1,goal,30);
  for(let i=0;i<FLOW_FIELD_RULES.hotRequests;i++)flowPath(owner,grid,W,s,goal,7);assert.equal(flowFieldStats(owner).built,1);
  assert.equal(flowPath(owner,grid,W,s,goal,8),null,'new revision starts cold');
  const copy=grid.slice();assert.equal(flowPath(owner,copy,W,s,goal,8),null,'other grid starts cold');
  resetFlowFields(owner);assert.equal(flowFieldStats(owner).built,0);
});

test('a non-walkable start (inside a footprint edge) still gets an equally short route',()=>{
  const g=fixture(),grid=g.walk.slice(),owner=on({}),home=g.campOf(0),goal=Math.floor((home.z+520)/2)*W+Math.floor((home.x+520)/2);
  const [s]=walkableCells(grid,mulberry32(5),1,goal,40);grid[s]=0;
  for(let i=0;i<FLOW_FIELD_RULES.hotRequests;i++)flowPath(owner,grid,W,s,goal,1);
  const a=findPath(grid,W,s,goal,400000),f=flowPath(owner,grid,W,s,goal,1);
  if(a){assert.ok(f);assert.ok(Math.abs(cost(f,s)-cost(a,s))<1e-3);}else assert.equal(f,null);
});

test('one shared field is much cheaper than per-resident A* for 120 residents',()=>{
  const g=fixture(),grid=g.walk,home=g.campOf(0),goal=Math.floor((home.z+520)/2)*W+Math.floor((home.x+520)/2),starts=walkableCells(grid,mulberry32(8),120,goal,90);
  let t=performance.now();for(const s of starts)findPath(grid,W,s,goal);const astar=performance.now()-t;
  const owner=on({});t=performance.now();for(const s of starts){const p=flowPath(owner,grid,W,s,goal,1)??findPath(grid,W,s,goal);assert.ok(p===null||Array.isArray(p));}const flow=performance.now()-t;
  console.log(`120 routes: A* ${astar.toFixed(1)} ms, flow field ${flow.toFixed(1)} ms (build ${flowFieldStats(owner).buildMs.toFixed(1)} ms)`);
  assert.ok(flow<astar*.6,`${flow} vs ${astar}`);
});

test('switched off (the default) the field never answers, so routing is historic A*',()=>{
  const g=fixture(),grid=g.walk,owner={},home=g.campOf(0),goal=Math.floor((home.z+520)/2)*W+Math.floor((home.x+520)/2),[s]=walkableCells(grid,mulberry32(4),1,goal,30);
  for(let i=0;i<FLOW_FIELD_RULES.hotRequests*2;i++)assert.equal(flowPath(owner,grid,W,s,goal,1),null);assert.equal(flowFieldStats(owner).built,0);
  assert.equal(flowPath(g,grid,W,s,goal,1),null,'a Game is off unless enabled');
});

function crowd(on,goals,count=120){
  // the simulation draws on Math.random (weather, idling); seed it so both runs see the same world
  const random=Math.random,seeded=mulberry32(99);Math.random=seeded;try{
  const g=new Game();g.reset(4,18,{size:1040,layout:'pangaea'});g.enterIsland();g.testMode=true;Object.assign(g.state,{weather:'clear',weatherT:1e6,raidT:1e6,autoWorkEnabled:false});
  setFlowFieldsEnabled(g,on);const home=g.campOf(0),rng=mulberry32(5),units=[];
  while(units.length<count){const a=rng()*Math.PI*2,r=50+rng()*60,x=home.x+Math.cos(a)*r,z=home.z+Math.sin(a)*r;if(!g.walkable(x,z))continue;const u=g.spawnUnit('worker',x,z,0);if(u)units.push(u);}
  g.rebuildWalk();const targets=goals.map(([dx,dz])=>({x:home.x+dx,z:home.z+dz}));units.forEach((u,i)=>{const t=targets[i%targets.length];Object.assign(u,{order:'move',tx:t.x,tz:t.z,node:null});});
  const t0=performance.now();for(let s=0;s<120;s+=.2){g.state.paused=false;g.step(.2);for(const u of units){u.hunger=0;u.thirstSeconds=0;u.coldSeconds=0;}}
  const ms=performance.now()-t0,arrived=units.filter((u,i)=>{const t=targets[i%targets.length];return Math.hypot(u.x-t.x,u.z-t.z)<10;}).length;
  const meanDistance=units.reduce((a,u,i)=>{const t=targets[i%targets.length];return a+Math.hypot(u.x-t.x,u.z-t.z);},0)/units.length;
  return{ms,arrived,meanDistance,stats:flowFieldStats(g),errors:g.simulationErrors.length};
  }finally{Math.random=random;}
}
test('native terrain, 120 residents: with the switch on, busy destinations are served by shared fields; arrivals match A* and the simulation is not slower',()=>{
  for(const goals of [[[8,8]],[[8,8],[-30,20],[25,-35]]]){
    const astar=crowd(false,goals),flow=crowd(true,goals);
    console.log(`${goals.length} destination(s): A* ${astar.ms.toFixed(0)} ms, ${astar.arrived}/120 arrived (mean ${astar.meanDistance.toFixed(1)} m); flow ${flow.ms.toFixed(0)} ms, ${flow.arrived}/120 arrived (mean ${flow.meanDistance.toFixed(1)} m), ${JSON.stringify(flow.stats)}`);
    assert.equal(astar.errors,0);assert.equal(flow.errors,0);
    assert.ok(flow.stats.hits>300,'fields serve the crowd');assert.ok(flow.stats.built<=goals.length*12,'fields are shared, not rebuilt per resident');
    assert.ok(flow.arrived>=astar.arrived-3,`arrivals ${flow.arrived} vs A* ${astar.arrived}`);assert.ok(flow.meanDistance<=astar.meanDistance+1,`mean distance ${flow.meanDistance} vs ${astar.meanDistance}`);assert.ok(flow.arrived>=60,"most of the crowd reaches a 10 m circle");
    assert.ok(flow.ms<=astar.ms*1.1,`flow ${flow.ms} ms vs A* ${astar.ms} ms`);}
});
