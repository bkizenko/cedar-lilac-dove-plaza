import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {beginWaterCollection,waterCollectionAI,pauseWaterCollection,tickSurvival,SURVIVAL_RULES} from '../src/game/survivalNeeds.ts';
function fixture(){const g=new Game();g.reset(42,12,{size:1040,layout:'continents'});g.enterIsland();
 for(const u of g.state.units)if(u.team===0){u.selected=false;u.jobLock=true;u.order='hold';}
 const u=g.state.units.find(u=>u.team===0&&u.type==='worker');u.selected=true;u.jobLock=false;
 return{g,u};}
function step(g,u){const before={x:u.x,z:u.z};g.state.time+=.1;g.navBudget=10;waterCollectionAI(g,u,.1);assert.ok(Math.hypot(u.x-before.x,u.z-before.z)<1,'carrier moves physically without teleporting');}
function finish(g,u){let steps=0;while(u.waterWork&&steps++<6000)step(g,u);assert.equal(u.waterWork,undefined,`${u.workReason}: ${JSON.stringify({x:u.x,z:u.z,work:u.waterWork})}`);}
function indoors(g,u,point){return g.state.buildings.some(b=>g.solidBuilding(b)&&Math.abs(point.bankX-b.x)<=b.w*.4+u.r&&Math.abs(point.bankZ-b.z)<=b.d*.4+u.r);}
test('saved first-winter bank inside the town hall replans and physically delivers once',()=>{
 const {g,u}=fixture();for(const [kind,x,z]of [['townhall',10,-42],['warehouse',10,-24],['workshop',16,-50],['hut',4,-24]])g.state.buildings.push(g.makeBld(kind,x,z,0));
 // Captured campaign position and task, rather than an idealized flat map.
 Object.assign(u,{x:4.65,z:-36.65,y:g.height(4.65,-36.65),order:'hold',waterWork:{sourceX:20.27663052873622,sourceZ:-41.837231787958494,bankX:13.34842729846071,bankZ:-37.837231787958494,phase:'outbound',progressSeconds:0,liters:0}});
 g.rebuildWalk();g.workBoard.reset();g.updateVision(0);assert.equal(indoors(g,u,u.waterWork),true);
 const loaded=decodeGame(encodeGame(g)),carrier=loaded.state.units.find(p=>p.id===u.id),stock=loaded.tribe(0).survival,before=stock.waterLiters;
 step(loaded,carrier);assert.equal(indoors(loaded,carrier,carrier.waterWork),false);assert.equal(stock.waterLiters,before);
 finish(loaded,carrier);assert.equal(stock.waterLiters,before+24);assert.equal(stock.waterDeliveredLiters,24);waterCollectionAI(loaded,carrier,.1);assert.equal(stock.waterDeliveredLiters,24);
});
test('construction obstructing a collecting bank preserves earned progress and chooses a clear bank',()=>{
 const {g,u}=fixture();g.updateVision(0);const dispatch=beginWaterCollection(g);assert.equal(dispatch.accepted,true,dispatch.reason);
 let iterations=0;while((u.waterWork?.progressSeconds??0)<4&&iterations++<5000)step(g,u);
 assert.ok(u.waterWork?.progressSeconds>=4);const progress=u.waterWork.progressSeconds,bank={...u.waterWork};
 g.state.buildings.push(g.makeBld('hut',bank.bankX,bank.bankZ,0));g.rebuildWalk();g.workBoard.reset();
 const loaded=decodeGame(encodeGame(g)),carrier=loaded.state.units.find(p=>p.id===u.id),before=loaded.tribe(0).survival.waterLiters;
 step(loaded,carrier);assert.equal(carrier.waterWork.progressSeconds,progress);assert.equal(indoors(loaded,carrier,carrier.waterWork),false);assert.equal(loaded.tribe(0).survival.waterLiters,before);
 finish(loaded,carrier);assert.equal(loaded.tribe(0).survival.waterDeliveredLiters,24);
});
test('loaded paused water returns despite an obstructed former collection bank',()=>{
 const {g,u}=fixture();g.updateVision(0);assert.equal(beginWaterCollection(g).accepted,true);
 let iterations=0;while(u.waterWork?.phase!=='returning'&&iterations++<5000)step(g,u);assert.equal(u.waterWork.liters,SURVIVAL_RULES.waterTripLiters);
 const bank={...u.waterWork};g.state.buildings.push(g.makeBld('hut',bank.bankX,bank.bankZ,0));g.rebuildWalk();pauseWaterCollection(u);u.order='idle';
 const loaded=decodeGame(encodeGame(g)),carrier=loaded.state.units.find(p=>p.id===u.id);assert.equal(beginWaterCollection(loaded).accepted,true);assert.equal(carrier.waterWork.liters,24);assert.equal(carrier.waterWork.phase,'returning');
 finish(loaded,carrier);assert.equal(loaded.tribe(0).survival.waterDeliveredLiters,24);
});

test('manual work mode still permits independent physical drinking-water collection',()=>{
 const {g,u}=fixture();assert.equal(g.state.autoWorkEnabled,false);g.updateVision(0);const before=g.tribe(0).survival.waterLiters;
 g.state.time+=400;tickSurvival(g,400);assert.ok(g.tribe(0).survival.waterLiters<before,'residents actually consume the finite reserve');
 assert.ok(u.waterWork,'an available adult addresses drinking needs while general work remains manual');assert.equal(g.state.autoWorkEnabled,false);
 const afterConsumption=g.tribe(0).survival.waterLiters;finish(g,u);assert.equal(g.tribe(0).survival.waterLiters,afterConsumption+24);assert.equal(g.state.autoWorkEnabled,false);
});
