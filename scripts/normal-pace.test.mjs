import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {GATHER,GATHER_WORK_RATE} from '../src/game/constants.ts';
import {beginCropTrial} from '../src/game/cultivation.ts';
import {foodDemand} from '../src/game/settlement.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,38,0)];g.state.weather='clear';g.vision.fill(2);g.rebuildWalk();const u=g.spawnUnit('worker',15,38,0);return {g,u};}
test('normal speed completes four times the gathering work without advancing the calendar',()=>{
 const {g,u}=fixture();const n={id:g.id(),kind:'forage',x:u.x,z:u.z,y:4,amount:80,maxAmt:80,regenT:0,rich:1};g.state.forage=[n];Object.assign(u,{node:n,order:'gather',job:'food'});g.tribe(0).food=500;g.campBonus=()=>1;
 const old=Math.random;Math.random=()=>.5;try{const time=g.state.time;for(let i=0;i<81;i++)g.workerAI(u,.05);assert.equal(u.carry,8);assert.equal(n.amount,72);assert.equal(g.state.time,time);assert.equal(GATHER_WORK_RATE,4);assert.equal(GATHER.food.carry,40);}finally{Math.random=old;}
});
test('low reserves speed food work and send a small useful load home before the basket is full',()=>{
 const {g,u}=fixture();const n={id:g.id(),kind:'forage',x:u.x,z:u.z,y:4,amount:80,maxAmt:80,regenT:0,rich:1};g.state.forage=[n];Object.assign(u,{node:n,order:'gather',job:'food'});g.tribe(0).food=0;g.campBonus=()=>1;const old=Math.random;Math.random=()=>.5;
 try{for(let i=0;i<65&&u.order==='gather';i++)g.workerAI(u,.05);assert.equal(u.order,'return');assert.equal(u.carry,8);assert.ok(u.carry<GATHER.food.carry);}finally{Math.random=old;}
});
test('first cultivation needs samples without logs, does not take scarce meals, and saves its shorter trial',()=>{
 const {g,u}=fixture();g.tribe(0).wood=2;g.tribe(0).food=1;g.tribe(0).cropSamples={grain:4};assert.equal(beginCropTrial(g,'grain'),true);assert.equal(g.tribe(0).food,1);assert.equal(g.tribe(0).wood,2);assert.ok(g.tribe(0).cropTrial.duration>=30&&g.tribe(0).cropTrial.duration<=45);assert.ok(decodeGame(encodeGame(g)).tribe(0).cropTrial);assert.equal(u.studyCrop,'grain');
});
test('a short delivery gap does not harm residents and resumed meals repair hunger damage',()=>{
 const {g,u}=fixture();g.tribe(0).food=0;const hp=u.hp;g.tickPeople(50);assert.equal(u.hp,hp);g.tickPeople(40);assert.ok(u.hp<hp&&u.hp>0);const injured=u.hp;g.tribe(0).food=100;g.tickPeople(10);assert.ok(u.hp>injured);assert.ok(foodDemand(g)<.05);
});
