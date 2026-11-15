import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
function setup(){const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);g.state.weather='clear';g.state.units=[];
 const hall=g.makeBld('townhall',0,38,0),shop=g.makeBld('workshop',30,38,0);g.state.buildings=[hall,shop];
 Object.assign(g.tribe(0),{wood:100,stone:50,age:1});g.vision.fill(2);g.rebuildWalk();return {g,hall,shop};}
const gap=(u,b)=>Math.hypot(Math.max(0,Math.abs(u.x-b.x)-b.w*.4),Math.max(0,Math.abs(u.z-b.z)-b.d*.4));
import {settleAtWorkface,workFacePoint,footprintGap,WORKFACE_RULES} from '../src/game/workFace.ts';
test('the wall point is just outside the footprint, on the side the person is on',()=>{
 const {g,shop}=setup();const u=g.spawnUnit('worker',shop.x+shop.w*.4+2,shop.z,0);const p=workFacePoint(u,shop);
 assert.ok(p.x>shop.x+shop.w*.4,'outside the wall');assert.ok(Math.abs(p.z-shop.z)<1e-6,'straight in from where they stand');
 assert.ok(Math.abs(footprintGap(p,shop)-(u.r+WORKFACE_RULES.marginMetres))<1e-6);
});
test('a person working two metres out is walked onto the wall, then stays put',()=>{
 const {g,shop}=setup();const u=g.spawnUnit('worker',shop.x+shop.w*.4+2.0,shop.z,0);u.y=g.travelHeight(u.x,u.z);
 const before=footprintGap(u,shop);assert.ok(before>1.8);
 let done=false;for(let i=0;i<200&&!done;i++)done=settleAtWorkface(g,u,shop,.05);
 assert.equal(done,true);const after=footprintGap(u,shop);assert.ok(after<=u.r+WORKFACE_RULES.marginMetres+.15,'gap '+after);
 const x=u.x,z=u.z;settleAtWorkface(g,u,shop,.05);assert.equal(u.x,x);assert.equal(u.z,z);
});
test('settling never walks through another building and gives up when blocked',()=>{
 const {g,shop}=setup();const wall=g.makeBld('warehouse',shop.x+shop.w*.4+1.2,shop.z,0);g.state.buildings.push(wall);g.rebuildWalk();
 const u=g.spawnUnit('worker',shop.x+shop.w*.4+wall.w*.8+3,shop.z,0);u.y=g.travelHeight(u.x,u.z);
 for(let i=0;i<400;i++){settleAtWorkface(g,u,shop,.05);assert.ok(footprintGap(u,wall)>=u.r-1e-6,'inside the neighbour');}
});
test('a builder at the tolerance edge ends up against the site while building',()=>{
 const {g,shop}=setup();shop.build=.05;shop.hp=Math.max(1,Math.floor(shop.maxHp*.14));
 const u=g.spawnUnit('worker',shop.x+shop.w*.4+1.8,shop.z,0);u.y=g.travelHeight(u.x,u.z);u.order='build';u.node=shop;g.orderConstruction?.(shop,[u]);
 for(let i=0;i<120;i++){g.state.time+=.05;g.navBudget=4;g.workerAI(u,.05);}
 assert.ok(shop.build>.05,'building progressed');assert.ok(footprintGap(u,shop)<=u.r+.4,'gap '+footprintGap(u,shop));
});
import {newAnimState,stepAnimator} from '../src/scene/characterAnim.ts';
test('a person with velocity but no real displacement at a workstation never plays the walk clip, whatever the order',()=>{
 for(const order of ['gather','build','return','carry','hold','idle','move']){
  const u={id:7,type:'worker',team:0,x:5,y:0,z:5,vx:1.2,vz:0,facing:0,hp:10,order,carry:0};
  const st=newAnimState(u,0);let clip='';
  for(let i=1;i<=30;i++)clip=stepAnimator(st,u,{time:i*.1,load:0}).clip;
  assert.notEqual(clip,'walk',order+' pushing against a wall shows planted feet');
 }
});
test('a person who really walks still plays the walk clip',()=>{
 const u={id:8,type:'worker',team:0,x:0,y:0,z:0,vx:1.4,vz:0,facing:0,hp:10,order:'move',carry:0};const st=newAnimState(u,0);let clip='';
 for(let i=1;i<=30;i++){u.x+=.14;clip=stepAnimator(st,u,{time:i*.1,load:0}).clip;}assert.ok(['walk','run'].includes(clip),clip);
});
