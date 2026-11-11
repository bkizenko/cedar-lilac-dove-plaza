import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game} from '../src/game/sim.ts';
import {beginHerdTaming} from '../src/game/husbandry.ts';
import {insidePen} from '../src/game/penGeometry.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {mulberry32} from '../src/game/rng.ts';
const terrainHash=g=>createHash('sha256').update(JSON.stringify({heights:Array.from(g.world.heights),rivers:g.world.rivers,features:g.world.features})).digest('hex');
test('native V18 sheep is physically captured and led home on unchanged terrain, preserving identity and fleece through reload',()=>{
 const previousRandom=Math.random;Math.random=mulberry32(42);
 try{
  const g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();
  const terrain=terrainHash(g),worker=g.state.units.find(u=>u.team===0&&u.type==='worker');assert.ok(worker);
  // Declared observed opening, completed pen and finite household provisions.
  // Terrain, generated wildlife and every actor's initial position stay native.
  g.vision.fill(2);
  const wild=g.state.wildlife.filter(a=>a.species==='sheep'&&a.hp>0&&Math.hypot(a.x-worker.x,a.z-worker.z)<200);
  assert.ok(wild.length,'native generated sheep near the starting residents');
  let point;
  for(let ring=12;ring<=66&&!point;ring+=6)for(let i=0;i<16&&!point;i++){
   const x=worker.x+Math.sin(i*Math.PI/8)*ring,z=worker.z+Math.cos(i*Math.PI/8)*ring;
   if(g.placementIssue('pen',x,z,0)===null&&wild.some(a=>g.workBoard.connected(g,worker.x,worker.z,a.x,a.z)&&g.workBoard.connected(g,a.x,a.z,x,z)))point={x,z};
  }
  assert.ok(point,'naturally legal connected enclosure, without clearing or flattening');
  const pen=g.makeBld('pen',point.x,point.z,0);g.state.buildings.push(pen);g.rebuildWalk();
  for(const u of g.state.units.filter(u=>u.team===0)){u.selected=false;u.jobLock=true;u.order='hold';}
  worker.selected=true;worker.jobLock=false;
  g.tribe(0).food=300;g.tribe(0).foodLots={provisions:300};g.tribe(0).survival.waterLiters=300;
  g.state.autoWorkEnabled=false;g.state.nightWork=true;g.state.weather='clear';g.state.weatherT=10000;g.state.conflict='quiet';
  g.raidT=g.seaT=g.calamityT=10000;g.state.raidT=g.state.birthT=10000;g.state.visitorTimer=900;for(const t of g.state.tribes)t.thinkT=10000;
  assert.equal(beginHerdTaming(g,pen.id,worker.id,'sheep'),true);
  const id=worker.tamingWork.animal,initial=g.state.wildlife.find(a=>a.id===id),initialFleece=structuredClone(initial.fleece);
  assert.ok(wild.some(a=>a.id===id));assert.equal(g.tribe(0).food,294,'one finite taming payment');
  const start=g.state.time;let capturedAwayFromPen=false,ledDistance=0,previous;
  for(let i=0;i<1500;i++){
   const before=g.state.time;g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.ok(!g.state.ended);
   assert.ok(g.state.time>before,JSON.stringify({paused:g.state.paused,reason:worker.workReason,encounter:g.state.encounter}));
   const a=g.state.livestock?.find(a=>a.id===id);
   if(a){
    if(!insidePen(pen,a.x,a.z,.25))capturedAwayFromPen=true;
    if(previous)ledDistance+=Math.hypot(a.x-previous.x,a.z-previous.z);previous={x:a.x,z:a.z};
    if(insidePen(pen,a.x,a.z,.25)&&!worker.tamingWork)break;
   }
  }
  const animal=g.state.livestock?.find(a=>a.id===id);
  assert.ok(animal,JSON.stringify({time:g.state.time,reason:worker.workReason,work:worker.tamingWork,position:[worker.x,worker.z]}));
  assert.ok(insidePen(pen,animal.x,animal.z,.25),JSON.stringify({animal,pen,reason:worker.workReason}));
  assert.equal(worker.tamingWork,undefined);assert.ok(capturedAwayFromPen,'capture occurred at the actual wild sheep, outside the pen');
  assert.ok(ledDistance>2,'the captured sheep physically travelled home');assert.ok(g.state.time-start<=300.001);
  assert.equal(g.state.wildlife.some(a=>a.id===id),false);assert.deepEqual(animal.fleece,initialFleece);
  assert.equal(terrainHash(g),terrain,'capture never edits terrain, rivers or features');
  const restored=decodeGame(encodeGame(g)),saved=restored.state.livestock.find(a=>a.id===id);
  assert.ok(saved);assert.equal(saved.pen,pen.id);assert.deepEqual(saved.fleece,animal.fleece);assert.equal(saved.x,animal.x);assert.equal(saved.z,animal.z);
  assert.equal(restored.state.wildlife.some(a=>a.id===id),false);assert.equal(terrainHash(restored),terrain);
 }finally{Math.random=previousRandom;}
});
