import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {serializeStoredSave,parseStoredSave} from '../src/game/storageCodec.ts';
import {walkCells,fowCells} from '../src/game/gridScale.ts';import {WORLD_SIZES} from '../src/game/worldOptions.ts';
// Measures generation, nav-grid build, per-step cost, heap and save size for each larger size. Numbers are printed as BUDGET lines
// (copy them into docs/BIGGER_MAPS_BUDGETS.md). Assertions are loose ceilings, not targets.
const SIZES=(process.env.BIGMAP_SIZES||'2940,4160').split(',').map(Number);
const mb=n=>+(n/1048576).toFixed(1);
test('grid sizes are pure functions of world size and unchanged through 2080',()=>{
 for(const s of [1040,1560,2080]){assert.equal(walkCells(s),520);assert.equal(fowCells(s),192);}
 assert.equal(walkCells(2940),735);assert.equal(fowCells(2940),271);assert.equal(walkCells(4160),1040);assert.equal(fowCells(4160),384);
 assert.ok(WORLD_SIZES.includes(2940)&&WORLD_SIZES.includes(4160));
});
for(const size of SIZES)test(`size ${size}: generates, runs, saves and reloads within budget`,{timeout:900000},()=>{
 globalThis.gc?.();const heap0=process.memoryUsage().heapUsed;
 const g=new Game();let t=performance.now();g.reset(777,22,{size,layout:'pangaea'});const genMs=performance.now()-t;
 t=performance.now();g.enterIsland();const enterMs=performance.now()-t;
 t=performance.now();g.rebuildWalk();const walkMs=performance.now()-t;
 const w=walkCells(size),f=fowCells(size);
 assert.equal(g.walk.length,w*w);assert.equal(g.vision.length,f*f);assert.equal(g.territory.length,f*f);assert.equal(g.world.size,size);
 assert.ok(g.exploredAt(g.campOf(0).x,g.campOf(0).z),'start camp is revealed on the resized fog grid');
 assert.ok(g.walkable(g.campOf(0).x+4,g.campOf(0).z+4)||g.walkable(g.campOf(0).x,g.campOf(0).z-8),'ground near the camp is walkable on the resized nav grid');
 for(let i=0;i<20;i++)g.step(.25);
 const times=[];for(let i=0;i<120;i++){const s=performance.now();g.step(.25);times.push(performance.now()-s);}
 times.sort((a,b)=>a-b);const med=times[60],p95=times[Math.floor(times.length*.95)];
 globalThis.gc?.();const heapMb=mb(process.memoryUsage().heapUsed-heap0),rssMb=mb(process.memoryUsage().rss);
 t=performance.now();const save=encodeGame(g);const encMs=performance.now()-t;
 t=performance.now();const stored=serializeStoredSave(save);const packMs=performance.now()-t;
 t=performance.now();const back=decodeGame(parseStoredSave(stored));const loadMs=performance.now()-t;
 assert.equal(back.vision.length,f*f);assert.deepEqual([...back.vision.slice(0,2000)],[...g.vision.slice(0,2000)]);assert.equal(back.world.size,size);
 console.log('BUDGET',JSON.stringify({size,genMs:Math.round(genMs),enterIslandMs:Math.round(enterMs),rebuildWalkMs:Math.round(walkMs),stepMedianMs:+med.toFixed(2),stepP95Ms:+p95.toFixed(2),heapDeltaMb:heapMb,rssMb,saveStoredChars:stored.length,saveStoredMb:mb(stored.length),encodeMs:Math.round(encMs),packMs:Math.round(packMs),decodeMs:Math.round(loadMs),gcExposed:!!globalThis.gc}));
 assert.ok(med<250,`median step ${med} ms`);
});
