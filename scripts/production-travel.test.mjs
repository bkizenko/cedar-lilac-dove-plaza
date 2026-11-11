import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {beginProduction,productionIssue,productionAI} from '../src/game/production.ts';
import {findPath} from '../src/game/navigation.ts';

const cellIndex=(g,p)=>Math.floor((p.z+g.world.size/2)/(g.world.size/520))*520+Math.floor((p.x+g.world.size/2)/(g.world.size/520));
function nativeBatch(){
 const g=new Game();g.reset(0,17,{size:1040,layout:'continents'});g.state.conflict='quiet';g.enterIsland();
 const b=g.makeBld('grindingStone',-162,-298,0);g.state.buildings.push(b);g.rebuildWalk();
 Object.assign(g.tribe(0),{food:1004,foodLots:{provisions:1000,grain:4}});
 const u=g.state.units.find(u=>u.team===0&&!productionIssue(g,'grindGrainStation',b.id,u.id));assert.ok(u,'an original founder is at the real camp cache');
 assert.equal(beginProduction(g,'grindGrainStation',b.id,u.id),true);
 return {g,u,b,p:g.state.production.projects.at(-1)};
}
test('paid mill-input carrier uses a real native detour despite its reserved hold order',()=>{
 const {g,u,b,p}=nativeBatch(),start={x:u.x,z:u.z},entrance=g.interactionSpot(u,b);
 assert.ok(entrance);assert.ok(g.workBoard.connected(g,u.x,u.z,entrance.x,entrance.z));
 assert.equal(findPath(g.walk,520,cellIndex(g,u),cellIndex(g,entrance)),null);
 assert.ok(findPath(g.walk,520,cellIndex(g,u),cellIndex(g,entrance),96000)?.length>300);
 g.navBudget=1;const stuck=u.stuckT;productionAI(g,u,.2);
 assert.equal(g.navBudget,0);assert.equal(g.peekMovementRoute(u.id),undefined);assert.equal(u.stuckT,stuck);assert.equal(u.x,start.x);assert.equal(u.z,start.z);
 g.navBudget=3;productionAI(g,u,.2);
 assert.equal(g.navBudget,0);assert.equal(u.order,'hold');assert.equal(p.phase,'carrying');assert.ok(g.peekMovementRoute(u.id)?.points.length>300);assert.equal(g.peekMovementRoute(u.id)?.failed,false);
 for(let i=0;i<60;i++){g.step(.2);assert.deepEqual(g.simulationErrors,[]);}
 assert.ok(Math.hypot(u.x-start.x,u.z-start.z)>20,'the original loaded resident walks the admitted route');
 assert.equal(g.tribe(0).foodLots.grain,0);assert.equal(g.state.production.metrics.grainUsed,4);assert.equal(g.state.production.projects.filter(p=>p.recipe==='grindGrainStation').length,1);
});

test('only owned travelling paid batches yield in a tight physical passage; stationary holds stay put',()=>{
 const g=new Game();g.reset(42,10);g.enterIsland();g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.state.units=[];g.state.buildings=[];
 for(const x of[-5,5]){const b=g.makeBld('hut',x,30,0);b.w=10;b.d=10;b.y=4;g.state.buildings.push(b);}g.rebuildWalk();
 const a=g.spawnUnit('worker',0,30,0),b=g.spawnUnit('worker',0,30,0);a.order=b.order='hold';a.productionProjectId=g.state.nextId++;
 const p={id:a.productionProjectId,team:0,actorId:a.id,phase:'carrying',recipe:'grindGrainStation',workplace:g.state.buildings[0].id,progress:0,started:0,resumePhase:'carrying',blockedReason:''};
 g.state.production={version:1,projects:[p],metrics:{consumed:{},produced:{},spoiled:{},lost:{},logsUsed:0,waterUsedLiters:0,completed:0,interrupted:0}};
 for(const phase of['collecting','carrying','returning','unloading']){
  Object.assign(a,{x:0,z:30,y:4});Object.assign(b,{x:0,z:30,y:4});p.phase=phase;g.separate(.1);
  assert.ok(a.x>0&&a.x<1,'loaded carrier yields without entering the flanking huts');assert.equal(b.x,0);assert.equal(b.z,30);assert.ok(g.canStep(a,a.x,a.z));
 }
 for(const phase of['working','ready','paused','stored','complete','lost']){
  Object.assign(a,{x:0,z:30,y:4});Object.assign(b,{x:0,z:30,y:4});p.phase=phase;g.separate(.1);assert.equal(a.x,0,phase);assert.equal(b.x,0,phase);
 }
 p.phase='carrying';p.actorId=b.id;g.separate(.1);assert.equal(a.x,0,'stale ownership grants no movement');assert.equal(b.x,0);
 p.actorId=a.id;p.team=1;g.separate(.1);assert.equal(a.x,0,'other society ownership grants no movement');assert.equal(b.x,0);
});
