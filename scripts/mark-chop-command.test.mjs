import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {applyEngineCommand,isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
function fixture(){
 const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);g.vision.fill(2);
 g.state.buildings=[g.makeBld('townhall',0,38,0)];g.state.units=[];g.spawnUnit('worker',0,62,0);g.rebuildWalk();
 return g;
}
test('mark-chop is a valid command and marks trees in the real simulation (worker mode)',()=>{
 const g=fixture(),ids=g.state.trees.filter(t=>t.amount>0).slice(0,3).map(t=>t.id);
 assert.ok(ids.length>0);
 assert.equal(isEngineDispatchCommand({kind:'mark-chop',treeIds:ids}),true);
 assert.equal(isEngineDispatchCommand({kind:'mark-chop',treeIds:[]}),false);
 assert.equal(isEngineDispatchCommand({kind:'mark-chop',treeIds:[1.5]}),false);
 assert.equal(isEngineDispatchCommand({kind:'mark-chop',treeIds:ids,extra:1}),false);
 const out=applyEngineCommand(g,{kind:'mark-chop',treeIds:ids});
 assert.equal(out.accepted,true);
 for(const id of ids)assert.ok(g.chopMarks.has(id),'tree '+id);
});
test('gather-targets is a valid command and sends an idle worker to a stone',()=>{
 const g=fixture(),st=g.state.stones.find(n=>n.amount>0&&g.exploredAt(n.x,n.z));
 assert.ok(st);
 assert.equal(isEngineDispatchCommand({kind:'gather-targets',stoneIds:[st.id],animalIds:[]}),true);
 assert.equal(isEngineDispatchCommand({kind:'gather-targets',stoneIds:['a'],animalIds:[]}),false);
 const out=applyEngineCommand(g,{kind:'gather-targets',stoneIds:[st.id],animalIds:[]});
 assert.equal(out.accepted,true);
 assert.ok(g.state.units.some(u=>u.order==='gather'&&u.node===st));
});
