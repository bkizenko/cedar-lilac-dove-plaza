import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {Game} from '../src/game/sim.ts';
import {workRuntime} from '../src/game/workRuntime.ts';
import {reserveTreeWorker,releaseTreeWorker} from '../src/game/workAllocation.ts';
import {measureVillageWorkload} from '../src/game/villageWorkload.ts';
import {mulberry32} from '../src/game/rng.ts';
import {requestPackPasture,cancelPackPasture,packPastureAI,validPackPastureOrders} from '../src/game/packPasture.ts';
import {packAnimalFrom,validPackAnimal,validPackHarness,PACK_HARNESS_RULES} from '../src/game/packAnimalState.ts';
import {releasePackAnimal} from '../src/game/packAnimals.ts';
import {assignHusbandry,penPlacesOccupied,penPlacesReserved,tickHusbandry} from '../src/game/husbandry.ts';
import {insidePen} from '../src/game/penGeometry.ts';
import {surveyPenPasture} from '../src/game/penPasture.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';

const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const terrainHash=g=>createHash('sha256').update(Buffer.from(g.world.heights.buffer)).digest('hex');
const biology=a=>Object.fromEntries(['id','species','sex','born','tamedAt','maxHp','adultScale','milk','pregnancy','lactatingUntil','packHarness'].map(k=>[k,a[k]]));
const harness={version:1,preparedAt:0,wood:8,workSeconds:90};
const packed=(id=3)=>({id,species:'cattle',sex:'female',born:-900,tamedAt:0,hp:6,maxHp:6,scale:1.3,adultScale:1.3,hunger:5,thirstSeconds:0,milk:4.25,pregnancy:321.5,lactatingUntil:700,foodConsumed:2.5,waterConsumedLiters:3.75,packHarness:{...harness}});
function controlFixture(){
 let next=50;const pen={id:1,type:'pen',team:0,x:0,y:5,z:0,w:10,d:10,hp:260,build:1,pasture:{condition:1,feed:0,care:0}},u={id:2,type:'worker',team:0,hp:48,maxHp:48,x:20,y:5,z:20,facing:0,r:.5,speed:2.7,order:'hold',carry:0,haulage:'pack',packAnimal:packed()},tribe={id:0,alive:true,age:0,wood:20,food:100,foodLots:{provisions:100},items:{},survival:{waterLiters:100}};
 const g={state:{time:20,nextId:50,units:[u],buildings:[pen],livestock:[],wildlife:[],tribes:[tribe],weather:'clear',agePicks:[],survivalVersion:1},world:{size:1040,waterY:0,camps:[{team:0,x:20,z:20}],biomes:[{kind:'plains',x:0,z:0}],rivers:[]},height:()=>5,travelHeight:()=>5,waterAt:()=>0,terrainRevision:()=>0,finished:b=>b.hp>0&&b.build===1,walkable:()=>true,solidBuilding:()=>false,canStep:()=>true,tribe:()=>tribe,id:()=>next++,workBoard:{connected:()=>true,reset(){}},interactionSpot:(_u,b)=>({x:b.x,z:b.z}),buildingWorkReached:(p,b)=>Math.hypot(p.x-b.x,p.z-b.z)<1,interruptMission(){},invalidateRoute(){},banner(){},onSfx(){}};
 g.steer=(p,dt)=>{const d=Math.hypot(p.tx-p.x,p.tz-p.z),step=Math.min(d,2*dt);if(d){p.x+=(p.tx-p.x)*step/d;p.z+=(p.tz-p.z)*step/d;}};
 return{g,u,pen,tribe};
}
function legalPoint(g,type,origin,accept=()=>true){for(let r=24;r<=84;r+=6)for(let i=0;i<24;i++){const x=origin.x+Math.sin(i*Math.PI/12)*r,z=origin.z+Math.cos(i*Math.PI/12)*r;if(g.placementIssue(type,x,z,0)===null&&accept(x,z))return{x,z};}}
function drive(g,seconds,until){const end=g.state.time+seconds;while(g.state.time<end&&!until()){g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.equal(g.state.ended,null);}assert.ok(until(),JSON.stringify({time:g.state.time,units:g.state.units.filter(u=>u.team===0).map(u=>({id:u.id,x:u.x,z:u.z,order:u.order,reason:u.workReason,pasture:u.packPastureOrder,work:u.husbandryWork,animal:u.packAnimal?.id,carry:u.carry,items:u.itemCargo}))}));}
function exportSave(name,g){if(process.env[name]){assert.ok(isAbsolute(process.env[name]));writeFileSync(process.env[name],JSON.stringify(encodeGame(g)));}}

test('queued pasture returns retain paid jobs, reserve four places and cancel without changing the animal or cargo',()=>{
 const{g,u,pen,tribe}=controlFixture();u.farmToolWork={kind:'stoneHoe',progress:3,duration:24,workplace:4,paused:true};g.state.buildings.push({id:4,type:'workshop',team:0,x:20,z:24,w:6,d:6,hp:100,build:1});u.carry=3;u.carryType='wood';u.itemCargo={rawHide:2};const before=JSON.stringify({job:u.farmToolWork,animal:u.packAnimal,carry:u.carry,itemCargo:u.itemCargo,stock:tribe});
 assert.equal(requestPackPasture(g,pen.id,u.id).accepted,true);assert.equal(u.packPastureOrder.phase,'queued');assert.equal(penPlacesReserved(g,pen.id),4);assert.equal(validPackPastureOrders(g.state),true);packPastureAI(g,u,1);assert.equal(u.packPastureOrder.phase,'queued');assert.equal(JSON.stringify({job:u.farmToolWork,animal:u.packAnimal,carry:u.carry,itemCargo:u.itemCargo,stock:tribe}),before);
 cancelPackPasture(g,u);assert.equal(u.packPastureOrder,undefined);assert.equal(penPlacesReserved(g,pen.id),0);assert.equal(JSON.stringify({job:u.farmToolWork,animal:u.packAnimal,carry:u.carry,itemCargo:u.itemCargo,stock:tribe}),before);
});

test('ordinary logging releases its real runtime claim before pasture return reserves the same handler',()=>{
 const{g,u,pen,tribe}=controlFixture(),tree={id:4,kind:'tree',x:20,y:5,z:20,amount:100,maxAmt:100};
 g.state.trees=[tree];u.order='gather';u.node=tree;u.carry=3;u.carryType='wood';
 const jobs=workRuntime(g);assert.equal(reserveTreeWorker(g,tree,u),true);
 const logging=jobs.activeJob(u.id);assert.equal(logging.kind,'gather:wood');
 const before=JSON.stringify({animal:u.packAnimal,carry:u.carry,itemCargo:u.itemCargo,stock:tribe});let releasedBeforeClaim=false;
 // Match the relevant real interruption hooks while retaining the cheap fixture.
 g.interruptMission=worker=>{cancelPackPasture(g,worker);releaseTreeWorker(g,worker);releasedBeforeClaim=jobs.activeJob(worker.id)===undefined;};
 assert.equal(requestPackPasture(g,pen.id,u.id).accepted,true);
 assert.equal(packPastureAI(g,u,.2),false,'ordinary cargo continues through the normal delivery branch');
 assert.ok(releasedBeforeClaim,'the actual tree reservation is released before claiming the handler for pasture');
 assert.equal(jobs.job(logging.id),undefined);assert.equal(jobs.activeJob(u.id).kind,'pack:pasture');
 assert.equal(u.packPastureOrder.phase,'unloading');assert.equal(u.order,'return');
 assert.equal(jobs.metrics.ownershipConflicts,0,'pasture must not steal the actor from the logging claim');
 assert.equal(JSON.stringify({animal:u.packAnimal,carry:u.carry,itemCargo:u.itemCargo,stock:tribe}),before,'activation preserves the animal and every carried or stored unit');
});

test('full, destroyed and captured enclosures retain the working animal and its real equipment',()=>{
 for(const blocked of['full-before','full','destroyed','captured']){
  const{g,u,pen,tribe}=controlFixture(),crowded=[{...packed(10),pen:pen.id,team:0,hp:6},{...packed(11),pen:pen.id,team:0,hp:6}];if(blocked==='full-before')g.state.livestock=crowded;
  assert.equal(requestPackPasture(g,pen.id,u.id).accepted,blocked!=='full-before');if(blocked==='full')g.state.livestock=crowded;if(blocked==='destroyed')pen.hp=0;if(blocked==='captured')pen.team=1;
  const animal=JSON.stringify(u.packAnimal),stock=JSON.stringify(tribe);packPastureAI(g,u,1);assert.equal(u.haulage,'pack');assert.equal(JSON.stringify(u.packAnimal),animal);assert.equal(JSON.stringify(tribe),stock);assert.equal(g.state.wildlife.length,0);assert.equal(g.state.livestock.some(a=>a.id===u.packAnimal.id),false);
 }
});

test('pending pasture cattle prevent breeding into their reserved places',()=>{
 const{g,u,pen}=controlFixture();pen.w=15;pen.pasture.care=1;pen.penWater={ownerTeam:0,initialLiters:0,liters:24,deliveredLiters:24,consumedLiters:0,lostLiters:0};g.tribe(0).survival.waterHerdWithdrawnLiters=24;
 g.state.time=200;g.state.livestock=[{...packed(10),x:0,y:5,z:0,facing:0,vx:0,vz:0,wanderT:100,fly:0,team:0,pen:pen.id,sex:'female',pregnancy:900},{...packed(11),x:1,y:5,z:0,facing:0,vx:0,vz:0,wanderT:100,fly:0,team:0,pen:pen.id,sex:'male',pregnancy:0}];
 assert.equal(requestPackPasture(g,pen.id,u.id).accepted,true);assert.equal(penPlacesOccupied(g,pen.id)+penPlacesReserved(g,pen.id),12);tickHusbandry(g,.2);assert.equal(g.state.livestock.length,2,'the calf cannot take the queued animal’s four actual places');
 cancelPackPasture(g,u);tickHusbandry(g,.2);assert.equal(g.state.livestock.length,3,'releasing the reservation frees exactly one calf space');
});

test('return-order validation rejects forged identity, phases and times; biological care and harness receipts stay bounded',()=>{
 const{g,u,pen}=controlFixture();assert.equal(requestPackPasture(g,pen.id,u.id).accepted,true);assert.equal(validPackPastureOrders(g.state),true);
 for(const edit of[o=>o.version=2,o=>o.pen=0,o=>o.animal=999,o=>o.requestedAt=-1,o=>o.requestedAt=g.state.time+1,o=>o.phase='complete']){const s=structuredClone(g.state);edit(s.units[0].packPastureOrder);assert.equal(validPackPastureOrders(s),false);}
 assert.equal(validPackAnimal(packed()),true);for(const edit of[a=>a.foodConsumed=-1,a=>a.waterConsumedLiters=NaN,a=>a.packHarness.wood=-1,a=>a.packHarness.workSeconds=Infinity,a=>a.packHarness.preparedAt=21]){const a=packed();edit(a);assert.equal(validPackAnimal(a,20),false);}
 assert.equal(validPackHarness({version:1},20),true);assert.equal(validPackHarness(harness,20),true);assert.equal(validPackHarness({version:1,preparedAt:21},20),false);
});

test('an observed legacy pack returns with its existing harness without inventing a payment receipt',()=>{
 // Declared adapter fixture already at the pen; native movement is tested below.
 const{g,u,pen,tribe}=controlFixture();u.x=0;u.z=0;u.facing=0;delete u.packAnimal.packHarness;const animal=structuredClone(u.packAnimal),wood=tribe.wood;
 assert.equal(requestPackPasture(g,pen.id,u.id).accepted,true);packPastureAI(g,u,.2);assert.equal(u.packAnimal,undefined);assert.equal(g.state.livestock.length,1);const resident=g.state.livestock[0];
 assert.equal(resident.id,animal.id);assert.deepEqual(resident.packHarness,{version:1});assert.equal(Object.hasOwn(resident.packHarness,'wood'),false);assert.equal(Object.hasOwn(resident.packHarness,'workSeconds'),false);assert.equal(resident.foodConsumed,animal.foodConsumed);assert.equal(resident.waterConsumedLiters,animal.waterConsumedLiters);assert.equal(tribe.wood,wood);close(resident.z,-2.1);
});

test('handler death releases one animal at its actual trailing body position with biology, care counters and harness intact',()=>{
 const{g,u,pen}=controlFixture();assert.equal(requestPackPasture(g,pen.id,u.id).accepted,true);u.x=10;u.z=20;u.facing=0;u.hp=0;const before=structuredClone(u.packAnimal);packPastureAI(g,u,0);releasePackAnimal(g,u);releasePackAnimal(g,u);
 assert.equal(u.packAnimal,undefined);assert.equal(u.haulage,undefined);assert.equal(g.state.wildlife.length,1);const a=g.state.wildlife[0];assert.deepEqual(biology(a),biology(before));assert.equal(a.foodConsumed,before.foodConsumed);assert.equal(a.waterConsumedLiters,before.waterConsumedLiters);close(a.x,10);close(a.z,17.9);assert.equal(a.y,5);assert.equal(u.packPastureOrder,undefined);
});

test('native original-terrain cargo return unloads at a real cache, reloads en route and reuses the same paid cattle harness at the pen',()=>{
 const random=Math.random;Math.random=mulberry32(42);
 try{
  let g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();g.vision.fill(2);g.state.paused=false;g.state.autoWorkEnabled=false;g.state.nightWork=true;g.state.conflict='quiet';g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=g.state.birthT=10000;g.state.visitorTimer=900;g.raidT=g.seaT=g.calamityT=10000;for(const t of g.state.tribes)t.thinkT=10000;
  for(const p of g.state.units.filter(p=>p.team===0)){p.selected=false;p.jobLock=true;p.order='hold';}
  let u=g.state.units.find(p=>p.team===0&&p.type==='worker'),v=g.state.units.find(p=>p.team===0&&p.type==='worker'&&p!==u);assert.ok(u&&v);u.selected=true;u.jobLock=false;u.draftPracticeSeconds=88;v.draftPracticeSeconds=7;const uid=u.id,vid=v.id;
  const source=g.state.wildlife.find(a=>a.species==='cattle'&&a.hp>0);assert.ok(source);const id=source.id;
  // Finite authored opening: an already trained real native individual, whose
  // capture/stable qualification lives in cattle-husbandry.test.mjs. Neither
  // resident positions nor the native terrain are changed to stage this return.
  u.packAnimal=packAnimalFrom({...source,...packed(id),hp:source.hp,maxHp:source.maxHp,scale:source.scale,adultScale:source.scale});u.haulage='pack';g.state.wildlife=g.state.wildlife.filter(a=>a.id!==id);
  Object.assign(g.tribe(0),{wood:297,stone:100,food:2000,foodLots:{provisions:2000},items:{}});g.tribe(0).survival.waterLiters=400;u.carry=3;u.carryType='wood';u.itemCargo={rawHide:2};
  const terrain=terrainHash(g),home=g.campOf(0),point=legalPoint(g,'pen',home,(x,z)=>g.workBoard.connected(g,u.x,u.z,x,z)&&surveyPenPasture(g,{id:-1,x,z,w:10,d:10}).eligibleCapacity>=4);assert.ok(point);
  let pen=g.makeBld('pen',point.x,point.z,0);g.state.buildings.push(pen);g.rebuildWalk();const pid=pen.id;assert.equal(g.state.buildings.some(b=>b.type==='stables'),false,'an existing paid harness needs no newly built stable');
  const destination={x:pen.x,z:pen.z+pen.d/2+3};g.clearSelect();g.selectEntity(u);g.issueMove(destination.x,destination.z);drive(g,120,()=>u.order==='hold');assert.ok(Math.hypot(u.x-home.x,u.z-home.z)>10,'handler physically walks away from the real cache with the declared parcel');assert.equal(u.carry,3);assert.equal(u.itemCargo.rawHide,2);
  const before=structuredClone(u.packAnimal),stock=g.tribe(0).wood,start={x:u.x,z:u.z};assert.equal(requestPackPasture(g,pid,uid).accepted,true);assert.equal(penPlacesReserved(g,pid),4);
  g.issueMove(destination.x,destination.z);assert.equal(u.packPastureOrder,undefined,'a real direct order cancels the queued return');assert.equal(penPlacesReserved(g,pid),0);assert.deepEqual(u.packAnimal,before);assert.equal(u.carry,3);assert.equal(u.itemCargo.rawHide,2);
  assert.equal(requestPackPasture(g,pid,uid).accepted,true);assert.equal(penPlacesReserved(g,pid),4);assert.equal(g.state.livestock?.some(a=>a.id===id)??false,false);
  let saved=false,unloaded=false,cacheWalk=0,penWalk=0,previous={x:u.x,z:u.z};
  for(let i=0;i<1800&&u.packAnimal;i++){
   g.step(.2);assert.deepEqual(g.simulationErrors,[]);const distance=Math.hypot(u.x-previous.x,u.z-previous.z);if(!unloaded)cacheWalk+=distance;else penWalk+=distance;previous={x:u.x,z:u.z};
   if(u.packAnimal){assert.deepEqual(biology(u.packAnimal),biology(before));assert.ok(u.packAnimal.foodConsumed>=before.foodConsumed);assert.ok(u.packAnimal.waterConsumedLiters>=before.waterConsumedLiters);assert.equal(g.state.livestock?.some(a=>a.id===id)??false,false);}
   if(!unloaded&&u.carry===0&&!Object.values(u.itemCargo||{}).some(n=>n>0)){unloaded=true;assert.equal(g.tribe(0).wood,stock+3);assert.equal(g.tribe(0).items.rawHide,2);assert.ok(Math.hypot(u.x-start.x,u.z-start.z)>10,'real cargo must travel back to the cache before unloading');}
   if(!saved&&unloaded&&u.packAnimal&&u.packPastureOrder?.phase==='returning'&&Math.hypot(u.x-pen.x,u.z-pen.z)>8){
    const workload=measureVillageWorkload(g);assert.equal(workload.tasks.filter(t=>t.id===`pack-pasture:${uid}`).length,1);assert.equal(workload.people.find(p=>p.id===uid).freeNow,false);assert.equal(workload.tasks.some(t=>t.id===`delivery:${uid}`),false,'return travel belongs to the animal job once');const raw=encodeGame(g);validateGameSave(raw);g=decodeGame(raw);g.state.paused=false;u=g.state.units.find(p=>p.id===uid);v=g.state.units.find(p=>p.id===vid);pen=g.state.buildings.find(b=>b.id===pid);assert.equal(u.packPastureOrder.animal,id);assert.deepEqual(biology(u.packAnimal),biology(before));assert.equal(terrainHash(g),terrain);saved=true;previous={x:u.x,z:u.z};
   }
  }
  assert.ok(unloaded&&saved&&cacheWalk>10&&penWalk>10);assert.equal(u.packAnimal,undefined);assert.equal(u.haulage,undefined);assert.equal(u.packPastureOrder,undefined);const resident=g.state.livestock.find(a=>a.id===id);assert.ok(resident);assert.ok(insidePen(pen,resident.x,resident.z,.25));assert.ok(insidePen(pen,u.x,u.z,.25));assert.deepEqual(biology(resident),biology(before));assert.ok(resident.foodConsumed>=before.foodConsumed);assert.ok(resident.waterConsumedLiters>=before.waterConsumedLiters);assert.equal(g.state.wildlife.some(a=>a.id===id),false);assert.equal(penPlacesOccupied(g,pid),4);assert.equal(u.draftPracticeSeconds,88);assert.equal(v.draftPracticeSeconds,7);assert.equal(terrainHash(g),terrain);
  const pastureRaw=encodeGame(g);validateGameSave(pastureRaw);assert.deepEqual(decodeGame(pastureRaw).state.livestock.find(a=>a.id===id).packHarness,harness);exportSave('PACK_PASTURE_SAVE',g);
  // Select the other original adult. Harness receipts travel with the animal;
  // traction practice remains with its actual person through the handoff.
  g.clearSelect();g.selectEntity(v);v.jobLock=false;const wood=g.tribe(0).wood;assert.equal(assignHusbandry(g,pid,'pack','cattle'),true,g.state.banner);assert.equal(v.husbandryWork.animal,id);assert.equal(v.husbandryWork.stable,undefined);const refitStarted=g.state.time;let refitLabor=0;
  for(let i=0;i<1200&&!v.packAnimal;i++){const beforeWork=v.husbandryWork?.progress??0;g.step(.2);assert.deepEqual(g.simulationErrors,[]);const progress=v.husbandryWork?.progress;if(progress!==undefined&&progress>beforeWork){refitLabor+=progress-beforeWork;assert.ok(g.buildingWorkReached(v,pen));}}
  assert.ok(v.packAnimal);assert.ok(g.state.time-refitStarted>=PACK_HARNESS_RULES.refitSeconds-.01);assert.ok(refitLabor>=PACK_HARNESS_RULES.refitSeconds-.3);assert.equal(v.packAnimal.id,id);assert.deepEqual(v.packAnimal.packHarness,harness);assert.equal(g.tribe(0).wood,wood,'fitting existing paid gear cannot charge another eight logs');assert.equal(u.draftPracticeSeconds,88);assert.equal(v.draftPracticeSeconds,7);assert.equal(g.state.livestock.some(a=>a.id===id),false);assert.equal(g.state.wildlife.some(a=>a.id===id),false);assert.equal(terrainHash(g),terrain);validateGameSave(encodeGame(g));exportSave('PACK_REFIT_SAVE',g);
 }finally{Math.random=random;}
});
