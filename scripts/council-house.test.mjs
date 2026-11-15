import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {councilModel} from '../src/game/rulersView.ts';
import {ensureRulers,rulerOf} from '../src/game/rulersRuntime.ts';
const fixture=(req)=>{const g=new Game();g.reset(123456,10,req);g.enterIsland();return g;};
test('new games always found a ruling house for the player society',()=>{
 for(const req of [undefined,{rulersVersion:1},{rulersVersion:2}]){
  const g=fixture(req);const c=councilModel(g);assert.equal(c.enabled,true);assert.ok(c.house&&c.house.name,'house named');assert.ok(c.house.family.length>0);assert.ok(rulerOf(g,0)?.house);
 }
});
test('ensureRulers refounds a missing houses table and a lagging society table',()=>{
 const g=fixture();delete g.state.rulers;assert.ok(ensureRulers(g));assert.ok(councilModel(g).house);
 const h=fixture();ensureRulers(h);delete h.state.rulers.societies['0'];ensureRulers(h);assert.ok(councilModel(h).house,'player house restored');
});
test('a save lacking rulersVersion reports rulers off, never throws, and is not rewritten',()=>{
 const g=fixture();delete g.state.worldOptions.rulersVersion;delete g.state.rulers;
 const c=councilModel(g);assert.equal(c.enabled,false);assert.equal(c.house,undefined);assert.equal(ensureRulers(g),null);assert.equal(g.state.rulers,undefined);assert.equal(g.state.worldOptions.rulersVersion,undefined);
 const none=fixture({rulersVersion:0});assert.equal(councilModel(none).enabled,false);
});
test('the no-house Council screen says why',async()=>{
 const {readFileSync}=await import('node:fs');const src=readFileSync(new URL('../src/ui/hearth/screens.tsx',import.meta.url),'utf8');
 assert.match(src,/No ruling house yet\. This village was saved before houses existed or was started with houses switched off/);
});
