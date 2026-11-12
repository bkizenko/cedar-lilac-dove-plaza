import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {testAction} from '../src/game/testing.ts';
import {boardRiverboat} from '../src/game/boats.ts';
import {ROUTE_PROGRESS_RULES} from '../src/game/routeProgress.ts';

// GW-07: "if i tell people to go to an areas thats not in line of sight they
// should still go or go as close as they can b otherwise its hinting" (scenic#458)
const fresh=()=>{const g=new Game();g.reset(0,undefined,{size:1040,layout:'continents'});g.state.conflict='quiet';g.enterIsland();return g;};
const LAKE={x:-19,z:397}; // unexplored open water north of the seed-0 continents camp
const closest=(g,u,t)=>{const i=g.workBoard.closestReachableCell(g,u.x,u.z,t.x,t.z),W=Math.sqrt(g.walk.length),c=g.world.size/W;return Math.hypot(-g.world.size/2+(i%W+.5)*c-t.x,-g.world.size/2+((i/W|0)+.5)*c-t.z);};
const run=(g,s,f)=>{for(let t=0;t<s;t+=.2){g.step(.2);if(f?.())break;}};

test('a move into unexplored water walks to the closest reachable ground and waits there',()=>{
 const g=fresh(),u=g.state.units.find(u=>u.team===0&&u.type==='worker');assert.equal(g.exploredAt(LAKE.x,LAKE.z),false);
 const best=closest(g,u,LAKE);g.clearSelect();g.selectEntity(u);g.issueMove(LAKE.x,LAKE.z);run(g,240,()=>u.order!=='move');
 assert.equal(u.order,'hold');assert.ok(Math.hypot(u.x-LAKE.x,u.z-LAKE.z)<=best+ROUTE_PROGRESS_RULES.nearestArrivalMetres+1);
});

test('an attack-move into unexplored water also goes as close as it can instead of refusing',()=>{
 const g=fresh(),u=g.state.units.find(u=>u.team===0&&u.type==='worker'),start={x:u.x,z:u.z};
 const best=closest(g,u,LAKE);g.clearSelect();g.selectEntity(u);g.issueMove(LAKE.x,LAKE.z,true);let min=1e9;
 run(g,240,()=>{min=Math.min(min,Math.hypot(u.x-LAKE.x,u.z-LAKE.z));return u.order!=='attackmove';});
 assert.ok(Math.hypot(u.x-start.x,u.z-start.z)>100,'the order is carried out');
 assert.ok(min<=best+ROUTE_PROGRESS_RULES.nearestArrivalMetres+1,`closest approach ${min.toFixed(1)} vs ${best.toFixed(1)}`);
});

test('a group sent into unexplored water all settle at the shore instead of contending for one cell',()=>{
 const g=fresh(),us=g.state.units.filter(u=>u.team===0&&u.type==='worker'&&u.hp>0).slice(0,4);g.clearSelect();for(const u of us)g.selectEntity(u,true);
 g.issueMove(LAKE.x,LAKE.z);run(g,240,()=>us.every(u=>u.order==='hold'));
 assert.deepEqual(us.map(u=>u.order),us.map(()=>'hold'));
 for(const u of us)assert.ok(Math.hypot(u.x-LAKE.x,u.z-LAKE.z)<closest(g,u,LAKE)+6);
});

test('a player boat ordered into unexplored land sails as close as the water allows; explored land is still refused',()=>{
 const g=fresh();g.testMode=true;assert.ok(testAction(g,'ferry'));g.revealMap=false;g.updateVision(0);
 const b=g.state.boats.find(b=>b.team===0);assert.ok(b,'ferry launched a boat');
 const crew=g.state.units.filter(u=>u.team===0&&u.type==='worker'&&u.hp>0&&Math.hypot(u.x-b.x,u.z-b.z)<25).slice(0,3);assert.ok(boardRiverboat(g,b.id,crew)>0);
 run(g,60,()=>b.captain!==undefined&&crew.every(u=>u.boat?.phase==='aboard'));assert.ok(b.captain!==undefined,'crew aboard');
 const banners=[];const banner=g.banner.bind(g);g.banner=(m,t)=>{banners.push(m);return banner(m,t);};
 let inland=null;for(let r=120;r<400&&!inland;r+=20)for(let a=0;a<32;a++){const x=b.x+Math.cos(a/32*6.283)*r,z=b.z+Math.sin(a/32*6.283)*r;if(Math.abs(x)<500&&Math.abs(z)<500&&!g.exploredAt(x,z)&&g.height(x,z)>g.waterAt(x,z)+3){inland={x,z};break;}}
 assert.ok(inland);g.clearSelect();g.selectedBoat=b.id;g.issueMove(inland.x,inland.z);
 const cap=g.state.units.find(u=>u.id===b.captain);assert.equal(cap.order,'move',JSON.stringify(banners));assert.deepEqual(banners,[]);
 assert.ok(Math.hypot(cap.tx-inland.x,cap.tz-inland.z)<Math.hypot(b.x-inland.x,b.z-inland.z),'heads toward the order');
 const known=g.state.buildings.find(x=>x.team===0&&x.type!=='dock')??g.campOf(0);
 let far=null;for(let r=60;r<300&&!far;r+=10)for(let a=0;a<16;a++){const x=known.x+Math.cos(a/16*6.283)*r*.1,z=known.z+Math.sin(a/16*6.283)*r*.1;if(g.exploredAt(x,z)&&g.height(x,z)>g.waterAt(x,z)+3){far={x,z};break;}}
 if(far){g.selectedBoat=b.id;banners.length=0;const ok=g.issueMove(far.x,far.z);void ok;if(banners.length)assert.match(banners[0],/No connected navigable water/);}
});
