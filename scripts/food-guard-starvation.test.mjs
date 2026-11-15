import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {reserveSeconds,foodDemand} from '../src/game/settlement.ts';
import {foodGuardActive,foodGuardPullHands} from '../src/game/foodGuard.ts';const await_import={foodGuardPullHands,foodGuardActive};

function fixture(count=6){
  const g=new Game();g.reset(42,10);g.enterIsland();g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.world.ecology=undefined;
  g.state.units=[];g.state.buildings=[];for(const k of ['trees','stones','forage','fish','copper','iron','wildlife'])g.state[k]=[];
  Object.assign(g.state,{autoWorkEnabled:true,laborPolicy:'balanced',time:950,weather:'clear',weatherT:10000,raidT:10000,visitorTimer:900,conflict:'quiet',birthT:10000,campSites:[{team:0,x:0,z:30}]});
  for(const t of g.state.tribes)t.thinkT=10000;
  Object.assign(g.tribe(0),{food:0,foodLots:{},wood:200,stone:100,items:{},seeds:12});g.tribe(0).survival.waterLiters=100;
  const hall=g.makeBld('townhall',0,30,0);hall.y=4;g.state.buildings=[hall];g.rebuildWalk();g.vision.fill(2);
  const people=[];for(let i=0;i<count;i++){const u=g.spawnUnit('worker',i*.5,36,0);Object.assign(u,{order:'idle',jobLock:false,y:4});people.push(u);}
  return {g,people};
}
const setReserve=(g,seconds)=>{const need=seconds*Math.max(.055,foodDemand(g,0));g.tribe(0).food=need;g.tribe(0).foodLots={provisions:need};g.state.time+=4;};
const foodJob=u=>u.foodRole===true||u.order==='gather'&&u.job==='food'||u.order==='explore'&&(u.searchJob==='food'||u.searchJob==='hunt')||u.huntOnly===true&&u.order!=='idle'||u.order==='gather'&&u.node&&('amount' in u.node)&&(u.node.kind==='forage'||u.node.kind==='fish');

test('starving village with a blocked hunt and idle hands gets food workers within bounded steps',()=>{
  const {g,people}=fixture(6);
  g.state.forage=[{id:g.id(),kind:'forage',x:-6,z:42,y:4,amount:80,maxAmount:80},{id:g.id(),kind:'forage',x:6,z:42,y:4,amount:80,maxAmount:80}];
  g.state.trees=[{id:g.id(),kind:'tree',x:10,z:44,y:4,amount:50,maxAmount:50}];
  if(!process.env.NOBLOCK)for(const u of people){u.blockedTask=987654;u.retryWorkAt=g.state.time+30;u.workReason='Hunting route blocked — seeking reachable food';}
  setReserve(g,200);
  assert.equal(foodGuardActive(g),true);
  let foodWorkers=0,steps=0;
  while(steps++<400){g.step(.3);const t=g.tribe(0);if(t.food<1){t.food=200*Math.max(.055,foodDemand(g,0));t.foodLots={provisions:t.food};}
    foodWorkers=people.filter(u=>u.hp>0&&foodJob(u)).length;if(foodWorkers>=2)break;}
  assert.ok(foodWorkers>=2,`only ${foodWorkers} food workers after ${steps} steps; reasons ${JSON.stringify(people.map(u=>[u.order,u.job,u.workReason]))}`);
});

test('guard pulls auto-assigned wood and build crews to food but leaves player-directed work alone',()=>{
  const {g,people}=fixture(6);
  g.state.forage=[{id:g.id(),kind:'forage',x:-6,z:42,y:4,amount:200,maxAmount:200},{id:g.id(),kind:'forage',x:6,z:42,y:4,amount:200,maxAmount:200}];
  g.state.trees=[{id:g.id(),kind:'tree',x:10,z:44,y:4,amount:500,maxAmount:500},{id:g.id(),kind:'tree',x:12,z:44,y:4,amount:500,maxAmount:500}];
  const [locked,builder,...auto]=people;
  Object.assign(locked,{jobLock:true,job:'wood'});
  setReserve(g,5000);
  for(const u of auto){u.order='gather';u.job='wood';u.node=g.state.trees[0];}
  Object.assign(locked,{order:'gather',node:g.state.trees[1]});
  builder.buildOrder=987654;builder.order='build';
  setReserve(g,100);
  const {foodGuardPullHands,foodGuardActive}=await_import;
  assert.equal(foodGuardActive(g),true);
  const moved=foodGuardPullHands(g);
  assert.ok(moved>=1,`moved ${moved}`);
  assert.equal(builder.buildOrder,987654,'ordered build untouched');assert.equal(builder.order,'build');
  for(let i=0;i<30;i++){g.step(.3);const t=g.tribe(0);if(t.food<1){t.food=100*Math.max(.055,foodDemand(g,0));t.foodLots={provisions:t.food};}}
  assert.equal(locked.job,'wood');assert.equal(locked.jobLock,true);
  assert.ok(auto.some(u=>u.job==='food'||foodJob(u)),'a pulled worker picked up food work');
});

test('workload meter reports blocked idle hands instead of hiding them behind a percentage',async()=>{
  const {measureVillageWorkload}=await import('../src/game/villageWorkload.ts');
  const {g,people}=fixture(5);setReserve(g,100);
  for(const u of people){u.order='hold';u.workReason='Hunting route blocked — seeking reachable food';}
  const r=measureVillageWorkload(g);
  assert.equal(r.idleBlocked.people,5,JSON.stringify(r.idleBlocked));
  assert.ok(r.idleBlocked.percentOfCapacity>50);
  assert.ok(r.blockedOrStuckPersonSeconds>=r.idleBlocked.capacityPersonSeconds);
  assert.ok(r.warnings.some(w=>/idle because their work is blocked/.test(w)));
});
