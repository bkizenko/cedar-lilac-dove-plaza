// Matched actual Worker A/B/B/A. Input is a private, already-authored100 resident
// fixture. Local seed interception is test-only; never claim replayable saves.
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {performance} from 'node:perf_hooks';
const [baselineRoot,candidateRoot,input,out]=process.argv.slice(2);assert.ok(baselineRoot&&candidateRoot&&input&&out,'Pass frozen baseline/candidate source roots, private100fixture and aggregate output');assert.notEqual(resolve(input),resolve(out));
const hash=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex'),bytes=readFileSync(input),inputHash=hash(bytes),source=JSON.parse(bytes),startPeople=source.state.units.filter(u=>u.team===0&&u.hp>0).length;assert.equal(startPeople,100);
const stats=values=>{const sorted=[...values].sort((a,b)=>a-b);return{samples:values.length,meanMs:values.reduce((a,b)=>a+b,0)/values.length,p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1)};};
async function run(root,label){
 const url=p=>pathToFileURL(resolve(root,p));
 const {SimulationWorkerClient}=await import(url('src/game/simulationWorkerClient.ts').href),{parseStoredSave}=await import(url('src/game/storageCodec.ts').href);
 const worker=new Worker(url('scripts/fixtures/simulation-worker-seeded-adapter.mjs'),{execArgv:['--import',url('scripts/game-loader.mjs').href],workerData:{seed:0x1002026}});
 const port={onmessage:null,onerror:null,onmessageerror:null,postMessage:(data,transfer=[])=>worker.postMessage(data,transfer),terminate:()=>void worker.terminate()};
 worker.on('message',data=>port.onmessage?.({data}));worker.on('error',error=>port.onerror?.({preventDefault(){},message:error.message}));worker.on('messageerror',()=>port.onmessageerror?.({}));
 const client=new SimulationWorkerClient({createWorker:()=>port,timeoutMilliseconds:60000});
 const rng=()=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{worker.off('message',listener);reject(Error('Diagnostic RNG response timed out'));},10000),listener=data=>{if(data?.diagnostic==='rng'){clearTimeout(timeout);worker.off('message',listener);resolve({seed:data.seed,draws:data.draws});}};worker.on('message',listener);worker.postMessage({diagnostic:'rng'});});
 const checkpoint=async()=>{const result=await client.checkpoint(),raw=parseStoredSave(result.serialized);delete raw.savedAt;return{raw,hash:hash(raw),rng:await rng()};};
 try{
  const boot=performance.now();await client.initialize(structuredClone(source));await client.command({kind:'speed',speed:1,resume:true});const bootstrapMs=performance.now()-boot,initial=await checkpoint();
  const step=async()=>{const r=await client.advance(1);assert.deepEqual(r.simulationErrors,[]);if(r.frame)await client.recycle(r.frame);return r;};
  for(let i=0;i<20;i++)await step();const warm=await checkpoint(),owner=[],roundTrip=[],capture=[],clone=[];const began=performance.now();
  for(let i=0;i<180;i++){const start=performance.now(),r=await step();owner.push(r.cpuMilliseconds);roundTrip.push(performance.now()-start);if(i%6===5){const p=await client.presentation(false);capture.push(p.captureMilliseconds);if(p.previousDispatch)clone.push(p.previousDispatch.cpuMilliseconds);}}
  const wallMs=performance.now()-began,final=await checkpoint();assert.equal(final.raw.state.units.filter(u=>u.team===0&&u.hp>0).length,100);assert.equal(hash(readFileSync(input)),inputHash);
  const result={label,warmSteps:20,measuredSteps:180,playerResidents:100,totalLivingUnits:final.raw.state.units.filter(u=>u.hp>0).length,livingBuildings:final.raw.state.buildings.filter(b=>b.hp>0).length,initial:initial.hash,warm:warm.hash,final:final.hash,initialRng:initial.rng,warmRng:warm.rng,finalRng:final.rng,ownerStep:stats(owner),advanceAndRecycleRoundTrip:stats(roundTrip),presentationCapture:stats(capture),presentationPostMessage:stats(clone),wallMs,bootstrapMs,simulationSeconds:final.raw.state.time-source.state.time};console.log(JSON.stringify(result));return result;
 }finally{client.dispose();await worker.terminate();}
}
const runs=[];for(const [root,label]of [[baselineRoot,'A1'],[candidateRoot,'B1'],[candidateRoot,'B2'],[baselineRoot,'A2']])runs.push(await run(root,label));
const parity={};for(const key of ['initial','warm','final','initialRng','warmRng','finalRng']){parity[key]=runs.every(r=>JSON.stringify(r[key])===JSON.stringify(runs[0][key]));assert.ok(parity[key],`Full native checkpoint/RNG parity required for ${key}`);}
const a=runs.filter(r=>r.label.startsWith('A')),b=runs.filter(r=>r.label.startsWith('B')),mean=r=>r.reduce((n,v)=>n+v.ownerStep.meanMs,0)/r.length;
const report={scope:'Actual Node moduleWorker native100 controlled A/B/B/A,180measuredticks after20warm; owner presentation every6ticks; completed owner checkpoints at initial/warm/final. Seed override exists only in diagnostic adapter. No renderer/FPS/production persisted-RNG claim.',inputSha256:inputHash,inputUnchanged:hash(readFileSync(input))===inputHash,fullCheckpointAndRngParity:parity,baselineMeanMs:mean(a),candidateMeanMs:mean(b),meanImprovementPercent:(1-mean(b)/mean(a))*100,targetP95Ms:33,candidateAllRunsUnderTarget:b.every(r=>r.ownerStep.p95Ms<33),runs};writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({parity,meanImprovementPercent:report.meanImprovementPercent,candidateAllRunsUnderTarget:report.candidateAllRunsUnderTarget}));
