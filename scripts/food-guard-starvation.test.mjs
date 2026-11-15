import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {reserveSeconds,foodDemand} from '../src/game/settlement.ts';
import {foodGuardActive} from '../src/game/foodGuard.ts';

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
