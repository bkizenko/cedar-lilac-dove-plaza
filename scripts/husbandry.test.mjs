import test from 'node:test';import assert from 'node:assert/strict';
import {Game} from '../src/game/sim.ts';
import {beginHerdTaming,assignHusbandry,husbandryAI,tickHusbandry,penAnimals,HERD} from '../src/game/husbandry.ts';
import {encodeGame,decodeGame} from '../src/game/persistence.ts';
import {foodInventory} from '../src/game/pantry.ts';
function fixture(){
 const g=new Game();g.reset(123456);g.enterIsland();g.state.units=[];g.state.buildings=[];g.state.wildlife=[];
 g.world.heights.fill(4);g.state.time=100;g.state.weather='clear';g.vision.fill(2);
 const hall=g.makeBld('townhall',0,0,0),pen=g.makeBld('pen',20,0,0);g.state.buildings=[hall,pen];
 for(let i=0;i<5;i++)g.spawnUnit('worker',8+i,-6,0);
 Object.assign(g.tribe(0),{food:200,wood:100,foodLots:undefined});g.rebuildWalk();return {g,pen,hall};
}
function wild(g,x=40,z=0){const a={id:g.id(),species:'goat',x,y:4,z,facing:0,vx:0,vz:0,wanderT:0,hp:24,maxHp:24,fly:0,scale:1};g.state.wildlife.push(a);return a;}
function animal(g,pen,sex='female') {const a={...wild(g,pen.x,pen.z),team:0,pen:pen.id,sex,born:g.state.time-HERD.maturity,tamedAt:g.state.time,hunger:5,milk:0,pregnancy:0};g.state.wildlife=[];(g.state.livestock??=[]).push(a);return a;}
function drive(g,seconds){for(let i=0;i<seconds*10;i++){g.state.time+=.1;g.navBudget=40;for(const u of g.state.units)husbandryAI(g,u,.1);tickHusbandry(g,.1);}}
test('a handler reserves real feed and a wild goat, tames it, leads it home and becomes its keeper',()=>{
 const {g,pen}=fixture(),a=wild(g);const original=g.tribe(0).food;
 assert.equal(beginHerdTaming(g,pen.id),true);assert.equal(g.tribe(0).food,original-6);assert.equal(g.state.livestock,undefined);
 const u=g.state.units.find(u=>u.tamingWork);assert.equal(u.tamingWork.animal,a.id);drive(g,150);
 assert.equal(g.state.wildlife.some(c=>c.id===a.id),false);assert.equal(penAnimals(g,pen.id).length,1);
 const goat=penAnimals(g,pen.id)[0];assert.equal(goat.id,a.id);assert.ok(Math.hypot(goat.x-pen.x,goat.z-pen.z)<7);assert.equal(u.tamingWork,undefined);assert.equal(u.husbandryWork.action,'care');
 assert.ok(pen.pasture.care>0);assert.equal(g.tribe(0).food,original-6,'a non-lactating captured goat creates no food');
});
test('a fed tended breeding pair raises a saved kid; milk is carried before it appears in stores',()=>{
 const {g,pen}=fixture();animal(g,pen,'female');animal(g,pen,'male');assert.equal(assignHusbandry(g,pen.id),true);
 drive(g,270);assert.equal(penAnimals(g,pen.id).length,3);const kid=penAnimals(g,pen.id).find(a=>g.state.time-a.born<HERD.maturity);assert.ok(kid);
 drive(g,100);assert.ok(foodInventory(g.tribe(0)).milk>0);assert.ok(g.state.units.some(u=>u.husbandryWork));
 const copy=decodeGame(encodeGame(g));assert.deepEqual(copy.state.livestock,g.state.livestock);assert.deepEqual(copy.state.buildings.find(b=>b.id===pen.id).pasture,pen.pasture);
 const raw=encodeGame(g);raw.state.livestock[0].milk=1e8;assert.throws(()=>decodeGame(raw));
});
test('winter husbandry fetches finite plant feed physically; fish cannot feed goats and no keeper creates no produce',()=>{
 const {g,pen}=fixture();animal(g,pen,'male');g.state.time=1350;g.tribe(0).food=100;g.tribe(0).foodLots={fish:100};
 assert.equal(assignHusbandry(g,pen.id),true);drive(g,60);assert.equal(pen.pasture.feed,0);assert.equal(g.tribe(0).food,100);
 g.tribe(0).foodLots={grain:100};drive(g,80);assert.ok(pen.pasture.feed>0);assert.ok(g.tribe(0).food<100);assert.ok(penAnimals(g,pen.id)[0].hunger<10);
 const keeper=g.state.units.find(u=>u.husbandryWork);g.interruptMission(keeper);keeper.order='idle';const food=g.tribe(0).food;drive(g,20);assert.equal(g.tribe(0).food,food);
});
test('a pen goat can become one actual pack animal, with a single harness cost and no duplicate herd member',()=>{
 const {g,pen}=fixture(),a=animal(g,pen,'male'),wood=g.tribe(0).wood;
 assert.equal(assignHusbandry(g,pen.id,'pack'),true);drive(g,60);
 const handler=g.state.units.find(u=>u.packAnimal?.id===a.id);assert.ok(handler);assert.equal(handler.haulage,'pack');assert.equal(penAnimals(g,pen.id).length,0);assert.equal(g.tribe(0).wood,wood-2);
 drive(g,60);assert.equal(g.tribe(0).wood,wood-2);assert.equal(g.state.units.filter(u=>u.packAnimal?.id===a.id).length,1);
 assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});
test('slaughtering consumes the animal and physically returns finite meat; destroyed pens release survivors once',()=>{
 const {g,pen}=fixture(),a=animal(g,pen,'male');assignHusbandry(g,pen.id,'slaughter');drive(g,60);
 assert.equal(penAnimals(g,pen.id).length,0);assert.ok(foodInventory(g.tribe(0)).meat>0);assert.ok(foodInventory(g.tribe(0)).meat<=16);
 const survivor=animal(g,pen,'female');pen.hp=0;tickHusbandry(g,1);tickHusbandry(g,1);
 assert.equal(g.state.wildlife.filter(c=>c.id===survivor.id).length,1);assert.equal(g.state.livestock.some(c=>c.id===survivor.id),false);assert.notEqual(survivor.id,a.id);
});
test('priority changes preserve active care and recall pauses paid taming without charging a second time',()=>{
 const {g,pen}=fixture();wild(g);beginHerdTaming(g,pen.id);const u=g.state.units.find(u=>u.tamingWork),food=g.tribe(0).food;
 u.tamingWork.progress=30;g.interruptMission(u);u.order='idle';assert.equal(beginHerdTaming(g,pen.id),true);assert.equal(u.tamingWork.progress,30);assert.equal(g.tribe(0).food,food);
 drive(g,120);g.setLaborPriority('wood');assert.ok(u.husbandryWork&&!u.husbandryWork.paused);assert.equal(u.order,'hold');
 const copy=decodeGame(encodeGame(g));assert.ok(copy.state.units.some(p=>p.husbandryWork));
});

test('the normal simulation dispatcher keeps assigned herd care and saves after real world ticks',()=>{
 const {g,pen}=fixture();animal(g,pen,'female');animal(g,pen,'male');assignHusbandry(g,pen.id);
 const worker=g.state.units.find(u=>u.husbandryWork);g.state.paused=false;g.state.nightWork=true;g.raidT=10000;g.seaT=10000;g.calamityT=10000;
 for(let i=0;i<600;i++)g.step(.1);
 assert.deepEqual(g.simulationErrors,[]);assert.ok(worker.husbandryWork&&!worker.husbandryWork.paused);assert.ok(pen.pasture.care>.1);
 assert.doesNotThrow(()=>decodeGame(encodeGame(g)));
});

test('births respect places reserved by handlers bringing another goat home',()=>{
 const {g,pen}=fixture();const mother=animal(g,pen,'female');for(let i=0;i<6;i++)animal(g,pen,'male');
 mother.pregnancy=239;pen.pasture={condition:1,feed:0,care:1};const incoming=wild(g,40,0);
 g.state.units[0].tamingWork={animal:incoming.id,pen:pen.id,progress:0};tickHusbandry(g,2);assert.equal(penAnimals(g,pen.id).length,7);
 g.state.units[0].tamingWork=undefined;tickHusbandry(g,2);assert.equal(penAnimals(g,pen.id).length,8);
});
