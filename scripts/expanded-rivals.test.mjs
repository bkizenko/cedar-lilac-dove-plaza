import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {generateWorld} from '../src/game/worldgen.ts';import {isRivalTeam,rivalCountForArea} from '../src/game/factions.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';import {scoutKnowledge} from '../src/game/scouting.ts';import {tickCommunities} from '../src/game/communities.ts';
import {quoteShipment} from '../src/game/barter.ts';import {AGE_COST} from '../src/game/constants.ts';
test('habitable area selects two through four rivals, while legacy maps retain two',()=>{
 assert.equal(rivalCountForArea(500000),2);assert.equal(rivalCountForArea(560000),3);assert.equal(rivalCountForArea(600000),4);
 const counts=new Set();for(const seed of [123456,1,4]){const world=generateWorld(seed,3),rivals=world.camps.filter(c=>isRivalTeam(c.team));counts.add(rivals.length);assert.ok(rivals.length>=2&&rivals.length<=4);for(const a of world.camps)for(const b of world.camps)if(a!==b)assert.ok(Math.hypot(a.x-b.x,a.z-b.z)>170);}
 assert.deepEqual([...counts].sort(),[2,3,4]);assert.equal(generateWorld(4,2).camps.length,3);
});
test('all four generated societies have people, production, identity and saved knowledge',()=>{
 const g=new Game();g.reset(4,3);g.enterIsland();const rivals=g.state.tribes.filter(t=>isRivalTeam(t.id));assert.equal(rivals.length,4);assert.equal(new Set(rivals.map(t=>t.name)).size,4);assert.equal(new Set(rivals.map(t=>t.color)).size,4);
 for(const t of rivals){assert.ok(g.popNow(t.id)>=5);assert.ok(g.state.buildings.some(b=>b.team===t.id&&b.type==='townhall'&&g.finished(b)));assert.ok(g.state.buildings.some(b=>b.team===t.id&&b.type==='warehouse'));scoutKnowledge(g,g.state.units.find(u=>u.team===t.id));}
 tickCommunities(g,31);g.state.contacts=[1,2,3,4,5];g.vision.fill(0);g.paintTerritory();assert.ok(g.territory.includes(4));assert.ok(g.territory.includes(5));assert.equal(g.snapshot().tribes.filter(t=>t.id!==0).length,0,'unknown societies stay hidden');
 const loaded=decodeGame(encodeGame(g));assert.equal(loaded.state.tribes.length,6);assert.deepEqual(loaded.state.rivalKnowledge,g.state.rivalKnowledge);assert.deepEqual(loaded.world.heights,g.world.heights);assert.deepEqual(loaded.state.buildings,JSON.parse(JSON.stringify(g.state.buildings)));
});
test('later faction IDs take part in trade, hostility and conquest checks',()=>{
 const g=new Game();g.reset(4,3);g.enterIsland();g.vision.fill(2);const t=g.tribe(5);Object.assign(t,{hostile:false,trust:1,wood:0,stone:500,tradeCd:0});g.tribe(0).wood=100;
 assert.ok(quoteShipment(g,5,'wood','stone',20).deal);g.makeHostile(5);assert.equal(g.isFoe(0,5),true);
 for(const team of [1,2,4]){g.tribe(team).alive=false;g.state.units=g.state.units.filter(u=>u.team!==team);}
 g.state.time=200;g.state.conquestAt=200;g.checkVictory();assert.equal(g.state.ended,null,'a living fourth rival prevents conquest');
 g.tribe(5).alive=false;g.state.units=g.state.units.filter(u=>u.team!==5);g.state.conquestAt=undefined;g.checkVictory();assert.equal(g.state.ended,null,'natural collapse never ends the world');g.state.conquestAt=200;g.checkVictory();assert.equal(g.state.ended,'win');
});
test('legacy saves preserve terrain, people and their existing number of societies',()=>{
 for(const version of [1,2]){const g=new Game();g.reset(345,version);g.enterIsland();const saved=encodeGame(g),r=decodeGame(saved);assert.equal(r.state.tribes.length,4);assert.equal(r.state.worldgenVersion,version);assert.deepEqual(r.world.heights,g.world.heights);assert.deepEqual(r.state.units.map(u=>[u.id,u.team,u.x,u.z]),g.state.units.map(u=>[u.id,u.team,u.x,u.z]));}
 assert.deepEqual(AGE_COST.slice(1).map(c=>c.pop),[50,75,100,125,150]);
});
