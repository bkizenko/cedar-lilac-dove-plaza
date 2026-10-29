import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {ancientSiteYield} from '../src/game/discovery.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(seed){const g=new Game();g.reset(seed,2);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,40,0)];g.world.megaliths=[{x:25,z:40}];g.rebuildWalk();const u=g.spawnUnit('worker',25,40,0);return {g,u};}
for(const seed of [345,346,347])test(`ancient yield ${seed} is carried home once, never remotely granted or rerolled`,()=>{
 const {g,u}=fixture(seed),reward=ancientSiteYield(seed,0),t=g.tribe(0),before=t[reward.kind],seeds=t.seeds||0;
 assert.equal(g.lootMegaliths(u),true);assert.equal(u.carry,reward.amount);assert.equal(t[reward.kind],before);assert.equal(t.age,0);
 assert.equal(g.lootMegaliths(u),false);assert.equal(u.carry,reward.amount);
 const loaded=decodeGame(encodeGame(g)),person=loaded.state.units.find(p=>p.id===u.id);assert.equal(person.carry,reward.amount);assert.equal(loaded.looted.has(0),true);
 for(let i=0;i<600&&u.recalled;i++){g.navBudget=10;g.state.time+=.1;g.workerAI(u,.1);}
 assert.equal(u.carry,0);assert.equal(t[reward.kind],before+reward.amount);
 if(reward.kind==='food'){assert.equal(t.seeds,seeds+4);assert.equal(t.cropSamples.grain,4);}
 u.x=25;u.z=40;assert.equal(g.lootMegaliths(u),false);
});
test('full hands do not discard cargo or consume an unclaimed discovery',()=>{
 const {g,u}=fixture(345);u.carry=5;u.carryType='wood';assert.equal(g.lootMegaliths(u),false);assert.equal(u.carry,5);assert.equal(g.looted.size,0);
 u.carry=0;u.hp=0;assert.equal(g.lootMegaliths(u),false);assert.equal(g.looted.size,0);
});
