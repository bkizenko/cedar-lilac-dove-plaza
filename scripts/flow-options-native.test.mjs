import test from 'node:test';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {Game} from '../src/game/sim.ts';import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {flowFieldsEnabled,flowFieldStats,flowPath,FLOW_FIELD_RULES} from '../src/game/flowFields.ts';
import {mulberry32} from '../src/game/rng.ts';
const hash=g=>createHash('sha256').update(g.world.heights).digest('hex');
const clone=v=>JSON.parse(JSON.stringify(v));

test('persisted flow option configures native100 routing and reset/load custody without changing terrain',()=>{
 const originalRandom=Math.random;Math.random=mulberry32(410);const start=performance.now();
 try{
  const g=new Game();assert.equal(flowFieldsEnabled(g),false,'constructor default remains historic A*');
  g.reset(4,14,{size:1040,layout:'pangaea',flowFieldVersion:1});g.enterIsland();assert.equal(flowFieldsEnabled(g),true,'normal reset uses the normalized persisted option');
  const terrain=hash(g),home=g.campOf(0),originalResident=g.state.units.find(u=>u.team===0&&u.type==='worker'&&u.hp>0);let goal;
  for(let distance=0;distance<=12&&!goal;distance+=2)for(const [dx,dz] of [[0,0],[1,0],[-1,0],[0,1],[0,-1]]){const point={x:home.x+dx*distance,z:home.z+dz*distance};if(g.walkable(point.x,point.z)&&g.workBoard.connected(g,originalResident.x,originalResident.z,point.x,point.z)){goal=point;break;}}
  assert.ok(goal,'real nomadic camp cache has a dry connected approach');
  // Select naturally connected starts whose straight native movement crosses a
  // river/cliff. No authored obstruction or terrain alteration is needed.
  const blocked=[],clear=[],occupied=g.state.units.filter(u=>u.team===0&&u.hp>0).map(u=>({x:u.x,z:u.z}));
  for(let radius=20;radius<=160&&blocked.length<100;radius+=5)for(let i=0;i<64;i++){
   const x=home.x+Math.cos(i*Math.PI/32)*radius,z=home.z+Math.sin(i*Math.PI/32)*radius;
   if(!g.walkable(x,z)||occupied.some(p=>Math.hypot(p.x-x,p.z-z)<2)||!g.workBoard.connected(g,x,z,goal.x,goal.z)||g.state.buildings.some(b=>g.solidBuilding(b)&&Math.abs(x-b.x)<b.w*.4+1.3&&Math.abs(z-b.z)<b.d*.4+1.3))continue;
   const probe={...originalResident,x,z,y:g.height(x,z)},distance=Math.hypot(goal.x-x,goal.z-z),samples=Math.ceil(distance);let direct=true;
   for(let j=1;j<=samples;j++)if(!g.canStep(probe,x+(goal.x-x)*j/samples,z+(goal.z-z)*j/samples)){direct=false;break;}
   (direct?clear:blocked).push({x,z});occupied.push({x,z});
  }
  assert.ok(blocked.length>=16,'real terrain supplies shared-goal routes needing native planning');
  // Declared100-resident scale fixture. Additional adults and common-cache
  // orders are authored before the first tick, on validated native positions.
  for(const point of [...blocked,...clear]){if(g.state.units.filter(u=>u.team===0&&u.hp>0).length>=100)break;const u=g.spawnUnit('worker',point.x,point.z,0);assert.ok(g.workBoard.connected(g,u.x,u.z,goal.x,goal.z),'authored body retains actual native connectivity');}
  const residents=g.state.units.filter(u=>u.team===0&&u.hp>0);assert.equal(residents.length,100);
  // Authored initial common-destination move orders intentionally avoid the UI's
  // formation offsets, which are different goals. Native stepping/steering is unchanged.
  for(const u of residents)Object.assign(u,{order:'move',tx:goal.x,tz:goal.z,node:null,target:null});g.state.nightWork=true;
  const before=new Map(residents.map(u=>[u.id,{x:u.x,z:u.z}]));
  for(let i=0;i<120;i++)g.step(1/30);
  const stats=flowFieldStats(g);assert.ok(stats.built>0,'ordinary Game.step/steer builds a genuinely hot shared destination');assert.ok(stats.hits>0,'actual actors consume the shared field');
  assert.ok(stats.hits>stats.built,'actual routes reuse fields after their initial build');
  assert.ok(residents.some(u=>Math.hypot(u.x-before.get(u.id).x,u.z-before.get(u.id).z)>.2),'original bodies actually move');assert.equal(g.state.units.filter(u=>u.team===0&&u.hp>0).length,100);assert.deepEqual(g.simulationErrors,[]);assert.equal(hash(g),terrain);
  const raw=encodeGame(g);validateGameSave(raw);assert.equal(raw.state.worldOptions.flowFieldVersion,1);
  const restored=decodeGame(clone(raw));assert.equal(flowFieldsEnabled(restored),true,'normal decoder configures the new owner');assert.equal(flowFieldStats(restored).built,0,'cache arrays are runtime-only, never serialized');assert.equal(hash(restored),terrain);
  const old=clone(raw);delete old.state.worldOptions.flowFieldVersion;const legacy=decodeGame(old);assert.equal(flowFieldsEnabled(legacy),false,'missing old-save flag remains historic A*');
  g.configureFlowFields();assert.equal(flowFieldsEnabled(g),true);assert.equal(flowFieldStats(g).built,0,'same-owner reconfiguration starts cold even when remaining enabled');
  g.reset(4,14,{size:1040,layout:'pangaea'});assert.equal(flowFieldsEnabled(g),true,'main policy: every new game starts with shared routes on; only the persisted flag survives load');assert.equal(flowFieldStats(g).built,0);assert.equal(hash(g),terrain);
  assert.equal(flowFieldsEnabled(restored),true,'another loaded owner retains its own switch');
  const grid=new Uint8Array(9).fill(1);for(let i=0;i<FLOW_FIELD_RULES.hotRequests+2;i++)assert.equal(flowPath(legacy,grid,3,0,8,0),null,'disabled owner never starts building');
  console.log(JSON.stringify({scope:'authored100-resident native terrain; actual Game.step/steer cache use, not p95/FPS qualification',residents:100,steps:120,simulationSeconds:raw.state.time,stats,terrain,wallMilliseconds:performance.now()-start}));
 }finally{Math.random=originalRandom;}
});
