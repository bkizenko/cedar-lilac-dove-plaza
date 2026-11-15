import test from 'node:test';import assert from 'node:assert/strict';
import {BUILDINGS} from '../src/game/constants.ts';
import {newWars} from '../src/ui/hearth/warPopupModel.ts';
import {Game} from '../src/game/sim.ts';
import {ensureRulers} from '../src/game/rulersRuntime.ts';
test('mills wait for their historical ages',()=>{assert.equal(BUILDINGS.watermill.age,3);assert.equal(BUILDINGS.windmill.age,4);});
test('war popup: a loaded save never shouts, a new war does once',()=>{
 const first=newWars(null,[2]);assert.deepEqual(first.fresh,[]);
 const again=newWars(first.next,[2]);assert.deepEqual(again.fresh,[]);
 assert.deepEqual(newWars(again.next,[2,3]).fresh,[3]);
});
test('rulers: a society table that lags the tribe list is filled in, not hidden',()=>{
 const g=new Game();g.reset(7);g.state.worldOptions={...g.state.worldOptions,rulersVersion:2};
 const r=ensureRulers(g);delete r.societies['0'];
 assert.ok(ensureRulers(g).societies['0'].dynasty.house);
});
