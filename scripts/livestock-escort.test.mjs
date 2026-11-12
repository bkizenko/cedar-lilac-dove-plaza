import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game} from '../src/game/sim.ts';
import {beginHerdTaming,beginLivestockEscort,finishLivestockEscort,husbandryAI,penAnimals,tickHusbandry} from '../src/game/husbandry.ts';
import {penWaterReport} from '../src/game/penWater.ts';
import {penPastureReport} from '../src/game/penPasture.ts';
import {insidePen} from '../src/game/penGeometry.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {mulberry32} from '../src/game/rng.ts';
const terrain=g=>createHash('sha256').update(JSON.stringify({heights:Array.from(g.world.heights),rivers:g.world.rivers,features:g.world.features})).digest('hex');
// Actual fresh native sheep capture supplies the identity; no initial animal grant.
function captured(){
 const g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();g.vision.fill(2);
 const originalTerrain=terrain(g),worker=g.state.units.find(u=>u.team===0&&u.type==='worker'),wild=g.state.wildlife.filter(a=>a.species==='sheep'&&a.hp>0&&Math.hypot(a.x-worker.x,a.z-worker.z)<200);let point;
 for(let r=12;r<=66&&!point;r+=6)for(let i=0;i<16&&!point;i++){const x=worker.x+Math.sin(i*Math.PI/8)*r,z=worker.z+Math.cos(i*Math.PI/8)*r;if(g.placementIssue('pen',x,z,0)===null&&wild.some(a=>g.workBoard.connected(g,worker.x,worker.z,a.x,a.z)&&g.workBoard.connected(g,a.x,a.z,x,z)))point={x,z};}
 assert.ok(point);const pen=g.makeBld('pen',point.x,point.z,0);g.state.buildings.push(pen);g.rebuildWalk();
 for(const u of g.state.units.filter(u=>u.team===0)){u.selected=false;u.jobLock=true;u.order='hold';}worker.selected=true;worker.jobLock=false;
 // Declared finite provisions and legal finished pen, same qualified capture setup.
 g.tribe(0).food=300;g.tribe(0).foodLots={provisions:300};g.tribe(0).survival.waterLiters=300;
 g.state.autoWorkEnabled=false;g.state.nightWork=true;g.state.weather='clear';g.state.weatherT=10000;g.state.conflict='quiet';g.raidT=g.seaT=g.calamityT=10000;g.state.raidT=g.state.birthT=10000;g.state.visitorTimer=900;for(const t of g.state.tribes)t.thinkT=10000;
 assert.equal(beginHerdTaming(g,pen.id,worker.id,'sheep'),true);const id=worker.tamingWork.animal;
 for(let i=0;i<1500;i++){g.step(.2);assert.deepEqual(g.simulationErrors,[]);const a=g.state.livestock?.find(a=>a.id===id);if(a&&insidePen(pen,a.x,a.z,.25)&&!worker.tamingWork)break;}
 const animal=g.state.livestock?.find(a=>a.id===id);assert.ok(animal&&insidePen(pen,animal.x,animal.z,.25)&&!worker.tamingWork,'actual paid capture must finish in300s');g.interruptMission(worker);return{g,worker,pen,animal,originalTerrain};
}
test('native captured sheep follows exclusive live escort custody, reloads intact, and arrives or releases without duplication',{timeout:60000},()=>{
 const random=Math.random;Math.random=mulberry32(42);
 try{
  const {g,worker,pen,animal:a,originalTerrain}=captured(),id=a.id,fleece=structuredClone(a.fleece),milk=a.milk,pregnancy=a.pregnancy;
  assert.equal(beginLivestockEscort(g,id,worker.id),true);assert.equal(beginLivestockEscort(g,id,worker.id),false,'duplicate custody rejected');
  assert.equal(penAnimals(g,pen.id).length,0);assert.equal(penWaterReport(g,pen).demand,0);assert.equal(penPastureReport(g,pen).animals,0);
  const saved=encodeGame(g),restored=decodeGame(saved),copy=restored.state.livestock.find(x=>x.id===id);assert.equal(copy.ledBy,worker.id);assert.deepEqual(copy.fleece,fleece);assert.equal(copy.hp,a.hp);assert.equal(copy.x,a.x);assert.equal(copy.z,a.z);
  for(const badLeader of[-1,1.5,g.state.nextId+10]){const bad=structuredClone(saved);bad.state.livestock.find(x=>x.id===id).ledBy=badLeader;assert.throws(()=>decodeGame(bad));}
  const duplicate=structuredClone(saved);duplicate.state.units.find(x=>x.id===worker.id).tamingWork={animal:id,pen:pen.id,progress:60};assert.throws(()=>decodeGame(duplicate),'simultaneous taming and trade custody rejected');
  // A real order walks the actual leader; ordinary Game.step moves the sheep.
  let target;for(let r=14;r<=28&&!target;r+=4)for(let i=0;i<16&&!target;i++){const x=pen.x+Math.sin(i*Math.PI/8)*r,z=pen.z+Math.cos(i*Math.PI/8)*r;if(g.walkable(x,z)&&g.workBoard.connected(g,worker.x,worker.z,x,z))target={x,z};}assert.ok(target);
  g.clearSelect();g.selectEntity(worker);g.issueMove(target.x,target.z);const start={x:a.x,z:a.z,time:g.state.time};
  for(let i=0;i<200;i++){g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.equal(a.ledBy,worker.id);if(Math.hypot(a.x-start.x,a.z-start.z)>6&&!insidePen(pen,a.x,a.z))break;}
  assert.ok(Math.hypot(a.x-start.x,a.z-start.z)>6,'actual sheep travels');assert.ok(!insidePen(pen,a.x,a.z));assert.equal(a.milk,milk);assert.equal(a.pregnancy,pregnancy);assert.deepEqual(a.fleece,fleece);
  const keeper=g.state.units.find(u=>u.team===0&&u.hp>0&&u.id!==worker.id);keeper.husbandryWork={pen:pen.id,action:'care',phase:'pen',progress:0};keeper.order='hold';husbandryAI(g,keeper,.2);assert.equal(keeper.tamingWork,undefined,'home keeper cannot steal escort');
  assert.equal(finishLivestockEscort(g,id,worker.id,pen.id),false,'distant pen cannot receive');g.clearSelect();g.selectEntity(worker);g.issueMove(pen.x,pen.z);
  let delivered=false;for(let i=0;i<300&&!delivered;i++){g.step(.2);assert.deepEqual(g.simulationErrors,[]);delivered=finishLivestockEscort(g,id,worker.id,pen.id);}assert.equal(delivered,true,'arrival is a physical pen delivery');assert.equal(a.ledBy,undefined);assert.equal(a.id,id);assert.deepEqual(a.fleece,fleece);
  assert.equal(beginLivestockEscort(g,id,worker.id),true);worker.hp=0;const at={x:a.x,z:a.z};tickHusbandry(g,.01);assert.equal(a.ledBy,undefined);assert.ok(Math.hypot(a.x-at.x,a.z-at.z)<.01,'leader loss never teleports animal');assert.equal(g.state.livestock.filter(x=>x.id===id).length,1);assert.equal(g.state.wildlife.some(x=>x.id===id),false);assert.equal(terrain(g),originalTerrain);assert.ok(g.state.time-start.time<101);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
 }finally{Math.random=random;}
});
