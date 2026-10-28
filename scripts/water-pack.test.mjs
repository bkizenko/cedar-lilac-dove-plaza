import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {beginHaulageWork,haulageWorkAI,carryingCapacity} from '../src/game/haulage.ts';
import {beginPackTaming,packTamingAI,releasePackAnimal} from '../src/game/packAnimals.ts';
import {waterNavigation,connectedForUnit} from '../src/game/waterTravel.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {GATHER} from '../src/game/constants.ts';
function terrain(g){g.height=(x,z)=>Math.abs(z)<12?g.world.waterY-2:Math.abs(z)<24?g.world.waterY+(Math.abs(z)-12)/3:4;g.rebuildWalk();}
function fixture(){const g=new Game();g.reset(123456);g.enterIsland();g.state.units=[];g.state.buildings=[];g.state.wildlife=[];g.state.weather='clear';g.clockState=()=>({period:'Afternoon'});g.vision.fill(2);terrain(g);const u=g.spawnUnit('worker',0,-32,0);Object.assign(g.tribe(0),{wood:100,stone:30,food:100});return {g,u};}
function work(g,u,seconds,fn){for(let i=0;i<seconds*10;i++){g.navBudget=10;g.state.time+=.1;fn(g,u,.1);}}
test('a dugout requires a completed dock, finite inputs, a worker and real crafting',()=>{
 const {g,u}=fixture();assert.equal(beginHaulageWork(g,'canoe'),false);
 const dock=g.makeBld('dock',0,-24,0);g.state.buildings=[dock];g.rebuildWalk();
 assert.equal(beginHaulageWork(g,'canoe',0,dock.id),true);assert.equal(g.tribe(0).wood,80);assert.equal(g.tribe(0).stone,28);assert.equal(u.haulage,undefined);
 work(g,u,130,haulageWorkAI);assert.equal(u.haulage,'canoe');assert.equal(carryingCapacity(u,'wood'),GATHER.wood.carry*2);
});
test('canoes cross water with cargo, disembark and return to a real store; foot travel stays blocked',()=>{
 const {g,u}=fixture();const hall=g.makeBld('townhall',12,-35,0);g.state.buildings=[hall];g.rebuildWalk();
 assert.equal(g.workBoard.connected(g,0,-32,0,32),false);assert.equal(g.canStep(u,0,0),false);
 u.haulage='canoe';u.selected=true;u.carry=12;u.carryType='wood';g.issueMove(0,32);
 work(g,u,90,(g,u,dt)=>g.workerAI(u,dt));assert.equal(u.order,'hold');assert.ok(u.z>30);assert.equal(u.carry,12);
 assert.equal(connectedForUnit(g,u,0,-32),true);const before=g.tribe(0).wood;u.order='return';u.node=null;
 work(g,u,90,(g,u,dt)=>{if(u.carry)g.workerAI(u,dt);});assert.equal(u.carry,0);assert.equal(g.tribe(0).wood,before+12);assert.ok(u.z< -24);
});
test('mid-water saved carriers retain their canoe, position, orders and load',()=>{
 const {g,u}=fixture();u.haulage='canoe';u.x=0;u.z=0;u.y=g.world.waterY+.16;u.order='move';u.tx=0;u.tz=32;u.carry=9;u.carryType='wood';
 const copy=decodeGame(encodeGame(g));terrain(copy);const sailor=copy.state.units[0];assert.equal(sailor.haulage,'canoe');assert.equal(sailor.z,0);assert.equal(sailor.carry,9);
 work(copy,sailor,90,(g,u,dt)=>{if(u.order==='move')g.workerAI(u,dt);});assert.ok(sailor.z>30);
 const nav=waterNavigation(copy);assert.equal(waterNavigation(copy),nav);copy.rebuildWalk();assert.notEqual(waterNavigation(copy),nav);
});
function goat(g){const c={id:g.id(),species:'goat',x:4,y:4,z:-32,facing:0,vx:0,vz:0,wanderT:30,hp:30,maxHp:30,fly:0,scale:1};g.state.wildlife=[c];g.state.buildings=[g.makeBld('townhall',12,-35,0)];g.rebuildWalk();return c;}
test('taming transfers one discovered goat into a real carrier and costs feed, harness and time',()=>{
 const {g,u}=fixture(),c=goat(g),hall=g.state.buildings[0];assert.equal(beginPackTaming(g,hall.id),true);assert.equal(g.tribe(0).food,90);assert.equal(g.tribe(0).wood,98);
 assert.equal(u.haulage,undefined);assert.equal(g.state.wildlife.length,1);
 work(g,u,100,packTamingAI);assert.equal(u.haulage,'pack');assert.equal(g.state.wildlife.some(a=>a.id===c.id),false);assert.equal(carryingCapacity(u,'wood'),GATHER.wood.carry*2);
 assert.equal(decodeGame(encodeGame(g)).state.units[0].haulage,'pack');
});
test('taming is exclusive, interruption preserves paid progress, and missing animals cannot be duplicated',()=>{
 const {g,u}=fixture(),c=goat(g),hall=g.state.buildings[0];g.spawnUnit('worker',-2,-32,0);
 assert.equal(beginPackTaming(g,hall.id),true);assert.equal(beginPackTaming(g,hall.id),false);
 work(g,u,20,packTamingAI);g.interruptMission(u);const progress=u.tamingWork.progress,food=g.tribe(0).food;assert.equal(u.tamingWork.paused,true);
 work(g,u,20,packTamingAI);assert.equal(u.tamingWork.progress,progress);u.order='hold';assert.equal(beginPackTaming(g,hall.id),true);assert.equal(g.tribe(0).food,food);
 c.hp=0;packTamingAI(g,u,.1);assert.equal(u.haulage,undefined);assert.equal(u.tamingWork,undefined);
});
test('unknown goats and malformed transport saves are rejected',()=>{
 const {g,u}=fixture();goat(g);g.vision.fill(0);assert.equal(beginPackTaming(g,g.state.buildings[0].id),false);assert.equal(g.tribe(0).food,100);
 const raw=encodeGame(g);raw.state.units[0].tamingWork={animal:1,progress:999};assert.throws(()=>decodeGame(raw));
});


test('canoe recall from mid-river reaches a dry hall with its actual load',()=>{
 const {g,u}=fixture();g.state.buildings=[g.makeBld('townhall',12,-35,0)];g.rebuildWalk();
 Object.assign(u,{haulage:'canoe',x:0,z:0,y:g.world.waterY+.16,carry:11,carryType:'wood',recalled:true,stationOnArrival:false,order:'return'});
 const before=g.tribe(0).wood;work(g,u,90,(g,u,dt)=>{if(u.recalled)g.workerAI(u,dt);});
 assert.equal(u.recalled,undefined);assert.equal(u.carry,0);assert.equal(g.tribe(0).wood,before+11);assert.ok(g.walkable(u.x,u.z));
});
test('canoe fishers reach known offshore fish, consume finite stock and haul their catch home',()=>{
 const {g,u}=fixture();g.state.buildings=[g.makeBld('townhall',12,-35,0)];g.rebuildWalk();u.haulage='canoe';
 const fish={id:g.id(),kind:'fish',x:0,y:g.world.waterY,z:0,amount:18,maxAmt:18,regenT:0,scale:1,rich:1};g.state.fish=[fish];
 Object.assign(u,{node:fish,order:'gather',job:'food',jobLock:true});const before=g.tribe(0).food;
 work(g,u,150,(g,u,dt)=>{if(g.tribe(0).food===before)g.workerAI(u,dt);});
 assert.ok(fish.amount<18);assert.ok(g.tribe(0).food>before);assert.equal(g.tribe(0).food-before,18-fish.amount);
});


test('a pack goat survives a handler loss exactly once as a wild animal',()=>{
 const {g,u}=fixture();u.haulage='pack';u.hp=0;releasePackAnimal(g,u);assert.equal(u.haulage,undefined);assert.equal(g.state.wildlife.length,1);releasePackAnimal(g,u);assert.equal(g.state.wildlife.length,1);assert.equal(g.state.wildlife[0].x,u.x);
});
