import test from 'node:test';import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';import {Worker} from 'node:worker_threads';
import {Game} from '../src/game/sim.ts';import {parseStoredSave} from '../src/game/storageCodec.ts';
import {SAVE_KEY} from '../src/game/constants.ts';import {nativeDairyVillage} from './helpers/native-dairy-village.mjs';
import {SimulationWorkerClient} from '../src/game/simulationWorkerClient.ts';import {SimulationWorkerHost} from '../src/game/simulationWorkerHost.ts';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/'))return next(new URL(`../src/${specifier.slice(2)}.ts`,import.meta.url).href,context);return next(specifier,context);}});
const {Engine}=await import('../src/game/engine.ts');
function host(){
 const worker=new Worker(new URL('./fixtures/simulation-worker-adapter.mjs',import.meta.url),{execArgv:['--import',new URL('./game-loader.mjs',import.meta.url).pathname]});
 const port={onmessage:null,onerror:null,onmessageerror:null,postMessage:(m,t=[])=>worker.postMessage(m,t),terminate:()=>{void worker.terminate();}};
 worker.on('message',data=>port.onmessage?.({data}));worker.on('error',error=>port.onerror?.({preventDefault(){},message:error.message}));
 return new SimulationWorkerHost({client:new SimulationWorkerClient({createWorker:()=>port})});
}
function deferred(){let resolve;return{promise:new Promise(r=>{resolve=r;}),resolve:v=>resolve(v)};}
function fixture(owner,allHosts){
 const e=Object.create(Engine.prototype);Object.assign(e,{game:owner.game,workerHost:owner,originalGame:null,originalWorkerHost:null,disposed:false,fps:60,readModelCache:new Map(),dispatchRevision:0,dispatchSequence:0,autosave:{invalidate(){},dispose(){}},keyboard:{groups:new Map()},canvas:{focus(){},removeEventListener(){}},audio:{unlock(){},play(){},dispose(){}},view:{look:{set(){}},rebuild(){if(e.failRender){e.failRender=false;throw Error('actual renderer rejected prepared scene');}},renderer:{setAnimationLoop(){}},dispose(){}},shown:[]});
 e.pushHud=()=>e.shown.push(e.game);e.createLifecycleWorker=()=>{const next=host();allHosts.push(next);return next;};return e;
}
test('real Worker lifecycle preserves original owner, paid Lab goods, metadata-safe import, rollback and final checkpoint',async()=>{
 const f=nativeDairyVillage(),originalText=JSON.stringify(f.save),allHosts=[],values=new Map();
 const previous={storage:globalThis.localStorage,window:globalThis.window,document:globalThis.document,step:Game.prototype.step};
 globalThis.localStorage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)};globalThis.window={removeEventListener(){}};globalThis.document={removeEventListener(){}};
 const original=host();allHosts.push(original);let e;
 try{
  await original.initialize(f.save);original.projection.setDisplaySettings('low',60);e=fixture(original,allHosts);
  Game.prototype.step=()=>{throw Error('Lifecycle must not advance a main-thread Game');};
  assert.equal(await e.startTestSession(),true);assert.equal(e.isWorkerSession,true);assert.equal(e.game.testMode,true);assert.equal(e.originalWorkerHost,original);assert.equal(original.ready,true);
  const primary=values.get(SAVE_KEY),protectedCopy=values.get(SAVE_KEY+':protected');
  const paid=await e.dispatch({kind:'begin-production',recipe:'fermentMilk',workplaceId:f.hearth});assert.equal(paid.accepted,true,paid.reason);assert.equal(e.game.tribe(0).items.pottery,0);
  assert.equal((await e.saveNow()).saved,true);assert.equal(values.get(SAVE_KEY),primary);assert.equal(values.get(SAVE_KEY+':protected'),protectedCopy);assert.equal(parseStoredSave(values.get(SAVE_KEY+':test-lab')).state.tribes[0].items.pottery,0);
  const lab=e.workerHost;await e.endTestSession();assert.equal(e.workerHost,original);assert.equal(e.game.tribe(0).items.pottery,1,'original physical vessel is independent from paid Lab copy');assert.equal(lab.ready,false);
  e.failRender=true;assert.equal(await e.startTestSession(),false);assert.equal(e.workerHost,original);assert.equal(original.ready,true,'real paused source owner survives failed candidate scene');assert.equal(e.originalGame,null);
  const incoming=structuredClone(f.save);incoming.state.tribes[0].wood=77;
  const file=deferred(),pending=e.importVillage({text:()=>file.promise}),stateBefore=e.game.state;
  await original.dispatch({kind:'pause',paused:true});assert.notEqual(e.game.state,stateBefore,'a real owner presentation replaced the read-only state during file read');
  file.resolve(JSON.stringify(incoming));const imported=await pending;assert.equal(imported.applied,true,imported.message);assert.equal(imported.saved,true,imported.message);assert.equal(e.isWorkerSession,true);assert.notEqual(e.workerHost,original);assert.equal(original.ready,false);assert.equal(e.game.tribe(0).wood,77);
  assert.equal(parseStoredSave(values.get(SAVE_KEY+':protected')).state.tribes[0].wood,100,'outgoing owner checkpoint remains protected');
  await e.resumeSaved(true);assert.equal(e.isWorkerSession,true);assert.equal(e.game.tribe(0).wood,100,'protected restore reconstructs actual target inside Worker');
  await e.dispose();assert.equal(e.disposed,true);assert.equal(parseStoredSave(values.get(SAVE_KEY)).state.tribes[0].wood,100);assert.equal(e.lifecycleReport().last.operation,'dispose');assert.equal(e.lifecycleReport().last.save,'committed');
  assert.equal(JSON.stringify(f.save),originalText,'authored native source fixture remains unchanged');
 }finally{for(const owner of allHosts)owner.dispose();Game.prototype.step=previous.step;globalThis.localStorage=previous.storage;globalThis.window=previous.window;globalThis.document=previous.document;}
});
