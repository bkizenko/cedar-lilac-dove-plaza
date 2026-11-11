import test from 'node:test';import assert from 'node:assert/strict';import {Game} from '../src/game/sim.ts';import {BUILDINGS,QUARRY_R} from '../src/game/constants.ts';import {buildingCost} from '../src/game/construction.ts';import {discountQuarryPlans,quarrySurvey,staffQuarry,quarryReport} from '../src/game/mining.ts';import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(345,1);g.enterIsland();g.world.heights.fill(4);g.state.buildings=[g.makeBld('townhall',0,0,0),g.makeBld('quarry',24,25,0)];g.state.units=[];g.state.trees=[];g.state.forage=[];g.state.stones=[];g.vision.fill(2);g.rebuildWalk();return{g,q:g.state.buildings[1]};}
function stone(g,x,amount=1){return{id:g.id(),kind:'stone',x,z:25,y:4,amount,maxAmt:amount,regenT:0,scale:1,rich:1};}
test('new quarries cost18logs, unpaid oldquotes discount without refunds to paid or partlybuilt projects, and save exact costs',()=>{const{g,q}=fixture();assert.equal(BUILDINGS.quarry.wood,18);assert.equal(buildingCost('quarry',g,0).wood,18);q.build=.4;const plan=g.makeBld('quarry',60,20,0);plan.build=0;plan.queue=[];plan.plannedCost={food:0,wood:36,stone:0,copper:0,iron:0};g.state.buildings.push(plan);const wood=g.tribe(0).wood;discountQuarryPlans(g);assert.equal(plan.plannedCost.wood,18);assert.equal(q.build,.4);assert.equal(q.plannedCost,undefined);assert.equal(g.tribe(0).wood,wood);const raw=encodeGame(g);raw.state.buildings.find(b=>b.id===plan.id).plannedCost.wood=36;const loaded=decodeGame(raw);assert.equal(loaded.state.buildings.find(b=>b.id===plan.id).plannedCost.wood,18);assert.equal(loaded.tribe(0).wood,wood);});
test('one quarry sends miners to multiple actual outcrops across32m and both loads must reach stores before stock increases',()=>{const{g,q}=fixture();assert.equal(QUARRY_R,32);const a=stone(g,20),b=stone(g,46);g.state.stones=[a,b];const u=g.spawnUnit('worker',22.8,25,0),v=g.spawnUnit('worker',23,28,0);g.rebuildWalk();assert.equal(staffQuarry(g,q.id),2);assert.deepEqual(new Set([u.node.id,v.node.id]),new Set([a.id,b.id]));const survey=quarrySurvey(g,q);assert.equal(survey.knownOutcropCount,2);assert.equal(survey.reachableOutcropCount,2);assert.equal(survey.workerCapacity,4);assert.equal(survey.surfaceStone,2);assert.match(quarryReport(g,q),/2 known outcrops/);assert.match(quarryReport(g,q),/within 32m/);const before=g.tribe(0).stone,random=Math.random;Math.random=()=>.5;try{for(let i=0;i<2400&&g.tribe(0).stone<before+2;i++){g.state.time+=.1;g.navBudget=10;g.workerAI(u,.1);g.workerAI(v,.1);}}finally{Math.random=random;}assert.equal(a.amount,0);assert.equal(b.amount,0);assert.equal(g.tribe(0).stone,before+2);assert.equal(quarrySurvey(g,q).surfaceStone,0);});
test('quarry reports never reveal hidden or out-of-area stone and additional dispatch respects actual per-outcrop capacity',()=>{const{g,q}=fixture();g.state.stones=[stone(g,20,10),stone(g,46,20),stone(g,55,30),stone(g,70,40)];const explored=g.exploredAt.bind(g);g.exploredAt=(x,z)=>x===55?false:explored(x,z);for(let i=0;i<5;i++)g.spawnUnit('worker',22+i*.5,26,0);g.rebuildWalk();const s=quarrySurvey(g,q);assert.equal(s.knownOutcropCount,2);assert.equal(s.surfaceStone,30);assert.equal(s.workerCapacity,4);assert.equal(staffQuarry(g,q.id),2);assert.equal(staffQuarry(g,q.id),2);assert.equal(staffQuarry(g,q.id),0);assert.equal(g.state.units.filter(u=>u.job==='stone').length,4);for(const n of g.state.stones)assert.ok(g.state.units.filter(u=>u.node===n).length<=2);});

test('new quarry placement requires a reachable, surveyed stone cluster and keeps the chosen site',()=>{
  const {g}=fixture();
  g.state.buildings.pop();
  g.state.weather='clear';
  g.tribe(0).wood=100;
  const x=24,z=25;
  const a=stone(g,20,15),b=stone(g,37,14),c=stone(g,47,12);
  g.state.stones=[a];
  assert.match(g.placementIssue('quarry',x,z),/Surveyed 1 outcrops · 15 stone/);
  assert.equal(g.placeBuilding('quarry',x,z),false);
  assert.equal(g.tribe(0).wood,100);
  g.state.stones.push(b,c);

  const explored=g.exploredAt.bind(g);
  g.exploredAt=(px,pz)=>px===c.x?false:explored(px,pz);
  assert.match(g.placementIssue('quarry',x,z),/Surveyed 2 outcrops · 29 stone/);
  g.exploredAt=explored;

  const connected=g.workBoard.connected.bind(g.workBoard);
  g.workBoard.connected=(game,ax,az,bx,bz)=>bx===c.x?false:connected(game,ax,az,bx,bz);
  assert.match(g.placementIssue('quarry',x,z),/Surveyed 2 outcrops · 29 stone/);
  g.workBoard.connected=connected;

  c.amount=1;
  assert.match(g.placementIssue('quarry',x,z),/Surveyed 3 outcrops · 30 stone/);
  c.amount=12;
  assert.equal(g.placementIssue('quarry',x,z),null);
  assert.equal(g.placeBuilding('quarry',x,z),true);
  const quarry=g.state.buildings.at(-1);
  assert.deepEqual([quarry.type,quarry.x,quarry.z],['quarry',x,z]);
  assert.equal(g.tribe(0).wood,82);
  assert.equal(quarrySurvey(g,quarry).reachableSurfaceStone,41);
});

test('mountain quarry placement exposes a finite seam without a surface boulder',()=>{
  const {g}=fixture();
  g.state.buildings.pop();
  g.world.heights.fill(12);
  g.rebuildWalk();
  g.state.weather='clear';
  g.tribe(0).wood=100;
  assert.equal(g.placeBuilding('quarry',24,25),true);
  const quarry=g.state.buildings.at(-1);
  const survey=quarrySurvey(g,quarry);
  assert.equal(survey.reachableOutcropCount,0);
  assert.ok(survey.seamStone>=320&&survey.seamStone<=1200);
});
