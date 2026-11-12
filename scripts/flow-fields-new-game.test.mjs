import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {flowFieldsEnabled,setFlowFieldsEnabled} from '../src/game/flowFields.ts';
import {seaSurfaceY} from '../src/game/localWater.ts';
import {advanceTide,seaOnlyTides} from '../src/game/tides.ts';

test('flow fields are on for a new game and stay off when an old save is loaded',()=>{
  const fresh=new Game();fresh.reset(4,18,{size:1040,layout:'pangaea'});
  assert.equal(flowFieldsEnabled(fresh),true);
  const historic=encodeGame(fresh);validateGameSave(historic);
  // the switch is in-memory, not a save field, so a loaded village keeps historic A*
  const loaded=decodeGame(JSON.parse(JSON.stringify(historic)));
  assert.equal(flowFieldsEnabled(loaded),false);
  // a further new reset turns them back on
  const again=new Game();again.reset(7,18,{size:1040,layout:'continents'});
  assert.equal(flowFieldsEnabled(again),true);
  // the operator can still force them off
  setFlowFieldsEnabled(again,false);assert.equal(flowFieldsEnabled(again),false);
});

test('the sea mesh sits at waterY + seaTideY (inland meshes stay on the weather level)',()=>{
  const g=new Game();g.reset(4,18,{size:1040,layout:'pangaea',tideVersion:2});g.enterIsland();
  assert.equal(seaOnlyTides(g),true);
  g.state.time=180; // mid-cycle so the tide is not necessarily 0
  advanceTide(g);
  const mesh=seaSurfaceY(g.world);
  assert.equal(mesh,g.world.waterY+(g.world.seaTideY??0));
  assert.equal(g.world.waterY,g.world.baseWaterY); // weather-only for v2 at clear default
  assert.ok((g.world.seaTideY??0)!==0||mesh===g.world.waterY,'seaTideY is applied when the tide is non-zero, or both are zero together');
});
