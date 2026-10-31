import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {beginHaulageWork} from '../src/game/haulage.ts';
import {commandDiagnostics,COMMAND_RULES,acceptWorkerCommand} from '../src/game/commandGateway.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){
 const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);g.vision.fill(2);
 g.state.buildings=[g.makeBld('townhall',0,38,0)];g.state.units=[];
 const u=g.spawnUnit('worker',0,62,0);u.selected=true;
 Object.assign(g.tribe(0),{wood:100,stone:50});g.rebuildWalk();
 return {g,u,hall:g.state.buildings[0]};
}
test('direct gathering interrupts paid crafting once and preserves materials and progress across save',()=>{
 const {g,u,hall}=fixture();assert.equal(beginHaulageWork(g,'sled',0,hall.id,u.id),true);
 u.haulageWork.progress=17;const wood=g.tribe(0).wood,stone=g.tribe(0).stone;
 const node=g.state.trees.find(n=>n.amount>0);g.issueGather(node);
 assert.equal(u.haulageWork.paused,true);assert.equal(u.haulageWork.progress,17);
 assert.equal(u.order,'gather');assert.equal(u.node,node);
 assert.equal(g.tribe(0).wood,wood);assert.equal(g.tribe(0).stone,stone);
 const restored=decodeGame(encodeGame(g));const worker=restored.state.units.find(p=>p.id===u.id);
 assert.equal(worker.haulageWork.progress,17);assert.equal(worker.haulageWork.paused,true);
 assert.equal(commandDiagnostics(g).accepted,1);
});
test('drill suspends paid work rather than leaving a competing active owner',()=>{
 const {g,u,hall}=fixture();assert.equal(beginHaulageWork(g,'sled',0,hall.id,u.id),true);
 g.tribe(0).age=1;g.tribe(0).food=10000;g.assignJob('drill');
 assert.equal(u.drill,0);assert.equal(u.haulageWork.paused,true);
});
test('incapacitated residents reject land orders with a reason and bounded diagnostics',()=>{
 const {g,u}=fixture();u.hp=0;u.order='hold';assert.equal(acceptWorkerCommand(g,u,'assign:wood'),false);assert.equal(u.order,'hold');
 assert.match(u.workReason,/incapacitated/);
 for(let i=0;i<150;i++)acceptWorkerCommand(g,u,'gather');
 const d=commandDiagnostics(g);assert.equal(d.attempted,151);assert.equal(d.rejected,151);
 assert.equal(d.outcomes.length,COMMAND_RULES.recentOutcomeLimit);
 d.outcomes.length=0;assert.equal(commandDiagnostics(g).outcomes.length,COMMAND_RULES.recentOutcomeLimit);
});
test('starting a new world clears command assessments from the preceding session',()=>{
 const {g,u}=fixture();acceptWorkerCommand(g,u,'gather');assert.equal(commandDiagnostics(g).attempted,1);
 g.reset(123456);assert.equal(commandDiagnostics(g).attempted,0);
});
