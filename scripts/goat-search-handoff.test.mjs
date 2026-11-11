import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {searchForWildGoats,captureGoatFromSearch} from '../src/game/animalOrders.ts';
import {queuedExplorationAI} from '../src/game/explorationOrders.ts';
import {beginHerdTaming,husbandryAI,HERD} from '../src/game/husbandry.ts';
function fixture(){const g=new Game();g.reset(42);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,50,0),g.makeBld('pen',30,30,0)];g.state.wildlife=[];g.state.forage=[];g.state.trees=[];g.state.stones=[];g.state.fish=[];g.state.autoWorkEnabled=false;g.vision.fill(2);g.rebuildWalk();const u=g.spawnUnit('worker',0,30,0);u.selected=true;return {g,u,pen:g.state.buildings[1]};}
function goat(g,x=4,z=30){const a={id:g.id(),species:'goat',x,z,y:4,hp:2,maxHp:2,facing:0,vx:0,vz:0,wanderT:10000,fly:0,scale:1};g.state.wildlife.push(a);return a;}
test('loaded search queues without losing cargo, physically unloads then keeps pen goal across internal Explore',()=>{
 const {g,u,pen}=fixture();u.itemCargo={grainSheaves:12};g.vision.fill(0);const stock=g.tribe(0).items?.grainSheaves||0,food=g.tribe(0).food;
 const result=searchForWildGoats(g,pen.id);assert.equal(result.accepted,true,result.reason);assert.equal(u.exploreAfterDelivery,true);assert.equal(u.itemCargo.grainSheaves,12);assert.equal(g.tribe(0).food,food);assert.equal(u.expedition,undefined);
 assert.equal(searchForWildGoats(g,pen.id).accepted,true);assert.equal(u.goatSearchPen,pen.id);
 for(let i=0;i<1500&&u.order!=='explore';i++){g.state.time+=.1;queuedExplorationAI(g,u,.1);}
 assert.equal(u.order,'explore',u.workReason);assert.equal(u.goatSearchPen,pen.id);assert.ok(!u.itemCargo?.grainSheaves);assert.equal(g.tribe(0).items.grainSheaves,stock+12);assert.ok(u.expedition.food>=6);assert.ok(Math.hypot(u.x,u.z-50)<25,'actual cache approach happened before departure');

});
test('discovering scout becomes actual handler with personal feed and finite capture work, without return overwrite',()=>{
 const {g,u,pen}=fixture();const a=goat(g);u.order='explore';u.goatSearchPen=pen.id;u.expedition={food:18,returning:false,forage:0};const pack=u.expedition,food=g.tribe(0).food;
 assert.equal(captureGoatFromSearch(g,u,pen),true);assert.equal(u.order,'hold');assert.equal(u.tamingWork.animal,a.id);assert.equal(u.expedition,pack);assert.equal(pack.food,18-HERD.tamingFood);assert.equal(g.tribe(0).food,food);assert.equal(g.state.livestock?.length||0,0);
 for(let i=0;i<2000&&u.tamingWork;i++){g.state.time+=.1;g.navBudget=40;husbandryAI(g,u,.1);}
 assert.equal(u.tamingWork,undefined,JSON.stringify({reason:u.workReason,u:{x:u.x,z:u.z,tx:u.tx,tz:u.tz,stuck:u.stuckT},pen,a:g.state.livestock?.[0]}));assert.equal(g.state.livestock.length,1);assert.equal(g.state.livestock[0].id,a.id);assert.equal(g.state.wildlife.length,0);assert.equal(u.expedition,pack,'unused actual provisions retained for physical return');assert.equal(u.order,'return');assert.equal(u.recalled,true);assert.equal(u.husbandryWork,undefined);
});
test('direct-node locks and loaded/paid workers remain protected while broad Food role accepts explicit capture',()=>{
 const {g,u,pen}=fixture();goat(g);u.job='food';u.jobLock=true;assert.equal(beginHerdTaming(g,pen.id),false);u.foodRole=true;u.itemCargo={grainSheaves:2};assert.equal(beginHerdTaming(g,pen.id),false);delete u.itemCargo;u.productionProjectId=999;assert.equal(beginHerdTaming(g,pen.id),false);delete u.productionProjectId;assert.equal(beginHerdTaming(g,pen.id),true);assert.ok(u.tamingWork);
});
test('search never targets hidden remote goats and failed handoff keeps pack for physical return',()=>{
 const {g,u,pen}=fixture();goat(g,900,30);g.vision.fill(2);assert.equal(searchForWildGoats(g,pen.id).accepted,false);assert.equal(u.expedition,undefined);assert.equal(g.state.wildlife.length,1);
 const a=goat(g);u.goatSearchPen=pen.id;u.order='explore';u.expedition={food:2,returning:false,forage:0};const food=g.tribe(0).food;assert.equal(captureGoatFromSearch(g,u,pen),false);assert.equal(u.order,'return');assert.equal(u.expedition.food,2);assert.equal(g.tribe(0).food,food);assert.equal(a.hp,2);assert.equal(g.state.livestock?.length||0,0);
});
test('queued native-world search survives strict save and reload with owned cargo and pen goal',async()=>{
 const {encodeGame,decodeGame}=await import('../src/game/persistence.ts');const g=new Game();g.reset(42);g.enterIsland();const u=g.state.units.find(u=>u.team===0&&u.type==='worker');for(const p of g.state.units.filter(p=>p.team===0)){p.selected=false;p.jobLock=true;p.job='wood';}u.selected=true;u.jobLock=false;u.itemCargo={grainSheaves:2};const pen=g.makeBld('pen',u.x+15,u.z,0);g.state.buildings.push(pen);g.vision.fill(0);g.rebuildWalk();const result=searchForWildGoats(g,pen.id);assert.equal(result.accepted,true,result.reason);assert.equal(u.exploreAfterDelivery,true);const copy=decodeGame(encodeGame(g)),saved=copy.state.units.find(p=>p.id===u.id);assert.equal(saved.goatSearchPen,pen.id);assert.equal(saved.exploreAfterDelivery,true);assert.equal(saved.itemCargo.grainSheaves,2);assert.equal(saved.expedition,undefined);
});
