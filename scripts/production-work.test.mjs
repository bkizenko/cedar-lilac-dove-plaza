import test from 'node:test';
import assert from 'node:assert/strict';
import {GATHER,GATHER_WORK_RATE} from '../src/game/constants.ts';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {farmWork} from '../src/game/settlement.ts';
import {carryingCapacity,resumeHaulageWork} from '../src/game/haulage.ts';
import {applyForagePressure} from '../src/game/ecology.ts';

function setup(){
 const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);
 g.state.buildings=[g.makeBld('townhall',0,38,0),g.makeBld('workshop',35,38,0)];g.state.units=[];
 const u=g.spawnUnit('worker',0,62,0);u.selected=true;
 Object.assign(g.tribe(0),{wood:200,stone:100,food:200});g.state.weather='clear';g.state.paused=false;
 g.clockState=()=>({period:'Afternoon'});g.vision.fill(2);g.rebuildWalk();return {g,u,hall:g.state.buildings[0],shop:g.state.buildings[1]};
}
function advanceWorker(g,u,seconds){for(let i=0;i<seconds*10;i++){g.state.time+=.1;g.navBudget=10;g.workerAI(u,.1);}}

test('building crafting reaches the resident AI, preserves priority, and recall pauses paid work',()=>{
 const {g,u,shop}=setup();assert.equal(g.craftHaulage('sled',shop.id),true);
 g.setLaborPriority('food');assert.equal(u.order,'hold');assert.ok(u.haulageWork);
 advanceWorker(g,u,20);const progress=u.haulageWork.progress;assert.ok(progress>0);
 g.soundRecall();assert.equal(u.haulageWork.paused,true);assert.equal(u.recalled,true);
 advanceWorker(g,u,50);assert.equal(u.recalled,undefined);assert.equal(u.haulageWork.progress,progress);
 assert.equal(resumeHaulageWork(g,u,shop.id),true);advanceWorker(g,u,80);assert.equal(u.haulage,'sled');
});

test('real sled delivery counts cargo once and increases displayed load capacity',()=>{
 const {g,u,hall}=setup();u.haulage='sled';u.carry=14;u.carryType='wood';u.order='return';
 const before=g.tribe(0).wood;for(let i=0;i<400&&u.carryType==='wood';i++)advanceWorker(g,u,.1);
 assert.equal(g.tribe(0).wood,before+14);assert.equal(g.tribe(0).haulagePractice,14);assert.equal(u.carry,0);
 u.order='hold';advanceWorker(g,u,2);assert.equal(g.tribe(0).haulagePractice,14);
 u.carry=8;u.carryType='wood';assert.equal(carryingCapacity(u,'wood'),GATHER.wood.carry*2);
 const copy=decodeGame(encodeGame(g));assert.equal(copy.state.units[0].haulage,'sled');assert.equal(copy.tribe(0).haulagePractice,14);
});

test('crafted stone hoe actually speeds seasonal farm work without granting extra crops',()=>{
 const {g,u,shop}=setup();assert.equal(g.craftFarmTool('stoneHoe',shop.id),true);
 assert.equal(g.craftHaulage('sled',shop.id),false,'one resident cannot make two things at once');
 advanceWorker(g,u,65);assert.equal(u.farmTool,'stoneHoe');
 const farm=g.makeBld('farm',60,38,0);g.state.buildings.push(farm);
 farm.crop={year:0,planted:0,tended:0,remaining:0,ripened:false,kind:'grain',water:1};
 g.state.time=100;farmWork(g,u,farm,10);assert.ok(Math.abs(farm.crop.planted-10/180*1.25*GATHER_WORK_RATE)<1e-9);
 g.state.time=1000;farm.crop={year:0,planted:1,tended:1,remaining:20,ripened:true,kind:'grain',water:1};u.carry=0;u.gatherT=0;u.order='gather';
 farmWork(g,u,farm,1);assert.equal(farm.crop.remaining+u.carry,20,'tool improves labor, never multiplies harvested stock');
});

test('invalid equipment cannot enter a saved village',()=>{
 const {g,u}=setup();const raw=encodeGame(g);raw.state.units[0].haulage='teleport';assert.throws(()=>decodeGame(raw),/damaged/);
 const raw2=encodeGame(g);raw2.state.units[0].farmTool='unlimited';assert.throws(()=>decodeGame(raw2),/damaged/);
 const old=decodeGame(encodeGame(g));assert.equal(old.state.units[0].farmTool,undefined);assert.equal(old.state.units[0].haulage,undefined);
});

test('ordinary gathering permits recovery while repeated stripping exhausts a patch',()=>{
 const n={maxAmt:30,pressure:0};for(let i=0;i<30;i++)applyForagePressure(n);
 assert.ok(n.pressure>=.29&&n.pressure<=.31,'one harvest is not total exhaustion');
 applyForagePressure(n,90);assert.equal(n.pressure,1,'repeated harvests still overforage the land');
});
