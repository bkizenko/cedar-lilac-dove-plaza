import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {buildingCost,fundConstructionPlans,planStatus,constructionDemand} from '../src/game/construction.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){
 const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);
 g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,38,0)];g.state.trees=[];g.state.stones=[];g.state.forage=[];g.state.fish=[];g.state.wildlife=[];
 g.state.weather='clear';g.state.weatherT=10000;g.vision.fill(2);g.rebuildWalk();
 const u=g.spawnUnit('worker',10,38,0);Object.assign(g.tribe(0),{wood:0,stone:0,food:200});return {g,u};
}
test('unpaid plans reserve layout but give no collision, vision, capacity, territory or salvage',()=>{
 const {g,u}=fixture(),cap=g.popCap(0),influence=g.influenceAt(80,38,0);assert.equal(g.placeBuilding('hut',80,38),true);
 const b=g.state.buildings.at(-1);assert.deepEqual(b.plannedCost,buildingCost('hut'));assert.equal(g.tribe(0).wood,0);assert.equal(g.popCap(0),cap);assert.equal(g.influenceAt(80,38,0),influence);
 g.rebuildWalk();assert.equal(g.walkable(b.x,b.z),true);assert.match(g.placementIssue('hut',b.x,b.z),/another building/);
 g.vision.fill(0);g.updateVision(0);assert.equal(g.visibleAt(b.x,b.z),false);
 Object.assign(u,{node:b,order:'build'});g.buildAI(u,100);assert.equal(b.build,0);assert.equal(u.order,'idle');
 const enemyWood=g.tribe(1).wood;g.lootBuilding(1,b);assert.equal(b.raidLoot,undefined);assert.equal(g.tribe(1).wood,enemyWood);
 g.selectEntity(b);assert.equal(g.snapshot().selection.planned,true);g.recycleSelected();assert.equal(b.hp,0);assert.equal(g.tribe(0).wood,0);g.recycleSelected();assert.equal(g.tribe(0).wood,0);
});
test('saved plans charge once when supplied and finish through actual worker construction',()=>{
 let {g,u}=fixture();assert.equal(g.placeBuilding('hut',22,38),true);const id=g.state.buildings.at(-1).id;
 g=decodeGame(encodeGame(g));g.state.paused=false;g.world.heights.fill(4);g.rebuildWalk();u=g.state.units.find(p=>p.id===u.id);const b=g.state.buildings.find(p=>p.id===id);assert.ok(b.plannedCost);
 g.tribe(0).wood=40;fundConstructionPlans(g);assert.equal(b.plannedCost,undefined);assert.equal(g.tribe(0).wood,0);fundConstructionPlans(g);assert.equal(g.tribe(0).wood,0);
 for(let i=0;i<1500&&b.build<1;i++)g.step(.1);
 assert.equal(b.build,1);assert.ok(g.popCap(0)>8);assert.deepEqual(g.simulationErrors,[]);
});
test('plans respect terrain and knowledge; storms permit layout but delay funding',()=>{
 const {g}=fixture();g.tribe(0).wood=100;g.state.weather='storm';assert.equal(g.placeBuilding('hut',22,38),true);const b=g.state.buildings.at(-1);
 fundConstructionPlans(g);assert.ok(b.plannedCost);assert.equal(g.tribe(0).wood,100);assert.match(planStatus(g,b),/storm/);
 g.state.weather='clear';fundConstructionPlans(g);assert.equal(b.plannedCost,undefined);assert.equal(g.tribe(0).wood,60);
 g.tribe(0).wood=0;g.height=()=>-10;assert.equal(g.placeBuilding('hut',45,38),false);
 g.height=()=>4;g.tribe(0).cultivated=[];assert.equal(g.placeBuilding('farm',45,38),false);assert.equal(g.placeBuilding('forge',45,38),false);
});
test('pause survives save; smaller affordable plans can start without double spending',()=>{
 const {g}=fixture();g.placeBuilding('warehouse',25,38);const big=g.state.buildings.at(-1);g.placeBuilding('hut',45,38);const small=g.state.buildings.at(-1);small.planPaused=true;
 g.tribe(0).wood=40;fundConstructionPlans(g);assert.ok(big.plannedCost&&small.plannedCost);assert.equal(g.tribe(0).wood,40);
 assert.equal(decodeGame(encodeGame(g)).state.buildings.find(b=>b.id===small.id).planPaused,true);
 small.planPaused=false;fundConstructionPlans(g);assert.ok(big.plannedCost);assert.equal(small.plannedCost,undefined);assert.equal(g.tribe(0).wood,0);
 assert.equal(constructionDemand(g,0,'wood'),true);big.planPaused=true;assert.equal(constructionDemand(g,0,'wood'),false);
});
test('a plan waits for a clear footprint and never creates an obstacle around a resident',()=>{
 const {g,u}=fixture();g.placeBuilding('hut',22,38);const b=g.state.buildings.at(-1);g.tribe(0).wood=40;u.x=b.x;u.z=b.z;
 fundConstructionPlans(g);assert.ok(b.plannedCost);assert.match(planStatus(g,b),/clear people/);assert.equal(g.tribe(0).wood,40);
 u.x=10;fundConstructionPlans(g);assert.equal(b.plannedCost,undefined);
});
test('malformed plan payments are rejected; old paid construction loads without another bill',()=>{
 const {g}=fixture();g.placeBuilding('hut',22,38);const id=g.state.buildings.at(-1).id;
 for(const value of [-1,NaN,Infinity]){const raw=encodeGame(g);raw.state.buildings.find(b=>b.id===id).plannedCost.wood=value;assert.throws(()=>decodeGame(raw));}
 const raw=encodeGame(g);delete raw.state.buildings.find(b=>b.id===id).plannedCost;const loaded=decodeGame(raw);fundConstructionPlans(loaded);assert.equal(loaded.tribe(0).wood,0);assert.equal(loaded.state.buildings.find(b=>b.id===id).plannedCost,undefined);
});
test('balanced workers gather timber for a plan and complete it without repeated orders',()=>{
 const {g}=fixture();g.state.trees=[{id:g.id(),kind:'tree',x:12,z:46,y:4,amount:100,maxAmt:100,regenT:0,rich:1,scale:1}];
 g.placeBuilding('hut',24,38);const b=g.state.buildings.at(-1);
 for(let i=0;i<2400&&b.build<1;i++)g.step(.1);
 assert.equal(b.build,1,JSON.stringify(g.state.units.map(u=>({order:u.order,reason:u.workReason,carry:u.carry}))));assert.deepEqual(g.simulationErrors,[]);
});

test('metal costs are paid too, and a deferred food-cost building preserves meal reserves',()=>{
 const {g}=fixture(),t=g.tribe(0);Object.assign(t,buildingCost('forge'),{age:1,copper:0});
 g.placeBuilding('forge',24,38);const forge=g.state.buildings.at(-1);assert.ok(forge.plannedCost);t.copper=10;fundConstructionPlans(g);assert.equal(forge.plannedCost,undefined);assert.equal(t.copper,0);assert.equal(t.wood,0);assert.equal(t.stone,0);
 Object.assign(t,buildingCost('temple'),{age:3});g.state.weather='storm';g.placeBuilding('temple',55,38);const temple=g.state.buildings.at(-1);assert.ok(temple.plannedCost);
 g.state.weather='clear';fundConstructionPlans(g);assert.ok(temple.plannedCost);assert.match(planStatus(g,temple),/meal reserve/);t.food+=20;fundConstructionPlans(g);assert.equal(temple.plannedCost,undefined);assert.equal(t.food,20);
});
