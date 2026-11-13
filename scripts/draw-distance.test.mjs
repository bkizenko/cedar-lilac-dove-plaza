import test from 'node:test';import assert from 'node:assert/strict';
import {DRAW_DISTANCE_LEVELS,DRAW_DISTANCE_RULES,ADAPTIVE_RULES,DrawDistanceGovernor,drawBands,drawDistanceBudget,easeDrawDistance,isDrawDistance,loadDrawDistance,rememberDrawDistance} from '../src/game/drawDistance.ts';

test('levels are monotonic: each step draws farther, clearer and with more filler; Low is the original behaviour',()=>{
 const L=DRAW_DISTANCE_RULES.levels;
 assert.equal(L.low.cameraFar,860);assert.equal(L.low.fogScale,1);assert.equal(L.low.treeFar,700);
 assert.equal(L.low.fillerFar,0);assert.equal(L.low.fillerMaxTrees,0);assert.equal(L.low.fillerMaxBlobs,0);assert.equal(L.low.peopleFar,Infinity);
 for(let i=1;i<DRAW_DISTANCE_LEVELS.length;i++){
  const a=L[DRAW_DISTANCE_LEVELS[i-1]],b=L[DRAW_DISTANCE_LEVELS[i]];
  for(const k of ['cameraFar','treeFar','fillerFar','fillerDetail','fillerMaxTrees','fillerMaxBlobs','fadeMetres'])assert.ok(b[k]>a[k],`${DRAW_DISTANCE_LEVELS[i]}.${k}`);
  assert.ok(b.fogScale<a.fogScale,'air gets clearer');
 }
 assert.equal(DRAW_DISTANCE_RULES.defaultLevel,'medium');
});

test('haze still hides the far plane: fog at the camera far plane is at least 95% for every level on a clear day',()=>{
 const clearDensity=.0015;// painterly clear-day density; weather only raises it
 for(const level of DRAW_DISTANCE_LEVELS){
  const b=drawBands(level,1040),d=clearDensity*b.fogScale,fog=1-Math.exp(-d*d*b.cameraFar*b.cameraFar);
  if(level==='low')continue;// the original haze is unchanged (81% at the old far plane)
  assert.ok(fog>=.95,`${level} fog at far plane ${fog.toFixed(3)}`);
 }
});

test('levels above Low reach the world edge on small worlds and never exceed their own far plane',()=>{
 const small=drawBands('ultra',600),big=drawBands('ultra',8000),diag=Math.hypot(600,600)*1.04;
 assert.ok(Math.abs(small.cameraFar-Math.max(860,diag))<1e-6);assert.equal(big.cameraFar,DRAW_DISTANCE_RULES.levels.ultra.cameraFar);
 assert.ok(drawBands('medium',1040).cameraFar>=Math.hypot(1040,1040)*.9,'Medium sees the far corner of the default world');
 assert.equal(drawBands('low',5000).cameraFar,860);
 for(const level of DRAW_DISTANCE_LEVELS)for(const size of [400,1040,2400]){const b=drawBands(level,size);assert.ok(b.treeFar>=700&&b.cameraFar>=860&&b.fillerFar>=0);}
});

test('budgets per level: worst-case extra triangles stay inside the level budget and grow with the level',()=>{
 let previous=-1;
 for(const level of DRAW_DISTANCE_LEVELS){
  const cost=drawDistanceBudget(level),budget=DRAW_DISTANCE_RULES.budgets[level];
  assert.ok(cost.extraTriangles<=budget.extraTriangles,`${level} ${cost.extraTriangles}>${budget.extraTriangles}`);
  assert.ok(cost.extraDrawCalls<=budget.extraDrawCalls);assert.ok(cost.extraTriangles>=previous);previous=cost.extraTriangles;
 }
 assert.equal(drawDistanceBudget('low').extraTriangles,0);
 // Medium, on top of the measured Low frame (about 215k triangles: 131k terrain), stays under the 600k High-profile ceiling of docs/parallel/handoffs/claude-8gb-budget.md
 assert.ok(215000+drawDistanceBudget('medium').extraTriangles<=600000);
});

test('setting persists, rejects junk, and survives unavailable storage',()=>{
 const old=globalThis.localStorage,values=new Map();
 try{
  globalThis.localStorage={getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,v)};
  assert.equal(loadDrawDistance(),'medium');
  for(const level of DRAW_DISTANCE_LEVELS){rememberDrawDistance(level);assert.equal(loadDrawDistance(),level);}
  values.set(DRAW_DISTANCE_RULES.key,'infinite');assert.equal(loadDrawDistance(),'medium');
  rememberDrawDistance('bogus');assert.equal(values.get(DRAW_DISTANCE_RULES.key),'infinite','invalid values are not stored');
  globalThis.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('full');}};
  assert.equal(loadDrawDistance(),'medium');assert.doesNotThrow(()=>rememberDrawDistance('high'));
 }finally{globalThis.localStorage=old;}
 assert.ok(isDrawDistance('ultra')&&!isDrawDistance('med')&&!isDrawDistance(undefined));
});

test('adaptive reduction: sustained over-budget frames ease one level at a time, hitches and fast frames do not',()=>{
 const g=new DrawDistanceGovernor('ultra'),run=(ms,seconds)=>{let eased=null;for(let t=0;t<seconds*1000;t+=ms){const r=g.observe(ms);if(r)eased=r;}return eased;};
 assert.equal(run(16,30),null,'60 fps never eases');assert.equal(g.level,'ultra');
 assert.equal(g.observe(900),null,'a hitch is not load');assert.equal(g.observe(NaN),null);
 for(let i=0;i<200;i++)g.observe(1000);assert.equal(g.level,'ultra','hidden-tab gaps are ignored');
 assert.equal(run(40,ADAPTIVE_RULES.overSeconds+1),'high','slow frames ease Ultra to High');assert.ok(g.eased&&g.chosen==='ultra');
 assert.equal(run(40,ADAPTIVE_RULES.settleSeconds-1),null,'new level settles before it is judged again');
 assert.equal(run(40,ADAPTIVE_RULES.overSeconds+ADAPTIVE_RULES.settleSeconds),'medium');
 run(40,60);assert.equal(g.level,'low','Low is the floor');run(40,60);assert.equal(g.level,'low');
 assert.equal(run(10,60),null,'it never raises by itself');
 g.choose('high');assert.equal(g.level,'high');assert.equal(g.chosen,'high');assert.ok(!g.eased,'choosing a level resets the governor');
 assert.equal(easeDrawDistance('low'),'low');assert.equal(easeDrawDistance('medium'),'low');
});
