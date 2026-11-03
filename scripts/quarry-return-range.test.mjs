import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
function fixture(){
 const g=new Game();g.reset(345,1);g.enterIsland();g.world.heights.fill(14);
 g.state.buildings=[g.makeBld('townhall',0,0,0),g.makeBld('quarry',150,0,0)];
 g.state.units=[];g.state.trees=[];g.state.forage=[];g.state.stones=[];g.state.copper=[];g.state.iron=[];g.vision.fill(2);
 const u=g.spawnUnit('worker',12,0,0);u.ageT=40*1800;u.job='stone';u.jobLock=true;u.order='idle';u.carry=0;g.state.time=100;g.rebuildWalk();g.workBoard.reset();return{g,u,q:g.state.buildings[1]};
}
test('locked miner can resume completed distant quarry after unloading at home',()=>{
 const{g,u,q}=fixture();g.workBoard.assign(g,u);assert.equal(u.node?.id,q.id);assert.equal(u.order,'gather');assert.equal(u.job,'stone');
});
test('unfinished or enemy quarry never opens distant routine labor range',()=>{
 for(const kind of ['unfinished','enemy']){const{g,u,q}=fixture();if(kind==='unfinished')q.build=.2;else q.team=1;g.workBoard.reset();g.workBoard.assign(g,u);assert.notEqual(u.node?.id,q.id);}
});
test('distant quarry miner physically delivers and starts a second excavation trip without another order',()=>{
 const{g,u,q}=fixture();const stock=g.tribe(0).stone,terrain=g.world.heights.slice();let delivered=false,secondTrip=false;
 for(let i=0;i<18000&&!secondTrip;i++){
  g.state.time+=.1;g.navBudget=10;g.workerAI(u,.1);
  if(g.tribe(0).stone>stock)delivered=true;
  if(delivered&&u.order==='gather'&&u.node?.id===q.id&&Math.hypot(u.x-q.x,u.z-q.z)<8)secondTrip=true;
 }
 assert.ok(delivered,'actual mined stone reaches the home stock');assert.ok(secondTrip,'same miner physically returns to distant quarry');
 assert.equal(g.tribe(0).stone-stock+u.carry,q.excavation.dug,'finite seam debit equals stored plus carried stone');assert.deepEqual(g.world.heights,terrain);
});
test('distant workplace exception keeps actual enemy-danger and route checks',()=>{
 {const{g,u,q}=fixture();const foe=g.spawnUnit('spearman',q.x,q.z,3);assert.ok(g.isFoe(0,foe.team));g.workBoard.reset();g.workBoard.assign(g,u);assert.notEqual(u.node?.id,q.id);}
 {const{g,u,q}=fixture();const side=Math.sqrt(g.world.heights.length),seg=side-1;for(let z=0;z<=seg;z++)for(let x=0;x<=seg;x++){const wx=-g.world.size/2+x*g.world.size/seg;if(wx>65&&wx<85)g.world.heights[z*side+x]=100;}g.rebuildWalk();g.workBoard.reset();g.workBoard.assign(g,u);assert.notEqual(u.node?.id,q.id);}
});
