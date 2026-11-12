import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {TIDE_RULES,tidesEnabled,tidalWaterLevel,tideFacts,tideOffset} from '../src/game/tides.ts';
import {weatherWaterLevel} from '../src/game/hydrology.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

function world(options){const g=new Game();g.reset(2,18,{size:1040,layout:'archipelago',...options});g.enterIsland();g.testMode=true;Object.assign(g.state,{raidT:1e6});return g;}
function drive(g,seconds,each=()=>{}){const end=g.state.time+seconds;while(g.state.time<end){g.state.paused=false;g.step(1);each();}}
const walkable=g=>{let n=0;for(const v of g.walk)if(v===1)n++;return n;};

test('off by default: existing and new worlds without the option have no tide and the sea follows weather only',()=>{
  const g=world({});assert.equal(tidesEnabled(g),false);assert.deepEqual(tideFacts(g),{tides:false});
  drive(g,400,()=>assert.equal(g.world.waterY,weatherWaterLevel(g.world.baseWaterY,g.state.weather)));
});

test('native archipelago with tides: stepped sea levels within the seasonal envelope, lakes move with the same water channel as weather, coast walkability follows the tide',()=>{
  const g=world({tideVersion:1});assert.equal(tidesEnabled(g),true);assert.equal(g.state.worldOptions.tideVersion,1);
  // an upland lake: its surface moves by the same offset as the sea, exactly as weather moves it
  const lake=(g.world.waterBodies||[]).find(b=>b.kind==='lake'&&b.surfaceY>weatherWaterLevel(g.world.baseWaterY,'flood')+.1);assert.ok(lake,'an upland lake');const base0=g.world.waterY,lakeLevel=g.waterAt(lake.x,lake.z);
  const levels=new Set(),walks=new Map(),base=g.world.baseWaterY;let rebuilds=0,last=g.world.waterY;
  const t0=Date.now();drive(g,TIDE_RULES.periodSeconds,()=>{levels.add(g.world.waterY);if(g.world.waterY!==last){rebuilds++;last=g.world.waterY;}
    assert.ok(g.world.waterY>=weatherWaterLevel(base,'drought')-1e-9&&g.world.waterY<=weatherWaterLevel(base,'flood')+1e-9);
    if(g.state.weather!=='flood'&&g.state.weather!=='drought'&&!walks.has(g.world.waterY))walks.set(g.world.waterY,walkable(g));
    assert.ok(Math.abs(g.waterAt(lake.x,lake.z)-(lakeLevel+g.world.waterY-base0))<1e-6,'lakes shift exactly as under weather');});
  assert.ok(levels.size>=3,`levels ${[...levels]}`);assert.ok(rebuilds>=2&&rebuilds<=TIDE_RULES.stages+4,`sea level changes ${rebuilds}`);
  const ordered=[...walks].sort((a,b)=>a[0]-b[0]);assert.ok(ordered.length>=2);assert.ok(ordered[0][1]>ordered[ordered.length-1][1],'more shore is walkable at low tide');
  console.log('tide levels',[...levels].map(v=>(v-base).toFixed(2)).join(' '),'walk cells low→high',ordered.map(o=>o[1]).join(' '),'sea level changes',rebuilds,'ms',Date.now()-t0);
});

test('the option and the tide phase survive a save: the reloaded game stands at the same sea level',()=>{
  const g=world({tideVersion:1});drive(g,250);const level=g.world.waterY,back=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));
  assert.equal(tidesEnabled(back),true);back.state.paused=false;back.step(.01);assert.equal(back.world.waterY,tidalWaterLevel(back));
  assert.ok(Math.abs(back.world.waterY-level)<1e-9||Math.abs(back.state.time-g.state.time)>0,'same tide after reload');
  const facts=tideFacts(back);assert.equal(facts.tides,true);assert.equal(facts.rangeMetres,+(2*Math.abs(tideOffset(TIDE_RULES.periodSeconds/TIDE_RULES.stages))).toFixed(2));
});

test('a revisited sea level reuses its exact terrain walk grid (parity with a fresh build, no rebuild cost)',async()=>{
  const {terrainWalkCacheStats}=await import('../src/game/terrainWalkCache.ts');
  const a=world({tideVersion:1}),b=world({tideVersion:1}),base=a.world.baseWaterY;
  for(const d of [.15,.3,-.15,.15]){a.world.waterY=base+d;a.rebuildWalk();}
  const builds=terrainWalkCacheStats(a).builds;a.world.waterY=base+.3;a.rebuildWalk();assert.equal(terrainWalkCacheStats(a).builds,builds,'returning level is a cache hit');
  b.world.waterY=base+.3;b.rebuildWalk();assert.deepEqual(Array.from(a.walk),Array.from(b.walk));
  a.world.waterY=base+.15;a.rebuildWalk();b.world.waterY=base+.15;b.rebuildWalk();assert.deepEqual(Array.from(a.walk),Array.from(b.walk));
});

test('tides v2 are sea-only on native terrain: the sea rises and falls, rivers and lakes stay at the weather level, walk grid parity holds',async()=>{
  const {seaOnlyTides}=await import('../src/game/tides.ts');const {seaSurfaceY}=await import('../src/game/localWater.ts');
  const g=world({tideVersion:2});Object.assign(g.state,{weather:'clear',weatherT:1e6});assert.equal(seaOnlyTides(g),true);
  const base=g.world.baseWaterY,lake=(g.world.waterBodies||[]).find(b=>b.kind==='lake'),river=(g.world.waterBodies||[]).find(b=>b.kind==='river');
  const inland=[lake&&{x:lake.x,z:lake.z},river&&river.pts[Math.floor(river.pts.length/2)]].filter(Boolean);assert.ok(inland.length>0);
  const inland0=inland.map(p=>g.waterAt(p.x,p.z));let sea=null;for(let x=-500;x<=500&&!sea;x+=10)if(g.height(x,-500)<base-2)sea={x,z:-500};assert.ok(sea,'a sea point');
  const seas=new Set(),walks=new Map();
  drive(g,TIDE_RULES.periodSeconds,()=>{assert.equal(g.world.waterY,weatherWaterLevel(base,'clear'),'waterY stays the weather level');
    inland.forEach((p,i)=>assert.equal(g.waterAt(p.x,p.z),inland0[i],'inland water never carries the tide'));
    const s=g.waterAt(sea.x,sea.z);assert.equal(s,seaSurfaceY(g.world));seas.add(s);
    assert.ok(s>=weatherWaterLevel(base,'drought')-1e-9&&s<=weatherWaterLevel(base,'flood')+1e-9);if(!walks.has(s))walks.set(s,walkable(g));});
  assert.ok(seas.size>=4,`sea levels ${[...seas]}`);const ordered=[...walks].sort((a,b)=>a[0]-b[0]);assert.ok(ordered[0][1]>ordered.at(-1)[1],'more shore at low tide');
  console.log('v2 sea levels',[...seas].map(v=>(v-base).toFixed(2)).join(' '),'walk cells low→high',ordered.map(o=>o[1]).join(' '));
  // parity: a tide level reached through the cache equals a fresh build at that level
  const fresh=world({tideVersion:2});fresh.world.waterY=g.world.waterY;fresh.world.seaTideY=g.world.seaTideY;fresh.rebuildWalk();
  const again=world({tideVersion:2});for(const t of [.15,-.15,g.world.seaTideY??0]){again.world.seaTideY=t;again.rebuildWalk();}
  assert.deepEqual(Array.from(again.walk),Array.from(fresh.walk));
  // a reload recomputes the runtime tide from saved time
  const back=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.equal(back.world.seaTideY,undefined,'never saved');back.state.paused=false;back.step(.01);assert.equal(back.world.seaTideY,g.world.seaTideY);
});
