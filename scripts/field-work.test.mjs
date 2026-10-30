import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {fieldWorkStep,staffField} from '../src/game/fieldWork.ts';
import {BUILDINGS} from '../src/game/constants.ts';import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function setup(scale=1){const g=new Game();g.reset(345,2);g.enterIsland();g.world.heights.fill(4);g.vision.fill(2);g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,40,0)];for(const k of ['trees','stones','forage','fish','wildlife'])g.state[k]=[];g.state.weather='clear';g.state.time=0;const b=g.makeBld('farm',30,40,0);b.w*=scale;g.state.buildings.push(b);g.rebuildWalk();return {g,b};}
function worker(g,b,x=20,z=40){const u=g.spawnUnit('worker',x,z,0);u.node=b;u.order='gather';u.job='food';return u;}
test('workers reach distinct rows before producing crops and move between work stations',()=>{
 const {g,b}=setup(2),people=Array.from({length:6},(_,i)=>worker(g,b,15,30+i*2)),positions=new Map(people.map(u=>[u,[]]));
 g.workerAI(people[0],.1);assert.equal(b.crop.planted,0,'no sowing from the journey to the farm');
 for(let i=0;i<800&&b.crop.planted<1;i++){g.state.time+=.1;g.navBudget=20;for(const u of people){const before=b.crop.planted;g.workerAI(u,.1);if(b.crop.planted>before)positions.get(u).push([u.x,u.z]);}}
 assert.ok(b.crop.planted>.95);assert.ok(people.every(u=>positions.get(u).length>0));
 const xs=people.map(u=>positions.get(u)[0][0]);assert.ok(new Set(xs.map(x=>Math.round(x))).size>=5);
 assert.ok([...positions.values()].some(ps=>Math.max(...ps.map(p=>p[1]))-Math.min(...ps.map(p=>p[1]))>1),'workers traverse the rows');
});
test('harvest stays finite, requires reaching a row, and is carried home',()=>{
 const {g,b}=setup();g.state.time=900;b.crop={year:0,planted:1,tended:1,remaining:12,ripened:true,kind:'grain'};const u=worker(g,b),food=g.tribe(0).food;
 fieldWorkStep(g,u,b,.1);assert.equal(u.carry,0);
 for(let i=0;i<2400&&(b.crop.remaining>0||u.carry>0);i++){g.state.time+=.1;g.navBudget=20;g.workerAI(u,.1);if(u.order==='idle'&&b.crop.remaining>0){u.order='gather';u.node=b;}}
 assert.equal(b.crop.remaining,0);assert.equal(u.carry,0);assert.equal(g.tribe(0).food,food+12);
});
test('blocked rows release workers and save/load never resets crop progress',()=>{
 const {g,b}=setup(),u=worker(g,b);b.crop={year:0,planted:.4,tended:.2,remaining:0,ripened:false};
 const r=decodeGame(encodeGame(g));assert.equal(r.state.buildings.find(p=>p.id===b.id).crop.planted,.4);
 g.walkable=()=>false;fieldWorkStep(g,u,b,.1);assert.equal(u.order,'idle');assert.equal(u.node,null);assert.equal(b.crop.planted,.4);
});

test('field staffing fills area-scaled slots without taking children, cargo carriers or an active mission',()=>{
 const {g,b}=setup(2);const residents=Array.from({length:8},(_,i)=>{const u=worker(g,b,15,30+i);u.node=null;u.order='idle';return u;});
 residents[0].maturesAt=100;residents[1].carry=5;residents[1].carryType='wood';residents[2].haulageWork={kind:'sledge',workplace:1,progress:0,duration:45};
 assert.equal(staffField(g,b),5);assert.equal(residents[0].node,null);assert.equal(residents[1].carry,5);assert.ok(residents[2].haulageWork);
 assert.equal(staffField(g,b),0);
});
test('the full simulation keeps a staffed field working with movement and resident separation enabled',()=>{
 const {g,b}=setup();Object.assign(g.tribe(0),{food:1500,seeds:20});g.state.paused=false;g.state.weatherT=10000;g.state.conflict='quiet';g.dayPhase=()=>.5;
 const people=Array.from({length:3},(_,i)=>{const u=worker(g,b,18,36+i*3);u.node=null;u.order='idle';return u;});staffField(g,b);
 for(let i=0;i<900;i++)g.step(.1);
 assert.ok(b.crop.planted>.9,`sowing progressed to ${b.crop.planted}`);assert.ok(people.every(u=>u.hp>0));
});
