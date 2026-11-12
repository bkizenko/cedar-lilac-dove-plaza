import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {createHash} from 'node:crypto';
const hash=w=>createHash('sha256').update(JSON.stringify(w,(_k,v)=>ArrayBuffer.isView(v)?Array.from(v):v)).digest('hex');

test('absent world option flags stay historic: old saves validate and reload unchanged',()=>{
  const g=new Game();g.reset(4,18,{size:1040,layout:'pangaea'});
  const raw=encodeGame(g);assert.equal(raw.state.worldOptions.riverProfileVersion,undefined);
  assert.equal(raw.state.worldOptions.tideVersion,undefined);assert.equal(raw.state.worldOptions.landformLabelVersion,undefined);
  validateGameSave(raw);const back=decodeGame(JSON.parse(JSON.stringify(raw)));
  assert.equal(hash(back.world),hash(g.world));assert.equal(back.state.worldOptions.riverProfileVersion,undefined);
  assert.equal(back.state.worldOptions.tideVersion,undefined);assert.equal(back.state.worldOptions.landformLabelVersion,undefined);
});

test('riverProfileVersion 2, tideVersion 1|2 and landformLabelVersion 2 validate and round-trip; other values are refused',()=>{
  const g=new Game();g.reset(4,18,{size:1040,layout:'pangaea',riverProfileVersion:2,tideVersion:2,landformLabelVersion:2});
  const raw=encodeGame(g);assert.equal(raw.state.worldOptions.riverProfileVersion,2);
  assert.equal(raw.state.worldOptions.tideVersion,2);assert.equal(raw.state.worldOptions.landformLabelVersion,2);
  validateGameSave(raw);const back=decodeGame(JSON.parse(JSON.stringify(raw)));
  assert.equal(back.state.worldOptions.riverProfileVersion,2);assert.equal(back.state.worldOptions.tideVersion,2);assert.equal(back.state.worldOptions.landformLabelVersion,2);
  assert.equal(hash(back.world),hash(g.world));
  const g1=new Game();g1.reset(4,18,{size:1040,layout:'pangaea',tideVersion:1});validateGameSave(encodeGame(g1));
  for(const [key,value] of [['riverProfileVersion',1],['riverProfileVersion',3],['tideVersion',0],['tideVersion',3],['tideVersion',true],['landformLabelVersion',1],['landformLabelVersion','2']]){
    const bad=structuredClone(raw);bad.state.worldOptions[key]=value;assert.throws(()=>validateGameSave(bad),`${key}=${value}`);}
});
