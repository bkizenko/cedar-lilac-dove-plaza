import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {animalProcessingEnabled,productionEnabled,beginProduction,productionIssue,equipClothing,clothingWarmth} from '../src/game/production.ts';
import {localAirTemperature,survivalStatus,tickSurvival} from '../src/game/survivalNeeds.ts';
import {TEXTILE_RULES,garmentHeatBurden} from '../src/game/textiles.ts';
function fixture(version=14){const g=new Game();g.reset(345,version);g.enterIsland();g.world.heights.fill(4);g.world.rivers=[];g.world.features=[];g.world.waterBodies=[];g.world.waterHeights=undefined;g.world.ecology=undefined;g.state.units=[];g.state.buildings=[];g.state.wildlife=[];for(const k of ['trees','stones','forage','copper','iron','fish'])g.state[k]=[];g.state.campSites=[{team:0,x:0,z:60}];g.state.autoWorkEnabled=false;g.state.conflict='quiet';g.state.weather='clear';g.state.weatherT=10000;g.state.raidT=10000;g.state.visitorTimer=900;g.state.birthT=10000;g.calamityT=10000;for(const t of g.state.tribes)t.thinkT=10000;Object.assign(g.tribe(0),{food:100,foodLots:{provisions:100},wood:100,stone:50,items:{}});g.tribe(0).survival.waterLiters=100;const u=g.spawnUnit('worker',0,38,0);u.order='hold';g.clearSelect();g.selectEntity(u);g.rebuildWalk();g.vision.fill(2);return{g,u};}
function prey(g){const c={id:g.id(),species:'boar',x:3,z:38,y:4,hp:4,maxHp:4,facing:0,vx:0,vz:0,wanderT:10000,fly:0,scale:1};g.state.wildlife=[c];return c;}
function step(g,seconds){for(let i=0;i<seconds*10;i++){g.state.paused=false;g.step(.1);assert.deepEqual(g.simulationErrors,[]);}}
function drive(g,seconds,done){for(let i=0;i<seconds*10&&!done();i++)step(g,.1);assert.ok(done(),JSON.stringify({time:g.state.time,food:g.tribe(0).food,items:g.tribe(0).items,units:g.state.units.map(u=>({hp:u.hp,order:u.order,reason:u.workReason,carry:u.carry,raw:u.rawHuntMeat})),wildlife:g.state.wildlife}));}
test('fresh unbuilt camp actually hunts, guts, skins and physically stores raw finite meat/hide; no edible food is granted without cooking',()=>{const{g,u}=fixture(),hp=u.hp,c=prey(g);assert.ok(g.state.tribes.every(t=>t.animalProcessingVersion===1));assert.equal(productionEnabled(g,0),false);const read=JSON.stringify(g.state);assert.equal(animalProcessingEnabled(g,0),true);assert.equal(JSON.stringify(g.state),read,'rule getter is read only');g.issueGather(c);drive(g,120,()=>g.tribe(0).items.rawMeat>0);assert.equal(c.hp,0);assert.equal(c.carcass.prepared,true);assert.equal(c.carcass.skinningWork,3);assert.equal(g.tribe(0).items.rawHide,1);assert.equal(g.tribe(0).items.bone,3);assert.ok(u.hp<hp,'actual wounded prey hazard occurred');assert.equal(g.state.simulationEvents?.totals['food_received:0:food']||0,0);assert.equal(g.state.production.metrics.edibleFoodProduced,0);const total=()=>c.carcass.meat+(u.rawHuntMeat?u.carry:0)+(g.tribe(0).items.rawMeat||0)+(g.state.production.metrics.spoiled.rawMeat||0);assert.ok(Math.abs(total()-32)<1e-6);g.issueMove(u.x,u.z);const raw=g.tribe(0).items.rawMeat;step(g,5);assert.ok(g.tribe(0).items.rawMeat<raw,'raw meat spoils before any station exists');assert.ok(Math.abs(total()-32)<1e-6);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));});
test('legacy absent rule keeps its historical fresh kill mode and existing prepared cargo is never reclassified',()=>{const{g,u}=fixture();for(const t of g.state.tribes)delete t.animalProcessingVersion;const restored=decodeGame(encodeGame(g));assert.equal(restored.tribe(0).animalProcessingVersion,undefined);assert.equal(animalProcessingEnabled(restored,0),false);const c=prey(g);g.issueGather(c);drive(g,120,()=>!!g.state.simulationEvents?.totals['food_received:0:food']);assert.equal(c.carcass.hides,undefined);assert.equal(u.rawHuntMeat,undefined);assert.equal(g.tribe(0).items.rawMeat||0,0);
const f=fixture();f.g.tribe(0).food-=3;f.g.tribe(0).foodLots.provisions-=3;f.u.carry=3;f.u.carryType='food';f.u.carryFood='meat';f.u.order='return';drive(f.g,120,()=>f.u.carry===0);assert.equal(f.g.state.simulationEvents.totals['food_received:0:food'],3);assert.equal(f.g.tribe(0).items.rawMeat||0,0);});
test('legacy own paid station completion permanently adopts raw rules; another society and station destruction do not undo or invent adoption',()=>{const{g,u}=fixture();for(const t of g.state.tribes)delete t.animalProcessingVersion;assert.equal(g.placeBuilding('hearth',12,60),true,g.state.banner);const h=g.state.buildings.at(-1);assert.ok(h.build<1);assert.equal(animalProcessingEnabled(g,0),false);g.orderConstruction(h);drive(g,120,()=>g.finished(h));assert.equal(g.tribe(0).animalProcessingVersion,1);assert.equal(g.tribe(1).animalProcessingVersion,undefined);h.hp=0;assert.equal(productionEnabled(g,0),false);assert.equal(animalProcessingEnabled(g,0),true);const copy=decodeGame(encodeGame(g));assert.equal(copy.tribe(0).animalProcessingVersion,1);assert.equal(animalProcessingEnabled(copy,0),true);const raw=encodeGame(g);for(const value of[0,2,true,'1']){const bad=structuredClone(raw);bad.state.tribes[0].animalProcessingVersion=value;assert.throws(()=>decodeGame(bad));}});
test('loading a genuine already finished own legacy station records adoption, without manufacturing facilities or changing carried food',()=>{const{g,u}=fixture();for(const t of g.state.tribes)delete t.animalProcessingVersion;const h=g.makeBld('hearth',12,60,0);g.state.buildings.push(h);u.carry=2;u.carryType='food';u.carryFood='meat';const copy=decodeGame(encodeGame(g));assert.equal(copy.tribe(0).animalProcessingVersion,1);assert.equal(copy.tribe(1).animalProcessingVersion,undefined);assert.equal(copy.state.buildings.length,g.state.buildings.length);assert.equal(copy.state.units.find(p=>p.id===u.id).carry,2);assert.equal(copy.state.units.find(p=>p.id===u.id).rawHuntMeat,undefined);});

test('three hunted hides become two dried skins, one leather and one delivered lined hide coat',()=>{
 const {g,u}=fixture(10);
 g.state.nightWork=true;
 g.visibleAt=()=>true;
 const stations={
  hearth:g.makeBld('hearth',-12,65,0),
  butcher:g.makeBld('butcher',10,58,0),
  dryrack:g.makeBld('dryrack',12,72,0),
  tanner:g.makeBld('tanner',-12,75,0),
  tailor:g.makeBld('tailor',0,78,0),
 };
 g.state.buildings.push(...Object.values(stations));
 g.rebuildWalk();
 const first=prey(g);
 first.species='deer';
 const animals=[first,{...first,id:g.id(),x:1,z:40},{...first,id:g.id(),x:-2,z:42}];
 g.state.wildlife=animals;
 assert.match(productionIssue(g,'sewHideCoat',stations.tailor.id),/dried skins/);
 for(const [i,animal] of animals.entries()){
  g.issueGather(animal);
  assert.equal(u.node,animal,g.state.banner);
  drive(g,150,()=>g.tribe(0).items.rawHide===i+1);
  assert.equal(animal.hp,0);
  assert.equal(animal.carcass.hides,0);
 }
 g.issueMove(0,60);
 drive(g,60,()=>u.order!=='move');
 function batch(recipe,site){
  assert.equal(beginProduction(g,recipe,site.id,u.id),true,productionIssue(g,recipe,site.id,u.id));
  const project=g.state.production.projects.at(-1);
  if(recipe==='sewHideCoat')assert.equal(g.tribe(0).items.hideCoat||0,0);
  drive(g,160,()=>project.phase==='complete');
 }
 for(let i=0;i<3;i++)batch('fleshHide',stations.butcher);
 batch('drySkin',stations.dryrack);
 batch('drySkin',stations.dryrack);
 batch('extractTannin',stations.butcher);
 batch('tanHide',stations.tanner);
 const bones=g.tribe(0).items.bone;
 batch('sewHideCoat',stations.tailor);
 const stock=g.tribe(0).items;
 assert.equal(stock.rawHide,0);
 assert.equal(stock.cleanHide,0);
 assert.equal(stock.driedSkin,0);
 assert.equal(stock.leather,0);
 assert.equal(stock.bone,bones-1);
 assert.equal(stock.hideCoat,1);
 assert.equal(equipClothing(g,u.id,'hideCoat'),true,g.state.banner);
 assert.equal(stock.hideCoat,0);
 assert.equal(clothingWarmth(u),TEXTILE_RULES.hideCoatWarmthCelsius);
 const copy=decodeGame(encodeGame(g));
 assert.deepEqual(copy.state.units.find(person=>person.id===u.id).garment,u.garment);
 assert.equal(copy.tribe(0).productionPractice.sewHideCoat.batches,1);
});

test('local climate determines cold exposure and warm work burden',()=>{
 const {g,u}=fixture(10);
 const coated=g.spawnUnit('worker',-2,38,0),warm=g.spawnUnit('worker',10,38,0);
 coated.garment={item:'hideCoat',condition:1};
 // Controlled already blended grid. All three residents experience the same
 // displayed weather while occupying two different local climates.
 g.world.ecology={width:2,size:g.world.size,temperatureOffsetCelsius:Float32Array.of(-6,6,-6,6)};
 u.x=-4;
 const clock=g.clockState.bind(g);
 let weather='Clear · 5°C';
 g.clockState=()=>({...clock(),weather});
 g.tribe(0).wood=0;
 for(const resident of [u,coated,warm])resident.coldSeconds=0;
 tickSurvival(g,10);
 assert.equal(localAirTemperature(g,u.x,u.z),-1);
 assert.equal(localAirTemperature(g,warm.x,warm.z),11);
 assert.ok(u.coldSeconds>0);
 assert.equal(coated.coldSeconds,0);
 assert.equal(warm.coldSeconds,0);
 assert.equal(survivalStatus(g).fuelDemandWoodPerSecond,0);
 weather='Drought · 24°C';
 const warmTemp=localAirTemperature(g,warm.x,warm.z);
 assert.equal(garmentHeatBurden(coated,localAirTemperature(g,coated.x,coated.z)),0);
 assert.ok(garmentHeatBurden(coated,warmTemp)>garmentHeatBurden({...coated,garment:{item:'lightClothes',condition:1}},warmTemp));
});
