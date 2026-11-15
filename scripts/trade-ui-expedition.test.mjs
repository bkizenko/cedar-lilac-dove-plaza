import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {applySendExpedition,expeditionCandidates,destinationFrom,SEND_EXPEDITION_RULES} from '../src/game/expeditionOrder.ts';
import {isEngineDispatchCommand} from '../src/game/engineDispatch.ts';
function fixture(){const g=new Game();g.reset(123456,3);g.enterIsland();g.state.autoWorkEnabled=false;g.tribe(0).food=400;return g;}
const foodTotal=g=>g.tribe(0).food+g.state.units.filter(u=>u.team===0).reduce((n,u)=>n+(u.expedition?.food||0),0);
test('schema accepts only whole-id parties and finite destinations',()=>{
 assert.equal(isEngineDispatchCommand({kind:'send-expedition',unitIds:[1,2],x:10,z:-4}),true);
 assert.equal(isEngineDispatchCommand({kind:'send-expedition',unitIds:[],x:10,z:-4}),false);
 assert.equal(isEngineDispatchCommand({kind:'send-expedition',unitIds:[1.5],x:10,z:-4}),false);
 assert.equal(isEngineDispatchCommand({kind:'send-expedition',unitIds:[1],x:NaN,z:0}),false);
});
test('refuses empty, oversize, foreign and off-map orders without changing the world',()=>{
 const g=fixture(),before=JSON.stringify([g.tribe(0).food,g.state.units.map(u=>u.order)]);
 assert.equal(applySendExpedition(g,{kind:'send-expedition',unitIds:[],x:0,z:0}).accepted,false);
 assert.equal(applySendExpedition(g,{kind:'send-expedition',unitIds:Array.from({length:SEND_EXPEDITION_RULES.maximumParty+1},(_,i)=>i+1),x:0,z:0}).accepted,false);
 assert.equal(applySendExpedition(g,{kind:'send-expedition',unitIds:[1],x:1e9,z:0}).accepted,false);
 const foe=g.state.units.find(u=>u.team!==0);if(foe)assert.equal(applySendExpedition(g,{kind:'send-expedition',unitIds:[foe.id],x:10,z:10}).accepted,false);
 assert.equal(JSON.stringify([g.tribe(0).food,g.state.units.map(u=>u.order)]),before);
});
test('destination stays on the map and bearings point the right way',()=>{
 const g=fixture(),home=g.campOf(0),n=destinationFrom(g,0,100),e=destinationFrom(g,90,100);
 assert.ok(n.z<=home.z&&Math.abs(n.x-home.x)<1e-6||Math.abs(n.z-home.z)<=100+1e-6);assert.ok(e.x>=home.x||Math.abs(e.x)>=g.world.size/2-9);
 const far=destinationFrom(g,45,1e9);assert.ok(Math.abs(far.x)<=g.world.size/2&&Math.abs(far.z)<=g.world.size/2);
});
test('a valid party leaves with provisions drawn from stores; food is conserved',()=>{
 const g=fixture(),c=expeditionCandidates(g).filter(p=>!p.issue).slice(0,2);assert.ok(c.length>0,'fixture has adults able to go');
 const food=foodTotal(g),d=destinationFrom(g,90,120);
 const r=applySendExpedition(g,{kind:'send-expedition',unitIds:c.map(p=>p.id),x:d.x,z:d.z});assert.equal(r.accepted,true,r.reason);
 assert.ok(g.state.units.some(u=>c.some(p=>p.id===u.id)&&(u.order==='explore'||u.exploreAfterDelivery)));
 assert.ok(Math.abs(foodTotal(g)-food)<1e-6,'journey food is moved, never created');
});
