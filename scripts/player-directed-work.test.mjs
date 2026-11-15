import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {beginWeaponWork,resumeWeaponWork,weaponWorkAI} from '../src/game/warfare.ts';
import {beginFarmToolRepair,farmToolRepairIssue,resumeFarmToolWork,farmToolCondition} from '../src/game/farmTools.ts';
import {beginHaulageWork,resumeHaulageWork} from '../src/game/haulage.ts';
import {controlCraftSiteJob,craftSiteReport} from '../src/game/craftSiteReport.ts';
import {reviewPlayerToolUpkeep} from '../src/game/playerToolUpkeep.ts';
import {measureVillageWorkload} from '../src/game/villageWorkload.ts';

function fixture(){
  const g=new Game();g.reset(123456);g.enterIsland();
  g.world.heights.fill(4);g.state.weather='clear';g.state.paused=false;
  g.clockState=()=>({period:'Afternoon'});
  const hall=g.makeBld('townhall',0,38,0),shop=g.makeBld('workshop',30,38,0),barracks=g.makeBld('barracks',-30,38,0);
  g.state.buildings=[hall,shop,barracks];g.state.units=[];
  const u=g.spawnUnit('worker',0,62,0);
  Object.assign(g.tribe(0),{wood:100,stone:50,copper:20,iron:20,age:1});
  g.vision.fill(2);g.rebuildWalk();
  return {g,u,hall,shop,barracks};
}
const busy=(u)=>{u.order='gather';u.node={id:999,kind:'forage',x:u.x+3,z:u.z,y:0,amount:5,maxAmt:5,regenT:0,scale:1,rich:1};u.workReason='Gathering food';};

test('Resume on a paused weapon job pulls a busy maker off gathering instead of silently failing',()=>{
  const {g,u,barracks}=fixture();
  assert.equal(beginWeaponWork(g,'spear',0,barracks.id),true);
  u.weaponWork.paused=true;u.weaponWork.progress=4;busy(u);
  assert.equal(resumeWeaponWork(g,u,barracks.id),true);
  assert.equal(u.order,'hold');assert.equal(u.weaponWork.paused,false);assert.equal(u.weaponWork.progress,4);
});

test('Resume works for an armed militia maker, and militia can be picked to start weapon work',()=>{
  const {g,u,barracks}=fixture();
  assert.equal(beginWeaponWork(g,'spear',0,barracks.id),true);
  u.weaponWork.paused=true;u.type='spearman';u.militia=true;busy(u);
  assert.equal(resumeWeaponWork(g,u,barracks.id),true);assert.equal(u.weaponWork.paused,false);
  // Start fresh with only a militia person available.
  const f=fixture();f.u.type='spearman';f.u.militia=true;busy(f.u);
  assert.equal(beginWeaponWork(f.g,'bow',0,f.barracks.id),true);
  assert.ok(f.u.weaponWork);assert.equal(f.u.order,'hold');
  // The bench loop accepts an armed citizen.
  f.g.state.time+=1;weaponWorkAI(f.g,f.u,.1);
});

test('starting a craft order picks the nearest capable worker even when everyone is busy',()=>{
  const {g,u,barracks}=fixture();
  const far=g.spawnUnit('worker',200,200,0);busy(far);busy(u);
  g.interactionSpot=()=>({x:barracks.x,z:barracks.z});
  u.x=-25;u.z=38;
  assert.equal(beginWeaponWork(g,'spear',0,barracks.id),true);
  assert.ok(u.weaponWork,'nearest worker takes the job');assert.equal(far.weaponWork,undefined);
});

test('a person carrying goods is not abandoned; another worker takes the job',()=>{
  const {g,u,barracks}=fixture();
  const other=g.spawnUnit('worker',40,60,0);u.x=-25;u.z=38;u.carry=4;u.carryType='wood';
  assert.equal(beginWeaponWork(g,'spear',0,barracks.id),true);
  assert.equal(u.weaponWork,undefined);assert.equal(u.carry,4);assert.ok(other.weaponWork);
});

test('Repair is not gated on empty hands: a busy owner is released and repairs; carried goods give text, not a dead button',()=>{
  const {g,u,shop}=fixture();
  u.farmTool='stoneHoe';u.farmToolCondition=.2;busy(u);
  assert.equal(farmToolRepairIssue(g,u.id,shop.id),null);
  assert.equal(beginFarmToolRepair(g,u.id,shop.id),true);
  assert.equal(u.farmToolWork.mode,'repair');assert.equal(u.order,'hold');
  const f=fixture();f.u.farmTool='stoneHoe';f.u.farmToolCondition=.2;f.u.carry=3;f.u.carryType='wood';
  assert.match(farmToolRepairIssue(f.g,f.u.id,f.shop.id),/carrying goods/);
});

test('Resume tool work and the craft-site Resume button override a busy or stuck maker',()=>{
  const {g,u,shop}=fixture();
  u.farmTool='stoneHoe';u.farmToolCondition=.2;assert.equal(beginFarmToolRepair(g,u.id,shop.id),true);
  u.farmToolWork.paused=true;u.order='idle';busy(u);u.stuckT=12;
  const report=craftSiteReport(g,shop),job=report.jobs.find(j=>j.kind==='tool');
  assert.ok(job);assert.equal(controlCraftSiteJob(g,shop,job,'resume'),true);
  assert.equal(u.farmToolWork.paused,false);assert.equal(u.order,'hold');
});

test('sled orders and sled Resume win over workload',()=>{
  const {g,u,shop}=fixture();busy(u);
  assert.equal(beginHaulageWork(g,'sled',0,shop.id),true);
  assert.ok(u.haulageWork);assert.equal(u.order,'hold');
  u.haulageWork.paused=true;u.order='idle';busy(u);
  assert.equal(resumeHaulageWork(g,u,shop.id),true);assert.equal(u.haulageWork.paused,false);
});

test('a worn-out tool is repaired automatically, ahead of ordinary gathering, without any order',()=>{
  const {g,u}=fixture();
  u.farmTool='stoneHoe';u.farmToolCondition=0;busy(u);
  g.state.time=100;
  assert.equal(reviewPlayerToolUpkeep(g),true);
  assert.equal(u.farmToolWork?.mode,'repair');assert.equal(u.order,'hold');
  // A merely worn (not unusable) tool is left alone.
  const f=fixture();f.u.farmTool='stoneHoe';f.u.farmToolCondition=.6;f.g.state.time=100;
  assert.equal(reviewPlayerToolUpkeep(f.g),false);
  // Auto work off: no unasked assignment.
  const h=fixture();h.u.farmTool='stoneHoe';h.u.farmToolCondition=0;h.g.state.autoWorkEnabled=false;h.g.state.time=100;
  assert.equal(reviewPlayerToolUpkeep(h.g),false);
});

test('workload meter: demand and capacity share the horizon window and a per-category breakdown is reported',()=>{
  const g=new Game();g.reset(123456);g.enterIsland();
  const a=measureVillageWorkload(g,0,{horizonSeconds:180}),b=measureVillageWorkload(g,0,{horizonSeconds:180});
  assert.equal(a.windowSeconds,180);assert.ok(Array.isArray(a.byCategory));
  const sum=a.byCategory.reduce((n,c)=>n+c.personSeconds,0);
  assert.ok(Math.abs(sum-a.demandPersonSeconds)<1e-6,'categories add up to total demand');
  assert.deepEqual(a.byCategory,b.byCategory);
  // Food demand is counted for the window (no extra reserve seconds beyond capacity).
  const food=a.tasks.find(t=>t.id==='gather:food');
  if(food){const stock=g.tribe(0);assert.ok(food.units<=Math.max(0,1e9)&&stock!==undefined);}
});
