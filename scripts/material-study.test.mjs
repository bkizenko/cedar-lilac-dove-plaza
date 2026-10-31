import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {beginCopperStudy,copperStudyAI} from '../src/game/materialStudy.ts';import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[g.makeBld('workshop',0,38,0)];g.state.weather='clear';g.clockState=()=>({period:'Afternoon'});for(let i=0;i<20;i++)g.spawnUnit('worker',i%5,60+Math.floor(i/5),0);Object.assign(g.tribe(0),{copper:16,wood:20});g.rebuildWalk();return g;}
test('copper trials consume finite materials and require settlement mass and physical workshop labor',()=>{
 const g=fixture(),b=g.state.buildings[0];g.state.units.pop();assert.equal(beginCopperStudy(g,b.id),false);g.spawnUnit('worker',4,60,0);
 assert.equal(beginCopperStudy(g,b.id),true);const u=g.state.units.find(u=>u.copperStudy);assert.equal(g.tribe(0).copper,8);assert.equal(g.tribe(0).wood,16);
 assert.equal(g.tribe(0).copperExperiment,undefined);assert.equal(u.farmTool,undefined);
 for(let i=0;i<2000&&u.copperStudy;i++){g.state.time+=.1;g.navBudget=10;copperStudyAI(g,u,.1);}
 assert.equal(g.tribe(0).copperExperiment,true);assert.equal(u.farmTool,'copperTools');assert.equal(g.tribe(0).age,0);
});
test('discovered copper technique enables repeatable early workshop tools',async()=>{
 const {farmToolRequirement}=await import('../src/game/farmTools.ts');const g=fixture();assert.ok(farmToolRequirement(g,'copperTools'));g.tribe(0).copperExperiment=true;assert.equal(farmToolRequirement(g,'copperTools'),null);
});
test('interrupted experiments preserve paid effort across saves and resume without double spending',()=>{
 let g=fixture();const id=g.state.buildings[0].id;beginCopperStudy(g,id);let u=g.state.units.find(u=>u.copperStudy);u.copperStudy.progress=23;g.interruptMission(u);
 assert.equal(u.copperStudy.paused,true);const who=u.id;g=decodeGame(encodeGame(g));g.world.heights.fill(4);g.rebuildWalk();u=g.state.units.find(u=>u.id===who);
 assert.equal(beginCopperStudy(g,id),true);assert.equal(u.copperStudy.progress,23);assert.equal(g.tribe(0).copper,8);assert.equal(g.tribe(0).wood,16);
 const raw=encodeGame(g);raw.state.units.find(u=>u.id===who).copperStudy.progress=99;assert.throws(()=>decodeGame(raw));
});

test('Stone Age residents can gather discovered copper and physically bring it home',()=>{
 const g=fixture();g.state.buildings.push(g.makeBld('townhall',-20,38,0));g.rebuildWalk();g.vision.fill(2);g.tribe(0).copper=0;
 const u=g.state.units[0];u.selected=true;const n={id:g.id(),kind:'copper',x:5,z:65,y:4,amount:20,maxAmt:20,regenT:0,scale:1,rich:1};g.state.copper=[n];
 g.issueGather(n);assert.equal(u.order,'gather');for(let i=0;i<2000&&g.tribe(0).copper===0;i++){g.state.time+=.1;g.navBudget=10;g.workerAI(u,.1);}
 assert.ok(g.tribe(0).copper>0);assert.ok(n.amount<20);assert.equal(g.tribe(0).age,0);
});

test('prosperous rivals fund and complete the same physical copper prototype',async()=>{
 const {developRivalCopper}=await import('../src/game/materialStudy.ts');const g=fixture();
 for(const u of g.state.units)u.team=1;g.state.buildings[0].team=1;Object.assign(g.tribe(1),{food:10000,copper:16,wood:20});
 assert.equal(developRivalCopper(g,1),true);const u=g.state.units.find(u=>u.copperStudy);assert.equal(g.tribe(1).copper,8);
 for(let i=0;i<2000&&u.copperStudy;i++){g.state.time+=.1;g.navBudget=10;copperStudyAI(g,u,.1);}
 assert.equal(g.tribe(1).copperExperiment,true);assert.equal(u.farmTool,'copperTools');assert.equal(g.tribe(0).copperExperiment,undefined);
});
test('rival copper sampling respects knowledge and hunger',async()=>{
 const {developRivalCopper}=await import('../src/game/materialStudy.ts');const g=fixture();for(const u of g.state.units)u.team=1;g.state.buildings[0].team=1;
 Object.assign(g.tribe(1),{food:10000,copper:0,wood:20});g.state.copper=[{id:g.id(),kind:'copper',x:150,z:38,y:4,amount:20,maxAmt:20,regenT:0,scale:1,rich:1}];assert.equal(developRivalCopper(g,1),false);
 g.state.copper[0].x=5;g.state.copper[0].z=65;g.tribe(1).food=1;assert.equal(developRivalCopper(g,1),false);
 g.tribe(1).food=10000;assert.equal(developRivalCopper(g,1),true);assert.ok(g.state.units.some(u=>u.node===g.state.copper[0]));assert.equal(g.tribe(1).copper,0);
});

test('workshop recipes expose the copper technique at the same sites that actually craft it',async()=>{
 const {farmToolWorkplace,beginFarmToolWork}=await import('../src/game/farmTools.ts');
 assert.equal(farmToolWorkplace('copperTools','workshop',false),false);
 assert.equal(farmToolWorkplace('copperTools','workshop',true),true);
 assert.equal(farmToolWorkplace('copperTools','townhall',true),false);
 assert.equal(farmToolWorkplace('ironTools','workshop',true),false);
 const g=fixture();g.tribe(0).copperExperiment=true;
 assert.equal(beginFarmToolWork(g,'copperTools',0,g.state.buildings[0].id),true);
});
test('new priorities keep an active copper trial and its paid effort',()=>{
 const g=fixture();assert.equal(beginCopperStudy(g,g.state.buildings[0].id),true);
 const u=g.state.units.find(u=>u.copperStudy);u.copperStudy.progress=23;
 const copper=g.tribe(0).copper;g.setLaborPriority('wood');
 assert.equal(u.copperStudy.paused,undefined);assert.equal(u.copperStudy.progress,23);assert.equal(u.order,'hold');assert.equal(g.tribe(0).copper,copper);
});
test('queued copper experiments yield to a new focus and can resume without new materials',()=>{
 const g=fixture(),b=g.state.buildings[0];
 for(const u of g.state.units.slice(0,3)){u.weaponWork={kind:'spear',workplace:b.id,progress:0,duration:24};u.order='hold';}
 assert.equal(beginCopperStudy(g,b.id),true);const u=g.state.units.find(u=>u.copperStudy),copper=g.tribe(0).copper;
 g.setLaborPriority('wood');assert.equal(u.copperStudy.paused,true);assert.notEqual(u.order,'hold');
 assert.equal(beginCopperStudy(g,b.id),true);assert.equal(g.tribe(0).copper,copper);
 g.interruptMission(u);u.buildOrder=999;u.order='build';assert.equal(beginCopperStudy(g,b.id),false);assert.equal(u.buildOrder,999);
});
