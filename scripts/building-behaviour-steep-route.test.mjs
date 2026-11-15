import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
function setup(){const g=new Game();g.reset(345,2);g.enterIsland();g.state.units=[];g.state.buildings=[];g.vision.fill(2);g.waterAt=()=>0;
 // a 45 degree tent ridge across x=0 for |z|<50, open flat ground beyond its ends
 g.height=(x,z)=>4+(Math.abs(z)<50?Math.max(0,10-Math.abs(x)):0);g.world.heights=g.world.heights.slice();g.state.walkDirty=true;g.rebuildWalk();return g;}
function walk(g,u,tx,tz,secs=400){let len=0,maxY=0,px=u.x,pz=u.z;for(let i=0;i<secs*10&&Math.hypot(u.x-tx,u.z-tz)>1.5;i++){g.state.time+=.1;g.navBudget=6;u.order='move';u.tx=tx;u.tz=tz;g.steer(u,.1);len+=Math.hypot(u.x-px,u.z-pz);px=u.x;pz=u.z;maxY=Math.max(maxY,u.y);}return{len,maxY,done:Math.hypot(u.x-tx,u.z-tz)<=1.5};}
test('a walker takes the longer, gentler way round a steep ridge on the direct line',()=>{
 const g=setup(),u=g.spawnUnit('worker',-25,0,0);u.y=g.travelHeight(u.x,u.z);const r=walk(g,u,25,0);
 assert.ok(r.done,'arrived, at '+u.x.toFixed(1)+','+u.z.toFixed(1));assert.ok(r.len>50*1.15,'detoured: '+r.len.toFixed(1)+' m vs 50 direct');assert.ok(r.maxY<8,'did not climb the ridge, peak '+r.maxY.toFixed(1));
});
test('with no ridge the same walker goes straight',()=>{
 const g=setup();g.height=(x,z)=>4;g.state.walkDirty=true;g.rebuildWalk();const u=g.spawnUnit('worker',-25,0,0);u.y=4;const r=walk(g,u,25,0);assert.ok(r.done);assert.ok(r.len<54,'straight: '+r.len.toFixed(1));
});
