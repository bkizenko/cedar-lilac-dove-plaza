import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {buildingCost,fundConstructionPlans} from '../src/game/construction.ts';
import {foundingJourneyAI} from '../src/game/communities.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){
 const g=new Game();g.reset(345);g.enterIsland();g.world.heights.fill(4);g.state.buildings=[];g.state.units=[];
 g.state.weather='clear';g.vision.fill(2);g.nearClump=()=>true;g.rebuildWalk();return g;
}
test('the free hearth is followed by escalating hall prices including unfinished plans, shown in the build menu',()=>{
 const g=fixture();g.tribe(0).wood=0;
 for(const [i,x] of [-180,-90,0,90,180].entries()){
  const expected=i*80;assert.equal(buildingCost('townhall',g).wood,expected);
  assert.equal(g.snapshot().buildOptions.find(b=>b.type==='townhall').cost.wood,expected);
  assert.equal(g.placeBuilding('townhall',x,40),true);const hall=g.state.buildings.at(-1);
  if(i)assert.equal(hall.plannedCost.wood,expected);else assert.equal(hall.plannedCost,undefined);
 }
 assert.equal(g.tribe(0).wood,0);
});
test('saved hall quotes survive changing settlement counts and are charged exactly once',()=>{
 const g=fixture();g.state.buildings.push(g.makeBld('townhall',0,40,0));g.tribe(0).wood=0;
 g.placeBuilding('townhall',100,40);const id=g.state.buildings.at(-1).id;g.spawnUnit('worker',85,40,0);
 const r=decodeGame(encodeGame(g));r.world.heights.fill(4);r.rebuildWalk();const b=r.state.buildings.find(b=>b.id===id);
 r.state.buildings[0].hp=0;r.tribe(0).wood=80;fundConstructionPlans(r);assert.equal(b.plannedCost,undefined);assert.equal(r.tribe(0).wood,0);
 fundConstructionPlans(r);assert.equal(r.tribe(0).wood,0);assert.equal(b.build,0);
});
test('legacy twenty-log plans and founder cargo remain valid while new founder quotes consume the saved amount',()=>{
 for(const timber of [undefined,80,160]){
  const g=fixture();g.state.buildings.push(g.makeBld('townhall',-100,40,1));const u=g.spawnUnit('worker',0,50,1);
  u.carry=timber??20;u.carryType='wood';u.foundingJourney={x:0,z:40,leader:true,...(timber?{timber}:{})};
  const r=decodeGame(encodeGame(g)),v=r.state.units.find(p=>p.id===u.id);assert.equal(v.foundingJourney.timber,timber);
  foundingJourneyAI(g,u,.1);assert.equal(u.carry,0);assert.equal(g.state.buildings.length,2);assert.equal(g.state.buildings[1].build,0);
 }
 const g=fixture(),u=g.spawnUnit('worker',0,50,1);u.foundingJourney={x:0,z:40,leader:true,timber:-80};assert.throws(()=>decodeGame(encodeGame(g)));
});
