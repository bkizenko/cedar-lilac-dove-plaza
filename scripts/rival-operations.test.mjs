import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {scoutKnowledge} from '../src/game/scouting.ts';
import {planRivalRaid,rivalOperationIntent,dispatchRivalOperation,prepareRivalDefense,rivalMilitaryTarget} from '../src/game/rivalOperations.ts';
function fixture(){
 const g=new Game();g.reset(123456,2);g.enterIsland();g.world.heights.fill(4);g.height=()=>4;
 g.state.buildings=[g.makeBld('townhall',0,0,1),g.makeBld('warehouse',100,0,0)];g.state.units=[];g.state.time=800;g.state.rivalKnowledge=[];
 Object.assign(g.tribe(1),{alive:true,hostile:false,ally:false,trust:0,tension:.7,aggro:.8,expand:.5,food:1000,wood:50,stone:10,recoveryUntil:0,compactUntil:0,lastRaid:0});
 for(let i=0;i<12;i++){const u=g.spawnUnit('worker',8+i%3*2,8+Math.floor(i/3)*2,1);if(i<6){u.militia=true;u.dmg=12;u.range=2.6;}}
 g.rebuildWalk();return g;
}
function discover(g){const u=g.state.units.at(-1),old={x:u.x,z:u.z};u.x=100;u.z=0;scoutKnowledge(g,u);Object.assign(u,old);}
test('raids require discovered targets and use local defense rather than distant global armies',()=>{
 const g=fixture();assert.equal(planRivalRaid(g,1,1000),null);discover(g);
 for(let i=0;i<30;i++){const u=g.spawnUnit('worker',400,400,0);u.militia=true;u.dmg=20;}
 const plan=planRivalRaid(g,1,1000);assert.ok(plan);assert.equal(plan.metrics.observedDefenders,0);assert.ok(plan.fighters.length>=2);
 const first=g.state.units.find(u=>u.team===0);first.x=100;first.z=0;first.dmg=200;
 assert.equal(planRivalRaid(g,1,1000),null,'visible local force deters an unfavorable attack');
});
test('a real raid leaves armed guards and workers; neutral relations change only on arrival',()=>{
 const g=fixture();discover(g);const pop=g.state.units.length,food=g.tribe(1).food;
 assert.equal(rivalOperationIntent(g,1,1000),'raid');assert.equal(dispatchRivalOperation(g,1,1000),true);
 const sent=g.state.units.filter(u=>u.pillage===0);assert.ok(sent.length>=2);assert.ok(g.state.units.some(u=>u.militia&&u.pillage!==0));assert.ok(g.state.units.some(u=>!u.militia&&u.order!=='attackmove'));
 assert.equal(g.tribe(1).hostile,false);assert.equal(g.state.units.length,pop);assert.equal(g.tribe(1).food,food);
 const u=sent[0],target=u.target,start=Math.hypot(u.x-target.x,u.z-target.z);g.vision.fill(0);
 for(let i=0;i<1200&&!g.tribe(1).hostile;i++){g.state.time+=.1;g.navBudget=10;g.combatAI(u,.1);}
 assert.equal(g.tribe(1).hostile,true);assert.ok(Math.hypot(u.x-target.x,u.z-target.z)<start-40,'neutral raiders physically approach their own known target even outside player vision');
 assert.equal(dispatchRivalOperation(g,1,1000),false,'cooldown prevents repeated orders');
});
test('peace, scarcity, committed jobs, and attacks at home prevent an outbound raid',()=>{
 const g=fixture();discover(g);const t=g.tribe(1);t.compactUntil=1000;assert.equal(rivalOperationIntent(g,1,1000),'trade');t.compactUntil=0;
 assert.equal(planRivalRaid(g,1,100),null);
 for(const u of g.state.units.filter(u=>u.militia))u.husbandryWork={pen:1,paused:false};
 assert.equal(planRivalRaid(g,1,1000),null);
 for(const u of g.state.units)u.husbandryWork=undefined;
 assert.equal(rivalOperationIntent(g,1,1000),'raid');g.spawnUnit('worker',10,0,3);
 assert.equal(rivalOperationIntent(g,1,1000),'defend','actual enemies at home take priority over profitable raiding');
});
test('Stone Age defense consumes existing weapons and equips existing working adults',()=>{
 const g=fixture();for(const u of g.state.units)u.militia=false;
 Object.assign(g.tribe(1),{age:0,spears:2,bows:0,blades:0});const before=g.state.units.length;
 assert.equal(prepareRivalDefense(g,1,1000),true);assert.equal(g.tribe(1).spears,1);assert.equal(g.state.units.length,before);assert.equal(g.state.units.find(u=>u.militia).type,'worker');
 const small=rivalMilitaryTarget(g,1);for(let i=0;i<28;i++)g.spawnUnit('worker',12,12,1);assert.ok(rivalMilitaryTarget(g,1)>small);
});
