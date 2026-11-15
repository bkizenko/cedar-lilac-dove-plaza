import test from 'node:test';import assert from 'node:assert/strict';import {Game} from '../src/game/sim.ts';
import {resourceCap,resourceCaps,resourceFull,RESOURCE_CAP_RULES} from '../src/game/storageCaps.ts';
function setup(){const g=new Game();g.reset(42,10);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[];g.vision.fill(2);g.rebuildWalk();const home=g.campOf(0);return{g,home};}
test('caps start at the base value and grow with finished storehouses',()=>{const{g,home}=setup();assert.equal(resourceCap(g,0,'wood'),RESOURCE_CAP_RULES.base.wood);
 const b=g.addBuilding?g.addBuilding('warehouse',home.x+10,home.z,0):null;
 if(b){b.progress=1;b.built=true;}
 const caps=resourceCaps(g,0);assert.ok(caps.wood>=RESOURCE_CAP_RULES.base.wood);assert.ok(caps.stone>=RESOURCE_CAP_RULES.base.stone);});
test('a full store keeps the stone at its source and loses nothing',()=>{const{g,home}=setup();g.tribe(0).stone=resourceCap(g,0,'stone');assert.ok(resourceFull(g,0,'stone'));
 const stone={id:g.id(),kind:'stone',x:home.x+8,z:home.z,y:4,amount:30,maxAmt:30,regenT:0,scale:1,rich:1};const u=g.spawnUnit('worker',home.x+6,home.z,0);g.state.stones=[stone];u.selected=true;g.issueGather(stone);
 for(let i=0;i<30;i++){u.gatherT=100;g.navBudget=30;g.workerAI(u,.1);}
 assert.equal(stone.amount,30);assert.equal(u.carry,0);assert.equal(g.tribe(0).stone,resourceCap(g,0,'stone'));});
test('a loaded worker still delivers into a full store (overshoot bounded by the load)',()=>{const{g,home}=setup();const cap=resourceCap(g,0,'wood');g.tribe(0).wood=cap;
 const u=g.spawnUnit('worker',home.x+1,home.z,0);u.carry=4;u.carryType='wood';u.order='return';
 for(let i=0;i<400&&u.carry>0;i++){g.navBudget=30;g.workerAI(u,.25);}
 assert.equal(u.carry,0);assert.equal(g.tribe(0).wood,cap+4);});
