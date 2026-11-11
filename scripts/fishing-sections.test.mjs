import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {fishingGrounds,fishingReport,catchDockFish} from '../src/game/fishing.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){
 const g=new Game();g.reset(123456);g.enterIsland();g.state.units=[];g.state.buildings=[];g.state.fish=[];g.vision.fill(2);g.state.time=0;
 g.height=(x,z)=>((x>=2&&x<=8)||(x>=12&&x<=18))&&z>=-16&&z<=16?0:4;
 const left=g.makeBld('dock',0,0,0),right=g.makeBld('dock',20,0,0);g.state.buildings=[left,right];return {g,left,right};
}
test('distinct ponds across a narrow land strip have finite independent stocks, preserved through saves',()=>{
 const {g,left,right}=fixture(),a=fishingGrounds(g,left,true);assert.ok(a.length);assert.ok(a.every(n=>n.x<=8));
 for(const n of a){n.amount=0;n.pressure=1;n.regenT=200;}
 const b=fishingGrounds(g,right,true);assert.ok(b.length);assert.ok(b.every(n=>n.x>=12));assert.ok(b.every(n=>n.amount>0));
 const before=g.state.fish.length;g.state.time=2;assert.equal(fishingGrounds(g,left).length,0);
 const duplicate=g.makeBld('dock',0,0,0);g.state.buildings.push(duplicate);assert.equal(fishingGrounds(g,duplicate).length,0);assert.equal(g.state.fish.length,before);
 assert.match(fishingReport(g,left),/depleted/);assert.doesNotMatch(fishingReport(g,right),/depleted|recover/);
 const loaded=decodeGame(encodeGame(g));assert.deepEqual(loaded.state.fish,g.state.fish);
});
test('missing water and unexplored shore are not diagnosed as depletion; repeated reports reuse the survey',()=>{
 const {g,left}=fixture();g.vision.fill(0);assert.match(fishingReport(g,left),/explore nearby water/);assert.equal(g.state.fish.length,0);
 g.vision.fill(2);g.state.time=1;fishingGrounds(g,left);assert.ok(g.state.fish.length);
 const height=g.height;let reads=0;g.height=(x,z)=>{reads++;return height(x,z);};fishingReport(g,left);const first=reads;
 for(let i=0;i<20;i++)fishingReport(g,left);assert.equal(reads,first+20,'each report samples its live seasonal work rate once; the connected-water survey is not repeated');
 g.height=()=>4;assert.match(fishingReport(g,left),/No connected water/);
});
test('fishing conserves the catch and brings eight fish home promptly when reserves are scarce',()=>{
 const {g,left}=fixture(),grounds=fishingGrounds(g,left),u=g.spawnUnit('worker',0,0,0);g.tribe(0).food=0;u.order='gather';u.node=left;u.carry=0;
 const total=()=>grounds.reduce((sum,n)=>sum+n.amount,0),before=total();
 for(let i=0;i<8;i++)catchDockFish(g,u,left);
 assert.equal(u.carry,8);assert.equal(u.order,'return');assert.equal(u.carryFood,'fish');assert.equal(before-total(),8);assert.equal(g.tribe(0).food,0);
});

test('an exhausted explored fishing ground can be inspected without becoming a gather target',()=>{
 const {g,left}=fixture();
 const fish=fishingGrounds(g,left,true)[0];
 fish.amount=0;fish.regenT=90;
 g.state.fish=[fish];g.state.buildings=[];
 assert.equal(g.resourceAt(fish.x,fish.z),null);
 g.selectAt(fish.x,fish.z,false);
 const info=g.snapshot().selection;
 assert.equal(info.name,'Fishing ground');
 assert.equal(info.hp,0);
 assert.equal(info.maxHp,fish.maxAmt);
 assert.match(info.info,/game seconds to the next fish/);
});

test('automatic and manual food selection skip fish without a reachable dry bank',()=>{
 const {g}=fixture();
 g.state.buildings=[];
 g.state.autoWorkEnabled=true;
 g.state.laborPolicy='food';
 g.state.trees=[];g.state.forage=[];g.state.stones=[];g.state.copper=[];g.state.iron=[];g.state.wildlife=[];
 g.height=(x,z)=>x>=0&&x<=24||Math.hypot(x+18,z)<2?0:4;
 g.waterAt=()=>.42;
 g.rebuildWalk();
 const fisher=g.spawnUnit('worker',-4,0,0);
 fisher.order='idle';fisher.job='food';fisher.jobLock=true;
 const fish=(x)=>({id:g.id(),kind:'fish',x,y:.52,z:0,amount:15,maxAmt:15,regenT:0,scale:1,rich:1});
 const inaccessible=fish(8),reachable=fish(-18);
 g.state.fish=[inaccessible,reachable];
 assert.equal(g.findNode(fisher,'food'),reachable);
 g.workBoard.reset();
 g.workBoard.assign(g,fisher);
 assert.equal(fisher.node,reachable);
 assert.equal(fisher.order,'gather');
 g.clearSelect();g.selectEntity(fisher);
 g.issueGather(inaccessible);
 assert.equal(fisher.node,reachable,'an impossible direct order leaves the existing job in place');
 assert.match(g.state.banner,/No reachable fishing bank/);
 reachable.amount=0;
 g.issueGather(reachable);
 assert.match(g.state.banner,/Fishing ground depleted/);
});
