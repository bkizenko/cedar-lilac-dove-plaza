import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {SAVE_KEY,FOW} from '../src/game/constants.ts';
import {encodeGame,decodeGame,gameSnapshot,validateGameSave} from '../src/game/persistence.ts';
import {saveTestLabGame,loadTestLabGame} from '../src/game/save.ts';
import {serializeStoredSave,parseStoredSave} from '../src/game/storageCodec.ts';

// Real generated seed-0 terrain and residents. No terrain, observation,
// clock, actor-position, movement or observer-method overrides.
const fresh=()=>{const g=new Game();g.reset(0,undefined,{size:1040,layout:'continents'});g.enterIsland();g.updateVision(0);return g;};
const copy=v=>JSON.parse(JSON.stringify(v));
const count=v=>v.reduce((n,x)=>n+(x!==0?1:0),0);
const memory=()=>{const slots=new Map();return{slots,getItem:k=>slots.get(k)??null,setItem:(k,v)=>slots.set(k,String(v))};};
const observed=g=>({vision:Array.from(g.observedVision()),age:Array.from(g.observedVisionAge())});
const expectFog=(g,fog)=>{assert.deepEqual(Array.from(g.observedVision()),fog.vision);assert.deepEqual(Array.from(g.observedVisionAge()),fog.age);};

// Saving the actual live Game exercises snapshot + normal strict validators;
// no fabricated Game-shaped stub can make this test pass.
test('real Test Lab reveal toggles twice without permanently exploring unknown terrain',()=>{
 const g=fresh(),fog=observed(g),state=copy(encodeGame(g).state);
 assert.ok(count(g.vision)>0&&count(g.vision)<FOW*FOW);
 for(let i=0;i<2;i++){
  g.testMode=true;g.revealMap=true;g.updateVision(0);
  assert.equal(count(g.vision),FOW*FOW);expectFog(g,fog);
  const beforeVision=g.vision.slice(),beforeAge=g.visAge.slice();
  for(const raw of [gameSnapshot(g),encodeGame(g)]){
   assert.deepEqual(raw.vision,fog.vision);assert.deepEqual(raw.visAge,fog.age);
   assert.doesNotThrow(()=>validateGameSave(copy(raw)));
  }
  assert.deepEqual(g.vision,beforeVision,'serialization leaves displayed overlay untouched');
  assert.deepEqual(g.visAge,beforeAge);assert.deepEqual(copy(encodeGame(g).state),state,'reveal/save never changes village ownership');
  g.revealMap=false;g.updateVision(0);assert.deepEqual(Array.from(g.vision),fog.vision);assert.deepEqual(Array.from(g.visAge),fog.age);
 }
});

test('real Test Lab on/off checkpoints strictly reload and resume reveal while original village slots remain byte-identical',()=>{
 const original=fresh(),originalRaw=serializeStoredSave(encodeGame(original)),originalState=copy(original.state),storage=memory();
 for(const key of [SAVE_KEY,SAVE_KEY+':bak',SAVE_KEY+':protected'])storage.setItem(key,originalRaw);
 const originals=new Map(storage.slots),g=decodeGame(parseStoredSave(originalRaw));g.testMode=true;g.revealMap=true;g.updateVision(0);const fog=observed(g);
 assert.equal(saveTestLabGame(g,storage),true);
 const raw=parseStoredSave(storage.getItem(SAVE_KEY+':test-lab'));assert.equal(raw.testLabRevealMap,true);assert.deepEqual(raw.vision,fog.vision);assert.deepEqual(raw.visAge,fog.age);assert.doesNotThrow(()=>validateGameSave(raw));
 let resumed=loadTestLabGame(storage);assert.equal(resumed.state.paused,true);assert.equal(resumed.revealMap,true);assert.equal(count(resumed.vision),FOW*FOW,'paused loaded lab displays overlay immediately');expectFog(resumed,fog);
 assert.equal(saveTestLabGame(resumed,storage),true);resumed=loadTestLabGame(storage);expectFog(resumed,fog);
 resumed.revealMap=false;resumed.updateVision(0);assert.deepEqual(Array.from(resumed.vision),fog.vision);
 assert.equal(saveTestLabGame(resumed,storage),true);const off=loadTestLabGame(storage);assert.equal(off.revealMap,false);assert.deepEqual(Array.from(off.vision),fog.vision);expectFog(off,fog);
 for(const [key,value] of originals)assert.equal(storage.getItem(key),value,'original village slot untouched: '+key);
 assert.deepEqual(copy(original.state),originalState,'the original live village is also unchanged');
});

test('real resident movement under reveal persists only actual observations and remembered ages through strict save/load',()=>{
 const g=fresh(),storage=memory(),u=g.state.units.find(u=>u.team===0&&u.type==='worker'),start={x:u.x,z:u.z};
 const before=observed(g),beforeCount=count(g.vision);g.testMode=true;g.revealMap=true;g.updateVision(0);
 g.clearSelect();g.selectEntity(u);g.issueMove(u.x+40,u.z);
 for(let i=0;i<150;i++){g.state.paused=false;g.step(.2);}
 assert.deepEqual(g.simulationErrors,[]);assert.ok(Math.hypot(u.x-start.x,u.z-start.z)>5,'an actual resident moved');
 const fog=observed(g);assert.ok(count(fog.vision)>beforeCount,'actual movement observed additional ground');assert.ok(count(fog.vision)<FOW*FOW,'overlay never enters observed fog');assert.ok(fog.age.some(x=>x>0),'departed sight leaves actual remembered fog age');assert.notDeepEqual(fog,before);
 assert.equal(saveTestLabGame(g,storage),true);const resumed=loadTestLabGame(storage);expectFog(resumed,fog);assert.equal(count(resumed.vision),FOW*FOW);
 resumed.revealMap=false;resumed.updateVision(0);expectFog(resumed,fog);assert.deepEqual(Array.from(resumed.vision),fog.vision);assert.deepEqual(Array.from(resumed.visAge),fog.age);
 assert.equal(saveTestLabGame(resumed,storage),true);expectFog(loadTestLabGame(storage),fog);
});

test('real reset discards the prior reveal buffer and reveal outside Test Lab remains ineffective',()=>{
 const g=fresh();g.testMode=true;g.revealMap=true;g.updateVision(0);assert.equal(count(g.vision),FOW*FOW);
 g.reset(1,undefined,{size:1040,layout:'continents'});g.enterIsland();g.testMode=false;g.revealMap=true;g.updateVision(0);
 assert.ok(count(g.vision)>0&&count(g.vision)<FOW*FOW);assert.equal(g.observedVision(),g.vision,'new game does not retain prior observation buffer');assert.equal(g.observedVisionAge(),g.visAge);
 const fog=observed(g);g.revealMap=false;g.updateVision(0);expectFog(g,fog);assert.doesNotThrow(()=>validateGameSave(copy(encodeGame(g))));
});
