import test from 'node:test';import assert from 'node:assert/strict';import {registerHooks} from 'node:module';
import {Game} from '../src/game/sim.ts';import {saveGame} from '../src/game/save.ts';
import {sendDelegation,delegationAI} from '../src/game/delegations.ts';
registerHooks({resolve(specifier,context,next){if(specifier.startsWith('@/'))return next(new URL(`../src/${specifier.slice(2)}.ts`,import.meta.url).href,context);return next(specifier,context);}});
const {Engine}=await import('../src/game/engine.ts');
function setup(){const g=new Game();g.reset(123456);g.enterIsland();return g;}
test('restarting and configuring a test world preserves the exact real village and durable save',()=>{
 const real=setup(),e=Object.create(Engine.prototype);e.game=real;e.originalGame=null;e.pushHud=()=>{};e.restoreVillage=function(g){this.game=g;};e.homeLook=()=>{};e.keyboard={groups:new Map()};e.audio={unlock(){}};e.view={rebuild(){}};e.canvas={focus(){}};
 const before=JSON.stringify(real.state),storage=new Map(),old=globalThis.localStorage;
 globalThis.localStorage={getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)};
 try{
  assert.equal(e.startTestSession(),true);assert.equal(e.game.testMode,true);const saved=[...storage.entries()];e.game.tribe(0).food=9999;
  e.restart();assert.equal(e.game.testMode,true);assert.equal(e.originalGame,real);assert.equal(e.game.awaitingStart,true);
  e.configureNewWorld({layout:'archipelago',size:1040});assert.equal(e.game.world.options.layout,'archipelago');assert.equal(e.game.testMode,true);
  assert.equal(saveGame(e.game),false);assert.deepEqual([...storage.entries()],saved);assert.equal(JSON.stringify(real.state),before);
  e.endTestSession();assert.equal(e.game,real);assert.equal(e.originalGame,null);assert.equal(real.testMode,false);assert.equal(real.tribe(0).food,JSON.parse(before).tribes[0].food);
 }finally{globalThis.localStorage=old;}
});
test('a failed durable save never creates a disposable copy or reports test entry success',()=>{
 const real=setup(),e=Object.create(Engine.prototype);e.game=real;e.originalGame=null;const old=globalThis.localStorage;
 globalThis.localStorage={getItem(){return null;},setItem(){throw new Error('full');}};
 try{assert.equal(e.startTestSession(),false);assert.equal(e.game,real);assert.equal(e.originalGame,null);}finally{globalThis.localStorage=old;}
});
test('night pacing advances the whole simulation faster while pause still freezes time',()=>{
 const g=setup();g.state.paused=false;g.isNight=()=>false;const day=g.state.time;g.step(.1);const dayDelta=g.state.time-day;
 g.isNight=()=>true;const night=g.state.time;g.step(.1);assert.ok(Math.abs((g.state.time-night)/dayDelta-1.6)<.001);
 g.state.paused=true;const paused=g.state.time;g.step(.1);assert.equal(g.state.time,paused);assert.deepEqual(g.simulationErrors,[]);
});
test('outbound trade envoys walk to the settlement and report at arrival; duplicate dispatch is blocked',()=>{
 const g=setup();g.state.units=[];g.state.buildings=[];g.world.heights.fill(4);g.height=()=>4;g.vision.fill(2);
 const own=g.makeBld('townhall',0,0,0),foreign=g.makeBld('townhall',40,0,1);g.state.buildings=[own,foreign];const u=g.spawnUnit('worker',9,0,0);g.rebuildWalk();
 g.tribe(1).hostile=false;assert.equal(sendDelegation(g,1,'trade'),true);assert.equal(sendDelegation(g,1,'trade'),false);
 assert.equal(g.state.tradeReports?.find(r=>r.team===1),undefined);
 for(let i=0;i<1000&&u.envoy?.phase!=='return';i++){g.state.time+=.1;g.navBudget=15;delegationAI(g,u,.1);}
 assert.ok(g.state.tradeReports?.find(r=>r.team===1));assert.equal(u.envoy.phase,'return');
});
