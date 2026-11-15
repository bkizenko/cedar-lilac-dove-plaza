import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {prepareRivalDefense} from '../src/game/rivalOperations.ts';
import {UNITS} from '../src/game/constants.ts';
import {BRONZE_RULES} from '../src/game/bronze.ts';
function fixture(age){
 const g=new Game();g.reset(123456,2);g.enterIsland();g.world.heights.fill(4);g.height=()=>4;
 g.state.buildings=[g.makeBld('townhall',0,0,1),g.makeBld('barracks',14,0,1),g.makeBld('forge',-14,0,1),g.makeBld('warehouse',100,0,0)];g.state.units=[];g.state.time=800;g.state.rivalKnowledge=[];
 Object.assign(g.tribe(1),{alive:true,hostile:false,ally:false,trust:0,tension:.7,aggro:.8,expand:.5,food:2000,foodLots:{provisions:2000},wood:300,stone:40,iron:20,copper:0,age,recoveryUntil:0,compactUntil:0,lastRaid:0,spears:0,bows:0,blades:0});
 for(let i=0;i<14;i++)g.spawnUnit('worker',4+i%3*2,4+Math.floor(i/3)*2,1);
 g.rebuildWalk();return g;
}
test('an Iron Age rival kits an existing adult as a hoplite from real iron, food and timber',()=>{
 const g=fixture(2),t=g.tribe(1),n=g.state.units.length,iron=t.iron,wood=t.wood;
 assert.equal(prepareRivalDefense(g,1,1000),true);
 assert.equal(g.state.units.length,n,'no soldier is spawned');
 assert.equal(g.state.units.filter(u=>u.type==='hoplite').length,1);
 assert.equal(t.iron,iron-UNITS.hoplite.iron);assert.equal(t.wood,wood-UNITS.hoplite.wood);
});
test('a Classical rival fields pikemen, and without iron it does not',()=>{
 const g=fixture(3);assert.equal(prepareRivalDefense(g,1,1000),true);assert.equal(g.state.units.filter(u=>u.type==='pikeman').length,1);
 const h=fixture(3);h.tribe(1).iron=0;prepareRivalDefense(h,1,1000);assert.equal(h.state.units.filter(u=>u.type==='pikeman').length,0);
});
test('a Bronze Age rival equips bronze-edged blades and casts bronze from tin and copper at its forge',()=>{
 const g=fixture(1),t=g.tribe(1);t.iron=0;t.items={bronzeBlade:2};
 assert.equal(prepareRivalDefense(g,1,1000),true);assert.equal(t.items.bronzeBlade,1);
 const sw=g.state.units.find(u=>u.militia);assert.ok(sw.dmg>0);
 const h=fixture(1),r=h.tribe(1);r.iron=0;r.copper=BRONZE_RULES.alloyCopper;r.items={tin:BRONZE_RULES.alloyTin,charcoal:3};
 prepareRivalDefense(h,1,1000);
 assert.ok(h.state.production?.projects.some(p=>p.team===1&&p.recipe==='castBronze'),JSON.stringify(h.state.production?.projects));
});
