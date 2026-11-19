import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game} from '../src/game/sim.ts';
import {newBuildWatch,watchBuildFinishes,BEAT_MAX_AT_ONCE} from '../src/ui/buildFinishBeat.ts';
function world(){const g=new Game();g.reset(42,10);g.enterIsland();const [a,b]=g.state.units.filter(u=>u.team===0);return {g,a,b};}
test('a loaded village is learned silently; a real finish names the residents who worked the site',()=>{
 const {g,a,b}=world(),w=newBuildWatch();assert.deepEqual(watchBuildFinishes(g,w),[],'nothing celebrated on load');
 const hut=g.makeBld('hut',a.x+8,a.z,0);hut.build=.5;g.state.buildings.push(hut);
 a.order='build';a.node=hut;b.order='build';b.node=hut;assert.deepEqual(watchBuildFinishes(g,w),[]);
 hut.build=1;a.order='idle';a.node=null;b.order='idle';b.node=null;
 const lines=watchBuildFinishes(g,w);assert.equal(lines.length,1);assert.match(lines[0],/finished — built by .+ and .+/);
 assert.deepEqual(watchBuildFinishes(g,w),[],'once');
});
test('a rush of finishes (many at once) plays no beat, and a fresh game resets the watch',()=>{
 const {g,a}=world(),w=newBuildWatch();watchBuildFinishes(g,w);
 for(let i=0;i<BEAT_MAX_AT_ONCE+1;i++){const h=g.makeBld('hut',a.x+8+i*6,a.z,0);h.build=1;g.state.buildings.push(h);}
 assert.deepEqual(watchBuildFinishes(g,w),[]);
 const other=world();const h=other.g.makeBld('hut',other.a.x+8,other.a.z,0);h.build=1;other.g.state.buildings.push(h);
 assert.deepEqual(watchBuildFinishes(other.g,w),[],'switching to another village learns it silently');
});
test('the beat is mounted and uses the normal news card and a soft sound',()=>{
 const src=readFileSync(new URL('../src/ui/BuildFinishBeat.tsx',import.meta.url),'utf8');assert.match(src,/onSfx\?\.\('hammer'\)/);assert.match(src,/g\.banner\(lines\.join/);
 assert.match(readFileSync(new URL('../src/ui/HudRoot.tsx',import.meta.url),'utf8'),/<BuildFinishBeat engine=\{engine\}\/>/);
});
test('a builder speaks with pride at the hearth for a short while after a real finish',async()=>{
 const {hearthStories}=await import('../src/ui/hearthStories.ts');const {PRIDE_SECONDS}=await import('../src/ui/buildFinishBeat.ts');
 const {g,a}=world(),w=newBuildWatch();g.state.lifeHistory=[];for(const u of g.state.units)u.workReason=undefined;watchBuildFinishes(g,w);
 const hut=g.makeBld('hut',a.x+8,a.z,0);hut.build=.5;g.state.buildings.push(hut);a.order='build';a.node=hut;watchBuildFinishes(g,w);
 hut.build=1;a.order='idle';a.node=null;watchBuildFinishes(g,w);
 assert.ok(hearthStories(g).some(l=>/: “Our new .+ stands — good work\.”$/.test(l)));
 g.state.time+=PRIDE_SECONDS+1;assert.ok(!hearthStories(g).some(l=>/stands — good work/.test(l)),'pride fades');
});
