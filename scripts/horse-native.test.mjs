import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {Game} from '../src/game/sim.ts';
import {BUILDINGS} from '../src/game/constants.ts';
import {beginHerdTaming,assignHusbandry,husbandryAI,tickHusbandry,penPlacesOccupied} from '../src/game/husbandry.ts';
import {insidePen} from '../src/game/penGeometry.ts';
import {releaseHusbandryKeeper} from '../src/game/penWater.ts';
import {surveyPenPasture} from '../src/game/penPasture.ts';
import {packCapacityMultiplier,validPackAnimal} from '../src/game/packAnimalState.ts';
import {carryingCapacity} from '../src/game/haulage.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {mulberry32} from '../src/game/rng.ts';
const terrainHash=g=>createHash('sha256').update(JSON.stringify({heights:Array.from(g.world.heights),rivers:g.world.rivers,features:g.world.features})).digest('hex');
const diagnostic=(g,u)=>JSON.stringify({time:g.state.time,reason:u.workReason,taming:u.tamingWork,husbandry:u.husbandryWork,position:[u.x,u.z]});

function step(g,u){const before=g.state.time;g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.ok(!g.state.ended);assert.ok(g.state.time>before,diagnostic(g,u));}
function legalPoint(g,type,origin,accept=()=>true){
 for(let ring=12;ring<=84;ring+=6)for(let i=0;i<24;i++){
  const x=origin.x+Math.sin(i*Math.PI/12)*ring,z=origin.z+Math.cos(i*Math.PI/12)*ring;
  if(g.placementIssue(type,x,z,0)===null&&accept(x,z))return {x,z};
 }
}

test('native V18 horse is captured for 120 seconds, physically led to its pen and stable, and trained into the same pack individual',()=>{
 const previousRandom=Math.random;Math.random=mulberry32(42);
 try{
  const g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();
  const terrain=terrainHash(g),worker=g.state.units.find(u=>u.team===0&&u.type==='worker');assert.ok(worker);
  g.vision.fill(2);
  const wild=g.state.wildlife.filter(a=>a.species==='horse'&&a.hp>0&&Math.hypot(a.x-worker.x,a.z-worker.z)<200);
  assert.ok(wild.length,'native generated living horses must be reachable near the starting residents');
  // Explicit test opening: two completed, legally placed buildings and finite
  // household food, water and logs. No terrain change or actor relocation.
  const point=legalPoint(g,'pen',worker,(x,z)=>wild.some(a=>g.workBoard.connected(g,worker.x,worker.z,a.x,a.z)&&g.workBoard.connected(g,a.x,a.z,x,z))&&surveyPenPasture(g,{id:-1,x,z,w:BUILDINGS.pen.w,d:BUILDINGS.pen.d}).eligibleCapacity>=3);
  assert.ok(point,'legal connected enclosure with three real horse places');
  const pen=g.makeBld('pen',point.x,point.z,0);g.state.buildings.push(pen);g.rebuildWalk();
  assert.ok(surveyPenPasture(g,pen).eligibleCapacity>=3);
  const stablePoint=legalPoint(g,'stables',pen,(x,z)=>g.workBoard.connected(g,pen.x,pen.z,x,z));
  assert.ok(stablePoint,'legal reachable stable on the original terrain');
  const stable=g.makeBld('stables',stablePoint.x,stablePoint.z,0);g.state.buildings.push(stable);g.rebuildWalk();
  for(const u of g.state.units.filter(u=>u.team===0)){u.selected=false;u.jobLock=true;u.order='hold';}
  worker.selected=true;worker.jobLock=false;
  g.tribe(0).food=300;g.tribe(0).foodLots={provisions:300};g.tribe(0).wood=30;g.tribe(0).survival.waterLiters=300;
  g.state.autoWorkEnabled=false;g.state.nightWork=true;g.state.weather='clear';g.state.weatherT=10000;g.state.conflict='quiet';
  g.raidT=g.seaT=g.calamityT=10000;g.state.raidT=g.state.birthT=10000;g.state.visitorTimer=900;for(const t of g.state.tribes)t.thinkT=10000;
  assert.equal(beginHerdTaming(g,pen.id,worker.id,'horse'),true);
  const id=worker.tamingWork.animal,initial=g.state.wildlife.find(a=>a.id===id),metadata={scale:initial.scale,maxHp:initial.maxHp};
  assert.ok(wild.some(a=>a.id===id));assert.equal(g.tribe(0).food,288,'one finite 12-food taming payment');
  const start=g.state.time;let capturedAt,away=false,ledDistance=0,previous;
  for(let i=0;i<2250;i++){
   step(g,worker);const a=g.state.livestock?.find(a=>a.id===id);
   if(a){
    capturedAt??=g.state.time;
    if(!insidePen(pen,a.x,a.z,.25))away=true;
    if(previous)ledDistance+=Math.hypot(a.x-previous.x,a.z-previous.z);previous={x:a.x,z:a.z};
    if(insidePen(pen,a.x,a.z,.25)&&!worker.tamingWork)break;
   }
  }
  const animal=g.state.livestock?.find(a=>a.id===id);assert.ok(animal,diagnostic(g,worker));
  assert.ok(capturedAt-start>=119.99,'capture cannot complete before 120 seconds of real work');
  assert.ok(insidePen(pen,animal.x,animal.z,.25),diagnostic(g,worker));assert.equal(worker.tamingWork,undefined);
  assert.ok(away,'the horse was captured at its real wild location outside the pen');assert.ok(ledDistance>2,'same horse physically walked home');
  assert.equal(g.state.wildlife.some(a=>a.id===id),false);assert.equal(animal.scale,metadata.scale);assert.equal(animal.maxHp,metadata.maxHp);
  assert.equal(terrainHash(g),terrain);
  releaseHusbandryKeeper(g,worker);
  assert.equal(worker.husbandryWork,undefined,'finish the automatic keeper duty before assigning the same handler to training');
  assert.equal(assignHusbandry(g,pen.id,'pack','horse'),true,diagnostic(g,worker));
  assert.equal(worker.husbandryWork.animal,id);assert.equal(worker.husbandryWork.stable,stable.id);
  const trainingRaw=encodeGame(g);
  assert.doesNotThrow(()=>decodeGame(trainingRaw),'active horse training survives strict reload');
  for(const invalidStable of [pen.id,999999]){
   const bad=structuredClone(trainingRaw);bad.state.units.find(u=>u.id===worker.id).husbandryWork.stable=invalidStable;
   assert.throws(()=>decodeGame(bad),'invalid or missing stable references are rejected');
  }
  // A target can die or be removed between simulation steps and autosave.
  // The already earned horse taming progress must remain saveable above 60s.
  for(const missing of [true,false]){
   const raw=structuredClone(trainingRaw),handler=raw.state.units.find(u=>u.id===worker.id);
   delete handler.husbandryWork;handler.tamingWork={animal:id,pen:pen.id,progress:90};
   if(missing)raw.state.livestock=raw.state.livestock.filter(a=>a.id!==id);
   else raw.state.livestock.find(a=>a.id===id).hp=0;
   const restored=decodeGame(raw),u=restored.state.units.find(u=>u.id===worker.id);
   assert.equal(u.tamingWork.progress,90);husbandryAI(restored,u,.2);
   assert.equal(u.tamingWork,undefined,'missing or dead target clears without another capture');
   assert.equal(u.packAnimal,undefined);assert.doesNotThrow(()=>decodeGame(encodeGame(restored)));
  }
  for(const change of ['removed','enemy','dead']){
   const restored=decodeGame(structuredClone(trainingRaw)),u=restored.state.units.find(u=>u.id===worker.id),b=restored.state.buildings.find(b=>b.id===stable.id);
   const logs=restored.tribe(0).wood;
   if(change==='removed')restored.state.buildings=restored.state.buildings.filter(b=>b.id!==stable.id);
   else if(change==='enemy')b.team=1;else b.hp=0;
   assert.doesNotThrow(()=>decodeGame(encodeGame(restored)),'a lost stable reference can survive the pre-cleanup autosave race');
   husbandryAI(restored,u,.2);assert.equal(u.husbandryWork,undefined,'lost stable cancels the training commitment');
   assert.equal(u.packAnimal,undefined);assert.equal(restored.tribe(0).wood,logs);
   assert.ok(restored.state.livestock.some(a=>a.id===id&&a.hp>0),'the original horse remains owned');
   assert.doesNotThrow(()=>decodeGame(encodeGame(restored)));
  }
  const woodBefore=g.tribe(0).wood,unpackedCapacity=carryingCapacity(worker,'wood'),trainingStart=g.state.time;
  let trainingSeconds=0,stableArrival=false,stableLedDistance=0,last={x:animal.x,z:animal.z};
  for(let i=0;i<1500&&!worker.packAnimal;i++){
   const before=worker.husbandryWork?.progress??0;step(g,worker);
   const a=g.state.livestock?.find(a=>a.id===id);
   if(a){stableLedDistance+=Math.hypot(a.x-last.x,a.z-last.z);last={x:a.x,z:a.z};}
   const progress=worker.husbandryWork?.progress;
   if(progress!==undefined&&progress>before){trainingSeconds+=progress-before;stableArrival=true;assert.ok(g.buildingWorkReached(worker,stable),'training only advances at the physical stable entrance');}
  }
  assert.ok(worker.packAnimal,diagnostic(g,worker));assert.ok(stableArrival);assert.ok(stableLedDistance>2,'same horse physically walked from pen to stable');
  assert.ok(g.state.time-trainingStart>=59.99,'stable training requires 60 real seconds');assert.ok(trainingSeconds>=59.7,'training progress accumulates at the stable');
  assert.equal(worker.haulage,'pack');assert.equal(worker.packAnimal.id,id);assert.equal(worker.packAnimal.species,'horse');assert.equal(worker.packAnimal.scale,metadata.scale);
  assert.equal(g.tribe(0).wood,woodBefore-6,'six real logs consumed exactly once');
  assert.equal(packCapacityMultiplier(worker),3.5,'healthy horse grants its actual full carrying bonus');assert.equal(carryingCapacity(worker,'wood'),unpackedCapacity*3.5);
  assert.equal(g.state.livestock.some(a=>a.id===id),false);assert.equal(g.state.wildlife.some(a=>a.id===id),false);assert.equal(terrainHash(g),terrain);
  const saved=decodeGame(encodeGame(g)),copy=saved.state.units.find(u=>u.id===worker.id);
  assert.deepEqual(copy.packAnimal,worker.packAnimal);assert.equal(copy.haulage,'pack');assert.equal(terrainHash(saved),terrain);
  assert.equal(saved.state.livestock.some(a=>a.id===id),false);assert.equal(saved.state.wildlife.some(a=>a.id===id),false);
  if(process.env.HORSE_NATIVE_SAVE){assert.ok(isAbsolute(process.env.HORSE_NATIVE_SAVE),'HORSE_NATIVE_SAVE must name an absolute output path');writeFileSync(process.env.HORSE_NATIVE_SAVE,JSON.stringify(encodeGame(g)));}
 }finally{Math.random=previousRandom;}
});

test('horse pack welfare reduces usable capacity without deleting already owned cargo',()=>{
 const u={type:'worker',haulage:'pack',carry:30,carryType:'wood',itemCargo:{rawHide:2},packAnimal:{id:9,species:'horse',hp:4,maxHp:4,scale:1.2,hunger:0,thirstSeconds:0}};
 assert.equal(validPackAnimal(u.packAnimal),true);assert.equal(packCapacityMultiplier(u),3.5);
 const maximum=carryingCapacity(u,'wood',true),cargo=JSON.stringify({carry:u.carry,carryType:u.carryType,itemCargo:u.itemCargo});
 for(const condition of [{hunger:100,thirstSeconds:0,hp:4},{hunger:0,thirstSeconds:780,hp:4},{hunger:0,thirstSeconds:0,hp:1}]){
  Object.assign(u.packAnimal,condition);assert.ok(packCapacityMultiplier(u)<3.5);assert.ok(packCapacityMultiplier(u)>=1.25);
  assert.ok(carryingCapacity(u,'wood')<maximum);assert.equal(carryingCapacity(u,'wood',true),maximum);assert.equal(JSON.stringify({carry:u.carry,carryType:u.carryType,itemCargo:u.itemCargo}),cargo);
 }
 assert.equal(validPackAnimal({...u.packAnimal,species:'deer'}),false);assert.equal(validPackAnimal({...u.packAnimal,thirstSeconds:NaN}),false);
});


test('horse births need three unreserved pen places and inherit the maternal adult scale',()=>{
 // Controlled husbandry-only fixture: no generated world or journey claim. Its
 // finite water parcel is already delivered and recorded in the pen ledger.
 for(const scenario of ['full','incoming','room']){
  let nextId=20;
  const pen={id:1,type:'pen',team:0,x:0,y:5,z:0,w:scenario==='full'?10:12,d:10,hp:260,pasture:{condition:1,feed:0,care:1},penWater:{ownerTeam:0,initialLiters:0,liters:12,deliveredLiters:12,consumedLiters:0,lostLiters:0}};
  const mother={id:2,species:'horse',team:0,pen:1,sex:'female',x:0,y:5,z:0,facing:0,vx:0,vz:0,wanderT:10,hp:4,maxHp:4,fly:0,scale:1.22,adultScale:1.22,born:-400,tamedAt:0,hunger:0,milk:0,pregnancy:600,thirstSeconds:0};
  const father={...mother,id:3,sex:'male',pregnancy:0,scale:1.15,adultScale:1.15};
  const tribe={id:0,survival:{waterHerdWithdrawnLiters:12,waterHerdConsumedLiters:0}};
  const g={state:{time:200,weather:'clear',survivalVersion:1,buildings:[pen],units:scenario==='incoming'?[{id:4,hp:10,tamingWork:{animal:5,pen:1,progress:20}}]:[],wildlife:scenario==='incoming'?[{id:5,species:'horse'}]:[],livestock:[mother,father]},world:{waterY:0,biomes:[{kind:'plains',x:0,z:0}],rivers:[]},height:()=>5,waterAt:()=>0,terrainRevision:()=>0,finished:()=>true,walkable:()=>true,tribe:()=>tribe,id:()=>nextId++,banner:()=>{}};
  tickHusbandry(g,.2);
  if(scenario!=='room'){assert.equal(g.state.livestock.length,2,'full places and incoming horse reservations both block a foal');assert.equal(penPlacesOccupied(g,1),6);}
  else{
   assert.equal(g.state.livestock.length,3);assert.equal(penPlacesOccupied(g,1),9);
   const foal=g.state.livestock.find(a=>a.id===20);assert.ok(foal);assert.equal(foal.species,'horse');assert.equal(foal.adultScale,mother.adultScale);assert.equal(foal.scale,mother.adultScale*.6);assert.equal(foal.born,g.state.time);
  }
 }
});
