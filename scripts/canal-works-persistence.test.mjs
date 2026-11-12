import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {validCanalWorks,canalWorks} from '../src/game/canalBreach.ts';
import {nearestFreshWater} from '../src/game/waterWorks.ts';

function world(seed=2,layout='archipelago'){const g=new Game();g.reset(seed,18,{size:1040,layout});g.enterIsland();g.testMode=true;g.revealMap=true;g.updateVision(0);Object.assign(g.state,{weather:'clear',weatherT:1e5,raidT:1e5});return g;}

test('saves without canalWorks still load; a commissioned aqueduct and canal persist through the validator',()=>{
  const plain=new Game();plain.reset(4,18,{size:1040,layout:'pangaea'});const historic=encodeGame(plain);
  assert.equal(historic.state.canalWorks,undefined);validateGameSave(historic);
  const reloaded=decodeGame(JSON.parse(JSON.stringify(historic)));assert.equal(reloaded.state.canalWorks,undefined);

  const g=world(),src=nearestFreshWater(g,49.6,265.6,60),aq=g.commissionAqueduct(src,{x:-71.6,z:195.6});
  assert.equal(aq.ok,true,aq.reason);assert.ok(aq.buildingIds.length>0);
  // a second commission of the same plan is refused if the ground/layout changed, and a bad canal is refused
  const refused=g.commissionCanal({x:-12,z:-180},{x:44,z:-180});assert.equal(refused.ok,false);

  const raw=encodeGame(g);validateGameSave(raw);assert.equal(validCanalWorks(raw.state,1040),true);
  const back=decodeGame(JSON.parse(JSON.stringify(raw)));
  assert.equal(back.state.buildings.filter(b=>aq.buildingIds.includes(b.id)).length,aq.buildingIds.length);
  const mid=aq.buildingIds[0],a=g.state.buildings.find(b=>b.id===mid),b=back.state.buildings.find(k=>k.id===mid);
  assert.ok(a&&b);assert.equal(back.height(a.x,a.z),g.height(a.x,a.z));
});

test('malformed canalWorks records are refused; preview equals commit on Game.commissionCanal',()=>{
  const g=new Game();g.reset(13,18,{size:1560,layout:'archipelago'});g.enterIsland();g.testMode=true;g.revealMap=true;g.updateVision(0);
  const A={x:335,z:382},B={x:371,z:382};
  const r=g.commissionCanal(A,B,0,[A,B]);assert.equal(r.ok,true,r.reason);assert.ok(r.canalId);
  assert.equal(canalWorks(g).length,1);const enc=encodeGame(g);validateGameSave(enc);
  const bad=structuredClone(enc);bad.state.canalWorks=[{version:1,id:1,team:0,channel:[],breach:[{x:1,z:1,depth:3,mouth:true}]}];
  assert.throws(()=>validateGameSave(bad));
  const missing=structuredClone(enc);missing.state.buildings.find(b=>b.canalWork).canalWork={id:99,role:'breach'};
  assert.throws(()=>validateGameSave(missing));
});
