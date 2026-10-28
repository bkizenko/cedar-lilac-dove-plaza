import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {scoutAI,tickScouts} from '../src/game/scouting.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
function setup(){const g=new Game();g.reset(345);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,40,1),g.makeBld('townhall',100,40,1)];g.rebuildWalk();const u=g.spawnUnit('worker',30,40,1);u.scout={legs:5,returning:true};return {g,u};}
test('returning scouts use a reachable actual hall entrance and rejoin work',()=>{
 const {g,u}=setup();g.campOf=()=>({x:300,z:300});scoutAI(g,u,.1);
 assert.ok(Math.hypot(u.tx,u.tz-40)<15);assert.ok(Math.hypot(u.tx,u.tz-40)>4);assert.equal(g.walkable(u.tx,u.tz),true);
 for(let i=0;i<600&&u.scout;i++){g.navBudget=10;g.state.time+=.1;scoutAI(g,u,.1);}
 assert.equal(u.scout,undefined);assert.equal(u.order,'idle');assert.ok(Math.hypot(u.x,u.z-40)<12);
});
test('an inaccessible nearest hall does not strand a scout when another hall is reachable',()=>{
 const {g,u}=setup(),original=g.interactionSpot.bind(g);g.interactionSpot=(person,b)=>b===g.state.buildings[0]?null:original(person,b);
 scoutAI(g,u,.1);assert.ok(u.tx>80);assert.equal(u.scout.returning,true);
});
test('no reachable hearth preserves a saved recall rather than falsely completing the journey',()=>{
 const {g,u}=setup();g.interactionSpot=()=>null;scoutAI(g,u,.1);assert.equal(u.recalled,true);assert.equal(u.order,'return');assert.equal(u.scout,undefined);
 const r=decodeGame(encodeGame(g));assert.equal(r.state.units.find(p=>p.id===u.id).recalled,true);
});
test('automatic rival scouting leaves recalled residents, envoys and trainees on their existing duties',()=>{
 const {g,u}=setup();u.scout=undefined;u.recalled=true;u.order='gather';
 for(let i=0;i<5;i++){const p=g.spawnUnit('worker',10+i,45,1);p.order='gather';p.drill=g.state.buildings[0].id;}
 g.tribe(1).food=5000;g.state.scoutTimer=0;tickScouts(g,1);assert.equal(g.state.units.some(p=>p.scout),false);
});

test('rival exploration can select a canoe owner after pedestrians exhaust their reachable land',()=>{
 const {g,u}=setup();u.scout=undefined;u.order='idle';g.state.buildings=[];
 g.height=(x,z)=>z<0?g.world.waterY-2:4;g.rebuildWalk();
 for(let i=0;i<5;i++)g.spawnUnit('worker',30+i,40,1);
 const sailor=g.state.units.at(-1);sailor.haulage='canoe';
 // Mark the connected southern land as explored, leaving land beyond a water channel.
 g.height=(x,z)=>Math.abs(z)<12?g.world.waterY-2:Math.abs(z)<24?g.world.waterY+(Math.abs(z)-12)/3:4;g.rebuildWalk();
 g.state.rivalKnowledge=[{team:1,cells:Array.from({length:512},(_,i)=>512+i)}];
 g.tribe(1).food=5000;g.state.scoutTimer=0;tickScouts(g,1);
 assert.equal(u.scout,undefined);assert.ok(sailor.scout);assert.ok(sailor.tz< -12);
 for(let i=0;i<1600&&sailor.z>=-12;i++){g.navBudget=10;g.state.time+=.1;scoutAI(g,sailor,.1);}
 assert.ok(sailor.z< -12,'scout physically crosses to the far bank');
});

test('outbound scouts cache a real river detour beyond the routine search budget',async()=>{
 const {findPath}=await import('../src/game/navigation.ts');
 const g=new Game();g.reset(345,2);g.state.units=[];g.state.buildings=[];g.rebuildWalk();
 const u=g.spawnUnit('worker',-232.04165172049082,-128.0222892013027,2);
 Object.assign(u,{order:'move',tx:-146.25,tz:113.75,scout:{legs:0,returning:false}});
 const index=(x,z)=>Math.floor((z+520)/2)*520+Math.floor((x+520)/2);
 assert.equal(findPath(g.walk,520,index(u.x,u.z),index(u.tx,u.tz)),null,'fixture exceeds ordinary route budget');
 const start={x:u.x,z:u.z};let searches=0;
 for(let i=0;i<150;i++){
  g.state.time+=.1;g.navBudget=1;const x=u.x,z=u.z,speed=g.travelSpeed(u);
  scoutAI(g,u,.1);searches+=1-g.navBudget;
  assert.ok(Math.hypot(u.x-x,u.z-z)<=speed*.1+1e-7);
  assert.ok(g.height(u.x,u.z)>=g.world.waterY+.12);
 }
 assert.ok(Math.hypot(u.x-start.x,u.z-start.z)>60,'scout actually leaves home');
 assert.equal(searches,1,'successful long route is reused rather than recomputed each frame');
 assert.equal(u.scout.returning,false);
});
