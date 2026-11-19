import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game} from '../src/game/sim.ts';
import {newTreatyWatch,watchTreaties} from '../src/ui/treatySting.ts';
function world(){const g=new Game();g.reset(42,10);g.enterIsland();for(const t of g.state.tribes)if(t.id!==0)t.hostile=false;return g;}
test('nothing is announced on load or when nothing changes',()=>{
 const g=world(),w=newTreatyWatch();g.tribe(1).hostile=true;assert.deepEqual(watchTreaties(g,w),[]);assert.deepEqual(watchTreaties(g,w),[]);
});
test('war, truce, alliance and its end each get one distinct real line and sound',()=>{
 const g=world(),w=newTreatyWatch();watchTreaties(g,w);const n=g.tribe(1).name;
 g.tribe(1).hostile=true;assert.deepEqual(watchTreaties(g,w),[{line:`${n} and your village are now at war`,sfx:'horn'}]);
 g.tribe(1).hostile=false;assert.deepEqual(watchTreaties(g,w),[{line:`Truce with ${n} — the fighting stops`,sfx:'trade'}]);
 g.state.alliances={version:1,nextReviewAt:0,pacts:[{id:1,a:0,b:1,phase:'active',formedAt:0,commonEnemy:2,reason:'x',relief:[]}]};
 assert.deepEqual(watchTreaties(g,w),[{line:`Alliance sworn with ${n}`,sfx:'age'}]);
 g.state.alliances.pacts[0].phase='broken';assert.deepEqual(watchTreaties(g,w),[{line:`The alliance with ${n} has ended`,sfx:'lose'}]);
});
test('capitulation fronts involving the player sting once per real phase change',()=>{
 const g=world(),w=newTreatyWatch();watchTreaties(g,w);const n=g.tribe(2).name;
 g.state.capitulation={version:1,fronts:[{id:9,defenderTeam:2,attackerTeam:0,phase:'pressed'}]};assert.deepEqual(watchTreaties(g,w),[]);
 g.state.capitulation.fronts[0].phase='capitulated';assert.deepEqual(watchTreaties(g,w),[{line:`${n} offers to capitulate`,sfx:'age'}]);
 assert.deepEqual(watchTreaties(g,w),[]);
 g.state.capitulation.fronts[0].phase='accepted';assert.deepEqual(watchTreaties(g,w),[{line:`${n} has capitulated to you`,sfx:'age'}]);
});
test('mounted in the HUD root and uses the normal news card',()=>{
 assert.match(readFileSync(new URL('../src/ui/HudRoot.tsx',import.meta.url),'utf8'),/<TreatySting engine=\{engine\}\/>/);
 assert.match(readFileSync(new URL('../src/ui/TreatySting.tsx',import.meta.url),'utf8'),/g\.banner\(stings\.map/);
});
