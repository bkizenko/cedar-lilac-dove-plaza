// Actual module-Worker CPU/transport measurements. Never mutate or publish the private input.
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {SimulationWorkerClient} from '../../src/game/simulationWorkerClient.ts';
import {parseStoredSave} from '../../src/game/storageCodec.ts';
import {validateGameSave} from '../../src/game/persistence.ts';
const [input,out]=process.argv.slice(2);assert.ok(input&&out,'Pass PRIVATE native100 fixture and aggregate output path');assert.notEqual(resolve(input),resolve(out));
const hash=x=>createHash('sha256').update(x).digest('hex'),bytes=readFileSync(input),beforeHash=hash(bytes),snapshot=JSON.parse(bytes);validateGameSave(snapshot);
const summary=values=>{const sorted=[...values].sort((a,b)=>a-b);return{samples:values.length,meanMs:values.reduce((a,b)=>a+b,0)/Math.max(1,values.length),p95Ms:sorted[Math.max(0,Math.ceil(sorted.length*.95)-1)]??0,maxMs:sorted.at(-1)??0};};
const living=state=>({player:state.units.filter(u=>u.team===0&&u.hp>0).length,all:state.units.filter(u=>u.hp>0).length,buildings:state.buildings.filter(b=>b.hp>0).length});
assert.equal(living(snapshot.state).player,100,'Use the preauthored100 scale fixture; do not create more bodies inside the benchmark');
const nodeWorker=new Worker(new URL('../fixtures/simulation-worker-adapter.mjs',import.meta.url),{execArgv:['--import',new URL('../game-loader.mjs',import.meta.url).pathname]});
const port={onmessage:null,onerror:null,onmessageerror:null,postMessage:(value,transfer=[])=>nodeWorker.postMessage(value,transfer),terminate:()=>{void nodeWorker.terminate();}};
nodeWorker.on('message',data=>port.onmessage?.({data}));nodeWorker.on('error',error=>port.onerror?.({preventDefault(){},message:error.message}));nodeWorker.on('messageerror',()=>port.onmessageerror?.({}));
const client=new SimulationWorkerClient({createWorker:()=>port,timeoutMilliseconds:60000});
try{
 const boot=performance.now(),ready=await client.initialize(snapshot),bootstrapMs=performance.now()-boot;assert.notEqual(nodeWorker.threadId,0);await client.command({kind:'speed',speed:1,resume:true});
 const warmSteps=20,measuredSteps=180,owner=[],roundTrip=[],presentation=[],errors=[];
 const step=async measured=>{const start=performance.now(),result=await client.advance(1);if(measured){owner.push(result.cpuMilliseconds);roundTrip.push(performance.now()-start);}errors.push(...result.simulationErrors);if(result.frame)await client.recycle(result.frame);return result;};
 for(let i=0;i<warmSteps;i++)await step(false);
 const started=performance.now();let last;
 for(let i=0;i<measuredSteps;i++){last=await step(true);if(i%6===5){const p=await client.presentation(false);presentation.push({captureMs:p.captureMilliseconds,previousDispatchMs:p.previousDispatch?.cpuMilliseconds});assert.equal(living(p.presentation.state).player,100);}}
 const wallMs=performance.now()-started,checkpoint=await client.checkpoint(),final=parseStoredSave(checkpoint.serialized);validateGameSave(final);assert.equal(living(final.state).player,100);assert.deepEqual(errors,[]);assert.equal(hash(readFileSync(input)),beforeHash);
 const sourceCodeHashes=Object.fromEntries(['simulationWorkerRuntime.ts','simulationWorkerClient.ts','simulationWorkerProtocol.ts','simulationRenderProjection.ts','engineDispatch.ts','engineReadModels.ts','sim.ts','settlement.ts','haulage.ts','defense.ts','defenseNeighbors.ts'].map(name=>[name,hash(readFileSync(new URL('../../src/game/'+name,import.meta.url)))]));
 const result={sourceCodeHashes,scope:'Actual Node moduleWorker native100 CPU and transport, with owner presentation every6ticks. No renderer, no browser FPS or Low-profile visual claim. Private preauthored scale fixture; no resident/terrain/resource edits during run. Legacy Worker RNG is nonreplayable: not an AB parity comparison.',inputSha256:beforeHash,inputUnchanged:true,warmSteps,measuredSteps,ticks:last.clock.tick,stepSeconds:1/30,simulationSeconds:final.state.time-snapshot.state.time,bootstrapMs,measuredWallMs:wallMs,countsBefore:living(snapshot.state),countsAfter:living(final.state),ownerStep:summary(owner),requestRoundTrip:summary(roundTrip),presentationCapture:summary(presentation.map(p=>p.captureMs)),presentationPreviousPostMessage:summary(presentation.map(p=>p.previousDispatchMs).filter(Number.isFinite)),targetP95Ms:33,meetsOwnerStepTarget:summary(owner).p95Ms<33,simulationErrors:errors,rng:ready.rng};
 writeFileSync(out,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{client.dispose();await nodeWorker.terminate();}
