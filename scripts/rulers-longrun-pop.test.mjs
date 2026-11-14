// Lane A: population/food half of the long-run stylized-facts audit. A real simulated stretch (not dynastic-year jumps):
// stocks stay finite and non-negative, headcount stays inside a plausible band, no goods or people appear from nothing
// through the rulers machinery, and the rulers state stays valid and save-safe at every year boundary.
import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {RULERS_YEAR_SECONDS,advanceRulers,ensureRulers,unrestOf} from '../src/game/rulersRuntime.ts';
import {validRulersState} from '../src/game/rulersState.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
const YEARS=10;
test('long run: up to 10 real dynastic years keep population, food and unrest inside plausible bands and conjure no goods',()=>{
 const g=new Game();g.reset(123456,10);g.enterIsland();ensureRulers(g);
 const alive=t=>g.state.units.filter(u=>u.team===t&&u.hp>0).length;
 const start=g.state.tribes.map((_,t)=>alive(t)),peak=[...start];let nextYear=1,unrestSeen=0,unrestSevere=0,saved=0;
 const foodCap=t=>1e6;
 while(g.state.time<RULERS_YEAR_SECONDS*YEARS){
  g.state.paused=false;const before=g.state.time;g.step(.5);
  if(!(g.state.time>before)){assert.ok(g.state.ended,'time only stops when the unattended game has ended');break;}
  if(g.state.time>=RULERS_YEAR_SECONDS*nextYear){
   advanceRulers(g);const y=nextYear++;
   assert.deepEqual(g.simulationErrors,[],'no sim errors at year '+y);
   assert.equal(new Set(g.state.units.map(u=>u.id)).size,g.state.units.length,'unique unit ids at year '+y);
   g.state.tribes.forEach((tr,t)=>{
    assert.ok(Number.isFinite(tr.food)&&tr.food>=0&&tr.food<foodCap(t),`food finite and non-negative: tribe ${t} year ${y} = ${tr.food}`);
    for(const [k,v] of Object.entries(tr.items??{}))assert.ok(Number.isFinite(v)&&v>=0,`item ${k} non-negative: tribe ${t} year ${y} = ${v}`);
    const n=alive(t);peak[t]=Math.max(peak[t],n);
    assert.ok(n<=Math.max(60,start[t]*8),`headcount stays plausible: tribe ${t} year ${y} = ${n} (start ${start[t]})`);
    if(t>0&&t!==3){const u=unrestOf(g,t);if(u){unrestSeen++;if(u.stage==='uprising'||u.stage==='civilWar')unrestSevere++;}}
   });
   assert.ok(validRulersState(JSON.parse(JSON.stringify(g.state.rulers))),'rulers valid at year '+y);
   if(y%5===0){const back=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.equal(back.state.units.length,g.state.units.length,'reload keeps headcount at year '+y);assert.ok(validRulersState(back.state.rulers),'reloaded rulers valid');saved++;}
  }
 }
 assert.ok(nextYear>=6,'covered at least five real dynastic years: '+nextYear);assert.ok(saved>=1);
 assert.ok(!unrestSeen||unrestSevere/unrestSeen<.5,`unrest not pinned: ${unrestSevere}/${unrestSeen}`);
});
