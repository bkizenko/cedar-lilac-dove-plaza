import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {reconcileTreeWorkers} from '../src/game/workAllocation.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){
 const g=new Game();g.reset(345,2);g.enterIsland();g.world.heights.fill(4);g.state.time=100;g.vision.fill(2);
 g.state.buildings=[g.makeBld('townhall',0,38,0)];g.state.units=[];
 g.state.trees=g.state.trees.slice(0,12);g.state.trees.forEach((n,i)=>Object.assign(n,{x:10+(i%4)*5,z:60+Math.floor(i/4)*5,amount:100}));
 for(let i=0;i<20;i++){g.spawnUnit('worker',i*.2,52,0);const u=g.state.units.at(-1);u.job='wood';u.jobLock=true;u.order='gather';u.node=g.state.trees[0];}
 g.rebuildWalk();return g;
}
test('twenty legacy cutters spread among trees with no more than two per tree and no lost cargo',()=>{
 const g=fixture(),loaded=g.state.units[0];loaded.carry=8;loaded.carryType='wood';
 reconcileTreeWorkers(g);assert.equal(loaded.order,'return');assert.equal(loaded.carry,8);
 for(const u of g.state.units)if(u.order==='idle')g.workBoard.assign(g,u);
 const groups=new Map();for(const u of g.state.units)if(u.order==='gather')groups.set(u.node.id,(groups.get(u.node.id)||0)+1);
 assert.ok(groups.size>=9);assert.ok([...groups.values()].every(n=>n<=2));
 assert.equal(g.state.units.filter(u=>u.order==='gather').length,19);
});
test('saved crowded orders are repaired and neighboring tribes share physical tree capacity',()=>{
 const g=decodeGame(encodeGame(fixture()));g.state.units[0].team=1;g.state.units[1].team=2;
 reconcileTreeWorkers(g);assert.equal(g.state.units.filter(u=>u.order==='gather').length,2);
 const tree=g.state.trees[0];for(const u of g.state.units)if(u.node===tree)u.team=1;
 const player=g.state.units.find(u=>u.team===0&&!u.node);g.state.trees=[tree];
 assert.equal(g.findNode(player,'wood'),null);
});

test('a worker can chop from a safe approach beside an obstructed trunk and physically unload the timber',()=>{
 const g=fixture();g.state.units=g.state.units.slice(0,1);const u=g.state.units[0],tree=g.state.trees[0];
 tree.x=10;tree.z=55;Object.assign(u,{x:12.8,y:4,z:55,tx:12.8,tz:55,carry:0,gatherT:0});
 const initial=tree.amount,stock=g.tribe(0).wood;
 // Reproduce a reachable approach 2.8m from a trunk, outside the old 1.22m limit.
 g.nearestWalk=()=>({x:12.8,z:55});g.state.trees=[tree];
 for(let i=0;i<1600&&g.tribe(0).wood===stock;i++){g.state.time+=.1;g.navBudget=4;g.workerAI(u,.1);}
 assert.ok(tree.amount<initial);assert.ok(g.tribe(0).wood>stock,'real harvested cargo reaches storage');
});
