import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {searchForWildGoats} from '../src/game/animalOrders.ts';
import {insidePen} from '../src/game/penGeometry.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
test('unchanged seed42 terrain supports real native-goat capture and physical pen delivery through ordinary simulation ticks',()=>{
 const g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();g.vision.fill(2);
 const u=g.state.units.find(u=>u.team===0&&u.type==='worker');assert.ok(u);
 const goats=g.state.wildlife.filter(a=>a.species==='goat'&&a.hp>0&&Math.hypot(a.x-u.x,a.z-u.z)<200);
 assert.ok(goats.length,'real generated nearby goats');
 let point;
 for(let ring=12;ring<=66&&!point;ring+=6)for(let i=0;i<16&&!point;i++){
  const x=u.x+Math.sin(i*Math.PI/8)*ring,z=u.z+Math.cos(i*Math.PI/8)*ring;
  if(g.placementIssue('pen',x,z,0)===null&&goats.some(a=>g.workBoard.connected(g,x,z,a.x,a.z)))point={x,z};
 }
 assert.ok(point,'naturally clear legal enclosure site, without clearing or flattening');
 const pen=g.makeBld('pen',point.x,point.z,0);g.state.buildings.push(pen);g.rebuildWalk();
 for(const p of g.state.units.filter(p=>p.team===0)){p.selected=false;p.jobLock=true;p.job='wood';p.order='hold';}
 u.selected=true;u.jobLock=false;
 // Controlled provisions/workforce only. Keep every natural resource, building,
 // animal, terrain sample and initial actor position unchanged.
 g.tribe(0).food=300;g.tribe(0).foodLots={provisions:300};g.state.autoWorkEnabled=false;
 const originalGoatIds=new Set(g.state.wildlife.filter(a=>a.species==='goat').map(a=>a.id));
 const result=searchForWildGoats(g,pen.id);assert.equal(result.accepted,true,result.reason);
 g.state.paused=false;g.state.nightWork=true;g.raidT=g.seaT=g.calamityT=10000;g.state.weather='clear';g.state.weatherT=10000;g.state.visitorTimer=900;g.state.raidT=g.state.birthT=10000;for(const t of g.state.tribes)t.thinkT=10000;
 for(let i=0;i<1200&&!g.state.livestock?.some(a=>a.pen===pen.id&&insidePen(pen,a.x,a.z,.25));i++)g.step(.2);
 assert.deepEqual(g.simulationErrors,[]);
 const a=g.state.livestock?.find(a=>a.pen===pen.id);assert.ok(a,JSON.stringify({reason:u.workReason,order:u.order,tame:u.tamingWork,position:[u.x,u.z]}));
 assert.ok(originalGoatIds.has(a.id));assert.ok(insidePen(pen,a.x,a.z,.25),JSON.stringify({a,pen,reason:u.workReason}));
 assert.equal(g.state.wildlife.filter(w=>w.id===a.id).length,0);
 const restored=decodeGame(encodeGame(g));assert.ok(restored.state.livestock.some(p=>p.id===a.id&&p.pen===pen.id));
});
