import test from 'node:test';import assert from 'node:assert/strict';import {Game} from '../src/game/sim.ts';
import {answerEncounter} from '../src/game/encounters.ts';
import {beginWaterCollection,survivalStatus} from '../src/game/survivalNeeds.ts';
function scoutBank(g,u){const choices=[];for(const river of g.world.rivers)for(const p of river.pts.slice(0,-2))for(let r=5;r<=30;r+=5)for(let i=0;i<16;i++){
 const a=i*Math.PI/8,x=p.x+Math.cos(a)*r,z=p.z+Math.sin(a)*r;
 if(!g.walkable(x,z)||!g.workBoard.connected(g,u.x,u.z,x,z))continue;
 if(!Array.from({length:8},(_,j)=>g.height(x+Math.cos(j*Math.PI/4)*5,z+Math.sin(j*Math.PI/4)*5)<g.world.baseWaterY+.2).some(Boolean))continue;
 choices.push({x,z});}return choices.sort((a,b)=>Math.hypot(a.x-u.x,a.z-u.z)-Math.hypot(b.x-u.x,b.z-u.z))[0];}
test('two Normal camps discover water physically and sustain water and fire through first winter',()=>{
 for(const seed of [42,9876]){
 const g=new Game();const advance=()=>{if(g.state.encounter)answerEncounter(g,'greet');g.step(.3);};g.reset(seed,10,{size:1040,layout:'pangaea'});g.enterIsland();g.state.conflict='quiet';
 const u=g.state.units.find(u=>u.team===0&&u.type==='worker');u.selected=true;const bank=scoutBank(g,u);assert.ok(bank);
 g.issueMove(bank.x,bank.z);
 let scoutSteps=0;while(g.state.time<250&&Math.hypot(u.x-bank.x,u.z-bank.z)>3&&scoutSteps++<1500)advance();
 assert.ok(Math.hypot(u.x-bank.x,u.z-bank.z)<3,'scout physically reaches river');
 assert.ok(g.exploredAt(u.x,u.z));const dispatched=beginWaterCollection(g);assert.equal(dispatched.accepted,true,dispatched.reason);
 g.state.laborPolicy='food';
 let steps=0;while(g.state.time<1805&&!g.state.ended&&steps++<15000){advance();if(steps%2000===0)console.log(JSON.stringify({seed,steps,time:g.state.time,pop:g.popNow(0),water:g.tribe(0).survival}));}
 const status=survivalStatus(g),t=g.tribe(0),people=g.state.units.filter(u=>u.team===0&&u.hp>0);
 console.log(JSON.stringify({seed,time:g.state.time,pop:people.length,food:t.food,wood:t.wood,water:t.survival,remainingWaterSeconds:status.waterSeconds,coldResidents:status.coldResidents}));
 assert.ok(g.state.time>=1800,'scenario reaches end of winter');assert.ok(people.length>=5,'opening residents survive');
 assert.ok(t.survival.waterDeliveredLiters>=48,'at least two real deliveries');
 assert.ok(t.survival.fuelBurnedWood>0,'winter uses actual timber');
 assert.ok(people.every(u=>(u.thirstSeconds??0)<180),'ordinary water supply avoids harmful thirst');
 }
});
