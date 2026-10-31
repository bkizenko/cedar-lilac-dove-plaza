import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {beginWaterCollection} from '../src/game/survivalNeeds.ts';import {encodeGame,decodeGame} from '../src/game/persistence.ts';
test('loaded water carrier obeys reassignment by physically unloading first, and recall unloads once',()=>{
 const g=new Game();g.reset(42,10,{size:1040,layout:'pangaea'});g.enterIsland();g.vision.fill(2);
 const u=g.state.units.find(u=>u.team===0&&u.type==='worker');u.selected=true;u.order='idle';
 assert.equal(beginWaterCollection(g).accepted,true);assert.ok(u.waterWork);
 for(let i=0;i<3000&&u.waterWork.phase!=='returning';i++){g.state.time+=.1;g.navBudget=20;g.workerAI(u,.1);}
 assert.equal(u.waterWork.phase,'returning');const liters=u.waterWork.liters;assert.ok(liters>0);
 const before=g.tribe(0).survival.waterDeliveredLiters,tree=g.state.trees.find(n=>n.amount>0);g.issueGather(tree);
 assert.equal(u.waterWork.paused,true);assert.equal(g.tribe(0).survival.waterDeliveredLiters,before);
 for(let i=0;i<3000&&u.waterWork;i++){g.state.time+=.1;g.navBudget=20;g.workerAI(u,.1);}
 assert.equal(u.waterWork,undefined);assert.equal(g.tribe(0).survival.waterDeliveredLiters,before+liters);
 // A second real filled load survives JSON serialization before recall.
 u.order='idle';u.jobLock=false;assert.equal(beginWaterCollection(g).accepted,true);
 for(let i=0;i<3000&&u.waterWork.phase!=='returning';i++){g.state.time+=.1;g.navBudget=20;g.workerAI(u,.1);}
 const copy=decodeGame(encodeGame(g)),v=copy.state.units.find(p=>p.id===u.id),amount=v.waterWork.liters,delivered=copy.tribe(0).survival.waterDeliveredLiters;
 copy.clearSelect();v.selected=true;copy.soundRecall();
 for(let i=0;i<3000&&v.recalled;i++){copy.state.time+=.1;copy.navBudget=20;copy.workerAI(v,.1);}
 assert.equal(v.recalled,undefined);assert.equal(v.waterWork,undefined);assert.equal(copy.tribe(0).survival.waterDeliveredLiters,delivered+amount);
 copy.workerAI(v,.1);assert.equal(copy.tribe(0).survival.waterDeliveredLiters,delivered+amount);
});
