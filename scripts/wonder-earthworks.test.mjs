import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {planWonderEarthwork,executeWonderEarthwork,continueWonderEarthwork,wonderEarthworkProgress,stageIssue} from '../src/game/wonderEarthworks.ts';
import {excavationCuts} from '../src/game/excavation.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';

function world(){const g=new Game();g.reset(4,18,{size:1040,layout:'pangaea'});g.enterIsland();g.testMode=true;g.revealMap=true;g.updateVision(0);Object.assign(g.state,{weather:'clear',weatherT:1e5,raidT:1e5});return g;}
const CISTERN={x:80,z:-380,w:12,d:12};

test('native terrain: a cistern is dug by workers through ordinary excavation; labour equals the planned soil, the floor is reached and it round-trips',()=>{
  const g=world(),plan=planWonderEarthwork(g,'canyonCistern',CISTERN),h0=g.height(CISTERN.x,CISTERN.z);
  assert.deepEqual(plan.issues.filter(i=>!i.startsWith('The design')),[]);assert.ok(plan.stages.length>=4);assert.ok(plan.workSeconds>=plan.plannedCutCubicMetres*6);
  const r=executeWonderEarthwork(g,plan);assert.equal(r.ok,true);
  assert.equal(g.height(CISTERN.x,CISTERN.z),h0,'laying out digs changes no ground');assert.equal(excavationCuts(g).length,0);
  const units=g.state.units.filter(u=>u.team===0);units.forEach((u,i)=>Object.assign(u,{x:CISTERN.x+i*2-4,z:CISTERN.z-15,y:g.height(CISTERN.x+i*2-4,CISTERN.z-15)}));g.rebuildWalk();
  let p;for(let s=0;s<6000;s+=.2){g.state.paused=false;g.step(.2);if(Math.abs(s%10)>=.1)continue;
    for(const u of units){u.hunger=0;u.thirstSeconds=0;}
    continueWonderEarthwork(g,plan);p=wonderEarthworkProgress(g,plan);if(p.complete)break;
    // the player orders idle diggers to the open dig (the job board leaves later player digs to the player)
    const open=p.buildingIds.map(id=>g.state.buildings.find(b=>b.id===id)).find(b=>b.build<1);if(open)for(const u of units)if(u.order!=='build'){u.order='build';u.buildOrder=open.id;}}
  assert.equal(p.complete,true,JSON.stringify(p));assert.deepEqual(g.simulationErrors,[]);
  const cuts=excavationCuts(g).filter(c=>p.buildingIds.includes(c.buildingId)),work=cuts.reduce((a,c)=>a+c.workSeconds,0),vol=cuts.reduce((a,c)=>a+c.volumeCubicMeters,0);
  assert.ok(Math.abs(vol-plan.plannedCutCubicMetres)/plan.plannedCutCubicMetres<.03,`dug ${vol} vs planned ${plan.plannedCutCubicMetres}`);
  assert.ok(work>=plan.plannedCutCubicMetres*6*.97&&work<=plan.workSeconds*1.05,`paid ${work} vs plan ${plan.workSeconds}`);
  assert.ok(Math.abs(g.height(CISTERN.x,CISTERN.z)-(h0-2))<.05,'the centre dig lowered the ground by its 2 m');
  assert.ok(g.height(CISTERN.x,CISTERN.z)-plan.floorMetres<.35);
  const back=decodeGame(JSON.parse(JSON.stringify(encodeGame(g))));assert.equal(back.height(CISTERN.x,CISTERN.z),g.height(CISTERN.x,CISTERN.z));
});

test('preview and commit share one check, and commission is all-or-nothing',()=>{
  const g=world(),plan=planWonderEarthwork(g,'canyonCistern',CISTERN);
  // a tree on the banks blocks the dig at preview and at commission alike
  g.state.trees.push({x:CISTERN.x+1,z:CISTERN.z+1,y:g.height(CISTERN.x+1,CISTERN.z+1),amount:40,max:40,kind:'oak'});
  const again=planWonderEarthwork(g,'canyonCistern',CISTERN);assert.ok(again.issues.some(i=>i.includes('Clear or gather')));
  assert.equal(stageIssue(g,again.stages[0],0)!==null||again.stages.some(s=>s.issue),true);
  const before=g.state.buildings.length,r=executeWonderEarthwork(g,plan);assert.equal(r.ok,false);assert.ok(r.reason.includes('Clear or gather'));assert.equal(g.state.buildings.length,before,'nothing laid out');
});

test('native court: cut-only design, fill and depth shortfall are reported, never conjured',()=>{
  const g=world(),plan=planWonderEarthwork(g,'assemblyCourt',{x:400,z:280,w:24,d:20});
  assert.deepEqual(plan.issues.filter(i=>!i.startsWith('The design')),[]);assert.ok(plan.stages.length>0);assert.ok(plan.rake>0&&plan.rake<=.45);
  assert.ok(plan.fillCubicMetres>=0);assert.ok(plan.residualMeanMetres<.4);
  for(const s of plan.stages)assert.ok([.5,1,1.5,2].includes(s.depth)&&s.depth<=s.needMetres+.25);
  const deep=planWonderEarthwork(g,'canyonCistern',CISTERN,{depthMetres:4});assert.ok(deep.unreachedMetres>1.5);assert.ok(deep.issues.some(i=>i.startsWith('The design is')));
});
