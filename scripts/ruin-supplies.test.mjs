import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {spoilRuinSupplies,raidLootAI} from '../src/game/warfare.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(345);g.enterIsland();g.world.heights.fill(4);g.world.biomes=[];g.state.weather='clear';g.state.units=[];g.state.buildings=[];const b=g.makeBld('warehouse',20,38,1);b.hp=0;b.lootTeam=0;b.lootClaimed=true;b.raidLoot={food:100,wood:40,stone:20};g.state.buildings.push(b);g.rebuildWalk();return {g,b};}
test('exposed ruin food spoils faster in summer than winter while building materials remain finite',()=>{
 const {g,b}=fixture();g.state.time=600;spoilRuinSupplies(g,450);const summer=b.raidLoot.food;
 b.raidLoot.food=100;g.state.time=1500;spoilRuinSupplies(g,450);
 assert.ok(summer< b.raidLoot.food);assert.ok(b.raidLoot.food<100);assert.equal(b.raidLoot.wood,40);assert.equal(b.raidLoot.stone,20);
});
test('ruin decay respects time subdivision, saved quantities and live buildings',()=>{
 const {g,b}=fixture();g.state.time=600;spoilRuinSupplies(g,30);const once=b.raidLoot.food;
 b.raidLoot.food=100;for(let i=0;i<30;i++)spoilRuinSupplies(g,1);assert.ok(Math.abs(once-b.raidLoot.food)<1e-8);
 const copy=decodeGame(encodeGame(g));assert.equal(copy.state.buildings[0].raidLoot.food,b.raidLoot.food);
 const before=b.raidLoot.food;b.hp=10;spoilRuinSupplies(g,450);assert.equal(b.raidLoot.food,before);
 b.hp=0;for(const dt of [-1,0,NaN,Infinity])spoilRuinSupplies(g,dt);assert.equal(b.raidLoot.food,before);
});
test('collecting spoiled loot transfers only what remains and further ruin decay never alters carried food',()=>{
 const {g,b}=fixture();g.state.time=600;spoilRuinSupplies(g,450);const remaining=b.raidLoot.food;
 const u=g.spawnUnit('spearman',20,40,0);u.order='attackmove';u.pillage=1;
 const stock=g.tribe(0).food;assert.equal(raidLootAI(g,u,.1),true);
 assert.equal(u.carry,12);assert.equal(b.raidLoot.food+u.carry,remaining);assert.equal(g.tribe(0).food,stock);
 spoilRuinSupplies(g,450);assert.equal(u.carry,12);assert.ok(b.raidLoot.food<remaining-12);
});

test('the running simulation decays abandoned supplies without simulation exceptions',()=>{
 const {g,b}=fixture();g.checkVictory=()=>{};g.state.time=600;g.state.paused=false;
 const before=b.raidLoot.food;for(let i=0;i<30;i++)g.step(1/3);
 assert.ok(b.raidLoot.food<before);assert.ok(b.raidLoot.food>0);assert.deepEqual(g.simulationErrors,[]);
});
