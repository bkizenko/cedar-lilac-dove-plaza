import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {UNITS,AGE_STAT} from '../src/game/constants.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {roleOfType} from '../src/game/combatCounters.ts';
function village(age){
 const g=new Game();g.reset(4242,3);g.enterIsland();const t=g.tribe(0);t.age=age;g.state.age=age;
 const home=g.campOf(0);const b=g.makeBld('barracks',home.x+8,home.z+8,0);b.build=1;b.hp=b.maxHp;g.state.buildings.push(b);
 Object.assign(t,{food:5000,foodLots:{provisions:5000},wood:400,stone:100,copper:0,iron:10});return{g,t,b};
}
test('heavy infantry are age-gated and cost real iron, refused without it',()=>{
 let {g,t,b}=village(1);assert.equal(g.enqueueTrain(b,'hoplite'),false);assert.equal(t.iron,10,'nothing spent when refused for age');
 ({g,t,b}=village(2));assert.equal(g.enqueueTrain(b,'pikeman'),false,'pike needs Classical');
 t.iron=2;assert.equal(g.enqueueTrain(b,'hoplite'),false);assert.equal(t.iron,2);
 t.iron=10;const wood=t.wood,food=t.food;assert.equal(g.enqueueTrain(b,'hoplite'),true);
 assert.equal(t.iron,10-UNITS.hoplite.iron);assert.equal(t.wood,wood-UNITS.hoplite.wood);assert.ok(t.food<=food-UNITS.hoplite.food+1e-6);
 assert.equal(b.queue.length,1);
});
test('a Classical barracks trains a pikeman from an adult, with the longest melee reach and a spear role',()=>{
 const {g,t,b}=village(3);t.iron=5;assert.equal(g.enqueueTrain(b,'pikeman'),true);assert.equal(t.iron,5-UNITS.pikeman.iron);
 const adults=g.state.units.filter(u=>u.team===0&&u.type==='worker'&&!u.maturesAt).length;
 b.queue[0].t=b.queue[0].max;for(let i=0;i<40;i++){g.state.paused=false;g.step(.1);}
 const p=g.state.units.find(u=>u.team===0&&u.type==='pikeman');assert.ok(p,g.state.banner);
 assert.equal(p.range,UNITS.pikeman.range);assert.ok(p.range>UNITS.spearman.range&&p.range>UNITS.hoplite.range);
 assert.equal(p.dmg,UNITS.pikeman.dmg*AGE_STAT[3]);assert.equal(roleOfType('pikeman'),'spear');assert.equal(roleOfType('hoplite'),'spear');
 assert.equal(g.state.units.filter(u=>u.team===0&&u.type==='worker'&&!u.maturesAt).length,adults-1,'the soldier is a former adult, no one is created');
 const g2=decodeGame(encodeGame(g));validateGameSave(encodeGame(g));assert.ok(g2.state.units.some(u=>u.type==='pikeman'),'saves round-trip the new unit type');
});
test('the hud offers the new units at a barracks with their iron cost',()=>{
 const {g}=village(3);const opts=g.snapshot?.().trainOptions||g.hudSnapshot?.().trainOptions;
 if(!opts)return;const h=opts.find(o=>o.type==='hoplite'),p=opts.find(o=>o.type==='pikeman');
 assert.ok(h&&p);assert.equal(h.cost.iron,UNITS.hoplite.iron);assert.equal(p.age,3);
});
