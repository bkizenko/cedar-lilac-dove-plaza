import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game} from '../src/game/sim.ts';
import {beginProduction,productionIssue,occupiedProductionSlots} from '../src/game/production.ts';
import {foodInventory} from '../src/game/pantry.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {potteryOrigin} from '../src/game/pottery.ts';
import {supplyDrops,supplyApproach,supplyReached} from '../src/game/campAnchor.ts';
import {isDependent} from '../src/game/settlement.ts';
import {craftSiteReport} from '../src/game/craftSiteReport.ts';
import {DAIRY_RULES} from '../src/game/dairy.ts';
import {mulberry32} from '../src/game/rng.ts';
const terrainHash=g=>createHash('sha256').update(JSON.stringify({heights:Array.from(g.world.heights),rivers:g.world.rivers,features:g.world.features})).digest('hex');
test('native V18 dairy uses actual terrain, climate, slot and vessel through preparation, saved incubation and physical delivery',()=>{
 const random=Math.random;Math.random=mulberry32(42);
 try{
  let g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();g.vision.fill(2);
  const originalTerrain=terrainHash(g),home=g.campOf(0),atCache=u=>supplyDrops(g,0).some(d=>{const spot=supplyApproach(g,u,d);return spot&&supplyReached(g,u,d,spot);});
  const worker=g.state.units.find(u=>u.team===0&&u.type==='worker'&&!isDependent(g,u)&&atCache(u));assert.ok(worker,'native adult begins within reach of an actual communal cache');
  const cache=supplyDrops(g,0).find(d=>{const spot=supplyApproach(g,worker,d);return spot&&supplyReached(g,worker,d,spot);});assert.ok(cache);
  let point;
  for(let radius=12;radius<=42&&!point;radius+=4)for(let i=0;i<24&&!point;i++){
   const x=home.x+Math.cos(i*Math.PI/12)*radius,z=home.z+Math.sin(i*Math.PI/12)*radius;
   if(g.placementIssue('hearth',x,z,0)===null&&g.workBoard.connected(g,worker.x,worker.z,x,z))point={x,z};
  }
  assert.ok(point,'naturally legal hearth site, without clearing or flattening');
  // Authored finite opening: observed home ground, one completed legal hearth,
  // four delivered goat-milk food units and one real fired vessel in its cache.
  // Every generated actor/resource/terrain position remains unchanged.
  const hearth=g.makeBld('hearth',point.x,point.z,0);g.state.buildings.push(hearth);g.rebuildWalk();
  const origin=potteryOrigin(g,0,hearth.id);Object.assign(g.tribe(0),{food:304,foodLots:{provisions:300,milk:4},wood:100,items:{pottery:1},potteryOrigins:[{origin,count:1}]});g.tribe(0).survival.waterLiters=300;
  for(const u of g.state.units.filter(u=>u.team===0)){u.selected=false;u.jobLock=true;u.order='hold';}worker.selected=true;worker.jobLock=false;
  g.state.autoWorkEnabled=false;g.state.nightWork=true;g.state.weather='clear';g.state.weatherT=10000;g.state.conflict='quiet';g.state.visitorTimer=900;g.state.raidT=g.state.birthT=10000;g.raidT=g.seaT=g.calamityT=10000;for(const t of g.state.tribes)t.thinkT=10000;
  const start=g.state.time,workerStart={x:worker.x,z:worker.z};assert.equal(beginProduction(g,'fermentMilk',hearth.id,worker.id),true,productionIssue(g,'fermentMilk',hearth.id,worker.id));
  const id=g.state.production.projects.at(-1).id,hearthId=hearth.id,workerId=worker.id;
  assert.equal(foodInventory(g.tribe(0)).milk,0);assert.equal(g.tribe(0).food,300);assert.equal(g.tribe(0).items.pottery,0);assert.equal(g.tribe(0).potteryOrigins[0].count,0);assert.equal(g.tribe(0).wood,99);assert.equal(g.tribe(0).survival.waterLiters,299);
  let reloaded=false,observedPassive=false,observedReturning=false,maxWalkingDistance=0;
  const climateSamples=[];
  for(let i=0;i<1500;i++){
   const before=g.state.time;g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.ok(!g.state.ended&&g.state.time>before);
   const p=g.state.production.projects.find(p=>p.id===id),u=g.state.units.find(u=>u.id===workerId),site=g.state.buildings.find(b=>b.id===hearthId);
   maxWalkingDistance=Math.max(maxWalkingDistance,Math.hypot(u.x-workerStart.x,u.z-workerStart.z));
   assert.notEqual(p.phase,'lost',p.blockedReason);
   if(p.phase==='curing'){
    observedPassive=true;assert.equal(p.actorId,null);assert.equal(u.productionProjectId,undefined);assert.equal(occupiedProductionSlots(g,site),1);assert.equal(g.tribe(0).items.pottery,0);assert.ok(p.progress>=DAIRY_RULES.preparationSeconds);climateSamples.push(p.dairy.temperatureCelsius);
    const report=craftSiteReport(g,site);assert.equal(report.jobs.find(j=>j.projectId===id).phase,'Fermenting in held vessel');
    if(!reloaded&&p.dairy.fermentSeconds>=DAIRY_RULES.fermentSeconds/4){
     const saved=structuredClone(p.dairy);g=decodeGame(encodeGame(g));g.enterIsland();g.raidT=g.seaT=g.calamityT=10000;
     assert.deepEqual(g.state.production.projects.find(p=>p.id===id).dairy,saved);assert.equal(terrainHash(g),originalTerrain);reloaded=true;
    }
   }
   if(p.phase==='returning')observedReturning=true;
   if(p.phase==='complete')break;
  }
  const p=g.state.production.projects.find(p=>p.id===id);assert.equal(p.phase,'complete',JSON.stringify({phase:p.phase,reason:p.blockedReason,dairy:p.dairy,time:g.state.time-start}));
  assert.ok(observedPassive&&reloaded&&observedReturning);assert.ok(maxWalkingDistance>3,'maker physically walks from cache to hearth');assert.ok(climateSamples.length>0&&climateSamples.every(Number.isFinite));assert.ok(g.state.time-start<=300.001);
  const t=g.tribe(0),m=g.state.production.metrics;assert.equal(m.foodInputsUsed.milk,4);assert.equal(m.edibleFoodProduced,3);assert.equal(m.waterUsedLiters,1);assert.equal(m.logsUsed,1);assert.equal(t.items.pottery,1);assert.equal(t.potteryOrigins[0].count,1);assert.deepEqual(t.potteryOrigins[0].origin,origin);assert.ok(foodInventory(t).fermentedMilk>2.9);assert.equal(occupiedProductionSlots(g,g.state.buildings.find(b=>b.id===hearthId)),0);assert.equal(terrainHash(g),originalTerrain);
  const restored=decodeGame(encodeGame(g));assert.equal(restored.state.production.projects.find(p=>p.id===id).phase,'complete');assert.equal(restored.tribe(0).items.pottery,1);assert.equal(restored.state.production.metrics.edibleFoodProduced,3);assert.equal(terrainHash(restored),originalTerrain);
  for(let i=0;i<5;i++)g.step(.2);assert.equal(t.items.pottery,1);assert.equal(m.edibleFoodProduced,3);
 }finally{Math.random=random;}
});
