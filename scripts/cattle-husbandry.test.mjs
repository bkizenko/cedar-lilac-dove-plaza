import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
import {Game} from '../src/game/sim.ts';
import {BUILDINGS} from '../src/game/constants.ts';
import {herdRules} from '../src/game/animalSpecies.ts';
import {beginHerdTaming,assignHusbandry,husbandryAI,tickHusbandry,penPlacesOccupied} from '../src/game/husbandry.ts';
import {insidePen} from '../src/game/penGeometry.ts';
import {releaseHusbandryKeeper,herdWaterAccounting,validPenWaterState} from '../src/game/penWater.ts';
import {surveyPenPasture,penPastureReport} from '../src/game/penPasture.ts';
import {packAnimalFrom,packCapacityMultiplier,validPackAnimal} from '../src/game/packAnimalState.ts';
import {carryingCapacity,loadedHaulSpeed} from '../src/game/haulage.ts';
import {foodInventory} from '../src/game/pantry.ts';
import {PRODUCTION_RECIPES} from '../src/game/production.ts';
import {encodeGame,decodeGame,validateGameSave} from '../src/game/persistence.ts';
import {mulberry32} from '../src/game/rng.ts';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const terrainHash=g=>createHash('sha256').update(JSON.stringify({heights:Array.from(g.world.heights),rivers:g.world.rivers,features:g.world.features})).digest('hex');
const diagnostic=(g,u)=>JSON.stringify({time:g.state.time,reason:u.workReason,taming:u.tamingWork,husbandry:u.husbandryWork,position:[u.x,u.z]});
function step(g,u){const before=g.state.time;g.step(.2);assert.deepEqual(g.simulationErrors,[]);assert.ok(!g.state.ended);assert.ok(g.state.time>before,diagnostic(g,u));}
function legalPoint(g,type,origin,accept=()=>true){for(let r=12;r<=84;r+=6)for(let i=0;i<24;i++){const x=origin.x+Math.sin(i*Math.PI/12)*r,z=origin.z+Math.cos(i*Math.PI/12)*r;if(g.placementIssue(type,x,z,0)===null&&accept(x,z))return{x,z};}}
function exportSave(name,g){if(process.env[name]){assert.ok(isAbsolute(process.env[name]),`${name} must name an absolute path`);writeFileSync(process.env[name],JSON.stringify(encodeGame(g)));}}

test('native cattle retain identity through paid 150s capture, a reload above 120s, physical pen arrival and stable training',()=>{
 const random=Math.random;Math.random=mulberry32(42);
 try{
  let g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();g.vision.fill(2);
  const terrain=terrainHash(g);let u=g.state.units.find(u=>u.team===0&&u.type==='worker');assert.ok(u);const uid=u.id;
  const wild=g.state.wildlife.filter(a=>a.species==='cattle'&&a.hp>0&&Math.hypot(a.x-u.x,a.z-u.z)<200);assert.ok(wild.length,'native generated cattle must exist near the real starting residents');
  // Bounded declared opening: legal completed enclosure/stable and finite food,
  // logs and water. No body relocation, terrain edit or midjourney grant.
  const point=legalPoint(g,'pen',u,(x,z)=>wild.some(a=>g.workBoard.connected(g,u.x,u.z,a.x,a.z)&&g.workBoard.connected(g,a.x,a.z,x,z))&&surveyPenPasture(g,{id:-1,x,z,w:BUILDINGS.pen.w,d:BUILDINGS.pen.d}).eligibleCapacity>=4);assert.ok(point);
  let pen=g.makeBld('pen',point.x,point.z,0);g.state.buildings.push(pen);g.rebuildWalk();const pid=pen.id;
  const stablePoint=legalPoint(g,'stables',pen,(x,z)=>g.workBoard.connected(g,pen.x,pen.z,x,z));assert.ok(stablePoint);let stable=g.makeBld('stables',stablePoint.x,stablePoint.z,0);g.state.buildings.push(stable);g.rebuildWalk();const sid=stable.id;
  for(const p of g.state.units.filter(p=>p.team===0)){p.selected=false;p.jobLock=true;p.order='hold';}u.selected=true;u.jobLock=false;
  Object.assign(g.tribe(0),{food:1000,foodLots:{provisions:1000},wood:50});g.tribe(0).survival.waterLiters=500;
  g.state.autoWorkEnabled=false;g.state.nightWork=true;g.state.weather='clear';g.state.weatherT=10000;g.state.conflict='quiet';g.raidT=g.seaT=g.calamityT=10000;g.state.raidT=g.state.birthT=10000;g.state.visitorTimer=900;for(const t of g.state.tribes)t.thinkT=10000;
  assert.equal(beginHerdTaming(g,pid,uid,'cattle'),true,g.state.banner);assert.equal(g.tribe(0).food,982,'exactly eighteen existing food units pay for capture');
  const id=u.tamingWork.animal,source=g.state.wildlife.find(a=>a.id===id),metadata={id,scale:source.scale,maxHp:source.maxHp},started=g.state.time;assert.ok(wild.some(a=>a.id===id));let checkpoint=false,capturedAt,away=false,walked=0,previous;
  for(let i=0;i<3000;i++){
   step(g,u);
   if(!checkpoint&&(u.tamingWork?.progress??0)>125){
    u.tamingWork.paused=true;const progress=u.tamingWork.progress,raw=encodeGame(g);assert.ok(progress>120&&progress<150);validateGameSave(raw);
    const invalid=structuredClone(raw);invalid.state.units.find(a=>a.id===uid).tamingWork.progress=150.01;assert.throws(()=>validateGameSave(invalid),'known cattle progress is bounded by150 seconds');
    g=decodeGame(raw);g.state.paused=false;u=g.state.units.find(a=>a.id===uid);pen=g.state.buildings.find(b=>b.id===pid);stable=g.state.buildings.find(b=>b.id===sid);assert.equal(u.tamingWork.progress,progress);const food=g.tribe(0).food;assert.equal(beginHerdTaming(g,pid,uid,'cattle'),true);assert.equal(g.tribe(0).food,food,'resume preserves the original paid feed');checkpoint=true;
   }
   const a=g.state.livestock?.find(a=>a.id===id);if(a){capturedAt??=g.state.time;away||=!insidePen(pen,a.x,a.z,.25);if(previous)walked+=Math.hypot(a.x-previous.x,a.z-previous.z);previous={x:a.x,z:a.z};if(insidePen(pen,a.x,a.z,.25)&&!u.tamingWork)break;}
  }
  let a=g.state.livestock?.find(a=>a.id===id);assert.ok(checkpoint);assert.ok(a,diagnostic(g,u));assert.ok(capturedAt-started>=149.99);assert.ok(away&&walked>2,'the actual captured animal walks home from its wild location');assert.ok(insidePen(pen,a.x,a.z,.25));assert.equal(u.tamingWork,undefined);assert.equal(a.adultScale,metadata.scale);assert.equal(a.scale,metadata.scale);assert.equal(a.maxHp,metadata.maxHp);assert.equal(penPlacesOccupied(g,pid),4);assert.equal(g.state.wildlife.some(a=>a.id===id),false);assert.equal(terrainHash(g),terrain);
  exportSave('CATTLE_DOMESTIC_SAVE',g);
  releaseHusbandryKeeper(g,u);
  // A keeper may already carry a real water load at arrival. Let its return
  // finish rather than deleting inventory to make the handler available.
  for(let i=0;i<1200&&u.husbandryWork;i++)step(g,u);assert.equal(u.husbandryWork,undefined,diagnostic(g,u));
  assert.equal(assignHusbandry(g,pid,'pack','cattle'),true,diagnostic(g,u));assert.equal(u.husbandryWork.animal,id);assert.equal(u.husbandryWork.stable,sid);
  const trainingSave=encodeGame(g);validateGameSave(trainingSave);
  // Independent conversion-contract snapshot: retained milk and pregnancy are
  // existing biology, never a claim of new road production or another birth.
  const biology={milk:8.25,pregnancy:777.5,lactatingUntil:g.state.time+400,adultScale:metadata.scale};
  const converted=packAnimalFrom({...a,sex:'female',...biology});assert.equal(validPackAnimal(converted),true);
  for(const[key,value]of Object.entries(biology))assert.equal(converted[key],value);
  const biologicalSave=structuredClone(trainingSave),biologicalOwner=biologicalSave.state.units.find(p=>p.id===uid);
  delete biologicalOwner.husbandryWork;biologicalOwner.packAnimal=converted;biologicalOwner.haulage='pack';biologicalSave.state.livestock=biologicalSave.state.livestock.filter(p=>p.id!==id);
  validateGameSave(biologicalSave);assert.deepEqual(JSON.parse(JSON.stringify(biologicalSave)).state.units.find(p=>p.id===uid).packAnimal,converted);
  const forged=structuredClone(biologicalSave);forged.state.units.find(p=>p.id===uid).packAnimal.milk=12.01;assert.throws(()=>validateGameSave(forged));
  const wood=g.tribe(0).wood,baseCapacity=carryingCapacity(u,'wood'),startTraining=g.state.time;let labor=0,stableWork=false,led=0,last={x:a.x,z:a.z};
  for(let i=0;i<2000&&!u.packAnimal;i++){
   const before=u.husbandryWork?.progress??0;step(g,u);a=g.state.livestock?.find(a=>a.id===id);if(a){led+=Math.hypot(a.x-last.x,a.z-last.z);last={x:a.x,z:a.z};}
   const progress=u.husbandryWork?.progress;if(progress!==undefined&&progress>before){labor+=progress-before;stableWork=true;assert.ok(g.buildingWorkReached(u,stable),'training labor requires the reached stable entrance');}
  }
  assert.ok(u.packAnimal,diagnostic(g,u));assert.ok(stableWork&&led>2);assert.ok(g.state.time-startTraining>=89.99);assert.ok(labor>=89.7);assert.equal(g.tribe(0).wood,wood-8,'one existing eight-log harness payment');assert.equal(u.haulage,'pack');assert.equal(u.packAnimal.id,id);assert.equal(u.packAnimal.species,'cattle');assert.equal(u.packAnimal.scale,metadata.scale);assert.equal(u.packAnimal.maxHp,metadata.maxHp);assert.equal(validPackAnimal(u.packAnimal),true);assert.equal(carryingCapacity(u,'wood',true),baseCapacity*3);assert.ok(packCapacityMultiplier(u)<=3&&packCapacityMultiplier(u)>1);assert.equal(g.state.wildlife.some(a=>a.id===id),false);assert.equal(g.state.livestock.some(a=>a.id===id),false);assert.equal(terrainHash(g),terrain);
  const raw=encodeGame(g),restored=decodeGame(raw),owner=restored.state.units.find(a=>a.id===uid);assert.deepEqual(owner.packAnimal,u.packAnimal);assert.equal(terrainHash(restored),terrain);exportSave('CATTLE_NATIVE_SAVE',g);
  const legacy=structuredClone(raw);delete legacy.state.cattleVersion;legacy.state.wildlife=legacy.state.wildlife.filter(a=>a.species!=='cattle');delete legacy.state.units.find(a=>a.id===uid).packAnimal;delete legacy.state.units.find(a=>a.id===uid).haulage;legacy.state.livestock=legacy.state.livestock.filter(a=>a.species!=='cattle');
  const old=decodeGame(legacy);assert.equal(old.state.wildlife.some(a=>a.species==='cattle'),false);assert.equal(old.state.livestock.some(a=>a.species==='cattle'),false);assert.equal(old.state.units.some(a=>a.packAnimal?.species==='cattle'),false,'loading an old save never gifts a new herd');
 }finally{Math.random=random;}
});

function cow(id=2,overrides={}){return{id,species:'cattle',team:0,pen:1,sex:'female',x:0,y:5,z:0,facing:0,vx:0,vz:0,wanderT:100,hp:6,maxHp:6,fly:0,scale:1.3,adultScale:1.3,born:-700,tamedAt:0,hunger:0,milk:0,pregnancy:0,thirstSeconds:0,lactatingUntil:1100,...overrides};}
function careFixture(herd=[cow()],width=15){
 let next=20;const pen={id:1,type:'pen',team:0,x:0,y:5,z:0,w:width,d:10,hp:260,pasture:{condition:1,feed:0,care:1},penWater:{ownerTeam:0,initialLiters:0,liters:24,deliveredLiters:24,consumedLiters:0,lostLiters:0}},tribe={id:0,alive:true,food:0,foodLots:{},survival:{waterLiters:0,waterHerdWithdrawnLiters:24,waterHerdConsumedLiters:0}};
 const g={state:{time:200,nextId:20,weather:'clear',survivalVersion:1,buildings:[pen],units:[],wildlife:[],livestock:herd,tribes:[tribe]},world:{waterY:0,biomes:[{kind:'plains',x:0,z:0}],rivers:[]},height:()=>5,waterAt:()=>0,terrainRevision:()=>0,finished:()=>true,walkable:()=>true,tribe:()=>tribe,id:()=>next++,banner(){}};
 return{g,pen,tribe};
}

test('cattle calves reserve four places, need their own species and retain maternal body scale',()=>{
 for(const scenario of['full','incoming','room','other-species']){
  const mother=cow(2,{pregnancy:scenario==='other-species'?0:900}),father=cow(3,{sex:'male',pregnancy:0,...(scenario==='other-species'?{species:'horse',born:-700}:{})}),{g,pen}=careFixture([mother,father],scenario==='full'?10:15);
  if(scenario==='incoming'){g.state.wildlife=[{id:5,species:'cattle'}];g.state.units=[{id:4,hp:10,tamingWork:{animal:5,pen:1,progress:20}}];}
  tickHusbandry(g,1);
  if(scenario!=='room'){assert.equal(g.state.livestock.length,2);if(scenario==='other-species')assert.equal(mother.pregnancy,0,'a stallion cannot start a cow pregnancy');}
  else{assert.equal(g.state.livestock.length,3);const calf=g.state.livestock.find(a=>a.id===20);assert.equal(calf.species,'cattle');assert.equal(calf.adultScale,1.3);close(calf.scale,1.3*.6);assert.equal(calf.born,g.state.time);assert.equal(calf.milk,0);assert.equal(calf.lactatingUntil,0);assert.equal(penPlacesOccupied(g,pen.id),12);}
 }
});

test('milk belongs to fed, watered, tended lactating adult cows; cattle consume four real care shares',()=>{
 for(const scenario of['ready','male','dry','young','hungry','thirsty','untended','winter-unfed','outside']){
  const a=cow(),{g,pen}=careFixture([a]);if(scenario==='male')a.sex='male';if(scenario==='dry')a.lactatingUntil=0;if(scenario==='young')a.born=0;if(scenario==='hungry')a.hunger=50;if(scenario==='thirsty'){pen.penWater.liters=0;pen.penWater.consumedLiters=24;g.tribe(0).survival.waterHerdConsumedLiters=24;}if(scenario==='untended')pen.pasture.care=0;if(scenario==='winter-unfed'){g.state.time=1350;a.lactatingUntil=2000;}if(scenario==='outside')a.x=100;
  const report=penPastureReport(g,pen);assert.equal(report.careDemand,4);close(report.demandPerSecond,4*.012);tickHusbandry(g,10);
  if(scenario==='ready'){close(a.milk,.6);close(pen.pasture.grazedFood,.48);close(pen.penWater.consumedLiters,.24);close(herdWaterAccounting(g).balanceErrorLiters,0);assert.equal(validPenWaterState(g.state),true);}else assert.equal(a.milk,0,scenario);
 }
 const cap=careFixture();tickHusbandry(cap.g,300);assert.equal(cap.g.state.livestock[0].milk,12);assert.equal(herdRules('goat').milkCapacity,6);close(herdRules('goat').milkPerSecond,.025);assert.equal(herdRules('horse').milkPerSecond,0);assert.equal(herdRules('sheep').milkPerSecond,0);
});

test('the keeper carries only actual cow milk to stores, without credit during the journey or duplicate delivery',()=>{
 // Small authored spatial adapter fixture: finite delivered water, one tended
 // lactating cow, one keeper and a store 20m away. This tests the real keeper
 // logic and incremental movement, not native navigation qualification.
 const{g,pen,tribe}=careFixture();const store={id:7,type:'warehouse',team:0,hp:100,build:1,x:20,z:0,w:6,d:6};g.state.buildings.push(store);
 const u={id:8,team:0,type:'worker',hp:48,x:0,y:5,z:5.5,tx:0,tz:5.5,r:.5,speed:2,carry:0,carryType:null,order:'hold',husbandryWork:{pen:1,action:'care',phase:'pen',progress:0}};g.state.units.push(u);
 g.interactionSpot=(_u,b)=>b.id===1?{x:0,z:5.5}:{x:20,z:0};g.buildingWorkReached=(p,b)=>{const spot=g.interactionSpot(p,b);return Math.hypot(p.x-spot.x,p.z-spot.z)<=.8;};g.nearestDrop=()=>store;g.workBoard={reset(){}};g.invalidateRoute=()=>{};
 let moved=0;g.steer=(p,dt)=>{const d=Math.hypot(p.tx-p.x,p.tz-p.z),step=Math.min(d,2*dt);if(d>0){p.x+=(p.tx-p.x)*step/d;p.z+=(p.tz-p.z)*step/d;moved+=step;}};
 let generated=0,carried=false,delivery=0;
 for(let i=0;i<120;i++){
  g.state.time+=1;const before=g.state.livestock[0].milk;tickHusbandry(g,1);generated+=g.state.livestock[0].milk-before;
  husbandryAI(g,u,1);const milk=foodInventory(tribe).milk;close(generated,g.state.livestock[0].milk+(u.carryFood==='milk'?u.carry:0)+milk);
  if(u.carryFood==='milk'&&u.carry>0){carried=true;if(!g.buildingWorkReached(u,store))assert.equal(milk,0,'an in-transit load is never remotely credited');}
  if(milk>0){delivery=milk;break;}
 }
 assert.ok(carried&&moved>10);assert.ok(delivery>=1);assert.equal(u.carry,0);assert.equal(u.carryFood,undefined);assert.ok(g.buildingWorkReached(u,store));const delivered=foodInventory(tribe).milk;husbandryAI(g,u,1);assert.equal(foodInventory(tribe).milk,delivered,'the same parcel cannot deliver twice');close(herdWaterAccounting(g).balanceErrorLiters,0);
 // The existing paid dairy chain consumes the ordinary milk lot produced by a
 // cow; it has no species-specific parallel inventory or free output pathway.
 assert.equal(PRODUCTION_RECIPES.fermentMilk.foodInputs.milk,4);assert.equal(PRODUCTION_RECIPES.fermentMilk.foodKind,'fermentedMilk');
});


test('cattle walking pace is slower than horses with real cargo, while the hull owns aboard travel',()=>{
 const cattle={type:'worker',hp:48,speed:2.7,haulage:'pack',carry:6,carryType:'wood',packAnimal:{id:4,species:'cattle',hp:6,maxHp:6,scale:1.3,hunger:0,thirstSeconds:0}};
 const horse={...cattle,packAnimal:{...cattle.packAnimal,species:'horse'}};
 const cargo=JSON.stringify({carry:cattle.carry,kind:cattle.carryType,animal:cattle.packAnimal});
 close(loadedHaulSpeed({...cattle,carry:0})/loadedHaulSpeed({...horse,carry:0}),2.4/2.7);
 const goat={...horse,packAnimal:{...horse.packAnimal,species:'goat'}};close(loadedHaulSpeed({...horse,carry:carryingCapacity(horse,'wood')/2}),loadedHaulSpeed({...goat,carry:carryingCapacity(goat,'wood')/2}));
 assert.ok(loadedHaulSpeed(cattle)<loadedHaulSpeed(horse));assert.equal(carryingCapacity(cattle,'wood')/carryingCapacity({...cattle,haulage:undefined},'wood'),3);
 const aboard={id:9,phase:'aboard'};close(loadedHaulSpeed({...cattle,boat:aboard}),loadedHaulSpeed({...horse,boat:aboard}));
 assert.equal(JSON.stringify({carry:cattle.carry,kind:cattle.carryType,animal:cattle.packAnimal}),cargo,'pace queries neither erase cargo nor change the animal');
});


test('pack conversion retains exact cattle biology and rejects species-invalid retained quantities',()=>{
 const original=cow(2,{milk:8.25,pregnancy:777.5,lactatingUntil:1000,adultScale:1.32}),packed=packAnimalFrom(original);
 for(const key of['id','species','sex','born','tamedAt','hp','maxHp','scale','milk','pregnancy','lactatingUntil','adultScale'])assert.equal(packed[key],original[key]);assert.equal(validPackAnimal(packed),true);
 for(const edit of[a=>a.milk=12.01,a=>a.pregnancy=900.01,a=>a.lactatingUntil=-1,a=>a.adultScale=3.01,a=>a.species='horse']){const bad=structuredClone(packed);edit(bad);assert.equal(validPackAnimal(bad),false);}
 const absent=packAnimalFrom({id:3,species:'cattle',hp:6,maxHp:6,scale:1.3});for(const key of['milk','pregnancy','lactatingUntil','adultScale'])assert.equal(Object.hasOwn(absent,key),false,'legacy absent biology remains absent');
});

test('a keeper cannot withdraw retained milk from a cow led outside the pen for stable training',()=>{
 const a=cow(2,{x:30,milk:4}),{g,pen,tribe}=careFixture([a]),keeper={id:8,team:0,type:'worker',hp:48,x:0,y:5,z:5.5,carry:0,carryType:null,order:'hold',husbandryWork:{pen:1,action:'care',phase:'pen',progress:29}};
 g.state.units.push(keeper,{id:9,team:0,type:'worker',hp:48,husbandryWork:{pen:1,action:'pack',phase:'pen',progress:0,animal:a.id}});
 g.interactionSpot=()=>({x:0,z:5.5});g.buildingWorkReached=()=>true;g.workBoard={reset(){}};g.steer=()=>{throw Error('the keeper already stands at the real pen entrance');};
 husbandryAI(g,keeper,1);assert.equal(a.milk,4);assert.equal(keeper.carry,0);assert.equal(keeper.husbandryWork.phase,'pen');assert.equal(foodInventory(tribe).milk,0);assert.equal(keeper.tamingWork,undefined,'the assigned trainer retains the same animal');assert.equal(insidePen(pen,a.x,a.z),false);
});
