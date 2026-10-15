import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {digStone,prospectQuarry,staffQuarry,quarryReport} from '../src/game/mining.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(seed=345){
 const g=new Game();g.reset(seed);g.enterIsland();g.world.heights.fill(12);g.state.buildings=[g.makeBld('townhall',-25,0,0),g.makeBld('quarry',0,0,0)];g.state.units=[];g.state.copper=[];g.state.iron=[];g.state.trees=[];g.state.forage=[];g.state.stones=[];g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();g.clockState=()=>({period:'Afternoon'});
 const b=g.state.buildings[1];b.excavation={remaining:400,dug:0,quality:1};const u=g.spawnUnit('worker',2,0,0);return {g,b,u};
}
test('excavation exposes finite site-specific veins only after enough actual stone work',()=>{
 let found=0,empty=0;
 for(const seed of [1,42,99,100,200,345,123456,98765]){
  const {g,b,u}=fixture(seed);prospectQuarry(g,b);assert.equal(g.state.copper.length+g.state.iron.length,0);
  for(let i=0;i<80;i++){u.carry=0;u.carryType=null;digStone(g,u,b);}
  assert.equal(b.excavation.dug,80);assert.equal(g.state.iron.length,0);
  if(g.state.copper.length)found++;else empty++;
  for(let i=0;i<120;i++){u.carry=0;u.carryType=null;digStone(g,u,b);}
  const counts=[g.state.copper.length,g.state.iron.length];const total=g.state.copper.reduce((s,n)=>s+n.amount,0)+g.state.iron.reduce((s,n)=>s+n.amount,0);
  for(let i=0;i<10;i++)prospectQuarry(g,b);assert.deepEqual([g.state.copper.length,g.state.iron.length],counts);assert.ok(total<=240);
  for(const n of [...g.state.copper,...g.state.iron]){assert.ok(g.walkable(n.x,n.z));n.amount=0;}
  b.excavation.prospected=0;prospectQuarry(g,b);assert.equal([...g.state.copper,...g.state.iron].reduce((s,n)=>s+n.amount,0),0,'rebuilding/rechecking cannot refill an exhausted vein');
 }
 assert.ok(found>0&&empty>0,'mountains differ');
});
test('discovered ore and prospect flags survive saves and malformed flags are rejected',()=>{
 const {g,b}=fixture();b.excavation.dug=200;prospectQuarry(g,b);const raw=encodeGame(g),r=decodeGame(raw);
 assert.deepEqual(r.state.buildings[1].excavation,b.excavation);assert.deepEqual(r.state.copper,g.state.copper);
 raw.state.buildings[1].excavation.prospected=4;assert.throws(()=>decodeGame(raw));
});
test('quarry ore orders require exposed accessible material and physically deliver it',()=>{
 const {g,b,u}=fixture(1);b.excavation.dug=200;prospectQuarry(g,b);
 const kind=g.state.copper.length?'copper':'iron';assert.ok(g.state[kind].length);g.tribe(0).age=0;assert.equal(staffQuarry(g,b.id,kind),0);
 g.tribe(0).age=2;const before=g.tribe(0)[kind],supply=g.state[kind][0].amount;
 assert.equal(staffQuarry(g,b.id,kind),1);assert.equal(g.tribe(0)[kind],before);assert.match(quarryReport(g,b),/exposed/);
 for(let i=0;i<2400&&g.tribe(0)[kind]===before;i++){g.navBudget=10;g.state.time+=.1;g.workerAI(u,.1);}
 assert.ok(g.tribe(0)[kind]>before);assert.ok(g.state[kind][0].amount<supply);
});
