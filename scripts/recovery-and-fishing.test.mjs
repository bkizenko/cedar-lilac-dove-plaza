import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {decodeGame,encodeGame} from '../src/game/persistence.ts';
import {saveGame,loadRaw} from '../src/game/save.ts';
import {SAVE_KEY} from '../src/game/constants.ts';
import {staffDock,fishingReport,renewFish} from '../src/game/fishing.ts';
import {villageAppeal} from '../src/game/migration.ts';
function fixture(){const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);g.state.buildings=[];g.state.units=[];g.state.weather='clear';g.state.trees=[];g.state.forage=[];g.state.wildlife=[];g.state.stones=[];g.clockState=()=>({period:'Afternoon'});g.vision.fill(2);const hall=g.makeBld('townhall',0,50,0);g.state.buildings=[hall];g.rebuildWalk();return {g,hall};}
function storage(fn){const old=globalThis.localStorage,map=new Map();globalThis.localStorage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};try{fn(map);}finally{globalThis.localStorage=old;}}
test('legacy load recovers the newest copy of the active village, not another village',()=>storage(map=>{
 const {g}=fixture();g.state.time=100;map.set(SAVE_KEY,JSON.stringify(encodeGame(g)));g.state.time=900;map.set(SAVE_KEY+':bak',JSON.stringify(encodeGame(g)));const other=encodeGame(g);other.state.seed=654321;other.state.time=1200;map.set(SAVE_KEY+':protected',JSON.stringify(other));assert.equal(loadRaw().state.time,900);assert.equal(loadRaw().state.seed,123456);
}));
test('stale autosave cannot roll back progress, but a deliberate restore can',()=>storage(map=>{
 const {g}=fixture();g.state.time=900;assert.equal(saveGame(g),true);g.state.time=100;assert.equal(saveGame(g),true);assert.equal(loadRaw().state.time,900);assert.equal(saveGame(g,true),true);assert.equal(loadRaw().state.time,100);
}));
test('a deliberate save beats older undated legacy copies even after rewinding',()=>storage(map=>{
 const {g}=fixture();g.state.time=900;map.set(SAVE_KEY,JSON.stringify(encodeGame(g)));map.set(SAVE_KEY+':protected',JSON.stringify(encodeGame(g)));g.state.time=100;assert.equal(saveGame(g,true),true);assert.equal(loadRaw().state.time,100);
}));
test('optional-copy quota failure cannot stop the essential primary save',()=>storage(map=>{
 const {g}=fixture();saveGame(g);globalThis.localStorage.setItem=(k,v)=>{if(k!==SAVE_KEY)throw Error('Quota');map.set(k,v);};g.state.time=500;assert.equal(saveGame(g),true);assert.equal(loadRaw().state.time,500);globalThis.localStorage.setItem=()=>{throw Error('Quota');};assert.equal(saveGame(g),false);assert.equal(loadRaw().state.time,500);
}));
test('recall cancels every overriding mission; soldiers and dependents physically return with cargo',()=>{
 const {g,hall}=fixture();const people=[g.spawnUnit('worker',45,38,0),g.spawnUnit('spearman',30,38,0),g.spawnUnit('worker',35,38,0)];
 Object.assign(people[0],{scout:{legs:1,returning:false},visit:{phase:'outbound',wait:0},foundingJourney:{x:80,z:80,wood:24},studyCrop:'grain',weaponWork:{kind:'spear',progress:10,duration:72,workplace:hall.id},expedition:{food:12,returning:false,forage:0},carry:7,carryType:'wood'});people[2].maturesAt=1000;
 const before=g.tribe(0).wood,food=g.tribe(0).food;g.soundRecall();assert.ok(people.every(u=>u.recalled));assert.equal(people[0].scout,undefined);assert.equal(people[0].visit,undefined);assert.equal(people[0].foundingJourney,undefined);assert.equal(people[0].weaponWork.paused,true);assert.equal(people[0].carry,7);
 for(let i=0;i<1000;i++){g.navBudget=10;g.state.time+=.1;for(const u of people)g.workerAI(u,.1);}
 for(const u of people){assert.equal(u.recalled,undefined);assert.equal(u.order,u===people[2]?'idle':'hold');assert.ok(g.buildingWorkReached(u,hall));}
 assert.equal(g.tribe(0).wood,before+7);assert.equal(g.tribe(0).food,food+12);assert.equal(people[0].expedition,undefined);
});
test('recall across an impassable river does not pretend cargo was delivered',()=>{
 const {g}=fixture(),u=g.spawnUnit('worker',40,38,0);u.carry=9;u.carryType='wood';g.workBoard.connected=()=>false;const before=g.tribe(0).wood;g.soundRecall();g.workerAI(u,1);assert.equal(u.carry,9);assert.equal(g.tribe(0).wood,before);assert.equal(u.recalled,true);assert.match(u.workReason,/no reachable hearth/);
});
test('food focus staffs a known dock before nearby berries, with only two fisher slots',()=>{
 const {g}=fixture(),dock=g.makeBld('dock',0,35,0);g.state.buildings.push(dock);g.state.fish=[{id:g.id(),kind:'fish',x:4,z:35,y:0,amount:40,maxAmt:40,regenT:0}];g.state.forage=[{id:g.id(),kind:'forage',x:2,z:23,y:4,amount:30,maxAmt:30,regenT:0}];g.rebuildWalk();g.state.laborPolicy='food';const workers=[0,1,2].map(i=>g.spawnUnit('worker',i,23,0));for(const u of workers)g.workBoard.assign(g,u);assert.equal(workers.filter(u=>u.node===dock).length,2);assert.equal(workers[2].node,g.state.forage[0]);
 workers.forEach(u=>{u.node=null;u.order='idle';});assert.equal(staffDock(g,dock.id),2);assert.equal(staffDock(g,dock.id),0);assert.match(fishingReport(g,dock),/water health 100%/);
});
test('river health and finite fish stock recover gradually; no food is granted by renewal',()=>{
 const {g}=fixture(),n={...g.state.fish[0],id:g.id(),kind:'fish',x:0,z:0,y:0,amount:0,maxAmt:100,pressure:1,regenT:10},food=g.tribe(0).food;
 renewFish(g,n,5);assert.equal(n.amount,0);renewFish(g,n,10);assert.ok(n.amount>0&&n.amount<1);const stressed=n.amount;renewFish(g,n,900);assert.ok(n.amount>stressed&&n.amount<100);assert.ok(n.pressure<1);assert.equal(g.tribe(0).food,food);g.state.fish=[n];const loaded=decodeGame(encodeGame(g));assert.equal(loaded.state.fish[0].pressure,n.pressure);assert.equal(loaded.state.fish[0].amount,n.amount);
});
test('new policies survive saves; exploration reserves meals and leaves workers at home',()=>{
 const {g}=fixture();g.vision.fill(0);g.updateVision(0);g.tribe(0).food=500;const people=Array.from({length:8},(_,i)=>g.spawnUnit('worker',i-4,35,0));g.setGrowthPolicy('eager');g.setLaborPriority('explore');assert.equal(people.filter(u=>u.order==='explore').length,2);assert.ok(people.filter(u=>u.expedition).every(u=>u.expedition.food>0));assert.ok(people.filter(u=>u.order!=='explore').length>=6);const loaded=decodeGame(encodeGame(g));assert.equal(loaded.state.growthPolicy,'eager');assert.equal(loaded.state.laborPolicy,'explore');
});
test('well-fed rested villages attract more settlers than starving exhausted ones',()=>{
 const {g}=fixture();g.state.buildings.push(g.makeBld('hut',20,50,0));const u=g.spawnUnit('worker',0,38,0);g.tribe(0).food=500;const good=villageAppeal(g);g.tribe(0).food=0;u.fatigue=1;u.hp=10;assert.ok(villageAppeal(g)<good-.3);
});
test('new arrivals start on reachable dry land and walk to the hearth as a group',()=>{
 const {g,hall}=fixture();g.state.buildings.push(g.makeBld('hut',20,50,0));g.rebuildWalk();g.spawnUnit('worker',0,38,0);g.tribe(0).food=500;g.setGrowthPolicy('eager');g.state.tribes[1].alive=false;g.state.tribes[2].alive=false;const old=Math.random;Math.random=()=>.95;try{g.landSeaFolk();}finally{Math.random=old;}const arrivals=g.state.units.filter(u=>u.recalled);assert.ok(arrivals.length>1);for(const u of arrivals){assert.ok(g.walkable(u.x,u.z));assert.ok(g.workBoard.connected(g,u.x,u.z,hall.x,hall.z));assert.ok(Math.hypot(u.x-hall.x,u.z-hall.z)>20);}
});
