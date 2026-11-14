import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {ensureRulers,journeyPermit,ERA_SCOUT_LEGS} from '../src/game/rulersRuntime.ts';
import {rulersOf} from '../src/game/rulersState.ts';
const fixture=(on=true)=>{const g=new Game();g.reset(123456,10);g.enterIsland();g.state.worldOptions={...(g.state.worldOptions||{}),rulersVersion:on?1:0};ensureRulers(g);return g;};
test('era-gated scout legs: band < chiefdom < state, only a cap; old/off worlds keep the old 5; nothing minted',()=>{
 assert.ok(ERA_SCOUT_LEGS.band<ERA_SCOUT_LEGS.chiefdom&&ERA_SCOUT_LEGS.chiefdom<ERA_SCOUT_LEGS.state);
 const g=fixture();const units=g.state.units.length;
 for(const tier of ['band','chiefdom','state']){
  const sh=g.state.rulers.societies['1'];sh.civ.polity.tier=tier;
  const p=journeyPermit(g,1,'explore');assert.ok(p,'permit when rulers on');assert.equal(p.legs,ERA_SCOUT_LEGS[tier]);assert.equal(p.allow,true);
 }
 assert.equal(g.state.units.length,units,'nobody spawned');
 assert.ok(rulersOf(JSON.parse(JSON.stringify({rulers:g.state.rulers}))),'round trip valid');
 const h=fixture(false);assert.equal(journeyPermit(h,1,'explore'),null,'off: null so scouting keeps 5 legs');
});
test('era-gated scout provisioning: a band turns back earlier and needs more in store; a state provisions the leg; cap only',async()=>{
 const {ERA_SCOUT_PROVISION}=await import('../src/game/rulersRuntime.ts');
 const P=ERA_SCOUT_PROVISION;assert.ok(P.band.recall>P.chiefdom.recall&&P.chiefdom.recall>P.state.recall);assert.ok(P.band.launch>=P.chiefdom.launch&&P.chiefdom.launch>P.state.launch);
 const g=fixture();const food=JSON.stringify(g.state.stock||null),units=g.state.units.length;
 for(const tier of ['band','chiefdom','state']){g.state.rulers.societies['1'].civ.polity.tier=tier;const p=journeyPermit(g,1,'explore');assert.equal(p.recall,P[tier].recall);assert.ok(p.reserve<=450&&p.reserve>=300);}
 assert.equal(g.state.units.length,units);assert.equal(JSON.stringify(g.state.stock||null),food,'no goods minted');
 assert.equal(journeyPermit(fixture(false),1,'explore'),null,'off: old 180s recall and 450 reserve');
});
