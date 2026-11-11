import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {searchForWildGoats,visibleGoatsForPen} from '../src/game/animalOrders.ts';
import {husbandryAI,HERD} from '../src/game/husbandry.ts';
import {insidePen} from '../src/game/penGeometry.ts';
function fixture(){
 const g=new Game();g.reset(42);g.enterIsland();g.world.heights.fill(4);g.state.units=[];
 g.state.buildings=[g.makeBld('townhall',0,50,0),g.makeBld('pen',30,30,0)];
 g.state.wildlife=[];g.state.trees=[];g.state.stones=[];g.state.forage=[];g.state.fish=[];
 g.state.autoWorkEnabled=false;g.vision.fill(0);g.rebuildWalk();
 const u=g.spawnUnit('worker',0,30,0);u.selected=true;
 const a={id:g.id(),species:'goat',x:5,z:30,y:4,hp:2,maxHp:2,facing:0,vx:0,vz:0,wanderT:10000,fly:0,scale:1};g.state.wildlife.push(a);
 return {g,u,a,pen:g.state.buildings[1]};
}
test('dedicated goat search passes a ruin without abandoning its pen, then physically captures the discovered animal',()=>{
 const {g,u,a,pen}=fixture();g.world.megaliths=[{x:u.x,z:u.z}];g.looted.clear();
 const food=g.tribe(0).food;assert.equal(searchForWildGoats(g,pen.id).accepted,true);
 const pack=u.expedition,packed=pack.food;assert.equal(g.tribe(0).food,food-packed);
 g.navBudget=40;g.exploreAI(u,.1);
 assert.equal(u.goatSearchPen,pen.id,'unrelated ruin must not erase the dedicated search');
 assert.equal(u.order,'explore');assert.equal(g.looted.size,0);assert.equal(u.carry,0);assert.equal(u.expedition,pack);
 g.vision.fill(2);g.exploreAI(u,.1);
 assert.equal(u.tamingWork.animal,a.id);assert.equal(pack.food,packed-HERD.tamingFood);assert.equal(g.tribe(0).food,food-packed);
 for(let i=0;i<2400&&u.tamingWork;i++){g.state.time+=.1;g.navBudget=40;husbandryAI(g,u,.1);}
 assert.equal(u.tamingWork,undefined,u.workReason);assert.equal(g.state.livestock.length,1);
 const tamed=g.state.livestock[0];assert.equal(tamed.id,a.id);assert.ok(insidePen(pen,tamed.x,tamed.z,.25));
 assert.equal(g.state.wildlife.length,0);assert.equal(g.looted.size,0);assert.equal(u.order,'return');assert.equal(u.expedition,pack);
});
test('ordinary exploration still physically collects the same ruin reward',()=>{
 const {g,u}=fixture();g.world.megaliths=[{x:u.x,z:u.z}];g.looted.clear();u.order='explore';
 g.exploreAI(u,.1);assert.equal(g.looted.size,1);assert.ok(u.carry>0);assert.equal(u.order,'return');
});
test('a second scout does not abandon its search because another handler already reserved the only visible goat',()=>{
 const {g,u,a,pen}=fixture();const handler=g.spawnUnit('worker',10,30,0);
 handler.tamingWork={animal:a.id,pen:pen.id,progress:0};handler.order='hold';
 u.order='explore';u.goatSearchPen=pen.id;u.expedition={food:18,returning:false,forage:0};u.tx=15;u.tz=30;
 g.visibleAt=()=>true;assert.equal(visibleGoatsForPen(g,pen).length,0);
 g.navBudget=40;g.exploreAI(u,.1);assert.equal(u.order,'explore');assert.equal(u.goatSearchPen,pen.id);
 assert.equal(u.tamingWork,undefined);assert.equal(handler.tamingWork.animal,a.id);assert.equal(u.expedition.food,18);
});
test('normal simulation dispatcher completes the paid search/capture without unrelated ruin diversion or duplicate animal',async()=>{
 const {g,u,a,pen}=fixture();g.world.megaliths=[{x:u.x,z:u.z}];g.looted.clear();
 assert.equal(searchForWildGoats(g,pen.id).accepted,true);
 g.state.paused=false;g.state.nightWork=true;g.raidT=g.seaT=g.calamityT=1e9;
 const visibleAt=g.visibleAt;g.visibleAt=()=>false;g.step(.1);
 assert.equal(g.looted.size,0);assert.equal(u.goatSearchPen,pen.id);assert.equal(u.order,'explore');
 g.visibleAt=visibleAt;g.vision.fill(2);
 for(let i=0;i<1800&&!(g.state.livestock?.some(a=>insidePen(pen,a.x,a.z,.25)));i++)g.step(.1);
 assert.deepEqual(g.simulationErrors,[]);assert.equal(g.looted.size,0);
 assert.equal(g.state.livestock?.length,1,u.workReason);assert.equal(g.state.livestock[0].id,a.id);
 assert.ok(insidePen(pen,g.state.livestock[0].x,g.state.livestock[0].z,.25));assert.equal(g.state.wildlife.some(c=>c.id===a.id),false);
 const {encodeGame,decodeGame}=await import('../src/game/persistence.ts');
 assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
