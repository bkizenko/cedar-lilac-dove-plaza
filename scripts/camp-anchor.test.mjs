import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {campAnchor,supplyDrops} from '../src/game/campAnchor.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {tickCommunities} from '../src/game/communities.ts';
function camp(){const g=new Game();g.reset(42,10,{size:1040,layout:'continents'});g.enterIsland();g.state.paused=false;g.state.conflict='quiet';return g;}
test('new societies start as unbuilt camps with finite provisions and no automatic pen',()=>{
 const g=camp();for(const c of g.world.camps){assert.equal(g.state.buildings.filter(b=>b.team===c.team&&b.hp>0).length,0);assert.ok(g.popNow(c.team)>=5);assert.equal(g.tribe(c.team).food,120);assert.equal(g.nearestDrop(c.x,c.z,c.team)?.kind,'camp');}
 assert.equal(g.state.buildings.some(b=>b.team===0&&b.type==='pen'),false);
 tickCommunities(g,31);assert.equal(g.state.units.some(u=>u.team===0&&u.foundingJourney),false);
});
test('camp delivery and recall physically return goods exactly once and roundtrip without a hall',()=>{
 const g=camp(),c=campAnchor(g,0),u=g.state.units.find(u=>u.team===0&&u.type==='worker');
 Object.assign(u,{x:c.x,z:c.z,y:c.y,carry:7,carryType:'wood',order:'return'});const before=g.tribe(0).wood;
 g.workerAI(u,.1);assert.equal(u.carry,0);assert.equal(g.tribe(0).wood,before+7);g.workerAI(u,.1);assert.equal(g.tribe(0).wood,before+7);
 Object.assign(u,{x:c.x,z:c.z,carry:3,carryType:'stone',recalled:true,order:'move'});const stone=g.tribe(0).stone;g.workerAI(u,.1);assert.equal(u.recalled,undefined);assert.equal(g.tribe(0).stone,stone+3);
 const copy=decodeGame(encodeGame(g));assert.equal(copy.nearestDrop(c.x,c.z,0).kind,'camp');assert.equal(copy.tribe(0).wood,before+7);assert.deepEqual(copy.world.heights,g.world.heights);
});
test('hall loss preserves society and its cargo return anchor; only loss of people collapses it',()=>{
 const g=camp(),team=1,c=campAnchor(g,team);g.rivalTick(team,.1);assert.equal(g.tribe(team).alive,true);
 const hall=g.makeBld('townhall',c.x,c.z,team);g.state.buildings.push(hall);assert.equal(supplyDrops(g,team).some(d=>d.kind==='camp'),false);
 hall.hp=0;g.rivalTick(team,.1);assert.equal(g.tribe(team).alive,true);assert.ok(campAnchor(g,team));assert.equal(supplyDrops(g,team).some(d=>d.kind==='camp'),true);
 for(const u of g.state.units.filter(u=>u.team===team))u.hp=0;g.rivalTick(team,.1);assert.equal(g.tribe(team).alive,false);
});
test('legacy v9 opening architecture remains available',()=>{const g=new Game();g.reset(42,9);assert.ok(g.state.buildings.some(b=>b.team===0&&b.type==='townhall'));});
test('a carrier walks home before camp goods enter stock, without teleporting cargo',()=>{
 const g=camp(),c=campAnchor(g,0),u=g.state.units.find(u=>u.team===0&&u.type==='worker');
 const point=g.findDryFoundation('hut',c.x+14,c.z,20,(x,z)=>g.workBoard.connected(g,c.x,c.z,x,z)&&Math.hypot(x-c.x,z-c.z)>8);
 assert.ok(point,'reachable dry approach');Object.assign(u,{x:point.x,z:point.z,y:g.height(point.x,point.z),order:'return',carry:9,carryType:'wood'});
 const wood=g.tribe(0).wood;g.workerAI(u,.1);assert.equal(g.tribe(0).wood,wood);assert.equal(u.carry,9);
 for(let i=0;i<1200&&u.carry;i++){g.state.time+=.1;g.navBudget=10;g.workerAI(u,.1);}
 assert.equal(u.carry,0);assert.equal(g.tribe(0).wood,wood+9);assert.ok(Math.hypot(u.x-c.x,u.z-c.z)<5);
});
