import test from 'node:test';
import assert from 'node:assert/strict';
import {waterSurfaceAt,lakeContains} from '../src/game/localWater.ts';
import {prepareOwnedWaterWorld,ownedWaterIndex,indexedWaterAt,replaceLocalWaterBody} from '../src/game/indexedLocalWater.ts';
import {exactWaterMemoAt,exactWaterMemoReport,EXACT_WATER_MEMO_RULES} from '../src/game/exactWaterMemo.ts';
function world(){return {localWaterVersion:17,size:128,waterY:0,baseWaterY:0,waterBodies:[
 {kind:'lake',id:'lake',x:-18,z:0,rx:8,rz:6,surfaceY:2,shoreline:[{x:-26,z:-6},{x:-10,z:-6},{x:-10,z:6},{x:-26,z:6}]},
 {kind:'river',id:'main',width:5,surfaceVersion:2,startCap:'butt',endCap:'round',pts:[{x:-40,z:0,y:4},{x:0,z:0,y:3},{x:40,z:10,y:1}]},
 {kind:'river',id:'branch',width:4,surfaceVersion:2,pts:[{x:0,z:-40,y:6},{x:0,z:0,y:3}]}],waterfalls:[{x:15,z:4,upperY:5,lowerY:1,width:4,dx:1,dz:0}]};}
function raw(w,x,z){prepareOwnedWaterWorld(w);const {index}=ownedWaterIndex(w.waterBodies,w.size,w.waterfalls);return indexedWaterAt(index,x,z,lakeContains);}
function oracle(w,x,z){const y=raw(w,x,z);return Math.max(w.waterY,y===null?-Infinity:y+w.waterY-(w.baseWaterY??w.waterY));}
function parity(w,x,z){assert.equal(waterSurfaceAt(w,x,z),oracle(w,x,z),`parity at ${x},${z}`);}
test('exact repeated fractional samples match indexed lake/river edges, confluence and falling surfaces',()=>{
 const w=world();let count=0;for(const x of[-40,-26,-26+1e-9,-18,-10-1e-9,-10,0,15,40])for(const z of[-6,-6+1e-9,-2.5,-1e-9,0,2.5,4,6-1e-9,6])for(let repeat=0;repeat<3;repeat++){parity(w,x,z);count++;}
 for(let i=0;i<128;i++){const x=-43+i*.673123,z=Math.sin(i*.713)*8.1234567;parity(w,x,z);parity(w,x,z);}
 const report=exactWaterMemoReport(w);assert.ok(report.hits>=count/2);assert.ok(report.misses>0);
});
test('worlds are isolated even when exact coordinates coincide',()=>{const a=world(),b=world();b.waterBodies[0].surfaceY=11;parity(a,-18,0);parity(b,-18,0);assert.notEqual(waterSurfaceAt(a,-18,0),waterSurfaceAt(b,-18,0));assert.equal(exactWaterMemoReport(a).entries,1);});
test('body replacement invalidates cached null and finite results, input aliases remain immutable-owned',()=>{
 const w=world(),alias=w.waterBodies;parity(w,-18,0);alias[0].surfaceY=99;parity(w,-18,0);assert.equal(w.waterBodies[0].surfaceY,2);assert.throws(()=>{w.waterBodies[0].surfaceY=99;},TypeError);
 const before=waterSurfaceAt(w,-18,0);replaceLocalWaterBody(w,'lake',{...w.waterBodies[0],surfaceY:9});parity(w,-18,0);assert.notEqual(waterSurfaceAt(w,-18,0),before);assert.equal(exactWaterMemoReport(w).invalidations,1);
 parity(w,52.125,52.25);w.waterBodies=[...w.waterBodies,{kind:'lake',id:'new',x:52,z:52,rx:4,rz:4,surfaceY:12}];parity(w,52.125,52.25);assert.equal(waterSurfaceAt(w,52.125,52.25),12);
});
test('fall replacement and fall alias mutation preserve original ownership semantics',()=>{
 const w=world(),alias=w.waterfalls;parity(w,16,4);alias[0].upperY=99;parity(w,16,4);assert.equal(w.waterfalls[0].upperY,5);assert.throws(()=>{w.waterfalls[0].upperY=99;},TypeError);
 w.waterfalls=[{...w.waterfalls[0],upperY:12,lowerY:9}];parity(w,16,4);assert.equal(exactWaterMemoReport(w).invalidations,1);
});
test('current waterY/base offsets are recomputed on hits; direct raster writes remain irrelevant to V17',()=>{
 const w=world();parity(w,-18,0);const misses=exactWaterMemoReport(w).misses;
 w.waterY=8;parity(w,-18,0);w.baseWaterY=4;parity(w,-18,0);delete w.baseWaterY;parity(w,-18,0);w.waterHeights=new Float32Array(4).fill(88);parity(w,-18,0);w.waterHeights.fill(-100);parity(w,-18,0);assert.equal(exactWaterMemoReport(w).misses,misses);
});
test('size and replacement index identities invalidate exact entries',()=>{
 const w=world();parity(w,1.5,.5);w.size=64;parity(w,1.5,.5);assert.equal(exactWaterMemoReport(w).invalidations,1);
 const a=ownedWaterIndex(w.waterBodies,w.size,w.waterfalls).index,b={...a,cells:new Map(a.cells)};
 assert.equal(exactWaterMemoAt(w,b,1.5,.5,lakeContains),indexedWaterAt(b,1.5,.5,lakeContains));assert.equal(exactWaterMemoReport(w).invalidations,2);
});
test('bounds, nonfinite values and signed-zero match the original query without invalid retention',()=>{
 const w=world();for(const [x,z] of[[64,0],[-64,0],[64+1e-9,0],[0,-64-1e-9],[Infinity,0],[-Infinity,1],[NaN,0],[0,NaN],[0,0],[-0,-0]])parity(w,x,z);
 assert.ok(exactWaterMemoReport(w).bypasses>=6);assert.ok(exactWaterMemoReport(w).entries<=4);
});
test('legacy descriptor/raster mutations remain uncached and observable',()=>{
 const w={localWaterVersion:16,waterY:0,waterBodies:[{kind:'lake',id:'old',x:0,z:0,rx:4,rz:4,surfaceY:2}]};assert.equal(waterSurfaceAt(w,0,0),2);w.waterBodies[0].surfaceY=7;assert.equal(waterSurfaceAt(w,0,0),7);assert.equal(exactWaterMemoReport(w),null);
 const grid={localWaterVersion:16,waterY:0,size:10,waterHeights:new Float32Array(4).fill(2)};assert.equal(waterSurfaceAt(grid,0,0),2);grid.waterHeights.fill(7);assert.equal(waterSurfaceAt(grid,0,0),7);assert.equal(exactWaterMemoReport(grid),null);
});
test('cache storage stays bounded and capacity reset retains exact parity',()=>{
 const w=world(),cap=EXACT_WATER_MEMO_RULES.maximumEntriesPerWorld;for(let i=0;i<cap+100;i++){const x=-63+i*126/(cap+100),z=51.123;parity(w,x,z);}
 const report=exactWaterMemoReport(w);assert.ok(report.entries<=cap);assert.ok(report.columns<=cap);assert.equal(report.capacityResets,1);assert.equal(report.misses,cap+100);parity(w,-18,0);parity(w,-18,0);assert.ok(exactWaterMemoReport(w).hits>0);
});
