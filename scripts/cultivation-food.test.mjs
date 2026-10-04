import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {foodInventory,receiveFood,consumeAndSpoilFood,foodSpoilage} from '../src/game/pantry.ts';
import {climateAt} from '../src/game/ecology.ts';
import {initializeCultivation,collectSamples,deliverSamples,beginCropTrial,cropStudyAI,setFieldCrop} from '../src/game/cultivation.ts';
import {crop,farmWork} from '../src/game/settlement.ts';
import {routineRest} from '../src/game/journeys.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {prehistoricName} from '../src/game/people.ts';
function fixture(){const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);g.state.buildings=[g.makeBld('townhall',0,38,0)];g.state.units=g.state.units.filter(u=>u.team===0);g.state.weather='clear';g.clockState=()=>({period:'Day'});g.rebuildWalk();return g;}
test('food lots conserve real meals and older aggregate saves remain edible',()=>{
  const g=fixture(),t=g.tribe(0);t.food=20;t.foodLots=undefined;
  receiveFood(g,0,8,'fish');receiveFood(g,0,10,'grain');
  assert.deepEqual({...foodInventory(t)},{provisions:20,berries:0,fish:8,meat:0,grain:10,pulses:0,tubers:0});
  consumeAndSpoilFood(g,0,2,1);assert.ok(t.food<36&&t.food>35);
  assert.equal(Object.values(t.foodLots).reduce((a,b)=>a+b,0),t.food);
  t.food-=5;assert.ok(Math.abs(Object.values(foodInventory(t)).reduce((a,b)=>a+b,0)-t.food)<1e-8);
  assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('fresh fish decays faster than grain and warmth/humidity raise outdoor loss',()=>{
  const g=fixture(),t=g.tribe(0);g.state.time=600;t.food=300;t.foodLots={fish:300};
  const fish=foodSpoilage(g);t.foodLots={grain:300};assert.ok(foodSpoilage(g)<fish);
  const summer=foodSpoilage(g);g.state.time=1500;assert.ok(foodSpoilage(g)<summer);
  g.state.time=600;g.state.weather='clear';const dry=foodSpoilage(g);g.state.weather='rain';assert.ok(foodSpoilage(g)>dry);
  assert.ok(climateAt(g,0,38).humidity>0);
  g.state.buildings.push(g.makeBld('warehouse',20,38,0),g.makeBld('warehouse',-20,38,0));assert.ok(foodSpoilage(g)<dry);
});
test('cultivation is not granted by seeing a plant or collecting samples away from home',()=>{
  const g=fixture(),u=g.state.units[0],n=g.state.forage[0];Object.assign(n,{cropCandidate:'grain'});
  assert.deepEqual(g.tribe(0).cultivated,[]);assert.equal(beginCropTrial(g,'grain'),false);
  collectSamples(u,n,16);assert.equal(g.tribe(0).cropSamples.grain,undefined);
  Object.assign(u,{carry:16,carryType:'food',carryFood:'grain'});deliverSamples(g,u);u.carry=0;u.carryType=null;
  const wood=g.tribe(0).wood,food=g.tribe(0).food;
  assert.ok(beginCropTrial(g,'grain'));assert.equal(g.tribe(0).cropSamples.grain,0);
  assert.equal(g.tribe(0).wood,wood-6);assert.equal(g.tribe(0).food,food-4);
  assert.deepEqual(g.tribe(0).cultivated,[]);assert.equal(beginCropTrial(g,'grain'),false);
});
test('a physical cultivation trial uses working time, survives loading and unlocks fields',()=>{
  let g=fixture();g.tribe(0).cropSamples={tubers:4};g.tribe(0).food=300;
  assert.ok(beginCropTrial(g,'tubers'));let u=g.state.units.find(u=>u.studyCrop);
  for(let i=0;i<500;i++){g.state.time+=.1;g.navBudget=10;cropStudyAI(g,u,.1);}
  assert.ok(g.tribe(0).cropTrial.progress>0);assert.ok(g.tribe(0).cropTrial.progress<g.tribe(0).cropTrial.duration);
  g=decodeGame(encodeGame(g));g.world.heights.fill(4);g.rebuildWalk();u=g.state.units.find(u=>u.studyCrop);
  for(let i=0;i<4000&&u.studyCrop;i++){g.state.time+=.1;g.navBudget=10;cropStudyAI(g,u,.1);}
  assert.deepEqual(g.tribe(0).cultivated,['tubers']);assert.equal(g.tribe(0).cropTrial,undefined);
  const field=g.makeBld('farm',20,38,0);g.state.buildings.push(field);
  assert.ok(setFieldCrop(g,field.id,'tubers'));assert.equal(setFieldCrop(g,field.id,'grain'),false);
  crop(g,field).planted=1;assert.equal(setFieldCrop(g,field.id,'tubers'),false);
  g.state.time=950;const c=crop(g,field);assert.ok(c.remaining>0);
  Object.assign(u,{order:'gather',carry:0,gatherT:1});farmWork(g,u,field,.1);assert.equal(u.carryFood,'tubers');
});
test('interrupted trials retain effort, never finish remotely and resume without charging twice',()=>{
  const g=fixture(),t=g.tribe(0);t.cropSamples={pulses:4};t.food=300;assert.ok(beginCropTrial(g,'pulses'));
  const u=g.state.units.find(u=>u.studyCrop),paid=t.wood;u.x=80;u.z=90;g.navBudget=10;cropStudyAI(g,u,1);assert.equal(t.cropTrial.progress,0);
  u.order='move';assert.equal(cropStudyAI(g,u,1),false);assert.equal(u.studyCrop,undefined);
  assert.ok(beginCropTrial(g,'pulses'));assert.equal(t.wood,paid);
});
test('legacy farms keep grain knowledge without replacing terrain, people or reserves',()=>{
  const g=fixture(),f=g.makeBld('farm',20,38,0);g.state.buildings.push(f);const save=encodeGame(g);
  delete save.state.cultivationVersion;for(const t of save.state.tribes){delete t.cultivated;delete t.cropSamples;}
  const r=decodeGame(save);assert.deepEqual(r.tribe(0).cultivated,['grain']);
  assert.equal(r.tribe(0).food,g.tribe(0).food);assert.equal(r.state.units.length,g.state.units.length);assert.equal(r.state.seed,g.state.seed);
});
test('crop/food optional save fields reject corrupt imports',()=>{
  const g=fixture();for(const corrupt of [s=>s.state.tribes[0].foodLots={fish:-1},s=>s.state.tribes[0].cultivated=['magic'],s=>s.state.units[0].carryFood='gold',s=>s.state.tribes[0].cropTrial={kind:'grain',duration:200,progress:201}]){
    const s=encodeGame(g);corrupt(s);assert.throws(()=>decodeGame(s));
  }
});
test('storm shelter requires reaching a clear door, respects rooms and restores outside work',()=>{
  const g=fixture(),u=g.state.units[0];g.state.units=[u];Object.assign(u,{x:30,z:60,y:4,order:'idle'});g.state.weather='storm';
  g.navBudget=10;assert.ok(routineRest(g,u,.1));assert.equal(u.shelterId,undefined);
  for(let i=0;i<1200&&!u.shelterId;i++){g.state.time+=.1;g.navBudget=10;routineRest(g,u,.1);}
  assert.equal(u.shelterId,g.state.buildings[0].id);assert.match(u.workReason,/inside/);
  const s=decodeGame(encodeGame(g));assert.equal(s.state.units[0].shelterId,u.shelterId);
  g.state.weather='clear';assert.equal(routineRest(g,u,.1),false);assert.equal(u.shelterId,undefined);
});
test('invented settlement names vary by seed and legacy English neighbors migrate in place',()=>{
  assert.ok(new Set(Array.from({length:30},(_,i)=>prehistoricName(i*7919,977))).size>20);
  const g=fixture(),s=encodeGame(g);s.state.tribes[1].name='Redcliff';const r=decodeGame(s);
  assert.notEqual(r.tribe(1).name,'Redcliff');assert.equal(r.state.seed,g.state.seed);assert.equal(r.tribe(1).food,g.tribe(1).food);
});
