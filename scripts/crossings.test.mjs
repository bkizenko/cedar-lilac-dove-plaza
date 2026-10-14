import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {findCrossing,developRivalCrossings,planReturnCrossing} from '../src/game/crossings.ts';
import {decodeGame,encodeGame} from '../src/game/persistence.ts';
import {weatherWaterLevel} from '../src/game/hydrology.ts';
import {HALF,MAP,SEGS} from '../src/game/constants.ts';
function fixture(team=2){
 const g=new Game();g.reset(123456);g.enterIsland();g.state.units=[];g.state.buildings=[];g.state.trees=[];g.state.stones=[];g.state.forage=[];g.state.weather='clear';g.vision.fill(2);g.clockState=()=>({period:'Afternoon'});
 for(let iz=0;iz<=SEGS;iz++)for(let ix=0;ix<=SEGS;ix++){const z=iz/SEGS*MAP-HALF;g.world.heights[iz*(SEGS+1)+ix]=Math.abs(z)<6?g.world.waterY-.6:4;}
 const hall=g.makeBld('townhall',12,-25,team);g.state.buildings=[hall];g.rebuildWalk();
 const builder=g.spawnUnit('worker',0,-18,team),carrier=g.spawnUnit('worker',0,18,team);
 Object.assign(carrier,{carry:8,carryType:'wood',order:'return'});Object.assign(g.tribe(team),{wood:100,stone:30,food:600});
 return {g,builder,carrier};
}
function drive(g,seconds,fn){for(let i=0;i<seconds*10;i++){g.state.time+=.1;g.navBudget=10;fn();}}
test('rivals fund and physically build a rescue bridge; cargo crosses only after construction',()=>{
 const {g,builder,carrier}=fixture();assert.ok(findCrossing(g,carrier,g.campOf(2),2));assert.equal(developRivalCrossings(g,2),true);
 const bridge=g.state.buildings.find(b=>b.type==='bridge');assert.equal(bridge.build,0);assert.equal(g.tribe(2).wood,68);assert.equal(g.tribe(2).stone,26);assert.equal(builder.order,'build');assert.equal(carrier.carry,8);
 g.state.time+=26;assert.equal(developRivalCrossings(g,2),false);assert.equal(g.state.buildings.filter(b=>b.type==='bridge').length,1);
 drive(g,80,()=>g.buildAI(builder,.1));assert.equal(bridge.build,1);g.rebuildWalk();
 drive(g,70,()=>g.workerAI(carrier,.1));assert.equal(carrier.carry,0);assert.equal(g.tribe(2).wood,76);assert.ok(carrier.z<0);
});
test('rival crossing requires real materials; unexplored or deep-water spans are rejected',()=>{
 const {g,carrier}=fixture();g.tribe(2).wood=31;assert.equal(developRivalCrossings(g,2),false);assert.equal(g.state.buildings.length,1);
 g.vision.fill(0);assert.equal(findCrossing(g,carrier,g.campOf(2),0),null);
 g.height=()=>g.world.waterY-10;assert.equal(findCrossing(g,carrier,g.campOf(2),2),null);
});
test('a known material shortage can fund access to the opposite bank without a stranded carrier',()=>{
 const {g,carrier}=fixture();carrier.order='idle';carrier.carry=0;carrier.carryType=null;g.tribe(2).stone=4;
 g.state.stones=[{kind:'stone',id:g.id(),x:0,z:18,y:4,amount:80,maxAmt:80,regenT:0,r:1}];
 assert.equal(developRivalCrossings(g,2),true);assert.equal(g.tribe(2).stone,0);assert.equal(g.state.buildings.filter(b=>b.type==='bridge').length,1);
});
test('player recall crossing is an ordinary unfunded plan when supplies are lacking',()=>{
 const {g,carrier}=fixture(0);g.tribe(0).wood=0;carrier.selected=true;carrier.recalled=true;
 assert.equal(planReturnCrossing(g),true);const bridge=g.state.buildings.find(b=>b.type==='bridge');assert.equal(bridge.build,0);assert.equal(bridge.plannedCost.wood,32);assert.equal(carrier.carry,8);assert.equal(g.tribe(0).wood,0);
 assert.equal(planReturnCrossing(g),false);assert.equal(g.state.buildings.filter(b=>b.type==='bridge').length,1);
});
for(const weather of ['flood','drought','clear'])test(`${weather} water level is restored immediately when loading`,()=>{
 const g=new Game();g.reset(98765);g.enterIsland();g.state.weather=weather;g.world.waterY=weatherWaterLevel(g.world.baseWaterY,weather);g.rebuildWalk();
 const before={food:g.tribe(0).food,age:g.tribe(0).age,positions:g.state.units.map(u=>[u.x,u.z])};
 const saved=encodeGame(g),loaded=decodeGame(saved);assert.equal(loaded.world.waterY,g.world.waterY);assert.equal(loaded.tribe(0).food,before.food);assert.equal(loaded.tribe(0).age,before.age);assert.deepEqual(loaded.state.units.map(u=>[u.x,u.z]),before.positions);
 assert.deepEqual(loaded.walk,g.walk);
});
