import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game} from '../src/game/sim.ts';
import {searchForWildGoats,tickGoatSearchOrders,GOAT_QUEUE_RULES} from '../src/game/animalOrders.ts';
import {beginLivestockEscort,penAnimals,penPlacesOccupied,HERD} from '../src/game/husbandry.ts';
import {surveyPenPasture} from '../src/game/penPasture.ts';
import {insidePen} from '../src/game/penGeometry.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {mulberry32} from '../src/game/rng.ts';
const terrain=g=>createHash('sha256').update(JSON.stringify({heights:Array.from(g.world.heights),rivers:g.world.rivers,features:g.world.features})).digest('hex');
test('queued goat finding waits without spending while live escorted animals reserve every original home place',()=>{
 // Finite controlled initial herd, not earned capture/native-terrain evidence.
 const g=new Game();g.reset(42);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[g.makeBld('townhall',0,50,0),g.makeBld('pen',30,30,0)];
 for(const k of ['wildlife','trees','stones','forage','fish','copper','iron'])g.state[k]=[];
 g.state.autoWorkEnabled=false;g.vision.fill(1);g.rebuildWalk();const worker=g.spawnUnit('worker',0,30,0),leader=g.spawnUnit('worker',30,30,0),pen=g.state.buildings[1];leader.order='hold';leader.jobLock=true;worker.selected=true;
 const capacity=surveyPenPasture(g,pen).eligibleCapacity;assert.ok(capacity>0);
 g.state.livestock=Array.from({length:capacity},()=>({id:g.id(),species:'goat',x:30,z:30,y:4,hp:2,maxHp:2,facing:0,vx:0,vz:0,wanderT:10000,fly:0,scale:1,team:0,pen:pen.id,sex:'female',born:-300,tamedAt:0,hunger:5,milk:0,pregnancy:0}));
 // The actual escort adapter changes custody on those same existing bodies.
 for(const a of g.state.livestock)assert.equal(beginLivestockEscort(g,a.id,leader.id),true);
 assert.equal(penAnimals(g,pen.id).length,0);assert.equal(penPlacesOccupied(g,pen.id),capacity);
 const food=g.tribe(0).food,ids=g.state.livestock.map(a=>a.id);assert.equal(searchForWildGoats(g,pen.id).accepted,true);
 assert.equal(pen.goatSearch.state,'waiting');assert.equal(pen.goatSearch.reason,'space');assert.equal(g.tribe(0).food,food);assert.equal(worker.expedition,undefined);assert.equal(worker.tamingWork,undefined);
 for(let i=0;i<3;i++){g.state.time+=GOAT_QUEUE_RULES.retrySeconds;tickGoatSearchOrders(g);assert.equal(pen.goatSearch.reason,'space');assert.equal(g.tribe(0).food,food);}
 const restored=decodeGame(encodeGame(g)),copy=restored.state.buildings.find(b=>b.id===pen.id);assert.equal(copy.goatSearch.reason,'space');assert.equal(penPlacesOccupied(restored,pen.id),capacity);assert.deepEqual(restored.state.livestock.map(a=>a.id),ids);assert.ok(restored.state.livestock.every(a=>a.ledBy===leader.id));
});
test('native queued find captures an existing generated goat, physically leads it home and preserves paid progress through strict reload',()=>{
 const random=Math.random;Math.random=mulberry32(42);try{
  let g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();g.vision.fill(2);const hash=terrain(g);
  let u=g.state.units.find(p=>p.team===0&&p.type==='worker');assert.ok(u);const sourceIds=g.state.wildlife.filter(a=>a.species==='goat'&&a.hp>0).map(a=>a.id);
  const nearby=g.state.wildlife.filter(a=>sourceIds.includes(a.id)&&Math.hypot(a.x-u.x,a.z-u.z)<200);assert.ok(nearby.length,'declared seed contains actual generated goats; no animals will be fabricated');
  let point;for(let radius=12;radius<=66&&!point;radius+=6)for(let i=0;i<16&&!point;i++){const x=u.x+Math.sin(i*Math.PI/8)*radius,z=u.z+Math.cos(i*Math.PI/8)*radius;if(g.placementIssue('pen',x,z,0)===null&&nearby.some(a=>g.workBoard.connected(g,x,z,a.x,a.z)))point={x,z};}
  assert.ok(point,'a real legal enclosure site is needed');let pen=g.makeBld('pen',point.x,point.z,0);g.state.buildings.push(pen);g.rebuildWalk();
  // Declared finite paid enclosure + meal reserve, before clock; preserve all
  // generated terrain, resources, wildlife and initial person positions.
  for(const p of g.state.units.filter(p=>p.team===0)){p.selected=false;p.jobLock=true;p.job='wood';p.order='hold';}u.selected=true;
  Object.assign(g.tribe(0),{food:300,foodLots:{provisions:300}});g.state.autoWorkEnabled=false;g.state.nightWork=true;g.state.weather='clear';g.state.weatherT=10000;g.state.conflict='quiet';g.state.visitorTimer=900;g.state.raidT=g.state.birthT=10000;g.raidT=g.seaT=g.calamityT=10000;for(const t of g.state.tribes)t.thinkT=10000;
  assert.equal(searchForWildGoats(g,pen.id).accepted,true);assert.equal(pen.goatSearch.state,'waiting');assert.equal(pen.goatSearch.reason,'adult');
  const workerId=u.id,penId=pen.id;g=decodeGame(encodeGame(g));u=g.state.units.find(p=>p.id===workerId);pen=g.state.buildings.find(b=>b.id===penId);assert.equal(terrain(g),hash);u.jobLock=false;g.state.paused=false;
  const wall=Date.now(),start=g.state.time;let searched=false,seenCapture=false,reloaded=false,animalId;
  while(g.state.time-start<300&&pen.goatSearch.state!=='complete'){
   assert.ok(Date.now()-wall<30000,'bounded native case wall time');const before=g.state.time;g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.ok(g.state.time>before,JSON.stringify({ended:g.state.ended,paused:g.state.paused,encounter:g.state.encounter}));
   searched ||=u.order==='explore'&&u.goatSearchPen===pen.id;
   if(u.tamingWork){seenCapture=true;animalId=u.tamingWork.animal;assert.ok(sourceIds.includes(animalId));
    if(!reloaded&&u.tamingWork.progress>0&&u.tamingWork.progress<HERD.tamingSeconds){
     const paid=structuredClone(u.tamingWork),pack=structuredClone(u.expedition),stock=g.tribe(0).food;g=decodeGame(encodeGame(g));u=g.state.units.find(p=>p.id===workerId);pen=g.state.buildings.find(b=>b.id===penId);
     assert.deepEqual(u.tamingWork,paid);assert.deepEqual(u.expedition,pack);assert.equal(g.tribe(0).food,stock);assert.equal(terrain(g),hash);reloaded=true;
    }
   }
  }
  const animal=g.state.livestock?.find(a=>a.id===animalId&&a.pen===penId);assert.ok(animal,JSON.stringify({searched,seenCapture,reloaded,time:g.state.time-start,person:{x:u.x,z:u.z,order:u.order,reason:u.workReason,taming:u.tamingWork},queue:pen.goatSearch}));
  assert.ok(seenCapture&&reloaded);assert.ok(insidePen(pen,animal.x,animal.z,.25));assert.equal(pen.goatSearch.state,'complete');assert.equal(g.state.wildlife.some(a=>a.id===animal.id),false);assert.equal(g.state.livestock.filter(a=>a.id===animal.id).length,1);assert.equal(terrain(g),hash);
  const saved=decodeGame(encodeGame(g));assert.equal(terrain(saved),hash);assert.equal(saved.state.buildings.find(b=>b.id===penId).goatSearch.state,'complete');
  const copy=saved.state.livestock.find(a=>a.id===animal.id),home=saved.state.buildings.find(b=>b.id===penId);assert.ok(copy&&insidePen(home,copy.x,copy.z,.25));
 }finally{Math.random=random;}
});
