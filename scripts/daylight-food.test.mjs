import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {daylightAt,solarTimeLabel} from '../src/game/daylight.ts';
import {routineRest} from '../src/game/journeys.ts';
import {foodDemand,foodWorkTarget} from '../src/game/settlement.ts';
import {collectSamples,deliverSamples,beginCropTrial,seekCropSamples} from '../src/game/cultivation.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,50,0)];g.state.forage=[];g.state.trees=[];g.state.wildlife=[];g.state.fish=[];g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();return g;}
function patch(g){return {id:g.id(),kind:'forage',x:15,z:38,y:4,amount:24,maxAmt:24,regenT:0,cropCandidate:'grain'};}
test('seasonal solar times have longer summer days and shorter winter days, with a continuous year boundary',()=>{
 const summer=daylightAt((172-60)/365*1800),winter=daylightAt((355-60)/365*1800);
 assert.ok(summer.hours>winter.hours+6);assert.ok(summer.sunrise<5&&summer.sunset>19);assert.ok(winter.sunrise>7&&winter.sunset<17);
 assert.ok(Math.abs(daylightAt(1799.99).sunrise-daylightAt(0).sunrise)<.01);assert.equal(solarTimeLabel(6.5),'06:30');
});
test('the HUD clock and simulation agree about night throughout the calendar',()=>{
 const g=new Game();for(let time=0;time<1800;time+=7){g.state.time=time;assert.equal(g.clockState().period==='Night',g.isNight());assert.match(g.clockState().daylight,/Sunrise \d\d:\d\d · Sunset \d\d:\d\d/);}
});
test('ordinary rain allows work; storms require physical shelter and clear weather resumes it',()=>{
 const g=fixture(),u=g.spawnUnit('worker',0,38,0);g.clockState=()=>({period:'Afternoon'});u.order='gather';u.node=patch(g);u.job='food';g.state.weather='rain';assert.equal(routineRest(g,u,1),false);assert.equal(u.shelterId,undefined);assert.equal(u.order,'gather');g.state.weather='storm';assert.equal(routineRest(g,u,.1),true);g.state.weather='rain';assert.equal(routineRest(g,u,.1),false);assert.equal(u.shelterId,undefined);
});
test('hungry food workers continue after sunset, but fatigue, dependents and storms still require rest',()=>{
 const g=fixture(),u=g.spawnUnit('worker',0,38,0);g.clockState=()=>({period:'Night'});Object.assign(u,{order:'gather',job:'food',node:patch(g),fatigue:.1});g.tribe(0).food=0;
 assert.equal(routineRest(g,u,1),false);u.fatigue=.9;assert.equal(routineRest(g,u,.1),true);u.fatigue=.1;g.state.weather='storm';assert.equal(routineRest(g,u,.1),true);g.state.weather='clear';u.maturesAt=1000;assert.equal(routineRest(g,u,.1),true);
});
test('hunting falls back to known edible plants in a food emergency and stays hunting when supplied',()=>{
 const g=fixture(),u=g.spawnUnit('worker',0,38,0),n=patch(g);g.state.forage=[n];Object.assign(u,{huntOnly:true,job:'food',jobLock:true});g.tribe(0).food=0;g.workBoard.assign(g,u);assert.equal(u.node,n);g.tribe(0).food=200;u.node=null;u.order='idle';u.workCheckAt=0;g.workBoard.reset();g.workBoard.assign(g,u);assert.notEqual(u.node,n);
});
test('dry-bank dock workers receive the dock bonus, land foragers do not',()=>{
 const g=fixture(),u=g.spawnUnit('worker',0,35,0),dock=g.makeBld('dock',0,35,0);g.state.buildings.push(dock);u.node=dock;const efficient=g.campBonus(u,'food');dock.build=0;assert.ok(Math.abs(efficient/g.campBonus(u,'food')-.62)<1e-8);u.node=patch(g);dock.build=1;const berries=g.campBonus(u,'food');dock.build=0;assert.equal(g.campBonus(u,'food'),berries);
});
test('known shore fish provide a food task before a dock, with finite stock',()=>{
 const g=fixture(),u=g.spawnUnit('worker',0,38,0),fish={...patch(g),kind:'fish',cropCandidate:undefined};g.state.fish=[fish];g.tribe(0).food=0;g.state.laborPolicy='food';g.workBoard.assign(g,u);assert.equal(u.node,fish);assert.equal(u.job,'food');
});
test('eight transported crop food starts a saved physical trial and keeps old trial durations valid',()=>{
 const g=fixture(),u=g.spawnUnit('worker',0,38,0),n=patch(g);collectSamples(u,n,8);assert.equal(g.tribe(0).cropSamples.grain,undefined);Object.assign(u,{carry:8,carryType:'food'});deliverSamples(g,u);assert.equal(g.tribe(0).cropSamples.grain,4);u.carry=0;u.carryType=null;assert.ok(beginCropTrial(g,'grain'));assert.ok(g.tribe(0).cropTrial.duration<=150);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));g.tribe(0).cropTrial.duration=360;assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('seed search uses known plants and reserves no more than two people per plant',()=>{
 const g=fixture(),n=patch(g);g.state.forage=[n];for(let i=0;i<4;i++)g.spawnUnit('worker',i,38,0);assert.equal(seekCropSamples(g),2);assert.equal(g.state.units.filter(u=>u.node===n).length,2);
});
test('food focus permits a finite outdoor reserve and sends surplus gatherers to search',()=>{
 const g=fixture(),n=patch(g);g.state.forage=[n];g.tribe(0).food=10;g.state.laborPolicy='food';const people=Array.from({length:5},(_,i)=>g.spawnUnit('worker',i,38,0));g.findExploreTarget=()=>({x:40,z:38});for(const u of people)g.workBoard.assign(g,u);assert.equal(people.filter(u=>u.node===n).length,2);assert.equal(people.filter(u=>u.searchJob==='food').length,2);assert.match(people[4].workReason,/search party/);assert.equal(foodWorkTarget(g),Math.max(g.stockCap(0),foodDemand(g)*900));
});
test('arrivals join village work while horn recalls continue waiting for explicit orders',()=>{
 const g=fixture(),u=g.spawnUnit('worker',0,38,0),hall=g.state.buildings[0],at=g.interactionSpot(u,hall);u.x=at.x;u.z=at.z;u.recalled=true;u.stationOnArrival=false;g.workerAI(u,.1);assert.equal(u.order,'idle');g.soundRecall();g.workerAI(u,.1);assert.equal(u.order,'hold');
});
test('new maps have plentiful edible plants and more huntable herds; saves retain actual quantities',()=>{
 const g=new Game();g.reset(123456);const home=g.campOf(0);assert.ok(g.state.forage.filter(n=>Math.hypot(n.x-home.x,n.z-home.z)<35&&n.maxAmt>=24).length>=4);assert.ok(g.state.wildlife.filter(n=>n.species!=='bird').length>=38);const n=g.state.forage[0];n.amount=3;const r=decodeGame(encodeGame(g));assert.equal(r.state.forage.find(p=>p.id===n.id).amount,3);assert.equal(r.state.wildlife.length,g.state.wildlife.length);
});

test('distant food gatherers camp by their work at night, then resume instead of repeating the trip home',()=>{
 const g=fixture(),u=g.spawnUnit('worker',80,38,0),n=patch(g);g.clockState=()=>({period:'Night'});Object.assign(u,{order:'gather',job:'food',node:n,fatigue:.5});g.tribe(0).food=200;const x=u.x;g.state.time=40;assert.equal(routineRest(g,u,1),true);assert.equal(u.x,x);assert.equal(u.node,n);assert.ok(u.fatigue<.5);assert.match(u.workReason,/Night camp/);u.fatigue=0;g.state.time=2;g.clockState=()=>({period:'Afternoon'});assert.equal(routineRest(g,u,1),false);
});

test('journey foraging that exhausts a plant leaves a real recovery delay',async()=>{
 const {expeditionAI}=await import('../src/game/journeys.ts');
 const g=fixture(),u=g.spawnUnit('worker',80,38,0),n={...patch(g),x:80,z:38,amount:1};g.state.forage=[n];
 u.expedition={food:1,returning:true,forage:0};u.order='move';u.tx=0;u.tz=50;g.steer=()=>false;
 expeditionAI(g,u,8);assert.equal(n.amount,0);assert.ok(n.regenT>=240);g.tickRegen(.1);assert.equal(n.amount,0);
});
