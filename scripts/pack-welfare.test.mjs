import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {Game} from '../src/game/sim.ts';
import {packAnimalFrom,packCapacityMultiplier,PACK_ANIMAL_RULES} from '../src/game/packAnimalState.ts';
import {beginPackTaming,packTamingAI,releasePackAnimal,tickPackAnimals} from '../src/game/packAnimals.ts';
import {carryingCapacity} from '../src/game/haulage.ts';
import {GATHER} from '../src/game/constants.ts';
import {supplyApproach,supplyReached} from '../src/game/campAnchor.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} differs from ${b}`);
const terrain=g=>createHash('sha256').update(Buffer.from(g.world.heights.buffer)).digest('hex');
const water=()=>({waterLiters:20,waterConsumedLiters:0,waterDeliveredLiters:20,waterLostLiters:0,fuelBurnedWood:0,waterShortageSeconds:0,coldExposurePersonSeconds:0});
function fixture(){
 // Controlled finite opening; this fixture is not native-map pathfinding evidence.
 const g=new Game();g.reset(123456);g.enterIsland();g.world.heights.fill(4);g.state.units=[];g.state.buildings=[];g.state.wildlife=[];g.state.time=100;g.state.weather='clear';g.vision.fill(2);
 const hall=g.makeBld('townhall',0,0,0);g.state.buildings=[hall];const u=g.spawnUnit('worker',0,-10,0);u.order='hold';g.rebuildWalk();
 for(const t of g.state.tribes)t.survival=water();Object.assign(g.tribe(0),{food:30,foodLots:{grain:30},wood:20});g.state.survivalVersion=1;return {g,u,hall};
}
function goat(g,u,extra={}){return {id:g.id(),species:'goat',x:u.x+1,y:4,z:u.z,facing:0,vx:0,vz:0,wanderT:20,hp:24,maxHp:24,fly:0,scale:1,sex:'female',born:0,tamedAt:10,hunger:12,thirstSeconds:5,...extra};}
function givePack(g,u,extra={}){const a=goat(g,u,extra);u.haulage='pack';u.packAnimal=packAnimalFrom(a);return a;}
function reach(g,u,drop){const spot=supplyApproach(g,u,drop);assert.ok(spot,'a physically accessible supply entrance is required');for(let i=0;i<1200&&!supplyReached(g,u,drop,spot);i++){g.navBudget=40;u.tx=spot.x;u.tz=spot.z;g.steer(u,.1);}assert.ok(supplyReached(g,u,drop,spot),'handler must actually reach supply entrance');}

test('native camp supplies a physically present pack animal from finite plant food and water',()=>{
 const g=new Game();g.reset(42,18,{size:1040,layout:'pangaea'});g.enterIsland();const beforeTerrain=terrain(g);const u=g.state.units.find(u=>u.team===0&&u.type==='worker');assert.ok(u);
 // Declared finite opening pack animal, not an earned capture claim. Native terrain,
 // normal approach selection and the original resident body remain unchanged.
 givePack(g,u,{hunger:60,thirstSeconds:40});const t=g.tribe(0);Object.assign(t,{food:30,foodLots:{grain:30},survival:water()});g.state.survivalVersion=1;
 const drop=g.nearestDrop(u.x,u.z,0);assert.ok(drop);reach(g,u,drop);
 const f=t.food,w=t.survival.waterLiters,a=u.packAnimal;tickPackAnimals(g,10);
 assert.ok(t.food<f,'pack animal must consume actual plant stock');assert.ok(t.survival.waterLiters<w,'pack animal must consume actual water');near(f-t.food,a.foodConsumed);near(w-t.survival.waterLiters,a.waterConsumedLiters);
 assert.ok(a.hunger<60);assert.equal(terrain(g),beforeTerrain);const saved=decodeGame(encodeGame(g));assert.equal(terrain(saved),beforeTerrain);assert.deepEqual(saved.state.units.find(p=>p.id===u.id).packAnimal,a);
});

test('remote pack animals cannot eat communal fish or withdraw remote supplies; burden falls without deleting cargo',()=>{
 const {g,u}=fixture();givePack(g,u,{hunger:95,thirstSeconds:400});u.x=80;u.z=80;u.y=4;u.carry=GATHER.wood.carry*2;u.carryType='wood';u.itemCargo={rawHide:2};
 const t=g.tribe(0),food=t.food,w=t.survival.waterLiters,cargo=JSON.stringify({carry:u.carry,carryType:u.carryType,itemCargo:u.itemCargo});tickPackAnimals(g,10);
 assert.equal(t.food,food);assert.equal(t.survival.waterLiters,w);assert.equal(u.packAnimal.foodConsumed,0);assert.equal(u.packAnimal.waterConsumedLiters,0);assert.ok(packCapacityMultiplier(u)<2);assert.ok(packCapacityMultiplier(u)>=PACK_ANIMAL_RULES.minimumCapacityMultiplier);assert.ok(carryingCapacity(u,'wood')<GATHER.wood.carry*2);assert.equal(JSON.stringify({carry:u.carry,carryType:u.carryType,itemCargo:u.itemCargo}),cargo);
 // Even beside the real cache, fish is not livestock feed.
 reach(g,u,g.state.buildings[0]);t.food=30;t.foodLots={fish:30};const fish=t.food;tickPackAnimals(g,10);assert.equal(t.food,fish);assert.equal(u.packAnimal.foodConsumed,0);
});

test('paid taming preserves the original goat metadata through strict reload and releases that animal once on handler death',()=>{
 let {g,u,hall}=fixture();const a=goat(g,u);g.state.wildlife.push(a);u.selected=true;
 assert.equal(beginPackTaming(g,hall.id,0,u.id),true);const paid={food:g.tribe(0).food,wood:g.tribe(0).wood};
 for(let i=0;i<700&&u.tamingWork;i++){g.navBudget=40;g.state.time+=.1;packTamingAI(g,u,.1);}
 assert.equal(u.haulage,'pack');assert.equal(g.state.wildlife.some(c=>c.id===a.id),false);for(const key of ['id','hp','maxHp','scale','sex','born','tamedAt','hunger','thirstSeconds'])assert.equal(u.packAnimal[key],a[key],key);
 assert.deepEqual({food:g.tribe(0).food,wood:g.tribe(0).wood},paid);const id=u.id,animalId=a.id;g=decodeGame(encodeGame(g));u=g.state.units.find(p=>p.id===id);assert.ok(u);assert.equal(u.packAnimal.id,animalId);
 u.hp=0;const pack={...u.packAnimal};releasePackAnimal(g,u);releasePackAnimal(g,u);const released=g.state.wildlife.filter(c=>c.id===animalId);assert.equal(released.length,1);assert.equal(released[0].hp,pack.hp);assert.equal(released[0].scale,pack.scale);assert.equal(released[0].x,u.x);assert.equal(released[0].z,u.z);assert.equal(u.packAnimal,undefined);assert.equal(u.haulage,undefined);assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});

test('missing or dead pack records grant no carrying bonus and cannot fabricate a replacement animal',()=>{
 const {g,u}=fixture();u.haulage='pack';const count=g.state.wildlife.length,next=g.state.nextId;assert.equal(packCapacityMultiplier(u),1);assert.equal(carryingCapacity(u,'wood'),GATHER.wood.carry);u.hp=0;releasePackAnimal(g,u);assert.equal(g.state.wildlife.length,count);assert.equal(g.state.nextId,next);
 u.hp=10;givePack(g,u);u.packAnimal.hp=0;assert.equal(packCapacityMultiplier(u),1);assert.equal(carryingCapacity(u,'wood'),GATHER.wood.carry);
});

test('a legitimately loaded sheaf batch still saves when the pack becomes hungry',()=>{const {g,u}=fixture();givePack(g,u,{hunger:0});u.itemCargo={grainSheaves:60};u.packAnimal.hunger=100;assert.ok(carryingCapacity(u,'food')<60);assert.ok(carryingCapacity(u,'food',true)>=60);const copy=decodeGame(encodeGame(g));assert.equal(copy.state.units.find(p=>p.id===u.id).itemCargo.grainSheaves,60);});
