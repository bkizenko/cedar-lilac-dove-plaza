import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';import {frontierStatus,frontierValue,guardFrontier,tickFrontiers} from '../src/game/frontiers.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';import {scoutKnowledge} from '../src/game/scouting.ts';
function fixture(){const g=new Game();g.reset(345);g.enterIsland();g.world.heights.fill(4);g.state.buildings=[g.makeBld('townhall',0,0,0)];g.state.units=[];g.state.trees=[];g.state.stones=[];g.state.forage=[];g.state.copper=[];g.state.iron=[];g.vision.fill(2);g.rebuildWalk();return g;}
test('a frontier claim gets stronger only when real armed adults arrive; more distant claims cost manpower',()=>{
 const g=fixture(),b=g.makeBld('cornerstone',90,0,0);g.state.buildings.push(b);g.rebuildWalk();const weak=frontierStatus(g,b);assert.equal(weak.guards,0);
 const u=g.spawnUnit('worker',10,10,0);u.militia=true;u.order='hold';assert.equal(guardFrontier(g,b.id),1);assert.equal(frontierStatus(g,b).guards,0,'dispatch is not arrival');
 for(let i=0;i<1500&&u.order!=='hold';i++){g.state.time+=.1;g.navBudget=10;g.workerAI(u,.1);}
 assert.equal(u.order,'hold');assert.equal(frontierStatus(g,b).strength,1);assert.ok(frontierStatus(g,b).radius>weak.radius);
 for(const x of [180,270])g.state.buildings.push(g.makeBld('cornerstone',x,0,0));assert.ok(frontierStatus(g,b).needed>weak.needed);assert.ok(frontierStatus(g,g.state.buildings.at(-1)).needed>frontierStatus(g,b).needed);
 const loaded=decodeGame(encodeGame(g));assert.equal(frontierStatus(loaded,loaded.state.buildings.find(p=>p.id===b.id)).guards,1);
});
test('one guard cannot back two nearby claims and unseen deposits do not enter appraisals',()=>{
 const g=fixture(),a=g.makeBld('cornerstone',100,0,0),b=g.makeBld('cornerstone',130,0,0);g.state.buildings.push(a,b);const u=g.spawnUnit('worker',109,0,0);u.militia=true;
 assert.equal(frontierStatus(g,a).guards,1);assert.equal(frontierStatus(g,b).guards,0);
 g.vision.fill(0);g.state.trees=[{id:g.id(),kind:'tree',x:110,z:5,y:4,amount:500,maxAmt:500,regenT:0,scale:1,rich:1}];assert.equal(frontierValue(g,a).timber,0);g.stampVision(110,5,20);assert.equal(frontierValue(g,a).timber,500);
});
test('only observed valuable rival-border claims raise tension; a compact prevents new disputes',()=>{
 const g=fixture(),hall=g.makeBld('townhall',180,0,1),post=g.makeBld('cornerstone',100,0,0);g.state.buildings.push(hall,post);g.state.rivalKnowledge=[];
 const t=g.tribe(1);Object.assign(t,{hostile:false,ally:false,trust:0,tension:0,wood:0,stone:0,expand:1});g.state.time=100;tickFrontiers(g);g.state.time+=2;tickFrontiers(g);assert.equal(t.tension,0);
 const u=g.spawnUnit('worker',100,0,1);scoutKnowledge(g,u);g.state.time+=2;tickFrontiers(g);assert.ok(t.tension>0);assert.equal(t.hostile,false,'a claim is a grievance, not instant global war');
 const before=t.tension;t.compactUntil=g.state.time+100;g.state.time+=2;tickFrontiers(g);assert.equal(t.tension,before);
});
test('unfunded claims create neither regional ownership nor armed influence',()=>{
 const g=fixture(),b=g.makeBld('cornerstone',150,150,0);b.build=0;b.plannedCost={wood:70};g.state.buildings=[b];g.state.regions=[{id:0,name:'Test',x:150,z:150,r:30,res:'wood',owner:-1,cluster:0,clusterName:'Test'}];g.tickRegions();assert.equal(g.state.regions[0].owner,-1);
 g.paintTerritory();assert.ok(!g.territory.includes(0));assert.equal(guardFrontier(g,b.id),0);
});

test('the building menu exposes outposts and towns and an unfunded outpost can be placed without selecting a hall',()=>{
 const g=fixture();g.state.selBld=null;g.tribe(0).wood=0;
 const options=g.snapshot().buildOptions;assert.equal(options[1].type,'cornerstone');assert.ok(options.some(b=>b.type==='townhall'));
 assert.equal(g.placeBuilding('cornerstone',100,0,0),true);const b=g.state.buildings.find(b=>b.type==='cornerstone');assert.ok(b.plannedCost);assert.equal(g.popCap(0),8);
 assert.equal(g.placeBuilding('cornerstone',110,0,0),false);assert.match(g.state.banner,/room beyond/);
});
