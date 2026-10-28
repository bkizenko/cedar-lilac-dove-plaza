import {GATHER_WORK_RATE} from '../src/game/constants.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/sim.ts';
import { encodeGame, decodeGame } from '../src/game/persistence.ts';
import { crop, farmWork } from '../src/game/settlement.ts';
import {
  FARM_TOOLS, beginFarmToolWork, pauseFarmToolWork, resumeFarmToolWork,
  farmToolWorkAI, farmToolRate, farmToolRequirement, validFarmToolUnit,
} from '../src/game/farmTools.ts';

function fixture() {
  const g = new Game(); g.reset(123456); g.enterIsland();
  g.world.heights.fill(4); g.state.weather = 'clear'; g.state.paused = false;
  g.clockState = () => ({period: 'Afternoon'});
  const hall = g.makeBld('townhall', 0, 38, 0), shop = g.makeBld('workshop', 30, 38, 0);
  const forge = g.makeBld('forge', -30, 38, 0);
  g.state.buildings = [hall, shop, forge]; g.state.units = [];
  const u = g.spawnUnit('worker', 0, 62, 0);
  Object.assign(g.tribe(0), {wood: 100, stone: 50, copper: 20, iron: 20});
  g.vision.fill(2); g.rebuildWalk();
  return {g, u, hall, shop, forge};
}
function work(g, u, seconds) {
  for (let i = 0; i < seconds * 10; i++) {
    g.state.time += .1; g.navBudget = 10;
    farmToolWorkAI(g, u, .1);
  }
}

test('stone hoes reserve actual logs and stone, occupy an adult, and equip only after physical crafting', () => {
  const {g, u, shop} = fixture();
  const other = g.spawnUnit('worker', 5, 62, 0), hp = u.hp;
  u.selected = true;
  assert.equal(beginFarmToolWork(g, 'stoneHoe', 0, shop.id), true);
  assert.equal(g.tribe(0).wood, 97); assert.equal(g.tribe(0).stone, 48);
  assert.equal(u.farmTool, undefined); assert.equal(other.farmToolWork, undefined);
  work(g, u, .1);
  assert.equal(u.farmToolWork.progress, 0, 'walking to the bench does not count as crafting');
  work(g, u, 65);
  assert.equal(u.farmTool, 'stoneHoe'); assert.equal(u.farmToolWork, undefined);
  assert.equal(u.hp, hp); assert.equal(g.popNow(0), 2);
  assert.equal(farmToolRate(u, 0), 1.25); assert.equal(farmToolRate(other, 0), 1);
  assert.equal(beginFarmToolWork(g, 'stoneHoe', 0, shop.id, u.id), false, 'tools cannot stack');
});

test('metal tools require existing age, material and reachable forge; completed upgrades replace one tool set', () => {
  const {g, u, shop, forge} = fixture();
  const original = {...g.tribe(0)};
  assert.equal(beginFarmToolWork(g, 'copperTools', 0, forge.id), false);
  assert.match(farmToolRequirement(g, 'copperTools'), /Bronze Age/);
  g.tribe(0).age = 1; u.farmTool = 'stoneHoe';
  assert.equal(beginFarmToolWork(g, 'copperTools', 0, shop.id), false, 'workshop cannot smelt metal');
  g.tribe(0).copper = 0;
  assert.equal(beginFarmToolWork(g, 'copperTools', 0, forge.id), false);
  assert.equal(g.tribe(0).wood, original.wood); assert.equal(g.tribe(0).stone, original.stone);
  g.tribe(0).copper = 20;
  assert.equal(beginFarmToolWork(g, 'copperTools', 0, forge.id), true);
  assert.equal(u.farmTool, 'stoneHoe');
  work(g, u, 100);
  assert.equal(u.farmTool, 'copperTools'); assert.equal(g.tribe(0).copper, 16);
  assert.equal(beginFarmToolWork(g, 'stoneHoe', 0, shop.id), false);
  assert.equal(beginFarmToolWork(g, 'ironTools', 0, forge.id), false);
  g.tribe(0).age = 2;
  assert.equal(beginFarmToolWork(g, 'ironTools', 0, forge.id), true);
  work(g, u, 100);
  assert.equal(u.farmTool, 'ironTools'); assert.equal(g.tribe(0).iron, 16);
  assert.equal(g.tribe(0).wood, 94);
});

test('interrupted toolmaking survives a save and resumes without repeating resource costs', () => {
  let {g, u, hall, shop} = fixture();
  assert.equal(beginFarmToolWork(g, 'stoneHoe', 0, hall.id), true);
  work(g, u, 20);
  assert.ok(u.farmToolWork.progress > 0 && u.farmToolWork.progress < u.farmToolWork.duration);
  pauseFarmToolWork(u); u.order = 'move';
  const progress = u.farmToolWork.progress, fraction = progress / u.farmToolWork.duration;
  work(g, u, 40); assert.equal(u.farmToolWork.progress, progress);
  g = decodeGame(encodeGame(g));
  g.world.heights.fill(4); g.rebuildWalk(); g.clockState = () => ({period: 'Afternoon'});
  u = g.state.units[0]; u.order = 'hold';
  assert.ok(validFarmToolUnit(u)); assert.equal(u.farmToolWork.progress, progress);
  assert.equal(resumeFarmToolWork(g, u, shop.id), true);
  assert.equal(u.farmToolWork.progress / u.farmToolWork.duration, fraction);
  work(g, u, 60);
  assert.equal(u.farmTool, 'stoneHoe'); assert.equal(g.tribe(0).wood, 97); assert.equal(g.tribe(0).stone, 48);
  const restored = decodeGame(encodeGame(g));
  assert.equal(restored.state.units[0].farmTool, 'stoneHoe');
});

test('lost workshops release the worker; rain permits work, while nights and storms pause production', () => {
  const {g, u, shop, hall} = fixture();
  assert.equal(beginFarmToolWork(g, 'stoneHoe', 0, shop.id), true);
  work(g, u, 10);
  const progress = u.farmToolWork.progress;
  g.state.weather = 'storm'; work(g, u, 20);
  assert.equal(u.farmToolWork.progress, progress);
  g.state.weather = 'rain'; g.clockState = () => ({period: 'Night'}); work(g, u, 20);
  assert.equal(u.farmToolWork.progress, progress);
  g.clockState = () => ({period: 'Afternoon'}); shop.hp = 0; g.rebuildWalk();
  farmToolWorkAI(g, u, .1);
  assert.equal(u.farmToolWork.paused, true); assert.equal(u.order, 'idle');
  assert.equal(resumeFarmToolWork(g, u, hall.id), true);
  work(g, u, 100);
  assert.equal(u.farmTool, 'stoneHoe'); assert.equal(g.tribe(0).wood, 97);
});

test('tool labor rates help sowing and tending but preserve seasonal and finite crop constraints', () => {
  const {g, u} = fixture();
  const field = g.makeBld('farm', 55, 60, 0);
  g.state.buildings.push(field);
  // Keep the real farm worker unequipped so this adapter tests the rate contract
  // before or after the main farmWork integration, without applying it twice.
  const equipped = {...u, farmTool: 'stoneHoe'};
  g.state.time = 20; u.order = 'gather'; u.node = field;
  farmWork(g, u, field, 15 * farmToolRate(equipped, 0));
  assert.ok(Math.abs(field.crop.planted - 15 * GATHER_WORK_RATE * 1.25 / 180) < 1e-8);
  assert.equal(u.carry, 0, 'sowing creates no immediate food');
  field.crop.planted = 1; g.state.time = 500;
  farmWork(g, u, field, 15 * farmToolRate(equipped, 1));
  assert.ok(Math.abs(field.crop.tended - 15 * GATHER_WORK_RATE * 1.25 / 220) < 1e-8);
  field.crop.tended = 1; g.state.time = 950;
  crop(g, field);
  const harvest = field.crop.remaining, stock = g.tribe(0).food;
  for (let i = 0; i < 40; i++) farmWork(g, u, field, .1 * farmToolRate(equipped, 2));
  assert.ok(u.carry > 0);
  assert.equal(field.crop.remaining + u.carry, harvest);
  assert.equal(g.tribe(0).food, stock, 'harvest still needs physical delivery');
  g.state.time = 1400; const carried = u.carry;
  farmWork(g, u, field, 100 * farmToolRate(equipped, 3));
  assert.equal(u.carry, carried, 'tools cannot farm through winter');
  assert.equal(farmToolRate({...equipped, militia: true}, 0), 1);
});

test('transport projects, guards, captives, children and full hands cannot be recruited into toolmaking', () => {
  const {g, u, shop} = fixture();
  for (const condition of [{haulageWork: {}}, {weaponWork: {}}, {carry: 1}, {drill: 0}, {guardPost: 1}, {captive: {}}, {maturesAt: 100000}, {militia: true}]) {
    const old = {};
    for (const key of Object.keys(condition)) old[key] = u[key];
    Object.assign(u, condition);
    assert.equal(beginFarmToolWork(g, 'stoneHoe', 0, shop.id), false);
    Object.assign(u, old);
  }
  const spot = g.interactionSpot; g.interactionSpot = () => null;
  assert.equal(beginFarmToolWork(g, 'stoneHoe', 0, shop.id), false);
  g.interactionSpot = spot;
  assert.equal(g.tribe(0).wood, 100); assert.equal(g.tribe(0).stone, 50);
});

test('invalid tools and corrupted paid projects are rejected, while old saves remain compatible', () => {
  assert.ok(validFarmToolUnit({})); assert.ok(validFarmToolUnit({farmTool: 'ironTools'}));
  assert.equal(validFarmToolUnit({farmTool: 'steelTools'}), false);
  const work = {kind: 'stoneHoe', progress: 0, duration: FARM_TOOLS.stoneHoe.seconds, workplace: 1};
  assert.ok(validFarmToolUnit({farmToolWork: work}));
  for (const change of [{kind: 'boneHoe'}, {progress: -1}, {progress: 100}, {duration: 1}, {duration: Infinity}, {workplace: -1}, {paused: 'yes'}])
    assert.equal(validFarmToolUnit({farmToolWork: {...work, ...change}}), false);
  assert.equal(validFarmToolUnit({farmTool: 'ironTools', farmToolWork: work}), false);
  assert.equal(validFarmToolUnit({farmTool: 'stoneHoe', farmToolWork: work}), false);
  assert.equal(validFarmToolUnit({farmToolWork: {...work, kind: 'copperTools', duration: 90}}), false);
});

test('blocked toolmakers release their job and preserve paid work until movement recovers',()=>{
 const {g,u,shop}=fixture();assert.equal(beginFarmToolWork(g,'stoneHoe',0,shop.id),true);
 const wood=g.tribe(0).wood;u.farmToolWork.progress=5;u.stuckT=12;
 farmToolWorkAI(g,u,.1);assert.equal(u.order,'idle');assert.equal(u.farmToolWork.paused,true);
 assert.equal(resumeFarmToolWork(g,u),false);assert.equal(u.farmToolWork.progress,5);
 u.stuckT=0;assert.equal(resumeFarmToolWork(g,u,shop.id),true);assert.equal(g.tribe(0).wood,wood);
 work(g,u,120);assert.equal(u.farmTool,'stoneHoe');
});
