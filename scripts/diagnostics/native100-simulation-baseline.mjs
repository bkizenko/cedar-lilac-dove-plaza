// Native100 CPU diagnostic. Local export remains read-only; never commit the optional private fixture.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
const [source,input,out,fixtureOut]=process.argv.slice(2);assert.ok(source&&input&&out,'Pass source directory, local village export and aggregate output report; optional fourth argument writes a PRIVATE scale fixture.');
assert.notEqual(resolve(input),resolve(out),'Do not overwrite the original village.');if(fixtureOut){assert.notEqual(resolve(input),resolve(fixtureOut));assert.notEqual(resolve(out),resolve(fixtureOut));}
const api=await import(pathToFileURL(resolve(source,'src/game/persistence.ts')).href);
const {SimulationPhaseProfile}=await import(pathToFileURL(resolve(source,'src/game/simulationPhaseProfile.ts')).href);
const hash=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const originalBytes=readFileSync(input),originalHash=hash(originalBytes),data=JSON.parse(originalBytes),oldRandom=Math.random;
let seed=0x1002026,draws=0;Math.random=()=>{draws++;seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const runs=[];
try{
 const g=api.decodeGame(data),before=g.popNow(0),terrain=hash(Buffer.from(g.world.heights.buffer)),home=g.campOf(0),founder=g.state.units.find(u=>u.team===0&&u.hp>0);assert.ok(before>0&&before<=100);
 const positions=[];
 for(let radius=2;radius<=80&&positions.length<100-before;radius+=2)for(let i=0;i<48&&positions.length<100-before;i++){
  const x=home.x+Math.cos(i*Math.PI/24)*radius,z=home.z+Math.sin(i*Math.PI/24)*radius;
  if(!g.walkable(x,z)||!g.workBoard.connected(g,founder.x,founder.z,x,z)||g.state.units.some(u=>u.hp>0&&Math.hypot(x-u.x,z-u.z)<1.5)||positions.some(p=>Math.hypot(x-p.x,z-p.z)<1.5))continue;
  positions.push({x,z});
 }
 assert.equal(positions.length,100-before);
 for(const p of positions)g.spawnUnit('worker',p.x,p.z,0);
 assert.equal(g.popNow(0),100);g.quality='low';g.state.speed=1;g.state.paused=true;
 const checkpoint=api.gameSnapshot(g);api.validateGameSave(checkpoint);if(fixtureOut)writeFileSync(resolve(fixtureOut),JSON.stringify(checkpoint));
 const runSeed=seed,warmSteps=20,measuredSteps=180;
 for(const instrumented of [false,true]){
  seed=runSeed;draws=0;const h=api.decodeGame(structuredClone(checkpoint));h.quality='low';h.state.speed=1;h.state.paused=false;
  const p=new SimulationPhaseProfile();p.enabled=instrumented;const initial=hash(api.gameSnapshot(h)),samples=[];
  for(let i=0;i<warmSteps;i++)h.step(1/30,instrumented?p:undefined);
  const warm=hash(api.gameSnapshot(h)),cpu=process.cpuUsage(),started=performance.now();
  for(let i=0;i<measuredSteps;i++){const t=performance.now();h.step(1/30,instrumented?p:undefined);samples.push(performance.now()-t);}
  const cpuUsed=process.cpuUsage(cpu),sorted=[...samples].sort((a,b)=>a-b);assert.deepEqual(h.simulationErrors,[]);assert.equal(h.popNow(0),100);assert.equal(hash(Buffer.from(h.world.heights.buffer)),terrain);
  const result={instrumented,warmSteps,measuredSteps,dt:1/30,quality:'low',speed:1,livingPlayerResidents:h.popNow(0),allLivingUnits:h.state.units.filter(u=>u.hp>0).length,allBuildings:h.state.buildings.filter(b=>b.hp>0).length,meanMs:samples.reduce((a,b)=>a+b,0)/samples.length,p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1),wallMs:performance.now()-started,cpuMs:(cpuUsed.user+cpuUsed.system)/1000,initial,warm,final:hash(api.gameSnapshot(h)),seed,draws,simulationSeconds:h.state.time-checkpoint.state.time,phases:instrumented?p.report():undefined,samples};runs.push(result);console.log(JSON.stringify({...result,samples:undefined,phases:undefined}));
 }
 for(const key of ['initial','warm','final','seed','draws'])assert.deepEqual(runs[0][key],runs[1][key]);
 assert.equal(hash(readFileSync(input)),originalHash);
 writeFileSync(out,JSON.stringify({sourceCodeHashes:Object.fromEntries(['src/game/sim.ts','src/game/settlement.ts','src/game/persistence.ts'].map(p=>[p,hash(readFileSync(resolve(source,p)))])),scope:'Actual native Game.step CPU on a declared100-resident scale clone of a real71-resident saved village.29adults authored before the run on connected clear native positions; existing buildings/stocks/climate/conflict/terrain retained. No poststart repair. Not earned100resident campaign or built renderer/FPS evidence.',inputSha256:originalHash,originalUnchanged:true,originalPlayerResidents:before,authoredAdditionalResidents:100-before,terrainHash:terrain,profileParity:true,targetP95Ms:33,baselineMeetsTarget:runs[0].p95Ms<33,runs},null,2));
}finally{Math.random=oldRandom;}
