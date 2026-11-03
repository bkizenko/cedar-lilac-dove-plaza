import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {beginProduction} from '../src/game/production.ts';
import {prepareSocietyHandover} from '../src/game/communityHandover.ts';
import {settlePeace,peaceIssue} from '../src/game/peace.ts';
import {gameSnapshot,validateGameSave} from '../src/game/persistence.ts';
import {workRuntime} from '../src/game/workRuntime.ts';

// Validation-boundary fixture only: intentionally enormous finite seed stores.
// This is not attainable-campaign economy or cultivation evidence.
test('late strict-preflight numeric overflow leaves paid live state and coordinator unchanged',()=>{
 const g=new Game();g.reset(345,10);g.enterIsland();g.world.heights.fill(4);g.world.waterBodies=[];g.world.waterHeights=undefined;g.state.units=[];g.state.buildings=[];g.state.autoWorkEnabled=false;
 const sourceHall=g.makeBld('townhall',0,0,1),hearth=g.makeBld('hearth',12,0,1),own=g.makeBld('townhall',100,0,0);g.state.buildings=[sourceHall,hearth,own];
 const u=g.spawnUnit('worker',6,0,1);u.order='hold';u.homeHall=sourceHall.id;for(let i=0;i<8;i++){const s=g.spawnUnit('spearman',16+i%2,10+Math.floor(i/2),0);s.order='hold';}
 for(const team of[0,1])Object.assign(g.tribe(team),{seeds:1e12,wood:30,stone:10,food:100,foodLots:{provisions:100},items:team===1?{rawMeat:8}: {}});
 g.rebuildWalk();g.vision.fill(2);assert.equal(beginProduction(g,'cookMeat',hearth.id,u.id),true,g.state.banner);g.makeHostile(1);assert.equal(peaceIssue(g,1,'annexation'),null);
 validateGameSave(gameSnapshot(g));const before=JSON.stringify(g.state),coordinator=workRuntime(g),job=coordinator.activeJob(u.id);
 const prepared=prepareSocietyHandover(g,1);assert.equal(prepared.accepted,false,'two individually valid 1e12 seed stores cannot be silently clipped or encoded over 1e12');assert.equal(JSON.stringify(g.state),before);assert.equal(workRuntime(g),coordinator);assert.deepEqual(coordinator.activeJob(u.id),job);
 const state=structuredClone(g.state);assert.equal(settlePeace(g,1,'annexation'),false);const after=structuredClone(g.state);for(const key of['banner','bannerT']){delete state[key];delete after[key];}assert.deepEqual(after,state);validateGameSave(gameSnapshot(g));
});
