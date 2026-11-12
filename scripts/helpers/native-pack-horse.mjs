import assert from 'node:assert/strict';
import {Game} from '../../src/game/sim.ts';
import {FOW,BUILDINGS} from '../../src/game/constants.ts';
import {beginHerdTaming,assignHusbandry} from '../../src/game/husbandry.ts';
import {insidePen} from '../../src/game/penGeometry.ts';
import {releaseHusbandryKeeper} from '../../src/game/penWater.ts';
import {surveyPenPasture} from '../../src/game/penPasture.ts';
import {mulberry32} from '../../src/game/rng.ts';
export function nativeDrive(g,seconds,until=()=>false){const end=g.state.time+seconds;while(g.state.time<end&&!until()){g.state.paused=false;g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.ok(!g.state.ended);}return until();}
function legal(g,type,origin,accept=()=>true){for(let ring=12;ring<=84;ring+=6)for(let i=0;i<24;i++){const x=origin.x+Math.sin(i*Math.PI/12)*ring,z=origin.z+Math.cos(i*Math.PI/12)*ring;if(g.placementIssue(type,x,z,0)===null&&accept(x,z))return{x,z};}}
/** Declared finite opening; every capture/training and subsequent movement is
 * ordinary Game.step on generated terrain. No asset/body is changed mid-run. */
export function earnNativePackHorse(){
 const random=Math.random;Math.random=mulberry32(42);
 try{
  const g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();
  const worker=g.state.units.find(u=>u.team===0&&u.type==='worker'&&!u.maturesAt);assert.ok(worker);
  const peer=g.state.units.find(u=>u.team===0&&u.type==='worker'&&u!==worker&&!u.maturesAt);assert.ok(peer);
  const horses=g.state.wildlife.filter(a=>a.species==='horse'&&a.hp>0&&Math.hypot(a.x-worker.x,a.z-worker.z)<200);assert.ok(horses.length);for(const a of horses){const ix=Math.floor((a.x+g.world.size/2)/g.world.size*FOW),iz=Math.floor((a.z+g.world.size/2)/g.world.size*FOW);g.vision[iz*FOW+ix]=2;}
  const p=legal(g,'pen',worker,(x,z)=>horses.some(a=>g.workBoard.connected(g,worker.x,worker.z,a.x,a.z)&&g.workBoard.connected(g,a.x,a.z,x,z))&&surveyPenPasture(g,{id:-1,x,z,w:BUILDINGS.pen.w,d:BUILDINGS.pen.d}).eligibleCapacity>=3);assert.ok(p);
  const pen=g.makeBld('pen',p.x,p.z,0);g.state.buildings.push(pen);g.rebuildWalk();
  const s=legal(g,'stables',pen,(x,z)=>g.workBoard.connected(g,pen.x,pen.z,x,z));assert.ok(s);
  const stable=g.makeBld('stables',s.x,s.z,0);g.state.buildings.push(stable);g.rebuildWalk();
  const w=legal(g,'warehouse',worker,(x,z)=>g.workBoard.connected(g,worker.x,worker.z,x,z));assert.ok(w);
  const warehouse=g.makeBld('warehouse',w.x,w.z,0);g.state.buildings.push(warehouse);g.rebuildWalk();
  for(const u of g.state.units.filter(u=>u.team===0)){u.selected=false;u.jobLock=true;u.order='hold';}
  worker.selected=true;worker.jobLock=false;
  Object.assign(g.tribe(0),{food:3000,foodLots:{bread:2400,pulses:600},wood:100});g.tribe(0).survival.waterLiters=2000;
  g.state.autoWorkEnabled=false;g.state.nightWork=true;g.state.weather='clear';g.state.weatherT=10000;g.state.conflict='quiet';g.raidT=g.seaT=g.calamityT=10000;g.state.raidT=g.state.birthT=10000;g.state.visitorTimer=900;for(const t of g.state.tribes)t.thinkT=10000;
  assert.equal(beginHerdTaming(g,pen.id,worker.id,'horse'),true);const animalId=worker.tamingWork.animal;
  assert.ok(nativeDrive(g,450,()=>!worker.tamingWork&&g.state.livestock?.some(a=>a.id===animalId&&insidePen(pen,a.x,a.z,.25))),worker.workReason);
  releaseHusbandryKeeper(g,worker);assert.equal(assignHusbandry(g,pen.id,'pack','horse'),true,worker.workReason);
  assert.ok(nativeDrive(g,300,()=>!!worker.packAnimal),worker.workReason);assert.equal(worker.packAnimal.id,animalId);assert.equal(worker.haulage,'pack');
  return{g,workerId:worker.id,peerId:peer.id,animalId,warehouseId:warehouse.id};
 }finally{Math.random=random;}
}
