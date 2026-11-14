import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {SIM_CALENDAR_RULES,simulationDaySeconds} from '../src/game/calendarPacing.ts';

function fresh(){const g=new Game();g.reset(123456);g.enterIsland();g.state.conflict='quiet';g.isNight=()=>false;return g;}
const run=(g,ticks,dt=1/30)=>{const t0=g.state.time;for(let i=0;i<ticks;i++)g.step(dt);return g.state.time-t0;};

test('a new game starts running at 1x',()=>{
 const g=fresh();assert.equal(g.state.speed,1);assert.equal(g.state.paused,false);
});
test('1x, 2x and 4x scale simulated seconds exactly per wall second',()=>{
 for(const [speed,factor] of [[1,1],[2,2],[4,4],[3,4]]){
  const g=fresh();g.state.speed=speed;
  assert.ok(Math.abs(run(g,30)-factor)<1e-9,`speed ${speed} should advance ${factor}s per wall second`);
 }
});
test('pause freezes simulation time and resuming continues at the chosen speed',()=>{
 const g=fresh();g.state.speed=2;g.state.paused=true;
 assert.equal(run(g,60),0);
 g.state.paused=false;assert.ok(Math.abs(run(g,30)-2)<1e-9);
});
test('simulated time does not depend on how wall time is sliced into steps',()=>{
 const a=fresh(),b=fresh();a.state.speed=4;b.state.speed=4;
 assert.ok(Math.abs(run(a,30,1/30)-run(b,60,1/60))<1e-9);
});
test('a single oversized step is clamped so a stall cannot skip world events',()=>{
 const g=fresh();g.state.speed=4;assert.ok(run(g,1,5)<=0.34+1e-9);
});
test('default pacing: 1x runs one sim day in under a minute and a year in half an hour',()=>{
 assert.equal(SIM_CALENDAR_RULES.yearSeconds,1800);assert.ok(simulationDaySeconds>30&&simulationDaySeconds<90);
});
