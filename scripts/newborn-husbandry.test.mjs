import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {assignHusbandry} from '../src/game/husbandry.ts';
import {herdRules} from '../src/game/animalSpecies.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

// Controlled initial breeding endowment, not earned capture or natural-terrain qualification.
// Birth, aging, refitting and training thereafter use the ordinary Game.step executors.
function fixture(species){
 const g=new Game();g.reset(123456);g.enterIsland();
 g.state.units=[];g.state.buildings=[];g.state.wildlife=[];g.state.livestock=[];
 g.world.heights.fill(4);g.vision.fill(2);g.state.time=100;g.state.weather='clear';
 delete g.state.survivalVersion;g.state.autoWorkEnabled=false;g.state.paused=false;g.state.nightWork=true;
 g.raidT=g.seaT=g.calamityT=1e8;
 const hall=g.makeBld('townhall',0,0,0),pen=g.makeBld('pen',20,0,0);pen.w=pen.d=16;
 pen.pasture={condition:1,feed:100,care:1};g.state.buildings=[hall,pen];
 for(let i=0;i<3;i++){g.spawnUnit('worker',8+i,-6,0);g.state.units.at(-1).order='hold';}
 Object.assign(g.tribe(0),{food:10000,foodLots:{provisions:10000},wood:100});
 const r=herdRules(species),parents=['female','male'].map((sex,i)=>({id:g.id(),species,team:0,pen:pen.id,
  x:20+i,y:4,z:0,facing:0,vx:0,vz:0,wanderT:0,fly:0,hp:24,maxHp:24,scale:1,adultScale:1,
  sex,born:100-r.maturity,tamedAt:0,hunger:5,milk:0,pregnancy:sex==='female'?r.gestation-.1:0,
  foodConsumed:12+i,waterConsumedLiters:8+i,
  ...(['horse','cattle'].includes(species)?{packHarness:{version:1,preparedAt:0,wood:r.harnessWood,workSeconds:r.harnessSeconds}}:{})}));
 g.state.livestock=parents;g.rebuildWalk();return {g,pen,parents};
}
function drive(g,seconds,until){
 const end=g.state.time+seconds;
 while(g.state.time<end&&!until()){g.step(.2);assert.deepEqual(g.simulationErrors,[]);}
 assert.ok(until(),JSON.stringify({time:g.state.time,animals:g.state.livestock,units:g.state.units.map(u=>({id:u.id,order:u.order,reason:u.workReason,work:u.husbandryWork,pack:u.packAnimal?.id}))}));
}
for(const species of ['goat','sheep','horse','cattle'])test(`${species} birth creates distinct biology without inheriting equipment or consumption`,()=>{
 const {g,pen,parents}=fixture(species),mother=parents[0],history={food:mother.foodConsumed,water:mother.waterConsumedLiters,harness:structuredClone(mother.packHarness)};
 drive(g,2,()=>g.state.livestock.length===3);
 const child=g.state.livestock.find(a=>!parents.some(p=>p.id===a.id));assert.ok(child);
 assert.equal(child.packHarness,undefined);assert.equal(child.foodConsumed,0);assert.equal(child.waterConsumedLiters,0);
 assert.equal(child.team,mother.team);assert.equal(child.pen,pen.id);assert.equal(child.species,species);
 assert.equal(child.maxHp,mother.maxHp);assert.equal(child.hp,child.maxHp);assert.equal(child.pregnancy,0);assert.equal(child.milk,0);
 assert.equal(mother.foodConsumed,history.food);assert.equal(mother.waterConsumedLiters,history.water);assert.deepEqual(mother.packHarness,history.harness);
 const restored=decodeGame(encodeGame(g)),savedChild=restored.state.livestock.find(a=>a.id===child.id);
 assert.deepEqual(savedChild,child);assert.deepEqual(restored.state.livestock.find(a=>a.id===mother.id).packHarness,history.harness);
 if(!['horse','cattle'].includes(species))return;
 // Both initially endowed parents already own harnesses: refit them out of pasture,
 // leaving the naturally aging offspring as the only candidate for new training.
 for(const parent of [parents[1],mother]){
  const wood=g.tribe(0).wood;assert.equal(assignHusbandry(g,pen.id,'pack',species),true);
  assert.equal(g.state.units.find(u=>u.husbandryWork?.action==='pack').husbandryWork.animal,parent.id);
  drive(g,100,()=>g.state.units.some(u=>u.packAnimal?.id===parent.id));assert.equal(g.tribe(0).wood,wood);
 }
 assert.equal(assignHusbandry(g,pen.id,'care'),true);
 drive(g,herdRules(species).maturity+1,()=>g.state.time-child.born>=herdRules(species).maturity);
 const wood=g.tribe(0).wood;
 const copy=decodeGame(encodeGame(g));assert.equal(copy.state.livestock.find(a=>a.id===child.id).packHarness,undefined);
 assert.equal(assignHusbandry(copy,pen.id,'pack',species),false,'strict-restored newborn cannot bypass its own stable');
 assert.equal(copy.tribe(0).wood,wood);
 assert.equal(assignHusbandry(g,pen.id,'pack',species),false);
 const stable=g.makeBld('stables',42,0,0);g.state.buildings.push(stable);g.rebuildWalk();
 assert.equal(assignHusbandry(g,pen.id,'pack',species),true);
 const handler=g.state.units.find(u=>u.husbandryWork?.animal===child.id);assert.ok(handler);
 assert.equal(handler.husbandryWork.stable,stable.id);assert.equal(handler.husbandryWork.progress,0);assert.equal(g.tribe(0).wood,wood);
 drive(g,180,()=>handler.packAnimal?.id===child.id);
 assert.equal(g.tribe(0).wood,wood-herdRules(species).harnessWood);
 assert.equal(handler.packAnimal.packHarness.workSeconds,herdRules(species).harnessSeconds);
 assert.equal(handler.packAnimal.packHarness.wood,herdRules(species).harnessWood);
 assert.notEqual(handler.packAnimal.packHarness.preparedAt,history.harness.preparedAt);
 assert.equal(g.state.livestock.some(a=>a.id===child.id),false);
 assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
