import {shareLocalTransport} from '../src/game/haulage.ts';
import {applyEngineSelection} from '../src/game/engineDispatch.ts';
import {SimulationWorkerHost} from '../src/game/simulationWorkerHost.ts';
import {SimulationRenderProjection} from '../src/game/simulationRenderProjection.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {Worker} from 'node:worker_threads';
import {createHash} from 'node:crypto';
import {Game} from '../src/game/sim.ts';
import {decodeGame,encodeGame,validateGameSave} from '../src/game/persistence.ts';
import {parseStoredSave} from '../src/game/storageCodec.ts';
import {SimulationWorkerClient} from '../src/game/simulationWorkerClient.ts';
import {SIMULATION_WORKER_RULES} from '../src/game/simulationWorkerProtocol.ts';
import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
let authored;
const fixture=()=>authored??=nativeDairyVillage();
const clone=v=>JSON.parse(JSON.stringify(v));
const TICKS=SIMULATION_WORKER_RULES.maximumTicksPerRequest;
function connection(){
 const nodeWorker=new Worker(new URL('./fixtures/simulation-worker-adapter.mjs',import.meta.url),{execArgv:['--import',new URL('./game-loader.mjs',import.meta.url).pathname]});
 const sent=[],port={onmessage:null,onerror:null,onmessageerror:null,postMessage(message,transfer=[]){sent.push({...message});nodeWorker.postMessage(message,transfer);},terminate(){void nodeWorker.terminate();}};
 nodeWorker.on('message',data=>port.onmessage?.({data}));nodeWorker.on('error',error=>port.onerror?.({preventDefault(){},message:error.message}));nodeWorker.on('messageerror',()=>port.onmessageerror?.({}));
 const client=new SimulationWorkerClient({createWorker:()=>port,timeoutMilliseconds:30000});return{client,nodeWorker,sent};
}
const checkpoint=async client=>{const result=await client.checkpoint();assert.deepEqual(result.rng,{mode:'legacy-worker-random',replayable:false,persisted:false});const raw=parseStoredSave(result.serialized);validateGameSave(raw);return raw;};
const point=(frame,id)=>{const i=frame.ids.subarray(0,frame.count).indexOf(id);assert.ok(i>=0);return{x:frame.poses[i*frame.stride],z:frame.poses[i*frame.stride+2]};};
const errors=code=>error=>error.code===code;

test('actual module Worker owns ordinary native movement; main Game.step is never called',async()=>{
 const f=fixture(),source=JSON.stringify(f.save),{client,nodeWorker}=connection(),mainStep=Game.prototype.step;Game.prototype.step=()=>{throw Error('Main thread must not advance the worker village');};
 try{
  assert.notEqual(nodeWorker.threadId,0);const ready=await client.initialize(f.save);assert.equal(ready.protocolVersion,1);assert.equal(ready.clock.paused,true);assert.equal(ready.rng.replayable,false);
  let result=await client.advance(0);const original=point(result.frame,f.worker);const released=client.recycle(result.frame);await assert.rejects(client.recycle(result.frame),errors('buffer-custody'));await released;assert.equal(result.frame.ids.byteLength,0,'transferred render copy detaches after recycling');
  const rejected=await client.command({kind:'move',unitIds:[999999999],x:original.x+4,z:original.z});assert.equal(rejected.outcome.accepted,false);
  assert.equal((await client.command({kind:'move',unitIds:[f.worker],x:original.x+4,z:original.z})).outcome.accepted,true);
  await client.command({kind:'pause',paused:false});
  let last=original;for(let i=0;i<80;i++){result=await client.advance(TICKS);assert.deepEqual(result.simulationErrors,[]);last=point(result.frame,f.worker);assert.equal('serialized' in result,false,'pose updates never serialize a full save');await client.recycle(result.frame);}
  assert.ok(Math.hypot(last.x-original.x,last.z-original.z)>.5,'the original body moved through ordinary authoritative Game.step');
  await client.command({kind:'pause',paused:true});const raw=await checkpoint(client);assert.ok(raw.state.time>f.save.state.time);assert.equal(JSON.stringify(f.save),source,'caller native fixture remains unchanged');
 }finally{Game.prototype.step=mainStep;client.dispose();}
});

test('ordered paid-production command/duplicate/barrier never charge twice or replace the original paid project',async()=>{
 const f=fixture(),{client}=connection();try{
  await client.initialize(f.save);await assert.rejects(client.retryCommand(2,{kind:'pause',paused:false}),errors('command-gap'));
  const command={kind:'begin-production',recipe:'fermentMilk',workplaceId:f.hearth,unitId:f.worker};
  const first=await client.command(command);assert.equal(first.outcome.accepted,true,first.outcome.reason);const id=first.outcome.projectId;assert.ok(id);
  const paid=await checkpoint(client);assert.equal(paid.state.production.projects.find(p=>p.id===id).actorId,f.worker);assert.equal(paid.state.tribes[0].wood,99);assert.equal(paid.state.tribes[0].items.pottery,0);assert.equal(paid.state.tribes[0].foodLots.milk,0);
  const again=await client.retryCommand(1,command);assert.equal(again.outcome.duplicate,true);assert.equal(again.outcome.projectId,id);assert.deepEqual((await checkpoint(client)).state,paid.state);
  await assert.rejects(client.retryCommand(1,{kind:'pause',paused:false}),errors('duplicate-conflict'));
  assert.equal((await client.command({kind:'pause-production',projectId:id})).outcome.accepted,true);const paused=await checkpoint(client);assert.equal(paused.state.production.projects.find(p=>p.id===id).phase,'paused');assert.equal(paused.state.tribes[0].items.pottery,0);
  assert.equal((await client.command({kind:'resume-production',projectId:id,unitId:f.worker})).outcome.accepted,true);await assert.rejects(client.checkpoint(2),errors('sequence-barrier'));
  const resumed=await checkpoint(client);assert.equal(resumed.state.production.projects.filter(p=>p.id===id).length,1);assert.equal(resumed.state.tribes[0].wood,99);assert.equal(resumed.state.tribes[0].items.pottery,0);
 }finally{client.dispose();}
});

test('bounded transferable pose custody drops pictures rather than authority and stale buffers cannot recycle a new session',async()=>{
 const f=fixture(),{client}=connection();try{
  await client.initialize(f.save);await client.command({kind:'pause',paused:false});const a=await client.advance(0),b=await client.advance(0),c=await client.advance(2);
  assert.ok(a.frame&&b.frame);assert.equal(c.frame,undefined);assert.equal(c.poseFramesInFlight,2);assert.equal(c.droppedPoseFrames,1);assert.equal(c.clock.tick,2);assert.ok(c.clock.time>f.save.state.time,'real simulation continues despite pose backpressure');
  await client.recycle(a.frame);const next=await client.advance(0);assert.ok(next.frame);assert.equal(next.poseFramesInFlight,SIMULATION_WORKER_RULES.maximumPoseFrames);
  const wrong={...b.frame,frameId:999999,ids:new Float64Array(b.frame.capacity),poses:new Float32Array(b.frame.capacity*b.frame.stride)};await assert.rejects(client.recycle(wrong),errors('buffer-custody'));
  await client.initialize(f.save);await assert.rejects(client.recycle(b.frame),errors('stale-frame'));const reset=await client.advance(0);assert.equal(reset.clock.tick,0);assert.equal(reset.poseFramesInFlight,1);await client.recycle(reset.frame);await assert.rejects(client.advance(TICKS+1),errors('tick-budget'));const recovered=await client.advance(0);assert.equal(recovered.clock.tick,0);await client.recycle(recovered.frame);
 }finally{client.dispose();}
});

test('duplicate transport advance is not stepped again and epoch replacement rejects pending old replies',async()=>{
 const f=fixture(),{client,nodeWorker,sent}=connection();try{
  await client.initialize(f.save);const pendingAdvance=client.advance(2);await assert.rejects(client.advance(1),errors('advance-busy'));const first=await pendingAdvance,request=sent.find(m=>m.type==='advance');await client.recycle(first.frame);const retainedDebt=await client.advance(1);assert.equal(retainedDebt.clock.tick,3,'unsubmitted host tick debt is retried rather than discarded');await client.recycle(retainedDebt.frame);
  const response=new Promise((resolve,reject)=>{nodeWorker.once('message',resolve);nodeWorker.once('error',reject);});nodeWorker.postMessage(request);const duplicate=await response;assert.equal(duplicate.type,'error');assert.equal(duplicate.code,'duplicate-request');
  assert.equal((await client.inspect({kind:'inventory'})).clock.tick,3);
  const pending=client.advance(TICKS);const rejection=assert.rejects(pending,errors('session-replaced'));const ready=await client.initialize(f.save);await rejection;assert.equal(ready.clock.tick,0);assert.equal((await client.inspect({kind:'inventory'})).clock.appliedSequence,0);const newAdvance=await client.advance(0);await client.recycle(newAdvance.frame);
 }finally{client.dispose();}
});

test('native paid dairy runs entirely in the worker through real travel/work/incubation/delivery and strict checkpoint reload',async()=>{
 const f=fixture(),{client}=connection(),started=performance.now();let final,projectId,midChecked=false;
 try{
  await client.initialize(f.save);const admission=await client.command({kind:'begin-production',recipe:'fermentMilk',workplaceId:f.hearth,unitId:f.worker});assert.equal(admission.outcome.accepted,true,admission.outcome.reason);projectId=admission.outcome.projectId;
  await client.command({kind:'speed',speed:4});await client.command({kind:'pause',paused:false});
  for(let i=0;i<2000;i++){
   assert.ok(performance.now()-started<30000,'native worker proof30swall cap');const progress=await client.advance(TICKS);assert.deepEqual(progress.simulationErrors,[]);assert.ok(progress.clock.time-f.save.state.time<=500,'500simseconds cap');
   if(progress.frame)await client.recycle(progress.frame);
   const inspection=await client.inspect({kind:'production',projectId});
   if(!midChecked&&inspection.data?.phase==='curing'){const raw=await checkpoint(client);assert.equal(raw.state.tribes[0].items.pottery,0);assert.equal(raw.state.production.projects.find(p=>p.id===projectId).actorId,null);midChecked=true;}
   if(inspection.data?.phase==='complete'){final=await checkpoint(client);break;}
  }
  assert.ok(final,'actual paid production completed');assert.equal(midChecked,true,'actual passive incubation checkpoint observed');
  const project=final.state.production.projects.find(p=>p.id===projectId);assert.equal(project.phase,'complete');assert.equal(final.state.production.metrics.edibleFoodProduced,3);assert.equal(final.state.production.metrics.consumed.pottery,1);assert.equal(final.state.production.metrics.produced.pottery,1);assert.equal(final.state.tribes[0].items.pottery,1);assert.equal(final.state.tribes[0].potteryOrigins.find(o=>o.origin.site===f.origin.site).count,1);
  const restored=decodeGame(clone(final)),terrain=createHash('sha256').update(JSON.stringify({heights:Array.from(restored.world.heights),rivers:restored.world.rivers,features:restored.world.features})).digest('hex');assert.equal(terrain,f.terrain,'original native coast/terrain unchanged');assert.doesNotThrow(()=>validateGameSave(encodeGame(restored)));
  console.log(JSON.stringify({scope:'isolated actual moduleWorker core; authored finite nativeV18 opening, ordinary Game.step; not Engine bridge/renderer/performance/publication',projectId,actor:f.worker,simulationSeconds:final.state.time-f.save.state.time,wallMilliseconds:performance.now()-started,terrain,legacyReplayRngUnresolved:true}));
 }finally{client.dispose();}
});

test('bounded duplicate retention never replays an evicted command or malformed payload',async()=>{
 const f=fixture(),{client}=connection();try{
  await client.initialize(f.save);
  const queued=Array.from({length:SIMULATION_WORKER_RULES.maximumPendingRequests},(_,i)=>client.command({kind:'pause',paused:i%2===0}));
  await assert.rejects(client.command({kind:'pause',paused:false}),errors('backpressure'));
  for(const result of await Promise.all(queued))assert.equal(result.outcome.accepted,true);
  const next=await client.command({kind:'pause',paused:true});assert.equal(next.outcome.sequence,129,'queue rejection did not consume a command sequence');assert.equal(next.outcome.accepted,true);
  await assert.rejects(client.retryCommand(1,{kind:'pause',paused:false}),errors('outcome-expired'));
  const before=await checkpoint(client);assert.equal(before.state.paused,true);
  const bad=await client.command({kind:'move',unitIds:Array(2),x:1,z:1});assert.equal(bad.outcome.accepted,false);
  const invalid=await client.command({kind:'pause',paused:false,unrecognized:'not stored in fingerprint'});assert.equal(invalid.outcome.accepted,false);
  const after=await checkpoint(client);assert.equal(after.state.paused,true);assert.equal(after.state.tribes[0].food,before.state.tribes[0].food);
 }finally{client.dispose();}
});

test('actual Worker preserves above32bit entity IDs in Float64 pose packets and rejects unsafe command identities',async()=>{
 const f=fixture(),g=decodeGame(clone(f.save)),original=g.state.units.find(u=>u.id===f.worker);g.state.nextId=2**32+1;
 // Authored one additional held adult at the real native home before worker start.
 const high=g.spawnUnit('worker',original.x+1,original.z,0);high.order='hold';high.jobLock=true;
 const raw=encodeGame(g);validateGameSave(raw);const {client}=connection();try{
  await client.initialize(raw);const result=await client.advance(0);assert.ok(result.frame.ids instanceof Float64Array);assert.ok(result.frame.ids.subarray(0,result.frame.count).includes(high.id),'stable original entity ID is not truncated to uint32');await client.recycle(result.frame);
  const move=await client.command({kind:'move',unitIds:[high.id],x:high.x+.5,z:high.z});assert.equal(move.outcome.accepted,true);
  const unsafe=await client.command({kind:'move',unitIds:[Number.MAX_SAFE_INTEGER+1],x:high.x,z:high.z});assert.equal(unsafe.outcome.accepted,false);
  const saved=await checkpoint(client);assert.ok(saved.state.units.some(u=>u.id===high.id));
 }finally{client.dispose();}
});


test('actual Worker publishes owned membership/fog/paid goods and owner HUD; main projection rejects mutations',async()=>{
 const f=fixture(),{client}=connection(),projection=new SimulationRenderProjection();
 try{
  await client.initialize(f.save);
  const initial=await client.presentation(true,{selectedUnitIds:[f.worker],selectedBuildingId:f.hearth});
  assert.ok(initial.presentation.world);assert.ok(initial.presentation.vision instanceof Uint8Array);assert.ok(initial.presentation.hud);
  projection.apply(initial.presentation,initial.clock);
  assert.equal(projection.game.state.units.length,f.save.state.units.length);
  assert.equal(projection.game.vision.length,initial.presentation.vision.length);
  assert.equal(projection.game.exploredAt(f.save.state.units[0].x,f.save.state.units[0].z),true);
  assert.throws(()=>projection.game.step(1/30),/unavailable/);
  assert.throws(()=>projection.game.tribe(0).food--,/read-only/);
  assert.throws(()=>projection.game.snapshot(),/unavailable/);
  assert.throws(()=>projection.game.vision.fill(2),/read-only/);
  const paid=await client.command({kind:'begin-production',recipe:'fermentMilk',workplaceId:f.hearth});
  assert.equal(paid.outcome.accepted,true,paid.outcome.reason);assert.ok(paid.outcome.projectId,'native autoselection reports actual new paid project');
  const update=await client.presentation(false);assert.equal(update.presentation.world,undefined,'periodic presentation does not resend terrain or a saved world');
  projection.apply(update.presentation,update.clock);
  assert.equal(projection.game.tribe(0).items.pottery,0);assert.equal(projection.game.state.production.projects.find(p=>p.id===paid.outcome.projectId).recipe,'fermentMilk');
  assert.equal(projection.hud.quality,update.presentation.hud.quality);
  const raw=await checkpoint(client);assert.equal(raw.state.production.projects.filter(p=>p.id===paid.outcome.projectId).length,1);
 }finally{client.dispose();}
});

test('actual WorkerHost retains owed ticks, syncs selection before advance, and checkpoints owner state without main step',async()=>{
 const f=fixture(),{client,sent}=connection(),host=new SimulationWorkerHost({client}),step=Game.prototype.step;
 Game.prototype.step=()=>{throw Error('Host must never run a main-thread simulation');};
 try{
  await host.initialize(f.save);const selected={selectedUnitIds:[f.worker]};host.select(selected);
  const result=await host.dispatch({kind:'pause',paused:false},selected);assert.equal(result.accepted,true);
  host.advanceWallTime(.2);
  const deadline=performance.now()+10000;
  while(host.report.pendingSimulationSeconds>1e-8||host.report.pendingOperations){assert.ok(performance.now()<deadline);await new Promise(resolve=>setTimeout(resolve,5));}
  assert.equal(host.report.clock.tick,6);assert.equal(host.report.pendingSimulationSeconds,0);
  const advances=sent.filter(m=>m.type==='advance');assert.equal(advances.length,2);for(const request of advances){assert.deepEqual(request.selection.selectedUnitIds,selected.selectedUnitIds);assert.equal(request.selection.selectedBuildingId,undefined);assert.equal(request.selection.selectedBoatId,undefined);}
  const state=(await client.presentation(false)).presentation.state;assert.equal(state.units.find(u=>u.id===f.worker).selected,true,'selected is native eligibility input before actual simulation ticks');
  const saved=parseStoredSave((await host.checkpoint()).serialized);validateGameSave(saved);assert.ok(saved.state.time>f.save.state.time);
  assert.equal('serialized' in host.report,false);
 }finally{Game.prototype.step=step;host.dispose();}
});


test('actual Worker selected sled donor stays owned; unselected positive control physically hands off the same sled',async()=>{
 const f=fixture(),g=decodeGame(clone(f.save)),home=g.campOf(0);let location;
 for(let radius=16;radius<=48&&!location;radius+=4)for(let i=0;i<24&&!location;i++){const x=home.x+Math.cos(i*Math.PI/12)*radius,z=home.z+Math.sin(i*Math.PI/12)*radius;if(g.placementIssue('warehouse',x,z,0)===null)location={x,z};}
 assert.ok(location,'native legal depot footprint; terrain remains unchanged');
 // Declared finite transport fixture: one completed depot, one real sled, two adult
 // bodies placed on a real reachable exterior workspot BEFORE worker ownership starts.
 // No body is repositioned, granted goods, or redirected by the test after start.
 const depot=g.makeBld('warehouse',location.x,location.z,0);g.state.buildings.push(depot);g.rebuildWalk();
 const donor=g.spawnUnit('worker',home.x,home.z,0),spot=g.interactionSpot(donor,depot);assert.ok(spot,'ordinary reachable depot workspot');
 donor.x=spot.x;donor.z=spot.z;donor.y=g.height(spot.x,spot.z);donor.order='idle';donor.haulage='sled';donor.tx=spot.x;donor.tz=spot.z;
 const receiver=g.spawnUnit('worker',spot.x+.6,spot.z,0),source=g.state.trees.find(n=>n.amount>0&&Math.hypot(n.x-receiver.x,n.z-receiver.z)>12);
 assert.ok(source);Object.assign(receiver,{order:'gather',job:'wood',node:source,tx:source.x,tz:source.z});
 assert.ok(g.buildingWorkReached(donor,depot));assert.ok(Math.hypot(receiver.x-donor.x,receiver.z-donor.z)<=2.4);assert.ok(g.canStep(donor,receiver.x,receiver.z));
 const raw=encodeGame(g),probe=decodeGame(clone(raw));applyEngineSelection(probe,{selectedUnitIds:[donor.id]});assert.equal(shareLocalTransport(probe),0);applyEngineSelection(probe,{selectedUnitIds:[]});assert.equal(shareLocalTransport(probe),1,'fixture has an actual physically admissible native handoff');
 for(const selected of [true,false]){
  const {client}=connection();try{
   await client.initialize(raw);await client.command({kind:'pause',paused:false});
   const advanced=await client.advance(1,undefined,{selectedUnitIds:selected?[donor.id]:[]});await client.recycle(advanced.frame);
   const state=(await client.presentation(false)).presentation.state,d=state.units.find(u=>u.id===donor.id),r=state.units.find(u=>u.id===receiver.id);
   assert.equal(d.haulage,selected?'sled':undefined,'selected digest is applied before ordinary native eligibility');assert.equal(r.haulage,selected?undefined:'sled');
   const strict=await checkpoint(client);assert.equal(strict.state.units.filter(u=>u.haulage==='sled').length,raw.state.units.filter(u=>u.haulage==='sled').length,'no transport duplicated or erased');
  }finally{client.dispose();}
 }
});

test('actual Worker computes bounded native availability read models; stale advice cannot spend physical inputs',async()=>{
 const f=fixture(),{client}=connection(),mainRoute=Game.prototype.interactionSpot;
 Game.prototype.interactionSpot=()=>{throw Error('Display thread must not run owner availability routing');};
 try{
  await client.initialize(f.save);const before=await checkpoint(client),timings=[];
  const recipes=await client.readModel({kind:'recipe-issues',workplaceId:f.hearth});
  assert.equal(recipes.model.kind,'recipe-issues');assert.equal(recipes.model.issues.find(r=>r.recipe==='fermentMilk').issue,null);
  const unknown=Number.MAX_SAFE_INTEGER;
  const fibre=await client.readModel({kind:'fibre-issues',unitId:f.worker,patchIds:[unknown]});assert.deepEqual(fibre.model.issues,[],'unwitnessed source is omitted, never reported as allowed');
  const clay=await client.readModel({kind:'clay-issues',unitId:f.worker,depositIds:[unknown]});assert.deepEqual(clay.model.issues,[]);
  const armor=await client.readModel({kind:'armor-choice',unitId:f.worker});assert.equal(armor.model.availableArmorId,undefined);assert.ok(armor.model.issue);
  for(const result of [recipes,fibre,clay,armor]){assert.ok(Number.isFinite(result.cpuMilliseconds)&&result.cpuMilliseconds>=0);assert.ok(Number.isSafeInteger(result.navigationRevision));timings.push({kind:result.model.kind,cpuMilliseconds:result.cpuMilliseconds});}
  const after=await checkpoint(client);assert.deepEqual(after.state.tribes,before.state.tribes,'read models neither debit nor invent physical food/materials');assert.equal(after.state.time,before.state.time);
  await assert.rejects(client.readModel({kind:'fibre-issues',unitId:f.worker,patchIds:Array.from({length:129},(_,i)=>i+1)}),errors('read-query'));
  const first=await client.command({kind:'begin-production',recipe:'fermentMilk',workplaceId:f.hearth});assert.equal(first.outcome.accepted,true);
  assert.equal(recipes.model.issues.find(r=>r.recipe==='fermentMilk').issue,null,'old advice remains an old observation');
  const second=await client.command({kind:'begin-production',recipe:'fermentMilk',workplaceId:f.hearth});assert.equal(second.outcome.accepted,false,'admission revalidates paid stock/occupied slots instead of trusting aged advice');
  const saved=await checkpoint(client);assert.equal(saved.state.production.projects.length,1);assert.equal(saved.state.tribes[0].items.pottery,0);assert.equal(saved.state.tribes[0].wood,99);
  const initial=await client.presentation(true),refresh=await client.presentation(false);assert.ok(refresh.previousDispatch);assert.ok(refresh.previousDispatch.cpuMilliseconds>=0);assert.ok(initial.captureMilliseconds>=0);
  console.log(JSON.stringify({scope:'actual moduleWorker owner-read telemetry; single authored native fixture, not a100resident performance benchmark',queries:timings,bootstrapPresentationCaptureMilliseconds:initial.captureMilliseconds,bootstrapPresentationPostMessageMilliseconds:refresh.previousDispatch.cpuMilliseconds}));
 }finally{Game.prototype.interactionSpot=mainRoute;client.dispose();}
});

test('actual Worker checkpoints stamp owner time and preserve paid state and isolated Lab reveal namespace',async()=>{
 const f=fixture(),sourceBytes=JSON.stringify(f.save),sparse=decodeGame(clone(f.save));
 // Authored initial knowledge is real native observation only; terrain, people and goods are retained.
 sparse.vision.fill(0);sparse.visAge.fill(0);sparse.updateVision();const sparseSave=encodeGame(sparse);assert.ok(sparseSave.vision.some(v=>v===0));
 const probePoints=[[sparse.state.units[0].x,sparse.state.units[0].z],[0,0],[sparse.world.size/4,sparse.world.size/4]],nativeWater=probePoints.map(([x,z])=>sparse.waterAt(x,z));
 const {SimulationCheckpointSaver}=await import('../src/game/simulationCheckpointSave.ts');
 const {serializeStoredSave}=await import('../src/game/storageCodec.ts');const {SAVE_KEY}=await import('../src/game/constants.ts');
 const entries=new Map([[SAVE_KEY,serializeStoredSave({...f.save,savedAt:1})],[SAVE_KEY+':protected','original protected bytes']]);
 const storage={getItem:key=>entries.get(key)??null,setItem:(key,value)=>entries.set(key,value),removeItem:key=>entries.delete(key)};
 const {client}=connection();let sessionEpoch=1;const wall=Date.now();
 const authority={currentEpoch:()=>sessionEpoch,allowed:()=>true,checkpoint:async()=>{const owner=await client.checkpoint();return{source:'worker',sessionEpoch,serialized:owner.serialized,clock:owner.clock,rng:owner.rng,context:owner.context};}};
 const saver=new SimulationCheckpointSaver(authority,storage);
 try{
  await client.initialize(f.save);
  const paid=await client.command({kind:'begin-production',recipe:'fermentMilk',workplaceId:f.hearth});assert.equal(paid.outcome.accepted,true);
  const saved=await saver.save('village');assert.equal(saved.status,'committed',saved.reason);assert.equal(saved.checkpoint.context.testMode,false);
  const raw=parseStoredSave(storage.getItem(SAVE_KEY));assert.ok(raw.savedAt>=wall);assert.equal(raw.state.tribes[0].items.pottery,0);assert.equal(raw.state.tribes[0].wood,99);assert.equal(raw.state.production.projects.find(p=>p.id===paid.outcome.projectId).recipe,'fermentMilk');
  const primary=storage.getItem(SAVE_KEY),backup=storage.getItem(SAVE_KEY+':bak'),protectedCopy=storage.getItem(SAVE_KEY+':protected');
  sessionEpoch++;
  const context={started:true,awaitingStart:false,testMode:true,revealMap:true};await client.initialize(sparseSave,context);
  const presentation=await client.presentation(true);assert.ok(presentation.presentation.vision.every(v=>v===2),'visual Lab overlay is actually restored on owner initialization');
  const view=new SimulationRenderProjection();view.apply(presentation.presentation,presentation.clock);for(let i=0;i<probePoints.length;i++)assert.equal(view.game.waterAt(...probePoints[i]),nativeWater[i],'real native water samples survive guarded world clone');
  assert.doesNotThrow(()=>Array.from(view.game.world.waterBodies||[]));assert.throws(()=>{view.game.world.waterY=0;},/read-only/);
  const refused=await saver.save('village');assert.equal(refused.status,'failed','Lab authority cannot replace ordinary village namespace');
  const lab=await saver.save('test-lab');assert.equal(lab.status,'committed',lab.reason);assert.deepEqual(lab.checkpoint.context,context);
  const labRaw=parseStoredSave(storage.getItem(SAVE_KEY+':test-lab'));validateGameSave(labRaw);assert.equal(labRaw.testLabRevealMap,true);assert.ok(labRaw.savedAt>=wall);assert.ok(labRaw.vision.some(v=>v===0),'checkpoint stores earned vision underneath visual overlay');
  assert.equal(storage.getItem(SAVE_KEY),primary);assert.equal(storage.getItem(SAVE_KEY+':bak'),backup);assert.equal(storage.getItem(SAVE_KEY+':protected'),protectedCopy);
  assert.equal(JSON.stringify(f.save),sourceBytes,'original native source village remains byte-identical');
  sessionEpoch++;await assert.rejects(client.initialize(sparseSave,{...context,testMode:false}),errors('invalid-save'));
 }finally{client.dispose();}
});
