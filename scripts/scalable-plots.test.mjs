import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {BUILDINGS} from '../src/game/constants.ts';
import {buildingCost,fundConstructionPlans} from '../src/game/construction.ts';
import {farmHarvestEstimate,farmWork} from '../src/game/settlement.ts';
import {plotArea,dragPlot} from '../src/game/plots.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(345,2);g.enterIsland();g.world.heights.fill(4);g.vision.fill(2);g.state.weather='clear';g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,40,0)];g.state.trees=[];g.state.stones=[];g.state.forage=[];g.rebuildWalk();g.tribe(0).cultivated=['grain'];g.tribe(0).seeds=100;g.tribe(0).wood=1000;return g;}
test('rectangular stores pay for area and only completed space adds capacity; saves retain dimensions',()=>{
 const g=fixture(),base=g.stockCap(),d=BUILDINGS.warehouse,size={w:d.w*2,d:d.d*3},wood=g.tribe(0).wood;
 assert.equal(g.placeBuilding('warehouse',30,40,0,size),true);const b=g.state.buildings.at(-1);
 assert.equal(g.tribe(0).wood,wood-360);assert.equal(g.stockCap(),base);b.build=1;
 assert.equal(g.stockCap(),base+1200);const loaded=decodeGame(encodeGame(g));assert.equal(loaded.stockCap(),base+1200);assert.equal(loaded.state.buildings.at(-1).w,size.w);
});
test('larger fields on uniform terrain require proportional seeds and work for proportional harvest',()=>{
 const g=fixture(),d=BUILDINGS.farm,size={w:d.w*2,d:d.d};
 assert.equal(buildingCost('farm',g,0,size).seeds,8);
 // Area alone scales yield only when the whole footprint has equal land quality.
 g.world.rivers=[];g.world.biomes=[{kind:'plains',x:0,z:0}];
 const small=g.makeBld('farm',30,40,0),large={...small,...size};
 assert.ok(Math.abs(farmHarvestEstimate(g,large)-2*farmHarvestEstimate(g,small))<=1);
 g.state.time=0;const u=g.spawnUnit('worker',30,40,0);farmWork(g,u,small,1);farmWork(g,u,large,1);
 assert.equal(large.crop.planted,small.crop.planted/2);
});
test('plans preserve their area seed bill and cannot buy a large field for four seeds',()=>{
 const g=fixture(),d=BUILDINGS.farm;g.tribe(0).seeds=0;
 assert.equal(g.placeBuilding('farm',30,40,0,{w:d.w*2,d:d.d}),true);const b=g.state.buildings.at(-1);
 assert.equal(b.plannedCost.seeds,8);g.tribe(0).seeds=4;fundConstructionPlans(g);assert.equal(b.plannedCost.seeds,8);assert.equal(g.tribe(0).seeds,4);
});
test('plots reject covered resources, oversized imports and partially submerged footprints',()=>{
 const g=fixture(),d=BUILDINGS.farm,size={w:d.w*3,d:d.d*2};
 g.state.trees=[{id:999,kind:'tree',x:40,z:45,amount:10}];assert.equal(g.placeBuilding('farm',30,40,0,size),false);g.state.trees=[];
 assert.equal(g.placeBuilding('farm',30,40,0,{w:100,d:100}),false);
 const h=g.height.bind(g);g.height=(x,z)=>x>38?0:h(x,z);assert.equal(g.placeBuilding('farm',30,40,0,size),false);
 const plot=dragPlot('farm',{x:0,z:0},{x:100,z:-100});assert.equal(plotArea({type:'farm',...plot}),9);
});
