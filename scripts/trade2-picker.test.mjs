import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {describeDestination,applySendExpedition,expeditionCandidates,SEND_EXPEDITION_RULES} from '../src/game/expeditionOrder.ts';
import {expeditionPicker} from '../src/ui/expeditionPicker.ts';
function fixture(){const g=new Game();g.reset(123456,3);g.enterIsland();g.state.autoWorkEnabled=false;g.tribe(0).food=400;return g;}
function find(g,pred){const h=g.campOf(0);for(let r=40;r<400;r+=10)for(let a=0;a<360;a+=15){const x=h.x+Math.sin(a*Math.PI/180)*r,z=h.z-Math.cos(a*Math.PI/180)*r;if(Math.abs(x)<g.world.size/2-4&&Math.abs(z)<g.world.size/2-4&&pred(x,z))return{x,z};}return null;}
test('describeDestination derives bearing and distance, flags too far and too near and off-map',()=>{
 const g=fixture(),h=g.campOf(0);
 const far=describeDestination(g,h.x,h.z-(SEND_EXPEDITION_RULES.maximumMeters+50));assert.equal(far.ok,false);assert.ok(/far|water|off the map/i.test(far.issue));
 const near=describeDestination(g,h.x+2,h.z);assert.equal(near.ok,false);
 assert.equal(describeDestination(g,NaN,0).ok,false);assert.equal(describeDestination(g,1e9,0).ok,false);
 const e=describeDestination(g,h.x+100,h.z);assert.ok(Math.abs(e.bearing-90)<1e-6||e.terrain==='water'||!e.ok);assert.equal(e.meters,100);
 const n=describeDestination(g,h.x,h.z-100);assert.equal(n.bearing,0);
});
test('water is refused, land (explored or not) is accepted',()=>{
 const g=fixture();const w=find(g,(x,z)=>g.height(x,z)<g.waterAt(x,z)-.1);const l=find(g,(x,z)=>g.height(x,z)>=g.waterAt(x,z)+.2);
 if(w)assert.equal(describeDestination(g,w.x,w.z).terrain,'water'),assert.equal(describeDestination(g,w.x,w.z).ok,false);
 assert.ok(l,'fixture has land');const r=describeDestination(g,l.x,l.z);assert.equal(r.ok,true,r.issue);assert.equal(typeof r.explored,'boolean');
});
test('sending to water or too far changes nothing',()=>{
 const g=fixture(),c=expeditionCandidates(g).filter(p=>!p.issue).slice(0,1),h=g.campOf(0),before=JSON.stringify([g.tribe(0).food,g.state.units.map(u=>u.order)]);
 assert.equal(applySendExpedition(g,{kind:'send-expedition',unitIds:c.map(p=>p.id),x:h.x,z:h.z-900}).accepted,false);
 const w=find(g,(x,z)=>g.height(x,z)<g.waterAt(x,z)-.1);if(w)assert.equal(applySendExpedition(g,{kind:'send-expedition',unitIds:c.map(p=>p.id),x:w.x,z:w.z}).accepted,false);
 assert.equal(JSON.stringify([g.tribe(0).food,g.state.units.map(u=>u.order)]),before);
});
test('a valid map pick sends the party',()=>{
 const g=fixture(),c=expeditionCandidates(g).filter(p=>!p.issue).slice(0,1),l=find(g,(x,z)=>g.height(x,z)>=g.waterAt(x,z)+.2);
 const r=applySendExpedition(g,{kind:'send-expedition',unitIds:c.map(p=>p.id),x:l.x,z:l.z});assert.equal(r.accepted,true,r.reason);
});
test('picker store arms, picks, clears and notifies; rejects non-finite',()=>{
 let n=0;const off=expeditionPicker.subscribe(()=>n++);expeditionPicker.arm();assert.equal(expeditionPicker.armed,true);
 assert.equal(expeditionPicker.pick(NaN,1),false);assert.equal(expeditionPicker.pick(5,7),true);assert.deepEqual(expeditionPicker.target,{x:5,z:7});assert.equal(expeditionPicker.armed,false);
 expeditionPicker.clear();assert.equal(expeditionPicker.target,null);off();assert.ok(n>=3);
});
