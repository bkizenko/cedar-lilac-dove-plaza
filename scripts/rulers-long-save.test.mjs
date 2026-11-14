import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {ensureRulers,advanceRulers,RULERS_YEAR_SECONDS} from '../src/game/rulersRuntime.ts';
import {rulersOf} from '../src/game/rulersState.ts';
const pick=g=>JSON.stringify({y:g.state.rulers.year,gr:g.state.rulers.grudges??[],oc:g.state.rulers.orphanCare??null,w:g.state.rulers.wards??null,soc:Object.fromEntries(Object.entries(g.state.rulers.societies).map(([k,v])=>[k,v.dynasty.generation]))});
test('long run: rulers, grudges, orphanCare and wards survive save/reload at years 10/25/50 with no drift, and a save without the optional fields loads',()=>{
 let g=new Game();g.reset(123456,10);g.enterIsland();g.state.worldOptions={...(g.state.worldOptions||{}),rulersVersion:1};ensureRulers(g);
 for(const year of [10,25,50]){
  g.state.time=Math.max(g.state.time,year*RULERS_YEAR_SECONDS+1);advanceRulers(g);
  assert.ok(g.state.rulers.year>=year,'advanced to year '+year);
  const before=pick(g);const loaded=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));
  assert.ok(rulersOf(loaded.state),'valid at year '+year);assert.equal(pick(loaded),before,'no drift at year '+year);g=loaded;
 }
 const raw=JSON.parse(JSON.stringify(encodeGame(g)));const r=raw.state?.rulers??raw.rulers;
 if(r){delete r.grudges;delete r.orphanCare;delete r.wards;delete r.hallEvents;}
 const old=decodeGame(raw);assert.ok(old,'old-shape save (no optional fields) loads');assert.ok(rulersOf(old.state));
});
