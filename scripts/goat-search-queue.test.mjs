import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {searchForWildGoats,cancelGoatSearch,tickGoatSearchOrders,GOAT_QUEUE_RULES,goatSearchTarget} from '../src/game/animalOrders.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(42);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,50,0),g.makeBld('pen',30,30,0)];g.state.wildlife=[];g.state.trees=[];g.state.stones=[];g.state.forage=[];g.state.fish=[];g.state.autoWorkEnabled=false;g.vision.fill(2);g.rebuildWalk();const u=g.spawnUnit('worker',0,30,0),pen=g.state.buildings[1];const a={id:g.id(),species:'goat',x:5,z:30,y:4,hp:2,maxHp:2,facing:0,vx:0,vz:0,wanderT:10000,fly:0,scale:1};g.state.wildlife.push(a);return{g,u,pen,a};}
test('one pen-owned request waits without payment, is rate bounded, and dispatches when a direct lock is released with Auto off',()=>{
 const {g,u,pen}=fixture();u.jobLock=true;u.job='wood';const food=g.tribe(0).food;
 assert.equal(searchForWildGoats(g,pen.id).accepted,true);assert.equal(pen.goatSearch.state,'waiting');assert.equal(pen.goatSearch.reason,'adult');assert.equal(g.tribe(0).food,food);
 const order=pen.goatSearch,next=order.nextAttemptAt;searchForWildGoats(g,pen.id);assert.equal(pen.goatSearch,order);assert.equal(order.nextAttemptAt,next);
 u.jobLock=false;for(let i=0;i<20;i++)tickGoatSearchOrders(g);assert.equal(u.tamingWork,undefined);assert.equal(g.tribe(0).food,food);
 g.state.time+=GOAT_QUEUE_RULES.retrySeconds;tickGoatSearchOrders(g);assert.ok(u.tamingWork);assert.equal(order.state,'capturing');assert.equal(g.tribe(0).food,food-6);
 for(let i=0;i<10;i++)tickGoatSearchOrders(g);assert.equal(g.tribe(0).food,food-6);
});
test('no food or zero usable pen capacity waits without paying or stealing a committed worker',()=>{
 const {g,u,pen}=fixture();g.tribe(0).food=0;searchForWildGoats(g,pen.id);assert.equal(pen.goatSearch.reason,'food');assert.equal(u.tamingWork,undefined);
 g.tribe(0).food=100;pen.w=.5;pen.d=.5;g.state.time+=5;tickGoatSearchOrders(g);assert.equal(pen.goatSearch.reason,'space');assert.equal(g.tribe(0).food,100);
 pen.w=10;pen.d=10;u.productionProjectId=999;g.state.time+=5;tickGoatSearchOrders(g);assert.equal(pen.goatSearch.reason,'adult');assert.equal(u.productionProjectId,999);assert.equal(g.tribe(0).food,100);
});
test('known fully explored reachable ground without goats terminates rather than repeatedly packing journeys',()=>{
 const {g,u,pen}=fixture();g.state.wildlife=[];const food=g.tribe(0).food;
 assert.equal(searchForWildGoats(g,pen.id).accepted,false);assert.equal(pen.goatSearch.state,'exhausted');
 for(let i=0;i<20;i++){g.state.time+=5;tickGoatSearchOrders(g);}assert.equal(g.tribe(0).food,food);assert.equal(u.expedition,undefined);
});
test('cancelling waiting requests prevents future dispatch; cancelling a paid capture pauses progress and preserves unused carried food',()=>{
 const {g,u,pen}=fixture();u.jobLock=true;searchForWildGoats(g,pen.id);assert.equal(cancelGoatSearch(g,pen.id),true);u.jobLock=false;g.state.time+=5;tickGoatSearchOrders(g);assert.equal(u.tamingWork,undefined);
 searchForWildGoats(g,pen.id);u.tamingWork.progress=12;const food=g.tribe(0).food;u.expedition={food:9,returning:false,forage:0};
 assert.equal(cancelGoatSearch(g,pen.id),true);assert.equal(pen.goatSearch,undefined);assert.equal(u.tamingWork.progress,12);assert.equal(u.tamingWork.paused,true);assert.equal(u.expedition.food,9);assert.equal(g.tribe(0).food,food);assert.equal(u.order,'return');
});
test('strict save retains queued pen intent and rejects invalid queue schema and ownership',()=>{
 const g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();const u=g.state.units.find(p=>p.team===0),pen=g.makeBld('pen',u.x+15,u.z,0);g.state.buildings.push(pen);
 for(const p of g.state.units.filter(p=>p.team===0)){p.jobLock=true;p.job='wood';}searchForWildGoats(g,pen.id);
 const copy=decodeGame(encodeGame(g));assert.deepEqual(copy.state.buildings.find(p=>p.id===pen.id).goatSearch,pen.goatSearch);
 for(const change of [q=>q.nextAttemptAt=Infinity,q=>q.nextAttemptAt=g.state.time+100,q=>q.state='freeGoats',q=>q.animal=1e15,q=>q.unowned=true,q=>q.searchedCells=[1,1],q=>q.searchedCells=[192*192],q=>q.searchedCells=Array(2049).fill(0)]){const raw=encodeGame(g),b=raw.state.buildings.find(p=>p.id===pen.id);change(b.goatSearch);assert.throws(()=>decodeGame(raw));}
 const raw=encodeGame(g);raw.state.buildings.find(p=>p.id===pen.id).type='hut';assert.throws(()=>decodeGame(raw));
});

test('remembered-ground survey is bounded and never chooses targets from hidden animal coordinates',()=>{
 const {g,u,pen,a}=fixture();g.vision.fill(1);pen.goatSearch={requestedAt:0,nextAttemptAt:0,state:'waiting'};
 g.findExploreTarget=()=>{throw new Error('queued survey must not scan the entire fog grid');};
 const one=goatSearchTarget(g,u,pen);assert.ok(one);a.x=180;a.z=180;const two=goatSearchTarget(g,u,pen);
 assert.deepEqual(two,one,'unseen goat movement is not consulted');assert.ok(pen.goatSearch.searchedCells.length<=512);
 g.vision.fill(2);assert.equal(goatSearchTarget(g,u,pen)?.x,a.x,'actual observed animals may guide capture');
});
