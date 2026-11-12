import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
import {Game} from '../src/game/sim.ts';import {saveGame} from '../src/game/save.ts';
import {AutosaveController} from '../src/game/autosave.ts';
import {encodeGame} from '../src/game/persistence.ts';
import {SAVE_KEY} from '../src/game/constants.ts';
import {sendDelegation,delegationAI} from '../src/game/delegations.ts';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/'))return next(new URL(`../src/${specifier.slice(2)}.ts`,import.meta.url).href,context);return next(specifier,context);}});
const {Engine}=await import('../src/game/engine.ts');
function setup(){const g=new Game();g.reset(123456);g.enterIsland();return g;}
function engineFixture(real){
 const e=Object.create(Engine.prototype);
 Object.assign(e,{game:real,workerHost:null,originalGame:null,originalWorkerHost:null,disposed:false,closing:false,lifecycleBusy:false,lifecycleSequence:0,lastLifecycle:null,dispatchRevision:0,dispatchSequence:0,fps:60,
  keyboard:{groups:new Map()},audio:{unlock(){},play(){}},view:{look:{set(){}},rebuild(g){e.rebuilt.push(g);}},canvas:{focus(){}},rebuilt:[],shown:[]});
 e.pushHud=()=>e.shown.push({game:e.game,banner:e.game.state.banner});
 // Real lifecycle invalidation and native checkpoint saving. Only the browser
 // renderer/audio shell is replaced; no save/prepare/install method is stubbed.
 e.autosave=new AutosaveController({getGame:()=>e.game,storage:globalThis.localStorage,listenToStorage:false,createWorker(){throw Error('This lifecycle fixture must not request an autosave worker');}});
 return e;
}
const villageKeys=[SAVE_KEY,SAVE_KEY+':bak',SAVE_KEY+':protected'];
test('restarting and configuring a test world preserves the exact real village and durable save',async()=>{
 const real=setup();real.state.paused=true;
 // Canonical checkpoint reconciliation initializes the optional empty haulage
 // registry. Prove that exact normalization before recording the frozen owner;
 // any physical, stock, clock or other field change is still a hard failure.
 const beforeCheckpoint=structuredClone(real.state);assert.equal(Object.hasOwn(beforeCheckpoint,'haulageProjects'),false);
 encodeGame(real);assert.deepEqual(real.state,{...beforeCheckpoint,haulageProjects:[]});
 const before=JSON.stringify(real.state),storage=new Map(),old=globalThis.localStorage;let e;
 globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
 const villageSlots=()=>villageKeys.map(k=>[k,storage.get(k)??null]);
 try{
  e=engineFixture(real);assert.equal(await e.startTestSession(),true);assert.equal(e.game.testMode,true);assert.equal(e.originalGame,real);assert.equal(e.lifecycleReport().busy,false);
  const saved=villageSlots();assert.ok(storage.get(SAVE_KEY),'the actual native checkpoint was durably committed');e.game.tribe(0).food=9999;
  assert.equal(await e.restart(),true);assert.equal(e.game.testMode,true);assert.equal(e.originalGame,real);assert.equal(e.game.awaitingStart,false);
  assert.ok(storage.get(SAVE_KEY+':test-lab'),'restarting now checkpoints the separate disposable Lab slot');
  assert.equal(await e.configureNewWorld({layout:'archipelago',size:1040}),true);assert.equal(e.game.world.options.layout,'archipelago');assert.equal(e.game.testMode,true);assert.equal(e.game.awaitingStart,false);assert.equal(e.game.state.paused,true);
  assert.equal(saveGame(e.game),false);assert.deepEqual(villageSlots(),saved,'Lab saves never replace primary, backup or protected real-village bytes');assert.equal(JSON.stringify(real.state),before);
  await e.endTestSession();assert.equal(e.game,real);assert.equal(e.originalGame,null);assert.equal(real.testMode,false);assert.equal(JSON.stringify(real.state),before);assert.equal(e.lifecycleReport().busy,false);
 }finally{e?.autosave.dispose();globalThis.localStorage=old;}
});
test('a failed durable save never creates a disposable copy or reports test entry success',async()=>{
 const real=setup();real.state.paused=true;
 const held=JSON.stringify(encodeGame(real)),storage=new Map(villageKeys.map(k=>[k,held])),old=globalThis.localStorage;let e,writes=0;
 globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem(){writes++;throw new Error('full');}};
 try{
  e=engineFixture(real);const state=real.state,before=structuredClone(real.state),epoch=e.sessionEpoch,slots=[...storage.entries()];
  const accepted=await e.startTestSession();assert.equal(accepted,false);assert.ok(writes>0,'the real durable commit must actually be attempted');
  assert.equal(e.game,real);assert.equal(e.game.state,state);assert.equal(e.sessionEpoch,epoch);assert.equal(e.originalGame,null);assert.equal(e.originalWorkerHost,null);assert.equal(real.testMode,false);assert.deepEqual(e.rebuilt,[],'no disposable scene is prepared or installed');
  assert.deepEqual([...storage.entries()],slots,'failed writes preserve all held durable bytes');assert.equal(storage.has(SAVE_KEY+':test-lab'),false);assert.equal(e.lifecycleReport().busy,false);assert.equal(e.lifecycleReport().last,null);
  const message='Save your village successfully before entering test mode';assert.equal(real.state.banner,message);
  // Failure feedback is intentionally visible. Assert every state field, with
  // only these two exact banner writes expected; the original is already paused.
  before.banner=message;before.bannerT=5;assert.deepEqual(real.state,before);
 }finally{e?.autosave.dispose();globalThis.localStorage=old;}
});
test('night pacing advances the whole simulation faster while pause still freezes time',()=>{
 const g=setup();g.state.paused=false;g.isNight=()=>false;const day=g.state.time;g.step(.1);const dayDelta=g.state.time-day;
 g.isNight=()=>true;const night=g.state.time;g.step(.1);assert.ok(Math.abs((g.state.time-night)/dayDelta-1.6)<.001);
 g.state.paused=true;const paused=g.state.time;g.step(.1);assert.equal(g.state.time,paused);assert.deepEqual(g.simulationErrors,[]);
});
test('outbound trade envoys walk to the settlement and report at arrival; duplicate dispatch is blocked',()=>{
 const g=setup();g.state.units=[];g.state.buildings=[];g.world.heights.fill(4);g.height=()=>4;g.vision.fill(0);
 const own=g.makeBld('townhall',0,0,0),foreign=g.makeBld('townhall',40,0,1);g.state.buildings=[own,foreign];const u=g.spawnUnit('worker',15,0,0);g.rebuildWalk();
 // This actual adult witnesses the nearby hall, then still has to walk to its
 // solid-building frontage and hold a meeting; fog alone invents no endpoint.
 g.state.time=2;g.updateVision(0);
 const initialX=u.x;g.tribe(1).hostile=false;assert.equal(sendDelegation(g,1,'trade',u),true,g.state.banner);assert.equal(sendDelegation(g,1,'trade',u),false);
 assert.ok(g.state.observedSettlements?.some(m=>m.observer===0&&m.owner===1&&m.siteId===foreign.id&&m.witnessId===u.id&&m.active),'dispatch uses a physically witnessed endpoint');
 assert.equal(g.state.tradeReports?.find(r=>r.team===1),undefined);
 for(let i=0;i<1000&&u.envoy?.phase!=='return';i++){g.state.time+=.1;g.navBudget=15;delegationAI(g,u,.1);}
 assert.ok(g.state.tradeReports?.find(r=>r.team===1));assert.equal(u.envoy.phase,'return');assert.ok(u.x>initialX,'the same envoy actually walked to the meeting');assert.ok(g.buildingWorkReached(u,foreign));
});
