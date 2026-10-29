import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {rebalanceRivalLabor,rivalDevelopmentPlan} from '../src/game/rivalDevelopment.ts';
function fixture(){
 const g=new Game();g.reset(345,2);g.enterIsland();g.world.heights.fill(4);g.state.time=100;
 g.state.buildings=[g.makeBld('townhall',0,38,1)];g.state.units=[];
 g.state.trees=g.state.trees.slice(0,3);g.state.trees.forEach((n,i)=>Object.assign(n,{x:10+i*5,z:55,amount:100}));
 g.state.forage=g.state.forage.slice(0,5);g.state.forage.forEach((n,i)=>Object.assign(n,{x:i*4,z:55,amount:100}));
 for(let i=0;i<10;i++){g.spawnUnit('worker',i,52,1);const u=g.state.units.at(-1);u.order='gather';u.job='food';u.node=g.state.forage[Math.floor(i/2)];}
 Object.assign(g.tribe(1),{food:1000,wood:0,stone:0});g.rebuildWalk();return g;
}
test('a fed rival redirects a bounded crew from established food jobs to development without stealing cargo or missions',()=>{
 const g=fixture(),loaded=g.state.units[0],envoy=g.state.units[1];loaded.carry=8;loaded.carryType='food';envoy.scout={legs:0,returning:false};
 rebalanceRivalLabor(g,1);const crew=g.state.units.filter(u=>u.order==='gather'&&u.job==='wood');
 assert.equal(crew.length,2);assert.equal(loaded.carry,8);assert.equal(loaded.job,'food');assert.ok(envoy.scout);
 assert.ok(g.state.units.filter(u=>u.job==='food').length>=5);rebalanceRivalLabor(g,1);assert.equal(g.state.units.filter(u=>u.job==='wood').length,2);
 const poor=fixture();poor.tribe(1).food=10;rebalanceRivalLabor(poor,1);assert.ok(poor.state.units.every(u=>u.job==='food'));
});
test('rival field planning accounts for local yields, population, winter and losses',()=>{
 const g=fixture();const field=g.makeBld('farm',15,70,1);g.state.buildings.push(field);
 field.fertility=1;const rich=rivalDevelopmentPlan(g,1).foodFields;
 field.fertility=.45;const poor=rivalDevelopmentPlan(g,1).foodFields;assert.ok(poor>rich);
 for(let i=0;i<10;i++)g.spawnUnit('worker',0,50,1);
 assert.ok(rivalDevelopmentPlan(g,1).foodFields>poor);
});


test('idle food workers with full stores can rejoin material work instead of remaining permanently assigned to food',()=>{
 const g=fixture();for(const u of g.state.units){u.order='idle';u.node=null;u.workReason='Food stores full';}
 g.state.units[0].jobLock=true;
 rebalanceRivalLabor(g,1);
 assert.equal(g.state.units.filter(u=>u.job==='wood'&&u.order==='gather').length,2);
 assert.equal(g.state.units[0].job,'food','explicit orders remain protected');
 assert.ok(g.state.units.filter(u=>u.job==='food').length>=5);
});
