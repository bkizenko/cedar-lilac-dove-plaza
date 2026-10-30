import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/sim.ts';
import { GATHER } from '../src/game/constants.ts';
import { encodeGame, decodeGame } from '../src/game/persistence.ts';
import {
  shareLocalTransport,HAULAGE, WHEEL_PRACTICE, beginHaulageWork, haulageWorkAI, pauseHaulageWork,
  resumeHaulageWork, carryingCapacity, loadedHaulSpeed, recordHaulDelivery,
  validHaulageUnit, validHaulageTribe, haulageRequirement,
} from '../src/game/haulage.ts';

function fixture() {
  const g = new Game(); g.reset(123456); g.enterIsland();
  g.world.heights.fill(4); g.state.weather = 'clear'; g.state.paused = false;
  g.clockState = () => ({period: 'Afternoon'});
  g.state.buildings = [g.makeBld('townhall', 0, 38, 0), g.makeBld('workshop', 35, 38, 0)];
  g.state.units = [];
  const u = g.spawnUnit('worker', 0, 62, 0);
  Object.assign(g.tribe(0), {wood: 100, stone: 50});
  g.vision.fill(2); g.rebuildWalk();
  return {g, u, hall: g.state.buildings[0], shop: g.state.buildings[1]};
}
function work(g, u, seconds) {
  for (let i = 0; i < seconds * 10; i++) {
    g.state.time += .1; g.navBudget = 10;
    haulageWorkAI(g, u, .1);
  }
}

test('a sled costs finite materials, occupies one adult, and requires walking and actual work', () => {
  const {g, u, shop} = fixture();
  const bystander = g.spawnUnit('worker', 5, 62, 0);
  const pop = g.popNow(0), hp = u.hp;
  u.selected = true;
  assert.equal(beginHaulageWork(g, 'sled', 0, shop.id), true);
  assert.equal(u.haulageWork.workplace, shop.id);
  assert.equal(g.tribe(0).wood, 100 - HAULAGE.sled.wood);
  assert.equal(g.tribe(0).stone, 50 - HAULAGE.sled.stone);
  assert.equal(u.haulage, undefined);
  assert.equal(bystander.haulageWork, undefined);
  work(g, u, .1);
  assert.equal(u.haulageWork.progress, 0, 'walking is not crafting');
  work(g, u, 100);
  assert.equal(u.haulage, 'sled');
  assert.equal(u.haulageWork, undefined);
  assert.equal(carryingCapacity(u, 'wood'), GATHER.wood.carry * 2);
  assert.equal(carryingCapacity(bystander, 'wood'), GATHER.wood.carry);
  assert.equal(g.popNow(0), pop); assert.equal(u.hp, hp);
  assert.equal(beginHaulageWork(g, 'sled', 0, shop.id, u.id), false, 'no stacking duplicate equipment');
});

test('movement or recall can pause paid work; saved progress resumes without charging again', () => {
  let {g, u, hall} = fixture();
  assert.equal(beginHaulageWork(g, 'sled', 0, hall.id), true);
  work(g, u, 25);
  assert.ok(u.haulageWork.progress > 0 && u.haulageWork.progress < u.haulageWork.duration);
  pauseHaulageWork(u); u.order = 'move';
  const progress = u.haulageWork.progress, wood = g.tribe(0).wood;
  work(g, u, 20);
  assert.equal(u.haulageWork.progress, progress);
  assert.ok(validHaulageUnit(u));
  g = decodeGame(encodeGame(g));
  g.world.heights.fill(4); g.rebuildWalk(); g.clockState = () => ({period: 'Afternoon'});
  u = g.state.units[0]; u.order = 'hold';
  assert.equal(u.haulageWork.paused, true);
  assert.equal(u.haulageWork.progress, progress);
  assert.equal(resumeHaulageWork(g, u, hall.id), true);
  work(g, u, 100);
  assert.equal(u.haulage, 'sled');
  assert.equal(g.tribe(0).wood, wood);
});

test('a destroyed workplace releases labor and retains the paid project for a reachable replacement', () => {
  const {g, u, hall, shop} = fixture();
  assert.equal(beginHaulageWork(g, 'sled', 0, hall.id), true);
  work(g, u, 25);
  const fraction = u.haulageWork.progress / u.haulageWork.duration, wood = g.tribe(0).wood;
  hall.hp = 0; g.rebuildWalk();
  assert.equal(haulageWorkAI(g, u, .1), true);
  assert.equal(u.order, 'idle'); assert.equal(u.haulageWork.paused, true);
  assert.equal(resumeHaulageWork(g, u, shop.id), true);
  assert.equal(u.haulageWork.progress / u.haulageWork.duration, fraction);
  work(g, u, 80);
  assert.equal(u.haulage, 'sled'); assert.equal(g.tribe(0).wood, wood);
});

test('wheels require practiced sled deliveries and sheltered crafting, not age or instant purchases', () => {
  const {g, u, shop} = fixture();
  g.tribe(0).age = 5;
  assert.equal(beginHaulageWork(g, 'cart', 0, shop.id), false);
  u.haulage = 'sled'; u.carryType = 'wood'; u.carry = 14;
  recordHaulDelivery(g, u); u.carry = 0;
  assert.equal(g.tribe(0).haulagePractice, 14);
  assert.match(haulageRequirement(g, 'cart'), /14 delivered/);
  assert.equal(beginHaulageWork(g, 'cart', 0, shop.id), false);
  for(let i=0;i<4;i++){u.carry = 14; recordHaulDelivery(g, u); u.carry = 0;}
  assert.equal(g.tribe(0).haulagePractice, WHEEL_PRACTICE);
  g.tribe(0).age = 0;
  assert.equal(beginHaulageWork(g, 'cart', 0, shop.id), true);
  assert.equal(u.haulage, 'sled', 'the existing sled remains until the handcart is finished');
  assert.equal(g.tribe(0).wood, 100 - HAULAGE.cart.wood);
  work(g, u, 140);
  assert.equal(u.haulage, 'cart');
  assert.equal(carryingCapacity(u, 'stone'), GATHER.stone.carry * 3);
  const saved = decodeGame(encodeGame(g));
  assert.equal(saved.state.units[0].haulage, 'cart');
  assert.equal(saved.tribe(0).haulagePractice, WHEEL_PRACTICE);
  assert.equal(validHaulageTribe(saved.tribe(0)), true);
});

test('normal rain permits work; darkness and storms pause production without losing materials', () => {
  const {g, u, shop} = fixture();
  assert.equal(beginHaulageWork(g, 'sled', 0, shop.id), true);
  work(g, u, 10);
  g.state.weather = 'storm';
  const progress = u.haulageWork.progress;
  work(g, u, 5); assert.equal(u.haulageWork.progress, progress);
  g.state.weather = 'rain'; g.clockState = () => ({period: 'Night'});
  work(g, u, 5); assert.equal(u.haulageWork.progress, progress);
  g.clockState = () => ({period: 'Afternoon'});
  work(g, u, 100); assert.equal(u.haulage, 'sled');
  assert.equal(loadedHaulSpeed(u), 1);
  u.carry = 12; assert.equal(loadedHaulSpeed(u), HAULAGE.sled.loadedSpeed);
  u.militia = true;
  assert.equal(loadedHaulSpeed(u), 1);
  assert.equal(carryingCapacity(u, 'wood'), GATHER.wood.carry);
});

test('invalid equipment, corrupted projects, or impossible practice fail validation; old saves need no migration', () => {
  assert.ok(validHaulageUnit({})); assert.ok(validHaulageTribe({}));
  assert.equal(validHaulageUnit({haulage: 'boat'}), false);
  assert.equal(validHaulageUnit({haulage: 'cart', haulageWork: {kind: 'sled', progress: 0, duration: 45, workplace: 1}}), false);
  for (const change of [{progress: -1}, {progress: 100}, {duration: .01}, {duration: Infinity}, {workplace: -1}, {paused: 'yes'}])
    assert.equal(validHaulageUnit({haulageWork: {kind: 'sled', progress: 0, duration: 45, workplace: 1, ...change}}), false);
  assert.equal(validHaulageUnit({haulageWork: {kind: 'cart', progress: 0, duration: 90, workplace: 1}}), false);
  for (const haulagePractice of [-1, 61, Infinity, '60']) assert.equal(validHaulageTribe({haulagePractice}), false);
});

test('busy people, full hands, lack of materials, and unreachable workplaces cannot consume resources', () => {
  const {g, u, shop} = fixture();
  for (const condition of [{carry: 1}, {drill: 0}, {recalled: true}, {guardPost: 1}, {captive: {}}, {militia: true}]) {
    const old = {};
    for (const key of Object.keys(condition)) old[key] = u[key];
    Object.assign(u, condition);
    assert.equal(beginHaulageWork(g, 'sled', 0, shop.id), false);
    Object.assign(u, old);
  }
  assert.equal(g.tribe(0).wood, 100); assert.equal(g.tribe(0).stone, 50);
  const spot = g.interactionSpot; g.interactionSpot = () => null;
  assert.equal(beginHaulageWork(g, 'sled', 0, shop.id), false);
  assert.equal(g.tribe(0).wood, 100); g.interactionSpot = spot;
  g.tribe(0).stone = 0;
  assert.equal(beginHaulageWork(g, 'sled', 0, shop.id), false);
  assert.equal(g.tribe(0).wood, 100);
});


test('idle sleds pass physically to nearby working carriers without creating equipment or changing orders',()=>{
 const {g,u,hall}=fixture();u.x=0;u.z=hall.z+hall.d/2+1;u.haulage='sled';u.order='idle';u.selected=false;
 const receiver=g.spawnUnit('worker',u.x+1,u.z,0);receiver.selected=false;receiver.order='gather';receiver.job='wood';receiver.node={id:999,kind:'tree',x:50,y:4,z:80,amount:30,maxAmt:30,regenT:0,scale:1,rich:1};
 assert.ok(g.buildingWorkReached(u,hall));assert.equal(shareLocalTransport(g),1);
 assert.equal(u.haulage,undefined);assert.equal(receiver.haulage,'sled');assert.equal(receiver.order,'gather');assert.equal(receiver.job,'wood');
 assert.equal(shareLocalTransport(g),0);assert.equal(g.state.units.filter(v=>v.haulage).length,1);
 const saved=decodeGame(encodeGame(g));assert.equal(saved.state.units.find(v=>v.id===receiver.id).haulage,'sled');
});
test('equipment never jumps across camp, leaves a loaded carrier or overrides protected owners',()=>{
 for(const protection of ['distance','cargo','selected','jobLock','resting','canoe','pack','hold','night']){
  const {g,u,hall}=fixture();u.x=0;u.z=hall.z+hall.d/2+1;u.haulage='sled';u.order='idle';u.selected=false;
  const receiver=g.spawnUnit('worker',u.x+1,u.z,0);receiver.selected=false;receiver.order='gather';receiver.node={id:999,kind:'tree',x:50,y:4,z:80,amount:30,maxAmt:30,regenT:0,scale:1,rich:1};
  if(protection==='distance')receiver.x+=15;
  else if(protection==='cargo')u.carry=1;
  else if(['canoe','pack'].includes(protection))u.haulage=protection;
  else if(protection==='hold')u.order='hold';
  else if(protection==='night')g.clockState=()=>({period:'Night'});
  else u[protection]=true;
  assert.equal(shareLocalTransport(g),0,protection);assert.equal(receiver.haulage,undefined);assert.ok(u.haulage);
 }
});
