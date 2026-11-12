import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {acceptPrisonerSurrender,releasePrisoner} from '../src/game/captivity.ts';
import {queueConstruction} from '../src/game/constructionQueue.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
// Controlled dry/finite initial state; no mid-run body/terrain/steering overrides.
function fixture(guardX=10){
 const g=new Game();g.reset(345,14);g.enterIsland();g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.world.waterBodies=[];g.world.waterfalls=[];g.world.waterHeights=undefined;g.world.ecology=undefined;
 for(const k of ['units','buildings','trees','stones','forage','fish','wildlife','copper','iron'])g.state[k]=[];
 const home=g.makeBld('townhall',0,40,0),site=g.makeBld('hearth',20,40,0);site.build=.5;site.hp=70;g.state.buildings.push(home,site);
 const u=g.spawnUnit('worker',8,40,0),guard=g.spawnUnit('spearman',guardX,42,1);u.order='hold';guard.order='hold';g.tribe(1).hostile=false;
 assert.equal(queueConstruction(g,site,[u]).accepted,true);g.vision.fill(2);g.rebuildWalk();return{g,u,guard,site};
}
test('real surrender clears former player construction intent and strict save works before/after release',()=>{
 const{g,u,guard,site}=fixture(),hp=u.hp,stocks=g.state.tribes.map(t=>({food:t.food,wood:t.wood,stone:t.stone}));assert.ok(u.constructionQueue.sites.includes(site.id));
 const accepted=acceptPrisonerSurrender(g,u,1);assert.equal(accepted.accepted,true,accepted.reason);assert.equal(u.team,1);assert.equal(u.prisoner.guardId,guard.id);assert.equal(u.constructionQueue,undefined);assert.equal(u.buildOrder,undefined);assert.equal(u.hp,hp);
 assert.deepEqual(g.state.tribes.map(t=>({food:t.food,wood:t.wood,stone:t.stone})),stocks);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
 assert.equal(releasePrisoner(g,u.id),true);assert.equal(u.team,0);assert.equal(u.repatriating,undefined);assert.equal(u.recalled,true);assert.equal(u.prisoner.phase,'released');assert.equal(u.constructionQueue,undefined);assert.equal(u.hp,hp);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('rejected distant surrender retains the exact owner construction intent and physical goods',()=>{
 const{g,u}=fixture(40),queue=structuredClone(u.constructionQueue),before=JSON.stringify(g.state.tribes);
 assert.equal(acceptPrisonerSurrender(g,u,1).accepted,false);assert.equal(u.team,0);assert.deepEqual(u.constructionQueue,queue);assert.equal(u.prisoner,undefined);assert.equal(JSON.stringify(g.state.tribes),before);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
