import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {dispatchRivalBarter,settleRivalBarter} from '../src/game/rivalTrade.ts';
import {visitorAI} from '../src/game/visitors.ts';
import {scoutKnowledge,scoutAI} from '../src/game/scouting.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function fixture(){
 const g=new Game();g.reset(345);g.enterIsland();g.world.heights.fill(4);g.state.buildings=[g.makeBld('townhall',0,0,1),g.makeBld('townhall',70,0,2)];g.state.units=[];
 for(const team of [1,2])for(let i=0;i<6;i++)g.spawnUnit('worker',(team-1)*70+8+i,10,team);
 Object.assign(g.tribe(1),{wood:0,stone:160,food:1500,age:0,hostile:false,alive:true});
 Object.assign(g.tribe(2),{wood:200,stone:0,food:1500,age:0,hostile:false,alive:true});
 g.state.weather='clear';g.rebuildWalk();g.clockState=()=>({period:'Afternoon'});return g;
}
function contact(g){scoutKnowledge(g,{team:1,x:70,z:0});}
function totals(g,k){return [1,2].reduce((s,t)=>s+g.tribe(t)[k],0)+g.state.units.filter(u=>u.carryType===k).reduce((s,u)=>s+u.carry,0);}
function drive(g,u,seconds){for(let i=0;i<seconds*10;i++){g.state.time+=.1;g.navBudget=10;visitorAI(g,u,.1);if(!u.visit)break;}}
test('a known rival receives a real offer, exchanges locally and the trader carries materials home',()=>{
 const g=fixture();contact(g);const wood=totals(g,'wood'),stone=totals(g,'stone');assert.equal(dispatchRivalBarter(g,1),true);
 const u=g.state.units.find(u=>u.visit);assert.equal(u.visit.team,2);assert.equal(u.visit.wanted,'wood');assert.equal(u.carryType,'stone');assert.equal(u.carry,32);assert.equal(g.tribe(1).wood,0);assert.equal(g.tribe(1).stone,128);
 assert.equal(settleRivalBarter(g,u),false,'there is no exchange before the physical meeting');
 let exchanged=false;for(let i=0;i<900;i++){g.state.time+=.1;g.navBudget=10;visitorAI(g,u,.1);if(u.visit?.phase==='return'){exchanged=true;break;}}
 assert.equal(exchanged,true);assert.equal(u.carryType,'wood');assert.ok(u.carry>0);assert.equal(g.tribe(1).wood,0);assert.equal(g.tribe(2).stone,32);assert.equal(totals(g,'wood'),wood);assert.equal(totals(g,'stone'),stone);
 const returnAmount=u.carry;drive(g,u,100);assert.equal(u.visit,undefined);assert.equal(u.carry,0);assert.equal(g.tribe(1).wood,returnAmount);assert.equal(totals(g,'wood'),wood);assert.equal(totals(g,'stone'),stone);
});
test('unknown partners and insufficient surplus do not dispatch a trader',()=>{
 const g=fixture();assert.equal(dispatchRivalBarter(g,1),false);contact(g);g.state.time+=121;g.tribe(1).stone=32;g.tribe(1).food=1;assert.equal(dispatchRivalBarter(g,1),false);assert.ok(g.state.units.every(u=>!u.visit));
});
test('an empty seller refuses on arrival and the original cargo returns without duplication',()=>{
 const g=fixture();contact(g);g.tribe(2).wood=0;assert.equal(dispatchRivalBarter(g,1),true,'departure does not read remote stock');const u=g.state.units.find(u=>u.visit);
 drive(g,u,180);assert.equal(u.visit,undefined);assert.equal(g.tribe(1).stone,160);assert.equal(g.tribe(1).wood,0);assert.equal(g.tribe(2).stone,0);
});
test('saved and interrupted rival shipments preserve ownership; forged destinations are rejected',()=>{
 const g=fixture();contact(g);assert.equal(dispatchRivalBarter(g,1),true);const u=g.state.units.find(u=>u.visit),raw=encodeGame(g),r=decodeGame(raw),v=r.state.units.find(p=>p.id===u.id);
 assert.deepEqual(v.visit,u.visit);assert.equal(totals(r,'stone'),totals(g,'stone'));v.stuckT=9;visitorAI(r,v,.1);assert.equal(v.visit,undefined);assert.equal(v.order,'return');assert.equal(v.carry,32);
 const bad=encodeGame(g);bad.state.units.find(p=>p.id===u.id).visit.team=1;assert.throws(()=>decodeGame(bad));
});
test('recall cancels a rival shipment without exchanging away its carried offer',()=>{
 const g=fixture();contact(g);dispatchRivalBarter(g,1);const u=g.state.units.find(u=>u.visit);g.interruptMission(u);u.recalled=true;u.stationOnArrival=false;
 for(let i=0;i<300;i++){g.state.time+=.1;g.navBudget=10;g.workerAI(u,.1);if(!u.recalled)break;}
 assert.equal(u.carry,0);assert.equal(g.tribe(1).stone,160);assert.equal(g.tribe(2).stone,0);
});
test('a returning scout retains a homeward order when blocked rather than becoming a lost idle worker',()=>{
 const g=fixture(),u=g.state.units[0];u.scout={legs:5,returning:true};u.stuckT=18;scoutAI(g,u,.1);
 assert.equal(u.scout,undefined);assert.equal(u.recalled,true);assert.equal(u.stationOnArrival,false);assert.equal(u.order,'return');
});
