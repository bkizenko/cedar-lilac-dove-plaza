// Smoke on landed main: a long headless run with every new system on must not throw, produce NaN, or corrupt the rulers/decision state.
import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {rulersOf} from '../src/game/rulersState.ts';
import {councilModel} from '../src/game/rulersView.ts';
const SECONDS=Number(process.env.SMOKE_SECONDS||1200);
for(const seed of [123456,987654]){
 test('main smoke seed '+seed,()=>{
  const g=new Game();g.reset(seed,10);g.enterIsland();g.setAutoWork?.(true);
  let steps=0;while(g.state.time<SECONDS){g.step(.34);steps++;}
  const bad=[];for(const t of g.state.tribes)for(const k of ['food','wood','stone'])if(!Number.isFinite(t[k]))bad.push(k);
  for(const u of g.state.units)if(!Number.isFinite(u.x)||!Number.isFinite(u.z)||!Number.isFinite(u.hp))bad.push('unit '+u.id);
  assert.deepEqual(bad,[]);
  assert.ok(rulersOf(g.state),'rulers state valid');
  const c=councilModel(g);assert.ok(c.enabled&&c.ruler);JSON.parse(JSON.stringify(g.state.rulers));
  assert.ok(g.state.units.some(u=>u.team===0&&u.hp>0),'player village still has people');
 });
}
