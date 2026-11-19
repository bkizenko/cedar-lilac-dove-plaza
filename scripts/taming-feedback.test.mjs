import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game} from '../src/game/sim.ts';
import {watchTaming} from '../src/ui/tamingFeedback.ts';
test('a real refusal reads as a consequence naming the handler and the bait spent; a success names who tamed it',()=>{
 const g=new Game();g.reset(42,10);g.enterIsland();const u=g.state.units.find(u=>u.team===0),w={refusals:0,successes:0};
 assert.equal(watchTaming(g,w),null,'learned on first look');assert.equal(watchTaming(g,w),null);
 const h=g.tribe(0).domestication={version:1,paidAttempts:1,baitSpent:6,woodSpent:0,successes:0,refusals:1,abandoned:0,arrivals:0,recent:[{purpose:'pen',paidWood:0,animalId:5,handlerId:u.id,species:'goat',attempt:1,paidFood:6,at:1,outcome:'refused'}]};
 const r=watchTaming(g,w);assert.equal(r.sfx,'invalid');assert.match(r.line,/^The wild goat shied away from .+ — 6 food of bait spent; it will be calmer next time$/);
 assert.equal(watchTaming(g,w),null,'once');
 h.successes=1;h.recent.push({purpose:'pen',paidWood:0,animalId:5,handlerId:u.id,species:'goat',attempt:2,paidFood:6,at:2,outcome:'success'});
 assert.match(watchTaming(g,w).line,/calmed a wild goat and is leading it home$/);
 assert.match(readFileSync(new URL('../src/ui/BuildFinishBeat.tsx',import.meta.url),'utf8'),/watchTaming\(g,taming\)/);
});
