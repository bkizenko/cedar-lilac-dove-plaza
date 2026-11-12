import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {deepWaterExtents,deepWaterAt,pickDeepWaterPoint,DEEP_WATER_RULES} from '../src/game/deepWater.ts';
import {mulberry32} from '../src/game/rng.ts';

const g=new Game();g.reset(2,18,{size:1040,layout:'archipelago'});
const centre=(e,i)=>({x:((i%e.n)+.5)*e.cellMetres-e.size/2,z:(Math.floor(i/e.n)+.5)*e.cellMetres-e.size/2});

test('deep cells match the game depth predicate exactly and form labelled regions with open sea at the edge',()=>{
  const t=performance.now(),e=deepWaterExtents(g),ms=performance.now()-t;
  assert.ok(ms<1500,`${ms}ms`);assert.ok(e.regions.some(r=>r.openSea),'open sea exists');
  for(let i=0;i<e.labels.length;i+=7){const {x,z}=centre(e,i),deep=g.waterAt(x,z)-g.height(x,z)>=DEEP_WATER_RULES.deepMetres;assert.equal(e.labels[i]>=0,deep,`cell ${i}`);}
  for(const r of e.regions){if(!r.openSea)continue;const touches=[r.minX,r.maxX].some(v=>Math.abs(v)>e.size/2-e.cellMetres)||[r.minZ,r.maxZ].some(v=>Math.abs(v)>e.size/2-e.cellMetres);assert.ok(touches,`region ${r.id}`);}
  assert.equal(e.regions.reduce((a,r)=>a+r.cells,0),Array.from(e.labels).filter(v=>v>=0).length);
});

test('offshore distance is zero on land and 1-Lipschitz across neighbouring cells',()=>{
  const e=deepWaterExtents(g),n=e.n;
  for(let i=0;i<n*n;i++){if(e.depth[i]<=0)assert.equal(e.offshore[i],0);
    const ix=i%n;if(ix<n-1&&Number.isFinite(e.offshore[i])&&Number.isFinite(e.offshore[i+1]))assert.ok(Math.abs(e.offshore[i]-e.offshore[i+1])<=e.cellMetres+1e-3);}
  const p=deepWaterAt(g,...Object.values(centre(e,Array.from(e.labels).findIndex(v=>v>=0))));assert.equal(p.deep,true);assert.ok(p.depthMetres>=2.5);
});

test('storm spawn points are deterministic, deep, open sea, offshore and near when asked',()=>{
  const a=pickDeepWaterPoint(g,mulberry32(9),{minOffshoreMetres:40}),b=pickDeepWaterPoint(g,mulberry32(9),{minOffshoreMetres:40});
  assert.ok(a);assert.deepEqual(a,b);const q=deepWaterAt(g,a.x,a.z);assert.ok(q.deep&&q.openSea&&q.offshoreMetres>=40);
  const near=pickDeepWaterPoint(g,mulberry32(3),{near:{x:a.x,z:a.z,radius:30}});assert.ok(near&&Math.hypot(near.x-a.x,near.z-a.z)<=30);
  assert.equal(pickDeepWaterPoint(g,mulberry32(1),{minOffshoreMetres:1e6}),null);
});

test('extents follow the water level (floods/droughts) and are cached otherwise',()=>{
  const e=deepWaterExtents(g);assert.equal(deepWaterExtents(g),e);
  const before=g.world.waterY;g.world.waterY=before+1.5;const f=deepWaterExtents(g);g.world.waterY=before;
  assert.notEqual(f,e);assert.ok(f.labels.filter(v=>v>=0).length>e.labels.filter(v=>v>=0).length);
  assert.notEqual(deepWaterExtents(g),f);
});
